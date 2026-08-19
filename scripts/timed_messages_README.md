# Timed Messages Display

A web-based tool for displaying messages synchronized with audio playback. Perfect for verifying animation event timestamps and message cues during audio production.

## Features

- **CSV Input**: Paste messages with timestamps in CSV format, precise to tenths of a second
- **Timer Display**: Visual countdown starting at -3 seconds, showing tenths of a second (`M:SS.T`)
- **Smooth Transitions**: Messages fade in/out with transitions
- **Playback Controls**: Start, Pause/Resume, and Reset buttons
- **Two-Column Layout**: messages, timer and their controls on the left, the YouTube panel on the right; the columns stack into one on narrow windows
- **Optional Images**: 400×300 placeholder above the message; display images when an image path is provided, from the `images/` folder or any subdirectory of it
- **Synced Video**: Load a YouTube video and it plays in step with the timer, reaching a timestamp you choose exactly as the countdown hits zero (requires serving the page — see below)
- **Message Offset**: Nudge every message later by 0.0–0.9 seconds without editing the CSV

## Usage

1. **Open the HTML file** in any modern web browser
2. **Enter your messages** in the text area using CSV format:
   ```
   timestamp,message[,image]
   ```
   
   Examples:
   ```
   0:00,Welcome!,welcome.png
   0:04.5,Thank you for visiting.
   0:09,Have a wonderful day!,day.jpg
   1:15.2,This is a longer message at 1 minute 15.2 seconds
   ```

