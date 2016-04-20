var path = require('path'),
rootPath = path.normalize(__dirname + '/..'),
env = process.env.NODE_ENV || 'development';

console.log("Config: ", process.env);

var dbConfig = {
	connString: process.env.SQLCONNSTR_MS_TableConnectionString,
};

var googleConfig = {
	clientId: process.env.GOOGLE_CLIENT_ID,
	clientSecret: process.env.GOOGLE_CLIENT_SECRET,
};

var config = {
	development: {
		root: rootPath,
		app: {
			name: 'libbie'
		},
		port: process.env.PORT || 3000,
		sessionSecret: process.env.SESSION_SECRET,
		google: googleConfig,
		database: dbConfig,
	},

	test: {
		root: rootPath,
		app: {
			name: 'libbie'
		},
		port: process.env.PORT || 3000,
		sessionSecret: process.env.SESSION_SECRET,
		google: googleConfig,
		database: dbConfig,
	},

	production: {
		root: rootPath,
		app: {
			name: 'libbie'
		},
		port: process.env.PORT || 3000,
		sessionSecret: process.env.SESSION_SECRET,
		google: googleConfig,
		database: dbConfig,
	}
};

module.exports = config[env];
