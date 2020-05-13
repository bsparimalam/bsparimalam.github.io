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
