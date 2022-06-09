var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var request = require("request");

var addresses = require('./routes/addresses');

var app = express();

app.use('/addresses', addresses);

app.listen(8001, function(){
  console.log('listening on *:8001');
});

module.exports = app;
