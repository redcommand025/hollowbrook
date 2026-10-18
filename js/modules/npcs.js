/* npcs.js: named NPCs, schedules, dialogue trees, reputation, romance, quests, journal.
   Owner: Roy. Plugs into window.G per CONTRACT.md.
   Every character is an adult (18+). Romance is PG-13: flirting, dates, kissing, fade-to-black.

   Integration assumptions (shout if these change):
   - Player location: G.state.world.location; ids match world.js. Weekday: G.time.weekdayIndex (0=Mon).
   - Money: 'money'. Fame/crime: 'stats.status.*'. Looks via Creation.npcLook(id).
   - Exposes window.NPCS = { list, byId, journalHTML(state), present(state), pronouns(id) }.
*/
(function () {
  'use strict';

  // ---------- Roster (names are fixed constants) ----------
  // schedule: array of {days:[0..6] (0=Mon), from, to (hours), loc}. First match wins; else `home`.
  const WEEKDAYS = [0, 1, 2, 3, 4];
  const WEEKEND = [5, 6];
  const ALL = [0, 1, 2, 3, 4, 5, 6];

  const ROSTER = [
    // Influential
    { id: 'eleanor', name: 'Eleanor Whitlock', group: 'Influential', age: 52, role: 'Mayor of Hollowbrook',
      defaults: { gender: 'vagina', appearance: 'female' },
      blurb: 'Silver-streaked hair pinned just so, and a smile that has won four elections.',
      likes: ['kindness', 'business'], gifts: { flowers: 2, coffee: 1, pastry: 1 },
      schedule: [ { days: WEEKDAYS, from: 8, to: 17, loc: 'town_hall' },
                  { days: WEEKDAYS, from: 17, to: 19, loc: 'town_square' },
                  { days: [6], from: 9, to: 12, loc: 'church' },
                  { days: [5], from: 10, to: 14, loc: 'market' } ] },
    { id: 'marcus', name: 'Marcus Vane', group: 'Influential', age: 34, role: 'Owner of Vane & Daughters general store',
      defaults: { gender: 'penis', appearance: 'male' },
      blurb: 'Rolled shirtsleeves, ledger under one arm, always calculating something.',
      likes: ['business'], gifts: { coffee: 2, pastry: 1 },
      schedule: [ { days: [0,1,2,3,4,5], from: 8, to: 18, loc: 'market' },
                  { days: ALL, from: 18, to: 20, loc: 'cafe' } ] },
    // Teachers
    { id: 'hart', name: 'Professor Adrian Hart', group: 'Teachers', age: 41, role: 'Literature professor',
      defaults: { gender: 'penis', appearance: 'male' },
      blurb: 'Ink on his cuffs and a habit of quoting poets mid-sentence.',
      likes: ['school'], gifts: { book: 3, coffee: 1 },
      schedule: [ { days: WEEKDAYS, from: 9, to: 15, loc: 'lecture_hall' },
                  { days: WEEKDAYS, from: 15, to: 18, loc: 'library' },
                  { days: WEEKEND, from: 10, to: 13, loc: 'cafe' } ] },
    { id: 'okafor', name: 'Coach Nia Okafor', group: 'Teachers', age: 38, role: 'Athletics coach and P.E. instructor',
      defaults: { gender: 'vagina', appearance: 'female' },
      blurb: 'Whistle on a lanyard, voice that carries across the whole field.',
      likes: ['physique'], gifts: { water: 1, pastry: -1, sandwich: 2 },
      schedule: [ { days: WEEKDAYS, from: 7, to: 16, loc: 'gym' },
                  { days: ALL, from: 6, to: 7, loc: 'park' },
                  { days: WEEKEND, from: 9, to: 11, loc: 'park' } ] },
    // Students
    { id: 'sam', name: 'Sam Rivera', group: 'Students', age: 19, role: 'Second-year art student',
      defaults: { gender: 'vagina', appearance: 'androgynous' },
      blurb: 'Paint under the fingernails, sketchbook always half-open.',
      likes: ['kindness', 'beauty'], gifts: { sketchbook: 3, flowers: 1, coffee: 1 },
      schedule: [ { days: WEEKDAYS, from: 9, to: 12, loc: 'lecture_hall' },
                  { days: WEEKDAYS, from: 12, to: 13, loc: 'cafeteria' },
                  { days: WEEKDAYS, from: 13, to: 17, loc: 'quad' },
                  { days: WEEKEND, from: 11, to: 17, loc: 'park' },
                  { days: ALL, from: 20, to: 23, loc: 'dorm_hall' } ] },
    { id: 'theo', name: 'Theo Lindqvist', group: 'Students', age: 21, role: 'Third-year, captain of the rowing team',
      defaults: { gender: 'penis', appearance: 'male' },
      blurb: 'Broad shoulders, easy grin, and an earnest streak he tries to hide.',
      likes: ['physique', 'socialite'], gifts: { sandwich: 2, water: 1, book: -1 },
      schedule: [ { days: WEEKDAYS, from: 6, to: 8, loc: 'docks' },
                  { days: WEEKDAYS, from: 9, to: 12, loc: 'lecture_hall' },
                  { days: WEEKDAYS, from: 12, to: 13, loc: 'cafeteria' },
                  { days: WEEKDAYS, from: 15, to: 18, loc: 'gym' },
                  { days: [4, 5], from: 20, to: 23, loc: 'town_square' } ] },
    // Neighbors
    { id: 'rosa', name: 'Rosa Delgado', group: 'Neighbors', age: 67, role: 'Retired nurse next door',
      defaults: { gender: 'vagina', appearance: 'female' },
      blurb: 'Tends tomatoes in her front yard and knows everyone\'s business, kindly.',
      likes: ['kindness'], gifts: { flowers: 2, pastry: 2 },
      schedule: [ { days: ALL, from: 7, to: 11, loc: 'residential' },
                  { days: [1, 3], from: 11, to: 13, loc: 'market' },
                  { days: [6], from: 9, to: 12, loc: 'church' } ] },
    { id: 'jules', name: 'Jules Park', group: 'Neighbors', age: 26, role: 'Night-shift baker who lives upstairs',
      defaults: { gender: 'penis', appearance: 'androgynous' },
      blurb: 'Flour in their hair at strange hours and a dry sense of humor.',
      likes: ['kindness', 'awareness'], gifts: { coffee: 3, book: 1 },
      schedule: [ { days: ALL, from: 0, to: 6, loc: 'cafe' },
                  { days: ALL, from: 14, to: 18, loc: 'residential' },
                  { days: WEEKEND, from: 18, to: 21, loc: 'park' } ] },
    // Outcasts
    { id: 'wren', name: 'Wren Cassidy', group: 'Outcasts', age: 22, role: 'College dropout who hangs around the alley',
      defaults: { gender: 'vagina', appearance: 'androgynous' },
      blurb: 'Patched jacket, sharp eyes, sharper tongue. Knows every shortcut in town.',
      likes: ['skulduggery', 'awareness'], gifts: { sandwich: 3, coffee: 1, flowers: -1 },
      schedule: [ { days: ALL, from: 10, to: 18, loc: 'alley' },
                  { days: ALL, from: 18, to: 23, loc: 'old_mill' } ] },
    { id: 'silas', name: 'Silas Grey', group: 'Outcasts', age: 29, role: 'Reclusive musician busking for change',
      defaults: { gender: 'penis', appearance: 'male' },
      blurb: 'Guitar case open at his feet, songs no one else seems to know.',
      likes: ['kindness', 'willpower'], gifts: { coffee: 2, sandwich: 2 },
      schedule: [ { days: ALL, from: 12, to: 18, loc: 'town_square' },
                  { days: ALL, from: 19, to: 23, loc: 'cafe' } ] },
    // Non-Human (subtle folklore)
    { id: 'kit', name: 'Kit Amberly', group: 'Non-Human', age: 'looks mid-20s', role: 'Florist with soft russet fox ears',
      defaults: { gender: 'vagina', appearance: 'female' },
      blurb: 'Her ears flick toward every sound. Locals stopped staring years ago.',
      likes: ['kindness', 'tending'], gifts: { flowers: -1, pastry: 2, book: 1, sketchbook: 1 },
      schedule: [ { days: [0,1,2,3,4,5], from: 9, to: 17, loc: 'florist' },
                  { days: ALL, from: 19, to: 22, loc: 'park' } ] },
    { id: 'morrow', name: 'Morrow', group: 'Non-Human', age: 'unclear, but an adult', role: 'Quiet farmhand with faintly glowing eyes',
      defaults: { gender: 'penis', appearance: 'androgynous' },
      blurb: 'Animals calm when Morrow walks by. Nobody remembers when they arrived.',
      likes: ['tending', 'awareness'], gifts: { water: 1, book: 2, sandwich: 1 },
      schedule: [ { days: ALL, from: 5, to: 14, loc: 'campus_farm' },
                  { days: ALL, from: 21, to: 24, loc: 'park' } ] },
    // Pet shop owner (Neighbors group: a fixture of the shopping centre)
    { id: 'hazel', name: 'Hazel Marsh', group: 'Neighbors', age: 28, role: 'Former zookeeper who now owns the Paws & Whiskers pet shop',
      defaults: { gender: 'vagina', appearance: 'female' },
      blurb: 'Quiet, with a cardigan full of fur, a pencil in her braid, and a parakeet named Pip on her shoulder.',
      likes: ['kindness', 'tending'], gifts: { pastry: 2, book: 2, coffee: 1, flowers: 1, sandwich: -1 },
      schedule: [ { days: [2], from: 13, to: 17, loc: 'vet_clinic' },
                  { days: WEEKDAYS, from: 9, to: 18, loc: 'pet_store' },
                  { days: WEEKEND, from: 8, to: 11, loc: 'park' } ] },
    // Hair stylist at Snip & Curl (Shopping Centre)
    { id: 'dee', name: 'Dee Fontaine', group: 'Influential', age: 36, role: 'Stylist and owner of the Snip & Curl Salon, and the town\'s best-informed gossip',
      defaults: { gender: 'vagina', appearance: 'female' },
      blurb: 'Bright lipstick, a different hair colour every month, and scissors that never stop moving while she talks.',
      likes: ['beauty', 'socialite'], gifts: { coffee: 2, flowers: 3, pastry: 1, book: -1 },
      schedule: [ { days: [1,2,3,4,5], from: 9, to: 18, loc: 'hair_salon' },
                  { days: [4, 5], from: 19, to: 23, loc: 'bar' },
                  { days: [6], from: 11, to: 14, loc: 'cafe' } ] },
  ];
  window.NNPC_ROSTER = ROSTER.map(n => ({ id: n.id, name: n.name, category: n.group, gender: n.defaults.gender, appearance: n.defaults.appearance, blurb: n.blurb }));
  const BY_ID = {};
  ROSTER.forEach(n => (BY_ID[n.id] = n));

  // ---------- Relationship stages ----------
  // reputation -100..100 (how they act toward you); affection 0..100 (romance meter)
  const STAGES = [
    { min: -100, key: 'hostile',  label: 'Hostile' },
    { min: -40,  key: 'cold',     label: 'Cold' },
    { min: -10,  key: 'neutral',  label: 'Neutral' },
    { min: 15,   key: 'friendly', label: 'Friendly' },
    { min: 40,   key: 'friend',   label: 'Friend' },
    { min: 70,   key: 'close',    label: 'Close friend' },
  ];
  const ROMANCE = ['None', 'Interested', 'Smitten', 'Dating', 'Partners'];

  // ---------- Helpers ----------
  const S = () => (window.G && window.G.state) || null;
  const ns = state => state.npcs;
  const loc = state => (state.world && state.world.location) || 'dorm_room';
  const time = () => window.G.time || { day: 1, hour: 8, minute: 0, weekday: 0 };
  const rel = (state, id) => ns(state).rel[id];
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const pick = arr => arr[Math.floor(Math.random() * arr.length)];
  const flag = (state, f) => !!ns(state).flags[f];
  const setFlag = (state, f, v = true) => (ns(state).flags[f] = v);

  function look(id) {
    if (window.Creation && window.Creation.npcLook) { const l = window.Creation.npcLook(id); if (l && l.appearance) return l; }
    return Object.assign({}, BY_ID[id].defaults);
  }
  function pronouns(id) {
    const a = look(id).appearance;
    if (a === 'male') return { sub: 'he', obj: 'him', pos: 'his', Sub: 'He', be: 'is' };
    if (a === 'female') return { sub: 'she', obj: 'her', pos: 'her', Sub: 'She', be: 'is' };
    return { sub: 'they', obj: 'them', pos: 'their', Sub: 'They', be: 'are' };
  }
  function stage(state, id) {
    const r = rel(state, id).rep;
    let s = STAGES[0];
    STAGES.forEach(x => { if (r >= x.min) s = x; });
    return s;
  }
  function whereIs(id) {
    const t = time();
    const n = BY_ID[id];
    const st = S();
    if (st && ns(st).dates[id] && ns(st).dates[id].active) return ns(st).dates[id].loc;
    for (const e of n.schedule) {
      if (e.days.includes(typeof t.weekdayIndex === 'number' ? t.weekdayIndex : t.weekday) && t.hour >= e.from && t.hour < e.to) return e.loc;
    }
    return 'home_' + id; // off-screen at their own home
  }
  function present(state) {
    const here = loc(state);
    return ROSTER.filter(n => whereIs(n.id) === here).map(n => n.id);
  }
  function changeRep(state, id, d, quiet) {
    const r = rel(state, id);
    const before = stage(state, id).key;
    r.rep = clamp(r.rep + d, -100, 100);
    if (!quiet && d) window.G.notify(`${BY_ID[id].name}: Reputation ${d > 0 ? '+' : ''}${d}`, d > 0 ? 'up' : 'down');
    const after = stage(state, id);
    if (after.key !== before) window.G.notify(`${BY_ID[id].name} now sees you as: ${after.label}`, 'info');
    if (id === 'hazel' && r.rep >= 70 && !ns(state).flags.exotics_unlocked) {
      ns(state).flags.exotics_unlocked = true;
      window.G.notify('Hazel trusts you now. The exotic animals in the back of Paws & Whiskers are open to you.', 'up');
      try { if (window.G.pets && window.G.pets.unlockExotics) window.G.pets.unlockExotics(); } catch (e) {}
      if (window.G.emit) { window.G.emit('exoticUnlocked', {}); window.G.emit('exoticsUnlocked', {}); }
    }
  }
  function changeAff(state, id, d) {
    const r = rel(state, id);
    r.aff = clamp(r.aff + d, 0, 100);
    if (d) window.G.notify(`${BY_ID[id].name}: Affection ${d > 0 ? '+' : ''}${d}`, d > 0 ? 'up' : 'down');
    if (r.romance === 0 && r.aff >= 25) { r.romance = 1; window.G.notify(`${BY_ID[id].name} seems interested in you.`, 'info'); }
    if (r.romance === 1 && r.aff >= 50) { r.romance = 2; window.G.notify(`${BY_ID[id].name} is clearly smitten.`, 'info'); unlockRomanceQuest(state, id); }
  }
  const nm = id => `<b>${BY_ID[id].name}</b>`;
  const safeChange = (path, d) => { try { window.G.change(path, d); } catch (e) {} };
  const money = state => typeof state.money === 'number' ? state.money : 0;

  // ---------- Items (quest + gifts) ----------
  const ITEMS = {
    flowers:    { name: 'bouquet of flowers', price: 12, shop: 'florist' },
    coffee:     { name: 'takeaway coffee',    price: 4,  shop: 'cafe' },
    pastry:     { name: 'pastry',             price: 3,  shop: 'cafe' },
    sandwich:   { name: 'sandwich',           price: 6,  shop: 'cafeteria' },
    water:      { name: 'bottle of water',    price: 2,  shop: 'market' },
    book:       { name: 'used paperback',     price: 8,  shop: 'library' },
    sketchbook: { name: 'sketchbook',         price: 10, shop: 'market' },
  };
  const has = (state, it) => (ns(state).items[it] || 0) > 0;
  const addItem = (state, it, n = 1) => { ns(state).items[it] = (ns(state).items[it] || 0) + n; };

  // ---------- Small talk pools (by stage) ----------
  const SMALLTALK = {
    eleanor: { cold: ['"I have a meeting." She doesn\'t look up.'],
               neutral: ['"Enjoying Hollowbrook? We\'re hoping to repave Elm Street by spring."', '"Do vote in the council election, won\'t you?"'],
               friendly: ['"Ah, you again. The town could use more people who actually show up."'],
               friend: ['"Between you and me, the budget meetings are the dullest hours of my life."'],
               close: ['She sighs and loosens her scarf. "It\'s nice to talk to someone who doesn\'t want something from me."'] },
    marcus:  { cold: ['"Buying, or browsing? Browsing\'s free. My time isn\'t."'],
               neutral: ['"Prices went up. Blame the supplier, not me."', '"If you ever want shifts, I pay fair. Cash."'],
               friendly: ['"You\'ve got a decent head for numbers, you know that?"'],
               friend: ['"My daughters run the place better than I do. Don\'t tell them."'],
               close: ['He actually laughs. "Come by after close sometime. I\'ll show you the real books."'] },
    hart:    { cold: ['"Office hours are posted on my door."'],
               neutral: ['"Have you done the reading? No? Ah, well. Neither had Keats, probably."', '"Words are the cheapest magic we have. Use them well."'],
               friendly: ['"Your last essay had a spark. Chase it."'],
               friend: ['"I wrote a novel once. Twelve publishers agreed it was a novel."'],
               close: ['He closes his book, keeping a finger in the page. "Tell me something true about yourself."'] },
    okafor:  { cold: ['"Laps. Now. Or don\'t talk to me."'],
               neutral: ['"Hydrate! You look like a raisin."', '"Tryouts are next month. Think about it."'],
               friendly: ['"Good form today. Keep that up."'],
               friend: ['"I nearly went pro, once. Knee said no."'],
               close: ['She tosses you a water bottle. "Sit. You\'ve earned a break."'] },
    sam:     { cold: ['Sam angles the sketchbook away from you.'],
               neutral: ['"Oh! Hi. Sorry, I was drawing that pigeon. It\'s very judgmental."', '"Do you ever look at the light at four in the afternoon? It goes all honey-colored."'],
               friendly: ['"I drew you yesterday. Is that weird? It\'s probably weird."'],
               friend: ['"Want to come to the student gallery opening? There\'s free cheese."'],
               close: ['Sam bumps your shoulder. "You\'re my favorite person to waste time with."'] },
    theo:    { cold: ['"Not now, mate."'],
               neutral: ['"You row? You\'ve got the shoulders for it. Maybe."', '"Party at the square Friday. Everyone\'s going."'],
               friendly: ['"Hey, you! Sit with us at lunch."'],
               friend: ['"Honestly? Captain is a lot of pressure. Everyone thinks it\'s just shouting."'],
               close: ['He goes quiet for once. "Thanks for actually listening."'] },
    rosa:    { cold: ['She tuts and goes back to her tomatoes.'],
               neutral: ['"Eat something green today, mijo. You look pale."', '"The Hendersons are fighting again. I didn\'t hear anything, of course."'],
               friendly: ['"Take a tomato. Take two. They\'re going to waste."'],
               friend: ['"Forty years of nursing. I\'ve seen worse than whatever you\'re worried about."'],
               close: ['"You\'re family now, you know. Don\'t argue."'] },
    jules:   { cold: ['"I\'ve been awake for nineteen hours. Use small words."'],
               neutral: ['"Croissants are just bread that went to finishing school."', '"The ceiling is thin. Please stop dropping things at 3 a.m."'],
               friendly: ['"Saved you a day-old cinnamon roll. Don\'t say I never gave you anything."'],
               friend: ['"I used to want to be a chef. Then I learned chefs have to talk to people."'],
               close: ['They rest their chin on their hand. "You\'re the best part of my weird schedule."'] },
    wren:    { cold: ['"Keep walking."'],
               neutral: ['"You lost? Everyone who comes down here is lost."', '"Watch your pockets in the square. Not everyone\'s as nice as me."'],
               friendly: ['"You\'re alright. For a student."'],
               friend: ['"I dropped out. Couldn\'t afford it, couldn\'t stand it. Mostly couldn\'t afford it."'],
               close: ['Wren doesn\'t say anything, but scoots over so you can sit on the crate too.'] },
    silas:   { cold: ['He keeps playing and doesn\'t look at you.'],
               neutral: ['"Got a request? I know three songs. Two of them are the same song."', '"Rain\'s coming. Strings always know."'],
               friendly: ['He nods at you mid-song and smiles.'],
               friend: ['"I had a band once. They got famous. I got this guitar."'],
               close: ['"I wrote this one about you," he says, and doesn\'t elaborate.'] },
    kit:     { cold: ['Her ears flatten slightly. "Can I help you find something?"'],
               neutral: ['"These are foxgloves. Pretty, but don\'t eat them."', 'Her ears swivel toward the door before the bell even rings.'],
               friendly: ['"I put aside a sprig of lavender for you. For sleeping."'],
               friend: ['"People used to ask about the ears. Now they just ask about the roses."'],
               close: ['Her tail, which you\'d swear you never noticed before, swishes once. "Stay a bit?"'] },
    morrow:  { cold: ['Morrow looks through you, as though you\'re weather.'],
               neutral: ['"The hens like you. That is uncommon."', '"Frost tonight. The ground told me."'],
               friendly: ['"You may help with the goats, if you wish. They are honest creatures."'],
               friend: ['"I came here a long time ago. I liked the quiet. I stayed."'],
               close: ['Their eyes glow a little brighter. "You are a good thing to have found."'] },
  };

  // ---------- Phase 2 content: dating lines, heart talks, bespoke romance quests ----------
  const DATING_LINES = {
    eleanor: ['She straightens your collar in passing. "Discreetly, darling. The whole council has eyes."', '"Dinner Thursday? I\'ll pretend it\'s a constituent meeting."'],
    marcus:  ['"I balanced the books in record time today. Turns out I work faster when I\'m looking forward to something."', 'He slips a wrapped chocolate into your pocket. "Inventory error. Don\'t tell anyone."'],
    hart:    ['"I found a sonnet that reminded me of you. Then I wrote a worse one myself."', 'He tucks a pressed leaf into your hand. "Bookmark. For whatever you\'re reading."'],
    okafor:  ['"You\'re my favorite distraction. Don\'t let it go to your head. Twenty push-ups."', 'She bumps your fist, then holds on to your hand a second longer.'],
    sam:     ['Sam shows you a page full of tiny drawings of your hands. "Don\'t laugh."', '"Every sketch I do lately has you sneaking into the corner."'],
    theo:    ['"The lads keep asking where I disappear to. I just smile."', 'He lifts you clean off your feet in a hug. "Missed you. It\'s been, what, six hours?"'],
    rosa:    ['"Come for Sunday dinner. And bring that smile, the one you save for me."', 'She pats your cheek. "Forty years I didn\'t think I\'d feel this silly again."'],
    jules:   ['"I named a bread after you. It\'s sweet and a bit unpredictable."', 'They lean against you, yawning. "Five minutes. Then I\'m human again."'],
    wren:    ['"You\'re late. I wasn\'t waiting. Okay, I was waiting."', 'Wren tosses you an apple. "Stole it. Kidding. Mostly."'],
    silas:   ['He plays the first bar of "your" song when he spots you across the square.', '"I bought new strings. First time in two years. Wonder why."'],
    kit:     ['Her ears turn pink at the tips. "I saved the best roses for you. Don\'t tell the customers."', 'She hums as she twines a flower into your hair.'],
    morrow:  ['"The goats asked about you. I told them you are mine. They seemed satisfied."', 'Morrow\'s eyes glow softly when you take their hand.'],
  };
  DATING_LINES.hazel = ['"I closed ten minutes early. Don\'t tell the hamsters." She laces her fingers with yours.', 'Pip lands on your shoulder now. Hazel calls that "basically a marriage proposal."'];
  DATING_LINES.dee = ['"I gave you the last appointment of the day on purpose. Obviously."', 'She tucks a strand of your hair behind your ear. "Perfect. I\'m very good."'];
  // Heart talks: unlocked at rep 15 / 40 / 70. Each: prompt, replies [{label, text, rep, aff}].
  const HEART = {
    eleanor: [
      { prompt: '"Do you think a town can be kind? Or only the people in it?"', replies: [
        { label: '"A town is just its people."', text: '"Then I\'d better keep meeting them." She seems moved.', rep: 5, aff: 2 },
        { label: '"Towns run on rules, not kindness."', text: '"Spoken like a councilman. I hate it." But she smiles.', rep: 1 },
        { label: '"Why, are you feeling unkind?"', text: 'She laughs, surprised. "Some days. Don\'t quote me."', rep: 3, aff: 3 } ] },
      { prompt: '"My daughter won\'t speak to me. She says I chose the town over her."', replies: [
        { label: '"Did you?"', text: 'A long silence. "Sometimes. Thank you for not lying to me."', rep: 6, aff: 2 },
        { label: '"Have you tried calling her?"', text: '"Every Sunday. Voicemail." She squeezes your hand.', rep: 4, aff: 3 },
        { label: 'Change the subject', text: 'She lets you, gratefully.', rep: 1 } ] },
      { prompt: '"If I didn\'t run again, would anyone even remember my name?"', replies: [
        { label: '"I would."', text: 'Her composure cracks into a real, unguarded smile.', rep: 6, aff: 6 },
        { label: '"Your name\'s on the library."', text: '"That was my grandfather." She laughs anyway.', rep: 3 },
        { label: '"Does it matter?"', text: '"...No. Maybe not." She looks lighter.', rep: 4, aff: 2 } ] } ],
    marcus: [
      { prompt: '"You think money makes people happy?"', replies: [
        { label: '"It helps."', text: '"Honest answer. I like that."', rep: 4 },
        { label: '"Time does. Money buys time."', text: 'He points his pen at you. "Now that\'s business sense."', rep: 5, aff: 2 },
        { label: '"Not you, apparently."', text: 'He snorts. "Fair hit."', rep: 2, aff: 3 } ] },
      { prompt: '"My wife left when the girls were small. I just... kept the store open. Every day."', replies: [
        { label: '"That took strength."', text: '"It took coffee." But he looks grateful.', rep: 5, aff: 3 },
        { label: '"Did you ever close for yourself?"', text: '"...Never. Huh."', rep: 6, aff: 2 },
        { label: 'Just listen', text: 'He talks for a long time. You listen. It helps.', rep: 5, aff: 4 } ] },
      { prompt: '"The girls want to expand. Second shop. I\'m scared stiff."', replies: [
        { label: '"Let them try."', text: '"You sound like their mother." A rueful smile.', rep: 5, aff: 3 },
        { label: '"Run the numbers with me."', text: 'You spend an hour over the ledger. He looks at you differently afterward.', rep: 6, aff: 5 },
        { label: '"Stay small. Stay safe."', text: '"Maybe." He doesn\'t sound convinced.', rep: 2 } ] } ],
    hart: [
      { prompt: '"What\'s the saddest line you\'ve ever read?"', replies: [
        { label: 'Quote something real', text: 'He closes his eyes. "Yes. That one." You\'ve impressed him.', rep: 5, aff: 2 },
        { label: '"Terms and conditions."', text: 'He actually wheezes laughing.', rep: 4, aff: 3 },
        { label: '"I don\'t really read."', text: 'He looks genuinely wounded.', rep: -2 } ] },
      { prompt: '"Sometimes I think I teach because I couldn\'t write."', replies: [
        { label: '"Or you write through us."', text: '"...That\'s a generous thought."', rep: 6, aff: 3 },
        { label: '"Write anyway."', text: '"Bossy." But he\'s smiling.', rep: 4, aff: 2 },
        { label: '"Teaching is enough."', text: '"Is it?" He seems unsure.', rep: 2 } ] },
      { prompt: '"Would you read something I wrote? Honestly read it?"', replies: [
        { label: '"I\'d be honored."', text: 'He hands you a creased notebook with trembling care.', rep: 6, aff: 6 },
        { label: '"Only if it rhymes."', text: '"It doesn\'t. Read it anyway."', rep: 4, aff: 3 },
        { label: '"Maybe later."', text: '"Of course." He tucks it away.', rep: 0 } ] } ],
    okafor: [
      { prompt: '"Why are you really at the gym? Be honest."', replies: [
        { label: '"To get stronger."', text: '"Good. Keep it simple."', rep: 4 },
        { label: '"Clears my head."', text: '"That\'s the real reason most people come."', rep: 5, aff: 2 },
        { label: '"You, maybe."', text: 'She raises an eyebrow. "Bold. Laps."', rep: 2, aff: 4 } ] },
      { prompt: '"Knee went at twenty-four. Watched my whole future limp off a field."', replies: [
        { label: '"You built a new one."', text: '"Took me five years to see that."', rep: 6, aff: 3 },
        { label: '"Do you miss it?"', text: '"Every single day."', rep: 5, aff: 2 },
        { label: '"Could be worse."', text: '"Could be." Her jaw tightens.', rep: -1 } ] },
      { prompt: '"I don\'t let people see me tired. You\'ve seen me tired."', replies: [
        { label: '"You\'re allowed to be."', text: 'She sits down beside you, shoulders finally loose.', rep: 6, aff: 6 },
        { label: '"I won\'t tell."', text: '"Better not." A rare grin.', rep: 4, aff: 3 },
        { label: '"Get some sleep, Coach."', text: '"Yes, ma\'am." Teasing, but warm.', rep: 4, aff: 2 } ] } ],
    sam: [
      { prompt: '"Do you think art matters? Like, actually?"', replies: [
        { label: '"It\'s the only thing that lasts."', text: 'Sam stares at you like you hung the moon.', rep: 5, aff: 3 },
        { label: '"It matters to you."', text: '"That\'s... kind of perfect."', rep: 5, aff: 2 },
        { label: '"Not really."', text: '"Oh." The sketchbook closes.', rep: -3 } ] },
      { prompt: '"My parents want me to switch to accounting. They pay my tuition."', replies: [
        { label: '"It\'s your life."', text: '"Easy to say." But they\'re thinking.', rep: 4, aff: 2 },
        { label: '"Could you minor in art?"', text: '"I hadn\'t thought of that." Relief floods their face.', rep: 6, aff: 3 },
        { label: '"Show them your work."', text: '"...Would you come with me?"', rep: 5, aff: 4 } ] },
      { prompt: '"I don\'t usually let people watch me draw. You\'re different."', replies: [
        { label: '"Different how?"', text: '"You look at things the way I do." They blush.', rep: 5, aff: 6 },
        { label: 'Sit closer', text: 'Sam leans into your shoulder as the pencil moves.', rep: 4, aff: 6 },
        { label: '"I\'ll go if you want."', text: '"No! Stay."', rep: 4, aff: 3 } ] } ],
    theo: [
      { prompt: '"Everyone thinks I\'ve got it easy. Captain, grades, whatever."', replies: [
        { label: '"Do you?"', text: '"Not even close." He exhales.', rep: 5, aff: 2 },
        { label: '"You make it look easy."', text: '"That\'s the trick, isn\'t it."', rep: 4, aff: 2 },
        { label: '"Poor you."', text: '"Yeah, okay." He goes quiet.', rep: -3 } ] },
      { prompt: '"My dad rowed for Hollowbrook. Won everything. I\'m just keeping up."', replies: [
        { label: '"Row for yourself."', text: '"Nobody\'s ever said that to me."', rep: 6, aff: 3 },
        { label: '"Beat his times."', text: 'His grin comes back. "Watch me."', rep: 4, aff: 2 },
        { label: 'Just listen', text: 'He talks about the water for an hour. He seems lighter.', rep: 5, aff: 3 } ] },
      { prompt: '"I\'ve never told anyone I\'m scared of graduating."', replies: [
        { label: '"I\'m scared too."', text: 'He laughs shakily and bumps your shoulder.', rep: 5, aff: 6 },
        { label: '"You\'ll be fine."', text: '"Yeah. Maybe." He holds your gaze.', rep: 4, aff: 3 },
        { label: '"Then let\'s make this year count."', text: '"Deal." He doesn\'t let go of your hand.', rep: 5, aff: 6 } ] } ],
    rosa: [
      { prompt: '"Do you call your mother, mijo?"', replies: [
        { label: '"Not enough."', text: '"Then call her tonight." A firm pat.', rep: 5 },
        { label: '"It\'s complicated."', text: '"It always is. Call anyway."', rep: 4, aff: 2 },
        { label: '"You\'re my mother here."', text: 'She swats you, delighted.', rep: 6, aff: 2 } ] },
      { prompt: '"Miguel planted half this garden. I keep it alive so he\'s still here."', replies: [
        { label: '"Tell me about him."', text: 'She talks until the sun goes low. Laughing, mostly.', rep: 6, aff: 3 },
        { label: '"He\'d be proud."', text: '"He\'d say the tomatoes are too small." She smiles.', rep: 5, aff: 2 },
        { label: 'Help her weed', text: 'You work side by side in comfortable silence.', rep: 6, aff: 3 } ] },
      { prompt: '"At my age people think you stop feeling things. They\'re wrong."', replies: [
        { label: '"I know they are."', text: 'Her eyes shine. She takes your hand.', rep: 5, aff: 6 },
        { label: '"What are you feeling?"', text: '"Foolish. Happy. Both." She laughs.', rep: 5, aff: 5 },
        { label: '"Of course."', text: 'She nods slowly.', rep: 3 } ] } ],
    jules: [
      { prompt: '"Do you ever feel like you\'re living in the wrong hours?"', replies: [
        { label: '"Every morning."', text: '"Solidarity." A tired fist bump.', rep: 4, aff: 2 },
        { label: '"Night\'s more honest."', text: '"Exactly." They look at you anew.', rep: 5, aff: 3 },
        { label: '"Just sleep normally."', text: '"Wow. Revolutionary."', rep: -1 } ] },
      { prompt: '"Culinary school kicked me out. I froze during the final service."', replies: [
        { label: '"Your bread is better than any chef\'s."', text: '"Flattery. Keep going."', rep: 5, aff: 3 },
        { label: '"Try again?"', text: '"Maybe. If someone came to watch."', rep: 5, aff: 2 },
        { label: 'Just listen', text: 'They talk, voice soft. You stay until the ovens beep.', rep: 6, aff: 3 } ] },
      { prompt: '"Stay up with me till the first batch is out? It\'s nice not being alone at 4 a.m."', replies: [
        { label: '"Of course."', text: 'You share the first warm loaf, shoulders touching.', rep: 5, aff: 6 },
        { label: '"Only if I get the first roll."', text: '"Deal." They grin.', rep: 4, aff: 4 },
        { label: '"I need sleep."', text: '"Yeah. Fair."', rep: 1 } ] } ],
    wren: [
      { prompt: '"Why do you keep coming down here?"', replies: [
        { label: '"I like the company."', text: '"Weirdo." But they don\'t tell you to leave.', rep: 5, aff: 2 },
        { label: '"Shortcut."', text: '"Liar." A smirk.', rep: 3 },
        { label: '"Worried about you."', text: '"Don\'t be." Quieter: "...Thanks."', rep: 5, aff: 3 } ] },
      { prompt: '"I sleep in the old mill some nights. Don\'t look at me like that."', replies: [
        { label: '"You can crash at mine."', text: 'Wren stares. "You mean that?"', rep: 6, aff: 3 },
        { label: 'Say nothing, offer food', text: 'They take it without a word. That\'s a thank you.', rep: 5, aff: 2 },
        { label: '"That\'s dangerous."', text: '"So is everything."', rep: 2 } ] },
      { prompt: '"I don\'t trust people. I sort of trust you. It\'s annoying."', replies: [
        { label: '"I won\'t waste it."', text: 'Wren nods once, and something unclenches.', rep: 6, aff: 6 },
        { label: '"Annoying how?"', text: '"Shut up." They\'re smiling.', rep: 4, aff: 5 },
        { label: '"You should trust more people."', text: '"Don\'t push it."', rep: 2 } ] } ],
    silas: [
      { prompt: '"Do you ever hear a song and feel homesick for a place you\'ve never been?"', replies: [
        { label: '"All the time."', text: 'He plays you one. It\'s exactly that feeling.', rep: 5, aff: 3 },
        { label: '"That\'s just nostalgia."', text: '"Just." He shakes his head, amused.', rep: 2 },
        { label: '"Play me one."', text: 'He does. A small crowd gathers.', rep: 5, aff: 2 } ] },
      { prompt: '"My old band signed without me. Took my songs, too."', replies: [
        { label: '"Write better ones."', text: '"Working on it." He taps his notebook.', rep: 5, aff: 2 },
        { label: '"That\'s theft."', text: '"Couldn\'t afford the lawyer."', rep: 4, aff: 2 },
        { label: 'Just listen', text: 'He talks between songs. You drop in your last coins.', rep: 6, aff: 3 } ] },
      { prompt: '"There\'s an open mic at the pub. I haven\'t played indoors in years."', replies: [
        { label: '"I\'ll be front row."', text: 'He looks at you like you\'ve handed him something precious.', rep: 6, aff: 6 },
        { label: '"You\'re ready."', text: '"You think so?" He believes you.', rep: 5, aff: 4 },
        { label: '"Busking suits you."', text: '"Maybe." He sounds disappointed.', rep: 1 } ] } ],
    kit: [
      { prompt: '"Do the ears bother you? Honestly."', replies: [
        { label: '"They\'re lovely."', text: 'They flick, pleased, and turn faintly pink.', rep: 5, aff: 3 },
        { label: '"I hadn\'t noticed."', text: '"Liar." But she\'s grinning.', rep: 4, aff: 2 },
        { label: '"Are they real?"', text: '"Rude." Ears flatten.', rep: -3 } ] },
      { prompt: '"My grandmother said our family made a bargain with the woods. I never asked what we gave."', replies: [
        { label: '"Want to find out?"', text: '"...Maybe. With you."', rep: 5, aff: 3 },
        { label: '"Some things should stay secret."', text: '"That\'s what she said, too."', rep: 4, aff: 2 },
        { label: '"Folklore\'s just stories."', text: 'Her tail twitches. "Is it?"', rep: 2 } ] },
      { prompt: '"Foxes mate for life. Did you know that?" She looks very interested in the roses.', replies: [
        { label: '"I like that."', text: 'Her ears swivel toward you and stay there.', rep: 5, aff: 7 },
        { label: '"Is that a hint?"', text: '"Maybe." Bright pink.', rep: 4, aff: 6 },
        { label: '"Neat fact."', text: '"...Yes. Neat."', rep: 1 } ] } ],
    morrow: [
      { prompt: '"Do you know what you are for?"', replies: [
        { label: '"Still figuring it out."', text: '"Good. Those who know are often wrong."', rep: 5, aff: 2 },
        { label: '"Helping people."', text: 'Morrow considers. "That is a fine purpose."', rep: 5, aff: 2 },
        { label: '"What are you for?"', text: '"Keeping. Things, places, creatures." A faint glow.', rep: 4, aff: 3 } ] },
      { prompt: '"I have watched this valley for longer than the college has stood. I do not age as you do."', replies: [
        { label: '"Is it lonely?"', text: '"Yes." The honesty is startling.', rep: 6, aff: 4 },
        { label: '"I don\'t care."', text: '"...That is kind. And strange."', rep: 5, aff: 3 },
        { label: '"That\'s impossible."', text: '"Many true things are."', rep: 2 } ] },
      { prompt: '"Stay through the frost with me tonight? The fields sing when they freeze."', replies: [
        { label: '"I\'d love to."', text: 'You listen together. The fields do sing, faintly.', rep: 5, aff: 7 },
        { label: '"Will you keep me warm?"', text: 'A long coat around your shoulders, and their hand in yours.', rep: 4, aff: 6 },
        { label: '"Too cold for me."', text: '"Another night, then."', rep: 1 } ] } ],
  };
  HEART.hazel = [
    { prompt: '"People think running a pet shop is all puppies. Mostly it\'s cleaning and worrying."', replies: [
      { label: '"What do you worry about?"', text: '"The ones nobody takes home." She glances at an old tabby in the corner.', rep: 5, aff: 2 },
      { label: '"Sounds worth it."', text: '"It is. Most days."', rep: 4 },
      { label: '"So it\'s a job like any other."', text: '"No," she says, firmly. "It isn\'t."', rep: -2 } ] },
    { prompt: '"I was a keeper at the city zoo for six years. I quit the day they sold the old animals to a roadside attraction."', replies: [
      { label: '"That took courage."', text: '"It took crying in a staff car park. But thank you."', rep: 6, aff: 3 },
      { label: '"Is that why you\'re so careful now?"', text: '"Every exotic I sell, I vet the buyer first. Including you, eventually."', rep: 5, aff: 2 },
      { label: 'Just listen', text: 'She talks while she cleans a tank. You hand her the sponge without being asked.', rep: 6, aff: 3 } ] },
    { prompt: '"I trust you with them. That\'s rarer than trusting people, for me."', replies: [
      { label: '"I won\'t let you down."', text: 'She smiles, really smiles, and Pip chirps in agreement.', rep: 6, aff: 6 },
      { label: '"Do you trust me with you?"', text: 'A long pause. Her cheeks go pink. "...Working on it."', rep: 4, aff: 7 },
      { label: '"They\'re easy to like."', text: '"So are you. Annoyingly."', rep: 5, aff: 4 } ] } ];
  HEART.dee = [
    { prompt: '"Everyone tells me their secrets. Nobody ever asks for mine."', replies: [
      { label: '"So tell me one."', text: '"I can\'t whistle. Thirty-six years. Tragic." She grins, but she looks pleased you asked.', rep: 5, aff: 2 },
      { label: '"Maybe they\'re scared to."', text: '"Smart people." A wink.', rep: 3 },
      { label: '"Do you want them to?"', text: 'The scissors pause. "...Sometimes."', rep: 5, aff: 3 } ] },
    { prompt: '"I was engaged once. He said I talked too much. I said he listened too little."', replies: [
      { label: '"He was wrong."', text: '"Oh, I know. But thank you."', rep: 5, aff: 3 },
      { label: '"I like hearing you talk."', text: 'She actually goes quiet, cheeks pink.', rep: 5, aff: 5 },
      { label: '"Maybe you both were."', text: '"Hm. Fair, honestly."', rep: 3 } ] },
    { prompt: '"I\'ve made this whole town look good for ten years. Nobody does my hair."', replies: [
      { label: '"Let me try."', text: 'You make a mess of it. She laughs until she cries, then refuses to fix it all day.', rep: 6, aff: 7 },
      { label: '"You look beautiful anyway."', text: '"Flatterer." She hides a smile behind the hairspray.', rep: 5, aff: 5 },
      { label: '"Hire someone."', text: '"Practical. Ugh."', rep: 1 } ] } ];
  // Bespoke romance quests for NPCs that previously used the generic dinner.
  // Step kinds: item (give in conversation), meet (location + hour window, scene text).
  const ROMANCE_PLUS = {
    dee: { title: 'Karaoke Night', offer: '"Friday, the Lantern, karaoke. I need a duet partner who won\'t embarrass me. Or will, adorably. Bring me flowers, I deserve them."',
      summary: 'Dee wants you as her duet partner at the Lantern Pub\'s karaoke night. Bring her flowers.',
      steps: [ { kind: 'item', item: 'flowers', text: 'Bring Dee a bouquet of flowers.' },
               { kind: 'meet', loc: 'bar', from: 20, to: 23, text: 'Meet Dee at the Lantern Pub between 20:00 and 23:00.',
                 scene: 'Dee picks the cheesiest love song in the binder. You are both terrible, and the whole pub sings along anyway. Outside under the lantern, breathless and laughing, she pulls you close. "For the record, I never sing with anyone," she says, and kisses you.' } ] },
    hazel: { title: 'Wings', offer: '"Someone brought in a barn owl with a hurt wing. I can\'t keep it at the shop. Would you help me nurse it? Bring a book on owls, if the library has one, and meet me in the woods when it\'s ready to fly."',
      summary: 'Hazel is nursing an injured barn owl. Bring her a book to help, then help release it in Hollow Woods at dusk.',
      steps: [ { kind: 'item', item: 'book', text: 'Bring Hazel a used paperback from the library (an owl guide).' },
               { kind: 'meet', loc: 'woods', from: 18, to: 21, text: 'Meet Hazel in Hollow Woods between 18:00 and 21:00 to release the owl.',
                 scene: 'The owl blinks at you from its box, then lifts into the dusk, pale and silent, and is gone into the trees. Hazel lets out a breath she seems to have held for weeks. "I never get to see the ending," she whispers. "Thank you for being here for it." She takes your hand, and then she kisses you, quietly, as the woods go dark.' } ] },
    eleanor: { title: 'After the Council Meeting', offer: '"The council runs late Thursday. Walk me home after? And bring flowers for the town hall vase. Our little secret."',
      summary: 'Eleanor asked you to bring flowers and walk her home after a late council meeting.',
      steps: [ { kind: 'item', item: 'flowers', text: 'Bring Eleanor a bouquet of flowers.' },
               { kind: 'meet', loc: 'town_hall', from: 19, to: 22, text: 'Meet Eleanor at the town hall between 19:00 and 22:00.',
                 scene: 'The council chamber empties. Eleanor kicks off her heels and walks barefoot beside you down the lamplit street. At her gate she hesitates, then kisses you, quick and certain. "Don\'t tell the newspaper."' } ] },
    marcus: { title: 'Closing Time', offer: '"Stay after close Saturday. I\'ll cook. I\'m a terrible cook. Bring coffee to compensate."',
      summary: 'Marcus invited you for a homemade dinner at the store after closing. Bring coffee.',
      steps: [ { kind: 'item', item: 'coffee', text: 'Bring Marcus a takeaway coffee.' },
               { kind: 'meet', loc: 'market', from: 18, to: 21, text: 'Meet Marcus at the market between 18:00 and 21:00.',
                 scene: 'Pasta on a camp stove between the shelves, slightly burnt. Marcus laughs at himself for the first time you\'ve seen. When he walks you to the door, he kisses you under the flickering OPEN sign he forgot to turn off.' } ] },
    hart: { title: 'Margins', offer: '"There\'s a first edition reading at the library after hours. I\'d like you there. Bring something you\'d want me to read."',
      summary: 'Professor Hart invited you to an after-hours reading at the library. Bring a book.',
      steps: [ { kind: 'item', item: 'book', text: 'Bring Professor Hart a used paperback.' },
               { kind: 'meet', loc: 'library', from: 19, to: 23, text: 'Meet Professor Hart at the library between 19:00 and 23:00.',
                 scene: 'He reads aloud from your paperback by lamplight, voice low, stopping to scribble in the margins. When the last page turns, he looks up and says, very quietly, "I\'ve run out of words." You kiss him so he doesn\'t need any.' } ] },
    okafor: { title: 'Night Run', offer: '"Track, after dark. No students, no whistles. Just a run. Bring water, I always forget."',
      summary: 'Coach Okafor invited you for a private night run. Bring water.',
      steps: [ { kind: 'item', item: 'water', text: 'Bring Coach Okafor a bottle of water.' },
               { kind: 'meet', loc: 'gym', from: 20, to: 22, text: 'Meet Coach Okafor at the gym between 20:00 and 22:00.',
                 scene: 'Laps under the floodlights, matching stride for stride. She wins, obviously. Breathless and laughing on the grass afterward, she rolls over and kisses you. "Don\'t slow down on my account."' } ] },
    rosa: { title: 'Miguel\'s Recipe', offer: '"I want to cook Miguel\'s mole again. I haven\'t since he passed. Help me? Bring something sweet."',
      summary: 'Rosa wants to cook her late husband\'s recipe again with you. Bring a pastry.',
      steps: [ { kind: 'item', item: 'pastry', text: 'Bring Rosa a pastry.' },
               { kind: 'meet', loc: 'residential', from: 17, to: 20, text: 'Meet Rosa at Elm Row between 17:00 and 20:00.',
                 scene: 'Three hours, forty ingredients, one old radio. She cries a little and laughs more. Over the dishes she takes your face in her flour-dusted hands and kisses you, soft and brave.' } ] },
    jules: { title: 'First Batch', offer: '"There\'s a quiet hour at the bakery before dawn. Come be there for it. Bring coffee. Obviously."',
      summary: 'Jules asked you to keep them company at the bakery before dawn. Bring coffee.',
      steps: [ { kind: 'item', item: 'coffee', text: 'Bring Jules a takeaway coffee.' },
               { kind: 'meet', loc: 'cafe', from: 3, to: 6, text: 'Meet Jules at the café between 03:00 and 06:00.',
                 scene: 'The ovens hum. Jules shows you how to braid dough, hands over yours. The first batch comes out golden, and so does the sky. They kiss you tasting of cinnamon. "Best shift ever."' } ] },
    silas: { title: 'Open Mic', offer: '"Open mic at the Lantern. I\'m going to play. Be there, or I\'ll lose my nerve."',
      summary: 'Silas is playing the open mic at the Lantern Pub and wants you there.',
      steps: [ { kind: 'meet', loc: 'bar', from: 20, to: 23, text: 'Meet Silas at the Lantern Pub between 20:00 and 23:00.',
                 scene: 'His hands shake on the first chord, then steady. The last song is new: it\'s about you, unmistakably. The pub applauds. Outside, under the lantern, he kisses you like he\'s been rehearsing it for weeks.' } ] },
    morrow: { title: 'First Frost', offer: '"The first frost comes soon. The fields will sing. I would hear it with you."',
      summary: 'Morrow wants you to listen to the frost sing over the farm fields at night.',
      steps: [ { kind: 'meet', loc: 'campus_farm', from: 21, to: 24, text: 'Meet Morrow at the campus farm after 21:00.',
                 scene: 'Frost spreads across the furrows with a sound like distant bells. Morrow\'s eyes glow in the dark. "In all my years, I have never shared this," they say, and kiss you, cold and gentle.' } ] },
  };


  // ---------- Pet reactions (hooks into Jimmy's G.pets once published) ----------
  // like: +2 adores, +1 likes, 0 neutral, -1 dislikes. Optional per-species overrides.
  const PET_REACT = {
    eleanor: { like: 1, line: 'She crouches, pearls swinging. "And who is this distinguished citizen?"' },
    marcus:  { like: -1, line: '"Not in the store. Health code. Wait, is that thing shedding on my stock?"' },
    hart:    { like: 1, line: '"A familiar! Every scholar needs one." He offers a solemn knuckle to sniff.', species: { cat: { like: 2, line: '"A cat. Of course. T.S. Eliot would approve." He looks delighted.' } } },
    okafor:  { like: 1, line: '"Cute. Is it getting enough exercise?"', species: { dog: { like: 2, line: '"Now that\'s a running partner. Bring them to the park at six."' } } },
    sam:     { like: 2, line: 'Sam gasps. "Hold still, both of you. I need to draw this immediately."' },
    theo:    { like: 1, line: '"Ha! Who\'s a good one? Look at that face."', species: { dog: { like: 2, line: 'Theo is on the ground wrestling with your dog in under three seconds.' } } },
    rosa:    { like: 1, line: '"Ay, precioso. Is it eating enough? You both look thin."', species: { parrot: { like: 2, line: '"A parrot! My Miguel had one. It only knew swear words." She cackles.' } } },
    jules:   { like: 1, line: '"Keep it away from the flour. Actually, no, come here, little one."' },
    wren:    { like: 1, line: 'Wren pretends not to care, then quietly slips it a bit of sandwich.', species: { ferret: { like: 2, line: '"A ferret? Okay. You just became forty percent cooler."' } } },
    silas:   { like: 1, line: 'He plays a little three-note tune just for your pet.' },
    kit:     { like: 2, line: 'Kit\'s ears perk straight up. Your pet goes very still, then trots right over to her, perfectly calm.', species: { rabbit: { like: 1, line: 'The rabbit freezes. Kit\'s ears droop. "Sorry. Old instincts on both sides."' } } },
    hazel:   { like: 2, line: 'Hazel checks your pet\'s ears, teeth, and coat in about four seconds flat. "Healthy. Good. You\'re doing right by them."' },
    dee:     { like: 1, line: '"Oh, look at this little face! Do they need a trim? I do dogs on Tuesdays. I don\'t, but I would."' },
    morrow:  { like: 2, line: 'Morrow kneels. Your pet settles instantly, as if listening to something you can\'t hear.' },
  };
  function petWith() {
    const P = window.G && window.G.pets;
    if (!P) return null;
    try {
      const f = typeof P.following === 'function' ? P.following() : (typeof P.active === 'function' ? P.active() : null);
      const pet = Array.isArray(f) ? f[0] : f;
      return pet && pet.species ? pet : null;
    } catch (e) { return null; }
  }
  function petReaction(state, id) {
    const r = rel(state, id), t = time();
    let extra = '';
    if (id === 'hazel' && r.exoticDay !== t.day && window.G.pets && window.G.pets.list) {
      const ex = ['hedgehog', 'chinchilla', 'tortoise', 'axolotl', 'cornsnake', 'sugarglider', 'sugar_glider'];
      const cared = window.G.pets.list().filter(p => ex.includes(p.species) && !p.runaway && (p.happiness === undefined || p.happiness >= 500));
      if (cared.length) { r.exoticDay = t.day; changeRep(state, 'hazel', 2); extra = `<p>Hazel asks after ${cared[0].name || 'your ' + cared[0].species} and nods at your answers. "You're looking after them properly. Good."</p>`; }
    }
    const pet = petWith(); if (!pet) return extra;
    if (r.petDay === t.day) return extra;
    r.petDay = t.day;
    const base = PET_REACT[id]; const sp = (base.species && base.species[pet.species]) || base;
    const like = sp.like;
    if (like > 0) changeRep(state, id, like * 2);
    if (like < 0) changeRep(state, id, -2);
    if (like > 0) { try { if (window.G.pets.care) window.G.pets.care(pet.id, 'bond', like * 5); else if (window.G.pets.addBond) window.G.pets.addBond(pet.id, like * 5); } catch (e) {} }
    return extra + `<p><i>${pet.name || 'Your ' + pet.species}</i>: ${sp.line}</p>`;
  }

  SMALLTALK.hazel = {
    cold: ['"If you\'re just here to tap on the glass, the door\'s behind you."'],
    neutral: ['"Kibble\'s on aisle two. Don\'t buy the cheap stuff, it\'s mostly sawdust."', 'Her parakeet, Pip, eyes you suspiciously. "He\'s deciding if he likes you."'],
    friendly: ['"Pip said hello to you. He never does that. I\'m a little jealous."', '"Every animal in here came from somewhere. I like to know where."'],
    friend: ['"Want to help with feeding time? The guinea pigs riot if I\'m late."'],
    close: ['She leans on the counter, chin in hand. "You\'re good with them, you know. They can tell."'] };
  SMALLTALK.dee = {
    cold: ['"Appointments only, sweetie. And I\'m booked. Forever."'],
    neutral: ['"Sit, sit. Oh, who cut this last? Never mind. I\'ll fix it."', '"You didn\'t hear it from me, but the Lantern is watering down the cider."'],
    friendly: ['"You have great hair. Criminally under-styled, but great."', '"I know everything that happens in this town. Hair makes people talk."'],
    friend: ['"I\'ve been doing hair since I was sixteen. My mum\'s kitchen, a towel, and a lot of crying clients."'],
    close: ['She spins your chair to face her. "Forget the gossip. How are YOU actually doing?"'] };
  // ---------- Phase 3: birthdays, condition reactions, invitations, jealousy, breakups ----------
  const BIRTHDAYS = { // season + day of season (28-day seasons)
    eleanor: ['Winter', 3], marcus: ['Spring', 14], hart: ['Autumn', 21], okafor: ['Summer', 9], sam: ['Spring', 2],
    theo: ['Summer', 25], rosa: ['Winter', 18], jules: ['Autumn', 7], wren: ['Winter', 27], silas: ['Autumn', 13],
    kit: ['Spring', 20], morrow: ['Winter', 1], hazel: ['Summer', 16], dee: ['Spring', 26] };
  function isBirthday(id) {
    const b = BIRTHDAYS[id], t = time();
    return !!b && t.season === b[0] && t.dayOfSeason === b[1];
  }
  function conditionLine(state, id) {
    const r = rel(state, id), t = time();
    if (r.condDay === t.day) return '';
    const st = state.stats || {}, needs = st.needs || {}, cl = st.clothing || {}, stat = st.status || {};
    const lines = [];
    const wet = Math.max(cl.upperWetness || 0, cl.lowerWetness || 0);
    const warm = rel(state, id).rep >= 15;
    if (wet >= 60) lines.push(warm ? `${pronouns(id).Sub} hand${pronouns(id).be === 'are' ? '' : 's'} you a napkin. "You're soaked. Go get dry before you catch something."` : 'They glance at your damp clothes and edge away slightly.');
    else if ((needs.fatigue || 0) >= 750) lines.push(warm ? '"You look exhausted. Have you slept at all?"' : '"Rough night?" It doesn\'t sound like sympathy.');
    else if ((needs.stress || 0) >= 750 && warm) lines.push('"Hey. You seem wound tight. Want to talk about it?"');
    else if ((stat.crime || 0) >= 300 && ['eleanor', 'hart', 'okafor', 'rosa', 'marcus'].includes(id)) { lines.push('"I\'ve heard some things about you lately. I hope they aren\'t true."'); changeRep(state, id, -2, true); }
    else if ((stat.crime || 0) >= 300 && id === 'wren') lines.push('"Heard you\'ve been busy. Careful. People talk."');
    else if ((stat.kindnessFame || 0) >= 300 && warm) lines.push('"People keep telling me how kind you\'ve been. It\'s nice to hear."');
    if (!lines.length) return '';
    r.condDay = t.day;
    return `<p>${nm(id)}: ${lines[0]}</p>`;
  }
  function birthdayGreet(state, id) {
    if (!isBirthday(id)) return '';
    const known = flag(state, 'bday_' + id);
    return known ? `<p>It's ${BY_ID[id].name}'s birthday today. A gift would mean a lot.</p>` : `<p>${nm(id)} seems unusually cheerful today.</p>`;
  }
  function partners(state) { return ROSTER.filter(n => rel(state, n.id).romance >= 3).map(n => n.id); }
  function dailySocial(state) {
    const t = time(), N = ns(state);
    N.invites = N.invites || {};
    // Missed invitations
    for (const id in N.invites) {
      const iv = N.invites[id];
      if (!iv.done && iv.day < t.day) { changeRep(state, id, -3); window.G.notify(`You missed ${BY_ID[id].name}'s invitation.`, 'down'); delete N.invites[id]; }
      else if (iv.done && iv.day < t.day) delete N.invites[id];
    }
    // New invitation (at most one a day) from someone who likes you
    const friends = ROSTER.filter(n => rel(state, n.id).met && rel(state, n.id).rep >= 40 && !N.invites[n.id]);
    if (friends.length && Math.random() < 0.25) {
      const n = pick(friends);
      const spots = { eleanor: 'cafe', marcus: 'bar', hart: 'library', okafor: 'park', sam: 'park', theo: 'town_square', rosa: 'residential',
        jules: 'cafe', wren: 'alley', silas: 'town_square', kit: 'park', morrow: 'campus_farm', hazel: 'park', dee: 'bar' };
      const hour = t.isWeekend ? pick([11, 14, 17]) : pick([17, 18, 19]);
      N.invites[n.id] = { day: t.day, loc: spots[n.id] || 'cafe', hour, done: false };
      const place = (window.G.world && window.G.world.location && window.G.world.location(spots[n.id])) ? window.G.world.location(spots[n.id]).name : spots[n.id];
      window.G.notify(`A note from ${n.name}: "Meet me at ${place} around ${hour}:00 today?"`, 'info');
    }
    // Jealousy: dating more than one person risks someone finding out
    const ps = partners(state);
    if (ps.length > 1) {
      const deeBoost = rel(state, 'dee').met ? 0.05 : 0;
      ps.forEach(id => {
        if (Math.random() < 0.08 + deeBoost) {
          const r = rel(state, id);
          window.G.notify(`${BY_ID[id].name} has heard you're seeing someone else.`, 'down');
          changeRep(state, id, -8); r.aff = clamp(r.aff - 15, 0, 100);
          window.G.notify(`${BY_ID[id].name}: Affection -15`, 'down');
          if (r.aff < 30) { r.romance = 1; window.G.notify(`${BY_ID[id].name} has ended things with you.`, 'down'); }
        }
      });
    }
  }
  function inviteActions(state) {
    const out = [], t = time(), here = loc(state), N = ns(state);
    for (const id in (N.invites || {})) {
      const iv = N.invites[id];
      if (iv.done || iv.day !== t.day || here !== iv.loc || t.hour < iv.hour || t.hour >= iv.hour + 2) continue;
      out.push({ label: `Meet ${BY_ID[id].name} (invitation)`, run(s) {
        iv.done = true; changeRep(s, id, 6); if (rel(s, id).romance >= 1) changeAff(s, id, 3); safeChange('stats.needs.stress', -40);
        return { text: `${nm(id)} waves you over. ${pick(['You spend an easy hour together, talking about nothing and everything.', 'They had been hoping you would come. It shows.', 'Time goes by faster than either of you notices.'])}`, minutes: 60 };
      } });
    }
    return out;
  }

  // ---------- Dialogue trees (topics) ----------
  // Each topic: { label, need(state,id)->bool, run(state,id)->{text,minutes} }
  const TOPICS = [
    { label: 'Chat', need: () => true, run(state, id) {
        const st = stage(state, id).key;
        const pool = (rel(state, id).romance >= 3 && DATING_LINES[id]) ? DATING_LINES[id] : (SMALLTALK[id][st] || SMALLTALK[id].neutral);
        const r = rel(state, id);
        const t = time();
        let gain = 0;
        if (r.lastChatDay !== t.day) { gain = st === 'hostile' ? 1 : 3; r.lastChatDay = t.day; }
        if (gain) changeRep(state, id, gain);
        return { text: `${nm(id)}: ${pick(pool)}`, minutes: 10 };
    } },
    { label: 'Ask about them', need: (s, id) => rel(s, id).rep >= -10, run(state, id) {
        const n = BY_ID[id], p = pronouns(id);
        rel(state, id).known = true;
        const b = BIRTHDAYS[id]; let bt = '';
        if (b && rel(state, id).rep >= 15) { setFlag(state, 'bday_' + id); bt = ` Their birthday is day ${b[1]} of ${b[0]}.`; }
        return { text: `${nm(id)} is ${n.role.toLowerCase()}. ${n.blurb} ${p.Sub} ${p.be} ${typeof n.age === 'number' ? n.age : n.age}.${bt}`, minutes: 10 };
    } },
    { label: 'Compliment', need: (s, id) => rel(s, id).rep >= 0, run(state, id) {
        const r = rel(state, id), t = time();
        if (r.lastCompDay === t.day) { changeRep(state, id, -2); return { text: `${nm(id)} gives you a look. "Twice in one day? Laying it on a bit thick."`, minutes: 5 }; }
        r.lastCompDay = t.day;
        changeRep(state, id, 2);
        if (r.rep >= 15) changeAff(state, id, 3);
        return { text: `You tell ${nm(id)} something nice and mean it. ${pronouns(id).Sub} ${pronouns(id).be === 'are' ? 'look' : 'looks'} pleased.`, minutes: 5 };
    } },
    { label: 'Flirt', need: (s, id) => rel(s, id).rep >= 15, run(state, id) {
        const r = rel(state, id), t = time();
        if (r.lastFlirtDay === t.day) return { text: `${nm(id)} laughs. "Save some charm for tomorrow."`, minutes: 5 };
        r.lastFlirtDay = t.day;
        const chance = 0.35 + r.rep / 200 + r.aff / 300;
        if (Math.random() < chance) {
          changeAff(state, id, 5);
          return { text: `You flirt with ${nm(id)}. ${pick(['A slow smile.', 'They duck their head, cheeks warm.', 'A laugh, and a lingering look.', '"Oh, is that how it is?"'])}`, minutes: 10 };
        }
        changeRep(state, id, -3);
        safeChange('stats.needs.stress', 20);
        return { text: `You flirt with ${nm(id)}. It lands badly. An awkward silence settles.`, minutes: 10 };
    } },
    { label: 'Talk about something real', need: (s, id) => { const k = rel(s, id).heart || 0; return HEART[id] && k < 3 && rel(s, id).rep >= [15, 40, 70][k] && rel(s, id).heartDay !== time().day; }, heart: true },
    { label: 'Give a gift', need: (s, id) => Object.keys(ITEMS).some(it => has(s, it)), sub: true },
    { label: 'Ask on a date', need: (s, id) => rel(s, id).romance >= 3, run(state, id) {
        const t = time();
        const d = ns(state).dates;
        if (d[id] && d[id].day === t.day) return { text: `"We already saw each other today, silly."`, minutes: 5 };
        const spot = pick(['cafe', 'park', 'main_street']);
        d[id] = { day: t.day, loc: spot, active: false, hour: Math.min(21, Math.max(t.hour + 2, 18)) };
        return { text: `${nm(id)} lights up. "Meet me at the ${(window.G.world && window.G.world.location(spot) ? window.G.world.location(spot).name : spot)} around ${d[id].hour}:00?"`, minutes: 10 };
    } },
    { label: 'End things', need: (s, id) => rel(s, id).romance >= 3, run(state, id) {
        const r = rel(state, id); r.romance = 1; r.aff = 20; changeRep(state, id, -15);
        window.G.notify(`You and ${BY_ID[id].name} are no longer together.`, 'down');
        safeChange('stats.needs.stress', 120);
        return { text: `You tell ${nm(id)} it's over. ${pick(['They nod slowly, eyes shining, and don\'t say anything at all.', '"I had a feeling," they say quietly.', 'There is a long, awful silence.'])}`, minutes: 20 };
    } },
    { label: 'Insult', need: () => true, run(state, id) {
        changeRep(state, id, -10);
        if (rel(state, id).aff > 0) changeAff(state, id, -8);
        return { text: `You say something cutting to ${nm(id)}. ${pick(['They stare at you, hurt.', 'Their face closes like a door.', '"Wow. Okay."'])}`, minutes: 5 };
    } },
    { label: 'Say goodbye', need: () => true, run(state, id) {
        ns(state).talking = null;
        return { text: `You say goodbye to ${nm(id)}.`, minutes: 1 };
    } },
  ];

  // ---------- Quests ----------
  // step: { text, done(state)->bool }   Journal shows the first undone step.
  const QUESTS = {
    // Regular quests
    rosa_meds: { giver: 'rosa', title: 'Rosa\'s Prescription', minRep: 0,
      offer: '"Would you be a dear and pick up my blood pressure pills from the market? My hip won\'t make it today."',
      summary: 'Rosa needs her medication picked up from the market pharmacy counter.',
      steps: [ { text: 'Collect Rosa\'s prescription at the market.', done: s => flag(s, 'rosa_meds_got') },
               { text: 'Bring the pills back to Rosa.', done: s => flag(s, 'rosa_meds_given') } ],
      reward: s => { changeRep(s, 'rosa', 12); safeChange('money', 10); safeChange('stats.status.kindnessFame', 5); } },
    hart_book: { giver: 'hart', title: 'The Overdue Volume', minRep: 0,
      offer: '"I\'ve lost my annotated Dickinson. I suspect the library. Would you look?"',
      summary: 'Professor Hart misplaced his annotated poetry collection, probably at the library.',
      steps: [ { text: 'Search the library for Hart\'s book.', done: s => flag(s, 'hart_book_got') },
               { text: 'Return the book to Professor Hart.', done: s => flag(s, 'hart_book_given') } ],
      reward: s => { changeRep(s, 'hart', 12); safeChange('school.grades.lit', 5); } },
    marcus_stock: { giver: 'marcus', title: 'Inventory Day', minRep: 5,
      offer: '"I need someone to count crates for two hours. Thirty dollars. Interested?"',
      summary: 'Marcus will pay you to help count stock at the store.',
      steps: [ { text: 'Help Marcus with inventory at the market (2 hours).', done: s => flag(s, 'marcus_stock_done') } ],
      reward: s => { changeRep(s, 'marcus', 8); safeChange('money', 30); safeChange('stats.status.businessFame', 5); } },
    wren_parcel: { giver: 'wren', title: 'No Questions Asked', minRep: 10,
      offer: '"Need a parcel taken to the old mill. Don\'t open it. Don\'t get seen."',
      summary: 'Wren asked you to carry a mysterious parcel to the Old Mill, quietly.',
      steps: [ { text: 'Take Wren\'s parcel to the Old Mill after dark (20:00 or later).', done: s => flag(s, 'wren_parcel_done') } ],
      reward: s => { changeRep(s, 'wren', 15); safeChange('money', 25); safeChange('stats.status.crime', 5); } },
    okafor_laps: { giver: 'okafor', title: 'Morning Discipline', minRep: 0,
      offer: '"Show up at the park at six, three mornings. Prove you\'re serious."',
      summary: 'Coach Okafor challenged you to train at the park at 6 a.m. on three mornings.',
      steps: [ { text: 'Run laps at the park between 6:00 and 7:00 (3 times).', done: s => (ns(s).counters.okafor_laps || 0) >= 3 } ],
      reward: s => { changeRep(s, 'okafor', 15); (window.G.stats && window.G.stats.train) ? window.G.stats.train('physique', 20) : safeChange('stats.core.physique.value', 20); } },

    hazel_ferret: { giver: 'hazel', title: 'The Escape Artist', minRep: 10,
      offer: '"Biscuit got out. Again. He\'s a ferret, he\'s brown, he\'s an idiot. Check the shopping centre atrium and the park?"',
      summary: 'Biscuit the ferret escaped from Hazel\'s pet shop. He was last seen heading for the atrium or the park.',
      steps: [ { text: 'Search the shopping centre atrium or the park for Biscuit.', done: s => flag(s, 'hazel_ferret_got') },
               { text: 'Bring Biscuit back to Hazel.', done: s => flag(s, 'hazel_ferret_given') } ],
      reward: s => { changeRep(s, 'hazel', 15); safeChange('stats.status.kindnessFame', 3); if (window.G.stats && window.G.stats.trainSkill) { try { window.G.stats.trainSkill('tending', 20); } catch (e) {} } } },

    // Romance quests (unlock at Smitten; completing one starts dating)
    rom_sam: { giver: 'sam', title: 'Sit for a Portrait', romance: true,
      offer: '"Would you... sit for me? For a portrait. In the park, at golden hour."',
      summary: 'Sam wants to paint your portrait in the park at golden hour.',
      steps: [ { text: 'Buy Sam a new sketchbook.', done: s => flag(s, 'rom_sam_gift') },
               { text: 'Meet Sam at the park between 16:00 and 19:00 and sit for the portrait.', done: s => flag(s, 'rom_sam_sat') } ] },
    rom_theo: { giver: 'theo', title: 'Dawn on the Water', romance: true,
      offer: '"Come out on the boat with me. Just us. Docks, six a.m. Before anyone else."',
      summary: 'Theo invited you rowing at dawn, just the two of you.',
      steps: [ { text: 'Meet Theo at the docks between 6:00 and 8:00.', done: s => flag(s, 'rom_theo_row') } ] },
    rom_kit: { giver: 'kit', title: 'The Moonflower', romance: true,
      offer: '"There\'s a moonflower that only opens one night a month. Find me in the park after dark?"',
      summary: 'Kit wants to show you a rare moonflower blooming in the park at night.',
      steps: [ { text: 'Ask Rosa about the old moonflower patch.', done: s => flag(s, 'rom_kit_rosa') },
               { text: 'Meet Kit in the park after 20:00.', done: s => flag(s, 'rom_kit_bloom') } ] },
    rom_wren: { giver: 'wren', title: 'Rooftop', romance: true,
      offer: '"I know a roof with the best view in town. Nobody else knows it. Bring food."',
      summary: 'Wren wants to show you a secret rooftop. Bring something to eat.',
      steps: [ { text: 'Bring a sandwich.', done: s => has(s, 'sandwich') || flag(s, 'rom_wren_food') },
               { text: 'Meet Wren in the alley after 19:00.', done: s => flag(s, 'rom_wren_roof') } ] },
  };
  for (const id in ROMANCE_PLUS) {
    const R = ROMANCE_PLUS[id], qid = 'rom_' + id;
    QUESTS[qid] = { giver: id, title: R.title, romance: true, offer: R.offer, summary: R.summary, plus: R,
      steps: R.steps.map((st, i) => ({ text: st.text, done: s => flag(s, qid + '_s' + i) })) };
  }
  // Generic romance quest for anyone without a bespoke one.
  ROSTER.forEach(n => {
    const qid = 'rom_' + n.id;
    if (QUESTS[qid]) return;
    QUESTS[qid] = { giver: n.id, title: `An Evening with ${n.name.split(' ')[0] === 'Professor' || n.name.split(' ')[0] === 'Coach' ? n.name.split(' ').slice(1).join(' ') : n.name.split(' ')[0]}`, romance: true,
      offer: `"Would you want to... have dinner sometime? Somewhere quiet."`,
      summary: `${n.name} asked you to a quiet dinner. Bring something thoughtful.`,
      steps: [ { text: `Bring ${n.name} a gift that suits their tastes.`, done: s => flag(s, qid + '_gift') },
               { text: 'Meet at the cafe between 18:00 and 21:00.', done: s => flag(s, qid + '_dinner') } ] };
  });

  function unlockRomanceQuest(state, id) {
    const q = 'rom_' + id;
    if (!ns(state).quests[q]) ns(state).offers[q] = true;
  }
  function questStatus(state, q) { return ns(state).quests[q]; } // undefined | 'active' | 'done'
  function startQuest(state, q) {
    ns(state).quests[q] = 'active';
    delete ns(state).offers[q];
    window.G.notify(`New journal entry: ${QUESTS[q].title}`, 'info');
  }
  function checkQuests(state) {
    for (const q in ns(state).quests) {
      if (ns(state).quests[q] !== 'active') continue;
      const def = QUESTS[q];
      if (def.steps.every(st => st.done(state))) finishQuest(state, q);
    }
  }
  function finishQuest(state, q) {
    const def = QUESTS[q];
    ns(state).quests[q] = 'done';
    window.G.notify(`Quest complete: ${def.title}`, 'up');
    if (def.reward) def.reward(state);
    if (def.romance) {
      const r = rel(state, def.giver);
      r.romance = 3;
      changeAff(state, def.giver, 10);
      window.G.notify(`You are now dating ${BY_ID[def.giver].name}.`, 'up');
    }
  }

  // ---------- Location actions tied to quests / shopping ----------
  function locationActions(state) {
    const here = loc(state), t = time(), out = [];
    // Shopping for gift items
    for (const it in ITEMS) {
      const I = ITEMS[it];
      if (I.shop !== here) continue;
      out.push({ label: `Buy a ${I.name} ($${I.price})`, run(s) {
        if (money(s) < I.price) return { text: 'You check your wallet. Not enough.', minutes: 1 };
        safeChange('money', -I.price); addItem(s, it);
        return { text: `You buy a ${I.name}.`, minutes: 5 };
      } });
    }
    const A = (label, cond, fn) => { if (cond) out.push({ label, run: fn }); };
    A('Ask at the pharmacy counter for Rosa\'s pills', here === 'market' && questStatus(state, 'rosa_meds') === 'active' && !flag(state, 'rosa_meds_got'),
      s => { setFlag(s, 'rosa_meds_got'); return { text: 'The pharmacist hands over a paper bag. "Tell Rosa to stop lifting heavy pots."', minutes: 10 }; });
    A('Search the stacks for Hart\'s book', here === 'library' && questStatus(state, 'hart_book') === 'active' && !flag(state, 'hart_book_got'),
      s => { if (Math.random() < 0.5) { setFlag(s, 'hart_book_got'); return { text: 'Wedged behind the encyclopedias: a battered Dickinson, margins crowded with tiny handwriting.', minutes: 30 }; }
             return { text: 'You search for half an hour. Nothing yet.', minutes: 30 }; });
    A('Count crates with Marcus (2 hours)', here === 'market' && questStatus(state, 'marcus_stock') === 'active' && !flag(state, 'marcus_stock_done') && whereIs('marcus') === 'market',
      s => { setFlag(s, 'marcus_stock_done'); safeChange('stats.needs.fatigue', 80); return { text: 'Two hours of crates, clipboards, and Marcus muttering numbers. Your back aches. It\'s honest work.', minutes: 120 }; });
    A('Drop off Wren\'s parcel', here === 'old_mill' && questStatus(state, 'wren_parcel') === 'active' && !flag(state, 'wren_parcel_done') && t.hour >= 20,
      s => { setFlag(s, 'wren_parcel_done'); safeChange('stats.needs.stress', 40); return { text: 'A figure in a raincoat takes the parcel without a word. Your heart doesn\'t slow down for a while.', minutes: 15 }; });
    A('Run laps for Coach Okafor', here === 'park' && questStatus(state, 'okafor_laps') === 'active' && t.hour === 6 && ns(state).counters.okafor_lastDay !== t.day,
      s => { const c = ns(s).counters; c.okafor_laps = (c.okafor_laps || 0) + 1; c.okafor_lastDay = t.day;
             safeChange('stats.needs.fatigue', 100); safeChange('stats.needs.thirst', -80);
             return { text: `You run until your lungs burn. Coach Okafor, across the field, gives a single nod. (${c.okafor_laps}/3)`, minutes: 45 }; });
    A('Look for Biscuit the ferret', (here === 'shopping_centre' || here === 'park') && questStatus(state, 'hazel_ferret') === 'active' && !flag(state, 'hazel_ferret_got'),
      s => { if (Math.random() < 0.45) { setFlag(s, 'hazel_ferret_got'); return { text: here === 'park' ? 'A brown blur is wrestling a crisp packet under a bench. Biscuit lets you scoop him up, then immediately tries to climb into your sleeve.' : 'Behind the atrium fountain, a ferret is stealing coins out of the wishing pool. You catch Biscuit mid-heist.', minutes: 20 }; }
             return { text: 'You check under benches and behind planters. No ferret. Yet.', minutes: 20 }; });
    // Romance quest meetings
    A('Sit for Sam\'s portrait', here === 'park' && questStatus(state, 'rom_sam') === 'active' && flag(state, 'rom_sam_gift') && t.hour >= 16 && t.hour < 19 && whereIs('sam') === 'park',
      s => { setFlag(s, 'rom_sam_sat'); return { text: 'The light goes honey-gold. Sam paints in silence, glancing up at you again and again. When they finally turn the canvas around, you look... loved. "I didn\'t mean to make it so obvious," Sam whispers. You kiss them before they can apologize.', minutes: 120 }; });
    A('Row out with Theo', here === 'docks' && questStatus(state, 'rom_theo') === 'active' && t.hour >= 6 && t.hour < 8,
      s => { setFlag(s, 'rom_theo_row'); safeChange('stats.needs.fatigue', 60); return { text: 'Mist on the water, oars dipping in rhythm. Halfway across the lake Theo stops rowing. "I don\'t do this with anyone else," he says, and leans in. The boat rocks. You both laugh into the kiss.', minutes: 90 }; });
    A('Wait for the moonflower with Kit', here === 'park' && questStatus(state, 'rom_kit') === 'active' && flag(state, 'rom_kit_rosa') && t.hour >= 20,
      s => { setFlag(s, 'rom_kit_bloom'); return { text: 'In Rosa\'s old patch behind the willows, a pale bud unfurls under the moon. Kit\'s ears tilt toward you. "I\'ve watched this alone for years," she says softly, and takes your hand.', minutes: 90 }; });
    A('Climb to Wren\'s rooftop', here === 'alley' && questStatus(state, 'rom_wren') === 'active' && has(state, 'sandwich') && t.hour >= 19,
      s => { ns(s).items.sandwich--; setFlag(s, 'rom_wren_food'); setFlag(s, 'rom_wren_roof');
             return { text: 'A fire escape, a loose ladder, then the whole town spread out in lights. You split the sandwich. Wren is quiet for a long time, then rests their head on your shoulder. "Don\'t make it weird," they mutter. You don\'t.', minutes: 120 }; });
    // Generic dinner romance quests
    ROSTER.forEach(n => {
      const q = 'rom_' + n.id;
      if (['rom_sam', 'rom_theo', 'rom_kit', 'rom_wren'].includes(q)) return;
      if (QUESTS[q] && QUESTS[q].plus) {
        const R = QUESTS[q].plus;
        R.steps.forEach((st, i) => {
          if (st.kind !== 'meet') return;
          const prevDone = R.steps.slice(0, i).every((_, j) => flag(state, q + '_s' + j));
          const h = t.hour === 0 && st.to === 24 ? 24 : t.hour;
          A(`Meet ${n.name}`, here === st.loc && questStatus(state, q) === 'active' && prevDone && !flag(state, q + '_s' + i) && h >= st.from && h < st.to,
            s => { setFlag(s, q + '_s' + i); return { text: st.scene, minutes: 120 }; });
        });
        return;
      }
      A(`Have dinner with ${n.name}`, here === 'cafe' && questStatus(state, q) === 'active' && flag(state, q + '_gift') && t.hour >= 18 && t.hour < 21,
        s => { setFlag(s, q + '_dinner'); return { text: `Candlelight, shared dessert, and a conversation that runs long past closing. Walking out, ${nm(n.id)} takes your hand and kisses you goodnight.`, minutes: 120 }; });
    });
    return out;
  }

  // ---------- Dialogue options while talking ----------
  function questTopics(state, id) {
    const out = [];
    for (const q in QUESTS) {
      const def = QUESTS[q];
      if (def.giver !== id) continue;
      const st = questStatus(state, q);
      const canOffer = !st && (def.romance ? ns(state).offers[q] : rel(state, id).rep >= (def.minRep || 0));
      if (canOffer) out.push({ label: def.romance ? `(Romance) Talk about ${def.title.toLowerCase()}` : `Ask if ${pronouns(id).sub} need${pronouns(id).be === 'are' ? '' : 's'} help`, run(s) {
        startQuest(s, q); return { text: `${nm(id)}: ${def.offer}`, minutes: 10 };
      } });
    }
    const pq = QUESTS['rom_' + id];
    if (pq && pq.plus && questStatus(state, 'rom_' + id) === 'active') {
      pq.plus.steps.forEach((st, i) => {
        if (st.kind !== 'item' || flag(state, 'rom_' + id + '_s' + i) || !has(state, st.item)) return;
        out.push({ label: `Give ${BY_ID[id].name} the ${ITEMS[st.item].name}`, run(s) {
          ns(s).items[st.item]--; setFlag(s, 'rom_' + id + '_s' + i); changeAff(s, id, 4);
          return { text: `${nm(id)} takes the ${ITEMS[st.item].name} and smiles. "You remembered."`, minutes: 5 };
        } });
      });
    }
    if (id === 'hazel' && questStatus(state, 'hazel_ferret') === 'active' && flag(state, 'hazel_ferret_got') && !flag(state, 'hazel_ferret_given'))
      out.push({ label: 'Hand Biscuit back to Hazel', run(s) { setFlag(s, 'hazel_ferret_given'); return { text: '"You absolute menace," Hazel tells the ferret, kissing his head. To you: "Thank you. Really."', minutes: 5 }; } });
    if (id === 'hazel' && flag(state, 'exotics_unlocked'))
      out.push({ label: 'Ask about the back room', run(s) { return { text: '"The exotics are in the back. I\'ll introduce you properly. Every one of them is rescued or ethically bred, and I check in on them after they go home."', minutes: 5 }; } });
    if (id === 'dee' && rel(state, id).rep >= 5 && rel(state, id).gossipDay !== time().day)
      out.push({ label: 'Ask for the latest gossip', run(s) {
        rel(s, 'dee').gossipDay = time().day;
        const others = ROSTER.filter(n => n.id !== 'dee');
        const n = pick(others), kind = Math.random() < 0.5 ? 'gift' : 'where';
        let line;
        if (kind === 'gift') {
          const fav = Object.keys(n.gifts).filter(k => n.gifts[k] >= 2);
          const hate = Object.keys(n.gifts).filter(k => n.gifts[k] < 0);
          line = `"${n.name}? ${fav.length ? 'Absolutely melts for a ' + ITEMS[pick(fav)].name + '.' : 'Impossible to shop for.'}${hate.length ? ' Never give them a ' + ITEMS[hate[0]].name + ', trust me.' : ''}"`;
          ns(s).flags['likes_' + n.id] = true;
        } else {
          const e = pick(n.schedule);
          const dn = ['Mondays', 'Tuesdays', 'Wednesdays', 'Thursdays', 'Fridays', 'Saturdays', 'Sundays'];
          const place = (window.G.world && window.G.world.location && window.G.world.location(e.loc)) ? window.G.world.location(e.loc).name : e.loc;
          line = `"If you want to bump into ${n.name}, try ${place}, ${e.days.length === 7 ? 'most days' : dn[e.days[0]]}, around ${e.from}:00."`;
        }
        changeRep(s, 'dee', 1, true);
        return { text: `${nm('dee')} leans in, scissors paused. ${line}`, minutes: 15 };
      } });
    if (id === 'dee' && rel(state, id).rep >= 0) {
      const H = window.G.salon;
      let note = null;
      try { if (H && H.scruffy && H.scruffy()) note = '"Darling, your hair is staging a rebellion. Book a trim. Today."'; else if (H && H.rootsShowing && H.rootsShowing()) note = '"Your roots are showing. I say that with love."'; } catch (e) {}
      if (note && rel(state, id).hairDay !== time().day) out.push({ label: 'Ask Dee what she thinks of your hair', run(s) { rel(s, 'dee').hairDay = time().day; return { text: `${nm('dee')}: ${note}`, minutes: 2 }; } });
    }
    // Hand-in topics
    if (id === 'rosa' && questStatus(state, 'rosa_meds') === 'active' && flag(state, 'rosa_meds_got') && !flag(state, 'rosa_meds_given'))
      out.push({ label: 'Give Rosa her pills', run(s) { setFlag(s, 'rosa_meds_given'); return { text: '"Bless you." She presses ten dollars into your hand and won\'t take it back.', minutes: 5 }; } });
    if (id === 'hart' && questStatus(state, 'hart_book') === 'active' && flag(state, 'hart_book_got') && !flag(state, 'hart_book_given'))
      out.push({ label: 'Return Hart\'s book', run(s) { setFlag(s, 'hart_book_given'); return { text: 'He holds it like a lost pet. "I could kiss you. Academically speaking."', minutes: 5 }; } });
    if (id === 'rosa' && questStatus(state, 'rom_kit') === 'active' && !flag(state, 'rom_kit_rosa'))
      out.push({ label: 'Ask about the moonflower patch', run(s) { setFlag(s, 'rom_kit_rosa'); return { text: '"Behind the willows in the park. My late husband planted it. Tell that fox girl to water it, would you?"', minutes: 10 }; } });
    if (id === 'sam' && questStatus(state, 'rom_sam') === 'active' && has(state, 'sketchbook') && !flag(state, 'rom_sam_gift'))
      out.push({ label: 'Give Sam the sketchbook', run(s) { ns(s).items.sketchbook--; setFlag(s, 'rom_sam_gift'); changeAff(s, 'sam', 5); return { text: 'Sam hugs it to their chest. "Golden hour. The park. Don\'t be late."', minutes: 5 }; } });
    return out;
  }
  function giftOptions(state, id) {
    return giftOptionsBase(state, id).map(o => o.label === 'Never mind' ? o : ({ label: o.label, run(s) {
      const res = o.run(s);
      if (isBirthday(id) && rel(s, id).bdayGiftDay !== time().day) { rel(s, id).bdayGiftDay = time().day; changeRep(s, id, 8); changeAff(s, id, 4); res.text = `"You remembered my birthday?" ` + res.text; }
      return res;
    } }));
  }
  function giftOptionsBase(state, id) {
    const n = BY_ID[id];
    return Object.keys(ITEMS).filter(it => has(state, it)).map(it => ({ label: `Give the ${ITEMS[it].name}`, run(s) {
      ns(s).items[it]--;
      const v = n.gifts[it] || 0;
      const q = 'rom_' + id;
      if (questStatus(s, q) === 'active' && v >= 2 && !flag(s, q + '_gift')) setFlag(s, q + '_gift');
      ns(s).talking = { id, node: 'root' };
      if (v >= 3) { changeRep(s, id, 8); changeAff(s, id, 6); return { text: `${nm(id)} gasps. "How did you know?" This was exactly right.`, minutes: 5 }; }
      if (v === 2) { changeRep(s, id, 5); changeAff(s, id, 3); return { text: `${nm(id)} smiles warmly. "That's lovely, thank you."`, minutes: 5 }; }
      if (v === 1) { changeRep(s, id, 2); return { text: `${nm(id)} accepts it politely.`, minutes: 5 }; }
      if (v < 0) { changeRep(s, id, -4); return { text: `${nm(id)} winces. "...Thanks, I guess."`, minutes: 5 }; }
      changeRep(s, id, 1); return { text: `${nm(id)} takes it, a little puzzled.`, minutes: 5 };
    } })).concat([{ label: 'Never mind', run(s) { ns(s).talking = { id, node: 'root' }; return { text: `You put your things away.`, minutes: 1 }; } }]);
  }
  function talkingOptions(state) {
    const { id, node } = ns(state).talking;
    if (!present(state).includes(id)) { ns(state).talking = null; return null; }
    if (node === 'gift') return giftOptions(state, id);
    if (node === 'heart') {
      const k = rel(state, id).heart || 0, H = HEART[id][k];
      return H.replies.map(r => ({ label: r.label, run(s) {
        const rr = rel(s, id); rr.heart = k + 1; rr.heartDay = time().day; ns(s).talking = { id, node: 'root' };
        if (r.rep) changeRep(s, id, r.rep);
        if (r.aff && rr.rep >= 15) changeAff(s, id, r.aff);
        return { text: `${nm(id)}: ${r.text}`, minutes: 15 };
      } }));
    }
    const opts = questTopics(state, id);
    TOPICS.forEach(tp => {
      if (!tp.need(state, id)) return;
      if (tp.heart) opts.push({ label: tp.label, run(s) { ns(s).talking = { id, node: 'heart' }; return { text: `${nm(id)}: ${HEART[id][rel(s, id).heart || 0].prompt}`, minutes: 5 }; } });
      else if (tp.sub) opts.push({ label: tp.label, run(s) { ns(s).talking = { id, node: 'gift' }; return { text: `What will you give ${nm(id)}?`, minutes: 0 }; } });
      else opts.push({ label: tp.label, run: s => tp.run(s, id) });
    });
    return opts;
  }

  // ---------- Dates (scheduled meetups once dating) ----------
  function dateOptions(state) {
    const out = [], t = time(), here = loc(state);
    for (const id in ns(state).dates) {
      const d = ns(state).dates[id];
      if (d.day !== t.day || d.loc !== here || d.done) continue;
      if (t.hour >= d.hour && t.hour < d.hour + 3) {
        out.push({ label: `Go on your date with ${BY_ID[id].name}`, run(s) {
          d.done = true; changeAff(s, id, 6); changeRep(s, id, 4); safeChange('stats.needs.stress', -80);
          const r = rel(s, id);
          if (r.romance === 3 && r.aff >= 90) { r.romance = 4; window.G.notify(`You and ${BY_ID[id].name} are now partners.`, 'up'); }
          return { text: pick([
            `You and ${nm(id)} lose track of time talking. The walk home is slow on purpose.`,
            `${nm(id)} steals a bite of your food and grins. It is, somehow, the best evening all week.`,
            `A shared umbrella, a long kiss under a streetlamp, and then a fade into the rest of the night.`]), minutes: 120 };
        } });
      }
    }
    return out;
  }

  // ---------- Journal ----------
  function journalHTML(state) {
    const q = ns(state).quests;
    const active = [], done = [];
    for (const id in q) {
      const def = QUESTS[id];
      if (q[id] === 'active') {
        const next = def.steps.find(st => !st.done(state));
        active.push(`<div class="jentry"><b>${def.title}</b> <i>(${BY_ID[def.giver].name})</i><br>${def.summary}<br>&rarr; ${next ? next.text : 'Almost done.'}</div>`);
      } else done.push(`<li><s>${def.title}</s></li>`);
    }
    const people = ROSTER.filter(n => rel(state, n.id).met).map(n => {
      const r = rel(state, n.id);
      const fav = flag(state, 'likes_' + n.id) ? ' Likes: ' + Object.keys(n.gifts).filter(k => n.gifts[k] >= 2).map(k => ITEMS[k].name).join(', ') + '.' : '';
      const bd = flag(state, 'bday_' + n.id) ? ` Birthday: day ${BIRTHDAYS[n.id][1]} of ${BIRTHDAYS[n.id][0]}.` : '';
      return `<li><b>${n.name}</b> (${n.group}): ${stage(state, n.id).label}, romance: ${ROMANCE[r.romance]}.${fav}${bd}</li>`;
    });
    return `<p class="flavor">A battered notebook. Half lists, half doodles, all the things you meant to remember.</p>
      <h4>Active</h4>${active.join('') || '<p>Nothing pressing. Enjoy it while it lasts.</p>'}
      <h4>Invitations</h4>${Object.keys(ns(state).invites || {}).filter(id => !ns(state).invites[id].done).map(id => { const iv = ns(state).invites[id]; const pl = (window.G.world && window.G.world.location && window.G.world.location(iv.loc)) ? window.G.world.location(iv.loc).name : iv.loc; return `<div class="jentry">${BY_ID[id].name}: ${pl}, around ${iv.hour}:00 today.</div>`; }).join('') || '<p>No one is waiting on you today.</p>'}
      <h4>Completed</h4><ul>${done.join('') || '<li>None yet.</li>'}</ul>
      <h4>People</h4><ul>${people.join('') || '<li>You haven\'t really met anyone yet.</li>'}</ul>`;
  }

  // ---------- Module ----------
  const mod = {
    id: 'npcs',
    init(state) {
      if (state.npcs) return;
      const rels = {};
      ROSTER.forEach(n => (rels[n.id] = { rep: 0, aff: 0, romance: 0, met: false, known: false }));
      rels.rosa.rep = 15; rels.jules.rep = 5; // neighbors start warm
      state.npcs = { rel: rels, quests: {}, offers: {}, flags: {}, counters: {}, items: {}, dates: {}, talking: null };
    },
    onTick(minutes, state) {
      // Gentle reputation drift toward 0 once per day for people you ignore.
      const t = time();
      if (ns(state).lastDay !== t.day) {
        const firstDay = ns(state).lastDay === undefined;
        ns(state).lastDay = t.day;
        if (!firstDay) dailySocial(state);
        ROSTER.forEach(n => {
          const r = rel(state, n.id);
          if (r.lastChatDay !== undefined && t.day - r.lastChatDay > 7 && r.rep > 20) r.rep -= 1;
          if (r.romance >= 3 && r.lastChatDay !== undefined && t.day - r.lastChatDay > 5) changeAff(state, n.id, -2);
        });
      }
      checkQuests(state);
    },
    getOptions(state) {
      const res = { dialogue: [], actions: [], travel: [], other: [] };
      const wrap = o => ({ label: o.label, run(s) { const r = o.run(s); checkQuests(s); return r; } });
      if (ns(state).talking) {
        const t = talkingOptions(state);
        if (t) { res.dialogue = t.map(wrap); return res; }
      }
      present(state).forEach(id => {
        const r = rel(state, id);
        res.dialogue.push(wrap({ label: r.met ? `Talk to ${BY_ID[id].name}` : `Approach ${r.known ? BY_ID[id].name : 'the ' + BY_ID[id].role.toLowerCase()}`, run(s) {
          const rr = rel(s, id);
          const first = !rr.met; rr.met = true; rr.known = true;
          ns(s).talking = { id, node: 'root' };
          const st = stage(s, id).key;
          const pr = petReaction(s, id) + birthdayGreet(s, id) + conditionLine(s, id);
          if (first) return { text: pr + `You introduce yourself. ${BY_ID[id].blurb} "${BY_ID[id].name}," ${pronouns(id).sub} say${pronouns(id).be === 'are' ? '' : 's'}. "Nice to meet you."`, minutes: 5 };
          const greet = rel(s, id).romance >= 3 ? 'breaks into a smile meant only for you.' : { hostile: 'glares at you.', cold: 'barely acknowledges you.', neutral: 'nods hello.', friendly: 'smiles when they see you.', friend: 'waves you over.', close: 'lights up the moment you arrive.' }[st];
          return { text: `${nm(id)} ${greet}` + pr, minutes: 1 };
        } }));
      });
      res.actions = locationActions(state).concat(dateOptions(state), inviteActions(state)).map(wrap);
      // Who's around (flavor), shown under Other
      const here = present(state);
      if (here.length) res.other.push({ label: `Look around (${here.length} familiar face${here.length > 1 ? 's' : ''})`, run(s) {
        return { text: here.map(id => `${nm(id)}: ${BY_ID[id].blurb}`).join('<br>'), minutes: 1 };
      } });
      return res;
    },
  };

  window.NPCS = { rep: id => (S() && S().npcs ? S().npcs.rel[id].rep : 0), list: ROSTER, byId: BY_ID, quests: QUESTS, items: ITEMS, journalHTML, present, pronouns, whereIs, stage };
  window.G && (window.G.npcs = {
    exoticsUnlocked: () => !!(window.G.state && window.G.state.npcs && window.G.state.npcs.flags.exotics_unlocked),
    rep: id => (window.G.state && window.G.state.npcs ? window.G.state.npcs.rel[id].rep : 0),
    stage: id => stage(window.G.state, id).key,
    isDating: id => (window.G.state && window.G.state.npcs ? window.G.state.npcs.rel[id].romance >= 3 : false),
    whereIs,
  });
  function hook() {
    window.G.register(mod);
    if (window.G.addTab) window.G.addTab({ id: 'journal', label: 'Journal', order: 40, render: st => (st.npcs ? journalHTML(st) : '<p>Nothing yet.</p>') });
  }
  if (window.G && window.G.register) hook();
  else window.addEventListener('DOMContentLoaded', () => window.G && hook());
})();
