/* =====================================================================
   Sakura Kana — Hiragana Game
   File: script.js
   ===================================================================== */

// ---------- Fallback data kalau fetch data.json gagal (mode file://) ----------
const FALLBACK_DATA = {
  meta: { name: "Sakura Kana - Hiragana", type: "hiragana" },
  levels: [
    { level:1, name:"A",  hiragana:["あ","い","う","え","お"], value:["a","i","u","e","o"], max_point:100, time:60 },
    { level:2, name:"Ka", hiragana:["か","き","く","け","こ"], value:["ka","ki","ku","ke","ko"], max_point:100, time:60 },
    { level:3, name:"Sa", hiragana:["さ","し","す","せ","そ"], value:["sa","shi","su","se","so"], max_point:100, time:60 },
    { level:4, name:"Ta", hiragana:["た","ち","つ","て","と"], value:["ta","chi","tsu","te","to"], max_point:100, time:60 },
    { level:5, name:"Na", hiragana:["な","に","ぬ","ね","の"], value:["na","ni","nu","ne","no"], max_point:100, time:60 },
    { level:6, name:"Ha", hiragana:["は","ひ","ふ","へ","ほ"], value:["ha","hi","fu","he","ho"], max_point:100, time:60 },
    { level:7, name:"Ma", hiragana:["ま","み","む","め","も"], value:["ma","mi","mu","me","mo"], max_point:100, time:60 },
    { level:8, name:"Ya", hiragana:["や","ゆ","よ"],            value:["ya","yu","yo"],             max_point:100, time:60 },
    { level:9, name:"Ra", hiragana:["ら","り","る","れ","ろ"], value:["ra","ri","ru","re","ro"],   max_point:100, time:60 },
    { level:10,name:"Wa", hiragana:["わ","を"],                 value:["wa","wo"],                  max_point:100, time:60 },
    { level:11,name:"N",  hiragana:["ん"],                       value:["n"],                         max_point:100, time:60 },
    { level:12,name:"N",  hiragana:["ん"],                       value:["n"],                         max_point:100, time:60 }
  ]
};

// ---------- State global ----------
const STORE = {
  progress: "sakura_progress",   // { unlockedLevel: n, completed: [..] }
  settings: "sakura_settings"   // { theme, speedrun }
};

let DATA = null;          // hasil fetch data.json
let state = {
  currentLevel: null,     // objek level yg sedang dimainkan
  score: 0,
  point: 0,
  timeLeft: 0,
  timerId: null,
  currentQuestion: null,  // { hiragana, value }
  acceptingInput: true
};

// ---------- Util ----------
const $ = (id) => document.getElementById(id);
const qs = (sel, root=document) => root.querySelector(sel);

function loadProgress() {
  try {
    const raw = localStorage.getItem(STORE.progress);
    if (!raw) return { unlocked: 1, completed: [] };
    const p = JSON.parse(raw);
    return { unlocked: p.unlocked || 1, completed: p.completed || [] };
  } catch { return { unlocked: 1, completed: [] }; }
}
function saveProgress(p) {
  localStorage.setItem(STORE.progress, JSON.stringify(p));
}
function loadSettings() {
  try {
    const raw = localStorage.getItem(STORE.settings);
    if (!raw) return { theme: "light", speedrun: false };
    return Object.assign({ theme:"light", speedrun:false }, JSON.parse(raw));
  } catch { return { theme:"light", speedrun:false }; }
}
function saveSettings(s) {
  localStorage.setItem(STORE.settings, JSON.stringify(s));
}

// ---------- Navigation antar screen ----------
function showScreen(id) {
  document.querySelectorAll(".screen").forEach(s => s.classList.add("hidden"));
  const target = $(id);
  if (target) {
    target.classList.remove("hidden");
    // focus otomatis kalau ada input
    const inp = target.querySelector("input");
    if (inp) setTimeout(() => inp.focus(), 50);
  }
}

