function isnumber(string, before, after) {
	return ( !isNaN(string) || (string=='.')
		|| ((string == '-' ) && (before == 'E'))
		|| ((string == '+' ) && (before == 'E')) 
		|| ((string == 'E' ) && (after == '-'))
		|| ((string == 'E' ) && (after == '+'))
		|| ((string == 'E') && !isNaN(after))
		|| ((string == 'e' ) && (after == '-'))
		|| ((string == 'e' ) && (after == '+'))
		|| ((string == 'e') && !isNaN(after)));
}
function istoolong(string, length) {
	string = string.replace(/\./g, '');
	eindex = string.indexOf('E');
	if ( eindex != -1 ) { string = string.slice(0, eindex); }
	return string.length > length;
}
function parse(string) {
	var angleconv; var angleconvinv;
	if (angleunit.innerHTML == 'DEG') {
		angleconv = "(Math.PI/180)*";
		angleconvinv = "(180/Math.PI)*"; 
	} else { 
		angleconv = ''; angleconvinv = '';
	}
	//implicit multilications to explicit multiplications
	var charlist = ['s', 'S', 'c', 'C', 't', 'T', 'l', 'L', '(', 'p', 'P', 'e', 'π']
	for (let i=0; i < string.length-1; i++) {
		if ((!isNaN(string[i])) && (charlist.indexOf(string[i+1])!==-1)) {
			string = string.slice(0, i+1) + '*' + string.slice(i+1, )
			i++;
		}
	}
	var parsedstring = string.replace(/\(|\{|\[|\</gi, '((').replace(/\)|\}|\]|\>/gi, '))').replace(/×|x|X/gi, '*').replace(/÷/gi, '/').replace(/\^/gi, '**').replace(/e/g, 'Math.E').replace(/π|pi/gi, 'Math.PI').replace(/log/gi, 'Math.log10').replace(/ln/gi, 'Math.log').replace(/sin\(/gi, 'Math.sin(' + angleconv).replace(/cos\(/gi, 'Math.cos(' + angleconv).replace(/tan\(/gi, 'Math.tan(' + angleconv).replace(/sin⁻¹\(|sininv\(/gi, angleconvinv + 'Math.asin(').replace(/cos⁻¹\(|cosinv\(/gi, angleconvinv + 'Math.acos(').replace(/tan⁻¹\(|taninv\(/gi, angleconvinv + 'Math.atan(').replace(/ |,/gi, '').replace(/root/gi, '√');
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
			start += 1;
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
	function cleanuptrig(trigfunction, reminder, value) {
		var start = 0; var trigindex; var start; var end;
		var tempeval; var tempratio; 
		while ((parsedstring.indexOf(trigfunction, start) != -1)) {
			trigindex = parsedstring.indexOf(trigfunction, start);
			start = trigindex + 8 ; end = start + 1;
			blockdue = 1;
			while (blockdue != 0) {
				if (parsedstring[end] == '(') {
					blockdue++;
				} else if (parsedstring[end] == ')') {
					blockdue--;
				}
				end++;
			}
			try {
				tempeval = eval(parsedstring.slice(start, end)).toPrecision(5);
				tempratio = (eval(parsedstring.slice(start, end))/Math.PI).toPrecision(5);
				if ( tempratio%1 == reminder ) {
					if (trigindex != 0) {
						parsedstring = parsedstring.slice(0,trigindex) 
							+ value + parsedstring.slice(end, );
					} else {
						parsedstring = value + parsedstring.slice(end, );
					}
				}		
			} catch {
				console.log('trig eval error');
			}
			if (
				((angleunit.innerHTML == 'DEG') 
					&& (inputbox.read().match(/pi|π/i) !== null))
				|| ((angleunit.innerHTML == 'RAD')
					&& ((tempeval%5 == 0) || (tempeval > 7)) && (inputbox.read().match(/pi|π/i) == null))
				) {
				warnangleunit();
			}
			start = trigindex + 1;
		}
	}
	if (parsedstring.split('(').length === parsedstring.split(')').length) {
		cleanuptrig('Math.sin(', 0, '(0)');
		cleanuptrig('Math.cos(', 0.5, '(0)');
		cleanuptrig('Math.tan(', 0, '(0)');
		cleanuptrig('Math.tan(', 0.5, '(Infinity)');
		console.log('trigonometric functions cleaned: '+ parsedstring);		
	}
	
	return parsedstring;
}
function filteroutput(evaluated, unit) {

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
	evaluated = insertcomma(evaluated);
	console.log('filteroutput: ' + evaluated);
	return evaluated;
}
function calculate(type, operation=null) {
	angleunitwarned = false;
	lasttype = type; lastoperation = operation;
	console.log('computation requested: ' + type + '; ' + operation);
	var base=null ; var target=null;
	try {
		evaluated = eval(parse(inputbox.read()));		
	} catch {
		evaluated = 'error';
	}
	try {
		[base, target] = operation.split(' ▸ ');
	} catch {}
	if ((evaluated == 'error') || (type == 'conversion') || (base == 'from')
			|| (target == 'to') || isNaN(evaluated) 
			|| (typeof(evaluated) != "number"))  {
		outputbox.error('invalid input');
	} else if (type == 'simple') {
		outputbox.write(filteroutput(evaluated), '');
		log(type, operation);
	} else {
		var typeindex = 0; var baseindex = 0; var targetindex = 0;
		while (type != convdata[typeindex][0]) { typeindex++; }
		while (base != convdata[typeindex][1][baseindex]) { baseindex++; }
		while (target != convdata[typeindex][1][targetindex]) {	targetindex++; }
		switch (type) {
			case 'area': case 'energy': case 'length': case 'mass': case 'pressure':
			case 'volume':
				evaluated = eval(evaluated + '*' + convdata[typeindex][2][baseindex]
					+ '/' + convdata[typeindex][2][targetindex] );
				outputbox.write(filteroutput(evaluated), target); break;
			// case 'currency':
			// 	var baseurl = "https://api.exchangeratesapi.io/latest?";
			// 	var basecurr = "base=" + base;
			// 	var target = operation.slice(6, 9);
			// 	var targetcurr = "&symbols=" + target;
			// 	outputbox.write('loading...', '');
			// 	fetch(baseurl + basecurr + targetcurr)
			// 	  .then(
			// 	    function(response) {
			// 	      if (response.status !== 200) {
			// 	        outputbox.error('network error');
			// 	        return;
			// 	      } else {
			// 	      	response.json().then(function(data) {
			// 				evaluated = evaluated*data["rates"][target];
			// 				outputbox.write(insertcomma(Number(Number(
			// 					evaluated).toString()).toFixed(2)), target);
			// 		     });
			// 	      }
			// 	    })
			// 	  .catch(function(err) {
			// 	  	outputbox.error('network error');
			// 	});
			// 	break;
			case 'temperature':
				evaluated = eval('(' + evaluated + convdata[typeindex][2][baseindex])
				evaluated = eval('(' + evaluated + convdata[typeindex][3][targetindex])
				outputbox.write(insertcomma(Number(evaluated).toFixed(2)), target);
				break;
		}
		log(type, operation);
		return evaluated;
	}
}