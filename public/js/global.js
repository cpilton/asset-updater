// GET a URL and return the response
async function getURL(URL) {
    try {
        const res = await fetch(URL, {method: 'GET'});
        return {status: res.status, data: await res.json()};
    } catch (err) {
        console.log('ERROR: GET request failed', err);
    }
}

// POST to a URL and return the response
async function postURL(URL, data) {
    try {
        const res = await fetch(URL, {
            method: 'POST',
            body: JSON.stringify(data),
            headers: {
                'Content-Type': 'application/json'
            }
        });
        return {status: res.status, data: await res.json()};
    } catch (err) {
        console.log('ERROR: POST request failed', err);
    }
}

function timeSince(date) {

    var seconds = Math.floor((new Date() - date) / 1000);

    var interval = seconds / 31536000;

    if (interval > 1) {
        if (Math.floor(interval) === 1)
            return Math.floor(interval) + " year";
        else
            return Math.floor(interval) + " years";
    }
    interval = seconds / 2592000;
    if (interval > 1) {
        if (Math.floor(interval) === 1)
            return Math.floor(interval) + " month";
        else
            return Math.floor(interval) + " months";
    }
    interval = seconds / 86400;
    if (interval > 1) {
        if (Math.floor(interval) === 1)
            return Math.floor(interval) + " day";
        else
            return Math.floor(interval) + " days";
    }
    interval = seconds / 3600;
    if (interval > 1) {
        if (Math.floor(interval) === 1)
            return Math.floor(interval) + " hour";
        else
            return Math.floor(interval) + " hours";
    }
    interval = seconds / 60;
    if (interval > 1) {
        if (Math.floor(interval) === 1)
            return Math.floor(interval) + " minute";
        else
            return Math.floor(interval) + " minutes";
    }
    if (Math.floor(interval) === 1)
        return Math.floor(interval) + " second";
    else
        return Math.floor(interval) + " seconds";
}

function notify(message) {
    resetNotify();
    $('#notify-message').html(message);
    setTimeout(function () {
        showNotify();
    }, 10);

    setTimeout(function () {
        hideNotify();
    }, 5000)
}

function showNotify() {
    $('#notify').show();
    setTimeout(function () {
        $('#notify').css('top', '50px');
    }, 10);
}

function hideNotify() {
    $('#notify').fadeOut(500);
    setTimeout(function () {
        $('#notify').css('top', '-100px');
    }, 350);
}

function resetNotify() {
    $('#notify').hide();
    $('#notify').css('top', '-100px');
}

function openTab(tab) {
    window.location.href = '/' + tab;
}

function openLink(link) {
    window.open(link);
}