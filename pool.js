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
	if (this instanceof Pool) {
		var context = name || arguments.callee.caller;
		context[Pool.namespace] = this;
		return this.init();
	}

	var context = arguments.callee.caller;
	var pool = Pool.at(context) || new Pool(context);
	if (name in pool.pool)
		return pool.get(name, handler);
	else
		return pool.register(name, task).get(name, handler);
};

Pool.namespace = '__pool__';

Pool.at = function(context) {
	if (!context) return;
	if (typeof context == 'string')
		return Pool['__'+context+'__'];
	else
		return context[Pool.namespace];
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
	var context = arguments.callee.caller;
	var pool = Pool.at(context) || new Pool(context);
	pool.register(name, task);
	return pool;
};

Pool.get = function(name, handler) {
	return Pool.at(arguments.callee.caller).get(name, handler);
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

		if (name in this.pool) {
			var data = this.pool[name];
			console.log('data', data)
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
			}

			var task = this.tasks[name];
			var data = (typeof task == 'function') ? task(handler) : task;
			this.pool[name] = data;
			return data;
		}
	}
};
