app.factory("Cards", function($http, $q, $rootScope, $location) {
	

	return {

		/**
		 * Cette fonction retourne la liste des cartes possédées par l'utilisateur
		 * @return tableau contenant les cartes possédées
		 */
		acceptedCards: function (){
			
			return $q(function(resolve, reject) {
				if($rootScope.globals.currentUser && $rootScope.globals.currentUser.token) {

					var data = {};
				    
				    var req = {
				        method: 'GET',
				        url: ROOT_URL + "/cards/accepted",
				        headers: {
				        	token: $rootScope.globals.currentUser.token
				        },
				        data: data
				    };
				    $http(req)
					.success(function(res){
						resolve(res);
					})
					.error(function(err) {
						reject(err);
					});
				}
				else {
					reject("utilisateur non authentifié");
				}
			});
		},
		
		/**
		 * Cette fonction permet de retirer une carte
		 * @param  cardId : Chaine de caract_res identifiant la carte à retirer
		 * @return retourne l'objet card supprimé
		 */
		decline: function (cardId) {
			return $q(function(resolve, reject){
				if($rootScope.globals.currentUser && $rootScope.globals.currentUser.token){

					req = {
						method: 'PUT',
				        url: ROOT_URL + "/cards/" + cardId + "/decline",
				        headers: {
				        	token: $rootScope.globals.currentUser.token
				        }
					};

					$http(req)
					.success(function(card){
						resolve(card);
					})
					.error(function(err){
						reject(err);
					});
				}
				else {
					reject("User non authentifié");
				}
			});
		}
	};
});