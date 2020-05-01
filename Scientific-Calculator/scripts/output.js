
// simple expression evaluation
function calculate() { printoutput(eval(readinput())); }

// processed output
function printoutput(number, unit=null) {
	var outputbox = document.getElementById('op');
	if (unit == null) { outputbox.value = number;
	} else { outputbox.value = number + ' ' + unit; }
}
