// Global variables
let drumPads;
let drumStatus;
let isRecording = false;
let recordingInstrument = null;
let recordedNotes = [];
let savedRecordings = [];
let recordingStartTime = 0;
let audioContext = null;
let currentRecordingToDownload = null;
let currentBlogPostId = null;

// Audio buffers
let pianoBackingBuffer = null;
const drumBuffers = {}; // Will hold decoded AudioBuffers for drum sounds

// Initialize AudioContext
function initializeAudioContext() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }
  return audioContext;
}

// Preload drum audio buffers
async function preloadDrumBuffers() {
  const context = initializeAudioContext();
  const drumAudioElements = document.querySelectorAll("audio[id]");
  const promises = [];

  drumAudioElements.forEach((audioEl) => {
    const src = audioEl.src;
    const id = audioEl.id;
    const p = fetch(src)
      .then((res) => res.arrayBuffer())
      .then((arrayBuffer) => context.decodeAudioData(arrayBuffer))
      .then((audioBuffer) => {
        drumBuffers[id] = audioBuffer;
      })
      .catch((err) => {
        console.error(`Error loading drum buffer for ${id}:`, err);
      });
    promises.push(p);
  });

  return Promise.all(promises);
}

// Start recording
function startRecording(instrument) {
  if (isRecording) return;

  isRecording = true;
  recordingInstrument = instrument;
  recordedNotes = [];
  recordingStartTime = Date.now();

  if (drumStatus) {
    drumStatus.textContent = `Recording ${instrument}...`;
  }
}

// Stop recording
function stopRecording() {
  if (!isRecording) return;

  isRecording = false;

  if (recordedNotes.length > 0) {
    const recordingDuration = Date.now() - recordingStartTime;

    const newRecording = {
      instrument: recordingInstrument,
      notes: [...recordedNotes],
      duration: recordingDuration,
      timestamp: new Date().toISOString(),
    };

    savedRecordings.push(newRecording);
    addRecordingToList(newRecording);
    console.log("Recording saved:", newRecording);
  } else {
    console.log("No notes were recorded");
    alert("No notes were recorded");
  }

  recordingInstrument = null;
  recordedNotes = [];

  if (drumStatus) {
    drumStatus.textContent = "Ready to play";
  }
}

// Record a note during recording
function recordNote(instrument, note, duration) {
  if (!isRecording || recordingInstrument !== instrument) return;

  const time = Date.now() - recordingStartTime;
  recordedNotes.push({ instrument, note, duration, time });
}

// Toggle recording (start/stop)
function toggleRecording(instrument) {
  if (isRecording) {
    stopRecording();
  } else {
    startRecording(instrument);
  }
}

// Setup drum kit pads and keyboard events
function setupDrumKit() {
  drumPads = document.querySelectorAll(".drum-pad");
  drumStatus = document.getElementById("drum-status");

  if (!drumPads || drumPads.length === 0) {
    console.error("No drum pad elements found");
    return;
  }

  drumPads.forEach((pad) => {
    pad.addEventListener("click", function () {
      const context = initializeAudioContext();
      if (context.state === "suspended") {
        context.resume();
      }

      const note = this.getAttribute("data-note");
      const audio = document.getElementById(note);

      if (!audio) {
        console.warn(`Audio element for ${note} not found`);
        return;
      }

      if (drumStatus) {
        drumStatus.textContent = `Playing: ${note.charAt(0).toUpperCase() + note.slice(1)}`;
      }

      audio.currentTime = 0;
      audio.play().catch((e) => {
        console.error(`Error playing drum ${note}:`, e);
      });

      this.classList.add("active");
      setTimeout(() => {
        this.classList.remove("active");
      }, 150);

      if (isRecording && recordingInstrument === "drums") {
        recordNote("drums", note, 150);
      }
    });
  });

  window.addEventListener("keydown", (e) => {
    if (e.repeat) return;

    initializeAudioContext();

    // Use e.code and match with data-key attribute
    const pad = document.querySelector(`.drum-pad[data-key="${e.code}"]`);
    if (!pad) return;

    const note = pad.getAttribute("data-note");
    const audio = document.getElementById(note);

    if (!audio) {
      console.warn(`Audio element for ${note} not found`);
      return;
    }

    if (drumStatus) {
      drumStatus.textContent = `Playing: ${note.charAt(0).toUpperCase() + note.slice(1)}`;
    }

    audio.currentTime = 0;
    audio.play().catch((e) => {
      console.error(`Error playing drum ${note}:`, e);
    });

    pad.classList.add("active");
    setTimeout(() => {
      pad.classList.remove("active");
    }, 150);

    if (isRecording && recordingInstrument === "drums") {
      recordNote("drums", note, 150);
    }
  });
}

