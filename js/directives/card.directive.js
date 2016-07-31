/**
 * Cette directive permet de générer une carte à partir du template card.html
 * 
 */
app.directive('ivicard', function(){
	return {
		restrict: 'E',
		templateUrl: 'templates/card.html',
		scope: {
			card: '='
		}
	};
});