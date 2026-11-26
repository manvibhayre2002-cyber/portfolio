/* Manvi — portfolio behaviour: stage scaling, grid, loader, nav, "work with me". */

/* Fill these in to wire up the contact box. */
const CONTACT = {
  email: 'manvibhayre24@gmail.com',   // only behind the mail icon — chat messages never go to email
  linkedin: 'https://in.linkedin.com/in/manvi-bhayre-82b180273',
  instagram: 'https://www.instagram.com/manviebhayre',
};

const PALETTE = ['#f8d71c', '#e24000', '#457247', '#f57cc3', '#2d4a9d', '#d83b1a', '#fba738'];
let W = 1512, H = 982;
const root = document.documentElement;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

/* ---------- fit the 1512×982 canvas to the viewport ---------- */
const stageEl = document.querySelector('.stage');
const LONG = root.classList.contains('long'); // case studies: fit width, scroll vertically
// phones: case studies are re-flowed into a single readable column (see reflowCaseStudy below)
const CSP = LONG && Math.min(root.clientWidth, screen.width || 9999) < 600;
if (CSP) root.classList.add('cs-phone');

/* ---------- page readiness: fonts + the images you'll see first ----------
   The intro loader waits on this (never more than a few seconds), so the page
   arrives complete instead of images popping in one by one. */
const imgDone = (im) => (im.complete && im.naturalWidth) ? Promise.resolve() :
  new Promise((res) => { im.addEventListener('load', res, { once: true }); im.addEventListener('error', res, { once: true }); });
const PAGE_READY = new Promise((resolve) => {
  const go = () => {
    const near = [...document.images].filter((im) => {
      if (im.loading === 'lazy' && !LONG) return false;
      const r = im.getBoundingClientRect();
      return r.top < innerHeight * 1.4 && r.bottom > -50 && r.width > 0;
    });
    near.forEach((im) => { if (im.loading === 'lazy') im.loading = 'eager'; });
    Promise.all([document.fonts ? document.fonts.ready : 0, ...near.map(imgDone)]).then(resolve);
  };
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', go) : setTimeout(go, 0);
});


/* Case studies (converted from Figma): bump hairline borders and 1px line images
   so they still show after the page is scaled down. Originals are remembered so
   resizing can recompute. */
let lineEls = null;
function thickenLines(s) {
  const minPx = Math.max(0.5, 1 / DPR) / s;           // design px that render as ≥ 1 device pixel
  if (!lineEls) {
    lineEls = [];
    stageEl.querySelectorAll('*').forEach((el) => {
      const cs = getComputedStyle(el);
      const sides = ['Top', 'Right', 'Bottom', 'Left'].map((d) => parseFloat(cs[`border${d}Width`]) || 0);
      const isLineImg = el.tagName === 'IMG' && el.offsetHeight > 0 && el.offsetHeight <= 2 && el.offsetWidth > 12;
      if (sides.some((w) => w > 0 && w < 1.5) || isLineImg) lineEls.push({ el, sides, h: el.offsetHeight, isLineImg });
    });
  }
  // browsers round border widths down to whole device pixels *before* scaling,
  // so pick the smallest width that still lands on ≥ 1 device pixel afterwards
  const minBorder = Math.ceil(1 / s) / DPR;
  lineEls.forEach(({ el, sides, h, isLineImg }) => {
    ['Top', 'Right', 'Bottom', 'Left'].forEach((d, i) => {
      if (sides[i] > 0 && sides[i] < 1.5) el.style[`border${d}Width`] = `${Math.max(sides[i], minBorder)}px`;
    });
    if (isLineImg) el.style.height = `${Math.max(h, minPx * 1.6)}px`;
  });
}

/* ---------- phones: swap in the iPhone design (393 × 852) ---------- */
const PHONE = root.classList.contains('phone');
if (PHONE) {
  const tpl = document.getElementById('phone-tpl');
  stageEl.innerHTML = tpl.innerHTML;
  stageEl.dataset.band = tpl.dataset.band;
  W = 393; H = 852;
  // on the phone the Hey and ABOUT share a spot, so the morph happens in place
  root.style.setProperty('--hey-dx', '-1px');
  root.style.setProperty('--hey-dy', '0px');
}
/* Hairlines: Figma's 0.5–1px lines must stay at least one screen pixel at any scale. */
const DPR = window.devicePixelRatio || 1;
function setHair(target, s) {
  target.style.setProperty('--hair', `${Math.max(1, 1 / s)}px`);
  // half-weight lines (Figma 0.5px); borders snap down to device pixels, so round up to survive it
  target.style.setProperty('--hair-half', `${Math.max(0.5, Math.ceil(1 / s) / DPR, 1 / DPR / s)}px`);
}
function fit() {
  if (CSP) return;   // phone case studies are laid out at real size, no canvas scaling
  if (LONG) {
    const s = root.clientWidth / W;
    root.style.setProperty('--s', s);
    root.style.setProperty('--ox', '0px');
    document.querySelector('.cs-spacer').style.height = `${Number(stageEl.dataset.h) * s}px`;
    thickenLines(s);
    return;
  }
  // Edge-to-edge: header + footer strips span the full width; the content band
  // (data-band="top,bottom" in Figma px) scales as large as fits and is centred between them.
  const vw = root.clientWidth, vh = innerHeight;
  const [bTop, bBot] = (stageEl.dataset.band || '150,860').split(',').map(Number);
  const TOP = 74, BOT = PHONE ? 52 : 66, GAP = PHONE ? 10 : 18;
  // data-anchor="top": keep the Figma gaps under the header exactly (no centring slack)
  const TOPPED = stageEl.dataset.anchor === 'top' && !PHONE;
  const s = TOPPED ? Math.min(vw / W, vh / (bBot + GAP + BOT))
                   : Math.min(vw / W, vh / (TOP + (bBot - bTop) + GAP * 2 + BOT));
  const ox = (vw - W * s) / 2;
  const oy = TOPPED ? 0 : TOP * s + (vh - (TOP + BOT) * s) / 2 - s * (bTop + bBot) / 2;
  root.style.setProperty('--s', s);
  root.style.setProperty('--ox', `${ox}px`);
  root.style.setProperty('--oy', `${oy}px`);
  setHair(root, s);
  // where the header logo (46,20 in the top strip) sits, in stage coordinates — the loader flies there
  root.style.setProperty('--fly-x', `${46 - ox / s - 634}px`);
  root.style.setProperty('--fly-y', `${20 - oy / s - 400}px`);
}
if (!LONG) {
  const strip = (cls, sel) => {
    const el = document.createElement('div');
    el.className = `layer ${cls}`;
    stageEl.querySelectorAll(sel).forEach((n) => el.appendChild(n));
    document.body.appendChild(el);
  };
  strip('layer-top', ':scope > .header-line, :scope > .brand, :scope > .nav, :scope > .burger');
  strip('layer-bottom', ':scope > .foot-line, :scope > .coord');
}

/* ---------- stacked layout: phones + portrait tablets ----------
   The head script adds html.stack when the window is narrow or taller than wide.
   Text moves into normal page flow at readable sizes; illustrations stay pixel-exact
   inside "windows" — cropped, scaled views of the Figma canvas. */
const STACK = root.classList.contains('stack');
const wins = [];
function makeWin(cls, crop, nodes, maxK = 3, inner) {
  const win = document.createElement('div');
  win.className = `win ${cls}`;
  inner = inner || Object.assign(document.createElement('div'), { className: 'win-inner' });
  nodes.forEach((n) => n && inner.appendChild(n));
  win.appendChild(inner);
  Object.assign(win, { _crop: crop, _maxK: maxK, _inner: inner });
  wins.push(win);
  return win;
}
const el = (tag, cls, kids = []) => {
  const n = document.createElement(tag);
  n.className = cls;
  kids.forEach((k) => k && n.appendChild(k));
  return n;
};
const $ = (s) => document.querySelector(s);
let loaderInner = null;
if (STACK) {
  const flow = el('div', 'stack-flow');
  const page = stageEl.dataset.page;
  // the loader gets its own full-screen layer so it can stay centred on any screen
  const loader = $('.loader');
  if (loader) {
    loaderInner = el('div', 'loader-inner', [loader]);
    document.body.appendChild(el('div', 'loader-wrap', [loaderInner]));
  }
  if (page === 'home') {
    const hero = el('section', 'st-hero', [
      el('div', 'st-hi-row', [$('.hi-logo'), el('div', 'st-hi-txt', [$('.hi'), $('.its')])]),
      $('.way'), $('.tagline'),
    ]);
    // pull these out of the stage before the stage itself moves
    const dots = makeWin('win-dots', [1012, 495, 390, 140], [...$('.dot').parentElement.children], 1.4);
    const contact = makeWin('win-contact', [902, 222, 500, 202], [$('#contact')], 1.6);
    // the illustration keeps the stage itself (switch, lamp, lights-out) — cropped to the drawing
    const illus = makeWin('win-illus', [20, 195, 985, 620], [], 3, stageEl);
    flow.append(hero, illus, dots);
    // lights-out needs a page-wide dark layer and the message box as a floating card
    document.body.appendChild(el('div', 'night-page'));
    document.body.appendChild(contact);
  }
  if (page === 'about') {
    const title = makeWin('win-title', [140, 326, 200, 96], [$('h1')], 1.6);
    const cards = el('div', 'st-cards', [...document.querySelectorAll('.card')].sort((a, b) =>
      a.classList.contains('p1') ? -1 : b.classList.contains('p1') ? 1 : a.classList.contains('p2') ? -1 : 1));
    flow.append(title, $('.about-tag'), $('.bio'), cards, $('.notdesign'), $('.hobby-loop'), $('.resume'));
    stageEl.classList.add('st-hidden');
  }
  if (page === 'projects') {
    const head = el('div', 'st-proj-head', [$('.proj-title'), $('.pill').parentElement]);
    const grid = el('div', 'st-grid', [...document.querySelectorAll('.project')]);
    flow.append(head, grid);
    stageEl.classList.add('st-hidden');
  }
  flow.appendChild($('.layer-bottom'));
  document.body.appendChild(flow);
}
function fitStack() {
  const vw = root.clientWidth, vh = innerHeight;
  root.style.setProperty('--sh', Math.min(1, vw / 560));
  setHair(root, Math.min(1, vw / 560));
  root.style.setProperty('--cz', Math.min(1.5, (Math.min(vw, 760) - 48) / 290));
  wins.forEach((w) => {
    const [x, y, cw, ch] = w._crop;
    const k = Math.min(w._maxK, w.clientWidth / cw);
    w.style.height = `${ch * k}px`;
    w._inner.style.transform = `translate(${-x * k}px, ${-y * k}px) scale(${k})`;
    setHair(w._inner, k);
  });
  if (loaderInner) {
    const ls = Math.min(0.62 * vw / 233.128, 0.4 * vh / 182);
    loaderInner.style.transform = `translate(${vw / 2 - 750.5 * ls}px, ${vh / 2 - 491 * ls}px) scale(${ls})`;
  }
}
// crossing between phone / stacked / wide layouts rebuilds the page
const mode = () => innerWidth < 600 ? 'phone' : (innerWidth < 900 || innerWidth / innerHeight < 0.9) ? 'stack' : 'wide';
const MODE = PHONE ? 'phone' : STACK ? 'stack' : 'wide';
if (!LONG) addEventListener('resize', () => { if (mode() !== MODE) location.reload(); });

