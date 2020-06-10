lookuptable = [["area","km² ▸ mile²",0.39063],
["area","hect ▸ acre",2.4711],
["area","m² ▸ ft²",10.764],
["area","m² ▸ yd²",1.196],
["area","cm² ▸ inch²",0.155],
["area","inch² ▸ cm²",6.4516],
["area","ft² ▸ m²",0.092903],
["area","yd² ▸ m²",0.83613],
["area","acre ▸ hect",0.40469],
["area","mile² ▸ km²",2.56],
["energy","Wh ▸ kJ",3.6],
["energy","Wh ▸ kcal",0.86042],
["energy","Wh ▸ BTU",3.4121],
["energy","kJ ▸ Wh",0.27778],
["energy","kJ ▸ kcal",0.23901],
["energy","kJ ▸ BTU",0.9478],
["energy","J ▸ cal",0.23901],
["energy","cal ▸ J",4.184],
["energy","kcal ▸ Wh",1.1622],
["energy","kcal ▸ kJ",4.184],
["energy","kcal ▸ BTU",3.9656],
["energy","BTU ▸ Wh",0.29308],
["energy","BTU ▸ kJ",1.0551],
["energy","BTU ▸ kcal",0.25217],
["length","km ▸ mile",0.62137],
["length","m ▸ inch",39.37],
["length","m ▸ ft",3.2808],
["length","m ▸ yard",1.0936],
["length","cm ▸ inch",0.3937],
["length","cm ▸ ft",0.032808],
["length","cm ▸ yard",0.010936],
["length","mm ▸ inch",0.03937],
["length","inch ▸ m",0.0254],
["length","inch ▸ cm",2.54],
["length","inch ▸ mm",25.4],
["length","ft ▸ m",0.3048],
["length","ft ▸ cm",30.48],
["length","yard ▸ m",0.9144],
["length","yard ▸ cm",91.44],
["length","mile ▸ km",1.6093],
["mass","kg ▸ oz",35.274],
["mass","kg ▸ lb",2.2046],
["mass","g ▸ oz",0.035274],
["mass","oz ▸ kg",0.028349],
["mass","oz ▸ g",28.349],
["mass","lb ▸ kg",0.45359],
["pressure","bar ▸ psi",14.504],
["pressure","bar ▸ atm",0.98693],
["pressure","torr ▸ psi",0.019337],
["pressure","psi ▸ bar",0.068947],
["pressure","psi ▸ torr",51.715],
["pressure","psi ▸ atm",0.068046],
["pressure","atm ▸ bar",1.0132],
["pressure","atm ▸ psi",14.696],
["volume","L ▸ tbs",67.628],
["volume","L ▸ cup",4.1667],
["volume","L ▸ oz",33.814],
["volume","L ▸ qt",1.0567],
["volume","L ▸ gal",0.26417],
["volume","mL ▸ tsp",0.20288],
["volume","mL ▸ tbs",0.067628],
["volume","mL ▸ oz",0.033814],
["volume","tsp ▸ mL",4.9289],
["volume","tsp ▸ cup",0.020537],
["volume","tbs ▸ L",0.014787],
["volume","tbs ▸ mL",14.787],
["volume","tbs ▸ cup",0.061612],
["volume","cup ▸ L",0.24],
["volume","cup ▸ tsp",48.692],
["volume","cup ▸ tbs",16.231],
["volume","cup ▸ oz",8.1154],
["volume","cup ▸ qt",0.25361],
["volume","cup ▸ gal",0.063401],
["volume","oz ▸ L",0.029574],
["volume","oz ▸ mL",29.574],
["volume","oz ▸ cup",0.12322],
["volume","qt ▸ L",0.94635],
["volume","qt ▸ cup",3.9431],
["volume","gal ▸ L",3.7854],
["volume","gal ▸ cup",15.773]];

function log (type, operation) {
	var ipstring = inputbox.read();
	if ((type == 'simple') && ((ipstring.split('*').length == 2) 
			|| (ipstring.split('×').length == 2) 
			|| (ipstring.split('/').length == 2))) {
		try {
			var probableinput = eval(ipstring.split('*').toString().split(
						'×').toString().split('/').toString().split(',')[0]);
			var probableratio = evaluated/probableinput;
			var i = 0
			var hashsize = lookuptable.length;
			while (i < hashsize) {
				if  ((probableratio/lookuptable[i][2] < 1.001) 
					&& (probableratio/lookuptable[i][2] > 0.999)){
					type = lookuptable[i][0];
					operation = lookuptable[i][1];
					console.log('conversion detected: ' +operation + ' ' + type);
					break;}
				i++;
			}
		} catch {

		}
	}
	if (type != 'simple') {
		var opindex = 0;
		while ((opindex < userpref.conversionlog.length) &&
			(operation != userpref.conversionlog[opindex]['operation']) ) {
			opindex++;
		}
		if (opindex != userpref.conversionlog.length) {
			userpref.conversionlog[opindex].usecount += 1;
		} else {
			userpref.conversionlog.push({
				'operation' : operation,
				'usecount'	: 1,
				'type': type
			});
		}
		userpref.conversionlog.sort(function(a, b) { 
			return b.usecount - a.usecount; 
		});
		console.log(userpref);
		saveuserpref();	loaduserpref();
	}
}
if ('serviceWorker' in navigator) {
	navigator.serviceWorker.register('./install.js');
} else {
	console.log('serice worker not supported');
}
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', 'UA-166908735-1');