// Piano Roll Configuration
const NOTES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const OCTAVES = [2, 3, 4, 5, 6];
const NOTE_HEIGHT = 20;
const GRID_WIDTH = 80; // Increased for better visibility of subdivisions
const BEATS = 128; // 32 measures of 4 beats (extended for full songs)
const SUBDIVISIONS = 4; // Quarter note subdivisions (4 = 16th notes per beat)
const CELL_WIDTH = GRID_WIDTH / SUBDIVISIONS; // Width of each subdivision
const CANVAS_WIDTH = BEATS * GRID_WIDTH;

// Generate all notes (lowest to highest for display top to bottom)
const allNotes = [];
for (let octave = OCTAVES[OCTAVES.length - 1]; octave >= OCTAVES[0]; octave--) {
  for (let i = NOTES.length - 1; i >= 0; i--) {
    allNotes.push(`${NOTES[i]}${octave}`);
  }
}

const CANVAS_HEIGHT = allNotes.length * NOTE_HEIGHT;

// State
let notes = {}; // Store active notes: "noteIndex-beatIndex" -> true
let isPlaying = false;
let playbackPosition = 0;
let playbackInterval = null;
let activeAudioSources = []; // Track active audio sources for stopping
let playbackStartTime = 0; // Track when playback started

// Audio Context
let audioContext = null;
let audioBuffers = {}; // Cache for loaded audio files

// Initialize
const canvas = document.getElementById("pianoRoll");
const ctx = canvas ? canvas.getContext("2d") : null;
const NOTE_LABEL_WIDTH = 80;
if (canvas) {
  canvas.width = NOTE_LABEL_WIDTH + CANVAS_WIDTH;
  canvas.height = CANVAS_HEIGHT;
}

// Preload all audio samples
async function preloadAllSamples() {
  const loadPromises = [];
  for (const octave of OCTAVES) {
    for (const note of NOTES) {
      loadPromises.push(loadAudioFile(`${note}${octave}`));
    }
  }
  try {
    await Promise.all(loadPromises);
  } catch (error) {
    console.error("Failed to preload some audio samples:", error);
  }
}

// Initialize and draw
(async () => {
  await preloadAllSamples();
  drawGrid();
})();

// Draw grid
function drawGrid() {
  if (!ctx) {
    return;
  }
  ctx.clearRect(0, 0, NOTE_LABEL_WIDTH + CANVAS_WIDTH, CANVAS_HEIGHT);

  // Draw note labels background and labels
  allNotes.forEach((note, index) => {
    const y = index * NOTE_HEIGHT;
    const isBlack = note.includes("#");

    // Background for note label
    ctx.fillStyle = isBlack ? "rgba(0, 0, 0, 0.8)" : "rgba(0, 255, 0, 0.1)";
    ctx.fillRect(0, y, NOTE_LABEL_WIDTH, NOTE_HEIGHT);

    // Note label text
    ctx.fillStyle = "#0f0";
    ctx.font = 'bold 10px "Orbitron", sans-serif';
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(note, NOTE_LABEL_WIDTH / 2, y + NOTE_HEIGHT / 2);
  });

  // Draw vertical separator after note labels
  ctx.strokeStyle = "rgba(0, 255, 0, 0.5)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(NOTE_LABEL_WIDTH, 0);
  ctx.lineTo(NOTE_LABEL_WIDTH, CANVAS_HEIGHT);
  ctx.stroke();

  // Draw horizontal lines
  ctx.strokeStyle = "rgba(0, 255, 0, 0.3)";
  ctx.lineWidth = 1;
  for (let i = 0; i <= allNotes.length; i++) {
    const y = i * NOTE_HEIGHT;
    ctx.beginPath();
    ctx.moveTo(NOTE_LABEL_WIDTH, y);
    ctx.lineTo(NOTE_LABEL_WIDTH + CANVAS_WIDTH, y);
    ctx.stroke();
  }

  // Draw vertical lines (beat markers with subdivisions)
  for (let i = 0; i <= BEATS * SUBDIVISIONS; i++) {
    const x = NOTE_LABEL_WIDTH + i * CELL_WIDTH;
    const isBeat = i % SUBDIVISIONS === 0;
    const isMeasure = i % (SUBDIVISIONS * 4) === 0;

    if (isMeasure) {
      ctx.strokeStyle = "#666";
      ctx.lineWidth = 2;
    } else if (isBeat) {
      ctx.strokeStyle = "#444";
      ctx.lineWidth = 1;
    } else {
      ctx.strokeStyle = "#2a2a2a";
      ctx.lineWidth = 1;
    }

    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, CANVAS_HEIGHT);
    ctx.stroke();
  }

  // Draw active notes with proper subdivision width
  ctx.fillStyle = "#0f0";
  for (let key in notes) {
    const [noteIndex, beatPos] = key.split("-").map(Number);
    const x = NOTE_LABEL_WIDTH + beatPos * GRID_WIDTH;
    const y = noteIndex * NOTE_HEIGHT;
    ctx.fillRect(x, y, CELL_WIDTH - 1, NOTE_HEIGHT - 1);
  }

  // Draw playback position (supports fractional beats)
  if (isPlaying) {
    ctx.strokeStyle = "#ff4a4a";
    ctx.lineWidth = 3;
    ctx.beginPath();
    const x = NOTE_LABEL_WIDTH + playbackPosition * GRID_WIDTH;
    ctx.moveTo(x, 0);
    ctx.lineTo(x, CANVAS_HEIGHT);
    ctx.stroke();
  }
}