/* ---------- phone: hamburger menu ---------- */
if (PHONE) {
  const here = location.pathname.split('/').pop() || 'index.html';
  const items = [['Home', 'index.html', '#e24000'], ['About', 'about.html', '#f8d71c'],
                 ['Projects', 'projects.html', '#457247'], ['Journal', null, '#f57cc3']];
  const menu = el('nav', 'ph-menu');
  menu.id = 'ph-menu';
  menu.setAttribute('aria-label', 'Pages');
  menu.innerHTML = items.map(([label, href, c], i) => href
    ? `<a href="${href}" data-page style="--c:${c};--i:${i}"${href === here ? ' aria-current="page"' : ''}><i></i>${label}${href === here ? '<em>here</em>' : ''}</a>`
    : `<span class="soon" style="--c:${c};--i:${i}"><i></i>${label}<em>soon</em></span>`).join('');
  const scrim = el('div', 'ph-scrim');
  document.body.appendChild(scrim);
  document.body.appendChild(menu);
  const burger = $('.burger');
  const toggle = (open) => {
    root.classList.toggle('menu-open', open);
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  };
  burger.setAttribute('aria-controls', 'ph-menu');
  burger.addEventListener('click', () => toggle(!root.classList.contains('menu-open')));
  scrim.addEventListener('click', () => toggle(false));
  menu.querySelectorAll('a[aria-current]').forEach((a) => a.addEventListener('click', () => toggle(false)));
  addEventListener('keydown', (e) => { if (e.key === 'Escape') toggle(false); });
}

/* ---------- phone grid (iPhone frames: 289 × 362 at 49,228) ---------- */
document.querySelectorAll('[data-grid-phone]').forEach((g) => {
  const y = parseFloat(g.dataset.gridPhone) || 228;   // home sits higher (190) than About (228)
  let html = `<div class="a grid-frame" style="left:49px;top:${y}px;width:289px;height:362px"></div>`;
  for (let i = 0; i < 7; i++) html += `<div class="a grid-v" style="left:${85.87 + 36.033 * i}px;top:${y + 0.84}px;height:360.324px"></div>`; // 8th line = frame edge
  for (let j = 0; j < 9; j++) html += `<div class="a grid-h" style="left:49px;top:${y + 38 + 36 * j}px;width:289px"></div>`;
  g.innerHTML = html;
});

/* ---------- phone About: cards pop into the grid as you scroll to them ---------- */
const scroller = PHONE && $('.ph-scroller');
if (scroller) {
  const io = new IntersectionObserver((entries) => entries.forEach((e) =>
    e.target.classList.toggle('in', e.isIntersecting)), { root: scroller, threshold: 0.6 });
  scroller.querySelectorAll('.ph-panel').forEach((p) => io.observe(p));
}
if (STACK) { fitStack(); addEventListener('resize', fitStack); } else { fit(); addEventListener('resize', fit); }

/* ---------- grid (home + about) ---------- */
document.querySelectorAll('[data-grid]').forEach((g) => {
  let html = '<div class="a grid-frame"></div>';
  for (let i = 0; i < 29; i++) html += `<div class="a grid-v" style="left:${149 + 43 * i}px"></div>`;
  for (let j = 0; j < 9; j++) html += `<div class="a grid-h" style="top:${332 + 43 * j}px"></div>`;
  g.innerHTML = html;
});

/* ---------- nav: soft fade between pages ---------- */
document.querySelectorAll('a[data-page]').forEach((a) => {
  a.addEventListener('click', (e) => {
    if (a.getAttribute('aria-current') === 'page' || e.metaKey || e.ctrlKey) return;
    e.preventDefault();
    // Home → About: the Hey slides onto the ABOUT spot, then About takes over (wide layout only)
    if (!STACK && document.querySelector('.hi-logo') && /about\.html$/.test(a.pathname)) {
      try { sessionStorage.setItem('mb-hey', '1'); } catch (_) {}
      root.classList.add('to-about');
      setTimeout(() => (location.href = a.href), 980);
      return;
    }
    // About → Home: ABOUT folds back into the Hey, then Home slides it back
    if (!STACK && document.querySelector('.about-logo') && /(\/|index\.html)$/.test(a.pathname)) {
      try { sessionStorage.setItem('mb-yeh', '1'); } catch (_) {}
      const ghost = document.createElement('img');
      ghost.className = 'a hey-ghost go';
      ghost.src = 'assets/hi-logo-dark.svg';
      ghost.alt = '';
      document.querySelector('.about-logo').before(ghost);
      root.classList.add('to-home');
      setTimeout(() => ghost.classList.remove('go'), 250);   // Hey re-forms as ABOUT wipes away
      setTimeout(() => (location.href = a.href), 900);
      return;
    }
    root.classList.add('leaving');
    setTimeout(() => (location.href = a.href), 280);
  });
});
addEventListener('pageshow', () => {
  root.classList.remove('leaving', 'to-about', 'to-home');
  document.querySelectorAll('.hey-ghost').forEach((g) => g.remove());
});

/* Home, arriving from About: the Hey slides back to its place */
if (root.classList.contains('from-about')) {
  setTimeout(() => {  // after first paint (timer, so it also runs in background tabs)
    root.classList.remove('from-about');                         // glide home
    setTimeout(() => root.classList.remove('hold'), 700);        // rest of Home fades up
    setTimeout(() => root.classList.remove('hey-return'), 1000);
  }, 40);
}

/* About, arriving from Home: Hey → ABOUT */
if (root.classList.contains('from-hey')) {
  const ghost = document.createElement('img');
  ghost.className = 'a hey-ghost';
  ghost.src = 'assets/hi-logo-dark.svg';
  ghost.alt = '';
  document.querySelector('.about-logo').before(ghost);
  setTimeout(() => {  // after first paint (timer, so it also runs in background tabs)
    setTimeout(() => {
      root.classList.add('morph');   // ABOUT wipes out of the Hey, Me slides in
      ghost.classList.add('go');     // the Hey folds away into it
    }, 120);
    setTimeout(() => root.classList.remove('hold'), 650);  // rest of the page + cards
    setTimeout(() => { ghost.remove(); root.classList.remove('from-hey', 'morph'); }, 1400);
  }, 40);
}

/* ---------- loader ---------- */
/* The gaps of the logo (in its own 233×182 box), in the order they cut in.
   [x, y, w, h, axis, origin] — each grows from `origin` like a line entering the box. */
const CUTS = [
  [139.878, 31.571, 11.658, 151.43, 'y', 'bottom'], // slot between M and B
  [93.251, 74.276, 11.658, 108.725, 'y', 'bottom'], // middle leg of M
  [-1, 31.571, 12.655, 151.43, 'y', 'bottom'],      // left of M
  [11.655, 168.99, 81.596, 14.011, 'x', 'left'],    // under M
  [11.655, 31.571, 46.627, 11.135, 'x', 'left'],    // under the bar, left
  [186.506, 31.571, 11.649, 57.566, 'y', 'top'],    // B upper slot
  [93.251, 31.571, 11.658, 11.135, 'y', 'top'],     // M notch under the bar
  [46.624, 74.276, 11.658, 63.161, 'y', 'center'],  // M counter
  [186.506, 120.708, 11.649, 29.722, 'y', 'center'],// B counter
];

async function runLoader() {
  const loader = document.querySelector('.loader');
  if (!root.classList.contains('loading') || !loader) return;
  const sq = loader.querySelector('.loader-sq');

  const cuts = document.createElement('div');
  cuts.className = 'loader-cuts';
  cuts.innerHTML = CUTS.map(([x, y, w, h, axis, o], i) =>
    `<i class="cut ${axis}" style="left:${x}px;top:${y}px;width:${w}px;height:${h}px;transform-origin:${o};transition-delay:${i * 85}ms"></i>`
  ).join('');
  loader.appendChild(cuts); // above the square
  // the cuts follow the logo, wherever this layout put it
  const lg = loader.querySelector('.loader-logo');
  if (lg.style.left) { cuts.style.left = lg.style.left; cuts.style.top = lg.style.top; }

  // colour cycling while it grows
  let k = 0;
  const cycle = setInterval(() => {
    sq.style.backgroundColor = PALETTE[k++ % PALETTE.length];
  }, 150);

  await wait(120);
  loader.classList.add('in');          // tiny square pops in
  await wait(380);
  loader.classList.add('grow');        // grows to the logo's footprint
  await wait(1400);
  clearInterval(cycle);
  sq.style.backgroundColor = '';
  loader.classList.add('settle');      // settles to ink
  await wait(450);
  loader.classList.add('carve');       // lines drive into the box and cut out the M + B
  await wait(CUTS.length * 85 + 650);
  loader.classList.add('swap');        // hand over to the crisp logo artwork
  await wait(300);
  // aim the flight at the header logo, wherever the layout has put it
  const logo = loader.querySelector('.loader-logo');
  const R0 = logo.getBoundingClientRect(), B = $('.brand img').getBoundingClientRect();
  const u = R0.width / 233.128;
  logo.style.setProperty('--fly-x', `${(B.left - R0.left) / u}px`);
  logo.style.setProperty('--fly-y', `${(B.top - R0.top) / u}px`);
  logo.style.setProperty('--fly-scale', B.width / R0.width);
  // hold the finished logo until the page behind it is ready (capped, so it never hangs)
  await Promise.race([PAGE_READY, wait(3000)]);
  root.classList.add('loader-run');   // keep the loader up while the page is revealed
  // 1. logo slides from the centre to the top-left corner
  const landed = new Promise((res) => {
    const done = (e) => { if (!e || e.propertyName === 'transform') { logo.removeEventListener('transitionend', done); res(); } };
    logo.addEventListener('transitionend', done);
    setTimeout(done, 2600);            // safety net if the event never fires
  });
  loader.classList.add('fly');
  await landed;                        // 2. it has landed exactly on the header logo's spot
  await wait(120);
  root.classList.remove('logo-pending');
  loader.classList.add('out');         // 3. only now does the page arrive around it
  root.classList.remove('loading');
  try { sessionStorage.setItem('mb-loaded', '1'); } catch (_) {}
  await wait(800);
  loader.classList.add('land');        // 4. hand over to the real header logo underneath
  await wait(450);
  loader.remove();
  root.classList.remove('loader-run');
}
runLoader();

