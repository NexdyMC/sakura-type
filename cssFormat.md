# Catatan sebelum dipakai

- `:root` dan `html.dark` cuma mendefinisikan CSS custom properties (variabel warna), bukan style elemen — jadi tidak bisa diwakili tag `CssFormat`. Tetap taruh di file `.css` terpisah (atau `<style>` kecil), sisanya di bawah masih memakai `var(--sakura-*)` lewat Tailwind arbitrary value.
- `@keyframes` (`loading-spin`, `petal-fall`, `petal-sway`, `shake`, `pop`) juga tidak bisa jadi utility class — tetap disimpan sebagai CSS mentah, dipanggil lewat `tailwind="[animation:nama_durasi_easing_iterasi]"` di tag terkait.
- Selector gabungan seperti `.a, .b, .c` aku pecah jadi beberapa `class` dalam satu tag (dipisah spasi) sesuai instruksi format.
- Pseudo-class/element (`:hover`, `:focus`, `:checked + .slider`, `::before`, `::after`, `:disabled`) dipetakan ke varian Tailwind (`hover:`, `focus:`, `peer-checked:`, `before:`, `after:`, `disabled:`) — untuk kombinasi `input:checked + .slider` kamu perlu tambah class `peer` di `<input>`-nya secara manual.

```html
<CssFormat class="*" tailwind="box-border"></CssFormat>
<CssFormat class="html body" tailwind="h-full"></CssFormat>
<CssFormat class="body" tailwind="bg-[radial-gradient(120%_140%_at_50%_-10%,var(--sakura-bg-soft),var(--sakura-bg)_55%)] text-[var(--sakura-ink)] font-sans relative"></CssFormat>

<CssFormat class="sakura-title hiragana-char go_emoji sakura-emoji" tailwind="font-jp"></CssFormat>
<CssFormat class="sakura-title" tailwind="text-[var(--sakura-accent)] [text-shadow:0_3px_0_var(--sakura-accent-soft)]"></CssFormat>

<CssFormat class="loading-screen" tailwind="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[radial-gradient(120%_140%_at_50%_-10%,var(--sakura-bg-soft),var(--sakura-bg)_55%)] text-[var(--sakura-ink)]"></CssFormat>
<CssFormat class="loading-screen hidden" tailwind="hidden"></CssFormat>
<CssFormat class="loading-emoji" tailwind="[animation:loading-spin_2.2s_linear_infinite]"></CssFormat>
<CssFormat class="loading-title" tailwind="font-jp font-black text-[22px] text-[var(--sakura-accent)]"></CssFormat>
<CssFormat class="loading-status" tailwind="text-[13px] text-[var(--sakura-ink-soft)] mt-1.5"></CssFormat>
<CssFormat class="loading-bar" tailwind="w-[180px] h-1.5 rounded-full bg-[var(--sakura-bg-soft)] border border-[var(--sakura-line)] overflow-hidden mt-4"></CssFormat>
<CssFormat class="loading-bar-fill" tailwind="h-full w-[10%] bg-gradient-to-r from-[var(--sakura-accent)] to-[var(--sakura-accent-soft)] transition-[width] duration-300 ease-in-out"></CssFormat>

<CssFormat class="petal-layer" tailwind="fixed inset-0 pointer-events-none z-0 overflow-hidden hidden"></CssFormat>
<CssFormat class="petal-layer active" tailwind="block"></CssFormat>
<CssFormat class="petal" tailwind="absolute top-[-5%] w-3 h-3 bg-gradient-to-br from-[var(--sakura-accent-soft)] to-[var(--sakura-accent)] rounded-[60%_10%_60%_10%] opacity-55 [animation-name:petal-fall,petal-sway] [animation-timing-function:linear,ease-in-out] [animation-iteration-count:infinite,infinite] will-change-transform"></CssFormat>

<CssFormat class="app_shell" tailwind="relative z-[1]"></CssFormat>
<CssFormat class="app_shell hidden" tailwind="hidden"></CssFormat>

<CssFormat class="main-nav" tailwind="flex gap-2 bg-[var(--sakura-surface)] border border-[var(--sakura-line)] rounded-full p-[5px] mb-[18px] shadow-[0_8px_20px_-14px_rgba(232,84,122,.5)]"></CssFormat>
<CssFormat class="main-nav-btn" tailwind="flex-1 font-jp font-bold text-[13px] py-[9px] px-[10px] rounded-full border-none bg-transparent text-[var(--sakura-ink-soft)] cursor-pointer transition-all duration-[180ms] ease-in-out"></CssFormat>
<CssFormat class="main-nav-btn active" tailwind="bg-[var(--sakura-accent)] text-white"></CssFormat>
<CssFormat class="main-nav-btn disabled" tailwind="opacity-35 cursor-not-allowed line-through"></CssFormat>

<CssFormat class="screen hidden" tailwind="hidden"></CssFormat>

<CssFormat class="card" tailwind="bg-[var(--sakura-surface)] border border-[var(--sakura-line)] rounded-[18px] px-5 py-[18px] shadow-[0_8px_24px_-14px_rgba(232,84,122,.45)]"></CssFormat>

<CssFormat class="btn-primary btn-secondary btn-danger" tailwind="font-sans font-bold text-[15px] rounded-full py-[13px] px-6 cursor-pointer border-none transition-[transform,box-shadow,opacity] duration-150 ease-in-out"></CssFormat>
<CssFormat class="btn-primary btn-secondary btn-danger" tailwind="active:scale-[.96]"></CssFormat>
<CssFormat class="btn-primary" tailwind="bg-gradient-to-br from-[var(--sakura-accent)] to-[var(--sakura-accent-soft)] text-white shadow-[0_8px_20px_-8px_rgba(232,84,122,.6)]"></CssFormat>
<CssFormat class="btn-primary" tailwind="disabled:opacity-45 disabled:cursor-not-allowed disabled:shadow-none"></CssFormat>
<CssFormat class="btn-secondary" tailwind="bg-[var(--sakura-bg-soft)] text-[var(--sakura-accent)] border-2 border-[var(--sakura-accent-soft)]"></CssFormat>
<CssFormat class="btn-danger" tailwind="bg-transparent text-[var(--sakura-bad)] border-2 border-[var(--sakura-bad)] py-2 px-[18px] text-[13px] rounded-full"></CssFormat>
<CssFormat class="btn-back" tailwind="bg-[var(--sakura-bg-soft)] text-[var(--sakura-ink-soft)] border-none w-9 h-9 rounded-full text-base cursor-pointer"></CssFormat>

<CssFormat class="toggle-group" tailwind="flex bg-[var(--sakura-bg-soft)] rounded-full p-1 border border-[var(--sakura-line)]"></CssFormat>
<CssFormat class="toggle-btn" tailwind="border-none bg-transparent font-sans font-bold text-xs py-2 px-[14px] rounded-full cursor-pointer text-[var(--sakura-ink-soft)]"></CssFormat>
<CssFormat class="toggle-btn active" tailwind="bg-[var(--sakura-accent)] text-white"></CssFormat>

<CssFormat class="switch" tailwind="relative inline-block w-[50px] h-7 shrink-0"></CssFormat>
<CssFormat class="switch input" tailwind="opacity-0 w-0 h-0"></CssFormat>
<CssFormat class="slider" tailwind="absolute inset-0 cursor-pointer bg-[var(--sakura-line)] rounded-full transition-colors duration-200 ease-in-out before:content-[''] before:absolute before:h-[22px] before:w-[22px] before:left-[3px] before:top-[3px] before:bg-white before:rounded-full before:transition-transform before:duration-200 before:ease-in-out before:shadow-[0_2px_6px_rgba(0,0,0,.25)]"></CssFormat>
<CssFormat class="switch input:checked + slider" tailwind="peer-checked:bg-[var(--sakura-accent)] peer-checked:before:translate-x-[22px]"></CssFormat>

<CssFormat class="tab-row" tailwind="flex gap-2 overflow-x-auto pb-1 [-webkit-overflow-scrolling:touch] [&::-webkit-scrollbar]:h-1"></CssFormat>
<CssFormat class="cat-tab" tailwind="flex-none font-sans font-bold text-[13px] whitespace-nowrap py-[9px] px-4 rounded-full border-2 border-[var(--sakura-line)] bg-[var(--sakura-surface)] text-[var(--sakura-ink-soft)] cursor-pointer transition-all duration-[180ms] ease-in-out"></CssFormat>
<CssFormat class="cat-tab active" tailwind="bg-[var(--sakura-accent)] border-[var(--sakura-accent)] text-white"></CssFormat>

<CssFormat class="level-grid" tailwind="grid grid-cols-3 gap-3 [@media(min-width:480px)]:grid-cols-4"></CssFormat>
<CssFormat class="level-card" tailwind="relative bg-[var(--sakura-surface)] border-2 border-[var(--sakura-line)] rounded-[14px] pt-[14px] px-2 pb-[10px] text-center cursor-pointer transition-[transform,border-color] duration-150 ease-in-out font-sans"></CssFormat>
<CssFormat class="level-card:not(.locked):hover" tailwind="hover:-translate-y-[3px] hover:border-[var(--sakura-accent-soft)]"></CssFormat>
<CssFormat class="lc-name" tailwind="font-jp font-black text-sm text-[var(--sakura-accent)] leading-[1.25]"></CssFormat>
<CssFormat class="lc-high" tailwind="text-[10px] text-[var(--sakura-ink-soft)] mt-1"></CssFormat>
<CssFormat class="level-card cleared" tailwind="border-[var(--sakura-good)] after:content-['✓'] after:absolute after:-top-[7px] after:-right-[7px] after:w-5 after:h-5 after:bg-[var(--sakura-good)] after:text-white after:rounded-full after:text-[11px] after:flex after:items-center after:justify-center"></CssFormat>
<CssFormat class="level-card locked" tailwind="opacity-40 cursor-not-allowed"></CssFormat>
<CssFormat class="level-card boss" tailwind="col-span-full bg-gradient-to-br from-[var(--sakura-accent)] to-[var(--sakura-accent-soft)]"></CssFormat>
<CssFormat class="level-card boss lc-name lc-high" tailwind="text-white"></CssFormat>

<CssFormat class="empty-state" tailwind="col-span-full text-center py-6 px-3 text-[var(--sakura-ink-soft)] text-[13px]"></CssFormat>

<CssFormat class="navbar" tailwind="bg-[var(--sakura-surface)] border border-[var(--sakura-line)] rounded-full py-2 px-[18px]"></CssFormat>

<CssFormat class="timer-bar" tailwind="relative h-[26px] bg-[var(--sakura-bg-soft)] border border-[var(--sakura-line)] rounded-full overflow-hidden"></CssFormat>
<CssFormat class="timer-fill" tailwind="h-full w-full bg-gradient-to-r from-[var(--sakura-accent)] to-[var(--sakura-accent-soft)] [transition:width_1s_linear,background_.3s_ease]"></CssFormat>
<CssFormat class="timer-fill warn" tailwind="bg-gradient-to-r from-[var(--sakura-bad)] to-[#f2a154]"></CssFormat>
<CssFormat class="timer-text" tailwind="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-xs font-bold text-[var(--sakura-ink)]"></CssFormat>

<CssFormat class="hiragana-char" tailwind="text-[var(--sakura-ink)] transition-[transform,color] duration-[120ms] ease-in-out"></CssFormat>
<CssFormat class="hiragana-char shake" tailwind="[animation:shake_.35s_ease] text-[var(--sakura-bad)]"></CssFormat>
<CssFormat class="hiragana-char pop" tailwind="[animation:pop_.35s_ease]"></CssFormat>

<CssFormat class="input-answer" tailwind="w-full max-w-[280px] font-sans text-xl text-center p-[14px] rounded-[14px] border-2 border-[var(--sakura-line)] bg-[var(--sakura-surface)] text-[var(--sakura-ink)] outline-none transition-colors duration-200 ease-in-out focus:border-[var(--sakura-accent)]"></CssFormat>

<CssFormat class="kbd" tailwind="bg-[var(--sakura-bg-soft)] border border-[var(--sakura-line)] rounded [padding:1px_6px] font-sans"></CssFormat>
```