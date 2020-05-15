for (var i = 1; i < convdata.length; i++ ){
	type = convdata[i][0];
	if ((type != 'currency') && (type != 'temperature')) {
		for ( var j = 0; j < convdata[i][1].length; j++ ) {
			for (var k = 0; k < convdata[i][1].length; k++) {
				if (convdata[i][1][j] != convdata[i][1][k]) {
					inputbox.write(1);
					var operation = convdata[i][1][j] + ' ▸ ' + convdata[i][1][k];
					var ratio = calculate(type, operation);
					if((ratio%1 < 0.99 ) && ((1/ratio)%1 < 0.99 ) && 
						(ratio%1 > 0.01 ) && ((1/ratio)%1 > 0.01 ) 
						&& (ratio > 0.0001) && (ratio < 1000)) {
						hashtable.push([type, operation, Number(ratio.toPrecision(5))]);
					}
				}
			}
		}
	}
}
inputbox.removeall();
outputbox.removeall();
console.log('conversion prediction table generated');
console.log(JSON.stringify(hashtable));