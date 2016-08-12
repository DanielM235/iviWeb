//création du contrôleur "main_ctrl"
app.controller("main_ctrl", function ($scope, $rootScope, $http, $location,  $aside,  Cards, me, $cookies) {

	console.log("MainCtrl initialized");
	//déclaration et initialisation des variables

	$scope.user = $rootScope.user || {};
	//$scope.user = $rootScope.user || {};
	$scope.err = {
		message: ""
	};
	$scope.state = {
		mode: "connexion"
	};
	$scope.contacts_filter = "";
	$scope.aside = {
	  "title": "Title"
	};

	$scope.loggedIn = !!$rootScope.globals.currentUser;
	$scope.user_card = {}; //objet carte représentant l'utilisateur

	$scope.countShared = {};
  $scope.countReciprocal = {};


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
	};


	/**
    * Cette fonction retourne le nombre de cartes à partager et le nombre de cartes réciproques
    */

    var getSharedCard = function(){
        me.get_cardsCount
        .then(function(res){
            $scope.countShared = res.shared;
            $scope.countReciprocal = res.reciprocal;
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
