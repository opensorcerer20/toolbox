# Tests

Plain Node scripts — no framework, no `npm install`, nothing to set up. Run one directly:

```bash
node tests/video_sync_test.js     # from the scripts/ folder
```

Each exits `0` when every check passes and `1` on the first failure, so they work in a
pre-commit hook or CI step as-is.

## `video_sync_test.js`

Covers the warm-up and start-gate machinery in [`../scripts/video.js`](../scripts/video.js) — the part that
keeps the video and the timer agreeing at the moment a run starts.

This is the piece a browser is worst at testing. Reproducing the bug it guards against needs a
*cold* player, a real network, and a served page (YouTube refuses to embed on `file://`), and
the symptom is a few hundred milliseconds of drift you have to catch by eye. So instead of a
browser, the test loads `video.js` into a `vm` sandbox with a stub `YT.Player`, fires the state
changes the real API would fire, and asserts on the calls the panel makes back.

Six scenarios, 16 checks:

| Scenario | What it pins down |
| --- | --- |
| Warm-up then cold start | Warms at *timestamp − countdown*, returns to the previewed frame, holds the clock until `PLAYING` |
| Player never reports in | The safety fallback starts the run rather than freezing on a countdown that never begins |
| Timestamp under 3s | Clock starts at once, and the deferred play is armed **after** it — arming earlier would let `scheduleMessages` clear it |
| No video loaded | A timer-only run is not left waiting for a player that will never report |
| Start pressed mid warm-up | Unmutes, pauses first so the real start raises a real transition, does not resolve off the warm-up's own play |
| Reset during the wait | A cancelled gate cannot fire a run afterwards |

Two of these encode bugs that were caught during implementation rather than hypotheticals: the
deferred-play ordering, and resolving the gate off the warm-up's own `PLAYING` event.

Takes about 3 seconds — one scenario deliberately waits out the 3-second fallback.

### What it does not cover

Everything real YouTube playback does: actual buffering behaviour, whether a warm-up genuinely
removes the lag on your connection, autoplay-policy enforcement, and the visible dimming of the
timer. Those still need the browser — serve the page with `python3 serve.py` and watch a cold
first run. This test only proves the state machine drives the player correctly given the events
the API promises to send.
