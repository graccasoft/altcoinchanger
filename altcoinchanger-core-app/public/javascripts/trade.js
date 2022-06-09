var fee = 0.002;
var bid_price;
var ask_price;

toastr.options = {
  "closeButton": true,
  "debug": false,
  "progressBar": false,
  "preventDuplicates": false,
  "positionClass": "toast-top-right",
  "onclick": null,
  "showDuration": "400",
  "hideDuration": "1000",
  "timeOut": "7000",
  "extendedTimeOut": "1000",
  "showEasing": "swing",
  "hideEasing": "linear",
  "showMethod": "fadeIn",
  "hideMethod": "fadeOut"
}
  $(function () {
    var socket = io();
    var session_id;

    var u_id = member_id;


    var tmp_crf_id = Math.round((new Date()).getTime() / 1000);
    session_id = u_id +""+ tmp_crf_id;

    var cur2_balance_request = {id: session_id, element: '.cur2-balance', member_id: u_id, cur: cur2};
    var cur1_balance_request = {id: session_id, element: '.cur1-balance', member_id: u_id, cur: cur1};


    $('#sell-btn').click(function(){

      var order = { pair_id:    pair_id,
                    amount:     $("#sell-amount").val(),
                    price:      $("#sell-price").val(),
                    fee:        $("#sell-fee").val(),
                    id:         session_id,
                    member_id:  u_id,
                    cur1:       cur1,
                    cur2:       cur2,
                    error:      ''

                  }
      socket.emit('place_sell_order', order);

      return false;
    });

    $('#buy-btn').click(function(){

      var order = { pair_id:  pair_id,
                    amount:   $("#buy-amount").val(),
                    price:    $("#buy-price").val(),
                    fee:      $("#buy-fee").val(),
                    id:       session_id,
                    member_id:  u_id,
                    cur1:       cur1,
                    cur2:       cur2,
                    error:      ''
                  }
      socket.emit('place_buy_order', order);

      return false;
    });

    socket.on('place_sell_order_error', function(order){
      if(order.id == session_id){
        toastr.error("Error placing sell order: " + order.error)
      }
    });

    socket.on('place_sell_order_success', function(order){
      if(order.id == session_id){
        $("#sell-amount").val("1.00000000");
        $("#sell-price").val(ask_price.toFixed(8));
        calculateSellTotals();

        socket.emit('get_account_balance', cur1_balance_request);
        toastr.success("Order placed successfully.");
      }
    });

    $('#buy-btn').click(function(){
      var request ={pair_id: pair_id, id: session_id};
      socket.emit('get_open_sell_orders', request);

      return false;
    });

    socket.on('place_buy_order_error', function(order){
      if(order.id == session_id){
        toastr.error("Error placing buy order: "+ order.error);
      }
    });

    socket.on('place_buy_order_success', function(order){
      if(order.id == session_id){
        $("#buy-amount").val("1.00000000");
        $("#buy-price").val(bid_price.toFixed(8));
        calculateBuyTotals();
        socket.emit('get_account_balance', cur2_balance_request);
        toastr.success("Order placed successfully.");
      }
    });

    //open sell orders
    socket.on('get_open_sell_orders_results', function(result){
      if(result.id == session_id){
        var html ='';
        for(x=0; x< result.data.length; x++){
          var row = result.data[x];
          html+= '<tr data-price ="'+row.price.toFixed(8)+'" data-amount ="'+row.amount.toFixed(8)+'" onclick = "openSellOrderTRClick(this)">';
          html+= '<td>'+ row.price.toFixed(8) + '</td>';
          html+= '<td>'+ row.amount.toFixed(8) + '</td>';
          html+= '<td>'+ (row.price.toFixed(8) * row.amount.toFixed(8)).toFixed(8) + '</td>';
          html+= '</tr>';
        }

        $("#tbl-open-sell-orders").html(html);
      }
    });

    //open buy orders
    socket.on('get_open_buy_orders_results', function(result){
      if(result.id == session_id){
        var html ='';
        for(x=0; x< result.data.length; x++){
          var row = result.data[x];
          html+= '<tr data-price ="'+row.price.toFixed(8)+'" data-amount ="'+row.amount.toFixed(8)+'" onclick = "openBuyOrderTRClick(this)">';
          html+= '<td>'+ row.price.toFixed(8) + '</td>';
          html+= '<td>'+ row.amount.toFixed(8) + '</td>';
          html+= '<td>'+ (row.price.toFixed(8) * row.amount.toFixed(8)).toFixed(8) + '</td>';
        }

        $("#tbl-open-buy-orders").html(html);
      }
    });

    //market History


    socket.on('get_orders_history_results', function(result){
      if(result.id == session_id){
        var html ='';
        for(x=0; x< result.data.length; x++){
          var row = result.data[x];
          var cls = 'text-danger';
          if(row.typ == "BUY")
            cls = 'text-success';

          html+= '<tr class ="'+cls+'">';
          html+= '<td>'+ row.date + '</td>';
          html+= '<td>'+ row.typ + '</td>';
          html+= '<td>'+ row.price.toFixed(8)  + '</td>';
          html+= '<td>'+ row.amount.toFixed(8)  + '</td></tr>';
        }

        $("#tbl-market-history").html(html);
      }
    });


    //get Markets CUR2
    socket.on('get_market_cur2_results', function(result){
      if(result.id == session_id){
        var html ='';
        for(x=0; x< result.data.length; x++){
          var row = result.data[x];
          html+= '<option>'+ row.cur2 + '</option>';
        }

        $("#cur2-selector").append(html);
        $("#cur2-selector").val(cur2);
      }
    });

    //get PAIR details CUR2
    socket.on('get_pair_details_results', function(result){

      if(result.id == session_id){
        var row = result.data[0];
        bid_price = row.bid;
        ask_price = row.ask;

        $("#buy-price").val(bid_price.toFixed(8));
        $("#sell-price").val(ask_price.toFixed(8));

        $("#buy-amount").val("1.00000000");
        $("#sell-amount").val("1.00000000");

        calculateBuyTotals();
        calculateSellTotals();
      }
    });


    $("#sell-amount, #sell-price").keydown(function(e) {
      calculateSellTotals();
    });

    $("#buy-amount, #buy-price").keydown(function(e) {
      calculateBuyTotals();
    });

    //LOGIN
    $("#login-btn").click(function(){
      $("#dv-invalid-login").hide();
      $.post(  '/users/login',
                $("#frm-login").serialize(),
                function(data){
                  if(data =="invalid")
                    $("#dv-invalid-login").show();

                  if(data == "ok")
                    window.location = '/trade';
                }
            );
    })

    //Registration
    $("#registration-btn").click(function(){
      $("#dv-invalid-registration").hide();
      $("#dv-registration-success").hide();

      $("#registration-username").removeClass("is-invalid");
      if( $("#registration-username").val() == "" ){
        $("#registration-username").addClass("is-invalid");
        $("#registration-username").focus();
        return false;
      }

      $("#registration-email").removeClass("is-invalid");
      if( $("#registration-email").val() == "" ){
        $("#registration-email").addClass("is-invalid");
        $("#registration-email").focus();
        return false;
      }

      //TODO: validate email

      $("#registration-password").removeClass("is-invalid");
      if( $("#registration-password").val() == "" ){
        $("#registration-password").addClass("is-invalid");
        $("#registration-password").focus();
        return false;
      }

      $("#password-mismatch").hide();
      if( $("#registration-password").val() != $("#registration-password2").val() ){
        $("#password-mismatch").show();
        return false;
      }

      $.post(  '/users/register',
                $("#frm-register").serialize(),
                function(data){
                  if(data == "ok"){
                    $("#dv-registration-success").show();
                    $("#registration-email").val("");
                    $("#registration-username").val("");
                    $("#registration-password").val("");
                    $("#registration-password2").val("");
                  }else{
                    $("#dv-invalid-registration").show();
                    $("#registration-error").html( data );
                  }
                }
            );
    })

    //load default data
    var getMarketsrequest ={cur2: cur2, id: session_id};
    socket.emit('get_market_cur2', getMarketsrequest);

    socket.emit('get_pair_details', {pair_id:pair_id, id: session_id});

    //get balances
    socket.emit('get_account_balance', cur2_balance_request);
    socket.emit('get_account_balance', cur1_balance_request);

    socket.on('get_account_balance_results', function(result){
      //console.log(result);
      if(result.request.id == session_id){

        var balance = result.balance.balance.toFixed(8);
        $(result.request.element).html( balance );
      }

    });

    socket.on('get_pair_tickers_success', function(result){
      if(result.id == session_id){

        var data = result.data[0];
        $("#span-last").html( data.last.toFixed(8) );
        $("#span-high").html( data.high_24.toFixed(8) );
        $("#span-low").html( data.low_24.toFixed(8) );
        $("#span-vol").html( data.latest_volume.toFixed(8) );
      }

    });

    //loop thread
    setInterval(function(){
      var request ={pair_id: pair_id, id: session_id};
      socket.emit('get_open_sell_orders', request);
      socket.emit('get_open_buy_orders', request);
      socket.emit('get_orders_history', request);
      socket.emit('get_pair_tickers', request);

    }, 3000);

    $(".chart-period").click(function(){
      $(".chart-period").removeClass("btn-info");
      $(this).addClass("btn-info");

      loadChartData(1, $(this).attr("data-period"));
    });

    loadChartData(1,"12hr");
  });

