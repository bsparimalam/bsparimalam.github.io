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
