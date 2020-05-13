
// modify DOM
app = document.getElementsByTagName('BODY');
angleunit = document.getElementById('angleunit');
numrep = document.getElementById('representation');
memory = document.getElementById('memory');
memorystored = '';
more = document.getElementById('more');
function setangleunit() {
	if (angleunit.innerHTML == 'DEG') { angleunit.innerHTML = 'RAD';
	} else { angleunit.innerHTML = 'DEG'}
	if (outputbox.read() != '') {
		if (more.innerHTML == '⠇') {
			calculate('simple');
		} else {
			calculate(convtypes.value, convfroms.value + ' ▸ ' + convtos.value);
		}
	}
	console.log('angle unit set to: ' + angleunit.innerHTML);
}
function setnumrep() {
    if (numrep.innerHTML == 'DECI') { numrep.innerHTML = 'SCI';
    } else { numrep.innerHTML = 'DECI'; }
	if (outputbox.read() != '') {
		if (more.innerHTML == '⠇') {
			calculate('simple');
		} else {
			calculate(convtypes.value, convfroms.value + ' ▸ ' + convtos.value);
		}
	}
    console.log('number representation set to: ' + numrep.innerHTML);
}
function setmemory(element) {
	if ( element.innerHTML == 'STORE' ) { 
		element.innerHTML = 'RECALL';
		memorystored = evaluated;
		console.log( memorystored + ' stored in memeory ');
	} else if (element.innerHTML == 'RECALL') {
		inputbox.addastring(memorystored);
		console.log( memorystored + ' recalled from memory ');
	} else {
		memory.innerHTML = 'STORE';
		console.log( memorystored + ' erased from memory ');
	}
}
function setconvtype(element) {
	var chosentype = element.value;
	var typeindex = 0;
	while (chosentype != convdata[typeindex][0]) { typeindex++ }
	convfroms.innerHTML = ''; convtos.innerHTML = '';
	var convdatalength = convdata[typeindex][1].length;
	for (let i=0; i < convdatalength; i++) {
		var opt1 = document.createElement('option');
		var opt2 = document.createElement('option');
		opt1.textContent = convdata[typeindex][1][i];
		opt1.index = i;
		opt2.textContent = convdata[typeindex][1][convdatalength-1-i];
		opt2.index = convdatalength-1-i;
		convfroms.appendChild(opt1);
		convtos.appendChild(opt2);
	}
	console.log( chosentype + ' loaded ' );
}

