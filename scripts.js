// Global variables
const drumPads = document.querySelectorAll(".drum-pad")
const drumStatus = document.getElementById("drum-status")
const pianoStatus = document.getElementById("piano-status")
let isRecording = false
let recordingInstrument = null
let recordedNotes = []
let recordingStartTime = 0
const savedRecordings = []
let activeAudioContext = null

// Initialize audio context with user interaction to comply with browser autoplay policies
function initializeAudioContext() {
  if (!activeAudioContext) {
    try {
      activeAudioContext = new (window.AudioContext || window.webkitAudioContext)()
      console.log("Audio context initialized:", activeAudioContext.state)
    } catch (e) {
      console.error("Failed to create audio context:", e)
    }
  }

  // Resume context if it's suspended (browsers may suspend it until user interaction)
  if (activeAudioContext && activeAudioContext.state === "suspended") {
    activeAudioContext
      .resume()
      .then(() => {
        console.log("Audio context resumed:", activeAudioContext.state)
      })
      .catch((e) => {
        console.error("Failed to resume audio context:", e)
      })
  }

  return activeAudioContext
}

// Record note function
function recordNote(instrument, note, duration) {
  if (!isRecording) {
    console.log("Not recording, note ignored:", note)
    return
  }

  console.log(
    `Recording ${instrument} note: ${note}, duration: ${duration}, recording instrument: ${recordingInstrument}`,
  )

  // Make sure we're recording for the correct instrument
  if (recordingInstrument !== instrument) {
    console.log(`Note ignored: current recording instrument is ${recordingInstrument}, but note is for ${instrument}`)
    return
  }

  recordedNotes.push({
    instrument,
    note,
    time: Date.now() - recordingStartTime,
    duration,
  })

  console.log(`Recorded notes count: ${recordedNotes.length}`)
}

// Setup touch-based piano
function setupPianoTouchPad() {
  const touchPad = document.getElementById("piano-touch-pad")
  if (!touchPad) {
    console.error("Piano touch pad element not found")
    return
  }

  const statusDisplay = document.getElementById("piano-status")

  // Piano notes in a grid layout (4x5 grid = 20 notes)
  const noteGrid = [
    ["C3", "D3", "E3", "F3", "G3"],
    ["A3", "B3", "C4", "D4", "E4"],
    ["F4", "G4", "A4", "B4", "C5"],
    ["D5", "E5", "F5", "G5", "A5"],
  ]

  // Colors for the pads
  const padColors = [
    "#ff416c",
    "#ff4b2b",
    "#4776e6",
    "#8e54e9",
    "#2193b0",
    "#6dd5ed",
    "#11998e",
    "#38ef7d",
    "#f46b45",
    "#eea849",
    "#614385",
    "#516395",
    "#6a11cb",
    "#2575fc",
    "#009688",
    "#4CAF50",
    "#3F51B5",
    "#2196F3",
    "#9C27B0",
    "#E91E63",
  ]

  // Set initial dimensions
  const updateTouchPadDimensions = () => {
    touchPad.style.height = `${touchPad.offsetWidth * 0.5}px`
  }

  // Update on resize
  window.addEventListener("resize", updateTouchPadDimensions)
  updateTouchPadDimensions()

  // Initialize canvas
  const ctx = touchPad.getContext("2d")
  const activeNotes = new Set()

  // Draw the piano pad grid
  function drawPianoPad() {
    const width = touchPad.width
    const height = touchPad.height

    // Clear canvas
    ctx.clearRect(0, 0, width, height)

    // Draw background
    const gradient = ctx.createLinearGradient(0, 0, width, height)
    gradient.addColorStop(0, "#1a1a2e")
    gradient.addColorStop(1, "#16213e")
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, width, height)

    // Calculate pad dimensions
    const rows = noteGrid.length
    const cols = noteGrid[0].length
    const padWidth = width / cols
    const padHeight = height / rows
    const padding = 10

    // Draw pads
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const note = noteGrid[row][col]
        const x = col * padWidth
        const y = row * padHeight
        const colorIndex = row * cols + col

        // Draw pad background
        ctx.fillStyle = padColors[colorIndex]
        ctx.fillRect(x + padding, y + padding, padWidth - padding * 2, padHeight - padding * 2)

        // Add glossy effect
        const glossGradient = ctx.createLinearGradient(
          x + padding,
          y + padding,
          x + padWidth - padding * 2,
          y + padHeight - padding * 2,
        )
        glossGradient.addColorStop(0, "rgba(255, 255, 255, 0.2)")
        glossGradient.addColorStop(1, "rgba(255, 255, 255, 0)")
        ctx.fillStyle = glossGradient
        ctx.fillRect(x + padding, y + padding, padWidth - padding * 2, padHeight - padding * 2)

        // Draw note label
        ctx.fillStyle = "white"
        ctx.font = "bold 16px Arial"
        ctx.textAlign = "center"
        ctx.textBaseline = "middle"
        ctx.fillText(note, x + padWidth / 2, y + padHeight / 2)

        // Draw active state if needed
        if (activeNotes.has(note)) {
          ctx.strokeStyle = "white"
          ctx.lineWidth = 4
          ctx.strokeRect(x + padding + 4, y + padding + 4, padWidth - padding * 2 - 8, padHeight - padding * 2 - 8)
        }
      }
    }
  }

  // Play a note based on position
  function playNoteFromPosition(x, y) {
    const width = touchPad.width
    const height = touchPad.height

    const rows = noteGrid.length
    const cols = noteGrid[0].length
    const padWidth = width / cols
    const padHeight = height / rows

    // Determine which pad was clicked
    const col = Math.floor(x / padWidth)
    const row = Math.floor(y / padHeight)

    // Check if valid pad
    if (row >= 0 && row < rows && col >= 0 && col < cols) {
      const note = noteGrid[row][col]
      playPianoNote(note)
    }
  }

  // Play a piano note
  function playPianoNote(note) {
    const context = initializeAudioContext()

    // Add to active notes
    activeNotes.add(note)

    // Update status
    if (pianoStatus) {
      pianoStatus.textContent = `Playing: ${note}`
    }

    // Try to play using audio element
    const audio = document.getElementById(note)
    if (audio) {
      audio.currentTime = 0
      audio.play().catch((e) => {
        console.error(`Error playing piano note ${note}:`, e)
      })

      // Record the note if recording
      if (isRecording && recordingInstrument === "piano") {
        console.log("Attempting to record piano note:", note)
        recordNote("piano", note, 500)
      }

      // Remove from active notes after a delay
      setTimeout(() => {
        activeNotes.delete(note)
        drawPianoPad()
      }, 500)

      // Redraw to show active state
      drawPianoPad()
    } else {
      console.warn(`Audio element for ${note} not found`)
    }
  }

  // Handle mouse/touch events
  touchPad.addEventListener("pointerdown", (e) => {
    e.preventDefault()
    const rect = touchPad.getBoundingClientRect()
    const x = (e.clientX - rect.left) * (touchPad.width / rect.width)
    const y = (e.clientY - rect.top) * (touchPad.height / rect.height)

    playNoteFromPosition(x, y)
  })

  // Handle multi-touch
  touchPad.addEventListener("touchstart", (e) => {
    e.preventDefault() // Prevent default behavior like scrolling

    const rect = touchPad.getBoundingClientRect()

    // Handle multiple touch points
    for (let i = 0; i < e.touches.length; i++) {
      const touch = e.touches[i]
      const x = (touch.clientX - rect.left) * (touchPad.width / rect.width)
      const y = (touch.clientY - rect.top) * (touchPad.height / rect.height)

      playNoteFromPosition(x, y)
    }
  })

  // Set canvas dimensions and initial draw
  function resizeCanvas() {
    const devicePixelRatio = window.devicePixelRatio || 1
    const rect = touchPad.getBoundingClientRect()

    touchPad.width = rect.width * devicePixelRatio
    touchPad.height = rect.height * devicePixelRatio

    ctx.scale(devicePixelRatio, devicePixelRatio)

    drawPianoPad()
  }

  // Resize on load and window resize
  resizeCanvas()
  window.addEventListener("resize", resizeCanvas)
}

