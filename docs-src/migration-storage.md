# Storage Migration

The storage migration plugin can be used to migrate all data from one existing RxStorage into another. This is useful when:

- You want to migration from one [RxStorage](./rx-storage.md) to another one.
- You want to migrate to a new major RxDB version while keeping the previous saved data. This function only works from the previous major version upwards. Do not use it to migrate like rxdb v9 to v14.

The storage migration **drops deleted documents** and filters them out during the migration.


## Usage

Lets say you want to migrate from LokiJs to the [Dexie.js](./rx-storage-dexie.md) RxStorage.

```ts
import { migrateStorage } from 'rxdb/plugins/migration-storage';
import {
    getRxStorageLoki
} from 'rxdb/plugins/storage-loki';
import { getRxStorageDexie } from 'rxdb/plugins/storage-dexie';

// create the new RxDatabase
const db = await createRxDatabase<RxStylechaseCollections>({
    name: dbLocation,
    storage: getRxStorageDexie(),
    multiInstance: false
});

await migrateStorage(
    db as any,
    /**
     * Name of the old database,
     * using the storage migration requires that the
     * new database has a different name.
     */
    'myOldDatabaseName',
    getRxStorageLoki(), // RxStorage of the old database
    500, // batch size
    // 
    (input: AfterMigrateBatchHandlerInput) => {
        console.log('storage migration: batch processed');
    }
);
```


## Migrate from a previous RxDB major version

To migrate from a previous RxDB major version, you have to install the 'old' RxDB in the `package.json`

```json
{
    "dependencies": {
        "rxdb-old": "npm:rxdb@14.17.1",
    }
}
```

The you can run the migration by providing the old storage:

```ts
/* ... */
import { migrateStorage } from 'rxdb/plugins/migration-storage';
import {
    getRxStorageLoki
} from 'rxdb-old/plugins/storage-loki'; // <- import from the old RxDB version

await migrateStorage(
    db as any,
    /**
     * Name of the old database,
     * using the storage migration requires that the
     * new database has a different name.
     */
    'myOldDatabaseName',
    getRxStorageLoki(), // RxStorage of the old database
    500, // batch size
    // 
    (input: AfterMigrateBatchHandlerInput) => {
        console.log('storage migration: batch processed');
    }
);
/* ... */
```