// focus to iframe
setTimeout(() => {
  document.getElementById('appwindow').focus();
}, 500);

url = new URL(window.location.href);
param = url.searchParams.get("utm_source");
console.log(param);

let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
	if (param === "install") {
		e.preventDefault();
		deferredPrompt = e;
	} else {
		install.style.display = "none";
	}
});
install = document.getElementById('install');
install.addEventListener('click', event => {
	deferredPrompt.prompt();
});

// register service workers
if ('serviceWorker' in navigator) {
	navigator.serviceWorker.register('./install.js');
} else {
	console.log('serice worker not supported');
}

window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', 'UA-166908735-1');