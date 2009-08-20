/*
 * Pool v0.0
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

Pool.destroy = function(context) {
	if (typeof context == 'string') {
		var namespace = '__'+context+'__';
		var pool = Pool[namespace];
		var tasks = pool.tasks;
		for (k in tasks) Pool.Storage[context](k, null);
		delete Pool[namespace];
	}
	else
		delete context[Pool.namespace];
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

Pool.sessionStorage = function(name, task, handler, options) {
	if (typeof handler != 'function') {
		options = handler;
		handler = undefined;
	}
	new Pool.Storage('sessionStorage', name, task, handler, options);
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

	list: function() {
		return Pool.extend({}, this.pool);
	},

	clear: function(name, unregister) {
		delete this.pool[name];
		if (unregister) delete this.tasks[name];
	},

	register: function(name, task) {
		this.clear(name);
		this.tasks[name] = task;
		return this;
	},

	get: function(name, handler) {
		var self = this;
		var data;

		if (name in this.pool) {
			data = this.pool[name];
			var bind = ($.isArray(data)) ? 'apply' : 'call';
			return (typeof handler == 'function') ?
				handler[bind](null, data) :
				data;
		}
		if (name in this.tasks) {
			if (typeof handler == 'function') {
				var _handler = handler;
				handler = function() {
					var data = Pool.makeArray(arguments);
					self.pool[name] = data;

					return _handler.apply(this, data);
				};
				task(handler);
			}
			else {
				var task = this.tasks[name];
				return (this.pool[name] = (typeof task == 'function') ? task() : task);
			}
		}
	}
};