// Handle canvas interactions for drawing notes
if (canvas) {
  let isDrawing = false;
  let isErasing = false;

  function getCanvasPosition(e) {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left + canvas.parentElement.scrollLeft;
    const y = e.clientY - rect.top + canvas.parentElement.scrollTop;
    return { x, y };
  }

  function addOrRemoveNote(x, y) {
    // Ignore clicks on note label area
    if (x < NOTE_LABEL_WIDTH) return;

    // Adjust x position to account for note label width
    const adjustedX = x - NOTE_LABEL_WIDTH;

    // Support quarter note resolution (0.25 beats) for syncopation
    const beatPos = Math.floor((adjustedX / GRID_WIDTH) * 4) / 4;
    const noteIndex = Math.floor(y / NOTE_HEIGHT);

    const key = `${noteIndex}-${beatPos}`;

    if (isErasing) {
      delete notes[key];
    } else {
      if (!notes[key]) {
        notes[key] = true;
        playNote(allNotes[noteIndex], 0.2);
      }
    }

    drawGrid();
  }

  canvas.addEventListener("mousedown", (e) => {
    const { x, y } = getCanvasPosition(e);
    if (x < NOTE_LABEL_WIDTH) return;

    const adjustedX = x - NOTE_LABEL_WIDTH;
    const beatPos = Math.round((adjustedX / GRID_WIDTH) * 4) / 4;
    const noteIndex = Math.floor(y / NOTE_HEIGHT);
    const key = `${noteIndex}-${beatPos}`;

    // Determine if we're erasing or drawing based on whether a note exists
    isErasing = notes[key] ? true : false;
    isDrawing = true;

    addOrRemoveNote(x, y);
  });

  canvas.addEventListener("mousemove", (e) => {
    if (!isDrawing) return;
    const { x, y } = getCanvasPosition(e);
    addOrRemoveNote(x, y);
  });

  canvas.addEventListener("mouseup", () => {
    isDrawing = false;
    isErasing = false;
  });

  canvas.addEventListener("mouseleave", () => {
    isDrawing = false;
    isErasing = false;
  });
}

// Load audio file for a note
async function loadAudioFile(noteName) {
  if (audioBuffers[noteName]) {
    return audioBuffers[noteName];
  }

  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }

  try {
    // Format: assets/C2.mp3, assets/C#2.mp3, etc.
    const fileName = noteName.replace("#", "s"); // C# becomes Cb
    const response = await fetch(`assets/${fileName}.mp3`);
    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    audioBuffers[noteName] = audioBuffer;
    return audioBuffer;
  } catch (error) {
    return null;
  }
}

