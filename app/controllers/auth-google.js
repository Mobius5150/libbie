var express = require('express'),
	router = express.Router(),
	passport = require('passport');

module.exports = function (app) {
	app.use('/', router);
};

router.get('/auth/google/callback', passport.authenticate('google', { 
	successRedirect: '/account',
	failureRedirect: '/login?auth=failed&google=true' 
}));

router.get('/auth/google', passport.authenticate('google', { scope: ['profile'] }));