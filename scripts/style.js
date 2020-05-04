inputbox = document.getElementById('ip');
outputbox = document.getElementById('op');

// font size fix
function autofontsize() {
	let optfont = 3.5; let minfont = 2; let strcapacity = 9;
	let newsize = optfont * ( strcapacity / inputbox.value.length);
	if ( newsize > optfont ) { 
		inputbox.style.fontSize = optfont + 'em' ; 
	} else if ( newsize > minfont ) { 
		inputbox.style.fontSize = newsize + 'em' ;
		console.log('input font changed to : ' + newsize + 'em');
	} else {
		inputbox.style.fontSize = minfont + 'em' ;
		inputbox.scrollLeft = inputbox.scrollWidth;
	} 
}

// defocus buttons after click
function defocus(element) {
	element.blur();
}
