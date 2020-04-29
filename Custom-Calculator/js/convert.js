
// unit conversions
function convert(operation) {
	var inputvalue = readinput();
	switch (operation) {
		// area
		case "sqmile2sqkm": printoutput(2.58999*inputvalue, 'km²'); break;
		case "sqkm2sqmile": printoutput(2.58999*inputvalue, 'mile²'); break;
		case "sqinch2sqcm": printoutput(6.4516*inputvalue, 'cm²'); break;
		case "sqcm2sqinch": printoutput(0.1550*inputvalue, 'inch²'); break;
		// length
		case "inch2cm": printoutput(2.54*inputvalue, 'cm'); break;
		case "cm2inch": printoutput(inputvalue*0.3937, 'inch'); break;
		case "ft2m": printoutput(0.3048*inputvalue, 'm'); break;
		case "m2ft": printoutput(inputvalue*3.2808, 'ft'); break;
		case "mile2km": printoutput(inputvalue*1.60934, 'km'); break;
		case "km2mile": printoutput(inputvalue*0.621371, 'mile'); break;
		// energy
		case "kcal2kj": printoutput(4.184*inputvalue, 'kJ'); break;
		case "kj2kcal": printoutput(0.2390*inputvalue, 'kcal'); break;
		case "kwh2kj": printoutput(3600*inputvalue, 'kJ'); break;
		case "kj2kwh": printoutput(inputvalue/3600, 'kWh'); break;
		// mass
		case "lb2kg": printoutput(0.453592*inputvalue, 'kg'); break;
		case "kg2lb": printoutput(inputvalue*2.2090, 'lb'); break;
		case "ounce2kg": printoutput(inputvalue/35.274, 'kg'); break;
		case "kg2ounce": printoutput(inputvalue*35.274, 'ounce'); break;
		// pressure
		case "kPa2atm": printoutput(inputvalue/101.325, 'atm'); break;
		case "atm2kPa": printoutput(inputvalue*101.325, 'kPa'); break;
		case "psi2atm": printoutput(inputvalue/14.696, 'atm'); break;
		case "atm2psi": printoutput(inputvalue*14.696, 'psi'); break;
		case "bar2atm": printoutput(inputvalue/1.013, 'atm'); break;
		case "atm2bar": printoutput(inputvalue*1.013, 'bar'); break;
		case "torr2atm": printoutput(inputvalue/760, 'atm'); break;
		case "atm2torr": printoutput(inputvalue*760, 'torr'); break;
		// temperature
		case "fah2cel":	printoutput((inputvalue-32)*(5/9), 'ᵒC'); break;
		case "cel2fah":	printoutput((inputvalue*(9/5) + 32), 'ᵒF'); break;
	}
}
// currency conversions
function currency(base, target) {
	var inputvalue = readinput();
	let baseurl = "https://api.exchangeratesapi.io/latest?";
	let basecurr = "base=" + base;
	let targetcurr = "&symbols=" + target;
	printoutput("loading...");
	(async () => {
		let response = await fetch(baseurl+basecurr+targetcurr);
		if (response.ok) {
			let data = await response.json();
			printoutput(inputvalue*data.rates.target, target);
		} else { printoutput("xchange rate fetch failed") }
	});
}


//time conversions
function gettime12hr(dateandtime, hr, mn) {
	var raw = dateandtime
	var tindex = raw.indexOf("T")
	var hour = Number(raw.slice(tindex+1, tindex+3))
	var min = Number(raw.slice(tindex+4, tindex+6))
	console.log(dateandtime, raw, hour, min, hr, mn)
	hour = hour + hr; min = min + mn;

	if ( min > 59 ) { min = min -60; hour = hour + 1;
	} else if (min < 0 ) { min = min + 60; hour = hour - 1;
	} else { min = min; }

	if (hour < 0 ) { hour = hour + 12; period = "PM";
	} else if (hour > 11 ) { hour = hour - 12; period = "PM";
	} else { period = "AM";
	}
	if (hour == 0 ) { hour = 12; }
	if (String(min).length < 2 ) { min = "0" + min; }
	return hour + ":" + min + period;
}

function times() {

	document.getElementById('y').value = "loading...";

	(async () => {
		let url4 = "https://worldtimeapi.org/api/timezone/America/New_York";
		let estraw = await fetch(url4);
		if (estraw.ok) {
			let estdt = await estraw.json();
			let est = await gettime12hr(estdt.datetime, 0, 0);
			estoutput = est + "-EST";
		} else { estoutput = "EST fetch failed" }

		let url5 = "https://worldtimeapi.org/api/timezone/Asia/Kolkata";
		let istraw = await fetch(url5);
		if (istraw.ok) {
			let istdt = await istraw.json();
			let ist = await gettime12hr(istdt.datetime, 0, 0);
			istoutput = ist + "-IST";
		} else { istoutput = "IST fetch failed"}

	document.getElementById('y').value = estoutput + "; " + istoutput;

	})();

}