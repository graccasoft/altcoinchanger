var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var request = require("request");

var session = require('express-session')({
  secret: '',
  resave: true,
  saveUninitialized: true,
  cookie: { secure: false }
});


var index = require('./routes/index');
var users = require('./routes/users');
var trade = require('./routes/trade');
var wallets = require('./routes/wallets');
var history = require('./routes/history');

var app = express();

var sharedsession = require("express-socket.io-session");
app.use(session);

//app variables
var withdrawal_fee_perc = 0.005;

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', index);
app.use('/users', users);
app.use('/trade', trade);
app.use('/wallets', wallets);
app.use('/history', history);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

var http = require('http').Server(app);
var io = require('socket.io')(http);

io.use(sharedsession(session, {
    autoSave:true
}));

var mysql      = require('mysql');
var connection = mysql.createConnection({
  host     : '127.0.0.1',
  user     : 'root',
  password : '',
  database : 'altcoin_changer'
});

connection.connect(function(err){
  if(!err) {
    console.log("Database is connected ... \n\n");
  } else {
    console.log("Error connecting database ... \n\n");
    console.log(err);
  }
});


io.on('connection', function(socket){

  socket.on('chat message', function(msg){

    var username = socket.handshake.session.username;
    if(username == null)
      username = 'Guest';

    var insert_query = "insert into chat(date,username,message,ip) ";
    insert_query+= "values(NOW(),?,?,'')";

    connection.query(insert_query,[username,msg], function(err, rows, fields) {
      if (!err){
      }else{

      }
    });

    io.emit('chat message', {msg:msg,username:username});
  });

  socket.on('get_balance', function(request){
  });

  socket.on('place_sell_order', function(order){
    //console.log(order);
    //check if member has balance
    var url = "http://localhost/altcoinchanger.io/index.php/data/get_member_balance/" +
        order.member_id + "/" +
        order.cur1

    request({
        url: url,
        json: true
    }, function (error, response, body) {

        if (!error && response.statusCode === 200) {
            console.log(body);
            if( parseFloat(body.balance) >= parseFloat(order.amount ) ){

              //save to DB
              var insert_query = "insert into sell_order(pair_id,amount,price,fee,date,filled,member_id) ";
              insert_query+= "values('"+order.pair_id+"','"+order.amount+"','"+order.price+"','"+order.fee+"',NOW(),0,'"+order.member_id+"')";

              //console.log(insert_query);
              connection.query(insert_query, function(err, rows, fields) {
                if (!err){
                  io.emit('place_sell_order_success', order);
                }else{
                  order.error = 'System error occured';
                  io.emit('place_sell_order_error', order);
                }
              });

            }else{

              order.error = 'Insufficient funds';
              io.emit('place_sell_order_error', order);
            }

        }
    })


  });//END on place_sell_order

  socket.on('get_open_sell_orders', function(request){
      var sql = "select pair.cur1, pair.cur2, sell_order.* from sell_order, pair where pair.id = sell_order.pair_id and filled = '0'";
      sql+= " and sell_order.pair_id = '"+request.pair_id+"' order by sell_order.id desc";
      connection.query(sql,function(err,rows){

          if(!err) {
            io.emit('get_open_sell_orders_results', {id:request.id, data:rows});
          }
       });

  });//END on get_open_sell_orders



  socket.on('place_buy_order', function(order){

    var url = "http://localhost/altcoinchanger.io/index.php/data/get_member_balance/" +
        order.member_id + "/" +
        order.cur2

    request({
        url: url,
        json: true
    }, function (error, response, body) {

        if (!error && response.statusCode === 200) {
            console.log(body);
            if( parseFloat(body.balance) >= parseFloat(order.amount * order.price) ){

              //save to DB
              var insert_query = "insert into buy_order(pair_id,amount,price,fee,date,filled,member_id) ";
              insert_query+= "values('"+order.pair_id+"','"+order.amount+"','"+order.price+"','"+order.fee+"',NOW(),0,'"+order.member_id+"')";

              //console.log(insert_query);
              connection.query(insert_query, function(err, rows, fields) {
                if (!err){
                  io.emit('place_buy_order_success', order);
                }else{
                  order.error = 'System error occured';
                  io.emit('place_buy_order_error', order);
                }
              });

            }else{

              order.error = 'Insufficient funds';
              io.emit('place_buy_order_error', order);
            }

        }
    })


  });//END on place_buy_order


  socket.on('place_withdrawal_request', function(request_obj){
    //check if member has balance
    var member_id = socket.handshake.session.member_id;
    var url = "http://localhost/altcoinchanger.io/index.php/data/get_member_balance/" +
        member_id + "/" +
        request_obj.currency

    request({
        url: url,
        json: true
    }, function (error, response, body) {

        if (!error && response.statusCode === 200) {

            var withdrawal_fee = parseFloat(withdrawal_fee_perc) * parseFloat(request_obj.amount);
            var total_withdrawal = parseFloat(request_obj.amount) + withdrawal_fee;

            if( parseFloat(body.balance) >= parseFloat(total_withdrawal) ){

              //save to DB
              var insert_query = "insert into withdrawal(member_id,currency,amount,to_address,fee,date,status) ";
              insert_query+= "values('"+member_id+"','"+request_obj.currency+"','"+total_withdrawal+"','"+request_obj.to_address+"','"+withdrawal_fee+"',NOW(),'PENDING')";

              //console.log(insert_query);
              connection.query(insert_query, function(err, rows, fields) {
                //connection.end();
                if (!err){
                  //deduct funds
                  var new_balance = parseFloat(body.balance) - total_withdrawal;
                  var update_balance_query = "update account_balance set balance =? where member_id =? and currency=? ";

                  connection.query(update_balance_query,[new_balance,member_id,request_obj.currency], function(err, rows, fields) {
                    //connection.end();
                    if (!err){
                      //deduct funds
                      var new_balance = parseFloat(body.balance) - total_withdrawal;

                      io.emit('place_withdrawal_request_success', request_obj);

                    }else{
                      request_obj.error = 'System error occured';
                      io.emit('place_withdrawal_request_error', request_obj);

                    }
                  });


                }else{
                  request_obj.error = 'System error occured';
                  io.emit('place_withdrawal_request_error', request_obj);

                }
              });


            }else{

              request_obj.error = 'Insufficient funds';
              io.emit('place_withdrawal_request_error', request_obj);
            }

        }
    })


  });//END withdrawal request


  socket.on('get_open_buy_orders', function(request){
      var sql = "select pair.cur1, pair.cur2, buy_order.* from buy_order, pair where pair.id = buy_order.pair_id and filled = '0'";
      sql+= " and buy_order.pair_id = '"+request.pair_id+"' order by buy_order.id desc";
      connection.query(sql,function(err,rows){

          if(!err) {
            io.emit('get_open_buy_orders_results', {id:request.id, data:rows});
          }
       });

  });//END on get_open_sell_orders



  socket.on('get_account_balance', function(request_obj){

    var url = "http://localhost/altcoinchanger.io/index.php/data/get_member_balance/" +
        request_obj.member_id + "/" +
        request_obj.cur


    request({
        url: url,
        json: true
    }, function (error, response, body) {


        if (!error && response.statusCode === 200) {
            io.emit('get_account_balance_results', {request:request_obj, balance: body });


        }
    })
  });//END on place_buy_order


  socket.on('get_member_wallets', function(request_obj){

    request("http://127.0.0.1:80/altcoinchanger.io/index.php/data/get_member_wallets/"+ request_obj.member_id, function (error, response, body) {

        //console.log(error);
        //console.log(request_obj.member_id);
        if (!error && response.statusCode === 200) {
            io.emit('get_member_wallets_results', {request:request_obj, wallets: body });

        }
    })

  });//END on get_member_wallets


  socket.on('get_orders_history', function(request){
      var sql = "select amount, price, TIME(date) as date, UNIX_TIMESTAMP(date) as tm, 'BUY' as typ from buy_order where filled = '1' and pair_id ='"+request.pair_id+"'";
      var buy_orders;
      connection.query(sql,function(err,rows){
          if(!err) {
            buy_orders = rows;

            //get sell orders
            var sql1 = "select amount, price, TIME(date) as date, UNIX_TIMESTAMP(date) as tm, 'SELL' as typ from sell_order where filled = '1' and pair_id ='"+request.pair_id+"'";
            var sell_orders;
            connection.query(sql1,function(err1,rows1){
                if(!err1) {
                  sell_orders = rows1;

                  var history = sell_orders.concat(buy_orders)
                  history.sort(function (a, b) {
                    return b.tm - a.tm;
                  });

                  io.emit('get_orders_history_results', {id:request.id, data: history });

                }
             });//end get sell orders

          }
       });


  });//END on get_orders history

  //get markets
  socket.on('get_markets', function(request){
      var sql = "select * from pair where cur2 = '"+request.cur2+"'";
      connection.query(sql,function(err,rows){

          if(!err) {
            io.emit('get_markets_results', {id:request.id, data:rows});
          }
       });

  });//END on get_marjets

  //get cur2
  socket.on('get_market_cur2', function(request){
      var sql = "select distinct(cur2) from pair where cur2 not in('BTC')";
      connection.query(sql,function(err,rows){

          if(!err) {
            io.emit('get_market_cur2_results', {id:request.id, data:rows});
          }
       });
  });


  //get pair details
  socket.on('get_pair_details', function(request){
      var sql = "select * from pair where id = '"+request.pair_id+"'";
      connection.query(sql,function(err,rows){

          if(!err) {
            io.emit('get_pair_details_results', {id:request.id, data:rows});
          }
       });
  });


  //get chat messages
  socket.on('get_chat_messages', function(request){
      var sql = "select * from chat order by id desc limit 50";
      connection.query(sql,function(err,rows){

          if(!err) {
            sorted_rows = rows.sort(function (a, b) {
              return a.id - b.id;
            });
            io.emit('get_chat_messages_results', {id:request.id, data:sorted_rows});
          }
       });
  });


  //get deposit history
  socket.on('get_deposit_history', function(request){
      var member_id = socket.handshake.session.member_id;
      var sql = "select *, date(date) as dt, time(date) as tm from deposit where member_id = '"+member_id+"' order by id desc";
      connection.query(sql,function(err,rows){

          if(!err) {
            io.emit('get_deposit_history_success', {id:request.id, data:rows});
          }
       });

  });//END deposit history

  //get withdrawal history
  socket.on('get_withdrawal_history', function(request){
      var member_id = socket.handshake.session.member_id;
      var sql = "select *, date(date) as dt, time(date) as tm from withdrawal where member_id = '"+member_id+"' order by id desc";
      connection.query(sql,function(err,rows){

          if(!err) {
            io.emit('get_withdrawal_history_success', {id:request.id, data:rows});
          }
       });

  });//END deposit history

  //get member trade history
  socket.on('get_trade_history', function(request){
      var member_id = socket.handshake.session.member_id;
      var sql = "select buy_order.id as order_id, amount, price, TIME(date) as date, UNIX_TIMESTAMP(date) as tm, 'BUY' as typ, filled, pair.* from buy_order, pair  where member_id ='"+member_id+"' and pair.id = buy_order.pair_id";
      var buy_orders;
      connection.query(sql,function(err,rows){
          if(!err) {
            buy_orders = rows;

            //get sell orders
            var sql1 = "select sell_order.id as order_id, amount, price, TIME(date) as date, UNIX_TIMESTAMP(date) as tm, 'SELL' as typ, filled, pair.* from pair, sell_order where member_id = '"+member_id+"' and pair.id = sell_order.pair_id";
            var sell_orders;
            connection.query(sql1,function(err1,rows1){
                if(!err1) {
                  sell_orders = rows1;

                  var history = sell_orders.concat(buy_orders)
                  history.sort(function (a, b) {
                    return b.tm - a.tm;
                  });

                  io.emit('get_trade_history_success', {id:request.id, data: history });

                }else{
                  console.log(err1)
                }
             });//end get sell orders

          }else{
            console.log(err);
          }
       });


  });//END on get_orders history

  //cancel buy order
  socket.on('cancel_buy_order', function(request){
      var member_id = socket.handshake.session.member_id;
      var sql = "delete from buy_order where member_id = '"+member_id+"' and id =?";
      connection.query(sql,[request.order_id],function(err,rows){

          if(!err) {
            io.emit('cancel_buy_order_success', {id:request.id, data:rows});
          }else{
            console.log(err);
          }
       });

  });//END cancel buy order

  //cancel sell order
  socket.on('cancel_sell_order', function(request){
      var member_id = socket.handshake.session.member_id;
      var sql = "delete from sell_order where member_id = '"+member_id+"' and id =?";
      connection.query(sql,[request.order_id],function(err,rows){

          if(!err) {
            io.emit('cancel_sell_order_success', {id:request.id, data:rows});
          }else{
            console.log(err);
          }
       });

  });//END cancel sell order

  //get pair tickers
  socket.on('get_pair_tickers', function(request){
      var sql = "select * from pair where id  =?";
      connection.query(sql,[request.pair_id],function(err,rows){

          if(!err) {
            io.emit('get_pair_tickers_success', {id:request.id, data:rows});
          }else{
            console.log(err);
          }
       });

  });//end pair tickers


  //get deposit address
  socket.on('get_deposit_address', function(request_obj){
       var member_id = socket.handshake.session.member_id;
       var sql = "select * from deposit_address where currency  =? and member_id =? and used =0";
       connection.query(sql,[request_obj.currency,member_id],function(err,rows){

           if(!err) {

             if(rows.length == 0){

               //GENERATE NEW ADDRESS
               request("http://altcoinchanger.io/backoffice/index.php/wallets/generate_deposit_address/"+request_obj.currency+"/" + member_id, function (error, response, body) {
                   var bodyJSON = JSON.parse(body);
                   if (!error && response.statusCode === 200) {
                       io.emit('get_deposit_address_success', {id:request_obj.id, address:bodyJSON.deposit_address });

                   }
               })

             }else{
               io.emit('get_deposit_address_success', {id:request_obj.id, address:rows[0].address});
             }


           }else{
             console.log(err);
           }
        });

   });//end deposit address

  //get peding deposits
  socket.on('get_pending_deposits', function(request){
      var member_id = socket.handshake.session.member_id;
      var sql = "select * from deposit  where member_id = '"+member_id+"' and status = 'PENDING' order by id desc";

      connection.query(sql,function(err,rows){

          if(!err) {
            io.emit('get_pending_deposits_success', {id:request.id, data:rows});
          }else{
            console.log(err);
          }
       });

  });//END get peding deposits


});





http.listen(3000, function(){
  console.log('listening on *:80');
});

module.exports = app;