// Play a single note using MP3
async function playNote(noteName, duration = 0.2) {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }

  const audioBuffer = await loadAudioFile(noteName);
  if (!audioBuffer) return;

  const source = audioContext.createBufferSource();
  const gainNode = audioContext.createGain();

  source.buffer = audioBuffer;
  source.connect(gainNode);
  gainNode.connect(audioContext.destination);

  gainNode.gain.setValueAtTime(0.7, audioContext.currentTime);

  source.start(audioContext.currentTime);
  // Optional: stop after duration if you want to cut off the sample
  // source.stop(audioContext.currentTime + duration);
}

// Clear button
document.getElementById("clearBtn").addEventListener("click", () => {
  notes = {};
  drawGrid();
});

// Play button
document.getElementById("playBtn").addEventListener("click", async () => {
  if (isPlaying) return;

  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }

  isPlaying = true;
  playbackPosition = 0;

  const tempo = parseInt(document.getElementById("bpmSelect").value) || 120; // BPM from dropdown
  const beatDuration = 60 / tempo; // seconds per beat
  const checkInterval = (beatDuration * 1000) / 16; // Check every 16th note in milliseconds

  // Schedule all notes for playback
  const scheduledNotes = [];
  for (let key in notes) {
    const [noteIndex, beatPos] = key.split("-").map(Number);
    scheduledNotes.push({
      noteName: allNotes[noteIndex],
      time: beatPos * beatDuration,
    });
  }

  // Sort by time
  scheduledNotes.sort((a, b) => a.time - b.time);

  // Pre-load all audio buffers first - no longer needed, they are preloaded
  // const audioPromises = scheduledNotes.map((note) =>
  //   loadAudioFile(note.noteName)
  // );
  // await Promise.all(audioPromises);

  // Now start both audio and visual at the same moment
  const audioStartTime = audioContext.currentTime;
  activeAudioSources = []; // Clear any previous sources

  // Schedule all notes using Web Audio API's precise scheduling
  scheduledNotes.forEach((note) => {
    const scheduleTime = audioStartTime + note.time;
    const audioBuffer = audioBuffers[note.noteName];

    if (!audioBuffer) return;

    const source = audioContext.createBufferSource();
    const gainNode = audioContext.createGain();

    source.buffer = audioBuffer;
    source.connect(gainNode);
    gainNode.connect(audioContext.destination);

    gainNode.gain.setValueAtTime(0.7, scheduleTime);
    source.start(scheduleTime);

    // Track source for stopping
    activeAudioSources.push(source);
  });

  // Visual playback update synced to audioContext.currentTime
  playbackInterval = setInterval(() => {
    const elapsed = audioContext.currentTime - audioStartTime;
    playbackPosition = elapsed / beatDuration;

    if (playbackPosition >= BEATS) {
      isPlaying = false;
      playbackPosition = 0;
      clearInterval(playbackInterval);
      playbackInterval = null;
      activeAudioSources = [];
    }

    drawGrid();
  }, checkInterval);
});

