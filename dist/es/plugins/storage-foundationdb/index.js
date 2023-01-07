import { ensureRxStorageInstanceParamsAreCorrect } from '../../rx-storage-helper';
import { RxStorageDefaultStatics } from '../../rx-storage-statics';
import { createFoundationDBStorageInstance } from './rx-storage-instance-foundationdb';
var versionSet;
export function getRxStorageFoundationDB(settings) {
  if (versionSet && versionSet !== settings.apiVersion) {
    throw new Error('foundationdb already initialized with api version ' + versionSet);
  } else if (!versionSet) {
    versionSet = settings.apiVersion;
    var {
      setAPIVersion
    } = require('foundationdb');
    setAPIVersion(settings.apiVersion);
  }
  var storage = {
    name: 'foundationdb',
    statics: RxStorageDefaultStatics,
    createStorageInstance(params) {
      ensureRxStorageInstanceParamsAreCorrect(params);
      var useSettings = Object.assign({}, settings, params.options);
      if (!useSettings.batchSize) {
        useSettings.batchSize = 50;
      }
      return createFoundationDBStorageInstance(this, params, useSettings);
    }
  };
  return storage;
}
export * from './foundationdb-types';
export * from './foundationdb-helpers';
//# sourceMappingURL=index.js.map