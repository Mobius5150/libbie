const azStorage = require('azure-storage');
const entGen = azStorage.TableUtilities.entityGenerator;
const azTableTypes = azStorage.TableUtilities.EdmType;
const promise = require('promise');

var AccountManager = module.exports = function (config) {
	this.config = config;
    this.tableService = azStorage.createTableService(this.config.storage.storageAccount, this.config.storage.accessKey);
}

AccountManager.prototype = {
    config: null,
    tableService: null,

    init: function init() {
        var _this = this;
        return new promise(function (resolve, reject) {
            _this.tableService.createTableIfNotExists(_this.config.tableName, function(error, result, response) {
                if (error) {
                    console.error('Error initializing account manager table service', _this.tableService, error);
                    return reject(error);
                }

                // result contains true if created; false if already exists
                if (result) {
                    console.info('Azure table created with name', _this.config.tableName);
                } else {
                    console.info('Azure table already existed with name', _this.config.tableName);
                }

                resolve(result);
            });
        });
    },

    createAccount: function createAccount(clientInfo) {
        var _this = this;
        var accountEntity = clientInfoToDBFormat(clientInfo);

        return new promise(function (resolve, reject) {
            _this.tableService.insertEntity(_this.config.tableName, accountEntity, function(error, result, response) {
                if (error) {
                    console.error('Error adding account entity', accountEntity, error);
                    return reject(error);
                }

                // result contains the ETag for the new entity
                resolve(result);
            });
        });
    },

    loadOrCreateAccount: function loadOrCreateAccount(clientInfoDefaults) {
        var _this = this;
        return new promise(function (resolve, reject) {
            _this.loadAccount(clientInfoDefaults.id)
                .then(resolve)
                .catch(function(err) {
                    if (err.statusCode === 404) {
                        _this.createAccount(clientInfoDefaults)
                            .then(function (etag) {
                                return resolve(clientInfoDefaults);
                            })
                            .catch(reject);
                    } else {
                        reject(err);
                    }
                });
        });
    },

    loadAccount: function loadAccount(id) {
        var _this = this;
        return new promise(function (resolve, reject) {
            _this.tableService.retrieveEntity(_this.config.tableName, 'users', id, function(error, result, response) {
                if (error) {
                    console.error('Error retrieving entity', id, error);
                    return reject(error);
                }

                // result contains the entity
                resolve(dbFormatToClientInfo(result));
            });
        });
    },

    updateAccount: function updateAccount(clientInfo) {
        var _this = this;
        var accountEntity = clientInfoToDBFormat(clientInfo);

        return new promise(function (resolve, reject) {
            _this.tableService.replaceEntity(_this.config.tableName, accountEntity, function(error, result, response) {
                if (error) {
                    console.error('Error updating account entity', accountEntity, error);
                    return reject(error);
                }

                // result contains the ETag for the new entity
                resolve(result);
            });
        });
    },

    setAccountProperties: function setAccountProperty(id, properties) {
        var _this = this;

        properties.id = id;
        var accountEntity = clientInfoToDBFormat(properties);

        return new promise(function (resolve, reject) {
            _this.tableService.mergeEntity(_this.config.tableName, accountEntity, function(error, result, response) {
                if (error) {
                    console.error('Error merging account entity', accountEntity, error);
                    return reject(error);
                }

                // result contains the ETag for the new entity
                return _this.loadAccount(id)
                    .then(resolve)
                    .catch(reject);
            });
        });
    },
};

function clientInfoToDBFormat(clientInfo) {
    var data = {
        PartitionKey: entGen.String('users'),
        RowKey: entGen.String(clientInfo.id),
    };

    for (var i in clientInfo) {
        if (i === 'id') {
            continue;
        }

        if (typeof clientInfo[i] === 'string') {
            data[i] = entGen.String(clientInfo[i]);
        } else if (typeof clientInfo[i] === 'number') {
            if (clientInfo[i] > (Math.pow(2, 32) - 1)) {
                data[i] = entGen.Int64(clientInfo[i]);
            } else {
                data[i] = entGen.Int32(clientInfo[i]);
            }
        } else if (typeof clientInfo[i] instanceof Date) {
            data[i] = entGen.DateTime(clientInfo[i]);
        } else if (typeof clientInfo[i] === 'boolean') {
            data[i] = entGen.Boolean(clientInfo[i]);
        }
    }

    return data;
}

function dbFormatToClientInfo(dbFormat) {
    var clientInfo = {};

    for (var i in dbFormat) {
        if (i === 'RowKey') {
            clientInfo['id'] = convertTablesType(dbFormat[i]);
        } else if (i === 'PartitionKey' || i === '.metadata') {
            continue;
        } else {
            clientInfo[i] = convertTablesType(dbFormat[i]);
        }
    }

    return clientInfo;
}

function convertTablesType(obj) {
    var val = null;
    if (typeof obj['$'] === 'undefined') {
        return obj['_'];
    }

    var type = obj['$'];
    switch (type) {
        case azTableTypes.INT64:
        case azTableTypes.INT32:
            return parseInt(obj['_']);

        case azTableTypes.DOUBLE:
            return parseFloat(obj['_']);

        case azTableTypes.DATETIME:
            return new Date(obj['_']);

        case azTableTypes.BOOLEAN:
            return obj['_'] ? true : false;

        default:
            return obj['_'];
    }
}