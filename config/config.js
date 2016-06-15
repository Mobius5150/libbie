var path = require('path'),
rootPath = path.normalize(__dirname + '/..'),
env = process.env.NODE_ENV || 'development';

var parser = require(path.join(rootPath, 'msconnstring-parser.js'));

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
	var connInfo = parser.parse(dbConfig.connString);
	dbConfig.userName = connInfo.userId;
	dbConfig.server = connInfo.dataSource.uri;
	dbConfig.password = connInfo.password;
	dbConfig.database = connInfo.initialCatalog;
	dbConfig.port = connInfo.dataSource.port;
}

var storageConfig = {
	connString: process.env.CUSTOMCONNSTR_MS_AzureStorageAccountConnectionString,
	storageAccount: '',
	accessKey: '',
};

if (typeof storageConfig.connString === 'string' && storageConfig.connString.length > 0) {
	var connInfo = parser.parse(storageConfig.connString);
	storageConfig.storageAccount = connInfo.accountName;
	storageConfig.accessKey = connInfo.accountKey;
}

var userDataConfig = {
	providers: {
		goodreads: {
			storage: storageConfig,
			tableName: process.env.GR_USER_DATA_TABLE,
		},
	},
};

var sessionConfig = {
	secret: process.env.SESSION_SECRET,
	key: 'libbieauth',
};

var googleConfig = {
	clientId: process.env.GOOGLE_CLIENT_ID,
	clientSecret: process.env.GOOGLE_CLIENT_SECRET,
};

var goodreadsConfig = [];

for (var i = 0; i < 10; ++i) {
	if (typeof process.env['GOODREADS_KEY' + i] !== 'undefined') {
		goodreadsConfig.push({
			key: process.env['GOODREADS_KEY' + i],
			secret: process.env['GOODREADS_SECRET' + i]
		})
	}
}

var config = {
	development: {
		root: rootPath,
		app: {
			name: 'libbie'
		},
		serverUrl: 'http://localhost:3000',
		environment: env,
		port: process.env.PORT || 3000,
		session: sessionConfig,
		google: googleConfig,
		goodreads: goodreadsConfig,
		database: dbConfig,
		storage: storageConfig,
		userData: userDataConfig,
	},

	test: {
		root: rootPath,
		app: {
			name: 'libbie'
		},
		serverUrl: 'http://localhost:3000',
		environment: env,
		port: process.env.PORT || 3000,
		session: sessionConfig,
		google: googleConfig,
		goodreads: goodreadsConfig,
		database: dbConfig,
		storage: storageConfig,
		userData: userDataConfig,
	},

	production: {
		root: rootPath,
		app: {
			name: 'libbie'
		},
		serverUrl: 'https://libbie.azurewebsites.net',
		environment: env,
		port: process.env.PORT || 3000,
		session: sessionConfig,
		google: googleConfig,
		goodreads: goodreadsConfig,
		database: dbConfig,
		storage: storageConfig,
		userData: userDataConfig,
	}
};

module.exports = config[env];
