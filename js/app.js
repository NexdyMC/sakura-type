/* ==========================================================================
   SakuraType — app.js
   Loading screen, multi-alphabet navbar (Hiragana/Katakana/Kanji), JSON-driven
   sub-tabs & level grid, timer, scoring, LocalStorage progress, sakura petals.
   ========================================================================== */

const DATA_SOURCES = {
  hiragana: 'data/hiragana.json',
  katakana: 'data/katakana.json',
  kanji: 'data/kanji.json' // not shipped yet -> nav tab auto-disables
};

const CATEGORY_LABELS = {
  gojuon: 'Gojūon',
  dakuten_handakuten: 'Dakuten & Handakuten',
  yoon: 'Yōon',
  master_mix: 'Master Mix'
};
const CATEGORY_ORDER = ['gojuon', 'dakuten_handakuten', 'yoon', 'master_mix'];

const LS = {
  theme: 'st_theme',
  speedrun: 'st_speedrun',
  sakuraFall: 'st_sakura_fall',
  unlocked: (alpha, cat) => `st_unlocked_${alpha}_${cat}`,
  cleared:  (alpha, cat, pos) => `st_cleared_${alpha}_${cat}_${pos}`,
  highscore: (alpha, cat, pos) => `st_highscore_${alpha}_${cat}_${pos}`
};

let DATA = {};        // { hiragana: [levels...], katakana: [...], kanji: [...] }
let AVAILABLE = {};   // { hiragana: true, katakana: true, kanji: false }

let currentAlphabet = 'hiragana';
let activeCategory = 'gojuon';
let activeLevelMeta = null;   // the level object currently being played
let activeLevelPos = null;    // 1-based position within its category (used for unlock/highscore keys)

let state = {
  score: 0,
  point: 0,
  timeLeft: 60,
  timerId: null,
  charIdx: -1,
  locked: false
};

let settings = {
  theme: localStorage.getItem(LS.theme) || 'light',
  speedrun: localStorage.getItem(LS.speedrun) === 'true',
  sakuraFall: localStorage.getItem(LS.sakuraFall) !== 'false' // default ON
};

/* ---------------------------------------------------------------------- */
/* Bootstrapping / Loading screen                                         */
/* ---------------------------------------------------------------------- */

$(async function () {
  applyTheme(settings.theme, false);
  $('#setting_speedrun').prop('checked', settings.speedrun);
  $('#setting_sakura_fall').prop('checked', settings.sakuraFall);

  spawnPetals(28);
  applySakuraFall(settings.sakuraFall);

  await loadAllData();

  bindNav();
  bindMainNav();
  bindSettings();
  bindPlay();
  bindGameOver();

  const firstAvailable = Object.keys(DATA_SOURCES).find((a) => AVAILABLE[a]);
  currentAlphabet = firstAvailable || 'hiragana';
  renderMainNav();
  renderCategoryTabs();
  renderLevelGrid();
  updateMenuAlphabetLabel();

  $('#loading_screen').addClass('hidden');
  $('#app_shell').removeClass('hidden');
});

async function loadAllData() {
  const keys = Object.keys(DATA_SOURCES);
  let done = 0;
  await Promise.all(keys.map(async (alpha) => {
    $('#loading_status').text(`Memuat ${alpha}.json…`);
    try {
      DATA[alpha] = await fetchJSON(DATA_SOURCES[alpha]);
      AVAILABLE[alpha] = true;
    } catch (err) {
      DATA[alpha] = [];
      AVAILABLE[alpha] = false;
    }
    done += 1;
    $('#loading_bar_fill').css('width', Math.round((done / keys.length) * 100) + '%');
  }));
  $('#loading_status').text('Menyiapkan antarmuka…');
}

async function fetchJSON(url) {
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error('HTTP ' + res.status);
  return res.json();
}

/* ---------------------------------------------------------------------- */
/* Screen navigation                                                      */
/* ---------------------------------------------------------------------- */

function showScreen(id) {
  $('.screen').addClass('hidden');
  $('#' + id).removeClass('hidden');
}

