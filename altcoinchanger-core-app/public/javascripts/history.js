var socket = io();
var session_id;

var u_id = member_id;
var tmp_crf_id = Math.round((new Date()).getTime() / 1000);
session_id = u_id +""+ tmp_crf_id;

$(function () {

  socket.emit('get_deposit_history', {id: session_id});
  socket.emit('get_withdrawal_history', {id: session_id});
  socket.emit('get_trade_history', {id: session_id});


  socket.on('get_withdrawal_history_success', function(result){
    if(result.id == session_id){
      var html = '';
      for(x=0; x< result.data.length; x++){
        var row = result.data[x];
        html+= '<tr>';
        html+= '<td>'+ row.dt + ' ' + row.tm + '</td>';
        html+= '<td>'+ row.currency + '</td>';
        html+= '<td>'+ row.amount.toFixed(8) + '</td>';
        html+= '<td>'+ row.status + '</td>';
        html+= '</tr>';
      }

      $("#tbl-withdrawal").html(html);
      $("#table-withdrawal").DataTable({});
    }
  });

  socket.on('get_deposit_history_success', function(result){
    if(result.id == session_id){
      var html = '';
      for(x=0; x< result.data.length; x++){
        var row = result.data[x];
        html+= '<tr>';
        html+= '<td>'+ row.dt + ' ' + row.tm  + '</td>';
        html+= '<td>'+ row.currency + '</td>';
        html+= '<td>'+ row.amount.toFixed(8) + '</td>';
        html+= '<td>'+ row.status + '</td>';
        html+= '</tr>';
      }

      $("#tbl-deposit").html(html);
      $("#table-deposit").DataTable({});
    }
  });

  socket.on('get_trade_history_success', function(result){
    if(result.id == session_id){
      var html = '';
      for(x=0; x< result.data.length; x++){
        var row = result.data[x];
        var cls = 'text-danger';
        if(row.typ == "BUY")
          cls = 'text-success';

        html+= '<tr class ="'+cls+'">';
        html+= '<td>'+ row.date  + '</td>';
        html+= '<td>'+ row.cur1 + '/' + row.cur2 + '</td>';
        html+= '<td>'+ row.typ + '</td>';
        html+= '<td>'+ row.price.toFixed(8) + '</td>';
        html+= '<td>'+ row.amount.toFixed(8) + '</td>';
        html+= '<td>'+ (row.amount.toFixed(8) * row.price.toFixed(8)).toFixed(8) + '</td>';
        if(row.filled == 0){
          html+= '<td align="center"><button class = "btn btn-mini btn-danger" onclick="cancelOrder(this)" data-type="'+row.typ+'" data-id ="'+row.order_id+'"><i class="fa fa-trash"></i></td>';
        }else{
          html+= '<td></td>';
        }
        html+= '</tr>';
      }

      $("#tbl-trade").html(html);
      $("#table-trade").DataTable({});
    }
  });

})

function cancelOrder(obj){
  var typ = $(obj).attr("data-type");
  var id = $(obj).attr("data-id");

  console.log(typ);
  console.log(id);
  if(typ =="SELL"){
    socket.emit('cancel_sell_order', {id: session_id, order_id: id});
    $(obj).parent("td").parent("tr").remove();
  }

  if(typ =="BUY"){
    socket.emit('cancel_buy_order', {id: session_id, order_id: id});
    $(obj).parent("td").parent("tr").remove();
  }

}
