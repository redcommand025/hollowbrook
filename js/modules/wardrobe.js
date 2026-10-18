/* wardrobe.js - clothing store, owned clothes, outfits on the pixel sprite (owner: Lucy)
 * Owns G.state.wardrobe:
 *   { items: [{uid, id, wet, integ, clean, days}], worn: {top, bottom, shoes, outer}, nextUid, mode, starter }
 * The WORN top's wetness/integrity live in stats.clothing.upper*, the worn bottom's in stats.clothing.lower*
 * (Jimmy's stats). They're copied back onto the item when it comes off, and copied in when it goes on.
 * Keeps stats.clothing.spareOutfits = clean top+bottom pairs in the wardrobe, for the Clothing tab.
 * Adds the "Threadbare & Co." clothing store in the Riverside Shopping Centre (id clothing_store, fitting room inside).
 * Public: window.Wardrobe = { CATALOG, spriteOutfit(p), style(), vibe(), describeOutfit(), worn(slot), owns(id), give(id, wear) }
 * Events: emits 'outfitChanged' {slot, id} and 'clothesBought' {id}.
 */
(function () {
  'use strict';

  // kind = how the sprite draws it. style 0-3 (how put-together), vibe f/m/n, dur = wear resistance,
  // rain = share of rain wetness an outer layer keeps off.
  var CATALOG = {
    // tops
    tee_white:   { slot: 'top', name: 'plain white tee', kind: 'tee', color: '#e6e2d6', price: 8, style: 1, vibe: 'n', desc: 'Soft cotton, goes with everything, shows every coffee drip.' },
    tee_band:    { slot: 'top', name: 'faded band tee', kind: 'tee', color: '#2d2d35', price: 14, style: 2, vibe: 'n', desc: 'A band nobody in Hollowbrook has heard of, which is the point.' },
    tee_sage:    { slot: 'top', name: 'sage green tee', kind: 'tee', color: '#6f9a80', price: 10, style: 1, vibe: 'n', desc: 'A calm green that looks good in autumn light.' },
    tank_rib:    { slot: 'top', name: 'ribbed tank top', kind: 'tank', color: '#c46f6f', price: 10, style: 1, vibe: 'n', desc: 'Good for the gym or a warm afternoon. Chilly otherwise.' },
    blouse:      { slot: 'top', name: 'linen blouse', kind: 'blouse', color: '#efe4cc', price: 24, style: 3, vibe: 'f', desc: 'Light, a little floaty, and creases if you so much as look at it.' },
    oxford:      { slot: 'top', name: 'oxford shirt', kind: 'buttonup', color: '#9db7d6', price: 26, style: 3, vibe: 'm', desc: 'Crisp collar, pale blue. Professors nod approvingly.' },
    flannel:     { slot: 'top', name: 'flannel shirt', kind: 'buttonup', color: '#8b3a3a', price: 18, style: 2, vibe: 'n', dur: 1.4, desc: 'Red check, warm and hard-wearing. Half the farm crew owns one.' },
    hoodie:      { slot: 'top', name: 'Hollowbrook hoodie', kind: 'hoodie', color: '#7a1f2b', price: 22, style: 1, vibe: 'n', desc: 'Maroon with the college crest. The unofficial uniform of exam week.' },
    sweater:     { slot: 'top', name: 'cable-knit sweater', kind: 'sweater', color: '#c9a46a', price: 30, style: 2, vibe: 'n', desc: 'Chunky oatmeal wool. Like wearing a hug.' },
    sweater_nv:  { slot: 'top', name: 'navy turtleneck', kind: 'sweater', color: '#2f3d5c', price: 32, style: 3, vibe: 'n', desc: 'Very literature-seminar. You will feel like you have opinions about poetry.' },
    hoodie_cat:  { slot: 'top', name: 'cat-print hoodie', kind: 'hoodie', color: '#9a8fb8', price: 24, style: 1, vibe: 'n', pet: true, desc: 'Lilac with little sleeping cats on it, and already a few real hairs no lint roller will ever fully defeat.' },
    // bottoms
    jeans:       { slot: 'bottom', name: 'blue jeans', kind: 'pants', color: '#3d5a80', price: 20, style: 1, vibe: 'n', dur: 1.3, desc: 'Sturdy denim that breaks in nicely.' },
    jeans_black: { slot: 'bottom', name: 'black jeans', kind: 'pants', color: '#26282f', price: 22, style: 2, vibe: 'n', dur: 1.3, desc: 'Slim and dark. Hides stains, mostly.' },
    chinos:      { slot: 'bottom', name: 'khaki chinos', kind: 'pants', color: '#b59f74', price: 24, style: 2, vibe: 'm', desc: 'Smart enough for the dean\'s office, comfy enough for the library.' },
    sweats:      { slot: 'bottom', name: 'grey sweatpants', kind: 'sweats', color: '#8a8d94', price: 12, style: 0, vibe: 'n', desc: 'Peak comfort. Not peak anything else.' },
    shorts:      { slot: 'bottom', name: 'denim shorts', kind: 'shorts', color: '#4f6d96', price: 14, style: 1, vibe: 'n', desc: 'Great in summer, regrettable in November.' },
    skirt:       { slot: 'bottom', name: 'pleated skirt', kind: 'skirt', color: '#4a4e69', price: 20, style: 2, vibe: 'f', desc: 'Charcoal pleats that swish when you walk.' },
    midi:        { slot: 'bottom', name: 'green midi skirt', kind: 'longskirt', color: '#5e8a6a', price: 26, style: 3, vibe: 'f', desc: 'Mid-calf and flowing. Very florist-on-a-Sunday.' },
    overalls:    { slot: 'bottom', name: 'work overalls', kind: 'overalls', color: '#44607a', price: 28, style: 1, vibe: 'n', dur: 2.2, desc: 'Heavy canvas with a bib pocket. Built for mud and long days on the farm.' },
    // shoes
    sneakers:    { slot: 'shoes', name: 'canvas sneakers', kind: 'sneakers', color: '#b33a3a', price: 25, style: 1, vibe: 'n', desc: 'Red canvas high-tops, already a little scuffed.' },
    sneakers_w:  { slot: 'shoes', name: 'white trainers', kind: 'sneakers', color: '#d9d9d9', price: 35, style: 2, vibe: 'n', desc: 'Box-fresh white. Keeping them that way is a full-time job.' },
    boots:       { slot: 'shoes', name: 'leather boots', kind: 'boots', color: '#5a3b26', price: 45, style: 2, vibe: 'n', rainL: 0.3, desc: 'Lace-up and waterproofed. Puddles are no longer your problem.' },
    flats:       { slot: 'shoes', name: 'ballet flats', kind: 'flats', color: '#2a2a33', price: 22, style: 2, vibe: 'f', desc: 'Simple black flats that go with almost anything.' },
    loafers:     { slot: 'shoes', name: 'brown loafers', kind: 'flats', color: '#6b4226', price: 30, style: 3, vibe: 'm', desc: 'Polished leather. You walk a little straighter in them.' },
    // outerwear
    raincoat:    { slot: 'outer', name: 'yellow raincoat', kind: 'raincoat', color: '#d9b13f', price: 35, style: 1, vibe: 'n', rain: 0.7, rainL: 0.35, desc: 'Hooded and bright as a lemon. Rain beads right off.' },
    denim_jkt:   { slot: 'outer', name: 'denim jacket', kind: 'jacket', color: '#46658f', price: 30, style: 2, vibe: 'n', rain: 0.3, desc: 'A classic that looks better the more worn in it gets.' },
    wool_coat:   { slot: 'outer', name: 'wool coat', kind: 'wool_coat', color: '#3b3330', price: 55, style: 3, vibe: 'n', rain: 0.45, rainL: 0.2, desc: 'Long, dark, and warm. Makes you look like you have somewhere important to be.' },
    walk_jkt:    { slot: 'outer', name: 'dog-walking jacket', kind: 'jacket', color: '#4d6b3c', price: 38, style: 1, vibe: 'n', dur: 1.5, rain: 0.5, rainL: 0.15, pet: true, desc: 'Waxed olive cotton, a treat pouch on one hip and a clip for a lead. Every dog in Hollowbrook knows what the pouch means.' },
    // seasonal lines (only on the racks in their season; last season's go to the clearance rail at half price)
    thermal:     { slot: 'top', name: 'cream thermal henley', kind: 'sweater', color: '#e2d6bf', price: 26, style: 2, vibe: 'n', season: 'winter', warm: true, desc: 'Waffle-knit and toasty. The sleeves always end up pushed to your elbows.' },
    puffer:      { slot: 'outer', name: 'navy puffer jacket', kind: 'wool_coat', color: '#26324f', price: 60, style: 1, vibe: 'n', season: 'winter', warm: true, rain: 0.55, rainL: 0.15, desc: 'Like wearing a sleeping bag with sleeves. You will not be cold. You will rustle.' },
    floral_top:  { slot: 'top', name: 'floral print blouse', kind: 'blouse', color: '#e9a9b4', price: 24, style: 3, vibe: 'f', season: 'spring', desc: 'Little blue flowers on blush pink. Very first-warm-day-of-the-year.' },
    trench:      { slot: 'outer', name: 'stone trench coat', kind: 'wool_coat', color: '#b8a27a', price: 58, style: 3, vibe: 'n', season: 'spring', rain: 0.55, rainL: 0.25, desc: 'Belted, double-breasted, and made for April showers. You feel like a detective.' },
    rain_boots:  { slot: 'shoes', name: 'green wellies', kind: 'boots', color: '#3f6a3a', price: 28, style: 0, vibe: 'n', season: 'spring', rainL: 0.5, desc: 'Rubber boots that turn every puddle into an opportunity.' },
    linen_shorts:{ slot: 'bottom', name: 'linen shorts', kind: 'shorts', color: '#d9c9a3', price: 18, style: 2, vibe: 'n', season: 'summer', desc: 'Light, breezy, and creased within five minutes. Worth it.' },
    sandals:     { slot: 'shoes', name: 'leather sandals', kind: 'flats', color: '#8a5a32', price: 24, style: 1, vibe: 'n', season: 'summer', desc: 'For warm pavements and the riverbank. Useless in rain.' },
    cords:       { slot: 'bottom', name: 'rust corduroy trousers', kind: 'pants', color: '#9b4a25', price: 30, style: 2, vibe: 'n', season: 'autumn', dur: 1.4, desc: 'Wide-wale cord the colour of fallen leaves. They make a faint swish when you walk.' },
    // accessories
    beanie:      { slot: 'head', name: 'knit beanie', kind: 'beanie', color: '#a33b3b', price: 12, style: 1, vibe: 'n', season: 'winter', warm: true, desc: 'Red ribbed wool. Hat hair is a small price to pay.' },
    cap:         { slot: 'head', name: 'baseball cap', kind: 'cap', color: '#2f4d6e', price: 14, style: 1, vibe: 'n', desc: 'A plain navy cap. Good for bad hair days and bright mornings.' },
    sunhat:      { slot: 'head', name: 'straw sun hat', kind: 'sunhat', color: '#d8bf7a', price: 18, style: 2, vibe: 'n', season: 'summer', desc: 'Wide-brimmed and a little dramatic. Keeps the sun off your nose.' },
    glasses:     { slot: 'face', name: 'round glasses', kind: 'glasses', color: '#2a2320', price: 40, style: 2, vibe: 'n', desc: 'Tortoiseshell frames with clear lenses. Instantly look ten percent more studious.' },
    sunglasses:  { slot: 'face', name: 'sunglasses', kind: 'sunglasses', color: '#1a1a1a', price: 20, style: 2, vibe: 'n', desc: 'Dark lenses for bright days. Indoors, people will have questions.' },
    studs:       { slot: 'ears', name: 'silver stud earrings', kind: 'studs', color: '#d6d9de', price: 15, style: 1, vibe: 'n', desc: 'Small and simple. You forget you are wearing them.' },
    hoops:       { slot: 'ears', name: 'gold hoop earrings', kind: 'hoops', color: '#d4a93a', price: 22, style: 2, vibe: 'n', desc: 'Medium hoops that catch the light when you turn your head.' },
    scarf_wool:  { slot: 'neck', name: 'grey wool scarf', kind: 'scarf', color: '#7d7f86', price: 16, style: 2, vibe: 'n', season: 'winter', warm: true, desc: 'Long enough to wrap twice. Smells faintly of woodsmoke after a week.' },
    scarf_plaid: { slot: 'neck', name: 'plaid scarf', kind: 'scarf', color: '#a45a2a', price: 18, style: 2, vibe: 'n', season: 'autumn', desc: 'Rust and mustard tartan, the official pattern of October.' },
    cardigan:    { slot: 'outer', name: 'mustard cardigan', kind: 'jacket', color: '#c79a2e', price: 24, style: 2, vibe: 'n', rain: 0.1, desc: 'Cosy, slightly librarian, entirely charming.' }
  };
  var CLOTH = ['top', 'bottom', 'shoes', 'outer'], ACC = ['head', 'face', 'ears', 'neck'];
  var SLOTS = CLOTH.concat(ACC);
  var SLOT_LABEL = { top: 'tops', bottom: 'bottoms', shoes: 'shoes', outer: 'outerwear', head: 'hats', face: 'glasses', ears: 'earrings', neck: 'scarves' };

  // outfit sets: wear every piece (any of the listed ids per slot) for a small bonus
  var SETS = [
    { id: 'scholar', name: 'Library Scholar', pieces: { top: ['sweater_nv', 'oxford'], bottom: ['chinos', 'cords'], shoes: ['loafers'] }, bonus: 'Stress builds more slowly while you study in the library or lecture hall.', where: ['library', 'lecture_hall'], stress: -3 },
    { id: 'farmhand', name: 'Farmhand', pieces: { top: ['flannel'], bottom: ['overalls'], shoes: ['boots', 'rain_boots'] }, bonus: 'Less tiring to work the campus farm.', where: ['campus_farm'], fatigue: -3 },
    { id: 'cozy', name: 'Cosy Weekend', pieces: { top: ['hoodie', 'hoodie_cat', 'sweater'], bottom: ['sweats'] }, bonus: 'Extra relaxing at home.', home: true, stress: -4 },
    { id: 'rainready', name: 'Rain Ready', pieces: { outer: ['raincoat', 'trench'], shoes: ['boots', 'rain_boots'] }, bonus: 'Bad weather barely bothers you outdoors.', rainy: true, stress: -3 },
    { id: 'winter', name: 'Winter Layers', pieces: { outer: ['wool_coat', 'puffer'], top: ['sweater', 'sweater_nv', 'thermal', 'flannel'], neck: ['scarf_wool', 'scarf_plaid'] }, bonus: 'Cold days outdoors feel far less draining.', cold: true, stress: -2, fatigue: -2 },
    { id: 'dogwalker', name: 'Dog Walker', pieces: { outer: ['walk_jkt'], bottom: ['jeans', 'jeans_black', 'cords'], shoes: ['boots', 'rain_boots', 'sneakers'] }, bonus: 'Pets out with you are noticeably happier.', pets: 3 },
    { id: 'nightout', name: 'Night Out', pieces: { top: ['blouse', 'oxford', 'tee_band', 'floral_top'], bottom: ['jeans_black', 'skirt', 'midi'], ears: ['hoops', 'studs'] }, bonus: 'You make a better impression in public places.', beauty: 1 },
    { id: 'summer', name: 'Riverside Summer', pieces: { bottom: ['linen_shorts', 'shorts'], shoes: ['sandals'], head: ['sunhat', 'cap'] }, bonus: 'Hot days are much easier to bear.', hot: true, stress: -2, thirst: -3 }
  ];
  function setDone(set) { var w = W(); return Object.keys(set.pieces).every(function (sl) { var it = wornItem(sl); return it && set.pieces[sl].indexOf(it.id) >= 0; }); }
  function activeSets() { return W() && W().starter ? SETS.filter(setDone) : []; }
  function season() { var g = G_(); try { return g.world && g.world.season ? String(g.world.season()).toLowerCase() : 'autumn'; } catch (e) { return 'autumn'; } }
  function onRack(d) { return !d.season || d.season === season(); }
  function priceOf(id) { var d = CATALOG[id]; return onRack(d) ? d.price : Math.ceil(d.price / 2); }
  var STORE = 'clothing_store';

  function G_() { return window.G; }
  function W() { return G_().state.wardrobe; }
  function C() { var s = G_().state; s.stats = s.stats || {}; s.stats.clothing = s.stats.clothing || { upperWetness: 0, upperIntegrity: 100, lowerWetness: 0, lowerIntegrity: 100 }; return s.stats.clothing; }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function item(uid) { var w = W(); for (var i = 0; i < w.items.length; i++) if (w.items[i].uid === uid) return w.items[i]; return null; }
  function def(it) { return it ? CATALOG[it.id] : null; }
  function wornItem(slot) { var w = W(); return w && w.worn[slot] != null ? item(w.worn[slot]) : null; }
  function money() { return Number(G_().state.money) || 0; }
  function hereId() { return G_().world && G_().world.hereId ? G_().world.hereId() : (G_().state.world || {}).location; }
  function hereTags() { var l = G_().world && G_().world.here ? G_().world.here() : null; return (l && l.tags) || []; }
  function isOpen(id) { return G_().world && G_().world.isOpen ? G_().world.isOpen(id) : true; }
  function opt(label, run, extra) { var o = { label: label, run: run }; if (extra) for (var k in extra) o[k] = extra[k]; return o; }

  function newItem(id) { var w = W(); var it = { uid: w.nextUid++, id: id, wet: 0, integ: 100, clean: true, days: 0 }; w.items.push(it); return it; }

  /* copy live stats -> the worn item (top/bottom) */
  function pullLive() {
    var c = C(), t = wornItem('top'), b = wornItem('bottom');
    if (t) { t.wet = c.upperWetness; t.integ = c.upperIntegrity; }
    if (b) { b.wet = c.lowerWetness; b.integ = c.lowerIntegrity; }
  }
  /* copy worn item -> live stats */
  function pushLive(slot) {
    var c = C(), it = wornItem(slot);
    if (slot === 'top') { c.upperWetness = it ? it.wet : 0; c.upperIntegrity = it ? it.integ : 100; }
    if (slot === 'bottom') { c.lowerWetness = it ? it.wet : 0; c.lowerIntegrity = it ? it.integ : 100; }
  }
  function syncSpare() {
    var w = W(), tops = 0, bots = 0;
    w.items.forEach(function (it) {
      if (!it.clean || it.integ < 5 || it.uid === w.worn.top || it.uid === w.worn.bottom) return;
      var d = def(it); if (!d) return;
      if (d.slot === 'top') tops++; else if (d.slot === 'bottom') bots++;
    });
    C().spareOutfits = Math.min(tops, bots);
  }

  function wear(uid) {
    var w = W(), it = item(uid), d = def(it); if (!d) return '';
    pullLive();
    var prev = wornItem(d.slot), note = '';
    if (prev) {
      if (prev.wet >= 10 || prev.days >= 1 || (d.slot === 'bottom' && G_().state.flags && G_().state.flags.dirty)) prev.clean = false;
      if (prev.integ < 5) { w.items.splice(w.items.indexOf(prev), 1); note = ' The old ' + def(prev).name + ' is past saving, so it goes in the bin.'; }
    }
    w.worn[d.slot] = uid; it.days = 0;
    pushLive(d.slot); syncSpare();
    G_().emit('outfitChanged', { slot: d.slot, id: it.id });
    return note;
  }
  function takeOff(slot) {
    var w = W(); if (slot === 'top' || slot === 'bottom') return;
    w.worn[slot] = null; G_().emit('outfitChanged', { slot: slot, id: null });
  }

  /* ---------- outfit read-outs ---------- */
  function style() {
    var total = 0, n = 0;
    SLOTS.forEach(function (s) { var it = wornItem(s); if (it) { total += ACC.indexOf(s) >= 0 ? def(it).style / 2 : def(it).style; n++; } });
    var c = C(), score = Math.round(total + (W().worn.outer != null ? 1 : 0) + Math.min(4, activeSets().length * 2) + (window.Salon && Salon.makeupStyle ? Salon.makeupStyle() : 0));
    if (window.G && G.salon && G.salon.scruffy && G.salon.scruffy()) score -= 1;
    if (c.upperWetness + c.lowerWetness >= 40) score -= 3;
    if (c.upperIntegrity < 40 || c.lowerIntegrity < 40) score -= 3;
    return clamp(score, 0, 10);
  }
  function vibe() {
    var f = 0, m = 0;
    SLOTS.forEach(function (s) { var it = wornItem(s); if (it) { var v = def(it).vibe; if (v === 'f') f++; if (v === 'm') m++; } });
    return f > m ? 'feminine' : m > f ? 'masculine' : 'neutral';
  }
  function describeOutfit() {
    var parts = [];
    ['top', 'bottom', 'outer', 'shoes', 'head', 'face', 'neck', 'ears'].forEach(function (s) { var it = wornItem(s); if (it) parts.push(def(it).name); });
    if (!parts.length) return 'You are not wearing much of anything.';
    var last = parts.pop(), txt = 'You\'re wearing ' + (parts.length ? parts.join(', ') + ' and ' : '') + last + '.';
    var st = style();
    txt += ' ' + (st >= 8 ? 'You look genuinely sharp today.' : st >= 5 ? 'It\'s a put-together look.' : st >= 3 ? 'Casual, but it works.' : 'It is, generously, an outfit.');
    var c = C();
    if (c.upperWetness + c.lowerWetness >= 40) txt += ' Your clothes are noticeably damp.';
    if (c.upperIntegrity < 40 || c.lowerIntegrity < 40) txt += ' A few seams are visibly giving up.';
    activeSets().forEach(function (st2) { txt += ' Full ' + st2.name + ' look.'; });
    return txt;
  }

  function starterIds(p) {
    var app = (p && p.appearance) || 'androgynous';
    var ids = ['tee_white', 'hoodie', 'jeans', 'sweats', 'sneakers'];
    if (app === 'female') ids.push('skirt', 'tee_sage'); else if (app === 'male') ids.push('flannel', 'chinos'); else ids.push('tee_band', 'jeans_black');
    return ids;
  }
  function look(id) { var d = CATALOG[id]; return { kind: d.kind, color: d.color }; }
  function spriteOutfit(p) {
    var g = G_(), w = g && g.state && g.state.wardrobe;
    if (!w || w.worn.top == null) {      // creation preview: the outfit you'd start in
      var app = (p && p.appearance) || 'androgynous';
      return { top: look(app === 'male' ? 'flannel' : 'tee_white'), bottom: look(app === 'female' ? 'skirt' : 'jeans'), shoes: look('sneakers') };
    }
    var c = C(), o = { wetU: c.upperWetness, wetL: c.lowerWetness, integU: c.upperIntegrity, integL: c.lowerIntegrity };
    SLOTS.forEach(function (s) { var it = wornItem(s); o[s] = it ? look(it.id) : null; });
    if (!o.top) o.top = { kind: 'tank', color: '#d8d0c0' };
    if (!o.bottom) o.bottom = { kind: 'shorts', color: '#d8d0c0' };
    if (!o.shoes) o.shoes = { kind: 'flats', color: '#000000' };
    return o;
  }

  function ensure(state) {
    if (!state.wardrobe) state.wardrobe = { items: [], worn: { top: null, bottom: null, shoes: null, outer: null }, nextUid: 1, mode: null, starter: false };
    var w = state.wardrobe;
    if (!w.starter && state.creation && state.creation.done) giveStarter(state);
    return w;
  }
  function giveStarter(state) {
    var w = state.wardrobe; if (w.starter) return;
    w.starter = true;
    var p = (state.creation || {}).player || {}, ids = starterIds(p), app = p.appearance;
    ids.forEach(function (id) { newItem(id); });
    var first = function (id) { for (var i = 0; i < w.items.length; i++) if (w.items[i].id === id) return w.items[i].uid; };
    var c = C();
    w.worn.top = first(app === 'male' ? 'flannel' : 'tee_white');
    w.worn.bottom = first(app === 'female' ? 'skirt' : 'jeans');
    w.worn.shoes = first('sneakers');
    // whatever the engine started us in becomes the worn pieces' condition
    item(w.worn.top).wet = c.upperWetness || 0; item(w.worn.top).integ = c.upperIntegrity == null ? 100 : c.upperIntegrity;
    item(w.worn.bottom).wet = c.lowerWetness || 0; item(w.worn.bottom).integ = c.lowerIntegrity == null ? 100 : c.lowerIntegrity;
    syncSpare();
  }

  /* ---------- store + wardrobe options ---------- */
  function storeOptions(out) {
    var w = W(), mode = w.mode || '';
    if (mode.indexOf('shop:') === 0) {
      var slot = mode.slice(5);
      Object.keys(CATALOG).forEach(function (id) {
        var d = CATALOG[id];
        if (slot === 'season') { if (!d.season || d.season !== season()) return; }
        else if (slot === 'clearance') { if (!d.season || d.season === season()) return; }
        else if (slot === 'acc') { if (ACC.indexOf(d.slot) < 0 || d.season) return; }
        else if (d.slot !== slot || d.season) return;
        var price = priceOf(id);
        var owned = w.items.filter(function (it) { return it.id === id; }).length;
        out.actions.push(opt('Buy the ' + d.name + ' ($' + price + ')' + (owned ? ' (own ' + owned + ')' : ''), function () {
          if (money() < price) return { text: '<p>You count your cash twice. Not enough for the ' + esc(d.name) + '.</p>', minutes: 1 };
          G_().change('money', -price);
          newItem(id); syncSpare();
          G_().emit('clothesBought', { id: id });
          return { text: '<p>The clerk folds the ' + esc(d.name) + ' into a paper bag with a sprig of lavender. ' + esc(d.desc) + '</p><p class="hint">You can change into it in the fitting room or at home.</p>', minutes: 5 };
        }, { disabled: money() < price, hint: d.desc }));
      });
      out.actions.push(opt('Step back from the racks', function () { w.mode = null; return { text: '<p>You drift back toward the front of the shop.</p>', minutes: 1 }; }));
      return;
    }
    var cats = CLOTH.map(function (sl) { return [sl, 'Browse ' + SLOT_LABEL[sl], 'the ' + SLOT_LABEL[sl]]; });
    cats.push(['acc', 'Browse accessories (hats, glasses, earrings)', 'the accessories counter']);
    cats.push(['season', 'Browse the new ' + season() + ' line', 'this season\'s rail']);
    cats.push(['clearance', 'Check the clearance rail (half price)', 'last season\'s leftovers']);
    cats.forEach(function (ct) {
      out.actions.push(opt(ct[1], function () {
        w.mode = 'shop:' + ct[0];
        return { text: '<p>You flick through ' + esc(ct[2]) + '.' + (ct[0] === 'season' ? ' A chalkboard sign reads "New in for ' + season() + '".' : '') + '</p>', minutes: 3 };
      }));
    });
    // repairs
    pullLive();
    var torn = w.items.filter(function (it) { return it.integ < 80 && CLOTH.indexOf(def(it).slot) >= 0; });
    if (torn.length) out.actions.push(opt('Have ' + torn.length + ' damaged item' + (torn.length > 1 ? 's' : '') + ' mended ($' + (torn.length * 5) + ')', function () {
      var cost = torn.length * 5; if (money() < cost) return { text: '<p>The tailor quotes you a price you can\'t cover today.</p>', minutes: 1 };
      G_().change('money', -cost); torn.forEach(function (it) { it.integ = 100; }); pushLive('top'); pushLive('bottom');
      return { text: '<p>The owner\'s nephew does alterations in the back. An hour later your clothes come back with neat, nearly invisible stitches.</p>', minutes: 60 };
    }, { disabled: money() < torn.length * 5 }));
    if (!w.sewingKit) out.actions.push(opt('Buy a sewing kit ($10)', function () {
      if (money() < 10) return { text: '<p>Not today.</p>', minutes: 1 };
      G_().change('money', -10); w.sewingKit = true;
      return { text: '<p>A little tin of needles, thread in twelve colours, and a thimble you will lose within the week. You can mend clothes at home now.</p>', minutes: 2 };
    }, { disabled: money() < 10, hint: 'Lets you mend torn clothes yourself at home.' }));
    var junk = w.items.filter(function (it) { return it.integ < 40 && SLOTS.every(function (s) { return w.worn[s] !== it.uid; }); });
    if (junk.length) out.actions.push(opt('Drop worn-out clothes in the recycling bin (+$' + (junk.length * 2) + ' store credit)', function () {
      junk.forEach(function (it) { w.items.splice(w.items.indexOf(it), 1); });
      G_().change('money', junk.length * 2); syncSpare();
      return { text: '<p>The clerk weighs your tired old clothes on a little scale and hands over a few dollars. "They\'ll become insulation," she says, pleased.</p>', minutes: 3 };
    }));
  }

  function wardrobeOptions(out, where) {
    var w = W(), home = where === 'home';
    SLOTS.forEach(function (slot) {
      var cur = w.worn[slot];
      w.items.forEach(function (it) {
        var d = def(it); if (!d || d.slot !== slot || it.uid === cur || it.integ < 5) return;
        if (!it.clean) return;
        if (ACC.indexOf(slot) >= 0 && w.mode !== 'wardrobe:acc') return;
        if (ACC.indexOf(slot) < 0 && w.mode === 'wardrobe:acc') return;
        out.actions.push(opt((ACC.indexOf(slot) >= 0 ? 'Put on the ' : 'Wear the ') + d.name + (it.integ < 60 ? ' (worn)' : ''), function () {
          var note = wear(it.uid);
          return { text: '<p>You change into the ' + esc(d.name) + '.' + esc(note) + '</p><p>' + esc(describeOutfit()) + '</p>', minutes: slot === 'shoes' ? 2 : 4 };
        }, { hint: d.desc }));
      });
      if (slot !== 'top' && slot !== 'bottom' && cur != null && (ACC.indexOf(slot) >= 0) === (w.mode === 'wardrobe:acc')) {
        var cd = def(item(cur));
        out.actions.push(opt('Take off the ' + cd.name, function () { takeOff(slot); return { text: '<p>You take off the ' + esc(cd.name) + '.</p>', minutes: 1 }; }));
      }
    });
    var dirty = w.items.filter(function (it) { return !it.clean && SLOTS.every(function (s) { return w.worn[s] !== it.uid; }); });
    if (home && dirty.length) out.actions.push(opt('Do laundry: ' + dirty.length + ' item' + (dirty.length > 1 ? 's' : '') + ' ($3)', function () {
      if (money() < 3) return { text: '<p>The machines want quarters you don\'t have.</p>', minutes: 1 };
      G_().change('money', -3);
      dirty.forEach(function (it) { it.clean = true; it.wet = 0; it.days = 0; });
      if (G_().stats && G_().stats.trainSkill) G_().stats.trainSkill('housekeeping', 6);
      syncSpare();
      return { text: '<p>You haul the laundry bag down to the basement machines and wait out the spin cycle with a textbook. Everything comes out warm and smelling of cheap detergent.</p>', minutes: 90 };
    }));
    if (w.mode === 'wardrobe:acc') out.actions.push(opt('Back to your clothes', function () { w.mode = 'wardrobe'; return { text: '<p>You close the little drawer.</p>', minutes: 0 }; }));
    else if (w.items.some(function (it) { return ACC.indexOf(def(it).slot) >= 0; })) out.actions.push(opt('Open the accessories drawer', function () { w.mode = 'wardrobe:acc'; return { text: '<p>Hats, glasses, earrings and scarves, in a tangle that is almost organised.</p>', minutes: 1 }; }));
    pullLive();
    var mend = w.items.filter(function (it) { return it.integ < 80 && CLOTH.indexOf(def(it).slot) >= 0; }).sort(function (a, b) { return a.integ - b.integ; }).slice(0, 3);
    if (home && w.sewingKit && mend.length) out.actions.push(opt('Mend your clothes (' + mend.map(function (it) { return def(it).name; }).join(', ') + ')', function () {
      var skill = 0; try { var sk = G_().state.stats.skills.housekeeping; skill = (typeof sk === 'object' ? sk.value : sk) || 0; } catch (e) {}
      var fix = 30 + Math.round(skill / 40);
      mend.forEach(function (it) { it.integ = Math.min(100, it.integ + fix); }); pushLive('top'); pushLive('bottom');
      if (G_().stats && G_().stats.trainSkill) G_().stats.trainSkill('housekeeping', 5);
      G_().change('stats.needs.stress', -5);
      return { text: '<p>You sit cross-legged on the bed with the sewing tin and patch up the worst of it. The stitches are not pretty, but they will hold.</p>', minutes: 45 };
    }));
    out.actions.push(opt(home ? 'Close the wardrobe' : 'Leave the fitting room', function () { w.mode = null; return { text: '<p>' + esc(describeOutfit()) + '</p>', minutes: 0 }; }));
  }

  var mod = {
    id: 'wardrobe',
    init: function (state) { ensure(state); },
    onTick: function (minutes, state) {
      var w = ensure(state); if (!w.starter) return;
      pullLive();
      w.items.forEach(function (it) { if (SLOTS.every(function (s) { return w.worn[s] !== it.uid; })) it.wet = Math.max(0, it.wet - minutes * 0.2); });
      syncSpare();
    },
    getOptions: function (state) {
      var out = { dialogue: [], actions: [], travel: [], other: [] }, w = ensure(state);
      if (!w.starter) return out;
      var hid = hereId(), tags = hereTags(), home = tags.indexOf('home') >= 0;
      if (hid !== STORE && w.mode && w.mode.indexOf('wardrobe') !== 0) w.mode = null;
      if (!home && hid !== STORE && w.mode && w.mode.indexOf('wardrobe') === 0) w.mode = null;

      if (w.mode && w.mode.indexOf('wardrobe') === 0) { wardrobeOptions(out, home ? 'home' : 'fitting'); return out; }
      if (hid === STORE) {
        if (!isOpen(STORE)) return out;
        storeOptions(out);
        if (!w.mode) out.other.push(opt('Use the fitting room', function () { w.mode = 'wardrobe'; return { text: '<p>You pull the velvet curtain across. The mirror is kind; the lighting is not.</p>', minutes: 1 }; }));
      }
      if (home) out.other.push(opt('Open your wardrobe', function () {
        w.mode = 'wardrobe';
        var n = w.items.length, dirty = w.items.filter(function (it) { return !it.clean; }).length;
        return { text: '<p>The wardrobe door sticks, as always. You own ' + n + ' pieces of clothing' + (dirty ? ', and ' + dirty + ' of them are in the laundry pile' : '') + '.</p><p>' + esc(describeOutfit()) + '</p>', minutes: 1 };
      }));
      return out;
    }
  };

  function boot() {
    var g = G_();
    if (!g || !g.register) return setTimeout(boot, 20);

    if (g.world && g.world.addLocation) g.world.addLocation(STORE, {
      name: 'Threadbare & Co.', district: 'Town', indoor: true, open: [9, 19], restroom: false, tags: ['public', 'mirror'],
      desc: 'A narrow clothing shop with creaky floorboards, racks sorted by colour, and a velvet-curtained fitting room. The owner hums along to the radio.'
    }, [['shopping_centre', 1]]);

    g.register(mod);
    if (g.on) {
      g.on('start', function (state) { ensure(state); giveStarter(state); });
      // pet-themed clothes: pets out with you perk up a little each hour you wear them
      g.on('tick', function (m) {
        try {
          if (!g.pets || !g.pets.following) return;
          var n = 0; ['top', 'outer'].forEach(function (sl) { var d = def(wornItem(sl)); if (d && d.pet) n++; });
          if (!n) return;
          var acc = (W()._petAcc = (W()._petAcc || 0) + (m && m.minutes || m || 0));
          if (acc < 60) return; W()._petAcc = acc % 60;
          g.pets.following().forEach(function (p) { if (g.pets.addHappiness) g.pets.addHappiness(p.id, 2 * n); });
        } catch (e) {}
      });
      g.on('tick', function (m) {
        try {
          var w = W(); if (!w || !w.starter) return;
          var sets = activeSets(); if (!sets.length) { w._setAcc = 0; return; }
          var acc = (w._setAcc = (w._setAcc || 0) + ((m && m.minutes) || 0)); if (acc < 60) return; w._setAcc = acc % 60;
          var hid = hereId(), tags = hereTags(), out = tags.indexOf('outdoors') >= 0, wx = (g.world && g.world.weather) ? g.world.weather() : '';
          var temp = (g.world && g.world.temp) ? g.world.temp() : 12;
          sets.forEach(function (st) {
            var ok = (!st.where || st.where.indexOf(hid) >= 0) && (!st.home || tags.indexOf('home') >= 0) &&
              (!st.rainy || (out && /rain|storm|drizzle/.test(wx))) && (!st.cold || (out && (temp < 6 || season() === 'winter'))) && (!st.hot || temp >= 22);
            if (!ok) return;
            if (st.stress) g.change('stats.needs.stress', st.stress * 5, { silent: true });
            if (st.fatigue) g.change('stats.needs.fatigue', st.fatigue * 5, { silent: true });
            if (st.thirst) g.change('stats.needs.thirst', st.thirst * 5, { silent: true });
            if (st.beauty && tags.indexOf('public') >= 0 && g.stats && g.stats.train) g.stats.train('beauty', st.beauty);
            if (st.pets && g.pets && g.pets.following) g.pets.following().forEach(function (p) { if (g.pets.addHappiness) g.pets.addHappiness(p.id, st.pets); });
          });
        } catch (e) {}
      });
      g.on('newDay', function () {
        var w = W(); if (!w || !w.starter) return;
        pullLive();
        ['top', 'bottom'].forEach(function (s) { var it = wornItem(s); if (it) it.days++; });
        var st = style();
        if (st >= 6 && g.stats && g.stats.train) g.stats.train('beauty', Math.round(st / 2));
      });
      // Outer layers and boots keep some rain off. Accidents set wetness directly, so they never reach here.
      g.on('change', function (d) {
        if (!d || d.delta <= 0 || !W() || !W().starter) return;
        if (d.path !== 'stats.clothing.upperWetness' && d.path !== 'stats.clothing.lowerWetness') return;
        if (hereTags().indexOf('outdoors') < 0) return;
        var outer = def(wornItem('outer')), shoes = def(wornItem('shoes')), share = 0, by = '';
        if (d.path === 'stats.clothing.upperWetness' && outer && outer.rain) { share = outer.rain; by = outer.name; }
        if (d.path === 'stats.clothing.lowerWetness') {
          if (outer && outer.rainL) { share = outer.rainL; by = outer.name; }
          if (shoes && shoes.rainL && shoes.rainL > share) { share = shoes.rainL; by = shoes.name; }
        }
        var back = Math.round(d.delta * share);
        if (back > 0) { g.change(d.path, -back); g.notify('Your ' + by + ' kept some of the rain off.', 'info', 'wardrobe-rain'); }
      });
      // sturdier clothes lose integrity more slowly
      g.on('change', function (d) {
        if (!d || d.delta >= 0 || !W() || !W().starter) return;
        var slot = d.path === 'stats.clothing.upperIntegrity' ? 'top' : d.path === 'stats.clothing.lowerIntegrity' ? 'bottom' : null;
        if (!slot) return;
        var dd = def(wornItem(slot)); if (!dd || !dd.dur || dd.dur <= 1) return;
        var back = -d.delta * (1 - 1 / dd.dur);
        if (back > 0.05) g.change(d.path, back, { silent: true });
      });
    }
    if (g.addTab) g.addTab({
      id: 'wardrobe', label: 'Wardrobe', order: 36,
      render: function (state) {
        var w = ensure(state); if (!w.starter) return '<p class="flavor">Your bags are still packed.</p>';
        pullLive();
        var rows = SLOTS.map(function (slot) {
          var list = w.items.filter(function (it) { return def(it).slot === slot; }).map(function (it) {
            var d = def(it), on = w.worn[slot] === it.uid;
            var cond = it.integ >= 80 ? 'like new' : it.integ >= 50 ? 'worn' : it.integ >= 20 ? 'fraying' : 'falling apart';
            return '<li>' + (on ? '<b>' + esc(d.name) + '</b> (wearing)' : esc(d.name)) + ', ' + cond + (it.clean ? '' : ', needs washing') + (it.wet >= 20 ? ', damp' : '') + '</li>';
          }).join('');
          return '<div class="char-row"><b>' + SLOT_LABEL[slot].charAt(0).toUpperCase() + SLOT_LABEL[slot].slice(1) + '</b><ul style="margin:4px 0 0 18px;padding:0">' + (list || '<li><i>none</i></li>') + '</ul></div>';
        }).join('');
        var doll = window.Creation ? Creation.paperdollSVG(state.creation.player, 4) : '';
        return '<h3>Wardrobe</h3><p class="flavor">Everything you own, folded or otherwise. Change at home or in the fitting room at Threadbare &amp; Co. in the Riverside Shopping Centre.</p>' +
          '<div style="display:flex;gap:16px;align-items:flex-start">' + doll + '<div><p>' + esc(describeOutfit()) + '</p><p>Style: ' + style() + '/10, ' + vibe() + ' look.</p>' +
          (window.Salon && Salon.makeupNote && Salon.makeupNote() ? '<p>' + esc(Salon.makeupNote()) + '</p>' : '') + '</div></div>' + rows +
          '<h4>Outfit sets</h4><ul style="margin:4px 0 0 18px;padding:0">' + SETS.map(function (st) {
            var have = Object.keys(st.pieces).every(function (sl) { return st.pieces[sl].some(function (id) { return w.items.some(function (it) { return it.id === id; }); }); });
            return '<li>' + (setDone(st) ? '<b>' + esc(st.name) + '</b> (wearing)' : esc(st.name) + (have ? ' (you own the pieces)' : '')) + ': ' +
              esc(Object.keys(st.pieces).map(function (sl) { return st.pieces[sl].map(function (id) { return CATALOG[id].name; }).join(' or '); }).join(' + ')) + '. <i>' + esc(st.bonus) + '</i></li>';
          }).join('') + '</ul>' + (w.sewingKit ? '<p class="flavor">You have a sewing kit for mending at home.</p>' : '');
      }
    });
  }

  window.Wardrobe = {
    CATALOG: CATALOG, spriteOutfit: spriteOutfit, style: style, vibe: vibe, describeOutfit: describeOutfit,
    worn: function (slot) { var it = wornItem(slot); return it ? it.id : null; },
    owns: function (id) { return !!(W() && W().items.some(function (it) { return it.id === id; })); },
    SETS: SETS, activeSets: function () { return activeSets().map(function (s) { return s.id; }); },
    accessory: function (slot) { var it = W() && wornItem(slot); return it ? it.id : null; },
    give: function (id, andWear) { if (!CATALOG[id]) return; var it = newItem(id); if (andWear) wear(it.uid); syncSpare(); }
  };
  if (window.G) window.G.wardrobe = window.Wardrobe;   // alias so either name works
  boot();
})();