function bindNav() {
  $('#btn_play').on('click', () => {
    activeCategory = firstAvailableCategory(currentAlphabet);
    if (!activeCategory) return;
    const pos = firstResumablePosition(currentAlphabet, activeCategory);
    const levels = levelsFor(currentAlphabet, activeCategory);
    startLevel(currentAlphabet, activeCategory, levels[pos - 1], pos);
  });
  $('#btn_levels').on('click', () => {
    activeCategory = firstAvailableCategory(currentAlphabet) || activeCategory;
    renderCategoryTabs();
    renderLevelGrid();
    showScreen('category_level_screen');
  });
  $('#btn_setting').on('click', () => showScreen('setting_screen'));
  $(document).on('click', '.btn-back', function () {
    stopTimer();
    showScreen($(this).data('back'));
  });
}

/* ---------------------------------------------------------------------- */
/* Main navbar: Hiragana / Katakana / Kanji                               */
/* ---------------------------------------------------------------------- */

function renderMainNav() {
  const $nav = $('#main_nav').empty();
  Object.keys(DATA_SOURCES).forEach((alpha) => {
    const label = { hiragana: 'あ Hiragana', katakana: 'ア Katakana', kanji: '漢 Kanji' }[alpha];
    const $btn = $(`<button class="main-nav-btn" data-alphabet="${alpha}">${label}</button>`);
    if (!AVAILABLE[alpha]) {
      $btn.addClass('disabled').attr('title', `${alpha}.json belum tersedia`);
    } else {
      if (alpha === currentAlphabet) $btn.addClass('active');
      $btn.on('click', () => {
        currentAlphabet = alpha;
        activeCategory = firstAvailableCategory(alpha) || activeCategory;
        renderMainNav();
        renderCategoryTabs();
        renderLevelGrid();
        updateMenuAlphabetLabel();
      });
    }
    $nav.append($btn);
  });
}

function updateMenuAlphabetLabel() {
  const label = { hiragana: 'Hiragana', katakana: 'Katakana', kanji: 'Kanji' }[currentAlphabet];
  $('#menu_alphabet_label').text(label);
}

/* ---------------------------------------------------------------------- */
/* Settings                                                                */
/* ---------------------------------------------------------------------- */

function bindSettings() {
  $('#setting_theme .toggle-btn').on('click', function () {
    applyTheme($(this).data('theme'), true);
  });

  $('#setting_speedrun').on('change', function () {
    settings.speedrun = $(this).is(':checked');
    localStorage.setItem(LS.speedrun, String(settings.speedrun));
  });

  $('#setting_sakura_fall').on('change', function () {
    settings.sakuraFall = $(this).is(':checked');
    localStorage.setItem(LS.sakuraFall, String(settings.sakuraFall));
    applySakuraFall(settings.sakuraFall);
  });

  $('#btn_delete').on('click', function () {
    if (!confirm('Hapus semua progress, high score, dan setting?')) return;
    Object.keys(localStorage)
      .filter((k) => k.startsWith('st_'))
      .forEach((k) => localStorage.removeItem(k));
    settings = { theme: 'light', speedrun: false, sakuraFall: true };
    applyTheme('light', false);
    $('#setting_speedrun').prop('checked', false);
    $('#setting_sakura_fall').prop('checked', true);
    applySakuraFall(true);
    renderLevelGrid();
    alert('Data berhasil dihapus.');
  });
}

function applyTheme(theme, persist) {
  settings.theme = theme;
  document.documentElement.classList.toggle('dark', theme === 'dark');
  $('#setting_theme .toggle-btn').removeClass('active');
  $(`#setting_theme .toggle-btn[data-theme="${theme}"]`).addClass('active');
  if (persist) localStorage.setItem(LS.theme, theme);
}

/* ---------------------------------------------------------------------- */
/* Falling sakura petals                                                  */
/* ---------------------------------------------------------------------- */

function spawnPetals(count) {
  const $layer = $('#petal-layer').empty();
  for (let i = 0; i < count; i++) {
    const left = Math.random() * 100;
    const duration = 7 + Math.random() * 8;
    const delay = Math.random() * 10;
    const swayDuration = 2 + Math.random() * 2;
    const size = 8 + Math.random() * 8;
    const $p = $('<div class="petal"></div>').css({
      left: left + 'vw',
      width: size + 'px',
      height: size + 'px',
      animationDuration: `${duration}s, ${swayDuration}s`,
      animationDelay: `${delay}s, ${delay}s`
    });
    $layer.append($p);
  }
}

function applySakuraFall(on) {
  $('#petal-layer').toggleClass('active', !!on);
}

/* ---------------------------------------------------------------------- */
/* Category tabs + level grid (JSON-driven)                               */
/* ---------------------------------------------------------------------- */

function levelsFor(alpha, category) {
  return (DATA[alpha] || [])
    .filter((l) => l.category === category)
    .sort((a, b) => a.level - b.level);
}