// Add recording to list UI
function addRecordingToList(recording) {
  const noRecordings = document.getElementById("no-recordings");
  const recordingsList = document.getElementById("recordings-list");

  if (noRecordings && recordingsList) {
    noRecordings.style.display = "none";
    recordingsList.style.display = "flex";

    const recordingItem = document.createElement("div");
    recordingItem.className = "recording-item";
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
    `;

    recordingItem.querySelector(".play-recording").addEventListener("click", () => {
      playRecording(recording);
    });

    recordingItem.querySelector(".download-recording").addEventListener("click", () => {
      downloadRecording(recording);
    });

    recordingItem.querySelector(".delete-recording").addEventListener("click", () => {
      const index = savedRecordings.findIndex((r) => r.timestamp === recording.timestamp);
      if (index !== -1) {
        savedRecordings.splice(index, 1);
      }
      recordingItem.remove();

      if (recordingsList.children.length === 0) {
        noRecordings.style.display = "flex";
        recordingsList.style.display = "none";
      }
    });

    recordingsList.appendChild(recordingItem);
  }
}

// Play recording function (simplified for drums)
function playRecording(recording) {
  initializeAudioContext();

  if (!recording || !recording.notes || recording.notes.length === 0) {
    alert("No recording to play");
    return;
  }

  const statusElement = document.getElementById(`${recording.instrument}-status`);
  if (statusElement) {
    statusElement.textContent = "Playing recording...";
  }

  const sortedNotes = [...recording.notes].sort((a, b) => a.time - b.time);

  sortedNotes.forEach((note) => {
    setTimeout(() => {
      if (note.instrument === "drums") {
        const audio = document.getElementById(note.note);
        if (audio) {
          audio.currentTime = 0;
          audio.play().catch((e) => {
            console.error(`Error playing recorded drum ${note.note}:`, e);
          });

          const drum = document.querySelector(`.drum-pad[data-note="${note.note}"]`);
          if (drum) {
            drum.classList.add("active");
            setTimeout(() => {
              drum.classList.remove("active");
            }, 150);
          }
        }
      }
    }, note.time);
  });

  const lastNote = sortedNotes[sortedNotes.length - 1];
  setTimeout(() => {
    if (statusElement) {
      statusElement.textContent = "Playback complete";
      setTimeout(() => {
        statusElement.textContent = "Ready to play";
        statusElement.style.color = "";
      }, 2000);
    }
  }, lastNote.time + 1000);
}

// Download recording triggers payment modal (simplified)
function downloadRecording(recording) {
  const paymentModal = document.getElementById("payment-modal");
  if (paymentModal) {
    window.currentRecordingToDownload = recording;

    const recordingTitle = document.querySelector("#payment-modal .modal-header h2");
    if (recordingTitle) {
      recordingTitle.textContent = `Download ${recording.instrument.charAt(0).toUpperCase() + recording.instrument.slice(1)} Recording`;
    }

    paymentModal.style.display = "block";
  } else {
    console.error("Payment modal not found");
  }
}

// Menu icon toggle
function setupMenuToggle() {
  const menuIcon = document.getElementById("menu-icon");
  if (menuIcon) {
    menuIcon.addEventListener("click", () => {
      const menu = document.getElementById("menu");
      if (menu) {
        menu.classList.toggle("hidden");
        console.log("Menu toggled");
      }
    });
  } else {
    console.warn("Menu icon element (#menu-icon) not found");
  }
}

// Blog posts loading and modal handling (simplified)

// Get YouTube video ID from URL
function getYouTubeVideoId(url) {
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^&\n?#]+)/);
  return match ? match[1] : null;
}

// Load blog posts from JSON file
function loadBlogPosts() {
  const xhr = new XMLHttpRequest();
  xhr.open("GET", "blogposts.json", true);
  xhr.onreadystatechange = function () {
    if (xhr.readyState === 4) {
      const container = document.getElementById("blog-posts-container");
      if (!container) return;

      if (xhr.status === 200) {
        try {
          const posts = JSON.parse(xhr.responseText);
          container.innerHTML = "";

          posts.forEach((post) => {
            const postCard = document.createElement("div");
            postCard.className = "tutorial-card";
            postCard.setAttribute("data-post-id", post.id);
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
            `;

            const playIcon = postCard.querySelector(".play-icon");
            if (playIcon) {
              playIcon.addEventListener("click", (e) => {
                e.stopPropagation();
                const videoId = getYouTubeVideoId(post.videoUrl);
                if (videoId) {
                  const tutorialImage = postCard.querySelector(".tutorial-image");
                  if (tutorialImage) {
                    tutorialImage.innerHTML = `
                      <iframe
                        src="https://www.youtube.com/embed/${videoId}?autoplay=1&mute=0"
                        frameborder="0"
                        allow="autoplay; encrypted-media"
                        allowfullscreen
                        style="width:100%; height:200px; border-radius:8px;">
                      </iframe>
                    `;
                  }
                }
              });
            }

            container.appendChild(postCard);
          });
        } catch (error) {
          console.error("Error parsing blog posts JSON:", error);
          container.innerHTML = "<p>Error loading programs and videos. Please try again later.</p>";
        }
      } else {
        console.error("Error loading blog posts:", xhr.status);
        container.innerHTML = "<p>Error loading programs and videos. Please try again later.</p>";
      }
    }
  };
  xhr.send();
}

