
inprogress = true;

function isoperator(string) {
	return ( string=='+' || string=='-' || string=='×' || string=='*'
		|| string=='/' || string=='^(' || string=='^' || string=='**' 
		|| string=='%'|| string=='^');
}

function add(string) {
	if ( !inprogress && isoperator(string) ) { 
		passoutput();
		console.log('moving the result to input...');
	}
	inputbox.value += string;
	console.log( string + ' inserted ' );
	autofontsize();
}
function remove() {
	inputbox.value = inputbox.value.slice(0, -1); inprogress = true;
	console.log('last character deleted, ' 
		+ 'calculation in progress: ' + inprogress );
	autofontsize();
}

function clearall() {
	inputbox.value = null;
	outputbox.value = null;
	inprogress = true;
	console.log('cleared everything, ' 
		+ 'calculation in progress: ' + inprogress );
	autofontsize();
}

function passoutput() {
	inputbox.value = outputbox.value;
	outputbox.value = null;
	inprogress = true;
	console.log('moving the result to input..., ' 
		+ 'calculation in progress: ' + inprogress );
	autofontsize();
}

 // listen to the keyboard input and insert text
document.addEventListener('keydown', event => {

	key = event.key;
	console.log("key pressed : " + key);
	ipfocused = inputbox == document.activeElement;
	opfocused = outputbox == document.activeElement;
	isinputfocused = ipfocused || opfocused;
	if ( !inprogress && isoperator(key) ) { passoutput(); }
	if ( key == "Enter" ) { 
		calculate(); 
	} else if ( !isinputfocused ) {
		if ( ( key == "Backspace" ) || ( key == 'Delete' )) {
			inputbox.value = inputbox.value.slice(0, -1); 
		} else {
			switch (key) {
				case '*':
					key = '×'; inputbox.value += key; 
					console.log( key + ' inserted ' ); break;
				case '^':
					key = '^('; inputbox.value += key; 
					console.log( key + ' inserted ' ); break;
				case '(': case '{': case '[': case '<': inputbox.value += '('; break;
				case ')': case '}': case ']': case '>': inputbox.value += ')'; break;
				case '0': case '1': case '2': case '3': case '4': case '5': case '6': 
				case '7': case '8': case '9': case ',': case '.': case 'e': case 'E':
				case '+': case '-': case '/': case '%': 
				case 's': case 'i': case 'n': case 'l': case 'o': case 'g': case 'c': 
				case 't': case 'a':
					inputbox.value += key; 
					console.log( key + ' inserted ' ); break;
				case 'A': case 'C': case 'G': case 'I': case 'L': case 'N': case 'O': 
				case 'S': case 'T':
					key = key.toLowerCase(); inputbox.value += key; 
					console.log( key + ' inserted ' ); break;
			}
		}
	autofontsize();
	}
});
	