function categoriesFor(alpha) {
  const set = new Set((DATA[alpha] || []).map((l) => l.category));
  return CATEGORY_ORDER.filter((c) => set.has(c));
}

function firstAvailableCategory(alpha) {
  const cats = categoriesFor(alpha);
  return cats.length ? cats[0] : null;
}

function renderCategoryTabs() {
  const $row = $('#category_tabs').empty();

  if (!AVAILABLE[currentAlphabet]) {
    $row.append(`<p class="empty-state">Data untuk ${currentAlphabet} belum tersedia.</p>`);
    $('#level_grid').empty();
    return;
  }

  const cats = categoriesFor(currentAlphabet);
  if (!cats.includes(activeCategory)) activeCategory = cats[0];

  cats.forEach((cat) => {
    const $btn = $(`<button class="cat-tab" data-cat="${cat}">${CATEGORY_LABELS[cat] || cat}</button>`);
    if (cat === activeCategory) $btn.addClass('active');
    $btn.on('click', () => {
      activeCategory = cat;
      $row.find('.cat-tab').removeClass('active');
      $btn.addClass('active');
      renderLevelGrid();
    });
    $row.append($btn);
  });
}

function renderLevelGrid() {
  const $grid = $('#level_grid').empty();
  if (!AVAILABLE[currentAlphabet]) return;

  const levels = levelsFor(currentAlphabet, activeCategory);
  const unlocked = getUnlockedCount(currentAlphabet, activeCategory);

  levels.forEach((lvl, i) => {
    const pos = i + 1; // position within this category (used for unlock/highscore keys)
    const isLocked = pos > unlocked;
    const isCleared = !!localStorage.getItem(LS.cleared(currentAlphabet, activeCategory, pos));
    const hi = localStorage.getItem(LS.highscore(currentAlphabet, activeCategory, pos)) || 0;
    const isBoss = activeCategory === 'master_mix' && pos === levels.length;

    const $card = $(`
      <div class="level-card ${isLocked ? 'locked' : ''} ${isCleared ? 'cleared' : ''} ${isBoss ? 'boss' : ''}">
        <div class="lc-name">${lvl.name}</div>
        <div class="lc-high">${isLocked ? '🔒' : 'Best: ' + hi}</div>
      </div>`);

    if (!isLocked) {
      $card.on('click', () => startLevel(currentAlphabet, activeCategory, lvl, pos));
    }
    $grid.append($card);
  });
}

function getUnlockedCount(alpha, cat) {
  const raw = localStorage.getItem(LS.unlocked(alpha, cat));
  return raw ? parseInt(raw, 10) : 1;
}

function firstResumablePosition(alpha, cat) {
  const unlocked = getUnlockedCount(alpha, cat);
  const levels = levelsFor(alpha, cat);
  return Math.min(unlocked, levels.length);
}

/* ---------------------------------------------------------------------- */
/* Play screen / round logic                                              */
/* ---------------------------------------------------------------------- */

function startLevel(alpha, category, levelMeta, pos) {
  currentAlphabet = alpha;
  activeCategory = category;
  activeLevelMeta = levelMeta;
  activeLevelPos = pos;

  state.score = 0;
  state.point = 0;
  state.timeLeft = levelMeta.time;
  state.locked = false;

  $('#play_mode_label').text(CATEGORY_LABELS[category] || category);
  $('#play_level_label').text(levelMeta.name);
  updateHud();

  showScreen('play_screen');
  nextQuestion();
  startTimer();
}

function bindPlay() {
  $('#play_input').on('keydown', function (e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      submitAnswer();
    }
  });
}

function nextQuestion() {
  const chars = activeLevelMeta.characters;
  let idx;
  do {
    idx = Math.floor(Math.random() * chars.length);
  } while (chars.length > 1 && idx === state.charIdx);
  state.charIdx = idx;

  $('#play_question').text(chars[idx]).removeClass('shake pop');
  $('#play_feedback').text('');
  $('#play_input').val('').prop('disabled', false).trigger('focus');
}