function calculateSellTotals(){
  var total = parseFloat($("#sell-amount").val()) * parseFloat($("#sell-price").val());
  var fees = total * fee;
  $("#sell-total").val(total.toFixed(8));
  $("#sell-fee").val(fees.toFixed(8));
  $("#sell-gtotal").val(( total - fees).toFixed(8));

}

function calculateBuyTotals(){
  var total = parseFloat($("#buy-amount").val()) * parseFloat($("#buy-price").val());
  var fees = total * fee;
  $("#buy-total").val(total.toFixed(8));
  $("#buy-fee").val(fees.toFixed(8));
  $("#buy-gtotal").val(( total + fees).toFixed(8));

}


function openSellOrderTRClick(obj){
  $("#buy-amount").val( $(obj).attr("data-amount") );
  $("#buy-price").val( $(obj).attr("data-price") );

  calculateBuyTotals()
}

function openBuyOrderTRClick(obj){
  $("#sell-amount").val( $(obj).attr("data-amount") );
  $("#sell-price").val( $(obj).attr("data-price") );

  calculateSellTotals()
}

function showRegistrationModal(){
  $("#login-modal").modal("hide");
  $("#registration-modal").modal("show");
}

function showLoginModal(){
  $("#registration-modal").modal("hide");
  $("#login-modal").modal("show");
}

