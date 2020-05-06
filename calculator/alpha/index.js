//---------------------------------------------------------------------------
// -----------------------------style.js-------------------------------------
//---------------------------------------------------------------------------
inputbox = document.getElementById('ip');
outputbox = document.getElementById('op');
app = document.getElementsByTagName('BODY');

// font size fix
function autofontsize() {
	let optfont = 3.5; let minfont = 2; let strcapacity = 9;
	let newsize = optfont * ( strcapacity / inputbox.value.length);
	if ( newsize > optfont ) { 
		inputbox.style.fontSize = optfont + 'em' ; 
	} else if ( newsize > minfont ) { 
		inputbox.style.fontSize = newsize + 'em' ;
		console.log('input font changed to : ' + newsize + 'em');
	} else {
		inputbox.style.fontSize = minfont + 'em' ;
		inputbox.scrollLeft = inputbox.scrollWidth;
	} 
}

// defocus buttons after click
function defocus(element) {
	element.blur();
}

// widthhistory = null; heighthistory = null; viewportcheck();
// // android view port fix
// function viewportcheck() {
// 	let temp = window.getComputedStyle(document.querySelector('body'));
// 	if ( inputbox == document.activeElement ) {
// 		app[0].style.width = widthhistory;
// 		app[0].style.height = heighthistory;
// 	} else {
// 		widthhistory = temp.getPropertyValue('width');
// 		heighthistory = temp.getPropertyValue('height');
// 		app[0].style.width = widthhistory;
// 		app[0].style.height = heighthistory;
// 	}
// 	console.log('body width: ' + widthhistory + 'body height: ' + heighthistory);
// 	console.log(app);
// }

function openmore() {
	outputbox.innerHTML = "🚧👷🏗️";
}
//---------------------------------------------------------------------------
// -----------------------------input.js-------------------------------------
//---------------------------------------------------------------------------

inprogress = true;
memorystored = '';

function memory(element) {
	if ( element.innerHTML == 'STORE' ) {
		element.innerHTML = 'RECALL';
		memorystored = outputbox.innerHTML;
	} else if (element.innerHTML == 'RECALL') {
		add(memorystored);
	} else {
		document.getElementById('memory').innerHTML = 'STORE';
		memorystored = '';
	}
}

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
	return ( !isNaN(string) || string=='.' );
}
function add(string) {
	if ( !inprogress && isoperator(string) ) { 
		passoutput();
		console.log('moving the result to input...');
	}
	inprogress = true;
	inputbox.value += string;
	console.log( string + ' inserted ' );
	autofontsize();
}
function remove() {
	inputbox.value = inputbox.value.slice(0, -1); inprogress = true;
	console.log('last character deleted, ' 
		+ 'calculation in progress: ' + inprogress );
	autofontsize();
}

function clearall() {
	inputbox.value = null;
	outputbox.innerHTML = null;
	inprogress = true;
	console.log('cleared everything, ' 
		+ 'calculation in progress: ' + inprogress );
	autofontsize();
}

function passoutput() {
	inputbox.value = outputbox.innerHTML;
	outputbox.innerHTML = null;
	inprogress = true;
	console.log('moving the result to input..., ' 
		+ 'calculation in progress: ' + inprogress );
	autofontsize();
}

 // listen to the keyboard input and insert text
