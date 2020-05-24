userprefversion = "v1";
app = document.getElementsByTagName('BODY');
convtypes = document.getElementById('convtypes');
convfroms = document.getElementById('convfroms');
convtos = document.getElementById('convtos');
angleunit = document.getElementById('angleunit');
numrep = document.getElementById('representation');
memory = document.getElementById('memory');
more = document.getElementById('more');
memorystored = null;
convdata = [
	['conversion', []
	],
	['area', [ 'km²', 'hect', 'm²', 'cm²', 'mm²', 'inch²', 'ft²', 
			'yd²',  'acre', 'mile²' ],
			['1E+6', '1E+4', '1', '1E-4', '1E-6', '(1/1550)', '(1/10.7639)',  
			'(1/1.19599)', '4046.86', '2.56E+6'	]
	],
	['currency', [
		'AUD', 'BGN', 'BRL', 'CAD', 'CHF', 'CNY', 'CZK', 'DKK', 'GBP', 'HKD', 
		'HRK', 'HUF', 'IDR', 'ILS', 'INR', 'ISK', 'JPY', 'KRW', 'MXN', 'MYR', 
		'NOK', 'NZD', 'PHP', 'PLN', 'RON', 'RUB', 'SEK', 'SGD', 'THB', 'TRY', 
		'USD', 'ZAR']
	],
	['energy', [ 'kWh', 'Wh', 'kJ', 'J', 'eV', 'keV', 
				'cal', 'kcal', 'BTU' ],
				[ '3.6e+6', '3.6E+3', '1E+3', '1', '1.6022e-19', '1.6022e-16',
				'4.184', '4184', '1055.071288087' ]
	],
	['length', [ 'km', 'm', 'cm', 'mm', 'inch', 'ft', 
				'yard', 'mile'],
			['1E+3', '1', '1E-2', '1E-3', '(1/39.3701)', '(1/3.28084)',
			'(1/1.09361)', ' 1609.34' ]
	],
	['mass', ['ton', 'kg', 'g', 'oz', 'lb'],
			['1E+6', '1E+3', '1', '28.3495', '453.592']
	],
	['pressure', [ 'bar', 'Pa', 'torr', 'psi', 
				'atm'],
				[ '1E+5', '1', '133.322', '6894.73824140665', 
				'101324.72001876002469' ]
	],
	['temperature', [ 'ᵒF', 'K', 'ᵒC' ],
					[ '-32)*(5/9)+273.15', ')', '+ 273.15)' ],
					[ '-273.15)*(9/5)+32', ')', '- 273.15)' ]
	],
	['volume', [ 'm³', 'L', 'mL', 'tsp', 'tbs', 'cup', 
				'oz', 'qt', 'gal'  ],
				['1E+3', '1', '1E-3', '4.92892E-3', '(1/67.628)', '0.24', 
				'(1/33.814)', '0.946352499983857', '3.7854092439887' ]
	]
] // conversion factors/forumulas

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
	angleunit.innerHTML = userpref.angleunit;
	numrep.innerHTML = userpref.representation;
	memorystored = userpref.memory;
	if (userpref.lastinput != '') {
		document.getElementById('ip').value = userpref.lastinput;
	}
	if (userpref.openmore !== more.innerHTML) {
		openmore();
	}
	if ( memorystored == null ) {
		memory.innerHTML = 'STORE';
	} else {
		memory.innerHTML = 'RECALL';
	}
	for (var i = 0; (i < 8) && (i < userpref.conversionlog.length ); i++) {
		var prefbutton = document.getElementById('pref'+i);
		prefbutton.style.margin = '0';
		prefbutton.style.borderStyle = 'none';
		prefbutton.style.borderRadius = '0';
		prefbutton.style.width = '100%';
		prefbutton.style.height = '100%';
		prefbutton.innerHTML = userpref.conversionlog[i].operation;
		prefbutton.convtype = userpref.conversionlog[i].type;
		prefbutton.name = userpref.conversionlog[i].type;
	}
}
function saveuserpref() {
	window.localStorage.setItem("userpref" + userprefversion, 
		JSON.stringify(userpref));
}
userpref = JSON.parse(window.localStorage.getItem("userpref" + userprefversion));
if (userpref == null) { 
	userpref = {
		'openmore':'⠇',
		'lastinput': '',
		'angleunit': 'DEG',
		'representation': 'DECI',
		'memory': null,
		'conversionlog': []
	}
} else {
	loaduserpref();
} // load user preferred conversions

function setangleunit() {
	if (angleunit.innerHTML == 'DEG') {
		angleunit.innerHTML = 'RAD';
	} else {
		angleunit.innerHTML = 'DEG'
	}
	userpref.angleunit = angleunit.innerHTML;
	saveuserpref();
	if (outputbox.read() != '') {
		calculate(lasttype, lastoperation);
	}
	console.log('angle unit set to: ' + angleunit.innerHTML);
} // sets the preferred angle unit
function setnumrep() {
    if (numrep.innerHTML == 'DECI') { numrep.innerHTML = 'SCI';
    } else { numrep.innerHTML = 'DECI'; }
	userpref.representation = numrep.innerHTML;
	saveuserpref();
	if (outputbox.read() != '') {
		calculate(lasttype, lastoperation);
	}
    console.log('number representation set to: ' + numrep.innerHTML);
} // sets the preferred number representation format
function setmemory(element) {
	if ( element.innerHTML == 'STORE' ) { 
		element.innerHTML = 'RECALL';
		memorystored = lasteval;
		userpref.memory = lasteval;
		saveuserpref();
		console.log( memorystored + ' stored in memeory ');
	} else if (element.innerHTML == 'RECALL') {
		inputbox.addastring(memorystored);
		console.log( memorystored + ' recalled from memory ');
	} else {
		memory.innerHTML = 'STORE';
		memorystored = null;
		userpref.memory = null;
		saveuserpref();
		console.log( memorystored + ' erased from memory ');
	}
} // stores a number to memory
function openmore() {
	var status = more.innerHTML;
	if ( status == '⠇' ) {
		app[0].style.gridTemplateRows = '30% 0% 25% 45%';
		more.innerHTML = '···';
		userpref.openmore = '···';
		saveuserpref();
	} else {
		app[0].style.gridTemplateRows = '30% 25% 0% 45%';
		more.innerHTML = '⠇';
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