evaluated = 0;
lasttype = null;
lastoperation = null;
// Booleans
function isoperator(string) {
	return ( string=='+' || string=='-' || string=='×' || string=='*'
		|| string == 'x' || string=='X' || string=='/' || string=='÷' 
	);
}
function isnumber(string, before, after) {
	return ( !isNaN(string) || string=='.' 
		|| ((string == '-' ) && (before == 'E'))
		|| ((string == '+' ) && (before == 'E')) 
		|| ((string == 'E' ) && (after == '-'))
		|| ((string == 'E' ) && (after == '+')));
}
function istoolong(string, length) {
	string = string.replace(/\./g, '');
	eindex = string.indexOf('E');
	if ( eindex != -1 ) { string = string.slice(0, eindex); }
	return string.length > length;
}
// Classes
class Inputbox {
	constructor(element) {
		this.e = element;
	}
	read() {
		return this.e.value;
	}
	length() {
		return this.read().length;
	}
	write(string) {
		this.e.value = string;
		this.e.scrollLeft = this.e.scrollWidth;
	}
	addastring(string) {
		this.e.value += string;
		this.e.scrollLeft = this.e.scrollWidth;
	}
	removeastring() {
		this.e.value = this.e.value.slice(0, -1);
		this.e.scrollLeft = this.e.scrollWidth;
	}
	removeall() {
		this.e.value = null;
	}
}
class Outputbox {
	constructor(element) {
		this.e = element;
	}
	read() {
		return this.e.innerHTML;
	}
	length() {
		return this.read().length;
	}
	removeall() {
		this.e.innerHTML = null;
	}
	write(string) {
		this.e.innerHTML = string;
	}
}
inprogress = true; 
inputbox = new Inputbox(document.getElementById('ip'));
outputbox = new Outputbox(document.getElementById('op'));
// touch input
function touchinput(key) {
	if ( key == "evaluate" ) {
		if ((more.innerHTML == '⠇' )||(convtypes.value == '-conversions-')) {
			calculate('simple');
		} else {
			calculate(convtypes.value, convfroms.value + ' ▸ ' + convtos.value);
		}
	} else if ( key == 'delete') {
		inputbox.removeastring();
		inprogress = true;
	} else if ( key == 'clearall') {
		inputbox.removeall();
		outputbox.removeall();
		inprogress = true;
	} else if ( key == 'passoutput') {
		inputbox.write(evaluated);
		outputbox.removeall();
		inprogress = true;
	} else {
		if ( !inprogress && isoperator(key) ) {
			inputbox.e.value = evaluated;
			outputbox.removeall();
		}
		inputbox.addastring(key);
		inprogress = true;
	}
	console.log('inprogress : ' + inprogress);
}
// keyboard input
document.addEventListener('keydown', event => {
	key = event.key;
	if ( key == "Enter" ) {
		if ((more.innerHTML == '⠇' )||(convtypes.value =='-conversions-')) {
			calculate('simple');
		} else {
			calculate(convtypes.value, convfroms.value + ' ▸ ' + convtos.value);
		}
	} else if ( inputbox.e != document.activeElement ) {
		if (!inprogress && isoperator(key)) {
			inputbox.e.value = evaluated;
			outputbox.removeall();
		}
		switch (key) {
			case 'Backspace': case 'Delete':
				inputbox.removeastring(); break;
			case '*': case 'x': case 'X':
				inputbox.addastring('×'); break;
			case '^':
				inputbox.addastring('^('); break;
			case '(': case '{': case '[': case '<': 
				inputbox.addastring('('); break;
			case ')': case '}': case ']': case '>':
				inputbox.addastring(')'); break;
			case '0': case '1': case '2': case '3': case '4': case '5': case '6': 
			case '7': case '8': case '9': case ',': case '.': case 'e': case 'E':
			case '+': case '-': case '/': case '%':
			case 'a': case 'c': case 'g': case 'i': case 'l': case 'n': case 'o': 
			case 's': case 't':
				inputbox.addastring(key); break;
			case 'A': case 'C': case 'G': case 'I': case 'L': case 'N': case 'O': 
			case 'S': case 'T':
				inputbox.addastring(key.toLowerCase()); break;
		}
		inprogress = true;
	} else { inprogress = true; 
	}
	console.log('inprogress : ' + inprogress);
});