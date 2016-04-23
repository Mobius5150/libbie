var express = require('express'),
	router = express.Router(),
	passport = require('passport');

module.exports = function (app) {
	app.use('/', router);
};

router.get('/auth/goodreads/callback', passport.authenticate('goodreads', { 
	successRedirect: '/account',
	failureRedirect: '/login?auth=failed&goodreads=true' 
}));

router.get('/auth/goodreads', passport.authenticate('goodreads'));