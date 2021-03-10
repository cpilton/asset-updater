let updates = 0;
let assets = 0;
let assetsChecked = 0;

let assetList = [];
let dependencyList = [];

var socket = io();

socket.on('progressUpdate', function (data) {
    if (data.success) {
        updateProgressBar('update-' + data.id, data.progress);
        if (data.progress === 100) {
            $('#update-' + data.id + ' button').prop('disabled', true);
        }
    } else {
        failUpdate('update-' + data.id);
    }
});

getURL('/api/getHistory/')
    .then(function (res) {
        if (res && res.status === 200) {
            renderHistory(res.data);
        } else {
            renderHistory({}, 'No recent folders found')
        }
    });

function checkForAssets(path) {
    postURL('/api/checkFolder/', {path: path})
        .then(function (res) {
            if (res && res.status === 200) {
                updatePath(path);
                resetAssets();
                updateUpdateCount(updates = 0);
                renderAssets(res.data);
                updateCount(Object.keys(res.data).length);
                checkAssets(res.data);
            } else {
                notify('No assets detected');
            }
        });
}

function checkForUpdate(assetId) {
    if (assetList.indexOf(assetId) === -1) {
        assetList.push(assetId);
    }

    postURL('/api/checkForDependencies/', {id: assetId})
        .then(function (res) {
            if (res && res.status === 200) {
                updateAsset(assetId, res.data);
                renderDependency(res.data.dependencies, assetId);
            } else {
                notify('Failed to check for update');
            }
        });
}

function downloadAsset(assetId) {
    postURL('/api/downloadAsset/' + assetId)
        .then(function (res) {
            if (res == undefined || res.status !== 200) {
                notify('Failed to update ' + assetId);
            }
        });
}

async function validPath(path) {
    let validPath = false;
    await postURL('/api/checkPath/', {path: path})
        .then(function (res) {
            if (res && res.status === 200) {
                validPath = res.data;
            }
        });
    return validPath;
}

async function checkFolder(path) {
    if (path === undefined) {
        path = $('#asset-folder').val();
    }

    if (await validPath(path)) {
        checkForAssets(path);
    } else {
        notify('Invalid path');
    }
}

function renderHistory(history, message) {
    if (message) {
        let recent = $('<div/>').addClass('recent').text(message);
        $('#recent-folders-content').append(recent);
    } else {
        $(history.folders).each(function () {
            let folderPath = this;

            let recent = $('<div/>').addClass('recent');

            let icon = $('<div/>').addClass('icon').attr('id', 'folder-icon');
            let path = $('<div/>').addClass('recent-path').text(this);
            let button = $('<button/>').text('Select');

            button.click(function () {
                checkFolder(folderPath)
            });

            recent.append(icon);
            recent.append(path);
            recent.append(button);

            $('#recent-folders-content').append(recent);
        });
    }
}

function updatePath(path) {
    $('#pathname').html(path);
}

function updateCount(assetCount) {
    $('#assets-count span').html(assetCount);
    assets = assetCount;
}

function updateUpdateCount(updates) {
    if (!updates) {
        updates = 'No';
    }
    $('#assets-summary span').html(updates);
}

function updateProgressBar(id, value) {
    if ($('#' + id + ' .progress-bar').hasClass('failed')) {
        $('#' + id + ' .progress-bar').removeClass('failed');
    }
    $('#' + id + ' .progress-bar').width(value + '%');
}

function failUpdate(id) {
    $('#' + id + ' .progress-bar').width('100%');
    $('#' + id + ' .progress-bar').addClass('failed');
}

