var Connection = require('tedious').Connection;
var Request = require('tedious').Request;
var RateLimiter = require('limiter').RateLimiter;
var q = require('q');

var sessionStore     = require('express-session'),
	passportSocketIo = require("passport.socketio");

var io = null;
var dbConn = null;
var config = null;
var limiter = new RateLimiter(1, 1000);

var gr = require('goodreads.js');

module.exports = function initIoServer(cfg, server) {
	config = cfg;
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
}

function addIsbn(data) {
	var socket = this;
	var grClient = this.request.user.grClient;

	if (typeof grClient === 'undefined') {
		console.error("Socket does not have a goodreads client", this);
		this.emit('apperror', { type: 'unauthorized' });
		return;
	}

	if (typeof data.isbn !== 'string' || null !== data.isbn.match(/\A([0-9]{10}|[0-9]{13})\Z/)) {
		this.emit('apperror', { type: 'application', msg: 'No ISBN given in request' });
		return;
	}

	console.log('Request for isbn: ', data.isbn);
	
	wrapApi(grClient, grClient.BookIsbnToId, data.isbn)
		.then(function (book_id) {
			wrapApi(grClient, grClient.BookShow, book_id)
				.then(function(book) {
					socket.emit('isbnIdentified', {
						isbn: data.isbn,
						books: book.GoodreadsResponse.book,
						id: book_id,
					});
				})
				.fail(function (err) {
					socket.emit('apperror', { type: 'application', msg: 'Error retrieving book info', data: err, book_id: book_id, searchIsbn: data.isbn });
				});
		})
		.fail(function (err) {
			socket.emit('apperror', { type: 'application', msg: 'Error looking up ISBN', data: err, searchIsbn: data.isbn });
		});
}

function onAuthorizeSuccess(data, accept){
	console.log('successful connection to socket.io', data);

	// var socket = this.conn.Socket;
	var user = data.user;

	var provider = new gr.provider({
		'client_key': config.goodreads.key,
		'client_secret': config.goodreads.secret,
		
	});
	
	provider.CreateClient({ 'access_token': user.grToken, 'access_token_secret': user.grTokenSecret })
		.then(function(client){
			user.grClient = client;
		})
		.fail(function(err){
			console.log("Could not connect goodreads client: ", err);
		});

	accept(null, true);
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

function getClientInfo() {
	// TOOD: Retrieve stored value
	socket.emit('clientInfo', {
		entryKey: 'Enter',
		showWelcomePrompt: true,
		hasDonated: false,
	});
}