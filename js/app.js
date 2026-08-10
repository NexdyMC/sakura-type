/* ==========================================================================
   SakuraType — app.js
   Game logic, state management, timer, input validation, LocalStorage.
   Data source: hiragana.json (katakana.json / kanji.json can be added later
   by extending DATA_SOURCES below — the rest of the engine is generic).
   ========================================================================== */

const DATA_SOURCES = {
  hiragana: 'data/hiragana.json'
  // katakana: 'katakana.json',
  // kanji: 'kanji.json'
};
const ACTIVE_SCRIPT = 'hiragana'; // switch when katakana/kanji are added

const LS = {
  theme: 'st_theme',
  speedrun: 'st_speedrun',
  unlocked: (cat) => `st_unlocked_${ACTIVE_SCRIPT}_${cat}`,
  cleared:  (cat, lvl) => `st_cleared_${ACTIVE_SCRIPT}_${cat}_${lvl}`,
  highscore: (cat, lvl) => `st_highscore_${ACTIVE_SCRIPT}_${cat}_${lvl}`
};

const CATEGORY_ORDER = ['dasar', 'dakuten', 'handakuten', 'yoon', 'master'];
const CATEGORY_LABEL_FALLBACK = { master: 'Master Mix' };

let DATA = null;           // parsed hiragana.json
let activeCategory = 'dasar';
let activeLevelMeta = null; // { category, level, name, characters, value, aliases, max_point, time }

// Live round state
let state = {
  score: 0,
  point: 0,
  timeLeft: 60,
  timerId: null,
  charIdx: -1,
  locked: false // true while feedback delay is blocking input (non-speedrun)
};

let settings = {
  theme: localStorage.getItem(LS.theme) || 'light',
  speedrun: localStorage.getItem(LS.speedrun) === 'true'
};

/* ---------------------------------------------------------------------- */
/* Bootstrapping                                                          */
/* ---------------------------------------------------------------------- */