// Fix the drum key mapping to match the user's custom sounds
function setupDrumKit() {
  drumPads.forEach((pad) => {
    pad.addEventListener("click", function () {
      const context = initializeAudioContext()

      const note = this.getAttribute("data-note")
      const audio = document.getElementById(note)

      if (!audio) {
        console.warn(`Audio element for ${note} not found`)
        return
      }

      // Update status
      if (drumStatus) {
        drumStatus.textContent = `Playing: ${note.charAt(0).toUpperCase() + note.slice(1)}`
      }

      // Reset audio and play
      audio.currentTime = 0
      audio.play().catch((e) => {
        console.error(`Error playing drum ${note}:`, e)
      })

      // Visual feedback
      this.classList.add("active")
      setTimeout(() => {
        this.classList.remove("active")
      }, 150)

      // Record the note if recording
      if (isRecording && recordingInstrument === "drums") {
        console.log("Attempting to record drum note:", note)
        recordNote("drums", note, 150)
      }
    })
  })

  // Keyboard events for drums - ensure they match the data-key attributes
  window.addEventListener("keydown", (e) => {
    if (e.repeat) return // Prevent key repeat

    initializeAudioContext()

    const pad = document.querySelector(`.drum-pad[data-key="${e.keyCode}"]`)
    if (!pad) return

    const note = pad.getAttribute("data-note")
    const audio = document.getElementById(note)

    if (!audio) {
      console.warn(`Audio element for ${note} not found`)
      return
    }

    // Update status
    if (drumStatus) {
      drumStatus.textContent = `Playing: ${note.charAt(0).toUpperCase() + note.slice(1)}`
    }

    // Reset audio and play
    audio.currentTime = 0
    audio.play().catch((e) => {
      console.error(`Error playing drum ${note}:`, e)
    })

    // Visual feedback
    pad.classList.add("active")
    setTimeout(() => {
      pad.classList.remove("active")
    }, 150)

    // Record the note if recording
    if (isRecording && recordingInstrument === "drums") {
      recordNote("drums", note, 150)
    }
  })
}

// Fix the startRecording function to ensure it properly initializes recording
function startRecording(instrument) {
  console.log(`Starting recording for ${instrument}`)

  // Reset recording state
  isRecording = true
  recordingInstrument = instrument
  recordedNotes = []
  recordingStartTime = Date.now()

  console.log(`Recording state initialized: isRecording=${isRecording}, instrument=${recordingInstrument}`)

  // Update UI
  const recordBtn = document.getElementById(`record-${instrument}`)
  const stopBtn = document.getElementById(`stop-${instrument}`)
  const statusElement = document.getElementById(`${instrument}-status`)

  if (recordBtn) recordBtn.disabled = true
  if (stopBtn) stopBtn.disabled = false
  if (statusElement) {
    statusElement.textContent = "Recording..."
    statusElement.style.color = "#ff4b4b"
  }
}

// Fix the stopRecording function to properly handle the recording
function stopRecording() {
  if (!isRecording) {
    console.log("Stop recording called but not recording")
    return
  }

  console.log(`Stopping recording for ${recordingInstrument}`)
  console.log(`Recorded ${recordedNotes.length} notes`)

  // Save the current instrument before resetting
  const currentInstrument = recordingInstrument

  // Update recording state
  isRecording = false

  // Update UI
  const recordBtn = document.getElementById(`record-${currentInstrument}`)
  const stopBtn = document.getElementById(`stop-${currentInstrument}`)
  const statusElement = document.getElementById(`${currentInstrument}-status`)

  if (recordBtn) recordBtn.disabled = false
  if (stopBtn) stopBtn.disabled = true
  if (statusElement) {
    statusElement.textContent = "Recording stopped"
    statusElement.style.color = ""
  }

  // Save recording
  if (recordedNotes.length > 0) {
    const recordingDuration = Date.now() - recordingStartTime

    const newRecording = {
      instrument: currentInstrument,
      notes: [...recordedNotes],
      duration: recordingDuration,
      timestamp: new Date().toISOString(),
    }

    savedRecordings.push(newRecording)
    addRecordingToList(newRecording)
    console.log("Recording saved:", newRecording)
  } else {
    console.log("No notes were recorded")
    alert("No notes were recorded")
  }

  recordingInstrument = null
}

// Play recording
function playRecording(recording) {
  initializeAudioContext()

  if (!recording || !recording.notes || recording.notes.length === 0) {
    alert("No recording to play")
    return
  }

  // Update status
  const statusElement = document.getElementById(`${recording.instrument}-status`)
  if (statusElement) {
    statusElement.textContent = "Playing recording..."
  }

  console.log(`Playing back ${recording.notes.length} recorded notes...`)

  // Sort notes by time
  const sortedNotes = [...recording.notes].sort((a, b) => a.time - b.time)

  // Play each note at the correct time
  sortedNotes.forEach((note) => {
    setTimeout(() => {
      if (note.instrument === "drums") {
        const audio = document.getElementById(note.note)
        if (audio) {
          audio.currentTime = 0
          audio.play().catch((e) => {
            console.error(`Error playing recorded drum ${note.note}:`, e)
          })

          // Highlight the drum
          const drum = document.querySelector(`.drum-pad[data-note="${note.note}"]`)
          if (drum) {
            drum.classList.add("active")
            setTimeout(() => {
              drum.classList.remove("active")
            }, 150)
          }
        }
      } else if (note.instrument === "piano") {
        // Try to play using audio element first
        const audio = document.getElementById(note.note)
        if (audio) {
          audio.currentTime = 0
          audio.play().catch((e) => {
            console.error(`Error playing piano note ${note.note}:`, e)
          })
        }
      }
    }, note.time)
  })

  // Reset status after playback
  const lastNote = sortedNotes[sortedNotes.length - 1]
  setTimeout(() => {
    if (statusElement) {
      statusElement.textContent = "Playback complete"

      // Reset after a moment
      setTimeout(() => {
        statusElement.textContent = "Ready to play"
        statusElement.style.color = ""
      }, 2000)
    }
  }, lastNote.time + 1000)
}

// Update the downloadRecording function to trigger payment modal
function downloadRecording(recording) {
  // Show payment modal instead of direct download
  const paymentModal = document.getElementById("payment-modal")
  if (paymentModal) {
    // Set the current recording to be downloaded after payment
    window.currentRecordingToDownload = recording

    // Update payment modal with recording details
    const recordingTitle = document.querySelector("#payment-modal .modal-header h2")
    if (recordingTitle) {
      recordingTitle.textContent = `Download ${recording.instrument.charAt(0).toUpperCase() + recording.instrument.slice(1)} Recording`
    }

    // Show the modal
    paymentModal.style.display = "block"
  } else {
    console.error("Payment modal not found")
  }
}

