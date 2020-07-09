storagename = 'calculator.1.0';
app = document.getElementsByTagName('BODY');
convtypes = document.getElementById('convtypes');
convfroms = document.getElementById('convfroms');
convtos = document.getElementById('convtos');
angleunit = document.getElementById('angleunit');
numrep = document.getElementById('representation');
memory = document.getElementById('memory');
more = document.getElementById('more');
memorystored = '';
angleunitwarned = false;
convdata = [
	['conversion', []
	],
	['area', [ 'km²', 'hect', 'm²', 'cm²', 'mm²', 'inch²', 'ft²', 'yd²',  'acre', 'mile²' ],
			['1E+6', '1E+4', '1', '1E-4', '1E-6', '(1/1550)', '(1/10.7639)',  '(1/1.19599)', '4046.86', '2.56E+6']
	],
	['energy', [ 'kWh', 'Wh', 'kJ', 'J', 'eV', 'keV', 'cal', 'kcal', 'BTU' ],
				[ '3.6e+6', '3.6E+3', '1E+3', '1', '1.6022e-19', '1.6022e-16', '4.184', '4184', '1055.071288087' ]
	],
	['length', [ 'km', 'm', 'cm', 'mm', 'inch', 'ft', 'yard', 'mile'],
			['1E+3', '1', '1E-2', '1E-3', '(1/39.3701)', '(1/3.28084)',	'(1/1.09361)', ' 1609.34' ]
	],
	['mass', ['ton', 'kg', 'g', 'oz', 'lb'],
			['1E+6', '1E+3', '1', '28.3495', '453.592']
	],
	['pressure', [ 'bar', 'Pa', 'torr', 'psi', 'atm'],
				[ '1E+5', '1', '133.322', '6894.73824140665', '101324.72001876002469' ]
	],
	['storage', ['Kb', 'Mb', 'Gb', 'Tb', 'Pb', 'KB', 'MB', 'GB', 'TB', 'PB', 'Kib', 'Mib', 'Gib', 'Tib', 'Pib', 'KiB', 'MiB', 'GiB', 'TiB', 'PiB' ],
		['1E-6', '1E-3', '1', '1E+3', '1E+6', '8E-6', '8E-3', '8', '8E+3', '8E+6', '1.024E-6', '1.0482E-3', '1.074', '1.1E+2', '1.126E+6', '8.192E-6', '8.38863E-3', '8.59', '8.796E+3', '9.007E+6' ]
	],
	['temperature', [ 'ᵒF', 'K', 'ᵒC' ],
					[ '-32)*(5/9)+273.15', ')', '+ 273.15)' ],
					[ '-273.15)*(9/5)+32', ')', '- 273.15)' ]
	],
	['volume', [ 'm³', 'L', 'mL', 'tsp', 'tbs', 'cup', 'oz', 'qt', 'gal'  ],
				['1E+3', '1', '1E-3', '4.92892E-3', '(1/67.628)', '0.24', '(1/33.814)', '0.946352499983857', '3.7854092439887' ]
	]
]

function setconvblank() {
	var opt1 = document.createElement('option');
	var opt2 = document.createElement('option');
	opt1.textContent = 'from';
	opt1.name = 'empty'
	opt2.textContent = 'to';
	opt2.name = 'empty';
	convfroms.appendChild(opt1);
	convtos.appendChild(opt2);
}

for (var i=0; i < convdata.length; i++) {
	var opt = document.createElement('option');
	opt.textContent = convdata[i][0];
	convtypes.appendChild(opt);
}
setconvblank();
console.log('conversions loaded');
// insert all conversion types from convdata to the app

