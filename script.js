// Simple interactive candle script
const toggleBtn = document.getElementById('toggle-btn');
const candle = document.getElementById('candle');
const flame = document.getElementById('flame');
const brightnessEl = document.getElementById('brightness');
const darknessEl = document.getElementById('darkness');
const overlay = document.getElementById('overlay');
const skinSelect = document.getElementById('skin-select');

const musicToggle = document.getElementById('music-toggle');
const musicVol = document.getElementById('music-vol');
const bgMusic = document.getElementById('bg-music');

const skinFile = document.getElementById('skin-file');
const clearSkin = document.getElementById('clear-skin');
const bgColor = document.getElementById('bg-color');
const fullscreenOpt = document.getElementById('fullscreen-opt');
const optionsSubmit = document.getElementById('options-submit');

const crackle = document.getElementById('crackle');
const enableCrackle = document.getElementById('enable-crackle');

let isOn = true;
let flickerRunning = true;
let flickerRAF = null;

// track object URLs to avoid leaks
let pendingSkinObjectURL = null;
let appliedSkinObjectURL = null;

// replace immediate initialization with pending options object
const pendingOptions = {
  skinPreset: skinSelect ? skinSelect.value : 'classic',
  skinFileURL: null,
  useSkinFile: false,
  bgColor: bgColor ? bgColor.value : getComputedStyle(document.documentElement).getPropertyValue('--scene-color') || 'transparent',
  brightness: brightnessEl ? brightnessEl.value : '1',
  darkness: darknessEl ? darknessEl.value : '0.35',
  crackle: enableCrackle ? enableCrackle.checked : false,
  musicPlaying: bgMusic ? !bgMusic.paused : false,
  musicVolume: musicVol ? musicVol.value : (bgMusic ? bgMusic.volume : 0.6),
  fullscreen: fullscreenOpt ? fullscreenOpt.checked : false
};

// initialize CSS vars from current defaults (visuals still reflect initial state)
document.documentElement.style.setProperty('--flame-brightness', pendingOptions.brightness);
document.documentElement.style.setProperty('--overlay-opacity', pendingOptions.darkness);
document.documentElement.style.setProperty('--scene-color', pendingOptions.bgColor);

// ensure initial button text sync
if (musicToggle) musicToggle.textContent = (bgMusic && !bgMusic.paused) ? 'Pause Music' : 'Play Music';
if (toggleBtn) toggleBtn.textContent = isOn ? 'Turn Off' : 'Turn On';

// Toggle candle on/off (flame hidden via CSS .candle.off)
function setCandle(on){
  isOn = !!on;
  candle.classList.toggle('off', !isOn);
  toggleBtn.textContent = isOn ? 'Turn Off' : 'Turn On';
  toggleBtn.setAttribute('aria-pressed', String(!isOn));
  candle.setAttribute('aria-pressed', String(isOn));
  if(!isOn){
    if(flickerRunning) stopFlicker();
  } else {
    if(!flickerRunning) startFlicker();
  }
  updateCrackle();
}

toggleBtn.addEventListener('click', () => setCandle(!isOn));

// make candle clickable
candle.addEventListener('click', () => setCandle(!isOn));
candle.addEventListener('keydown', (e) => {
  if(e.key === ' ' || e.key === 'Enter'){
    e.preventDefault();
    setCandle(!isOn);
  }
});

// skin selection: update pending options only (do not change live DOM until Apply)
if(skinSelect){
  skinSelect.addEventListener('change', (e) => {
    pendingOptions.skinPreset = e.target.value;
    pendingOptions.useSkinFile = false;
    pendingOptions.skinFileURL = null;
    // if user changed presets remove any pending file URL (but do not touch applied skin)
    if(pendingSkinObjectURL){
      URL.revokeObjectURL(pendingSkinObjectURL);
      pendingSkinObjectURL = null;
    }
  });
}

// brightness control: update pending only
if(brightnessEl){
  brightnessEl.addEventListener('input', (e) => {
    pendingOptions.brightness = e.target.value;
  });
}

// darkness control: pending only
if(darknessEl){
  darknessEl.addEventListener('input', (e) => {
    pendingOptions.darkness = e.target.value;
  });
}

// Music controls: pending toggles; Apply commits
if(musicToggle){
  musicToggle.addEventListener('click', () => {
    pendingOptions.musicPlaying = !pendingOptions.musicPlaying;
    musicToggle.textContent = pendingOptions.musicPlaying ? 'Pause Music' : 'Play Music';
  });
}
if(musicVol){
  musicVol.addEventListener('input', (e) => {
    pendingOptions.musicVolume = parseFloat(e.target.value);
  });
}

