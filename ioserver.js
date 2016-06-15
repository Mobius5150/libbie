var Connection = require('tedious').Connection;
var Request = require('tedious').Request;
var RateLimiter = require('limiter').RateLimiter;
var q = require('q');
const grApi = require('./gr-api.js');

var sessionStore     = require('express-session'),
	passportSocketIo = require("passport.socketio");

var io = null;
var dbConn = null;
var config = null;
var goodreads = null;
var limiter = new RateLimiter(1, 1000);

module.exports = function initIoServer(cfg, server) {
	config = cfg;

	goodreads = new grApi({
		apiKeys: config.goodreads,
	});

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
	socket.on('userWelcomePromptHidden', userWelcomePromptHidden);
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
	
	goodreads.bookShowByIsbn(data.isbn)
		.then(function(book) {
			addBookRequest.bookId = book.book[0].id;

			socket.emit('isbnIdentified', {
				isbn: data.isbn,
				books: book.book,
			});

			return goodreads.addUserOwnedBook(addBookRequest, userOauthInfo(socket));
		})
		.then(function(addResponse) {
			console.log('User book added: ', addResponse);
			socket.emit('bookAdded', {
				isbn: data.isbn,
				data: addResponse,
				request: addBookRequest,
			});
		})
		.catch(function (err) {
			socket.emit('apperror', { type: 'application', msg: 'Error adding user owned book', data: err, searchIsbn: data.isbn });
		});
}

function userWelcomePromptHidden(hidden) {
	// TODO: Update account setting 'welcomePromptShown'
	var welcomePromptShown = hidden ? true : false;
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
	// TOOD: Retrieve stored value
	this.emit('clientInfo', {
		entryKey: 'Enter',
		showWelcomePrompt: true,
		hasDonated: false,
		profile: {
			id: this.request.user.id,
			logged_in: this.request.user.logged_in,
			provider: this.request.user.provider,
			displayName: this.request.user.displayName,
			shelves: this.request.user.shelves,
		}
	});
}