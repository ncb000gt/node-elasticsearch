var utils = require('./utils');


module.exports = function (config, req, self) {
	'use strict';

	self = self || {};

	var paramExcludes = Object.keys(config)
		.concat(['_create', '_id', '_index', '_indices', '_source', '_type', '_types']);

	// http://www.elasticsearch.org/guide/reference/api/bulk/
	// Note: Formats input queries as follows in POST data:
	//
	// { header : {} } \n
	// { data : {} } \n
	// { header : {} } \n
	// { data : {} } \n
	//
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
			index = utils.getIndexSyntax(options, null), // specifically don't want default settings
			type = utils.getTypeSyntax(options, null),
			params = req.formatParameters(options, paramExcludes),
			path = req.pathAppend(index) +
				(index ? req.pathAppend(type) : '') +
				req.pathAppend('_bulk'),
			serializedCommands = '';

		commands.forEach(function (command) {
			serializedCommands += JSON.stringify(command);
			serializedCommands += '\n';
		});

		options.path = path + (params ? '?' + params : '');

		return req.post(options, serializedCommands, callback);
	};

	// http://www.elasticsearch.org/guide/reference/api/count/
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
			index = utils.getIndexSyntax(options, config),
			type = utils.getTypeSyntax(options, config),
			params = req.formatParameters(options, paramExcludes),
			path = req.pathAppend(index) +
				(index ? req.pathAppend(type) : '') +
				req.pathAppend('_count');

		options.path = path + (params ? '?' + params : '');

		if (query) {
			return req.post(options, query, callback);
		} else {
			return req.get(options, callback);
		}
	};

	// http://www.elasticsearch.org/guide/reference/api/delete/
	self.delete = function (options, callback) {
		if (!callback && typeof options === 'function') {
			callback = options;
			options = {};
		}

		var err = utils.optionsUndefined(options, config, ['_index']);
		if (err) {
			return callback(err);
		}

		var
			index = utils.getIndexSyntax(options, config),
			type = utils.getTypeSyntax(options, config),
			params = req.formatParameters(options, paramExcludes),
			path = req.pathAppend(index) +
				req.pathAppend(type) +
				req.pathAppend(options._id);

		options.path = path + (params ? '?' + params : '');

		return req.delete(options, callback);
	};

	// http://www.elasticsearch.org/guide/reference/api/delete-by-query/
	self.deleteByQuery = function (options, query, callback) {
		if (!callback && typeof query === 'function') {
			callback = query;
			query = options;
			options = {};
		}

		var err = utils.optionsUndefined(options, config, ['_index']);
		if (err) {
			return callback(err);
		}

		var
			index = utils.getIndexSyntax(options, config),
			type = utils.getTypeSyntax(options, config),
			params = req.formatParameters(options, paramExcludes),
			path = req.pathAppend(index) +
				req.pathAppend(type) +
				req.pathAppend('_query');

		options.path = path + (params ? '?' + params : '');

		// documentation indicates DELETE method...
		// sending POST data via DELETE not typical
		return req.delete(options, query, callback);
	};

	// http://www.elasticsearch.org/guide/reference/api/get/
	self.exists = function (options, callback) {
		if (!callback && typeof options === 'function') {
			callback = options;
			options = {};
		}

		var err = utils.optionsUndefined(options, config, ['_index']);
		if (err) {
			return callback(err);
		}

		var
			index = utils.getIndexSyntax(options, config),
			type = utils.getTypeSyntax(options, config),
			params = req.formatParameters(options, paramExcludes),
			path = req.pathAppend(index) +
				req.pathAppend(type) +
				req.pathAppend(options._id);

		options.path = path + (params ? '?' + params : '');

		return req.head(options, function (err, data) {
			if (err) {
				return callback(err);
			}

			data.exists = (data ? data.statusCode === 200 : false);
			return callback(null, data);
		});
	};

	// http://www.elasticsearch.org/guide/reference/api/explain/
	self.explain = function (options, query, callback) {
		if (!callback && typeof query === 'function') {
			callback = query;
			query = options;
			options = {};
		}

		var err = utils.optionsUndefined(options, config, ['_index', '_type', '_id']);
		if (err) {
			return callback(err);
		}

		var
			index = utils.getIndexSyntax(options, config),
			type = utils.getTypeSyntax(options, config),
			params = req.formatParameters(options, paramExcludes),
			path = req.pathAppend(index) +
				req.pathAppend(type) +
				req.pathAppend(options._id) +
				req.pathAppend('_explain');

		options.path = path + (params ? '?' + params : '');

		// documentation indicates GET method...
		// sending POST data via GET not typical
		return req.get(options, query, callback);
	};

	// http://www.elasticsearch.org/guide/reference/api/get/
	self.get = function (options, callback) {
		if (!callback && typeof options === 'function') {
			callback = options;
			options = {};
		}

		var err = utils.optionsUndefined(options, config, ['_index', '_type', '_id']);
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
			index = utils.getIndexSyntax(options, config),
			type = utils.getTypeSyntax(options, config),
			params = req.formatParameters(options, paramExcludes),
			path = req.pathAppend(index) +
				req.pathAppend(type) +
				req.pathAppend(options._id) +
				(options._source ? req.pathAppend('_source') : '');

		options.path = path + (params ? '?' + params : '');

		return req.get(options, callback);
	};

	// http://www.elasticsearch.org/guide/reference/api/index_/
	// .add to ease backwards compatibility
	self.index = self.add = function (options, doc, callback) {
		if (!callback && typeof doc === 'function') {
			callback = doc;
			doc = options;
			options = {};
		}

		var err = utils.optionsUndefined(options, config, ['_index', '_type']);
		if (err) {
			return callback(err);
		}

		var
			index = utils.getIndexSyntax(options, config),
			type = utils.getTypeSyntax(options, config),
			params = req.formatParameters(options, paramExcludes),
			path = req.pathAppend(index) +
				req.pathAppend(type) +
				req.pathAppend(options._id) +
				req.pathAppend(options.create ? '_create' : '');

		options.path = path + (params ? '?' + params : '');

		if (options._id) {
			return req.put(options, doc, callback);
		} else {
			return req.post(options, doc, callback);
		}
	};

	// http://www.elasticsearch.org/guide/reference/api/more-like-this/
	self.moreLikeThis = function (options, callback) {
		if (!callback && typeof options === 'function') {
			callback = options;
			options = {};
		}

		var err = utils.optionsUndefined(options, config, ['_index', '_type', '_id']);
		if (err) {
			return callback(err);
		}

		var
			index = utils.getIndexSyntax(options, config),
			type = utils.getTypeSyntax(options, config),
			params = req.formatParameters(options, paramExcludes),
			path = req.pathAppend(index) +
				req.pathAppend(type) +
				req.pathAppend(options._id) +
				req.pathAppend('_mlt');

		options.path = path + (params ? '?' + params : '');

		return req.get(options, callback);
	};

	// http://www.elasticsearch.org/guide/reference/api/multi-get/
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

		options.path = req.pathAppend('_mget');

		// documentation indicates GET method...
		// sending POST data via GET not typical
		return req.get(options, docs, callback);
	};

	// http://www.elasticsearch.org/guide/reference/api/multi-search/
	// Note: Formats input queries as follows in POST data:
	//
	// { query : {} } \n
	// { query : {} } \n
	// { query : {} } \n
	//
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
			index = utils.getIndexSyntax(options, null), // specifically want to exclude defaults
			type = utils.getTypeSyntax(options, null),
			params = req.formatParameters(options, paramExcludes),
			path = req.pathAppend(index) +
				(index ? req.pathAppend(type) : '') +
				req.pathAppend('_msearch'),
			serializedQueries = '';

		queries.forEach(function (query) {
			serializedQueries += JSON.stringify(query);
			serializedQueries += '\n';
		});

		options.path = path + (params ? '?' + params : '');

		// documentation indicates GET method...
		// sending POST data via GET not typical
		return req.get(options, serializedQueries, callback);
	};

	// http://www.elasticsearch.org/guide/reference/api/percolate/
	self.percolate = function (options, doc, callback) {
		if (!callback && typeof doc === 'function') {
			callback = doc;
			doc = options;
			options = {};
		}

		var err = utils.optionsUndefined(options, config, ['_index', '_type']);
		if (err) {
			return callback(err);
		}

		var
			index = utils.getIndexSyntax(options, config),
			type = utils.getTypeSyntax(options, config),
			params = req.formatParameters(options, paramExcludes),
			path = req.pathAppend(index) +
				req.pathAppend(type) +
				req.pathAppend('_percolate');

		options.path = path + (params ? '?' + params : '');

		// documentation indicates GET method...
		// sending POST data via GET not typical
		return req.get(options, doc, callback);
	};

	// http://www.elasticsearch.org/guide/reference/api/percolate/
	self.registerPercolator = function (options, query, callback) {
		if (!callback && typeof query === 'function') {
			callback = query;
			query = options;
			options = {};
		}

		var err = utils.optionsUndefined(options, config, ['_index', 'name']);
		if (err) {
			return callback(err);
		}

		var
			index = utils.getIndexSyntax(options, config),
			params = req.formatParameters(options, paramExcludes.concat(['name'])),
			path = req.pathAppend('_percolator') +
				req.pathAppend(index) +
				req.pathAppend(options.name);

		options.path = path + (params ? '?' + params : '');

		return req.put(options, query, callback);
	};

	// http://www.elasticsearch.org/guide/reference/api/search/
	// .query to ease backwards compatibility
	self.search = self.query = function (options, query, callback) {
		if (!callback && typeof query === 'function') {
			callback = query;
			query = options;
			options = {};
		}

		var err = utils.optionsUndefined(options, config, ['_index']);
		if (err) {
			return callback(err);
		}

		var
			index = utils.getIndexSyntax(options, config),
			type = utils.getTypeSyntax(options, config),
			params = req.formatParameters(options, paramExcludes),
			path = req.pathAppend(index) +
				req.pathAppend(type) +
				req.pathAppend('_search');

		options.path = path + (params ? '?' + params : '');

		// documentation indicates GET method...
		// sending POST data via GET not typical
		return req.get(options, query, callback);
	};

	// http://www.elasticsearch.org/guide/reference/api/percolate/
	self.unregisterPercolator = function (options, callback) {
		if (!callback && typeof options === 'function') {
			callback = options;
			options = {};
		}

		var err = utils.optionsUndefined(options, config, ['_index', 'name']);
		if (err) {
			return callback(err);
		}

		var
			index = utils.getIndexSyntax(options, config),
			params = req.formatParameters(options, paramExcludes.concat(['name'])),
			path = req.pathAppend('_percolator') +
				req.pathAppend(index) +
				req.pathAppend(options.name);

		options.path = path + (params ? '?' + params : '');

		return req.delete(options, callback);
	};

	// http://www.elasticsearch.org/guide/reference/api/update/
	self.update = function (options, doc, callback) {
		if (!callback && typeof doc === 'function') {
			callback = doc;
			doc = options;
			options = {};
		}

		var err = utils.optionsUndefined(options, config, ['_index', '_type', '_id']);
		if (err) {
			return callback(err);
		}

		if (!doc.script && !doc.doc) {
			return callback(new Error('script or doc is required for update operation'));
		}

		var
			index = utils.getIndexSyntax(options, config),
			type = utils.getTypeSyntax(options, config),
			params = req.formatParameters(options, paramExcludes),
			path = req.pathAppend(index) +
				req.pathAppend(type) +
				req.pathAppend(options._id) +
				req.pathAppend('_update');

		options.path = path + (params ? '?' + params : '');

		return req.post(options, doc, callback);
	};

	// http://www.elasticsearch.org/guide/reference/api/validate/
	self.validate = function (options, query, callback) {
		if (!callback && typeof query === 'function') {
			callback = query;
			query = options;
			options = {};
		}

		var err = utils.optionsUndefined(options, config, ['_index']);
		if (err) {
			return callback(err);
		}

		var
			index = utils.getIndexSyntax(options, config),
			type = utils.getTypeSyntax(options, config),
			params = req.formatParameters(options, paramExcludes),
			path = req.pathAppend(index) +
				req.pathAppend(type) +
				req.pathAppend('_validate/query');

		options.path = path + (params ? '?' + params : '');

		// documentation indicates GET method...
		// sending POST data via GET not typical
		return req.get(options, query, callback);
	};

	return self;
};
