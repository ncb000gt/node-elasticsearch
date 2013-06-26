function getIndexSyntax (options, config) {
	'use strict';

	var syntax = '';

	if (options._indices && Array.isArray(options._indices)) {
		syntax = options._indices.join(',');
	} else if (options._index) {
		syntax = options._index;
	} else if (config && config._indices && Array.isArray(config._indices)) {
		syntax = config._indices.join(',');
	} else if (config && config._index) {
		syntax = config._index;
	}

	return syntax;
}


function getParameters (options, excludes) {
	'use strict';

	var params;

	Object.keys(options).forEach(function (key) {
		if (excludes.indexOf(key) === -1) {
			params = (params || '') + key + '=' + options[key] + '&';
			delete options[key];
		}
	});

	return params ? params.substring(0, params.length - 1) : '';
}


function getTypeSyntax (options, config) {
	'use strict';

	var syntax = '';

	if (options._types && Array.isArray(options._types)) {
		syntax = options._types.join(',');
	} else if (options._type) {
		syntax = options._type;
	} else if (config && config._types && Array.isArray(config._types)) {
		syntax = config._types.join(',');
	} else if (config && config._type) {
		syntax = config._type;
	}

	return syntax;
}


function optionsUndefined (options, config, keys) {
	'use strict';

	var error;

	keys.every(function (key) {
		if (key === '_index' &&
				(options.hasOwnProperty('_indices') ||
				config.hasOwnProperty('_indices'))) {
			return true;
		}

		if (key === '_type' &&
				(options.hasOwnProperty('_types') ||
				config.hasOwnProperty('_types'))) {
			return true;
		}

		if (!options.hasOwnProperty(key) && !config.hasOwnProperty(key)) {
			error = new Error(key + ' is required');
			return false;
		}

		return true;
	});

	return error || false;
}


function pathAppend (resource) {
	'use strict';

	if (resource) {
		return '/' + resource;
	}

	return '';
}


