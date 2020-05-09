class Inputbox {
	constructor(element) {
		this.e = element;
	}
	length() {
		return this.e.value.length;
	}
	setfontsize() {
		var optfont = 3.5; var minfont = 2; var strcapacity = 9;
		var newsize = optfont * ( strcapacity / this.length() );
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
	addastring(string) {
		if ( !inprogress && isoperator(string) ) { 
			this.e.value = outputbox.read();
			outputbox.removeall();
		}
		inprogress = true;
		this.e.value += string;
		this.setfontsize();
		console.log('string added : ' + string);
	}
	remove(instruction) {
		if( instruction == 'achar') {
			this.e.value = this.e.value.slice(0, -1);
			console.log('last character removed');
		} else if ( instruction == 'all') {
			this.e.value = null;
			console.log('inputbox cleared');
		}
		inprogress = true;
		this.setfontsize();
	}
	evaluate() {
		if (angleunit.innerHTML == 'DEG') { 
			angleconv = ''; angleconvinv = '';
		} else { 
			angleconv = "(Math.PI/180)*"; angleconvinv = "(180/Math.PI)*"; 
		}
		var parsedstring = this.e.value.replace(/×/gi, '*').replace(
			/÷/gi, '/').replace(/x/gi, '*').replace(/X/gi, '*').replace(
			/\^/gi, '**').replace(/e/g, 'Math.E').replace(
			/π/gi, 'Math.PI').replace(/0E/g, '0e').replace(/1E/g, '1e').replace(
			/2E/g, '2e').replace(/3E/g, '3e').replace(/4E/g, '4e').replace(
			/5E/g, '5e').replace(/6E/g, '6e').replace(/7E/g, '7e').replace(
			/8E/g, '8e').replace(/9E/g, '9e').replace(
			/log/gi, 'Math.log10').replace(	/ln/gi, 'Math.log').replace(
			/sin\(/gi, 'Math.sin(' + angleconv).replace(
			/cos\(/gi, 'Math.cos(' + angleconv).replace(
			/tan\(/gi, 'Math.tan(' + angleconv).replace(
			/sin⁻¹\(/gi, angleconvinv + 'Math.asin(').replace(
			/cos⁻¹\(/gi, angleconvinv + 'Math.acos(').replace(
			/tan⁻¹\(/gi, angleconvinv + 'Math.atan(').replace(/ /gi, '');

		while ( parsedstring.indexOf('√') != -1 ) {
			var rootindex = parsedstring.indexOf('√');
			var exponent; var exponented;
			var start = rootindex - 1 ; var end = rootindex + 1;
			var blockdue = 0;

			if ( iscloseparan( parsedstring[start] )) {
				blockdue = -1;
				while ((blockdue != 0) && (start != 0)) {
					if (isopenparan(parsedstring[start])) {
						blockdue += 1;
					} else if (iscloseparan(parsedstring[start])) {
						blockdue -= 1;
					}
					start -= 1;
				}
				exponent = '1/' + parsedstring.slice(start, rootindex);
			} else if (isnumber(parsedstring[start])) {
				while (isnumber(parsedstring[start])) {
					start -= 1;
				}
				start += 1;
				exponent = '1/' + parsedstring.slice(start, rootindex);
			} else {
				exponent = '1/2';
			}

			if ( isopenparan( parsedstring[end] )) {
				blockdue = 1;
				while ((blockdue != 0) && (end != value.length)) {
					if (isopenparan(parsedstring[end])) {
						blockdue += 1;
					} else if (iscloseparan(parsedstring[end])) {
						blockdue -= 1;
					}
					end += 1;
				}
				exponented = parsedstring.slice( rootindex + 1 , end + 1 );
			} else if (isnumber(parsedstring[end])) {
				while (isnumber(parsedstring[end])) {
					end += 1;
				}
				end -= 1;
				exponented = parsedstring.slice(rootindex + 1, end + 1); 
			}

			if (start = -1) {
				parsedstring = exponented + '**' + exponent + parsedstring.slice(end+1, );
			} else {
				parsedstring = parsedstring.slice(0,start) + exponented + '**' + exponent
					+ parsedstring.slice(end+1 , );
			}
		}

		if ( parsedstring.indexOf(',') != -1 ) {
			parsedlist = parsedstring.split(',');
			var evaluted = [];
			for ( var i=0; i<parsedlist.length; i++ ) {
				evaluted.push(eval(parsedlist[i]));
			}
		} else {
			var evaluted = eval(parsedstring);
		}
		return evaluted;
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
		var optfont = 2.5; var strcapacity = 9;
		var newsize = optfont * ( strcapacity / this.length());
		if ( newsize > optfont ) { 
			newsize = optfont + 'em' ; 
		} else { 
			newsize = newsize + 'em' ;
		}
		this.e.style.fontSize = newsize;
	}
	write(evaluted, unit=null) {
		
		if (isNaN(number)) { 
			this.e.innerHTML = 'invalid input :(';
		} else if ( typeof(number) != "number" ) { 
			this.e.innerHTML = "error";
			console.log('error detail: ' + number.message);
		} else {
			if (number.toString().length > 10) { number = number.toPrecision(10); }

			if ( outputformat == 'DECI') {
				number = Number(number).toString();
			}
			if ((outputformat == 'SCI') || istoolong(number, 10)) {
				number = Number(number).toExponential();
			}
			number = String(number).replace(/e/g, 'E');
			inprogress = false;

			if ( unit == null ) { this.e.value = number;
			} else { this.e.value = number + '  ' + unit; }
		}
		this.setfontsize();
	}
}

// globals
app = document.getElementsByTagName('BODY');
inputbox = new Inputbox(document.getElementById('ip'));
outputbox = new Outputbox(document.getElementById('op'));

inprogress = true; memorystored = '';
angleunit = document.getElementById('angleunit');
numberrep = document.getElementById('representation');
memory = document.getElementById('memory');

function setangleunit() {
	if (angleunit.innerHTML == 'DEG') { angleunit.innerHTML = 'RAD';
	} else { angleunit.innerHTML = 'DEG'}
}
function changerep() {
    if (numberrep.innerHTML == 'DECI') { numberrep.innerHTML = 'SCI';
    } else { numberrep.innerHTML = 'DECI'; }
}
function memory(element) {
	if ( memory.innerHTML == 'STORE' ) { 
		memory.innerHTML = 'RECALL';
		memorystored = outputbox.value;
	} else if (memory.innerHTML == 'RECALL') {
		inputbox.addastring(memorystored);
	} else {
		memory.innerHTML = 'STORE';
	}
}

 // listen to the keyboard input and insert text
document.addEventListener('keydown', event => {
	key = event.key;
// 	if ( key == "Enter" ) { 
// //------------------------------------------------------------------------
// 		outputbox.write(inputbox.evaluate());
// //------------------------------------------------------------------------
// 	} else 
	if ( inputbox.el != document.activeElement ) {
		switch (key) {
			case 'Backspace': case 'Devare':
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
	}
});

// Booleans
function isoperator(string) {
	return ( string=='+' || string=='-' || string=='×' || string=='*'
		|| string == 'x' || string=='X' || string=='/' || string=='^(' 
		|| string=='^' || string=='%' || string=='√(' );
}
function isopenparan(string) {
	return ( string=='(' || string=='{' || string=='[' || string=='<' );
}
function iscloseparan(string) {
	return ( string==')' || string=='}' || string==']' || string=='>' );
}
function isnumber(string) {
	return ( !isNaN(string) || string=='.' || string=='E' );
}
function istoolong(string, length) {
	string = string.replace(/\./g, '');
	eindex = string.indexOf('e');
	if ( eindex != -1 ) { string = string.slice(0, eindex); }
	return string.length > length;
}

// defocus buttons after click
function defocus(element) {
	element.blur();
}
function validateresize() {
	// keep the dream alive
}

// stop android softkeyboard resize
bodycomp = window.getComputedStyle(document.querySelector('body'));
widthhistory = bodycomp.getPropertyValue('width');
heighthistory = bodycomp.getPropertyValue('height');
function analyzeresize() {
	if ( inputbox == document.activeElement ) {
		app[0].style.width = widthhistory; 
		app[0].style.height = heighthistory;
		console.log('resize denied : ' + widthhistory + ' X ' + heighthistory);
	} else {
		bodycomp = window.getComputedStyle(document.querySelector('body'));
		widthhistory = bodycomp.getPropertyValue('width');
		heighthistory = bodycomp.getPropertyValue('height');
		console.log('resize validated : ' + widthhistory + ' X ' + heighthistory);
	}
}
function openmore(element) {
	var status = element.innerHTML;
	if ( status == '⠇' ) {
		app[0].style.gridTemplateRows = '30% 0% 0% 25% 45%';
		element.innerHTML = '↶';
		element.style.fontSize = '2em';
		element.style.fontWeight = 'normal';
// 		element.
	} else {
		app[0].style.gridTemplateRows = '30% 25% 45% 0% 0%';
		element.innerHTML = '⠇';
		element.style.fontSize = '1em';
		element.style.fontWeight = '900';
	}
	console.log(app[0].style.gridTemplateRows);
}

//---------------------------------------------------------------------------
// -----------------------------loadpref.js----------------------------------
//---------------------------------------------------------------------------
// ( async () => {

// 	var temp = await fetch('./data/pref.json');
// 	var prefs = await temp.json();
// 	console.log('user preferences loaded: ', prefs);

// 	document.getElementById('convert0').innerHTML = prefs.conversions[0];
// 	document.getElementById('convert1').innerHTML = prefs.conversions[1];
// 	document.getElementById('convert2').innerHTML = prefs.conversions[2];
// 	document.getElementById('convert3').innerHTML = prefs.conversions[3];
// 	document.getElementById('convert4').innerHTML = prefs.conversions[4];
// 	document.getElementById('convert5').innerHTML = prefs.conversions[5];
// 	document.getElementById('currency0').innerHTML = prefs.currencies[0];
// 	document.getElementById('currency1').innerHTML = prefs.currencies[1];
// 	document.getElementById('time0').innerHTML = prefs.times;
// 	document.getElementById('func0').innerHTML = prefs.functions[0];
// 	document.getElementById('func1').innerHTML = prefs.functions[1];
// 	document.getElementById('func2').innerHTML = prefs.functions[2];
// 	document.getElementById('func3').innerHTML = prefs.functions[3];

// 	// var buttons = document.getElementsByTagName('BUTTON');
// 	// var button;
// 	// for (i = 0; i < buttons.length; i++ ) {
// 	// 	button = buttons[i];
// 	// 	button.style.fontSize = (2*button.innerHTML.length**(-1/3)) + 'em';
// 	// }
// })();

// var tempelem = window.getComputedStyle(document.getElementsByTagName("BODY")[0]);
// var tempcolor = tempelem.getPropertyValue('background-color');
// document.getElementsByName('theme-color').content = 'tempcolor';


// function func(element) {
// 	var operation = element.innerHTML;
// 	console.log("computation requested: " + operation);
// 	var inputlist = readinput(multi=true);
// 	var x; var y; var z;
// 	switch(operation) {
// 		case "x/sin(y)":
// 			x = eval(inputlist[0]); y = eval(inputlist[1]);
// 			printoutput(x/Math.sin((Math.PI/180)*y)); break;
// 		case "x/cos(y)":
// 			x = eval(inputlist[0]); y = eval(inputlist[1]);
// 			printoutput(x/Math.cos((Math.PI/180)*y)); break;
// 		case "15%":
// 			x = eval(inputlist[0]);
// 			printoutput(x*0.15); break;
// 		case "20%":
// 			x = eval(inputlist[0]);
// 			printoutput(x*0.20); break;
// 	}
// }


// indexed function
function calculateindex(element) {
	var operation = element.innerHTML;
	if ( operation.indexOf('<br>') != -1 ) {
		convertcurrency(element);
		console.log('currency conversion initiated...');
	} else if ( operation.indexOf(' ▸ ') != -1 ) {
		convertunit(element);
		console.log('unit conversion initiated...');
	} else {
		executefunction(element);
		console.log('function execution initiated...');
	}
}

function convertunit(element) {
	var operation = element.innerHTML;
	var inputvalue = eval(parse());
	console.log("function requested: " + operation + 'input: ' + inputvalue );
	switch (operation) {
		// area
		case "mi² ▸ km²": printoutput(2.58999*inputvalue, 'km²'); break;
		case "km² ▸ mi²": printoutput(2.58999*inputvalue, 'mile²'); break;
		case "in² ▸ cm²": printoutput(6.4516*inputvalue, 'cm²'); break;
		case "cm² ▸ in²": printoutput(0.1550*inputvalue, 'inch²'); break;
		// length
		case 'in ▸ cm': printoutput(2.54*inputvalue, 'cm'); break;
		case "cm ▸ in": printoutput(inputvalue*0.3937, 'inch'); break;
		case "ft ▸ m": printoutput(0.3048*inputvalue, 'm'); break;
		case "m ▸ ft": printoutput(inputvalue*3.2808, 'ft'); break;
		case "mi ▸ km": printoutput(inputvalue*1.60934, 'km'); break;
		case "km ▸ mi": printoutput(inputvalue*0.621371, 'mile'); break;
		// energy
		case "kcal ▸ kJ": printoutput(4.184*inputvalue, 'kJ'); break;
		case "kJ ▸ kcal": printoutput(0.2390*inputvalue, 'kcal'); break;
		case "kWh ▸ kJ": printoutput(3600*inputvalue, 'kJ'); break;
		case "kJ ▸ kWh": printoutput(inputvalue/3600, 'kWh'); break;
		// mass
		case "lb ▸ kg": printoutput(0.453592*inputvalue, 'kg'); break;
		case "kg ▸ lb": printoutput(inputvalue*2.2090, 'lb'); break;
		case "ou ▸ kg": printoutput(inputvalue/35.274, 'kg'); break;
		case "kg ▸ ou": printoutput(inputvalue*35.274, 'ounce'); break;
		// pressure
		case "kPa ▸ atm": printoutput(inputvalue/101.325, 'atm'); break;
		case "atm ▸ kPa": printoutput(inputvalue*101.325, 'kPa'); break;
		case "psi ▸ atm": printoutput(inputvalue/14.696, 'atm'); break;
		case "atm ▸ psi": printoutput(inputvalue*14.696, 'psi'); break;
		case "bar ▸ atm": printoutput(inputvalue/1.013, 'atm'); break;
		case "atm ▸ bar": printoutput(inputvalue*1.013, 'bar'); break;
		case "torr ▸ atm": printoutput(inputvalue/760, 'atm'); break;
		case "atm ▸ torr": printoutput(inputvalue*760, 'torr'); break;
		// temperature
		case "ᵒF ▸ ᵒC": 
			printoutput(Number(((inputvalue-32)*(5/9)).toFixed(0)), 'ᵒC'); 
			break;
		case "ᵒC ▸ ᵒF":
			printoutput(Number(((inputvalue*(9/5) + 32)).toFixed(0)), 'ᵒF'); 
			break;
	}
}
// currency conversions
function convertcurrency(element) {
	var operation = element.innerHTML;
	console.log("conversion requested: " + operation);
	var base = operation.slice(0, 3); var target = operation.slice(8, 11);
	var inputvalue = eval(parse());
	var baseurl = "https://api.exchangeratesapi.io/latest?";
	var basecurr = "base=" + base;
	var targetcurr = "&symbols=" + target;
	(async () => {
		var response = await fetch( baseurl + basecurr + targetcurr );
		var data = await response.json();
		printoutput(Number(inputvalue*data["rates"][target].toFixed(2)), target);
	})();
}

// //time conversions
// function gettime12hr(dateandtime, hr, mn) {
// 	var raw = dateandtime
// 	var tindex = raw.indexOf("T")
// 	var hour = Number(raw.slice(tindex+1, tindex+3))
// 	var min = Number(raw.slice(tindex+4, tindex+6))
// 	console.log(dateandtime, raw, hour, min, hr, mn)
// 	hour = hour + hr; min = min + mn;

// 	if ( min > 59 ) { min = min -60; hour = hour + 1;
// 	} else if (min < 0 ) { min = min + 60; hour = hour - 1;
// 	} else { min = min; }

// 	if (hour < 0 ) { hour = hour + 12; period = "PM";
// 	} else if (hour > 11 ) { hour = hour - 12; period = "PM";
// 	} else { period = "AM";
// 	}
// 	if (hour == 0 ) { hour = 12; }
// 	if (String(min).length < 2 ) { min = "0" + min; }
// 	printoutput(hour + ":" + min, period);
// }

// function time(element) {
// 	var timezone = element.innerHTML;
// 	console.log("time requested: " + timezone);
// 	printoutput("loading...");
// 	(async () => {
// 		var response = await fetch("https://worldtimeapi.org/api/timezone/Asia/Kolkata");
// 		var data = await response.json();
// 		await gettime12hr(data.datetime, 0, 0);
// 	})();
// }
function getgcd(a, b) {
    while ( a != b ) {
        if ( a > b ) {
            a = a - b;
        } else {
            b = b - a;
        }
    }
    console.log('GCD : ' + a );
    return a;
}