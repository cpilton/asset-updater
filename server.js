// Initialise express
const express = require('express');
const app = express();

// Initialise body-parser
const bodyParser = require('body-parser');
app.use(bodyParser.json());

// Initialise http
const http = require('http')
const https = require('https')
const server = http.Server(app);

// Initialise got & cheerio
const got = require('got');
const cheerio = require('cheerio');

// Initialise fs
const fs = require('fs');
const path = require('path');

// Initialise sockets
const io = require('socket.io')(server);

// Initialise file operations
const AdmZip = require('adm-zip');

// Tell express where static files are kept
app.use(express.static(__dirname + '/public'));
const historyFilePath = __dirname + '/private/history.json';

var favicon = require('serve-favicon');
app.use(favicon(path.join(__dirname, 'public', 'img', 'logo.ico')));

// Start the app on port 3000
app.set('port', 3001);
server.listen(app.get('port'));

let connections = 0;

io.on('connection', function(socket){
    connections++;
    socket.on('disconnect', function(){
        connections--;
        if (connections === 0) {
            stopServer();
        }
    });
});

var sockets = {}, nextSocketId = 0;
server.on('connection', function (socket) {
    // Add a newly connected socket
    var socketId = nextSocketId++;
    sockets[socketId] = socket;

    // Remove the socket when it closes
    socket.on('close', function () {
        delete sockets[socketId];
    });

    // Extend socket lifetime for demo purposes
    socket.setTimeout(4000);
});

function stopServer() {
    // Close the server
    server.close(function () { console.log('Server closed!'); });
    // Destroy all open sockets
    for (var socketId in sockets) {
        console.log('socket', socketId, 'destroyed');
        sockets[socketId].destroy();
    }
}


/** Functions */

async function removeExistingFile(path) {
    try {
        await fs.unlinkSync(path);
        return true;
    } catch (err) {
        return false;
    }
}

async function removeExistingFolder(dir) {
    try {
        await fs.rmdirSync(dir, {recursive: true});
        return true;
    } catch (err) {
        return false;
    }
}

async function extractFile(downloadPath, assetPath) {
    try {
        var zip = new AdmZip(downloadPath);
        zip.extractAllTo(assetPath, true);
        return true;
    } catch (err) {
        console.log(err)
        return false;
    }
}

async function handleFileWaiting(uuid) {
    return new Promise((resolve, reject) => {
        setTimeout(async function () {
            resolve(await waitForDownloadSlot(uuid));
        }, 250);
    });
}

async function getFile(uuid, assetName) {
    let url = 'https://backend-02-prd.' + downloader + 'api/download/transmit?uuid=' + uuid;
    let path = __dirname + '/downloads/' + assetName + '.zip'

    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(path);
        let fileInfo = null;

        const request = https.get(url, response => {
            if (response.statusCode !== 200) {
                reject(`Failed to get '${url}' (${response.statusCode})`);
                return;
            }

            fileInfo = {
                mime: response.headers['content-type'],
                size: parseInt(response.headers['content-length'], 10),
            };

            response.pipe(file);
        });

        // The destination stream is ended by the time it's called
        file.on('finish', () => resolve(fileInfo));

        request.on('error', err => {
            fs.unlink(path, () => reject(err));
        });

        file.on('error', err => {
            fs.unlink(path, () => reject(err));
        });

        request.end();
    }).catch(function (error) {
        console.log(error)
        return false;
    });
}

async function waitForDownloadSlot(uuid) {
    let url = 'https://backend-02-prd.' + downloader + 'api/download/status';
    let data = {"uuids": [uuid]};

    const {body} = await got.post(url, {
            json: data,
            responseType: 'json'
        }
    );

    if (body[uuid].progress === 200) {
        return true;
    } else {
        return false;
    }
}

async function getUuid(id) {
    let url = 'https://backend-02-prd.' + downloader + 'api/download/request';
    let data = {
        "publishedFileId": parseInt(id),
        "collectionId": null,
        "extract": true,
        "hidden": false,
        "direct": false,
        "autodownload": false
    };

    const {body} = await got.post(url, {
            json: data,
            responseType: 'json'
        }
    );

    return body.uuid;
}

locateDownloader();

var downloader;

async function locateDownloader() {
    var url = 'https://steamworkshopdownloader.io';

    const response = await got(url);
    downloader = response.url.replace('https://', '');
}

async function getUpdateDate(url) {
    try {
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

        return {status: 200, date: new Date(year, month, day, hours, minutes, 0, 0)};
    } catch (e) {
        return {status: 500}
    }
}

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
    let retries = 0, data = {status: 0};

    do {
        data = await getUpdateDate(url);
        status = data.status;
    } while (data.status !== 200 || retries >= 3)

    res.json({updateTime: data.date});
});

app.post("/api/updateAsset/", async function (req, res) {
    let id = req.body.id;
    let path = req.body.path;
    let assetName = req.body.name;
    let fileReady = false;

    let uuid = await getUuid(id);

    io.sockets.emit('progressUpdate', {id: id, progress: 10});

    fileReady = await waitForDownloadSlot(uuid);
    let retries = 0;
    if (!fileReady) {
        do {
            fileReady = await handleFileWaiting(uuid);
            retries++;
        } while (!fileReady && retries < 120);
    }

    if (!fileReady) {
        res.sendStatus(500);
        return;
    }

    io.sockets.emit('progressUpdate', {id: id, progress: 45});

    let downloadPath = await getFile(uuid, assetName);
    downloadPath.path = __dirname + '/downloads/' + assetName + '.zip';

    if (downloadPath.mime === undefined) {
        res.sendStatus(500);
        return;
    }

    io.sockets.emit('progressUpdate', {id: id, progress: 80});

    if (!await removeExistingFolder(path)) {
        res.sendStatus(500);
        return;
    }

    io.sockets.emit('progressUpdate', {id: id, progress: 85});

    if (!await extractFile(downloadPath.path, path)) {
        res.sendStatus(500);
        return;
    }

    io.sockets.emit('progressUpdate', {id: id, progress: 90});

    if (!await removeExistingFile(downloadPath.path)) {
        res.sendStatus(500);
        return;
    }

    io.sockets.emit('progressUpdate', {id: id, progress: 100});

    res.json({status: 200});
});