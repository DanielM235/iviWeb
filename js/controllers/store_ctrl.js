//création du contrôleur "store_ctrl"
app.controller("store_ctrl", function ($scope, $routeParams, $alert, $sce, Cards, me) {

	console.log("StoreCtrl initialized");
	//contact sélectionné
	$scope.selected_card = {};

	$scope.cards = {};

	$scope.medata = me._data;

	$scope.message = {};

	$scope.selectedCards = [];
	$scope.folder = "";
	$scope.selectedFolder = [];

	/**
	 * Cette fonction permet d'initialiser la liste des contacts de l'utilisateur
	 */
	var refresh_cards = function() {
		//appel de la factory Cards pour effectuer
		// la requête fournissant les contacts
		Cards.acceptedCards()
		.then (function(cards){
			$scope.cards = cards;
			$scope.selected_card = $scope.cards[0] || {};
		});
	};


	/**
	 * Cette fonction permet de définir le contact sélectionné
	 * @param  card : contact sélectonné
	 */
	$scope.selectContact = function(card) {
		$scope.selected_card = card;
		console.log("dans store_ctrl/selectContact/card : ", card);
	};

	$scope.addCardToFolder = function(card){
		if($scope.cards && $scope.selectedCards.indexOf(card) == -1 ){
    		$scope.selectedCards.push(card);
    	}
    	else{
    		var indexOf = $scope.selectedCards.indexOf(card);
    		$scope.selectedCards.splice(indexOf,1);
    	}
  };

  $scope.copy_to_folder = function(folder, selectedCards) {
  	me.copy_to_folder(folder, selectedCards)
  	.then(function(){
  		$scope.message.copy_to_folder = "Dossier modifié avec succès";
  	})
  	.catch(function() {
  		$scope.message.copy_to_folder = "Erreur modification du dossier";
  	});
  };

/**
 * Cette fonction permet de supprimer un contact
 * @param contact_id : Identifiant du contact à supprimer
 */

	$scope.deleteContact = function(){
		console.log("dans deleteContact contact_id : ", $scope.selected_card._id);
		Cards.decline($scope.selected_card._id)
		.then(function(){
			console.log("StoreCtrl : deleteContact, success, id = ", $scope.selected_card._id);
			refresh_cards();
			$scope.message.delete = "Carte supprimée";
		})
		.catch(function(){
			$scope.message.delete = "Erreur de suppression";
		});
	};

	$scope.full_contacts = function() {
		Cards.full()
		.then(function(message){
			console.log("full_contacts : ", message);
		});
	};

	/**
	 * Cette fonction initialise le scope du controlleur
	 *
	 */
	var init = function(){

		refresh_cards();
	};

	init();

});
