
const screenheight = screen.availHeight;
const screenwidth = screen.availWidth;
var prevheight = window.innerHeight;
var prevwidth = window.innerWidth;
var ratio = 1.5;

console.log("screen: " + screenheight + "," + screenwidth);

if ( screenheight > screenwidth ) {
	appheight = prevheight;
	appwidth = prevwidth;
} else if ( prevheight < ratio*prevwidth) {
	appheight = prevheight;
	appwidth = prevheight/ratio;
} else if ( prevheight > ratio*prevwidth) {
	appwidth = prevwidth;
	appheight = prevwidth*ratio;
} else {
	appheight = prevheight;
	appwidth = prevwidth;
}

document.getElementsByTagName("html")[0].style.height = appheight + "px";
document.getElementsByTagName("html")[0].style.width = appwidth + "px";

console.log("window: " + prevheight + ", " + prevwidth);
console.log("app: " + appheight + ", " + appwidth);

function resize() {
var windowheight = window.innerHeight;
var windowwidth = window.innerWidth;
var ratio = 1.5;

i = document.getElementById('ip') == document.activeElement;
o = document.getElementById('op') == document.activeElement;

console.log("focus status : " + (i || o))

if ( screenheight > screenwidth ) {
	if (i || o) {
		appheight = prevheight;
		appwidth = prevwidth;
	} else {
		prevheight = windowheight;
		prevwidth = windowwidth;
		appheight = prevheight;
		appwidth = prevwidth;
	}
} else if ( windowheight < ratio*windowwidth) {
	appheight = windowheight;
	appwidth = windowheight/ratio;
} else if ( windowheight > ratio*windowwidth) {
	appwidth = windowwidth;
	appheight = windowwidth*ratio;
} else {
	appheight = windowheight;
	appwidth = windowwidth;
}

document.getElementsByTagName("html")[0].style.height = appheight + "px";
document.getElementsByTagName("html")[0].style.width = appwidth + "px";

console.log("window: " + windowheight + ", " + windowwidth);
console.log("app: " + appheight + ", " + appwidth);

}