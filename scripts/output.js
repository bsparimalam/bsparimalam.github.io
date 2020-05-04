


// simple expression evaluation
function calculate() { 
	let inputs = parse(); let output;
	try { output = eval(inputs); 
	} catch(error) { output = error; }
	printoutput(output);
}

// processed output
function printoutput(number, unit=null) {
    console.log( 'evaluation : ' + number + ' ' + unit);
    if (isNaN(number)) { 
        outputbox.value = 'invalid input :(';
    } else if ( typeof(number) != "number" ) { 
        outputbox.value = "error: " + number.message;
	} else { 
	    if (String(number).length > 9 ) { 
	        number = number.toPrecision(9); }
        number = Number(number).toString();

        number = number.replace(/0e/g, '0E').replace(/1e/g, '1E').replace(
            /2e/g, '2E').replace(/3e/g, '3E').replace(/4e/g, '4E').replace(
            /5e/g, '5E').replace(/6e/g, '6E').replace(/7e/g, '7E').replace(
            /8e/g, '8E').replace(/9e/g, '9E');

        if ( !unit ) { 
            outputbox.value = number;
    	} else { 
    	outputbox.value = number + ' ' + unit;
    	}
    	inprogress = false;
        console.log('calculation in progress: ' + inprogress );
	}
}