// Function to handle direct download after payment
function processDownloadAfterPayment(recording) {
  // Convert recorded notes to a MIDI-like format or JSON for download
  const recordingData = JSON.stringify(recording, null, 2)
  const blob = new Blob([recordingData], { type: "application/json" })
  const url = URL.createObjectURL(blob)

  // Create download link
  const a = document.createElement("a")
  a.href = url
  a.download = `${recording.instrument}_recording_${new Date().toISOString().slice(0, 19).replace(/:/g, "-")}.json`
  a.click()

  // Clean up
  URL.revokeObjectURL(url)

  // Show success message
  alert("Thank you for your purchase! Your download has started.")
}

// Function to handle WAV download after payment
function processWavDownloadAfterPayment(recording) {
  if (recording.audioBlob) {
    // Create download link for WAV file
    const url = URL.createObjectURL(recording.audioBlob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${recording.instrument}_recording_${new Date().toISOString().slice(0, 19).replace(/:/g, "-")}.wav`
    a.click()

    // Clean up
    URL.revokeObjectURL(url)

    // Show success message
    alert("Thank you for your purchase! Your download has started.")
  } else {
    alert("Error: Audio data not available for this recording.")
  }
}

// Add recording to list
function addRecordingToList(recording) {
  const noRecordings = document.getElementById("no-recordings")
  const recordingsList = document.getElementById("recordings-list")

  if (noRecordings && recordingsList) {
    // Hide the "no recordings" message
    noRecordings.style.display = "none"

    // Show the recordings list
    recordingsList.style.display = "flex"

    // Create a new recording item
    const recordingItem = document.createElement("div")
    recordingItem.className = "recording-item"
    recordingItem.innerHTML = `
      <div class="recording-info">
        <h3>${recording.instrument.charAt(0).toUpperCase() + recording.instrument.slice(1)} Recording</h3>
        <p>${new Date(recording.timestamp).toLocaleString()}</p>
        <p>${recording.notes.length} notes, ${Math.round(recording.duration / 1000)} seconds</p>
      </div>
      <div class="recording-actions">
        <button class="btn btn-secondary play-recording">
          <i class="fas fa-play"></i> Play
        </button>
        <button class="btn btn-primary download-recording">
          <i class="fas fa-download"></i> Download
        </button>
        <button class="btn btn-danger delete-recording">
          <i class="fas fa-trash"></i>
        </button>
      </div>
    `

    // Add event listeners
    recordingItem.querySelector(".play-recording").addEventListener("click", () => {
      playRecording(recording)
    })

    recordingItem.querySelector(".download-recording").addEventListener("click", () => {
      // Direct download without payment for testing
      downloadRecording(recording)
    })

    recordingItem.querySelector(".delete-recording").addEventListener("click", () => {
      // Remove from saved recordings array
      const index = savedRecordings.findIndex((r) => r.timestamp === recording.timestamp)
      if (index !== -1) {
        savedRecordings.splice(index, 1)
      }

      // Remove from UI
      recordingItem.remove()

      // If no recordings left, show the "no recordings" message
      if (recordingsList.children.length === 0) {
        noRecordings.style.display = "flex"
        recordingsList.style.display = "none"
      }
    })

    // Add to the list
    recordingsList.appendChild(recordingItem)
  }
}

// Show mixing controls
function showMixingControls() {
  // Create modal if it doesn't exist
  let mixingModal = document.getElementById("mixing-modal")

  if (!mixingModal) {
    mixingModal = document.createElement("div")
    mixingModal.id = "mixing-modal"
    mixingModal.className = "modal"

    // Create modal content
    mixingModal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h2>Mix Settings</h2>
          <span class="close-modal">&times;</span>
        </div>
        <div class="modal-body">
          <div id="tracks-mixer-container"></div>
          <div class="master-controls">
            <h3>Master</h3>
            <div class="control-group">
              <label for="master-volume">Volume</label>
              <input type="range" id="master-volume" min="0" max="100" value="80">
              <span class="value-display">80%</span>
            </div>
            <div class="control-group">
              <label for="master-compression">Compression</label>
              <input type="range" id="master-compression" min="1" max="20" value="4">
              <span class="value-display">4:1</span>
            </div>
            <div class="control-group">
              <label for="master-reverb">Reverb</label>
              <input type="range" id="master-reverb" min="0" max="100" value="20">
              <span class="value-display">20%</span>
            </div>
          </div>
          <div class="modal-footer">
            <button id="start-mixing" class="btn btn-primary">Mix Tracks</button>
            <button id="cancel-mixing" class="btn btn-secondary">Cancel</button>
          </div>
        </div>
      </div>
    `

    document.body.appendChild(mixingModal)

    // Add event listeners
    document.querySelector(".close-modal").addEventListener("click", () => {
      mixingModal.style.display = "none"
    })

    document.getElementById("cancel-mixing").addEventListener("click", () => {
      mixingModal.style.display = "none"
    })

    document.getElementById("start-mixing").addEventListener("click", () => {
      enhancedMixTracks()
      mixingModal.style.display = "none"
    })

    // Update value displays for sliders
    const sliders = mixingModal.querySelectorAll("input[type='range']")
    sliders.forEach((slider) => {
      const valueDisplay = slider.nextElementSibling
      slider.addEventListener("input", () => {
        if (slider.id === "master-compression") {
          valueDisplay.textContent = `${slider.value}:1`
        } else {
          valueDisplay.textContent = `${slider.value}%`
        }
      })
    })
  }

  // Populate tracks in the mixer
  enhancedPopulateTrackMixer()

  // Show the modal
  mixingModal.style.display = "block"
}

// Populate track mixer
function enhancedPopulateTrackMixer() {
  const tracksContainer = document.getElementById("tracks-mixer-container")
  tracksContainer.innerHTML = ""

  if (savedRecordings.length === 0) {
    tracksContainer.innerHTML = "<p>No recordings available to mix.</p>"
    return
  }

  // Add global beat settings
  const beatSettings = document.createElement("div")
  beatSettings.className = "beat-settings"
  beatSettings.innerHTML = `
    <h3>Beat Settings</h3>
    <div class="control-group">
      <label for="tempo">Tempo (BPM)</label>
      <input type="number" id="tempo" value="120" min="60" max="200">
    </div>
    <div class="control-group">
      <label for="add-backing-beat">
        <input type="checkbox" id="add-backing-beat" checked>
        Add Backing Beat
      </label>
    </div>
    <div class="control-group">
      <label for="beat-pattern">Beat Pattern</label>
      <select id="beat-pattern">
        <option value="basic">Basic</option>
        <option value="hiphop">Hip Hop</option>
        <option value="electronic">Electronic</option>
        <option value="afrobeat">Afrobeat</option>
      </select>
    </div>
    <div class="control-group">
      <label for="add-variations">
        <input type="checkbox" id="add-variations" checked>
        Add Human Feel (Variations)
      </label>
    </div>
    <div class="control-group">
      <label for="special-effects">Special Effects</label>
      <input type="range" id="special-effects" min="0" max="100" value="20">
      <span class="value-display">20%</span>
    </div>
  `
  tracksContainer.appendChild(beatSettings)

  // Add individual track controls
  savedRecordings.forEach((recording, index) => {
    if (recording.instrument === "mixed") return // Skip already mixed tracks

    const trackControl = document.createElement("div")
    trackControl.className = "track-control"
    trackControl.innerHTML = `
      <h3>${recording.instrument.charAt(0).toUpperCase() + recording.instrument.slice(1)}</h3>
      <div class="control-group">
        <label for="track-${index}-quantize">
          <input type="checkbox" id="track-${index}-quantize" checked>
          Quantize to Beat
        </label>
      </div>
      <div class="control-group">
        <label for="track-${index}-volume">Volume</label>
        <input type="range" id="track-${index}-volume" data-track="${index}" class="track-volume" min="0" max="100" value="80">
        <span class="value-display">80%</span>
      </div>
      <div class="control-group">
        <label for="track-${index}-pan">Pan</label>
        <input type="range" id="track-${index}-pan" data-track="${index}" class="track-pan" min="-100" max="100" value="0">
        <span class="value-display">Center</span>
      </div>
      <div class="control-group">
        <label for="track-${index}-eq-low">EQ Low</label>
        <input type="range" id="track-${index}-eq-low" data-track="${index}" class="track-eq-low" min="-12" max="12" value="0">
        <span class="value-display">0 dB</span>
      </div>
      <div class="control-group">
        <label for="track-${index}-eq-mid">EQ Mid</label>
        <input type="range" id="track-${index}-eq-mid" data-track="${index}" class="track-eq-mid" min="-12" max="12" value="0">
        <span class="value-display">0 dB</span>
      </div>
      <div class="control-group">
        <label for="track-${index}-eq-high">EQ High</label>
        <input type="range" id="track-${index}-eq-high" data-track="${index}" class="track-eq-high" min="-12" max="12" value="0">
        <span class="value-display">0 dB</span>
      </div>
    `

    tracksContainer.appendChild(trackControl)

    // Update value displays for pan
    const panSlider = trackControl.querySelector(".track-pan")
    const panDisplay = panSlider.nextElementSibling
    panSlider.addEventListener("input", () => {
      const value = Number.parseInt(panSlider.value)
      if (value === 0) {
        panDisplay.textContent = "Center"
      } else if (value < 0) {
        panDisplay.textContent = `${Math.abs(value)}% L`
      } else {
        panDisplay.textContent = `${value}% R`
      }
    })

    // Update value displays for EQ
    const eqSliders = trackControl.querySelectorAll(".track-eq-low, .track-eq-mid, .track-eq-high")
    eqSliders.forEach((slider) => {
      const valueDisplay = slider.nextElementSibling
      slider.addEventListener("input", () => {
        valueDisplay.textContent = `${slider.value} dB`
      })
    })

    // Update value displays for volume
    const volumeSlider = trackControl.querySelector(".track-volume")
    const volumeDisplay = volumeSlider.nextElementSibling
    volumeSlider.addEventListener("input", () => {
      volumeDisplay.textContent = `${volumeSlider.value}%`
    })
  })
}

// Mix tracks (This function is already in enhanced-mix-tracks.js, but included here for completeness if that file is removed)
async function enhancedMixTracks() {
  const mixAllBtn = document.getElementById("mix-all")

  // Show loading state
  mixAllBtn.disabled = true
  mixAllBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Mixing...'

  try {
    // Initialize audio context if not already done
    const context = initializeAudioContext()

    // Get BPM value
    const bpmInput = document.getElementById("tempo")
    const bpm = bpmInput ? Number.parseInt(bpmInput.value) : 120

    // Get all recordings and their settings
    const recordings = []
    let maxDuration = 0 // Track the maximum duration for dynamic context length

    // First, collect all recordings with their settings
    savedRecordings.forEach((recording, index) => {
      if (recording.instrument === "mixed") return // Skip already mixed tracks

      // Get the track settings
      const volumeSlider = document.getElementById(`track-${index}-volume`)
      const panSlider = document.getElementById(`track-${index}-pan`)
      const eqLowSlider = document.getElementById(`track-${index}-eq-low`)
      const eqMidSlider = document.getElementById(`track-${index}-eq-mid`)
      const eqHighSlider = document.getElementById(`track-${index}-eq-high`)
      const quantizeCheckbox = document.getElementById(`track-${index}-quantize`)

      if (volumeSlider && panSlider && eqLowSlider && eqMidSlider && eqHighSlider) {
        // Quantize notes if the checkbox is checked
        let processedNotes = [...recording.notes]

        if (quantizeCheckbox && quantizeCheckbox.checked) {
          processedNotes = quantizeNotes(processedNotes, bpm)
        }

        // Calculate the max duration for this recording
        if (processedNotes.length > 0) {
          const lastNote = processedNotes.reduce((latest, note) => {
            return note.time > latest.time ? note : latest
          }, processedNotes[0])

          const trackDuration = lastNote.time + (lastNote.duration || 500) // Add duration or default 500ms
          maxDuration = Math.max(maxDuration, trackDuration)
        }

        recordings.push({
          ...recording,
          notes: processedNotes,
          settings: {
            volume: Number.parseInt(volumeSlider.value) / 100,
            pan: Number.parseInt(panSlider.value) / 100,
            eqLow: Number.parseInt(eqLowSlider.value),
            eqMid: Number.parseInt(eqMidSlider.value),
            eqHigh: Number.parseInt(eqHighSlider.value),
          },
        })
      }
    })

    // Add some padding to the max duration (5 seconds)
    maxDuration += 5000

    // Ensure we have at least 10 seconds of audio
    maxDuration = Math.max(maxDuration, 10000)

    // Calculate the sample count for the offline context (convert ms to samples)
    const sampleRate = 44100
    const sampleCount = Math.ceil((maxDuration / 1000) * sampleRate)

    // Create an offline audio context with dynamic length
    const offlineContext = new OfflineAudioContext(2, sampleCount, sampleRate)

    // Check if we should add a backing beat
    const addBackingBeatCheckbox = document.getElementById("add-backing-beat")
    if (addBackingBeatCheckbox && addBackingBeatCheckbox.checked && recordings.length > 0) {
      // Get the selected beat pattern
      const beatPatternSelect = document.getElementById("beat-pattern")
      const pattern = beatPatternSelect ? beatPatternSelect.value : "basic"

      // Analyze existing recordings to adapt the backing beat
      const beatInfo = analyzeRecordingsForBeat(recordings, bpm)

      // Create a beat pattern based on the selection and analysis
      const backingBeat = createAdaptiveBackingBeat(beatInfo, pattern, bpm, maxDuration)

      // Add variations if enabled
      const addVariationsCheckbox = document.getElementById("add-variations")
      let processedBeat = backingBeat

      if (addVariationsCheckbox && addVariationsCheckbox.checked) {
        processedBeat = addBeatVariations(processedBeat, bpm)
      }

      recordings.push({
        instrument: "drums",
        notes: processedBeat,
        settings: {
          volume: 0.6, // Lower volume for the backing beat
          pan: 0,
          eqLow: 2,
          eqMid: 0,
          eqHigh: 1,
        },
      })
    }

    if (recordings.length === 0) {
      throw new Error("No valid recordings found to mix")
    }

    // Get master settings
    const masterVolume = Number.parseInt(document.getElementById("master-volume").value) / 100
    const masterCompression = Number.parseInt(document.getElementById("master-compression").value)
    const masterReverb = Number.parseInt(document.getElementById("master-reverb").value) / 100
    const specialEffectsAmount = Number.parseInt(document.getElementById("special-effects").value) / 100

    // Create master effects chain
    const masterGain = offlineContext.createGain()
    masterGain.gain.value = masterVolume

    // Create compressor
    const compressor = offlineContext.createDynamicsCompressor()
    compressor.threshold.value = -24
    compressor.knee.value = 30
    compressor.ratio.value = masterCompression
    compressor.attack.value = 0.003
    compressor.release.value = 0.25

    // Create reverb (convolution)
    const convolver = offlineContext.createConvolver()

    // Generate impulse response for reverb
    const impulseLength = 2 * offlineContext.sampleRate // 2 seconds
    const impulse = offlineContext.createBuffer(2, impulseLength, offlineContext.sampleRate)

    // Fill the buffer with noise and create reverb effect
    for (let channel = 0; channel < 2; channel++) {
      const impulseData = impulse.getChannelData(channel)
      for (let i = 0; i < impulseLength; i++) {
        impulseData[i] = (Math.random() * 2 - 1) * Math.exp(-i / (impulseLength * 0.3))
      }
    }

    convolver.buffer = impulse

    // Create reverb gain to control amount
    const reverbGain = offlineContext.createGain()
    reverbGain.gain.value = masterReverb

    // Create dry gain (signal without reverb)
    const dryGain = offlineContext.createGain()
    dryGain.gain.value = 1 - masterReverb

    // Connect master effects chain
    masterGain.connect(compressor)
    compressor.connect(dryGain)
    dryGain.connect(offlineContext.destination)

    compressor.connect(convolver)
    convolver.connect(reverbGain)
    reverbGain.connect(offlineContext.destination)

    // Add special effects if enabled
    const specialEffects = addSpecialEffectsToMix(offlineContext, offlineContext.destination, specialEffectsAmount)

    // Process each recording
    for (const recording of recordings) {
      // Get the notes from the recording
      const notes = recording.notes.sort((a, b) => a.time - b.time)

      // For each note, create a buffer source
      for (const note of notes) {
        // Get the audio element for this note
        const audioElement = document.getElementById(note.note)

        if (audioElement) {
          try {
            // Create a buffer source for this note
            const source = offlineContext.createBufferSource()

            // Fetch the audio data
            const response = await fetch(audioElement.src)
            const arrayBuffer = await response.arrayBuffer()
            const audioBuffer = await offlineContext.decodeAudioData(arrayBuffer)

            // Create track-specific effects chain
            const trackGain = offlineContext.createGain()
            // Apply velocity if available, otherwise use track volume
            const velocity = note.velocity || 1.0
            trackGain.gain.value = recording.settings.volume * velocity

            // Create panner
            const panner = offlineContext.createStereoPanner()
            panner.pan.value = recording.settings.pan

            // Create 3-band EQ (low, mid, high)
            const lowEQ = offlineContext.createBiquadFilter()
            lowEQ.type = "lowshelf"
            lowEQ.frequency.value = 320
            lowEQ.gain.value = recording.settings.eqLow

            const midEQ = offlineContext.createBiquadFilter()
            midEQ.type = "peaking"
            midEQ.frequency.value = 1000
            midEQ.Q.value = 1
            midEQ.gain.value = recording.settings.eqMid

            const highEQ = offlineContext.createBiquadFilter()
            highEQ.type = "highshelf"
            highEQ.frequency.value = 3200
            highEQ.gain.value = recording.settings.eqHigh

            // Connect track effects chain
            source.connect(lowEQ)
            lowEQ.connect(midEQ)
            midEQ.connect(highEQ)
            highEQ.connect(panner)
            panner.connect(trackGain)
            trackGain.connect(masterGain)

            // Apply special effects if enabled
            if (specialEffectsAmount > 0) {
              specialEffects.applyEffects(source, specialEffectsAmount)
            }

            // Set the buffer and schedule the note to play
            source.buffer = audioBuffer
            source.start(note.time / 1000) // Convert ms to seconds
          } catch (error) {
            console.error(`Error processing audio for note ${note.note}:`, error)
          }
        }
      }
    }

    // Render the audio
    const renderedBuffer = await offlineContext.startRendering()

    // Convert the rendered buffer to a WAV file
    const mixedAudioBlob = bufferToWave(renderedBuffer, renderedBuffer.length)

    // Create an audio element to preview the mix
    const audioPreview = document.createElement("audio")
    audioPreview.controls = true
    audioPreview.src = URL.createObjectURL(mixedAudioBlob)

    // Add the mixed track to the recordings list
    const mixedRecording = {
      instrument: "mixed",
      notes: [],
      duration: renderedBuffer.duration * 1000,
      timestamp: new Date().toISOString(),
      audioBlob: mixedAudioBlob,
    }

    // Store the mixed recording
    savedRecordings.push(mixedRecording)

    // Add to recordings list
    addRecordingToList(mixedRecording)

    // Show success message with preview
    const previewContainer = document.createElement("div")
    previewContainer.className = "mix-preview-container"
    previewContainer.innerHTML = `
      <h3>Mix Preview</h3>
      <p>Your mix is ready! You can preview it below or find it in your recordings list.</p>
    `
    previewContainer.appendChild(audioPreview)

    // Create modal for preview
    const previewModal = document.createElement("div")
    previewModal.className = "modal"
    previewModal.style.display = "block"

    const modalContent = document.createElement("div")
    modalContent.className = "modal-content"

    const modalHeader = document.createElement("div")
    modalHeader.className = "modal-header"
    modalHeader.innerHTML = `
      <h2>Mix Complete</h2>
      <span class="close-preview-modal">&times;</span>
    `

    const modalBody = document.createElement("div")
    modalBody.className = "modal-body"
    modalBody.appendChild(previewContainer)

    modalContent.appendChild(modalHeader)
    modalContent.appendChild(modalBody)
    previewModal.appendChild(modalContent)

    document.body.appendChild(previewModal)

    // Add event listener to close button
    document.querySelector(".close-preview-modal").addEventListener("click", () => {
      previewModal.remove()
    })
  } catch (error) {
    console.error("Error mixing tracks:", error)
    alert("There was an error mixing the tracks: " + error.message)
  } finally {
    // Reset button state
    mixAllBtn.disabled = false
    mixAllBtn.innerHTML = '<i class="fas fa-layer-group"></i> Mix All Tracks'
  }
}


// Convert audio buffer to WAV format
function bufferToWave(abuffer, len) {
  const numOfChan = abuffer.numberOfChannels
  const length = len * numOfChan * 2 + 44
  const buffer = new ArrayBuffer(length)
  const view = new DataView(buffer)
  const offset = 0
  let pos = 0

  // Write WAVE header
  setUint32(0x46464952) // "RIFF"
  setUint32(length - 8) // file length - 8
  setUint32(0x45564157) // "WAVE"

  setUint32(0x20746d66) // "fmt " chunk
  setUint32(16) // length = 16
  setUint16(1) // PCM (uncompressed)
  setUint16(numOfChan)
  setUint32(abuffer.sampleRate)
  setUint32(abuffer.sampleRate * 2 * numOfChan) // avg. bytes/sec
  setUint16(numOfChan * 2) // block-align
  setUint16(16) // 16-bit

  setUint32(0x61746164) // "data" chunk
  setUint32(length - pos - 4) // chunk length

  // Write interleaved data
  for (let i = 0; i < abuffer.numberOfChannels; i++) {
    const channel = abuffer.getChannelData(i)
    for (let j = 0; j < len; j++) {
      // Clamp the value to the 16-bit range
      const sample = Math.max(-1, Math.min(1, channel[j]))
      const value = sample < 0 ? sample * 0x8000 : sample * 0x7fff
      setInt16(value)
    }
  }

  // Helper functions
  function setUint16(data) {
    view.setUint16(pos, data, true)
    pos += 2
  }

  function setUint32(data) {
    view.setUint32(pos, data, true)
    pos += 4
  }

  function setInt16(data) {
    view.setInt16(pos, data, true)
    pos += 2
  }

  return new Blob([buffer], { type: "audio/wav" })
}

// Initialize everything when the DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  // Initialize audio context with a user gesture
  document.body.addEventListener(
    "click",
    () => {
      initializeAudioContext()
    },
    { once: true },
  )

  // Setup drum kit
  setupDrumKit()

  // Setup piano pad
  setupPianoTouchPad()

  // Setup recording controls - FIXED: This is the critical part that was broken
  const recordButtons = document.querySelectorAll(".record-btn")
  const stopButtons = document.querySelectorAll(".stop-btn")

  console.log("Found record buttons:", recordButtons.length)
  console.log("Found stop buttons:", stopButtons.length)

  // Log all record buttons for debugging
  recordButtons.forEach((btn, index) => {
    const instrument = btn.getAttribute("data-instrument")
    const id = btn.id
    console.log(`Record button ${index}: id=${id}, instrument=${instrument}`)
  })

  recordButtons.forEach((btn) => {
    const instrument = btn.getAttribute("data-instrument")
    if (!instrument) {
      console.error("Record button missing data-instrument attribute:", btn)
      return
    }

    console.log(`Setting up record button for ${instrument}`)

    btn.addEventListener("click", () => {
      console.log(`Record button clicked for ${instrument}`)
      startRecording(instrument)
    })
  })

  stopButtons.forEach((btn) => {
    const instrument = btn.getAttribute("data-instrument")
    if (!instrument) {
      console.error("Stop button missing data-instrument attribute:", btn)
      return
    }

    console.log(`Setting up stop button for ${instrument}`)

    btn.addEventListener("click", () => {
      console.log(`Stop button clicked for ${instrument}`)
      stopRecording()
    })
  })

  // Setup mix all button
  const mixAllBtn = document.getElementById("mix-all")
  if (mixAllBtn) {
    mixAllBtn.addEventListener("click", async () => {
      const recordingsList = document.getElementById("recordings-list")
      if (!recordingsList || recordingsList.children.length === 0) {
        alert("No recordings to mix. Create some recordings first!")
        return
      }

      // Show mixing controls modal
      showMixingControls()
    })
  }

  // Setup clear recordings button
  const clearRecordingsBtn = document.getElementById("clear-recordings")
  if (clearRecordingsBtn) {
    clearRecordingsBtn.addEventListener("click", () => {
      if (savedRecordings.length === 0) {
        alert("No recordings to clear.")
        return
      }

      if (confirm("Are you sure you want to clear all recordings?")) {
        savedRecordings.length = 0
        const recordingsList = document.getElementById("recordings-list")
        const noRecordings = document.getElementById("no-recordings")

        if (recordingsList && noRecordings) {
          recordingsList.innerHTML = ""
          recordingsList.style.display = "none"
          noRecordings.style.display = "flex"
        }
      }
    })
  }

  // Setup mobile menu toggle
  const mobileMenu = document.getElementById("mobile-menu")
  const navMenu = document.querySelector(".nav-menu")

  if (mobileMenu && navMenu) {
    mobileMenu.addEventListener("click", () => {
      navMenu.classList.toggle("active")
    })
  }

  // Setup tutorial tabs
  const tabButtons = document.querySelectorAll(".tab-btn")
  tabButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      // Remove active class from all tabs
      document.querySelectorAll(".tutorial-grid").forEach((grid) => {
        grid.classList.remove("active")
      })

      // Add active class to selected tab
      const tabId = btn.getAttribute("data-tab")
      document.getElementById(tabId).classList.add("active")

      // Update button active state
      tabButtons.forEach((b) => b.classList.remove("active"))
      btn.classList.add("active")
    })
  })

  console.log("Interactive Music Studio initialized successfully!")
})

