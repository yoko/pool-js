/*
 * Pool v0.1.3
 * http://github.com/yoko/pool-js/tree/master
 *
 * Copyright (c) 2009- yksk <http://codefairy.org/>
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

Pool = function(name, task, handler) {
	var context;
	if (this instanceof Pool) {
		if (name !== null) {
			context = name || arguments.callee.caller || window;
			context[Pool.namespace] = this;
		}
		return this.init();
	}

	context = arguments.callee.caller || window;
	var pool = Pool.at(context) || new Pool(context);
	if (name in pool.pool)
		return pool.get(name, handler);
	else
		return pool.register(name, task).get(name, handler);
};

Pool.namespace = '__pool__';

Pool.at = function(context) {
	if (!context) return;
	return (typeof context == 'string') ?
		Pool['__'+context+'__'] :
		context[Pool.namespace];
};

Pool.release = function(context) {
	if (typeof context == 'string') {
		var namespace = '__'+context+'__';
		var pool = Pool[namespace];
		if (pool) {
			var p = pool.pool;
			for (k in p) Pool.Storage[context](k, null);
			delete Pool[namespace];
		}
	}
	else {
		context = context || arguments.callee.caller || window;
		context[Pool.namespace] = undefined;
	}
};

Pool.register = function(name, task) {
	var context = arguments.callee.caller || window;
	var pool = Pool.at(context) || new Pool(context);
	pool.register(name, task);
	return pool;
};

Pool.get = function(name, handler) {
	return Pool.at(arguments.callee.caller || window).get(name, handler);
};

Pool.extend = function(target, options) {
	for (var name in options)
		target[name] = options[name];

	return target;
};

Pool.makeArray = function(obj) {
	return Array.prototype.slice.call(obj);
};

Pool.prototype = {
	init: function() {
		this.tasks = {};
		this.pool = {};

		return this;
	},

	remove: function(name) {
		delete this.pool[name];
		delete this.tasks[name];
		return this;
	},

	register: function(name, task) {
		this.tasks[name] = task;
		return this;
	},

	get: function(name, handler) {
		var self = this;
		var data;

		if (!(name in this.pool)) this.restore(name);

		if (name in this.pool) {
			data = this.pool[name];
			var bind = (data instanceof Array) ? 'apply' : 'call';
			if (typeof handler == 'function')
				handler[bind](null, data);
			else
				return data;
		}
		if (name in this.tasks) {
			var task = this.tasks[name];
			if (typeof handler == 'function') {
				var _handler = handler;
				handler = function() {
					var data = Pool.makeArray(arguments);
					self.save(name, data);

					return _handler.apply(this, data);
				};
				task(handler);
			}
			else {
				data = (this.pool[name] = (typeof task == 'function') ? task() : task);
				this.save(name, data);
				return data;
			}
		}
	},

	save: function(name, data) {
		this.pool[name] = data;
		return this;
	},

	restore: function() {}
};


Pool.Storage = function(storage, name, task, handler, options) {
	var pool;
	if (this instanceof Pool.Storage) {
		if (Pool.Storage.support[storage] === undefined) return {};
		var namespace = '__'+storage+'__';
		pool = Pool[namespace] || (Pool[namespace] = this);
		pool.storage = storage;
		pool.options = name;
		return pool.init();
	}

	if (typeof handler != 'function') {
		options = handler;
		handler = undefined;
	}
	pool = Pool.at(storage) || new Pool.Storage(storage);
	pool.restore(name);
	if (name in pool.pool)
		return pool.get(name, handler);
	else
		return pool.register(name, task, options).get(name, handler);
};

Pool.Storage.support = {
	cookie        : ('cookie' in document),
	sessionStorage: ('sessionStorage' in window),
	localStorage  : ('localStorage' in window)
};

Pool.Storage.cookie = function(name, value, options) {
	if (!Pool.Storage.support.cookie || !name) return;

	var ret;
	switch (value) {
		case undefined:
			var cookie = document.cookie;
			if (cookie && cookie != '') {
				var cookies = cookie.split(';');
				var n = new RegExp('^'+name+'=(.+)$');
				for (var i = 0, l = cookies.length; i < l; i++) {
					var v = n.exec(cookies[i].replace(/^\s+|\s+$/g, ''));
					if (v) {
						ret = JSON.parse(decodeURIComponent(v[1]));
						break;
					}
				}
			}
			break;
		default:
			options = options || {};
			if (value === null) {
				value = '';
				options.expires = 1;
			}

			var params = {
				expires: options.expires ?
					new Date(options.expires).toUTCString() :
					null,
				path   : options.path,
				domain : options.domain
			};
			var p = [];
			for (var k in params) {
				var v = params[k];
				if (v) p.push(k+'='+v);
			}
			if (options.secure) p.push('secure');
			p.unshift(encodeURIComponent(JSON.stringify(value)));

			document.cookie = name+'='+p.join(';');
			ret = true;
	}
	return ret;
};

Pool.Storage.sessionStorage = function(name, value) {
	if (!Pool.Storage.support.sessionStorage || !name) return;

	var storage = window.sessionStorage;
	var ret;
	switch (value) {
		case undefined:
			if (name in storage) {
				var data = storage[name];
				ret = JSON.parse(data);
			}
			break;
		case null:
			ret = delete storage[name];
			break;
		default:
			storage[name] = JSON.stringify(value);
			ret = true;
	}
	return ret;
};

Pool.Storage.localStorage = function(name, value, options) {
	if (!Pool.Storage.support.localStorage || !name) return;

	var storage = window.localStorage;
	var ret;
	switch (value) {
		case undefined:
			if (name in storage) {
				var data = JSON.parse(storage[name]);
				if (data && ('value' in data) &&
					!(data.options && data.options.expires < new Date().getTime()))
					ret = data.value;
			}
			break;
		case null:
			ret = delete storage[name];
			break;
		default:
			storage[name] = JSON.stringify({
				value  : value,
				options: options
			});
			ret = true;
	}
	return ret;
};

Pool.Storage.prototype = Pool.extend(new Pool(null), {
	remove: function(name) {
		Pool.prototype.remove.call(this, name);
		Pool.Storage[this.storage](name, null);
		return this;
	},

	save: function(name, data) {
		this.pool[name] = data;
		Pool.Storage[this.storage](name, data);
		return this;
	},

	restore: function(name) {
		var data = Pool.Storage[this.storage](name);
		if (data !== undefined) this.pool[name] = data;
		return data;
	}
});

new function() {
	var storages = ['cookie', 'sessionStorage', 'localStorage'];

	for (var i = 0, l = storages.length; i < l; i++) (function(i) {
		var storage = storages[i];
		Pool[storage] = function(name, task, handler, options) {
			return Pool.Storage(storage, name, task, handler, options);
		};
	})(i);
};
