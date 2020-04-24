
function r2e() {

	var inputbox = document.getElementById("x");
	var outputbox = document.getElementById("y");
	var outputstring = outputbox.value;
	var outputlength = outputstring.length;
	var outputs = []; var poutputstring = "";

	for ( var i = 0; i < outputlength; i++ ) {
		var letter = outputstring[i];
		if ( letter != " ") { 
			poutputstring = poutputstring + outputstring[i] } }

	var outputstring = poutputstring;
	var outputlength = outputstring.length;

	// extract numbers
	if (outputstring == "") { inputbox.value = "nothing to copy"; return;
	} else { var last = 0;
	for ( var i = 0; i < outputlength; i++ ) {
		var letter = outputstring[i];
		if (isNaN(letter) && letter != ".") {
			if (i != last) {outputs.push(Number(outputstring.slice(last, i)));}
			last = i + 1; }
		if ( (i == outputlength-1) && (!isNaN(outputstring[i]))) {
			outputs.push(Number(outputstring.slice(last, i+1)));}
	} inputbox.value = outputs; } }

// Calculator functions
function calculate(operation) {

	var inputbox = document.getElementById("x");
	var outputbox = document.getElementById("y");
	var inputstring = inputbox.value;
	var inputlength = inputstring.length;
	var inputs = []; var pinputstring = "";

	// extract numbers
	if (inputstring == "") { outputbox.value = "no input"; return;
	} else { var last = 0;

	for ( var i = 0; i < inputlength; i++ ) {
		var letter = inputstring[i];
		if ( letter != " ") { 
			pinputstring = pinputstring + inputstring[i] } }

	var inputstring = pinputstring;
	var inputlength = inputstring.length;

	for ( var i = 0; i < inputlength; i++ ) {
		var letter = inputstring[i];
		if (isNaN(letter) && letter != ".") {
			if (i != last) { inputs.push(Number(inputstring.slice(last, i)));}
			last = i + 1; }
		if ( (i == inputlength-1) && (!isNaN(inputstring[i]))) {
			inputs.push(Number(inputstring.slice(last, i+1)));}
	} inputbox.value = inputs; }


	switch (operation) { 

		case "sum":

			var y = 0;
			inputs.forEach(function(input) { 
				y = y + input;
			}); outputbox.value = y; break;

		case "subtract":

			inputbox.value = inputs.slice(0, 2);
			outputbox.value = inputs[0] - inputs[1];
			break;

		case "multiply":

			var y = 1;
			inputs.forEach(function(input) {
				y = y*input;
			}); outputbox.value = y;
			break;

		case "divide":

			inputbox.value = inputs.slice(0, 2);
			outputbox.value = inputs[0] / inputs[1];
			break;

		case "in2mm":

			inputbox.value = inputs.slice(0, 1);
			result = 25.4*inputs[0];
			outputbox.value = result + " mm";
			break;

		case "ft2m":

			inputbox.value = inputs.slice(0, 1);
			result = 0.3048*inputs[0];
			outputbox.value = result + " m";
			break;

		case "lb2kg":

			inputbox.value = inputs.slice(0, 1);
			result = 0.453592*inputs[0];
			outputbox.value = result + " kg";
			break;

		case "f2c":

			inputbox.value = inputs.slice(0, 1);
			result = ((inputs[0])-32)*(5/9);
			outputbox.value = result + " °C";
			break;

		case "mm2in":

			inputbox.value = inputs.slice(0, 1);
			result = (inputs[0])*0.03937;
			outputbox.value = result + " inch";
			break;

		case "m2ft":

			inputbox.value = inputs.slice(0, 1);
			result = (inputs[0])*3.2808;
			outputbox.value = result + " ft";
			break;

		case "kg2lb":

			inputbox.value = inputs.slice(0, 1);
			result = (inputs[0])*2.2090;
			outputbox.value = result + " lb";
			break;

		case "c2f":

			inputbox.value = inputs.slice(0, 1);
			result = ((inputs[0])*9/5 + 32);
			outputbox.value = result + " °F";
			break;

		case "invert":

			inputbox.value = inputs.slice(0, 1);
			result = 1/(inputs[0]);
			outputbox.value = result; break;

		case "factorial":

			inputbox.value = inputs.slice(0, 1);
			var z = 1;
			var i;
			for ( i = 1; i <= (inputs[0]); i++ ){
				z = z*i;
			} outputbox.value = z; break;

		case "exponent":

			inputbox.value = inputs.slice(0, 2);
			result = inputs[0]**inputs[1];
			outputbox.value = result;
			break;

		case "root":

			inputbox.value = inputs.slice(0, 2);
			result = inputs[0]**(1/inputs[1]);
			outputbox.value = result; break;

		case "log":

			inputbox.value = inputs.slice(0, 1);
			result = Math.log10(inputs[0]);
			outputbox.value = result; break;

		case "loginv":

			inputbox.value = inputs.slice(0, 1);
			result = 10**inputs[0];
			outputbox.value = result; break;

		case "nlog":

			inputbox.value = inputs.slice(0, 1);
			result = Math.log(inputs[0]);
			outputbox.value = result; break;

		case "nloginv":

			inputbox.value = inputs.slice(0, 1);
			result = Math.E**inputs[0];
			outputbox.value = result; break;

		case "sine":

			inputbox.value = inputs.slice(0, 1);
			result = Math.sin((inputs[0])*Math.PI/180);
			outputbox.value = result; break;

		case "cosine":

			inputbox.value = inputs.slice(0, 1);
			result = Math.cos((inputs[0])*Math.PI/180);
			outputbox.value = result; break;

		case "tangent":

			inputbox.value = inputs.slice(0, 1);
			result = Math.tan((inputs[0])*Math.PI/180);
			outputbox.value = result; break;

		case "function1":

			inputbox.value = inputs.slice(0, 2);
			result = inputs[0]/Math.sin(inputs[1]*Math.PI/180);
			outputbox.value = result;
			break;

		case "function2":

			inputbox.value = inputs.slice(0, 2);
			result = inputs[0]/Math.cos(inputs[1]*Math.PI/180);
			outputbox.value = result;
			break;

		case "function3":

			inputbox.value = inputs.slice(0, 2);
			result = inputs[0]/Math.tan(inputs[1]*Math.PI/180);
			outputbox.value = result;
			break;

		case "currency1":
			let url1 = "https://api.exchangeratesapi.io/latest?base=USD&symbols=CAD,INR";
			inputbox.value = inputs.slice(0, 1);
			outputbox.value = "loading...";
			(async () => {
				let response = await fetch(url1);
				if (response.ok) {
					let data = await response.json();
					candol = (inputs[0]*data.rates.CAD).toFixed(2);
					indrup = (inputs[0]*data.rates.INR).toFixed(2);
					result = candol + " CAD, " + indrup + " INR";
				} else { result = "xchange rate fetch failed" }
			outputbox.value = result; })(); break;

		case "currency2":
			let url2 = "https://api.exchangeratesapi.io/latest?base=CAD&symbols=USD,INR";
			inputbox.value = inputs.slice(0, 1);
			outputbox.value = "loading...";
			(async () => {
				let response = await fetch(url2);
				if (response.ok) {
					let data = await response.json();
					amdol = (inputs[0]*data.rates.USD).toFixed(2);
					indrup = (inputs[0]*data.rates.INR).toFixed(2);
					result = amdol + " USD, " + indrup + " INR";
				} else { result = "xchange rate fetch failed" } 
			outputbox.value = result; })(); break;

		case "currency3":
			let url3 = "https://api.exchangeratesapi.io/latest?base=INR&symbols=USD,CAD";
			inputbox.value = inputs.slice(0, 1);
			outputbox.value = "loading...";
			(async () => {
				let response = await fetch(url3);
				if (response.ok) {
					let data = await response.json();
					amdol = (inputs[0]*data.rates.USD).toFixed(2);
					candol = (inputs[0]*data.rates.CAD).toFixed(2);
					result = amdol + " USD, " + candol + " CAD";
				} else { result = "xchange rate fetch failed" }
			outputbox.value = result; })(); break;

	}
}

