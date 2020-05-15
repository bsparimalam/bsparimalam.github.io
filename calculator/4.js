function getcops(string) {
	var complexops = [
		 'sin','cos','tan','√','^','ln','log'];
	var count = 0;
	for (var i = 0; i < complexops.length; i++) {
		count += string.split(complexops[i]).length - 1;
	}
	return count;
}
function buildfunc(string) {
	expression = '';
	return expression;
}

function log (type, operation) {
	if (type != 'simple') {
		var opindex = 0;
		console.log(prefs[opindex]);
		while ((opindex < prefs.length) &&
			(operation != prefs[opindex]['operation']) ) {
			opindex++;
		}
		if (opindex != prefs.length) {
			prefs[opindex].usecount += 1;
		} else {
			prefs.push({
				'operation' : operation,
				'usecount'	: 1,
				'type': type
			});
		}
	} else {
		var inputstring = inputbox.read();
		var numofcops = getcops(inputstring);
		if (numofcops > 1) {
			expression = buildfunc(inputstring);
			console.log('expression' + expression);
		}
		
		console.log('number of copmlex operations: ' + numofcops);
		console.log('function, ' + inputstring);
		//detect conversions
		//detect complex functions
	}
	prefs.sort(function(a, b){
    	return b.usecount - a.usecount;
	});
	console.log(prefs);
	console.log(JSON.stringify(prefs));
	window.localStorage.setItem("prefs", JSON.stringify(prefs));
	loadprefs();
}
navigator.serviceWorker.register('./install.js')