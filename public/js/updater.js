let updates = 0;
let assets = 0;
let assetsChecked = 0;

var socket = io();

socket.on('progressUpdate', function(data) {
    updateProgressBar('update-'+data.id, data.progress);
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
    postURL('/api/checkForUpdate/', {id: assetId})
        .then(function (res) {
            if (res && res.status === 200) {
                updateAsset(assetId, res.data);
            } else {
                notify('Failed to check for update');
            }
        });
}

function startUpdate(assetId, path, assetName) {
    postURL('/api/updateAsset/', {id: assetId, path: path, name: assetName})
        .then(function (res) {
            if (res && res.status === 200) {
                $('#update-' + assetId + ' button').prop('disabled', true);
            } else {
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
    $('#' + id + ' .progress-bar').width(value + '%');
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
            ' path="' + this.folder + '" pathname="'+assetPathName+'">';
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

    if (data.updateTime !== undefined) {
        $('#' + asset).attr('icon', 'check');

        let updateDate = $('#' + asset).attr('updatedate');
        updateDate = new Date(updateDate).getTime();

        let update = new Date(data.updateTime).getTime();


        if (update > updateDate) {
            updateUpdateCount(updates = updates + 1);
            addToUpdateList(asset, data.updateTime)
        }

    } else {
        $('#' + asset).attr('icon', 'close');
    }
}

function addToUpdateList(assetId, updateDate) {

    if ($('#update-assets-content').text() === 'No assets') {
        let button = '<button onclick="updateAll()" id="update-all">Update all</button>';
        $('#update-assets-content').html(button);
    }

    let assetName = $('#' + assetId + ' .asset-name').text();
    let assetHTML = '';

    assetHTML += '<div class="update-asset" id="update-' + assetId + '">';
    assetHTML += '<div class="icon"></div>';

    assetHTML += '<div class="asset-name tooltip">' + assetId;
    assetHTML += '<span class="tooltiptext">';
    assetHTML += '<b>'+assetName+'</b><br/>';
    assetHTML += 'Updated: ' + timeSince(new Date(updateDate)) + ' ago';
    assetHTML += '</span>';
    assetHTML += '</div>';

    assetHTML += '<div class="progress">';
    assetHTML += '<div class="progress-bar">';
    assetHTML += '<div class="progress-bar-background"></div>';
    assetHTML += '</div>';
    assetHTML += '</div>';

    assetHTML += '<button onclick="update(\'' + assetId + '\')">Update</button>';

    assetHTML += '</div>';

    $('#update-assets-content').append(assetHTML);
}

function update(assetId) {
    let path = $('#' + assetId).attr('path');
    let assetName =  $('#' + assetId).attr('pathname');
    startUpdate(assetId, path, assetName);
}

function updateAll () {
    $('.update-asset').each(function() {
        let assetId = $(this).attr('id').split('-')[1];
        let path = $('#' + assetId).attr('path');
        let assetName = $('#' + assetId).attr('pathname');
        startUpdate(assetId, path, assetName);
    });
}

function resetAssets() {
    assetsChecked = 0;
    $('#update-assets-content').html('No assets');
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