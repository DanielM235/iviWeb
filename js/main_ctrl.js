//création du contrôleur "main_ctrl"
app.controller("main_ctrl", function ($scope, $rootScope, $http, $location,  $aside,  Cards, me, $cookies, $route, Search) {

	console.log("MainCtrl initialized");
	//déclaration et initialisation des variables

	$scope.user = $rootScope.user || {};
	$scope.err = {
		message: ""
	};
	$scope.state = {
		mode: "connexion"
	};

	$scope.contacts_filter = "";
	$scope.search_result = {};

	$scope.aside = {
	  "title": "Title"
	};

	$scope.loggedIn = !!$rootScope.globals.currentUser;
	$scope.user_card = {}; //objet carte représentant l'utilisateur

	$scope.countShared = {};
  $scope.countReciprocal = {};
	$scope.countOwned = {};

	//search
	var search = function(q) {
		search_for = q.trim();

		if(search_for) {
			Search.find(search_for)
			.then(function (found_users) {
				$scope.search_result = found_users;
			});
		}

	};
	$scope.$watch("contacts_filter", search);


	/**
	 * Cette fonction permet de se déconnecter
	 */
	$scope.logout = function () {
		//efface les identifiants du scope et le cookie
		$scope.loggedIn = false;
		$scope.user = $rootScope.user =
				$scope.user_card = {};
		$rootScope.globals = {};
		$cookies.remove('globals');
		$http.defaults.headers.token = '';
		$route.reload();
	};


	/**
    * Cette fonction retourne le nombre de cartes à partager et le nombre de cartes réciproques
    */

    var getSharedCard = function(){
        me.get_cardsCount
        .then(function(res){
					console.log("dans main_ctrl, getSharedCard : ", res);
          $scope.countShared = res.shared;
          $scope.countReciprocal = res.reciprocal;
        })
				.catch(function(err){
					console.log("Dans main_ctrl, erreur getSharedCard : ", err);
				});
    };

	/**
     * Cette fonction permet d'initialiser le contrôleur
     */
    var init = function() {
			$scope.err.message = "";
			//actualisation des compteurs.
			getSharedCard();
    };
    init();
});
