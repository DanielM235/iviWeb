app.factory('Search', function($http, $q, $rootScope){

  return {
    find: function(recherche) {
      return $q(function(resolve, reject){
        //var canceler = $q.defer();

        var data = {
          timout: $q.defer().promise,
          canceler: $q.defer()
        };

        var req = {
          method: 'GET',
          url: ROOT_URL + "/users/?q=" + recherche,
          headers: {
              token: $rootScope.globals.currentUser.token
          },
          data: data
        };

        $http(req)
        .success(function(found_users){
          console.log("dans Search_facto/find - recherche = ", recherche);
          console.log("dans Search_facto/find - resultat = ", found_users);
          resolve(found_users);
        })
        .error(function(err){
          reject(err);
        });
      });
    }
  };
});
