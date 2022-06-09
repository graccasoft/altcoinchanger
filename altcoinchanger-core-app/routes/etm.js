var express = require('express');
var router = express.Router();
var Web3 = require('web3');

webrpc = new Web3(new Web3.providers.HttpProvider("http://62.151.181.104:8545"));

router.get('/create-account/:pin', function(req, res, next) {

	const loadJsonFile = require('load-json-file');
	loadJsonFile('./contract/EtradeMarkets.abi').then(abi => {
	    webrpc.personal.newAccount(req.param("pin"), function(err,newAccountaddress){
			console.log(err,newAccountaddress);
			res.end(newAccountaddress);
		});

	});

});

router.get('/get-balance/:address', function(req, res, next) {
  const loadJsonFile = require('load-json-file');
  loadJsonFile('./contract/EtradeMarkets.abi').then(abi => {

    var Record =  webrpc.eth.contract(abi).at("0x9B5ef867bc7863122DD10E30a63A41E20d14fCa0");
    var tokenBalance = Record.balanceOf.call(req.param("address")).toNumber();

    res.end(webrpc.fromWei(tokenBalance, 'ether'));
  });

});

router.get('/transfer/:from_address/:pin/:to_address/:amount', function(req, res, next) {
  const loadJsonFile = require('load-json-file');
  loadJsonFile('./contract/EtradeMarkets.abi').then(abi => {

    var Record =  webrpc.eth.contract(abi).at("0x9B5ef867bc7863122DD10E30a63A41E20d14fCa0");
	   webrpc.personal.unlockAccount(req.param("from_address"), req.param("pin"),(err, unlocked)=>{
		     if(!unlocked){
			        console.log("Unable to unlock", err);
          }else{

      			try{
      				var transCall = Record.transfer(req.param("to_address"), req.param("amount"),{ from: "0x86237243cc70c4bb17ec56d999aa3ec1f14e82c8", gas: 200000 });
      				console.log("transCall >>",transCall);
      			}catch(ex){
      				console.log(ex);
      			}
		     }
     });
     res.end("transfer");
  });

});
