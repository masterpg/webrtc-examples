// 変数の初期化
var myVideo = document.querySelector('#myVideo');
var otherVideo = document.querySelector('#otherVideo');
var myConnection;
var otherConnection;

/**
 * 現在の環境でgetUserMedia()が利用可能か否かを取得します。
 */
function hasUserMedia() {
  navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia
    || navigator.mozGetUserMedia || navigator.msGetUserMedia;
  return !!navigator.getUserMedia;
}

/**
 * 現在の環境でRTCPeerConnectionが利用可能か否かを取得します。
 */
function hasRTCPeerConnection() {
  window.RTCPeerConnection = window.RTCPeerConnection || window.webkitRTCPeerConnection
    || window.mozRTCPeerConnection;
  return !!window.RTCPeerConnection;
}

if (hasUserMedia()) {
  navigator.getUserMedia({ video: true, audio: false }, function (stream) {
    myVideo.src = window.URL.createObjectURL(stream);

    if (hasRTCPeerConnection()) {
      startPeerConnection(stream);
    } else {
      alert("Sorry, your browser does not support WebRTC.");
    }
  }, function (error) {
    console.log(error);
  });
} else {
  alert("Sorry, your browser does not support WebRTC.");
}

function startPeerConnection(stream) {
  var configuration = {
    iceServers: [{urls: 'stun:stun.l.google.com:19302'}]
  };
  myConnection = new RTCPeerConnection(configuration);
  otherConnection = new RTCPeerConnection(configuration);

  myConnection.onicecandidate = function (event) {
    if (event.candidate) {
      otherConnection.addIceCandidate(new RTCIceCandidate(event.candidate));
    }
  };

  otherConnection.onaddstream = function (e) {
    otherVideo.src = window.URL.createObjectURL(e.stream);
  };

  otherConnection.onicecandidate = function (event) {
    if (event.candidate) {
      myConnection.addIceCandidate(new RTCIceCandidate(event.candidate));
    }
  };

  myConnection.addStream(stream);

  myConnection.createOffer().then(function (offer) {
    myConnection.setLocalDescription(offer);
    otherConnection.setRemoteDescription(offer);

    otherConnection.createAnswer().then(function (offer) {
      otherConnection.setLocalDescription(offer);
      myConnection.setRemoteDescription(offer);
    });
  });
};
