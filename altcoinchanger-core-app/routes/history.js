var express = require('express');
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

/* GET history listing. */
router.get('/', function(req, res, next) {
  var sess = req.session;
  var logged_in = false;
  var member_id = 0;
  var username = 'Guest';

  if(sess.email) {
    username = sess.username;
    member_id = sess.member_id;
    logged_in = true;
  }else{

    // redirect to login page
    res.redirect('/trade');
    //username = 'gracca';
    //member_id = 1;
    //logged_in = true;

  }

  res.render('history/index', { title: 'Altcoin Changer - History',
                              logged_in: logged_in,
                              username: username,
                              member_id: member_id} );

});

module.exports = router;