/* ---------- work with me: switch → lights out → lamp flickers on ---------- */
const wwm = document.querySelector('.wwm');
if (wwm) {
  const nub = document.querySelector('.switch-nub');
  const night = document.querySelector('.night');
  const msg = document.querySelector('.msg');
  let busy = false;
  let timers = [];
  const later = (fn, ms) => timers.push(setTimeout(fn, ms));
  const clearTimers = () => { timers.forEach(clearTimeout); timers = []; };

  const click = () => {
    wwm.classList.add('pressed');
    nub.classList.add('pressed');
    setTimeout(() => { wwm.classList.remove('pressed'); nub.classList.remove('pressed'); }, 260);
  };

  function lightsOn() {          // i.e. open: room goes dark, lamp comes on
    clearTimers();
    click();
    wwm.setAttribute('aria-expanded', 'true');
    later(() => root.classList.add('lights-out'), 160);
    later(() => root.classList.add('flicker'), 900);
    later(() => { root.classList.add('lamp-on'); root.classList.remove('flicker'); }, 900 + 1900);
    later(() => { root.classList.add('talk'); msg && msg.focus({ preventScroll: true }); }, 900 + 1250);
  }

  function lightsOff() {         // close: back to day
    clearTimers();
    click();
    wwm.setAttribute('aria-expanded', 'false');
    root.classList.remove('talk', 'flicker', 'lamp-on');
    later(() => root.classList.remove('lights-out'), 220);
  }

  wwm.addEventListener('click', () => {
    if (busy) return;
    busy = true; setTimeout(() => (busy = false), 400);
    root.classList.contains('lights-out') ? lightsOff() : lightsOn();
  });
  night.addEventListener('click', lightsOff);
  const nightPage = $('.night-page');
  nightPage && nightPage.addEventListener('click', lightsOff);
  addEventListener('keydown', (e) => { if (e.key === 'Escape' && root.classList.contains('lights-out')) lightsOff(); });

  // contact links + send
  const set = (sel, href) => { const el = document.querySelector(sel); if (el) el.href = href; };
  set('.s-in', CONTACT.linkedin);
  set('.s-ig', CONTACT.instagram);
  set('.s-mail', `mailto:${CONTACT.email}`);

  /* chat: the visitor leaves their name + email/phone once, then each message is emailed to Manvi
     (/api/chat → Resend). Their own mail app never opens; Manvi replies from her inbox.
     The thread and details are remembered on this device only. */
  const form = document.querySelector('.contact-form');
  const thread = document.querySelector('.chat-thread');
  const who = document.querySelector('.chat-who');
  const KEY = 'mb-chat', WHO = 'mb-who';
  const LOCAL = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname) || location.hostname.endsWith('.localhost');
  const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch (e) { return []; } };
  const save = (list) => { try { localStorage.setItem(KEY, JSON.stringify(list.slice(-40))); } catch (e) {} };
  const getWho = () => { try { return JSON.parse(localStorage.getItem(WHO)) || null; } catch (e) { return null; } };
  const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
  const isPhone = (v) => (v.replace(/\D/g, '').length >= 7) && /^[+\d\s().-]+$/.test(v);
  const bubble = (m, fresh) => {
    if (!thread) return null;
    const b = document.createElement('div');
    b.className = 'chat-msg' + (fresh ? ' new' : '');
    const t = document.createElement('p'); t.textContent = m.text;
    const st = document.createElement('span'); st.className = 'chat-st'; st.textContent = m.status || '';
    b.append(t, st);
    thread.appendChild(b);
    thread.scrollTop = thread.scrollHeight;
    return st;
  };
  load().forEach((m) => bubble(m));

  const nameIn = who && who.querySelector('.who-name');
  const contactIn = who && who.querySelector('.who-contact');
  function showWho(w) {
    if (!who) return;
    if (w) {
      who.querySelector('.who-text').textContent = `${w.name} · ${w.contact}`;
      nameIn.value = w.name; contactIn.value = w.contact;
      who.classList.add('set');
    } else who.classList.remove('set');
  }
  showWho(getWho());
  who && who.querySelector('.who-edit').addEventListener('click', () => { who.classList.remove('set'); nameIn.focus(); });
  [nameIn, contactIn].forEach((el) => el && el.addEventListener('input', () => el.classList.remove('bad')));

  form && form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = msg.value.trim();
    if (!text) { msg.focus(); return; }
    // who's writing: required once, so Manvi knows who it is and can reply
    const name = (nameIn ? nameIn.value : '').trim();
    const contact = (contactIn ? contactIn.value : '').trim();
    if (name.length < 2) { nameIn && (nameIn.classList.add('bad'), who.classList.remove('set'), nameIn.focus()); return; }
    if (!isEmail(contact) && !isPhone(contact)) { contactIn && (contactIn.classList.add('bad'), who.classList.remove('set'), contactIn.focus()); return; }
    const w = { name, contact };
    try { localStorage.setItem(WHO, JSON.stringify(w)); } catch (_) {}
    showWho(w);

    const send = form.querySelector('.send');
    send.classList.add('sent');
    setTimeout(() => send.classList.remove('sent'), 600);
    msg.value = '';
    const m = { text, at: Date.now(), status: 'sending…' };
    const st = bubble(m, true);
    let status;
    if (LOCAL) status = 'preview — not actually sent';
    else {
      try {
        const r = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, contact, text, hp: '' }) });
        status = r.ok ? 'sent ✓' : r.status === 429 ? 'too many messages — try in a bit' : r.status === 503 ? 'not delivered yet' : 'couldn’t send — try again';
      } catch (err) { status = 'couldn’t send — try again'; }
    }
    m.status = status; if (st) st.textContent = status;
    const list = load(); list.push(m); save(list);
  });
}

/* ---------- case studies on phones: one readable column ----------
   The Figma canvas is 1512 px of absolutely placed layers. On a phone each layer is sorted into
   reading order: text becomes normal flowing text at phone sizes; pictures and diagrams (plus any
   text sitting on them) stay together as one figure, scaled to the screen width (wide diagrams
   with labels can be swiped sideways). Big coloured section backgrounds are carried behind their
   content; hairlines and frame boxes from the desktop grid are dropped. */
