var express = require('express'),
	router = express.Router(),
	passport = require('passport');

module.exports = function (app) {
	app.use('/account', router);
};

router.get('/', function (req, res, next) {
	console.log('User: ', req);
	res.render('account', {
		title: 'Libbie: quickly add books to Goodreads!',
		userName: req.user.displayName,
		shelves: [
			{ name: 'Owned books', value: 'owned-books' },
		],
		conditions: [
			{ name: 'unspecified', value: 0 },
			{ name: 'brand new', value: 10 },
			{ name: 'like new', value: 20, default: true },
			{ name: 'very good', value: 30 },
			{ name: 'good', value: 40 },
			{ name: 'acceptable', value: 50 },
			{ name: 'poor', value: 60 },
		],
		helpers: {
			isSelected: function (input) {
				return typeof input !== 'undefined' && input === true ? 'selected' : '';
			}
		}
	});
});