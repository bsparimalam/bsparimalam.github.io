lasteval = 0;
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
	var start; var len; var stringprefix; var end; var withcomma;
	if (string.indexOf(',') != 0) {
		len = string.length;
		start = len-1;
		while ((!isNaN(string[start]) || (string[start] == ',')
			||( string[start] == '.')) 
			&& (start!=-1)) { 
			start -= 1;
		}
	} else {
		start = 0;
	}
	stringprefix = string.slice(0, start+1);
	string = string.slice(start+1).replace(/,/g, '');
	if( (string.indexOf('E+') == -1) && (string.indexOf('E-') == -1) ) {
		end = string.length; 
		if(string.indexOf('.') != -1) { 
			end = string.indexOf('.'); 
		}
		withcomma= string.slice(end, );
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
		userpref.lastinput = string;
		saveuserpref();
		outputpreview();
	}
	addastring(string) {
		this.e.value += string;
		this.write(insertcomma(this.read()));
		userpref.lastinput = this.read();
		saveuserpref();
		outputpreview();
	}
	removeastring() {
		this.e.value = this.e.value.slice(0, -1);
		this.write(insertcomma(this.read()));
		userpref.lastinput = this.read();
		saveuserpref();
		outputpreview();
	}
	removeall() {
		this.e.value = null;
		userpref.lastinput = this.read();
		saveuserpref();
		outputpreview();
	}
}
class Outputbox {
	constructor(element) {
		this.e = element;
	}
	read() {
		return this.e.innerText;
	}
	length() {
		return this.read().length;
	}
	removeall() {
		this.e.innerText = '';
		lasteval = 0;
		angleunitwarned = false;
	}
	write(string) {
		string = string.toString();
		this.e.innerText = string.replace(/<[^>]*>/g, '');
		this.e.style.color = 'var(--fg-color-3)';
		angleunitwarned = false;
	}
	preview(string) {
		string = string.toString();
		this.e.innerText = string.replace(/<[^>]*>/g, '');
		this.e.style.color = 'var(--fg-color-3-1)';
	}
	error(string) {
		string = string.toString();
		this.e.innerText = string.replace(/<[^>]*>/g, '');
		this.e.style.color = 'var(--fg-color-3-2)';
	}
	previewoutdated() {
		this.e.style.color = 'var(--preview-outdated)';		
	}
}
inprogress = true; 
inputbox = new Inputbox(document.getElementById('ip'));
outputbox = new Outputbox(document.getElementById('op'));
function outputpreview() {
	outputbox.previewoutdated();
	var string = inputbox.read();
	var numofbrac = string.split('(').length - string.split(')').length;
	var temp;
	for (var i = 0; i < numofbrac; i++) {
		string = string + ')';
	}
	string = parse(string);
	try {
		temp = eval(string);
	} catch { 
		temp = 'error';
	}
	if (!isNaN(temp)) { 
		temp = filteroutput(temp); 
		outputbox.preview(temp);
		lasteval = temp;
	} else if(string == '') {
		outputbox.preview('0');
		lasteval = 0;
	}
}

function touchinput(key) {
	if ( !inprogress && isoperator(key) ) {
		inputbox.e.value = lasteval;
		outputbox.removeall();
	} else if (!inprogress ) {
		inputbox.removeall();
		outputbox.removeall();
	}
	inputbox.addastring(key);
	inprogress = true;
}
// touch input
document.addEventListener('click', event => {
	var target = event.target;
	if (target.nodeName == 'BUTTON') { 
		target.blur();
		switch(target.id) {
			case 'angleunit': setangleunit(); break;
			case 'representation': setnumrep(); break;
			case 'memory': setmemory(target); break;
			case 'mc': setmemory(target); break;
			case 'more': openmore(); break;
			case 'convert': 
				calculate(convtypes.value, convfroms.value + ' ▸ ' 
        			+ convtos.value); break;
			case 'sin': touchinput('sin('); break;
			case 'sininv': touchinput('sin⁻¹('); break;
			case 'exp': touchinput('^('); break;
			case 'ln': touchinput('ln('); break;
			case 'log': touchinput('log('); break;
			case 'cos': touchinput('cos('); break;
			case 'cosinv': touchinput('cos⁻¹('); break;
			case 'root': touchinput('√(' ); break;
			case 'lninv': touchinput('e^('); break;
			case 'loginv': touchinput('10^('); break;
			case 'tan': touchinput('tan('); break;
			case 'taninv': touchinput('tan⁻¹('); break;
			case 'openbrac': touchinput('('); break;
			case 'closebrac': touchinput(')'); break;
			case 'pi': touchinput('π' ); break;
			case 'pref0': case 'pref1': case 'pref2': case 'pref3':	case 'pref4': 
			case 'pref5': case 'pref6': case 'pref7':
				calculate(target.name, target.innerHTML); break;
			case '1':case '2':case '3':case '4':case '5':case '6':case '7':
			case '8':case '9':case '0':case 'decimal':case 'plus':case 'sub':case 'mult':
				touchinput(target.innerHTML);break;
			case "bspc": 		
				inputbox.removeastring();
				inprogress = true;
				break;
			case "CE": 
				inputbox.removeall();
				outputbox.removeall();
				inprogress = true; break;
			case "ANS": 
				inputbox.write(lasteval);
				outputbox.removeall();
				inprogress = true;
				break;
			case "evaluate": calculate('simple', null); break;
			case "divi": touchinput('/'); break;
			case "comma": touchinput('.'); break;
		}
		console.log('inprogress : ' + inprogress);
	}
});
document.addEventListener('change', event => {
	var target = event.target;
	if (target.nodeName == 'SELECT') { 
		target.blur();
		switch(target.id) {
			case 'convtypes': 
				setconvtype(target); break;
			case 'convtos':
				calculate( convtypes.value, convfroms.value 
					+ ' ▸ ' + convtos.value); 
			break;
		}
	}
});
document.getElementById('ip').addEventListener('focus', event => {
	event.target.scrollIntoView();
});
document.getElementById('ip').addEventListener('input', event => {
	outputpreview();
});
// keyboard input
document.addEventListener('keydown', event => {
	key = event.key;
	if ( key == "Enter" ) {
		calculate('simple', null);
	} else if ( inputbox.e != document.activeElement ) {
		if (!inprogress && isoperator(key)) {
			inputbox.write(lasteval);
			outputbox.removeall();
		} else if (!inprogress && (key !== 'Backspace') && (key !== 'Delete')) {
			inputbox.removeall();
			outputbox.removeall();
		}
		switch (key) {
			case 'Backspace': case 'Delete':
				inputbox.removeastring(); 
				break;
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
	} else { 
		inprogress = true;
	}
	console.log('inprogress : ' + inprogress);
});