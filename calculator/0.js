convtypes = document.getElementById('convtypes');
convfroms = document.getElementById('convfroms');
convtos = document.getElementById('convtos');
convdata = [
	['-conversions-', ['-from-', '-to-']
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
for (let i=0; i < convdata.length; i++) {
var opt = document.createElement('option');
opt.textContent = convdata[i][0];
convtypes.appendChild(opt);
} // insert all conversion types from convdata to the app
var convdatalength = convdata[0][1].length;
for (let i=0; i < convdatalength; i++) {
	var opt1 = document.createElement('option');
	var opt2 = document.createElement('option');
	opt1.textContent = convdata[0][1][i];
	opt2.textContent = convdata[0][1][convdatalength-1-i];
	convfroms.appendChild(opt1);
	convtos.appendChild(opt2);
} // conversions loaded
console.log('conversions loaded');

function loadprefs(){
	for (var i = 0; (i < 8) && (i < prefs.length ); i++) {
		var prefbutton = document.getElementById('pref'+i);
		prefbutton.innerHTML = prefs[i].operation;
		prefbutton.convtype = prefs[i].type;
		prefbutton.name = prefs[i].type;
	}
}
prefs = JSON.parse(window.localStorage.getItem("prefs"));
if (prefs == null) { 
	prefs = [{
		operation: null,
		usecount: 0,
		type: null,
	}]; 
} else {
	loadprefs();
} // load user preferred conversions