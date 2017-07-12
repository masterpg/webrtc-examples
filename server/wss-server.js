var fs = require('fs');
var https = require('https');
var WebSocketServer = require('ws').Server;

var server = https.createServer({
  key: fs.readFileSync('./server.key'),
  cert: fs.readFileSync('./server.crt')
}, function (req, res) {
  res.writeHead(200);
  res.end('All glory to WebSockets!\n');
}).listen(8888);

var wss = new WebSocketServer({server: server});

var users = {};

function sendTo(conn, message) {
  conn.send(JSON.stringify(message));
}

wss.on('connection', function (conn) {
  /**
   * ある端末からメッセージを受信した際のハンドラです。
   */
  conn.on('message', function (message) {
    var data;

    try {
      data = JSON.parse(message);
    } catch (e) {
      console.log("Error parsing JSON");
      data = {};
    }

    switch (data.type) {
      //------------------------------
      //  login
      //------------------------------
      case "login":
        console.log("User logged in as", data.name);
        // 既に同じ名前のユーザーがログインしている場合
        if (users[data.name]) {
          // ログイン失敗を通知
          sendTo(conn, {
            type: "login",
            success: false
          });
        }
        // まだ指定された名前のユーザーがログインされていない場合
        else {
          users[data.name] = conn;
          conn.name = data.name;
          // ログイン成功を通知
          sendTo(conn, {
            type: "login",
            success: true
          });
        }

        break;
      //------------------------------
      //  offer
      //------------------------------
      case "offer":
        console.log("Sending offer to", data.name);
        var otherConn = users[data.name];

        if (otherConn != null) {
          otherConn.otherName = data.name;
          // offerした端末から指定の端末へofferデータを送信
          sendTo(otherConn, {
            type: "offer",
            offer: data.offer,
            name: conn.name
          });
        }

        break;
      //------------------------------
      //  answer
      //------------------------------
      case "answer":
        console.log("Sending answer to", data.name);
        var otherConn = users[data.name];

        if (otherConn != null) {
          conn.otherName = data.name;
          // offerを受信した端末から指定の端末へanswerデータを返答
          sendTo(otherConn, {
            type: "answer",
            answer: data.answer
          });
        }

        break;
      //------------------------------
      //  candidate
      //------------------------------
      case "candidate":
        console.log("Sending candidate to", data.name);
        var otherConn = users[data.name];

        if (otherConn != null) {
          // 指定の端末に候補リストを送信
          sendTo(otherConn, {
            type: "candidate",
            candidate: data.candidate
          });
        }

        break;
      //------------------------------
      //  leave
      //------------------------------
      case "leave":
        console.log("Disconnecting user from", data.name);
        var otherConn = users[data.name];
        otherConn.otherName = null;

        // 指定のコネクションが存在する場合
        if (otherConn != null) {
          // 指定の端末に切断を通知
          sendTo(otherConn, {
            type: "leave"
          });
        }

        break;
      //------------------------------
      //  error
      //------------------------------
      default:
        sendTo(conn, {
          type: "error",
          message: "Unrecognized command: " + data.type
        });

        break;
    }
  });

  /**
   * ある端末のコネクションがクローズした際のハンドラです。
   */
  conn.on('close', function () {
    if (conn.name) {
      delete users[conn.name];

      if (conn.otherName) {
        console.log("Disconnecting user from", conn.otherName);
        var otherConn = users[conn.otherName];
        otherConn.otherName = null;

        // クローズしたコネクションの相手先であるコネクションが存在する場合
        if (otherConn != null) {
          // 相手先の端末に切断を通知
          sendTo(otherConn, {
            type: "leave"
          });
        }
      }
    }
  });

  /**
   * ある端末のコネクションでエラーが発生した際のハンドラです。
   */
  conn.on('error', function (err) {
    console.log(err);
  });
});

wss.on('listening', function () {
  console.log("Server started...");
});
