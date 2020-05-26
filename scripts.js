window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', 'UA-166908735-1');

document.addEventListener('click', event => {
    let target = event.target.id;
    switch(target) {
        case 'edge': case 'opera':
            alert('Coming Soon!');
            break; 
    }
});