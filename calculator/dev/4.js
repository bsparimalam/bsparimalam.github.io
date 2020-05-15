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
		console.log('function, ' + inputbox.read());
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