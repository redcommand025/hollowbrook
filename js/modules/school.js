/* school.js — Hollowbrook College, Skulduggery, Tending/Farm.  Owner: Ted
 * Owns G.state.school. Reads G.time and G.state.world.location (Ron).
 * Skills skulduggery/tending live at G.state.stats.skills.<name> (0-1000, Jimmy's tiers);
 * if stats.js hasn't created them yet we keep a local fallback in G.state.school.skillsFallback.
 */
(function () {
  'use strict';

  // ---- location ids this module expects world.js to define ----
  var LOC = {
    classroom: 'lecture_hall', library: 'library', quad: 'quad',
    office: 'deans_office', farm: 'campus_farm', market: 'market', street: 'main_street', home: 'dorm_room'
  };

  var SUBJECTS = {
    lit:  { name: 'Literature',     stat: 'awareness', teacher: 'Professor Hart', npc: 'hart' },
    math: { name: 'Mathematics',    stat: 'willpower', teacher: 'Professor Ellison' },
    sci:  { name: 'Biology',        stat: 'awareness', teacher: 'Dr. Varga' },
    art:  { name: 'Studio Art',     stat: 'beauty',    teacher: 'Ms. Moreau' },
    pe:   { name: 'Physical Ed.',   stat: 'physique',  teacher: 'Coach Okafor', npc: 'okafor' },
    agri: { name: 'Agriculture',    stat: 'physique',  teacher: 'Mr. Pell' }
  };
  // weekday: 0=Sun..6=Sat. Two lecture blocks a day, 09:00 and 13:00, 2h each.
  var TIMETABLE = {
    1: ['lit', 'math'], 2: ['sci', 'pe'], 3: ['math', 'art'],
    4: ['lit', 'agri'], 5: ['sci', 'math']
  };
  var BLOCKS = [9, 13];
  var TIERS = ['F', 'F+', 'D', 'D+', 'C', 'C+', 'B', 'B+', 'A', 'A+', 'S'];

  // ---------- helpers ----------
  function S() { return G.state.school; }
  // world.js gives weekday as a name and weekdayIndex 0=Mon; we use 0=Sun internally.
  function time() {
    var t = G.time || { day: 1, hour: 8, minute: 0, weekdayIndex: 0 };
    var wd = typeof t.weekdayIndex === 'number' ? (t.weekdayIndex + 1) % 7 : (typeof t.weekday === 'number' ? t.weekday : 1);
    var day = t.day || (G.state.world && G.state.world.day) || 1;
    return { day: day, hour: t.hour, minute: t.minute || 0, weekday: wd };
  }
  function loc() { return (G.state.world && G.state.world.location) || ''; }
  function at(id) { return loc() === LOC[id]; }
  function rnd(a, b) { return a + Math.floor(Math.random() * (b - a + 1)); }
  function chance(p) { return Math.random() < p; }
  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
  function money() { return G.stats && G.stats.money ? G.stats.money() : ((G.state.stats && G.state.stats.money) || 0); }

  function tierOf(v) { return TIERS[clamp(Math.floor(v / 91), 0, 10)]; } // 0-1000 -> F..S
  function gradeLetter(p) {
    if (p >= 97) return 'A+'; if (p >= 90) return 'A'; if (p >= 85) return 'B+'; if (p >= 78) return 'B';
    if (p >= 72) return 'C+'; if (p >= 65) return 'C'; if (p >= 58) return 'D+'; if (p >= 50) return 'D';
    if (p >= 40) return 'F+'; return 'F';
  }
  function statVal(name) {
    if (G.stats && G.stats.effective) { var e = G.stats.effective(name); if (typeof e === 'number') return e; }
    return 300;
  }
  function skill(name) {
    var sk = G.state.stats && G.state.stats.skills;
    if (sk && typeof sk[name] === 'number') return sk[name];
    return S().skillsFallback[name] || 0;
  }
  function gainSkill(name, d) {
    var sk = G.state.stats && G.state.stats.skills;
    if (G.stats && G.stats.trainSkill && d > 0) { G.stats.trainSkill(name, d); return; }
    if (sk && typeof sk[name] === 'number') { G.change('stats.skills.' + name, d); return; }
    var f = S().skillsFallback; var before = f[name] || 0;
    f[name] = clamp(before + d, 0, 1000);
    G.notify(cap(name) + ' ' + (d >= 0 ? '+' : '') + d + (tierOf(before) !== tierOf(f[name]) ? ' (now ' + tierOf(f[name]) + ')' : ''), d >= 0 ? 'up' : 'down');
  }
  function need(path, d) { try { G.change(path, d); } catch (e) { /* stats.js not loaded yet */ } }
  function cash(d) { if (G.stats && G.stats.addMoney) G.stats.addMoney(d); else try { G.change('stats.money', d); } catch (e) {} }
  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
  function grade(subj, d) {
    var g = S().grades; var before = g[subj];
    if (d > 0) { var sc = d * clamp((104 - before) / 45, 0.05, 1); d = Math.floor(sc) + (Math.random() < sc % 1 ? 1 : 0); if (!d) return; }
    g[subj] = clamp(before + d, 0, 100);
    var b = gradeLetter(before), a = gradeLetter(g[subj]);
    G.notify(SUBJECTS[subj].name + ' grade ' + (d >= 0 ? '+' : '') + d + (a !== b ? ' (now ' + a + ')' : ''), d >= 0 ? 'up' : 'down');
  }
  function delinq(d, why) {
    var s = S(); s.delinquency = clamp(s.delinquency + d, 0, 1000);
    G.notify('Delinquency ' + (d >= 0 ? '+' : '') + d + (why ? ' — ' + why : ''), d >= 0 ? 'down' : 'up');
  }
  function crime(d) {
    // crime lives in Jimmy's stats.status.crime; school.crime mirrors it for our own checks
    var s = S(); s.crime = clamp(s.crime + d, 0, 1000);
    if (G.stats && G.stats.crime) G.stats.crime(d);
    else G.notify('Crime ' + (d >= 0 ? '+' : '') + d, d >= 0 ? 'down' : 'up');
  }
  function currentClass() {
    var t = time(), list = TIMETABLE[t.weekday]; if (!list) return null;
    if (G.time && G.time.season === 'Summer') return null;
    if (G.state.school && (G.state.school.expelled || G.state.school.graduated)) return null;
    for (var i = 0; i < BLOCKS.length; i++) {
      var start = BLOCKS[i];
      if (t.hour >= start - 0 && t.hour < start + 2) return { subj: list[i], block: i, start: start, late: t.hour > start || t.minute > 10 };
    }
    return null;
  }
  function classKey(c) { return time().day + ':' + c.block; }

  // ---------- public summary for Jimmy's Status tab ----------
  function schoolStatus() {
    var s = S(), avg = 0, n = 0;
    for (var k in s.grades) { avg += s.grades[k]; n++; }
    avg = n ? avg / n : 0;
    var standing = s.graduated ? 'Graduate' : s.expelled ? 'Expelled' : s.suspendedUntil > time().day ? 'Suspended' :
      s.probation ? 'Academic probation' : avg >= 85 ? "Dean's list" : avg >= 65 ? 'Good standing' : 'Struggling';
    return {
      standing: standing, gpaLetter: gradeLetter(avg), average: Math.round(avg),
      delinquency: s.delinquency, delinquencyTier: tierOf(s.delinquency),
      crime: s.crime, crimeTier: tierOf(s.crime),
      attendance: s.attended + '/' + (s.attended + s.skipped),
      grades: Object.keys(s.grades).map(function (k) { return { subject: SUBJECTS[k].name, pct: s.grades[k], letter: gradeLetter(s.grades[k]) }; }),
      skulduggery: tierOf(skill('skulduggery')), tending: tierOf(skill('tending')),
      year: YEAR_NAMES[Math.min(3, s.year - 1)], term: termLabel(), credits: s.credits + '/' + s.creditsNeeded,
      scholarship: s.scholarship, graduated: s.graduated, transcript: s.transcript.slice(),
      skulduggeryUnlocks: SKUL_TIERS.filter(function (x) { return skill('skulduggery') >= x[0]; }).map(function (x) { return x[1]; }),
      jobs: Object.keys(s.jobs).filter(function (k) { return s.jobs[k].hired; }).map(function (k) { return RANKS[k][s.jobs[k].rank || 0] + ' at ' + JOBS[k].name; }),
      clubs: Object.keys(s.clubs).map(function (k) { return CLUBS[k].name + ' (' + clubRank(s.clubs[k].sessions) + ')'; }),
      flavor: {
        delinquency: s.delinquency < 100 ? 'The faculty barely know your name, in the good way.' :
          s.delinquency < 400 ? 'A few professors give you a long look when you walk in.' :
          s.delinquency < 700 ? 'The dean\'s secretary recognises your footsteps.' : 'Your file at the dean\'s office needs its own drawer.',
        crime: s.crime < 100 ? 'Nobody in town has a reason to watch you.' :
          s.crime < 400 ? 'Shopkeepers keep half an eye on you.' :
          s.crime < 700 ? 'Officer Dunn has started saying your name a little too warmly.' : 'There are whispers about you at the station.'
      }
    };
  }

  // ---------- class scenes ----------
  var CLASS_FLAVOR = {
    lit: ['Professor Hart reads a passage aloud, pausing to let a line hang in the air.', 'The seminar argues about whether the narrator can be trusted.'],
    math: ['Professor Ellison fills the board with proofs, chalk squeaking.', 'A problem set circulates; the room goes quiet except for pencils.'],
    sci: ['Dr. Varga passes round a tray of pressed leaves for identification.', 'The lab smells of ethanol and wet soil.'],
    art: ['Ms. Moreau sets a still life of pears and a chipped jug.', 'Charcoal dust drifts in the light from the tall windows.'],
    pe: ['Coach Okafor blows the whistle for laps around the track.', 'Today is circuit training. Your legs have opinions about it.'],
    agri: ['Mr. Pell walks the class out to the college plots to check soil moisture.', 'A lecture on crop rotation, with a muddy demonstration.']
  };

  function attend(state, focus) {
    var c = currentClass(); if (!c) return { text: 'There\'s no class right now.', minutes: 1 };
    var s = S(), key = classKey(c);
    if (s.attendedKeys[key]) return { text: 'You\'ve already sat through this one.', minutes: 1 };
    s.attendedKeys[key] = true; s.attended++;
    var subj = SUBJECTS[c.subj];
    if (subj.npc && !c.late) rep(subj.npc, focus ? 2 : 1); else if (subj.npc && c.late) rep(subj.npc, -2);
    var base = focus ? rnd(2, 4) : rnd(1, 2);
    base += Math.floor(statVal(subj.stat) / 400);
    if (c.late) { base = Math.max(0, base - 1); delinq(10, 'late to class'); }
    grade(c.subj, base);
    need('stats.needs.fatigue', focus ? 60 : 35);
    need('stats.needs.stress', focus ? 25 : 10);
    if (c.subj === 'agri') gainSkill('tending', rnd(8, 15));
    if (c.subj === 'pe') need('stats.characteristics.physique', 4);
    var mins = Math.max(10, (c.start + 2) * 60 - (time().hour * 60 + time().minute));
    var txt = '<p><b>' + subj.name + '</b> with ' + teacherName(c.subj) + '.</p><p>' + pick(CLASS_FLAVOR[c.subj]) + '</p>' +
      (c.late ? '<p>You slip in late. ' + teacherName(c.subj) + ' notices, and makes a note.</p>' : '') +
      '<p>' + teacherReaction(c.subj) + '</p>' +
      (focus ? '<p>You keep your head down and take careful notes. It\'s draining, but it sticks.</p>' : '<p>You follow along, mostly.</p>');
    if (chance(0.15)) txt += pick([
      '<p>The student beside you passes a doodle of the professor as a heron. You bite back a laugh.</p>',
      '<p>The radiator clanks through the whole lecture like it\'s trying to join in.</p>',
      '<p>Someone\'s phone goes off. It\'s a ringtone of a duck. Nobody owns up.</p>'
    ]);
    txt += assignHomework(c.subj);
    return { text: txt, minutes: mins };
  }

  function sleepInClass() {
    var c = currentClass(), key = classKey(c), s = S();
    s.attendedKeys[key] = true; s.attended++;
    need('stats.needs.fatigue', -120);
    if (chance(0.5)) {
      delinq(25, 'caught dozing');
      grade(c.subj, -1);
      return { text: '<p>Your eyes close for a second. When they open, ' + teacherName(c.subj) + ' is standing over your desk. "Good of you to join us."</p>', minutes: 60 };
    }
    return { text: '<p>You sink into your seat and drift off. Nobody notices. You wake as chairs scrape at the end of the lecture, oddly refreshed.</p>', minutes: 110 };
  }

  function study(where) {
    var subj = pick(Object.keys(SUBJECTS)), s = S();
    if (s.studiedToday >= 3) return { text: '<p>The words have started swimming. You\'ve done all the studying your brain will take today.</p>', minutes: 10 };
    s.studiedToday++; s.studiedTerm = (s.studiedTerm || 0) + 1;
    grade(subj, rnd(1, 3));
    need('stats.needs.fatigue', 50); need('stats.needs.stress', 20);
    var p = where === 'library'
      ? '<p>You claim a carrel on the library\'s second floor, where the radiators tick and someone is always sharpening a pencil. You work through your ' + SUBJECTS[subj].name + ' notes.</p>'
      : '<p>You spread your ' + SUBJECTS[subj].name + ' notes across the bed and work through them.</p>';
    return { text: p, minutes: 90 };
  }

  // ---------- exams (every 7th day if weekday, else next weekday) ----------
  function isExamDay() { var t = time(), x = S(); if (x.expelled || x.graduated || (G.time && G.time.season === 'Summer')) return false; return x.examDue && TIMETABLE[t.weekday] && t.hour >= 9 && t.hour < 12; }
  var sitExam = function () {
    var s = S(), out = '<p>The exam hall is silent except for the clock. You turn over the paper.</p>', total = 0;
    Object.keys(s.grades).forEach(function (k) {
      var roll = s.grades[k] + rnd(-12, 12) + Math.floor(statVal('willpower') / 200) - Math.floor(((G.state.stats && G.state.stats.needs && G.state.stats.needs.stress) || 0) / 250);
      roll = clamp(roll, 0, 100); total += roll;
      var d = roll >= s.grades[k] ? 2 : -2; grade(k, d);
    });
    var avg = total / Object.keys(s.grades).length;
    s.examDue = false; s.lastExamAvg = Math.round(avg); s.examsTaken++;
    need('stats.needs.stress', 80); need('stats.needs.fatigue', 100);
    if (avg < 50) { s.probation = true; out += '<p>Results go up by the evening. Your name is near the bottom, and there\'s a letter in your pigeonhole: <i>academic probation</i>.</p>'; }
    else if (avg >= 85) { s.probation = false; cash(50); out += '<p>Results go up by the evening. You\'re near the top, and the bursary awards you a small merit prize.</p>'; }
    else { if (avg >= 60) s.probation = false; out += '<p>Results go up by the evening. Respectable, nothing to write home about.</p>'; }
    G.state.journal && G.emit && G.emit('journal', { id: 'exam' + s.examsTaken, text: 'Sat exam #' + s.examsTaken + ': average ' + s.lastExamAvg + '% (' + gradeLetter(avg) + ').' });
    return { text: out, minutes: 180 };
  };
  var skipExam = function () {
    var s = S(); s.examDue = false;
    Object.keys(s.grades).forEach(function (k) { s.grades[k] = clamp(s.grades[k] - 6, 0, 100); });
    G.notify('All grades -6 (missed exam)', 'down'); delinq(60, 'missed exam'); s.probation = true;
    return { text: '<p>You stay away from the exam hall. By evening the note in your pigeonhole is short and unhappy.</p>', minutes: 1 };
  };

  // ---------- dean's office ----------
  function deanVisit() {
    var s = S();
    if (s.delinquency < 300) return { text: '<p>The dean\'s secretary looks up, smiles, and asks if you\'re lost. You aren\'t in trouble. Yet.</p>', minutes: 10 };
    var d = -rnd(40, 80); delinq(d, 'apologised to the dean');
    need('stats.needs.stress', 60);
    return { text: '<p>Dean Whitlock lets you sit in silence for a long moment, then talks about "potential" for twenty minutes. You leave chastened but on slightly better terms.</p>', minutes: 40 };
  }

  // ---------- skulduggery ----------
  var TARGETS = {
    quad: { name: 'an unattended bag on the quad', loot: [5, 25], risk: 0.25, witnesses: 'students' },
    library: { name: 'the library\'s lost-property box', loot: [2, 15], risk: 0.15, witnesses: 'a librarian' },
    main_street: { name: 'a distracted shopper on the busy street', loot: [10, 45], risk: 0.35, witnesses: 'the stallholder' }
  };
  function pickpocket() {
    var t = TARGETS[loc()]; if (!t) return { text: 'Nothing worth taking here.', minutes: 1 };
    var sk = skill('skulduggery'), aw = statVal('awareness');
    var weather = (G.state.world && G.state.world.weather) || '';
    var crowd = /rain|storm|snow/.test(weather) ? -0.05 : 0; // fewer people around in bad weather
    var p = clamp(0.35 + sk / 1600 + aw / 4000 - t.risk + crowd, 0.08, 0.95);
    var s = S(); s.thefts++;
    need('stats.needs.stress', 30);
    if (chance(p)) {
      var take = rnd(t.loot[0], t.loot[1]) + Math.floor(sk / 100);
      cash(take); gainSkill('skulduggery', rnd(10, 20)); crime(rnd(5, 15));
      return { text: '<p>You drift past ' + t.name + ', unhurried. A second later you\'re walking away with $' + take + ' and your heart thudding.</p>', minutes: 15 };
    }
    gainSkill('skulduggery', rnd(3, 8));
    if (chance(0.5 + t.risk)) {
      crime(rnd(30, 60)); need('stats.needs.stress', 80);
      if (loc() === 'quad' || loc() === 'library') delinq(40, 'caught stealing on campus');
      var fine = Math.min(money(), rnd(15, 40)); if (fine) cash(-fine);
      return { text: '<p>Your fingers fumble. ' + cap(t.witnesses) + ' sees it. There\'s shouting, a security guard, and a very awkward conversation that ends with a $' + fine + ' fine and your name written down.</p>', minutes: 45 };
    }
    return { text: '<p>You lose your nerve at the last moment and keep walking. Nobody noticed. Probably.</p>', minutes: 10 };
  }
  function lieLow() {
    crime(-rnd(10, 25)); need('stats.needs.stress', -30);
    return { text: '<p>You keep your hood up, your hands in your pockets, and your head down for a while. The feeling of being watched fades.</p>', minutes: 60 };
  }

  // ---------- tending / farm ----------
  var CROPS = {
    radish: { name: 'Radishes', days: 3, seed: 4, sell: 12 },
    lettuce: { name: 'Lettuce', days: 4, seed: 5, sell: 16 },
    carrot: { name: 'Carrots', days: 5, seed: 6, sell: 22 },
    pumpkin: { name: 'Pumpkins', days: 9, seed: 12, sell: 55 }
  };
  function plot(i) { return S().farm.plots[i]; }
  function plotDesc(p) {
    if (!p.crop) return 'bare soil';
    var c = CROPS[p.crop], ready = p.growth >= c.days;
    return c.name + (ready ? ' (ready to harvest)' : ' (' + p.growth + '/' + c.days + ' days' + (p.wateredToday ? ', watered' : ', dry') + (p.weeds ? ', weedy' : '') + ')');
  }
  function plant(i, crop) {
    var c = CROPS[crop];
    if (money() < c.seed) return { text: '<p>You can\'t afford the seeds ($' + c.seed + ').</p>', minutes: 1 };
    cash(-c.seed);
    S().farm.plots[i] = { crop: crop, growth: 0, wateredToday: false, weeds: false, health: 100 };
    gainSkill('tending', rnd(3, 6)); need('stats.needs.fatigue', 25);
    return { text: '<p>You kneel in the dirt and press ' + crop + ' seeds into neat rows in plot ' + (i + 1) + '.</p>', minutes: 30 };
  }
  function waterAll() {
    var any = false;
    S().farm.plots.forEach(function (p) { if (p.crop && !p.wateredToday) { p.wateredToday = true; any = true; } });
    if (!any) return { text: '<p>Nothing needs water.</p>', minutes: 1 };
    gainSkill('tending', rnd(4, 8)); need('stats.needs.fatigue', 30); need('stats.needs.thirst', -30);
    return { text: '<p>You haul the watering can back and forth from the pump until the soil is dark and the leaves glisten.</p>', minutes: 30 };
  }
  function weed() {
    var n = 0; S().farm.plots.forEach(function (p) { if (p.weeds) { p.weeds = false; n++; } });
    gainSkill('tending', rnd(5, 9)); need('stats.needs.fatigue', 45); need('stats.clothing.lowerIntegrity', -2);
    return { text: '<p>You pull weeds until your knees are muddy and your back complains. ' + n + ' plot' + (n === 1 ? '' : 's') + ' cleared.</p>', minutes: 45 };
  }
  function harvest() {
    var s = S(), total = 0, names = [];
    s.farm.plots.forEach(function (p, i) {
      if (p.crop && p.growth >= CROPS[p.crop].days) {
        var c = CROPS[p.crop];
        var q = 1 + skill('tending') / 1000 + (p.health - 100) / 200;
        var n = Math.max(1, Math.round(rnd(2, 4) * q));
        s.farm.produce[p.crop] = (s.farm.produce[p.crop] || 0) + n; names.push(n + ' ' + c.name.toLowerCase());
        s.farm.plots[i] = { crop: null };
      }
    });
    if (!names.length) return { text: '<p>Nothing\'s ready yet.</p>', minutes: 1 };
    gainSkill('tending', rnd(8, 14)); need('stats.needs.fatigue', 40);
    return { text: '<p>You harvest ' + names.join(', ') + '. The basket is heavy in a satisfying way.</p>', minutes: 40 };
  }
  function sellProduce() {
    var s = S(), total = 0;
    for (var k in s.farm.produce) { total += s.farm.produce[k] * CROPS[k].sell; }
    if (!total) return { text: '<p>You have nothing to sell.</p>', minutes: 1 };
    var bonus = Math.round(total * (skill('tending') / 4000));
    s.farm.produce = {}; cash(total + bonus);
    return { text: '<p>The grocer at Hollowbrook Grocer weighs your produce, nods approvingly, and counts out $' + (total + bonus) + '.</p>', minutes: 20 };
  }
  var ANIMALS = ['Biscuit the goat', 'the three hens', 'Old Marigold the cow'];
  function soothe() {
    var a = pick(ANIMALS), sk = skill('tending'), s = S();
    var ok = chance(clamp(0.45 + sk / 1500, 0.2, 0.97));
    need('stats.needs.stress', ok ? -60 : 10);
    gainSkill('tending', ok ? rnd(6, 12) : rnd(2, 4));
    if (ok) { s.farm.animalMood = clamp(s.farm.animalMood + 10, 0, 100); return { text: '<p>You spend a while with ' + a + ', talking low and scratching behind ears. Everyone calms down, you included.</p>', minutes: 30 }; }
    s.farm.animalMood = clamp(s.farm.animalMood - 5, 0, 100);
    return { text: '<p>' + cap(a) + ' is having none of it today and makes that very clear. You retreat with as much dignity as you can.</p>', minutes: 20 };
  }
  function collectEggs() {
    var s = S(); if (s.farm.eggsToday) return { text: '<p>You\'ve already checked the coop today.</p>', minutes: 1 };
    s.farm.eggsToday = true;
    var n = rnd(0, 3) + (s.farm.animalMood > 60 ? 1 : 0);
    s.farm.produceEggs = (s.farm.produceEggs || 0) + n;
    if (n) { cash(n * 2); gainSkill('tending', 3); }
    return { text: n ? '<p>You find ' + n + ' warm eggs in the straw. Mr. Pell buys them off you for the dining hall, $' + (n * 2) + '.</p>' : '<p>The hens look at you. You look at the empty nesting boxes. Nobody wins.</p>', minutes: 15 };
  }

  // =====================================================================
  // PHASE 2: teachers who react, clubs, part-time jobs
  // =====================================================================
  function npcName(id, fallback) { return (window.NPCS && NPCS.byId && NPCS.byId[id]) ? NPCS.byId[id].name : fallback; }
  function npcPro(id) { return (window.NPCS && NPCS.pronouns) ? NPCS.pronouns(id) : { sub: 'they', obj: 'them', pos: 'their', Sub: 'They', be: 'are' }; }
  function npcStage(id) { try { return NPCS.stage(G.state, id).key; } catch (e) { return 'neutral'; } }
  function rep(id, d) {
    if (!id || !d) return;
    if (window.NPCS && NPCS.changeRep) return NPCS.changeRep(G.state, id, d);
    var r = G.state.npcs && G.state.npcs.rel && G.state.npcs.rel[id]; if (!r) return;
    r.rep = clamp(r.rep + d, -100, 100);
    G.notify(npcName(id, id) + ': Reputation ' + (d > 0 ? '+' : '') + d, d > 0 ? 'up' : 'down');
  }
  function train(stat, n) { if (G.stats && G.stats.train) G.stats.train(stat, n); }
  function fame(kind, n) { if (G.stats && G.stats.fame) G.stats.fame(kind, n); }
  function teacherName(subj) { var sb = SUBJECTS[subj]; return sb.npc ? npcName(sb.npc, sb.teacher) : sb.teacher; }

  // --- how a teacher reacts to your grade, used in class and after class ---
  function teacherReaction(subj) {
    var g = S().grades[subj], t = teacherName(subj), p = SUBJECTS[subj].npc ? npcPro(SUBJECTS[subj].npc) : { Sub: 'They', pos: 'their' };
    if (g >= 90) return pick([t + ' hands back your last paper with a small nod and "Excellent" written in the margin.', t + ' uses your answer as the example for the class. You try not to look smug.']);
    if (g >= 75) return pick([t + ' gives you a brief, approving glance when you answer.', t + ' writes "Good. Push further." across the top of your work.']);
    if (g >= 60) return pick([t + ' moves past your desk without comment.', p.Sub + ' taps your paper. "Fine. But I know you can do more."']);
    if (g >= 45) return pick([t + ' pauses by your desk. "See me if you\'re struggling. I mean it."', 'Your returned work has more red ink than black. ' + t + ' doesn\'t meet your eye.']);
    return pick([t + ' asks you to stay behind after class. The word "probation" comes up.', t + ' sighs, very quietly, when you hand in your work.']);
  }
  function afterClass(subj) {
    var sb = SUBJECTS[subj], t = teacherName(subj), g = S().grades[subj], s = S(), wk = Math.floor((time().day - 1) / 7);
    var st = sb.npc ? npcStage(sb.npc) : 'neutral';
    var warm = st === 'friend' || st === 'close', cold = st === 'cold' || st === 'hostile';
    var out = '<p>You hang back as the room empties and catch ' + t + ' packing up.</p>';
    if (cold) { out += '<p>"I have five minutes," ' + t + ' says, not looking up. "Make it count."</p>'; }
    else if (warm) { out += '<p>' + t + ' smiles and drops into a chair. "Go on, what\'s on your mind?"</p>'; }
    if (g < 60) {
      out += '<p>' + t + ' walks you through where you\'ve been losing marks. It\'s humbling, and actually useful.</p>';
      grade(subj, 2); rep(sb.npc, 2);
    } else if (g >= 85) {
      out += '<p>"Have you thought about taking this further? There\'s a reading group, and I could write you a reference."</p>';
      rep(sb.npc, 3); fame('kindness', 2);
    } else {
      out += '<p>You talk through the last assignment. ' + t + ' suggests a couple of things to read.</p>';
      grade(subj, 1); rep(sb.npc, 1);
    }
    if ((s.extraCredit[subj] || -1) !== wk && g < 90 && !cold) {
      s.extraCredit[subj] = wk;
      out += '<p>Before you go, ' + t + ' slides an extra-credit worksheet across the desk. "Due Friday. Optional, technically."</p>';
      s.pendingExtra = s.pendingExtra || {}; s.pendingExtra[subj] = true;
    }
    return { text: out, minutes: 15 };
  }
  function doExtraCredit(subj) {
    var s = S(); delete s.pendingExtra[subj];
    grade(subj, rnd(3, 5)); need('stats.needs.fatigue', 60); need('stats.needs.stress', 20);
    return { text: '<p>You grind through the ' + SUBJECTS[subj].name + ' extra-credit sheet. The last question is mean, but you get there.</p>', minutes: 75 };
  }

  // --- clubs: weekdayIndex style days are converted, ours use 0=Sun ---
  var CLUBS = {
    drama:   { name: 'Hollowbrook Players', desc: 'Amateur dramatics in the lecture building\'s black-box studio.', loc: 'lecture_hall', day: 4, from: 18, to: 20, stat: 'beauty', fame: 'socialite', npc: null,
               flavor: ['You run lines for a farce about a missing goose.', 'Warm-ups involve a lot of shouting vowels. You commit.', 'You\'re given two lines as "Villager #3". You deliver them beautifully.'] },
    rowing:  { name: 'Rowing Club', desc: 'Early outings on the river, captained by Theo.', loc: 'docks', day: 2, from: 6, to: 8, stat: 'physique', fame: 'socialite', npc: 'theo',
               flavor: ['Mist on the river, oars dipping in rhythm. Your hands will blister.', 'The cox yells "Power ten!" and your lungs catch fire.', 'You catch a crab and nearly go overboard. Theo laughs, kindly.'] },
    art:     { name: 'Life & Light Art Circle', desc: 'Sketching sessions in the studio. Sam is a regular.', loc: 'lecture_hall', day: 3, from: 17, to: 19, stat: 'awareness', fame: 'socialite', npc: 'sam',
               flavor: ['You sketch the old radiator from three angles. It\'s more interesting than it sounds.', 'Sam leans over and fixes your perspective with two quick lines.', 'Watercolours today. Your sky bleeds into your field. It sort of works.'] },
    garden:  { name: 'Gardening Club', desc: 'Weekend work on the teaching farm\'s beds.', loc: 'campus_farm', day: 6, from: 10, to: 12, stat: 'physique', fame: 'kindness', npc: 'morrow', skill: 'tending',
               flavor: ['You divide clumps of chives alongside the others, swapping gossip.', 'Morrow shows you how to tell when a squash is ready just by the sound.', 'The club builds a new compost bay. It smells exactly as expected.'] },
    books:   { name: 'Whitlock Book Club', desc: 'Friday evenings in the library\'s reading room.', loc: 'library', day: 5, from: 18, to: 20, stat: 'willpower', fame: 'socialite', npc: 'hart',
               flavor: ['The group argues for an hour about whether the ending was earned.', 'Someone brought shortbread. Discussion improves noticeably.', 'You make a point nobody had thought of. There\'s a little pause of respect.'] }
  };
  var DAYN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  function clubRank(n) { return n >= 15 ? 'Officer' : n >= 6 ? 'Regular' : 'New member'; }
  function clubNow(id) { var c = CLUBS[id], t = time(); return t.weekday === c.day && t.hour >= c.from && t.hour < c.to && loc() === c.loc; }
  function joinClub(id) {
    var c = CLUBS[id]; S().clubs[id] = { sessions: 0, lastDay: 0 };
    return { text: '<p>You scrawl your name on the ' + c.name + ' sign-up sheet. ' + c.desc + ' They meet ' + DAYN[c.day] + 's, ' + c.from + ':00 to ' + c.to + ':00.</p>', minutes: 5 };
  }
  function leaveClub(id) { delete S().clubs[id]; return { text: '<p>You quietly cross your name off the ' + CLUBS[id].name + ' list.</p>', minutes: 2 }; }
  function attendClub(id) {
    var c = CLUBS[id], m = S().clubs[id], before = clubRank(m.sessions);
    m.sessions++; m.lastDay = time().day;
    train(c.stat, 15); need('stats.needs.stress', -50); need('stats.needs.fatigue', 40); fame(c.fame, 3);
    if (c.skill) gainSkill(c.skill, rnd(6, 10));
    var out = '<p><b>' + c.name + '</b></p><p>' + pick(c.flavor) + '</p>';
    if (c.npc && window.NPCS && NPCS.byId && NPCS.byId[c.npc]) { rep(c.npc, 2); out += '<p>' + npcName(c.npc) + ' catches your eye and nods; you\'re becoming a familiar face.</p>'; }
    var after = clubRank(m.sessions);
    if (after !== before) { fame(c.fame, 15); out += '<p>At the end, the club votes you in as <b>' + after + '</b>. There\'s a small cheer.</p>'; G.notify(c.name + ': now ' + after, 'up'); }
    return { text: out, minutes: (c.to - time().hour) * 60 - time().minute };
  }

  // --- part-time jobs ---
  var JOBS = {
    cafe:    { name: 'Copper Kettle Café', title: 'Barista', loc: 'cafe', from: 7, to: 19, pay: 11, needStat: 'beauty', boss: 'Mrs. Abernathy', fame: 'business',
               intro: 'Mrs. Abernathy looks you up and down, hands you an apron, and says, "Trial shift. Don\'t burn the milk."',
               shifts: ['The morning rush: oat-milk flat whites, a lost toddler, and a regular who wants "the usual" without saying what it is.',
                        'A quiet afternoon. You refill sugar pots, wipe tables, and feed the window cat a forbidden crumb.',
                        'A student group camps out for four hours on one pot of tea. You practise latte art on the spares.'] },
    farm:    { name: 'College Teaching Farm', title: 'Farmhand', loc: 'campus_farm', from: 6, to: 18, pay: 9, needStat: 'physique', boss: 'Mr. Pell', fame: 'business', skill: 'tending',
               intro: 'Mr. Pell hands you a pair of gloves that have clearly seen things. "Show up, work hard, don\'t name the chickens. Well, they\'re already named."',
               shifts: ['You muck out the goat pen. Biscuit supervises, eating your sleeve.', 'Fence repairs along the lower field. The wind is sharp but the work is honest.', 'You load crates of squash into the van for the dining commons.'] },
    library: { name: 'Whitlock Library', title: 'Library assistant', loc: 'library', from: 9, to: 22, pay: 10, needStat: 'awareness', boss: 'Mr. Okonkwo, the head librarian', fame: 'business',
               intro: 'The head librarian peers over half-moon glasses. "Shelving, the returns desk, and absolute silence. Can you manage that?"',
               shifts: ['You reshelve a trolley of returns. Someone has used a slice of ham as a bookmark.', 'The returns desk is quiet, so you quietly read half a novel between stampings.', 'You help a panicked first-year find three sources for an essay due at midnight.'] }
  };
  if (window.G && G.world && G.world.location && G.world.location('cafe') && G.world.location('cafe').name) JOBS.cafe.name = G.world.location('cafe').name;
  function applyJob(id) {
    var j = JOBS[id], s = S(), v = statVal(j.needStat);
    if (s.jobs[id] && s.jobs[id].refusedDay === time().day) return { text: '<p>You already asked today. Better leave it until tomorrow.</p>', minutes: 1 };
    var lowClothes = (G.state.stats && G.state.stats.clothing && (G.state.stats.clothing.upperIntegrity < 40 || G.state.stats.clothing.lowerIntegrity < 40));
    if (id === 'cafe' && lowClothes) { s.jobs[id] = { refusedDay: time().day }; return { text: '<p>Mrs. Abernathy glances at your tattered clothes. "Come back when you look like you didn\'t lose a fight with a hedge."</p>', minutes: 10 }; }
    if (chance(clamp(0.5 + v / 1000, 0.5, 0.98))) {
      s.jobs[id] = { hired: true, shifts: 0, lastDay: 0, perf: 50, raise: 0 };
      G.notify('Hired: ' + j.title + ' at ' + j.name, 'up');
      return { text: '<p>' + j.intro + '</p><p>You\'re hired as a ' + j.title.toLowerCase() + '. You can pick up a 3-hour shift any day between ' + j.from + ':00 and ' + j.to + ':00, $' + j.pay + '/hr.</p>', minutes: 20 };
    }
    s.jobs[id] = { refusedDay: time().day };
    return { text: '<p>The interview goes stiffly. ' + cap(j.boss) + ' says they\'ll "keep your details on file". Try again another day.</p>', minutes: 20 };
  }
  function workShift(id) {
    var j = JOBS[id], m = S().jobs[id], t = time();
    if (m.lastDay === t.day) return { text: '<p>You\'ve already worked a shift here today.</p>', minutes: 1 };
    var fat = (G.state.stats && G.state.stats.needs && G.state.stats.needs.fatigue) || 0;
    m.lastDay = t.day; m.shifts++;
    var rate = j.pay + m.raise, hrs = 3, out = '<p><b>' + (RANKS[id] ? RANKS[id][m.rank || 0] : j.title) + ' shift at ' + j.name + '</b></p><p>' + pick(j.shifts) + '</p>';
    var perf = rnd(-5, 8) + Math.floor(statVal(j.needStat) / 250) - (fat > 700 ? 8 : 0);
    var tips = 0;
    var ev = Math.random();
    if (ev < 0.15) { out += '<p>' + (id === 'library' ? 'A patron' : id === 'farm' ? 'A visitor on the farm tour' : 'A customer') + ' is rude for no reason at all. You keep smiling until your face aches.</p>'; need('stats.needs.stress', 60); perf -= 2; }
    else if (ev < 0.27) { tips = rnd(5, 15); out += '<p>Someone you helped earlier comes back just to say thanks, and leaves a little extra.</p>'; fame('kindness', 2); }
    else if (ev < 0.35) { out += '<p>You drop something with a crash that silences the room. ' + cap(j.boss.split(',')[0]) + ' just closes their eyes for a moment.</p>'; perf -= 5; need('stats.needs.stress', 30); }
    if (id === 'cafe') tips += Math.floor(rnd(0, 6) * (1 + statVal('beauty') / 600));
    if (fat > 700) out += '<p>You\'re running on fumes, and it shows in your work.</p>';
    m.perf = clamp(m.perf + perf, 0, 100);
    var pay = rate * hrs + tips; cash(pay);
    need('stats.needs.fatigue', 110); need('stats.needs.stress', 25); need('stats.needs.thirst', -60); need('stats.needs.hunger', -50);
    fame(j.fame, 3); if (j.skill) gainSkill(j.skill, rnd(8, 14));
    if (id === 'library') { var sj = pick(Object.keys(SUBJECTS)); if (chance(0.4)) grade(sj, 1); train('awareness', 6); }
    if (id === 'farm') train('physique', 8);
    if (id === 'cafe') train('beauty', 4);
    out += '<p>You clock out with $' + pay + (tips ? ' ($' + tips + ' in tips)' : '') + '.</p>';
    out = checkPromotion(id, out);
    if (m.perf < 15) { delete S().jobs[id]; out += '<p>At the end of the shift, ' + j.boss.split(',')[0] + ' tells you, kindly but firmly, not to come back.</p>'; G.notify('Fired from ' + j.name, 'down'); }
    return { text: out, minutes: hrs * 60 };
  }
  function quitJob(id) { delete S().jobs[id]; return { text: '<p>You hand back your apron, gloves, or lanyard, and say your thanks. ' + cap(JOBS[id].boss.split(',')[0]) + ' wishes you well.</p>', minutes: 10 }; }

  // --- pets: dean's permit + farm hooks (pets.js by Jimmy exposes G.pets) ---
  function applyPetPermit() {
    var s = S();
    if (s.delinquency >= 400) return { text: '<p>The secretary checks your file and slides the form back. "Not with a record like this. Come back once things have calmed down."</p>', minutes: 10 };
    if (money() < 40) return { text: '<p>The permit fee is $40. You don\'t have it on you.</p>', minutes: 5 };
    cash(-40); s.petPermit = true; G.notify('Pet permit granted: your dorm room may now house two pets', 'up');
    if (G.emit) G.emit('petPermit', { granted: true });
    return { text: '<p>You fill in a form in triplicate covering allergies, noise and "any history of unusual animals". The secretary stamps it with relish. Your dorm room may now house a second pet.</p>', minutes: 25 };
  }
  function petsHere() {
    try { var l = G.pets && (G.pets.following ? G.pets.following() : []); return Array.isArray(l) ? l : []; } catch (e) { return []; }
  }
  function petName(p) { return (p && (p.name || p.id)) || 'your pet'; }
  function petCare(p, what, d) { try { if (G.pets && G.pets.care) G.pets.care(p.id || p, what, d); } catch (e) {} }
  function farmPetOptions(o) {
    var pets = petsHere(); if (!pets.length) return;
    pets.forEach(function (p) {
      var sp = (p.species || '').toLowerCase();
      if (sp === 'dog') o.actions.push({ label: 'Let ' + petName(p) + ' help herd the goats', run: function () {
        var ok = chance(0.4 + skill('tending') / 2000);
        petCare(p, 'happiness', 150); petCare(p, 'energy', -150); gainSkill('tending', ok ? 8 : 3);
        if (ok) S().farm.animalMood = clamp(S().farm.animalMood + 5, 0, 100);
        return { text: ok ? '<p>' + petName(p) + ' circles wide and nudges Biscuit back into the pen like a natural. Mr. Pell actually applauds.</p>'
                           : '<p>' + petName(p) + ' decides the goats are a game. Everyone runs. Eventually, everyone is tired enough to stop.</p>', minutes: 30 };
      } });
      else o.actions.push({ label: 'Let ' + petName(p) + ' explore the farm', run: function () {
        petCare(p, 'happiness', 120); need('stats.needs.stress', -25);
        var line = sp === 'cat' ? ' stalks a moth through the polytunnel with total seriousness.' :
          sp === 'parrot' ? ' perches on the fence and does a worryingly accurate impression of a hen.' :
          sp === 'ferret' ? ' discovers a hay bale and vanishes into it, chattering.' :
          sp === 'rabbit' ? ' nibbles clover by the beds and is immediately adored by everyone.' : ' pokes around the beds, curious about everything.';
        return { text: '<p>' + cap(petName(p)) + line + '</p>', minutes: 20 };
      } });
    });
    if (S().farm.produce.carrot || S().farm.produce.lettuce) o.other.push({ label: 'Share some of your vegetables with your pet', run: function () {
      var k = S().farm.produce.carrot ? 'carrot' : 'lettuce'; S().farm.produce[k]--; if (!S().farm.produce[k]) delete S().farm.produce[k];
      pets.forEach(function (p) { petCare(p, 'hunger', 300); petCare(p, 'bond', 10); });
      return { text: '<p>You hand out a little of your harvest. It goes down very well.</p>', minutes: 5 };
    } });
  }

  function phase2Options(o) {
    if (at('farm')) farmPetOptions(o);
    var s = S(), t = time(), here = loc();
    // teachers after class
    var c = currentClass();
    if (at('classroom') && c && s.attendedKeys[classKey(c)]) o.dialogue.push({ label: 'Stay behind to talk to ' + teacherName(c.subj), run: function () { return afterClass(c.subj); } });
    // extra credit at desk or library
    if ((at('home') || at('library')) && s.pendingExtra) Object.keys(s.pendingExtra).forEach(function (k) {
      o.actions.push({ label: 'Do the ' + SUBJECTS[k].name + ' extra credit', run: function () { return doExtraCredit(k); } });
    });
    // clubs
    if (at('quad')) o.other.push({ label: 'Browse the club fair board', run: function () {
      var lis = Object.keys(CLUBS).map(function (k) { var c = CLUBS[k], m = s.clubs[k]; return '<li><b>' + c.name + '</b>, ' + DAYN[c.day] + ' ' + c.from + ':00 to ' + c.to + ':00. ' + c.desc + (m ? ' <i>(' + clubRank(m.sessions) + ', ' + m.sessions + ' sessions)</i>' : '') + '</li>'; });
      return { text: '<p>A sun-faded board by the steps lists the student clubs, under a hand-drawn banner reading GET INVOLVED!</p><ul>' + lis.join('') + '</ul>', minutes: 5 };
    } });
    if (at('quad')) Object.keys(CLUBS).forEach(function (k) {
      if (!s.clubs[k]) o.other.push({ label: 'Join ' + CLUBS[k].name, run: function () { return joinClub(k); } });
    });
    Object.keys(s.clubs).forEach(function (k) {
      if (clubNow(k) && s.clubs[k].lastDay !== t.day) o.actions.push({ label: 'Join in with ' + CLUBS[k].name, run: function () { return attendClub(k); } });
      if (at('quad')) o.other.push({ label: 'Leave ' + CLUBS[k].name, run: function () { return leaveClub(k); } });
    });
    // jobs
    Object.keys(JOBS).forEach(function (k) {
      var j = JOBS[k], m = s.jobs[k];
      if (here !== j.loc) return;
      var open = t.hour >= j.from && t.hour + 3 <= j.to;
      if (!m || !m.hired) o.dialogue.push({ label: 'Ask about work as a ' + j.title.toLowerCase(), run: function () { return applyJob(k); } });
      else {
        if (open && m.lastDay !== t.day) o.actions.push({ label: 'Work a 3-hour ' + j.title.toLowerCase() + ' shift ($' + (j.pay + m.raise) + '/hr)', run: function () { return workShift(k); } });
        o.other.push({ label: 'Quit your job at ' + j.name, run: function () { return quitJob(k); } });
      }
    });
  }

  // =====================================================================
  // PHASE 3: homework, shoplifting/lockers/fencing/police, seasonal crops,
  // greenhouse, Saturday farmers' market stall, community service
  // =====================================================================
  function season() { return (G.time && G.time.season) || 'Autumn'; }
  function nextClassDay(subj) {
    var t = time();
    for (var i = 1; i <= 7; i++) { var wd = (t.weekday + i) % 7; if (TIMETABLE[wd] && TIMETABLE[wd].indexOf(subj) >= 0) return t.day + i; }
    return t.day + 7;
  }
  function assignHomework(subj) {
    var s = S(); if (s.homework[subj]) return '';
    s.homework[subj] = nextClassDay(subj);
    return '<p>Before you leave, ' + teacherName(subj) + ' sets ' + SUBJECTS[subj].name + ' homework, due next lesson (day ' + s.homework[subj] + ').</p>';
  }
  var HW_FLAVOR = {
    lit: 'a close reading of a poem about a drowned orchard', math: 'a problem set on series that gets nasty around question 6',
    sci: 'a lab write-up on leaf transpiration', art: 'six thumbnail sketches of "something you overlook every day"',
    pe: 'a training log and a page on recovery', agri: 'a soil-sampling report from the college plots'
  };
  function doHomework(subj) {
    var s = S(); delete s.homework[subj]; s.homeworkDone++;
    grade(subj, rnd(1, 3)); need('stats.needs.fatigue', 50); need('stats.needs.stress', 15); train(SUBJECTS[subj].stat, 5);
    return { text: '<p>You work through ' + HW_FLAVOR[subj] + '. It takes a while, but it\'s done.</p>', minutes: 60 };
  }
  function checkHomeworkDue() {
    var s = S(), d = time().day;
    Object.keys(s.homework).forEach(function (k) {
      if (s.homework[k] < d) { delete s.homework[k]; grade(k, -3); if (SUBJECTS[k].npc) rep(SUBJECTS[k].npc, -2); delinq(5, 'missing ' + SUBJECTS[k].name + ' homework'); }
    });
  }

  // --- skulduggery 2: shoplifting, dorm lockers, fencing, police ---
  var SHOPS = {
    market: { name: 'Hollowbrook Grocer', items: ['a jar of honey', 'a bar of fancy chocolate', 'a pack of batteries'], value: [3, 9], risk: 0.3 },
    clothing_store: { name: 'Threadbare & Co.', items: ['a pair of wool socks', 'a silk scarf', 'a leather belt'], value: [8, 25], risk: 0.4 },
    furniture_store: { name: 'Hearth & Home', items: ['a scented candle', 'a little brass hook', 'a set of coasters'], value: [4, 14], risk: 0.35 }
  };
  function shoplift() {
    var sh = SHOPS[loc()], s = S();
    var sk = skill('skulduggery'), aw = statVal('awareness');
    var lf = G.stats && G.stats.hasTrait && G.stats.hasTrait('lightFingers') ? 0.08 : 0;
    var p = clamp(0.3 + sk / 1500 + aw / 4000 + lf - sh.risk, 0.06, 0.92);
    need('stats.needs.stress', 35); s.thefts++;
    var item = pick(sh.items);
    if (chance(p)) {
      s.loot.push({ name: item, value: rnd(sh.value[0], sh.value[1]) + Math.floor(sk / 150) });
      gainSkill('skulduggery', rnd(10, 18)); crime(rnd(8, 15));
      return { text: '<p>You browse, unhurried, and ' + item + ' ends up in your pocket. Nobody at ' + sh.name + ' looks up. You\'ll need someone to sell it to.</p>', minutes: 15 };
    }
    gainSkill('skulduggery', rnd(3, 6)); crime(rnd(25, 45)); need('stats.needs.stress', 70);
    var fine = Math.min(money(), rnd(20, 50)); if (fine) cash(-fine);
    s.bannedFrom[loc()] = time().day + 3;
    return { text: '<p>A hand lands on your shoulder at the door. The manager of ' + sh.name + ' takes back ' + item + ', takes your name, takes $' + fine + ', and tells you not to come back this week.</p>', minutes: 40 };
  }
  function lockers() {
    var s = S(), sk = skill('skulduggery');
    if (s.lockersDay === time().day) return { text: '<p>You\'ve pushed your luck with the lockers enough for one night.</p>', minutes: 1 };
    s.lockersDay = time().day; need('stats.needs.stress', 40);
    if (chance(clamp(0.25 + sk / 1200, 0.1, 0.9))) {
      var found = pick([{ name: 'a pair of wireless earbuds', value: 30 }, { name: 'a forgotten textbook', value: 18 }, { name: 'an envelope with $12 inside', cash: 12 }, { name: 'a fancy fountain pen', value: 22 }]);
      if (found.cash) cash(found.cash); else s.loot.push(found);
      gainSkill('skulduggery', rnd(14, 22)); crime(rnd(10, 20));
      return { text: '<p>The corridor is dark except for the vending machine\'s hum. A bent hairpin, a patient wrist, and the locker clicks open: ' + found.name + '.</p>', minutes: 25 };
    }
    gainSkill('skulduggery', rnd(4, 8));
    if (chance(0.5)) { delinq(80, 'caught breaking into lockers'); crime(30); return { text: '<p>The hall light snaps on. The resident advisor stares at you, then at the hairpin. A report goes to the dean\'s office in the morning.</p>', minutes: 20 }; }
    return { text: '<p>The lock won\'t give. A door opens down the hall and you walk away, very casually, toward the bathroom.</p>', minutes: 15 };
  }
  function fenceLoot() {
    var s = S(); if (!s.loot.length) return { text: '<p>You\'ve got nothing to sell.</p>', minutes: 1 };
    var st = npcStage('wren'), cut = st === 'close' || st === 'friend' ? 0.8 : st === 'friendly' ? 0.65 : 0.5;
    var total = 0; s.loot.forEach(function (l) { total += l.value; });
    var pay = Math.max(1, Math.round(total * cut)); var n = s.loot.length; s.loot = [];
    cash(pay); rep('wren', 2); gainSkill('skulduggery', 5);
    return { text: '<p>' + npcName('wren', 'Wren') + ' turns your ' + n + ' item' + (n === 1 ? '' : 's') + ' over in the alley light, names a price, and doesn\'t haggle. "' + (cut >= 0.8 ? 'Friend rate. Don\'t tell anyone.' : 'Take it or leave it.') + '" You walk away $' + pay + ' richer.</p>', minutes: 15 };
  }
  function policeStop() {
    var s = S(), c = (G.state.stats && G.state.stats.status && G.state.stats.status.crime) || s.crime;
    if (c < 400 || s.stopDay === time().day || !chance(c / 4000)) return null;
    s.stopDay = time().day; need('stats.needs.stress', 60);
    var hasLoot = s.loot.length > 0;
    return '<p><b>Officer Dunn steps into your path.</b> "Just a quick chat." ' + (hasLoot ? 'Your pockets feel very full.' : 'You try to look like someone with nothing on their mind.') + '</p>';
  }
  function policeOptions(o) {
    var s = S(); if (!s.pendingStop) return;
    o.dialogue.unshift({ label: 'Cooperate with Officer Dunn', run: function () {
      s.pendingStop = false; var txt;
      if (s.loot.length) { var v = 0; s.loot.forEach(function (l) { v += l.value; }); s.loot = []; crime(40); var fine = Math.min(money(), 30 + v); cash(-fine);
        s.serviceHours += 6; txt = '<p>Dunn finds the goods. You get a $' + fine + ' fine and six hours of community service on the college farm.</p>'; }
      else { crime(-20); txt = '<p>Dunn asks a few questions, writes nothing down, and lets you go with a look. "Keep it that way."</p>'; }
      return { text: txt, minutes: 20 };
    } });
    o.dialogue.unshift({ label: 'Talk your way out of it', run: function () {
      s.pendingStop = false;
      if (chance(clamp(0.2 + statVal('beauty') / 3000 + statVal('willpower') / 3000 + skill('skulduggery') / 3000, 0.1, 0.8))) { need('stats.needs.stress', -10); return { text: '<p>You\'re polite, plausible, and a little bit boring on purpose. Dunn loses interest.</p>', minutes: 10 }; }
      crime(30); s.serviceHours += 4; var fine = Math.min(money(), 25); cash(-fine);
      return { text: '<p>Dunn doesn\'t buy it. You get a $' + fine + ' fine and four hours of community service for "attitude".</p>', minutes: 25 };
    } });
    o.travel.length = 0; o.actions.length = 0;
  }
  function communityService() {
    var s = S(), hrs = Math.min(3, s.serviceHours); s.serviceHours -= hrs;
    crime(-15 * hrs); gainSkill('tending', 4 * hrs); need('stats.needs.fatigue', 40 * hrs); fame('kindness', 2 * hrs);
    return { text: '<p>Hi-vis vest, a rake, and Mr. Pell signing your timesheet. You do ' + hrs + ' hour' + (hrs === 1 ? '' : 's') + ' of community service.' + (s.serviceHours ? ' ' + s.serviceHours + ' to go.' : ' That\'s the last of it.') + '</p>', minutes: hrs * 60 };
  }

  // --- tending 2: seasonal crops, greenhouse, farmers' market ---
  var SEASON_CROPS = {
    Spring: ['radish', 'lettuce', 'peas', 'strawberry'], Summer: ['lettuce', 'tomato', 'courgette', 'strawberry'],
    Autumn: ['radish', 'carrot', 'pumpkin', 'kale'], Winter: ['kale', 'garlic']
  };
  CROPS.peas = { name: 'Peas', days: 4, seed: 5, sell: 18 };
  CROPS.strawberry = { name: 'Strawberries', days: 6, seed: 9, sell: 34 };
  CROPS.tomato = { name: 'Tomatoes', days: 6, seed: 7, sell: 28 };
  CROPS.courgette = { name: 'Courgettes', days: 5, seed: 6, sell: 20 };
  CROPS.kale = { name: 'Kale', days: 4, seed: 5, sell: 15 };
  CROPS.garlic = { name: 'Garlic', days: 8, seed: 8, sell: 30 };
  function cropAllowed(k) {
    var inSeason = (SEASON_CROPS[season()] || []).indexOf(k) >= 0;
    return inSeason || S().farm.greenhouse;
  }
  function buildGreenhouse() {
    if (money() < 120) return { text: '<p>Mr. Pell says a share of the old polytunnel costs $120 for materials. You don\'t have it.</p>', minutes: 5 };
    cash(-120); S().farm.greenhouse = true; gainSkill('tending', 15);
    return { text: '<p>You spend the afternoon patching the old polytunnel with Mr. Pell: new plastic, a working vent, a heater that coughs. Now you can grow anything in any season.</p>', minutes: 180 };
  }
  function marketStall() {
    var s = S(), items = 0, total = 0;
    for (var k in s.farm.produce) { items += s.farm.produce[k]; total += s.farm.produce[k] * CROPS[k].sell; }
    if (!items) return { text: '<p>You\'ve got nothing to put on a stall.</p>', minutes: 1 };
    var mult = 1.4 + skill('tending') / 2500 + statVal('beauty') / 5000;
    var sold = Math.round(total * mult) + rnd(0, 10);
    s.farm.produce = {}; s.farm.stallDays++; cash(sold); fame('business', 8);
    var extra = pick(['A regular asks if you\'ll be here next week. You say yes before thinking.', 'Someone\'s grandmother buys everything green and tells you you\'re too thin.', 'A food blogger photographs your strawberries from nine angles.']);
    return { text: '<p>You set out a trestle table in the town square with a hand-lettered sign. By early afternoon the crates are empty and you\'ve made $' + sold + '.</p><p>' + extra + '</p>', minutes: 240 };
  }

  function phase3Options(o) {
    var s = S(), t = time();
    if (at('home') || at('library')) Object.keys(s.homework).forEach(function (k) {
      o.actions.push({ label: 'Do ' + SUBJECTS[k].name + ' homework (due day ' + s.homework[k] + ')', run: function () { return doHomework(k); } });
    });
    var banned = s.bannedFrom[loc()] && s.bannedFrom[loc()] > t.day;
    if (SHOPS[loc()] && !banned && skulUnlocked(91)) o.actions.push({ label: 'Pocket something while nobody\'s looking', run: shoplift });
    if (banned) o.other.push({ label: 'Notice the manager watching you', run: function () { return { text: '<p>The manager hasn\'t forgotten you. You\'re not welcome here until day ' + s.bannedFrom[loc()] + '.</p>', minutes: 1 }; } });
    if (loc() === 'dorm_hall' && (t.hour >= 23 || t.hour < 5) && skulUnlocked(364)) o.actions.push({ label: 'Try the corridor lockers', run: lockers });
    if (loc() === 'alley' && s.loot.length && (!window.NPCS || !NPCS.whereIs || NPCS.whereIs('wren') === 'alley')) o.dialogue.push({ label: 'Sell what you\'ve lifted to ' + npcName('wren', 'Wren') + ' (' + s.loot.length + ' items)', run: fenceLoot });
    if (at('farm') && s.serviceHours > 0 && t.hour >= 8 && t.hour < 17) o.actions.unshift({ label: 'Work off community service (' + s.serviceHours + 'h left)', run: communityService });
    if (at('farm') && !s.farm.greenhouse && skill('tending') >= 364) o.dialogue.push({ label: 'Ask Mr. Pell about fixing up the polytunnel ($120)', run: buildGreenhouse });
    if (loc() === 'town_square' && t.weekday === 6 && t.hour >= 8 && t.hour < 13 && s.farm.stallDayLast !== t.day && Object.keys(s.farm.produce).length)
      o.actions.push({ label: 'Run a farmers\' market stall', run: function () { s.farm.stallDayLast = t.day; return marketStall(); } });
    policeOptions(o);
  }

  // =====================================================================
  // PHASE 4: terms, midterms/finals, 4-year graduation track, scholarship,
  // club events, job promotions, skulduggery tiers, docks fence, arrest/expulsion
  // =====================================================================
  var YEAR_NAMES = ['First-year', 'Second-year', 'Third-year', 'Fourth-year'];
  function dos() { return (G.time && G.time.dayOfSeason) || (((time().day - 1) % 28) + 1); }
  function inTerm() { return season() !== 'Summer'; }
  function termLabel() { return season() + ' term, ' + YEAR_NAMES[Math.min(3, S().year - 1)]; }
  function avgGrade() { var g = S().grades, t = 0, n = 0; for (var k in g) { t += g[k]; n++; } return n ? t / n : 0; }

  function finishTerm(avg) {
    var s = S(), letter = gradeLetter(avg), out = '';
    if (s.lastTermKey === season() + s.year + ':' + Math.floor((time().day - 1) / 28)) return '';
    s.lastTermKey = season() + s.year + ':' + Math.floor((time().day - 1) / 28);
    s.transcript.push({ term: season() + ' Y' + s.year, avg: Math.round(avg), letter: letter });
    if (avg >= 50) { s.credits++; out += '<p>You pass the term with a ' + letter + ' average. One more credit toward your degree (' + s.credits + '/' + s.creditsNeeded + ').</p>'; }
    else { out += '<p>You fail the term with a ' + letter + ' average. No credit this time.</p>'; }
    // scholarship
    if (!s.scholarship && avg >= 85) { s.scholarship = true; out += '<p><b>A letter from the bursary:</b> you\'ve been awarded the Whitlock Merit Scholarship, $150 at the start of every term while your average stays above 78.</p>'; G.notify('Awarded the Whitlock Merit Scholarship', 'up'); fame('socialite', 20); }
    else if (s.scholarship && avg < 78) { s.scholarship = false; out += '<p>The bursary writes, regretfully, that your scholarship has lapsed. You can win it back with an 85 average.</p>'; G.notify('Scholarship lost', 'down'); }
    // grades regress so every term matters
    Object.keys(s.grades).forEach(function (k) { s.grades[k] = Math.round(s.grades[k] * 0.7 + 66 * 0.3); });
    if (season() === 'Spring') {
      if (s.year >= 4) {
        if (s.credits >= s.creditsNeeded) { s.graduated = true; out += '<p><b>You\'ve done it.</b> Caps fly on the quad, a brass band plays slightly out of tune, and your name is read out to real applause. You\'re a Hollowbrook graduate. You can stay in town, work, and keep living your life here.</p>'; G.notify('Graduated from Hollowbrook College!', 'up'); fame('socialite', 60); fame('business', 30); if (G.emit) G.emit('graduated', { credits: s.credits }); }
        else { out += '<p>You\'re ' + (s.creditsNeeded - s.credits) + ' credit' + (s.creditsNeeded - s.credits === 1 ? '' : 's') + ' short of graduating, so you\'ll be staying on for an extra year.</p>'; }
      } else { s.year++; out += '<p>Summer break begins. In autumn you\'ll be a ' + YEAR_NAMES[s.year - 1].toLowerCase() + '.</p>'; G.notify('Year complete: now a ' + YEAR_NAMES[s.year - 1], 'up'); }
    }
    return out;
  }
  // replace the old weekly exam with midterms (day 15+) and finals (day 26+)
  sitExam = function () {
    var s = S(), kind = s.examType || 'midterm', fin = kind === 'finals', total = 0;
    var out = '<p><b>' + (fin ? 'Finals' : 'Midterms') + '.</b> The exam hall is silent except for the clock and someone\'s nervous foot. You turn over the paper.</p>';
    var stress = (G.state.stats && G.state.stats.needs && G.state.stats.needs.stress) || 0;
    Object.keys(s.grades).forEach(function (k) {
      var roll = s.grades[k] + rnd(-16, 8) + Math.floor(statVal('willpower') / 200) - Math.floor(stress / 200) + Math.min(5, Math.floor(s.studiedTerm / 3));
      roll = clamp(roll, 0, 100); total += roll;
      grade(k, (roll >= s.grades[k] ? 1 : -1) * (fin ? 4 : 2));
    });
    var avg = total / Object.keys(s.grades).length;
    s.examDue = false; s.lastExamAvg = Math.round(avg); s.examsTaken++;
    need('stats.needs.stress', fin ? 120 : 80); need('stats.needs.fatigue', fin ? 140 : 100);
    if (avg < 50) { s.probation = true; out += '<p>Results go up by the evening. Your name is near the bottom: <i>academic probation</i>.</p>'; }
    else if (avg >= 85) { s.probation = false; out += '<p>Results go up by the evening. You\'re near the top of the list.</p>'; }
    else { if (avg >= 60) s.probation = false; out += '<p>Results go up by the evening. Respectable.</p>'; }
    if (fin) { out += finishTerm((avgGrade() + avg) / 2); s.studiedTerm = 0; }
    if (G.emit) G.emit('journal', { id: 'exam' + s.examsTaken, text: (fin ? 'Finals' : 'Midterms') + ', ' + termLabel() + ': ' + s.lastExamAvg + '% (' + gradeLetter(avg) + ').' });
    return { text: out, minutes: 180 };
  };
  skipExam = function () {
    var s = S(), fin = s.examType === 'finals'; s.examDue = false;
    Object.keys(s.grades).forEach(function (k) { s.grades[k] = clamp(s.grades[k] - (fin ? 12 : 6), 0, 100); });
    G.notify('All grades -' + (fin ? 12 : 6) + ' (missed ' + (fin ? 'finals' : 'midterms') + ')', 'down'); delinq(fin ? 100 : 60, 'missed exam'); s.probation = true;
    var out = '<p>You stay away from the exam hall. By evening the note in your pigeonhole is short and unhappy.</p>';
    if (fin) out += finishTerm(avgGrade() * 0.8);
    return { text: out, minutes: 1 };
  };
  function termNewDay() {
    var s = S(), d = dos();
    if (!inTerm()) { s.examDue = false; return; }
    if (d === 1) {
      s.studiedTerm = 0;
      if (s.scholarship) { cash(150); G.notify('Scholarship stipend: +$150', 'up'); }
      G.notify(termLabel() + ' begins', 'info');
    }
    if (d === 15 || d === 26) { s.examDue = true; s.examType = d === 26 ? 'finals' : 'midterm'; G.notify((d === 26 ? 'Finals' : 'Midterms') + ' start today in the lecture building, 09:00', 'info'); }
    if (s.examDue && [15, 16, 17, 26, 27, 28].indexOf(d) < 0) { if (s.examType === 'finals') { s.examDue = false; } else s.examDue = false; }
  }

  // --- club events, once per term ---
  var CLUB_EVENTS = {
    drama:  { day: 24, from: 19, to: 22, name: 'the Players\' term production', stat: 'beauty',
              good: 'The farce brings the house down. Your two lines get the biggest laugh of the night.', bad: 'You forget a line, improvise, and somehow make it worse. The audience is kind.' },
    rowing: { day: 18, from: 7, to: 10, name: 'the inter-college race', stat: 'physique',
              good: 'Your boat finds its rhythm on the last stretch and takes it by half a length.', bad: 'You\'re in contention until the last 200 metres, then your legs file a formal complaint.' },
    art:    { day: 20, from: 17, to: 20, name: 'the Art Circle exhibition', stat: 'awareness',
              good: 'Someone buys your little watercolour for $40, and asks you to sign it.', bad: 'Your piece is hung beside the fire exit. One person looks at it for a long time. You choose to find that encouraging.' },
    garden: { day: 22, from: 10, to: 13, name: 'the Harvest Show', stat: 'physique',
              good: 'Your entry wins a rosette. Mr. Pell pretends not to be proud.', bad: 'Your entry is "commended". It sits next to a marrow the size of a dog.' },
    books:  { day: 16, from: 18, to: 20, name: 'the visiting author reading', stat: 'willpower',
              good: 'You ask the question that makes the author put down their notes and think. They thank you by name.', bad: 'You ask a question that turns out to be answered in chapter one.' }
  };
  function clubEventNow(id) { var e = CLUB_EVENTS[id], t = time(); return inTerm() && dos() === e.day && t.hour >= e.from && t.hour < e.to && loc() === CLUBS[id].loc; }
  function doClubEvent(id) {
    var e = CLUB_EVENTS[id], c = CLUBS[id], m = S().clubs[id]; m.eventTerm = season() + S().year;
    var ok = chance(clamp(0.35 + m.sessions / 30 + statVal(e.stat) / 3000, 0.2, 0.95));
    fame(c.fame, ok ? 30 : 10); need('stats.needs.stress', ok ? -80 : 30); train(e.stat, ok ? 25 : 10);
    if (ok && id === 'art') cash(40);
    if (c.npc) rep(c.npc, ok ? 5 : 2);
    return { text: '<p><b>' + cap(e.name) + '</b></p><p>' + (ok ? e.good : e.bad) + '</p>', minutes: (e.to - time().hour) * 60 };
  }

  // --- job promotions ---
  var RANKS = { cafe: ['Barista', 'Senior barista', 'Shift supervisor'], farm: ['Farmhand', 'Senior farmhand', 'Farm foreman'], library: ['Library assistant', 'Senior assistant', 'Archives assistant'] };
  function checkPromotion(id, out) {
    var m = S().jobs[id]; if (!m) return out; m.rank = m.rank || 0;
    var need2 = [[10, 60], [25, 70]][m.rank];
    if (need2 && m.shifts >= need2[0] && m.perf >= need2[1]) {
      m.rank++; m.raise += 2; fame('business', 20);
      G.notify('Promoted to ' + RANKS[id][m.rank] + ' ($' + (JOBS[id].pay + m.raise) + '/hr)', 'up');
      out += '<p><b>Promotion!</b> You\'re now ' + RANKS[id][m.rank].toLowerCase() + '. More responsibility, a new badge, and $' + (JOBS[id].pay + m.raise) + ' an hour.</p>';
    }
    return out;
  }

  // --- skulduggery tiers + docks fence + arrest ---
  var SKUL_TIERS = [ [0, 'Pickpocketing'], [91, 'Shoplifting'], [364, 'Locker-picking'], [546, 'Friend rates at the docks'] ];
  function skulUnlocked(min) { return skill('skulduggery') >= min; }
  function docksFence() {
    var s = S(); if (!s.loot.length) return { text: '<p>You\'ve got nothing to sell.</p>', minutes: 1 };
    var cut = skulUnlocked(546) ? 0.9 : 0.6, total = 0; s.loot.forEach(function (l) { total += l.value; });
    var pay = Math.max(1, Math.round(total * cut)), n = s.loot.length; s.loot = []; cash(pay); gainSkill('skulduggery', 6);
    var risk = s.crime > 500 ? 0.15 : 0.05;
    if (chance(risk)) { crime(40); return { text: '<p>Gideon, the old man who runs the bait shack, pays you $' + pay + ' and then mutters that the harbour police have been "sniffing about". A torch beam sweeps the jetty as you leave. Your name may have been noted.</p>', minutes: 20 }; }
    return { text: '<p>Gideon, the old man who runs the bait shack at the docks, weighs your ' + n + ' item' + (n === 1 ? '' : 's') + ' in a calloused hand' + (cut >= 0.9 ? ' and, recognising a professional, pays well' : '') + ': $' + pay + '. No questions, no receipts.</p>', minutes: 20 };
  }
  function arrest() {
    var s = S(), fine = Math.min(money(), 100);
    cash(-fine); crime(-150); delinq(120, 'arrested'); need('stats.needs.stress', 200); need('stats.needs.fatigue', 150);
    s.loot = []; s.arrests++; s.serviceHours += 8;
    if (s.arrests >= 3 && !s.expelled) { s.expelled = true; s.expelledDay = time().day; G.notify('Expelled from Hollowbrook College', 'down'); }
    if (G.world && G.world.teleport) G.world.teleport('dorm_room');
    return { text: '<p>This time Dunn doesn\'t let it go. You spend a long, cold night on a bench at the station, pay a $' + fine + ' fine in the morning, and come away with eight hours of community service.</p>' + (s.expelled ? '<p>A letter from the dean is waiting when you get back. After three arrests, the college has <b>expelled</b> you. You could appeal at the dean\'s office once you\'ve kept your nose clean for a week.</p>' : ''), minutes: 600 };
  }
  function appealExpulsion() {
    var s = S();
    if (time().day - s.expelledDay < 7 || s.crime > 200) return { text: '<p>The secretary shakes her head. "The dean will only hear an appeal after a week of good behaviour, and your record has to be clean."</p>', minutes: 10 };
    if (money() < 200) return { text: '<p>The appeal fee is $200. You don\'t have it.</p>', minutes: 5 };
    cash(-200); s.expelled = false; s.probation = true; s.delinquency = 500; s.arrests = 1;
    G.notify('Reinstated on probation', 'up');
    return { text: '<p>Dean Whitlock hears you out for a long time. Finally: "One more chance. On probation. Don\'t make me regret it."</p>', minutes: 60 };
  }

  function phase4Options(o) {
    var s = S(), t = time();
    Object.keys(s.clubs).forEach(function (k) {
      if (clubEventNow(k) && s.clubs[k].eventTerm !== season() + s.year) o.actions.unshift({ label: 'Take part in ' + CLUB_EVENTS[k].name, run: function () { return doClubEvent(k); } });
    });
    if (loc() === 'docks' && s.loot.length && (t.hour >= 20 || t.hour < 2)) o.dialogue.push({ label: 'Find Gideon at the bait shack (' + s.loot.length + ' items to sell)', run: docksFence });
    if (at('office') && s.expelled) o.dialogue.push({ label: 'Appeal your expulsion ($200)', run: appealExpulsion });
    if (s.pendingStop && ((G.state.stats && G.state.stats.status && G.state.stats.status.crime) || s.crime) >= 700) {
      o.dialogue = o.dialogue.filter(function (x) { return !/Dunn|Talk your way/.test(x.label); });
      o.dialogue.unshift({ label: 'Go quietly with Officer Dunn', run: function () { s.pendingStop = false; return arrest(); } });
    }
    if (at('quad')) o.other.push({ label: 'Check your transcript', run: function () {
      var rows = s.transcript.map(function (r) { return '<li>' + r.term + ': ' + r.avg + '% (' + r.letter + ')</li>'; }).join('') || '<li>No completed terms yet.</li>';
      return { text: '<p>You log into the student portal on your phone. ' + (s.graduated ? 'Graduated.' : termLabel() + ', ' + s.credits + '/' + s.creditsNeeded + ' credits.') + (s.scholarship ? ' Whitlock Merit Scholar.' : '') + '</p><ul>' + rows + '</ul>', minutes: 3 };
    } });
    return o;
  }

  // ---------- the module ----------
  var mod = {
    id: 'school',
    init: function (state) {
      if (state.school) { var x = state.school; x.clubs = x.clubs || {}; x.jobs = x.jobs || {}; x.extraCredit = x.extraCredit || {}; x.homework = x.homework || {}; x.homeworkDone = x.homeworkDone || 0; x.loot = x.loot || []; x.bannedFrom = x.bannedFrom || {}; x.serviceHours = x.serviceHours || 0; x.farm.stallDays = x.farm.stallDays || 0; x.year = x.year || 1; x.credits = x.credits || 0; x.creditsNeeded = x.creditsNeeded || 10; x.transcript = x.transcript || []; x.arrests = x.arrests || 0; x.studiedTerm = x.studiedTerm || 0; return; }
      state.school = {
        grades: { lit: 66, math: 66, sci: 66, art: 66, pe: 66, agri: 66 },
        delinquency: 0, crime: 0, attended: 0, skipped: 0, attendedKeys: {},
        studiedToday: 0, examDue: false, examsTaken: 0, lastExamAvg: null,
        probation: false, suspendedUntil: 0, expelled: false, thefts: 0,
        skillsFallback: { skulduggery: 0, tending: 0 },
        clubs: {}, jobs: {}, extraCredit: {}, pendingExtra: {}, homework: {}, homeworkDone: 0, year: 1, credits: 0, creditsNeeded: 10, transcript: [], scholarship: false, graduated: false, arrests: 0, studiedTerm: 0, examType: null, expelledDay: 0, loot: [], bannedFrom: {}, serviceHours: 0, pendingStop: false,
        farm: { plots: [{ crop: null }, { crop: null }, { crop: null }, { crop: null }], produce: {}, animalMood: 50, eggsToday: false, unlocked: true, greenhouse: false, stallDays: 0 }
      };
    },
    onTick: function (minutes, state) {
      // flag skipped classes once a block ends
      var t = time(), list = TIMETABLE[t.weekday], s = S();
      s.curDay = t.day; s.curWd = t.weekday;
      if (list && !s.suspendedUntil && !s.expelled && !s.graduated && inTerm()) BLOCKS.forEach(function (start, i) {
        var key = t.day + ':' + i;
        if (t.hour >= start + 2 && !s.attendedKeys[key] && !s.skippedKeys) s.skippedKeys = {};
        if (t.hour >= start + 2 && !s.attendedKeys[key] && !(s.skippedKeys || {})[key]) {
          s.skippedKeys = s.skippedKeys || {}; s.skippedKeys[key] = true; s.skipped++;
          delinq(15, 'skipped ' + SUBJECTS[list[i]].name);
        }
      });
      if (s.delinquency >= 700 && !s.suspendedUntil) {
        s.suspendedUntil = t.day + 3;
        G.notify('Suspended from classes for 3 days', 'down');
      }
    },
    getOptions: function (state) {
      var o = { dialogue: [], actions: [], travel: [], other: [] }, s = S(), t = time();
      var suspended = s.suspendedUntil > t.day;
      var c = currentClass();

      if (at('classroom')) {
        if (isExamDay() && !suspended) {
          o.actions.push({ label: 'Sit your ' + (s.examType === 'finals' ? 'finals' : 'midterms'), run: function (st) { return sitExam(st); } });
          o.actions.push({ label: 'Skip the exam', run: function (st) { return skipExam(st); } });
        } else if (c && !suspended && !s.attendedKeys[classKey(c)]) {
          o.actions.push({ label: 'Attend ' + SUBJECTS[c.subj].name + (c.late ? ' (late)' : ''), run: function (st) { return attend(st, false); } });
          o.actions.push({ label: 'Focus hard in ' + SUBJECTS[c.subj].name, run: function (st) { return attend(st, true); } });
          o.actions.push({ label: 'Nap at the back', run: sleepInClass });
          o.dialogue.push({ label: 'Ask ' + teacherName(c.subj) + ' a question', run: function () {
            grade(c.subj, 1); return { text: '<p>You raise your hand. ' + teacherName(c.subj) + ' looks pleased someone was listening.</p>', minutes: 5 };
          } });
        } else if (suspended) {
          o.other.push({ label: 'Read the suspension notice', run: function () { return { text: '<p>The notice says you may return on day ' + s.suspendedUntil + '. It is signed with unnecessary flourish.</p>', minutes: 2 }; } });
        }
      }
      if (at('library')) {
        o.actions.push({ label: 'Study in a carrel', run: function () { return study('library'); } });
        o.actions.push({ label: 'Rifle through lost property', run: pickpocket });
      }
      if (at('home')) o.actions.push({ label: 'Study at your desk', run: function () { return study('home'); } });
      if (at('quad')) {
        o.actions.push({ label: 'Lift something from an unattended bag', run: pickpocket });
        o.other.push({ label: 'Check the timetable board', run: function () {
          var lines = Object.keys(TIMETABLE).map(function (d) { return '<li>' + ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d] + ': 09:00 ' + SUBJECTS[TIMETABLE[d][0]].name + ', 13:00 ' + SUBJECTS[TIMETABLE[d][1]].name + '</li>'; });
          return { text: '<p>The corkboard is thick with flyers for clubs, lost cats, and a jazz night. Pinned in the middle is the timetable:</p><ul>' + lines.join('') + '</ul>' + (s.examDue ? '<p><b>Exams are this week. Check the classroom at 09:00.</b></p>' : ''), minutes: 5 };
        } });
      }
      if (at('office')) o.dialogue.push({ label: 'Ask to see the dean', run: deanVisit });
      if (at('office') && !s.petPermit) o.dialogue.push({ label: 'Apply for a second-pet permit ($40)', run: applyPetPermit });
      if (at('market')) o.actions.push({ label: 'Sell your produce to the grocer', run: sellProduce });
      if (at('street')) o.actions.push({ label: 'Lift a wallet from a distracted shopper', run: pickpocket });
      if (s.crime > 150) o.other.push({ label: 'Lie low for a while', run: lieLow });

      if (at('farm')) {
        s.farm.plots.forEach(function (p, i) {
          if (!p.crop) {
            Object.keys(CROPS).forEach(function (k) {
              if (k === 'pumpkin' && skill('tending') < 300) return; // unlocks at D
              if (!cropAllowed(k)) return;
              o.actions.push({ label: 'Plant ' + CROPS[k].name.toLowerCase() + ' in plot ' + (i + 1) + ' ($' + CROPS[k].seed + ')', run: function () { return plant(i, k); } });
            });
          }
        });
        if (s.farm.plots.some(function (p) { return p.crop && !p.wateredToday; })) o.actions.push({ label: 'Water the plots', run: waterAll });
        if (s.farm.plots.some(function (p) { return p.weeds; })) o.actions.push({ label: 'Pull weeds', run: weed });
        if (s.farm.plots.some(function (p) { return p.crop && p.growth >= CROPS[p.crop].days; })) o.actions.push({ label: 'Harvest', run: harvest });
        o.actions.push({ label: 'Spend time with the animals', run: soothe });
        if (!s.farm.eggsToday) o.actions.push({ label: 'Check the hen coop', run: collectEggs });
        o.other.push({ label: 'Look over your plots', run: function () {
          return { text: '<p>Mr. Pell lets students work four plots behind the barn.</p><ul>' + s.farm.plots.map(function (p, i) { return '<li>Plot ' + (i + 1) + ': ' + plotDesc(p) + '</li>'; }).join('') + '</ul>', minutes: 3 };
        } });
      }
      phase2Options(o);
      phase3Options(o);
      phase4Options(o);
      return o;
    },
    // exposed for other modules
    api: { schoolStatus: schoolStatus,
      // Tending bonus for pet care: 1.0 at F up to 2.0 at S; soothe chance 0.4..0.95
      tendingBonus: function () { return 1 + skill('tending') / 1000; },
      sootheChance: function () { return clamp(0.4 + skill('tending') / 1800, 0.4, 0.95); },
      trainTending: function (n) { gainSkill('tending', n || 3); },
      hasPetPermit: function () { return !!S().petPermit; }, tierOf: tierOf, gradeLetter: gradeLetter, SUBJECTS: SUBJECTS, TIMETABLE: TIMETABLE, LOC: LOC }
  };

  // daily rollover: crops grow, weeds, exams, counters reset
  function newDay() {
    var s = S(), t = time(), w = (G.state.world && G.state.world.weather) || '';
    var rained = /rain|storm/.test(w);
    // count any blocks of the day that just ended which were never attended
    var prev = TIMETABLE[s.curWd];
    if (prev && inTerm() && !s.expelled && !s.graduated && !(s.suspendedUntil > s.curDay)) BLOCKS.forEach(function (st, i) {
      var key = s.curDay + ':' + i;
      if (!s.attendedKeys[key] && !(s.skippedKeys || {})[key]) { s.skipped++; delinq(15, 'skipped ' + SUBJECTS[prev[i]].name); }
    });
    s.curDay = t.day; s.curWd = t.weekday;
    checkHomeworkDue();
    s.studiedToday = 0; s.farm.eggsToday = false; s.attendedKeys = {}; s.skippedKeys = {};
    s.farm.plots.forEach(function (p) {
      if (!p.crop) return;
      if (p.wateredToday || rained) p.growth++; else p.health = clamp(p.health - 15, 0, 100);
      if (chance(0.25)) p.weeds = true;
      if (p.weeds) p.health = clamp(p.health - 5, 0, 100);
      if (p.health <= 0) { G.notify('Your ' + CROPS[p.crop].name.toLowerCase() + ' withered', 'down'); p.crop = null; return; }
      p.wateredToday = false;
    });
    s.delinquency = clamp(s.delinquency - 5, 0, 1000); // slow forgiveness
    s.crime = clamp(s.crime - 3, 0, 1000);
    termNewDay();
    if (s.suspendedUntil && s.suspendedUntil <= t.day) { s.suspendedUntil = 0; s.delinquency = 450; G.notify('Suspension over; delinquency reset to 450', 'info'); }
  }

  /* Sneaking onto campus from an alleyway (back fence or side gate). */
  function fenceClimb() {
    var st = G.state, h = (G.time && G.time.hour) || 12, late = h >= 22 || h < 6;
    if (G.stats && G.stats.train) G.stats.train('physique', 2);
    if (G.stats && G.stats.trainSkill) G.stats.trainSkill('skulduggery', late ? 4 : 2);
    var phys = (G.stats && G.stats.effective) ? G.stats.effective('physique') : 300;
    if (Math.random() < Math.max(0.05, 0.35 - phys / 3000) && st.stats && st.stats.clothing) {
      st.stats.clothing.lowerIntegrity = Math.max(0, (st.stats.clothing.lowerIntegrity || 0) - 4);
      G.notify('You snag your clothes getting through', 'down');
    }
    if (!late) return;
    if (G.stats && G.stats.crime) G.stats.crime(5);
    if (Math.random() < 0.15) {
      delinq(40, 'campus security saw you come over the fence after hours');
    }
  }

  function boot() {
    if (!window.G || !G.register) return setTimeout(boot, 50);
    G.register(mod);
    if (G.world && G.world.addLocation && !(G.world.location && G.world.location('deans_office'))) G.world.addLocation('deans_office', {
      name: "Dean's Office", district: 'Campus', indoor: true, open: [8, 17], restroom: false,
      desc: 'A wood-panelled waiting room in the admin wing: a ticking clock, a potted fern, and a secretary who sees everything.'
    }, [['quad', 2]]);
    if (G.on) G.on('newDay', newDay);
    if (G.on) G.on('arrive', function (d) {
      var prev = S().lastLoc; S().lastLoc = d && d.location;
      if ((prev === 'industrial_alley' || prev === 'alley') && d && d.location === 'quad') fenceClimb();
      var l = d && d.location; if (['main_street', 'town_square', 'alley', 'market', 'shopping_centre'].indexOf(l) < 0) return;
      var line = policeStop(); if (line) { S().pendingStop = true; G.notify('Officer Dunn wants a word', 'info'); }
    });
    G.school = mod.api;
  }
  boot();
})();
