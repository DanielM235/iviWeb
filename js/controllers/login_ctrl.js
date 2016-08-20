//création du contrôleur "login_ctrl"
app.controller("login_ctrl", function ($scope, $http, $rootScope, $location, $cookies, me, fileService) {

	console.log("LoginCtrl initialized");
	console.log("début LoginCtrl, scope.user : ", $scope.$parent.user);
	//déclaration des variables du $scope
	//$scope.user = {};
	//$scope.card = {};
	$scope.password_check = "";

	$scope.success = {
		message: ""
	};

  $scope.modal = {
  "title": "Choisissez un fond de carte",
  "content": "Liste des templates"
	};


	$scope.social_networks = ['Facebook', 'Twitter', 'LinkedIn', 'Snapchat',
	'GitHub', 'Viadeo', 'Skype', 'Tumblr', 'Youtube', 'Pinterest',
	'Instagram', 'Steam'];


	/**
	 * La méthode email_login permet à un utilisateur de
	 * se connecter via email.
	 */

	$scope.email_login = function () {
		console.log("Dans login_ctrl/login user = ", $scope.$parent.user);

		if(!$scope.$parent.user.email || !$scope.$parent.user.password){
			$scope.err.message = "Champs email et password obligatoires";
		}
		else{
			//appel de la fonction login de la factory "me"
			me.login($scope.$parent.user.email, $scope.$parent.user.password)
			//1er callback, s'exécute lorsque la méthode me.login
			//a terminé et renvoie sa promise
			.then(function(user) {
				$scope.$parent.user = user;
				$scope.$parent.loggedIn = true;
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

					init();
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
	 * La méthode update permet de modifier les attributs de l'objet User
	 * les infos.
	 */
	$scope.update= function(){

		if($scope.$parent.user){

			 if(!$scope.$parent.user.first_name || !$scope.$parent.user.last_name) {

				$scope.err.message = "Champs Nom et Prénom obligatoires";
			}

			else {

				var encodedPicture;
				fileService.encodeFile()
				.then(function(fileB64){
					if(fileB64){
						encodedPicture = fileB64;
						return me.post_picture(encodedPicture);
					}
				})
				.then(function(avatar){
					$scope.$parent.user.avatar = avatar;
					//$scope.$parent.user.premium_cards = [];
					//appel de la fonction update de la factory "me"
					return me.update($scope.$parent.user);
				})
				.then(function(res) {

					init();

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
					$scope.err.message = err;
				});
			}
		}

		else {

			$scope.err.message = "Problème interne";
		}
	};

	$scope.addFile = function (){
		var file = fileService.getFile();
		$scope.imgUpload = file;
	};

  $scope.select_template = function(template) {
    $scope.$parent.user_card._sender.template =
    $scope.$parent.user.template = template;
  };

	var count_owned = function(cards) {
		var compteur = 0;
		for(i=0; i < cards.length; i++ ){
			if(cards[i].accepted){
				compteur++;
			}
		}
		$scope.$parent.countOwned = compteur;
	};

	var init = function () {

		if($scope.$parent.loggedIn){
			me.me()
      .then(function(user){
				if(user){
					$rootScope.user = $scope.$parent.user = user._data;
					$scope.$parent.user_card._sender = $scope.$parent.user;

					count_owned(user._data.cards);
				}
      })
			.catch(function(err){
				console.error('Dans login_ctrl/init erreur : ', err);
			});
		}
	};

	init();
});
