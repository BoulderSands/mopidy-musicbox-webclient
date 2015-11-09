/********************************************************
 * play tracks from a browse list
 *********************************************************/
function playBrowsedTracks(action, trackIndex) {
    $('#popupBrowse').popup('close');
    toast('Loading...');

    if (typeof trackIndex === 'undefined') {
        trackIndex = $('#popupBrowse').data("tlid");
    }
    var trackUris = [];
    switch (action) {
        case PLAY_NOW:
        case PLAY_NEXT:
        case ADD_THIS_BOTTOM:
            trackUris.push(browseTracks[trackIndex].uri);
            break;
        case PLAY_ALL:
            mopidy.tracklist.clear();
            // Don't break, fall through.
        case ADD_ALL_BOTTOM:
            trackUris = getUris(browseTracks);
            break;
        default:
            break;
    }
    var maybePlay = function(tlTracks) {
        if (action === PLAY_NOW || action === PLAY_ALL) {
            var playIndex = (action === PLAY_ALL) ? trackIndex : 0;
            mopidy.playback.play(tlTracks[playIndex]);
        }
    };
        
    // For radio streams we just add the selected URI.
    // TODO: Why?
    //if (isStreamUri(trackUri)) {
        //mopidy.tracklist.add(null, null, trackUri);
        //return false;
    //}
    
    switch (action) {
        case PLAY_NOW:
        case PLAY_NEXT:
            mopidy.tracklist.index().then(function (currentIndex) {
                mopidy.tracklist.add(null, currentIndex + 1, null, trackUris).then(maybePlay);
            });
            break;
        case ADD_THIS_BOTTOM:
        case ADD_ALL_BOTTOM:
        case PLAY_ALL:
            mopidy.tracklist.add(null, null, null, trackUris).then(maybePlay);
            break;
        default:
            break;
    }
    return false;
}


/********************************************************
 * play an uri from a tracklist
 *********************************************************/
function playTrack(action) {
    var hash = document.location.hash.split('?');
    var divid = hash[0].substr(1);

    // Search page default click behaviour adds and plays selected track only.
    if (action == PLAY_NOW && divid == 'search') {
        action = PLAY_NOW_SEARCH;
    }
    
    $('#popupTracks').popup('close');
    $('#controlspopup').popup('close');
    toast('Loading...');

    playlisturi = $('#popupTracks').data("list");
    uri = $('#popupTracks').data("track");

    var trackUris = getTracksFromUri(playlisturi);
    //find track that was selected
    for (var selected = 0; selected < trackUris.length; selected++) {
        if (trackUris[selected] == uri) {
            break;
        }
    }
    switch (action) {
        case ADD_THIS_BOTTOM:
        case PLAY_NEXT:
        case PLAY_NOW_SEARCH:
            trackUris = [trackUris[selected]];
            selected = 0;
    }
    switch (action) {
        case PLAY_NOW:
        case PLAY_NOW_SEARCH:
            mopidy.tracklist.clear().then(
                mopidy.tracklist.add(null, null, null, trackUris).then(
                    function(tlTracks) {
                        mopidy.playback.play(tlTracks[selected])
                    }
                )
            );
            break;
        case PLAY_NEXT:
            mopidy.tracklist.index().then(function(currentIndex) {
                mopidy.tracklist.add(null, currentIndex + 1, null, trackUris);
            });
            break;
        case ADD_THIS_BOTTOM:
        case ADD_ALL_BOTTOM:
            mopidy.tracklist.add(null, null, null, trackUris);
            break;
    }
    return false;
}

/***
 * Plays a Track given by an URI from the given playlist URI.
 * @param track_uri, playlist_uri
 * @returns {boolean}
 */
