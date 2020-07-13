function beautifydate(date) {
    date = String(date);
    let months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    let year = date.slice(0, 4);
    let month = parseInt(date.slice(4, 6));
    let day = date.slice(6, );
    return `${months[month-1]} ${day}, ${year}`;
}
if(beautifydate(20200128) === 'January 28, 2020') {
    console.log('beautifydate passed');
} else { console.log('beautifydate failed'); }

function beautifytime(time) {
    let seconds = String(time%60);
    if (seconds.length === 1) { seconds = '0' + seconds;}
    let minutes = String((Math.floor(time/60))%60);
    if (minutes.length === 1) { minutes = '0' + minutes;}
    let hours = String((Math.floor(time/3600))%24);
    if (hours.length === 1) { hours = '0' + hours;}
    return `${hours}:${minutes}:${seconds}`;
}
if (beautifytime(1801) === "00:30:01") {
    console.log('beautifytime passed');
} else {console.log('beautifytime failed');}

function buildanepisode(jsobject, id) {
    let episode = document.createElement('div');
    episode.id = 'episode-' + id;
    episode.class = 'episode';
    let title = document.createElement('h1');
    title.innerText = jsobject.title;
    title.id = 'episode-title-' + id;
    title.class = 'episode-title';
    let link = document.createElement('a');
    link.id = 'episode-link-' + id;
    link.class = 'episode-link';
    link.href = 'https://youtube.com/watch?v=' + jsobject.id;
    let date = document.createElement('h4');
    date.innerText = beautifydate(jsobject.date);
    date.id = 'episode-date-' + id;
    date.class = 'episode-date';
    link.appendChild(title);
    episode.appendChild(link);
    episode.appendChild(date);
    for (let i=0; i < jsobject.script.length; i++) {
        let text = document.createElement('p');
        text.id = 'episode-text-' + id + '-' + String(i);
        text.class = 'episode-text';
        text.innerHTML = `<a href='https://youtube.com/watch?v=${jsobject.id}&t=${jsobject.script[i].timestamp}'>${beautifytime(jsobject.script[i].timestamp)}</a> ${jsobject.script[i].text}`;
        episode.appendChild(text);
    }
    return episode;
}
function buildthepage(scripts) {
    for (let i=0; i < scripts.length; i++) {
       episodes.push(buildanepisode(scripts[i], String(i)));
    }
    return episodes;
}
function resettheresults() {
    let titles = document.getElementsByTagName('h1');
    let dates = document.getElementsByTagName('h4');
    let texts = document.getElementsByTagName('p');
    for (let i=0; i <titles.length; i++) {
        titles[i].style.backgroundColor = '';
    }
    for (let i=0; i <dates.length; i++) {
        dates[i].style.backgroundColor = '';
    }
    for (let i=0; i <texts.length; i++) {
        texts[i].style.backgroundColor = '';
    }
    results.innerHTML = '';
}
function query2list(query) {
    let outputquery = [];
    query = query.replace(symbolcleanupregex, '').split(' ');
    // remove empty strings
    for (let i=0; i < query.length; i++) {
        if (query[i] === '') {
            query.splice(i, 1);
        }
    }
    // generate all possible combinations
    for (let i=0; i < query.length; i++) {
        let tempstring = '';
        for (let j=i; j < query.length; j++) {
            tempstring += query[j] + ' ';
            outputquery.push(tempstring.slice(0, tempstring.length -1));
        }
    }
    // filter useless words out
    for (let i=0; i < outputquery.length; i++) {
        if (unimportantwords.indexOf(outputquery[i]) !== -1)  {
            outputquery.splice(i, 1);
        }
    }
    return outputquery;
}
function list2regex(list) {
    let string = '';
    for (let i=0; i < list.length; i++) {
        string += list[i] + '|';
    }
    string = string.slice(0, string.length-1);
    return new RegExp(string, 'gi');
}
function getresults(query) {
    if (!query) {
        results.innerHTML = '';
        searchbar.style.marginTop = "var(--searchbar-default)";
    } else {
        resettheresults();
        //generate the query list
        let querylist = query2list(query);
        if (querylist == '') {
            results.innerHTML = '<h1>☹️ Not found</h1>';
            searchbar.style.marginTop = "var(--searchbar-default)";
        } else {
            let queryregex = list2regex(querylist);
            console.log(`query=${query}; querylist=${querylist}; queryregex=${queryregex}`);
            searchresults = [];
            // search
            for (let i=0; i < scripts.length; i++) {
                text = [];
                let episodescore = 0;
                let textscore = 0;
                let match;
                let script;
                //search the title
                match = scripts[i].title.replace(symbolcleanupregex, '').match(queryregex);
                if (match !== null) {
                    textscore = 0;
                    for (let k=0; k < match.length; k++) {
                        episodescore += match[k].length*10;
                        textscore += match[k].length*10;
                    }
                    text.push({
                            'text': -2,
                            'textscore': textscore
                        }
                    );
                }
                //search the date
                match = String(scripts[i].date).match(queryregex);
                if (match !== null) {
                    textscore = 0;
                    for (let k=0; k < match.length; k++) {
                        episodescore += match[k].length*10;
                        textscore += match[k].length*10;
                    }
                    text.push({
                            'text': -1,
                            'textscore': textscore
                        }
                    );
                }
                //search the text
                for (let j=0; j < scripts[i].script.length; j++) {
                    script = scripts[i].script[j].text.replace(symbolcleanupregex, '');
                    match = script.match(queryregex);
                    if (match !== null) {
                        textscore = 0;
                        for (let k=0; k < match.length; k++) {
                            episodescore += match[k].length;
                            textscore += match[k].length;
                        }
                        text.push({
                                'text': j,
                                'textscore': textscore
                            }
                        );
                    }
                }
                text.sort(function(a, b) { 
                    return b.textscore - a.textscore; 
                });
                //record the findings
                if (text.length !== 0) {
                    searchresults.push({
                        'episode': i,
                        'text': text,
                        'episodescore': episodescore
                        }
                    );
                }
            }
            searchresults.sort(function(a, b) { 
                return b.episodescore - a.episodescore; 
            });
            // search result
            console.log(searchresults);
            if (searchresults.length === 0) {
                results.innerHTML = '<h1>☹️ Not found</h1>';
                searchbar.style.marginTop = "var(--searchbar-default)";
            } else {
                searchbar.style.marginTop = "var(--searchbar-input)";
                for (let i=0; (i < searchresults.length) && (i < 10); i++) {
                    let episode = searchresults[i].episode;
                    results.appendChild(episodes[episode]);
                    // for (let j=0; ((j < searchresults[i].text.length) && (j < 1)); j++) {
                    let textindex = searchresults[i].text[0].text;
                    let textid;
                    if (textindex === -2) {
                        textid = 'episode-title-' + episode;
                    } else if (textindex === -1) {
                        textid = 'episode-date-' + episode;
                    } else {
                        textid = 'episode-text-' + episode + '-' + textindex;
                    }
                    document.getElementById(textid).style.backgroundColor = 'var(--highlight)';
                    // }
                }
            }
        }
    }
}
// load the scripts
episodes = [];
scripts = undefined;
fetch('./scripts.json').then(response => {
    let storagename = 'kilianscripts.v1';
    if (response.status !== 200) {
    	scripts = JSON.parse(window.localStorage.getItem(storagename));
        episodes = buildthepage(scripts);
    } else {
    	response.json().then( data => {
    		scripts = data;
    		window.localStorage.setItem(storagename, JSON.stringify(scripts));
            episodes = buildthepage(scripts);
    	});
    }
}).catch(function(err) {
    scripts = JSON.parse(window.localStorage.getItem(storagename));
    episodes = buildthepage(scripts);
});

