
function autofontsize( element, optfont, minfont, strcapacity ) {
	let newsize = optfont * ( strcapacity / element.value.length);
	if ( newsize > optfont ) { element.style.fontSize = optfont/4 + 'em' ; 
	} else if ( newsize > minfont ) { element.style.fontSize = newsize/4 + 'em' ;
	} else { element.style.fontSize = minfont/4 + 'em' ;
	element.scrollLeft = element.scrollWidth; }
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
