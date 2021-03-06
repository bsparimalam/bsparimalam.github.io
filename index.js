
dropdownbutton = document.getElementById('dropdown-button');
dropdown = document.getElementById('dropdown');
opendd = document.getElementById('open-dropdown');
closedd = document.getElementById('close-dropdown');

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
		opendd.style.display = "none";
		opendd.style.visibility = "hidden";
		closedd.style.display = "inline";
		closedd.style.visibility = "visible";
		
	} else if (dropdownbutton.name !== "open-dropdown"){
		dropdown.style.display = "none";
		dropdown.style.visibility = "hidden";
		closedd.style.display = "none";
		closedd.style.visibility = "hidden";
		opendd.style.display = "inline";
		opendd.style.visibility = "visible";

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
});

if (wrapper && screenshot) {
	setInterval(() => {
		if ((wrapper.scrollWidth >= wrapper.scrollLeft + screenshot.scrollWidth + 10) && !userinteracted) {
			wrapper.scrollLeft = wrapper.scrollLeft + screenshot.scrollWidth;
		} else if (!userinteracted) {
			wrapper.scrollLeft = 0;
		}
	}, 3000);
}

window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', 'UA-166908735-1');