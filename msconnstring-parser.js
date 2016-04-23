var knownFields = {
	'dataSource': dataSourceParser,
};

var m = module.exports = {
	fieldChar: ';',
	parse: function (connString) {
		if (typeof connString !== 'string') {
			return {};
		}

		var fields = connString.split(m.fieldChar);
		var obj = {};

		for (var field in fields) {
			var split = fields[field].indexOf('=');

			if (split < 1) {
				continue;
			}

			var key = camelCase(fields[field].substring(0, split));
			var value = fields[field].substring(split + 1, fields[field].length);
			if (typeof knownFields[key] === 'function') {
				obj[key] = knownFields[key](value);
			} else {
				obj[key] = value;
			}
		}

		return obj;
	} 
};

function dataSourceParser(dataSourceString) {
	var obj = {
		method: 'tcp',
		port: 0,
		uri: '',
		uriString: '',
		sourceString: dataSourceString,
	};

	var methodIndex = dataSourceString.indexOf(':');
	if (methodIndex >= 0) {
		obj.method = dataSourceString.substring(0, methodIndex);
	}

	var portIndex = dataSourceString.indexOf(',');
	if (portIndex <= methodIndex) {
		// Invalid
		return dataSourceString;
	} else if (portIndex === -1) {
		portIndex = dataSourceString.length;
	}

	obj.uri = dataSourceString.substring(methodIndex !== -1 ? methodIndex + 1 : 0, portIndex);

	if (portIndex !== dataSourceString.length) {
		obj.port = parseInt(dataSourceString.substring(portIndex + 1, dataSourceString.length));
	}

	obj.uriString = obj.method.toString() + '://' + obj.uri.toString() + ':' + obj.port.toString();

	return obj;
}

function camelCase(inStr) {
	var words = inStr.split(/\s+/);

	if (words.length > 1) {
		for (var w in words) {
			var word = words[w];
			if (word.length === 1) {
				word = word.toUpperCase();
			} else if (word.length > 1) {
				word = word[0].toUpperCase() + word.substring(1, word.length).toLowerCase();
			} else {
				continue;
			}

			words[w] = word;
		}
	}

	var str = words.join('');

	if (str.length === 1) {
		return str.toLowerCase();
	} else if (str.length > 1) {
		return str[0].toLowerCase() + str.substring(1, str.length);
	} else {
		return '';
	}
}