// Add these new functions for beat creation and quantization

// Quantize notes to a beat grid
function quantizeNotes(notes, bpm = 120) {
  // Calculate time between beats in milliseconds
  const beatTime = 60000 / bpm
  const sixteenthNote = beatTime / 4

  return notes.map((note) => {
    // Find the closest sixteenth note grid position
    const quantizedTime = Math.round(note.time / sixteenthNote) * sixteenthNote

    return {
      ...note,
      time: quantizedTime,
      quantized: true,
    }
  })
}

// Function to add variations (human feel) to a beat
function addBeatVariations(beatNotes, bpm) {
  const sixteenthNoteTime = (60000 / bpm) / 4; // Duration of a sixteenth note in ms

  return beatNotes.map(note => {
    let newTime = note.time;
    let newVelocity = note.velocity || 1.0;

    // Randomize timing slightly (swing/humanize)
    // Shift by up to +/- 1/32nd note
    const timingJitter = (Math.random() * 2 - 1) * (sixteenthNoteTime / 2);
    newTime = Math.max(0, note.time + timingJitter);

    // Randomize velocity slightly
    const velocityJitter = (Math.random() * 2 - 1) * 0.1; // +/- 10%
    newVelocity = Math.max(0.2, Math.min(1.0, newVelocity + velocityJitter));

    return {
      ...note,
      time: newTime,
      velocity: newVelocity
    };
  });
}


