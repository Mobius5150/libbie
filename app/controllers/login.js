var express = require('express'),
  router = express.Router();

module.exports = function (app) {
	app.use('/', router);
};

router.get('/login', function (req, res, next) {
    res.render('login', {
      title: 'Login to Libbie',
      authProviders: []
    });
});

router.get('/logout', function (req, res, next) {
	req.logout();

	if (req.session !== undefined) {
		req.session.destroy();
	}
	
	req.user = null;

    res.render('login', {
      title: 'You have been logged out of Libbie',
      authProviders: []
    });
});