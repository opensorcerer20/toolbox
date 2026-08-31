/*
 * Timed Messages Display - Audio Synchronization Tool
 * 
 * This script displays messages at specified timestamps, synchronized with audio playback.
 * Features:
 * - CSV input for custom messages and timestamps, precise to tenths of a second
 * - Timer starts at -3 seconds (countdown effect) and displays tenths (M:SS.T)
 * - Messages fade in 0.2 seconds before their timestamp
 * - Pause/Resume functionality
 * - Fixed 800px container with visible borders
 * - Optional YouTube reference video driven by the timer: it rolls from 3 seconds before the chosen timestamp so it lands on that frame at 0:00, and follows Pause/Resume/Reset
 *
 * Usage:
 * 1. Enter messages in CSV format: timestamp,message (timestamp may include tenths, e.g. 0:05.5)
 * 2. Click Start to begin timer
 * 3. Messages appear at their specified timestamps
 * 4. Use Pause/Resume to control playback
 * 5. Use Reset to start over
 */

// Default messages (used as fallback if CSV is empty)
const defaultMessages = [
{timestamp: "0:00", message: "First message appears immediately", image: "storyboard1/resize-image1.png"},
{timestamp: "0:05.5", message: "Second message at 5.5 seconds and has a lot more words than you would expect or even believe", image: "storyboard1/resize-image2.png"},
{timestamp: "1:00", message: "Third message at 1 minute"},
{timestamp: "1:30", message: "Fourth message at 1 minute 30 seconds"},

];

let messages = defaultMessages;

const messageDisplay = document.getElementById('messageDisplay');
const timerDisplay = document.getElementById('timerDisplay');
const csvInput = document.getElementById('csvInput');
const startButton = document.getElementById('startButton');
const pauseButton = document.getElementById('pauseButton');
const resetButton = document.getElementById('resetButton');
const imageSlot = document.getElementById('imageSlot');
const imageSlotImage = document.getElementById('imageSlotImage');
const messageOffset = document.getElementById('messageOffset');

// Message offset accepts a fraction of a second only, in tenths
const MAX_MESSAGE_OFFSET_SECONDS = 0.9;

// Countdown length before the timer reaches 0:00 - the single source of truth for the lead-in
const COUNTDOWN_MS = 3000;

let timeouts = [];
let timerInterval = null;
let startTime = null;
let totalPausedDuration = 0;
let pausedTime = null;
let isPaused = false;
let messageOffsetMs = 0;      // delay added to every message cue, 0-900ms

// Build textarea default from defaultMessages using commas and HTML newlines (&#10;)
function buildCsvLine(entry) {
    const { timestamp, message, image } = entry;
    return image ? `${timestamp},${message},${image}` : `${timestamp},${message}`;
}

function setTextareaDefaultFromDefaults() {
    try {
        const lines = defaultMessages.map(buildCsvLine);
        // Use HTML newline entity for placeholder
        csvInput.placeholder = lines.join("\n");
    } catch (e) {
        // No-op if defaultMessages is not available
    }
}

// Initialize placeholder with defaults
setTextareaDefaultFromDefaults();

function parseTimestamp(timestamp) {
    // Parse timestamp in format "M:SS", "MM:SS", or with tenths "M:SS.T" (e.g., "0:05" = 5 seconds, "0:05.5" = 5.5 seconds)
    const parts = timestamp.split(':');
    const minutes = parseInt(parts[0], 10) || 0;
    const seconds = parseFloat(parts[1]) || 0; // parseFloat keeps the fractional part
    return Math.round((minutes * 60 + seconds) * 1000); // Convert to milliseconds
}

/**
 * Parse CSV data from textarea
 * Format: timestamp,message (one per line)
 * Example: "0:05,Hello world", "0:05.5,Half a second later" or "1:30,This is a message"
 * @param {string} csvText - CSV text from textarea
 * @returns {Array} Array of {timestamp, message} objects
 */
