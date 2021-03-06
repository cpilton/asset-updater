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