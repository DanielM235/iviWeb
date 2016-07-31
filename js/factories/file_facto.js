app.factory('fileService', function(){
	var file;

	fileService = {
		getFile: function () {
			return file;
		},

		setFile: function (newFile) {
			file = newFile;
		}
	};

	return fileService;

});