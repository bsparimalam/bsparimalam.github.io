

 // listen to the keyboard input and insert text
document.addEventListener('keydown', event => {
	key = event.key;
	let inputbox = document.getElementById('ip');
	let outputbox = document.getElementById('op');
	autofontsize(inputbox, 16, 10, 11);
	ipfocused = inputbox == document.activeElement;
	opfocused = outputbox == document.activeElement;
	isinputfocused = ipfocused || opfocused;
	console.log("key pressed : " + key);
	if ( key == "Enter" ) { calculate();}
	if (!isinputfocused ) {
	if ((key == "Backspace") || (key == "Delete")) {
		inputbox.value = inputbox.value.slice(0, -1);
	} else if ( key == '*' ) { inputbox.value += '×'; 
	} else if ( key == '/' ) { inputbox.value += '÷'; 
	} else if ( key.length == 1 ) { inputbox.value += key;
	}}	autofontsize(inputbox, 16, 10, 11);
})
 // take touch/mouse input and insert text
function softtype(element) {
	let string = element.innerHTML;
	let inputbox = document.getElementById('ip');
	console.log("button pressed : " + string );
 	inputbox.value += string;
	defocus(element); autofontsize(inputbox, 16, 10, 11);
}
 // take touch/mouse input; translate and insert text
function transtype(element) {
	let string = element.innerHTML;
	let inputbox = document.getElementById('ip');
	let outputbox = document.getElementById('op');
	console.log("button pressed : " + string );
	switch (string) {
		case "=": calculate(); break;
		case "⌫": inputbox.value = inputbox.value.slice(0, -1); break;
		case "CE": inputbox.value = null; outputbox.value = null; break;
		case "ANS": 
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
	} defocus(element); autofontsize(inputbox, 16, 10, 11);

}

function defocus(element) {
	element.blur(); 
	console.log(element.innerHTML + '-button defocused');
}