// Pre-defined songs
const SONGS = {
  "star-wars": {
    name: "Star Wars Main Theme",
    notes: [
      // Measures 1-4 (Main Fanfare)
      ["G4", 0],
      ["G4", 0.5],
      ["G4", 1],
      ["C5", 1.5],
      ["G5", 3.5],
      ["F5", 4.5],
      ["E5", 5],
      ["D5", 5.5],
      ["C6", 6],
      ["G5", 8],
      ["F5", 9],
      ["E5", 9.5],
      ["D5", 10],
      ["C6", 10.5],
      ["G5", 12.5],
      ["F5", 13.5],
      ["E5", 14],
      ["F5", 14.5],
      ["D5", 15],

      // Measures 5-8 (Repeat of Fanfare)
      ["G4", 16],
      ["G4", 16.5],
      ["G4", 17],
      ["C5", 17.5],
      ["G5", 19.5],
      ["F5", 20.5],
      ["E5", 21],
      ["D5", 21.5],
      ["C6", 22],
      ["G5", 24],
      ["F5", 25],
      ["E5", 25.5],
      ["D5", 26],
      ["C6", 26.5],
      ["G5", 28.5],
      ["F5", 29.5],
      ["E5", 30],
      ["F5", 30.5],
      ["D5", 31],

      // Measures 9-12 (Bridge)
      ["G4", 32],
      ["A4", 33],
      ["B4", 33.5],
      ["C5", 34],
      ["B4", 35],
      ["A4", 35.5],
      ["G4", 36],
      ["C5", 37],
      ["B4", 37.5],
      ["A4", 38],
      ["B4", 38.5],
      ["G4", 39],

      // Measures 13-16
      ["D5", 40],
      ["E5", 41],
      ["F5", 41.5],
      ["G5", 42],
      ["F5", 43],
      ["E5", 43.5],
      ["D5", 44],
      ["G5", 45],
      ["F5", 45.5],
      ["E5", 46],
      ["F5", 46.5],
      ["D5", 47],

      // Measures 17-20 (Rebel Blockade Runner Theme)
      ["G3", 48],
      ["G4", 48.5],
      ["G3", 49.5],
      ["G4", 50],
      ["G3", 51],
      ["G4", 51.5],
      ["G3", 52.5],
      ["G4", 53],
      ["G3", 54],
      ["G4", 54.5],
      ["G3", 55.5],
      ["G4", 56],

      // Bass/Harmony for the main theme
      // Measures 1-4
      ["C3", 1.5],
      ["G3", 1.5],
      ["C4", 1.5],
      ["C3", 3.5],
      ["G3", 3.5],
      ["C4", 3.5],
      ["B2", 4.5],
      ["F#3", 4.5],
      ["B3", 4.5],
      ["B2", 6],
      ["F#3", 6],
      ["B3", 6],
      ["C3", 8],
      ["G3", 8],
      ["C4", 8],
      ["B2", 9],
      ["F#3", 9],
      ["B3", 9],
      ["C3", 10.5],
      ["G3", 10.5],
      ["C4", 10.5],
      ["C3", 12.5],
      ["G3", 12.5],
      ["C4", 12.5],
      ["B2", 13.5],
      ["F#3", 13.5],
      ["B3", 13.5],
      ["G3", 15],
      ["B3", 15],
      ["D4", 15],

      // Measures 5-8
      ["C3", 17.5],
      ["G3", 17.5],
      ["C4", 17.5],
      ["C3", 19.5],
      ["G3", 19.5],
      ["C4", 19.5],
      ["B2", 20.5],
      ["F#3", 20.5],
      ["B3", 20.5],
      ["B2", 22],
      ["F#3", 22],
      ["B3", 22],
      ["C3", 24],
      ["G3", 24],
      ["C4", 24],
      ["B2", 25],
      ["F#3", 25],
      ["B3", 25],
      ["C3", 26.5],
      ["G3", 26.5],
      ["C4", 26.5],
      ["C3", 28.5],
      ["G3", 28.5],
      ["C4", 28.5],
      ["B2", 29.5],
      ["F#3", 29.5],
      ["B3", 29.5],
      ["G3", 31],
      ["B3", 31],
      ["D4", 31],
    ],
  },
  minder: {
    name: "Minder Theme (I Could Be So Good For You)",
    notes: [
      // Intro (Piano solo) - Measures 1-4
      ["G4", 0],
      ["A4", 0.5],
      ["G4", 1],
      ["E4", 1.5],
      ["G4", 2],
      ["A4", 2.5],
      ["G4", 3],
      ["B4", 3.5],
      ["C5", 4],
      ["B4", 5],
      ["G4", 5.5],
      ["A4", 6],
      ["G4", 6.5],

      // Bass notes for Intro
      ["C3", 0],
      ["E3", 1],
      ["C3", 2],
      ["E3", 3],
      ["D3", 4],
      ["G3", 4],
      ["B3", 5.5],
      ["D3", 6],
      ["G3", 6],

      // Verse 1: "I could be so good for you..." - Measures 5-8
      ["G4", 8],
      ["A4", 8.5],
      ["G4", 9],
      ["E4", 9.5],
      ["G4", 10],
      ["A4", 10.5],
      ["G4", 11],
      ["C3", 8],
      ["G3", 8],
      ["E3", 8.5],
      ["C3", 9],
      ["G3", 9],

      // "...I'd do it all for you..." - Measures 9-12
      ["B4", 12],
      ["C5", 12.5],
      ["B4", 13],
      ["G4", 13.5],
      ["A4", 14],
      ["G4", 14.5],
      ["D3", 12],
      ["A3", 12],
      ["G3", 13.5],
      ["D3", 14],
      ["A3", 14],

      // Verse 2: "You're a man who knows the score..." - Measures 13-16
      ["G4", 16],
      ["A4", 16.5],
      ["G4", 17],
      ["E4", 17.5],
      ["G4", 18],
      ["A4", 18.5],
      ["G4", 19],
      ["C3", 16],
      ["G3", 16],
      ["E3", 16.5],
      ["C3", 17],
      ["G3", 17],

      // "...What's the use of trying to score..." - Measures 17-20
      ["B4", 20],
      ["C5", 20.5],
      ["B4", 21],
      ["G4", 21.5],
      ["A4", 22],
      ["G4", 22.5],
      ["D3", 20],
      ["A3", 20],
      ["G3", 21.5],
      ["D3", 22],
      ["A3", 22],

      // Chorus: "I could be so good for you..." - Measures 21-24
      ["C5", 24],
      ["C5", 24.5],
      ["B4", 25],
      ["A4", 25.5],
      ["G4", 26],
      ["E4", 27],
      ["G4", 27.5],
      ["C4", 24],
      ["G4", 24],
      ["C4", 25],
      ["G4", 25],
      ["C4", 26],
      ["G4", 26],

      // "...I'd be so good for you..." - Measures 25-28
      ["A4", 28],
      ["A4", 28.5],
      ["G4", 29],
      ["F4", 29.5],
      ["E4", 30],
      ["D4", 31],
      ["F3", 28],
      ["C4", 28],
      ["F3", 29],
      ["C4", 29],
      ["G3", 30],
      ["C4", 30],
      ["G3", 31],
      ["C4", 31],

      // Outro - Measures 29-32
      ["G4", 32],
      ["A4", 32.5],
      ["G4", 33],
      ["E4", 33.5],
      ["G4", 34],
      ["A4", 34.5],
      ["G4", 35],
      ["C3", 32],
      ["G3", 32],
      ["E3", 32.5],
      ["C3", 33],
      ["G3", 33],

      ["C5", 36],
      ["B4", 37],
      ["G4", 37.5],
      ["A4", 38],
      ["G4", 38.5],
      ["G4", 39],
      ["D3", 36],
      ["A3", 36],
      ["G3", 37.5],
      ["D3", 38],
      ["A3", 38],
      ["C3", 39],
      ["G3", 39],
    ],
  },
  "honky-tonk": {
    name: "Honky Tonk Stomp",
    notes: [
      // INTRO - Measures 1-8 (Classic honky tonk shuffle in C)
      // Bass - stride pattern with walking bass
      ["C2", 0],
      ["G2", 1],
      ["C2", 2],
      ["E2", 3],
      ["F2", 4],
      ["C3", 5],
      ["F2", 6],
      ["A2", 7],
      ["C2", 8],
      ["G2", 9],
      ["C2", 10],
      ["E2", 11],
      ["G2", 12],
      ["D3", 13],
      ["G2", 14],
      ["B2", 15],

      // Right hand - syncopated melody with swing feel
      ["E4", 0.75],
      ["G4", 1.25],
      ["C5", 1.75],
      ["E5", 2.25],
      ["D5", 3],
      ["C5", 3.5],
      ["A4", 4],
      ["G4", 4.5],
      ["F4", 5],
      ["A4", 5.5],
      ["C5", 6],
      ["F5", 6.5],
      ["E5", 7],
      ["D5", 7.5],
      ["C5", 8],
      ["E4", 8.75],
      ["G4", 9.25],
      ["C5", 9.75],
      ["E5", 10.25],
      ["D5", 11],
      ["C5", 11.5],
      ["B4", 12],
      ["A4", 12.5],
      ["G4", 13],
      ["F4", 13.5],
      ["E4", 14],
      ["D4", 14.5],
      ["C4", 15],

      // VERSE 1 - Measures 9-24
      ["C2", 16],
      ["G2", 17],
      ["C2", 18],
      ["E2", 19],
      ["C2", 20],
      ["G2", 21],
      ["C2", 22],
      ["E2", 23],
      ["F2", 24],
      ["C3", 25],
      ["F2", 26],
      ["A2", 27],
      ["F2", 28],
      ["C3", 29],
      ["F2", 30],
      ["A2", 31],

      ["C4", 16.5],
      ["D4", 17],
      ["E4", 17.5],
      ["G4", 18],
      ["C5", 18.5],
      ["E5", 19],
      ["D5", 19.5],
      ["C5", 20],
      ["G4", 20.5],
      ["A4", 21],
      ["C5", 21.5],
      ["E5", 22],
      ["G5", 22.5],
      ["E5", 23],
      ["C5", 23.5],
      ["F4", 24.5],
      ["G4", 25],
      ["A4", 25.5],
      ["C5", 26],
      ["F5", 26.5],
      ["A5", 27],
      ["G5", 27.5],
      ["F5", 28],
      ["C5", 28.5],
      ["D5", 29],
      ["E5", 29.5],
      ["F5", 30],
      ["A5", 30.5],
      ["F5", 31],
      ["E5", 31.5],

      ["C2", 32],
      ["G2", 33],
      ["C2", 34],
      ["E2", 35],
      ["G2", 36],
      ["D3", 37],
      ["G2", 38],
      ["B2", 39],
      ["C2", 40],
      ["G2", 41],
      ["C2", 42],
      ["E2", 43],
      ["C2", 44],
      ["G2", 45],
      ["C2", 46],
      ["E2", 47],

      ["E4", 32.5],
      ["G4", 33],
      ["C5", 33.5],
      ["E5", 34],
      ["D5", 34.5],
      ["C5", 35],
      ["G4", 35.5],
      ["B4", 36.5],
      ["D5", 37],
      ["G5", 37.5],
      ["B5", 38],
      ["A5", 38.5],
      ["G5", 39],
      ["F5", 39.5],
      ["E5", 40.5],
      ["D5", 41],
      ["C5", 41.5],
      ["G4", 42],
      ["E4", 42.5],
      ["C4", 43],
      ["D4", 44],
      ["E4", 44.5],
      ["G4", 45],
      ["C5", 45.5],
      ["E5", 46],
      ["C5", 47],

      // CHORUS - Measures 25-40 (More energetic with runs)
      ["C2", 48],
      ["G2", 49],
      ["C2", 50],
      ["E2", 51],
      ["F2", 52],
      ["C3", 53],
      ["F2", 54],
      ["A2", 55],
      ["C2", 56],
      ["G2", 57],
      ["C2", 58],
      ["E2", 59],
      ["G2", 60],
      ["D3", 61],
      ["G2", 62],
      ["B2", 63],

      ["C5", 48],
      ["D5", 48.25],
      ["E5", 48.5],
      ["G5", 48.75],
      ["C6", 49],
      ["E6", 49.5],
      ["C6", 50],
      ["G5", 50.5],
      ["E5", 51],
      ["C5", 51.5],
      ["F5", 52],
      ["G5", 52.25],
      ["A5", 52.5],
      ["C6", 52.75],
      ["F6", 53],
      ["A6", 53.5],
      ["F6", 54],
      ["C6", 54.5],
      ["A5", 55],
      ["F5", 55.5],
      ["E5", 56],
      ["F5", 56.25],
      ["G5", 56.5],
      ["C6", 56.75],
      ["E6", 57],
      ["G6", 57.5],
      ["E6", 58],
      ["C6", 58.5],
      ["G5", 59],
      ["E5", 59.5],
      ["D5", 60],
      ["E5", 60.25],
      ["F5", 60.5],
      ["G5", 60.75],
      ["B5", 61],
      ["D6", 61.5],
      ["B5", 62],
      ["G5", 62.5],
      ["F5", 63],
      ["D5", 63.5],

      ["C2", 64],
      ["G2", 65],
      ["C2", 66],
      ["E2", 67],
      ["F2", 68],
      ["C3", 69],
      ["F2", 70],
      ["A2", 71],
      ["C2", 72],
      ["G2", 73],
      ["C2", 74],
      ["E2", 75],
      ["C2", 76],
      ["G2", 77],
      ["C2", 78],
      ["E2", 79],

      ["C5", 64.5],
      ["E5", 65],
      ["G5", 65.5],
      ["C6", 66],
      ["E6", 66.5],
      ["C6", 67],
      ["G5", 67.5],
      ["F5", 68.5],
      ["A5", 69],
      ["C6", 69.5],
      ["F6", 70],
      ["A6", 70.5],
      ["F6", 71],
      ["C6", 71.5],
      ["E6", 72.5],
      ["C6", 73],
      ["G5", 73.5],
      ["E5", 74],
      ["C5", 74.5],
      ["G4", 75],
      ["C5", 76],
      ["D5", 76.5],
      ["E5", 77],
      ["G5", 77.5],
      ["C6", 78],
      ["E6", 78.5],
      ["G6", 79],

      // BRIDGE - Measures 41-56 (Key change feel, more chromatic)
      ["F2", 80],
      ["C3", 81],
      ["F2", 82],
      ["A2", 83],
      ["A#2", 84],
      ["F3", 85],
      ["A#2", 86],
      ["D3", 87],
      ["C2", 88],
      ["G2", 89],
      ["C2", 90],
      ["E2", 91],
      ["G2", 92],
      ["D3", 93],
      ["G2", 94],
      ["B2", 95],

      ["F4", 80.5],
      ["A4", 81],
      ["C5", 81.5],
      ["F5", 82],
      ["A5", 82.5],
      ["C6", 83],
      ["A5", 83.5],
      ["D5", 84.5],
      ["F5", 85],
      ["A#5", 85.5],
      ["D6", 86],
      ["F6", 86.5],
      ["D6", 87],
      ["A#5", 87.5],
      ["C5", 88.5],
      ["E5", 89],
      ["G5", 89.5],
      ["C6", 90],
      ["E6", 90.5],
      ["C6", 91],
      ["G5", 91.5],
      ["B4", 92.5],
      ["D5", 93],
      ["G5", 93.5],
      ["B5", 94],
      ["D6", 94.5],
      ["B5", 95],
      ["G5", 95.5],

      ["C2", 96],
      ["G2", 97],
      ["C2", 98],
      ["E2", 99],
      ["F2", 100],
      ["C3", 101],
      ["F2", 102],
      ["A2", 103],
      ["C2", 104],
      ["G2", 105],
      ["C2", 106],
      ["E2", 107],
      ["G2", 108],
      ["D3", 109],
      ["G2", 110],
      ["B2", 111],

      ["E5", 96],
      ["D5", 96.25],
      ["C5", 96.5],
      ["D5", 96.75],
      ["E5", 97],
      ["G5", 97.5],
      ["C6", 98],
      ["E6", 98.5],
      ["C6", 99],
      ["F5", 100],
      ["E5", 100.25],
      ["D5", 100.5],
      ["E5", 100.75],
      ["F5", 101],
      ["A5", 101.5],
      ["C6", 102],
      ["F6", 102.5],
      ["C6", 103],
      ["G5", 104],
      ["F5", 104.25],
      ["E5", 104.5],
      ["F5", 104.75],
      ["G5", 105],
      ["C6", 105.5],
      ["E6", 106],
      ["G6", 106.5],
      ["E6", 107],
      ["D6", 108],
      ["C6", 108.25],
      ["B5", 108.5],
      ["C6", 108.75],
      ["D6", 109],
      ["G6", 109.5],
      ["B6", 110],
      ["G6", 110.5],
      ["D6", 111],

      // FINALE - Measures 57-64 (Big ending with glissando feel)
      ["C2", 112],
      ["G2", 113],
      ["C2", 114],
      ["E2", 115],
      ["F2", 116],
      ["C3", 117],
      ["F2", 118],
      ["A2", 119],
      ["G2", 120],
      ["D3", 121],
      ["G2", 122],
      ["B2", 123],
      ["C2", 124],
      ["E2", 124],
      ["G2", 124],
      ["C3", 124],

      ["C5", 112],
      ["D5", 112.25],
      ["E5", 112.5],
      ["F5", 112.75],
      ["G5", 113],
      ["A5", 113.25],
      ["B5", 113.5],
      ["C6", 113.75],
      ["E6", 114],
      ["D6", 114.25],
      ["C6", 114.5],
      ["G5", 114.75],
      ["E5", 115],
      ["C5", 115.5],
      ["F5", 116],
      ["G5", 116.25],
      ["A5", 116.5],
      ["A#5", 116.75],
      ["C6", 117],
      ["D6", 117.25],
      ["E6", 117.5],
      ["F6", 117.75],
      ["A6", 118],
      ["G6", 118.25],
      ["F6", 118.5],
      ["C6", 118.75],
      ["A5", 119],
      ["F5", 119.5],
      ["G5", 120],
      ["A5", 120.25],
      ["B5", 120.5],
      ["C6", 120.75],
      ["D6", 121],
      ["E6", 121.25],
      ["F6", 121.5],
      ["G6", 121.75],
      ["B6", 122],
      ["A6", 122.25],
      ["G6", 122.5],
      ["F6", 122.75],
      ["E6", 123],
      ["D6", 123.5],
      // Final chord
      ["C3", 124],
      ["E3", 124],
      ["G3", 124],
      ["C4", 124],
      ["E4", 124],
      ["G4", 124],
      ["C5", 124],
      ["E5", 124],
      ["G5", 124],
      ["C6", 124],
    ],
  },
};

