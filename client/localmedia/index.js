/**
 * 現在の環境でgetUserMedia()が利用可能か否かを取得します。
 */
function hasUserMedia() {
  navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia
    || navigator.mozGetUserMedia || navigator.msGetUserMedia;
  return !!navigator.getUserMedia;
}

if (hasUserMedia()) {
  var constraints = {
    video: {
      // この設定を強制する
      mandatory: {
        // アスペクト比を16:9にする
        minAspectRatio: 1.777, maxAspectRatio: 1.888
      },
      // 可能であればこの設定を試みる
      optional: [
        {minWidth: 640}
      ]
    },
    audio: false
  };

  // モバイルの場合
  if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
    // キャプチャするビデオの解像度に制限を設ける
    constraints = {
      video: {
        // この設定を強制する
        mandatory: {
          // アスペクト比を16:9にする
          minAspectRatio: 1.777, maxAspectRatio: 1.888
        },
        // 可能であればこの設定を試みる
        optional: [
          {minWidth: 320},
          {maxWidth: 640}
        ]
      },
      audio: false
    };
  }

  // ローカルのメディアストリームを取得
  navigator.getUserMedia(constraints, function (stream) {
    var video = document.querySelector('video');
    // 取得したストリームからキャプチャしたデータを取り出すために
    // ローカルURLを生成し、このURLを画面のビデオエレメントに設定
    video.src = window.URL.createObjectURL(stream);
  }, function (error) {
    console.log("Raised an error when capturing:", error);
  });

} else {
  alert("Sorry, your browser does not support getUserMedia.");
}
