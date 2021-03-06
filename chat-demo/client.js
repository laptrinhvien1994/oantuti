angular.module('fmapp', [''])
.controller('inboxController', ['$scope', '$http', function($scope, $http){
  var init = function(){
    //Gọi API để lấy pageID từ DB hoặc lấy từ localStorage.
    $scope.pageID = '...';
    //Sau đó khởi tạo kết nối socket
    $scope.socket = io.('Node server URL', {query: { pageID: $scope.pageID}});

    //Đăng ký các sự kiện.
    socket.on('sv-send-threadID', function(data){
      var conversationID = data.threadID;
      var url = "/" + conversationID + "/messages";
      FB.api(url, function(msg){
        //Xử lý đưa ra trên tập dữ liệu trả về và đưa ra view.
      });
    });
    //Load danh sách các tin nhắn bên tay trái.
  };
  init();

  $scope.sendMsg = function(msgContent, conversationID){

  };

  var makeHTTPRequest = function(url, method, data = null, callback, eCallback){
    $http({
      method: method,
      url: url,
      headers: {
        'Content-Type': 'application/json charset-utf8'
      },
      data: data
    })
    .then(callback)
    .catch(eCallback);
  }

}]);

//https://developers.facebook.com/docs/graph-api/reference/v2.10/conversation/messages

$(document).ready(function(){
  var token = 'EAACEdEose0cBAIoYFTbrvSnMCDsAkQFbC1FDK7fLjZCCQOzFZBHzf67isTbjZAMzvcHLeNbqeIEStXk34bpIkrtl86n6mGoZCt6UMvjn4tL9bJYpiQbZCHD0VpuSzKOCgAvWnoWgomQnggW0sHZBmmohONj4errhegR2wC9QwUhtdbRRo8xqWX7tcXJyuSYU55crEDPfhxzwZDZD';
  var url = 'https://graph.facebook.com/v2.10/me/messages?access_token=' + token;
  var setting = {
    contentType: 'application/json; charset=utf-8',
    method: 'POST',
    data: JSON.stringify({
      'recipient': {
        'id': '383436965128019'
      },
      'message': {
        'text': 'Chat demo via Facebook Graph API'
      }
    }),
    success: function(data){
      console.log(data);
    },
    error: function(e){
      console.log(e);
    }
  };
  $.ajax(url, setting);
});

//Page ID lấy từ DB dùng để xác định Room.
var pageID = null;
//var socket = io.connect('http://localhost:9999',{ query : "pageID="+ pageID });

var accessToken = null;

//socket.on('sv-send-msg', function(data){});


//Dùng để gửi tin nhắn.
//recipientID : ID người nhận.
//msgContent : Nội dung tin nhắn.
var sendMsg = function(recipientID, msgContent){

  //Người gửi.
  var recipient = {
    id : recipientID
  };

  var payloadObj = {
    text : msgContent
  }

  //Gọi Facebook API để gửi tin nhắn.
  //https://developers.facebook.com/docs/graph-api/reference/v2.10/conversation/messages
  FB.api('')
}

//Sau khi gửi data lên facebook API thì thực hiện emit dữ liệu lên server.
//socket.emit('clt-send-msg', data);

var signalEnum = {
  typingOn: 0,
  typingOff: 1,
  markSeen: 2
};

var msgContentType = {
  text: 1,
  attachment: 2
}


//Xác định định dạng của chuỗi tin nhắn cần gửi.
//text : chuỗi cần xác định định dạng.
var detectAttachmentService = function(text){
  var isHyperLink = detectHyperLink(text);
  if(isHyperLink) return true;
  //Thêm các detect khác vào đây
  return false;
}

//Đùng để xác định chuỗi tin nhắn cần gửi có chứa link hay không.
var detectHyperLink = function(text){
  var pattern = /(https?:\/\/[^\s]+)/g;
  var result = text.match(pattern);
  if(result == null) return false;
  return true;
}
