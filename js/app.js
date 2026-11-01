/* ==========================================================================
   SakuraType — app.js
   Loading screen, multi-alphabet navbar (Hiragana/Katakana/Kanji N5/Kanji N4),
   JSON-driven sub-tabs & level grid, timer, scoring, LocalStorage progress.
   ========================================================================== */

const DATA_SOURCES = {
  hiragana: 'data/hiragana.json',
  katakana: 'data/katakana.json',
  kanji_n5: 'data/kanji.json',
  kanji_n4: 'data/kanji-n4.json'
};

const CATEGORY_LABELS = {
  // Hiragana / Katakana
  gojuon: 'Gojūon',
  dakuten_handakuten: 'Dakuten & Handakuten',
  yoon: 'Yōon',

  // Kanji N5
  angka: 'Angka',
  waktu: 'Waktu',
  alam: 'Alam',
  orang_tubuh: 'Orang & Tubuh',
  kata_kerja: 'Kata Kerja',
  arah_tempat: 'Arah & Tempat',
  sifat: 'Sifat',

  // Kanji N4
  transportasi: 'Transportasi & Jalan',
  sekolah_belajar: 'Belajar & Sekolah',
  belanja_ekonomi: 'Belanja & Ekonomi',
  kegiatan_kerja: 'Kegiatan & Kerja',
  keluarga_sosial: 'Keluarga & Sosial',
  cuaca_alam: 'Cuaca & Alam',
  sifat_kondisi: 'Sifat & Kondisi',

  // Shared
  master_mix: 'Master Mix'
};

const CATEGORY_ORDER_BY_ALPHA = {
  hiragana: ['gojuon', 'dakuten_handakuten', 'yoon', 'master_mix'],
  katakana: ['gojuon', 'dakuten_handakuten', 'yoon', 'master_mix'],
  kanji_n5: ['angka', 'waktu', 'alam', 'orang_tubuh', 'kata_kerja', 'arah_tempat', 'sifat', 'master_mix'],
  kanji_n4: ['transportasi', 'sekolah_belajar', 'belanja_ekonomi', 'kegiatan_kerja', 'keluarga_sosial', 'cuaca_alam', 'sifat_kondisi', 'master_mix']
};

const LS = {
  theme: 'st_theme',
  speedrun: 'st_speedrun',
  sakuraFall: 'st_sakura_fall',
  kanjiMode: 'st_kanji_mode',
  unlocked: (alpha, cat) => `st_unlocked_${alpha}_${cat}`,
  cleared:  (alpha, cat, pos) => `st_cleared_${alpha}_${cat}_${pos}`,
  highscore: (alpha, cat, pos) => `st_highscore_${alpha}_${cat}_${pos}`
};

let DATA = {};        // { hiragana: [...], katakana: [...], kanji_n5: [...], kanji_n4: [...] }
let AVAILABLE = {};   // { hiragana: true, katakana: true, kanji_n5: true, kanji_n4: true }

let currentAlphabet = 'hiragana';
let activeCategory = 'gojuon';
let activeLevelMeta = null;   // the level object currently being played
let activeLevelPos = null;    // 1-based position within its category

let kanjiQuizMode = localStorage.getItem(LS.kanjiMode) || 'both'; // 'both' | 'reading' | 'meaning'
let currentQuestionType = 'reading'; // 'reading' | 'meaning'

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

function isKanjiAlphabet(alpha) {
  return alpha === 'kanji_n5' || alpha === 'kanji_n4' || alpha === 'kanji';
}

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
  bindKanjiMode();

  const firstAvailable = Object.keys(DATA_SOURCES).find((a) => AVAILABLE[a]);
  currentAlphabet = firstAvailable || 'hiragana';
  activeCategory = firstAvailableCategory(currentAlphabet);

  renderMainNav();
  renderCategoryTabs();
  renderLevelGrid();
  updateMenuAlphabetLabel();
  updateKanjiModeUI();

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
      AVAILABLE[alpha] = Array.isArray(DATA[alpha]) && DATA[alpha].length > 0;
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
    activeCategory = firstAvailableCategory(currentAlphabet) || activeCategory;
    if (!activeCategory) return;
    const pos = firstResumablePosition(currentAlphabet, activeCategory);
    const levels = levelsFor(currentAlphabet, activeCategory);
    startLevel(currentAlphabet, activeCategory, levels[pos - 1], pos);
  });
  $('#btn_levels').on('click', () => {
    activeCategory = firstAvailableCategory(currentAlphabet) || activeCategory;
    renderCategoryTabs();
    renderLevelGrid();
    updateKanjiModeUI();
    showScreen('category_level_screen');
  });
  $('#btn_setting').on('click', () => showScreen('setting_screen'));
  $(document).on('click', '.btn-back', function () {
    stopTimer();
    showScreen($(this).data('back'));
  });
}

/* ---------------------------------------------------------------------- */
/* Main navbar: Hiragana / Katakana / Kanji N5 / Kanji N4                 */
/* ---------------------------------------------------------------------- */

function renderMainNav() {
  const $nav = $('#main_nav').empty();
  Object.keys(DATA_SOURCES).forEach((alpha) => {
    const label = {
      hiragana: 'あ Hiragana',
      katakana: 'ア Katakana',
      kanji_n5: '漢 Kanji N5',
      kanji_n4: '漢 Kanji N4'
    }[alpha] || alpha;

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
        updateKanjiModeUI();
      });
    }
    $nav.append($btn);
  });
}