function reflowCaseStudy() {
  const PW = root.clientWidth, PAD = 20, CW = PW - PAD * 2, BAR_H = 147;
  root.style.setProperty('--s', 1);
  const layer = stageEl.children.length === 1 ? stageEl.firstElementChild : stageEl;
  // display:contents groups only wrap absolutely placed children — lift those children out
  [...layer.querySelectorAll(':scope > *')].forEach((el) => {
    if (getComputedStyle(el).display === 'contents') { while (el.firstChild) layer.insertBefore(el.firstChild, el); el.remove(); }
  });
  const L0 = layer.getBoundingClientRect();
  const pageBg = getComputedStyle(layer).backgroundColor;
  const rectOf = (el) => { const r = el.getBoundingClientRect(); return { l: r.left - L0.left, t: r.top - L0.top, w: r.width, h: r.height }; };
  const clear = (c) => !c || c === 'transparent' || /rgba\(.*,\s*0\)$/.test(c);
  const head = [], units = [], bands = [], hide = [];
  const INHERIT = ['fontFamily', 'fontSize', 'fontWeight', 'fontStyle', 'lineHeight', 'letterSpacing', 'color', 'textTransform', 'textAlign', 'fontVariationSettings'];
  const queue = [...layer.children].map((el) => ({ el, nested: false }));
  while (queue.length) {
    const { el, nested } = queue.shift();
    if (el.tagName === 'SCRIPT') continue;
    const r = rectOf(el);
    if (r.w === 0 && r.h === 0) continue;
    if (!nested && r.t >= -2 && r.t + r.h <= BAR_H + 2) { head.push(el); continue; }
    const text = el.textContent.trim().length > 0;
    const img = el.matches('img, svg, canvas, video') || !!el.querySelector('img, svg, canvas, video, .pw-track');
    const cs = getComputedStyle(el);
    // a big wrapper holding both words and pictures (or a whole section) is opened up and its children sorted one by one
    const flowKids = [...el.children].filter((k) => getComputedStyle(k).position !== 'absolute').length;
    if (!el.classList.contains('pw') && !el.matches('svg, img') && el.children.length > 1 && text && img && (r.h > 500 || r.w > 1000)
        && cs.transform === 'none' && flowKids >= el.children.length * 0.6) {
      const kids = [...el.children];
      kids.forEach((k) => { const kc = getComputedStyle(k); INHERIT.forEach((p) => { if (!k.style[p]) k.style[p] = kc[p]; }); });
      if (!clear(cs.backgroundColor) && cs.backgroundColor !== pageBg && r.w >= 1300) bands.push({ l: 0, r: 1512, t: r.t, b: r.t + r.h, bg: cs.backgroundColor });
      kids.forEach((k) => queue.push({ el: k, nested: true }));
      continue;
    }
    const l = Math.max(0, r.l), rr = Math.min(1512, r.l + r.w);
    const u = { el, l, t: r.t, w: Math.max(0, rr - l), h: r.h, r: rr, b: r.t + r.h, raw: r, nested };
    const bg = cs.backgroundColor;
    if (el.classList.contains('pw')) u.kind = 'special';
    else if (!text && !img) {
      if (!clear(bg) && bg !== pageBg && u.w >= 1300) { u.kind = 'band'; u.bg = bg; }
      else if (!clear(bg) && bg !== pageBg && u.w * u.h > 60) u.kind = 'visual';
      else if (parseFloat(cs.borderTopLeftRadius) > 4 && parseFloat(cs.borderTopWidth) > 0) u.kind = 'visual';   // pills, rounded cards
      else if ([...el.querySelectorAll('*')].some((k) => { const c = getComputedStyle(k).backgroundColor; return !clear(c) && c !== pageBg; })) u.kind = 'visual';
      else u.kind = 'decor';
    } else if (img) u.kind = (!text && ((u.h <= 4 && u.w >= 900) || (u.w <= 4 && u.h >= 900))) ? 'decor' : 'visual';   // only full-width dividers are dropped
    else u.kind = 'text';
    if (u.kind === 'band') bands.push(u); else if (u.kind === 'decor') hide.push(el); else units.push(u);
  }
  // children lifted out of a flex wrapper keep their exact place inside figures
  units.forEach((u) => { if (u.nested) u.el.dataset.cspFreeze = `${u.raw.l},${u.raw.t},${u.raw.w},${u.raw.h}`; });
  hide.forEach((el) => { el.style.display = 'none'; });
  // figures: visuals that touch each other, plus any text sitting on them, travel together
  const hit = (a, b, pad = 0) => a.l < b.r + pad && b.l < a.r + pad && a.t < b.b + pad && b.t < a.b + pad;
  const area = (a, b) => Math.max(0, Math.min(a.r, b.r) - Math.max(a.l, b.l)) * Math.max(0, Math.min(a.b, b.b) - Math.max(a.t, b.t));
  const par = units.map((_, i) => i);
  const find = (i) => (par[i] === i ? i : (par[i] = find(par[i])));
  const join = (i, j) => { par[find(i)] = find(j); };
  units.forEach((a, i) => units.forEach((b, j) => {
    if (j <= i) return;
    const va = a.kind !== 'text', vb = b.kind !== 'text';
    if (va && vb && hit(a, b, 10)) join(i, j);
    else if (va !== vb) {
      const t = va ? b : a, v = va ? a : b;
      // text on a picture, or a short label / legend right beside one, belongs to that figure
      const short = t.el.textContent.trim().length < 48 && t.h < 60;
      if (area(a, b) > 0.25 * t.w * t.h || (short && v.w < 900 && v.h < 700 && hit(t, v, 18))) join(i, j);
    }
  }));
  const groups = new Map();
  units.forEach((u, i) => { const k = find(i); if (!groups.has(k)) groups.set(k, []); groups.get(k).push(u); });
  const blocks = [...groups.values()].map((g) => {
    const l = Math.min(...g.map((u) => u.l)), t = Math.min(...g.map((u) => u.t));
    const r = Math.max(...g.map((u) => u.r)), b = Math.max(...g.map((u) => u.b));
    const kind = g.some((u) => u.kind === 'special') ? 'special' : g.length === 1 && g[0].kind === 'text' ? 'text' : 'figure';
    return { g, l, t, r, b, w: r - l, h: b - t, kind, text: g.some((u) => u.el.textContent.trim()) };
  });
  // reading order (XY-cut): split by clear horizontal gaps first, then by clear vertical gaps (left column first)
  function xy(list) {
    if (list.length <= 1) return list;
    const byT = [...list].sort((a, b) => a.t - b.t);
    const cuts = [];   // [index, gap] where everything above ends before byT[index] starts
    let maxB = byT[0].b;
    for (let i = 1; i < byT.length; i++) { if (byT[i].t >= maxB - 3) cuts.push([i, byT[i].t - maxB]); maxB = Math.max(maxB, byT[i].b); }
    const splitAt = (arr, idx) => { const out = []; let p = 0; idx.forEach((i) => { out.push(...xy(arr.slice(p, i))); p = i; }); out.push(...xy(arr.slice(p))); return out; };
    const big = cuts.filter(([, g]) => g >= 40).map(([i]) => i);
    if (big.length) return splitAt(byT, big);                       // separate sections
    // a table (several rows, each with cells side by side) reads row by row, each row as one line of cells
    if (cuts.length >= 3) {
      const idx = [0, ...cuts.map(([i]) => i), byT.length];
      const slabs = idx.slice(1).map((e, k) => byT.slice(idx[k], e));
      const hs = slabs.map((s) => Math.max(...s.map((x) => x.b)) - Math.min(...s.map((x) => x.t))).sort((a, b) => a - b);
      if (slabs.length >= 4 && hs.filter((h) => h <= 40).length >= slabs.length * 0.85 && slabs.filter((s) => s.length >= 2).length >= slabs.length * 0.6) {
        return slabs.flatMap((s) => { const row = [...s].sort((a, b) => a.l - b.l); row.forEach((c, k) => { c.cell = k > 0; c.rowStart = k === 0; }); return row; });
      }
    }
    const byL = [...list].sort((a, b) => a.l - b.l);
    let maxR = byL[0].r;
    for (let i = 1; i < byL.length; i++) {                           // side-by-side columns: left one first
      if (byL[i].l >= maxR - 3) return [...xy(byL.slice(0, i)), ...xy(byL.slice(i))];
      maxR = Math.max(maxR, byL[i].r);
    }
    if (cuts.length) return splitAt(byT, [cuts[0][0]]);
    return byT.sort((a, b) => (a.t - b.t) || (a.l - b.l));
  }
  const order = xy(blocks);

  const flow = document.createElement('div');
  flow.className = 'csp-flow';
  const SIZE = (fs) => (fs <= 15 ? Math.max(11, fs * 0.92) : Math.min(34, 7.5 + fs * 0.47));
  function flowify(el) {
    // Figma keeps words apart with no-break spaces, which stops lines wrapping on a narrow screen
    const tw = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    for (let n = tw.nextNode(); n; n = tw.nextNode()) if (n.nodeValue.includes('\u00a0')) n.nodeValue = n.nodeValue.replace(/\u00a0/g, ' ');
    const all = [el, ...el.querySelectorAll('*')];
    const cs = all.map((n) => getComputedStyle(n));
    all.forEach((n, i) => {
      const c = cs[i], s = n.style;
      const fs = parseFloat(c.fontSize);
      if (n.childNodes.length && [...n.childNodes].some((x) => x.nodeType === 3 && x.textContent.trim()) || n === el) {
        s.fontSize = SIZE(fs) + 'px';
      }
      if (c.lineHeight.endsWith('px')) s.lineHeight = '1.42';
      if (c.whiteSpace !== 'normal') s.whiteSpace = 'normal';
      s.wordBreak = 'normal'; s.overflowWrap = 'break-word';
      if (parseFloat(c.width) > CW - 2 || (n !== el && c.position !== 'absolute' && parseFloat(c.width) > 300)) { s.width = 'auto'; s.maxWidth = '100%'; s.minWidth = '0'; }
      if (c.height.endsWith('px') && n.tagName !== 'IMG' && c.position !== 'absolute' && n.textContent.trim() && parseFloat(c.width) > 60) s.height = 'auto';
      if (c.overflow !== 'visible') s.overflow = 'visible';
      if (c.display === 'flex' && c.flexDirection.startsWith('row') && n.children.length > 1 && n.scrollWidth > CW) {
        const kids = [...n.children], small = kids.filter((k) => k.offsetWidth <= 60);
        if (small.length && small.length < kids.length) {        // a badge or number beside text: keep them side by side
          kids.forEach((k) => { if (k.offsetWidth <= 60) k.style.flex = 'none'; else { k.style.flex = '1 1 0'; k.style.minWidth = '0'; k.style.width = 'auto'; } });
          s.gap = Math.min(parseFloat(c.columnGap) || 12, 14) + 'px';
        } else { s.flexWrap = 'wrap'; kids.forEach((k) => { k.style.flex = '1 1 100%'; k.style.width = 'auto'; }); }
      }
    });
    const s = el.style;
    s.position = 'relative'; s.left = s.top = s.right = s.bottom = 'auto'; s.inset = 'auto';
    s.transform = 'none'; s.width = 'auto'; s.maxWidth = '100%'; s.height = 'auto'; s.textAlign = 'left';
  }
  function figure(bk) {
    const textual = bk.text && bk.kind !== 'special';
    let k = CW / bk.w, swipe = false;
    if (bk.w > 900 && textual && k < 0.42) { k = 0.42; swipe = true; }
    if (!bk.text && bk.w >= 1300) k = PW / bk.w;           // full-bleed pictures run edge to edge
    k = Math.min(k, 1);
    const box = document.createElement('div');
    box.className = 'csp-fig' + (swipe ? ' swipe' : '') + (!bk.text && bk.w >= 1300 ? ' bleed' : '');
    const inner = document.createElement('div');
    inner.className = 'csp-in';
    inner.style.cssText = `width:${bk.w * k}px;height:${bk.h * k}px`;
    const canvas = document.createElement('div');
    canvas.className = 'csp-canvas';
    canvas.style.cssText = `left:${-bk.l * k}px;top:${-bk.t * k}px;transform:scale(${k})`;
    bk.g.forEach((u) => {
      if (u.el.dataset.cspFreeze) {
        const [l, t, w, h] = u.el.dataset.cspFreeze.split(',').map(Number);
        Object.assign(u.el.style, { position: 'absolute', left: l + 'px', top: t + 'px', width: w + 'px', height: h + 'px', margin: '0', flex: 'none', boxSizing: 'border-box', inset: 'auto', right: 'auto', bottom: 'auto' });
        u.el.style.left = l + 'px'; u.el.style.top = t + 'px';
      }
      canvas.appendChild(u.el);
    });
    inner.appendChild(canvas); box.appendChild(inner);
    if (swipe) { const h = document.createElement('p'); h.className = 'csp-hint'; h.textContent = 'swipe to see the whole diagram →'; box.appendChild(h); }
    return box;
  }
  // Book My Show walkthrough: the pinned two-phone player needs a wide screen, so phones get the same
  // screens as a sideways strip — step, screen, caption — with the header and prototype link above it
  function protoStrip(pw) {
    const box = document.createElement('div');
    box.className = 'csp-proto';
    const headEl = pw.firstElementChild;
    if (headEl && !headEl.classList.contains('pw-track')) { flowify(headEl); box.appendChild(headEl); }
    const track = pw.querySelector('.pw-track');
    const D = JSON.parse(track.dataset.proto);
    const strip = document.createElement('div');
    strip.className = 'csp-strip';
    pw.querySelectorAll('.pw-layer').forEach((layerEl) => {
      const im = layerEl.querySelector('.pw-shot img');
      const s = D.screens[+layerEl.dataset.i];
      if (!im || !s) return;
      const st = D.steps[s.step];
      const card = document.createElement('figure');
      card.className = 'csp-shot';
      const pic = document.createElement('img');
      pic.src = im.getAttribute('src'); pic.alt = im.alt; pic.loading = 'lazy'; pic.decoding = 'async';
      card.innerHTML = `<p class="csp-step">${st[0]} · ${st[1]}</p>`;
      card.appendChild(pic);
      const cap = document.createElement('figcaption');
      cap.textContent = (s.phone === 'B' ? 'Dev: ' : 'Rohan: ') + s.cap;
      card.appendChild(cap);
      card.dataset.i = layerEl.dataset.i;
      strip.appendChild(card);
    });
    [...strip.children].sort((a, b) => a.dataset.i - b.dataset.i).forEach((c) => strip.appendChild(c));
    box.appendChild(strip);
    const hint = document.createElement('p'); hint.className = 'csp-hint'; hint.textContent = `${strip.children.length} screens · swipe →`;
    box.appendChild(hint);
    pw.remove();
    return box;
  }
  let prevB = BAR_H, curBand = null, wrap = flow;
  order.forEach((bk) => {
    const band = bands.find((b) => bk.t >= b.t - 2 && bk.t < b.b);
    if (band !== curBand) {
      curBand = band;
      if (band) { wrap = document.createElement('div'); wrap.className = 'csp-band'; wrap.style.background = band.bg; flow.appendChild(wrap); }
      else wrap = flow;
    }
    let node;
    if (bk.kind === 'text') { node = bk.g[0].el; flowify(node); }
    else if (bk.kind === 'special') node = protoStrip(bk.g.find((u) => u.kind === 'special').el);
    else node = figure(bk);
    const gap = bk.t - prevB;
    node.style.marginTop = bk.cell ? '2px' : `${gap < -2 ? 22 : Math.round(Math.max(6, Math.min(56, gap * 0.4)))}px`;
    if (bk.rowStart) { node.classList.add('csp-row'); }
    if (bk.cell) node.classList.add('csp-cell');
    wrap.appendChild(node);
    prevB = Math.max(prevB, bk.b);
  });
  // header: logo + Home/About/Projects, then the section tabs as a sideways strip
  const bar = document.createElement('header');
  bar.className = 'csp-bar';
  const top = document.createElement('div'); top.className = 'csp-top';
  const logo = layer.querySelector('a[aria-label="Home"]');
  if (logo) { const a = document.createElement('a'); a.href = logo.getAttribute('href'); a.className = 'csp-logo'; a.setAttribute('aria-label', 'Home'); a.setAttribute('data-page', ''); const im = logo.querySelector('img'); if (im) a.appendChild(im); top.appendChild(a); }
  const nav = document.createElement('nav'); nav.className = 'csp-nav';
  layer.querySelectorAll('.cs-nav').forEach((a) => { a.removeAttribute('style'); nav.appendChild(a); });
  top.appendChild(nav); bar.appendChild(top);
  const tabs = document.createElement('nav'); tabs.className = 'csp-tabs';
  layer.querySelectorAll('.subnav').forEach((a) => { a.removeAttribute('style'); tabs.appendChild(a); });
  if (tabs.children.length) bar.appendChild(tabs);
  head.forEach((el) => el.remove());
  document.body.insertBefore(bar, document.body.firstChild);
  layer.replaceChildren(flow);
  layer.removeAttribute('style');
  stageEl.removeAttribute('style');
  document.querySelector('.cs-spacer').style.height = '0px';
}
if (CSP) reflowCaseStudy();

/* ---------- case studies: pin the header + tab bar while scrolling ---------- */
if (LONG && !CSP) {
  const BAR_H = 147; // design px: site header (0–74) + section tabs (73–147)
  const bar = document.createElement('div');
  bar.className = 'cs-bar';
  // case studies converted from Figma keep everything inside one wrapper div
  const layer = stageEl.children.length === 1 ? stageEl.firstElementChild : stageEl;
  [...layer.children].forEach((el) => {
    const top = el.offsetTop, h = el.offsetHeight;
    // skip display:contents groups — they report top 0 but their children live further down
    if (getComputedStyle(el).display === 'contents') return;
    if (top >= -2 && top + h <= BAR_H + 2) bar.appendChild(el);
  });
  document.body.appendChild(bar);
  const stick = () => bar.classList.toggle('stuck', scrollY > 4);
  addEventListener('scroll', stick, { passive: true });
  stick();
}

/* ---------- case studies: big stat numbers count up from 1 the first time they come into view ----------
   Any large number set on its own (11, 72, 07, 6.67 lakh, 2×, ₹2,016…) counts up once, keeping its
   leading zeros, decimals, commas and any word after it. Ranges and phrases like "1 in 4" stay as they are. */
