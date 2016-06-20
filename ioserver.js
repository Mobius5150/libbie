var Connection = require('tedious').Connection;
var Request = require('tedious').Request;
var RateLimiter = require('limiter').RateLimiter;
var q = require('q');
const grApi = require('./gr-api.js');
const AccountManager = require('./accountmanager.js');

var sessionStore     = require('express-session'),
	passportSocketIo = require("passport.socketio");

var io = null;
var dbConn = null;
var config = null;
var goodreads = null;
var limiter = new RateLimiter(1, 1000);
var goodreadsAccountManager = null;

module.exports = function initIoServer(cfg, server) {
	config = cfg;

	goodreads = new grApi({
		apiKeys: config.goodreads,
	});

	goodreadsAccountManager = new AccountManager(config.userData.providers.goodreads);
	goodreadsAccountManager.init();

	io = require('socket.io').listen(server);
	// dbConn = new Connection(config.database);

	// dbConn.on('connect', function(err) {
	// 	console.log('Connected to MySQL');
	// });

	io.on('connection', socketIoConnected);

	//With Socket.io >= 1.0
	io.use(passportSocketIo.authorize({
		// cookieParser: cookieParser,       // the same middleware you registrer in express
		key:          config.session.key,       // the name of the cookie where express/connect stores its session_id
		secret:       config.session.secret,    // the session_secret to parse the cookie
		store:        config.session.store,        // we NEED to use a sessionstore. no memorystore please
		success:      onAuthorizeSuccess,  // *optional* callback on success - read more below
		fail:         onAuthorizeFail,     // *optional* callback on fail/error - read more below
	}));
}

function socketIoConnected(socket) {
	socket.on('addIsbn', addIsbn);
	socket.on('getClientInfo', getClientInfo);
	socket.on('userHideWelcomePrompt', userHideWelcomePrompt);
	socket.on('setEntryKey', setUserEntryKey);
}

function addIsbn(data) {
	var socket = this;
	var bookId = null;
	var addBookRequest = {
		bookId: null,
	};

	if (typeof data.condition === 'number') {
		addBookRequest.condition = data.condition;
	}

	if (typeof data.isbn !== 'string' || null !== data.isbn.match(/\A([0-9]{10}|[0-9]{13})\Z/)) {
		this.emit('apperror', { type: 'application', msg: 'No ISBN given in request' });
		return;
	}

	console.log('Request for isbn: ', data.isbn);
	
	function doRequest(requestNo) {
		goodreads.bookShowByIsbn(data.isbn)
			.then(
				function(book) {
					addBookRequest.bookId = book.book.id;

					socket.emit('isbnIdentified', {
						isbn: data.isbn,
						books: [ book.book ],
					});

					return goodreads.addUserOwnedBook(addBookRequest, userOauthInfo(socket));
				},
				function(err) {
					if (err.response.statusCode !== 404 && requestNo < config.goodreads.maxRetries) {
						doRequest(requestNo + 1);
					} else {
						socket.emit('apperror', { type: 'application', method: 'addIsbn', msg: 'Error looking up book', data: err, searchIsbn: data.isbn, requestNo: requestNo, });
					}
				})
			.then(
				function(addResponse) {
					console.log('User book added: ', addResponse);
					socket.emit('bookAdded', {
						isbn: data.isbn,
						data: addResponse,
						request: addBookRequest,
					});
				},
				function (err) {
					if (requestNo < config.goodreads.maxRetries) {
						doRequest(requestNo + 1);
					} else {
						socket.emit('apperror', { type: 'application', method: 'addIsbn', msg: 'Error adding user owned book', data: err, searchIsbn: data.isbn, requestNo: requestNo, });
					}
				});
	}

	doRequest(0);
}

function userHideWelcomePrompt(hide) {
	var socket = this;
	var showWelcomePrompt = hide ? false : true;

	if (typeof this.request.user.clientInfo !== 'undefined') {
		this.request.user.clientInfo.showWelcomePrompt = showWelcomePrompt;
	}

	goodreadsAccountManager.setAccountProperties(socket.request.user.id, { 'showWelcomePrompt': showWelcomePrompt })
		.then(function (clientInfo) {
			socket.emit('clientInfo', clientInfo);
		})
		.catch(function (err) {
			socket.emit('apperror', { type: 'application', method: 'userHideWelcomePrompt', msg: 'Error updating user showWelcomePrompt', data: err });
		});
}

function setUserEntryKey(key) {
	var socket = this;
	var entryKeyString = typeof key === 'string' ? key : 'Enter';

	if (entryKeyString.length > 50) {
		console.error('Entry key string too long!');
		socket.emit('apperror', { type: 'application', method: 'setUserEntryKey', msg: 'Error setting entry key string: string too long' });
		return;
	}

	if (typeof this.request.user.clientInfo !== 'undefined') {
		this.request.user.clientInfo.entryKey = entryKeyString;
	}

	goodreadsAccountManager.setAccountProperties(socket.request.user.id, { 'entryKey': entryKeyString })
		.then(function (clientInfo) {
			socket.emit('clientInfo', clientInfo);
		})
		.catch(function (err) {
			socket.emit('apperror', { type: 'application', method: 'setUserEntryKey', msg: 'Error updating user entryKey', data: err });
		});
}

function userOauthInfo(socket) {
	return {
		key: socket.request.user.grToken,
		secret: socket.request.user.grTokenSecret
	};
}

function onAuthorizeSuccess(data, accept) {
	var _this = this;
	goodreads.getUserShelves(data.user.id)
		.then(function (shelves) {
			data.user.shelves = shelves.shelves.user_shelf;
			accept(null, true);
		})
		.catch(function (err) {
			console.error('Get user shelves error: ', err);
			accept(null, false);
		});
}

function onAuthorizeFail(data, message, error, accept){
	// if(error) {
	// 	throw new Error(message);
	// }

	console.log('failed connection to socket.io:', message);

	// We use this callback to log all of our failed connections.
	accept(null, false);
}

function getGRClient(socket, cb) {
	if (typeof socket.grClient !== 'undefined') {
		cb(socket.grClient);
	}

	
}

function wrapApi(thisArg, f) {
	var Q = q.defer();

	var args = Array.prototype.slice.call(arguments);
	args.splice(0, 2);

	limiter.removeTokens(1, function (err, remaining) {
		if (err) {
			throw err;
		}

		Q.resolve(f.apply(thisArg, args));
	});

	return Q.promise;
}

function wrapFnCall($this, method) {
    return function () {
        return method.apply($this, arguments);
    }
}

function getClientInfo() {
	var socket = this;
	goodreadsAccountManager.loadAccount(socket.request.user.id)
		.then(function(clientInfo) {
			socket.emit('clientInfo', clientInfo);
		});
}