function parseCSV(csvText) {
    const lines = csvText.trim().split('\n');
    const parsedMessages = [];

    for (const line of lines) {
        const trimmedLine = line.trim();
        if (!trimmedLine) continue; // Skip empty lines

        // Find first comma (timestamp separator) and last comma (optional image)
        const firstCommaIndex = trimmedLine.indexOf(',');
        if (firstCommaIndex === -1) continue; // Skip lines without comma

        const lastCommaIndex = trimmedLine.lastIndexOf(',');

        const timestamp = trimmedLine.substring(0, firstCommaIndex).trim();
        let message;
        let image = null;

        if (lastCommaIndex !== firstCommaIndex) {
            // There is an optional third value (image filename)
            message = trimmedLine.substring(firstCommaIndex + 1, lastCommaIndex).trim();
            const imageCandidate = trimmedLine.substring(lastCommaIndex + 1).trim();
            if (imageCandidate) {
                image = imageCandidate;
            }
        } else {
            // Only timestamp and message
            message = trimmedLine.substring(firstCommaIndex + 1).trim();
        }

        if (timestamp && message) {
            parsedMessages.push({ timestamp, message, image });
        }
    }

    return parsedMessages;
}

function formatTime(milliseconds) {
    // Format milliseconds as M:SS.T or MM:SS.T, handling negative values
    const sign = milliseconds < 0 ? '-' : '';
    const totalTenths = Math.floor(Math.abs(milliseconds) / 100);
    const minutes = Math.floor(totalTenths / 600);
    const seconds = Math.floor(totalTenths / 10) % 60;
    const tenths = totalTenths % 10;
    return `${sign}${minutes}:${seconds.toString().padStart(2, '0')}.${tenths}`;
}

function updateTimerDisplay() {
    if (startTime === null) {
        timerDisplay.textContent = formatTime(-COUNTDOWN_MS);
        return;
    }

    const now = Date.now();
    let elapsed;
    
    if (isPaused) {
        // If paused, don't count the current pause time
        elapsed = pausedTime - startTime - totalPausedDuration;
    } else {
        // If running, calculate elapsed time accounting for all pauses
        elapsed = now - startTime - totalPausedDuration;
    }
    
    // Don't clamp at 0, allow negative values to show
    timerDisplay.textContent = formatTime(elapsed);
}

function startTimerInterval() {
    // Clear any existing interval
    if (timerInterval) {
        clearInterval(timerInterval);
    }
    
    // Update timer every 50ms so the tenths digit ticks over promptly
    timerInterval = setInterval(updateTimerDisplay, 50);
}

function stopTimerInterval() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
}

function showMessage(messageText, imageFilename) {
    // Get or create the message-text span
    let messageTextSpan = messageDisplay.querySelector('.message-text');
    if (!messageTextSpan) {
        messageTextSpan = document.createElement('span');
        messageTextSpan.className = 'message-text';
        messageDisplay.appendChild(messageTextSpan);
    }
    
    // Fade out
    messageDisplay.classList.remove('visible');
    
    setTimeout(() => {
        // Update message text
        messageTextSpan.textContent = messageText;
        // Handle optional image
        if (imageFilename) {
            showImage(imageFilename);
        } else {
            clearImage();
        }
        // Fade in
        messageDisplay.classList.add('visible');
    }, 200); // Wait for fade out to complete (matches 0.2s transition)
}

/**
 * Turn a CSV image value into a URL underneath the images/ folder.
 *
 * Accepts a bare filename ("image1.png") or any subdirectory path below
 * images/ ("storyboard1/image1.png"). Backslashes are treated as separators so
 * paths copied from Windows still work, and leading "./" or "/" is dropped.
 * Each segment is URI-encoded so spaces and other awkward characters survive.
 * Returns null for anything that is empty or tries to climb out of images/
 * with "..", which leaves the slot showing its blank placeholder.
 */
function resolveImagePath(filename) {
    if (!filename) return null;

    const segments = filename
        .trim()
        .replace(/\\/g, '/')      // Windows-style separators
        .split('/')
        .filter(segment => segment !== '' && segment !== '.');

    if (segments.length === 0) return null;
    if (segments.some(segment => segment === '..')) return null; // Stay inside images/

    return `images/${segments.map(encodeURIComponent).join('/')}`;
}