// New function to analyze recordings for beat information
function analyzeRecordingsForBeat(recordings, bpm) {
  // Default beat info
  const beatInfo = {
    hasDrums: false,
    hasPiano: false,
    dominantInstrument: "none",
    density: "medium", // low, medium, high
    duration: 0,
    measures: 4, // Default to 4 measures
    beatDensity: {
      kick: 0,
      snare: 0,
      hihat: 0,
    },
  }

  // Count notes by instrument type
  let drumNoteCount = 0
  let pianoNoteCount = 0
  let totalNotes = 0
  let maxTime = 0

  // Analyze each recording
  recordings.forEach((recording) => {
    if (recording.notes.length === 0) return

    // Check instrument type
    if (recording.instrument === "drums") {
      beatInfo.hasDrums = true
      drumNoteCount += recording.notes.length

      // Count specific drum types
      recording.notes.forEach((note) => {
        if (note.note === "kick") beatInfo.beatDensity.kick++
        else if (note.note === "snare") beatInfo.beatDensity.snare++
        else if (note.note.includes("hihat")) beatInfo.beatDensity.hihat++

        // Track max time
        maxTime = Math.max(maxTime, note.time)
      })
    } else if (recording.instrument === "piano") {
      beatInfo.hasPiano = true
      pianoNoteCount += recording.notes.length
    }

    totalNotes += recording.notes.length
  })

  // Determine dominant instrument
  if (drumNoteCount > pianoNoteCount) {
    beatInfo.dominantInstrument = "drums"
  } else if (pianoNoteCount > drumNoteCount) {
    beatInfo.dominantInstrument = "piano"
  } else {
    beatInfo.dominantInstrument = "balanced"
  }

  // Calculate duration in beats
  const beatTime = 60000 / bpm // ms per beat
  const durationInBeats = maxTime / beatTime

  // Calculate measures (round up to nearest 4)
  beatInfo.measures = Math.max(4, Math.ceil(durationInBeats / 4) * 4)
  beatInfo.duration = beatInfo.measures * 4 * beatTime

  // Determine density based on notes per beat
  const notesPerBeat = totalNotes / durationInBeats
  if (notesPerBeat < 1) {
    beatInfo.density = "low"
  } else if (notesPerBeat > 3) {
    beatInfo.density = "high"
  } else {
    beatInfo.density = "medium"
  }

  return beatInfo
}

