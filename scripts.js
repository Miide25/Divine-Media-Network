// Global variables
let drumPads
let drumStatus
let isRecording = false
let recordingInstrument = null
let recordedNotes = []
let recordingStartTime = 0
let savedRecordings = []
let currentBlogPostId = null
let audioContext = null
let currentRecordingToDownload = null

// Fix the drum key mapping to match the user's custom sounds
function setupDrumKit() {
  // Check if drum pads exist
  if (!drumPads || drumPads.length === 0) {
    console.error("No drum pad elements found")
    return
  }

  drumPads.forEach((pad) => {
    pad.addEventListener("click", function () {
      const context = initializeAudioContext()

      if (context.state === 'suspended') {
        context.resume()
      }

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
  document.body.appendChild(a)

  a.click()

  // Clean up
  URL.revokeObjectURL(url)
  document.body.removeChild(a); // Remove the temporary anchor

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
    document.body.appendChild(a); // Append to body to make it clickable

    a.click()

    // Clean up
    URL.revokeObjectURL(url)
    document.body.removeChild(a); // Remove the temporary anchor

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
    document.querySelector("#mixing-modal .close-modal").addEventListener("click", () => {
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
    const specialEffects = addSpecialEffectsToMix(offlineContext, masterGain, specialEffectsAmount) // Pass masterGain

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
            
            // Apply special effects if enabled, connecting to trackGain
            if (specialEffectsAmount > 0) {
              specialEffects.applyEffects(source, specialEffectsAmount, trackGain); // Pass trackGain as destination
            } else {
              trackGain.connect(masterGain); // Connect directly to master if no special effects
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


function bufferToWave(abuffer, len) {
  const numOfChan = abuffer.numberOfChannels
  const length = len * numOfChan * 2 + 44
  const buffer = new ArrayBuffer(length)
  const view = new DataView(buffer)
  let pos = 0

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

  // Write WAVE header
  setUint32(0x46464952) // "RIFF"
  setUint32(length - 8) // file length - 8
  setUint32(0x45564157) // "WAVE"
  setUint32(0x20746d66) // "fmt " chunk
  setUint32(16) // chunk length
  setUint16(1) // PCM format
  setUint16(numOfChan) // number of channels
  setUint32(44100) // sample rate
  setUint32(44100 * numOfChan * 2) // byte rate
  setUint16(numOfChan * 2) // block align
  setUint16(16) // bits per sample
  setUint32(0x61746164) // "data" chunk
  setUint32(length - pos - 4) // chunk length

  // Write interleaved data
  for (let i = 0; i < len; i++) { // Iterate over length, not channels
    for (let channel = 0; channel < numOfChan; channel++) {
      const sample = abuffer.getChannelData(channel)[i];
      // Clamp the value to the 16-bit range
      const value = Math.max(-1, Math.min(1, sample)) * 0x7FFF; // Scale to 16-bit signed integer range
      setInt16(value);
    }
  }

  return new Blob([buffer], { type: "audio/wav" })
}

// Removed fetch-based loadBlogPosts function to avoid CORS issues when opening file directly

// Record note
function recordNote(instrument, note, duration) {
  if (isRecording && recordingInstrument === instrument) {
    const noteData = {
      instrument: instrument,
      note: note,
      time: Date.now() - recordingStartTime,
      duration: duration,
      velocity: 1.0
    }
    recordedNotes.push(noteData)
    console.log("Recorded note:", noteData)
  }
}

// Initialize audio context
function initializeAudioContext() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)()
  }
  return audioContext
}

// Initialize talking drums
function initializeTalkingDrums() {
  const drums = document.querySelectorAll('.talking-drum-large, .talking-drum-medium, .talking-drum-small')
  drums.forEach(drum => {
    drum.addEventListener('click', handleTalkingDrumClick)
  })
}

// Handle talking drum click
function handleTalkingDrumClick(event) {
  const context = initializeAudioContext()
  if (context.state === 'suspended') {
    context.resume()
  }

  const drum = event.target.closest('.talking-drum-large, .talking-drum-medium, .talking-drum-small')
  if (!drum) return

  let note
  if (drum.classList.contains('talking-drum-large')) note = 'talking-drum-low'
  else if (drum.classList.contains('talking-drum-medium')) note = 'talking-drum-mid'
  else note = 'talking-drum-high'

  const audio = document.getElementById(note)
  if (audio) {
    audio.currentTime = 0
    audio.play().catch(e => console.error(e))
  }

  // Visual feedback
  drum.classList.add('active')
  setTimeout(() => drum.classList.remove('active'), 150)

  // Record if recording
  if (isRecording && recordingInstrument === 'talking-drums') {
    recordNote('talking-drums', note, 150)
  }
}

// Initialize navigation
function initializeNavigation() {
  const menuToggle = document.getElementById('mobile-menu')
  const navMenu = document.querySelector('.nav-menu')

  if (menuToggle && navMenu) {
    menuToggle.addEventListener('click', () => {
      navMenu.classList.toggle('active')
      menuToggle.classList.toggle('active')
    })
  }

  // Smooth scrolling for navigation links
  const navLinks = document.querySelectorAll('.nav-link')
  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault()
      const targetId = link.getAttribute('href')
      const targetSection = document.querySelector(targetId)
      if (targetSection) {
        targetSection.scrollIntoView({ behavior: 'smooth' })
      }
      // Close mobile menu if open
      navMenu.classList.remove('active')
      menuToggle.classList.remove('active')
    })
  })
}

// Load blog posts from JSON file
function loadBlogPosts() {
  const xhr = new XMLHttpRequest()
  xhr.open('GET', 'blogposts.json', true)
  xhr.onreadystatechange = function() {
    if (xhr.readyState === 4) {
      if (xhr.status === 200) {
        try {
          const posts = JSON.parse(xhr.responseText)

          const container = document.getElementById('blog-posts-container')
          if (!container) return

          container.innerHTML = ''

          posts.forEach(post => {
            const postCard = document.createElement('div')
            postCard.className = 'tutorial-card'
            postCard.setAttribute('data-post-id', post.id)
            postCard.innerHTML = `
              <div class="tutorial-image">
                <img src="https://img.youtube.com/vi/${getYouTubeVideoId(post.videoUrl)}/maxresdefault.jpg" alt="${post.title}" style="width:100%; height:200px; object-fit:cover; border-radius:8px;">
                <div class="play-icon"><i class="fas fa-play"></i></div>
                <span class="level ${post.type}">${post.type.charAt(0).toUpperCase() + post.type.slice(1)}</span>
              </div>
              <div class="tutorial-info">
                <h3>${post.title}</h3>
                <p>${post.description}</p>
                <span class="duration"><i class="far fa-calendar"></i> ${new Date(post.createdAt).toLocaleDateString()}</span>
              </div>
            `

            // Instead of opening modal on card click, play video on play icon click
            const playIcon = postCard.querySelector('.play-icon')
            if (playIcon) {
              playIcon.addEventListener('click', (e) => {
                e.stopPropagation()
                const videoId = getYouTubeVideoId(post.videoUrl)
                if (videoId) {
                  // Replace the image with iframe to autoplay video
                  const tutorialImage = postCard.querySelector('.tutorial-image')
                  if (tutorialImage) {
                    tutorialImage.innerHTML = `
                      <iframe
                        src="https://www.youtube.com/embed/${videoId}?autoplay=1&mute=0"
                        frameborder="0"
                        allow="autoplay; encrypted-media"
                        allowfullscreen
                        style="width:100%; height:200px; border-radius:8px;">
                      </iframe>
                    `
                  }
                }
              })
            }
            container.appendChild(postCard)
          })
        } catch (error) {
          console.error('Error parsing blog posts JSON:', error)
          const container = document.getElementById('blog-posts-container')
          if (container) {
            container.innerHTML = '<p>Error loading programs and videos. Please try again later.</p>'
          }
        }
      } else {
        console.error('Error loading blog posts:', xhr.status)
        const container = document.getElementById('blog-posts-container')
        if (container) {
          container.innerHTML = '<p>Error loading programs and videos. Please try again later.</p>'
        }
      }
    }
  }
  xhr.send()
}

// Get YouTube video ID from URL
function getYouTubeVideoId(url) {
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^&\n?#]+)/)
  return match ? match[1] : null
}

// Open blog post modal
function openBlogPostModal(post) {
  const modal = document.getElementById('blog-post-modal')
  const title = document.getElementById('blog-post-modal-title')
  const titleInfo = document.getElementById('blog-post-modal-title-info')
  const description = document.getElementById('blog-post-modal-description-info')
  const date = document.getElementById('blog-post-modal-date-info')
  const thumbnail = document.getElementById('blog-post-modal-thumbnail')
  const iframe = document.getElementById('blog-post-video-iframe')
  const playIcon = document.querySelector('#blog-post-modal .play-icon')

  if (modal && title && titleInfo && description && date && thumbnail && iframe) {
    title.textContent = post.title
    titleInfo.textContent = post.title
    description.textContent = post.description
    date.innerHTML = `<i class="far fa-calendar"></i> ${new Date(post.createdAt).toLocaleDateString()}`

    const videoId = getYouTubeVideoId(post.videoUrl)
    thumbnail.src = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`
    iframe.src = `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1`

    modal.setAttribute('data-current-post-id', post.id)
    modal.style.display = 'block'

    // Show iframe immediately and hide thumbnail and play icon
    thumbnail.style.display = 'none'
    iframe.style.display = 'block'
    if (playIcon) playIcon.style.display = 'none'

    // Load comments
    loadComments(post.id)
  }
}

// Load comments for a post
function loadComments(postId) {
  const commentsList = document.getElementById('comments-list')
  if (!commentsList) return

  const comments = JSON.parse(localStorage.getItem(`comments_${postId}`)) || []
  commentsList.innerHTML = ''

  comments.forEach(comment => {
    const commentDiv = document.createElement('div')
    commentDiv.className = 'comment'
    commentDiv.innerHTML = `
      <div class="comment-content">
        <p>${comment.text}</p>
        <small>${new Date(comment.timestamp).toLocaleString()}</small>
      </div>
    `
    commentsList.appendChild(commentDiv)
  })
}

// Post a comment
function postComment(postId) {
  const commentInput = document.getElementById('comment-input')
  if (!commentInput || !commentInput.value.trim()) return

  const comments = JSON.parse(localStorage.getItem(`comments_${postId}`)) || []
  comments.push({
    text: commentInput.value.trim(),
    timestamp: new Date().toISOString()
  })

  localStorage.setItem(`comments_${postId}`, JSON.stringify(comments))
  commentInput.value = ''
  loadComments(postId)
}

// Close blog post modal
function closeBlogPostModal() {
  const modal = document.getElementById('blog-post-modal')
  const iframe = document.getElementById('blog-post-video-iframe')
  const thumbnail = document.getElementById('blog-post-modal-thumbnail')
  const playIcon = document.querySelector('#blog-post-modal .play-icon')

  if (modal) {
    modal.style.display = 'none'
    if (iframe) {
      iframe.src = ''
      iframe.style.display = 'none'
    }
    if (thumbnail) thumbnail.style.display = 'block'
    if (playIcon) playIcon.style.display = 'flex'
  }
}
