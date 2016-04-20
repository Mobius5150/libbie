var express = require('express'),
	router = express.Router(),
	passport = require('passport'),
	Article = require('../models/article');

module.exports = function (app) {
	app.use('/account', router);
};

// TODO: Verify authentication
router.get('/', function (req, res, next) {
	console.log('User: ', req.user);
	var articles = [new Article(), new Article()];
	res.render('index', {
	title: 'Libbie Alpha Application Account',
	articles: articles
	});
});