// New function to create an adaptive backing beat
function createAdaptiveBackingBeat(beatInfo, pattern, bpm, maxDuration) {
  const beatTime = 60000 / bpm
  let notes = []

  // If there are already drums, make the backing beat more subtle
  const intensity = beatInfo.hasDrums ? "subtle" : "normal"

  // Determine the number of measures to create
  // Make sure we cover the entire duration of the recordings
  const measuresToCreate = Math.max(4, Math.ceil(maxDuration / (beatTime * 4)))

  // Create the appropriate pattern based on the selection
  switch (pattern) {
    case "basic":
      notes = createBasicBeatPattern(beatTime, measuresToCreate, intensity)
      break
    case "hiphop":
      notes = createHipHopBeatPattern(beatTime, measuresToCreate, intensity)
      break
    case "electronic":
      notes = createElectronicBeatPattern(beatTime, measuresToCreate, intensity)
      break
    case "afrobeat":
      notes = createAfrobeatPattern(beatTime, measuresToCreate, intensity)
      break
    default:
      notes = createBasicBeatPattern(beatTime, measuresToCreate, intensity)
  }

  // If we already have drums, reduce the volume of the backing beat
  if (beatInfo.hasDrums) {
    notes = notes.map((note) => ({
      ...note,
      velocity: (note.velocity || 1) * 0.6, // Reduce velocity by 40%
    }))
  }

  // If the dominant instrument is piano, emphasize the rhythm more
  if (beatInfo.dominantInstrument === "piano") {
    // Add more emphasis to the beat
    notes = notes.map((note) => {
      if (note.note === "kick" || note.note === "snare") {
        return {
          ...note,
          velocity: (note.velocity || 1) * 1.2, // Increase velocity by 20%
        }
      }
      return note
    })
  }

  return notes
}