function loaduserpref() {
	angleunit.innerText = userpref.angleunit;
	numrep.innerText = userpref.representation;
	memorystored = userpref.memory;
	if (userpref.lastinput != '') {
		document.getElementById('ip').value = userpref.lastinput;
	}
	if (userpref.openmore !== more.innerText) {
		openmore();
	}
	if ( memorystored === '' ) {
		memory.innerText = 'STORE';
	} else {
		memory.innerText = 'RECALL';
	}
	for (var i = 0; (i < 8) && (i < userpref.conversionlog.length ); i++) {
		var prefbutton = document.getElementById('pref'+i);
		prefbutton.style.margin = '0';
		prefbutton.style.borderStyle = 'none';
		prefbutton.style.borderRadius = '0';
		prefbutton.style.width = '100%';
		prefbutton.style.height = '100%';
		prefbutton.innerText = userpref.conversionlog[i].operation;
		prefbutton.convtype = userpref.conversionlog[i].type;
		prefbutton.name = userpref.conversionlog[i].type;
	}
}
function saveuserpref() {
	window.localStorage.setItem(storagename, JSON.stringify(userpref));
}
userpref = JSON.parse(window.localStorage.getItem(storagename));
if (userpref == null) { 
	userpref = {
		'openmore':'⠇',
		'lastinput': '',
		'angleunit': 'DEG',
		'representation': 'DECI',
		'memory': '',
		'conversionlog': []
	}
} else {
	loaduserpref();
} // load user preferred conversions

function setangleunit() {
	if (angleunit.innerText === 'DEG') {
		angleunit.innerText = 'RAD';
	} else {
		angleunit.innerText = 'DEG'
	}
	userpref.angleunit = angleunit.innerText;
	saveuserpref();
	if ((outputbox.read() !== '') && (inputbox.read() !== '')) {
		calculate(lasttype, lastoperation);
	}
	console.log('angle unit set to: ' + angleunit.innerText);
} // sets the preferred angle unit
function warnangleunit() {
	if (!angleunitwarned) {
		var loops = 3; var interval = 500; 
		var currentunit = angleunit.innerText;
		for (var i = 0; i < loops; i++ ) {
			setTimeout(() => {
				angleunit.style.backgroundColor = 'var(--warning)'; 
			}, (2*i+1)*interval);
			setTimeout(() => {
				angleunit.style.backgroundColor = 'var(--bg-color-3)';
			}, (2*i+2)*interval);
		}
		angleunitwarned = true;	
	}
}
function setnumrep() {
    if (numrep.innerText == 'DECI') { 
    	numrep.innerText = 'SCI';
    } else { 
    	numrep.innerText = 'DECI'; 
    }
	userpref.representation = numrep.innerText;
	saveuserpref();
	if (outputbox.read() != '') {
		calculate(lasttype, lastoperation);
	}
    console.log('number representation set to: ' + numrep.innerText);
} // sets the preferred number representation format
function setmemory(element) {
	if ( element.innerText == 'STORE' ) { 
		element.innerText = 'RECALL';
		memorystored = lasteval;
		userpref.memory = lasteval;
		saveuserpref();
		console.log( memorystored + ' stored in memeory ');
	} else if (element.innerText == 'RECALL') {
		inputbox.addastring(memorystored);
		console.log( memorystored + ' recalled from memory ');
	} else {
		memory.innerText = 'STORE';
		memorystored = '';
		userpref.memory = '';
		saveuserpref();
		console.log( memorystored + ' erased from memory ');
	}
} // stores a number to memory
function openmore() {
	var status = more.innerText;
	if ( status == '⠇' ) {
		document.getElementById('convs').style.display = 'grid';
		document.getElementById('scis').style.display = 'none';
		more.innerText = '···';
		userpref.openmore = '···';
		saveuserpref();
	} else {
		document.getElementById('convs').style.display = 'none';
		document.getElementById('scis').style.display = 'grid';
		more.innerText = '⠇';
		userpref.openmore = '⠇';
		saveuserpref();
	}
} // toggles between scientific functions and conversions

function setconvtype(element) {
	convfroms.innerHTML = ''; convtos.innerHTML = '';
	var chosentype = element.value;
	var typeindex = 0;
	var convlen = convdata[typeindex].length;
	while (chosentype != convdata[typeindex][0]) {
		typeindex++;
	}
	setconvblank();
	for (var i=0; i < convdata[typeindex][1].length; i++) {
		var opt1 = document.createElement('option');
		var opt2 = document.createElement('option');
		opt1.textContent = convdata[typeindex][1][i];
		opt1.name = convdata[typeindex][1][i];
		opt2.textContent = convdata[typeindex][1][i];
		opt2.name = convdata[typeindex][1][i];
		convfroms.appendChild(opt1);
		convtos.appendChild(opt2);
	}
	console.log( chosentype + ' loaded ' );
} // loads various conversion types