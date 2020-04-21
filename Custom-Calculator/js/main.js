
if ('serviceWorker' in navigator) {
	navigator.serviceWorker.register('./service-worker.js')
	.then(function(){
		console.log('service workers registerded');
	});
};

resize();

function resize() {
var windowheight = window.innerHeight;
var windowwidth = window.innerWidth;
var ratio = 1.5;

if (windowheight < ratio*windowwidth) {

	appheight = windowheight;
	appwidth = windowheight/ratio;

} else {

	appheight = windowheight;
	appwidth = windowwidth;

};

document.getElementsByTagName("html")[0].style.height = appheight + "px";
document.getElementsByTagName("html")[0].style.width = appwidth + "px";

console.log(windowheight, windowwidth);
console.log(appheight, appwidth);
};