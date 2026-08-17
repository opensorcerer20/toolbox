# Timed Messages Display

A web-based tool for displaying messages synchronized with audio playback. Perfect for verifying animation event timestamps and message cues during audio production.

## Features

- **CSV Input**: Paste messages with timestamps in CSV format, precise to tenths of a second
- **Timer Display**: Visual countdown starting at -5 seconds, showing tenths of a second (`M:SS.T`)
- **Smooth Transitions**: Messages fade in/out with transitions
- **Playback Controls**: Start, Pause/Resume, and Reset buttons
- **Fixed Layout**: 800px wide container with consistent spacing
- **Optional Images**: 400×300 placeholder above the message; display images when an image filename is provided

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
   - Timer starts at -0:05.0 (5 seconds before zero)
   - Timer counts in tenths of a second (`M:SS.T`)
   - Messages appear at their specified timestamps
   - Transitions begin 0.2 seconds before each timestamp

4. **Control playback**:
   - **Pause**: Pause the timer (button changes to "Resume")
   - **Resume**: Continue from where you paused
   - **Reset**: Stop and reset everything to the initial state

## CSV Format

- **Format**: `timestamp,message[,image]`
- **Timestamp**: Use `M:SS` or `MM:SS` (e.g., `0:05`, `1:23`, `2:45`)
- **Tenths of a second (optional)**: Append a decimal to the seconds — `M:SS.T` (e.g., `0:05.5`, `1:23.7`). Whole-second and fractional timestamps can be mixed freely in the same list. More than one decimal place is accepted and honored (e.g., `0:05.25`), though the timer itself only displays tenths.
- **Message**: Any text
- **Image (optional)**: Filename of an image located in the `images/` folder (e.g., `photo.png`, `banner.jpg`)
- **Commas in message**: Supported. If you include an image, the script uses the first comma for the timestamp and the last comma for the image, so message text between them may contain commas.
- **One message per line**

### Examples

```
0:00,First message appears immediately,first.png
0:05.5,Second message at 5.5 seconds
1:00,Third message at 1 minute,third.jpg
1:30.8,Fourth message at 1 minute 30.8 seconds
```

## Technical Details

- **Timer Offset**: Starts at -5 seconds for a countdown effect
- **Timer Format**: `M:SS.T` — minutes, seconds, and tenths (e.g., `-0:05.0`, `0:05.5`, `1:23.7`)
- **Timer Resolution**: Display refreshes every 50 ms so the tenths digit stays current
- **Timestamp Resolution**: Timestamps are converted to milliseconds, so sub-second cues fire at their exact offset
- **Transition Offset**: Messages begin fading in 0.2 seconds before their timestamp
- **Transition Duration**: 0.2 seconds fade in/out
- **Container Width**: Fixed at 800px
- **Message Display**: Always shows bordered area, even when empty

## Browser Compatibility

Works in all modern browsers:
- Chrome/Edge
- Firefox
- Safari
- Opera

## File Requirements

- Single HTML file - no dependencies required
- Works offline - no internet connection needed
- No server required - just open the file in a browser
- For images: place files in an `images/` folder alongside `timed_messages.html`. Use their filenames in the third CSV column.

## Tips for Audio Synchronization

1. **Start the HTML timer** when you start your audio playback
2. **Verify timestamps** match your audio events
3. **Use pause/resume** to check specific moments — the paused timer shows the exact tenth
4. **Adjust CSV timestamps** as needed and restart — use tenths (e.g., `0:05.5`) to nudge a cue by a fraction of a second

## Example Use Cases

- **Animation Production**: Verify animation event timestamps match audio cues
- **Video Production**: Check subtitle or caption timing
- **Presentation Rehearsal**: Practice timing of message displays
- **Audio Post-Production**: Verify sound effect timing

## Sharing

Simply share the `timed_messages.html` file (and the `images/` folder if you use images). Recipients can open it directly in their browser - no installation or setup required!

