
// processed input
function parse(multi=false) {
	var inputbox = document.getElementById('ip');
	var inputstring = inputbox.value;
	var inputlength = inputstring.length;

	inputstring = inputstring.replace(/×/gi, '*');
	inputstring = inputstring.replace(/÷/gi, '/');
	inputstring = inputstring.replace(/\^/gi, '**');

	inputstring = inputstring.replace(/e/gi, 'Math.E');
	inputstring = inputstring.replace(/π/gi, 'Math.PI');

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
		console.log('converted expression: ' + inputlist);
		return inputlist;
	} else { 
		console.log('converted expression: ' + inputstring);
		return inputstring;
	}
}