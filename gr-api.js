const _ = require('underscore');
const request = require('request');
const promise = require('promise');
const RateLimiter = require('limiter').RateLimiter;
const xml2js = require('xml2js');
const parser = new xml2js.Parser();
const util = require('util');

var GoodReadsAPI = module.exports = function (config) {
    this.config = _.extend({
        grApi: 'https://www.goodreads.com',
        apiKeys: [],
    }, config);

    this.maxRequestsPerSecond = this.config.apiKeys.length;
    this.limiter = new RateLimiter(1, 1000);

    this.config.apiKeys.forEach(function(element) {
        this.oauthClients.push(new OAuth.OAuth(
            'http://www.goodreads.com/oauth/request_token',
            'http://www.goodreads.com/oauth/access_token',
            element.key,
            element.secret,
            '1.0A',
            null,
            'HMAC-SHA1'
        ));
    }, this);
}

GoodReadsAPI.prototype = {
    config: null,
    limiter: null,
    maxRequestsPerSecond: 0,
    currentApiKey: 0,
    oauthClients: [],

    wrapApiGetRequest: function wrapApiRequest(reqUrl, handler) {
        var _this = this;
        this.limiter.removeTokens(1, function (err, remaining) {
            var thisKey = _this.config.apiKeys[_this.currentApiKey];
            _this.currentApiKey = (++_this.currentApiKey) % _this.config.apiKeys.length;
            request(reqUrl.replace('{{grKey}}', thisKey.key), handler);
        });
    },

    wrapAuthenticatedApiGetRequest: function wrapAuthenticatedApiRequest(reqUrl, userOauthInfo, handler) {
        var _this = this;
        this.limiter.removeTokens(1, function (err, remaining) {
            var thisKey = _this.config.apiKeys[_this.currentApiKey];
            _this.currentApiKey = (++_this.currentApiKey) % _this.config.apiKeys.length;
            _this.oauthClients[thisKey].get(reqUrl, userOauthInfo.key, userOauthInfo.secret, function (e, data, response) {
                handler(e, response, data);
            });
        });
    },

    rejectWithError: function rejectWithError(reject, error, response, errorObj) {
        if (typeof errorObj === 'undefined') {
            errorObj = {};
        } else if (typeof errorObj !== 'object') {
            errorObj = { arg: errorObj };
        }

        errorObj.error = error;
        errorObj.response = response;

        reject(errorObj);
    },

    /* GoodReads API Functions *****************/
    isbnToBookId: function isbnToBookId(isbn) {
        var _this = this;
        return new promise(function (resolve, reject) {
            _this.wrapApiGetRequest(_this.config.grApi + '/book/isbn_to_id/' + isbn + '?key={{grKey}}', function (error, response, body) {
                if (error) {
                    return _this.rejectWithError(reject, error, response, {
                        message: 'Error processing request',
                    });
                }

                switch (response.statusCode) {
                    case 200:
                        var match = body.match(/^\d+$/);
                        if (match === null) {
                            return _this.rejectWithError(reject, error, response, {
                                message: 'Invalid response from goodreads',
                            });
                        }
                        return resolve(match);

                    case 404:
                        return _this.rejectWithError(reject, error, response, {
                            message: 'Unknown isbn',
                        });

                    default:
                        return _this.rejectWithError(reject, error, response, {
                            message: 'Invalid response from goodreads',
                        });
                }
            });
        });
    },

    bookShow: function bookShow(bookId) {
        var _this = this;
        return new promise(function (resolve, reject) {
            _this.wrapApiGetRequest(_this.config.grApi + '/book/show/' + bookId + '.xml?key={{grKey}}', function (error, response, body) {
                if (error) {
                    return _this.rejectWithError(reject, error, response, {
                        message: 'Error processing request',
                    });
                }

                switch (response.statusCode) {
                    case 200:
                        parseGRXmlResponse(body, function(err, result) {
                            if (err) {
                                _this.rejectWithError(reject, err, response, {
                                    message: 'Error parsing response',
                                });
                            } else {
                                resolve(result);
                            }
                        }); 
                        break;

                    case 404:
                        return _this.rejectWithError(reject, error, response, {
                            message: 'Unknown book id',
                        });

                    default:
                        return _this.rejectWithError(reject, error, response, {
                            message: 'Invalid response from goodreads',
                        });
                }
            });
        });
    },

    bookShowByIsbn: function bookShow(isbn) {
        var _this = this;
        return new promise(function (resolve, reject) {
            _this.wrapApiGetRequest(_this.config.grApi + '/book/isbn/' + isbn + '?key={{grKey}}', function (error, response, body) {
                if (error) {
                    return _this.rejectWithError(reject, error, response, {
                        message: 'Error processing request',
                    });
                }

                switch (response.statusCode) {
                    case 200:
                        parseGRXmlResponse(body, function(err, result) {
                            if (err) {
                                _this.rejectWithError(reject, err, response, {
                                    message: 'Error parsing response',
                                });
                            } else {
                                resolve(result);
                            }
                        }); 
                        break;

                    case 404:
                        return _this.rejectWithError(reject, error, response, {
                            message: 'Unknown book id',
                        });

                    default:
                        return _this.rejectWithError(reject, error, response, {
                            message: 'Invalid response from goodreads',
                        });
                }
            });
        });
    },

    getUserNotifications: function getUserNotifications(userOauthInfo) {
        var _this = this;
        return new promise(function (resolve, reject) {
            _this.wrapAuthenticatedApiGetRequest(_this.config.grApi + '/notifications.xml', userOauthInfo, function (error, response, body) {
                if (error) {
                    return _this.rejectWithError(reject, error, response, {
                        message: 'Error processing request',
                    });
                }

                switch (response.statusCode) {
                    case 200:
                        parseGRXmlResponse(body, function(err, result) {
                            if (err) {
                                _this.rejectWithError(reject, err, response, {
                                    message: 'Error parsing response',
                                });
                            } else {
                                resolve(result);
                            }
                        }); 
                        break;

                    case 404:
                        return _this.rejectWithError(reject, error, response, {
                            message: 'Unknown book id',
                        });

                    default:
                        return _this.rejectWithError(reject, error, response, {
                            message: 'Invalid response from goodreads',
                        });
                }
            });
        });  
    }
};

function parseGRXmlResponse(data, callback) {
    parser.parseString(data, function (err, result) {
        if (err || typeof result.GoodreadsResponse !== 'object') {
            return callback(err ? err : true);
        }

        callback(null, removeXmlArrays(result['GoodreadsResponse']));
    });
}

function removeXmlArrays(data) {
    for (var i in data) {
        if (Object.prototype.toString.call( data[i] ) === '[object Array]') {
            if (data[i].length === 1 && typeof data[i][0] !== 'object') {
                data[i] = data[i][0];
            } else {
                data[i] = removeXmlArrays(data[i]);
            }
        } else if (typeof data[i] === 'object') {
            data[i] = removeXmlArrays(data[i]);
        }
    }

    return data;
}