document.addEventListener('keydown', event => {
	key = event.key;
	console.log("key pressed : " + key);
	if ( key == "Enter" ) { 
		calculate(); 
	} else if ( inputbox != document.activeElement ) {
		if ( !inprogress && isoperator(key) ) { passoutput(); }
		inprogress = true;
		switch (key) {
			case 'Backspace': case 'Delete':
				inputbox.value = inputbox.value.slice(0, -1); 
				console.log( 'last character deleted'); break;
			case '*': case 'x': case 'X':
				key = '×'; inputbox.value += key; 
				console.log( key + ' inserted ' ); break;
			case '^':
				key = '^('; inputbox.value += key; 
				console.log( key + ' inserted ' ); break;
			case '(': case '{': case '[': case '<': inputbox.value += '('; break;
			case ')': case '}': case ']': case '>': inputbox.value += ')'; break;
			case '0': case '1': case '2': case '3': case '4': case '5': case '6': 
			case '7': case '8': case '9': case ',': case '.': case 'e': case 'E':
			case '+': case '-': case '/': case '%': 
			case 's': case 'i': case 'n': case 'l': case 'o': case 'g': case 'c': 
			case 't': case 'a':
				inputbox.value += key; 
				console.log( key + ' inserted ' ); break;
			case 'A': case 'C': case 'G': case 'I': case 'L': case 'N': case 'O': 
			case 'S': case 'T':
				key = key.toLowerCase(); inputbox.value += key; 
				console.log( key + ' inserted ' ); break;
		}
	autofontsize();
	} else {
		inprogress = true;
	}
});
//---------------------------------------------------------------------------
// -----------------------------parse.js-------------------------------------
//---------------------------------------------------------------------------

angleconv = "(Math.PI/180)*";
angleconvinv = "(180/Math.PI)*";

function setangleunit(element) {
	if (element.innerHTML == 'DEG') {
		element.innerHTML = 'RAD';
		angleconv = ''; angleconvinv = '';
		if ( outputbox.innerHTML != '' ) { calculate(); }
	} else {
		element.innerHTML = 'DEG';
		angleconv = "(Math.PI/180)*"; angleconvinv = "(180/Math.PI)*";
		if ( outputbox.innerHTML != '' ) { calculate(); }
	}
}

