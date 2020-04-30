
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

( async () => {

	let temprecent = await fetch('./data/conversions.json');
	var recent = await temprecent.json();
	console.log(recent);

	document.getElementById('convert0').innerHTML = recent.conversions[0];
	document.getElementById('convert1').innerHTML = recent.conversions[1];
	document.getElementById('convert2').innerHTML = recent.conversions[2];
	document.getElementById('convert3').innerHTML = recent.conversions[3];
	document.getElementById('convert4').innerHTML = recent.conversions[4];
	document.getElementById('convert5').innerHTML = recent.conversions[5];
	document.getElementById('currency0').innerHTML = recent.currencies[0];
	document.getElementById('currency1').innerHTML = recent.currencies[1];
	document.getElementById('time0').innerHTML = recent.times;

})();