function playTrackByUri(track_uri, playlist_uri) {
    function findAndPlayTrack(tltracks) {
        if (tltracks.length > 0) {
            // Find track that was selected
            for (var selected = 0; selected < tltracks.length; selected++) {
                if (tltracks[selected].track.uri == track_uri) {
                    mopidy.playback.play(tltracks[selected]);
                    return;
                }
            }
        }
        console.error('Failed to find and play selected track ', track_uri);
        return;
    }

    // Stop directly, for user feedback
    mopidy.tracklist.clear();

    //this is deprecated, remove when popuptracks is removed completly
    $('#popupTracks').popup('close');
    $('#controlspopup').popup('close');
    //end of deprecated

    toast('Loading...');

    mopidy.tracklist.add(null, null, playlist_uri).then(function(tltracks) {
        // Can fail for all sorts of reasons. If so, just add individually. 
        if (tltracks.length == 0) {
            var trackUris = getTracksFromUri(playlist_uri, false);
            mopidy.tracklist.add(null, null, null, trackUris).then(findAndPlayTrack);
        } else {
            findAndPlayTrack(tltracks);
        }
    });
    return false;
}

/********************************************************
 * play an uri from the queue
 *********************************************************/

/***
 * Plays a Track from a Playlist.
 * @param uri
 * @param tlid
 * @returns {boolean}
 */
function playTrackQueueByTlid(uri, tlid) {
    //    console.log('playquuri');
    //stop directly, for user feedback
    mopidy.playback.stop();
    $('#popupQueue').popup('close');
    toast('Loading...');

    tlid = parseInt(tlid);
    mopidy.tracklist.filter({
        'tlid': [tlid]
    }).then(
        function(tltracks) {
            if (tltracks.length > 0) {
                mopidy.playback.play(tltracks[0]);
                return;
            }
            console.log('Failed to play selected track ', tlid);
        }
    );
    return false;
}

/***
 * @deprecated
 * @returns {boolean}
 */
function playTrackQueue() {
    //    console.log('playqu');
    uri = $('#popupQueue').data("track");
    tlid = $('#popupQueue').data("tlid");
    return playTrackQueueByTlid(uri, tlid);
}

/********************************************************
 * remove a track from the queue
 *********************************************************/
function removeTrack() {
    $('#popupQueue').popup('close');
    toast('Deleting...');

    tlid = parseInt($('#popupQueue').data("tlid"));
    console.log(tlid);
    mopidy.tracklist.remove({'tlid':[tlid]});
}

function clearQueue() {
    mopidy.playback.stop();
    resetSong();
    mopidy.tracklist.clear();
    resetSong();
    return false;
}

function saveQueue() {
    mopidy.tracklist.getTracks().then(function(tracks) {
        if (tracks.length > 0) {
            var plname = window.prompt("Playlist name:", "").trim();
            if (plname != null && plname != "") {
                mopidy.playlists.filter({"name": plname}).then(function(existing) {
                    var exists = false;
                    for (var i = 0; i < existing.length; i++) {
                        exists = exists || existing[i].uri.indexOf("m3u:") == 0 || existing[i].uri.indexOf("local:") == 0;
                    }
                    if (!exists || window.confirm("Overwrite existing playlist \"" + plname + "\"?")) {
                        mopidy.playlists.create(plname, "local").then(function(playlist) {
                             playlist.tracks = tracks;
                             mopidy.playlists.save(playlist).then();
                             getPlaylists();
                        });
                    }
                });
            }
        }
    });
    return false;
}


function refreshPlaylists() {
    mopidy.playlists.refresh();
    return false;
}

/**********************
 * Buttons
 */

function doShuffle() {
    mopidy.playback.stop();
    mopidy.tracklist.shuffle();
    mopidy.playback.play();
}

/* Toggle state of play button */
function setPlayState(nwplay) {
    if (nwplay) {
        $("#playimg").attr('src', 'images/icons/pause_32x32.png');
        $("#playimg").attr('title', 'Pause');
        $("#btplayNowPlaying >i").removeClass('fa-play').addClass('fa-pause');
        $("#btplayNowPlaying").attr('title', 'Pause');
    } else {
        $("#playimg").attr('src', 'images/icons/play_alt_32x32.png');
        $("#playimg").attr('title', 'Play');
        $("#btplayNowPlaying >i").removeClass('fa-pause').addClass('fa-play');
        $("#btplayNowPlaying").attr('title', 'Play');
    }
    play = nwplay;
}

