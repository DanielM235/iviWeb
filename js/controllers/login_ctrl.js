//création du contrôleur "login_ctrl"
app.controller("login_ctrl", function ($scope, $http, $rootScope, $location, $cookies, me) {
	
	console.log("LoginCtrl initialized");
	//déclaration des variables du $scope
	$scope.card = {};
	$scope.card._sender = $rootScope.user;
	$scope.password_check = "";

	$scope.loggedIn = !!$rootScope.globals.currentUser;


	/**
	 * La méthode email_login permet à un utilisateur de 
	 * se connecter via email. 
	 */
	
	$scope.email_login = function () {

		
		if(!$scope.$parent.user.email || !$scope.$parent.user.password){
			$scope.err.message = "Champs email et password obligatoires";
		}
		else{
			//appel de la fonction login de la factory "me"
			me.login($scope.$parent.user.email, $scope.$parent.user.password)
			//1er callback, s'exécute lorsque la méthode me.login
			//a terminé son exécution
			.then(function(user) {
				//stocke l'objet user renvoyé par la factory dans le scope
				//$rootScope.user = user;
				$scope.loggedIn = true;
				$scope.err.message = null;	
				$location.path('/profil');
			})
			.catch(function(err) {
				$scope.err.message = err;
			});
			
		}
	};
	
	/**
	 * La méthode email_signin permet à un utilisateur de 
	 * s'inscrire via email.
	 */
	$scope.email_signin = function () {

		if(!$scope.$parent.user.email || !$scope.$parent.user.password) {
			$scope.err.message = "Champs email et password obligatoires";
		}

		else {

			//on vérifie la correspondance des mots de passe
			if($scope.$parent.user.password !== $scope.password_check) {
				$scope.err.message = "Les mots de passe ne sont pas identiques";
			}

			else {
				me.signin($scope.$parent.user.email, $scope.$parent.user.password)
	  		//1er callback, s'exécute lorsque la méthode me.login
	  		//a terminé son exécution
	  		.then(function(res) {
	  			//stocke l'objet renvoyé par la factory dans le scope
	  			$scope.$parent.user = res;
	  			$scope.err.message = null;
	  			$location.path("/profil");
	  		})
	      //récupération du message d'erreur
	  		.catch(function(err) {
	  			$scope.err.message = err;
	  		});
			}
		}
		
	};

	/**
	 * Cette fonction permet de se déconnecter
	 */
	$scope.logout = function () {
		//efface les identifiants du scope et le cookie
		$scope.loggedIn = false;
		$rootScope.globals = {};
		$cookies.remove('globals');
		$http.defaults.headers.token = '';
	};

	/**
	 * La méthode update permet de modifier les attributs de l'objet User
	 * les infos.
	 */
	$scope.update= function(){

		if($scope.$parent.user){
			 
			 if(!$scope.$parent.user.first_name || !$scope.$parent.user.last_name) {

				$scope.err.message = "Champs Nom et Prénom obligatoires";
			}

			else {
				//appel de la fonction update de la factory "me"
				 me.update($scope.$parent.user)
				 //1er callback, s'exécute lorsque la méthode me.update
				//a terminé son exécution
				 .then(function(res) {
					//stocke l'objet tmp_user renvoyé par la factory dans le scope
					$scope.$parent.user = res;
					$scope.err.message = null;
					$scope.success.message = null;

					//fin de l'inscription
					if($rootScope.globals.currentUser.new_user){

			            $rootScope.globals.currentUser.new_user = false;
			            //mise à jour du cookie contenant le userCurrent
			            $cookies.putObject('globals', $rootScope.globals);
			            $location.path("/shop");
			            $scope.success.message = "Enregistrement effectué avec succès";

					}
					
				})
				.catch(function(err) {
					$scope.err.message = "Les champs nom ou prénom sont absents";
				});
			}
		}

		else {

			$scope.err.message = "Problème interne";
		}
	};
});