var express = require('express');
var request = require('request');
var router = express.Router();
var session = require('express-session')({
  secret: '',
  resave: true,
  saveUninitialized: true,
  cookie: { secure: false }
});

var app = express();
var sharedsession = require("express-socket.io-session");
app.use(session);

/* GET users listing. */
router.get('/', function(req, res, next) {
  res.send('Login for to show here');
});

router.post('/login',function(req,res){

  //start google recaptcha validation
  if(req.body['g-recaptcha-response'] === undefined || req.body['g-recaptcha-response'] === '' || req.body['g-recaptcha-response'] === null) {
    res.end('invalid');
    return false;
  }

  var secretKey = "";

  var verificationUrl = "https://www.google.com/recaptcha/api/siteverify?secret=" + secretKey + "&response=" + req.body['g-recaptcha-response'] + "&remoteip=" + req.connection.remoteAddress;

  request(verificationUrl,function(error,response,body) {
    body = JSON.parse(body);

    if(body.success !== undefined && !body.success) {
      res.end('invalid');
      return false;
    }

  });
  //end google recaptcha validation

  var mysql      = require('mysql');
  var connection = mysql.createConnection({
    host     : '127.0.0.1',
    user     : 'root',
    password : '',
    database : 'altcoin_changer'
  });

  connection.connect(function(err){
    if(!err) {
      console.log("Database is connected > for login... \n\n");
    } else {
      console.log("Error connecting database > for login ... \n\n");
      console.log(err);
    }
  });
  var sql = "select * from member where email = ? and password = MD5('"+req.body.password+"')";
  connection.query(sql,[req.body.email],function(err,rows){
      if(!err) {
        if(rows.length >0){
          var member = rows[0];
          console.log(member.email);
          req.session.email = member.email;
          req.session.username = member.username;
          req.session.member_id = member.id;
          req.session.first_name = member.first_name;
          res.end('ok');
        }else{
          res.end('invalid');
        }
      }
   });


});


router.post('/register',function(req,res){
  //start google recaptcha validation
  if(req.body['g-recaptcha-response'] === undefined || req.body['g-recaptcha-response'] === '' || req.body['g-recaptcha-response'] === null) {
    res.end('Please confirm that you are human');
    return false;
  }

  var secretKey = "";

  var verificationUrl = "https://www.google.com/recaptcha/api/siteverify?secret=" + secretKey + "&response=" + req.body['g-recaptcha-response'] + "&remoteip=" + req.connection.remoteAddress;

  request(verificationUrl,function(error,response,body) {
    body = JSON.parse(body);

    if(body.success !== undefined && !body.success) {
      res.end('Please confirm that you are human');
      return false;
    }

  });
  //end google recaptcha validation

  var mysql      = require('mysql');
  var connection = mysql.createConnection({
    host     : '127.0.0.1',
    user     : 'root',
    password : 'L0tu5n0t35!',
    database : 'altcoin_changer'
  });

  connection.connect(function(err){
    if(!err) {
      console.log("Database is connected > for registration... \n\n");
    } else {
      console.log("Error connecting database > for registration ... \n\n");
      console.log(err);
    }
  });
  var sql = "select * from member where email = ? or username = ?";
  connection.query(sql,[req.body.email,req.body.username],function(err,rows){
      if(!err) {
        if(rows.length >0){
          var member = rows[0];
          if(member.email == req.body.email)
            res.end('Email already registered');
          if(member.username == req.body.username)
            res.end('Username already registered');

        }else{

          //register new member
          var insert_query = "insert into member(username,email,password,date_registered) ";
          insert_query+= "values(?,?,MD5('"+req.body.password+"'),NOW())";

          connection.query(insert_query, [req.body.username,req.body.email], function(err, rows, fields) {
          if (!err){
              res.end('ok');
            }else{
              res.end('Unkown error.');
            }
          });

        }
      }
   });


});


router.get('/logout',function(req,res){
  req.session.destroy(function(err) {
    if(err) {
      console.log(err);
    } else {
      res.redirect('/trade');
    }
  });
});

module.exports = router;