function updateMenuAlphabetLabel() {
  const label = {
    hiragana: 'Hiragana',
    katakana: 'Katakana',
    kanji_n5: 'Kanji N5',
    kanji_n4: 'Kanji N4'
  }[currentAlphabet] || currentAlphabet;
  $('#menu_alphabet_label').text(label);
}

function bindKanjiMode() {
  $('#kanji_mode_selector .toggle-btn').on('click', function () {
    kanjiQuizMode = $(this).data('mode');
    localStorage.setItem(LS.kanjiMode, kanjiQuizMode);
    $('#kanji_mode_selector .toggle-btn').removeClass('active');
    $(this).addClass('active');
  });
}

function updateKanjiModeUI() {
  const isKanji = isKanjiAlphabet(currentAlphabet);
  $('#kanji_mode_selector').toggleClass('hidden', !isKanji);
  $('#kanji_mode_selector .toggle-btn').removeClass('active');
  $(`#kanji_mode_selector .toggle-btn[data-mode="${kanjiQuizMode}"]`).addClass('active');
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
    kanjiQuizMode = 'both';
    applyTheme('light', false);
    $('#setting_speedrun').prop('checked', false);
    $('#setting_sakura_fall').prop('checked', true);
    applySakuraFall(true);
    updateKanjiModeUI();
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
  const order = CATEGORY_ORDER_BY_ALPHA[alpha] || [];
  const known = order.filter((c) => set.has(c));
  set.forEach((c) => {
    if (!known.includes(c)) known.push(c);
  });
  return known;
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
    const label = CATEGORY_LABELS[cat] || cat;
    const $btn = $(`<button class="cat-tab" data-cat="${cat}">${label}</button>`);
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
    const pos = i + 1;
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

  const catLabel = CATEGORY_LABELS[category] || category;
  $('#play_mode_label').text(catLabel);
  $('#play_level_label').text(levelMeta.name);
  updateHud();

  // Adjust style for kanji vs kana
  const $q = $('#play_question');
  if (isKanjiAlphabet(alpha)) {
    $q.addClass('kanji-mode');
  } else {
    $q.removeClass('kanji-mode');
  }

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

  const isKanji = isKanjiAlphabet(currentAlphabet);

  // Tentukan jenis pertanyaan (bacaan vs arti)
  if (isKanji) {
    if (kanjiQuizMode === 'reading') {
      currentQuestionType = 'reading';
    } else if (kanjiQuizMode === 'meaning') {
      currentQuestionType = 'meaning';
    } else {
      // 'both' -> acak 50:50
      currentQuestionType = Math.random() < 0.5 ? 'reading' : 'meaning';
    }
  } else {
    currentQuestionType = 'reading';
  }

  // Update prompt badge & placeholder
  const $badge = $('#play_prompt_type');
  const $input = $('#play_input');

  if (isKanji) {
    $badge.removeClass('hidden');
    if (currentQuestionType === 'meaning') {
      $badge.text('Arti Bahasa Indonesia');
      $input.attr('placeholder', 'ketik arti...');
    } else {
      $badge.text('Bacaan (Romaji)');
      $input.attr('placeholder', 'ketik romaji...');
    }
  } else {
    $badge.addClass('hidden');
    $input.attr('placeholder', 'ketik romaji...');
  }

  $('#play_question').text(chars[idx]).removeClass('shake pop');
  $('#play_feedback').text('');
  $input.val('').prop('disabled', false).trigger('focus');
}

function cleanInput(str) {
  return (str || '')
    .toLowerCase()
    .trim()
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, '')
    .replace(/\s+/g, ' ');
}

function submitAnswer() {
  if (state.locked) return;
  const raw = cleanInput($('#play_input').val());
  if (!raw) return;

  const idx = state.charIdx;
  let accepted = [];

  if (currentQuestionType === 'meaning') {
    const primaryMeaning = cleanInput(activeLevelMeta.meaning ? activeLevelMeta.meaning[idx] : '');
    const aliases = (activeLevelMeta.meaning_aliases && activeLevelMeta.meaning_aliases[idx]) || [];
    accepted = [primaryMeaning, ...aliases.map(cleanInput)].filter(Boolean);
  } else {
    const primaryVal = cleanInput(activeLevelMeta.value[idx]);
    const aliases = (activeLevelMeta.aliases && activeLevelMeta.aliases[idx]) || [];
    accepted = [primaryVal, ...aliases.map(cleanInput)].filter(Boolean);
  }

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
      if (isKanjiAlphabet(currentAlphabet)) {
        const readings = (activeLevelMeta.aliases && activeLevelMeta.aliases[idx]) 
          ? activeLevelMeta.aliases[idx].slice(0, 3).join(', ') 
          : activeLevelMeta.value[idx];
        const meaning = activeLevelMeta.meaning ? activeLevelMeta.meaning[idx] : '';
        $('#play_feedback')
          .removeClass('correct')
          .text(`Salah! ${activeLevelMeta.characters[idx]} = ${readings} · ${meaning}`);
      } else {
        $('#play_feedback')
          .removeClass('correct')
          .text(`Salah! ${activeLevelMeta.characters[idx]} = ${activeLevelMeta.value[idx]}`);
      }
    } else {
      $('#play_feedback').addClass('correct').text('Benar!');
    }
    setTimeout(() => {
      state.locked = false;
      nextQuestion();
    }, 600);
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
    const next = levels[activeLevelPos];
    if (next) startLevel(currentAlphabet, activeCategory, next, activeLevelPos + 1);
  });
  $('#btn_menu').on('click', () => {
    renderCategoryTabs();
    renderLevelGrid();
    showScreen('menu_screen');
  });
}

function bindMainNav() {
  // click handlers are bound inside renderMainNav()
}