//play or pause
function doPlay() {
    toast('Please wait...', 250);
    if (!play) {
        mopidy.playback.play();
    } else {
        if(isStreamUri(songdata.track.uri)) {
            mopidy.playback.stop();
        } else {
            mopidy.playback.pause();
        }
    }
    setPlayState(!play);
}

function doPrevious() {
    toast('Playing previous track...');
    mopidy.playback.previous();
}

function doNext() {
    toast('Playing next track...');
    mopidy.playback.next();
}

function backbt() {
    history.back();
    return false;
}

/***************
 * Options
 ***************/

function setTracklistOption(name, new_value) {
    if (!new_value) {
        $("#"+name+"bt").attr('style', 'color:#2489ce');
    } else {
        $("#"+name+"bt").attr('style', 'color:#66DD33');
    }
    return new_value
}

function setRepeat(nwrepeat) {
    if (repeat != nwrepeat) {
        repeat = setTracklistOption("repeat", nwrepeat);
    }
}

function setRandom(nwrandom) {
    if (random != nwrandom) {
        random = setTracklistOption("random", nwrandom);
    }
}

function setConsume(nwconsume) {
    if (consume != nwconsume) {
        consume = setTracklistOption("consume", nwconsume);
    }
}

function setSingle(nwsingle) {
    if (single != nwsingle) {
        single = setTracklistOption("single", nwsingle);
    }
}

function doRandom() {
    mopidy.tracklist.setRandom(!random).then();
}

function doRepeat() {
    mopidy.tracklist.setRepeat(!repeat).then();
}

function doConsume() {
    mopidy.tracklist.setConsume(!consume).then();
}

function doSingle() {
    mopidy.tracklist.setSingle(!single).then();
}


/*********************
 * Track Slider
 * Use a timer to prevent looping of commands
 *********************/

function doSeekPos(value) {
    var val = $("#trackslider").val();
    newposition = Math.round(val);
    if (!initgui) {
        pausePosTimer();
        //set timer to not trigger it too much
        clearTimeout(seekTimer);
        $("#songelapsed").html(timeFromSeconds(val / 1000));
        seekTimer = setTimeout(triggerPos, 500);
    }
}

function triggerPos() {
    if (mopidy) {
        posChanging = true;
        //        mopidy.playback.pause();
        //    console.log(newposition);
        mopidy.playback.seek(newposition);
        //        mopidy.playback.resume();
        resumePosTimer();
        posChanging = false;
    }
}

function setPosition(pos) {
    if (posChanging) {
        return;
    }
    var oldval = initgui;
    if (pos > songlength) {
        pos = songlength;
        pausePosTimer();
    }
    currentposition = pos;
    initgui = true;
    $("#trackslider").val(currentposition).slider('refresh');
    initgui = oldval;
    $("#songelapsed").html(timeFromSeconds(currentposition / 1000));
}

/********************
 * Volume slider
 * Use a timer to prevent looping of commands
 */

function setVolume(value) {
    var oldval = initgui;
    initgui = true;
    $("#volumeslider").val(value).slider('refresh');
    initgui = oldval;
}

function doVolume(value) {
    if (!initgui) {
        volumeChanging = value;
        clearInterval(volumeTimer);
        volumeTimer = setTimeout(triggerVolume, 500);
    }
}

function triggerVolume() {
    mopidy.playback.setVolume(parseInt(volumeChanging));
    volumeChanging = 0;
}

function doMute() {
    //only emit the event, not the status
    if (muteVolume == -1) {
        $("#mutebt").attr('src', 'images/icons/volume_mute_24x18.png');
        muteVolume = currentVolume;
        mopidy.playback.setVolume(0).then();
    } else {
        $("#mutebt").attr('src', 'images/icons/volume_24x18.png');
        mopidy.playback.setVolume(muteVolume).then();
        muteVolume = -1;
    }

}