//search operation
searchbar = document.getElementById('searchbar');
searchbox = document.getElementById('searchbox');
results = document.getElementById('results');
text = [];
searchresults = [];

searchbox.addEventListener('keydown', event => {
    if (event.key === "Enter") {
        getresults(event.target.value);
    }
});

searchbox.addEventListener('input', event => {
    if(searchbox.value === '') {
        searchbar.style.marginTop = "var(--searchbar-default)";
        results.innerHTML = '';
    }
});
//globals
unimportantwords = [ 'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z', 'the', 'a', 'an', 'every', 'this', 'those', 'many',  'aboard', 'about', 'above', 'across', 'after', 'against', 'along', 'amid', 'among', 'anti', 'around', 'as', 'at', 'before', 'behind', 'below', 'beneath', 'beside', 'besides', 'between', 'beyond', 'but', 'by', 'concerning', 'considering', 'despite', 'down', 'during', 'except', 'excepting', 'excluding', 'following', 'for', 'from', 'in', 'inside', 'into', 'like', 'minus', 'near', 'of', 'off', 'on', 'onto', 'opposite', 'outside', 'over', 'past', 'per', 'plus', 'regarding', 'round', 'save', 'since', 'than', 'through', 'to', 'toward', 'towards', 'under', 'underneath', 'unlike', 'until', 'up', 'upon', 'versus', 'via', 'with', 'within', 'without', "all", "another", "any", "anybody", "anyone", "anything", "as", "aught", "both", "each", "each other", "either", "enough", "everybody", "everyone", "everything", "few", "he", "her", "hers", "herself", "him", "himself", "his", "I", "idem", "it", "its", "itself", "many", "me", "mine", "most", "my", "myself", "naught", "neither", "no one", "nobody", "none", "nothing", "nought", "one", "one another", "other", "others", "ought", "our", "ours", "ourself", "ourselves", "several", "she", "some", "somebody", "someone", "something", "somewhat", "such", "suchlike", "that", "thee", "their", "theirs", "theirself", "theirselves", "them", "themself", "themselves", "there", "these", "they", "thine", "this", "those", "thou", "thy", "thyself", "us", "we", "what", "whatever", "whatnot", "whatsoever", "whence", "where", "whereby", "wherefrom", "wherein", "whereinto", "whereof", "whereon", "wherever", "wheresoever", "whereto", "whereunto", "wherewith", "wherewithal", "whether", "which", "whichever", "whichsoever", "who", "whoever", "whom", "whomever", "whomso", "whomsoever", "whose", "whosever", "whosesoever", "whoso", "whosoever", "ye", "yon", "yonder", "you", "your", "yours", "yourself", "yourselves", "and", "that", "but", "or", "as", "if", "when", "than", "because", "while", "where", "after", "so", "though", "since", "until", "whether", "before", "although", "nor", "like", "once", "unless", "now", "except", 'not', 'yes', 'no', 'do', 'does', 'did', 'has', 'have', 'had', 'is', 'am', 'are', 'was', 'were', 'be', 'being', 'been', 'may', 'must', 'might', 'should', 'could', 'would', 'shall', 'will', 'can'];
symbolcleanupregex = /[^a-zA-Z0-9\s]*/gi;
// register service workers
if ('serviceWorker' in navigator) {
	navigator.serviceWorker.register('./install.js');
} else {
	console.log('serice worker not supported');
}
// traffic
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', 'UA-166908735-1');