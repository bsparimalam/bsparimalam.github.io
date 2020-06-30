
document.addEventListener('click', event => {
	let elementtype = event.target.attributes[0].nodeValue;
	console.log(elementtype);
	if (elementtype.indexOf("screenshot") !== -1) {
		let screenshot = event.target;
		let container = screenshot.parentElement;
		if (container.scrollWidth >= container.scrollLeft + screenshot.scrollWidth + 5) {
			container.scrollLeft = container.scrollLeft + screenshot.scrollWidth;
		} else {
			container.scrollLeft = 0;
		}
	}
});

window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', 'UA-166908735-1');