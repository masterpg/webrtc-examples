var connection = new WebSocket('wss://192.168.1.21:3000');
var name = "";

var loginPage = document.querySelector('#login-page');
var usernameInput = document.querySelector('#username');
var loginButton = document.querySelector('#login');
var callPage = document.querySelector('#call-page');
var otherUsernameInput = document.querySelector('#other-username');
var callButton = document.querySelector('#call');
var hangUpButton = document.querySelector('#hang-up');
messageInput = document.querySelector('#message');
var sendButton = document.querySelector('#send');
var received = document.querySelector('#received');

var myVideo = document.querySelector('#myVideo');
var otherVideo = document.querySelector('#otherVideo');
var myConnection;
var connectedUser;
var stream;
var dataChannel;

callPage.style.display = "none";

//----------------------------------------------------------------------
//
//  Connection
//
//----------------------------------------------------------------------

/**
 * WSコネクションがオープンした際のハンドラです。
 */
connection.onopen = function () {
  console.log("Connected");
};

/**
 * WSコネクションでメッセージを受信した際のハンドラです。
 * @param message
 */
connection.onmessage = function (message) {
  console.log("Got message", message.data);

  var data = JSON.parse(message.data);

  switch (data.type) {
    case "login":
      onLogin(data.success);
      break;
    case "offer":
      onOffer(data.offer, data.name);
      break;
    case "answer":
      onAnswer(data.answer);
      break;
    case "candidate":
      onCandidate(data.candidate);
      break;
    case "leave":
      onLeave();
      break;
    default:
      break;
  }
};

/**
 * WSコネクションでエラーが発生した際のハンドラです。
 * @param err
 */
connection.onerror = function (err) {
  console.log("Got error", err);
};

/**
 * WSコネクションでメッセージを送信します。
 * @param message
 */
function send(message) {
  if (connectedUser) {
    message.name = connectedUser;
  }
  connection.send(JSON.stringify(message));
}

//----------------------------------------------------------------------
//
//  Login
//
//----------------------------------------------------------------------

/**
 * ログインボタンがクリックされた際のハンドラです。
 */
loginButton.addEventListener("click", function (event) {
  name = usernameInput.value;

  if (name.length > 0) {
    send({
      type: "login",
      name: name
    });
  }
});

/**
 * ハングアップボタンがクリックされた際のハンドラです。
 */
hangUpButton.addEventListener("click", function () {
  send({
    type: "leave"
  });

  onLeave();
});

/**
 * ログインされた際の処理を行います。
 * @param success
 */
function onLogin(success) {
  if (success === false) {
    alert("Login unsuccessful, please try a different name.");
  } else {
    loginPage.style.display = "none";
    callPage.style.display = "block";

    setupConnection();
  }
}

/**
 * 切断された際の処理を行います。
 */
function onLeave() {
  connectedUser = null;
  otherVideo.src = null;
  myConnection.close();
  myConnection.onicecandidate = null;
  myConnection.onaddstream = null;
  setupPeerConnection(stream);
}

/**
 * 自端末のコネクション作成とストリーム取得を行い、他端末と接続できる準備を整えます。
 */
function setupConnection() {
  if (hasUserMedia()) {
    navigator.getUserMedia({video: true, audio: false}, function (myStream) {
      stream = myStream;
      myVideo.src = window.URL.createObjectURL(stream);

      if (hasRTCPeerConnection()) {
        setupPeerConnection(stream);
      } else {
        alert("Sorry, your browser does not support WebRTC.");
      }
    }, function (error) {
      console.log(error);
    });
  } else {
    alert("Sorry, your browser does not support WebRTC.");
  }
}

//----------------------------------------------------------------------
//
//  Peer Connection
//
//----------------------------------------------------------------------

/**
 * コールボタンがクリックされた際のハンドラです。
 */
callButton.addEventListener("click", function () {
  var theirUsername = otherUsernameInput.value;

  if (theirUsername.length > 0) {
    sendOffer(theirUsername);
  }
});

/**
 * 自端末のピアコネクションの設定を行います。
 * @param stream
 */
