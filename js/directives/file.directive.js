app.directive('fileUpload', function (fileService) {

	return function (scope, element) {
		element.bind('change', function () {
			fileService.setFile(element[0].files[0]);
		});
	};
});
