'use strict';

/**********************************************************************
 * Angular Application
 **********************************************************************/
var app = angular.module('app', ['ngResource', 'ngRoute'])
  .config(function($routeProvider, $locationProvider, $httpProvider) {
    //================================================
    // Check if the user is connected
    //================================================
    var checkLoggedin = function($q, $timeout, $http, $location, $rootScope){
      // Initialize a new promise
      var deferred = $q.defer();

      // Make an AJAX call to check if the user is logged in
      $http.get('/loggedin').success(function(user){
        // Authenticated
        if (user !== '0'){
          /*$timeout(deferred.resolve, 0);*/
          window.localStorage.setItem('username', user.github.username);
          deferred.resolve();
        }
        // Not Authenticated
        else {
          $rootScope.message = 'You need to log in.';
          //$timeout(function(){deferred.reject();}, 0);
          deferred.reject();
          window.location.href='/auth/github';
        }
      });

      return deferred.promise;
    };
    
    function checkUser($http){
      $http.get('/loggedin').success(function(user){
      if (user !== '0'){
        console.log('hello', user.github.username);
        window.localStorage.setItem('username', user.github.username);
      }
      else{
        console.log('nah');
      }
      });
    }
    //================================================
    
    //================================================
    // Add an interceptor for AJAX errors
    //================================================
    $httpProvider.interceptors.push(function($q, $location) {
      return {
        response: function(response) {
          // do something on success
          return response;
        },
        responseError: function(response) {
          if (response.status === 401)
          //$location.url('/login');
          window.location.href='/auth/github';
          return $q.reject(response);
        }
      };
    });
    //================================================

    //================================================
    // Define all the routes
    //================================================
    $routeProvider
      .when('/', {
        templateUrl: '/views/main.html',
        controller: 'YelpCtrl',
        resolve: {
          app: checkUser
        }
      })
      .when('/admin', {
        templateUrl: 'views/admin.html',
        controller: 'AdminCtrl',
        resolve: {
          loggedin: checkLoggedin
        }
      })
      .when('/login', {
        templateUrl: 'views/login.html'
        //controller: 'LoginCtrl'
      })
      .otherwise({
        redirectTo: '/'
      });
    //================================================

  }) // end of config()
  .run(function($rootScope, $http){
    $rootScope.message = '';

    // Logout function is available in any pages
    $rootScope.logout = function(){
      localStorage.clear();
      $rootScope.message = 'Logged out.';
      $http.post('/logout');
    };
  });


/**********************************************************************
 * Login controller
 *********************************************************************
app.controller('LoginCtrl', function($scope, $rootScope, $http, $location) {
  // This object will be filled by the form
  $scope.user = {};

  // Register the login() function
  $scope.login = function(){
    $http.post('/login', {
      username: $scope.user.username,
      password: $scope.user.password,
    })
    .success(function(user){
      // No error: authentication OK
      $rootScope.message = 'Authentication successful!';
      $location.url('/admin');
    })
    .error(function(){
      // Error: authentication failed
      $rootScope.message = 'Authentication failed.';
      $location.url('/login');
    });
  };
});*/

/**********************************************************************
 * Yelp controller
 **********************************************************************/
app.controller('YelpCtrl', function($scope, $http, $location) {
  var $search = $('#filter-search');
  
  $search.keypress(function(e) {
    if (e.which == 13) {
      var input = this.value;
      search(input);
      window.localStorage.setItem('prevSearch', input);
    }
  });
  
  if(window.localStorage.getItem('save') && window.localStorage.getItem('prevSearch')){
    console.log('this should save the search');
    search(window.localStorage.getItem('prevSearch'));
    window.localStorage.removeItem('save');
  }
  
  $scope.attending = function(bar) {
    var user = window.localStorage.getItem('username');
    if(user && bar.userArray.indexOf(user)==-1){
      bar.userArray.push(user);
      var data = {users: bar.userArray};
      
      if(!bar.userArray){
        $http.post('/app/yelp/'+bar.id, data).success(function(response){
          console.log('response: ', response);
        });
      }
      else{
        $http.put('/app/yelp/'+bar.id, data).success(function(){
          console.log('PUT resquest success');
        });
      }
      
    }
    else if(bar.userArray.indexOf(user) > -1)
      console.log('you are already attending');
    else{
      console.log('you need to log in');
      window.localStorage.setItem('save', true);
      window.location.href='/auth/github';
    }
  };
  
  $scope.remove = function(bar){
      var index = bar.userArray.indexOf(window.localStorage.getItem('username'));
      bar.userArray.splice(index,1);
      var data = {users: bar.userArray};
      $http.put('/app/yelp/'+bar.id, data);
  };
  
  $scope.alreadyGoing = function(bar){
    var user = window.localStorage.getItem('username');
    if(user && bar.userArray.indexOf(user)>-1)
      return true;
    else
      return false;
  };

  function search(location) {
    $http.get('/app/yelp/' + location).success(function(response) {
      $scope.businesses = response;
      console.log(response);
    });
  }

});

/**********************************************************************
 * Admin controller
 **********************************************************************/
app.controller('AdminCtrl', function($scope, $http) {
  // List of users got from the server
  $scope.users = [];
  // Fill the array to display it in the page
  $http.get('/users').success(function(users){
    for (var i in users)
      $scope.users.push(users[i]);
  });
});


