//création du contrôleur "login_ctrl"
app.controller("login_ctrl", function ($scope, $http, $rootScope, $location, $cookies, me, fileService) {

	console.log("LoginCtrl initialized");
	//déclaration des variables du $scope
	$scope.user = {};
	$scope.card = {};
	$scope.password_check = "";

	$scope.imgUpload = fileService.getFile();

	$scope.loggedIn = !!$rootScope.globals.currentUser;

	$scope.social_networks = ['Facebook', 'Twitter', 'LinkedIn', 'Snapchat',
	'GitHub', 'Viadeo', 'Skype', 'Tumblr', 'Youtube', 'Pinterest',
	'Instagram', 'Steam'];


	/**
	 * La méthode email_login permet à un utilisateur de
	 * se connecter via email.
	 */

	$scope.email_login = function () {


		if(!$scope.user.email || !$scope.user.password){
			$scope.err.message = "Champs email et password obligatoires";
		}
		else{
			//appel de la fonction login de la factory "me"
			me.login($scope.user.email, $scope.user.password)
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

		if(!$scope.user.email || !$scope.user.password) {
			$scope.err.message = "Champs email et password obligatoires";
		}

		else {

			//on vérifie la correspondance des mots de passe
			if($scope.user.password !== $scope.password_check) {
				$scope.err.message = "Les mots de passe ne sont pas identiques";
			}

			else {
				me.signin($scope.user.email, $scope.user.password)
	  		//1er callback, s'exécute lorsque la méthode me.login
	  		//a terminé son exécution
	  		.then(function(res) {
	  			//stocke l'objet renvoyé par la factory dans le scope
	  			$scope.user = res;
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

		if($scope.user){

			 if(!$scope.user.first_name || !$scope.user.last_name) {

				$scope.err.message = "Champs Nom et Prénom obligatoires";
			}

			else {

				//$scope.user.avatar = ROOT_URL + '/statics/' + fileService.getFile().name;
				var encodedPicture;
				fileService.encodeFile()
				.then(function(fileB64){
					if(fileB64){
						encodedPicture = fileB64;
						return me.post_picture(encodedPicture);
					}
				})
				.then(function(avatar){
					$scope.user.avatar = avatar;
					//appel de la fonction update de la factory "me"
					return me.update($scope.user);
				})
				.then(function(res) {

					//stocke l'objet tmp_user renvoyé par la factory dans le scope
					$scope.user = res;
					$scope.err.message = null;
					//$scope.success.message = null;

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

	var init = function () {
		me.me()
		.then (function(user){
			$scope.user = user;
			$scope.card._sender = $scope.user;
		});
	};

	init();
});
