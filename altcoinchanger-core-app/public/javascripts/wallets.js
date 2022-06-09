var withdrawal_fee_perc = 0.005;
var withdrawal_currency;

var socket = io();
var session_id;

var u_id = member_id;
var tmp_crf_id = Math.round((new Date()).getTime() / 1000);
session_id = u_id +""+ tmp_crf_id;

$(function () {


  socket.on('get_deposit_address_success', function(result){
    if(result.id == session_id){
      $("#deposit-details-address").html( result.address );
      $("#deposit-qr-code").attr("src","http://localhost/altcoinchanger.io/qr_code.php?b_address="+result.address);
    }
  });

  socket.emit('get_member_wallets', {member_id:u_id, id: session_id});

  socket.on('get_member_wallets_results', function(result){
    if(result.request.id == session_id){

      var html ='';
      var results = $.parseJSON(result.wallets);
      var wallets = results.wallets;

      $("#est-total").html( parseFloat(results.est_total_btc).toFixed(8) );
      for(x=0; x< wallets.length; x++){
        var row = wallets[x];
        html+= '<tr>';
        html+= '<td>'+ row.currency + '</td>';
        html+= '<td>'+ parseFloat( row.balance ).toFixed(8) + '</td>';
        html+= '<td>'+ parseFloat(row.awaiting_deposit).toFixed(8) + '</td>';
        html+= '<td>'+ parseFloat(row.in_orders).toFixed(8) + '</td>';
        html+= '<td>'+ parseFloat(row.to_btc).toFixed(8) + '</td>';
        html+= '<td align="center" onclick="showDepositModal(this)" data-currency ="'+row.currency+'"><a href="#" class ="btn btn-info btn-sm">+</a></td>';
        html+= '<td align="center" onclick="showWithdrawalModal(this)" data-currency ="'+row.currency+'"><a href="#" class ="btn btn-info btn-sm">-</a></td>';
        html+= '<td align="center"><a href="#" class ="btn btn-info btn-sm">H</a></td>';
        html+= '</tr>';
      }

      $("#tbl-wallets").html(html);
    }

  });


  socket.on('get_pending_deposits_success', function(result){
    if(result.id == session_id){

      var html ='';
      var rows = result.data;

      for(x=0; x< rows.length; x++){
        var row = rows[x];
        html+= '<tr>';
        html+= '<td>'+ row.date + '</td>';
        html+= '<td>'+  row.currency + '</td>';
        html+= '<td>'+ parseFloat(row.amount).toFixed(8) + '</td>';
        html+= '<td>'+ row.status + '</td>';
        html+= '</tr>';
      }

      $("#tbl-pending-deposits").html(html);
    }

  });


  socket.on('place_withdrawal_request_success', function(result){
    if(result.id == session_id){
      alert("Withdrawal successful");
    }
  });

  socket.on('place_withdrawal_request_error', function(result){
    if(result.id == session_id){
      $("#dv-invalid-withdrawal span").html(result.error);
      $("#dv-invalid-withdrawal").show();
    }
  });


  //loop thread
  setInterval(function(){
    var request ={id: session_id};

    socket.emit('get_pending_deposits', request);

  }, 3000);

  $("#withdraw-amount").keyup(function(e) {
      var fee = parseFloat( $(this).val() ) * withdrawal_fee_perc;
      $("#withdraw-fee").val( fee.toFixed(8) );
      $("#withdraw-obtain").val( ($(this).val() - fee).toFixed(8)  );
  });

  $("#withdraw-btn").click(function(){
      do_withdrawal();
  })

});


function showWithdrawalModal(obj){
  var currency = $(obj).attr("data-currency");
  withdrawal_currency = currency;
  $(".withdraw-currency").html( " ("+currency+")");

  $("#withdraw-fee").val( "0.00000000" );
  $("#withdraw-obtain").val( "0.00000000"  );
  $("#withdraw-amount").val( "0.00000000"  );
  $("#withdraw-address").val( ""  );
  $("#dv-invalid-withdrawal-details").hide();
  $("#dv-invalid-withdrawal").hide();

  $("#withdrawal-modal").modal("show");
}

function showDepositModal(obj){
  var currency = $(obj).attr("data-currency");
  $(".deposit-currency").html( " ("+currency+")");
  $("#deposit-modal").modal("show");


  //get depost address
  socket.emit('get_deposit_address', {member_id:u_id, id: session_id, currency: currency});
  $("#deposit-details-address").html("...");
  $("#deposit-qr-code").attr("src","");
}



function do_withdrawal(){

  $("#dv-invalid-withdrawal-details").hide();
  $("#dv-invalid-withdrawal").hide();

  if( parseFloat($("#withdraw-obtain").val()) <= 0 ){
    $("#dv-invalid-withdrawal-details").show();
    return false;
  }

  if( $("#withdraw-address").val() =="" ){
    $("#dv-invalid-withdrawal-details").show();
    return false;
  }

  var request = { currency: withdrawal_currency,
                  amount: $("#withdraw-amount").val(),
                  to_address: $("#withdraw-address").val(),
                  error: '',
                  member_id:member_id,
                  id: session_id
                };

  socket.emit('place_withdrawal_request', request);

}
