
// registering service workers
if ('serviceWorker' in navigator) {
	navigator.serviceWorker.register('./service-worker.js')
	.then(function(){
		console.log('service workers registered');
	});
};

// handle scaling
const screenheight = screen.availHeight;
const screenwidth = screen.availWidth;
const mobileheight = window.innerHeight;
const mobilewidth = window.innerWidth;

console.log("screen: " + screenheight + "," + screenwidth);
resize();

function resize() {

var windowheight = window.innerHeight;
var windowwidth = window.innerWidth;
var ratio = 1.5;

if ( screenheight > screenwidth ) {

	appheight = screenheight;
	appwidth = screenwidth;

} else if ( windowheight < ratio*windowwidth) {

	appheight = windowheight;
	appwidth = windowheight/ratio;

} else if ( windowheight > ratio*windowwidth) {

	appwidth = windowwidth;
	appheight = windowwidth*ratio;

} else {

	appheight = windowheight;
	appwidth = windowwidth;

} ;

document.getElementsByTagName("html")[0].style.height = appheight + "px";
document.getElementsByTagName("html")[0].style.width = appwidth + "px";

console.log(windowheight, windowwidth);
console.log(appheight, appwidth);
};