3. **Click Start** to begin the timer
   - Timer starts at -0:03.0 (3 seconds before zero)
   - Timer counts in tenths of a second (`M:SS.T`)
   - Messages appear at their specified timestamps
   - Transitions begin 0.2 seconds before each timestamp
   - If a video is loaded, it starts rolling too — see [Video Reference](#video-reference)

4. **Control playback**:
   - **Pause**: Pause the timer and the video (button changes to "Resume")
   - **Resume**: Continue from where you paused, with the video re-aligned to the timer
   - **Reset**: Stop and reset everything to the initial state, parking the video back on its start timestamp

## CSV Format

- **Format**: `timestamp,message[,image]`
- **Timestamp**: Use `M:SS` or `MM:SS` (e.g., `0:05`, `1:23`, `2:45`)
- **Tenths of a second (optional)**: Append a decimal to the seconds — `M:SS.T` (e.g., `0:05.5`, `1:23.7`). Whole-second and fractional timestamps can be mixed freely in the same list. More than one decimal place is accepted and honored (e.g., `0:05.25`), though the timer itself only displays tenths.
- **Message**: Any text
- **Image (optional)**: Path to an image inside the `images/` folder. Either a plain filename (`photo.png`, `banner.jpg`) or a subdirectory path (`storyboard1/photo.png`). If the file is missing, the slot falls back to its blank placeholder.
- **Commas in message**: Supported. If you include an image, the script uses the first comma for the timestamp and the last comma for the image, so message text between them may contain commas.
- **One message per line**

### Examples

```
0:00,First message appears immediately,first.png
0:05.5,Second message at 5.5 seconds
1:00,Third message at 1 minute,third.jpg
1:30.8,Fourth message at 1 minute 30.8 seconds
```

## Video Reference

A YouTube player sits at the top of the page and plays **in sync with the timer**, so the source video and the message cues can be checked together in one window.

1. **Paste a YouTube URL** into the box under the video area and click **Load** (or press Enter)
2. **Enter the video timestamp** that should land on `0:00` — the moment in the video you are checking against. Same format as the CSV column: `M:SS` or `M:SS.T`, e.g. `1:30` or `1:30.5`. Press Enter to jump the player to that frame and preview it.
3. **Click Start.** The video begins playing immediately, three seconds *earlier* than your timestamp, so it arrives at that exact frame as the countdown reaches `0:00`.

From `0:00` onward the video position is always your timestamp plus the timer reading, so a message cue at `0:05.5` lines up with the video 5.5 seconds past your mark.

### Controls

| Button | Effect on the video |
| --- | --- |
| **Start** | Rolls the video from 3 seconds before your timestamp, arriving on it at `0:00` |
| **Pause** | Pauses the video with the timer |
| **Resume** | Re-seeks the video to match the timer, then resumes — a long pause cannot leave the two drifting apart |
| **Reset** | Pauses and parks the video back on your timestamp, ready for another run |

YouTube's own control bar is still there if you want to scrub manually between runs. Videos load at **half volume** so they sit under your own audio; raise or lower it with the player's volume control.

### Timestamps in the first 3 seconds

A video cannot roll earlier than its own beginning, so if your timestamp is under 3 seconds (including the common `0:00`), the video holds still on its first frame and starts playing when the timer catches up to it. A timestamp of `0:00` therefore begins playing exactly at `0:00.0`, and `0:01` at `-0:01.0`. Alignment from your timestamp onward is the same either way.

### Accepted URL forms

| Form | Example |
| --- | --- |
| Standard watch link | `https://www.youtube.com/watch?v=VIDEOID` |
| Short link | `https://youtu.be/VIDEOID` |
| Embed link | `https://www.youtube.com/embed/VIDEOID` |
| Shorts / live | `https://www.youtube.com/shorts/VIDEOID` |
| Bare video ID | `VIDEOID` |

Extra parameters are ignored, so links copied straight from YouTube (with `&list=`, `&index=`, and so on) work as-is. A start time in the URL (`?t=90` or `?t=1m30s`) is used to prefill the timestamp box, which is otherwise the single source of truth for where the video starts. The last URL you loaded is remembered and refilled into the box next time, but is never auto-played.

If the URL can't be read, an error appears under the box and any video already loaded keeps playing.

### ⚠️ The video requires the page to be served

YouTube refuses to play embedded video on pages opened directly from disk (a `file://` address, i.e. double-clicking the file). The player shows **"Error 153 — Video player configuration error"**. This is a YouTube restriction on the *hosting page*; the video link itself is fine, and no embed setting works around it. The IFrame Player API that drives the sync needs a real origin for the same reason, so serving the page is required for any video use, not just a nicety.

**Everything except the video works normally from `file://`** — the timer, CSV messages and images are unaffected. The page detects this case and shows a note explaining it.

To use the video, run the included helper from this folder:

```bash
python3 serve.py
```

It serves the folder and opens <http://localhost:8123/timed_messages.html> in your browser. Press Ctrl+C to stop. Pass a different port if 8123 is taken (`python3 serve.py 8080`).

## Message Offset

The **Message offset** box below the video timestamp delays *every* message by the same fraction of a second, so a whole run can be nudged without touching the CSV. It is useful when the cues are all consistently a fraction early against the video.

- **Range**: `0.0` to `0.9` seconds, in tenths. Positive only — the offset can push messages later, never earlier.
- **Applies to**: every message and its image, on top of whatever timestamp the CSV gives it. A message at `0:05.5` with an offset of `0.4` appears at `0:05.9`.
- **Does not move**: the timer or the video. Only the message cues shift, which is the point — it lets you find the right correction while the video stays put.
- **Out-of-range values are corrected**: anything above `0.9` snaps to `0.9`, anything negative or unreadable snaps to `0.0`, and values between tenths round to the nearest tenth. The box always shows the value actually in effect.

Once you know the right offset, fold it into the CSV timestamps to make it permanent.

## Technical Details

- **Timer Offset**: Starts at -3 seconds for a countdown effect, which is also the video's run-up
- **Timer Format**: `M:SS.T` — minutes, seconds, and tenths (e.g., `-0:03.0`, `0:05.5`, `1:23.7`)
- **Timer Resolution**: Display refreshes every 50 ms so the tenths digit stays current
- **Timestamp Resolution**: Timestamps are converted to milliseconds, so sub-second cues fire at their exact offset
- **Message Offset**: Added to every CSV timestamp at Start; clamped to 0-900 ms and rounded to the nearest tenth
- **Transition Offset**: Messages begin fading in 0.2 seconds before their timestamp
- **Transition Duration**: 0.2 seconds fade in/out
- **Container Width**: Fixed at 800px
- **Message Display**: Always shows bordered area, even when empty
- **Video Panel**: 400×225 privacy-mode (`youtube-nocookie.com`) player driven by YouTube's IFrame Player API, implemented in `video.js` as a `VideoPanel` object; the page passes it the shared `parseTimestamp`/`formatTime` helpers and its timeout registry via `VideoPanel.init()`
- **Volume**: Videos load at 50%, adjustable from the player's own volume control
- **Video Sync**: The video position is derived from the timer (`your timestamp + timer elapsed`) rather than tracked independently, so pausing and resuming re-seeks rather than accumulating drift
- **Autoplay**: Playback always begins inside the Start click so browsers do not block it; a timestamp under 3 seconds is held back with a muted play/pause priming step that keeps the later start permitted

## Browser Compatibility

Works in all modern browsers:
- Chrome/Edge
- Firefox
- Safari
- Opera

## File Requirements

- Four files: `timed_messages.html` (the page), `timed_messages.css` (styling), `timed_messages.js` (timer, messages, images) and `video.js` (the video panel) - keep them in the same folder
- No libraries or build step; the scripts are plain scripts, not modules, so they load from `file://` too
- **Timer, messages and images**: work fully offline; just open the file in a browser, no server needed
- **Video reference only**: needs an internet connection *and* the page served over `http://` (see [The video requires the page to be served](#️-the-video-requires-the-page-to-be-served))
- For the video: run `python3 serve.py` from this folder (Python 3.7+, no packages to install)
- For images: place files in an `images/` folder alongside `timed_messages.html`, in the folder itself or in subdirectories of it. Use their path relative to `images/` in the third CSV column (e.g. `photo.png` or `storyboard1/photo.png`).

## Tips for Audio Synchronization

1. **Start the HTML timer** when you start your audio playback
2. **Verify timestamps** match your audio events
3. **Use pause/resume** to check specific moments — the paused timer shows the exact tenth, and the video holds on the matching frame
4. **Adjust CSV timestamps** as needed and restart — use tenths (e.g., `0:05.5`) to nudge a single cue, or the **Message offset** box to shift all of them at once
5. **Set the video timestamp** to the moment you are checking, then use Reset and Start to replay that run as many times as you need

## Example Use Cases

- **Animation Production**: Verify animation event timestamps match audio cues
- **Video Production**: Check subtitle or caption timing
- **Presentation Rehearsal**: Practice timing of message displays
- **Audio Post-Production**: Verify sound effect timing

## Sharing

Share `timed_messages.html` together with `timed_messages.css`, `timed_messages.js`, `video.js` and `serve.py` (plus the `images/` folder if you use images). Recipients can open the HTML file directly for the timer and messages, or run `python3 serve.py` when they want the video panel too - no installation or setup required either way.

