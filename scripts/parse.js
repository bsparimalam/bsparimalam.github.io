
// processed input
function parse(multi=false) {
	var inputstring = inputbox.value;
	var inputlength = inputstring.length;
	console.log("raw input expression: " + inputstring);
	inputstring = inputstring.replace(/×/g, '*');
	inputstring = inputstring.replace(/÷/g, '/');
	inputstring = inputstring.replace(/\^/g, '**');

	inputstring = inputstring.replace(/e/g, 'Math.E');
	inputstring = inputstring.replace(/π/gi, 'Math.PI');

	inputstring = inputstring.replace(/0E/g, '0e');
	inputstring = inputstring.replace(/1E/g, '1e');
	inputstring = inputstring.replace(/2E/g, '2e');
	inputstring = inputstring.replace(/3E/g, '3e');
	inputstring = inputstring.replace(/4E/g, '4e');
	inputstring = inputstring.replace(/5E/g, '5e');
	inputstring = inputstring.replace(/6E/g, '6e');
	inputstring = inputstring.replace(/7E/g, '7e');
	inputstring = inputstring.replace(/8E/g, '8e');
	inputstring = inputstring.replace(/9E/g, '9e');


	inputstring = inputstring.replace(/log/gi, 'Math.log10');
	inputstring = inputstring.replace(/ln/gi, 'Math.log');

	inputstring = inputstring.replace(/sin\(/gi, 'Math.sin((Math.PI/180)*');
	inputstring = inputstring.replace(/cos\(/gi, 'Math.cos((Math.PI/180)*');
	inputstring = inputstring.replace(/tan\(/gi, 'Math.tan((Math.PI/180)*');
	inputstring = inputstring.replace(/sin⁻¹\(/gi, '(180/Math.PI)*Math.asin(');
	inputstring = inputstring.replace(/cos⁻¹\(/gi, '(180/Math.PI)*Math.acos(');
	inputstring = inputstring.replace(/tan⁻¹\(/gi, '(180/Math.PI)*Math.atan(');

	if (multi) { 
		let inputlist = inputstring.split(",");
		console.log('interpreted input expression: ' + inputlist);
		return inputlist;
	} else { 
		console.log('interpreted input expression: ' + inputstring);
		return inputstring;
	}
}