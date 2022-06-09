var express = require('express');
var router = express.Router();
var rpc = require('node-json-rpc2');

var app = express();


router.get('/generate',function(req,res){
  var currency = req.query.currency;
  var count = req.query.count;

  var options = {user:''};

  if(currency == "GCCHD"){
    options = {
      protocol:'http',
    	host:'127.0.0.1',
    	user:'user',
    	password:'Za45XVA1fJxtqVu',
    	port:38200,
    	method:'POST'
    };
  }

  if(options.user == ""){
      res.send('{"address":"","status":"failed","error":"token not configured"}');
      return false;
  }

  var client = new rpc.Client(options);
  var addresses = {};
  //for(x =0; x< count; x++){
    client.call(
      {"jsonrpc": "2.0", "method": "getnewaddress", "params": [], "id": 0},
      function (err, rpc_res) {
        if (err) {
            res.send('{"address":"","status":"failed","error":"'+err+'"}');
        }
        else {
          //console.log(rpc_res);
          res.send('{"address":"'+rpc_res.result+'","status":"success"}');
          //addresses.push(res);
        }
      }
    );
  //}

});

module.exports = router;
