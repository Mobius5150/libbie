var express = require('express'),
	config = require('./config/config'),
	session = require('express-session');

var passport = require('passport');

var app = express();
var server = require('http').Server(app);
const AccountManager = require('./accountmanager.js');
var goodreadsAccountManager = new AccountManager(config.userData.providers.goodreads);
goodreadsAccountManager.init()
	.then(function() {
		server.listen(config.port);
	});

var AzureTablesStoreFactory = require('connect-azuretables')(session);
config.session.store = AzureTablesStoreFactory.create(config.storage);

app.use(session(config.session));
app.use(passport.initialize());
app.use(passport.session());
app.use('/account', isAuthenticated);

require('./ioserver.js')(config, server);
require('./config/express')(app, config);

function isAuthenticated(req, res, next) {
	console.log(req.user);
	if (req.user !== undefined) {
        next();
    } else {
        res.redirect('/login');
    }
}

(function setupGoodreadsStrategy(){
	var GoodreadsStrategy = require('passport-goodreads').Strategy;

	passport.use(new GoodreadsStrategy({
		consumerKey: config.goodreads[0].key,
		consumerSecret: config.goodreads[0].secret,
		callbackURL: config.serverUrl + "/auth/goodreads/callback",
		realm: config.serverUrl,
	},
	function(token, tokenSecret, profile, done) {
		profile.grToken = token;
		profile.grTokenSecret = tokenSecret;
		goodreadsAccountManager.loadOrCreateAccount(getClientInfoDefaults(profile.id, 'goodreads', profile.displayName))
			.then(function (clientInfo) {
				profile.clientInfo = clientInfo;
				done(null, profile);
			})
			.catch(function(err) {
				console.error('Error with loadOrCreateAccount', err);
				done(err, null);
			});
	}
	));
})();

passport.serializeUser(function(user, cb) {
	cb(null, user);
});

passport.deserializeUser(function(obj, cb) {
	cb(null, obj);
});

function getClientInfoDefaults(id, provider, displayName) {
	return {
		entryKey: 'Enter',
		showWelcomePrompt: true,
		hasDonated: false,
		id: id,
		provider: provider,
		displayName: displayName,
	};
}