function showImage(filename) {
    const url = resolveImagePath(filename);
    if (!url) {
        // No image named, or the path pointed outside images/ - show the blank slot
        clearImage();
        return;
    }
    // Load image and toggle visibility based on load success
    imageSlotImage.onload = () => {
        imageSlot.classList.add('has-image');
    };
    imageSlotImage.onerror = () => {
        // Missing file (or a bad path) falls back to the blank placeholder
        clearImage();
    };
    imageSlotImage.src = url;
}

function clearImage() {
    // Drop the handlers first so removing src cannot re-enter through onerror
    imageSlotImage.onload = null;
    imageSlotImage.onerror = null;
    imageSlot.classList.remove('has-image');
    imageSlotImage.removeAttribute('src');
}

/**
 * Read the message offset box, rounded to the nearest tenth and held inside 0.0-0.9 seconds.
 * The clamped value is written back so the box always shows what is actually being applied.
 * @returns {number} Offset in milliseconds (0-900)
 */
function readMessageOffsetMs() {
    const seconds = parseFloat(messageOffset.value);
    if (!Number.isFinite(seconds) || seconds <= 0) {
        messageOffset.value = '0.0';
        return 0;
    }

    const clamped = Math.min(Math.round(seconds * 10) / 10, MAX_MESSAGE_OFFSET_SECONDS);
    messageOffset.value = clamped.toFixed(1);
    return Math.round(clamped * 1000);
}

function clearAllTimeouts() {
    timeouts.forEach(timeout => clearTimeout(timeout));
    timeouts = [];
}

function scheduleMessages() {
    // Clear any existing timeouts
    clearAllTimeouts();
    
    // Calculate elapsed time (accounting for pauses)
    const now = Date.now();
    const elapsed = now - startTime - totalPausedDuration;
    
    // Schedule each message to fire at its specific timestamp
    // Offset by 0.4 seconds so transition starts 0.2s before the timestamp
    const TRANSITION_OFFSET = 200; // 0.2 seconds in milliseconds
    
    messages.forEach(({ message, timestamp, image }) => {
        // messageOffsetMs nudges every message later by the same fraction of a second
        const targetDelay = parseTimestamp(timestamp) + messageOffsetMs;
        const remainingDelay = targetDelay - elapsed - TRANSITION_OFFSET;
        
        // If the message should show now or has already passed, show it immediately
        if (remainingDelay <= 0) {
            showMessage(message, image);
        } else {
            // Otherwise, schedule it for the remaining delay (with offset)
            const timeout = setTimeout(() => {
                showMessage(message, image);
            }, remainingDelay);
            timeouts.push(timeout);
        }
    });
}

/**
 * Start the clock and the message cues. Split out of startMessages because it does not run on the
 * click: when a video is loaded it waits until the player reports that it is actually rolling, so
 * a cold first play cannot leave the timer running ahead of the video.
 */
function beginRun() {
    // Whatever brought us here - video rolling, the safety fallback, or no video at all - the
    // page is no longer waiting
    timerDisplay.classList.remove('waiting');

    // Pause only means something once there is a clock to pause: pausing during the pre-roll wait
    // and then resuming would measure the gap against a startTime that was never set
    pauseButton.disabled = false;

    // Initialize start time and reset pause state
    // Offset by the countdown so the timer starts at -0:03
    startTime = Date.now() + COUNTDOWN_MS;
    totalPausedDuration = 0;
    isPaused = false;

    // Start timer display updates
    startTimerInterval();
    updateTimerDisplay();

    // Schedule messages
    scheduleMessages();
}

/**
 * Start the timer and message display
 * - Parses CSV from textarea (or uses default messages)
 * - Timer starts at -3 seconds (countdown effect)
 * - Schedules all messages at their specified timestamps
 * - Begins timer display updates
 * - Starts the video rolling so it reaches the chosen timestamp at 0:00
 */
