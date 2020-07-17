// global
unimportantwords = [ 'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z', 'the', 'a', 'an', 'every', 'this', 'those', 'many',  'aboard', 'about', 'above', 'across', 'after', 'against', 'along', 'amid', 'among', 'anti', 'around', 'as', 'at', 'before', 'behind', 'below', 'beneath', 'beside', 'besides', 'between', 'beyond', 'but', 'by', 'concerning', 'considering', 'despite', 'down', 'during', 'except', 'excepting', 'excluding', 'following', 'for', 'from', 'in', 'inside', 'into', 'like', 'minus', 'near', 'of', 'off', 'on', 'onto', 'opposite', 'outside', 'over', 'past', 'per', 'plus', 'regarding', 'round', 'save', 'since', 'than', 'through', 'to', 'toward', 'towards', 'under', 'underneath', 'unlike', 'until', 'up', 'upon', 'versus', 'via', 'with', 'within', 'without', "all", "another", "any", "anybody", "anyone", "anything", "as", "aught", "both", "each", "each other", "either", "enough", "everybody", "everyone", "everything", "few", "he", "her", "hers", "herself", "him", "himself", "his", "I", "idem", "it", "its", "itself", "many", "me", "mine", "most", "my", "myself", "naught", "neither", "no one", "nobody", "none", "nothing", "nought", "one", "one another", "other", "others", "ought", "our", "ours", "ourself", "ourselves", "several", "she", "some", "somebody", "someone", "something", "somewhat", "such", "suchlike", "that", "thee", "their", "theirs", "theirself", "theirselves", "them", "themself", "themselves", "there", "these", "they", "thine", "this", "those", "thou", "thy", "thyself", "us", "we", "what", "whatever", "whatnot", "whatsoever", "whence", "where", "whereby", "wherefrom", "wherein", "whereinto", "whereof", "whereon", "wherever", "wheresoever", "whereto", "whereunto", "wherewith", "wherewithal", "whether", "which", "whichever", "whichsoever", "who", "whoever", "whom", "whomever", "whomso", "whomsoever", "whose", "whosever", "whosesoever", "whoso", "whosoever", "ye", "yon", "yonder", "you", "your", "yours", "yourself", "yourselves", "and", "that", "but", "or", "as", "if", "when", "than", "because", "while", "where", "after", "so", "though", "since", "until", "whether", "before", "although", "nor", "like", "once", "unless", "now", "except", 'not', 'yes', 'no', 'do', 'does', 'did', 'has', 'have', 'had', 'is', 'am', 'are', 'was', 'were', 'be', 'being', 'been', 'may', 'must', 'might', 'should', 'could', 'would', 'shall', 'will', 'can'];

symbolcleanupregex = /[^a-zA-Z0-9\s]*/gi;
globalscripts = undefined;
storagename = 'kilianscripts.v1';
fetch('./scripts.json').then(response => {
    if (response.status !== 200) {
        globalscripts = JSON.parse(window.localStorage.getItem(storagename));
    } else {
        response.json().then( data => {
            globalscripts = data;
            window.localStorage.setItem(storagename, JSON.stringify(globalscripts));
        });
    }
}).catch(function(err) {
    globalscripts = JSON.parse(window.localStorage.getItem(storagename));
});

//search operation
globalsearchbar = document.getElementById('searchbar');
globalsearchbox = document.getElementById('searchbox');
globalresultnode = document.getElementById('results');
//
function beautifydate(date) {
    date = String(date);
    let months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    let year = date.slice(0, 4);
    let month = parseInt(date.slice(4, 6));
    let day = date.slice(6, );
    return `${months[month-1]} ${day}, ${year}`;
}

function beautifytime(time) {
    let seconds = String(time%60);
    if (seconds.length === 1) { seconds = '0' + seconds;}
    let minutes = String((Math.floor(time/60))%60);
    if (minutes.length === 1) { minutes = '0' + minutes;}
    let hours = String((Math.floor(time/3600))%24);
    if (hours.length === 1) { hours = '0' + hours;}
    return `${hours}:${minutes}:${seconds}`;
}

function query2list(querystring) {
    let outputquery = [];
    querystring = querystring.replace(symbolcleanupregex, '').split(' ');
    // remove empty strings
    for (let i=0; i < querystring.length; i++) {
        if (querystring[i] === '') {
            querystring.splice(i, 1);
        }
    }
    // generate all possible combinations
    for (let i=0; i < querystring.length; i++) {
        let tempstring = '';
        for (let j=i; j < querystring.length; j++) {
            tempstring += querystring[j] + ' ';
            outputquery.push(tempstring.slice(0, tempstring.length -1));
        }
    }
    // filter useless words out
    for (let i=0; i < outputquery.length; i++) {
        if (unimportantwords.indexOf(outputquery[i]) !== -1)  {
            outputquery.splice(i, 1);
        }
    }
    outputquery.sort(function(a, b) { 
        return b.length - a.length; 
    });
    return outputquery;
}

function list2regex(querylist) {
    let string = '';
    for (let i=0; i < querylist.length; i++) {
        string += querylist[i] + '|';
    }
    string = string.slice(0, string.length-1);
    return new RegExp(string, 'gi');
}