function renderAssets(assets) {
    let assetHTML = '';
    $(assets).each(function () {
        let assetPathName = this.folder.split('\\')[this.folder.split('\\').length - 1];
        let assetId = assetPathName.split('_')[0];
        let assetName = assetPathName.split('_');
        assetName.shift();
        assetName = assetName.join(' ');
        assetName = assetName.charAt(0).toUpperCase() + assetName.slice(1);
        const regex = /(\d)\s+(?=\d)/g;
        assetName = assetName.replace(regex, `$1.`);

        assetHTML += '<div class="asset" id="' + assetId + '" updatedate="' + this.updateDate + '" icon="loading"' +
            ' path="' + this.folder + '" pathname="' + assetPathName + '">';
        assetHTML += '<div class="icon"></div>';
        assetHTML += '<div class="asset-name">' + assetName + '</div>';

        assetHTML += '</div>';
    });

    $('#assets-content').html(assetHTML);
}

function checkAssets(assets) {
    $(assets).each(function () {
        let assetName = this.folder.split('\\')[this.folder.split('\\').length - 1];
        let assetId = assetName.split('_')[0];
        checkForUpdate(assetId);
    });
}

function updateAsset(asset, data) {
    assetsChecked++;
    updateProgressBar('check-progress', (assetsChecked / assets) * 100)

    if (assetsChecked === assets) {
        $('#selection button').prop('disabled', false);
    } else {
        $('#selection button').prop('disabled', true);
    }

    if (data.dependencies !== undefined) {
        $('#' + asset).attr('icon', 'check');
    } else {
        $('#' + asset).attr('icon', 'close');
    }
}

function renderDependency(dependencies, dependant) {

    for (var dependency in dependencies) {
        if (dependencies.hasOwnProperty(dependency)) {
            if (dependencyList.indexOf(dependency.toString()) === -1 && assetList.indexOf(dependency.toString()) === -1) {
                dependencyList.push(dependency.toString());
                updateUpdateCount(updates = updates + 1);

                if ($('#update-assets-content').text() === 'No assets') {
                    let button = '<button onclick="updateAll()" id="update-all">Download all</button>';
                    $('#update-assets-content').html(button);
                }

                let assetHTML = '';

                assetHTML += '<div class="update-asset" id="update-' + dependency + '">';
                assetHTML += '<div class="icon"></div>';

                assetHTML += '<div class="asset-name tooltip"' +
                    ' onclick="openLink(\'https://steamcommunity.com/sharedfiles/filedetails/?id=' + dependency + '\')">' + dependency;
                assetHTML += '<span class="tooltiptext">';
                assetHTML += '<b>' + dependencies[dependency] + '</b><br/>';
                assetHTML += 'Used by: ' + $('#' + dependant + ' .asset-name').text();
                assetHTML += '<span class="extra"></span>';
                assetHTML += '<span class="number"></span>';
                assetHTML += '<span class="extra2"></span>';
                assetHTML += '</span>';
                assetHTML += '</div>';

                assetHTML += '<div class="progress">';
                assetHTML += '<div class="progress-bar">';
                assetHTML += '<div class="progress-bar-background"></div>';
                assetHTML += '</div>';
                assetHTML += '</div>';

                assetHTML += '<button onclick="downloadAsset(\'' + dependency + '\')">Download</button>';

                assetHTML += '</div>';

                $('#update-assets-content').append(assetHTML);
            } else if (dependencyList.indexOf(dependency.toString()) !== -1) {
                let extras = 0;
                if ($('#update-' + dependency + ' .number').text().length !== 0) {
                    extras = +$('#update-' + dependency + ' .number').text();
                }
                extras = extras + 1;

                $('#update-' + dependency + ' .extra').text(', plus ');
                $('#update-' + dependency + ' .number').text(extras.toString());
                $('#update-' + dependency + ' .extra2').text(' other(s)');
            }
        }
    }
}

function updateAll() {
    $('.update-asset').each(function () {
        let assetId = $(this).attr('id').split('-')[1];
        let path = $('#' + assetId).attr('path');
        let assetName = $('#' + assetId).attr('pathname');
        downloadAsset($(this).attr('id').split('-')[1]);
    });
}

function resetAssets() {
    assetsChecked = 0;
    $('#update-assets-content').html('No assets');
}