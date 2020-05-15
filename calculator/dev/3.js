
function evaluate(string) {
	var angleconv; var angleconvinv;
	if (angleunit.innerHTML == 'DEG') {
		angleconv = "(Math.PI/180)*";
		angleconvinv = "(180/Math.PI)*"; 
	} else { 
		angleconv = ''; angleconvinv = '';
	}
	var parsedstring = string.replace(/\(|\{|\[|\</gi, '((').replace(
		/\)|\}|\]|\>/gi, '))').replace(/×|x|X/gi, '*').replace(
		/÷/gi, '/').replace(/\^/gi, '**').replace(/e/g, 'Math.E').replace(
		/π/gi, 'Math.PI').replace(/log/gi, 'Math.log10').replace(
		/ln/gi, 'Math.log').replace(/sin\(/gi, 'Math.sin(' + angleconv).replace(
		/cos\(/gi, 'Math.cos(' + angleconv).replace(
		/tan\(/gi, 'Math.tan(' + angleconv).replace(
		/sin⁻¹\(/gi, angleconvinv + 'Math.asin(').replace(
		/cos⁻¹\(/gi, angleconvinv + 'Math.acos(').replace(
		/tan⁻¹\(/gi, angleconvinv + 'Math.atan(').replace(/ /gi, '');
	// parsing root
	while ( parsedstring.indexOf('√') != -1 ) {
		var rootindex = parsedstring.indexOf('√');
		var exponent; var exponented;
		var start = rootindex - 1 ; var end = rootindex + 1;
		var blockdue = 0;

		if ( parsedstring[start] == ')') {
			blockdue = -1;
			while ((blockdue != 0) && (start != 0)) {
				if (parsedstring[start] == '(') {
					blockdue += 1;
				} else if (parsedstring[start] == ')') {
					blockdue -= 1;
				}
				start -= 1;
			}
			exponent = '1/' + parsedstring.slice(start, rootindex);
		} else if (!isNaN(parsedstring[start])) {
			while (isnumber(parsedstring[start], parsedstring[start-1], 
				parsedstring[start+1])) {
				start -= 1;
			}
			start += 1;
			exponent = '1/' + parsedstring.slice(start, rootindex);
		} else {
			exponent = '1/2';
		}

		if (parsedstring[end] == '(') {
			blockdue = 1;
			while ((blockdue != 0) && (end != parsedstring.length)) {
				if (parsedstring[end] == '(') {
					blockdue += 1;
				} else if (parsedstring[end] == ')') {
					blockdue -= 1;
				}
				end += 1;
			}
			exponented = parsedstring.slice( rootindex + 1 , end + 1 );
		} else if (!isNaN(parsedstring[end])) {
			while (isnumber(parsedstring[end], parsedstring[end-1], 
				parsedstring[end+1])) {
				end += 1;
			}
			end -= 1;
			exponented = parsedstring.slice(rootindex + 1, end + 1); 
		}
		if (start == -1) {
			parsedstring = '((' + exponented + ')**(' + exponent + '))' 
				+ parsedstring.slice(end+1, );
		} else {
			parsedstring = parsedstring.slice(0,start) + '((' + exponented
				 + ')**(' + exponent + '))' + parsedstring.slice(end+1 , );
		}
	}
	console.log('Parsed expression: ' + parsedstring);
	// cleaning up trig functions, eg. assigning sin(pi) = 0
	function cleanuptrig(trigfunction, reminder) {
		var start = 0;
		while ((parsedstring.indexOf(trigfunction, start) != -1)) {
			var trigindex = parsedstring.indexOf(trigfunction, start);
			var start = trigindex + 8 ; var end = start + 1;
			var blockdue = 1;
			while (blockdue != 0) {
				if (parsedstring[end] == '(') {
					blockdue++;
				} else if (parsedstring[end] == ')') {
					blockdue--;
				}
				end++;
			}
			if (((eval(parsedstring.slice(
				start, end))/Math.PI).toPrecision(5))%1 == reminder ) {
				if (trigindex != 0) {
					parsedstring = parsedstring.slice(0,trigindex) 
						+ '(0)' + parsedstring.slice(end, );
				} else {
					parsedstring = '(0)' + parsedstring.slice(end, );
				}
			}
			start = trigindex + 1;
		}
	}
	cleanuptrig('Math.sin(', 0);
	cleanuptrig('Math.tan(', 0);
	cleanuptrig('Math.cos(', 0.5);
	console.log('trigonometric functions cleaned: '+ parsedstring);
	if ( parsedstring.indexOf(',') != -1 ) {
		parsedlist = parsedstring.split(',');
		evaluated = [];
		for ( var i=0; i<parsedlist.length; i++ ) {
			evaluated.push(eval(parsedlist[i]));
		}
	} else {
		evaluated = eval(parsedstring);
	}
	console.log('evaluated output: ' + evaluated);
	return evaluated;
}
function filteroutput(evaluated, unit) {
	if (isNaN(evaluated) || (typeof(evaluated) != "number")) { 
		outputbox.write('error');
	} else {
		if (evaluated.toString().length > 10) { 
			evaluated = evaluated.toPrecision(10); 
		}
		if ( numrep.innerHTML == 'DECI') {
			evaluated = Number(evaluated).toString();
		} 
		if ((numrep.innerHTML == 'SCI') || istoolong(evaluated, 11)) {
			evaluated = Number(evaluated).toExponential();
		} 
		evaluated = String(evaluated).replace(/e/g, 'E');
	}
	console.log('filteroutput: ' + evaluated);
	return evaluated;
}
function calculate(type, operation=null) {
	lasttype = type;
	lastoperation = operation;
	console.log('computation requested: ' + type + '; ' + operation);
	var base; var target;
	if (type != 'function') { evaluated = evaluate(inputbox.read()); }
	try { 
		[base, target] = operation.split(' ▸ ');
	} catch {
	}
	if ((type != 'simple') && (type != 'function')) {
	var typeindex = 0; var baseindex = 0; var targetindex = 0;
	while (type != convdata[typeindex][0]) { typeindex++; }
	while (base != convdata[typeindex][1][baseindex]) { baseindex++; }
	while (target != convdata[typeindex][1][targetindex]) { targetindex++; }
	}
	switch (type) {
		case 'simple':
			lasteval = filteroutput(evaluated);
			outputbox.write(lasteval);
			break;
		case 'area': case 'energy': case 'length': case 'mass': case 'pressure':
		case 'volume':
			evaluated = eval(evaluated + '*' + convdata[typeindex][2][baseindex]
				+ '/' + convdata[typeindex][2][targetindex] );
			lasteval = filteroutput(evaluated);
			outputbox.write(lasteval + ' ' + target); break;
		case 'currency':
			var baseurl = "https://api.exchangeratesapi.io/latest?";
			var basecurr = "base=" + base;
			var target = operation.slice(6, 9);
			var targetcurr = "&symbols=" + target;
			outputbox.write('loading...');
			(async () => {
				var response = await fetch( baseurl + basecurr + targetcurr );
				var data = await response.json();
				evaluated = evaluated*data["rates"][target];
				if (isNaN(evaluated) || (typeof(evaluated) != "number")) { 
					outputbox.write('error');
				} else {
					lasteval = Number(Number(evaluated).toString()).toFixed(2);
					outputbox.write(lasteval + ' ' + target);
				}
			})();
			break;
		case 'function': outputbox.write('haha you wish'); break;
		case 'temperature':
			evaluated = eval('(' + evaluated + convdata[typeindex][2][baseindex])
			evaluated = eval('(' + evaluated + convdata[typeindex][3][targetindex])
			lasteval = Number(evaluated).toFixed(2);
			outputbox.write(lasteval + ' ' + target);
			break;
	}
	inprogress = false;
	console.log('inprogress : ' + inprogress);
	log(type, operation);
	return evaluated;
}
