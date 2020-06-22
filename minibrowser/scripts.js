
document.getElementById('popupwindow').addEventListener('load', event => {
	event.target.focus();
});

setTimeOut(() => {
	Office.onReady();
}, 1000);