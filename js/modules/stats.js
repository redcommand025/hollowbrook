/* stats.js — Hollowbrook College: player condition, characteristics, skills,
   traits, attitudes, transformations, clothing, character-menu tabs.
   Owner: Jimmy. Talks to the engine only through window.G (see CONTRACT.md). */
(function () {
  'use strict';

  // ---------- constants ----------
  var TIERS = ['F', 'F+', 'D', 'D+', 'C', 'C+', 'B', 'B+', 'A', 'A+', 'S'];
  var MAX = 1000;

  var NEEDS_INFO = {
    fatigue: { label: 'Fatigue', flavor: 'How worn out you are. Sleep is the only real cure.' },
    stress:  { label: 'Stress',  flavor: 'The weight on your shoulders. High stress makes everything else drain faster.' },
    control: { label: 'Control', flavor: 'How well you can hold it together, bladder and bowels included. It shifts slowly.' },
    bladder: { label: 'Bladder', flavor: 'How badly you need a restroom.' },
    bowels:  { label: 'Bowels',  flavor: 'Slower than your bladder, but just as insistent in the end.' },
    thirst:  { label: 'Thirst',  flavor: 'How hydrated you are. Full is good; empty means you collapse.' },
    hunger:  { label: 'Hunger',  flavor: 'How fed you are. Full is good; empty means you collapse.' }
  };

  var CORE = {
    beauty:    { label: 'Beauty',    flavor: ['Plain, and nobody looks twice.', 'You clean up all right.', 'People notice you when you walk in.', 'Heads turn. You have a presence.', 'Strikingly attractive; it opens doors.'] },
    physique:  { label: 'Physique',  flavor: ['The stairs to the library leave you winded.', 'Reasonably fit for a student.', 'Toned, and you can keep a pace.', 'Strong and quick; the track team asks about you.', 'You are in peak condition.'] },
    willpower: { label: 'Willpower', flavor: ['You fold under the smallest pressure.', 'You can push through a boring lecture.', 'Steady. Temptation has to work for it.', 'Hard to rattle, hard to talk out of things.', 'Iron resolve.'] },
    awareness: { label: 'Awareness', flavor: ['The world mostly happens around you.', 'You catch the obvious.', 'You notice details others miss.', 'Little escapes you: a glance, a lie, a loose wallet.', 'You read rooms like books.'] }
  };

  var SKILLS = {
    skulduggery: { label: 'Skulduggery', flavor: 'Light fingers and a calm face. Used for petty theft.' },
    tending:     { label: 'Tending',     flavor: 'Care for plants and animals on the farm plots.' },
    athletics:   { label: 'Athletics',   flavor: 'Running, climbing, keeping up.' },
    charm:       { label: 'Charm',       flavor: 'Saying the right thing at the right time.' },
    cooking:     { label: 'Cooking',     flavor: 'Turning groceries into meals that are cheaper than takeout.' },
    housekeeping:{ label: 'Housekeeping',flavor: 'Laundry, mending, keeping your room livable.' }
  };

  // Traits: granted when requirements are met, lost when they stop being met.
  var TRAITS = [
    { id: 'charming', hint: 'Raise Beauty to B. Grooming, showers and looking after your clothes help.',    label: 'Charming',      desc: 'Beauty B or higher: NPC first impressions start warmer.', req: function (s) { return tierIdx(s.core.beauty.value) >= 6; } },
    { id: 'athletic', hint: 'Raise Physique to B. Work out at the gym or go jogging outdoors.',    label: 'Athletic',      desc: 'Physique B or higher: fatigue builds 10% slower.',        req: function (s) { return tierIdx(s.core.physique.value) >= 6; } },
    { id: 'steady', hint: 'Raise Willpower to B. Meditating and pushing through hard days help.',      label: 'Steady Nerves', desc: 'Willpower B or higher: stress gains reduced by 15%.',     req: function (s) { return tierIdx(s.core.willpower.value) >= 6; } },
    { id: 'sharpEyed', hint: 'Raise Awareness to B. People-watch in busy places and pay attention around town.',   label: 'Sharp-eyed',    desc: 'Awareness B or higher: you spot extra options and events.', req: function (s) { return tierIdx(s.core.awareness.value) >= 6; } },
    { id: 'ironBladder', hint: 'Get Control to 900. Stay calm and avoid accidents; it climbs slowly when stress is low.', label: 'Iron Bladder',  desc: 'Control 900+: you can hold it right up to the limit.',    req: function (s) { return s.needs.control >= 900; } },
    { id: 'lightFingers', hint: 'Reach Skulduggery C by practising petty theft (carefully).',label: 'Light Fingers', desc: 'Skulduggery C or higher: thefts are less likely to be noticed.', req: function (s) { return tierIdx(s.skills.skulduggery) >= 4; } },
    { id: 'greenThumb', hint: 'Reach Tending C by working the farm plots and caring for the animals.',  label: 'Green Thumb',   desc: 'Tending C or higher: crops grow faster and animals calm quicker.', req: function (s) { return tierIdx(s.skills.tending) >= 4; } },
    { id: 'nightOwl', hint: 'Be awake past 1am on five different nights.', label: 'Night Owl', desc: 'Late nights come easy: fatigue builds 15% slower after 10pm.', req: function (s) { return rec(s).lateNights >= 5; } },
    { id: 'earlyBird', hint: 'Be up and about before 7am on five different days.', label: 'Early Bird', desc: 'Mornings suit you: stress eases twice as fast before noon.', req: function (s) { return rec(s).earlyRises >= 5; } },
    { id: 'resilient', hint: 'Get over a head cold.', label: 'Resilient', desc: 'You shake off illness: half the chance of catching a cold.', req: function (s) { return rec(s).coldsBeaten >= 1; } },
    { id: 'animalFriend', hint: 'Raise any companion to Devoted.', label: 'Animal Friend', desc: 'Animals warm to you: pet bond grows 20% faster.', req: function () { try { return !!(G.pets && G.pets.list().some(function (p) { return p.bond >= 850; })); } catch (e) { return false; } } },
    { id: 'gymRat', hint: 'Finish 20 workouts at the gym.', label: 'Gym Regular', desc: 'Workouts tire you 30% less, and you never get sore.', req: function (s) { return rec(s).workouts >= 20; } },
    { id: 'castIron', hint: 'Get over a bout of food poisoning.', label: 'Cast-iron Stomach', desc: 'Dodgy food rarely gets you: food poisoning is much less likely.', req: function (s) { return rec(s).poisoningsBeaten >= 1; } },
    { id: 'homeCook', hint: 'Reach Cooking C by making meals at home.', label: 'Home Cook', desc: 'Meals you cook at home fill you up 25% more and ease stress.', req: function (s) { return tierIdx(s.skills.cooking || 0) >= 4; } },
    { id: 'socialButterfly', hint: 'Become known around campus as a socialite (Socialite fame 200).', label: 'Social Butterfly', desc: 'Busy public places calm you instead of draining you.', req: function (s) { return s.status.socialiteFame >= 200; } },
    { id: 'goodSamaritan', hint: 'Become known for helping people (Kindness fame 200).', label: 'Good Samaritan', desc: 'People trust you: strangers and NPCs react more warmly to you.', req: function (s) { return s.status.kindnessFame >= 200; } },
    { id: 'streetwise', hint: 'Spend 15 evenings out in the alley, bar or docks.', label: 'Streetwise', desc: 'You read rough places well: you are harder to pickpocket and spot trouble sooner.', req: function (s) { return rec(s).nightsOut >= 15; } },
    { id: 'wellRested', hint: 'Sleep seven hours or more in one go.',  label: 'Well Rested',   desc: 'Slept a full night: willpower checks +5% today.',         req: function (s) { return !!s.flags.sleptFull; } }
  ];

  // Attitudes: -100 (hates it) .. +100 (comfortable). Shift slowly with repetition.
  var ATTITUDES = {
    flirting:     { label: 'Flirting',          low: 'Mortifying', high: 'Second nature' },
    theft:        { label: 'Theft',             low: 'Wrong',      high: 'Just business' },
    publicSpeech: { label: 'Speaking up',       low: 'Terrifying', high: 'Easy' },
    hardWork:     { label: 'Hard work',         low: 'A chore',    high: 'Satisfying' },
    rulebreaking: { label: 'Breaking rules',    low: 'Unthinkable',high: 'Whatever' },
    publicRestroom:{ label: 'Public restrooms', low: 'Avoid them',  high: 'No big deal' },
    exercise:     { label: 'Exercise',          low: 'Dreaded',    high: 'Energising' },
    crowds:       { label: 'Crowds',            low: 'Draining',   high: 'Lively' },
    spending:     { label: 'Spending money',    low: 'Painful',    high: 'Easy come, easy go' },
    animals:      { label: 'Animals',           low: 'Nervous',    high: 'Love them' },
    nightlife:    { label: 'Nightlife',         low: 'Not for you', high: 'Where you come alive' }
  };

  // Transformations: subtle folklore, never monstrous. Stages 0..3. Triggered by npcs.js etc.
  var TRANSFORMS = {
    fox:   { label: 'Fox-touched', stages: ['', 'Your eyes catch the light with an amber sheen.', 'Your hearing has sharpened; you hear whispers across a room.', 'You walk with a fox\'s quiet grace, and your hair has a russet streak.'], bonus: { awareness: 40 } },
    fae:   { label: 'Fae-kissed',  stages: ['', 'There is a faint shimmer to your skin in moonlight.', 'Flowers seem to lean toward you.', 'People find you hard to look away from, and harder to lie to.'], bonus: { beauty: 40 } },
    river: { label: 'River-blessed', stages: ['', 'Cold water never seems to bother you.', 'You can hold your breath far longer than you should.', 'Rain feels like a friend; you dry off unnaturally fast.'], bonus: { physique: 40 } }
  };

  // ---------- helpers ----------
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
  function tierIdx(v) { return clamp(Math.floor(v / 91), 0, 10); }
  function tier(v) { return TIERS[tierIdx(v)]; }
  function S() { return G.state.stats; }
  function hasTrait(id) { return S().traits.indexOf(id) !== -1; }
  function note(msg, kind) { if (G.notify) G.notify(msg, kind || 'info'); }
  function rnd(n) { return Math.round(n); }
  function bar(v, max, invert) {
    var pct = clamp(v / (max || MAX), 0, 1) * 100;
    var cls = invert ? (pct < 20 ? 'bad' : pct < 50 ? 'warn' : 'ok') : (pct > 80 ? 'bad' : pct > 60 ? 'warn' : 'ok');
    return '<div class="stat-bar ' + cls + '"><span style="width:' + pct.toFixed(0) + '%"></span></div>';
  }
  var TAGS = {
    home: ['dorm_room'], water: ['dorm_room', 'dorm_hall', 'cafeteria', 'cafe', 'gym', 'library', 'lecture_hall', 'bar', 'market', 'park'],
    food: ['cafeteria', 'cafe', 'market', 'bar'], gym: ['gym'], quiet: ['library', 'park', 'woods', 'old_mill'],
    mirror: ['dorm_room', 'dorm_hall', 'gym'], public: ['quad', 'main_street', 'park', 'cafe', 'cafeteria', 'bar']
  };
  function here() {
    var h = (G.world && G.world.here) ? G.world.here() : (G.state.world || {}).location;
    if (h && typeof h === 'object') return h;
    var l = (G.world && G.world.LOCATIONS && G.world.LOCATIONS[h]) || {};
    return { id: h, indoor: l.indoor, restroom: l.restroom, tags: l.tags };
  }
  function hereHas(tag) {
    var h = here();
    if (!h || !h.id) return null; // world.js not loaded: allow everything
    if (h.tags && h.tags.indexOf(tag) !== -1) return true;
    if (tag === 'restroom') return !!h.restroom;
    if (tag === 'outdoors') return h.indoor === false;
    return (TAGS[tag] || []).indexOf(h.id) !== -1;
  }
  function rec(s) { s = s || S(); if (!s.records) s.records = { lateNights: 0, earlyRises: 0, coldsBeaten: 0, lastLate: -1, lastEarly: -1 }; var r = s.records; ['workouts', 'poisoningsBeaten', 'nightsOut'].forEach(function (k) { if (r[k] === undefined) r[k] = 0; }); if (r.lastNightOut === undefined) r.lastNightOut = -1; if (r.lastWeights === undefined) r.lastWeights = -9; if (!s.illness) s.illness = { cold: 0, exposure: 0 }; if (s.illness.food === undefined) s.illness.food = 0; if (s.illness.sore === undefined) s.illness.sore = 0; return s.records; }
  function hasPoison() { rec(); return S().illness.food > 0; }
  function hasCold() { rec(); return S().illness.cold > 0; }
  function weatherNow() {
    var w = G.state.world || {};
    var wx = w.weather;
    return (typeof wx === 'object' && wx) ? (wx.type || '') : (wx || '');
  }
  function money() { return Number(G.state.money) || 0; }
  function addMoney(d) { if (G.change) G.change('money', d); else G.state.money = money() + d; }
  function pace() { var w = (G.state.creation && G.state.creation.world) || {}; return { gentle: 0.7, normal: 1, harsh: 1.35 }[w.needsPace] || 1; }
  function chg(path, d) { if (G.change) G.change('stats.' + path, d); else setPath(path, getPath(path) + d); }
  function getPath(p) { return p.split('.').reduce(function (o, k) { return o[k]; }, S()); }
  function setPath(p, v) { var ks = p.split('.'), o = S(); for (var i = 0; i < ks.length - 1; i++) o = o[ks[i]]; o[ks[ks.length - 1]] = v; }

  // Effective value of a core stat after debuffs, traits and transformations.
  function effective(stat) {
    var s = S(), v = s.core[stat].value;
    Object.keys(s.transforms).forEach(function (k) {
      var t = TRANSFORMS[k]; if (t && t.bonus[stat]) v += t.bonus[stat] * s.transforms[k];
    });
    debuffs().forEach(function (d) { if (d.mods && d.mods[stat]) v += d.mods[stat]; });
    if (stat === 'willpower' && hasTrait('wellRested')) v *= 1.05;
    return clamp(rnd(v), 0, MAX);
  }

  // Debuffs computed from current condition.
  function debuffs() {
    var n = S().needs, out = [];
    if (n.fatigue >= 900) out.push({ id: 'exhausted', label: 'Exhausted', mods: { awareness: -150, physique: -150, willpower: -100 } });
    else if (n.fatigue >= 700) out.push({ id: 'tired', label: 'Tired', mods: { awareness: -60, physique: -60 } });
    if (n.stress >= 800) out.push({ id: 'overwhelmed', label: 'Overwhelmed', mods: { willpower: -120, beauty: -40 } });
    else if (n.stress >= 600) out.push({ id: 'stressed', label: 'Stressed', mods: { willpower: -50 } });
    if (n.thirst <= 100) out.push({ id: 'parched', label: 'Parched', mods: { awareness: -120, physique: -100 } });
    else if (n.thirst <= 250) out.push({ id: 'thirsty', label: 'Thirsty', mods: { awareness: -40 } });
    if (n.hunger <= 100) out.push({ id: 'starving', label: 'Starving', mods: { physique: -120, willpower: -80 } });
    else if (n.hunger <= 250) out.push({ id: 'hungry', label: 'Hungry', mods: { willpower: -40 } });
    if (hasPoison()) out.push({ id: 'foodPoisoning', label: 'Food poisoning', mods: { physique: -80, willpower: -40 } });
    if (S().illness && S().illness.sore > 0) out.push({ id: 'sore', label: 'Sore muscles', mods: { physique: -40 } });
    if (hasCold()) out.push({ id: 'cold', label: 'Head cold', mods: { awareness: -60, physique: -60 } });
    if (n.bladder >= 800 || n.bowels >= 800) out.push({ id: 'desperate', label: 'Desperate', mods: { awareness: -80, willpower: -40 } });
    var c = S().clothing;
    if (c.upperWetness + c.lowerWetness >= 60) out.push({ id: 'soaked', label: 'Soaked', mods: { beauty: -80 } });
    if (c.upperIntegrity < 25 || c.lowerIntegrity < 25) out.push({ id: 'tattered', label: 'Tattered clothes', mods: { beauty: -100 } });
    return out;
  }

  // ---------- default state ----------
  function freshState() {
    var core = {};
    Object.keys(CORE).forEach(function (k) { core[k] = { value: 200, base: 200, lastUsedDay: 0 }; });
    var skills = {}; Object.keys(SKILLS).forEach(function (k) { skills[k] = 0; });
    var att = {}; Object.keys(ATTITUDES).forEach(function (k) { att[k] = 0; });
    att.theft = -40; att.rulebreaking = -30;
    return {
      needs: { fatigue: 150, stress: 150, control: 800, bladder: 120, bowels: 80, thirst: 800, hunger: 750 },
      core: core,
      skills: skills,
      traits: [],
      attitudes: att,
      transforms: {},
      clothing: { upperWetness: 0, upperIntegrity: 100, lowerWetness: 0, lowerIntegrity: 100, spareOutfits: 2 },
      status: { crime: 0, kindnessFame: 0, businessFame: 0, socialiteFame: 0 },
      flags: { warned: {}, collapse: null, accidentToday: 0, sleptFull: false, dirty: false }
    };
  }

  // ---------- warnings (fire once per crossing) ----------
  var WARN = [
    { key: 'fatigue700', test: function (n) { return n.fatigue >= 700; }, reset: function (n) { return n.fatigue < 650; }, msg: 'You are getting tired. Your eyelids feel heavy.' },
    { key: 'fatigue900', test: function (n) { return n.fatigue >= 900; }, reset: function (n) { return n.fatigue < 850; }, msg: 'You are exhausted. If you keep going you will pass out.' },
    { key: 'bladder600', test: function (n) { return n.bladder >= 600; }, reset: function (n) { return n.bladder < 550; }, msg: 'You need to find a restroom.' },
    { key: 'bladder800', test: function (n) { return n.bladder >= 800; }, reset: function (n) { return n.bladder < 750; }, msg: 'You really need a restroom. Soon.' },
    { key: 'bladder900', test: function (n) { return n.bladder >= 900; }, reset: function (n) { return n.bladder < 850; }, msg: 'You are bouncing on your heels. You cannot hold it much longer.' },
    { key: 'bowels600',  test: function (n) { return n.bowels >= 600; },  reset: function (n) { return n.bowels < 550; },  msg: 'Your stomach rumbles. You should find a restroom.' },
    { key: 'bowels850',  test: function (n) { return n.bowels >= 850; },  reset: function (n) { return n.bowels < 800; },  msg: 'Your stomach cramps. You need a restroom now.' },
    { key: 'thirst250',  test: function (n) { return n.thirst <= 250; },  reset: function (n) { return n.thirst > 300; },  msg: 'Your mouth is dry. You should drink something.' },
    { key: 'thirst100',  test: function (n) { return n.thirst <= 100; },  reset: function (n) { return n.thirst > 150; },  msg: 'You feel dizzy from thirst.' },
    { key: 'hunger250',  test: function (n) { return n.hunger <= 250; },  reset: function (n) { return n.hunger > 300; },  msg: 'Your stomach growls. You are hungry.' },
    { key: 'hunger100',  test: function (n) { return n.hunger <= 100; },  reset: function (n) { return n.hunger > 150; },  msg: 'You are weak with hunger.' },
    { key: 'stress700',  test: function (n) { return n.stress >= 700; },  reset: function (n) { return n.stress < 650; },  msg: 'Everything feels like too much right now.' }
  ];
  var repeatEvery = { bladder600: 60, bladder800: 30, bladder900: 15, bowels600: 90, bowels850: 30 }; // minutes between repeats

  function higherActive(key, w) {
    var pre = key.replace(/\d+$/, ''), lvl = +key.replace(/^\D+/, '');
    return Object.keys(w).some(function (k) { return k.indexOf(pre) === 0 && +k.replace(/^\D+/, '') > lvl; });
  }
  function checkWarnings(minutes) {
    var s = S(), n = s.needs, w = s.flags.warned;
    WARN.forEach(function (rule) {
      if (rule.test(n)) {
        var last = w[rule.key];
        if (last === undefined) { w[rule.key] = 0; note(rule.msg, 'info'); }
        else if (repeatEvery[rule.key] && !higherActive(rule.key, w)) {
          w[rule.key] = last + minutes;
          if (w[rule.key] >= repeatEvery[rule.key]) { w[rule.key] = 0; note(rule.msg, 'info'); }
        }
      } else if (rule.reset(n)) { delete w[rule.key]; }
    });
  }

  // ---------- ticking ----------
  function stressMult() { return 1 + S().needs.stress / 1000 * 0.6; }

  function onTick(minutes) {
    var s = S(), n = s.needs, c = s.clothing, sm = stressMult() * pace();
    var sleeping = !!s.flags.sleeping;
    rec(s);
    var wx = weatherNow(), hr = G.time ? G.time.hour : 12;
    var thirstW = wx === 'hot' ? 1.35 : 1;
    var fatW = (hasCold() ? 1.15 : 1) * (hasTrait('nightOwl') && (hr >= 22 || hr < 4) ? 0.85 : 1) * ((wx === 'snow' || wx === 'storm') && isOut() ? 1.1 : 1);
    var stressW = hasTrait('earlyBird') && hr >= 5 && hr < 12 ? 2 : 1;
    if (hasTrait('socialButterfly') && hereHas('public')) stressW *= 1.5;
    var poison = hasPoison();
    if (poison) thirstW *= 1.5;
    for (var m = 0; m < minutes; m++) {
      // fatigue
      if (sleeping) n.fatigue -= 2.0;
      else n.fatigue += 0.62 * sm * fatW * (hasTrait('athletic') ? 0.9 : 1);
      // thirst/hunger drain (1000 = full)
      n.thirst -= (sleeping ? 0.5 : 1.1) * thirstW * (1 + (sm - 1) * 0.5);
      n.hunger -= (sleeping ? 0.3 : 0.55) * (poison ? 0.3 : 1);
      // bladder slows when dehydrated
      var hyd = 0.25 + 0.75 * clamp(n.thirst / MAX, 0, 1);
      n.bladder += (sleeping ? 0.8 : 2.8) * hyd * sm;
      n.bowels += (sleeping ? 0.2 : 0.45) * (poison ? 3 : 1) * (0.5 + 0.5 * clamp(1 - n.hunger / MAX + 0.4, 0, 1));
      // stress eases slowly, faster when resting
      n.stress -= sleeping ? 0.5 : 0.12 * stressW;
      // control: drifts toward 800, pulled down by high stress
      var target = n.stress > 600 ? 650 : 800;
      n.control += (target - n.control) * 0.0008;
      // clothing dries
      c.upperWetness -= 0.15; c.lowerWetness -= 0.12;
      clampNeeds();
      if (!sleeping) { checkAccident(); checkCollapse(); }
      if (sleeping && n.fatigue <= 0) s.flags.sleeping = false;
    }
    illnessTick(minutes, sleeping, wx, hr);
    exposureTick(minutes, sleeping);
    // general wear
    c.upperIntegrity -= minutes * 0.001; c.lowerIntegrity -= minutes * 0.0012;
    clampNeeds();
    if (!sleeping) checkWarnings(minutes);
    updateTraits();
  }

  function isOut() { try { var h = G.world && G.world.here ? G.world.here() : null; return !!(h && h.indoor === false); } catch (e) { return false; } }
  function illnessTick(minutes, sleeping, wx, hr) {
    var s = S(), il = s.illness, r = s.records, d = G.time ? G.time.day : 0, c = s.clothing;
    if (!sleeping && hr >= 1 && hr < 4 && r.lastLate !== d) { r.lastLate = d; r.lateNights++; }
    if (!sleeping && hr >= 5 && hr < 7 && r.lastEarly !== d) { r.lastEarly = d; r.earlyRises++; }
    var wetOut = isOut() && /rain|storm|snow|drizzle/.test(wx);
    var soaked = c.upperWetness + c.lowerWetness >= 60;
    if (wetOut || soaked) il.exposure += minutes * (soaked ? 1.5 : 1) * (wx === 'snow' ? 1.5 : 1);
    else il.exposure = Math.max(0, il.exposure - minutes * 0.5);
    if (!sleeping && hr >= 20 && /alley|bar|docks/.test((here() || {}).id || '') && r.lastNightOut !== d) { r.lastNightOut = d; r.nightsOut++; attitude('nightlife', 3); }
    if (il.sore > 0) il.sore = Math.max(0, il.sore - minutes);
    if (il.food > 0) {
      il.food -= minutes * (sleeping ? 1.5 : 1);
      if (il.food <= 0) { il.food = 0; r.poisoningsBeaten++; note('Your stomach has finally settled. Food sounds good again.', 'up'); }
    }
    if (il.cold > 0) {
      il.cold -= minutes * (sleeping ? 2 : 1);
      if (il.cold <= 0) { il.cold = 0; r.coldsBeaten++; note('Your cold has cleared up. You can breathe through your nose again.', 'up'); }
    } else if (il.exposure >= 240) {
      il.exposure = 0;
      if (Math.random() < (hasTrait('resilient') ? 0.15 : 0.3)) {
        il.cold = 2 * 1440 + Math.floor(Math.random() * 1440);
        note('You have caught a head cold. Your nose is running and everything feels slower. Rest, warm drinks and medicine help.', 'down');
        if (G.appendStory) G.appendStory('<p class="flavor">A shiver runs through you, and your throat starts to feel scratchy. Being cold and wet for so long has caught up with you.</p>');
        if (G.emit) G.emit('caughtCold', {});
      }
    }
  }

  // ---------- gym training path ----------
  var GYM = [
    { id: 'cardio', label: 'Cardio on the treadmill', phys: 14, ath: 12, fat: 80, thirst: -140, min: 40, text: 'You run until the numbers on the treadmill stop mattering. Your heart pounds, and your head clears.' },
    { id: 'weights', label: 'Lift weights', phys: 24, ath: 6, fat: 115, thirst: -100, min: 50, text: 'You work through a full set of lifts. Your arms shake on the last rep, but you get it up.' },
    { id: 'yoga', label: 'Stretch and do yoga', phys: 8, ath: 4, will: 8, fat: 30, thirst: -40, min: 40, stress: -60, text: 'You hold each stretch and breathe slowly. Your body unknots one muscle at a time.' },
    { id: 'swim', label: 'Swim laps in the pool ($2)', cost: 2, phys: 18, ath: 14, fat: 95, thirst: -60, min: 45, text: 'Lap after lap in the cool water. Afterwards you float for a minute, feeling light.' }
  ];
  function gymPlan() { var w = rec().workouts; return w < 5 ? 'Beginner' : w < 15 ? 'Building up' : w < 30 ? 'Regular' : w < 60 ? 'Strong' : 'Gym legend'; }
  function gymOptions(out) {
    var n = S().needs, il = S().illness, r = rec();
    GYM.forEach(function (g) {
      var dis = n.fatigue >= 850 ? 'You are too tired to train safely.' : (g.cost && money() < g.cost) ? 'Not enough money.' : null;
      out.actions.push(opt(g.label, function () {
        if (dis) return { text: '<p>' + dis + '</p>', minutes: 1 };
        if (g.cost) addMoney(-g.cost);
        var sore = il.sore > 0 && g.id === 'weights', mult = sore ? 0.5 : 1;
        var att = attitude('exercise', 1);
        train('physique', rnd(g.phys * mult)); trainSkill('athletics', g.ath); if (g.will) train('willpower', g.will);
        chg('needs.fatigue', rnd(g.fat * (hasTrait('gymRat') ? 0.7 : 1))); chg('needs.thirst', g.thirst);
        addStress((g.stress || -35) * (2 - (att || 1))); attitude('hardWork', 1);
        var before = gymPlan(); r.workouts++;
        var extra = '';
        if (g.id === 'weights') {
          if (!hasTrait('gymRat') && today() - r.lastWeights <= 1) { il.sore = 1440; extra = ' <span class="flavor">Lifting two days running has left you sore. A rest day or yoga would help.</span>'; }
          r.lastWeights = today();
        }
        if (g.id === 'yoga') il.sore = Math.max(0, il.sore - 600);
        if (sore) extra += ' <span class="flavor">Your sore muscles hold you back today.</span>';
        if (gymPlan() !== before) note('Training level: ' + gymPlan() + '. Your routine is getting easier.', 'up');
        return { text: '<p>' + g.text + extra + '</p>', minutes: g.min };
      }, { time: g.min, disabled: !!dis, hint: dis || 'Training level: ' + gymPlan() + ' (' + r.workouts + ' workouts)' }));
    });
  }

  function maybePoison(p) {
    var il = S().illness; rec();
    if (il.food > 0 || Math.random() >= p * (hasTrait('castIron') ? 0.2 : 1)) return false;
    il.food = 600 + Math.floor(Math.random() * 900);
    note('Something you ate disagrees with you. Food poisoning: your stomach is in knots and you will need a restroom often. Water and rest help.', 'down');
    if (G.appendStory) G.appendStory('<p class="flavor">About an hour later your stomach gives an ominous lurch. That food was not right.</p>');
    if (G.emit) G.emit('foodPoisoning', {});
    return true;
  }

  function clampNeeds() {
    var n = S().needs, c = S().clothing;
    Object.keys(n).forEach(function (k) { n[k] = clamp(n[k], 0, MAX); });
    ['upperWetness', 'upperIntegrity', 'lowerWetness', 'lowerIntegrity'].forEach(function (k) { c[k] = clamp(c[k], 0, 100); });
  }

  // Accident threshold drops when control is low (1000 at full control, down to ~700).
  function accidentThreshold() {
    var ctl = S().needs.control;
    if (hasTrait('ironBladder')) return MAX;
    return MAX - rnd((MAX - ctl) * 0.3);
  }

  // Who is around to see? Returns { id, name, p (pronouns), stage } or null.
  function witness() {
    try {
      if (!window.NPCS || !NPCS.present) return null;
      var ids = NPCS.present(G.state); if (!ids || !ids.length) return null;
      var id = ids[Math.floor(Math.random() * ids.length)], n = NPCS.byId[id];
      return { id: id, name: n.name, first: n.name.replace(/^(Professor|Dr\.|Mr\.|Ms\.|Mx\.|Officer|Mayor)\s+/, '').split(' ')[0], p: NPCS.pronouns(id), stage: NPCS.stage(G.state, id).key };
    } catch (e) { return null; }
  }
  function placeKind() {
    var h = here(), id = h.id || '';
    if (id === 'dorm_room') return 'private';
    if (h.restroom && /dorm_hall/.test(id)) return 'semi';
    if (/lecture_hall|library|deans_office/.test(id)) return 'class';
    if (/cafeteria|cafe|bar|market|gym|florist|town_hall|church/.test(id)) return 'indoorPublic';
    if (h.indoor === false && /old_mill|woods|alley|campus_farm/.test(id)) return 'secluded';
    return 'outdoorPublic';
  }
  function crowded() { var h = G.time.hour; return h >= 8 && h < 21; }
  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }

  function accidentScene(kind) {
    var pk = placeKind(), w = witness(), busy = crowded(), place = (here().name || 'here');
    var what = kind === 'bladder' ? 'Warmth spreads through your clothes before you can stop it' : 'Your stomach gives one final cramp and you lose the fight';
    var lines = [], stress = 150, social = 0;
    if (pk === 'private') { lines.push(what + '. At least you are alone in your room. You sigh, strip off, and deal with it.'); stress = 60; }
    else if (pk === 'semi') { lines.push(what + ', just a few doors short of the bathroom.'); lines.push(busy ? 'A door opens down the corridor. You don\'t look to see who it is.' : 'The corridor is empty. Small mercies.'); stress = busy ? 140 : 90; }
    else if (pk === 'class') { lines.push(what + '. In ' + place + ', of all places.'); lines.push(busy ? pick(['Someone two rows back goes very quiet.', 'You grab your bag and hold it in front of you as you make for the door.', 'You keep your head down and hope nobody noticed. Someone did.']) : 'Thankfully, the rooms are mostly empty at this hour.'); stress = busy ? 220 : 120; social = busy ? -15 : 0; }
    else if (pk === 'indoorPublic') { lines.push(what + ', right there in ' + place + '.'); lines.push(busy ? pick(['A staff member pretends very hard not to have seen, and points you toward the restroom.', 'Conversation at the next table falters, then carries on a little too loudly.', 'You leave quickly, face burning.']) : 'It\'s quiet, and you slip out before anyone notices.'); stress = busy ? 200 : 110; social = busy ? -10 : 0; }
    else if (pk === 'secluded') { lines.push(what + '. Out here, at least, there is nobody to see.'); stress = 80; }
    else { lines.push(what + ' in the middle of ' + place + '.'); lines.push(busy ? pick(['A passer-by glances down, then away.', 'You walk stiffly to the nearest bench and sit, pretending nothing happened.', 'A gust of wind makes the wet fabric go cold.']) : 'The street is dark and empty.'); stress = busy ? 180 : 90; social = busy ? -8 : 0; }
    if (w && pk !== 'private') {
      var P = w.p;
      if (w.stage === 'hostile' || w.stage === 'cold') { lines.push(w.name + ' saw. ' + P.Sub + ' smirk' + (P.sub === 'they' ? '' : 's') + ' and turn' + (P.sub === 'they' ? '' : 's') + ' away, and you know the story will get around.'); stress += 60; social -= 10; }
      else if (w.stage === 'neutral') { lines.push(w.name + ' noticed. ' + P.Sub + ' give' + (P.sub === 'they' ? '' : 's') + ' you an awkward nod and find something else to look at.'); stress += 20; }
      else { lines.push(w.first + ' is suddenly beside you. "Hey. It\'s okay. Here," ' + P.sub + ' say' + (P.sub === 'they' ? '' : 's') + ', handing you ' + pick(['a jacket to tie around your waist', 'a pack of tissues', 'a spare hoodie']) + ' and steering you somewhere quieter.'); stress -= 60; if (G.emit) G.emit('helpedAfterAccident', { npc: w.id }); }
    }
    return { html: '<p class="scene accident">' + lines.join(' ') + '</p>', stress: Math.max(30, stress), social: social, witness: w ? w.id : null, pk: pk, busy: busy };
  }

  function checkAccident() {
    var s = S(), n = s.needs, th = accidentThreshold(), kind = null;
    if (n.bladder >= th) kind = 'bladder'; else if (n.bowels >= th) kind = 'bowels';
    if (!kind) return;
    n[kind] = 0;
    // A worn incontinence brief (wardrobe.js) catches it first: no wet clothes, nothing to see. Smell from a soiled brief is wardrobe/npcs' job.
    var held = wardrobeAbsorbPart(kind);
    if (held >= 1) { containedAccident(kind); return; }
    // Ordinary underwear soaks up part of it before it reaches the outer layer; a full brief overflows the rest.
    var under = wardrobeLayer('underLower'), soak = kind === 'bladder' ? 70 : 30;
    if (held > 0) soak = Math.max(5, Math.round(soak * (1 - held)));
    else if (under && under.integrity > 0) soak = Math.round(soak * (kind === 'bladder' ? 0.75 : 0.5));
    // (wardrobe.js already says when a brief overflows)
    s.clothing.lowerWetness = clamp(s.clothing.lowerWetness + soak, 0, 100);
    s.flags.dirty = true;
    s.flags.accidentToday++;
    var sc = accidentScene(kind);
    if (G.appendStory) G.appendStory(sc.html); else note(sc.html, 'down');
    n.stress = clamp(n.stress + sc.stress, 0, MAX);
    n.control = clamp(n.control - 30, 0, MAX);
    note('Stress +' + sc.stress, 'up'); note('Control -30', 'down');
    if (sc.social) { s.status.socialiteFame = clamp(s.status.socialiteFame + sc.social, 0, MAX); note('Socialite fame ' + sc.social, 'down'); }
    if (kind === 'bowels') { note('Your lower clothes are soiled. Rinse them out at a restroom sink, or go home and change, before people notice the smell.', 'info'); }
    else note('Your clothes are wet. Clean up at a restroom, or go home and change.', 'info');
    if (G.emit) G.emit('accident', { kind: kind, type: kind, where: here().id, witness: sc.witness, amount: VOLUME[kind].amount, unit: VOLUME[kind].unit, leaked: held > 0 ? 1 - held : 1 });
    if (kind === 'bowels' && !isSoiled()) s.clothing.lowerSoiled = true; // no wardrobe item to tag
    // Anyone who saw it: named NPCs (npcs.js adjusts their opinion), classmates (school.js lowers school reputation).
    if (sc.pk !== 'private') {
      var by = sc.witness || (sc.busy && sc.pk !== 'secluded' ? (onCampusNow() ? 'student' : 'stranger') : null);
      if (by) spotted(by, 'accident', { what: kind });
    }
  }

  // ---------- incontinence briefs (worn via wardrobe.js) ----------
  function WR() { return G.wardrobe || window.Wardrobe || null; }
  // Each pee is 400 ml and each poo 0.5 lb. absorb(kind, amount, unit) may return true (all of it), false (none),
  // or a number = how much it held; the rest overflows onto your clothes. wardrobeAbsorb returns the fraction held (0..1).
  var VOLUME = { bladder: { amount: 400, unit: 'ml' }, bowels: { amount: 0.5, unit: 'lb' } };
  function wardrobeAbsorbPart(kind) {
    try { var w = WR(); if (!w || typeof w.absorb !== 'function') return 0;
      var v = VOLUME[kind], r = w.absorb(kind, v.amount, v.unit);
      if (r === true) return 1; if (typeof r === 'number' && r > 0) return clamp(r / v.amount, 0, 1); return 0; } catch (e) { return 0; }
  }
  function wardrobeAbsorb(kind) { return wardrobeAbsorbPart(kind) >= 1; }
  function wardrobeLayer(id) { try { var w = WR(); return w && typeof w.layer === 'function' ? w.layer(id) : null; } catch (e) { return null; } }
  function wearingBrief() { try { var w = WR(); return !!(w && w.wearingBrief && w.wearingBrief() && !(w.briefFull && w.briefFull())); } catch (e) { return false; } }
  function containedAccident(kind) {
    var s = S(), n = s.needs, st = kind === 'bowels' ? 25 : 10;
    s.flags.accidentToday++;
    var r = rec(s); r.contained = (r.contained || 0) + 1;
    n.stress = clamp(n.stress + st, 0, MAX); n.control = clamp(n.control - 15, 0, MAX);
    var t = 'You can\'t hold it any longer. Nobody around you notices.'; // wardrobe.js reports the fill level
    if (G.appendStory) G.appendStory('<p class="scene">' + t + '</p>'); else note(t, 'info');
    note('Stress +' + st, 'up'); note('Control -15', 'down');
    if (G.emit) G.emit('accident', { kind: kind, type: kind, where: here().id, witness: null, contained: true, absorbed: true, amount: VOLUME[kind].amount, unit: VOLUME[kind].unit });
  }
  function briefOption() {
    var s = S(), n = s.needs, both = n.bowels >= 300;
    return opt(both ? 'Go in your brief' : 'Pee in your brief', function () {
      var kinds = n.bladder >= 150 ? ['bladder'] : [];
      if (both) kinds.push('bowels');
      var done = kinds.filter(function (k) { if (wardrobeAbsorb(k)) { n[k] = 0; return true; } return false; });
      if (!done.length) return { text: '<p>Your brief is already full. You need a restroom, or a fresh brief.</p>', minutes: 1 };
      var r = rec(s); r.briefUsed = (r.briefUsed || 0) + 1;
      n.stress = clamp(n.stress - 15, 0, MAX);
      if (G.emit) done.forEach(function (k) { G.emit('accident', { kind: k, type: k, where: here().id, witness: null, contained: true, absorbed: true, chosen: true, amount: VOLUME[k].amount, unit: VOLUME[k].unit }); });
      return { text: '<p>You go discreetly. Nobody around you can tell.' + (done.indexOf('bowels') >= 0 ? ' Change soon, before anyone notices the smell.' : '') + '</p>', minutes: 2 };
    }, { time: 2, hint: 'Nobody sees, but a soiled brief can be smelled' });
  }

  // ---------- undressed in public (wardrobe.js says what's uncovered; npcs.js/school.js handle reputation) ----------
  function exposedNow() {
    try { var w = WR(); if (!w) return false;
      if (typeof w.exposed !== 'function') { if (typeof w.exposure !== 'function') return false; var x = w.exposure() || {}; return !!(x.lower || x.upper === 'bare'); }
      var e = w.exposed();
      if (!e) return false; if (typeof e === 'object') { if (e.length !== undefined) return e.length > 0; for (var k in e) if (e[k]) return true; return false; } return true; } catch (x) { return false; }
  }
  function inPublic() {
    try { if (G.world && typeof G.world.isPublic === 'function') return !!G.world.isPublic(); } catch (e) {}
    var h = here(); if (h.restroom || /fitting/.test(h.id || '')) return false;
    return placeKind() !== 'private';
  }
  function covering() { var f = S().flags; return !!(f.covering && exposedNow() && inPublic()); }
  function exposureTick(minutes, sleeping) {
    var s = S(), f = s.flags, n = s.needs;
    if (sleeping || !exposedNow() || !inPublic()) { f.covering = false; f.exposedWarned = false; return; }
    var ex = null; try { ex = WR().exposed(); } catch (e) {}
    var sev = ex && typeof ex === 'object' ? ((ex.lower === 'bare' || ex.naked) ? 1 : ex.lower === 'under' ? 0.5 : 0) + (ex.upper === 'bare' ? 0.5 : 0) : 1;
    if (!(WR() && typeof WR().exposed === 'function')) n.stress = clamp(n.stress + minutes * 0.35 * Math.max(0.5, sev) * (f.covering ? 0.5 : 1), 0, MAX); // wardrobe.js owns this stress when loaded
    var r = rec(s); r.exposedMinutes = (r.exposedMinutes || 0) + minutes;
    if (!f.exposedWarned) { f.exposedWarned = true; note('You aren\'t properly dressed, and people can see. Cover up, or get somewhere private and change.', 'down'); }
  }
  function coverOption() {
    return opt('Cover yourself as best you can', function () {
      var s = S(); s.flags.covering = true; s.needs.stress = clamp(s.needs.stress - 10, 0, MAX);
      if (G.emit) G.emit('covered', { where: here().id });
      return { text: '<p>You hold your bag in front of you and keep your arms in close. It isn\'t much, but fewer people will notice. You need proper clothes, or somewhere private, soon.</p>', minutes: 1 };
    }, { time: 1, hint: 'People notice less often, but it doesn\'t fix it' });
  }

  // ---------- being seen: relieving yourself where there's no restroom ----------
  function onCampusNow() { try { return !!(G.world && G.world.onCampus && G.world.onCampus()); } catch (e) { return false; } }
  function presentIds() { try { return (window.NPCS && NPCS.present && NPCS.present(G.state)) || []; } catch (e) { return []; } }
  function isStudentId(id) { if (id === 'students') return true; var n = window.NPCS && NPCS.byId && NPCS.byId[id]; return !!(n && n.group === 'Students'); }
  // Shared 'spotted' event: school.js turns student sightings into school reputation, npcs.js into named NPC opinion.
  function spotted(by, kind, extra) {
    var d = { by: by, kind: kind, student: isStudentId(by), src: 'stats', where: here().id };
    if (extra) for (var k in extra) d[k] = extra[k];
    if (G.emit) G.emit('spotted', d);
  }
  // Soiled lower clothing: the worn wardrobe item's .soiled flag (wardrobe.js), or stats.clothing.lowerSoiled without a wardrobe.
  function isSoiled() {
    try { var W = G.wardrobe || window.Wardrobe; if (W && typeof W.soiled === 'function' && W.soiled()) return true; } catch (e) {}
    return !!S().clothing.lowerSoiled;
  }
  function reliefRisk() {
    var pk = placeKind(), busy = crowded(), ids = presentIds();
    var r = { secluded: 0.05, outdoorPublic: busy ? 0.35 : 0.12, indoorPublic: busy ? 0.6 : 0.3, 'class': busy ? 0.75 : 0.35, semi: 0.3, 'private': 0 }[pk];
    if (r === undefined) r = 0.3;
    // Ron's crowd() (0 = empty, 1 = packed) refines the guess when available.
    try { if (G.world && typeof G.world.crowd === 'function') { var cr = G.world.crowd(); if (typeof cr === 'number') r = r * 0.4 + clamp(cr, 0, 1) * (pk === 'secluded' ? 0.2 : 0.7); } } catch (e) {}
    r += 0.1 * ids.length;
    if (isOut() && /rain|storm|snow/.test(weatherNow())) r *= 0.7;
    r *= 1 - (S().skills.skulduggery || 0) / 2000;
    var aw = S().core.awareness; if (aw) r *= 1 - effective('awareness') / 2500; // a watchful eye picks the moment
    return clamp(r, 0.02, 0.95);
  }
  function riskWord(r) { return r < 0.12 ? 'low' : r < 0.35 ? 'some' : r < 0.6 ? 'high' : 'very high'; }
  function reliefOption() {
    var s = S(), n = s.needs, both = n.bowels >= 400, r = reliefRisk();
    return opt(both ? 'Find somewhere to go' : 'Find somewhere to pee', function () {
      var risk = reliefRisk(), out = isOut(), campus = onCampusNow();
      var spot = out ? pick(['behind a hedge', 'in a shadowy corner', 'behind a parked van', 'behind a row of bins', 'under some trees']) : pick(['in an empty back corridor', 'in a quiet stairwell', 'in a corner nobody seems to use']);
      var relief = n.bladder >= 600 || n.bowels >= 600;
      n.bladder = 0; if (both) n.bowels = 0;
      var r2 = rec(s); r2.publicRelief = (r2.publicRelief || 0) + 1;
      attitude('rulebreaking', 1);
      var lead = 'You find a spot ' + spot + ' and go as fast as you can. ';
      if (Math.random() < risk) {
        var w = presentIds().length ? witness() : null, line, v = w && w.p.sub === 'they' ? '' : 's';
        if (w) line = lead + 'You are just finishing when ' + w.name + ' comes round the corner and sees you. ' + (w.stage === 'hostile' || w.stage === 'cold' ? w.p.Sub + ' laugh' + v + ' out loud.' : w.stage === 'neutral' ? w.p.Sub + ' stop' + v + ' dead, then turn' + v + ' sharply away.' : w.p.Sub + ' wince' + v + ' and suddenly find' + v + ' ' + w.p.pos + ' phone very interesting.');
        else line = lead + (campus ? 'Halfway through, a group of students walks past. Someone says, "Oh, come on," and you hear them laughing all the way down the path.' : 'Halfway through, a passer-by stops, stares, and walks off shaking their head.');
        addStress(90);
        // On a busy town street, the passer-by is sometimes Officer Dunn on patrol.
        if (!w && !campus && out && crowded() && Math.random() < 0.25) {
          var fine = Math.min(money(), 15); if (fine) addMoney(-fine); chg('status.crime', 5);
          line += ' Unfortunately, it\'s Officer Dunn. ' + (fine ? 'You get a short lecture and a $' + fine + ' fine for public indecency.' : 'You get a short lecture and a warning, since you can\'t pay a fine.');
          spotted('dunn', 'relieved', { what: both ? 'bowels' : 'bladder', fine: fine });
        } else spotted(w ? w.id : (campus ? 'student' : 'stranger'), 'relieved', { what: both ? 'bowels' : 'bladder' });
        return { text: '<p class="scene accident">' + line + '</p>', minutes: both ? 6 : 3 };
      }
      if (relief) chg('needs.stress', -30); else addStress(10);
      return { text: '<p>' + lead + 'Nobody sees. You walk away relieved and a little guilty.</p>', minutes: both ? 6 : 3 };
    }, { time: both ? 6 : 3, hint: 'Chance of being seen: ' + riskWord(r) });
  }

  function checkCollapse() {
    var s = S(), n = s.needs;
    if (s.flags.collapse) return;
    if (n.fatigue >= MAX) s.flags.collapse = 'fatigue';
    else if (n.thirst <= 0) s.flags.collapse = 'thirst';
    else if (n.hunger <= 0) s.flags.collapse = 'hunger';
    if (s.flags.collapse) {
      G.state.lock = { reason: 'collapse', allow: [] };
      var w = witness();
      s.flags.collapseCtx = { where: here().id, name: here().name, kind: placeKind(), hour: G.time.hour, witness: w };
      var warn = { fatigue: 'Your legs feel like lead and the edges of the world are going soft.', thirst: 'Your head spins and your mouth is bone dry.', hunger: 'You are shaking, light-headed and empty.' }[s.flags.collapse];
      note(warn + ' You are about to pass out.', 'down');
    }
  }

  // ---------- core stat growth & decay ----------
  function today() { return (G.time && G.time.day) || 1; }

  function train(stat, amount, opposed) {
    var c = S().core[stat]; if (!c) return;
    var gain = opposed ? -Math.abs(amount) : amount * (1 - c.value / 1400); // diminishing returns
    gain = rnd(gain);
    var before = tier(c.value);
    c.value = clamp(c.value + gain, 0, MAX);
    if (gain > 0) { c.base = clamp(c.base + rnd(gain * 0.35), 0, MAX); c.lastUsedDay = today(); }
    if (gain) note(CORE[stat].label + ' ' + (gain > 0 ? '+' : '') + gain, gain > 0 ? 'up' : 'down');
    var after = tier(c.value);
    if (after !== before) note(CORE[stat].label + ' is now ' + after + '.', gain > 0 ? 'up' : 'down');
    updateTraits();
  }

  function trainSkill(skill, amount) {
    var s = S(); if (s.skills[skill] === undefined) s.skills[skill] = 0;
    var before = tier(s.skills[skill]);
    var gain = rnd(amount * (1 - s.skills[skill] / 1400));
    s.skills[skill] = clamp(s.skills[skill] + gain, 0, MAX);
    if (gain) note((SKILLS[skill] ? SKILLS[skill].label : skill) + ' +' + gain, 'up');
    var after = tier(s.skills[skill]);
    if (after !== before) note((SKILLS[skill] ? SKILLS[skill].label : skill) + ' is now ' + after + '.', 'up');
    updateTraits();
  }

  // Each new day, unused stats slowly slide back toward their trained base.
  function onNewDay() {
    var s = S(), d = today();
    Object.keys(s.core).forEach(function (k) {
      var c = s.core[k];
      if (d - c.lastUsedDay >= 2 && c.value > c.base) c.value = Math.max(c.base, c.value - 8);
    });
    s.flags.accidentToday = 0;
    if (s.needs.fatigue > 300) s.flags.sleptFull = false;
  }

  function updateTraits() {
    var s = S();
    TRAITS.forEach(function (t) {
      var has = s.traits.indexOf(t.id) !== -1, ok = t.req(s);
      if (ok && !has) { s.traits.push(t.id); note('New trait: ' + t.label + '. ' + t.desc, 'up'); }
      else if (!ok && has) { s.traits.splice(s.traits.indexOf(t.id), 1); note('Lost trait: ' + t.label + '.', 'down'); }
    });
  }

  // Attitude shifts with repetition; returns a stress multiplier for doing the thing.
  function attitude(id, nudge) {
    var a = S().attitudes; if (a[id] === undefined) a[id] = 0;
    if (nudge) a[id] = clamp(a[id] + nudge, -100, 100);
    return 1 - a[id] / 200; // -100 => 1.5x stress, +100 => 0.5x
  }

  function addStress(amount, attitudeId) {
    var mult = attitudeId ? attitude(attitudeId) : 1;
    if (amount > 0 && hasTrait('steady')) mult *= 0.85;
    chg('needs.stress', rnd(amount * mult));
  }

  function transform(id, stage) {
    if (!TRANSFORMS[id]) return;
    var t = S().transforms, prev = t[id] || 0;
    stage = clamp(stage === undefined ? prev + 1 : stage, 0, 3);
    if (stage === prev) return;
    if (stage === 0) delete t[id]; else t[id] = stage;
    if (stage > prev) note(TRANSFORMS[id].label + ': ' + TRANSFORMS[id].stages[stage], 'info');
  }

  // ---------- options ----------
  function opt(label, run, extra) { var o = { label: label, run: run }; if (extra) for (var k in extra) o[k] = extra[k]; return o; }

  function collapseOption() {
    var s = S(), why = s.flags.collapse, cx = s.flags.collapseCtx || {}, w = cx.witness;
    var o = opt('Pass out', function () {
      var n = s.needs, lines = [], wakeAt = 'dorm_room', minutes, fee = 0;
      s.flags.collapse = null; s.flags.collapseCtx = null;
      if (G.state.lock && G.state.lock.reason === 'collapse') G.state.lock = null;
      var cause = { fatigue: 'Your eyes close on their own and the world slides away.', thirst: 'Your vision tunnels and your knees give out.', hunger: 'Your legs turn to water and you sink down.' }[why];
      lines.push(cause);
      var night = cx.hour >= 22 || cx.hour < 6, P = w && w.p, friendly = w && /friendly|friend|close/.test(w.stage);
      if (friendly) {
        lines.push('The last thing you hear is ' + w.first + ' saying your name.');
        lines.push(why === 'fatigue' ? 'You wake in your own bed with your shoes still on. A note on the desk says: "You scared me. Drink some water. -' + w.first + '"'
          : 'You come to in the campus clinic. The nurse says ' + w.first + ' brought you in and waited until you were stable.');
        if (why !== 'fatigue') { wakeAt = 'dorm_room'; fee = 10; }
        if (G.emit) G.emit('helpedAfterCollapse', { npc: w.id });
      } else if (cx.kind === 'private') {
        lines.push('You wake sprawled across your bed, stiff and groggy, with no idea how long you were out.');
      } else if (why === 'fatigue' && cx.kind === 'class') {
        lines.push('You wake with your cheek on the desk and the room empty. Someone has left a sticky note on your sleeve: "Lecture ended an hour ago."');
        wakeAt = null; n.stress = clamp(n.stress + 40, 0, MAX);
      } else if (why === 'fatigue' && (cx.kind === 'secluded' || night)) {
        lines.push('You wake cold and damp at ' + (cx.name || 'the side of the path') + ', and your pockets feel lighter than they should.');
        wakeAt = null; fee = Math.min(money(), Math.round(Math.random() * 15 + 5));
        if (G.world && G.world.isIndoors && !G.world.isIndoors()) { s.clothing.upperWetness = clamp(s.clothing.upperWetness + 20, 0, 100); s.clothing.lowerWetness = clamp(s.clothing.lowerWetness + 20, 0, 100); }
      } else if (why === 'fatigue') {
        lines.push(w ? w.name + ' is shaking your shoulder. "You can\'t sleep here." ' + P.Sub + ' help' + (P.sub === 'they' ? '' : 's') + ' you to your feet.' : 'A stranger is shaking your shoulder and asking if you need an ambulance. You mumble something and stumble home.');
      } else {
        lines.push((w ? w.name + ' calls' : 'Someone calls') + ' for help. You wake in the campus clinic with ' + (why === 'thirst' ? 'a paper cup of water pressed into your hand' : 'a granola bar on the tray beside you') + ' and a nurse frowning at you. A small visit fee goes on your account.');
        fee = 20;
      }
      if (why === 'fatigue') { n.fatigue = wakeAt ? 350 : 500; minutes = wakeAt ? 420 : 240; }
      else { n.fatigue = Math.max(0, n.fatigue - 200); n[why] = 400; minutes = 180; }
      if (fee) addMoney(-Math.min(money(), fee));
      n.stress = clamp(n.stress + 100, 0, MAX);
      if (wakeAt && G.world && G.world.teleport && here().id !== wakeAt) G.world.teleport(wakeAt);
      Object.keys(s.flags.warned).forEach(function (k) { delete s.flags.warned[k]; });
      if (G.emit) G.emit('collapse', { cause: why, where: cx.where, witness: w ? w.id : null });
      return { text: '<p class="scene collapse">' + lines.join(' ') + '</p>', minutes: minutes };
    }, { time: why === 'fatigue' ? 420 : 180 });
    o.always = true;
    return o;
  }

  // ---------- groceries: buy at Hollowbrook Grocer (market), eat/drink anywhere, cook at home ----------
  // Stored as stats.groceries.items = { id: [dayBought, ...] } (one entry per serving).
  // Lucy's inventory can read G.groceries.list() and set G.groceries.limit = function () { return n; } for a carry limit.
  var GROCERIES = {
    water:   { label: 'Bottle of water',   unit: 'bottle',  price: 1, qty: 1, verb: 'Drink', thirst: 250, mins: 1, text: 'You twist the cap off and drain half the bottle in one go.' },
    milk:    { label: 'Pint of milk',      unit: 'glass',   price: 2, qty: 3, verb: 'Drink', thirst: 160, hunger: 50, mins: 2, spoils: 2, text: 'Cold, creamy, and exactly what you needed.' },
    bread:   { label: 'Loaf of bread',     unit: 'slice',   price: 3, qty: 6, verb: 'Eat', hunger: 90, thirst: -10, mins: 2, spoils: 5, ingredient: true, text: 'You tear off a slice and eat it plain. Not exciting, but it does the job.' },
    fruit:   { label: 'Bag of apples',     unit: 'apple',   price: 4, qty: 5, verb: 'Eat', hunger: 70, thirst: 30, bowels: 25, mins: 3, spoils: 7, text: 'Crisp and a little sour. You feel virtuous for about a minute.' },
    snacks:  { label: 'Bag of crisps',     unit: 'handful', price: 2, qty: 3, verb: 'Eat', hunger: 110, thirst: -30, mins: 2, text: 'Salty, crunchy, and gone far too fast.' },
    noodles: { label: 'Instant noodles',   unit: 'pot',     price: 1, qty: 1, verb: 'Make', hunger: 260, thirst: -20, mins: 10, needsHome: true, text: 'Boiling water, three minutes, and a sachet of something orange. Comfort in a cup.' },
    pasta:   { label: 'Pasta and sauce',   unit: 'portion', price: 5, qty: 3, ingredient: true },
    eggs:    { label: 'Half a dozen eggs', unit: 'egg',     price: 3, qty: 6, spoils: 10, ingredient: true }
  };
  function groc() { var s = S(); if (!s.groceries) s.groceries = { items: {} }; return s.groceries.items; }
  function grocCount(id) { var g = groc()[id]; return g ? g.length : 0; }
  function grocTotal() { var g = groc(), n = 0; for (var k in g) n += g[k].length; return n; }
  function grocLimit() { try { if (G.groceries && typeof G.groceries.limit === 'function') return G.groceries.limit(); } catch (e) {} return 24; }
  function grocAdd(id, n) { var g = groc(); g[id] = g[id] || []; for (var i = 0; i < n; i++) g[id].push(today()); }
  function grocTake(id) { var g = groc()[id]; if (!g || !g.length) return null; return g.shift(); } // oldest first
  function isOff(id, day) { var d = GROCERIES[id]; return !!(d && d.spoils && today() - day > d.spoils); }
  function grocName(id, n) { var d = GROCERIES[id]; return n + ' ' + d.unit + (n === 1 ? '' : (/sh$|ch$/.test(d.unit) ? 'es' : 's')); }
  function exposeGroceries() { var prev = G.groceries || {}; G.groceries = {
    CATALOG: GROCERIES, count: grocCount, total: grocTotal, add: grocAdd, take: grocTake,
    list: function () { var g = groc(); return Object.keys(g).filter(function (k) { return g[k].length; }).map(function (k) { return { id: k, label: GROCERIES[k] ? GROCERIES[k].label : k, count: g[k].length, off: g[k].filter(function (d) { return isOff(k, d); }).length }; }); },
    spoiled: function (id) { return (groc()[id] || []).filter(function (d) { return isOff(id, d); }).length; },
    limit: prev.limit
  }; }
  function groceryOptions(out, n, home) {
    var hid = here().id;
    if (hid === 'market') {
      var full = grocTotal(), lim = grocLimit();
      Object.keys(GROCERIES).forEach(function (k) {
        var d = GROCERIES[k], tooMany = full + d.qty > lim, broke = money() < d.price;
        out.actions.push(opt('Buy ' + d.label.charAt(0).toLowerCase() + d.label.slice(1) + ' ($' + d.price + ')', function () {
          addMoney(-d.price); grocAdd(k, d.qty); attitude('spending', 1);
          if (G.emit) G.emit('groceriesBought', { id: k, qty: d.qty, price: d.price });
          return { text: '<p>You pop the ' + d.label.toLowerCase() + ' in your basket and pay at the till. (' + grocName(k, d.qty) + ')</p>', minutes: 2 };
        }, { sub: 'Groceries', time: 2, disabled: tooMany || broke, hint: broke ? 'Not enough money' : tooMany ? 'You can\'t carry any more groceries' : d.verb ? d.verb + ': ' + (d.hunger ? 'hunger +' + d.hunger + ' ' : '') + (d.thirst > 0 ? 'thirst +' + d.thirst : '') : 'Cooking ingredient' }));
      });
    }
    // Eat or drink what you're carrying
    Object.keys(GROCERIES).forEach(function (k) {
      var d = GROCERIES[k]; if (!d.verb || !grocCount(k)) return;
      if (d.needsHome && !home) return;
      var useful = (d.hunger && n.hunger < 900) || (d.thirst > 0 && n.thirst < 900);
      if (!useful) return;
      var lbl = d.verb === 'Make' ? 'Make a pot of instant noodles' : d.verb + ' ' + (d.verb === 'Drink' ? (k === 'milk' ? 'a glass of milk' : 'a bottle of water') : (k === 'fruit' ? 'an apple' : k === 'bread' ? 'a slice of bread' : 'some crisps'));
      out.actions.push(opt(lbl + ' (' + grocCount(k) + ' left)', function () {
        var day = grocTake(k), off = isOff(k, day);
        if (d.hunger) chg('needs.hunger', d.hunger);
        if (d.thirst) chg('needs.thirst', d.thirst);
        n.bowels = clamp(n.bowels + (d.hunger ? 15 : 0) + (d.bowels || 0), 0, MAX);
        if (d.thirst > 100) n.bladder = clamp(n.bladder + 40, 0, MAX);
        if (off) { maybePoison(0.5); return { text: '<p>' + (k === 'milk' ? 'One sip and you know. The milk has gone off.' : 'It tastes stale and a bit off. You finish it anyway.') + '</p>', minutes: d.mins }; }
        return { text: '<p>' + d.text + '</p>', minutes: d.mins };
      }, { sub: 'Your groceries', time: d.mins }));
    });
    // Cook a proper meal from ingredients
    if ((home || hid === 'dorm_hall') && n.hunger < 800) {
      var recipe = grocCount('pasta') ? ['pasta', 1, 'pasta with sauce'] : (grocCount('eggs') >= 2 && grocCount('bread')) ? ['eggs', 2, 'eggs on toast'] : null;
      if (recipe) out.actions.push(opt('Cook ' + recipe[2], function () {
        var anyOff = false;
        for (var i = 0; i < recipe[1]; i++) { if (isOff(recipe[0], grocTake(recipe[0]))) anyOff = true; }
        if (recipe[0] === 'eggs' && isOff('bread', grocTake('bread'))) anyOff = true;
        var skill = S().skills.cooking || 0, bonus = Math.round(skill / 10);
        chg('needs.hunger', 480 + bonus); chg('needs.stress', -20); chg('needs.thirst', 20);
        n.bowels = clamp(n.bowels + 50, 0, MAX); trainSkill('cooking', 8);
        if (hasTrait('homeCook')) { chg('needs.hunger', 110); chg('needs.stress', -20); }
        if (anyOff) maybePoison(0.4);
        return { text: '<p>You cook ' + recipe[2] + ' in the shared kitchen and eat it while it\'s hot. Proper food, and cheaper than eating out.' + (anyOff ? ' One of the ingredients smelled a little past it.' : '') + '</p>', minutes: 30 };
      }, { sub: 'Your groceries', time: 30 }));
    }
  }

  function getOptions() {
    var s = S(), n = s.needs, c = s.clothing;
    var out = { dialogue: [], actions: [], travel: [], other: [] };
    if (s.flags.collapse) { out.actions.push(collapseOption()); return out; }

    var rr = hereHas('restroom'), water = hereHas('water'), food = hereHas('food'), home = hereHas('home');
    var canRestroom = rr === null ? true : rr;

    if (canRestroom && (n.bladder >= 150 || n.bowels >= 150)) {
      out.actions.push(opt('Use the restroom', function () {
        var mins = 3 + (n.bowels >= 300 ? 7 : 0), relief = n.bladder >= 600 || n.bowels >= 600;
        n.bladder = 0; if (n.bowels >= 300) n.bowels = 0;
        if (!home) attitude('publicRestroom', 2);
        if (relief) chg('needs.stress', -30);
        return { text: '<p>You find a free stall and take care of things.' + (relief ? ' The relief is enormous.' : '') + '</p>', minutes: mins };
      }, { time: function () { return 3 + (n.bowels >= 300 ? 7 : 0); } }));
    }
    if (rr === false && !home && (n.bladder >= 400 || n.bowels >= 400)) out.actions.push(reliefOption());
    if (exposedNow() && inPublic() && !S().flags.covering) out.actions.push(coverOption());
    if (!home && wearingBrief() && (n.bladder >= 300 || n.bowels >= 300)) out.actions.push(briefOption());
    if (isSoiled() && canRestroom) {
      out.actions.push(opt('Rinse out your soiled clothes at the sink', function () {
        s.flags.dirty = false; c.lowerSoiled = false; c.lowerWetness = Math.max(c.lowerWetness, 60);
        return { text: '<p>You lock yourself in a stall, then scrub your clothes out at the sink as best you can. They\'re soaking wet now, but the smell is gone. They\'ll still need a proper wash.</p>', minutes: 20 };
      }, { time: 20 }));
    }
    if (s.flags.dirty && !isSoiled() && canRestroom) {
      out.actions.push(opt('Clean yourself up', function () {
        s.flags.dirty = false; c.lowerWetness = Math.max(0, c.lowerWetness - 30);
        return { text: '<p>You clean up as best you can at the sink. Your clothes are still damp, but you feel a little more human.</p>', minutes: 10 };
      }));
    }
    if ((water === null ? true : water) && n.thirst < 900) {
      out.actions.push(opt('Drink some water', function () {
        chg('needs.thirst', 300); n.bladder = clamp(n.bladder + 40, 0, MAX);
        if (hasPoison()) S().illness.food = Math.max(0, S().illness.food - 90);
        return { text: '<p>You drink deeply. Cool and clean.</p>', minutes: 2 };
      }));
    }
    if (n.hunger < 850 && money() >= 4 && (food === null || food || home)) {
      out.actions.push(opt(home ? 'Make a cheap meal ($2)' : 'Buy a snack ($4)', function () {
        var cost = home ? 2 : 4; addMoney(-cost);
        chg('needs.hunger', home ? 450 : 220); chg('needs.thirst', 40); n.bowels = clamp(n.bowels + 40, 0, MAX);
        if (home) { trainSkill('cooking', 6); if (hasTrait('homeCook')) { chg('needs.hunger', 110); chg('needs.stress', -20); } }
        else maybePoison(['market', 'bar', 'alley', 'docks'].indexOf(here().id) !== -1 ? 0.05 : 0.025);
        if (!home) attitude('spending', 1);
        return { text: home ? '<p>You cook something simple. Not fancy, but filling.</p>' : '<p>You grab something quick and eat it on the go.</p>', minutes: home ? 30 : 10 };
      }, { time: home ? 30 : 10 }));
    }
    var hid = here().id;
    if (hid === 'cafeteria' && n.hunger < 850) {
      var swipes = s.flags.swipeDay === today() ? s.flags.swipes : 3;
      if (swipes > 0) out.actions.push(opt('Eat a meal-plan meal (' + swipes + ' swipes left today)', function () {
        s.flags.swipeDay = today(); s.flags.swipes = swipes - 1;
        chg('needs.hunger', 500); chg('needs.thirst', 120); n.bowels = clamp(n.bowels + 60, 0, MAX); chg('needs.stress', -15);
        var dish = ['shepherd\'s pie', 'a veggie curry', 'pasta bake', 'a turkey sandwich and soup', 'fish and chips'][Math.floor(Math.random() * 5)];
        return { text: '<p>You swipe your student card and sit down with ' + dish + '. It isn\'t gourmet, but it\'s hot and free.</p>', minutes: 25 };
      }));
    }
    if ((hid === 'cafe' || hid === 'cafeteria') && money() >= 3 && n.fatigue >= 300) {
      out.actions.push(opt('Buy a coffee ($3)', function () {
        addMoney(-3); chg('needs.fatigue', -120); chg('needs.thirst', 80); n.bladder = clamp(n.bladder + 90, 0, MAX); n.bowels = clamp(n.bowels + 50, 0, MAX); chg('needs.stress', 10);
        return { text: '<p>The coffee is strong enough to stand a spoon in. Your eyes open a little wider.</p>', minutes: 10 };
      }));
    }
    if ((hid === 'dorm_hall' || hid === 'gym') && (s.flags.dirty || n.stress >= 200 || n.fatigue >= 400)) {
      out.actions.push(opt('Take a shower', function () {
        s.flags.dirty = false; chg('needs.stress', -60); chg('needs.fatigue', -30); train('beauty', 4);
        return { text: '<p>Hot water, a bar of soap, and ten minutes where nobody needs anything from you.</p>', minutes: 15 };
      }));
    }
    if (home === true || home === null) {
      if (n.fatigue >= 250) {
        out.actions.push(opt('Sleep', function () {
          var hrs = Math.ceil(n.fatigue / 120); hrs = clamp(hrs, 2, 9);
          s.flags.sleeping = true; s.flags.sleptFull = hrs >= 7;
          chg('needs.stress', -80);
          return { text: '<p>You crawl into bed and sleep for about ' + hrs + ' hours.</p>', minutes: hrs * 60 };
        }, { time: function () { return clamp(Math.ceil(n.fatigue / 120), 2, 9) * 60; } }));
      }
      out.actions.push(opt('Nap for an hour', function () {
        s.flags.sleeping = true;
        return { text: '<p>You lie down for a short nap.</p>', minutes: 60 };
      }));
      var wardrobeOn = !!(G.wardrobe || window.Wardrobe);
      if (!wardrobeOn && c.spareOutfits > 0 && (c.lowerWetness > 20 || c.upperWetness > 20 || c.upperIntegrity < 50 || c.lowerIntegrity < 50 || s.flags.dirty)) {
        out.actions.push(opt('Change into fresh clothes', function () {
          c.upperWetness = 0; c.lowerWetness = 0; c.upperIntegrity = 100; c.lowerIntegrity = 100; c.spareOutfits--; s.flags.dirty = false; c.lowerSoiled = false;
          chg('needs.stress', -20);
          return { text: '<p>You change into a clean outfit and toss the old one in the laundry pile.</p>', minutes: 10 };
        }));
      }
      if (!wardrobeOn && c.spareOutfits < 3) {
        out.actions.push(opt('Do laundry ($3)', function () {
          if (money() < 3) return { text: '<p>You don\'t have enough for the machines.</p>', minutes: 1 };
          addMoney(-3); c.spareOutfits = 3; trainSkill('housekeeping', 8);
          return { text: '<p>You haul your laundry down to the machines and wait it out, half-reading a textbook.</p>', minutes: 90 };
        }));
      }
      if (!wardrobeOn && (c.upperIntegrity < 80 || c.lowerIntegrity < 80)) {
        out.actions.push(opt('Mend your clothes', function () {
          var gain = 15 + S().skills.housekeeping / 40;
          c.upperIntegrity = clamp(c.upperIntegrity + gain, 0, 100); c.lowerIntegrity = clamp(c.lowerIntegrity + gain, 0, 100);
          trainSkill('housekeeping', 10);
          return { text: '<p>You stitch up the worst of the tears.</p>', minutes: 45 };
        }));
      }
    }
    if (hereHas('gym')) gymOptions(out);
    if (!hereHas('gym') && hereHas('outdoors')) {
      out.actions.push(opt('Go for a jog', function () {
        train('physique', 18); trainSkill('athletics', 10); chg('needs.fatigue', 90); chg('needs.thirst', -120); addStress(-40, 'hardWork'); attitude('hardWork', 1);
        return { text: '<p>You push yourself until your lungs burn. It feels good, mostly.</p>', minutes: 45 };
      }));
    }
    if (home === true || home === null || hereHas('quiet')) {
      out.actions.push(opt('Meditate', function () {
        train('willpower', 12); chg('needs.stress', -70);
        return { text: '<p>You sit quietly and let your thoughts settle.</p>', minutes: 30 };
      }));
    }
    if (hereHas('mirror') || home === true || home === null) {
      out.actions.push(opt('Take time on your appearance', function () {
        train('beauty', 12); chg('needs.stress', -15);
        return { text: '<p>You fix your hair and pick out an outfit that actually works.</p>', minutes: 30 };
      }));
    }
    if (hereHas('public')) {
      out.actions.push(opt('People-watch for a while', function () {
        attitude('crowds', 2);
        train('awareness', 12); chg('needs.stress', -10);
        return { text: '<p>You find a bench and watch the town go by, noticing who talks to whom.</p>', minutes: 30 };
      }));
    }
    if (hasCold()) {
      var il = S().illness;
      if (hereHas('food') || here().id === 'cafe' || here().id === 'cafeteria') out.actions.push(opt('Sip a hot honey-lemon tea ($2)', function () {
        if (money() < 2) return { text: '<p>You count your change. Not enough for tea.</p>', minutes: 1 };
        addMoney(-2); il.cold = Math.max(0, il.cold - 240); chg('needs.thirst', 200); chg('needs.stress', -40);
        return { text: '<p>The tea is too hot at first, then exactly right. The steam clears your head a little. <span class="flavor">(Thirst up, stress down, your cold eases a bit.)</span></p>', minutes: 20 };
      }, { time: 20 }));
      if (here().id === 'market') out.actions.push(opt('Buy cold medicine ($6)', function () {
        if (money() < 6) return { text: '<p>The cold medicine costs $6, and you don\'t have it.</p>', minutes: 2 };
        addMoney(-6); il.cold = Math.floor(il.cold / 2);
        return { text: '<p>You pick up a box of cold tablets and take one with water at the counter. Within the hour things feel a little less foggy. <span class="flavor">(Your cold will clear about twice as fast.)</span></p>', minutes: 10 };
      }));
    }
    groceryOptions(out, n, home);
    out.other.push(opt('Check yourself over', function () { return { text: selfDescription(), minutes: 1 }; }));
    return out;
  }

  // ---------- descriptions ----------
  function needWord(k, v) {
    var inv = (k === 'thirst' || k === 'hunger' || k === 'control');
    var lvl = inv ? (v > 750 ? 0 : v > 500 ? 1 : v > 250 ? 2 : 3) : (v < 250 ? 0 : v < 500 ? 1 : v < 750 ? 2 : 3);
    var words = {
      fatigue: ['Rested', 'A little tired', 'Tired', 'Exhausted'],
      stress:  ['Calm', 'A bit tense', 'Stressed', 'Overwhelmed'],
      control: ['Composed', 'Steady', 'Shaky', 'Barely holding on'],
      bladder: ['Fine', 'Could go', 'Need to go', 'Desperate'],
      bowels:  ['Fine', 'Could go', 'Need to go', 'Urgent'],
      thirst:  ['Hydrated', 'A little thirsty', 'Thirsty', 'Parched'],
      hunger:  ['Full', 'Peckish', 'Hungry', 'Starving']
    };
    return words[k][lvl];
  }

  function selfDescription() {
    var n = S().needs, parts = [];
    Object.keys(NEEDS_INFO).forEach(function (k) { parts.push('<b>' + NEEDS_INFO[k].label + ':</b> ' + needWord(k, n[k])); });
    var d = debuffs();
    return '<p>You take a moment to check in with yourself.</p><p>' + parts.join('<br>') + '</p>' +
      (hasPoison() ? '<p>Your stomach is still upset from food poisoning. Keep drinking water and rest; it should pass within a day.</p>' : '') +
      (hasCold() ? '<p>You have a head cold. It should clear in about ' + Math.max(1, Math.round(S().illness.cold / 1440)) + ' day(s), sooner with rest.</p>' : '') +
      (isSoiled() ? '<p>Your lower clothes are soiled, and the smell is noticeable. Rinse them out at a restroom sink or change before someone says something.</p>' : '') +
      hairLine() +
      (d.length ? '<p>Affecting you: ' + d.map(function (x) { return x.label; }).join(', ') + '.</p>' : '<p>Nothing is dragging you down right now.</p>');
  }

  function hairLine() { try { var h = window.Salon && Salon.hairNote ? Salon.hairNote() : ''; return h ? '<p>' + h + '</p>' : ''; } catch (e) { return ''; } }
  function wetWord(v) { return v < 5 ? 'Dry' : v < 30 ? 'Damp' : v < 65 ? 'Wet' : 'Soaked'; }
  function integWord(v) { return v > 85 ? 'Like new' : v > 60 ? 'Worn' : v > 35 ? 'Frayed' : v > 15 ? 'Torn' : 'Falling apart'; }
  function fameWord(v) { return v < 50 ? 'Unknown' : v < 200 ? 'Recognised by a few' : v < 450 ? 'Known around campus' : v < 750 ? 'Well known in town' : 'Famous in Hollowbrook'; }
  function crimeWord(v) { return v < 25 ? 'Clean record' : v < 150 ? 'A few suspicions' : v < 400 ? 'Known to the police' : v < 700 ? 'Wanted for questioning' : 'Notorious'; }

  // ---------- side panel & character menu ----------
  function panelHTML() {
    var n = S().needs, rows = ['<div class="stat-row"><b>Money</b> $' + money().toFixed(2) + '</div>'];
    Object.keys(NEEDS_INFO).forEach(function (k) {
      var inv = (k === 'thirst' || k === 'hunger' || k === 'control');
      rows.push('<div class="stat-row" title="' + NEEDS_INFO[k].flavor + '"><b>' + NEEDS_INFO[k].label + '</b> ' + rnd(n[k]) + '/1000 <i>' + needWord(k, n[k]) + '</i>' + bar(n[k], MAX, inv) + '</div>');
    });
    var d = debuffs();
    if (d.length) rows.push('<div class="stat-row debuffs">' + d.map(function (x) { return '<span class="debuff">' + x.label + '</span>'; }).join(' ') + '</div>');
    return rows.join('');
  }

  function tabCharacteristics() {
    var s = S(), h = ['<h3>Characteristics</h3><p class="flavor">Who you are becoming. Stats grow with use and slowly slip back when neglected.</p>'];
    var db = debuffs();
    h.push('<p class="flavor">' + (db.length ? 'Right now you are held back by: ' + db.map(function (x) { return x.label; }).join(', ') + '.' : 'Nothing is holding you back right now.') + '</p>');
    Object.keys(CORE).forEach(function (k) {
      var v = s.core[k].value, e = effective(k), f = CORE[k].flavor[clamp(Math.floor(tierIdx(e) / 2.2), 0, 4)];
      h.push('<div class="char-row"><b>' + CORE[k].label + '</b> <span class="tier">' + tier(e) + '</span>' + (e !== v ? ' <small>(base ' + tier(v) + ')</small>' : '') + bar(e, MAX, true) + '<p class="flavor">' + f + '</p></div>');
    });
    h.push('<h4>Skills</h4>');
    Object.keys(s.skills).forEach(function (k) {
      h.push('<div class="char-row"><b>' + (SKILLS[k] ? SKILLS[k].label : k) + '</b> <span class="tier">' + tier(s.skills[k]) + '</span>' + bar(s.skills[k], MAX, true) + (SKILLS[k] ? '<p class="flavor">' + SKILLS[k].flavor + '</p>' : '') + '</div>');
    });
    h.push('<h4>Traits</h4>');
    TRAITS.forEach(function (t) {
      var on = s.traits.indexOf(t.id) !== -1;
      h.push('<div class="trait ' + (on ? 'unlocked' : 'locked') + '"><b>' + (on ? '' : '🔒 ') + t.label + '</b>: ' + t.desc +
        (on ? '' : '<p class="flavor">How to unlock: ' + t.hint + ' ' + progressHint(t.id) + '</p>') + '</div>');
    });
    h.push('<h4>Attitudes</h4>');
    Object.keys(ATTITUDES).forEach(function (k) {
      var a = s.attitudes[k], A = ATTITUDES[k];
      var w = a <= -60 ? A.low : a >= 60 ? A.high : a < -15 ? 'Uneasy' : a > 15 ? 'Fairly comfortable' : 'Neutral';
      h.push('<div class="char-row"><b>' + A.label + '</b>: ' + w + '</div>');
    });
    var tk = Object.keys(s.transforms);
    if (tk.length) {
      h.push('<h4>Changes</h4>');
      tk.forEach(function (k) { h.push('<div class="trait"><b>' + TRANSFORMS[k].label + '</b> (stage ' + s.transforms[k] + '): ' + TRANSFORMS[k].stages[s.transforms[k]] + '</div>'); });
    }
    return h.join('');
  }

  function progressHint(id) {
    var s = S(), map = { charming: 'beauty', athletic: 'physique', steady: 'willpower', sharpEyed: 'awareness' };
    if (map[id]) return '(Now ' + tier(s.core[map[id]].value) + '.)';
    if (id === 'ironBladder') return '(Now ' + rnd(s.needs.control) + '.)';
    if (id === 'lightFingers') return '(Now ' + tier(s.skills.skulduggery) + '.)';
    var r = rec();
    if (id === 'nightOwl') return '(' + r.lateNights + '/5 nights.)';
    if (id === 'earlyBird') return '(' + r.earlyRises + '/5 mornings.)';
    if (id === 'resilient') return '(' + r.coldsBeaten + '/1 colds.)';
    if (id === 'gymRat') return '(' + r.workouts + '/20 workouts.)';
    if (id === 'castIron') return '(' + r.poisoningsBeaten + '/1.)';
    if (id === 'homeCook') return '(Now ' + tier(S().skills.cooking || 0) + '.)';
    if (id === 'socialButterfly') return '(Now ' + rnd(S().status.socialiteFame) + '/200.)';
    if (id === 'goodSamaritan') return '(Now ' + rnd(S().status.kindnessFame) + '/200.)';
    if (id === 'streetwise') return '(' + r.nightsOut + '/15 evenings.)';
    if (id === 'greenThumb') return '(Now ' + tier(s.skills.tending) + '.)';
    return '';
  }

  function tabStatus() {
    var s = S(), st = s.status, ss = null;
    try { ss = G.school && G.school.schoolStatus ? G.school.schoolStatus() : null; } catch (e) {}
    var delinq = ss ? ss.delinquency : 0;
    var delWord = delinq < 50 ? 'Model student' : delinq < 200 ? 'A few marks' : delinq < 500 ? 'On the dean\'s radar' : delinq < 800 ? 'Academic probation' : 'Facing expulsion';
    var grades = ss && ss.grades && ss.grades.length ? '<ul class="grades">' + ss.grades.map(function (g) { return '<li>' + g.subject + ': ' + g.letter + ' (' + g.pct + '%)</li>'; }).join('') + '</ul>' : '';
    return '<h3>Status</h3><p class="flavor">How the town and the college see you.</p>' +
      '<div class="char-row"><b>School status</b>: ' + (ss ? ss.standing + ', average ' + ss.gpaLetter + ', attendance ' + ss.attendance : 'Enrolled at Hollowbrook College') + grades + '</div>' +
      '<div class="char-row"><b>School delinquency</b>: ' + delWord + bar(delinq, MAX) + (ss ? '<p class="flavor">' + ss.flavor.delinquency + '</p>' : '') + '</div>' +
      '<div class="char-row"><b>Crime</b>: ' + crimeWord(st.crime) + bar(st.crime, MAX) + (ss ? '<p class="flavor">' + ss.flavor.crime + '</p>' : '') + '</div>' +
      '<div class="char-row"><b>Kindness fame</b>: ' + fameWord(st.kindnessFame) + '<p class="flavor">Known for helping people.</p></div>' +
      '<div class="char-row"><b>Business fame</b>: ' + fameWord(st.businessFame) + '<p class="flavor">Known as someone who gets work done.</p></div>' +
      '<div class="char-row"><b>Socialite fame</b>: ' + fameWord(st.socialiteFame) + '<p class="flavor">Known at parties and around town.</p></div>';
  }

  function tabClothing() {
    var c = S().clothing;
    return '<h3>Clothing</h3><p class="flavor">What you\'re wearing and how it\'s holding up. Wet or damaged clothes make people look at you differently.</p>' +
      '<div class="char-row"><b>Upper wetness</b>: ' + wetWord(c.upperWetness) + bar(c.upperWetness, 100) + '</div>' +
      '<div class="char-row"><b>Upper integrity</b>: ' + integWord(c.upperIntegrity) + bar(c.upperIntegrity, 100, true) + '</div>' +
      '<div class="char-row"><b>Lower wetness</b>: ' + wetWord(c.lowerWetness) + bar(c.lowerWetness, 100) + '</div>' +
      '<div class="char-row"><b>Lower integrity</b>: ' + integWord(c.lowerIntegrity) + bar(c.lowerIntegrity, 100, true) + '</div>' +
      (isSoiled() ? '<div class="char-row"><b>Lower clothing</b>: Soiled<p class="flavor">People nearby can smell it. Rinse it out at a restroom sink, or change.</p></div>' : '') +
      '<div class="char-row"><b>Clean outfits at home</b>: ' + c.spareOutfits + '</div>';
  }

  // ---------- public API for other modules ----------
  var api = {
    TIERS: TIERS, tier: tier, tierIdx: tierIdx,
    effective: effective,             // effective core stat after debuffs/traits/transforms
    check: function (stat, difficulty) { // skill/stat check: returns true/false
      var v = S().core[stat] ? effective(stat) : (S().skills[stat] || 0);
      if (hasTrait('sharpEyed') && stat === 'awareness') v += 50;
      return Math.random() * MAX < v + (500 - (difficulty || 500));
    },
    train: train, trainSkill: trainSkill, attitude: attitude, addStress: addStress,
    transform: transform, hasTrait: hasTrait, debuffs: debuffs,
    fame: function (kind, d) { chg('status.' + kind + 'Fame', d); },
    crime: function (d) { chg('status.crime', d); },
    soiled: isSoiled,
    // undressed in public: covering() is true after "Cover yourself"; multiply notice chances by noticeMult() (0.5 while covering)
    VOLUME: VOLUME,
    exposed: function () { return exposedNow() && inPublic(); }, covering: covering, noticeMult: function () { return covering() ? 0.5 : 1; },
    money: money, addMoney: addMoney,
    panelHTML: panelHTML,
    tabs: { Characteristics: tabCharacteristics, Status: tabStatus, Clothing: tabClothing },
    selfDescription: selfDescription
  };

  function boot() {
    if (!window.G || !G.register) return setTimeout(boot, 20);
    G.stats = api;
    exposeGroceries();
    G.register({
      id: 'stats',
      init: function (state) {
        var fresh = freshState();
        if (!state.stats) state.stats = fresh;
        else Object.keys(fresh).forEach(function (k) { if (state.stats[k] === undefined) state.stats[k] = fresh[k]; });
        if (G.on && !G._statsHooked) {
          G._statsHooked = true;
          G.on('newDay', onNewDay);
          G.on('creationDone', function () {
            var w = (G.state.creation && G.state.creation.world) || {};
            if (typeof w.startMoney === 'number') G.state.money = w.startMoney;
          });
        }
        if (G.addTab) {
          G.addTab({ id: 'characteristics', label: 'Characteristics', order: 10, render: tabCharacteristics });
          G.addTab({ id: 'status', label: 'Status', order: 20, render: tabStatus });
          G.addTab({ id: 'clothing', label: 'Clothing', order: 30, render: tabClothing });
        }
        if (G.limits) ['skills', 'status'].forEach(function (grp) {
          Object.keys(state.stats[grp]).forEach(function (k) { G.limits['stats.' + grp + '.' + k] = [0, MAX]; });
        });
        if (G.labels) {
          Object.keys(SKILLS).forEach(function (k) { G.labels['stats.skills.' + k] = SKILLS[k].label; });
          G.labels['stats.status.kindnessFame'] = 'Kindness fame'; G.labels['stats.status.businessFame'] = 'Business fame';
          G.labels['stats.status.socialiteFame'] = 'Socialite fame'; G.labels['stats.status.crime'] = 'Crime';
        }
        updateTraits();
      },
      onTick: function (minutes) { onTick(minutes); },
      getOptions: function () { return getOptions(); },
      menuTabs: api.tabs
    });
  }
  boot();
})();