// Helper function to load a song
function loadSong(songKey) {
  notes = {};
  const song = SONGS[songKey];
  if (!song) {
    return;
  }

  song.notes.forEach(([noteName, beat]) => {
    const noteIndex = allNotes.indexOf(noteName);
    if (noteIndex !== -1) {
      // Store fractional beats for proper timing
      const key = `${noteIndex}-${beat}`;
      notes[key] = true;
    }
  });

  drawGrid();
}

// Stop button
document.getElementById("stopBtn").addEventListener("click", () => {
  isPlaying = false;
  playbackPosition = 0;

  // Stop the visual update interval
  if (playbackInterval) {
    clearInterval(playbackInterval);
    playbackInterval = null;
  }

  // Stop all active audio sources
  activeAudioSources.forEach((source) => {
    try {
      source.stop();
    } catch (e) {
      // Source may have already stopped naturally
    }
  });
  activeAudioSources = [];

  drawGrid();
});

// Load song button
document.getElementById("loadSongBtn").addEventListener("click", () => {
  const songSelect = document.getElementById("songSelect");
  const songKey = songSelect.value;
  if (songKey) {
    loadSong(songKey);
  }
});

// Initial draw
drawGrid();

// Load Honky Tonk by default on page load
window.addEventListener("DOMContentLoaded", () => {
  loadSong("honky-tonk");
  document.getElementById("songSelect").value = "honky-tonk";
});
