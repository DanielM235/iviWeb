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
			console.log("dans store_ctrl, cards : ", cards);
		});
	};


	/**
	 * Cette fonction permet de définir le contact sélectionné
	 * @param  card : contact sélectonné
	 */
	$scope.selectContact = function(card) {
		$scope.selected_card = card;
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

	$scope.deleteContact = function(contact_id){
		Cards.decline(contact_id)
		.then(function(){
			console.log("StoreCtrl : deleteContact, success, id = ", contact_id);
			refreshCards();
			$scope.message.delete = "Carte supprimée";
		})
		.error(function(){
			$scope.message.delete = "Erreur de suppression";
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