module.exports = function (config, req, self) {
	'use strict';

	self = self || {};

	var paramExcludes = Object.keys(config)
		.concat(['_id', '_create']);

	self.bulk = function (options, commands, callback) {
		if (!callback && typeof commands === 'function') {
			callback = commands;
			commands = options;
			options = {};
		}

		if (!Array.isArray(commands)) {
			return callback(new Error('commands provided must be in array format'));
		}

		var
			index = getIndexSyntax(options, null), // specifically don't want default settings
			type = getTypeSyntax(options, null),
			params = getParameters(options, paramExcludes),
			path = index +
				(index ? pathAppend(type) : '') +
				(index ? pathAppend('_bulk') : '_bulk'),
			serializedCommands = '';

		commands.forEach(function (command) {
			serializedCommands += JSON.stringify(command);
			serializedCommands += '\n';
		});

		options.path = path + (params ? '?' + params : '');

		return req.post(options, serializedCommands, callback);
	};

	self.count = function (options, query, callback) {
		if (!callback && typeof query === 'function') {
			callback = query;
			query = options;
			options = {};
		}

		if (!callback && !query && typeof options === 'function') {
			callback = options;
			query = null;
			options = {};
		}

		var
			index = getIndexSyntax(options, config),
			type = getTypeSyntax(options, config),
			params = getParameters(options, paramExcludes),
			path = index +
				(index ? pathAppend(type) : '') +
				(index ? pathAppend('_count') : '_count');

		options.path = path + (params ? '?' + params : '');

		if (query) {
			return req.post(options, query, callback);
		} else {
			return req.get(options, callback);
		}
	};

	self.delete = function (options, callback) {
		if (!callback && typeof options === 'function') {
			callback = options;
			options = {};
		}

		var err = optionsUndefined(options, config, ['_index']);
		if (err) {
			return callback(err);
		}

		var
			index = getIndexSyntax(options, config),
			type = getTypeSyntax(options, config),
			params = getParameters(options, paramExcludes),
			path = index +
				pathAppend(type) +
				pathAppend(options._id);

		options.path = path + (params ? '?' + params : '');

		return req.delete(options, callback);
	};

	/*
	self.deleteByQuery = function (options, query, callback) {
		if (!callback && typeof query === 'function') {
			callback = query;
			query = options;
			options = {};
		}

		var err = optionsUndefined(options, config, ['_index']);
		if (err) {
			return callback(err);
		}


	};
	*/

	self.exists = function (options, callback) {
		if (!callback && typeof options === 'function') {
			callback = options;
			options = {};
		}

		var err = optionsUndefined(options, config, ['_index']);
		if (err) {
			return callback(err);
		}

		var
			index = getIndexSyntax(options, config),
			type = getTypeSyntax(options, config),
			params = getParameters(options, paramExcludes),
			path = index +
				pathAppend(type) +
				pathAppend(options._id);

		options.path = path + (params ? '?' + params : '');

		return req.head(options, function (err, data) {
			if (err) {
				return callback(err);
			}

			data.exists = (data ? data.statusCode === 200 : false);
			return callback(null, data);
		});
	};

	self.get = function (options, callback) {
		if (!callback && typeof options === 'function') {
			callback = options;
			options = {};
		}

		var err = optionsUndefined(options, config, ['_index', '_type', '_id']);
		if (err) {
			return callback(err);
		}

		if (Array.isArray(options._id)) {
			var docs = [];
			options._id.forEach(function (id) {
				docs.push({
					_id : id
				});
			});
			return self.multiGet(options, docs, callback);
		}

		var
			index = getIndexSyntax(options, config),
			type = getTypeSyntax(options, config),
			params = getParameters(options, paramExcludes),
			path = index +
				pathAppend(type) +
				pathAppend(options._id);

		options.path = path + (params ? '?' + params : '');

		return req.get(options, callback);
	};

	self.index = function (options, doc, callback) {
		if (!callback && typeof doc === 'function') {
			callback = doc;
			doc = options;
			options = {};
		}

		var err = optionsUndefined(options, config, ['_index', '_type']);
		if (err) {
			return callback(err);
		}

		var
			index = getIndexSyntax(options, config),
			type = getTypeSyntax(options, config),
			params = getParameters(options, paramExcludes),
			path = index +
				pathAppend(type) +
				pathAppend(options._id) +
				pathAppend(options.create ? '_create' : '');

		options.path = path + (params ? '?' + params : '');

		if (options._id) {
			return req.put(options, doc, callback);
		} else {
			return req.post(options, doc, callback);
		}
	};

	self.multiGet = function (options, docs, callback) {
		if (!callback && typeof docs === 'function') {
			callback = docs;
			docs = options;
			options = {};
		}

		var
			missingIndex = false,
			missingType = false;

		docs.every(function (doc) {
			doc._index = doc._index || options._index || config._index || null;
			doc._type = doc._type || options._type || config._type || null;

			if (!doc._index || doc._index === null) {
				missingIndex = true;
				return false;
			}

			if (!doc._type) {
				missingType = true;
				return false;
			}

			return true;
		});

		if (missingIndex) {
			return callback(new Error('at least 1 or more docs supplied is missing index'));
		}

		if (missingType) {
			return callback(new Error('at least 1 or more docs supplied is missing type'));
		}

		options.path = '_mget';

		return req.post(options, docs, callback);
	};

	self.multiSearch = function (options, queries, callback) {
		if (!callback && typeof queries === 'function') {
			callback = queries;
			queries = options;
			options = {};
		}

		if (!Array.isArray(queries)) {
			return callback(new Error('queries provided must be in array format'));
		}

		var
			index = getIndexSyntax(options, null), // specifically want to exclude defaults
			type = getTypeSyntax(options, null),
			params = getParameters(options, paramExcludes),
			path = (index) +
				(index ? pathAppend(type) : '') +
				(index ? pathAppend('_msearch') : '_msearch'),
			serializedQueries = '';

		queries.forEach(function (query) {
			serializedQueries += JSON.stringify(query);
			serializedQueries += '\n';
		});

		options.path = path + (params ? '?' + params : '');

		return req.post(options, serializedQueries, callback);
	};

	self.percolate = function (options, doc, callback) {
		if (!callback && typeof doc === 'function') {
			callback = doc;
			doc = options;
			options = {};
		}

		var err = optionsUndefined(options, config, ['_index', '_type']);
		if (err) {
			return callback(err);
		}

		var
			index = getIndexSyntax(options, config),
			type = getTypeSyntax(options, config),
			params = getParameters(options, paramExcludes),
			path = index +
				pathAppend(type) +
				pathAppend('_percolate');

		options.path = path + (params ? '?' + params : '');

		return req.post(options, doc, callback);
	};

	self.registerPercolator = function (options, query, callback) {
		if (!callback && typeof query === 'function') {
			callback = query;
			query = options;
			options = {};
		}

		var err = optionsUndefined(options, config, ['_index', 'name']);
		if (err) {
			return callback(err);
		}

		var
			index = getIndexSyntax(options, config),
			params = getParameters(options, paramExcludes.concat(['name'])),
			path = '_percolator' +
				pathAppend(index) +
				pathAppend(options.name);

		options.path = path + (params ? '?' + params : '');

		return req.put(options, query, callback);
	};

	self.search = function (options, query, callback) {
		if (!callback && typeof query === 'function') {
			callback = query;
			query = options;
			options = {};
		}

		var err = optionsUndefined(options, config, ['_index']);
		if (err) {
			return callback(err);
		}

		var
			index = getIndexSyntax(options, config),
			type = getTypeSyntax(options, config),
			params = getParameters(options, paramExcludes),
			path = index +
				pathAppend(type) +
				pathAppend('_search');

		options.path = path + (params ? '?' + params : '');

		return req.post(options, query, callback);
	};

	self.unregisterPercolator = function (options, callback) {
		if (!callback && typeof options === 'function') {
			callback = options;
			options = {};
		}

		var err = optionsUndefined(options, config, ['_index', 'name']);
		if (err) {
			return callback(err);
		}

		var
			index = getIndexSyntax(options, config),
			params = getParameters(options, paramExcludes.concat(['name'])),
			path = '_percolator' +
				pathAppend(index) +
				pathAppend(options.name);

		options.path = path + (params ? '?' + params : '');

		return req.delete(options, callback);
	};

	self.update = function (options, doc, callback) {
		if (!callback && typeof doc === 'function') {
			callback = doc;
			doc = options;
			options = {};
		}

		var err = optionsUndefined(options, config, ['_index', '_type', '_id']);
		if (err) {
			return callback(err);
		}

		if (!doc.script && !doc.doc) {
			return callback(new Error('script or doc is required for update operation'));
		}

		var
			index = getIndexSyntax(options, config),
			type = getTypeSyntax(options, config),
			params = getParameters(options, paramExcludes),
			path = index +
				pathAppend(type) +
				pathAppend(options._id) +
				pathAppend('_update');

		options.path = path + (params ? '?' + params : '');

		return req.post(options, doc, callback);
	};

	return self;
};