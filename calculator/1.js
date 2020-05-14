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
		if ((more.innerHTML == '⠇' )||(convtypes.value == '-conversions-')) {
			calculate('simple');
		} else {
			calculate(convtypes.value, convfroms.value + ' ▸ ' + convtos.value);
		}
	}
	console.log('angle unit set to: ' + angleunit.innerHTML);
} // sets the preferred angle unit
function setnumrep() {
    if (numrep.innerHTML == 'DECI') { numrep.innerHTML = 'SCI';
    } else { numrep.innerHTML = 'DECI'; }
	if (outputbox.read() != '') {
		if ((more.innerHTML == '⠇' )||(convtypes.value == '-conversions-')) {
			calculate('simple');
		} else {
			calculate(convtypes.value, convfroms.value + ' ▸ ' + convtos.value);
		}
	}
    console.log('number representation set to: ' + numrep.innerHTML);
} // sets the preferred number representation format
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
} // stores a number to memory
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
		opt1.name = convdata[typeindex][1][i];
		opt2.textContent = convdata[typeindex][1][convdatalength-1-i];
		opt2.name = convdata[typeindex][1][convdatalength-1-i];
		convfroms.appendChild(opt1);
		convtos.appendChild(opt2);
	}
	console.log( chosentype + ' loaded ' );
} // loads various conversion types
function openmore() {
	var status = more.innerHTML;
	if ( status == '⠇' ) {
		app[0].style.gridTemplateRows = '30% 0% 25% 45%';
		more.innerHTML = '↶';
	} else {
		app[0].style.gridTemplateRows = '30% 25% 0% 45%';
		more.innerHTML = '⠇';
	}
} // toggles between scientific functions and conversions