function startMessages() {
    // Parse CSV from textbox and update messages
    const csvText = csvInput.value.trim();
    if (csvText) {
        const parsedMessages = parseCSV(csvText);
        if (parsedMessages.length > 0) {
            messages = parsedMessages;
        } else {
            // If parsing failed, use default messages
            messages = defaultMessages;
        }
    } else {
        // If textbox is empty, use default messages
        messages = defaultMessages;
    }
    
    // The clock itself is set in beginRun, once the video is known to be rolling
    startTime = null;
    totalPausedDuration = 0;
    isPaused = false;

    VideoPanel.captureStart();
    messageOffsetMs = readMessageOffsetMs();

    // Disable start button and textboxes, enable pause and reset buttons
    startButton.disabled = true;
    csvInput.disabled = true;
    VideoPanel.setDisabled(true);
    messageOffset.disabled = true;
    // Pause stays disabled until beginRun; Reset is live at once so a slow start can be abandoned
    resetButton.disabled = false;
    pauseButton.textContent = 'Pause';

    // Show the countdown's starting value, dimmed, until the run actually begins
    updateTimerDisplay();
    timerDisplay.classList.add('waiting');

    // Start the video rolling so it reaches the chosen timestamp exactly at 0:00, and let it
    // start the clock once it is genuinely playing. Staying on the synchronous path of the click
    // matters: deferring this call would lose the user gesture the autoplay policy requires.
    VideoPanel.syncTo(-COUNTDOWN_MS, true, beginRun);
}

function pauseOrResumeMessages() {
    if (isPaused) {
        // Resume: calculate pause duration and reschedule
        const pauseDuration = Date.now() - pausedTime;
        totalPausedDuration += pauseDuration;
        pausedTime = null;
        isPaused = false;
        pauseButton.textContent = 'Pause';

        // Update timer display immediately
        updateTimerDisplay();

        // Reschedule messages with adjusted timing
        scheduleMessages();

        // Re-seek the video to match the timer rather than resuming where it stopped,
        // so the pause gap cannot leave the two drifting apart
        VideoPanel.syncTo(Date.now() - startTime - totalPausedDuration, true);
    } else {
        // Pause: clear timeouts and record pause time
        clearAllTimeouts();
        pausedTime = Date.now();
        isPaused = true;
        pauseButton.textContent = 'Resume';

        // Update timer display to show paused time
        updateTimerDisplay();

        VideoPanel.pause();
    }
}

function resetMessages() {
    // Clear all scheduled messages
    clearAllTimeouts();
    
    // Stop timer interval
    stopTimerInterval();
    
    // Reset state
    startTime = null;
    totalPausedDuration = 0;
    pausedTime = null;
    isPaused = false;
    
    // Reset timer display, dropping the dim in case Reset landed during the pre-roll wait
    timerDisplay.classList.remove('waiting');
    timerDisplay.textContent = formatTime(-COUNTDOWN_MS);

    // Park the video back on the chosen timestamp, ready for another run
    VideoPanel.parkAtStart();
    
    // Clear the message display but maintain space
    messageDisplay.classList.remove('visible');
    clearImage();
    setTimeout(() => {
        // Get or create the message-text span
        let messageTextSpan = messageDisplay.querySelector('.message-text');
        if (!messageTextSpan) {
            messageTextSpan = document.createElement('span');
            messageTextSpan.className = 'message-text';
            messageDisplay.appendChild(messageTextSpan);
        }
        messageTextSpan.textContent = '\u00a0'; // Non-breaking space to maintain height
    }, 500);
    
    // Enable start button and textboxes, disable pause and reset buttons
    startButton.disabled = false;
    csvInput.disabled = false;
    VideoPanel.setDisabled(false);
    messageOffset.disabled = false;
    pauseButton.disabled = true;
    resetButton.disabled = true;
    pauseButton.textContent = 'Pause';
}

// Add click event listeners
startButton.addEventListener('click', startMessages);
pauseButton.addEventListener('click', pauseOrResumeMessages);
resetButton.addEventListener('click', resetMessages);

// Snap the typed value into range as soon as the user leaves the box
messageOffset.addEventListener('change', readMessageOffsetMs);

// Hand the video panel the timer helpers it shares, and the timeout registry so that
// Pause and Reset can cancel a held-back video start alongside the message cues
VideoPanel.init({
    parseTimestamp: parseTimestamp,
    formatTime: formatTime,
    registerTimeout: (timeout) => timeouts.push(timeout),
    countdownMs: COUNTDOWN_MS
});
