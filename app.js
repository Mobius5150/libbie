var express = require('express'),
	config = require('./config/config'),
	session = require('express-session');

var passport = require('passport');

var app = express();

app.use(session({ secret: config.session.secret, key: config.session.key }));
app.use(passport.initialize());
app.use(passport.session());
app.use('/account', isAuthenticated);
require('./config/express')(app, config);

function isAuthenticated(req, res, next) {
	console.log(req.user);
	if (req.user !== undefined) {
        next();
    } else {
        res.redirect('/login');
    }
}

(function setupGoogleStrategy(){
	var GoogleStrategy = require('passport-google-oauth20').Strategy;
	passport.use(new GoogleStrategy({
		clientID: config.google.clientId,
		clientSecret: config.google.clientSecret,
		scope: ['profile'],
		callbackURL: "https://libbie.azurewebsites.net/auth/google/callback",
		realm: 'https://libbie.azurewebsites.net/'
	},
	function(token, tokenSecret, profile, done) {
		console.log("Google User Data: ", profile);
	    // User.findOrCreate({ googleId: profile.id }, function (err, user) {
	      return done(null, profile);
	    // });
	}
	));
})();

(function setupGoodreadsStrategy(){
	passport.use(new GoodreadsStrategy({
		consumerKey: config.goodreads.key,
		consumerSecret: config.goodreads.secret,
		callbackURL: "https://libbie.azurewebsites.net/auth/goodreads/callback",
		realm: 'https://libbie.azurewebsites.net/'
	},
	function(token, tokenSecret, profile, done) {
		console.log("Goodreads User Data: ", profile);
		profile.grToken = token;
		profile.grTokenSecret = tokenSecret;
		// User.findOrCreate({ goodreadsId: profile.id }, function (err, user) {
			return done(null, user);
		// });
	}
	));
})();

passport.serializeUser(function(user, cb) {
	cb(null, user);
});

passport.deserializeUser(function(obj, cb) {
	cb(null, obj);
});

var server = app.listen(config.port, function () {
	console.log('Express server listening on port ' + config.port);
});



