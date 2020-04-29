
//time generator
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