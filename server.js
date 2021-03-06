// Initialise express
const express = require('express');
const app = express();

// Initialise body-parser
const bodyParser = require('body-parser');
app.use(bodyParser.json());

// Initialise http
const http = require('http')
const server = http.Server(app);

// Initialise got & cheerio
const got = require('got');
const cheerio = require('cheerio');

// Initialise fs
const fs = require('fs');
const path = require('path');

// Tell express where static files are kept
app.use(express.static(__dirname + '/public'));
const historyFilePath = __dirname + '/private/history.json';

// Start the app on port 3000
app.set('port', 3000);
server.listen(app.get('port'));

/** Functions */

function getMonthFromString(mon) {

    var d = Date.parse(mon + "1, 2012");
    if (!isNaN(d)) {
        return new Date(d).getMonth() + 1;
    }
    return -1;
}

const getFileUpdatedDate = (path) => {
    const stats = fs.statSync(path)
    return stats.mtime
}

function flatten(lists) {
    return lists.reduce((a, b) => a.concat(b), []);
}

function getDirectories(srcpath) {
    return fs.readdirSync(srcpath)
        .map(file => path.join(srcpath, file))
        .filter(path => fs.statSync(path).isDirectory());
}

function getDirectoriesRecursive(srcpath) {
    return [srcpath, ...flatten(getDirectories(srcpath).map(getDirectoriesRecursive))];
}

function validFolder(folder) {
    folder = folder.split('\\')[folder.split('\\').length - 1];
    const regex = new RegExp('\\d{9,10}_');
    return regex.test(folder);
}

function updateHistory(path) {
    let data = {folders: []};

    if (fs.existsSync(historyFilePath)) {
        data = JSON.parse(fs.readFileSync(historyFilePath, 'utf8'));
    }

    if (data.folders.indexOf(path) === -1) {
        if (data.folders.length === 3) {
            data.folders.shift()
        }
        data.folders.push(path)
        fs.writeFileSync(historyFilePath, JSON.stringify(data));
    }
}

/** Web Pages */
app.get('/', function (req, res) {
    res.sendFile(__dirname + '/public/updater.html');
});

app.get("/api/getHistory/", function (req, res) {
    if (fs.existsSync(historyFilePath)) {
        res.json(JSON.parse(fs.readFileSync(historyFilePath, 'utf8')));
    } else {
        res.sendStatus(500);
    }
});

app.post("/api/updateHistory/", function (req, res) {
    let history = req.body.history;
    updateHistory(history);
});

app.post("/api/checkFolder/", function (req, res) {
    let path = req.body.path;
    let assets = [];
    let folders = getDirectoriesRecursive(path).filter(validFolder);

    if (folders.length) {
        folders.forEach(function (folder) {
            let updateDate = getFileUpdatedDate(folder);
            assets.push({folder: folder, updateDate: updateDate});
        });
        res.send(assets);

        updateHistory(path);
    } else {
        res.sendStatus(500);
    }
});

app.post("/api/checkPath/", function (req, res) {
    let path = req.body.path;
    if (fs.existsSync(path)) {
        res.json(true);
    } else {
        res.json(false);
    }
});


app.post("/api/checkForUpdate/", async function (req, res) {
    let id = req.body.id;
    let url = 'https://steamcommunity.com/sharedfiles/filedetails/changelog/' + id;

    const response = await got(url);
    const html = response.body;
    const $ = cheerio.load(html);

    let lastUpdate = ($('.changelog').first().text());

    let yearIncluded = lastUpdate.indexOf(',');
    let pm = lastUpdate.indexOf('pm');

    lastUpdate = lastUpdate.replace('Update: ', '').replace('@ ', '').replace(', ', ' ').replace('am', '').replace('pm', '').trim();
    lastUpdate = lastUpdate.split(' ');

    let year, month, day, hours, minutes;

    if (yearIncluded !== -1) {
        year = +lastUpdate[2];
        month = +getMonthFromString(lastUpdate[1]) - 1;
        day = +lastUpdate[0];
        hours = +lastUpdate[3].split(':')[0] + 8;
        minutes = +lastUpdate[3].split(':')[1];
    } else {
        year = +new Date().getFullYear();
        month = +getMonthFromString(lastUpdate[1]) - 1;
        day = +lastUpdate[0];
        hours = +lastUpdate[2].split(':')[0] + 8;
        minutes = +lastUpdate[2].split(':')[1];
    }

    if (pm !== -1) {
        hours += 12;
    }

    let updateTime = new Date(year, month, day, hours, minutes, 0, 0)

    res.json({updateTime: updateTime});
});

