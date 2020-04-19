

window.onload = () => {
  'use strict';

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker
             .register('./sw.js');
  }
}


function sum() {
	var x = +document.getElementById('x').value;
	var y = +document.getElementById('y').value;
	document.getElementById('z').value = x + y;
}
function subration() {
	var x = +document.getElementById('x').value;
	var y = +document.getElementById('y').value;
	document.getElementById('z').value = x - y;
}
function multiplication() {
	var x = +document.getElementById('x').value;
	var y = +document.getElementById('y').value;
	document.getElementById('z').value = x*y;
}
function division() {
	var x = +document.getElementById('x').value;
	var y = +document.getElementById('y').value;
	document.getElementById('z').value = x/y;
}
function invert() {
	var x = +document.getElementById('x').value;
	document.getElementById('z').value = 1/x;
}
function factorial() {
	var x = +document.getElementById('x').value;
	var z = 1;
	var i;
	for ( i = 1; i <= x; i++ ){
		z = z*i
	}
	document.getElementById('z').value = z;
}
function exponent() {
	var x = +document.getElementById('x').value;
	var y = +document.getElementById('y').value;
	document.getElementById('z').value = x**y;
}
function root() {
	var x = +document.getElementById('x').value;
	var y = +document.getElementById('y').value;
	document.getElementById('z').value = x**(1/y);
}
function log() {
	var x = +document.getElementById('x').value;
	document.getElementById('z').value = Math.log10(x) ;
}
function loginv() {
	var x = +document.getElementById('x').value;
	document.getElementById('z').value = 10**x ;
}
function nlog() {
	var x = +document.getElementById('x').value;
	document.getElementById('z').value = Math.log(x);
}
function nloginv() {
	var x = +document.getElementById('x').value;
	document.getElementById('z').value = Math.E**x;
}
function in2mm() {
	var x = +document.getElementById('x').value;
	document.getElementById('z').value = 25.4*x ;
}
function mm2in() {
	var x = +document.getElementById('x').value;
	document.getElementById('z').value = x/25.4;
}
function zalign1() {
	var x = +document.getElementById('x').value;
	var y = +document.getElementById('y').value;
	document.getElementById('z').value = x/Math.sin(y*Math.PI/180);
}
function zalign2() {
	var x = +document.getElementById('x').value;
	var y = +document.getElementById('y').value;
	document.getElementById('z').value = x/Math.cos(y*Math.PI/180);
}
function sine() {
	var x = +document.getElementById('x').value;
	document.getElementById('z').value = Math.sin(x*Math.PI/180);
}
function cosine() {
	var x = +document.getElementById('x').value;
	document.getElementById('z').value = Math.cos(x*Math.PI/180);
}
function tangent() {
	var x = +document.getElementById('x').value;
	document.getElementById('z').value = Math.tan(x*Math.PI/180);
}
function allclear() {
	document.getElementById('x').value = "";
	document.getElementById('y').value = "";
	document.getElementById('z').value = "";
}
function frwdslash(){
	var a = document.getElementById('z').value;
	var z = '';
	for ( let i = 0; i < a.length; i++ ){
		if (a[i] == "//"){ z = z + "/"; 
		} else { z = z + a[i] }
	}
	document.getElementById('z').value = z;
}