if (LONG && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
  const NUM = /^(₹?)(\d[\d,]*(?:\.\d+)?)(\s*[^\d]*)$/;
  const items = [];
  const tw = document.createTreeWalker(stageEl, NodeFilter.SHOW_TEXT);
  for (let n = tw.nextNode(); n; n = tw.nextNode()) {
    const raw = n.nodeValue.trim(), m = NUM.exec(raw);
    if (!m) continue;
    const el = n.parentElement;
    if (!el || el.closest('.subnav, .cs-nav, .pw, .csp-proto, svg')) continue;
    const fs = parseFloat(getComputedStyle(el).fontSize) / (CSP ? 1 : 1);
    if (fs < (CSP ? 26 : 40)) continue;                     // only the big headline figures
    const digits = m[2], target = parseFloat(digits.replace(/,/g, ''));
    if (!(target > 1)) continue;
    const dec = (digits.split('.')[1] || '').length, pad = /^0\d/.test(digits) ? digits.length : 0, comma = digits.includes(',');
    items.push({ n, lead: n.nodeValue.match(/^\s*/)[0], pre: m[1], suf: m[3], target, dec, pad, comma, el });
  }
  const fmt = (it, v) => {
    let s = it.dec ? v.toFixed(it.dec) : String(Math.round(v));
    if (it.pad) s = s.padStart(it.pad, '0');
    if (it.comma) s = Number(s).toLocaleString('en-IN', { minimumFractionDigits: it.dec, maximumFractionDigits: it.dec });
    return it.lead + it.pre + s + it.suf;
  };
  const run = (it) => {
    const start = performance.now(), D = 1400 + Math.min(600, it.target * 4);
    const step = (now) => {
      const k = Math.min(1, (now - start) / D), e = 1 - Math.pow(1 - k, 3);   // ease-out: quick start, gentle landing
      it.n.nodeValue = fmt(it, 1 + (it.target - 1) * e);
      if (k < 1) requestAnimationFrame(step); else { it.n.nodeValue = fmt(it, it.target); it.el.style.fontVariantNumeric = ''; }   // lands in the design's own digits
    };
    requestAnimationFrame(step);
  };
  if (items.length) {
    items.forEach((it) => { it.el.style.fontVariantNumeric = 'tabular-nums'; it.n.nodeValue = fmt(it, 1); });
    const io = new IntersectionObserver((es) => es.forEach((e) => {
      if (!e.isIntersecting) return;
      io.unobserve(e.target);
      items.filter((it) => it.el === e.target).forEach(run);
    }), { threshold: 0.6 });
    [...new Set(items.map((it) => it.el))].forEach((el) => io.observe(el));
  }
}

/* ---------- case studies: section tabs jump + highlight while scrolling ---------- */
if (LONG && stageEl.dataset.sections) {
  const map = JSON.parse(stageEl.dataset.sections);
  const tabs = [...document.querySelectorAll('.subnav')];
  const leaves = [...stageEl.querySelectorAll('p, span')].filter((el) => !el.closest('.subnav'));
  const targetY = (label) => {
    const start = map[label];
    if (!start) return 0;
    const el = leaves.find((e) => e.textContent.trim().startsWith(start));
    return el ? el.getBoundingClientRect().top + scrollY - 170 * Number(getComputedStyle(root).getPropertyValue('--s')) : 0;
  };
  tabs.forEach((t) => t.addEventListener('click', (e) => {
    e.preventDefault();
    scrollTo({ top: targetY(t.dataset.go), behavior: 'smooth' });
  }));
  const spy = () => {
    let cur = tabs[0];
    tabs.forEach((t) => { if (scrollY + 40 >= targetY(t.dataset.go)) cur = t; });
    tabs.forEach((t) => { t.classList.toggle('on', t === cur); t.style.color = t === cur ? '#000' : '#939393'; });
  };
  addEventListener('scroll', spy, { passive: true });
  spy();
}

/* ---------- home: the four circles open a project window in the same colour ---------- */
const PROJECTS = {
  bms: { name: 'Book My Show', color: '#d83b1a', ink: '#fff', href: 'projects/book-my-show-2.html',
         video: 'assets/video/grouppass-v2.mp4', poster: 'assets/video/grouppass-poster-v1.webp',
         tag: 'GROUP BOOKING · SPLIT PAYMENTS · 48-HR SPRINT',
         line: 'Group Pass: every friend pays for their own seat, nobody fronts the whole bill' },
  ts:  { name: 'Teerth Sathi', color: '#457247', ink: '#fff', href: 'projects/teerth-sathi.html',
         video: 'assets/video/teerth-sathi-v2.mp4', poster: 'assets/video/teerth-sathi-poster-v1.webp',
         tag: 'VOLUNTEER COORDINATION · TASK ALLOCATION · CROWD SAFETY',
         line: 'AI-assisted volunteer coordination for high crowd-density events' },
  rd:  { name: 'Re-routing Devotion', color: '#efb506', ink: '#212121', href: 'projects/rerouting-devotion.html',
         tag: 'SYSTEMS DESIGN · CIRCULAR ECONOMY · PUBLISHED RESEARCH',
         line: 'Using the Ganga as a traffic-free highway to move holy waste off the ghats, published at RSD15' },
  cl:  { name: 'Cheriyal Lipi', color: '#f57cc3', ink: '#212121', href: 'projects/cheriyal-lipi.html',
         tag: 'TYPOGRAPHY · FOLK ART · MULTI-SCRIPT',
         line: 'Cheriyal folk art into a typeface across four scripts' },
};
(() => {
  const btns = [...document.querySelectorAll('.dot-btn')];
  if (!btns.length) return;
  // the coloured disc under each button grows a touch on hover / when its window is open
  const discs = [...document.querySelectorAll('.dot:not(.dot-ring)')].filter((d) => !/ring/.test(d.src));
  const icons = [...document.querySelectorAll('.dot-icon')];
  const discOf = (b) => { const i = btns.indexOf(b); const d = discs[i], ic = icons[i];
    return d && { classList: { add: (c) => { d.classList.add(c); ic && ic.classList.add(c); }, remove: (c) => { d.classList.remove(c); ic && ic.classList.remove(c); },
                               toggle: (c, on) => { d.classList.toggle(c, on); ic && ic.classList.toggle(c, on); } } }; };
  const ARROW = '<svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M4.8 3.85h4.67c1.27 0 1.9 0 2.28.39.39.39.4 1.02.4 2.27v4.68M3.85 12.15 11.52 4.48" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const pp = document.createElement('div');
  pp.className = 'pp a';
  pp.setAttribute('role', 'dialog');
  pp.setAttribute('aria-modal', 'false');
  // laptop / tablet: camera-shaped window (two tabs on top + playback controls under the screen); phone keeps the plain card
  pp.innerHTML = `<i class="pp-tab pp-tab1" aria-hidden="true"></i><i class="pp-tab pp-tab2" aria-hidden="true"></i>
    <div class="pp-video"><canvas class="pp-amb" width="160" height="64" aria-hidden="true"></canvas><video playsinline muted loop preload="none" aria-label="Project film"></video><span class="pp-sound">tap for sound</span></div>
    <div class="pp-ctrl">
      <button type="button" class="pp-restart" aria-label="Restart"><svg viewBox="0 0 20 20"><path d="M10 3.2a6.8 6.8 0 1 1-6.5 8.8" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M2.6 2.6v5.3h5.3z"/></svg></button>
      <button type="button" class="pp-rew" aria-label="Back 5 seconds"><svg viewBox="0 0 23 23"><path d="M11.2 17.3V5.8L3 11.5l8.2 5.8zm.6-5.8 8.2 5.8V5.8l-8.2 5.7z"/></svg></button>
      <button type="button" class="pp-toggle" aria-label="Pause"><svg class="i-pause" viewBox="0 0 15 15"><rect x="2.4" y="1" width="3.4" height="13" rx=".8"/><rect x="9.2" y="1" width="3.4" height="13" rx=".8"/></svg><svg class="i-play" viewBox="0 0 15 15"><path d="M3.2 1.9v11.2c0 .7.8 1.1 1.4.7l8.4-5.6c.5-.4.5-1.1 0-1.4L4.6 1.2c-.6-.4-1.4 0-1.4.7z"/></svg></button>
      <button type="button" class="pp-fwd" aria-label="Forward 5 seconds"><svg viewBox="0 0 23 23"><path d="M11.8 17.3V5.8l8.2 5.7-8.2 5.8zm-.6-5.8L3 17.3V5.8l8.2 5.7z"/></svg></button>
      <button type="button" class="pp-full" aria-label="Full screen"><svg viewBox="0 0 18 18"><path d="M2 6.5V2h4.5M11.5 2H16v4.5M16 11.5V16h-4.5M6.5 16H2v-4.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
    </div>
    <div class="pp-body"><p class="pp-title poppins"></p><p class="pp-tag questrial"></p>
    <a class="pp-link questrial" data-page><span>detailed case study</span>${ARROW}</a>
    <p class="pp-desc poppins"></p></div>`;
  (STACK ? document.body : stageEl).appendChild(pp);
  const scrim = STACK ? document.body.appendChild(Object.assign(document.createElement('div'), { className: 'pp-scrim' })) : null;
  const $p = (c) => pp.querySelector(c);
  let cur = null;
  // the project film: starts silently when the window opens; any control (or a tap on the film) brings the sound in.
  // ⟲ restart · ⏪ back 5 s · ❚❚/▶ pause-play · ⏩ forward 5 s
  const vid = $p('video');
  const QUIET = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const tog = $p('.pp-toggle');
  const sync = () => {
    pp.classList.toggle('playing', !vid.paused); pp.classList.toggle('muted', vid.muted);
    tog.setAttribute('aria-label', vid.paused ? 'Play' : 'Pause');
  };
  ['play', 'pause', 'volumechange'].forEach((ev) => vid.addEventListener(ev, sync));
  const go = () => { vid.muted = false; vid.play().catch(() => {}); };
  const seek = (d) => { vid.currentTime = Math.max(0, Math.min((vid.duration || 0) - 0.1, vid.currentTime + d)); go(); };
  tog.addEventListener('click', () => (vid.paused ? go() : (vid.muted ? go() : vid.pause())));
  $p('.pp-restart').addEventListener('click', () => { vid.currentTime = 0; go(); });
  $p('.pp-rew').addEventListener('click', () => seek(-5));
  $p('.pp-fwd').addEventListener('click', () => seek(5));
  vid.addEventListener('click', () => (vid.paused || vid.muted ? go() : vid.pause()));
  $p('.pp-sound').addEventListener('click', go);
  // full screen (phone): the film alone, with sound, turned sideways where the phone allows it; native controls while it's big
  $p('.pp-full').addEventListener('click', () => {
    go();
    const ios = () => vid.webkitEnterFullscreen && vid.webkitEnterFullscreen();   // iPhone Safari
    if (vid.requestFullscreen) vid.requestFullscreen().then(() => screen.orientation?.lock?.('landscape').catch(() => {})).catch(ios);
    else ios();
  });
  const fsChange = () => { vid.controls = document.fullscreenElement === vid; if (!vid.controls) screen.orientation?.unlock?.(); };
  document.addEventListener('fullscreenchange', fsChange);
  // the film's soft colour wash carries on past its edges: a tiny, heavily blurred copy of the frame fills the screen behind it
  const amb = $p('.pp-amb'), actx = amb.getContext('2d');
  let ambOn = false, tick = 0;
  let fw = 1, fh = 1;   // share of the screen the film actually covers (set by fit below)
  const paint = () => {
    if (vid.readyState < 2) return;
    const cw = amb.width, ch = amb.height, W = vid.videoWidth, H = vid.videoHeight, e = 0.025;
    const dw = fw * cw, dh = fh * ch, dx = (cw - dw) / 2, dy = (ch - dh) / 2;
    try {
      // stretch only the film's outermost edge colours outwards, then the film itself in the middle
      if (dx > 0) { actx.drawImage(vid, 0, 0, W * e, H, 0, dy, dx + 1, dh); actx.drawImage(vid, W * (1 - e), 0, W * e, H, dx + dw - 1, dy, dx + 1, dh); }
      if (dy > 0) { actx.drawImage(vid, 0, 0, W, H * e, 0, 0, cw, dy + 1); actx.drawImage(vid, 0, H * (1 - e), W, H * e, 0, dy + dh - 1, cw, dy + 1); }
      actx.drawImage(vid, dx, dy, dw, dh);
    } catch (err) {}
  };
  const loop = () => { if (!ambOn) return; if (tick++ % 4 === 0) paint(); requestAnimationFrame(loop); };
  vid.addEventListener('play', () => { if (!ambOn) { ambOn = true; loop(); } });
  vid.addEventListener('pause', () => { ambOn = false; paint(); });
  ['loadeddata', 'seeked'].forEach((ev) => vid.addEventListener(ev, paint));
  // feather only the film itself: size the soft-edged mask to where the film is actually drawn inside the screen
  const fit = () => {
    if (!vid.videoWidth || !vid.clientWidth) return;
    const k = Math.min(vid.clientWidth / vid.videoWidth, vid.clientHeight / vid.videoHeight);
    fw = vid.videoWidth * k / vid.clientWidth; fh = vid.videoHeight * k / vid.clientHeight;
    amb.width = 160; amb.height = Math.max(20, Math.round(160 * vid.clientHeight / vid.clientWidth));
    vid.style.setProperty('--vw', `${(vid.videoWidth * k / vid.clientWidth) * 100 + 6}%`);
    vid.style.setProperty('--vh', `${(vid.videoHeight * k / vid.clientHeight) * 100 + 6}%`);
  };
  vid.addEventListener('loadedmetadata', fit); addEventListener('resize', fit);
  const setVideo = (P) => {
    pp.classList.toggle('has-vid', !!P.video);
    $p('.pp-ctrl').querySelectorAll('button').forEach((b) => { b.disabled = !P.video; });
    if (!P.video) { actx.clearRect(0, 0, amb.width, amb.height); vid.pause(); vid.removeAttribute('src'); vid.removeAttribute('poster'); vid.load(); return; }
    if (!vid.src.endsWith(P.video)) { vid.poster = P.poster; vid.src = P.video; }
    vid.muted = true; vid.currentTime = 0;
    if (!QUIET) vid.play().catch(() => {});
    sync();
  };
  function open(key, btn) {
    const P = PROJECTS[key];
    const swap = cur && cur !== key;
    if (PHONE) {   // from the header line down to just above the circles (Figma: iPhone 16 - 17 / 16 - 10)
      const s = parseFloat(getComputedStyle(root).getPropertyValue('--s')) || 1;
      const hb = document.querySelector('.header-line').getBoundingClientRect().bottom;
      const top = (hb - stageEl.getBoundingClientRect().top) / s;
      pp.style.top = `${top}px`;
      pp.style.height = `${638 - top}px`;
    }
    const fill = () => {
      pp.style.setProperty('--pp', P.color);
      pp.style.setProperty('--pp-ink', P.ink);
      $p('.pp-title').textContent = P.name;
      $p('.pp-tag').textContent = P.tag;
      $p('.pp-desc').textContent = P.line;
      const a = $p('.pp-link');
      if (P.href) { a.href = P.href; a.classList.remove('soon'); a.querySelector('span').textContent = 'detailed case study'; a.removeAttribute('aria-disabled'); }
      else { a.removeAttribute('href'); a.classList.add('soon'); a.querySelector('span').textContent = 'case study coming soon'; a.setAttribute('aria-disabled', 'true'); }
      pp.setAttribute('aria-label', P.name);
      setVideo(P);
      // desktop: the one-liner stays on one line inside the window (long lines step the size down a little)
      const d = $p('.pp-desc');
      d.style.fontSize = '';
      if (!PHONE && !STACK) {
        let fs = 23.5;
        while (d.scrollWidth > d.clientWidth + 1 && fs > 17) { fs -= 0.5; d.style.fontSize = fs + 'px'; }
      }
      // phone: long one-liners step down until they end inside the window (never cut off at the bottom)
      if (PHONE) {
        let fs = 23.5;
        while (d.offsetTop + d.offsetHeight > pp.clientHeight - 18 && fs > 15) { fs -= 0.5; d.style.fontSize = fs + 'px'; }
      }
    };
    if (swap) { pp.classList.add('swap'); setTimeout(() => { fill(); pp.classList.remove('swap'); }, 160); }
    else fill();
    cur = key;
    btns.forEach((b) => { const on = b === btn; b.setAttribute('aria-expanded', String(on)); discOf(b)?.classList.toggle('on', on); });
    root.classList.add('pp-open');
  }
  function close() {
    if (!cur) return;
    cur = null;
    root.classList.remove('pp-open');
    vid.pause();
    btns.forEach((b) => { b.setAttribute('aria-expanded', 'false'); discOf(b)?.classList.remove('on'); });
  }
  // head start: posters load quietly once the page is idle; pointing at (or touching) a circle starts fetching its film
  const idle = window.requestIdleCallback || ((f) => setTimeout(f, 1500));
  addEventListener('load', () => idle(() => Object.values(PROJECTS).forEach((P) => { if (P.poster) new Image().src = P.poster; })));
  const warm = (key) => {
    const P = PROJECTS[key];
    if (cur || !P || !P.video || vid.src.endsWith(P.video)) return;
    vid.preload = 'auto'; vid.poster = P.poster; vid.src = P.video;
  };
  btns.forEach((b) => {
    b.setAttribute('aria-expanded', 'false');
    b.addEventListener('click', (e) => { e.stopPropagation(); cur === b.dataset.p ? close() : open(b.dataset.p, b); });
    b.addEventListener('mouseenter', () => { discOf(b)?.classList.add('hov'); warm(b.dataset.p); });
    b.addEventListener('touchstart', () => warm(b.dataset.p), { passive: true });
    b.addEventListener('mouseleave', () => discOf(b)?.classList.remove('hov'));
  });
  pp.addEventListener('click', (e) => e.stopPropagation());
  document.addEventListener('click', close);
  scrim && scrim.addEventListener('click', close);
  addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
  document.querySelector('.wwm')?.addEventListener('click', close);
})();

