// Enhanced mix tracks function with adaptive backing beat and dynamic timing
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
  
  // Mock declarations for the missing variables.  These would normally be imported or defined elsewhere.
  function initializeAudioContext() {
    return new AudioContext()
  }
  const savedRecordings = []
  function quantizeNotes(notes, bpm) {
    return notes
  }
  function analyzeRecordingsForBeat(recordings, bpm) {
    return {}
  }
  function createAdaptiveBackingBeat(beatInfo, pattern, bpm, maxDuration) {
    return []
  }
  function addBeatVariations(processedBeat, bpm) {
    return processedBeat
  }
  function addSpecialEffectsToMix(offlineContext, destination, specialEffectsAmount) {
    return { applyEffects: () => {} }
  }
  function bufferToWave(renderedBuffer, length) {
    return new Blob()
  }
  function addRecordingToList(mixedRecording) {}
  
  