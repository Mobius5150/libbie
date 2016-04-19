var express = require('express'),
  router = express.Router(),
  passport = require('passport'),
  Article = require('../models/article');

module.exports = function (app) {
  app.use('/', router);
};

router.get('/auth/google/callback', passport.authenticate('google', { failureRedirect: '/' }),
    function(req, res) {
      console.log("Request authorized: ", req);
      // Successful authentication, redirect home.
      res.redirect('/account');
    });

app.get('/auth/google', passport.authenticate('google', { scope: ['profile'] }));

// TODO: Verify authentication
router.get('/account', function (req, res, next) {
	console.log('User: ', req.user);
  var articles = [new Article(), new Article()];
    res.render('index', {
      title: 'Libbie Alpha Application Account',
      articles: articles
    });
});
