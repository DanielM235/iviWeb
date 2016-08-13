app.factory('me', function($q, $http, $rootScope, $cookies){

  //initialisation de la variable user
  var user = {};
  var message = {
    error : {
      token_not_found: "Utilisateur non identifié, veuillez vous reconnecter",
      server: "Problème interne, essayez plus tard"
    }
  };
  $rootScope.globals = $cookies.getObject('globals') || {};

  /**
     * Cette fonction permet de maintenir l'utilisateur authentifié sur le site.
     * @param  Objet data Objet contenant les informations de login du user
     * @return booléen : retourne vrai si la sauvegarde s'est bien effectuée
     */
  var saveToken = function (data) {

    if(data.token && data.me){
      //sauvegarde des données principales de l'utilisateur
              $rootScope.globals = {
                currentUser: {
                  first_name: data.me.first_name,
                  last_name: data.me.last_name,
                  email: data.me.email,
                  token: data.token,
                  new_user: me._new_user
                }
              };
              //conservation des données dans le cookie 'global'
              $cookies.putObject('globals', $rootScope.globals);

              return true;
    }
    else
    {
      return false;
    }
  };

  //déclaration et initialisation de la factory me
  me = {

    is_authenticated: false,
    _data: {},

    _token: null,

    scope: [],

    _new_user: false,
    _card_changed: false,

    state: {

      have_pulsed: false,
      unread: {
        cards: 0,
        notifs: 0,
        chats: 0,
        chats_ids: []
      },

      last_status_update: null
    },


    init: function (data) {
      console.log("dans me.init ");
      this._data = data;
      this.is_authenticated = true;

      //getters
      _.each(this._getters, function (v,k) {
        if (!this[k]) {
          this._defineGetter__(k,v);
        }
      });

      //getters from _data

      _.each(data, function(v,k) {
        if(!this[k]){
          this.__defineGetter__(k, function(_this) {
            return function() {
              return _this._data !== null ? ref[k] : void 0;
            };
          });
          this.__defineSetter__(k, function(_this) {
            return function(val) {
              return _this._data !== null ? ref[k] = val : void 0;
            };
          });
        }
      });

      this.state.last_status_update = Date.now();
      //this.refresh_pending_cards();
      this.scope = this._data.sharing;

      return this;
    },


    me: function () {
      return $q(function(resolve, reject) {
      if($rootScope.globals.currentUser && $rootScope.globals.currentUser.token){

        var req = {
          method: 'GET',
          url: ROOT_URL + "/users/me",
          headers: {
              token: $rootScope.globals.currentUser.token
          }
        };

        $http(req)
        .success(function(user) {
          resolve(me.init(user));
        })
        .error(function() {
          reject(message.error.server);
        });

      }
      else {
        reject(message.error.token_not_found);
      }
    });
    },

    /**
     * Cette fonction permet d'authentifier un utilisateur
     * @param  {[String]} email    : email de l'utilisateur
     * @param  {[String]} password : password de l'utilisateur
     * @return {[Promise]} retourne la promesse contenant l'objet user
     */
    login: function (email, password) {
      //déclaration de l'objet data, pour l'appel du service de login
      var data = {
        email: email,
        password: password
      };
      //initialisation de la variable contenant la requête
      var req = {
        method: 'POST',
        url: ROOT_URL + "/users/login",
        data: data
      };


      //initialisation de la promesse de retour
      return $q(function(resolve, reject) {
        //appel au serveur pour la requête de login
        //en transmettant en second paramètre l'objet data
        //contenant l'email et le password

        $http(req)
        //en cas de succès
        .success(function(res) {

          if(saveToken(res)){
            console.log("me/login/res.me : ", res.me);
            $rootScope.user = res.me;
            var init_user = me.init(res.me);
            console.log("me/login/init res.me : ", init_user);
            resolve(res.me);
          }
          //si problème serveur
          else {
            reject("Problème interne, essayez plus tard");
          }
        })
        //si la requête produit une erreur
        .error(function () {
          reject("Email ou mot de passe incorrect");
        });
      });
    },

    /**
     * Cette fonction permet d'inscrire un utilisateur
     * @param  {[String]} email    : email de l'utilisateur
     * @param  {[String]} password : password de l'utilisateur
     * @return {[Promise]} retourne la promesse contenant l'objet user
     */
    signin: function (email, password) {
      console.log("Dans me.signin : password = ", password);
      //déclaration de l'objet data, pour l'appel du service d'inscription
      var data = {
        email: email,
        password: password
      };

      //initialisation de la promesse de retour
      return $q(function(resolve, reject){
        //appel au serveur pour la requête d'inscription
        //en transmettant en second paramètre l'objet data
        //contenant l'email et le password
        $http.post(ROOT_URL + "/users/signin", data, {

        })
        //en cas de succès
        .success(function(res) {
          $rootScope.user = res.me;
          this.me._new_user = true;

          if(saveToken(res)){

            defMe = this.me.init(res.me);

            resolve(defMe);
          }
          //si problème serveur
          else {
            reject(message.error.server);
          }

        })
        //si la requête produit une erreur
        .error(function (e, code) {
          //si erreur de code 400
          if(code == 400){
            //on finalise la promesse en acheminant le message d'erreur
            reject("Email déjà utilisé");
          }
          else {
            reject ("Problème interne, réessayez plus tard");
          }

        });
      });

    },

    /**
     * Cette fonction permet de mettre un jour les attributs d'un utilisateur.
     * Elle met à jour le cookie utilisé sur le site.
     * @param  {[user]} tmp_user [Utilisateur modifié]
     * @return {[type]}          [description]
     */
    update: function(tmp_user) {
      console.log("dans me/update new user : ", tmp_user);
    var req = {
        method: 'PUT',
        url: ROOT_URL + "/users/" + tmp_user._id,
        data: tmp_user,
        headers: {
            token: $rootScope.globals.currentUser.token
                 }
      };
   //initialisation de la promesse de retour
      return $q(function(resolve, reject){
       $http(req)
        .success(function(new_user) {
          $rootScope.user = new_user;
          //mise à jour des identifiants globaux
          $rootScope.globals.currentUser.first_name = new_user.first_name;
          $rootScope.globals.currentUser.last_name =  new_user.last_name;
          $rootScope.globals.currentUser.email =  new_user.email;
          $cookies.putObject('globals', $rootScope.globals);

          if (new_user.birth_date) {
            new_user.birth_date = new Date(new_user.birth_date);
          }
          if(new_user.first_name && new_user.first_name !== "" && new_user.last_name && new_user.last_name !== ""){
            this.me._new_user = false; //a revoir
            return resolve(new_user);
          }
          else//non
            reject("Champs nom ou prénom manquants");//non
        }).error(reject);
      });
    },

    /**
     * Cette promesse permet de récuperer le nombre de cartes partagées et réciproques
     * d'un utilisateur.
     */
    get_cardsCount : $q(function(resolve,reject){

      console.log("dans me_factory, rootScope.globals : ", $rootScope.globals);

      if ($rootScope.globals && $rootScope.globals.currentUser) {
        var req = {
          method : 'GET',
          url: ROOT_URL + "/users/me/counters",
          headers: {
            token: $rootScope.globals.currentUser.token
          }
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
        reject("User introuvable");
      }
    }),

    /**
     * Cette fonction permet d'effectuer l'achat des cartes passées en
     * paramètre. Elle met a jour la collection de fonds de cartes de l'utilisateur.
     *
     */
    purchase_card_buy : function(listFonds){

      if ($rootScope.globals && $rootScope.globals.currentUser) {
        var data = {cards: listFonds};
        var req = {
          method : 'PUT',
          url: ROOT_URL + "/users/me/premium_template/",
              headers: {
                token: $rootScope.globals.currentUser.token
              },
              data: data
          };
         return $q(function(resolve,reject){
        $http(req)
        .success(function(res){
          me._data.premium_cards = res.premium_cards;
          resolve(res);
        })
        .error(function(err) {
          reject(err);
          });
        });
        }
      else {
        reject("User introuvable");
      }

    },

    /**
     * Cette fonction permet d'effectuer l'achat de crédits.
     * @param  {[int]} value quantité de crédits achetés
     * @return {[int]}  Retourne la quantité de crédits possédés par
     * l'utilisateur.
     */
    purchase_many_credits : function(value){
      if ($rootScope.globals && $rootScope.globals.currentUser){
        var data = {};
        var req = {
          method : 'PUT',
          url: ROOT_URL + "/users/me/purchase_many/" + value,
              headers: {
                token: $rootScope.globals.currentUser.token
              },
              data:data
          };
        return $q(function(resolve,reject){
          $http(req)
          .success(function(res){
            resolve(res.credits);
          })
          .error(function(err){
            reject(err);
          });
        });
      }
      else {
        reject("User introuvable");
      }
    },
    /**
     * Cette fonction permet de créer ou modifier un dossier de cartes
     * @param  {[String]} folder Ce paramètre contient le nom du dossier
     * @param  {[tableau]} cards  Ce paramètre contient la liste des cartes
     * @return {[promise]}        La fonction retourne une promesse contenant un booléen
     * vrai si la requête a été effectuée avec succès.
     */
    copy_to_folder: function(folder, cards){

      if ($rootScope.globals && $rootScope.globals.currentUser) {
        var data = {
          folder: folder,
          cards: cards
        };
        var req = {
          method : 'PUT',
          url: ROOT_URL + "/users/me/copy_to_folder",
              headers: {
                token: $rootScope.globals.currentUser.token
              },
              data: data
          };

        return $q(function(resolve,reject){
        $http(req)
        .success(function(res){
          resolve(res);
        })
        .error(function(err) {
          reject(err);
          });
        });
        }
      else {
        reject("User introuvable");
      }
    },

    post_picture: function(file64) {

      data = {
        b64: file64
      };
      var req = {
          method : 'POST',
          url: ROOT_URL + "/users/me/pictureb64",
              headers: {
                token: $rootScope.globals.currentUser.token
              },
              data: data
          };
      return $q(function(resolve, reject){
        $http(req)
        .success(function(avatar){
          resolve(avatar.avatar);
        })
        .error(function(err) {
          reject(err);
        });
      });
    }

  };

  //renvoi de la factory
  return me;
});
