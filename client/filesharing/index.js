var connection = new WebSocket('wss://192.168.1.21:3000');
var name = "";

var loginPage = document.querySelector('#login-page');
var usernameInput = document.querySelector('#username');
var loginButton = document.querySelector('#login');
var otherUsernameInput = document.querySelector('#other-username');
var connectButton = document.querySelector('#connect');
var sharePage = document.querySelector('#share-page');
var sendButton = document.querySelector('#send');
var readyText = document.querySelector('#ready');
var statusText = document.querySelector('#status');

var myConnection;
var connectedUser;
var dataChannel;
var currentFile;
var currentFileSize;
var currentFileMeta;

sharePage.style.display = "none";
readyText.style.display = "none";

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
 * ログインされた際の処理を行います。
 * @param success
 */
function onLogin(success) {
  if (success === false) {
    alert("Login unsuccessful, please try a different name.");
  } else {
    loginPage.style.display = "none";
    sharePage.style.display = "block";

    setupConnection();
  }
}

/**
 * 切断された際の処理を行います。
 */
function onLeave() {
  connectedUser = null;
  myConnection.close();
  myConnection.onicecandidate = null;
  setupPeerConnection();
}

/**
 * 自端末のコネクション作成とストリーム取得を行い、他端末と接続できる準備を整えます。
 */
function setupConnection() {
  if (hasRTCPeerConnection()) {
    setupPeerConnection();
  } else {
    alert("Sorry, your browser does not support WebRTC.");
  }

  openDataChannel();
}

//----------------------------------------------------------------------
//
//  Peer Connection
//
//----------------------------------------------------------------------

/**
 * 接続ボタンがクリックされた際のハンドラです。
 */
connectButton.addEventListener("click", function () {
  var otherUsername = otherUsernameInput.value;

  if (otherUsername.length > 0) {
    sendOffer(otherUsername);
  }
});

/**
 * 自端末のピアコネクションの設定を行います。
 */
function setupPeerConnection() {
  var configuration = {
    "iceServers": [{"url": "stun:127.0.0.1:9876"}]
  };
  myConnection = new RTCPeerConnection(configuration);

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
}

/**
 * 指定された相手端末へオファーを送信します。
 * @param user
 */
function sendOffer(user) {
  connectedUser = user;

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
  console.log('candidate:', candidate);
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
  var files = document.querySelector('#files').files;

  if (files.length > 0) {
    dataChannelSend({
      type: "start",
      data: {
        name: files[0].name,
        size: files[0].size,
        type: files[0].type,
        lastModified: files[0].lastModified
      }
    });

    sendFile(files[0]);
  }
});

/**
 * データチャネルを作成しオープンします。
 */
function openDataChannel() {
  var dataChannelOptions = {
    ordered: true,
    negotiated: true,
    id: "myChannel"
  };
  dataChannel = myConnection.createDataChannel("myLabel", dataChannelOptions);

  // データチャネルでエラーが発生した際のハンドリング
  dataChannel.onerror = function (error) {
    console.log("Data Channel Error:", error);
  };

  // データチャネルでメッセージを受信した際のハンドリング
  dataChannel.onmessage = function (event) {
    try {
      var message = JSON.parse(event.data);

      switch (message.type) {
        case "start":
          currentFile = [];
          currentFileSize = 0;
          currentFileMeta = message.data;
          console.log("Receiving file", currentFileMeta);
          break;
        case "end":
          saveFile(currentFileMeta, currentFile);
          break;
      }
    }
    // 受信したメッセージのJSONパースに失敗した場合、ファイルコンテンツの受信とみなす
    catch (e) {
      currentFile.push(atob(event.data));
      currentFileSize += currentFile[currentFile.length - 1].length;
      var percentage = Math.floor((currentFileSize / currentFileMeta.size) * 100);
      statusText.innerHTML = "Receiving... " + percentage + "%";
    }
  };

  // データチャネルがオープンした際のハンドリング
  dataChannel.onopen = function () {
    readyText.style.display = "inline-block";
  };

  // データチャネルがクローズした際のハンドリング
  dataChannel.onclose = function () {
    readyText.style.display = "none";
  };
}

/**
 * ファイルコンテンツを全てした際のファイル保存処理を行います。
 * @param meta
 * @param data
 */
function saveFile(meta, data) {
  // 受信したファイルコンテンツをBlobへ変換
  var blob = base64ToBlob(data, meta.type);
  // 受信したファイルコンテンツをファイルのダウンロードとして処理
  var link = document.createElement('a');
  link.href = window.URL.createObjectURL(blob);
  link.download = meta.name;
  link.click();
}

/**
 * 指定されたメッセージをJSONフォーマットに変換して相手端末へ送信します。
 * @param message
 */
function dataChannelSend(message) {
  dataChannel.send(JSON.stringify(message));
}

/**
 * 指定されたファイルを相手端末へ送信します。
 * @param file
 */
function sendFile(file) {
  var CHUNK_MAX = 16000;
  var reader = new FileReader();

  reader.onloadend = function (evt) {
    if (evt.target.readyState == FileReader.DONE) {
      var buffer = reader.result,
        start = 0,
        end = 0,
        last = false;

      function sendChunk() {
        end = start + CHUNK_MAX;
        if (end > file.size) {
          end = file.size;
          last = true;
        }

        var percentage = Math.floor((end / file.size) * 100);
        statusText.innerHTML = "Sending... " + percentage + "%";

        dataChannel.send(arrayBufferToBase64(buffer.slice(start, end)));

        // 送信しようとするメッセージチャンクが最後の場合
        if (last === true) {
          dataChannelSend({
            type: "end"
          });
        }
        // 送信しようとするメッセージチャンクが最後ではない場合
        else {
          start = end;
          // 送信バッファのあふれを防ぐためディレイして調整
          setTimeout(function () {
            sendChunk();
          }, 100);
        }
      }

      sendChunk();
    }
  };

  reader.readAsArrayBuffer(file);
}

/**
 * ArrayBufferをBase64へ変換します。
 * @param buffer
 */
function arrayBufferToBase64(buffer) {
  var binary = '';
  var bytes = new Uint8Array(buffer);
  var len = bytes.byteLength;
  for (var i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Base64をBlobへ変換します。
 * @param b64Data
 * @param contentType
 */
function base64ToBlob(b64Data, contentType) {
  contentType = contentType || '';

  var byteArrays = [], byteNumbers, slice;

  for (var i = 0; i < b64Data.length; i++) {
    slice = b64Data[i];

    byteNumbers = new Array(slice.length);
    for (var n = 0; n < slice.length; n++) {
      byteNumbers[n] = slice.charCodeAt(n);
    }

    var byteArray = new Uint8Array(byteNumbers);
    byteArrays.push(byteArray);
  }

  var blob = new Blob(byteArrays, {type: contentType});
  return blob;
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

/**
 * 現在の環境でFileAPIが利用可能か否かを取得します。
 */
function hasFileApi() {
  return window.File && window.FileReader && window.FileList && window.Blob;
}
