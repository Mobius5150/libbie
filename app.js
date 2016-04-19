

var express = require('express'),
  config = require('./config/config');

var passport = require('passport');

var app = express();

// app.configure(function(){
	app.use(passport.initialize());
	app.use(passport.session());
	require('./config/express')(app, config);
// });

var GoogleStrategy = require('passport-google-oauth20').Strategy;

// Use the GoogleStrategy within Passport.
//   Strategies in passport require a `verify` function, which accept
//   credentials (in this case, a token, tokenSecret, and Google profile), and
//   invoke a callback with a user object.
passport.use(new GoogleStrategy({
  clientID: '693947618941-cev7gf2mh1eeng2m271lcn5oalmird4n.apps.googleusercontent.com',
  clientSecret: 'hQnqgsqg2yX1gPzjh3RxP13r',
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
	cb(null, { obj: obj });
});

app.listen(config.port, function () {
  console.log('Express server listening on port ' + config.port);
});

