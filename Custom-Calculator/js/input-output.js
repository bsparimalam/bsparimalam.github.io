
// listen to the mouse and defocus buttons after click
document.addEventListener('mouseup', event => {
	console.log('mouse click on : ', event.srcElement);
	if (event.srcElement.tagName != 'INPUT') { 
		event.srcElement.blur();
	}
})

 // listen to the keyboard input and insert text
document.addEventListener('keydown', event => {
	kcn = event.keyCode;
	console.log("key pressed : " + kcn);
	if ( kcn == 13 ) { calculate() }
	if ((document.getElementById('ip') != document.activeElement) && 
		(document.getElementById('op') != document.activeElement)) {
		switch(kcn) {
			case 96: case 48: typein(0); break;
			case 97: case 49: typein(1); break;
			case 98: case 50: typein(2); break;
			case 99: case 51: typein(3); break;
			case 100: case 52: typein(4); break;
			case 101: case 53: typein(5); break;
			case 102: case 54: typein(6); break;
			case 103: case 55: typein(7); break;
			case 104: case 56: typein(8); break;
			case 105: case 57: typein(9); break;
			case 110: case 190:+ typein('.'); break;
			case 188: typein(','); break;
			case 107: typein('+'); break;
			case 109: typein('-'); break;
			case 106: typein('×'); break;
			case 111: typein('÷'); break;
			case 219: typein('('); break;
			case 221: typein(')'); break;
			case 8: case 46: remove(); break;
		}
	}
})

function o2i() {
	var inputbox = document.getElementById('ip');
	var outputbox = document.getElementById('op');
	inputbox.value = outputbox.value;
	outputbox.value = "";
}

function typein(string) {
	var inputbox = document.getElementById('ip');
	inputbox.value += string;
}

function remove() {
	var inputbox = document.getElementById('ip');
	inputbox.value = inputbox.value.slice(0, -1);
}

function allclear() {
	document.getElementById('ip').value = null;
	document.getElementById('op').value = null;
}
// processed input
function readinput(multi=false) {
	var inputbox = document.getElementById('ip');
	var inputstring = inputbox.value;
	var inputlength = inputstring.length;

	inputstring = inputstring.replace(/×/gi, '*');
	inputstring = inputstring.replace(/÷/gi, '/');
	inputstring = inputstring.replace(/\^/gi, '**');

	inputstring = inputstring.replace(/e/gi, 'Math.E');
	inputstring = inputstring.replace(/π/gi, 'Math.PI');

	inputstring = inputstring.replace(/log/gi, 'Math.log10');
	inputstring = inputstring.replace(/ln/gi, 'Math.log');

	inputstring = inputstring.replace(/sin\(/gi, 'Math.sin((Math.PI/180)*');
	inputstring = inputstring.replace(/cos\(/gi, 'Math.cos((Math.PI/180)*');
	inputstring = inputstring.replace(/tan\(/gi, 'Math.tan((Math.PI/180)*');
	inputstring = inputstring.replace(/sin⁻¹\(/gi, '(180/Math.PI)*Math.asin(');
	inputstring = inputstring.replace(/cos⁻¹\(/gi, '(180/Math.PI)*Math.acos(');
	inputstring = inputstring.replace(/tan⁻¹\(/gi, '(180/Math.PI)*Math.atan(');

	if (multi) { 
		let inputlist = inputstring.split(",");
		console.log('converted expression: ' + inputlist);
		return inputlist;
	} else { 
		console.log('converted expression: ' + inputstring);
		return inputstring;
	}
}

// processed output
function printoutput(number, unit=null) {
	var outputbox = document.getElementById('op');
	if (unit == null) { outputbox.value = number;
	} else { outputbox.value = number + ' ' + unit; }
}
// simple expression evaluation
function calculate() { printoutput(eval(readinput())); }