lasteval = '';
lasttype = '';
lastoperation = '';
inprogress = true;
invalidoutput = true;
// Booleans
function isoperator(string) {
	return ( string=='+' || string=='-' || string=='×' || string=='*'
		|| string == 'x' || string=='X' || string=='/' || string=='÷' 
	);
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
	write(string, cursor) {
		this.e.value = string;
		this.setfontsize();
		this.e.setSelectionRange(cursor, cursor);
		outputpreview();
		inprogress = true;
		if (this.e.selectionStart === this.read().length) {
			this.e.scrollLeft = this.e.scrollWidth;
		} else {
			this.e.scrollLeft = this.e.scrollWidth*((cursor-8)/string.length);
		}
		userpref.lastinput = string;
		saveuserpref();
	}
	addastring(string) {
		let cursorstart = this.e.selectionStart;
		let cursorend = this.e.selectionEnd;
		let current = this.e.value;
		this.write(current.slice(0, cursorstart) + string + current.slice(cursorend, ), cursorstart + string.length);
	}
	removeastring() {
		let cursorstart = this.e.selectionStart;
		let cursorend = this.e.selectionEnd;
		let current = this.e.value;
		if (cursorstart === cursorend) {
			if (cursorstart !== 0) {
				this.write(current.slice(0, cursorstart-1) + current.slice(cursorstart, ), cursorstart - 1 );
			}
		} else {
			this.write(current.slice(0, cursorstart) + current.slice(cursorend, ), cursorstart );
		}
	}
	removeall() {
		this.write('', 0);
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
	write(string, unit) {
		string = string.toString().replace(/<[^>]*>/g, '');	
		lasteval = string.replace(/,/g, '');
		this.e.innerText = `${string} ${unit}`;
		this.e.style.color = 'var(--fg-color-3)';
		angleunitwarned = false;
		inprogress = false;
		invalidoutput = false;
	}
	preview(string) {
		string = string.toString().replace(/<[^>]*>/g, '');	
		lasteval = string.replace(/,/g, '');
		this.e.innerText = `${string}`;
		this.e.style.color = 'var(--fg-color-3-1)';
		invalidoutput = false;
	}
	error(string) {
		string = string.toString();
		this.e.innerText = string.replace(/<[^>]*>/g, '');
		this.e.style.color = 'var(--fg-color-3-2)';
		invalidoutput = true;
	}
	previewoutdated() {
		this.e.style.color = 'var(--preview-outdated)';
		inprogress = true;
		invalidoutput = false;
	}
	removeall() {
		this.e.innerText = '';
		lasteval = '';
		angleunitwarned = false;
		invalidoutput = true;
	}
	notify(string) {
		let currentstring = this.e.innerText;
		this.e.innerHTML = string;
		this.e.style.color = 'var(--fg-color-3-1)';
		setTimeout(() => {
			this.e.innerText = currentstring;
		}, 750);
	}
}
inputbox = new Inputbox(document.getElementById('ip'));
outputbox = new Outputbox(document.getElementById('op'));
function outputpreview() {
	outputbox.previewoutdated();
	let string = inputbox.read();
	let numofbrac = string.split('(').length - string.split(')').length;
	let temp;
	for (let i = 0; i < numofbrac; i++) {
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
	} else if(string === '') {
		outputbox.preview('0');
	}
}
function touchinput(key) {
	if ( !inprogress && isoperator(key) ) {
		inputbox.write(lasteval);
		outputbox.removeall();
		inputbox.e.setSelectionRange(9999, 9999);
	} else if (!inprogress) {
		inputbox.removeall();
		outputbox.removeall();
	}
	inputbox.addastring(key);
}
// touch input
inputbox.e.addEventListener('focusout', event => {
	if (inputbox.e.selectionStart === inputbox.read().length) {
		inputbox.e.scrollLeft = inputbox.e.scrollWidth;
	} else {
		inputbox.e.scrollLeft = inputbox.e.scrollWidth*((inputbox.e.selectionStart-8)/inputbox.read().length);
	}
});
document.addEventListener('keydown', event => {
	inputbox.e.focus();
	key = event.key;
	if ( key == "Enter" ) {
		calculate('simple', null);
	} else {
		if (!inprogress && isoperator(key)) {
			inputbox.write(lasteval, lasteval.length);
			outputbox.removeall();
		} else if (!inprogress && (key.length === 1)) {
			inputbox.removeall();
			outputbox.removeall();
		}
		inprogress = true;
	}
});
inputbox.e.addEventListener('input', event => {
	inputbox.setfontsize();
	outputpreview();
	userpref.lastinput = inputbox.read();
	saveuserpref();
});
document.addEventListener('click', event => {
	var target = event.target;
	if (target.nodeName !== 'SELECT') {
		inputbox.e.focus();
	}
	if (target.nodeName == 'BUTTON') {
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
			case 'lninv': touchinput('Math.E^('); break;
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
				break;
			case "CE": 
				inputbox.removeall();
				outputbox.removeall();
				break;
			case "ANS": 
				inputbox.write(lasteval, lasteval.length);
				outputbox.removeall();
				break;
			case "evaluate": calculate('simple', null); break;
			case "divi": touchinput('/'); break;
			case "comma": touchinput('.'); break;
			case "E": touchinput('E'); break;
		}
	} else if (target.nodeName == 'INPUT') {
		inprogress = true;
	} else if (target.nodeName === 'P') {
		let outputtext = outputbox.read();
		if (!invalidoutput) {
			navigator.clipboard.writeText(lasteval);
			outputbox.notify('copied to clipboard!');
		}
	}
});
document.addEventListener('change', event => {
	var target = event.target;
	if (target.nodeName == 'SELECT') { 
		switch(target.id) {
			case 'convtypes': 
				setconvtype(target); break;
			case 'convtos':
				calculate( convtypes.value, convfroms.value 
					+ ' ▸ ' + convtos.value); 
			break;
		}
	}
}); // conversion selection