/* ---------- projects: filter pills — matching cards slide into the first slots ---------- */
const SLOTS = [[81, 206], [536, 206], [992, 206], [80, 535], [536, 535], [992, 535]];
const cards = [...document.querySelectorAll('.project')];
function arrange(cat) {
  let i = 0;
  cards.forEach((c) => {
    const show = cat === 'all' || (c.dataset.cat || '').split(' ').includes(cat);
    c.classList.toggle('out', !show);
    c.tabIndex = show ? 0 : -1;
    if (show && !STACK && !PHONE) { const [x, y] = SLOTS[i++]; c.style.left = `${x}px`; c.style.top = `${y}px`; }
  });
}
if (cards.length) arrange('all');
// tablets / phones: the colour block changes size, so fit each 416×228 drawing inside it
if ((STACK || PHONE) && cards.length) {
  const fitArt = () => document.querySelectorAll('.project .swatch').forEach((sw) => {
    const art = sw.querySelector('.art'); if (!art) return;
    const k = Math.min(sw.clientWidth / 416, sw.clientHeight / 228);
    art.style.setProperty('--ak', k);
    art.style.setProperty('--ax', `${(sw.clientWidth - 416 * k) / 2}px`);
  });
  fitArt(); addEventListener('resize', fitArt); setTimeout(fitArt, 800);
  document.querySelectorAll('.project .swatch').forEach((sw) => sw.addEventListener('transitionend', fitArt));
}
document.querySelectorAll('.pill').forEach((p) => {
  p.addEventListener('click', () => {
    document.querySelectorAll('.pill').forEach((q) => q.setAttribute('aria-pressed', String(q === p)));
    arrange(p.dataset.cat);
  });
});

/* ---------- case study: synthesis map viewer (Figma dev note · Section 4) ----------
   Starts on the whole map fitted to the frame. + / − step 1.25× (min Fit, max 4×),
   wheel / pinch zoom toward the pointer, drag to pan (clamped to the image edges),
   keyboard + − 0 and arrows, and a full-screen overlay with the same controls. */