function evalroot(string) {
	let value = string;
	while ( value.indexOf('√') != -1 ) {
		let rootindex = string.indexOf('√');
		let exponent; let exponented;
		let start = rootindex - 1 ; let end = rootindex + 1;
		let blockdue = 0;

		if ( iscloseparan( string[start] )) {
			blockdue = -1;
			while ((blockdue != 0) && (start != 0)) {
				if (isopenparan(string[start])) {
					blockdue += 1;
				} else if (iscloseparan(string[start])) {
					blockdue -= 1;
				}
				start -= 1;
			}
			exponent = 1/eval(string.slice(start, rootindex));
		} else if (isnumber(string[start])) {
			while (isnumber(string[start])) {
				start -= 1;
			}
			start += 1;
			exponent = 1/eval(string.slice(start, rootindex));
		} else {
			exponent = 1/2;
		}
		if ( isopenparan( string[end] )) {
			blockdue = 1;
			while ((blockdue != 0) && (end != value.length)) {
				if (isopenparan(string[end])) {
					blockdue += 1;
				} else if (iscloseparan(string[end])) {
					blockdue -= 1;
				}
				end += 1;
			}
			exponented = eval(string.slice( rootindex + 1 , end + 1 ));
		} else if (isnumber(string[end])) {
			while (isnumber(string[end])) {
				end += 1;
			}
			end -= 1;
			exponented = eval(string.slice(rootindex + 1, end + 1)); 
		}
		if (start = -1) {
			value = (exponented**exponent) + string.slice(end+1 , );
		} else {
			value = string.slice(0,start) + (exponented**exponent) + string.slice(end+1 , );
		}
		
		console.log('root extracted : ' + value + 'exponented: ' + exponented 
			+ 'exponent: ' + exponent);
	}
	return value;
}
// processed input
function parse(multi=false) {
	var inputstring = inputbox.value;
	var inputlength = inputstring.length;
	console.log("raw input expression: " + inputstring);

	inputstring = inputstring.replace(/×/g, '*').replace(/÷/g, '/').replace(
		/x/g, '*').replace(/X/g, '*').replace(/\^/g, '**').replace(
		/e/g, 'Math.E').replace(/π/gi, 'Math.PI').replace(
		/0E/g, '0e').replace(/1E/g, '1e').replace(/2E/g, '2e').replace(
		/3E/g, '3e').replace(/4E/g, '4e').replace(/5E/g, '5e').replace(
		/6E/g, '6e').replace(/7E/g, '7e').replace(/8E/g, '8e').replace(
		/9E/g, '9e').replace(/log/gi, 'Math.log10').replace(
		/ln/gi, 'Math.log').replace(/sin\(/gi, 'Math.sin(' + angleconv).replace(
		/cos\(/gi, 'Math.cos(' + angleconv).replace(
		/tan\(/gi, 'Math.tan(' + angleconv).replace(
		/sin⁻¹\(/gi, angleconvinv + 'Math.asin(').replace(
		/cos⁻¹\(/gi, angleconvinv + 'Math.acos(').replace(
		/tan⁻¹\(/gi, angleconvinv + 'Math.atan(');

	inputstring = evalroot(inputstring);

	if (multi) { 
		let inputlist = inputstring.split(",");
		console.log('interpreted input expression: ' + inputlist);
		return inputlist;
	} else { 
		console.log('interpreted input expression: ' + inputstring);
		return inputstring;
	}
}
//---------------------------------------------------------------------------
// -----------------------------ouput.js-------------------------------------
//---------------------------------------------------------------------------

outputformat = 'DECI';

function changerep(element) {
    if (element.innerHTML == 'DECI') {
        element.innerHTML = 'SCI';
        outputformat = 'SCI';
        if ( outputbox.innerHTML != '' ) { calculate(); }
    } else {
        element.innerHTML = 'DECI';
        outputformat = 'DECI';
        if ( outputbox.innerHTML != '' ) { calculate(); }
    }
}

// simple expression evaluation
function calculate() { 
	let inputs = parse(); let output;
	try { output = eval(inputs); 
	} catch(error) { output = error; }
	printoutput(output);
}

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
function istoolong(string, length) {
	string = string.replace(/\./g, '');
	eindex = string.indexOf('E');
	if ( eindex != -1 ) {
		string = string.slice(0, eindex);
	}
	console.log('string: ' + string);
	return string.length > length;
}
        
// processed output
function printoutput(number, unit=null) {
    console.log( 'evaluation : ' + number + ' ' + unit);
    if (isNaN(number)) { 
        outputbox.innerHTML = 'invalid input :(';
    } else if ( typeof(number) != "number" ) { 
        outputbox.innerHTML = "error: " + number.message;
	} else {
        console.log('raw output: ' + number);
        console.log('number length: ' + number.toString().length 
            + ' is integer: ' + Number.isInteger(number));
	    if (number.toString().length > 10) { 
            number = number.toPrecision(10);
        }
        console.log('precised output: ' + number);
        if ( outputformat == 'DECI') {
            number = Number(number).toString();
            number = String(number).replace(/e/g, 'E');
            console.log('decimal output: ' + number);
        }
        if ((outputformat == 'SCI') || istoolong(number, 10)) {
            number = Number(number).toExponential();
            number = String(number).replace(/e/g, 'E');
            console.log('exponential output: ' + number);
        }
        outputbox.innerHTML = number;
        inprogress = false;
        console.log('calculation in progress: ' + inprogress );
    }
}
//---------------------------------------------------------------------------
// -----------------------------loadpref.js----------------------------------
//---------------------------------------------------------------------------
// ( async () => {

// 	let temp = await fetch('./data/pref.json');
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

// 	// let buttons = document.getElementsByTagName('BUTTON');
// 	// let button;
// 	// for (i = 0; i < buttons.length; i++ ) {
// 	// 	button = buttons[i];
// 	// 	button.style.fontSize = (2*button.innerHTML.length**(-1/3)) + 'em';
// 	// }
// })();

// let tempelem = window.getComputedStyle(document.getElementsByTagName("BODY")[0]);
// let tempcolor = tempelem.getPropertyValue('background-color');
// document.getElementsByName('theme-color').content = 'tempcolor';


// function func(element) {
// 	let operation = element.innerHTML;
// 	console.log("computation requested: " + operation);
// 	var inputlist = readinput(multi=true);
// 	let x; let y; let z;
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


// // unit conversions
// function convert(element) {
// 	let operation = element.innerHTML;
// 	console.log("conversion requested: " + operation);
// 	var inputvalue = readinput();
// 	switch (operation) {
// 		// area
// 		case "mi² ▸ km²": printoutput(2.58999*inputvalue, 'km²'); break;
// 		case "km² ▸ mi²": printoutput(2.58999*inputvalue, 'mile²'); break;
// 		case "in² ▸ cm²": printoutput(6.4516*inputvalue, 'cm²'); break;
// 		case "cm² ▸ in²": printoutput(0.1550*inputvalue, 'inch²'); break;
// 		// length
// 		case 'in ▸ cm': printoutput(2.54*inputvalue, 'cm'); break;
// 		case "cm ▸ in": printoutput(inputvalue*0.3937, 'inch'); break;
// 		case "ft ▸ m": printoutput(0.3048*inputvalue, 'm'); break;
// 		case "m ▸ ft": printoutput(inputvalue*3.2808, 'ft'); break;
// 		case "mi ▸ km": printoutput(inputvalue*1.60934, 'km'); break;
// 		case "km ▸ mi": printoutput(inputvalue*0.621371, 'mile'); break;
// 		// energy
// 		case "kcal ▸ kJ": printoutput(4.184*inputvalue, 'kJ'); break;
// 		case "kJ ▸ kcal": printoutput(0.2390*inputvalue, 'kcal'); break;
// 		case "kWh ▸ kJ": printoutput(3600*inputvalue, 'kJ'); break;
// 		case "kJ ▸ kWh": printoutput(inputvalue/3600, 'kWh'); break;
// 		// mass
// 		case "lb ▸ kg": printoutput(0.453592*inputvalue, 'kg'); break;
// 		case "kg ▸ lb": printoutput(inputvalue*2.2090, 'lb'); break;
// 		case "ou ▸ kg": printoutput(inputvalue/35.274, 'kg'); break;
// 		case "kg ▸ ou": printoutput(inputvalue*35.274, 'ounce'); break;
// 		// pressure
// 		case "kPa ▸ atm": printoutput(inputvalue/101.325, 'atm'); break;
// 		case "atm ▸ kPa": printoutput(inputvalue*101.325, 'kPa'); break;
// 		case "psi ▸ atm": printoutput(inputvalue/14.696, 'atm'); break;
// 		case "atm ▸ psi": printoutput(inputvalue*14.696, 'psi'); break;
// 		case "bar ▸ atm": printoutput(inputvalue/1.013, 'atm'); break;
// 		case "atm ▸ bar": printoutput(inputvalue*1.013, 'bar'); break;
// 		case "torr ▸ atm": printoutput(inputvalue/760, 'atm'); break;
// 		case "atm ▸ torr": printoutput(inputvalue*760, 'torr'); break;
// 		// temperature
// 		case "ᵒF ▸ ᵒC":	printoutput((inputvalue-32)*(5/9), 'ᵒC'); break;
// 		case "ᵒC ▸ ᵒF":	printoutput((inputvalue*(9/5) + 32), 'ᵒF'); break;
// 	}
// }
// // currency conversions
// function currency(element) {
// 	let operation = element.innerHTML;
// 	console.log("conversion requested: " + operation);
// 	let base = operation.slice(0, 3); let target = operation.slice(6, 9);
// 	var inputvalue = readinput();
// 	let baseurl = "https://api.exchangeratesapi.io/latest?";
// 	let basecurr = "base=" + base;
// 	let targetcurr = "&symbols=" + target;
// 	printoutput("loading...");
// 	(async () => {
// 		let response = await fetch( baseurl + basecurr + targetcurr );
// 		let data = await response.json();
// 		printoutput(inputvalue*data["rates"][target], target);
// 	})();
// }

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
// 	let timezone = element.innerHTML;
// 	console.log("time requested: " + timezone);
// 	printoutput("loading...");
// 	(async () => {
// 		let response = await fetch("https://worldtimeapi.org/api/timezone/Asia/Kolkata");
// 		let data = await response.json();
// 		await gettime12hr(data.datetime, 0, 0);
// 	})();
// }