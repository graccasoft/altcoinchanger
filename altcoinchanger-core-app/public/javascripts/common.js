$(function () {

  var socket = io();
  var session_id;

  var u_id = member_id;


  var tmp_crf_id = Math.round((new Date()).getTime() / 1000);
  session_id = u_id +""+ tmp_crf_id;

  //CHAT FUNCTIONS
  $('#chat-btn').click(function(){
    socket.emit('chat message', $('#chat-m').val());
    $('#chat-m').val('');
    return false;
  });

  socket.on('chat message', function(msg){
    var html = '<div class ="chat-message"><b>'+msg.username+':</b> '+msg.msg+'</div>';
    $('#messages').append(html);

    $("#chat-container").animate({ scrollTop: $('#chat-container').prop("scrollHeight")}, 1000);
  });


  //get recent chats
  socket.on('get_chat_messages_results', function(result){
    if(result.id == session_id){
      for(x=0; x< result.data.length; x++){
        var row = result.data[x];
        var html = '<div class ="chat-message"><b>'+row.username+':</b> '+row.message+'</div>';
        $('#messages').append(html);
      }
      $("#chat-container").animate({ scrollTop: $('#chat-container').prop("scrollHeight")}, 1000);
    }

  });

  socket.emit('get_chat_messages', { id: session_id});

  //END CHAT FUNCTIONS

  //get Markets
  socket.on('get_markets_results', function(result){
    if(result.id == session_id){
      var html ='';
      for(x=0; x< result.data.length; x++){
        var row = result.data[x];
        html+= '<tr data-id="'+ row.id +'" data-cur1="'+ row.cur1 +'" data-cur2="'+ row.cur2 +'" onclick="marketClick(this)">';
        html+= '<td>'+ row.cur1 + '</td>';
        html+= '<td>'+ row.ask.toFixed(8) + '</td>';
        html+= '<td>'+ row.latest_change.toFixed(2) + '</td>';
        html+= '<td>'+ row.latest_volume.toFixed(8) + '</td></tr>';
      }

      $("#tbl-markets").html(html);
    }
  });

  //on cur2 change
  $('#cur2-selector').change(function(){
    var request ={id: session_id, cur2: $(this).val()};
    socket.emit('get_markets', request);

    return false;
  });

  var getMarketsrequest ={cur2: cur2, id: session_id};
  socket.emit('get_markets', getMarketsrequest);
});

function marketClick(obj){
  window.location = '/trade/'+$(obj).attr("data-id")+'/'+$(obj).attr("data-cur1")+'/'+$(obj).attr("data-cur2");
}