function noresults(resultnode) {
    resultnode.innerHTML = '';
    resultnode.innerHTML = "<br><h1>Kilian didn't say that, instead he said these... things...</h1><br><center><div id='twitter-timeline'><a class='twitter-timeline' data-dnt='true' href='https://twitter.com/KilExperience?ref_src=twsrc%5Etfw'>Tweets by KilExperience</a></div></center><br>";
    let script = document.createElement('script');
    script.src = 'https://platform.twitter.com/widgets.js';
    script.charset = 'utf-8';
    document.head.appendChild(script);
}

function buildanepisode(jsobject, id, textindex) {
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
    link.href = `https://youtube.com/watch?v=${jsobject.id}&t=1s`;
    link.target = "_blank";
    let date = document.createElement('h4');
    date.innerText = beautifydate(jsobject.date);
    date.id = 'episode-date-' + id;
    date.class = 'episode-date';
    link.appendChild(title);
    episode.appendChild(link);
    episode.appendChild(date);
    if (textindex > -1) {
    let text = document.createElement('p');
    text.id = 'episode-text-' + id + '-' + String(textindex);
    text.class = 'episode-text';
    text.innerHTML = `<a target = "_blank" href='https://youtube.com/watch?v=${jsobject.id}&t=${jsobject.script[textindex].timestamp}'>${beautifytime(jsobject.script[textindex].timestamp)}</a> ${jsobject.script[textindex].text}`;
    episode.appendChild(text);
    }
    let image = document.createElement('img');
    image.id = 'episode-image-' + id;
    image.class = 'episode-image';
    image.src =`./images/${jsobject.date}.png`;
    image.addEventListener('error', event => {
        event.target.src = './images/episode-default.jpg';
        event.target.removeEventListener('error', event);
    });
    episode.appendChild(image);
    return episode;
}

function search(queryregex, scriptsobject) {
    let searchresults = [];
    let text = [];
    let episodescore = 0;
    let textscore = 0;
    let match;
    // search
    for (let i=0; i < scriptsobject.length; i++) {
        episodescore = 0;
        text = [];
        //search the title
        match = (scriptsobject[i].title).replace(symbolcleanupregex, '').match(queryregex);
        if (match !== null) {
            textscore = 0;
            for (let k=0; k < match.length; k++) {
                episodescore += (match[k].length**2.5);
                textscore += (match[k].length**2.5);
            }
            text.push({
                'textindex': -2,
                'textscore': textscore,
                'matches': match
            });
        }
        //search the date
        match = String(scriptsobject[i].date).match(queryregex);
        if (match !== null) {
            textscore = 0;
            for (let k=0; k < match.length; k++) {
                episodescore += (match[k].length**2.5);
                textscore += (match[k].length**2.5);
            }
            text.push({
                'textindex': -1,
                'textscore': textscore,
                'matches': match
            });
        }
        //search the text
        for (let j=0; j < scriptsobject[i].script.length; j++) {
            match = scriptsobject[i].script[j].text.replace(symbolcleanupregex, '').match(queryregex);
            if (match !== null) {
                textscore = 0;
                for (let k=0; k < match.length; k++) {
                    episodescore += (match[k].length**2);
                    textscore += (match[k].length**2);
                }
                text.push({
                    'textindex': j,
                    'textscore': textscore,
                    'matches': match
                });
            }
        }
        text.sort(function(a, b) { 
            return b.textscore - a.textscore; 
        });
        //record the findings
        if (text.length !== 0) {
            searchresults.push({
                'episodeindex': i,
                'texts': text,
                'episodescore': episodescore
            });
        }
    }
    searchresults.sort(function(a, b) { 
        return b.episodescore - a.episodescore; 
    });
    return searchresults;
}

function printresults(resultlist, scriptsobject, resultnode) {
    resultnode.innerHTML = '';
    resultnode.appendChild(document.createElement('br'));
    for (let i=0; ((i < resultlist.length) && (i < 15)); i++) {
        let episodeindex = resultlist[i].episodeindex;
        let textindex = resultlist[i].texts[0].textindex;
        let episode = buildanepisode(scriptsobject[episodeindex], episodeindex, textindex);
        resultnode.appendChild(episode);
    }
    resultnode.appendChild(document.createElement('br'));
}

globalsearchbox.addEventListener('keydown', event => {
    if ((event.key === "Enter") && (globalsearchbox.value !== '')) {
        document.body.style.marginTop = "var(--searchbar-input)";
        let querylist = query2list(globalsearchbox.value);
        if (querylist.length === 0) {
            noresults(globalresultnode);
        } else {
            let resultlist = search(list2regex(querylist), globalscripts);
            if (resultlist.length === 0) {
                noresults(globalresultnode);
            } else {
console.log(globalsearchbox.value, querylist, list2regex(querylist), resultlist);
globalsearchbox.blur();
                printresults(resultlist, globalscripts, globalresultnode);
            }
        }
    }
});

globalsearchbox.addEventListener('input', event => {
    if (globalsearchbox.value === '') {
        document.body.style.marginTop = "var(--searchbar-default)";
        globalresultnode.innerHTML = '';
    }
});

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

// // tests
// if(beautifydate(20200128) === 'January 28, 2020') {
//     console.log('beautifydate passed');
// } else { console.log('beautifydate failed'); }
// if (beautifytime(1801) === "00:30:01") {
//     console.log('beautifytime passed');
// } else {console.log('beautifytime failed');}
// console.log(query2list('is it a bird?'));
// if (query2list('is it a bird?').length === ['is it', 'is it a', 'is it a bird','it a', 'it a bird', 'a bird', 'bird'].length) {
//     console.log('query2list passed');
// } else {
//     console.log('query2list failed');
// }