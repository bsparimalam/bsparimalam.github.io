
 // listen to the keyboard input and insert text
document.addEventListener('keydown', event => {
	key = event.key;
	ipfocused = inputbox == document.activeElement;
	opfocused = outputbox == document.activeElement;
	isinputfocused = ipfocused || opfocused;
	console.log("key pressed : " + key);
	isinprogress(key);
	if ( key == "Enter" ) { calculate();}
	if (!isinputfocused ) {
	if ((key == "Backspace") || (key == "Delete")) {
		inputbox.value = inputbox.value.slice(0, -1);
	} else if ( key == '*' ) { inputbox.value += '×'; 
	} else if ( key == '/' ) { inputbox.value += '÷'; 
	} else if ( key.length == 1 ) { inputbox.value += key;
	}} 
	autofontsize();
})
 // take touch/mouse input and insert text
function softtype(element) {
	let string = element.innerHTML;
	console.log("button pressed : " + string );
    isinprogress(string);
 	inputbox.value += string;
	defocus(element);
	autofontsize();
}
 // take touch/mouse input; translate and insert text
function transtype(element) {
	let string = element.innerHTML;
	console.log("button pressed : " + string );
	switch (string) {
		case "=": calculate(); break;
		case "⌫": inputbox.value = inputbox.value.slice(0, -1); break;
		case "CE": inputbox.value = null; outputbox.value = null; break;
		case "ANS": passoutput(); break;
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
	defocus(element);
	autofontsize();
}

function isinprogress(string) {
    if (!inprogress && ( string=='+' || string=='-' || string=='×' || 
    	string=='÷' || string=='xʸ' || string=='*' || string=='/' || 
    	string=='^')) {
    passoutput();
	}
}

function passoutput() {
	let outputstring = outputbox.value;
	console.log('value to copy: ' + outputstring);
	if (String(outputstring).length > 9 ) { 
        outputstring = (Number(outputstring)).toPrecision(9); }
    outputstring = Number(outputstring).toString();
	
	outputstring = outputstring.replace(/0e/g, '0E');
	outputstring = outputstring.replace(/1e/g, '1E');
	outputstring = outputstring.replace(/2e/g, '2E');
	outputstring = outputstring.replace(/3e/g, '3E');
	outputstring = outputstring.replace(/4e/g, '4E');
	outputstring = outputstring.replace(/5e/g, '5E');
	outputstring = outputstring.replace(/6e/g, '6E');
	outputstring = outputstring.replace(/7e/g, '7E');
	outputstring = outputstring.replace(/8e/g, '8E');
	outputstring = outputstring.replace(/9e/g, '9E');

	console.log('value to copy: ' + outputstring);

	inprogress = true; 
	console.log('calculation in progress: ' + inprogress );
	inputbox.value = outputstring;
	outputbox.value = null;
}