// skin image upload: pending URL kept until Apply; revoke previous pending URL when replaced
if(skinFile){
  skinFile.addEventListener('change', (e) => {
    const f = e.target.files && e.target.files[0];
    if(!f){
      if(pendingSkinObjectURL){ URL.revokeObjectURL(pendingSkinObjectURL); pendingSkinObjectURL = null; }
      pendingOptions.skinFileURL = null;
      pendingOptions.useSkinFile = false;
      return;
    }
    // revoke any previous pending
    if(pendingSkinObjectURL){ URL.revokeObjectURL(pendingSkinObjectURL); pendingSkinObjectURL = null; }
    const url = URL.createObjectURL(f);
    pendingSkinObjectURL = url;
    pendingOptions.skinFileURL = url;
    pendingOptions.useSkinFile = true;
  });
}

// clear pending skin selection (does not affect currently applied skin until Apply)
if(clearSkin){
  clearSkin.addEventListener('click', () => {
    if(pendingSkinObjectURL){ URL.revokeObjectURL(pendingSkinObjectURL); pendingSkinObjectURL = null; }
    pendingOptions.skinFileURL = null;
    pendingOptions.useSkinFile = false;
    if(skinFile) skinFile.value = '';
  });
}

// background color chooser: pending only
if(bgColor){
  bgColor.addEventListener('input', (e) => {
    pendingOptions.bgColor = e.target.value;
  });
}

// crackle option pending
if(enableCrackle){
  enableCrackle.addEventListener('change', (e) => {
    pendingOptions.crackle = e.target.checked;
  });
}

// fullscreen option pending
if(fullscreenOpt){
  fullscreenOpt.addEventListener('change', (e) => {
    pendingOptions.fullscreen = !!e.target.checked;
  });
}

// apply all pending options when user clicks Apply
if(optionsSubmit){
  optionsSubmit.addEventListener('click', () => {
    applyOptions(pendingOptions);
    // close details if open (visual tidy)
    const optionsEl = document.querySelector('.options');
    if(optionsEl) optionsEl.open = false;
  });
}

// applyOptions: commit pending options into the live UI
function applyOptions(opts){
  // skin preset
  candle.classList.remove('classic','striped','green');
  candle.classList.add(opts.skinPreset || 'classic');
  const bodyEl = candle.querySelector('.body');

  // custom skin file takes precedence
  if(opts.useSkinFile && opts.skinFileURL){
    // revoke previously applied object URL if different
    if(appliedSkinObjectURL && appliedSkinObjectURL !== opts.skinFileURL){
      try{ URL.revokeObjectURL(appliedSkinObjectURL); }catch(e){}
    }
    bodyEl.style.backgroundImage = `url("${opts.skinFileURL}")`;
    bodyEl.style.backgroundSize = 'cover';
    bodyEl.style.backgroundPosition = 'center';
    candle.classList.add('custom-skin');
    appliedSkinObjectURL = opts.skinFileURL;
    // once applied, pending one is now "applied" — don't revoke it here
    pendingSkinObjectURL = null;
  } else {
    // clear applied skin (revoke previously applied object URL if present)
    if(appliedSkinObjectURL){
      try{ URL.revokeObjectURL(appliedSkinObjectURL); }catch(e){}
      appliedSkinObjectURL = null;
    }
    bodyEl.style.backgroundImage = '';
    candle.classList.remove('custom-skin');
  }

  // visuals
  document.documentElement.style.setProperty('--scene-color', opts.bgColor || 'transparent');
  document.documentElement.style.setProperty('--flame-brightness', opts.brightness);
  document.documentElement.style.setProperty('--overlay-opacity', opts.darkness);

  // audio commit
  bgMusic.volume = parseFloat(opts.musicVolume || 0.6);
  if(opts.musicPlaying){
    bgMusic.play().catch(()=>{ /* may be blocked */ });
    musicToggle.textContent = 'Pause Music';
  } else {
    bgMusic.pause();
    musicToggle.textContent = 'Play Music';
  }

  // If music was enabled on Apply, show GOTCHA screen; otherwise hide it
  if (opts.musicPlaying) {
    showGotcha();
  } else {
    hideGotcha();
  }

  // commit crackle option and refresh state
  enableCrackle.checked = !!opts.crackle;
  updateCrackle();

  // fullscreen handling
  if(opts.fullscreen){
    enterFullscreenMode();
  } else {
    exitFullscreenMode();
  }
}

