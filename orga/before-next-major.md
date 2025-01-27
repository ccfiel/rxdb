# Things do to before the next major release

This list contains things that have to be done but will create breaking changes.



## Ideas from https://github.com/pubkey/rxdb/issues/4994


## Skip responding full document data on bulkWrites (only in all happy case)

RxStorage.bulkwrite(): If all writes suceeed, return "SUCESS" or sth to not have to transfer all json document data again. This is mostly important in the remote storage and webworker storage where we do not want to JSON-stringify and parse all data again.


---------------------------------
# Maybe later (not sure if should be done)


## RxStorageInstance.query() should be able to query deleted docs.

Then we can drop getChangesSince(). Also it makes it easier to implement custom indexes without _deleted which will be helpfull for a future RxDB server-module.

## Do not allow type mixing

In the RxJsonSchema, a property of a document can have multiple types like

```ts
{
    type?: JsonSchemaTypes | JsonSchemaTypes[];
}
```

This is bad and should not be used. Instead each field must have exactly one type.
Having mixed types causes many confusion, for example when the type is `['string', 'number']`,
you could run a query selector like `$gt: 10` where it now is not clear if the string `foobar` is matching or not.

## Add enum-compression to the key-compression plugin
- Also rename the key-compression plugin to be just called 'compression'

## RxStorage: Add RxStorage.info() which also calls parents

Having an .info() method helps in debugging stuff and sending reports on problems etc.


## Rename "RxDB Premium" to "RxDB Enterprise"

Most "normal" users do not need premium access so we should name it "RxDB Enterprise" to make it more clear that it is intended to bought by companies.


## Refactor data-migrator

 - Migration strategies should be defined [like in WatermelonDB](https://nozbe.github.io/WatermelonDB/Advanced/Migrations.html) with a `toVersion` version field. We should also add a `fromVersion` field so people could implement performance shortcuts by directly jumping several versions. The current migration strategies use the array index as `toVersion` which is confusing.
