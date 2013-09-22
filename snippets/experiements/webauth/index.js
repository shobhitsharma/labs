// sudo npm install -g express@2.5.8
// sudo npm install -g mongodb@0.9.9
// sudo npm install jade@0.20.3
var express = require('express')
var mongodb = require('mongodb')
var ObjectID = require('mongodb').ObjectID

app = express.createServer()
app.use(express.bodyParser());
app.use(express.cookieParser());
app.use(express.session({ secret: 'my secret' }));

app.use(function (req, res, next) {
  if (req.session.loggedIn) {
    try {
      res.local('authenticated', true);
      var docId = new ObjectID.createFromHexString(req.session.loggedIn)
      console.log('DOC_ID ' + req.session.loggedIn + ' => ' + docId)
      //app.users.findOne({ _id: { $oid: req.session.loggedIn }}
      //app.users.findOne({ _id: req.session.loggedIn }
      //app.users.findOne({_id : {'$oid' : req.session.loggedIn}}
      app.users.findOne({ _id: docId}
      , function (err, doc) {
        if (err) {
          console.log('findOne failed');
          return next(err);
        }

        // debug
        if(doc)
          console.log("DOC.first_name = " + doc.first)
        else
          console.log("DOC is null");

        res.local('me', doc);
        return next();
      });
    } catch(e) {
      console.log('DATABASE ERROR: cannot connect');
    }

  } else {
    res.local('authenticated', false);
    next();
  }
});


app.set('view engine', 'jade');
app.set('view options', { layout: false }); // not needed in express 3

// Default route
app.get('/', function (req, res) {
  console.log("AUTH="+res.local('authenticated'));
  res.render('index', { authenticated: res.local('authenticated'), funny: true }); 
});

// Login route
app.get('/login', function (req, res) {
  res.render('login', {signupEmail: false});
});

// signup rout
app.get('/signup', function (req, res) {
  res.render('signup');
});

// mongo setup
var server = new mongodb.Server('127.0.0.1', 27017)

// if the collection 'sitarcenter' does not exist, create it
new mongodb.Db('sitarcenter', server).open(function (err, client) {
  // don't allow the app to start if there was an error
  if (err) throw err;

  console.log('\033[96m + \033[39m connected to mongodb');

  // set up collection shortcuts
  app.users = new mongodb.Collection(client, 'users');

  client.ensureIndex('users', 'email', function (err) {
    if (err) throw err;
    client.ensureIndex('users', 'password', function (err) {
      if (err) throw err;
      console.log('\033[96m + \033[39m ensured indexes');
      // listen
      app.listen(3000, function () {
        console.log('\033[96m + \033[39m app listening on *:3000');
      });
    });
  });
});

app.post('/signup', function (req, res, next) {
  app.users.insert(req.body.user, function (err, doc) {
    if (err) {
      console.err('ERROR on INSERT: /login/' + doc[0].email);
      return next(err);
    }
    res.redirect('/login/' + doc[0].email);
    console.log('INSERT: /login/' + doc[0].email);
  });
});

app.get('/login/:signupEmail', function (req, res) {
  res.render('login', { signupEmail: req.params.signupEmail });
  console.log(req.params.signupEmail + ' has signed up.');
});

app.post('/login', function (req, res) {
  app.users.findOne({ 
     email: req.body.user.email
   , password: req.body.user.password}
  , function (err, doc) {
     if (err) return next(err);
     if (!doc) 
       return res.send('<p>Incorrect login or password</p>');
     console.log('FOUND: ' + req.body.user.email);
     req.session.loggedIn = doc._id.toString();
     res.redirect('/');
  });
});

app.get('/logout', function (req, res) {
  req.session.loggedIn = null;
  res.redirect('/');
  // req.session.regenerate()
});