// modify style
// stop android softkeyboard resize
// bodycomp = window.getComputedStyle(document.querySelector('body'));
// widthhistory = bodycomp.getPropertyValue('width');
// heighthistory = bodycomp.getPropertyValue('height');
function validateresize() {
	// if ( inputbox == document.activeElement ) {
	// 	app[0].style.width = widthhistory; 
	// 	app[0].style.height = heighthistory;
	// 	console.log('resize denied : ' + widthhistory + ' X ' + heighthistory);
	// } else {
	// 	bodycomp = window.getComputedStyle(document.querySelector('body'));
	// 	widthhistory = bodycomp.getPropertyValue('width');
	// 	heighthistory = bodycomp.getPropertyValue('height');
	// 	console.log('resize validated : ' + widthhistory + ' X ' + heighthistory);
	// }
}
function openmore() {
	var status = more.innerHTML;
	if ( status == '⠇' ) {
		app[0].style.gridTemplateRows = '30% 0% 25% 45%';
		more.innerHTML = '↶';
		more.style.fontSize = '1em';
		more.style.fontWeight = '900';
// 		element.
	} else {
		app[0].style.gridTemplateRows = '30% 25% 0% 45%';
		more.innerHTML = '⠇';
		more.style.fontSize = '1em';
		more.style.fontWeight = '900';
	}
}
evaluated = 0;
// Booleans
function isoperator(string) {
	return ( string=='+' || string=='-' || string=='×' || string=='*'
		|| string == 'x' || string=='X' || string=='/' || string=='÷' 
		|| string=='^(' || string=='^' || string=='%' || string=='√(' );
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
	setfontsize() {
		const optfont = 3.5; const minfont = 2; const strcapacity = 9;
		var newsize = optfont * ( strcapacity / this.length());
		if ( newsize > optfont ) { 
			newsize = optfont + 'em' ; 
		} else if ( newsize > minfont ) { 
			newsize = newsize + 'em' ;
			console.log('Inputbox font changed to : ' + newsize);
		} else {
			newsize = minfont + 'em' ;
			this.e.scrollLeft = this.e.scrollWidth;
		}
		this.e.style.fontSize = newsize;
	}
	write(string) {
		this.e.value = string;
		this.setfontsize();
	}
	addastring(string) {
		this.e.value += string;
		this.setfontsize();
	}
	removeastring() {
		this.e.value = this.e.value.slice(0, -1);
		this.setfontsize();
	}
	removeall() {
		this.e.value = null;
		this.setfontsize();
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
	setfontsize() {
		const optfont = 2.5; const strcapacity = 9;
		var newsize = optfont * ( strcapacity / this.length());
		if ( newsize > optfont ) { 
			newsize = optfont + 'em' ; 
		} else { 
			newsize = newsize + 'em' ;
		}
		this.e.style.fontSize = newsize;
	}
	removeall() {
		this.e.innerHTML = null;
	}
	write(string) {
		this.e.innerHTML = string;
		this.setfontsize();
	}
}
//---------------------------------------------------------------------------
// ------------------------------globals.js----------------------------------
//---------------------------------------------------------------------------
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
		inprogress = false;
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
		inprogress = false;
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

// indexed functions
function evaluate(string) {
	var angleconv; var angleconvinv;
	if (angleunit.innerHTML == 'DEG') {
		angleconv = "(Math.PI/180)*";
		angleconvinv = "(180/Math.PI)*"; 
	} else { 
		angleconv = ''; angleconvinv = '';
	}
	var parsedstring = string.replace(/\(|\{|\[|\</gi, '((').replace(
		/\)|\}|\]|\>/gi, '))').replace(/×|x|X/gi, '*').replace(
		/÷/gi, '/').replace(/\^/gi, '**').replace(/e/g, 'Math.E').replace(
		/π/gi, 'Math.PI').replace(/log/gi, 'Math.log10').replace(
		/ln/gi, 'Math.log').replace(/sin\(/gi, 'Math.sin(' + angleconv).replace(
		/cos\(/gi, 'Math.cos(' + angleconv).replace(
		/tan\(/gi, 'Math.tan(' + angleconv).replace(
		/sin⁻¹\(/gi, angleconvinv + 'Math.asin(').replace(
		/cos⁻¹\(/gi, angleconvinv + 'Math.acos(').replace(
		/tan⁻¹\(/gi, angleconvinv + 'Math.atan(').replace(/ /gi, '');
	// parsing root
	while ( parsedstring.indexOf('√') != -1 ) {
		var rootindex = parsedstring.indexOf('√');
		var exponent; var exponented;
		var start = rootindex - 1 ; var end = rootindex + 1;
		var blockdue = 0;

		if ( parsedstring[start] == ')') {
			blockdue = -1;
			while ((blockdue != 0) && (start != 0)) {
				if (parsedstring[start] == '(') {
					blockdue += 1;
				} else if (parsedstring[start] == ')') {
					blockdue -= 1;
				}
				start -= 1;
			}
			exponent = '1/' + parsedstring.slice(start, rootindex);
		} else if (!isNaN(parsedstring[start])) {
			while (isnumber(parsedstring[start], parsedstring[start-1], 
				parsedstring[start+1])) {
				start -= 1;
			}
			start += 1;
			exponent = '1/' + parsedstring.slice(start, rootindex);
		} else {
			exponent = '1/2';
		}

		if (parsedstring[start] == '(') {
			blockdue = 1;
			while ((blockdue != 0) && (end != parsedstring.length)) {
				if (parsedstring[start] == '(') {
					blockdue += 1;
				} else if (parsedstring[start] == ')') {
					blockdue -= 1;
				}
				end += 1;
			}
			exponented = parsedstring.slice( rootindex + 1 , end + 1 );
		} else if (!isNaN(parsedstring[end])) {
			while (isnumber(parsedstring[end], parsedstring[start-1], parsedstring[start+1])) {
				end += 1;
			}
			end -= 1;
			exponented = parsedstring.slice(rootindex + 1, end + 1); 
		}
		if (start == -1) {
			parsedstring = '((' + exponented + ')**(' + exponent + '))' 
				+ parsedstring.slice(end+1, );
		} else {
			parsedstring = parsedstring.slice(0,start) + '((' + exponented
				 + ')**(' + exponent + '))' + parsedstring.slice(end+1 , );
		}
	}
	console.log('Parsed expression: ' + parsedstring);
	// trig functions cleanup attempt
	var start = 0;
	while ((parsedstring.indexOf('Math.sin(', start) != -1)) {
		var trigindex = parsedstring.indexOf('Math.sin(', start);
		var start = trigindex + 8 ; var end = start + 1;
		var blockdue = 1;
		while (blockdue != 0) {
			if (parsedstring[end] == '(') {
				blockdue++;
			} else if (parsedstring[end] == ')') {
				blockdue--;
			}
			end++;
		}
		if (((eval(parsedstring.slice(start, end))/Math.PI).toPrecision(5))%1 == 0 ) {
			if (trigindex != 0) {
				parsedstring = parsedstring.slice(0,trigindex) 
					+ '(0)' + parsedstring.slice(end, );
			} else {
				parsedstring = '(0)' + parsedstring.slice(end, );
			}
		}
		start = trigindex + 1;
	}
	var start = 0;
	while ((parsedstring.indexOf('Math.tan(', start) != -1)) {
		var trigindex = parsedstring.indexOf('Math.tan(', start);
		var start = trigindex + 8 ; var end = start + 1;
		var blockdue = 1;
		while (blockdue != 0) {
			if (parsedstring[end] == '(') {
				blockdue++;
			} else if (parsedstring[end] == ')') {
				blockdue--;
			}
			end++;
		}
		if (((eval(parsedstring.slice(start, end))/Math.PI).toPrecision(5))%1 == 0  ) {
			if (trigindex != 0) {
				parsedstring = parsedstring.slice(0,trigindex) 
					+ '(0)' + parsedstring.slice(end, );
			} else {
				parsedstring = '(0)' + parsedstring.slice(end, );
			}
		}
		start = trigindex + 1;
	}
	var start = 0;
	while ((parsedstring.indexOf('Math.cos(', start) != -1)) {
		var trigindex = parsedstring.indexOf('Math.cos(', start);
		var start = trigindex + 8 ; var end = start + 1;
		var blockdue = 1;
		while (blockdue != 0) {
			if (parsedstring[end] == '(') {
				blockdue++;
			} else if (parsedstring[end] == ')') {
				blockdue--;
			}
			end++;
		}
		if (((eval(parsedstring.slice(start, end))/Math.PI).toPrecision(5))%1 == 0.5 ) {
			if (trigindex != 0) {
				parsedstring = parsedstring.slice(0,trigindex) 
					+ '(0)' + parsedstring.slice(end, );
			} else {
				parsedstring = '(0)' + parsedstring.slice(end, );
			}
		}
		start = trigindex + 1;
	}
	console.log('trigonometric functions cleaned: '+ parsedstring);
	if ( parsedstring.indexOf(',') != -1 ) {
		parsedlist = parsedstring.split(',');
		evaluated = [];
		for ( var i=0; i<parsedlist.length; i++ ) {
			evaluated.push(eval(parsedlist[i]));
		}
	} else {
		evaluated = eval(parsedstring);
	}
	console.log('evaluated output: ' + evaluated);
	return evaluated;
}
function filteroutput(evaluated, unit) {
	if (isNaN(evaluated) || (typeof(evaluated) != "number")) { 
		outputbox.write('error');
	} else {
		if (evaluated.toString().length > 10) { 
			evaluated = evaluated.toPrecision(10); 
		}
		if ( numrep.innerHTML == 'DECI') {
			evaluated = Number(evaluated).toString();
		} 
		if ((numrep.innerHTML == 'SCI') || istoolong(evaluated, 11)) {
			evaluated = Number(evaluated).toExponential();
		} 
		evaluated = String(evaluated).replace(/e/g, 'E');
		if (unit) {
			outputbox.write(evaluated + ' ' + unit);
		} else {
			outputbox.write(evaluated);
		}
	}
	console.log('filteroutput: ' + evaluated);
}
function calculate(type, operation) {
	console.log('computation requested: ' + type + '; ' + operation);
	var base; var target;
	if (type != 'function') { evaluated = evaluate(inputbox.read()); }
	try { 
		[base, target] = operation.split(' ▸ ');
	} catch {
	}
	if (type != 'simple') {
	var typeindex = 0; var baseindex = 0; var targetindex = 0;
	while (type != convdata[typeindex][0]) { typeindex++; }
	while (base != convdata[typeindex][1][baseindex]) { baseindex++; }
	while (target != convdata[typeindex][1][targetindex]) { targetindex++; }
	}
	switch (type) {
		case 'simple':
			filteroutput(evaluated, null);
			break;
		case 'area': case 'energy': case 'length': case 'mass': case 'pressure':
		case 'volume':
			evaluated = eval(evaluated + '*' + convdata[typeindex][2][baseindex]
				+ '/' + convdata[typeindex][2][targetindex] );
			filteroutput(evaluated, target); break;
		case 'currency':
			var baseurl = "https://api.exchangeratesapi.io/latest?";
			var basecurr = "base=" + base;
			var target = operation.slice(6, 9);
			var targetcurr = "&symbols=" + target;
			(async () => {
				var response = await fetch( baseurl + basecurr + targetcurr );
				var data = await response.json();
				evaluated = evaluated*data["rates"][target];
				if (isNaN(evaluated) || (typeof(evaluated) != "number")) { 
					outputbox.write('error');
				} else {
					evaluated = Number(evaluated).toString();
					outputbox.write(Number(evaluated).toFixed(2)+ ' ' + target);
				}
			})();
			break;
		case 'temperature':
			evaluated = eval('(' + evaluated + convdata[typeindex][2][baseindex])
			evaluated = eval('(' + evaluated + convdata[typeindex][3][targetindex])
			outputbox.write(Number(evaluated).toFixed(2)+ ' ' + target);
			break;
	}
	log(type, operation);
}

function log (type, operation) {
	if (type != 'simple') {
		var opindex = 0;
		console.log(prefs[opindex]);
		while ((opindex < prefs.length) &&
			(operation != prefs[opindex]['operation']) ) {
			opindex++;
		}
		if (opindex != prefs.length) {
			prefs[opindex].usecount += 1;
		} else {
			prefs.push({
				'operation' : operation,
				'usecount'	: 1,
				'type': type
			});
		}
	} else {
		// if ( prefs.function == undefined ) {
		// 	prefs.function = [inputbox.read()];
		// } else {
		// 	prefs.function.push(inputbox.read());
		// }
	}
	prefs.sort(function(a, b){
    	return b.usecount - a.usecount;
	});
	console.log(prefs);
	console.log(JSON.stringify(prefs));
	window.localStorage.setItem("prefs", JSON.stringify(prefs));
	loadprefs();
}