// Updated beat pattern functions with measures and intensity parameters

// Basic beat pattern
function createBasicBeatPattern(beatTime, measures = 4, intensity = "normal") {
  const notes = []
  const velocityMultiplier = intensity === "subtle" ? 0.7 : 1

  // Create the specified number of measures
  for (let measure = 0; measure < measures; measure++) {
    const measureStart = measure * beatTime * 4

    // Add kicks (beats 1 and 3)
    notes.push({
      instrument: "drums",
      note: "kick",
      time: measureStart,
      duration: 150,
      velocity: 0.8 * velocityMultiplier,
    })

    notes.push({
      instrument: "drums",
      note: "kick",
      time: measureStart + beatTime * 2,
      duration: 150,
      velocity: 0.8 * velocityMultiplier,
    })

    // Add snares (beats 2 and 4)
    notes.push({
      instrument: "drums",
      note: "snare",
      time: measureStart + beatTime,
      duration: 150,
      velocity: 0.7 * velocityMultiplier,
    })

    notes.push({
      instrument: "drums",
      note: "snare",
      time: measureStart + beatTime * 3,
      duration: 150,
      velocity: 0.7 * velocityMultiplier,
    })

    // Add hi-hats (every 8th note)
    for (let i = 0; i < 8; i++) {
      notes.push({
        instrument: "drums",
        note: "hihat-closed",
        time: measureStart + (beatTime / 2) * i,
        duration: 100,
        velocity: 0.6 * velocityMultiplier,
      })
    }
  }

  return notes
}

// Hip-hop beat pattern
function createHipHopBeatPattern(beatTime, measures = 4, intensity = "normal") {
  const notes = []
  const velocityMultiplier = intensity === "subtle" ? 0.7 : 1

  // Create the specified number of measures
  for (let measure = 0; measure < measures; measure++) {
    const measureStart = measure * beatTime * 4

    // Kicks (more syncopated)
    notes.push({
      instrument: "drums",
      note: "kick",
      time: measureStart,
      duration: 150,
      velocity: 0.9 * velocityMultiplier,
    })

    notes.push({
      instrument: "drums",
      note: "kick",
      time: measureStart + beatTime * 2.5,
      duration: 150,
      velocity: 0.8 * velocityMultiplier,
    })

    if (measure % 2 === 1) {
      notes.push({
        instrument: "drums",
        note: "kick",
        time: measureStart + beatTime * 1.5,
        duration: 150,
        velocity: 0.7 * velocityMultiplier,
      })
    }

    // Snares (beats 2 and 4)
    notes.push({
      instrument: "drums",
      note: "snare",
      time: measureStart + beatTime,
      duration: 150,
      velocity: 0.8 * velocityMultiplier,
    })

    notes.push({
      instrument: "drums",
      note: "snare",
      time: measureStart + beatTime * 3,
      duration: 150,
      velocity: 0.8 * velocityMultiplier,
    })

    // Hi-hats (16th notes)
    for (let i = 0; i < 16; i++) {
      const velocity = i % 4 === 0 ? 0.7 : 0.5
      notes.push({
        instrument: "drums",
        note: "hihat-closed",
        time: measureStart + (beatTime / 4) * i,
        duration: 80,
        velocity: velocity * velocityMultiplier,
      })
    }

    // Occasional crash
    if (measure === 0 || measure % 8 === 0) {
      notes.push({
        instrument: "drums",
        note: "crash",
        time: measureStart,
        duration: 300,
        velocity: 0.6 * velocityMultiplier,
      })
    }
  }

  return notes
}

// Electronic beat pattern
function createElectronicBeatPattern(beatTime, measures = 4, intensity = "normal") {
  const notes = []
  const velocityMultiplier = intensity === "subtle" ? 0.7 : 1

  // Create the specified number of measures
  for (let measure = 0; measure < measures; measure++) {
    const measureStart = measure * beatTime * 4

    // Four-on-the-floor kick pattern
    for (let i = 0; i < 4; i++) {
      notes.push({
        instrument: "drums",
        note: "kick",
        time: measureStart + beatTime * i,
        duration: 150,
        velocity: 0.9 * velocityMultiplier,
      })
    }

    // Snares or claps on 2 and 4
    notes.push({
      instrument: "drums",
      note: "snare",
      time: measureStart + beatTime,
      duration: 150,
      velocity: 0.7 * velocityMultiplier,
    })

    notes.push({
      instrument: "drums",
      note: "snare",
      time: measureStart + beatTime * 3,
      duration: 150,
      velocity: 0.7 * velocityMultiplier,
    })

    // Hi-hats (16th notes with accent pattern)
    for (let i = 0; i < 16; i++) {
      // Create an accent pattern
      let velocity = 0.5
      if (i % 4 === 0) velocity = 0.8
      else if (i % 2 === 0) velocity = 0.6

      notes.push({
        instrument: "drums",
        note: "hihat-closed",
        time: measureStart + (beatTime / 4) * i,
        duration: 60,
        velocity: velocity * velocityMultiplier,
      })
    }

    // Open hi-hat on offbeats
    for (let i = 1; i < 8; i += 2) {
      notes.push({
        instrument: "drums",
        note: "hihat-open",
        time: measureStart + (beatTime / 2) * i,
        duration: 120,
        velocity: 0.5 * velocityMultiplier,
      })
    }
  }

  return notes
}

