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
			var kvp = fields[field].split('=', 2);
			if (kvp.length != 2) {
				continue;
			}

			var key = camelCase(kvp[0]);
			if (typeof knownFields[key] === 'function') {
				obj[key] = knownFields[key](kvp[1]);
			} else {
				obj[key] = kvp[1];
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

	var str = words.join('');

	if (str.length === 1) {
		return str.toLowerCase();
	} else if (str.length > 1) {
		return str[0].toLowerCase() + str.substring(1, str.length);
	} else {
		return '';
	}
}