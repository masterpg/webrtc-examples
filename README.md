# webrtc-examples

## 環境構築

サンプル実行の環境を作成するには[node.js](https://nodejs.org/en/)をインストールしている必要があります。

### クライアント環境の構築

``client``ディレクトリへ移動し、次のコマンドを実行します:

```bash
npm install
```

``client/gulpfile.js``を次のように修正します:

```js
proxy: {
  // 本来アクセスすべきWEBサーバーを指定する
  target: 'https://192.168.1.21:8888', // ← 自身の端末のIPへ変更
```

次の3つのファイルを下で以下で示したように修正します:

* ``client/filesharing/index.js``
* ``client/textchat/index.js``
* ``client/videocall/index.js``

```js
var connection = new WebSocket('wss://192.168.1.21:3000'); // ← 自身の端末のIPへ変更
```


### サーバー環境の構築

``server``のルートディレクトリへ移動し、次のコマンドを実行します:

```bash
npm install
```

## サンプル実行

ターミナルを立ち上げ``client``ディレクトリへ移動し、次のコマンドでWEBサーバーを起動します:

```bash
gulp serve
```

上記とは別のターミナルを立ち上げ``server``ディレクトリへ移動し、次のコマンドでWebSocketサーバーを起動します:

```bash
node wss-server.js
```

2つとも起動したら実行したいサンプルのHTMLへURLでアクセスしてください:

```
https://192.168.1.21:3000/localmedia/index.html
```