// Afrobeat pattern
function createAfrobeatPattern(beatTime, measures = 4, intensity = "normal") {
  const notes = []
  const velocityMultiplier = intensity === "subtle" ? 0.7 : 1

  // Create the specified number of measures
  for (let measure = 0; measure < measures; measure++) {
    const measureStart = measure * beatTime * 4

    // Kick pattern (1, 2+, 4)
    notes.push({
      instrument: "drums",
      note: "kick",
      time: measureStart,
      duration: 150,
      velocity: 0.9 * velocityMultiplier,
    })

    notes.push({
      instrument: "drums",
      note: "kick",
      time: measureStart + beatTime * 1.5,
      duration: 150,
      velocity: 0.8 * velocityMultiplier,
    })

    notes.push({
      instrument: "drums",
      note: "kick",
      time: measureStart + beatTime * 3,
      duration: 150,
      velocity: 0.85 * velocityMultiplier,
    })

    // Snare pattern (2, 4)
    notes.push({
      instrument: "drums",
      note: "snare",
      time: measureStart + beatTime,
      duration: 150,
      velocity: 0.8 * velocityMultiplier,
    })

    notes.push({
      instrument: "drums",
      note: "snare",
      time: measureStart + beatTime * 3,
      duration: 150,
      velocity: 0.8 * velocityMultiplier,
    })

    // Hi-hat pattern (8th notes with accents)
    for (let i = 0; i < 8; i++) {
      const velocity = i % 2 === 0 ? 0.7 : 0.5
      notes.push({
        instrument: "drums",
        note: "hihat-closed",
        time: measureStart + (beatTime / 2) * i,
        duration: 100,
        velocity: velocity * velocityMultiplier,
      })
    }

    // Tom fills in the last measure of each 4-measure phrase
    if (measure % 4 === 3) {
      notes.push({
        instrument: "drums",
        note: "tom1",
        time: measureStart + beatTime * 2,
        duration: 150,
        velocity: 0.7 * velocityMultiplier,
      })

      notes.push({
        instrument: "drums",
        note: "tom1",
        time: measureStart + beatTime * 2.5,
        duration: 150,
        velocity: 0.75 * velocityMultiplier,
      })

      notes.push({
        instrument: "drums",
        note: "tom2",
        time: measureStart + beatTime * 2.75,
        duration: 150,
        velocity: 0.8 * velocityMultiplier,
      })
    }
  }

  return notes
}


// Update tempo display
document.addEventListener("DOMContentLoaded", () => {
  const tempoSlider = document.getElementById("tempo")
  const tempoValue = document.getElementById("tempo-value")

  if (tempoSlider && tempoValue) {
    tempoSlider.addEventListener("input", function () {
      tempoValue.textContent = this.value
    })
  }
})

// Flutterwave Payment Integration
document.addEventListener("DOMContentLoaded", () => {
  const flutterwavePayBtn = document.getElementById("flutterwave-pay-btn")
  const closeModalBtns = document.querySelectorAll(".close-modal")

  // Close payment modal when clicking the close button
  closeModalBtns.forEach((btn) => {
    btn.addEventListener("click", function () {
      const modal = this.closest(".modal")
      if (modal) {
        modal.style.display = "none"
      }
    })
  })

  // Close modal when clicking outside the modal content
  window.addEventListener("click", (event) => {
    if (event.target.classList.contains("modal")) {
      event.target.style.display = "none"
    }
  })

  // Handle Flutterwave payment button click
  if (flutterwavePayBtn) {
    flutterwavePayBtn.addEventListener("click", () => {
      const recording = window.currentRecordingToDownload
      if (!recording) {
        alert("No recording selected for download")
        return
      }

      // Initialize Flutterwave payment
      makeFlutterwavePayment(recording)
    })
  }
})

// Function to make Flutterwave payment
function makeFlutterwavePayment(recording) {
  // Generate a unique transaction reference
  const txRef = `DMN_${Date.now()}_${Math.floor(Math.random() * 1000000)}`

  // Get recording details for payment description
  const recordingType = recording.instrument.charAt(0).toUpperCase() + recording.instrument.slice(1)
  const isWavFile = !!recording.audioBlob
  const fileType = isWavFile ? "WAV" : "JSON"

  // Configure FlutterwaveCheckout
  FlutterwaveCheckout({
    public_key: "FLWPUBK_TEST-YOUR-PUBLIC-KEY-HERE", // Replace with your Flutterwave public key
    tx_ref: txRef,
    amount: 5,
    currency: "USD",
    payment_options: "card, mobilemoney, ussd",
    customer: {
      email: "customer@example.com", // This would typically come from a form
      phone_number: "", // Optional
      name: "Customer", // Optional
    },
    customizations: {
      title: "Divine Media Network",
      description: `${recordingType} Recording (${fileType} Format)`,
      logo: "https://your-logo-url.com/logo.png", // Replace with your logo URL
    },
    callback: (response) => {
      // Handle successful payment
      if (response.status === "successful") {
        // Close the payment modal
        const paymentModal = document.getElementById("payment-modal")
        if (paymentModal) {
          paymentModal.style.display = "none"
        }

        // Process the download based on file type
        if (isWavFile) {
          processWavDownloadAfterPayment(recording)
        } else {
          processDownloadAfterPayment(recording)
        }
      } else {
        alert("Payment was not successful. Please try again.")
      }
    },
    onclose: () => {
      // Handle when the modal is closed
      console.log("Payment modal closed")
    },
  })
}

// Add these functions to enhance the mix beat functionality

// Function to add special effects to the mix
function addSpecialEffectsToMix(offlineContext, masterGain, specialEffectsAmount) {
  // Create a distortion effect
  const distortion = offlineContext.createWaveShaper()
  function makeDistortionCurve(amount) {
    const k = typeof amount === "number" ? amount : 50
    const n_samples = 44100
    const curve = new Float32Array(n_samples)
    const deg = Math.PI / 180

    for (let i = 0; i < n_samples; ++i) {
      const x = (i * 2) / n_samples - 1
      curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x))
    }
    return curve
  }
  distortion.curve = makeDistortionCurve(50 * specialEffectsAmount) // Scale distortion by amount
  distortion.oversample = "4x"

  // Create a delay effect
  const delay = offlineContext.createDelay(5.0)
  delay.delayTime.value = 0.3 * specialEffectsAmount // Scale delay time by amount

  // Create a feedback for the delay
  const feedback = offlineContext.createGain()
  feedback.gain.value = 0.4 * specialEffectsAmount // Scale feedback by amount

  // Create a filter for the delay feedback
  const filter = offlineContext.createBiquadFilter()
  filter.frequency.value = 1000 + (specialEffectsAmount * 2000); // Scale filter frequency
  filter.Q.value = 1 + (specialEffectsAmount * 5); // Scale filter Q

  // Connect the effects
  delay.connect(feedback)
  feedback.connect(filter)
  filter.connect(delay)

  return {
    distortion,
    delay,
    filter,
    applyEffects: (source, amount) => {
      if (amount > 0) {
        // Create a gain node to control the amount of effect
        const effectGain = offlineContext.createGain()
        effectGain.gain.value = amount // Use the passed amount directly

        // Connect the source to the effects chain
        source.connect(distortion)
        distortion.connect(effectGain)
        effectGain.connect(masterGain) // Connect to master gain

        // Connect the source to the delay
        source.connect(delay)
        delay.connect(effectGain)
      }
    },
  }
}

// Initialize FlutterwaveCheckout (ensure it's available before use)
const FlutterwaveCheckout = window.FlutterwaveCheckout