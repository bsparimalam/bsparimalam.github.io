
// processed input
function parse(multi=false) {
	var inputstring = inputbox.value;
	var inputlength = inputstring.length;
	console.log("raw input expression: " + inputstring);

	inputstring = inputstring.replace(/×/g, '*').replace(/÷/g, '/').replace(
		/\^/g, '**').replace(/e/g, 'Math.E').replace(/π/gi, 'Math.PI').replace(
		/0E/g, '0e').replace(/1E/g, '1e').replace(/2E/g, '2e').replace(
		/3E/g, '3e').replace(/4E/g, '4e').replace(/5E/g, '5e').replace(
		/6E/g, '6e').replace(/7E/g, '7e').replace(/8E/g, '8e').replace(
		/9E/g, '9e').replace(/log/gi, 'Math.log10').replace(
		/ln/gi, 'Math.log').replace(
		/sin\(/gi, 'Math.sin((Math.PI/180)*').replace(
		/cos\(/gi, 'Math.cos((Math.PI/180)*').replace(
		/tan\(/gi, 'Math.tan((Math.PI/180)*').replace(
		/sin⁻¹\(/gi, '(180/Math.PI)*Math.asin(').replace(
		/cos⁻¹\(/gi, '(180/Math.PI)*Math.acos(').replace(
		/tan⁻¹\(/gi, '(180/Math.PI)*Math.atan(');

	if (multi) { 
		let inputlist = inputstring.split(",");
		console.log('interpreted input expression: ' + inputlist);
		return inputlist;
	} else { 
		console.log('interpreted input expression: ' + inputstring);
		return inputstring;
	}
}