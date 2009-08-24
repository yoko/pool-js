Pool
====
pool.jsは処理の結果をプールするJavaScriptライブラリです。
値を束縛したり、時間の掛かる処理や非同期処理のレスポンスをキャッシュして2度目以降の処理を高速化します。
キャッシュした値をcookie、sessionStorage、localStorageに保存してキャッシュをページリロードを跨いで利用することも出来ます。

Usage
-----

### OOP
	var pool = new Pool();
	pool.register('foo', function() {
		return ['f', 'o', 'o'].join('');
	});
	var foo = pool.get('foo');

### Shortcut
	var foo = Pool('foo', function() {
		return ['f', 'o', 'o'].join('');
	});

### Async
	Pool('async',
		function(f) {
			$.get('./', f);
		},
		function(html) { // handler
			$('body').appendTo(html);
		}
	);

TODO
----
- ドキュメント
