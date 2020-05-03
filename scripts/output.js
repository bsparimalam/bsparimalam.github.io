
// simple expression evaluation
function calculate() { 
	let inputs = parse(); let output;
	try { output = eval(inputs); 
	} catch(error) { output = error; }
	printoutput(output);
}

// processed output
function printoutput(number, unit=null) {
    console.log(number);
    if (isNaN(number)) { 
        outputbox.value = 'invalid input :(';
    } else if ( typeof(number) != "number" ) { 
        outputbox.value = number.message;
	} else { 
	    if (String(number).length > 9 ) { 
	        number = number.toPrecision(9); }
        number = Number(number).toString();
        if ( !unit ) { 
            outputbox.value = number;
    	} else { 
    	outputbox.value = number + ' ' + unit;
    	}
    	inprogress = false;
        console.log('calculation in progress: ' + inprogress );
	}
}