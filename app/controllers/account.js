var express = require('express'),
	router = express.Router(),
	passport = require('passport');

module.exports = function (app) {
	app.use('/account', router);
};

// TODO: Verify authentication
router.get('/', function (req, res, next) {
	console.log('User: ', req.user);
	res.render('account', {
		title: 'Libbie Alpha Application Account',
		userName: req.user.displayName,
	});
});