// GOTCHA overlay helpers
let _gotchaEl = null;
function createGotcha(){
  if(_gotchaEl) return _gotchaEl;
  const el = document.createElement('div');
  el.className = 'gotcha-screen';
  el.innerHTML = '<div class="gotcha-content">GOTCHA!</div>';
  el.addEventListener('click', hideGotcha);
  document.addEventListener('keydown', _gotchaKeyHandler);
  document.body.appendChild(el);
  _gotchaEl = el;
  return el;
}
function showGotcha(){
  const el = createGotcha();
  el.style.display = 'flex';
  // ensure it's on top
  el.focus?.();
}
function hideGotcha(){
  if(!_gotchaEl) return;
  _gotchaEl.style.display = 'none';
}
function _gotchaKeyHandler(e){
  if(e.key === 'Escape'){
    hideGotcha();
  }
}

// Fullscreen helpers: pseudo-fullscreen + attempt Fullscreen API
function enterFullscreenMode(){
  document.body.classList.add('fullscreen-mode');
  const sceneEl = document.getElementById('scene');
  if(sceneEl) sceneEl.setAttribute('tabindex','-1');

  const el = document.documentElement;
  if(el.requestFullscreen){
    el.requestFullscreen().catch(()=>{ /* ignore; pseudo mode remains */ });
  }
}

function exitFullscreenMode(){
  if(document.fullscreenElement && document.exitFullscreen){
    document.exitFullscreen().catch(()=>{ /* ignore */ });
  }
  document.body.classList.remove('fullscreen-mode');
  const sceneEl = document.getElementById('scene');
  if(sceneEl) sceneEl.removeAttribute('tabindex');
}

// keep pseudo-fullscreen in sync with native fullscreen changes
document.addEventListener('fullscreenchange', () => {
  if(!document.fullscreenElement){
    document.body.classList.remove('fullscreen-mode');
  } else {
    document.body.classList.add('fullscreen-mode');
  }
});

// Esc exits either fullscreen or pseudo-fullscreen
document.addEventListener('keydown', (e) => {
  if(e.key === 'Escape'){
    if(document.fullscreenElement || document.body.classList.contains('fullscreen-mode')){
      exitFullscreenMode();
    }
  }
});

// crackle control logic
function updateCrackle(){
  const shouldCrackle = isOn && (enableCrackle ? enableCrackle.checked : false) && bgMusic && bgMusic.paused;
  if(!crackle) return;
  if(shouldCrackle){
    if(crackle.paused){
      crackle.volume = 0.35;
      crackle.play().catch(()=>{ /* autoplay blocked until user gesture */ });
    }
  } else {
    if(!crackle.paused){
      crackle.pause();
      crackle.currentTime = 0;
    }
  }
}

// Flicker effect: randomized small transforms and opacity changes for natural look
function flickerStep(){
  if(!isOn){
    flickerRAF = null;
    return;
  }
  const t = performance.now();
  const r = (Math.sin(t / 120) + Math.random() * 0.6) * 0.5;
  const scale = 0.95 + 0.15 * r;
  const rot = (Math.random() - 0.5) * 3;
  const opacity = 0.85 + 0.18 * r;
  const blur = 6 + 12 * parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--flame-brightness') || 1) * r;

  flame.style.transform = `scale(${scale}) rotate(${rot}deg)`;
  flame.style.opacity = Math.max(0, Math.min(1, opacity));
  flame.style.filter = `drop-shadow(0 0 ${Math.max(8, blur)}px rgba(255,150,60,${0.14 + 0.7 * parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--flame-brightness') || 1)}))`;
  flickerRAF = requestAnimationFrame(flickerStep);
}

function startFlicker(){
  if(flickerRAF) return;
  flickerRunning = true;
  flickerRAF = requestAnimationFrame(flickerStep);
}
function stopFlicker(){
  if(flickerRAF) cancelAnimationFrame(flickerRAF);
  flickerRAF = null;
  flickerRunning = false;
  updateCrackle();
}

// Start flicker initially
startFlicker();

// Initialize accessibility states
if(candle) candle.setAttribute('aria-pressed', 'true');
if(toggleBtn) toggleBtn.setAttribute('aria-pressed', 'false');

// Optional: resume music after user interacts with page (useful if autoplay blocked)
document.addEventListener('click', function once(){
  if(bgMusic && !bgMusic.paused && bgMusic.currentTime === 0){
    bgMusic.play().catch(()=>{});
  }
  updateCrackle();
  document.removeEventListener('click', once);
});

// cleanup object URLs on unload
window.addEventListener('beforeunload', () => {
  if(pendingSkinObjectURL) try{ URL.revokeObjectURL(pendingSkinObjectURL); }catch(e){}
  if(appliedSkinObjectURL) try{ URL.revokeObjectURL(appliedSkinObjectURL); }catch(e){}
});