function allclear() { 
	document.getElementById('x').value = null;
	document.getElementById('y').value = null;
}

//time generator
function gettime12hr(dateandtime, hr, mn) {
	var raw = dateandtime
	var tindex = raw.indexOf("T")
	var hour = Number(raw.slice(tindex+1, tindex+3))
	var min = Number(raw.slice(tindex+4, tindex+6))
	console.log(dateandtime, raw, hour, min, hr, mn)
	hour = hour + hr; min = min + mn;

	if ( min > 59 ) { min = min -60; hour = hour + 1;
	} else if (min < 0 ) { min = min + 60; hour = hour - 1;
	} else { min = min; }

	if (hour < 0 ) { hour = hour + 12; period = "PM";
	} else if (hour > 11 ) { hour = hour - 12; period = "PM";
	} else { period = "AM";
	}
	if (hour == 0 ) { hour = 12; }
	if (String(min).length < 2 ) { min = "0" + min; }
	return hour + ":" + min + period;
}

function times() {

	document.getElementById('y').value = "loading...";

	(async () => {
		let url4 = "https://worldtimeapi.org/api/timezone/America/New_York";
		let estraw = await fetch(url4);
		if (estraw.ok) {
			let estdt = await estraw.json();
			let est = await gettime12hr(estdt.datetime, 0, 0);
			estoutput = est + "-EST";
		} else { estoutput = "EST fetch failed" }

		let url5 = "https://worldtimeapi.org/api/timezone/Asia/Kolkata";
		let istraw = await fetch(url5);
		if (istraw.ok) {
			let istdt = await istraw.json();
			let ist = await gettime12hr(istdt.datetime, 0, 0);
			istoutput = ist + "-IST";
		} else { istoutput = "IST fetch failed"}

	document.getElementById('y').value = estoutput + "; " + istoutput;

	})();

}