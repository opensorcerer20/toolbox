/*
 * Video reference panel for timed_messages.html
 *
 * Wraps YouTube's IFrame Player API so the page can drive a video from its timer. The panel owns the
 * player, the URL box and the "video timestamp at 0:00" box; the page owns the timer and the messages
 * and calls in through the small API returned at the bottom of this file.
 *
 * The governing rule for sync is one equation:
 *
 *     video position = startSeconds + (timer elapsed in seconds)
 *
 * At elapsed 0 the video sits on the chosen timestamp; during the countdown it sits that many seconds
 * earlier. Deriving the position from the timer rather than tracking playback state is what makes
 * pause/resume re-align exactly instead of accumulating drift.
 *
 * Requires: a page that calls VideoPanel.init() after the DOM exists, and YouTube's iframe_api script
 * loaded afterwards. Video playback needs the page served over http:// - see timed_messages_README.md.
 */
const VideoPanel = (function () {
    'use strict';

    // Videos start at half volume so playback is not jarring alongside your own audio
    const INITIAL_VOLUME = 50;

    // Supplied by the host page via init()
    let parseTimestamp = null;   // reuses the page's M:SS / M:SS.T parser so both boxes agree
    let formatTime = null;       // reuses the page's time formatter when seeding the timestamp box
    let registerTimeout = null;  // hands deferred plays to the page so its Pause/Reset can cancel them

    let elements = {};
    let player = null;           // YT.Player instance, created on first load
    let isPlayerReady = false;   // true once the API reports the player usable
    let pendingVideoId = null;   // video requested before the API finished loading
    let currentVideoId = null;   // id currently in the player, needed to re-cue it
    let startSeconds = 0;        // video position that should land on timer 0:00

    /**
     * Extract an 11-character YouTube video ID from a pasted URL.
     * Accepts watch?v=ID, youtu.be/ID, /embed/ID, /shorts/ID, /live/ID, or a bare ID.
     * @param {string} input - Pasted URL or video ID
     * @returns {string|null} The video ID, or null if none was found
     */
    function parseYouTubeId(input) {
        const text = (input || '').trim();
        if (!text) return null;

        // A bare video ID pasted on its own
        if (/^[A-Za-z0-9_-]{11}$/.test(text)) return text;

        // Otherwise pull the ID out of any of the common URL shapes
        const match = text.match(/(?:[?&]v=|youtu\.be\/|\/embed\/|\/shorts\/|\/live\/)([A-Za-z0-9_-]{11})/);
        return match ? match[1] : null;
    }

    /**
     * Read a start offset from a shared URL's t= or start= parameter.
     * Accepts plain seconds ("90") and YouTube's h/m/s form ("1m30s").
     * @param {string} input - Pasted URL
     * @returns {number|null} Start offset in seconds, or null if absent
     */
    function parseStartSeconds(input) {
        const match = (input || '').match(/[?&](?:t|start)=([^&\s]+)/);
        if (!match) return null;

        const value = match[1];
        if (/^\d+$/.test(value)) return parseInt(value, 10);

        const hms = value.match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s?)?$/);
        if (!hms) return null;

        const seconds = (parseInt(hms[1] || 0, 10) * 3600) +
                        (parseInt(hms[2] || 0, 10) * 60) +
                        parseInt(hms[3] || 0, 10);
        return seconds > 0 ? seconds : null;
    }

    /**
     * Read the "video timestamp at 0:00" box.
     * Uses the page's parseTimestamp so the box accepts the same M:SS and M:SS.T forms as the CSV column.
     * @returns {number} Video position in seconds (0 when the box is empty or unparseable)
     */
    function readStartSeconds() {
        const text = elements.videoStart.value.trim();
        if (!text) return 0;
        const ms = parseTimestamp(text);
        return Number.isFinite(ms) && ms > 0 ? ms / 1000 : 0;
    }

    /**
     * Where the video should be sitting for a given timer reading.
     * @param {number} elapsedMs - Timer position in milliseconds (negative during the countdown)
     * @returns {number} Video position in seconds (may be negative before the video's own start)
     */
    function positionFor(elapsedMs) {
        return startSeconds + (elapsedMs / 1000);
    }

    function isReady() {
        return player !== null && isPlayerReady;
    }

    /**
     * Park the video on a position without playing it, keeping the poster frame visible.
     * Cues rather than seeks: seekTo on a player that has not played yet drops the poster and leaves the panel black.
     * @param {number} seconds - Video position to park on
     */
    function parkAt(seconds) {
        if (!isReady() || !currentVideoId) return;
        player.cueVideoById({ videoId: currentVideoId, startSeconds: seconds });
    }

    /**
     * Satisfy the browser's autoplay policy while still inside the Start click.
     * A muted play/pause during the gesture earns the document the right to start playback later,
     * which is what lets the held-back start in syncTo work for timestamps under the countdown length.
     */
    function prime() {
        if (!isReady()) return;
        player.mute();
        player.playVideo();
        player.pauseVideo();
        player.unMute();
    }

    /**
     * Move the video to wherever the timer says it should be, then play or hold it there.
     * @param {number} elapsedMs - Current timer position in milliseconds
     * @param {boolean} shouldPlay - Whether playback should be running from here
     */
    function syncTo(elapsedMs, shouldPlay) {
        if (!isReady()) return;

        const position = positionFor(elapsedMs);

        if (position >= 0) {
            player.seekTo(position, true);
            if (shouldPlay) {
                player.playVideo();
            } else {
                player.pauseVideo();
            }
            return;
        }

        // The chosen timestamp is less than the countdown away from the video's own start, so the
        // video cannot roll early enough. Hold on the first frame and start it when the timer catches up.
        if (shouldPlay) {
            // Earn the right to start playback later, while still inside the click that got us here
            prime();
        }

        player.seekTo(0, true);
        player.pauseVideo();

        if (shouldPlay) {
            const timeout = setTimeout(() => {
                if (isReady()) player.playVideo();
            }, -position * 1000);
            registerTimeout(timeout);
        }
    }

    /**
     * Build the player on first use, or swap the video on a player that already exists.
     * Cues rather than loads, so nothing plays until the timer says so.
     */
    function createOrCue(videoId) {
        if (!window.YT || !window.YT.Player) {
            // The API script is still downloading; onYouTubeIframeAPIReady will pick this up
            pendingVideoId = videoId;
            return;
        }

        currentVideoId = videoId;

        if (player === null) {
            player = new YT.Player('ytFrame', {
                host: 'https://www.youtube-nocookie.com',
                videoId: videoId,
                playerVars: {
                    rel: 0,
                    modestbranding: 1,
                    origin: window.location.origin
                },
                events: {
                    onReady: () => {
                        isPlayerReady = true;
                        player.setVolume(INITIAL_VOLUME);
                        const seconds = readStartSeconds();
                        // Only re-cue when a start position was asked for; otherwise leave the
                        // freshly loaded player alone so its poster frame stays visible
                        if (seconds > 0) parkAt(seconds);
                    }
                }
            });
            return;
        }

        if (isPlayerReady) {
            parkAt(readStartSeconds());
        } else {
            pendingVideoId = videoId;
        }
    }

    /**
     * Load the video named in the URL box into the reference panel.
     * The video is cued rather than played; the timer drives playback from Start.
     */
    function load() {
        const raw = elements.videoUrl.value.trim();
        const id = parseYouTubeId(raw);

        if (!id) {
            // Leave any already-loaded video alone so a bad paste can't interrupt playback
            elements.videoError.textContent = raw
                ? 'Could not find a YouTube video ID in that URL.'
                : 'Enter a YouTube URL or video ID.';
            return;
        }

        elements.videoError.textContent = '';

        // A start time in the pasted URL just seeds the timestamp box, which is the one source of truth
        const urlStartSeconds = parseStartSeconds(raw);
        if (urlStartSeconds && !elements.videoStart.value.trim()) {
            elements.videoStart.value = formatTime(urlStartSeconds * 1000);
        }

        elements.videoSlot.classList.add('has-video');
        createOrCue(id);

        try {
            localStorage.setItem('timedMessagesVideoUrl', raw);
        } catch (e) {
            // Storage may be unavailable (e.g. private browsing); loading still works
        }
    }

    function restoreLastUrl() {
        try {
            const saved = localStorage.getItem('timedMessagesVideoUrl');
            if (saved) {
                // Restore into the input only - never auto-load or auto-play on open
                elements.videoUrl.value = saved;
            }
        } catch (e) {
            // No-op if storage is unavailable
        }
    }

    /**
     * Wire the panel up. Call once, after the DOM exists and before the IFrame API script loads.
     * @param {Object} deps - Helpers owned by the host page
     * @param {Function} deps.parseTimestamp - Parses M:SS / M:SS.T into milliseconds
     * @param {Function} deps.formatTime - Formats milliseconds as M:SS.T
     * @param {Function} deps.registerTimeout - Receives deferred-play timeout ids so the page can cancel them
     */
    function init(deps) {
        parseTimestamp = deps.parseTimestamp;
        formatTime = deps.formatTime;
        registerTimeout = deps.registerTimeout;

        elements = {
            videoSlot: document.getElementById('videoSlot'),
            videoUrl: document.getElementById('videoUrl'),
            videoStart: document.getElementById('videoStart'),
            videoError: document.getElementById('videoError'),
            videoNote: document.getElementById('videoNote'),
            loadVideoButton: document.getElementById('loadVideoButton')
        };

        elements.loadVideoButton.addEventListener('click', load);
        elements.videoUrl.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') load();
        });
        elements.videoStart.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' && isReady()) {
                // Preview the chosen frame without starting a run
                startSeconds = readStartSeconds();
                parkAt(startSeconds);
            }
        });

        restoreLastUrl();

        // YouTube rejects embeds hosted on a file:// origin, so warn up front rather than letting the player fail with an opaque "Error 153"
        if (window.location.protocol === 'file:') {
            elements.videoNote.classList.add('visible');
        }

        // The API script calls this global once it has finished loading
        window.onYouTubeIframeAPIReady = () => {
            if (pendingVideoId) {
                const videoId = pendingVideoId;
                pendingVideoId = null;
                createOrCue(videoId);
            }
        };
    }

    return {
        init,

        /** Capture the timestamp box as the position that should land on timer 0:00, and return it. */
        captureStart() {
            startSeconds = readStartSeconds();
            return startSeconds;
        },

        /** Move the video to match a timer reading. See syncTo. */
        syncTo,

        /** Hold the video where it is (used when the timer pauses). */
        pause() {
            if (isReady()) player.pauseVideo();
        },

        /** Pause and return the video to the captured start position, ready for another run. */
        parkAtStart() {
            if (!isReady()) return;
            // A plain seek is right here: the video has already played, so it has a frame to show
            player.pauseVideo();
            player.seekTo(startSeconds, true);
        },

        /** Lock or unlock the timestamp box while a run is in progress. */
        setDisabled(disabled) {
            elements.videoStart.disabled = disabled;
        },

        isReady
    };
})();