function setupPeerConnection(stream) {
  var configuration = {
    "iceServers": [{"url": "stun:127.0.0.1:9876"}]
  };
  myConnection = new RTCPeerConnection(configuration);

  myConnection.addStream(stream);

  // 相手端末でストリームが追加された際のハンドリング
  myConnection.onaddstream = function (e) {
    otherVideo.src = window.URL.createObjectURL(e.stream);
  };

  // 相手端末から候補アドレスを受信した際のハンドリング
  myConnection.onicecandidate = function (event) {
    if (event.candidate) {
      // 自端末の候補アドレスへ相手端末へ送信
      send({
        type: "candidate",
        candidate: event.candidate
      });
    }
  };

  // 相手端末でデータチャネルが追加された際のハンドリング
  myConnection.ondatachannel = function (event) {
    console.log('Remote Data Channel added.');
    dataChannel = event.channel;
    setupDataChannel();
  };
}

/**
 * 指定された相手端末へオファーを送信します。
 * @param user
 */
function sendOffer(user) {
  connectedUser = user;

  // データチャネルの設定
  createDataChannel();
  setupDataChannel();

  // オファーSDPを作成
  myConnection.createOffer().then(function (offer) {
    // 作成されたオファーSDPを相手端末へ送信
    send({
      type: "offer",
      offer: offer
    });
    // 作成されたオファーSDPを自端末のコネクションに設定
    myConnection.setLocalDescription(offer);
  }).catch(function (err) {
    alert("An error has occurred.");
  });
}

/**
 * 相手端末からオファーを受信した際の処理を行います。
 * @param offer
 * @param name
 */
function onOffer(offer, name) {
  connectedUser = name;
  myConnection.setRemoteDescription(new RTCSessionDescription(offer));

  // オファーに対するアンサーSDPを作成
  myConnection.createAnswer().then(function (answer) {
    // 作成されたアンサーSDPを自端末のコネクションに設定
    myConnection.setLocalDescription(answer);
    // 作成されたアンサーSDPを相手端末へ送信
    send({
      type: "answer",
      answer: answer
    });
  }, function (error) {
    alert("An error has occurred");
  });
}

/**
 * 相手端末からアンサーを受信した際の処理を行います。
 * @param answer
 */
function onAnswer(answer) {
  // 受信したアンサーSDPを自端末のコネクションに設定
  myConnection.setRemoteDescription(new RTCSessionDescription(answer));
}

/**
 * 相手端末から候補アドレスを受信した際の処理を行います。
 * @param candidate
 */
function onCandidate(candidate) {
  // 受信した相手端末の候補アドレスを自端末のコネクションに設定
  myConnection.addIceCandidate(new RTCIceCandidate(candidate));
}

//----------------------------------------------------------------------
//
//  Data Channel
//
//----------------------------------------------------------------------

/**
 * 送信ボタンがクリックされた際のハンドラです。
 */
sendButton.addEventListener("click", function (event) {
  var val = messageInput.value;
  received.innerHTML += val + "<br />";
  received.scrollTop = received.scrollHeight;
  // 入力されたメッセージをデータチャネルで送信
  dataChannel.send(val);
});

/**
 * データチャネルを作成します。
 */
function createDataChannel() {
  console.log('Create Data Channel.');

  var dataChannelOptions = {
    ordered: true
  };
  dataChannel = myConnection.createDataChannel("myLabel", dataChannelOptions);
}

/**
 * データチャネルの設定を行います。
 */
function setupDataChannel() {
  dataChannel.onerror = function (error) {
    console.log("Data Channel Error:", error);
  };

  dataChannel.onmessage = function (event) {
    console.log("Got Data Channel Message:", event.data);

    received.innerHTML += event.data + "<br />";
    received.scrollTop = received.scrollHeight;
  };

  dataChannel.onopen = function () {
    dataChannel.send(name + " has connected.");
  };

  dataChannel.onclose = function () {
    console.log("The Data Channel is Closed");
  };
}

//----------------------------------------------------------------------
//
//  Utility
//
//----------------------------------------------------------------------

/**
 * 現在の環境でgetUserMedia()が利用可能か否かを取得します。
 */
function hasUserMedia() {
  navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia;
  return !!navigator.getUserMedia;
}

/**
 * 現在の環境でRTCPeerConnectionが利用可能か否かを取得します。
 */
function hasRTCPeerConnection() {
  window.RTCPeerConnection = window.RTCPeerConnection || window.webkitRTCPeerConnection || window.mozRTCPeerConnection;
  window.RTCSessionDescription = window.RTCSessionDescription || window.webkitRTCSessionDescription || window.mozRTCSessionDescription;
  window.RTCIceCandidate = window.RTCIceCandidate || window.webkitRTCIceCandidate || window.mozRTCIceCandidate;
  return !!window.RTCPeerConnection;
}
