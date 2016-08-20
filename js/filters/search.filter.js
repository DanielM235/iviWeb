/**
 * Ce filtre permet de rechercher des contacts à partir de leur nom ou prénom
 */
app.filter('searchContactsFilter', function() {
	return function(cards, critere) {
		var critereLowerCase = critere.toLowerCase();
		var filtered = [];
		//console.log("Dans search_filter - cards : ", cards);
		for(var i = 0; i < cards.length; i++){
			var firstname = cards[i]._sender.first_name.toLowerCase();
			var lastname = cards[i]._sender.last_name.toLowerCase();

			if (firstname.includes(critereLowerCase) ||
					lastname.includes(critereLowerCase))
			{
				filtered.push(cards[i]);
			}
		}
		return filtered;
	};
});
