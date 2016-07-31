app.factory('shop_facto', function($http,$q)
{

	return{
		listFonds: $q(function(resolve, reject){
			var req = {
		        method: 'GET',
		        url: ROOT_URL + "/templates/",
		     };

			$http (req)
			.success (function(res){
				if(res){
					resolve(res);
				}
				else{
					reject("Problème interne, essayez plus tard");
				}				
			})
			.error(function () { 
      				reject("incorrect"); 
    		}); 
		})
		
	};
});