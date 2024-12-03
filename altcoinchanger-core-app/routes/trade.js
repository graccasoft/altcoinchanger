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

/* GET home page. */
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
    req.session.username = username;
  }

  res.render('trade/index', { title: 'Altcoin Changer',
                              curId: 1,
                              cur1: 'ETH',
                              cur2: 'BTC',
                              logged_in: logged_in,
                              username: username,
                              member_id: member_id} );
});

router.get('/:curId/:cur1/:cur2', function(req, res, next) {
  var sess = req.session;
  var logged_in = false;
  var member_id = 0;
  var username = 'Guest';

  if(sess.email) {
    username = sess.username;
    member_id = sess.member_id;
    logged_in = true;
  }else{
    req.session.username = username;
  }

  res.render('trade/index', { title: 'Altcoin Changer',
                              curId: req.param("curId"),
                              cur1: req.param("cur1"),
                              cur2: req.param("cur2"),
                              logged_in: logged_in,
                              username: username,
                              member_id: member_id} );
});


module.exports = router;
