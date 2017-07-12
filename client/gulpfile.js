'use strict';

var gulp = require('gulp');
var browserSync = require('browser-sync');

/**
 * Browsersyncを起動します。
 */
gulp.task('serve', [], function () {
  // Browsersyncの設定
  browserSync({
    https: true,
    ghostMode: false,
    port: 3000,
    ui: {port: 3001},
    proxy: {
      // 本来アクセスすべきWEBサーバーを指定する
      target: 'https://192.168.1.21:8888',
      //
      ws: true
    },
    // 追加フォルダの指定
    // 左に指定したものの方が優先度が高くなる
    serveStatic: ['.']
  });
});
