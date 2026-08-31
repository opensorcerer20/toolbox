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
 * Two mechanisms keep that equation honest at the moment a run starts, when a cold player would
 * otherwise take a beat to wake up while the timer ran on regardless:
 *
 *   - warm-up: once a timestamp is known, the frame a run would roll from is played muted and paused,
 *     so Start resumes buffered media instead of waking a merely-cued player
 *   - start gate: syncTo can hold the caller's clock until the player actually reports PLAYING,
 *     so the timer never runs ahead of a video that has not begun
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
    let countdownMs = 3000;      // the page's lead-in length, so warm-up targets the right frame

    let elements = {};
    let player = null;           // YT.Player instance, created on first load
    let isPlayerReady = false;   // true once the API reports the player usable
    let pendingVideoId = null;   // video requested before the API finished loading
    let currentVideoId = null;   // id currently in the player, needed to re-cue it
    let startSeconds = 0;        // video position that should land on timer 0:00

    // Warm-up and start-gate state. A freshly cued player holds a poster frame but no decoded
    // media, so its first play lags; warming plays it muted once so the real start resumes
    // an already-buffered player, and the gate holds the timer until playback truly begins.
    let isWarming = false;          // a muted warm-up play is in flight; the next PLAYING is its
    let warmedFor = null;           // position the player is currently warmed at
    let parkedAt = null;            // frame the idle panel should show, restored after a warm-up
    let hasPlayed = false;          // player has reached PLAYING at least once, so a real frame exists
    let pendingStart = null;        // callback owed to a gated run once its video actually rolls
    let startGateTimeout = null;    // safety timer that releases a gate playback never resolves
    let startRequestedAt = 0;       // timestamp of the Start click, for the measured-delay log

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
     * Park the video on a position without playing it, keeping a frame visible.
     * Once the player has played it has a real frame to hold, so a plain seek is both correct and
     * cheap; before that, only cueVideoById shows anything (seekTo would leave the panel black),
     * at the cost of dropping back to an unbuffered state.
     * @param {number} seconds - Video position to park on
     */
    function parkAt(seconds) {
        if (!isReady() || !currentVideoId) return;

        parkedAt = seconds;

        if (hasPlayed) {
            player.pauseVideo();
            player.seekTo(seconds, true);
            return;
        }

        // Re-cueing throws away any buffering, so the next Start has to warm again
        warmedFor = null;
        player.cueVideoById({ videoId: currentVideoId, startSeconds: seconds });
    }

    /**
     * Pre-buffer the player at a position by playing it muted and pausing the moment it rolls.
     * This is what removes the first-play lag: Start then resumes a player holding decoded media
     * instead of waking a cued one. Completion is handled in the PLAYING branch of onStateChange.
     * Muted playback is exempt from the browser's autoplay policy, so no user gesture is needed.
     * @param {number} seconds - Video position to warm
     */
    function warmAt(seconds) {
        if (!isReady() || !currentVideoId) return;
        if (isWarming || warmedFor === seconds) return;

        isWarming = true;
        warmedFor = seconds;
        player.mute();
        player.seekTo(seconds, true);
        player.playVideo();
    }

    /**
     * Warm the frame a run would actually roll from - the countdown's worth of video before the
     * chosen timestamp, or the video's own start when the timestamp sits inside the countdown.
     * The warmed range covers the preview frame too, so parking back on the timestamp stays cheap.
     */
    function warmForStart() {
        if (!isReady()) return;
        warmAt(Math.max(0, readStartSeconds() - (countdownMs / 1000)));
    }

    /** Drop a pending gate without firing it (Pause and Reset during the pre-roll wait). */
    function clearStartGate() {
        if (startGateTimeout !== null) {
            clearTimeout(startGateTimeout);
            startGateTimeout = null;
        }
        pendingStart = null;
    }

    /** Release a gated run: the video is rolling (or we gave up waiting for it). */
    function releaseStartGate() {
        if (!pendingStart) return;

        const callback = pendingStart;
        pendingStart = null;
        if (startGateTimeout !== null) {
            clearTimeout(startGateTimeout);
            startGateTimeout = null;
        }
        console.debug(`[VideoPanel] video rolling ${Date.now() - startRequestedAt}ms after Start`);
        callback();
    }

    /**
     * The one place that learns playback has really begun, which both the warm-up and the start
     * gate hang off. Everything else in the panel drives the player; this reacts to it.
     */
    function onPlayerStateChange(event) {
        if (event.data !== YT.PlayerState.PLAYING) return;

        hasPlayed = true;

        if (isWarming) {
            // Warm-up done: stop, return to the frame the user is meant to be looking at, and
            // give the sound back. The warmed media stays buffered either way.
            isWarming = false;
            player.pauseVideo();
            player.seekTo(parkedAt !== null ? parkedAt : warmedFor, true);
            player.unMute();
            return;
        }

        releaseStartGate();
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
     * @param {Function} [onRolling] - Called once the video is actually playing, so the caller can
     *                                 hold its clock until then. Omit to start playback ungated.
     */
    function syncTo(elapsedMs, shouldPlay, onRolling) {
        if (!isReady()) {
            // Nothing to wait for, so an unusable player must not strand the caller's clock
            if (onRolling) onRolling();
            return;
        }

        // A warm-up may still be running muted; this play supersedes it, and without the unMute
        // the whole run would be silent. Only undo our own mute - a mute the viewer set on the
        // player itself is theirs to keep.
        if (isWarming) {
            isWarming = false;
            player.unMute();
        }

        // Playing already (a warm-up caught mid-flight) means the coming playVideo would raise no
        // state change to gate on, so stop first and let the real start produce a real transition
        const wasPlaying = player.getPlayerState() === YT.PlayerState.PLAYING;
        if (wasPlaying) player.pauseVideo();

        clearStartGate();
        if (onRolling) {
            startRequestedAt = Date.now();
            pendingStart = onRolling;
            // If playback never reports in - a stall, an ad, an error - start anyway rather than
            // leaving the page frozen on a countdown that never begins
            startGateTimeout = setTimeout(releaseStartGate, countdownMs);
        }

        const position = positionFor(elapsedMs);

        if (position >= 0) {
            player.seekTo(position, true);
            if (shouldPlay) {
                player.playVideo();
                // Belt and braces: if the player is somehow already running, no PLAYING event is
                // coming and the gate would sit until its fallback fires
                if (!wasPlaying && player.getPlayerState() === YT.PlayerState.PLAYING) {
                    releaseStartGate();
                }
            } else {
                player.pauseVideo();
                releaseStartGate();
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

        // Nothing to wait for on this path: the video is deliberately parked, and its own start is
        // scheduled against the timer, so the timer has to be running for it to be right.
        // This runs before the deferred play is armed because the caller schedules its message
        // cues here, and that clears every pending timeout - including one armed too early.
        releaseStartGate();

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

        if (videoId !== currentVideoId) {
            // A different video has never played and is not warmed, whatever the old one managed.
            // This also keeps parkAt on its cueVideoById path, which is what actually swaps the video.
            hasPlayed = false;
            warmedFor = null;
            parkedAt = null;
            isWarming = false;
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
                        // Warm either way: an empty box means a run rolls from the video's own
                        // start, which deserves pre-buffering just as much
                        warmForStart();
                    },
                    onStateChange: onPlayerStateChange
                }
            });
            return;
        }

        if (isPlayerReady) {
            parkAt(readStartSeconds());
            warmForStart();
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
     * @param {number} deps.countdownMs - Lead-in length, so warm-up targets the frame Start rolls from
     */
    function init(deps) {
        parseTimestamp = deps.parseTimestamp;
        formatTime = deps.formatTime;
        registerTimeout = deps.registerTimeout;
        if (Number.isFinite(deps.countdownMs)) countdownMs = deps.countdownMs;

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
                warmForStart();
            }
        });
        // Warming on change too, so a typed timestamp is pre-buffered without pressing Enter
        elements.videoStart.addEventListener('change', () => {
            if (isReady()) warmForStart();
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
            // Pausing during the pre-roll wait must not leave a gate that fires later
            clearStartGate();
            if (isReady()) player.pauseVideo();
        },

        /** Pause and return the video to the captured start position, ready for another run. */
        parkAtStart() {
            clearStartGate();
            if (!isReady()) return;
            // A plain seek is right here: the video has already played, so it has a frame to show
            player.pauseVideo();
            player.seekTo(startSeconds, true);
            parkedAt = startSeconds;
        },

        /** Lock or unlock the timestamp box while a run is in progress. */
        setDisabled(disabled) {
            elements.videoStart.disabled = disabled;
        },

        isReady
    };
})();