//CHARTS
//$.getJSON('http://localhost/trading/index.php/charts/get_historical_v2/etmbtc.json?callback=?', function (data) {
function loadChartData(pair_id,period){

  $.getJSON('http://localhost/altcoinchanger.io/index.php/data/market_data/'+pair_id+'/'+period+'?callback=?', function (data) {
    // split the data set into ohlc and volume
    var ohlc = [],
        volume = [],
        dataLength = data.length,
        // set the allowed units for data grouping
        groupingUnits = [[
            'week',                         // unit name
            [1]                             // allowed multiples
        ], [
            'month',
            [1, 2, 3, 4, 6]
        ]],

        i = 0;

    for (i; i < dataLength; i += 1) {
        ohlc.push([
            data[i][0], // the date
            data[i][1], // open
            data[i][2], // high
            data[i][3], // low
            data[i][4] // close
        ]);

        volume.push([
            data[i][0], // the date
            data[i][5] // the volume
        ]);
    }


    // create the chart
    Highcharts.stockChart('dv-live-chart', {

        rangeSelector: {
            enabled:false,
            inputEnabled: false
        },
        navigator: {
            enabled: false
        },
        credits:{
          enabled:false
        },
        scrollbar: {
           enabled: false
       },
       exporting:{
        	enabled:false
        },
        title: {
            text: ''
        },

        yAxis: [{
            labels: {
                align: 'right',
                x: -3
            },
            title: {
                text: ''
            },
            top: '10%',
            height: '75%',
            offset: 0,
            lineWidth: 2
        },{
            labels: {
                align: 'right',
                x: -3
            },
            title: {
                text: 'BTC'
            },
            top: '10%',
            height: '75%',
            lineWidth: 2,
            resize: {
                enabled: false
            }
        }],

        tooltip: {
            split: true,
            backgroundColor:'#FCFFC5'
        },

        series: [{
            type: 'column',
            name: 'Volume',
            data: volume,
            yAxis: 1,
            color:'#eeeeee'
        },{
            type: 'candlestick',
            name: 'ETM/BTC market',
            data: ohlc,
            color:'#a44745',
            upColor:'#339349'
        }]
    });
});

}

$.getJSON('http://localhost/altcoinchanger.io/index.php/data/order_book/1?callback=?', function (data) {

  var buy_orders = [],
      sell_orders = [];

  for (i=0; i < data.sell_orders.length; i += 1) {
    if( data.sell_orders[i].price == 0 )
      sell_orders.push( null );
    else
      sell_orders.push( data.sell_orders[i].price );
  }
  for (i=0; i < data.buy_orders.length; i += 1) {
    if( data.buy_orders[i].price == 0 )
      buy_orders.push( null );
    else
      buy_orders.push( data.buy_orders[i].price );
  }

  Highcharts.chart('dv-depth-chart', {
    chart: {
        type: 'area'
    },
    title: {
        text: ''
    },
    credits:{
    	enabled:false
    },
    exporting:{
    	enabled:false
    },
    subtitle: {
        text: ''
    },
    legend:{
    	enabled:false
    },
    xAxis: {
        allowDecimals: false,
        labels: {
            formatter: function () {
            		//console.log(this);
                return ''; // clean, unformatted number for year
            }
        }
    },
    yAxis: {
        title: {
            text: ''
        },
        labels: {
            formatter: function () {
                return '';
            }
        }
    },
    tooltip: {
        pointFormat: '{series.name} <b>{point.y:,.0f}</b>'
    },
    plotOptions: {
        area: {

            marker: {
                enabled: false,
                symbol: 'circle',
                radius: 2,
                states: {
                    hover: {
                        enabled: true
                    }
                }
            }
        }
    },
    series: [{
        name: 'ASK',
        data: sell_orders,
        color: '#F4838A'
    }, {
        name: 'BID',
        data: buy_orders,
        color: '#41C5F3'
    }]
});

});