(() => {
  const img = document.querySelector('[data-map-img]');
  if (!img) return;
  const STEP = 1.25, MAX = 4;

  function panZoom(vp, im, ui) {
    const W = () => im.naturalWidth || 4096, H = () => im.naturalHeight || 736;
    let z = 1, x = 0, y = 0; // z = zoom relative to Fit
    const vw = () => vp.clientWidth, vh = () => vp.clientHeight;
    const fit = () => (ui.contain ? Math.min(vw() / W(), vh() / H()) : vw() / W());
    const clampAxis = (p, size, view) => (size <= view ? (view - size) / 2 : Math.min(0, Math.max(view - size, p)));
    function draw() {
      const k = fit() * z;
      x = clampAxis(x, W() * k, vw());
      y = clampAxis(y, H() * k, vh());
      im.style.transform = `translate(${x}px, ${y}px) scale(${k})`;
      if (ui.label) ui.label.textContent = z <= 1.001 ? 'Fit' : `${Math.round(z * 100)}%`;
      if (ui.hint) ui.hint.classList.toggle('show', z > 1.001);
      vp.classList.toggle('zoomed', z > 1.001);
    }
    // vp is drawn inside the scaled stage: convert screen px to the viewport's own px
    const local = (cx, cy) => {
      const r = vp.getBoundingClientRect(), f = vp.clientWidth / r.width;
      return [(cx - r.left) * f, (cy - r.top) * f];
    };
    function zoomTo(nz, px = vw() / 2, py = vh() / 2) {
      nz = Math.min(MAX, Math.max(1, nz));
      const k0 = fit() * z, k1 = fit() * nz;
      x = px - ((px - x) / k0) * k1;
      y = py - ((py - y) / k0) * k1;
      z = nz; draw();
    }
    const api = {
      in: () => zoomTo(z * STEP), out: () => zoomTo(z / STEP), reset: () => { z = 1; x = 0; y = 0; draw(); },
      pan: (dx, dy) => { x += dx; y += dy; draw(); }, draw,
    };
    vp.addEventListener('wheel', (e) => {
      const nz = Math.min(MAX, Math.max(1, z * Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0025))));
      if (nz === z) return; // at Fit / max: let the page scroll
      e.preventDefault();
      zoomTo(nz, ...local(e.clientX, e.clientY));
    }, { passive: false });
    const pts = new Map(); let last = null, pinch = null;
    vp.addEventListener('pointerdown', (e) => {
      vp.setPointerCapture(e.pointerId);
      pts.set(e.pointerId, local(e.clientX, e.clientY));
      if (pts.size === 2) {
        const [a, b] = [...pts.values()];
        pinch = { d: Math.hypot(a[0] - b[0], a[1] - b[1]), z };
      }
      last = local(e.clientX, e.clientY);
      vp.classList.add('grabbing');
    });
    vp.addEventListener('pointermove', (e) => {
      if (!pts.has(e.pointerId)) return;
      const p = local(e.clientX, e.clientY);
      pts.set(e.pointerId, p);
      if (pts.size === 2 && pinch) {
        const [a, b] = [...pts.values()];
        zoomTo(pinch.z * Math.hypot(a[0] - b[0], a[1] - b[1]) / pinch.d, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2);
      } else if (last) { api.pan(p[0] - last[0], p[1] - last[1]); }
      last = p;
    });
    const up = (e) => { pts.delete(e.pointerId); if (pts.size < 2) pinch = null; last = pts.size ? [...pts.values()][0] : null; if (!pts.size) vp.classList.remove('grabbing'); };
    vp.addEventListener('pointerup', up); vp.addEventListener('pointercancel', up);
    vp.tabIndex = 0;
    vp.addEventListener('keydown', (e) => {
      const m = { '+': api.in, '=': api.in, '-': api.out, '_': api.out, '0': api.reset }[e.key];
      const a = { ArrowLeft: [60, 0], ArrowRight: [-60, 0], ArrowUp: [0, 60], ArrowDown: [0, -60] }[e.key];
      if (m) { e.preventDefault(); m(); } else if (a && z > 1.001) { e.preventDefault(); api.pan(...a); }
    });
    if (im.complete) draw(); else im.addEventListener('load', draw);
    addEventListener('resize', draw);
    return api;
  }

  const asButton = (el, label, fn) => {
    if (!el) return;
    el.setAttribute('role', 'button'); el.tabIndex = 0; el.setAttribute('aria-label', label); el.classList.add('map-btn');
    el.addEventListener('click', fn);
    el.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fn(); } });
  };
  const btn = (act) => document.querySelector(`[data-map-act="${act}"]`)?.parentElement?.parentElement;

  // inline viewer: the bordered image frame becomes the pan/zoom window
  const vp = img.parentElement;
  vp.classList.add('map-vp');
  img.classList.add('map-img');
  const viewer = vp.parentElement;
  const label = [...viewer.querySelectorAll('p')].find((p) => p.textContent.trim() === 'Fit');
  const hint = [...viewer.querySelectorAll('p')].find((p) => p.textContent.includes('Drag to pan'))?.parentElement;
  hint?.classList.add('map-hint');
  const inline = panZoom(vp, img, { label, hint });
  vp.setAttribute('aria-label', 'Synthesis map. Drag to pan, + and − to zoom.');
  asButton(btn('in'), 'Zoom in', inline.in);
  asButton(btn('out'), 'Zoom out', inline.out);

  // full-screen overlay with the same pan / zoom
  let full = null, lastFocus = null;
  function open() {
    lastFocus = document.activeElement;
    if (!full) {
      full = document.createElement('div');
      full.className = 'map-full';
      full.setAttribute('role', 'dialog'); full.setAttribute('aria-modal', 'true'); full.setAttribute('aria-label', 'Synthesis map, full screen');
      full.innerHTML = `<div class="map-full-vp"><img class="map-img" alt="Synthesis map · Re-Routing Devotion" src="${img.getAttribute('src')}"></div>
        <p class="map-full-title">Synthesis map · Re-Routing Devotion</p>
        <button class="map-full-close" type="button" aria-label="Close full screen">×</button>
        <div class="map-full-bar"><button type="button" data-a="in" aria-label="Zoom in">+</button><span class="map-full-zl">Fit</span><button type="button" data-a="out" aria-label="Zoom out">−</button></div>
        <p class="map-full-hint">Drag to pan · Scroll or use + / − to zoom · Esc to close</p>`;
      document.body.appendChild(full);
      const fvp = full.querySelector('.map-full-vp');
      const fapi = panZoom(fvp, fvp.firstElementChild, { label: full.querySelector('.map-full-zl'), contain: true });
      full.querySelector('[data-a="in"]').onclick = fapi.in;
      full.querySelector('[data-a="out"]').onclick = fapi.out;
      full.querySelector('.map-full-close').onclick = close;
      full.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
      full._api = fapi;
    }
    full.classList.add('open');
    root.classList.add('map-open');
    requestAnimationFrame(() => { full._api.reset(); full.querySelector('.map-full-vp').focus(); });
  }
  function close() {
    full.classList.remove('open');
    root.classList.remove('map-open');
    lastFocus?.focus?.();
  }
  asButton(btn('full'), 'Open full screen', open);
  const cta = document.querySelector('[data-map-act="open"]')?.parentElement?.parentElement;
  asButton(cta, 'Open the full synthesis map', open);
})();

/* ---------- case study: prototype walkthrough (Book My Show) — two phones ----------
   Rohan's phone (A) and Dev's phone (B) sit side by side. The scroll only picks the chapter;
   each chapter plays on its own clock. Between the phones, a wire shows what travels and which
   way: the WhatsApp link going to Dev, and "Dev paid" coming back to Rohan. */
