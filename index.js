
dropdownbutton = document.getElementById('dropdown-button');
dropdown = document.getElementById('dropdown');

wrapper = document.getElementById('screenshots');
screenshot = document.getElementById('screenshot');
reflowwrap = document.getElementById('reflow-screenshots');
reflowshot = document.getElementById('reflow-screenshot');
calculatorwrap = document.getElementById('calculator-screenshots');
calculatorshot = document.getElementById('calculator-screenshot');
kilianwrap = document.getElementById('kilian-screenshots');
kilianshot = document.getElementById('kilian-screenshot');

userinteracted = false;

document.addEventListener('click', event => {
	let target = event.target;
	let name = event.target.name;
	if (name === "open-dropdown") {
		dropdown.style.display = "block";
		dropdown.style.visibility = "visible";
		dropdownbutton.name = "close-dropdown";
		dropdownbutton.innerHTML = '<img name="close-dropdown" src="./index/icons/icon-menu2.svg">';
	} else {
		dropdown.style.display = "none";
		dropdown.style.visibility = "hidden";
		dropdownbutton.name = "open-dropdown";
		dropdownbutton.innerHTML = '<img name="open-dropdown" src="./index/icons/icon-menu.svg">';
	}
	switch (name) {
		case("scroll-left"):
			userinteracted = true;
			if (wrapper.scrollLeft - screenshot.scrollWidth > 100) {
				wrapper.scrollLeft = wrapper.scrollLeft - screenshot.scrollWidth;
			} else {
				wrapper.scrollLeft = wrapper.scrollWidth;
			}
			wrapper.scrollLeft = wrapper.scrollLeft - screenshot.scrollWidth;
			break;
		case("scroll-right"):
			userinteracted = true;
			if (wrapper.scrollWidth >= wrapper.scrollLeft + screenshot.scrollWidth + 50) {
				wrapper.scrollLeft = wrapper.scrollLeft + screenshot.scrollWidth;
			} else {
				wrapper.scrollLeft = 0;
			}
			break;
		case("reflow-scroll-left"):
			if (reflowwrap.scrollLeft - reflowshot.scrollWidth > 100) {
				reflowwrap.scrollLeft = reflowwrap.scrollLeft - reflowshot.scrollWidth;
			} else {
				reflowwrap.scrollLeft = reflowwrap.scrollWidth;
			}
			reflowwrap.scrollLeft = reflowwrap.scrollLeft - reflowshot.scrollWidth;
			break;
		case("reflow-scroll-right"):
			if (reflowwrap.scrollWidth >= reflowwrap.scrollLeft + reflowshot.scrollWidth + 50) {
				reflowwrap.scrollLeft = reflowwrap.scrollLeft + reflowshot.scrollWidth;
			} else {
				reflowwrap.scrollLeft = 0;
			}
			break;
		case("calculator-scroll-left"):
			if (calculatorwrap.scrollLeft - calculatorshot.scrollWidth > 100) {
				calculatorwrap.scrollLeft = calculatorwrap.scrollLeft - calculatorshot.scrollWidth;
			} else {
				calculatorwrap.scrollLeft = calculatorwrap.scrollWidth;
			}
			calculatorwrap.scrollLeft = calculatorwrap.scrollLeft - calculatorshot.scrollWidth;
			break;
		case("calculator-scroll-right"):
			if (calculatorwrap.scrollWidth >= calculatorwrap.scrollLeft + calculatorshot.scrollWidth + 50) {
				calculatorwrap.scrollLeft = calculatorwrap.scrollLeft + calculatorshot.scrollWidth;
			} else {
				calculatorwrap.scrollLeft = 0;
			}
			break;
		case("kilian-scroll-left"):
			if (kilianwrap.scrollLeft - kilianshot.scrollWidth > 100) {
				kilianwrap.scrollLeft = kilianwrap.scrollLeft - kilianshot.scrollWidth;
			} else {
				kilianwrap.scrollLeft = kilianwrap.scrollWidth;
			}
			kilianwrap.scrollLeft = kilianwrap.scrollLeft - kilianshot.scrollWidth;
			break;
		case("kilian-scroll-right"):
			if (kilianwrap.scrollWidth >= kilianwrap.scrollLeft + kilianshot.scrollWidth + 50) {
				kilianwrap.scrollLeft = kilianwrap.scrollLeft + kilianshot.scrollWidth;
			} else {
				kilianwrap.scrollLeft = 0;
			}
			break;
	}
	console.log(wrapper.scrollLeft, screenshot.scrollWidth);
});

setInterval(() => {
	if ((wrapper.scrollWidth >= wrapper.scrollLeft + screenshot.scrollWidth + 5) && !userinteracted) {
		wrapper.scrollLeft = wrapper.scrollLeft + screenshot.scrollWidth;
	} else if (!userinteracted) {
		wrapper.scrollLeft = 0;
	}
}, 3000);

window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', 'UA-166908735-1');