// ---------- Settings UI ----------
function applyTheme(theme) {
  if (theme === "dark") document.documentElement.classList.add("dark");
  else document.documentElement.classList.remove("dark");
}
function renderSettings() {
  const s = loadSettings();
  applyTheme(s.theme);
  // toggle button terang/gelap
  document.querySelectorAll("#setting_theme .toggle-btn").forEach(b => {
    b.classList.toggle("active", b.dataset.theme === s.theme);
  });
  $("setting_speedrun").checked = !!s.speedrun;
}
function bindSettings() {
  document.querySelectorAll("#setting_theme .toggle-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const s = loadSettings();
      s.theme = btn.dataset.theme;
      saveSettings(s);
      renderSettings();
    });
  });
  $("setting_speedrun").addEventListener("change", (e) => {
    const s = loadSettings();
    s.speedrun = e.target.checked;
    saveSettings(s);
  });
  $("btn_delete").addEventListener("click", () => {
    if (!confirm("Yakin hapus semua data (progress & setting)?")) return;
    localStorage.removeItem(STORE.progress);
    localStorage.removeItem(STORE.settings);
    renderSettings();
    renderLevelTable();
    alert("Data berhasil dihapus.");
  });
}

// ---------- Level table ----------
function renderLevelTable() {
  const prog = loadProgress();
  const tbody = $("level_table");
  // header + body dibangun manual
  let html = `
    <table class="kana-levels">
      <thead>
        <tr><th>#</th><th>Level</th><th>Contoh</th><th>Status</th></tr>
      </thead>
      <tbody>
  `;
  DATA.levels.forEach(lv => {
    const done = prog.completed.includes(lv.level);
    const locked = lv.level > prog.unlocked;
    const status = done ? "✅" : (locked ? "🔒" : "▶");
    html += `
      <tr class="level-row ${locked?'locked':''} ${done?'done':''}"
          data-level="${lv.level}">
        <td>${lv.level}</td>
        <td class="font-semibold">${lv.name}</td>
        <td class="hiragana-char text-xl">${lv.hiragana[0]}</td>
        <td class="status">${status}</td>
      </tr>
    `;
  });
  html += `</tbody></table>`;
  tbody.innerHTML = html;

  // bind click
  tbody.querySelectorAll(".level-row").forEach(row => {
    row.addEventListener("click", () => {
      if (row.classList.contains("locked")) return;
      const lvl = parseInt(row.dataset.level, 10);
      startLevel(lvl);
    });
  });
}

// ---------- Game logic ----------
function pickQuestion(level) {
  const i = Math.floor(Math.random() * level.hiragana.length);
  return { hiragana: level.hiragana[i], value: level.value[i] };
}
function renderQuestion() {
  state.currentQuestion = pickQuestion(state.currentLevel);
  $("play_question").textContent = state.currentQuestion.hiragana;
  $("play_feedback").textContent = "";
  const inp = $("play_input");
  inp.value = "";
  inp.classList.remove("correct","wrong");
  state.acceptingInput = true;
  inp.focus();
}

function updateHUD() {
  $("play_score").textContent = state.score;
  $("play_point").textContent = state.point;
  // timer bar
  const total = state.currentLevel.time;
  const pct = Math.max(0, state.timeLeft) / total * 100;
  $("timer_fill").style.width = pct + "%";
  $("timer_text").textContent = state.timeLeft;
  const bar = qs(".timer-bar");
  bar.classList.toggle("warn", state.timeLeft <= 10);
}

function startTimer() {
  clearInterval(state.timerId);
  state.timerId = setInterval(() => {
    state.timeLeft--;
    updateHUD();
    if (state.timeLeft <= 0) {
      clearInterval(state.timerId);
      endGame("time");
    }
  }, 1000);
}

function startLevel(levelNum) {
  const lv = DATA.levels.find(l => l.level === levelNum);
  if (!lv) return;
  state.currentLevel = lv;
  state.score = 0;
  state.point = 0;
  state.timeLeft = lv.time;
  state.acceptingInput = true;

  showScreen("play_screen");
  renderQuestion();
  updateHUD();
  startTimer();
}

