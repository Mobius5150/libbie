var express = require('express'),
	config = require('./config/config'),
	session = require('express-session');

var passport = require('passport');

var app = express();

app.use(session({ secret: config.sessionSecret }));
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

var GoogleStrategy = require('passport-google-oauth20').Strategy;

passport.use(new GoogleStrategy({
	clientID: config.google.clientId,
	clientSecret: config.google.clientSecret,
	scope: ['profile'],
	callbackURL: "https://libbie.azurewebsites.net/auth/google/callback",
	realm: 'https://libbie.azurewebsites.net/'
},
function(token, tokenSecret, profile, done) {
    // User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return done(null, profile);
    // });
}
));

passport.serializeUser(function(user, cb) {
	cb(null, user);
});

passport.deserializeUser(function(obj, cb) {
	cb(null, obj);
});

app.listen(config.port, function () {
	console.log('Express server listening on port ' + config.port);
});

