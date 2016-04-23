var path = require('path'),
rootPath = path.normalize(__dirname + '/..'),
env = process.env.NODE_ENV || 'development';

console.log("Config: ", process.env);

var dbConfig = {
	connString: process.env.SQLCONNSTR_MS_TableConnectionString,
	server: '',
	userName: '',
	password: '',
	database: '',
	encrypt: true,
	port: 1433,
};

if (typeof dbConfig.connString === 'string' && dbConfig.connString.length > 0) {
	var parser = require('./msconnstring-parser.js');
	var connInfo = parser.parse(dbConfig.connString);
	dbConfig.userName = connInfo.userId;
	dbConfig.server = connInfo.dataSource.uri;
	dbConfig.password = connInfo.password;
	dbConfig.database = connInfo.initialCatalog;
	dbConfig.port = connInfo.dataSource.port;
}

console.log("Database configuration: ", dbConfig);

var sessionConfig = {
	secret: process.env.SESSION_SECRET,
	key: 'libbieauth',
};

var googleConfig = {
	clientId: process.env.GOOGLE_CLIENT_ID,
	clientSecret: process.env.GOOGLE_CLIENT_SECRET,
};

var goodreadsConfig = {
	key: process.env.GOODREADS_KEY,
	secret: process.env.GOODREADS_SECRET,
};

var config = {
	development: {
		root: rootPath,
		app: {
			name: 'libbie'
		},
		port: process.env.PORT || 3000,
		session: sessionConfig,
		google: googleConfig,
		goodreads: goodreadsConfig,
		database: dbConfig,
	},

	test: {
		root: rootPath,
		app: {
			name: 'libbie'
		},
		port: process.env.PORT || 3000,
		session: sessionConfig,
		google: googleConfig,
		goodreads: goodreadsConfig,
		database: dbConfig,
	},

	production: {
		root: rootPath,
		app: {
			name: 'libbie'
		},
		port: process.env.PORT || 3000,
		session: sessionConfig,
		google: googleConfig,
		goodreads: goodreadsConfig,
		database: dbConfig,
	}
};

module.exports = config[env];
