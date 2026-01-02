# Timed Messages Display

A web-based tool for displaying messages synchronized with audio playback. Perfect for verifying animation event timestamps and message cues during audio production.

## Features

- **CSV Input**: Paste messages with timestamps in CSV format
- **Timer Display**: Visual countdown starting at -5 seconds
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
   0:04,Thank you for visiting.
   0:09,Have a wonderful day!,day.jpg
   1:15,This is a longer message at 1 minute 15 seconds
   ```

3. **Click Start** to begin the timer
   - Timer starts at -0:05 (5 seconds before zero)
   - Messages appear at their specified timestamps
   - Transitions begin 0.2 seconds before each timestamp

4. **Control playback**:
   - **Pause**: Pause the timer (button changes to "Resume")
   - **Resume**: Continue from where you paused
   - **Reset**: Stop and reset everything to the initial state

## CSV Format

- **Format**: `timestamp,message[,image]`
- **Timestamp**: Use `M:SS` or `MM:SS` (e.g., `0:05`, `1:23`, `2:45`)
- **Message**: Any text
- **Image (optional)**: Filename of an image located in the `images/` folder (e.g., `photo.png`, `banner.jpg`)
- **Commas in message**: Supported. If you include an image, the script uses the first comma for the timestamp and the last comma for the image, so message text between them may contain commas.
- **One message per line**

### Examples

```
0:00,First message appears immediately,first.png
0:05,Second message at 5 seconds
1:00,Third message at 1 minute,third.jpg
1:30,Fourth message at 1 minute 30 seconds
```

## Technical Details

- **Timer Offset**: Starts at -5 seconds for a countdown effect
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
3. **Use pause/resume** to check specific moments
4. **Adjust CSV timestamps** as needed and restart

## Example Use Cases

- **Animation Production**: Verify animation event timestamps match audio cues
- **Video Production**: Check subtitle or caption timing
- **Presentation Rehearsal**: Practice timing of message displays
- **Audio Post-Production**: Verify sound effect timing

## Sharing

Simply share the `timed_messages.html` file (and the `images/` folder if you use images). Recipients can open it directly in their browser - no installation or setup required!

