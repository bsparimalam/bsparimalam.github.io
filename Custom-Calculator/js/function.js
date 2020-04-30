
function func(element) {
	let operation = element.innerHTML;
	console.log("computation requested: " + operation);
	var inputlist = readinput(multi=true);
	let x; let y; let z;
	switch(operation) {
		case "x/sin(y)":
			x = eval(inputlist[0]); y = eval(inputlist[1]);
			printoutput(x/Math.sin((Math.PI/180)*y)); break;
		case "x/cos(y)":
			x = eval(inputlist[0]); y = eval(inputlist[1]);
			printoutput(x/Math.cos((Math.PI/180)*y)); break;
		case "15%":
			x = eval(inputlist[0]);
			printoutput(x*0.15); break;
		case "20%":
			x = eval(inputlist[0]);
			printoutput(x*0.20); break;
	}
}