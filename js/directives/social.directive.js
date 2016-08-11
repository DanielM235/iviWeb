app.directive('social', function(){
	return {
		restrict: 'E',
		templateUrl: 'templates/social.html',
		scope: {
			name: '='
		}
	};
});