$(async function () {
  applyTheme(settings.theme, false);
  $('#setting_speedrun').prop('checked', settings.speedrun);

  try {
    DATA = await fetchJSON(DATA_SOURCES[ACTIVE_SCRIPT]);
  } catch (err) {
    console.error('Gagal memuat data:', err);
    alert('Gagal memuat hiragana.json. Pastikan file ini dibuka lewat server lokal (bukan file://).');
    return;
  }

  bindNav();
  bindSettings();
  bindPlay();
  bindGameOver();

  renderCategoryTabs();
  renderLevelGrid();
});

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
    // Play = jump straight into the first unlocked level of "dasar"
    activeCategory = 'dasar';
    const lvl = firstResumableLevel('dasar');
    startLevel('dasar', lvl);
  });
  $('#btn_levels').on('click', () => {
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
/* Settings                                                                */
/* ---------------------------------------------------------------------- */

function bindSettings() {
  $('#setting_theme .toggle-btn').on('click', function () {
    const theme = $(this).data('theme');
    applyTheme(theme, true);
  });

  $('#setting_speedrun').on('change', function () {
    settings.speedrun = $(this).is(':checked');
    localStorage.setItem(LS.speedrun, String(settings.speedrun));
  });

  $('#btn_delete').on('click', function () {
    if (!confirm('Hapus semua progress, high score, dan setting?')) return;
    Object.keys(localStorage)
      .filter((k) => k.startsWith('st_'))
      .forEach((k) => localStorage.removeItem(k));
    settings = { theme: 'light', speedrun: false };
    applyTheme('light', false);
    $('#setting_speedrun').prop('checked', false);
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
/* Category tabs + level grid                                             */
/* ---------------------------------------------------------------------- */

function renderCategoryTabs() {
  const $row = $('#category_tabs').empty();
  CATEGORY_ORDER.forEach((cat) => {
    const label = cat === 'master'
      ? CATEGORY_LABEL_FALLBACK.master
      : (DATA.categories[cat] ? DATA.categories[cat].label : cat);
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

  if (activeCategory === 'master') {
    const pool = buildMasterPool();
    const hi = localStorage.getItem(`st_highscore_${ACTIVE_SCRIPT}_master`) || 0;
    const $card = $(`
      <div class="level-card master">
        <div class="lc-name">🔀 Master Mix</div>
        <div class="lc-high">${pool.characters.length} karakter · Best: ${hi}</div>
      </div>`);
    $card.on('click', () => startLevel('master', pool));
    $grid.append($card);
    return;
  }

  const levels = DATA.categories[activeCategory].levels;
  const unlocked = getUnlockedCount(activeCategory);

  levels.forEach((lvl) => {
    const isLocked = lvl.level > unlocked;
    const isCleared = !!localStorage.getItem(LS.cleared(activeCategory, lvl.level));
    const hi = localStorage.getItem(LS.highscore(activeCategory, lvl.level)) || 0;

    const $card = $(`
      <div class="level-card ${isLocked ? 'locked' : ''} ${isCleared ? 'cleared' : ''}">
        <div class="lc-name">${lvl.name}</div>
        <div class="lc-high">${isLocked ? '🔒' : 'Best: ' + hi}</div>
      </div>`);

    if (!isLocked) {
      $card.on('click', () => startLevel(activeCategory, lvl));
    }
    $grid.append($card);
  });
}

function getUnlockedCount(cat) {
  const raw = localStorage.getItem(LS.unlocked(cat));
  return raw ? parseInt(raw, 10) : 1; // first level always unlocked
}

function firstResumableLevel(cat) {
  const unlocked = getUnlockedCount(cat);
  const levels = DATA.categories[cat].levels;
  return levels.find((l) => l.level === unlocked) || levels[0];
}

function buildMasterPool() {
  // Combine characters/value/aliases from every unlocked level across every real category
  const characters = [], value = [], aliases = [];
  ['dasar', 'dakuten', 'handakuten', 'yoon'].forEach((cat) => {
    const unlocked = getUnlockedCount(cat);
    DATA.categories[cat].levels
      .filter((l) => l.level <= unlocked)
      .forEach((l) => {
        l.characters.forEach((c, i) => {
          characters.push(c);
          value.push(l.value[i]);
          aliases.push(l.aliases[i]);
        });
      });
  });
  return {
    category: 'master',
    level: null,
    name: 'Master Mix',
    characters, value, aliases,
    max_point: 100,
    time: 60
  };
}

/* ---------------------------------------------------------------------- */
/* Play screen / round logic                                              */
/* ---------------------------------------------------------------------- */

function startLevel(category, levelMeta) {
  activeCategory = category === 'master' ? 'master' : category;
  activeLevelMeta = levelMeta;

  state.score = 0;
  state.point = 0;
  state.timeLeft = levelMeta.time;
  state.locked = false;

  $('#play_mode_label').text(category === 'master' ? 'Master Mix' : DATA.categories[category].label);
  $('#play_level_label').text(levelMeta.name);
  updateHud();
  updateTimerBar();

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
  void $char[0].offsetWidth; // restart animation
  $char.addClass(correct ? 'pop' : 'shake');

  // Win / lose checks
  if (state.point >= activeLevelMeta.max_point) {
    finishRound(true);
    return;
  }
  if (state.point < 0) {
    finishRound(false);
    return;
  }

  if (settings.speedrun) {
    // No delay, no warning text — go straight to the next character.
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

  // Persist high score
  const hsKey = activeCategory === 'master'
    ? `st_highscore_${ACTIVE_SCRIPT}_master`
    : LS.highscore(activeCategory, activeLevelMeta.level);
  const prevHi = parseInt(localStorage.getItem(hsKey) || '0', 10);
  if (state.score > prevHi) localStorage.setItem(hsKey, String(state.score));

  let unlockedNext = false;
  if (won && activeCategory !== 'master') {
    localStorage.setItem(LS.cleared(activeCategory, activeLevelMeta.level), 'true');
    const unlocked = getUnlockedCount(activeCategory);
    const levels = DATA.categories[activeCategory].levels;
    const isLast = activeLevelMeta.level >= levels[levels.length - 1].level;
    if (activeLevelMeta.level === unlocked && !isLast) {
      localStorage.setItem(LS.unlocked(activeCategory), String(unlocked + 1));
      unlockedNext = true;
    }
  }

  $('#go_score').text(state.score);
  $('#go_point').text(state.point);

  if (won) {
    $('#go_emoji').text('🌸');
    $('#go_title').text('Level Clear!');
    $('#go_status').text(activeCategory === 'master'
      ? 'Kerja bagus menaklukkan Master Mix!'
      : (unlockedNext ? 'Level berikutnya sudah terbuka.' : 'Kategori ini sudah selesai — coba Master Mix!'));
    $('#btn_next_level').toggleClass('hidden', !unlockedNext).data('next', unlockedNext);
  } else {
    $('#go_emoji').text('🍂');
    $('#go_title').text('Game Over');
    $('#go_status').text(state.timeLeft <= 0 ? 'Waktu habis sebelum mencapai 100 point.' : 'Point kamu jatuh di bawah 0.');
    $('#btn_next_level').addClass('hidden');
  }

  showScreen('game_over');
}

function bindGameOver() {
  $('#btn_replay').on('click', () => startLevel(activeCategory, activeLevelMeta));
  $('#btn_next_level').on('click', () => {
    const levels = DATA.categories[activeCategory].levels;
    const next = levels.find((l) => l.level === activeLevelMeta.level + 1);
    if (next) startLevel(activeCategory, next);
  });
  $('#btn_menu').on('click', () => {
    renderCategoryTabs();
    renderLevelGrid();
    showScreen('menu_screen');
  });
}
