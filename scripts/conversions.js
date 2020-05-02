
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