import {
    RxDatabase,
    RxCollection,
    createRevision,
    clone,
    BulkWriteRow,
    RxStorageBulkWriteResponse,
    randomCouchString,
    now,
    RxStorage,
    blobToBase64String
} from '../../index.ts';

export type RxStorageOld<A, B> = RxStorage<A, B> | any;

export type AfterMigrateBatchHandlerInput = {
    databaseName: string;
    collectionName: string;
    oldDatabaseName: string;
    insertToNewWriteRows: BulkWriteRow<any>[];
    writeToNewResult: RxStorageBulkWriteResponse<any>;
};
export type AfterMigrateBatchHandler = (
    input: AfterMigrateBatchHandlerInput
) => any | Promise<any>;

/**
 * Migrates collections of RxDB version A and puts them
 * into a RxDatabase that is created with version B.
 * This function only works from the previous major version upwards.
 * Do not use it to migrate like rxdb v9 to v14. 
 */
export async function migrateStorage(
    database: RxDatabase,
    /**
     * Using the migration plugin requires you
     * to rename your new old database.
     * The original name of the v11 database must be provided here.
     */
    oldDatabaseName: string,
    oldStorage: RxStorageOld<any, any>,
    batchSize = 10,
    afterMigrateBatch?: AfterMigrateBatchHandler,
    // to log each step, pass console.log.bind(console) here.
    logFunction?: (message: string) => void
): Promise<void> {
    const collections = Object.values(database.collections);
    for (const collection of collections) {
        await migrateCollection(
            collection,
            oldDatabaseName,
            oldStorage,
            batchSize,
            afterMigrateBatch,
            logFunction
        );
    }
}

export async function migrateCollection<RxDocType>(
    collection: RxCollection<RxDocType>,
    oldDatabaseName: string,
    oldStorage: RxStorageOld<any, any>,
    batchSize: number,
    afterMigrateBatch?: AfterMigrateBatchHandler,
    // to log each step, pass console.log.bind(console) here.
    logFunction?: (message: string) => void
) {
    function log(message: string) {
        if (logFunction) {
            logFunction('migrateCollection(' + collection.name + ')' + message);
        }
    }
    log('start migrateCollection()');
    const schema = collection.schema.jsonSchema;
    const primaryPath = collection.schema.primaryPath;
    const oldDatabaseInstanceToken = randomCouchString(10);
    const oldStorageInstance = await oldStorage.createStorageInstance({
        databaseName: oldDatabaseName,
        collectionName: collection.name,
        multiInstance: false,
        options: {},
        schema: schema as any,
        databaseInstanceToken: oldDatabaseInstanceToken,
        devMode: false
    });

    const preparedQuery = oldStorage.statics.prepareQuery(
        schema as any,
        {
            selector: {},
            limit: batchSize,
            sort: [{ [primaryPath]: 'asc' } as any],
            skip: 0
        }
    );

    while (true) {
        log('loop once');
        /**
         * Get a batch of documents
         */
        const queryResult = await oldStorageInstance.query(preparedQuery);
        const docs = queryResult.documents;
        if (docs.length === 0) {
            /**
             * No more documents to migrate
             */
            log('migration of collection done');
            await oldStorageInstance.remove();
            return;
        }

        const docsNonMutated = clone(docs);

        /**
         * Get attachments
         * if defined in the schema.
         */
        if (schema.attachments) {
            await Promise.all(
                docs.map(async (doc: any) => {
                    const docId: string = (doc as any)[primaryPath];
                    await Promise.all(
                        Object.entries(doc._attachments).map(async ([attachmentId, attachmentMeta]) => {
                            const attachmentData = await oldStorageInstance.getAttachmentData(
                                docId,
                                attachmentId,
                                (attachmentMeta as any).digest
                            );
                            const attachmentDataString = await blobToBase64String(attachmentData);
                            (doc as any)._attachments[attachmentId] = {
                                data: attachmentDataString,
                                digest: (attachmentMeta as any).digest,
                                length: (attachmentMeta as any).length,
                                type: (attachmentMeta as any).type
                            }
                        })
                    );
                })
            );
            log('got attachments');
        }

        /**
         * Insert the documents to the new storage
         */
        const insertToNewWriteRows: BulkWriteRow<any>[] = docs.map((document: any) => {
            return { document };
        });
        const writeToNewResult: RxStorageBulkWriteResponse<any> = await collection.storageInstance.bulkWrite(
            insertToNewWriteRows,
            'migrate-storage'
        );
        log('written batch to new storage');

        // TODO we should throw on non-conflict errors here.
        // if (Object.keys(writeToNewResult.error).length > 0) {
        //     console.dir(writeToNewResult);
        //     throw new Error('could not write to new storage');
        // }

        /**
         * Remove the docs from the old storage
         */
        const writeToOldRows = docs.map((_doc: any, idx: number) => {
            const previous = docsNonMutated[idx];
            if (!previous._meta) {
                previous._meta = {
                    lwt: new Date().getTime()
                };
            }

            const newDoc: typeof previous = clone(previous);
            newDoc._deleted = true;
            if (!newDoc._meta) {
                newDoc._meta = {
                    lwt: new Date().getTime()
                };
            }
            newDoc._meta.lwt = new Date().getTime() + 1;
            newDoc._rev = createRevision(
                oldDatabaseInstanceToken,
                previous
            );

            return {
                previous,
                document: newDoc,
            }
        });
        try {
            const writeToOldResult = await oldStorageInstance.bulkWrite(
                writeToOldRows,
                'migrate-between-rxdb-versions'
            );
            if (Object.keys(writeToOldResult.error).length > 0) {
                console.dir({
                    writeToOldRows,
                    errors: writeToOldResult.error
                });
                throw new Error('got error while deleting migrated documents on the old storage');
            }
        } catch (err) {
            log('could not delete on old instance');
            console.dir(err);
            throw err;
        }
        log('deleted batch on old storage');
        await oldStorageInstance.cleanup(0);

        // run the handler if provided
        if (afterMigrateBatch) {
            await afterMigrateBatch({
                databaseName: collection.database.name,
                collectionName: collection.name,
                oldDatabaseName,
                insertToNewWriteRows,
                writeToNewResult
            });
        }
    }
}