function checkAnswer() {
  if (!state.acceptingInput) return;
  const inp = $("play_input");
  const ans = inp.value.trim().toLowerCase();
  if (!ans) return;

  const correct = ans === state.currentQuestion.value;
  const settings = loadSettings();

  if (correct) {
    state.score += 5;     // score selalu bertambah
    state.point += 5;
    inp.classList.add("correct");
    state.acceptingInput = false;

    // cek naik level
    if (state.point > state.currentLevel.max_point) {
      clearInterval(state.timerId);
      unlockNextLevel(state.currentLevel.level);
      endGame("win");
      return;
    }
    // delay kecil lalu soal baru
    setTimeout(() => renderQuestion(), 100);
  } else {
    // salah
    state.point -= 5;
    inp.classList.add("wrong");

    if (settings.speedrun) {
      // tidak ada info, langsung lanjut
      if (state.point < -15) {
        clearInterval(state.timerId);
        endGame("lose");
        return;
      }
      setTimeout(() => renderQuestion(), 80);
    } else {
      // tampilkan info & delay 0.5s
      $("play_feedback").textContent =
        `Salah — ${state.currentQuestion.hiragana} = ${state.currentQuestion.value}`;
      state.acceptingInput = false;
      if (state.point < 0) {
        clearInterval(state.timerId);
        endGame("lose");
        return;
      }
      setTimeout(() => {
        renderQuestion();
        updateHUD();
      }, 500);
    }
  }
  updateHUD();
}

function unlockNextLevel(doneLevelNum) {
  const prog = loadProgress();
  if (!prog.completed.includes(doneLevelNum)) prog.completed.push(doneLevelNum);
  const next = doneLevelNum + 1;
  if (next <= DATA.levels.length && prog.unlocked < next) prog.unlocked = next;
  saveProgress(prog);
}

function endGame(reason) {
  state.acceptingInput = false;
  clearInterval(state.timerId);

  let emoji = "🎯", title = "Game Over", status = "";
  if (reason === "win") {
    emoji = "🌸"; title = "Level Selesai!";
    status = "Kamu berhasil menyelesaikan level ini. Level berikutnya sudah terbuka!";
  } else if (reason === "time") {
    emoji = "⏰"; title = "Waktu Habis";
    status = `Point akhir: ${state.point}. Coba lagi!`;
  } else if (reason === "lose") {
    emoji = "💔"; title = "Game Over";
    status = "Point jatuh di bawah 0. Jangan menyerah!";
  }
  $("go_emoji").textContent = emoji;
  $("go_title").textContent = title;
  $("go_score").textContent = state.score;
  $("go_point").textContent = state.point;
  $("go_status").textContent = status;
  showScreen("game_over");
}

// ---------- Boot ----------
async function loadData() {
  try {
    const res = await fetch("data.json", { cache: "no-store" });
    if (!res.ok) throw new Error("HTTP " + res.status);
    DATA = await res.json();
  } catch (err) {
    console.warn("Gagal fetch data.json, pakai fallback:", err.message);
    DATA = FALLBACK_DATA;
  }
}

function bindNavigation() {
  $("btn_play").addEventListener("click", () => {
    renderLevelTable();
    showScreen("level_screen");
  });
  $("btn_setting").addEventListener("click", () => showScreen("setting_screen"));
  document.querySelectorAll("[data-back]").forEach(btn => {
    btn.addEventListener("click", () => showScreen(btn.dataset.back));
  });
  $("btn_replay").addEventListener("click", () => {
    if (state.currentLevel) startLevel(state.currentLevel.level);
    else showScreen("level_screen");
  });
  $("btn_menu").addEventListener("click", () => {
    renderLevelTable();
    showScreen("menu_screen");
  });
  // input: Enter untuk kirim
  $("play_input").addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      checkAnswer();
    }
  });
}

async function init() {
  await loadData();
  renderSettings();
  bindSettings();
  bindNavigation();
  showScreen("menu_screen");
}
init();
