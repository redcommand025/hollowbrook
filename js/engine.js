/* engine.js: core loop, state, rendering, save/load.  Owner: Jenny
 * Load order in index.html: engine.js first, then every module. Modules call G.register(mod) on load.
 * Option shape: { label, run(state) -> { text, minutes } , disabled?: bool, hint?: string }
 */
(function () {
  'use strict';
  var SAVE_KEY = 'hollowbrook_save_v1';
  /* Safe storage: some browsers (private mode, in-app/webview, strict privacy) throw on localStorage. Fall back to memory. */
  /* Small polyfills so older phone and console browsers can run the game. */
  if (typeof Object.assign !== 'function') Object.assign = function (t) { for (var i = 1; i < arguments.length; i++) { var s = arguments[i]; if (s) for (var k in s) if (Object.prototype.hasOwnProperty.call(s, k)) t[k] = s[k]; } return t; };
  if (!Array.prototype.includes) Array.prototype.includes = function (v) { return this.indexOf(v) !== -1 || (v !== v && this.some(function (x) { return x !== x; })); };
  if (!Array.prototype.find) Array.prototype.find = function (f, t) { for (var i = 0; i < this.length; i++) if (f.call(t, this[i], i, this)) return this[i]; };
  if (!Array.prototype.findIndex) Array.prototype.findIndex = function (f, t) { for (var i = 0; i < this.length; i++) if (f.call(t, this[i], i, this)) return i; return -1; };
  if (!String.prototype.includes) String.prototype.includes = function (s, p) { return this.indexOf(s, p || 0) !== -1; };
  if (!Element.prototype.matches) Element.prototype.matches = Element.prototype.msMatchesSelector || Element.prototype.webkitMatchesSelector;
  if (!Element.prototype.closest) Element.prototype.closest = function (sel) { var el = this; while (el && el.nodeType === 1) { if (el.matches(sel)) return el; el = el.parentElement; } return null; };
  // Show script errors on screen so players can report them.
  window.addEventListener('error', function (e) {
    try {
      var bar = document.getElementById('errbar');
      if (!bar) { bar = document.createElement('div'); bar.id = 'errbar'; bar.style.cssText = 'position:fixed;left:0;right:0;bottom:0;z-index:5000;background:#5a1d1d;color:#fff;font:12px system-ui;padding:6px 10px;white-space:pre-wrap'; document.body.appendChild(bar); }
      bar.textContent = 'Something broke: ' + e.message + ' (' + String(e.filename || '').split('/').pop().split('?')[0] + ':' + e.lineno + ':' + (e.colno || 0) + ') [build 20261019l]. Please tell the developers.';
    } catch (x) {}
  });
  var memStore = {};
  var store = {
    get: function (k) { try { return window.localStorage.getItem(k); } catch (e) { return memStore.hasOwnProperty(k) ? memStore[k] : null; } },
    set: function (k, v) { try { window.localStorage.setItem(k, v); } catch (e) { memStore[k] = String(v); } },
    remove: function (k) { try { window.localStorage.removeItem(k); } catch (e) { delete memStore[k]; } }
  };

  var mods = [], handlers = {}, tabs = [], pendingNotes = [], started = false;

  var G = window.G = {
    store: store,
    version: '0.1',
    state: {},
    time: { day: 1, hour: 7, minute: 30, weekday: 'Monday', clock: '07:30' },
    limits: {},          // path -> [min, max]; modules may add their own
    labels: {},          // path -> friendly name for notifications
    modules: mods
  };

  /* ---------- events ---------- */
  G.on = function (ev, fn) { (handlers[ev] = handlers[ev] || []).push(fn); };
  G.emit = function (ev, data) { (handlers[ev] || []).slice().forEach(function (fn) { try { fn(data, G.state); } catch (e) { console.error(ev, e); } }); };

  /* ---------- modules ---------- */
  G.register = function (mod) {
    if (!mod || !mod.id) return console.error('Module missing id', mod);
    if (mods.some(function (m) { return m.id === mod.id; })) return;
    mods.push(mod);
  };
  G.module = function (id) { return mods.filter(function (m) { return m.id === id; })[0]; };

  /* Character menu tabs. Modules add tabs: G.addTab({ id, label, order, render(state) -> html }) */
  G.addTab = function (tab) { tabs = tabs.filter(function (t) { return t.id !== tab.id; }); tabs.push(tab); tabs.sort(function (a, b) { return (a.order || 50) - (b.order || 50); }); };

  /* ---------- state paths ---------- */
  function getPath(path) { return path.split('.').reduce(function (o, k) { return o == null ? undefined : o[k]; }, G.state); }
  function setPath(path, val) {
    var keys = path.split('.'), o = G.state;
    for (var i = 0; i < keys.length - 1; i++) { if (o[keys[i]] == null) o[keys[i]] = {}; o = o[keys[i]]; }
    o[keys[keys.length - 1]] = val;
  }
  G.get = getPath;
  G.set = setPath;

  function limitFor(path) {
    if (G.limits[path]) return G.limits[path];
    if (path.indexOf('stats.needs.') === 0) return [0, 1000];
    if (path.indexOf('stats.clothing.') === 0) return [0, 100];
    if (path === 'money') return [0, Infinity];
    return [-Infinity, Infinity];
  }
  function prettyName(path) {
    if (G.labels[path]) return G.labels[path];
    var last = path.split('.').pop().replace(/([A-Z])/g, ' $1');
    return last.charAt(0).toUpperCase() + last.slice(1);
  }

  /* G.change(path, delta, opts) -> actual delta applied. opts.silent skips the notice. */
  G.change = function (path, delta, opts) {
    opts = opts || {};
    var cur = Number(getPath(path)) || 0, lim = limitFor(path);
    var next = Math.max(lim[0], Math.min(lim[1], cur + delta));
    var real = next - cur;
    setPath(path, next);
    if (real && !opts.silent) {
      var name = prettyName(path);
      var shown = path === 'money' ? (real > 0 ? '+$' : '-$') + Math.abs(real).toFixed(2).replace(/\.00$/, '') : (real > 0 ? '+' : '') + Math.round(real);
      G.notify(name + ' ' + shown, real > 0 ? 'up' : 'down', path);
    }
    G.emit('change', { path: path, delta: real, value: next });
    return real;
  };

  /* ---------- story + notices ---------- */
  G.notify = function (msg, kind, key) {
    if (key) { // merge repeated changes to the same stat in one turn
      var prev = pendingNotes.filter(function (n) { return n.key === key; })[0];
      if (prev && key !== 'text') { prev.sum = (prev.sum || 0); }
    }
    pendingNotes.push({ msg: msg, kind: kind || 'info', key: key });
    if (!busy) renderNotes();
  };
  var busy = false, storyHtml = '';
  G.story = function (html) { storyHtml = html; el('story').innerHTML = html; };
  G.appendStory = function (html) { storyHtml += html; el('story').innerHTML = storyHtml; };

  function renderNotes() {
    var box = el('notices');
    // collapse numeric notices on the same path into one line
    var merged = [], byKey = {};
    pendingNotes.forEach(function (n) {
      var m = n.key && n.key !== 'text' && /[+-]\$?[\d.]+$/.exec(n.msg);
      if (m && byKey[n.key]) {
        var a = byKey[n.key]; a.total += parseFloat(n.msg.slice(m.index).replace('$', ''));
        a.kind = a.total >= 0 ? 'up' : 'down';
        var isMoney = n.key === 'money';
        a.msg = prettyName(n.key) + ' ' + (a.total >= 0 ? '+' : '-') + (isMoney ? '$' : '') + Math.abs(isMoney ? +a.total.toFixed(2) : Math.round(a.total));
      } else {
        var c = { msg: n.msg, kind: n.kind, key: n.key, total: m ? parseFloat(n.msg.slice(m.index).replace('$', '')) : 0 };
        if (m) byKey[n.key] = c; merged.push(c);
      }
    });
    box.innerHTML = merged.filter(function (n) { return !n.key || n.total !== 0 || !/[+-]/.test(n.msg); })
      .map(function (n) { return '<div class="note ' + n.kind + '">' + n.msg + '</div>'; }).join('');
  }

  /* ---------- turn loop ---------- */
  G.tick = function (minutes) {
    minutes = Math.max(0, minutes | 0);
    // world first (it owns the clock), then everyone else
    var ordered = mods.slice().sort(function (a, b) { return (a.id === 'world' ? -1 : 0) - (b.id === 'world' ? -1 : 0); });
    ordered.forEach(function (m) { if (m.onTick) { try { m.onTick(minutes, G.state); } catch (e) { console.error(m.id + '.onTick', e); } } });
    G.emit('tick', { minutes: minutes });
  };

  G.act = function (opt) {
    if (!opt || opt.disabled) return;
    busy = true; pendingNotes = [];
    var res;
    try { res = opt.run(G.state) || {}; } catch (e) { console.error(e); res = { text: '<p><i>Something went wrong with that action.</i></p>', minutes: 0 }; }
    G.story(res.text || '');
    G.tick(res.minutes || 0);
    G.emit('action', { option: opt, result: res });
    busy = false;
    renderNotes();
    G.save(true);
    render();
  };

  /* Any module can trigger a forced scene (e.g. passing out): returns to normal next turn. */
  G.interrupt = function (res) { G.story(res.text || ''); if (res.minutes) G.tick(res.minutes); render(); };

  /* ---------- rendering ---------- */
  function el(id) { return document.getElementById(id); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  G.esc = esc;
  /* Action duration label, format (h:mm). Options declare `time: minutes` and the engine appends it. */
  G.fmtTime = function (m) { m = Math.max(0, Math.round(m)); return '(' + Math.floor(m / 60) + ':' + (m % 60 < 10 ? '0' : '') + (m % 60) + ')'; };

  /* Fallback when an option doesn't declare `time`: if its run() source returns exactly one literal minutes value, use it. */
  var timeCache = typeof WeakMap === 'function' ? new WeakMap() : null;
  function guessTime(o) {
    if (o.time === false || typeof o.run !== 'function') return null;
    if (timeCache && timeCache.has(o.run)) return timeCache.get(o.run);
    var src = String(o.run), re = /minutes\s*:\s*([^,}\s]+)/g, m, vals = {}, n = 0, ok = true;
    while ((m = re.exec(src))) { if (!/^\d+$/.test(m[1])) { ok = false; break; } if (!vals[m[1]]) { vals[m[1]] = 1; n++; } }
    var t = ok && n === 1 ? +Object.keys(vals)[0] : null;
    if (t === 0) t = null;
    if (timeCache) timeCache.set(o.run, t);
    return t;
  }

  function collectOptions() {
    var all = { dialogue: [], actions: [], travel: [], other: [] };
    mods.forEach(function (m) {
      if (!m.getOptions) return;
      var o; try { o = m.getOptions(G.state) || {}; } catch (e) { console.error(m.id + '.getOptions', e); return; }
      ['dialogue', 'actions', 'travel', 'other'].forEach(function (k) { (o[k] || []).forEach(function (x) { if (x) all[k].push(x); }); });
    });
    // Modules can block travel/actions (e.g. in class, passed out) via G.state.lock = { reason, allow: ['actions'] }
    var lock = G.state.lock;
    if (lock) ['dialogue', 'actions', 'travel', 'other'].forEach(function (k) {
      if ((lock.allow || []).indexOf(k) < 0) all[k] = all[k].filter(function (x) { return x.always; });
    });
    return all;
  }


  /* Priority sections for options. Modules may set o.section to one of these ids; otherwise it is guessed from the label. */
  var SECTIONS = [['now', 'Right now'], ['needs', 'Needs'], ['here', 'Here'], ['people', 'People'], ['shop', 'Shop'], ['self', 'Getting ready'], ['travel', 'Travel']];
  G.SECTIONS = SECTIONS;
  var RX = {
    now: /\b(attend|go to class|join (the )?class|lecture|seminar|exam|start (your |a )?shift|clock in|work (a|your) shift|ask for work|sit (the|your) test|catch the bus)\b/i,
    needs: /\b(pee|poo|toilet|restroom stall|use the (restroom|bathroom|toilet)|somewhere to (pee|go)|in your brief|cover yourself|hide|throw away ruined|rinse out|change (into|your) (brief|diaper|clothes)|sleep|nap|eat |drink |wake up|get dressed|put your clothes)\b/i,
    shop: /\b(buy|browse (the )?(racks|shelves|aisles|menu|stock)|sell|shop|checkout|queue at|order|pay for|aisle|rack)\b|\(\$\d/i,
    self: /\b(mirror|forecast|wardrobe|journal|phone|your bag|inventory|makeup|restyle|laundry|mend|sew|check yourself|your room|decorate)\b/i
  };
  var SUBSEC = { 'Groceries': 'shop', 'Aisles': 'shop', 'Your groceries': 'needs', 'Go to': 'travel', 'Travel to': 'travel' };
  function sectionOf(o, k) {
    if (o.section) return o.section === 'top' ? 'now' : o.section;
    if (o.priority === 'top' || o.urgent || o.pin || (typeof o.priority === 'number' && o.priority >= 90)) return 'now';
    if (k === 'travel') return 'travel';
    if (k === 'dialogue') return 'people';
    if (o.sub && SUBSEC[o.sub]) return SUBSEC[o.sub];
    var l = String(o.label || '').replace(/<[^>]+>/g, '');
    if (/\b(lift|pickpocket|shoplift|steal|pocket)\b/i.test(l)) return 'here';
    if (RX.now.test(l)) return 'now';
    if (RX.needs.test(l)) return 'needs';
    if (RX.shop.test(l)) return 'shop';
    if (RX.self.test(l)) return 'self';
    if (/^(talk|chat|ask|flirt|hang out|text|call|greet|give|hug|kiss|date)\b/i.test(l)) return 'people';
    return 'here';
  }
  function dormOnly(o) {
    if (o.anywhere) return false;
    var l = String(o.label || '');
    return /\bmirror\b|reflection|forecast/i.test(l) && !/fitting room|salon/i.test(l);
  }
  function inDorm() {
    var loc = (G.state.world && G.state.world.location) || '';
    return /^dorm_room$|^home_/.test(loc);
  }
  var current = {};
  /* Persistent banners: modules register fn() -> html or null; shown above the story every render. */
  var banners = [];
  G.addBanner = function (fn) { banners.push(fn); };
  function renderBanners() {
    var b = el('banners'); if (!b) return;
    var out = '';
    banners.forEach(function (fn) { try { var h = fn(); if (h) out += '<div class="banner">' + h + '</div>'; } catch (e) { console.error(e); } });
    b.innerHTML = out; b.hidden = !out;
  }
  function render() {
    if (!started) return;
    renderBanners();
    current = collectOptions();
    var html = '', visibleN = 0, hints = !G.settings || G.settings.numberHints !== false;
    var buckets = {}; SECTIONS.forEach(function (sec) { buckets[sec[0]] = []; });
    ['dialogue', 'actions', 'other', 'travel'].forEach(function (k) {
      current[k].forEach(function (o, i) {
        if (dormOnly(o) && !inDorm()) return;
        var sec = sectionOf(o, k); (buckets[sec] || buckets.here).push({ o: o, k: k, i: i });
      });
    });
    SECTIONS.forEach(function (sec) {
      var list = buckets[sec[0]]; if (!list.length) return;
      list = list.map(function (it, n) { it.n = n; return it; }).sort(function (a, b) { var pa = typeof a.o.priority === 'number' ? a.o.priority : 0, pb = typeof b.o.priority === 'number' ? b.o.priority : 0; return pb - pa || a.n - b.n; });
      html += '<section class="optgroup sec-' + sec[0] + '"><h3>' + sec[1] + ':</h3><ul>';
      var lastSub = null;
      list.forEach(function (it) {
        var o = it.o, k = it.k, i = it.i;
        if (o.sub && o.sub !== lastSub) { html += '</ul><h4 class="optsub">' + esc(o.sub) + ':</h4><ul>'; lastSub = o.sub; }
        var lbl = o.label, tv = [o.time, o.mins, o.minutes].filter(function (v) { return v !== undefined && v !== null; })[0], tm = null;
        if (typeof tv === 'function') { try { tv = tv(G.state); } catch (e) { tv = null; } }
        tm = typeof tv === 'number' ? tv : guessTime(o);
        if (tm !== null && tm > 0 && !/\(\d+:\d\d\)/.test(String(lbl))) lbl += ' <span class="tm">' + G.fmtTime(tm) + '</span>';
        html += '<li><a href="#" class="opt' + (o.disabled ? ' disabled' : '') + '" data-g="' + k + '" data-i="' + i + '"' +
          (o.hint ? ' title="' + esc(o.hint) + '"' : '') + '>' + (hints && !o.disabled && visibleN < 9 ? '<span class="num">' + (visibleN + 1) + '</span>' : '') + lbl + '</a></li>';
        if (!o.disabled) visibleN++;
      });
      html += '</ul></section>';
    });
    el('options').innerHTML = html;
    renderPanel();
  }
  G.render = render;

  var NEEDS = [
    ['fatigue', 'Fatigue', 700], ['stress', 'Stress', 700], ['control', 'Control', null],
    ['bladder', 'Bladder', 600], ['bowels', 'Bowels', 600], ['thirst', 'Thirst', null], ['hunger', 'Hunger', null]
  ];
  function renderPanel() {
    var s = G.state, n = (s.stats && s.stats.needs) || {}, t = G.time;
    var who = (s.creation && s.creation.player && s.creation.player.name) || 'You';
    var loc = (G.world && G.world.location) ? (G.world.location() || {}).name || '' : '';
    var h = '<div class="who">' + esc(who) + '</div>';
    h += '<div class="clock">' + (t.weekday || '') + ', Day ' + t.day + ' · ' + (t.clock || '') + (t.season ? ' · ' + t.season : '') + '</div>';
    if (loc) h += '<div class="loc">' + esc(loc) + '</div>';
    h += '<div class="money">$' + (Number(s.money) || 0).toFixed(2) + '</div>';
    NEEDS.forEach(function (row) {
      var v = Math.round(Number(n[row[0]]) || 0), pct = v / 10;
      // thirst, hunger, control: low is bad. others: high is bad.
      var lowBad = ['thirst', 'hunger', 'control'].indexOf(row[0]) >= 0;
      var bad = lowBad ? v < 250 : (row[2] && v >= row[2]);
      h += '<div class="need' + (bad ? ' warn' : '') + '"><span>' + row[1] + '</span><span class="val">' + v + '</span>' +
        '<div class="bar"><div style="width:' + pct + '%"></div></div></div>';
    });
    h += '<button id="btn-char">Character</button>';
    h += '<div class="sysbtns"><button id="btn-saves">Saves</button><button id="btn-help">How to play</button><button id="btn-settings">Settings</button></div>';
    el('panel').innerHTML = h;
  }

  function openCharMenu(tabId) {
    var m = el('charmenu');
    if (!tabs.length) { el('charbody').innerHTML = '<p>Nothing to show yet.</p>'; m.hidden = false; return; }
    tabId = tabId || tabs[0].id;
    el('chartabs').innerHTML = tabs.map(function (t) { return '<button data-tab="' + t.id + '" class="' + (t.id === tabId ? 'on' : '') + '">' + t.label + '</button>'; }).join('');
    var tab = tabs.filter(function (t) { return t.id === tabId; })[0];
    var body; try { body = tab.render(G.state); } catch (e) { console.error(e); body = '<p>This tab failed to load.</p>'; }
    el('charbody').innerHTML = body;
    m.hidden = false;
  }
  G.openCharMenu = openCharMenu;

  /* ---------- save / load: autosave + 3 slots ---------- */
  var SLOT_KEY = function (n) { return SAVE_KEY + '_slot' + n; };
  function readSave(key) { try { var r = store.get(key); return r ? JSON.parse(r) : null; } catch (e) { return null; } }
  function saveSummary(st) {
    if (!st) return '<span class="flavor">Empty</span>';
    var p = (st.creation && st.creation.player) || {}, w = st.world || {};
    var when = st._savedAt ? new Date(st._savedAt).toLocaleString() : '';
    return esc(p.name || 'Unnamed') + ' · Day ' + (w.day || 1) + ' · $' + (Number(st.money) || 0).toFixed(0) + (when ? ' <span class="flavor">(' + when + ')</span>' : '');
  }
  G.save = function (quiet) {
    try { G.state._savedAt = Date.now(); store.set(SAVE_KEY, JSON.stringify(G.state)); if (!quiet) G.notify('Game saved.', 'info'); } catch (e) { console.error(e); }
  };
  G.saveSlot = function (n) {
    G.state._savedAt = Date.now(); store.set(SLOT_KEY(n), JSON.stringify(G.state)); G.notify('Saved to slot ' + n + '.', 'info'); openSaves();
  };
  function resume(st, msg) {
    G.state = st; initModules(); started = true;
    var cr0 = el('sol-creation'); if (cr0) cr0.remove();
    closeOverlay(); el('charmenu').hidden = true;
    pendingNotes = []; renderNotes();
    G.story(msg || '<p>You pick up where you left off.</p>'); render();
  }
  G.loadSlot = function (n) { var st = readSave(n === 0 ? SAVE_KEY : SLOT_KEY(n)); if (st) resume(st); };
  G.load = function () { var st = readSave(SAVE_KEY); if (!st) { G.notify('No save found.', 'info'); return false; } resume(st); return true; };
  G.newGame = function () {
    if (started && !confirm('Start a new game? Your autosave will be replaced (save slots are kept).')) return;
    store.remove(SAVE_KEY); location.reload();
  };

  /* ---------- overlays: title, saves, how to play ---------- */
  function overlay(html) {
    var o = el('overlay'); if (!o) { o = document.createElement('div'); o.id = 'overlay'; document.body.appendChild(o); }
    o.innerHTML = '<div class="sheet">' + html + '</div>'; o.hidden = false;
  }
  function closeOverlay() { var o = el('overlay'); if (o) o.hidden = true; }
  G.closeOverlay = closeOverlay;

  function openSaves() {
    var h = '<button class="x" data-ov="close">×</button><h2>Saves</h2><p class="flavor">Your notebook of moments. The game also autosaves after every action.</p><table class="saves">';
    h += '<tr><td>Autosave</td><td>' + saveSummary(readSave(SAVE_KEY)) + '</td><td>' + (readSave(SAVE_KEY) ? '<button data-ov="load" data-n="0">Load</button>' : '') + '</td><td></td></tr>';
    for (var n = 1; n <= 3; n++) {
      var st = readSave(SLOT_KEY(n));
      h += '<tr><td>Slot ' + n + '</td><td>' + saveSummary(st) + '</td><td>' + (st ? '<button data-ov="load" data-n="' + n + '">Load</button>' : '') + '</td><td>' +
        (started ? '<button data-ov="save" data-n="' + n + '">Save here</button>' : '') + (st ? ' <button data-ov="del" data-n="' + n + '">Delete</button>' : '') + '</td></tr>';
    }
    h += '</table>';
    if (started) h += '<p><button data-ov="new">Start a new game</button></p>';
    overlay(h);
  }
  G.openSaves = openSaves;

  var HELP = [
    ['The basics', 'The story text at the top describes what just happened. Below it are your choices, sorted into Dialogue, Actions, Travel and Other. Click one, or press its number key (1 to 9). Every choice takes some time, and the clock in the side panel moves on.'],
    ['Your needs', 'Fatigue, Stress, Bladder and Bowels are bad when they are high. Thirst, Hunger and Control are bad when they are low. At 700 fatigue you start to feel tired, and at 1000 you pass out. A bladder past 600 nags at you; at 1000 you will have an accident. Eat, drink, rest and use restrooms to stay on top of things.'],
    ['Characteristics', 'Beauty, Physique, Willpower and Awareness grow as you use them and slowly fade if you neglect them. Skills are ranked F, F+, D, D+, C, C+, B, B+, A, A+ and S. Open the Character menu in the side panel to see them.'],
    ['College', 'Classes run on weekdays at 09:00 and 13:00. Attend, study and pass exams to keep your standing; skipping class raises delinquency.'],
    ['People', 'Hollowbrook\'s named residents keep their own schedules, so where you find them depends on the day and the hour. Kindness and time spent raise their opinion of you. Anyone can be romanced, but most will want you to finish something meaningful with them before you date.'],
    ['Money and trouble', 'Part-time work, farming and selling produce earn honest money. Skulduggery earns faster money but raises your crime rating, and getting caught has consequences.'],
    ['Journal', 'Forgot what someone asked of you? The Journal tab in the Character menu keeps a summary of every quest.']
  ];
  function openHelp() {
    overlay('<button class="x" data-ov="close">×</button><h2>How to Play</h2>' + HELP.map(function (x) { return '<h3>' + x[0] + '</h3><p>' + x[1] + '</p>'; }).join(''));
  }
  G.openHelp = openHelp;

  function openTitle() {
    var auto = readSave(SAVE_KEY), hasAuto = auto && auto.creation && auto.creation.done;
    overlay('<div class="title"><h1>Hollowbrook</h1><p class="flavor">A quiet college town, a rainy autumn, and a year that is entirely yours.</p>' +
      (hasAuto ? '<button data-ov="continue">Continue <span class="flavor">(' + saveSummary(auto) + ')</span></button>' : '') +
      '<button data-ov="begin">New game</button><button data-ov="saves">Load a save</button><button data-ov="help">How to play</button>' +
      '<p class="flavor small">All characters are adults (18+). Version ' + G.version + '</p></div>');
    el('overlay').classList.add('titlemode');
  }

  function freshState() {
    return { money: 40, lock: null, stats: { needs: { fatigue: 0, stress: 100, control: 800, bladder: 150, bowels: 100, thirst: 800, hunger: 750 }, clothing: { upperWetness: 0, upperIntegrity: 100, lowerWetness: 0, lowerIntegrity: 100 } } };
  }
  function initModules() { mods.forEach(function (m) { if (m.init) { try { m.init(G.state); } catch (e) { console.error(m.id + '.init', e); } } }); }

  /* Called by creation.js when the player finishes the creation screen. */
  G.start = function () {
    if (started) return;
    started = true;
    G.emit('start', G.state);
    var intro = '<p>Monday morning. ' + (G.time.season || 'Autumn') + ' light leaks around the thin curtains of your dorm room in Ashford Hall, and somewhere down the corridor a kettle is shrieking. Your first day at Hollowbrook College starts today.</p>';
    G.story(intro);
    pendingNotes = []; renderNotes(); render(); G.save(true);
  };

  /* ---------- boot ---------- */
  document.addEventListener('DOMContentLoaded', function () {
    document.body.addEventListener('click', function (e) {
      var a = e.target.closest('.opt');
      if (a) { e.preventDefault(); var o = current[a.dataset.g][+a.dataset.i]; G.act(o); return; }
      if (e.target.id === 'btn-char') return openCharMenu();
      if (e.target.closest('#chartabs') && e.target.dataset.tab) return openCharMenu(e.target.dataset.tab);
      if (e.target.id === 'charclose' || e.target.id === 'charmenu') { el('charmenu').hidden = true; return; }
      if (e.target.id === 'btn-saves') return openSaves();
      if (e.target.id === 'btn-help') return openHelp();
      var ov = e.target.closest('[data-ov]');
      if (ov) {
        var act = ov.dataset.ov, n = +ov.dataset.n;
        el('overlay').classList.remove('titlemode');
        if (act === 'close') { started ? closeOverlay() : openTitle(); }
        else if (act === 'continue') G.load();
        else if (act === 'begin') { closeOverlay(); store.remove(SAVE_KEY); if (!G.module('creation')) G.start(); }
        else if (act === 'saves') openSaves();
        else if (act === 'help') openHelp();
        else if (act === 'load') G.loadSlot(n);
        else if (act === 'save') G.saveSlot(n);
        else if (act === 'del') { if (confirm('Delete slot ' + n + '?')) { store.remove(SLOT_KEY(n)); openSaves(); } }
        else if (act === 'new') G.newGame();
        return;
      }
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { el('charmenu').hidden = true; if (started) closeOverlay(); }
      var n = parseInt(e.key, 10); // number keys pick the nth visible option
      var ovl = el('overlay'), menuOpen = !el('charmenu').hidden || (ovl && !ovl.hidden);
      if (started && !menuOpen && n >= 1 && n <= 9 && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) {
        var links = document.querySelectorAll('#options .opt:not(.disabled)'); if (links[n - 1]) links[n - 1].click();
      }
    });

    // Fresh state behind the title screen; creation.js opens underneath, the title sits on top.
    G.state = freshState(); initModules();
    openTitle();
  });
})();