(() => {
  const track = document.querySelector('.pw-track');
  if (!track) return;
  const D = JSON.parse(track.dataset.proto);
  const NS = D.steps.length, N = D.screens.length;
  const pin = track.querySelector('.pw-pin-wrap');
  const $q = (s) => pin.querySelector(s); // the panel moves between the track and a fixed host
  const cols = { A: $q('.pw-col[data-phone="A"]'), B: $q('.pw-col[data-phone="B"]') };
  const phones = { A: cols.A.querySelector('.pw-phone'), B: cols.B.querySelector('.pw-phone') };
  const fingers = { A: cols.A.querySelector('.pw-finger'), B: cols.B.querySelector('.pw-finger') };
  const L = []; pin.querySelectorAll('.pw-layer').forEach((l) => (L[+l.dataset.i] = l));
  const pinsBox = { A: cols.A.querySelector('.pw-pins'), B: cols.B.querySelector('.pw-pins') };
  const pinsOf = (i) => [...pin.querySelectorAll(`.pw-pin[data-s="${i}"]`)];
  const wire = $q('.pw-wire'), packet = $q('.pw-packet'), chip = $q('.pw-chip');
  const stepsLi = [...pin.querySelectorAll('.pw-steps li')];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const BAR = 147;
  const sc = () => Number(getComputedStyle(root).getPropertyValue('--s')) || 1;
  const byStep = D.steps.map((_, k) => D.screens.map((s, i) => (s.step === k ? i : -1)).filter((i) => i >= 0));

  // images: load all, preload frame sequences, sample status / home colours
  L.forEach((l) => { const im = l.querySelector('img'); if (im) im.loading = 'eager'; });
  D.screens.forEach((sc_) => (sc_.frames || []).forEach((f) => { const im = new Image(); im.src = f; }));
  L.forEach((l) => {
    const img = l.querySelector('img'); if (!img) return;
    const paint = () => {
      try {
        const c = document.createElement('canvas'); c.width = 8; c.height = 2; const x = c.getContext('2d');
        x.drawImage(img, 0, 0, img.naturalWidth, 6, 0, 0, 8, 2);
        let [r, g, b] = x.getImageData(4, 0, 1, 1).data;
        l.querySelector('.pw-status').style.background = `rgb(${r},${g},${b})`;
        l.classList.toggle('dark', r * 0.299 + g * 0.587 + b * 0.114 < 140);
        x.drawImage(img, 0, img.naturalHeight - 4, img.naturalWidth, 4, 0, 0, 8, 2);
        [r, g, b] = x.getImageData(4, 0, 1, 1).data;
        l.querySelector('.pw-home').style.background = `rgb(${r},${g},${b})`;
        l.classList.toggle('dark-home', r * 0.299 + g * 0.587 + b * 0.114 < 140);
      } catch (e) { /* keep white */ }
    };
    if (img.complete && img.naturalWidth) paint(); else img.addEventListener('load', paint);
  });

  let pinH = 900;
  function layout() {
    pinH = Math.max(560, innerHeight / sc() - BAR);
    pin.style.height = `${pinH}px`;
    const ph = Math.min(pinH - 22 - 40 - 46 - 44, 700);
    Object.values(phones).forEach((p) => p.style.setProperty('--ph', `${ph}px`));
  }

  /* ---- screens, per phone ---- */
  const cur = { A: -1, B: -1 };
  const PUSH = 'transform .6s cubic-bezier(.3,.7,.2,1), opacity .6s ease';
  function setLayer(l, tf, op, z, vis, anim) {
    l.style.transition = anim ? PUSH : 'none';
    l.style.transform = tf; l.style.opacity = op; l.style.zIndex = z; l.style.visibility = vis;
  }
  function show(i, how = 'cut', silent) {
    const p = D.screens[i].phone, fromI = cur[p], from = fromI >= 0 ? L[fromI] : null, to = L[i];
    to.classList.remove('ticked', 'notif', 'banner');
    { const f = D.screens[i].frames; if (f && f.length) to.querySelector('img').src = f[0]; }
    pinsBox[p].style.visibility = 'hidden'; pinsBox[p].querySelectorAll('.pw-pin').forEach((d) => d.classList.remove('on'));
    const mine = L.filter((l, k) => l && D.screens[k].phone === p);
    if (!from || from === to || how === 'cut' || reduce) {
      mine.forEach((l) => { setLayer(l, 'none', 1, l === to ? 2 : 1, l === to ? 'visible' : 'hidden', false); l.style.setProperty('--shade', 0); });
    } else {
      const start = { push: 'translateX(100%)', back: 'translateX(-100%)', fade: 'none' }[how] || 'translateX(100%)';
      setLayer(to, start, how === 'fade' ? 0 : 1, 3, 'visible', false);
      void to.offsetWidth;
      setLayer(to, 'none', 1, 3, 'visible', true);
      setLayer(from, how === 'push' ? 'translateX(-28%)' : how === 'back' ? 'translateX(28%)' : 'none', 1, 2, 'visible', true);
      from.style.setProperty('--shade', how === 'fade' ? 0 : 0.18);
      setTimeout(() => { if (cur[p] !== fromI) { from.style.visibility = 'hidden'; from.style.setProperty('--shade', 0); } }, 650);
    }
    cur[p] = i;
    if (!silent) setText(i);
  }
  let lastStep = -1;
  function setText(i) {
    const s = D.screens[i], st = D.steps[s.step];
    if (s.step !== lastStep) {
      [$q('.pw-num'), $q('.pw-title')].forEach((e) => { e.classList.remove('swap'); void e.offsetWidth; e.classList.add('swap'); });
      $q('.pw-num').textContent = st[0]; $q('.pw-title').textContent = st[1];
      stepsLi.forEach((li, k) => { li.classList.toggle('on', k === s.step); li.classList.toggle('done', k < s.step); });
      lastStep = s.step;
    }
    $q('.pw-count b').textContent = i + 1; $q('.pw-badge').textContent = i + 1;
    setCap(s.cap, s.why);
  }
  function setCap(cap, why) {
    const R = $q('.pw-right'); R.classList.remove('swap'); void R.offsetWidth; R.classList.add('swap');
    $q('.pw-cap-t').textContent = cap; $q('.pw-why span').textContent = why;
  }
  function focusPhone(p) { cols.A.classList.toggle('idle', p !== 'A'); cols.B.classList.toggle('idle', p !== 'B'); }
  function place(p, xy) {
    const first = L[D.screens.findIndex((s) => s.phone === p)];
    const st = first.querySelector('.pw-status').offsetHeight, shot = first.querySelector('.pw-shot');
    fingers[p].style.left = `${(xy[0] / 100) * shot.offsetWidth}px`;
    fingers[p].style.top = `${st + (xy[1] / 100) * shot.offsetHeight}px`;
  }
  // what the other phone shows while this chapter plays
  function backdrop(k) {
    if (k < 3) { if (cur.B !== byStep[3][0]) show(byStep[3][0], 'cut', true); else L[cur.B].classList.remove('notif'); }
    if (k === 3) show(byStep[2][byStep[2].length - 1], 'cut', true);   // Rohan: his tickets
    if (k === 4) show(byStep[3][byStep[3].length - 1], 'cut', true);   // Dev: his ticket
  }
  function resetWire() { wire.className = 'pw-wire'; packet.style.transition = chip.style.transition = 'none'; }

  /* ---- a chapter's timeline (time-based, cancelled when the chapter changes) ---- */
  let run = 0, chapter = -1, startAt = null;
  const wait = (ms, id) => new Promise((res, rej) => setTimeout(() => (id === run ? res() : rej(0)), ms));
  const bar = (k, f) => { const i = stepsLi[k]?.querySelector('i'); if (i) i.style.width = `${f * 100}%`; };
  const nextEl = $q('.pw-next-t');

  async function send(dir, label, id) {
    resetWire();
    wire.classList.add(dir === 'AB' ? 'ab' : 'ba', 'live');
    chip.textContent = label;
    const a = dir === 'AB' ? '0%' : '100%', b = dir === 'AB' ? '100%' : '0%';
    packet.style.left = chip.style.left = a; void wire.offsetWidth;
    packet.style.transition = chip.style.transition = '';
    wire.classList.add('go');
    packet.style.left = chip.style.left = b;
    await wait(reduce ? 300 : 1750, id);
    wire.classList.remove('go');
  }

  async function play(k, from = 0, how) {
    if (startAt && startAt.k === k) { from = startAt.n; how = startAt.how; }
    startAt = null;
    const id = ++run;
    chapter = k;
    const P = D.steps[k][3];
    nextEl.textContent = k < NS - 1 ? 'Scroll for the next step' : 'Scroll to continue';
    stepsLi.forEach((li, j) => bar(j, j < k ? 1 : 0));
    const list = byStep[k];
    const cost = (i) => D.screens[i].taps.length + 1.6;
    const total = list.reduce((n, i) => n + cost(i), 0);
    let done = list.slice(0, from).reduce((n, i) => n + cost(i), 0);
    const tick = (n) => { done += n; bar(k, Math.min(1, done / total)); };
    bar(k, done / total);
    fingers.A.classList.remove('on'); fingers.B.classList.remove('on');
    pin.classList.remove('ended');
    resetWire();
    backdrop(k);
    focusPhone(P);
    show(list[from], how || (cur[P] >= 0 && D.screens[cur[P]].step === k - 1 ? 'push' : 'cut'));
    updArrows();
    try {
      // something arrives from the other phone first (link → Dev, "paid" → Rohan)
      const arr = D.arrive[list[from]];
      if (arr && !how) {
        await wait(500, id);
        await send(arr.dir, arr.label, id);
        L[list[from]].classList.add(arr.dir === 'AB' ? 'notif' : 'banner');
        await wait(1300, id);
      } else if (arr) { L[list[from]].classList.add(arr.dir === 'AB' ? 'notif' : 'banner'); }
      await wait(700, id);
      for (let n = from; n < list.length; n++) {
        const i = list[n], s = D.screens[i];
        if (s.hold) await wait(s.hold, id);
        if (!reduce) {
          for (let t = 0; t < s.taps.length; t++) {
            place(P, s.taps[t]);
            fingers[P].classList.add('on');
            await wait(t === 0 ? 650 : 520, id);
            fingers[P].classList.remove('tap'); void fingers[P].offsetWidth; fingers[P].classList.add('tap');
            if (D.pinScreens.includes(i)) { pinsBox[P].style.visibility = 'visible'; pinsOf(i)[t]?.classList.add('on'); }
            const act = s.taps[t][2];
            if (act === 'tick') { L[i].classList.add('ticked'); await wait(2600, id); }
            if (act === 'sub' && s.sub) { setCap(s.sub[0], s.sub[1]); await wait(900, id); }
            if (act === 'frame' && s.frames[t + 1]) L[i].querySelector('img').src = s.frames[t + 1];
            await wait(420, id);
            tick(1);
          }
        } else { await wait(1800, id); tick(s.taps.length); }
        await wait(s.taps.length ? 380 : 1600, id);
        fingers[P].classList.remove('on');
        if (n < list.length - 1) { show(list[n + 1], s.tr === 'fade' ? 'fade' : 'push'); updArrows(); await wait(1100, id); }
        tick(1.6);
      }
      bar(k, 1);
      pin.classList.add('ended');
    } catch (e) { /* chapter changed */ }
  }

  /* ---- pinning: while pinned the panel lives in a fixed host (no per-scroll movement = no shake) ---- */
  const host = document.createElement('div');
  host.className = 'pw-fixed case-study';
  document.body.appendChild(host);
  let mode = '';
  function placeHost() { const s = sc(), tr = track.getBoundingClientRect(); host.style.transform = `translate(${tr.left}px, ${BAR * s}px) scale(${s})`; }
  function setMode(m, range) {
    if (m === mode) return;
    mode = m;
    if (m === 'pinned') { placeHost(); pin.style.top = '0px'; host.appendChild(pin); }
    else { pin.style.top = m === 'after' ? `${range}px` : '0px'; track.appendChild(pin); }
  }
  function onScroll() {
    const r = track.getBoundingClientRect(), s = sc();
    const range = track.offsetHeight - pinH;
    const off = Math.min(range, Math.max(0, (BAR * s - r.top) / s));
    setMode(off <= 0 ? 'before' : off >= range ? 'after' : 'pinned', range);
    const k = Math.min(NS - 1, Math.floor((off / range) * NS));
    if (off > 0 && off < range) { if (k !== chapter) play(k); }
    else if (off <= 0 && chapter !== -1) {
      run++; chapter = -1; lastStep = -1;
      fingers.A.classList.remove('on', 'tap'); fingers.B.classList.remove('on', 'tap');
      stepsLi.forEach((li, j) => { bar(j, 0); li.classList.toggle('on', j === 0); li.classList.remove('done'); });
      pin.classList.remove('ended'); resetWire();
      show(byStep[3][0], 'cut', true); show(0); focusPhone('A');
    }
  }
  function goTo(k) {
    const r = track.getBoundingClientRect(), s = sc();
    const range = track.offsetHeight - pinH;
    scrollTo({ top: scrollY + r.top - BAR * s + ((k + 0.5) / NS) * range * s, behavior: 'smooth' });
    if (k === chapter) play(k);
  }

  // ‹ › one screen back / forward (crossing steps and phones), ↻ replay the step
  function updArrows() {
    const at = chapter >= 0 ? cur[D.steps[chapter][3]] : 0;
    $q('.pw-prev').disabled = at <= 0;
    $q('.pw-nextbtn').disabled = at >= N - 1;
  }
  function stepTo(i, how) {
    if (i < 0 || i >= N) return;
    const k = D.screens[i].step, n = byStep[k].indexOf(i);
    if (k === chapter) { play(k, n, how); return; }
    startAt = { k, n, how };
    goTo(k);
  }
  const here = () => cur[D.steps[Math.max(0, chapter)][3]];
  $q('.pw-prev').addEventListener('click', () => stepTo(here() - 1, 'back'));
  $q('.pw-nextbtn').addEventListener('click', () => stepTo(here() + 1, 'push'));
  $q('.pw-replay').addEventListener('click', () => play(Math.max(0, chapter)));

  layout();
  show(byStep[3][0], 'cut', true);   // Dev's phone waits on the lock screen
  show(0); focusPhone('A');
  stepsLi[0].classList.add('on');
  onScroll();
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', () => { layout(); mode = ''; onScroll(); placeHost(); });
  stepsLi.forEach((li, k) => {
    li.tabIndex = 0; li.setAttribute('role', 'button'); li.setAttribute('aria-label', `Play step ${k + 1}: ${D.steps[k][1]}`);
    li.addEventListener('click', () => goTo(k));
    li.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); goTo(k); } });
  });
  updArrows();
})();

/* ---------- about: hobbies roll straight up, one after another, in a loop ---------- */
(() => {
  const loop = document.querySelector('.hobby-loop');
  if (!loop) return;
  const strip = loop.querySelector('.hobby-strip');
  const words = [...strip.children];           // last one repeats the first, for a seamless wrap
  const fit = (w) => loop.style.setProperty('--hw', w.offsetWidth + 'px');
  let i = 0;
  requestAnimationFrame(() => fit(words[0]));
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  setInterval(() => {
    if (document.hidden) return;
    i += 1;
    strip.classList.add('roll');
    strip.style.transform = `translateY(${-i * 40}px)`;
    fit(words[i]);
    if (i === words.length - 1) {                // landed on the copy of the first word: jump back unseen
      setTimeout(() => {
        strip.classList.remove('roll');
        strip.style.transform = 'translateY(0)';
        i = 0;
      }, 750);
    }
  }, 2200);
})();

/* ---------- background warm-up ----------
   After the page is up: (1) case studies quietly load their remaining images in order,
   so nothing pops in while scrolling; (2) every other page and its first-screen images
   are fetched into the cache, so opening a project feels instant. Skipped on Save-Data / 2G. */
(() => {
  const net = navigator.connection || {};
  const slow = net.saveData || /(^|-)2g$/.test(net.effectiveType || '');
  const idle = (fn, t = 1200) => ('requestIdleCallback' in window ? requestIdleCallback(fn, { timeout: t }) : setTimeout(fn, 300));
  const base = location.pathname.replace(/(projects\/)?[^/]*$/, '');
  const PAGES = ['index.html', 'about.html', 'projects.html', 'projects/book-my-show-2.html',
                 'projects/rerouting-devotion.html', 'projects/teerth-sathi.html'];
  const here = location.pathname.replace(base, '') || 'index.html';
  const seen = new Set();
  const warm = (url) => { if (seen.has(url)) return; seen.add(url); const i = new Image(); i.decoding = 'async'; i.src = url; };

  async function progressive() {           // case studies: load everything below the fold, top to bottom
    const lazy = [...document.querySelectorAll('img[loading="lazy"]')];
    for (let i = 0; i < lazy.length; i += 6) {
      const batch = lazy.slice(i, i + 6);
      batch.forEach((im) => (im.loading = 'eager'));
      await Promise.race([Promise.all(batch.map(imgDone)), wait(4000)]);
    }
  }
  async function prefetchPages() {
    for (const pg of PAGES) {
      if (pg === here) continue;
      const url = base + pg;
      try {
        const html = await (await fetch(url, { credentials: 'same-origin' })).text();
        const doc = new DOMParser().parseFromString(html, 'text/html');
        const dir = url.replace(/[^/]*$/, '');
        // first-screen images: those placed in the top ~1100 design px
        const firsts = [...doc.querySelectorAll('img[src]')].filter((im) => {
          for (let n = im; n && n.getAttribute; n = n.parentElement) {
            const m = /(?:^|;)\s*top:\s*(-?[\d.]+)px/.exec(n.getAttribute('style') || '');
            if (m) return parseFloat(m[1]) < 1100;
          }
          return true;
        }).slice(0, 40);
        firsts.forEach((im) => warm(new URL(im.getAttribute('src'), dir).href));
        if (pg === 'projects.html') doc.querySelectorAll('.art img').forEach((im) => warm(new URL(im.getAttribute('src'), dir).href));
      } catch (_) {}
      await wait(250);
    }
  }
  addEventListener('load', () => idle(async () => {
    if (LONG) await progressive();
    if (!slow) idle(prefetchPages, 3000);
  }));
})();