// Open blog post modal
function openBlogPostModal(post) {
  const modal = document.getElementById("blog-post-modal");
  const title = document.getElementById("blog-post-modal-title");
  const titleInfo = document.getElementById("blog-post-modal-title-info");
  const description = document.getElementById("blog-post-modal-description-info");
  const date = document.getElementById("blog-post-modal-date-info");
  const thumbnail = document.getElementById("blog-post-modal-thumbnail");
  const iframe = document.getElementById("blog-post-video-iframe");
  const playIcon = document.querySelector("#blog-post-modal .play-icon");

  if (modal && title && titleInfo && description && date && thumbnail && iframe) {
    title.textContent = post.title;
    titleInfo.textContent = post.title;
    description.textContent = post.description;
    date.innerHTML = `<i class="far fa-calendar"></i> ${new Date(post.createdAt).toLocaleDateString()}`;

    const videoId = getYouTubeVideoId(post.videoUrl);
    thumbnail.src = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
    iframe.src = `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1`;

    modal.setAttribute("data-current-post-id", post.id);
    currentBlogPostId = post.id; // store current post id
    modal.style.display = "block";

    thumbnail.style.display = "none";
    iframe.style.display = "block";
    if (playIcon) playIcon.style.display = "none";

    loadComments(post.id);
  }
}

// Load comments for a post
function loadComments(postId) {
  const commentsList = document.getElementById("comments-list");
  if (!commentsList) return;

  const comments = JSON.parse(localStorage.getItem(`comments_${postId}`)) || [];
  commentsList.innerHTML = "";

  comments.forEach((comment) => {
    const commentDiv = document.createElement("div");
    commentDiv.className = "comment";
    commentDiv.innerHTML = `
      <div class="comment-content">
        <p>${comment.text}</p>
        <small>${new Date(comment.timestamp).toLocaleString()}</small>
      </div>
    `;
    commentsList.appendChild(commentDiv);
  });
}

// Post a comment
function postComment(postId) {
  const commentInput = document.getElementById("comment-input");
  if (!commentInput || !commentInput.value.trim()) return;

  const comments = JSON.parse(localStorage.getItem(`comments_${postId}`)) || [];
  comments.push({
    text: commentInput.value.trim(),
    timestamp: new Date().toISOString(),
  });

  localStorage.setItem(`comments_${postId}`, JSON.stringify(comments));
  commentInput.value = "";
  loadComments(postId);
}

// Close blog post modal
function closeBlogPostModal() {
  const modal = document.getElementById("blog-post-modal");
  const iframe = document.getElementById("blog-post-video-iframe");
  const thumbnail = document.getElementById("blog-post-modal-thumbnail");
  const playIcon = document.querySelector("#blog-post-modal .play-icon");

  if (modal) {
    modal.style.display = "none";
    if (iframe) {
      iframe.src = "";
      iframe.style.display = "none";
    }
    if (thumbnail) thumbnail.style.display = "block";
    if (playIcon) playIcon.style.display = "flex";
  }
}

// DOMContentLoaded initialization
document.addEventListener("DOMContentLoaded", () => {
  setupDrumKit();
  setupMenuToggle();

  // Preload drum buffers for better performance
  preloadDrumBuffers().then(() => {
    console.log("Drum buffers preloaded");
  });

  // Setup record button toggle for drums (adjust ID as needed)
  const recordBtn = document.getElementById("record-drums");
  if (recordBtn) {
    recordBtn.addEventListener("click", () => {
      toggleRecording("drums");
    });
  } else {
    console.warn("Record button (#record-drums) not found");
  }

  // Load blog posts
  loadBlogPosts();
});