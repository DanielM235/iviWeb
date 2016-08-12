//déclaration du module principal l'application
//le premier paramètre définit le nom du module, le second
//les dépendances utilisées
var app = angular.module("ivipulse", [
  // Dépendances du module
  'ngRoute',
  'ngCookies',
  'mgcrea.ngStrap',
  'mgcrea.ngStrap.modal',
  'ngAnimate',
  'base64'
]);

var ROOT_URL = 'http://192.168.1.16:8180';


app.config(['$routeProvider', function($routeProvider) {

	//système de routage
	$routeProvider
	.when('/', {
		templateUrl: 'partials/home.html',
		controller: 'login_ctrl'
	})
	.when('/login', {
		templateUrl: 'partials/login.html',
		controller: 'login_ctrl'
	})
	.when('/shop', {
		templateUrl: 'partials/shop.html',
		controller: 'shop_ctrl'
	})
	.when('/home', {
		templateUrl: 'partials/home.html',
		controller: 'login_ctrl'
	})
	.when('/store',{
		templateUrl:'partials/store',
		controller: 'store_ctrl'
	})
	.when('/profil', {
		templateUrl: 'partials/profil.html',
		controller: 'login_ctrl'
	})
	.otherwise({
		redirectTo: '/'
	});
}]);

/**
 * Ce run permet de récupérer les données du user depuis le cookie vers le rootScope.
 * Si le cookie est vide, redirige vers login.
 *
 * @param  {[type]} $rootScope [description]
 * @param  {[type]} $location  [description]
 * @param  {[type]} $cookies   [description]
 * @param  {[type]} $http)
 * @return {[type]}            [description]
 */
app.run(['$rootScope', '$location', '$cookies', '$http', 'me',
    function ($rootScope, $location, $cookies, $http, me) {

        console.log("Lancement de app.run()");



        //récupère le cookie 'globals' et le stocke
        //dans la variable globals du $rootScope
        $rootScope.globals = $cookies.getObject('globals') || {};


        //si l'objet currentUser existe, on récupère son token et on l'insère
        //dans le header des requêtes http
        if ($rootScope.globals.currentUser) {
            $http.defaults.headers.token = $rootScope.globals.currentUser.token;
            // me.me()
            // .then(function(user){
            //   $rootScope.user = user._data;
            //   console.log("rootScope.user dans app.js ", $rootScope.user);
            // });
            
        }
  		//écoute des changements de route sur l'événement $locationChangeStart
  		//du service $location d'angular
        $rootScope.$on('$locationChangeStart', function () {
            //si l'utilisateur n'est pas identifié sur le site et que l'adresse
            //de destination n'est pas login, on le renvoie vers la page login
            if (!$rootScope.globals.currentUser && $location.path() !== '/login') {
                $location.path('/login');
            }
            //idem pour le cas où l'utilisateur n'a pas finalisé son incription
            //on le redirige vers profil
            else if($rootScope.globals.currentUser &&
            		$rootScope.globals.currentUser.new_user &&
            		$location.path() !== '/profil' &&
            		$location.path() !== '/shop') {
            	$location.path('/profil');
            }
        });
    }]);
