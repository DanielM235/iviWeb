
app.controller('shop_ctrl', function ($scope, shop_facto,$http, $rootScope, me){

    //déclaration des variables
	$scope.fondCards = {};
    $scope.listCards = {};
	$scope.selectedIcon = true;
	$scope.caddieFonds = [];
    $scope.currentTemplate = {};
    $scope.achat = true;
    $scope.achatCredits = true;
    $scope.prix = null;
    $scope.avatar = {};
    $scope.fondsPossedes = [];

    $scope.filter = "all";


    $scope.categories = {
        all: 'Tous métiers',
        graphic: 'Design',
        pro: 'Professionnel',
        metal: 'Métal',
        wood: 'Bois',
        animaux: 'Nature',
        cartoon: 'Cartoon',
        netb: 'Noir et blanc',
        bleu: 'Bleu',
        marron: 'Marron',
        rouge: 'Rouge'
    };

    $scope.fondsPossedes = $scope.$parent.user.premium_cards;

    /**
    * Cette fonction retourne la liste des catégories à afficher dans la combobox
    */
    $scope.comboFilter = function(){
        switch($scope.filter){
            case "all":
            $scope.listCards = _.chain($scope.fondCards).values().flatten().value().reverse();
            break;

            default:
            $scope.listCards = $scope.fondCards[$scope.filter];
        }
    };

    //Affectation d'un écouteur sur l'élément sélectionné dans la combobox
    $scope.$watch("filter", function() {
        $scope.comboFilter();
    });


    /**
        Cette fonction retourne vrai si le nombre de fond de carte est superieur a 1;
    */
    $scope.textAjoute = function(){
        return $scope.caddieFonds.length > 1;
    };

    /**
        Cette fonction retourne vrai si le fond est déjà présent dans la liste des fonds à ajouter 
    */
	$scope.isAdded = function(fond){
        return $scope.caddieFonds.indexOf(fond) != -1;
    };


    /**
    * Cette fonction envoie la liste de fond de carte existant dans le base de donnee
    */
    var shopListFonds = function(){
    	shop_facto.listFonds
    	.then(function(res) {
    		$scope.fondCards = res;
            //
            $scope.listCards = _.chain($scope.fondCards).values().flatten().value();
         });
    };

    shopListFonds();

  


    /**
    * Cette fonction permet de calculer le prix total en euro des cartes choisies
    */

    $scope.calculPrix = function(){
        getCardShared();
        $scope.achat = true;

        if($scope.caddieFonds.length == 1)
        {
            $scope.prix = 1.99;
        }
        else if($scope.caddieFonds.length > 5) {
            $scope.prix = 1.99 * $scope.caddieFonds.length * 0.8;
        }
        else {
            $scope.prix = 1.99 * $scope.caddieFonds.length * 0.9;
        }

    };


    /**
    * Cette fonction retourne le nombre de cartes à partager et le nombre de cartes récipoques
    */

    var getCardShared = function(){
        me.get_cardsCount
        .then(function(res){
            $scope.countCardShared = res.shared;
            $scope.countCardReciprocal = res.reciprocal;
        });
    };


    /**
        Cette fonction ajoute ou retire un fond du caddie
        @template : fond sélectionné
    */
    $scope.ajouteFond = function(template){
        
    	if(!$scope.isAdded(template)){
    		$scope.caddieFonds.push(template);
    	}
    	else{
    		var indexOf = $scope.caddieFonds.indexOf(template);
    		$scope.caddieFonds.splice(indexOf,1);
    	}
    };


    /**
    * Cette fonction permet de conserver le fond de carte sélectionné
    * @template fond de carte choisi
    */
    $scope.setCurrentTemplate = function(template){

        $scope.currentTemplate = template;
    };

    /**
    * Cette fonction permet d'effectuer un achat de crédits
    */
    $scope.orderAchatCredit = function(){
        if($scope.caddieFonds.length && $scope.caddieFonds.length > 0){
            me.purchase_many_credits($scope.caddieFonds.length)
            .then(function(credits){
                $scope.$parent.user.credits = credits;
            });
            $scope.achatCredits = false;
        }        
    };

    /**
    * Cette fonction permet d'effectuer l'achat de cartes
    */
    $scope.buy_cards = function(){
        if($scope.$parent.user.credits < $scope.caddieFonds.length){
            $scope.err.message = " Credit insuffisant";
        }
        else{
            me.purchase_card_buy($scope.caddieFonds)
            .then(function(res){
                $scope.fondsPossedes = res.premium_cards;
                $scope.$parent.user.credits = res.credits;
            });
            $scope.achat = false;
        }
        
    }

});

