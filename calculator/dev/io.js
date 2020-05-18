lasteval = null;
lasttype = null;
lastoperation = null;
// Booleans
function isoperator(string) {
	return ( string=='+' || string=='-' || string=='×' || string=='*'
		|| string == 'x' || string=='X' || string=='/' || string=='÷' 
	);
}
function isnumber(string, before, after) {
	return ( !isNaN(string) || (string=='.')
		|| ((string == '-' ) && (before == 'E'))
		|| ((string == '+' ) && (before == 'E')) 
		|| ((string == 'E' ) && (after == '-'))
		|| ((string == 'E' ) && (after == '+'))
		|| ((string == 'E') && !isNaN(after))
		|| ((string == 'e' ) && (after == '-'))
		|| ((string == 'e' ) && (after == '+'))
		|| ((string == 'e') && !isNaN(after)));
}
function istoolong(string, length) {
	string = string.replace(/\./g, '');
	eindex = string.indexOf('E');
	if ( eindex != -1 ) { string = string.slice(0, eindex); }
	return string.length > length;
}
function insertcomma(string) {
	console.log('insert comma input: ' + string);
	string = string.toString();
	if (string.indexOf(',') != 0) {
		var len = string.length;
		var start = len-1;
		while ((!isNaN(string[start]) || (string[start] == ',')
			||( string[start] == '.')) 
			&& (start!=-1)) { 
			start -= 1;
		}
	} else {
		var start = 0;
	}
	var stringprefix = string.slice(0, start+1);
	string = string.slice(start+1).replace(/,/g, '');
	if( (string.indexOf('E+') == -1) && (string.indexOf('E-') == -1) ) {
		var end = string.length; 
		if(string.indexOf('.') != -1) { 
			end = string.indexOf('.'); 
		}
		var withcomma= string.slice(end, );
		for (var i=1; i <= end; i++ ) {
			if( (i%3 == 1) && (i != 1) ) { 
				withcomma = ',' + withcomma; 
			}
			withcomma = string[end-i].toString() + withcomma.toString();
		}
		string = withcomma;
	}
	return stringprefix + string;
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
	setfontsize(){
		if (this.e.value.length > 9) {
			this.e.style.fontSize = 'var(--ip-min)';
		} else {
			this.e.style.fontSize = 'var(--ip-max)';
		}
	}
	write(string) {
		this.e.value = string;
		this.e.scrollLeft = this.e.scrollWidth;
		this.setfontsize();
	}
	addastring(string) {
		this.e.value += string;
		this.write(insertcomma(this.read()));
	}
	removeastring() {
		this.e.value = this.e.value.slice(0, -1);
		this.write(insertcomma(this.read()));
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
		this.e.style.color = 'var(--fg-color-3)';
	}
	preview(string) {
		this.e.innerHTML = string;
		this.e.style.color = 'var(--fg-color-3-1)';
	}
	error(string) {
		this.e.innerHTML = string;
		this.e.style.color = 'var(--fg-color-3-2)';
	}
}
inprogress = true; 
inputbox = new Inputbox(document.getElementById('ip'));
outputbox = new Outputbox(document.getElementById('op'));
function outputpreview() {
	var string = parse(inputbox.read());
	try {
		var temp = eval(string);
	} catch { 
		var temp = 'error';
	}
	if (!isNaN(temp)) { 
		temp = filteroutput(temp); 
		outputbox.preview(temp); 
	} else if (string == '') {
		outputbox.preview(0);
	}
}
// touch input
function touchinput(key) {
	if ( key == "evaluate" ) {
		calculate('simple', null);
	} else if ( key == 'delete') {
		inputbox.removeastring();
		inprogress = true;
		outputpreview();
	} else if ( key == 'clearall') {
		inputbox.removeall();
		outputbox.removeall();
		inprogress = true;
	} else if ( key == 'passoutput') {
		inputbox.write(lasteval);
		outputbox.removeall();
		inprogress = true;
		outputpreview();
	} else {
		if ( !inprogress && isoperator(key) ) {
			inputbox.e.value = lasteval;
			outputbox.removeall();
		}
		inputbox.addastring(key);
		inprogress = true;
		outputpreview();
	}
	console.log('inprogress : ' + inprogress);
}
// keyboard input
document.addEventListener('keydown', event => {
	key = event.key;
	if ( key == "Enter" ) {
		calculate('simple', null);
	} else if ( inputbox.e != document.activeElement ) {
		if (!inprogress && isoperator(key)) {
			inputbox.e.value = lasteval;
			outputbox.removeall();
		}
		switch (key) {
			case 'Backspace': case 'Delete':
				inputbox.removeastring(); 
				outputpreview();
				break;
			case '*': case 'x': case 'X':
				inputbox.addastring('×'); break;
			case '^':
				inputbox.addastring('^('); break;
			case '(': case '{': case '[': case '<': 
				inputbox.addastring('('); break;
			case ')': case '}': case ']': case '>':
				inputbox.addastring(')'); outputpreview(); break;
			case '0': case '1': case '2': case '3': case '4': case '5': case '6': 
			case '7': case '8': case '9': case ',': case '.': case 'e': case 'E':
			case '+': case '-': case '/': case '%':
			case 'a': case 'c': case 'g': case 'i': case 'l': case 'n': case 'o': 
			case 's': case 't':
				inputbox.addastring(key); outputpreview(); break;
			case 'A': case 'C': case 'G': case 'I': case 'L': case 'N': case 'O': 
			case 'S': case 'T':
				inputbox.addastring(key.toLowerCase()); break;
		}
		inprogress = true;
	} else { inprogress = true; 
	}
	console.log('inprogress : ' + inprogress);
});