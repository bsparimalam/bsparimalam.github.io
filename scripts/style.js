inprogress = true;
inputbox = document.getElementById('ip');
outputbox = document.getElementById('op');

function autofontsize() {
	let optfont = 3.5; let minfont = 2; let strcapacity = 9;
	let newsize = optfont * ( strcapacity / inputbox.value.length);
	if ( newsize > optfont ) { 
		inputbox.style.fontSize = optfont + 'em' ; 
	} else if ( newsize > minfont ) { 
		inputbox.style.fontSize = newsize + 'em' ;
	} else {
		inputbox.style.fontSize = minfont + 'em' ;
		inputbox.scrollLeft = inputbox.scrollWidth;
	} console.log('input resized and/or scrolled')
}

function defocus(element) {
	element.blur(); 
	console.log(element.innerHTML + '-button defocused');
}

// // listen to the keyboard input and insert text
// document.addEventListener('keydown', event => {
// 	key = event.key;
//     switch(key) {
//         case "Enter": animate(document.getElementById("=")); break;
//         case "Backspace": animate(document.getElementById("bspc")); break;
//         case "Delete": animate(document.getElementById("bspc")); break;
//         case "*": animate(document.getElementById("×")); break;
//         case "/": animate(document.getElementById("÷")); break;
//         case "+": animate(document.getElementById("+")); break;
//         case "-": animate(document.getElementById("-")); break;
//         case ",": animate(document.getElementById("comma")); break;
//         case ".": animate(document.getElementById("decimal")); break;
//         case "1": animate(document.getElementById("1")); break;
//         case "2": animate(document.getElementById("2")); break;
//         case "3": animate(document.getElementById("3")); break;
//         case "4": animate(document.getElementById("4")); break;
//         case "5": animate(document.getElementById("5")); break;
//         case "6": animate(document.getElementById("6")); break;
//         case "7": animate(document.getElementById("7")); break;
//         case "8": animate(document.getElementById("8")); break;
//         case "9": animate(document.getElementById("9")); break;
//         case "0": animate(document.getElementById("0")); break;
//         case "\(": animate(document.getElementById("\(")); break;
//         case "\)": animate(document.getElementById("\)")); break;   
//     }
// });
