//création du contrôleur "main_ctrl"
app.controller("main_ctrl", function ($scope, $rootScope, $http, $location,  $aside,  Cards, me) {

	console.log("MainCtrl initialized");
	//déclaration et initialisation des variables

	$scope.user = {};
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

	$scope.cards = {};
	$scope.countShared = {};
    $scope.countReciprocal = {};


	/**
	 * Cette fonction permet d'initialiser la liste des contacts de l'utilisateur
	 */
	var refresh_cards = function() {
		//appel de la factory Cards pour effectuer
		// la requête fournissant les contacts
		Cards.acceptedCards()
		.then (function(cards){
			$scope.cards = cards;
		});
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
     * Cette fonction permet d'initialiser le scope du contrôleur
     */
    var init = function() {

        me.me()
        .then(function(user){
        	$rootScope.user = $scope.user = user;
					console.log(user);
        });

        //actualisation des contacts
		refresh_cards();
		//actualisation des compteurs.
		getSharedCard();

    };

    init();
});
