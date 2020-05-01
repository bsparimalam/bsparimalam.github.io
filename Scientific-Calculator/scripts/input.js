
 // listen to the keyboard input and insert text
document.addEventListener('keydown', event => {
	key = event.key;
	ipfocus = document.getElementById('ip') == document.activeElement;
	opfocus = document.getElementById('op') == document.activeElement;
	boxfocused = ipfocus || opfocus;
	console.log("key pressed : " + key);
	if ( key == "Enter" ) { calculate();
	} else if ((key == "Backspace") || (key == "Delete")) {
		let inputbox = document.getElementById('ip');
		inputbox.value = inputbox.value.slice(0, -1);
	} else if ( key == '*' ) { 
		document.getElementById('ip').value += '×'; 
	} else if ( key == '/' ) {
		document.getElementById('ip').value += '÷'; 
	} else if ( key.length == 1 && !boxfocused) {
		document.getElementById('ip').value += key;
	}
})
 // take touch/mouse input and insert text
function softtype(element) {
	let string = element.innerHTML;
	console.log("button pressed : " + string );
 	document.getElementById('ip').value += string;
	element.blur(); console.log(element.innerHTML + '-button defocused');
}
 // take touch/mouse input; translate and insert text
function transtype(element) {
	let string = element.innerHTML;
	let inputbox = document.getElementById('ip');
	let outputbox = document.getElementById('op');
	console.log("button pressed : " + string );
	switch (string) {
		case "=": calculate(); break;
		case "ᴅᴇʟ": inputbox.value = inputbox.value.slice(0, -1); break;
		case "AC": inputbox.value = null; outputbox.value = null; break;
		case "ᴀɴs": 
			inputbox.value = outputbox.value; outputbox.value = null; break;
		case "sin": inputbox.value += string + "("; break;
		case "cos": inputbox.value += string + "("; break;
		case "tan": inputbox.value += string + "("; break;
		case "ln": inputbox.value += string + "("; break;
		case "log": inputbox.value += string + "("; break;
		case "sin⁻¹": inputbox.value += string + "("; break;
		case "cos⁻¹": inputbox.value += string + "("; break;
		case "tan⁻¹": inputbox.value += string + "("; break;
		case "eˣ": inputbox.value += "e^("; break;
		case "10ˣ": inputbox.value += "10^("; break;
		case "xʸ": inputbox.value += "^("; break;
		case "√": inputbox.value += "√("; break;
	}
	element.blur(); console.log(element.innerHTML + '-button defocused');
}
// processed input
function readinput(multi=false) {
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
		console.log('interpreted expression: ' + inputlist);
		return inputlist;
	} else { 
		console.log('interpreted expression: ' + inputstring);
		return inputstring;
	}
}

// processed output
function printoutput(number, unit=null) {
	var outputbox = document.getElementById('op');
	if (unit == null) { outputbox.value = number;
	} else { outputbox.value = number + ' ' + unit; }
}
// simple expression evaluation
function calculate() { printoutput(eval(readinput())); }