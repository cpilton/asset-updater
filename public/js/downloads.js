var socket = io();

socket.on('progressUpdate', function(data) {
    if (data.progress === 0) {
        createAsset(data.id);
    }

    if (data.name !== undefined) {
        addAssetName(data.id, data.name);
    }

    if (data.success) {
        updateProgressBar(data.id, data.progress);
        if (data.progress === 100) {
            setTimeout(function() {
                addToComplete(data.id);
            },1000);

        }
    } else {
        failUpdate(data.id);
        addToFailed(data.id);
    }
});

function retry(assetId) {
    postURL('/api/downloadAsset/' + assetId)
        .then(function (res) {
            if (res == undefined || res.status !== 200) {
                notify('Failed to update ' + assetId);
            }
        });
}

function updateProgressBar(id, value) {
    $('#' + id + ' .progress-bar').width(value + '%');
}

function failUpdate(id) {
    $('#' + id + ' .progress-bar').width('100%');
    $('#' + id + ' .progress-bar').addClass('failed');
}

function createAsset(assetId) {

    if ($('#'+assetId).length !== 0) {
        $('#'+assetId).remove();
    }

    let assetHTML = '';

    if ($('#download-list div').length === 0) {
        $('#download-list').html('');
    }

    assetHTML += '<div class="update-asset" id="' + assetId + '">';
    assetHTML += '<div class="icon"></div>';

    assetHTML += '<div class="asset-name tooltip">' + assetId;
    assetHTML += '<span class="tooltiptext">';
    assetHTML += '<b>Loading...</b>';
    assetHTML += '</span>';
    assetHTML += '</div>';

    assetHTML += '<div class="progress">';
    assetHTML += '<div class="progress-bar">';
    assetHTML += '<div class="progress-bar-background"></div>';
    assetHTML += '</div>';
    assetHTML += '</div>';

    assetHTML += '</div>';

    $('#download-list').append(assetHTML);
}

function addAssetName(assetId, assetName) {
    $('#'+assetId + ' .tooltiptext b').text(assetName.replace('.zip',''));
}

function addToComplete(assetId) {
    let assetHTML = '';

    let assetName = $('#' + assetId + ' .tooltiptext b').text();
    $('#' + assetId).remove();

    if ($('#download-list div').length === 0) {
        $('#download-list').html('No active downloads');
    }

    if ($('#complete-download-list div').length === 0) {
        $('#complete-download-list').html('');
    }

    assetHTML += '<div class="complete-asset" id="' + assetId + '">';
    assetHTML += '<div class="icon"></div>';
    assetHTML += '<div class="asset-name tooltip"' +
        ' onclick="openLink(\'https://steamcommunity.com/sharedfiles/filedetails/?id=' + assetId + '\')">' + assetId;
    assetHTML += '<span class="tooltiptext">';
    assetHTML += '<b>'+assetName+'</b>';
    assetHTML += '</span>';
    assetHTML += '</div>';
    assetHTML += '</div>';

    $('#complete-download-list').append(assetHTML);
}

function addToFailed(assetId) {
    let assetHTML = '';

    let assetName = $('#' + assetId + ' .tooltiptext b').text();
    $('#' + assetId).remove();

    if ($('#download-list div').length === 0) {
        $('#download-list').html('No active downloads');
    }

    if ($('#failed-download-list div').length === 0) {
        $('#failed-download-list').html('');
    }

    assetHTML += '<div class="failed-asset" id="' + assetId + '">';
    assetHTML += '<div class="icon"></div>';
    assetHTML += '<div class="asset-name tooltip"' +
        ' onclick="openLink(\'https://steamcommunity.com/sharedfiles/filedetails/?id=' + assetId + '\')">' + assetId;
    assetHTML += '<span class="tooltiptext">';
    assetHTML += '<b>'+assetName+'</b>';
    assetHTML += '</span>';
    assetHTML += '</div>';
    assetHTML += '<button onclick="retry(\'' + assetId + '\')">Retry</button>';
    assetHTML += '</div>';

    $('#failed-download-list').append(assetHTML);
}