/*******
 * Track position timer
 */

//timer function to update interface
function updatePosTimer() {
    currentposition += TRACK_TIMER;
    setPosition(currentposition);
    //    $("#songelapsed").html(timeFromSeconds(currentposition / 1000));
}

function resumePosTimer() {
    pausePosTimer();
    if (songlength > 0) {
        posTimer = setInterval(updatePosTimer, TRACK_TIMER);
    }
}

function initPosTimer() {
    pausePosTimer();
    // setPosition(0);
    resumePosTimer();
}

function pausePosTimer() {
    clearInterval(posTimer);
}

/*********************************
 * Stream
 *********************************/
function streamPressed(key) {
    if (key == 13) {
        playStreamUri();
        return false;
    }
    return true;
}

function playStreamUri(uri) {
    //value of name is based on the passing of an uri as a parameter or not
    var nwuri = uri || $('#streamuriinput').val().trim();
    var service = $('#selectstreamservice').val();
    if (!uri && service) {
        nwuri = service + ':' + nwuri;
    }
    if (isServiceUri(nwuri) || isStreamUri(nwuri) || validUri(nwuri)) {
        toast('Playing...');
        //stop directly, for user feedback
        mopidy.playback.stop();
        //hide ios/android keyboard
        document.activeElement.blur();
        $("input").blur();
        clearQueue();
        mopidy.tracklist.add(null, null, nwuri);
        mopidy.playback.play();
    } else {
        toast('No valid url!');
    }
    return false;
}

function saveStreamUri(nwuri) {
    var i = 0;
    var name = $('#streamnameinput').val().trim();
    var uri = nwuri || $('#streamuriinput').val().trim();
    var service = $('#selectstreamservice').val();
    if (service) {
        uri = serviceupdateStreamUris + ':' + uri;
    }
    toast('Adding stream ' + uri, 500);
    //add stream to list and check for doubles and add no more than 100
    for (var key in streamUris) {
        rs = streamUris[key];
        if (i > 100) {
            delete streamUris[key];
            continue;
        }
        i++;
    }
    streamUris.unshift([name, uri]);
    $.cookie.json = true;
    $.cookie('streamUris', streamUris);
    updateStreamUris();
    return false;
}

function deleteStreamUri(uri) {
    var i = 0;
    for (var key in streamUris) {
        rs = streamUris[key];
        if (rs && rs[1] == uri) {
            if (confirm("About to remove " + rs[0] + ". Sure?")) {
                delete streamUris[key];
            }
        }
    }
    $.cookie.json = true;
    $.cookie('streamUris', streamUris);
    updateStreamUris();

    return false;
}

function updateStreamUris() {
    var tmp = '';
    $('#streamuristable').empty();
    var child = '';
    for (var key in streamUris) {
        var rs = streamUris[key];
        if (rs) {
            name = rs[0] || rs[1];
            child = '<li><span class="ui-icon ui-icon-delete ui-icon-shadow" style="float:right; margin: .5em; margin-top: .8em;"><a href="#" onclick="return deleteStreamUri(\'' + rs[1] + '\');">&nbsp;</a></span>' +
                '<i class="fa fa-rss" style="float: left; padding: .5em; padding-top: 1em;"></i>' +
                ' <a style="margin-left: 20px" href="#" onclick="return playStreamUri(\'' + rs[1] + '\');">';
            child += '<h1>' + name + '</h1></a></li>';
            tmp += child;
        }
    }
    $('#streamuristable').html(tmp);
}

function initStreams() {
    $.cookie.json = true;
    tmpRS = $.cookie('streamUris');
    streamUris = tmpRS || streamUris;
    updateStreamUris();
}

function haltSystem() {
    $.post("/settings/shutdown");
    toast('Stopping system...', 10000);
    setTimeout(function() {
        window.history.back();
    }, 10000);
}

function rebootSystem() {
    $.post("/settings/reboot");
    toast('Rebooting...', 10000);
    setTimeout(function() {
        window.history.back();
    }, 10000);
}
