/* OPEN BOOK */
function openBook() {
  document.getElementById("bookCover").style.display = "none";
  document.getElementById("app-content").style.display = "block";
}

/* GLOBAL STATE */
let words = [];
let index = 0;
let speaking = false;
let paused = false;
let voices = [];

speechSynthesis.onvoiceschanged = () => {
  voices = speechSynthesis.getVoices();
};

/* DIFFICULT WORDS */
const COMMON = [
  "the","is","was","are","and","or","but","if","to","of","in","on",
  "for","with","as","at","by","from","this","that","it","he","she","they"
];

const isDifficult = word =>
  word.length >= 7 && !COMMON.includes(word.toLowerCase());

/* STORY GENERATION */
async function generateStory() {
  const prompt = document.getElementById("prompt").value.trim();
  if (!prompt) return alert("Enter a story idea");

  const storyDiv = document.getElementById("story");
  storyDiv.textContent = "Generating story...";

  try {
    const res = await fetch("http://localhost:11434/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "tinyllama",
        prompt: `Write a simple emotional story based on: ${prompt}`,
        stream: false
      })
    });

    const data = await res.json();
    renderStory(data.response.trim());
    enableControls();
  } catch {
    storyDiv.textContent = "Failed to generate story.";
  }
}

/* RENDER STORY */
function renderStory(text) {
  const storyDiv = document.getElementById("story");
  storyDiv.innerHTML = "";
  words = [];
  index = 0;

  text.split(/\s+/).forEach(raw => {
    const clean = raw.replace(/[^a-zA-Z]/g, "");
    const span = document.createElement("span");
    span.textContent = raw + " ";
    span.className = "word";

    if (isDifficult(clean)) {
      span.classList.add("difficult");
      span.ondblclick = e => showDefinition(clean, e);
    }

    storyDiv.appendChild(span);
    words.push(raw);
  });
}

/* ENABLE BUTTONS */
function enableControls() {
  ["playPauseBtn","restartBtn","stopBtn","downloadBtn"]
    .forEach(id => document.getElementById(id).disabled = false);
}

/* TEXT TO SPEECH */
function togglePlayPause() {
  if (!words.length) return;
  const btn = document.getElementById("playPauseBtn");

  if (!speaking) {
    speaking = true;
    paused = false;
    btn.textContent = "⏸ Pause";
    speak();
  } else if (!speechSynthesis.paused) {
    speechSynthesis.pause();
    paused = true;
    btn.textContent = "▶ Play";
  } else {
    speechSynthesis.resume();
    paused = false;
    btn.textContent = "⏸ Pause";
  }
}

function speak() {
  if (index >= words.length || paused) {
    speaking = false;
    document.getElementById("playPauseBtn").textContent = "▶ Play";
    return;
  }

  const utter = new SpeechSynthesisUtterance(
    words.slice(index, index + 8).join(" ")
  );

  utter.rate = document.getElementById("rateSlider").value;
  utter.voice = voices.find(v => v.lang === "en-US");

  utter.onend = () => {
    index += 8;
    speak();
  };

  speechSynthesis.speak(utter);
}

function restartStory() {
  speechSynthesis.cancel();
  index = 0;
  speaking = false;
  togglePlayPause();
}

function stopStory() {
  speechSynthesis.cancel();
  speaking = false;
  paused = false;
  index = 0;
  document.getElementById("playPauseBtn").textContent = "▶ Play";
}

/* SPEED */
rateSlider.oninput = e =>
  rateValue.textContent = e.target.value + "x";

/* DICTIONARY */
async function showDefinition(word, e) {
  const popup = document.getElementById("definitionTooltip");
  popup.style.display = "block";
  popup.style.top = e.pageY + "px";
  popup.style.left = e.pageX + "px";
  popup.innerHTML =
    `<span class="close-btn" onclick="closePopup()">✖</span> Loading...`;

  try {
    const res = await fetch(
      `https://api.dictionaryapi.dev/api/v2/entries/en/${word}`
    );
    const data = await res.json();
    const meaning =
      data?.[0]?.meanings?.[0]?.definitions?.[0]?.definition ||
      "Meaning not found.";

    popup.innerHTML = `
      <span class="close-btn" onclick="closePopup()">✖</span>
      <b>${word}</b>
      <p>${meaning}</p>
    `;
  } catch {
    popup.innerHTML = "Meaning not available.";
  }
}

function closePopup() {
  document.getElementById("definitionTooltip").style.display = "none";
}

/* DOWNLOAD */
function downloadStory() {
  const text = document.getElementById("story").innerText;
  const blob = new Blob([text], { type: "text/plain" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "khathakar_story.txt";
  a.click();
}