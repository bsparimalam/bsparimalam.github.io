
const isphone = screen.availHeight > screen.availWidth;
console.log("The device is a phone : " + isphone );

const optaspect = 1.5; const minaspect = 1; const maxaspect = 2;
let width; let height; let app  = document.getElementsByTagName("html")[0];

function resize() {

	var newheight = window.innerHeight; var newwidth = window.innerWidth;
	var newratio = newheight/newwidth;
	var isaspectgood = ( newratio > minaspect ) && ( newratio < maxaspect );
	console.log("current aspect ratio is acceptable : " + isaspectgood );

	inputboxfocused = document.getElementById('ip') == document.activeElement;
	outputboxfocused = document.getElementById('op') == document.activeElement;
	isphonekeyboard = inputboxfocused || outputboxfocused ; 
	console.log("phone keyboard triggered : " + isphonekeyboard);

	if (!(isphone && isphonekeyboard)) { height = newheight; width = newwidth; }
	appheight = height; appwidth = width;

	if ( isphone || isaspectgood ) { appheight = height; appwidth = width;
	} else if ( height > optaspect*width) { appwidth = width; appheight = width*optaspect;
	} else { appheight = height; appwidth = height/optaspect; }
	console.log("app dimensions : " + appwidth + ' , ' + appheight);

	app.style.height = appheight + "px";
	app.style.width = appwidth + "px";

} resize();

function autofontsize( element, optfont, minfont, strcapacity ) {
	if (isphone) {
		let newsize = optfont * ( strcapacity / element.value.length);
		if ( newsize > optfont ) { element.style.fontSize = optfont + 'vw' ; 
		} else if ( newsize > minfont ) { element.style.fontSize = newsize + 'vw' ;
		} else { element.style.fontSize = minfont + 'vw' ;
		element.scrollLeft = element.scrollWidth; }
	} else {
		let newsize = optfont * ( strcapacity / element.value.length);
		if ( newsize > optfont ) { element.style.fontSize = optfont/4 + 'em' ; 
		} else if ( newsize > minfont ) { element.style.fontSize = newsize/4 + 'em' ;
		} else { element.style.fontSize = minfont/4 + 'em' ;
		element.scrollLeft = element.scrollWidth; }
	}

}