function submitAnswer() {
  if (state.locked) return;
  const raw = $('#play_input').val().trim().toLowerCase();
  if (!raw) return;

  const idx = state.charIdx;
  const accepted = activeLevelMeta.aliases[idx] || [activeLevelMeta.value[idx]];
  const correct = accepted.includes(raw);

  if (correct) {
    state.score += 5;
    state.point += 5;
  } else {
    state.point -= 5;
  }
  updateHud();

  const $char = $('#play_question');
  $char.removeClass('shake pop');
  void $char[0].offsetWidth;
  $char.addClass(correct ? 'pop' : 'shake');

  if (state.point >= activeLevelMeta.max_point) {
    finishRound(true);
    return;
  }
  if (state.point < 0) {
    finishRound(false);
    return;
  }

  if (settings.speedrun) {
    nextQuestion();
  } else {
    state.locked = true;
    $('#play_input').prop('disabled', true);
    if (!correct) {
      $('#play_feedback')
        .removeClass('correct')
        .text(`Salah! ${activeLevelMeta.characters[idx]} = ${activeLevelMeta.value[idx]}`);
    } else {
      $('#play_feedback').addClass('correct').text('Benar!');
    }
    setTimeout(() => {
      state.locked = false;
      nextQuestion();
    }, 500);
  }
}

function updateHud() {
  $('#play_score').text(state.score);
  $('#play_point').text(state.point);
}

/* ---------------------------------------------------------------------- */
/* Timer                                                                   */
/* ---------------------------------------------------------------------- */

function startTimer() {
  stopTimer();
  updateTimerBar();
  state.timerId = setInterval(() => {
    state.timeLeft -= 1;
    updateTimerBar();
    if (state.timeLeft <= 0) {
      finishRound(state.point >= activeLevelMeta.max_point);
    }
  }, 1000);
}

function stopTimer() {
  if (state.timerId) clearInterval(state.timerId);
  state.timerId = null;
}

function updateTimerBar() {
  const pct = Math.max(0, (state.timeLeft / activeLevelMeta.time) * 100);
  const $fill = $('#timer_fill');
  $fill.css('width', pct + '%');
  $fill.toggleClass('warn', state.timeLeft <= 10);
  $('#timer_text').text(state.timeLeft);
}

/* ---------------------------------------------------------------------- */
/* Round end: game over / level clear                                     */
/* ---------------------------------------------------------------------- */

function finishRound(won) {
  stopTimer();

  const hsKey = LS.highscore(currentAlphabet, activeCategory, activeLevelPos);
  const prevHi = parseInt(localStorage.getItem(hsKey) || '0', 10);
  if (state.score > prevHi) localStorage.setItem(hsKey, String(state.score));

  let unlockedNext = false;
  if (won) {
    localStorage.setItem(LS.cleared(currentAlphabet, activeCategory, activeLevelPos), 'true');
    const unlocked = getUnlockedCount(currentAlphabet, activeCategory);
    const levels = levelsFor(currentAlphabet, activeCategory);
    const isLast = activeLevelPos >= levels.length;
    if (activeLevelPos === unlocked && !isLast) {
      localStorage.setItem(LS.unlocked(currentAlphabet, activeCategory), String(unlocked + 1));
      unlockedNext = true;
    }
  }

  $('#go_score').text(state.score);
  $('#go_point').text(state.point);

  if (won) {
    $('#go_emoji').text('🌸');
    $('#go_title').text('Level Clear!');
    $('#go_status').text(unlockedNext ? 'Level berikutnya sudah terbuka.' : 'Kategori ini sudah selesai — coba kategori lain!');
    $('#btn_next_level').toggleClass('hidden', !unlockedNext);
  } else {
    $('#go_emoji').text('🍂');
    $('#go_title').text('Game Over');
    $('#go_status').text(state.timeLeft <= 0 ? `Waktu habis sebelum mencapai ${activeLevelMeta.max_point} point.` : 'Point kamu jatuh di bawah 0.');
    $('#btn_next_level').addClass('hidden');
  }

  showScreen('game_over');
}

function bindGameOver() {
  $('#btn_replay').on('click', () => startLevel(currentAlphabet, activeCategory, activeLevelMeta, activeLevelPos));
  $('#btn_next_level').on('click', () => {
    const levels = levelsFor(currentAlphabet, activeCategory);
    const next = levels[activeLevelPos]; // levels is 0-indexed, activeLevelPos is 1-indexed -> this is the next one
    if (next) startLevel(currentAlphabet, activeCategory, next, activeLevelPos + 1);
  });
  $('#btn_menu').on('click', () => {
    renderCategoryTabs();
    renderLevelGrid();
    showScreen('menu_screen');
  });
}

function bindMainNav() {
  // click handlers are (re)bound inside renderMainNav() since the buttons are re-created each render
}
