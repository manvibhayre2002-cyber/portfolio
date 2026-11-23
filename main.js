/* Manvi — portfolio behaviour: stage scaling, grid, loader, nav, "work with me". */

/* Fill these in to wire up the contact box. */
const CONTACT = {
  email: '',      // e.g. 'you@example.com' — the send arrow opens a pre-filled email to this address
  linkedin: '#',
  instagram: '#',
};

const PALETTE = ['#f8d71c', '#e24000', '#457247', '#f57cc3', '#2d4a9d', '#d83b1a', '#fba738'];
let W = 1512, H = 982;
const root = document.documentElement;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

/* ---------- fit the 1512×982 canvas to the viewport ---------- */
const stageEl = document.querySelector('.stage');
const LONG = root.classList.contains('long'); // case studies: fit width, scroll vertically


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
  const s = Math.min(vw / W, vh / (TOP + (bBot - bTop) + GAP * 2 + BOT));
  const ox = (vw - W * s) / 2;
  const oy = TOP * s + (vh - (TOP + BOT) * s) / 2 - s * (bTop + bBot) / 2;
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
    const chips = el('div', 'st-chips', [...document.querySelectorAll('.hobby')]);
    flow.append(title, $('.about-tag'), $('.bio'), cards, $('.notdesign'), chips, $('.resume'));
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
  let html = '<div class="a grid-frame" style="left:49px;top:228px;width:289px;height:362px"></div>';
  for (let i = 0; i < 8; i++) html += `<div class="a grid-v" style="left:${85.87 + 36.033 * i}px;top:228.84px;height:360.324px"></div>`;
  for (let j = 0; j < 9; j++) html += `<div class="a grid-h" style="left:49px;top:${266 + 36 * j}px;width:289px"></div>`;
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

  const form = document.querySelector('.contact-form');
  form && form.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = msg.value.trim();
    if (!text) { msg.focus(); return; }
    const send = form.querySelector('.send');
    send.classList.add('sent');
    setTimeout(() => {
      location.href = `mailto:${CONTACT.email}?subject=${encodeURIComponent("Let's work together")}&body=${encodeURIComponent(text)}`;
      msg.value = '';
      send.classList.remove('sent');
    }, 550);
  });
}

/* ---------- case studies: pin the header + tab bar while scrolling ---------- */
if (LONG) {
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

/* ---------- home: colour dots bounce ---------- */
document.querySelectorAll('.dot').forEach((d) => {
  d.addEventListener('mouseenter', () => (d.style.transform = 'scale(1.06)'));
  d.addEventListener('mouseleave', () => (d.style.transform = ''));
});

/* ---------- projects: filter pills — matching cards slide into the first slots ---------- */
const SLOTS = [[81, 210], [534, 210], [987, 210], [81, 535], [534, 535], [987, 535]];
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
document.querySelectorAll('.pill').forEach((p) => {
  p.addEventListener('click', () => {
    document.querySelectorAll('.pill').forEach((q) => q.setAttribute('aria-pressed', String(q === p)));
    arrange(p.dataset.cat);
  });
});
