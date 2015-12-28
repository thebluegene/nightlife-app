var express = require('express');
var http = require('http');
var path = require('path');
var passport = require('passport');
var GitHubStrategy = require('passport-github').Strategy;
var mongoose = require('mongoose');

//Yelp API setup
var Yelp = require('yelp');
var yelp = new Yelp({
    consumer_key: 'DjfBzsjOO-2An8vwm2rt5w',
    consumer_secret: 'MT5uJsUr4wRL0M9cSM8grHaPipo',
    token: 'HExyIn5wsNfcfKK76y6qgQPKXU_Y8EIL',
    token_secret: 'NHASOJ4wl2Wx6hBN8JsyXdphKRA'
});

//==================================================================
// Define the strategy to be used by PassportJS
require('dotenv').load();
var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var YelpSchema = new Schema({
	id: String,
	users: Array
});
var UserSchema = new Schema({
	github: {
		id: String,
		displayName: String,
		username: String,
    publicRepos: Number
	},
	attending: Array
});

mongoose.model('Business', YelpSchema);
mongoose.model('User',UserSchema);

var Bar = mongoose.model('Business');
var User = mongoose.model('User');
var configAuth={'githubAuth': {
		'clientID': process.env.GITHUB_KEY,
		'clientSecret': process.env.GITHUB_SECRET,
		'callbackURL': process.env.APP_URL + 'auth/github/callback'
}};

	passport.serializeUser(function (user, done) {
		done(null, user.id);
	});

	passport.deserializeUser(function (id, done) {
		User.findById(id, function (err, user) {
			done(err, user);
		});
	});

	passport.use(new GitHubStrategy({
		clientID: configAuth.githubAuth.clientID,
		clientSecret: configAuth.githubAuth.clientSecret,
		callbackURL: configAuth.githubAuth.callbackURL
	},
	function (token, refreshToken, profile, done) {
		process.nextTick(function () {
			User.findOne({'github.id': profile.id}, function (err, user) {
				if (err) {
					return done(err);
				}

				if (user) {
					return done(null, user);
				} else {
					var newUser = new User();

					newUser.github.id = profile.id;
					newUser.github.username = profile.username;
					newUser.github.displayName = profile.displayName;
					newUser.github.publicRepos = profile._json.public_repos;
					
					newUser.save(function (err) {
						if (err) {
							throw err;
						}

						return done(null, newUser);
					});
				}
			});
		});
	}));

// Define a middleware function to be used for every secured routes
var auth = function(req, res, next){
  if (!req.isAuthenticated()) 
  	res.send(401);
  else
  	next();
};
//==================================================================

// Start express application
var app = express();


// Connect to mongoose
mongoose.connect(process.env.MONGOLAB_URI || process.env.MONGO_URI);

// all environments
app.set('port', process.env.PORT || 3000);
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.cookieParser()); 
app.use(express.bodyParser());
app.use(express.methodOverride());
app.use(express.session({ secret: 'securedsession' }));
app.use(passport.initialize()); // Add passport initialization
app.use(passport.session());    // Add passport initialization
app.use(app.router);
app.use(express.static(__dirname + "/public"));

//==================================================================
// routes
app.get('/users', auth, function(req, res){
  //res.send([{name: "user1"}, {name: "user2"}]);
});

// yelp routes
app.get('/app/yelp/:location', function(req,res){
  yelp.search({term: 'nightlife', location: req.params.location}, function(err,data){
    if(err) throw err;
    (data.businesses).forEach(function(each){
    	Bar.findOne({id : each.id}, function(err,obj){
    		if(err)
    			throw err;
    		if(obj !== null){
    			each.userArray = obj.users;	
    		}
    		else{
    			each.userArray = [];
    		}
    	});
    });
    setTimeout(function(){res.json(data.businesses)},100);
  });
});

app.post('/app/yelp/:bar',auth,function(req,res){
	var attended = new Bar();
	attended.id = req.params.bar;
	attended.users = req.body.users;
	attended.save(function(err) {
        if (err) throw err;
        res.json(attended);
    });
});

app.put('/app/yelp/:bar', auth, function(req,res){
	Bar.update({id:req.params.bar}, {$set: {users: req.body.users}},
	function(err) {
    if (err) throw err;
  });
});

app.delete('/app/yelp/:bar', auth, function(req,res){
	var bar = req.params.bar;
    //console.log(id);
    Bar.remove({
        id: ''+bar+''
    }, function(err) {
        if (err) throw err;
        res.status(204).end();
    });
});

//==================================================================

//==================================================================
// route to test if the user is logged in or not
app.get('/loggedin', function(req, res) {
  res.send(req.isAuthenticated() ? req.user : '0');
});

// route to log in
app.post('/login', passport.authenticate('github'), function(req, res) {
  res.json(req.user);
});

// route to log out
app.post('/logout', function(req, res){
  req.logOut();
  res.send(200);
});

app.get('/auth/github', passport.authenticate('github'));

	app.get('/auth/github/callback', passport.authenticate('github', {
			successRedirect: '/',
			failureRedirect: '/login'
		}));

//==================================================================

var port = process.env.PORT || 8080;
app.listen(port, function() {
    console.log('Listening on port ' + port + '...');
});
