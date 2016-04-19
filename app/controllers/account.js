var express = require('express'),
  router = express.Router(),
  passport = require('passport'),
  Article = require('../models/article');

module.exports = function (app) {
  app.use('/', router);
};

router.get('/auth/google/callback', passport.authenticate('google', { failureRedirect: '/login' }),
    function(req, res) {
      console.log("Request authorized: ", req);
      // Successful authentication, redirect home.
      res.redirect('/account');
    });

router.get('/account', passport.authenticate('google'), function (req, res, next) {
	console.log('User: ', req.user);
  var articles = [new Article(), new Article()];
    res.render('index', {
      title: 'Libbie Alpha Application',
      articles: articles
    });
});
