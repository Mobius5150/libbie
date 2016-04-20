var express = require('express'),
	router = express.Router(),
	passport = require('passport');

module.exports = function (app) {
	app.use('/account', router);
};

router.get('/', function (req, res, next) {
	console.log('User: ', req);
	res.render('account', {
		title: 'Libbie Alpha Application Account',
		userName: req.user.displayName,
	});
});