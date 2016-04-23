var Connection = require('tedious').Connection;
var Request = require('tedious').Request;

var sessionStore     = require('express-session'),
	passportSocketIo = require("passport.socketio");

var io = null;
var dbConn = null;
var config = null;

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
}

function addIsbn(data) {
	console.log('add isbn: ', data);

	if (typeof this.grClient === 'undefined') {
		console.error("Socket does not have a goodreads client", this);
		this.emit('error', { type: 'unauthorized' });
		return;
	}

	if (typeof data.isbn !== 'string') {
		this.emit('error', { type: 'application', msg: 'No ISBN given in request' });
		return;
	}

	console.log('Request would proceed');
	this.emit('isbnIdentified', {
		isbn: data.isbn,
		name: "My Book",
	});
}

function onAuthorizeSuccess(data, accept){
	console.log('successful connection to socket.io');

	var socket = this;

	var provider = new goodreads.provider({
		'client_key': config.goodreads.key,
		'client_secret': config.goodreads.secret,
		'access_token': socket.request.user.grToken,
		'access_token_secret': socket.request.user.grTokenSecret,
	})
	
	provider.CreateClient()
		.then(function(client){
			socket.grClient = client;
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