
//time generator

function gettime12hr(dateandtime, hr, mn) {
	var raw = dateandtime
	var tindex = raw.indexOf("T")
	var hour = Number(raw.slice(tindex+1, tindex+3))
	var min = Number(raw.slice(tindex+4, tindex+6))
	console.log(dateandtime, raw, hour, min, hr, mn)
	hour = hour + hr;
	min = min + mn;

	if ( min > 59 ) { 
		min = min -60;
		hour = hour + 1;
	} else if (min < 0 ) {
		min = min + 60;
		hour = hour - 1;
	} else {
		min = min;
	}

	if (hour < 0 ) {
		hour = hour + 12;
		period = "PM";
	} else if (hour > 11 ) { 
		hour = hour - 12;
		period = "PM";
	} else { 
		period = "AM";
	}
	if (hour == 0 ) { hour = 12; }
	return hour + ":" + min + period;
}

// Calculator functions
function sum() {
	var x = +document.getElementById('x').value;
	var y = +document.getElementById('y').value;
	document.getElementById('x').value = x;
	document.getElementById('y').value = y;
	document.getElementById('z').value = x + y;
}
function subration() {
	var x = +document.getElementById('x').value;
	var y = +document.getElementById('y').value;
	document.getElementById('x').value = x;
	document.getElementById('y').value = y;
	document.getElementById('z').value = x - y;

}
function multiplication() {
	var x = +document.getElementById('x').value;
	var y = +document.getElementById('y').value;
	document.getElementById('x').value = x;
	document.getElementById('y').value = y;
	document.getElementById('z').value = x * y;

};
function division() {
	var x = +document.getElementById('x').value;
	var y = +document.getElementById('y').value;
	document.getElementById('x').value = x;
	document.getElementById('y').value = y;
	z = x / y;
	if (String(z).length > 9) {
		document.getElementById('z').value = z.toExponential(10);
	} else {
		document.getElementById('z').value = z;
	};
};
function in2mm() {
	var x = +document.getElementById('x').value;
	document.getElementById('x').value = x;
	document.getElementById('y').value = null;
	document.getElementById('z').value = 25.4*(x) + " mm";
};
function ft2m() {
	var x = +document.getElementById('x').value;
	document.getElementById('x').value = x;
	document.getElementById('y').value = null;
	document.getElementById('z').value = 0.3048*(x) + " m";

}
function lb2kg() {
	var x = +document.getElementById('x').value;
	document.getElementById('x').value = x;
	document.getElementById('y').value = null;
	document.getElementById('z').value =0.453592*(x) + " kg" ;
}
function f2c() {
	var x = +document.getElementById('x').value;
	document.getElementById('x').value = x;
	document.getElementById('y').value = null;
	z = ((x)-32)*(5/9);
	document.getElementById('z').value = z.toFixed(2) + " ℃";
}
function mm2in() {
	var x = +document.getElementById('x').value;
	document.getElementById('x').value = x;
	document.getElementById('y').value = null;
	document.getElementById('z').value = (x)*0.03937 + " inch";
}
function m2ft() {
	var x = +document.getElementById('x').value;
	document.getElementById('x').value = x;
	document.getElementById('y').value = null;
	document.getElementById('z').value = (x)*3.2808 + " ft";
}
function kg2lb() {
	var x = +document.getElementById('x').value;
	document.getElementById('x').value = x;
	document.getElementById('y').value = null;
	document.getElementById('z').value = (x)*2.2090 + " lb";
}
function c2f() {
	var x = +document.getElementById('x').value;
	document.getElementById('x').value = x;
	document.getElementById('y').value = null;
	document.getElementById('z').value = ((x)*9/5 + 32).toFixed(2) + " ℉" ;
}
function usd() {
	var x = +document.getElementById('x').value;
	document.getElementById('x').value = x;
	document.getElementById('y').value = null;
	fetch("https://api.exchangeratesapi.io/latest?base=USD&symbols=CAD,INR")
		.then(function(exchangerate) {
			if (exchangerate.status == 200) {
				exchangerate.json().then(function(data) {
					candol = (x*data.rates.CAD).toFixed(2);
					indrup = (x*data.rates.INR).toFixed(2);
					document.getElementById('z').value = candol + " C$, " + indrup + " ₹";
				});
			} else {
				document.getElementById('z').value = "xchange rate fetch failed";
			}
		});
}
function cad() {
	var x = +document.getElementById('x').value;
	document.getElementById('x').value = x;
	document.getElementById('y').value = null;
	fetch("https://api.exchangeratesapi.io/latest?base=CAD&symbols=USD,INR")
		.then(function(exchangerate) {
			if (exchangerate.status == 200) {
				exchangerate.json().then(function(data) {
					amdol = (x*data.rates.USD).toFixed(2);
					indrup = (x*data.rates.INR).toFixed(2);
					document.getElementById('z').value = amdol + " $, " + indrup + " ₹";
				});
			} else {
				document.getElementById('z').value = "xchange rate fetch failed";
			}
		});
}	
function inr() {
	var x = +document.getElementById('x').value;
	document.getElementById('x').value = x;
	document.getElementById('y').value = null;
	fetch("https://api.exchangeratesapi.io/latest?base=INR&symbols=USD,CAD")
		.then(function(exchangerate) {
			if (exchangerate.status == 200) {
				exchangerate.json().then(function(data) {
					amdol = (x*data.rates.USD).toFixed(2);
					candol = (x*data.rates.CAD).toFixed(2);
					document.getElementById('z').value = amdol + " $, " + candol + " C$";
				});
			} else {
				document.getElementById('z').value = "xchange rate fetch failed";
			}
		});
	document.getElementById('z').value = "xchange rate fetch failed";
}
function times() {

	(async () => {
		let estraw = await fetch("https://worldtimeapi.org/api/timezone/America/New_York");
		if (estraw.ok) {
			let estdt = await estraw.json();
			let est = await gettime12hr(estdt.datetime, 0, 0);
			estoutput = est + "-EST";
		} else { estoutput = "EST fetch failed" }
		document.getElementById('x').type = "text";
		document.getElementById('x').value = estoutput;
	})();
	(async () => {
		let pstraw = await fetch("https://worldtimeapi.org/api/timezone/America/Vancouver");
		if (pstraw.ok) {
			let pstdt = await pstraw.json();
			let pst = await gettime12hr(pstdt.datetime, 0, 0);
			pstoutput = pst + "-PST";
		} else { pstoutput = "PST fetch failed"}
		document.getElementById('y').type = "text";
		document.getElementById('y').value = pstoutput;
	})();
	(async () => {
		let istraw = await fetch("https://worldtimeapi.org/api/timezone/Asia/Kolkata");
		if (istraw.ok) {
			let istdt = await istraw.json();
			let ist = await gettime12hr(istdt.datetime, 0, 0);
			istoutput = ist + "-IST";
		} else { istoutput = "IST fetch failed"}
		document.getElementById('z').value = istoutput;
	})();

}
function invert() {
	var x = +document.getElementById('x').value;
	document.getElementById('x').value = x;
	document.getElementById('y').value = null;
	z = 1/x;
	if (String(z).length > 9) {
		document.getElementById('z').value = z.toExponential(10);
	} else {
		document.getElementById('z').value = z;
	};
}
function factorial() {
	var x = +document.getElementById('x').value;
	document.getElementById('x').value = x;
	document.getElementById('y').value = null;
	var z = 1;
	var i;
	for ( i = 1; i <= (x); i++ ){
		z = z*i
	}
	if (String(z).length > 9) {
		document.getElementById('z').value = z.toExponential(10);
	} else {
		document.getElementById('z').value = z;
	};
}
function exponent() {
	var x = +document.getElementById('x').value;
	var y = +document.getElementById('y').value;
	document.getElementById('x').value = x;
	document.getElementById('y').value = y;
	z = x**y;
	if (String(z).length > 9) {
		document.getElementById('z').value = z.toExponential(10);
	} else {
		document.getElementById('z').value = z;
	};
}
function root() {
	var x = +document.getElementById('x').value;
	var y = +document.getElementById('y').value;
	document.getElementById('x').value = x;
	document.getElementById('y').value = y;
	z = x**(1/y);
	if (String(z).length > 9) {
		document.getElementById('z').value = z.toExponential(10);
	} else {
		document.getElementById('z').value = z;
	};
}
function log() {
	var x = +document.getElementById('x').value;
	document.getElementById('x').value = x;
	document.getElementById('y').value = null;
	document.getElementById('z').value =Math.log10(x);
}
function loginv() {
	var x = +document.getElementById('x').value;
	document.getElementById('x').value = x;
	document.getElementById('y').value = null;
	document.getElementById('z').value = 10**(x);
}
function nlog() {
	var x = +document.getElementById('x').value;
	document.getElementById('x').value = x;
	document.getElementById('y').value = null;
	document.getElementById('z').value = Math.log(x);
}
function nloginv() {
	var x = +document.getElementById('x').value;
	document.getElementById('x').value = x;
	document.getElementById('y').value = null;
	document.getElementById('z').value = Math.E**(x);
}
function zalign1() {
	var x = +document.getElementById('x').value;
	var y = +document.getElementById('y').value;
	document.getElementById('x').value = x;
	document.getElementById('y').value = y;
	z = x/Math.sin(y*Math.PI/180);
	if (String(z).length > 8) {
		document.getElementById('z').value = z.toExponential(8);
	} else {
		document.getElementById('z').value = z;
	};
}
function zalign2() {
	var x = +document.getElementById('x').value;
	var y = +document.getElementById('y').value;
	document.getElementById('x').value = x;
	document.getElementById('y').value = y;
	z = x/Math.cos(y*Math.PI/180);
	if (String(z).length > 8) {
		document.getElementById('z').value = z.toExponential(8);
	} else {
		document.getElementById('z').value = z;
	};
}
function zalign3() {
	var x = +document.getElementById('x').value;
	var y = +document.getElementById('y').value;
	document.getElementById('x').value = x;
	document.getElementById('y').value = y;
	z = x/Math.tan(y*Math.PI/180);
	if (String(z).length > 8) {
		document.getElementById('z').value = z.toExponential(8);
	} else {
		document.getElementById('z').value = z;
	};
}
function allclear() {
	document.getElementById('x').type = "number";
	document.getElementById('y').type = "number";
	document.getElementById('x').value = null;
	document.getElementById('y').value = null;
	document.getElementById('z').value = null;
}
function sine() {
	var x = +document.getElementById('x').value;
	document.getElementById('x').value = x;
	document.getElementById('y').value = null;
	z = Math.sin((x)*Math.PI/180);
	if (String(z).length > 8) {
		document.getElementById('z').value = z.toExponential(8);
	} else {
		document.getElementById('z').value = z;
	};
}
function cosine() {
	var x = +document.getElementById('x').value;
	document.getElementById('x').value = x;
	document.getElementById('y').value = null;
	z = Math.cos((x)*Math.PI/180);
	if (String(z).length > 8) {
		document.getElementById('z').value = z.toExponential(8);
	} else {
		document.getElementById('z').value = z;
	};
}
function tangent() {
	var x = +document.getElementById('x').value;
	document.getElementById('x').value = x;
	document.getElementById('y').value = null;
	z = Math.tan((x)*Math.PI/180);
	if (String(z).length > 8) {
		document.getElementById('z').value = z.toExponential(8);
	} else {
		document.getElementById('z').value = z;
	};

}