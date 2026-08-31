/*
 * Tests for the warm-up and start-gate machinery in ../scripts/video.js
 *
 * The panel's job is to keep the video and the timer agreeing at the moment a run starts, which is
 * exactly the part a browser cannot easily be made to reproduce on demand - it needs a cold player,
 * a real network, and YouTube refusing to embed on file:// pages. So instead of a browser, this
 * loads video.js into a sandbox with a stub YT.Player, then fires the state changes the real API
 * would fire and asserts on the calls the panel makes back.
 *
 * Run it:
 *
 *     node tests/video_sync_test.js        # from the scripts/ folder
 *
 * Exits 0 when every check passes, 1 otherwise. Takes ~3s, because one scenario deliberately waits
 * out the start gate's safety fallback.
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const VIDEO_JS = path.join(__dirname, '..', 'scripts', 'video.js');

function makeHarness() {
    const log = [];
    let stateChangeCb = null;
    let readyCb = null;

    const YT = { PlayerState: { ENDED: 0, PLAYING: 1, PAUSED: 2, BUFFERING: 3, CUED: 5 } };

    const player = {
        state: YT.PlayerState.CUED,
        muted: false,
        position: null,
        mute() { this.muted = true; log.push('mute'); },
        unMute() { this.muted = false; log.push('unMute'); },
        setVolume(v) { log.push(`setVolume(${v})`); },
        seekTo(s, ahead) { this.position = s; log.push(`seekTo(${s})`); },
        playVideo() { log.push('playVideo'); },
        pauseVideo() { this.state = YT.PlayerState.PAUSED; log.push('pauseVideo'); },
        cueVideoById({ videoId, startSeconds }) {
            this.state = YT.PlayerState.CUED;
            this.position = startSeconds;
            log.push(`cueVideoById(${videoId}, ${startSeconds})`);
        },
        getPlayerState() { return this.state; }
    };

    YT.Player = function (id, opts) {
        readyCb = opts.events.onReady;
        stateChangeCb = opts.events.onStateChange;
        player.position = null;
        log.push(`new YT.Player(${opts.videoId})`);
        return player;
    };

    // Fires what the real API fires when playback actually begins
    function emitPlaying() {
        player.state = YT.PlayerState.PLAYING;
        stateChangeCb({ data: YT.PlayerState.PLAYING });
    }

    const listeners = {};
    function makeEl(id) {
        return {
            id, value: '', textContent: '', disabled: false,
            classList: { add() {}, remove() {}, contains: () => false },
            addEventListener(evt, fn) { listeners[`${id}:${evt}`] = fn; }
        };
    }
    const els = {};
    ['videoSlot', 'videoUrl', 'videoStart', 'videoError', 'videoNote', 'loadVideoButton']
        .forEach(id => { els[id] = makeEl(id); });
    els.videoSlot.classList = { add() {}, remove() {} };

    const sandbox = {
        // video.js logs its measured start delay on every run; useful in a browser, noise here
        console: Object.assign({}, console, { debug() {} }),
        setTimeout, clearTimeout,
        YT,
        document: { getElementById: (id) => els[id] || makeEl(id) },
        localStorage: { getItem: () => null, setItem: () => {} },
        window: { YT, location: { protocol: 'http:', origin: 'http://localhost:8123' } }
    };
    sandbox.window.onYouTubeIframeAPIReady = null;
    vm.createContext(sandbox);
    // `const VideoPanel` lives in the script's lexical scope, not on the global object
    const source = fs.readFileSync(VIDEO_JS, 'utf8') + '\n;globalThis.VideoPanel = VideoPanel;';
    vm.runInContext(source, sandbox);

    const parseTimestamp = (t) => {
        const m = t.match(/^(\d+):(\d+(?:\.\d+)?)$/);
        return m ? (parseInt(m[1], 10) * 60 + parseFloat(m[2])) * 1000 : NaN;
    };
    sandbox.VideoPanel.init({
        parseTimestamp,
        formatTime: (ms) => `${Math.floor(ms / 60000)}:${String(Math.floor(ms / 1000) % 60).padStart(2, '0')}`,
        registerTimeout: (t) => log.push('registerTimeout'),
        countdownMs: 3000
    });

    return {
        panel: sandbox.VideoPanel, els, listeners, log, player, YT,
        emitPlaying,
        ready: () => readyCb(),
        clear: () => { log.length = 0; }
    };
}

let failures = 0;
function check(name, cond, detail) {
    if (cond) { console.log(`  PASS  ${name}`); }
    else { failures++; console.log(`  FAIL  ${name}${detail ? '\n        ' + detail : ''}`); }
}

// --- Scenario 1: warm-up on load, then a gated cold start -------------------
console.log('\nScenario 1: load + timestamp -> warm-up -> Start gates on PLAYING');
{
    const h = makeHarness();
    h.els.videoUrl.value = 'https://youtu.be/abcdefghijk';
    h.els.videoStart.value = '1:30';
    h.listeners['loadVideoButton:click']();
    h.ready();

    check('warm-up plays muted at timestamp minus countdown (87s)',
        h.log.includes('mute') && h.log.includes('seekTo(87)') && h.log.includes('playVideo'),
        h.log.join(' | '));

    h.clear();
    h.emitPlaying();
    check('warm-up pauses and returns to the previewed frame (90s)',
        h.log.join(' | ') === 'pauseVideo | seekTo(90) | unMute',
        h.log.join(' | '));
    check('audio is not left muted', h.player.muted === false);

    // Start
    h.clear();
    let began = 0;
    h.panel.captureStart();
    h.panel.syncTo(-3000, true, () => { began++; });
    check('Start seeks to 87s and plays', h.log.includes('seekTo(87)') && h.log.includes('playVideo'), h.log.join(' | '));
    check('clock is HELD until the video reports playing', began === 0);

    h.emitPlaying();
    check('clock starts once the video actually rolls', began === 1);
}

// --- Scenario 2: gate never resolves -> safety fallback ---------------------
console.log('\nScenario 2: player never reports PLAYING -> fallback releases the gate');
{
    const h = makeHarness();
    h.els.videoUrl.value = 'abcdefghijk';
    h.els.videoStart.value = '1:30';
    h.listeners['loadVideoButton:click']();
    h.ready();
    h.emitPlaying();          // finish the warm-up

    let began = 0;
    h.panel.captureStart();
    h.panel.syncTo(-3000, true, () => { began++; });
    check('still held immediately after Start', began === 0);

    setTimeout(() => {
        check('fallback started the run within the countdown', began === 1);
        runRemaining();
    }, 3200);
}

function runRemaining() {
    // --- Scenario 3: timestamp inside the countdown ------------------------
    console.log('\nScenario 3: timestamp under 3s -> held-back play, clock starts at once');
    {
        const h = makeHarness();
        h.els.videoUrl.value = 'abcdefghijk';
        h.els.videoStart.value = '0:01';
        h.listeners['loadVideoButton:click']();
        h.ready();
        h.emitPlaying();

        h.clear();
        let began = 0;
        h.panel.captureStart();
        h.panel.syncTo(-3000, true, () => { began++; h.log.push('BEGIN_RUN'); });
        check('clock starts immediately, nothing to wait for', began === 1);
        const order = h.log.join(' | ');
        check('deferred play is registered AFTER the clock starts (so scheduleMessages cannot clear it)',
            order.indexOf('BEGIN_RUN') < order.indexOf('registerTimeout') &&
            order.includes('registerTimeout'), order);
    }

    // --- Scenario 4: no video loaded ---------------------------------------
    console.log('\nScenario 4: no video loaded -> run starts immediately');
    {
        const h = makeHarness();
        let began = 0;
        h.panel.syncTo(-3000, true, () => { began++; });
        check('timer-only run is not stranded', began === 1);
    }

    // --- Scenario 5: Start clicked mid warm-up -----------------------------
    console.log('\nScenario 5: Start pressed while the warm-up is still playing');
    {
        const h = makeHarness();
        h.els.videoUrl.value = 'abcdefghijk';
        h.els.videoStart.value = '1:30';
        h.listeners['loadVideoButton:click']();
        h.ready();
        h.player.state = h.YT.PlayerState.PLAYING;   // warm-up rolling, muted
        h.player.muted = true;

        h.clear();
        let began = 0;
        h.panel.captureStart();
        h.panel.syncTo(-3000, true, () => { began++; });
        check('unmutes before the run', h.player.muted === false, h.log.join(' | '));
        check('pauses first so the coming play raises a real transition',
            h.log.indexOf('pauseVideo') < h.log.indexOf('playVideo'), h.log.join(' | '));
        check('does not resolve the gate off the warm-up play', began === 0);
        h.emitPlaying();
        check('resolves on the real start', began === 1);
    }

    // --- Scenario 6: Reset during the pre-roll wait ------------------------
    console.log('\nScenario 6: Reset during the wait must not fire the run later');
    {
        const h = makeHarness();
        h.els.videoUrl.value = 'abcdefghijk';
        h.els.videoStart.value = '1:30';
        h.listeners['loadVideoButton:click']();
        h.ready();
        h.emitPlaying();

        let began = 0;
        h.panel.captureStart();
        h.panel.syncTo(-3000, true, () => { began++; });
        h.panel.parkAtStart();      // what Reset calls
        h.emitPlaying();            // a late PLAYING arrives anyway
        check('cancelled gate does not start a run', began === 0);
    }

    console.log(failures === 0 ? '\nAll checks passed.' : `\n${failures} check(s) FAILED.`);
    process.exit(failures === 0 ? 0 : 1);
}
