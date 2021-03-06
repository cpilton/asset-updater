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
                renderAssets(res.data);
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

            let icon = $('<div/>').addClass('icon').attr('id','folder-icon');
            let path = $('<div/>').addClass('recent-path').text(this);
            let button = $('<button/>').text('Select');

            button.click(function() {
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

function renderAssets(assets) {
    let assetHTML = '';
    $(assets).each(function() {
        let assetName = this.folder.split('\\')[this.folder.split('\\').length - 1];
        let assetId = assetName.split('_')[0];


        assetHTML += '<div class="asset" id="'+assetId+'" updatedate="'+this.updateDate+'" icon="loading">';
        assetHTML += '<div class="icon"></div>';
        assetHTML += '<div class="asset-name">'+assetName+'</div>';

        assetHTML += '</div>';
    });

    $('#assets-content').html(assetHTML);
}

function checkAssets(assets) {
    $(assets).each(function() {
        let assetName = this.folder.split('\\')[this.folder.split('\\').length - 1];
        let assetId = assetName.split('_')[0];
        checkForUpdate(assetId);
    });
}

function updateAsset(asset, data) {
    if (data.updateTime !== undefined) {
        $('#' + asset).attr('icon', 'check');

        let updateDate = $('#' + asset).attr('updatedate');
        updateDate = new Date(updateDate).getTime();

        let update = new Date(data.updateTime).getTime();


        if (update > updateDate) {
            console.log('update ' + asset);
        }

    } else {
        $('#' + asset).attr('icon', 'close');
    }
}

function notify(message) {
    resetNotify();
    $('#notify-message').html(message);
    setTimeout(function() {
        showNotify();
    }, 10);

    setTimeout(function() {
        hideNotify();
    }, 5000)

}

function showNotify() {
    $('#notify').show();
    setTimeout(function() {
        $('#notify').css('top', '50px');
    }, 10);
}

function hideNotify() {
    $('#notify').fadeOut(500);
    setTimeout(function() {
        $('#notify').css('top','-100px');
    }, 350);
}

function resetNotify() {
    $('#notify').hide();
    $('#notify').css('top', '-100px');
}