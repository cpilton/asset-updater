let updates = 0;
let assets = 0;
let assetsChecked = 0;

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
    let duplicates = {};
    $(assets).each(function () {
        let assetName = this.folder.split('\\')[this.folder.split('\\').length - 1];
        let assetId = assetName.split('_')[0];

        if (duplicates[assetId] === undefined) {
            duplicates[assetId] = [this.folder];
        } else {
            duplicates[assetId].push(this.folder);
        }


        updateAsset(assetId);
    });

    for (let id in duplicates) {
        if (duplicates[id].length > 1) {
            updateUpdateCount(updates = updates + 1);
            renderDuplicate(id,  duplicates[id]);
        }
    }

}

function updateAsset(asset) {
    assetsChecked++;
    updateProgressBar('check-progress', (assetsChecked / assets) * 100)

        $('#' + asset).attr('icon', 'check');
}

function renderDuplicate(id, paths) {

    let assetName = paths[0].split('\\')[paths[0].split('\\').length - 1];

    if ($('#update-assets-content').text() === 'No assets') {
        $('#update-assets-content').html('');
    }

    let assetHTML = '';

    assetHTML += '<div class="update-asset" id="update-' + id + '">';
    assetHTML += '<div class="icon"></div>';

    assetHTML += '<div class="asset-name tooltip"' +
        ' onclick="openLink(\'https://steamcommunity.com/sharedfiles/filedetails/?id=' + id + '\')">' + id;
    assetHTML += '<span class="tooltiptext">';
    assetHTML += '<b>' + assetName + '</b><br/>';
    assetHTML += paths.join(' <br/> ');
    assetHTML += '</span>';
    assetHTML += '</div>';

    assetHTML += '</div>';

    $('#update-assets-content').append(assetHTML);

}

function resetAssets() {
    assetsChecked = 0;
    $('#update-assets-content').html('No assets');
}