/* Built from Roy's npcs.js source, converted to ES5 for older browsers. */
function _createForOfIteratorHelperLoose(r, e) { var t = "undefined" != typeof Symbol && r[Symbol.iterator] || r["@@iterator"]; if (t) return (t = t.call(r)).next.bind(t); if (Array.isArray(r) || (t = _unsupportedIterableToArray(r)) || e && r && "number" == typeof r.length) { t && (r = t); var o = 0; return function () { return o >= r.length ? { done: !0 } : { done: !1, value: r[o++] }; }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }
function _unsupportedIterableToArray(r, a) { if (r) { if ("string" == typeof r) return _arrayLikeToArray(r, a); var t = {}.toString.call(r).slice(8, -1); return "Object" === t && r.constructor && (t = r.constructor.name), "Map" === t || "Set" === t ? Array.from(r) : "Arguments" === t || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(t) ? _arrayLikeToArray(r, a) : void 0; } }
function _arrayLikeToArray(r, a) { (null == a || a > r.length) && (a = r.length); for (var e = 0, n = Array(a); e < a; e++) n[e] = r[e]; return n; }
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
  var WEEKDAYS = [0, 1, 2, 3, 4];
  var WEEKEND = [5, 6];
  var ALL = [0, 1, 2, 3, 4, 5, 6];
  var ROSTER = [
  // Influential
  {
    id: 'eleanor',
    name: 'Eleanor Whitlock',
    group: 'Influential',
    age: 52,
    role: 'Mayor of Hollowbrook',
    defaults: {
      gender: 'vagina',
      appearance: 'female'
    },
    blurb: 'Silver-streaked hair pinned just so, and a smile that has won four elections.',
    likes: ['kindness', 'business'],
    gifts: {
      flowers: 2,
      coffee: 1,
      pastry: 1
    },
    schedule: [{
      days: WEEKDAYS,
      from: 8,
      to: 17,
      loc: 'town_hall'
    }, {
      days: WEEKDAYS,
      from: 17,
      to: 19,
      loc: 'town_square'
    }, {
      days: [6],
      from: 9,
      to: 12,
      loc: 'church'
    }, {
      days: [5],
      from: 10,
      to: 14,
      loc: 'market'
    }]
  }, {
    id: 'marcus',
    name: 'Marcus Vane',
    group: 'Influential',
    age: 34,
    role: 'Owner of Hollowbrook Grocer',
    defaults: {
      gender: 'penis',
      appearance: 'male'
    },
    blurb: 'Rolled shirtsleeves, ledger under one arm, always calculating something.',
    likes: ['business'],
    gifts: {
      coffee: 2,
      pastry: 1
    },
    schedule: [{
      days: [0, 1, 2, 3, 4, 5],
      from: 8,
      to: 18,
      loc: 'market'
    }, {
      days: ALL,
      from: 18,
      to: 20,
      loc: 'cafe'
    }]
  },
  // Teachers
  {
    id: 'hart',
    name: 'Professor Adrian Hart',
    group: 'Teachers',
    age: 41,
    role: 'Literature professor',
    defaults: {
      gender: 'penis',
      appearance: 'male'
    },
    blurb: 'Ink on his cuffs and a habit of quoting poets mid-sentence.',
    likes: ['school'],
    gifts: {
      book: 3,
      coffee: 1
    },
    schedule: [{
      days: WEEKDAYS,
      from: 9,
      to: 15,
      loc: 'lecture_hall'
    }, {
      days: WEEKDAYS,
      from: 15,
      to: 18,
      loc: 'library'
    }, {
      days: WEEKEND,
      from: 10,
      to: 13,
      loc: 'cafe'
    }]
  }, {
    id: 'okafor',
    name: 'Coach Nia Okafor',
    group: 'Teachers',
    age: 38,
    role: 'Athletics coach and P.E. instructor',
    defaults: {
      gender: 'vagina',
      appearance: 'female'
    },
    blurb: 'Whistle on a lanyard, voice that carries across the whole field.',
    likes: ['physique'],
    gifts: {
      water: 1,
      pastry: -1,
      sandwich: 2
    },
    schedule: [{
      days: WEEKDAYS,
      from: 7,
      to: 16,
      loc: 'gym'
    }, {
      days: ALL,
      from: 6,
      to: 7,
      loc: 'park'
    }, {
      days: WEEKEND,
      from: 9,
      to: 11,
      loc: 'park'
    }]
  },
  // Students
  {
    id: 'sam',
    name: 'Sam Rivera',
    group: 'Students',
    age: 19,
    role: 'Second-year art student',
    defaults: {
      gender: 'vagina',
      appearance: 'androgynous'
    },
    blurb: 'Paint under the fingernails, sketchbook always half-open.',
    likes: ['kindness', 'beauty'],
    gifts: {
      sketchbook: 3,
      flowers: 1,
      coffee: 1
    },
    schedule: [{
      days: WEEKDAYS,
      from: 9,
      to: 12,
      loc: 'lecture_hall'
    }, {
      days: WEEKDAYS,
      from: 12,
      to: 13,
      loc: 'cafeteria'
    }, {
      days: WEEKDAYS,
      from: 13,
      to: 17,
      loc: 'quad'
    }, {
      days: WEEKEND,
      from: 11,
      to: 17,
      loc: 'park'
    }, {
      days: ALL,
      from: 20,
      to: 23,
      loc: 'dorm_hall'
    }]
  }, {
    id: 'theo',
    name: 'Theo Lindqvist',
    group: 'Students',
    age: 21,
    role: 'Third-year, captain of the rowing team',
    defaults: {
      gender: 'penis',
      appearance: 'male'
    },
    blurb: 'Broad shoulders, easy grin, and an earnest streak he tries to hide.',
    likes: ['physique', 'socialite'],
    gifts: {
      sandwich: 2,
      water: 1,
      book: -1
    },
    schedule: [{
      days: WEEKDAYS,
      from: 6,
      to: 8,
      loc: 'docks'
    }, {
      days: WEEKDAYS,
      from: 9,
      to: 12,
      loc: 'lecture_hall'
    }, {
      days: WEEKDAYS,
      from: 12,
      to: 13,
      loc: 'cafeteria'
    }, {
      days: WEEKDAYS,
      from: 15,
      to: 18,
      loc: 'gym'
    }, {
      days: [4, 5],
      from: 20,
      to: 23,
      loc: 'town_square'
    }]
  },
  // Neighbors
  {
    id: 'rosa',
    name: 'Rosa Delgado',
    group: 'Neighbors',
    age: 67,
    role: 'Retired nurse next door',
    defaults: {
      gender: 'vagina',
      appearance: 'female'
    },
    blurb: 'Tends tomatoes in her front yard and knows everyone\'s business, kindly.',
    likes: ['kindness'],
    gifts: {
      flowers: 2,
      pastry: 2
    },
    schedule: [{
      days: ALL,
      from: 7,
      to: 11,
      loc: 'residential'
    }, {
      days: [1, 3],
      from: 11,
      to: 13,
      loc: 'market'
    }, {
      days: [6],
      from: 9,
      to: 12,
      loc: 'church'
    }]
  }, {
    id: 'jules',
    name: 'Jules Park',
    group: 'Neighbors',
    age: 26,
    role: 'Night-shift baker who lives upstairs',
    defaults: {
      gender: 'penis',
      appearance: 'androgynous'
    },
    blurb: 'Flour in their hair at strange hours and a dry sense of humor.',
    likes: ['kindness', 'awareness'],
    gifts: {
      coffee: 3,
      book: 1
    },
    schedule: [{
      days: ALL,
      from: 0,
      to: 6,
      loc: 'cafe'
    }, {
      days: ALL,
      from: 14,
      to: 18,
      loc: 'residential'
    }, {
      days: WEEKEND,
      from: 18,
      to: 21,
      loc: 'park'
    }]
  },
  // Outcasts
  {
    id: 'wren',
    name: 'Wren Cassidy',
    group: 'Outcasts',
    age: 22,
    role: 'College dropout who hangs around the alley',
    defaults: {
      gender: 'vagina',
      appearance: 'androgynous'
    },
    blurb: 'Patched jacket, sharp eyes, sharper tongue. Knows every shortcut in town.',
    likes: ['skulduggery', 'awareness'],
    gifts: {
      sandwich: 3,
      coffee: 1,
      flowers: -1
    },
    schedule: [{
      days: ALL,
      from: 10,
      to: 18,
      loc: 'alley'
    }, {
      days: ALL,
      from: 18,
      to: 23,
      loc: 'old_mill'
    }]
  }, {
    id: 'silas',
    name: 'Silas Grey',
    group: 'Outcasts',
    age: 29,
    role: 'Reclusive musician busking for change',
    defaults: {
      gender: 'penis',
      appearance: 'male'
    },
    blurb: 'Guitar case open at his feet, songs no one else seems to know.',
    likes: ['kindness', 'willpower'],
    gifts: {
      coffee: 2,
      sandwich: 2
    },
    schedule: [{
      days: ALL,
      from: 12,
      to: 18,
      loc: 'town_square'
    }, {
      days: ALL,
      from: 19,
      to: 23,
      loc: 'cafe'
    }]
  },
  // Non-Human (subtle folklore)
  {
    id: 'kit',
    name: 'Kit Amberly',
    group: 'Non-Human',
    age: 'looks mid-20s',
    role: 'Florist with soft russet fox ears',
    defaults: {
      gender: 'vagina',
      appearance: 'female'
    },
    blurb: 'Her ears flick toward every sound. Locals stopped staring years ago.',
    likes: ['kindness', 'tending'],
    gifts: {
      flowers: -1,
      pastry: 2,
      book: 1,
      sketchbook: 1
    },
    schedule: [{
      days: [0, 1, 2, 3, 4, 5],
      from: 9,
      to: 17,
      loc: 'florist'
    }, {
      days: ALL,
      from: 19,
      to: 22,
      loc: 'park'
    }]
  }, {
    id: 'morrow',
    name: 'Morrow',
    group: 'Non-Human',
    age: 'unclear, but an adult',
    role: 'Quiet farmhand with faintly glowing eyes',
    defaults: {
      gender: 'penis',
      appearance: 'androgynous'
    },
    blurb: 'Animals calm when Morrow walks by. Nobody remembers when they arrived.',
    likes: ['tending', 'awareness'],
    gifts: {
      water: 1,
      book: 2,
      sandwich: 1
    },
    schedule: [{
      days: ALL,
      from: 5,
      to: 14,
      loc: 'campus_farm'
    }, {
      days: ALL,
      from: 21,
      to: 24,
      loc: 'park'
    }]
  },
  // Pet shop owner (Neighbors group: a fixture of the shopping centre)
  {
    id: 'hazel',
    name: 'Hazel Marsh',
    group: 'Neighbors',
    age: 28,
    role: 'Former zookeeper who now owns the Paws & Whiskers pet shop',
    defaults: {
      gender: 'vagina',
      appearance: 'female'
    },
    blurb: 'Quiet, with a cardigan full of fur, a pencil in her braid, and a parakeet named Pip on her shoulder.',
    likes: ['kindness', 'tending'],
    gifts: {
      pastry: 2,
      book: 2,
      coffee: 1,
      flowers: 1,
      sandwich: -1
    },
    schedule: [{
      days: [2],
      from: 13,
      to: 17,
      loc: 'vet_clinic'
    }, {
      days: WEEKDAYS,
      from: 9,
      to: 18,
      loc: 'pet_store'
    }, {
      days: WEEKEND,
      from: 8,
      to: 11,
      loc: 'park'
    }]
  },
  // Hair stylist at Snip & Curl (Shopping Centre)
  {
    id: 'dee',
    name: 'Dee Fontaine',
    group: 'Influential',
    age: 36,
    role: 'Stylist and owner of the Snip & Curl Salon, and the town\'s best-informed gossip',
    defaults: {
      gender: 'vagina',
      appearance: 'female'
    },
    blurb: 'Bright lipstick, a different hair colour every month, and scissors that never stop moving while she talks.',
    likes: ['beauty', 'socialite'],
    gifts: {
      coffee: 2,
      flowers: 3,
      pastry: 1,
      book: -1
    },
    schedule: [{
      days: [1, 2, 3, 4, 5],
      from: 9,
      to: 18,
      loc: 'hair_salon'
    }, {
      days: [4, 5],
      from: 19,
      to: 23,
      loc: 'bar'
    }, {
      days: [6],
      from: 11,
      to: 14,
      loc: 'cafe'
    }]
  },
  // ---------- Phase 4 additions: every category now has at least three ----------
  {
    id: 'raman',
    name: 'Dr. Priya Raman',
    group: 'Teachers',
    age: 45,
    role: 'Chemistry professor who runs the college greenhouse',
    defaults: {
      gender: 'vagina',
      appearance: 'female'
    },
    blurb: 'Safety goggles pushed up into grey-streaked hair, and pockets that rattle with seed packets.',
    likes: ['school', 'tending'],
    gifts: {
      herbal_tea: 3,
      book: 2,
      coffee: 1,
      chocolate: -1
    },
    schedule: [{
      days: WEEKDAYS,
      from: 9,
      to: 14,
      loc: 'lecture_hall'
    }, {
      days: WEEKDAYS,
      from: 14,
      to: 18,
      loc: 'campus_farm'
    }, {
      days: WEEKEND,
      from: 7,
      to: 10,
      loc: 'park'
    }]
  }, {
    id: 'ollie',
    name: 'Ollie Brennan',
    group: 'Students',
    age: 18,
    role: 'First-year music student, painfully shy',
    defaults: {
      gender: 'penis',
      appearance: 'male'
    },
    blurb: 'Headphones round his neck, a violin case he hugs like a shield, and a blush that arrives before he does.',
    likes: ['kindness', 'willpower'],
    gifts: {
      chocolate: 3,
      coffee: 1,
      sketchbook: 1,
      flowers: -1
    },
    schedule: [{
      days: WEEKDAYS,
      from: 9,
      to: 12,
      loc: 'lecture_hall'
    }, {
      days: WEEKDAYS,
      from: 12,
      to: 13,
      loc: 'cafeteria'
    }, {
      days: WEEKDAYS,
      from: 13,
      to: 16,
      loc: 'library'
    }, {
      days: WEEKEND,
      from: 14,
      to: 18,
      loc: 'cafe'
    }, {
      days: ALL,
      from: 19,
      to: 23,
      loc: 'dorm_hall'
    }]
  }, {
    id: 'mina',
    name: 'Mina Sato',
    group: 'Students',
    age: 20,
    role: 'Student council president with a five-year plan',
    defaults: {
      gender: 'vagina',
      appearance: 'female'
    },
    blurb: 'Colour-coded planner, a blazer in every weather, and a handshake that closes deals.',
    likes: ['socialite', 'school'],
    gifts: {
      coffee: 2,
      book: 2,
      flowers: 1,
      sandwich: -1
    },
    schedule: [{
      days: WEEKDAYS,
      from: 8,
      to: 9,
      loc: 'cafe'
    }, {
      days: WEEKDAYS,
      from: 9,
      to: 15,
      loc: 'quad'
    }, {
      days: WEEKDAYS,
      from: 15,
      to: 18,
      loc: 'library'
    }, {
      days: [3],
      from: 18,
      to: 21,
      loc: 'lecture_hall'
    }, {
      days: WEEKEND,
      from: 10,
      to: 13,
      loc: 'town_hall'
    }]
  }, {
    id: 'benny',
    name: 'Benny Moss',
    group: 'Outcasts',
    age: 47,
    role: 'Fisherman with a prison record, mending nets at the docks',
    defaults: {
      gender: 'penis',
      appearance: 'male'
    },
    blurb: 'Hands like old rope, a faded tattoo of an anchor, and a laugh that surprises people.',
    likes: ['willpower', 'skulduggery'],
    gifts: {
      sandwich: 2,
      coffee: 2,
      chocolate: 1,
      flowers: -1
    },
    schedule: [{
      days: ALL,
      from: 5,
      to: 13,
      loc: 'docks'
    }, {
      days: ALL,
      from: 18,
      to: 22,
      loc: 'bar'
    }]
  }, {
    id: 'nell',
    name: 'Nell Bramble',
    group: 'Non-Human',
    age: 'older than she looks, and she looks about 40',
    role: 'Herbalist who lives at the edge of Hollow Woods',
    defaults: {
      gender: 'vagina',
      appearance: 'female'
    },
    blurb: 'Moss-green shawl, bare feet in any weather, and a basket that always smells of rain. People say she never crosses running water.',
    likes: ['tending', 'awareness'],
    gifts: {
      chocolate: 2,
      flowers: 2,
      herbal_tea: 1,
      pastry: 1,
      coffee: -1
    },
    schedule: [{
      days: ALL,
      from: 7,
      to: 18,
      loc: 'woods'
    }]
  }, {
    id: 'dot',
    name: 'Dot Pearce',
    group: 'Neighbors',
    age: 58,
    role: 'Cashier at Hollowbrook Grocer for thirty-one years',
    defaults: {
      gender: 'vagina',
      appearance: 'female'
    },
    blurb: 'Reading glasses on a beaded chain, a cardigan in every colour, and a memory for what everyone in town buys.',
    likes: ['cooking', 'kindness'],
    gifts: {
      herbal_tea: 2,
      flowers: 2,
      chocolate: 1,
      coffee: 1,
      pastry: 1
    },
    schedule: [{
      days: WEEKDAYS,
      from: 7,
      to: 15,
      loc: 'market'
    }, {
      days: [5],
      from: 13,
      to: 22,
      loc: 'market'
    }, {
      days: [6],
      from: 10,
      to: 12,
      loc: 'church'
    }]
  }, {
    id: 'dunn',
    name: 'Officer Dunn',
    group: 'Neighbors',
    age: 46,
    role: 'Town constable, on foot patrol around the town centre',
    defaults: {
      gender: 'penis',
      appearance: 'male'
    },
    blurb: 'Rain cape, a notebook he actually writes in, and a Thermos of tea that has outlasted three police chiefs.',
    likes: ['kindness', 'fitness'],
    gifts: {
      coffee: 2,
      pastry: 2,
      sandwich: 1,
      chocolate: 1,
      flowers: -1
    },
    schedule: [{
      days: WEEKDAYS,
      from: 9,
      to: 13,
      loc: 'town_square'
    }, {
      days: WEEKDAYS,
      from: 13,
      to: 17,
      loc: 'main_street'
    }, {
      days: WEEKDAYS,
      from: 17,
      to: 20,
      loc: 'park'
    }, {
      days: [5, 6],
      from: 11,
      to: 18,
      loc: 'town_square'
    }]
  }, {
    id: 'fen',
    name: 'Fen',
    group: 'Non-Human',
    age: 'an adult of no fixed age',
    role: 'Ferryman at the River Docks',
    defaults: {
      gender: 'vagina',
      appearance: 'androgynous'
    },
    blurb: 'Eyes the grey-green of river water, and a long coat that somehow never gets wet in the rain.',
    likes: ['awareness', 'kindness'],
    gifts: {
      pastry: 2,
      book: 2,
      chocolate: 1,
      water: -1
    },
    schedule: [{
      days: ALL,
      from: 14,
      to: 23,
      loc: 'docks'
    }]
  }];
  window.NNPC_ROSTER = ROSTER.map(function (n) {
    return {
      id: n.id,
      name: n.name,
      category: n.group,
      gender: n.defaults.gender,
      appearance: n.defaults.appearance,
      blurb: n.blurb
    };
  });
  var BY_ID = {};
  ROSTER.forEach(function (n) {
    return BY_ID[n.id] = n;
  });

  // ---------- Relationship stages ----------
  // reputation -100..100 (how they act toward you); affection 0..100 (romance meter)
  var STAGES = [{
    min: -100,
    key: 'hostile',
    label: 'Hostile'
  }, {
    min: -40,
    key: 'cold',
    label: 'Cold'
  }, {
    min: -10,
    key: 'neutral',
    label: 'Neutral'
  }, {
    min: 15,
    key: 'friendly',
    label: 'Friendly'
  }, {
    min: 40,
    key: 'friend',
    label: 'Friend'
  }, {
    min: 70,
    key: 'close',
    label: 'Close friend'
  }];
  var ROMANCE = ['None', 'Interested', 'Smitten', 'Dating', 'Partners'];

  // ---------- Helpers ----------
  var S = function S() {
    return window.G && window.G.state || null;
  };
  var ns = function ns(state) {
    return state.npcs;
  };
  var loc = function loc(state) {
    return state.world && state.world.location || 'dorm_room';
  };
  var time = function time() {
    return window.G.time || {
      day: 1,
      hour: 8,
      minute: 0,
      weekday: 0
    };
  };
  var rel = function rel(state, id) {
    return ns(state).rel[id];
  };
  var clamp = function clamp(v, a, b) {
    return Math.max(a, Math.min(b, v));
  };
  var pick = function pick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  };
  var flag = function flag(state, f) {
    return !!ns(state).flags[f];
  };
  var setFlag = function setFlag(state, f, v) {
    if (v === void 0) {
      v = true;
    }
    return ns(state).flags[f] = v;
  };
  function look(id) {
    if (window.Creation && window.Creation.npcLook) {
      var l = window.Creation.npcLook(id);
      if (l && l.appearance) return l;
    }
    return Object.assign({}, BY_ID[id].defaults);
  }
  function pronouns(id) {
    var a = look(id).appearance;
    if (a === 'male') return {
      sub: 'he',
      obj: 'him',
      pos: 'his',
      Sub: 'He',
      be: 'is'
    };
    if (a === 'female') return {
      sub: 'she',
      obj: 'her',
      pos: 'her',
      Sub: 'She',
      be: 'is'
    };
    return {
      sub: 'they',
      obj: 'them',
      pos: 'their',
      Sub: 'They',
      be: 'are'
    };
  }
  function _stage(state, id) {
    var r = rel(state, id).rep;
    var s = STAGES[0];
    STAGES.forEach(function (x) {
      if (r >= x.min) s = x;
    });
    return s;
  }
  function whereIs(id) {
    var t = time();
    var n = BY_ID[id];
    var st = S();
    if (st && ns(st).dates[id] && ns(st).dates[id].active) return ns(st).dates[id].loc;
    try {
      if (grocerRun(id)) return 'market';
    } catch (e) {}
    try {
      if (MARKET_STALLS[id] && window.G.world && window.G.world.marketLive && window.G.world.marketLive() && t.hour >= 9 && t.hour < 12) return 'town_square';
    } catch (e) {}
    for (var _iterator = _createForOfIteratorHelperLoose(n.schedule), _step; !(_step = _iterator()).done;) {
      var e = _step.value;
      if (e.days.includes(typeof t.weekdayIndex === 'number' ? t.weekdayIndex : t.weekday) && t.hour >= e.from && t.hour < e.to) return e.loc;
    }
    return 'home_' + id; // off-screen at their own home
  }
  function present(state) {
    var here = loc(state);
    return ROSTER.filter(function (n) {
      return whereIs(n.id) === here;
    }).map(function (n) {
      return n.id;
    });
  }
  function _changeRep(state, id, d, quiet) {
    var r = rel(state, id);
    var before = _stage(state, id).key;
    r.rep = clamp(r.rep + d, -100, 100);
    if (!quiet && d) window.G.notify(BY_ID[id].name + ": Reputation " + (d > 0 ? '+' : '') + d, d > 0 ? 'up' : 'down');
    var after = _stage(state, id);
    if (after.key !== before) window.G.notify(BY_ID[id].name + " now sees you as: " + after.label, 'info');
    if (id === 'hazel' && r.rep >= 70 && !ns(state).flags.exotics_unlocked) {
      ns(state).flags.exotics_unlocked = true;
      window.G.notify('Hazel trusts you now. The exotic animals in the back of Paws & Whiskers are open to you.', 'up');
      try {
        if (window.G.pets && window.G.pets.unlockExotics) window.G.pets.unlockExotics();
      } catch (e) {}
      if (window.G.emit) {
        window.G.emit('exoticUnlocked', {});
        window.G.emit('exoticsUnlocked', {});
      }
    }
  }
  function changeAff(state, id, d) {
    var r = rel(state, id);
    r.aff = clamp(r.aff + d, 0, 100);
    if (d) window.G.notify(BY_ID[id].name + ": Affection " + (d > 0 ? '+' : '') + d, d > 0 ? 'up' : 'down');
    if (r.romance === 0 && r.aff >= 25) {
      r.romance = 1;
      window.G.notify(BY_ID[id].name + " seems interested in you.", 'info');
    }
    if (r.romance === 1 && r.aff >= 50) {
      r.romance = 2;
      window.G.notify(BY_ID[id].name + " is clearly smitten.", 'info');
      unlockRomanceQuest(state, id);
    }
  }
  var nm = function nm(id) {
    return "<b>" + BY_ID[id].name + "</b>";
  };
  var safeChange = function safeChange(path, d) {
    try {
      window.G.change(path, d);
    } catch (e) {}
  };
  var money = function money(state) {
    return typeof state.money === 'number' ? state.money : 0;
  };

  // ---------- Items (quest + gifts) ----------
  var ITEMS = {
    flowers: {
      name: 'bouquet of flowers',
      price: 12,
      shop: 'florist'
    },
    coffee: {
      name: 'takeaway coffee',
      price: 4,
      shop: 'cafe'
    },
    pastry: {
      name: 'pastry',
      price: 3,
      shop: 'cafe'
    },
    sandwich: {
      name: 'sandwich',
      price: 6,
      shop: 'cafeteria'
    },
    water: {
      name: 'bottle of water',
      price: 2,
      shop: 'market'
    },
    book: {
      name: 'used paperback',
      price: 8,
      shop: 'library'
    },
    sketchbook: {
      name: 'sketchbook',
      price: 10,
      shop: 'market'
    },
    chocolate: {
      name: 'bar of chocolate',
      price: 5,
      shop: 'market'
    },
    herbal_tea: {
      name: 'tin of herbal tea',
      price: 7,
      shop: 'florist'
    }
  };
  var has = function has(state, it) {
    return (ns(state).items[it] || 0) > 0;
  };
  var addItem = function addItem(state, it, n) {
    if (n === void 0) {
      n = 1;
    }
    ns(state).items[it] = (ns(state).items[it] || 0) + n;
  };

  // ---------- Small talk pools (by stage) ----------
  var SMALLTALK = {
    eleanor: {
      cold: ['"I have a meeting." She doesn\'t look up.'],
      neutral: ['"Enjoying Hollowbrook? We\'re hoping to repave Elm Street by spring."', '"Do vote in the council election, won\'t you?"'],
      friendly: ['"Ah, you again. The town could use more people who actually show up."'],
      friend: ['"Between you and me, the budget meetings are the dullest hours of my life."'],
      close: ['She sighs and loosens her scarf. "It\'s nice to talk to someone who doesn\'t want something from me."']
    },
    marcus: {
      cold: ['"Buying, or browsing? Browsing\'s free. My time isn\'t."'],
      neutral: ['"Prices went up. Blame the supplier, not me."', '"If you ever want shifts, I pay fair. Cash."'],
      friendly: ['"You\'ve got a decent head for numbers, you know that?"'],
      friend: ['"My daughters run the place better than I do. Don\'t tell them."'],
      close: ['He actually laughs. "Come by after close sometime. I\'ll show you the real books."']
    },
    hart: {
      cold: ['"Office hours are posted on my door."'],
      neutral: ['"Have you done the reading? No? Ah, well. Neither had Keats, probably."', '"Words are the cheapest magic we have. Use them well."'],
      friendly: ['"Your last essay had a spark. Chase it."'],
      friend: ['"I wrote a novel once. Twelve publishers agreed it was a novel."'],
      close: ['He closes his book, keeping a finger in the page. "Tell me something true about yourself."']
    },
    okafor: {
      cold: ['"Laps. Now. Or don\'t talk to me."'],
      neutral: ['"Hydrate! You look like a raisin."', '"Tryouts are next month. Think about it."'],
      friendly: ['"Good form today. Keep that up."'],
      friend: ['"I nearly went pro, once. Knee said no."'],
      close: ['She tosses you a water bottle. "Sit. You\'ve earned a break."']
    },
    sam: {
      cold: ['Sam angles the sketchbook away from you.'],
      neutral: ['"Oh! Hi. Sorry, I was drawing that pigeon. It\'s very judgmental."', '"Do you ever look at the light at four in the afternoon? It goes all honey-colored."'],
      friendly: ['"I drew you yesterday. Is that weird? It\'s probably weird."'],
      friend: ['"Want to come to the student gallery opening? There\'s free cheese."'],
      close: ['Sam bumps your shoulder. "You\'re my favorite person to waste time with."']
    },
    theo: {
      cold: ['"Not now, mate."'],
      neutral: ['"You row? You\'ve got the shoulders for it. Maybe."', '"Party at the square Friday. Everyone\'s going."'],
      friendly: ['"Hey, you! Sit with us at lunch."'],
      friend: ['"Honestly? Captain is a lot of pressure. Everyone thinks it\'s just shouting."'],
      close: ['He goes quiet for once. "Thanks for actually listening."']
    },
    rosa: {
      cold: ['She tuts and goes back to her tomatoes.'],
      neutral: ['"Eat something green today, mijo. You look pale."', '"The Hendersons are fighting again. I didn\'t hear anything, of course."'],
      friendly: ['"Take a tomato. Take two. They\'re going to waste."'],
      friend: ['"Forty years of nursing. I\'ve seen worse than whatever you\'re worried about."'],
      close: ['"You\'re family now, you know. Don\'t argue."']
    },
    jules: {
      cold: ['"I\'ve been awake for nineteen hours. Use small words."'],
      neutral: ['"Croissants are just bread that went to finishing school."', '"The ceiling is thin. Please stop dropping things at 3 a.m."'],
      friendly: ['"Saved you a day-old cinnamon roll. Don\'t say I never gave you anything."'],
      friend: ['"I used to want to be a chef. Then I learned chefs have to talk to people."'],
      close: ['They rest their chin on their hand. "You\'re the best part of my weird schedule."']
    },
    wren: {
      cold: ['"Keep walking."'],
      neutral: ['"You lost? Everyone who comes down here is lost."', '"Watch your pockets in the square. Not everyone\'s as nice as me."'],
      friendly: ['"You\'re alright. For a student."'],
      friend: ['"I dropped out. Couldn\'t afford it, couldn\'t stand it. Mostly couldn\'t afford it."'],
      close: ['Wren doesn\'t say anything, but scoots over so you can sit on the crate too.']
    },
    silas: {
      cold: ['He keeps playing and doesn\'t look at you.'],
      neutral: ['"Got a request? I know three songs. Two of them are the same song."', '"Rain\'s coming. Strings always know."'],
      friendly: ['He nods at you mid-song and smiles.'],
      friend: ['"I had a band once. They got famous. I got this guitar."'],
      close: ['"I wrote this one about you," he says, and doesn\'t elaborate.']
    },
    kit: {
      cold: ['Her ears flatten slightly. "Can I help you find something?"'],
      neutral: ['"These are foxgloves. Pretty, but don\'t eat them."', 'Her ears swivel toward the door before the bell even rings.'],
      friendly: ['"I put aside a sprig of lavender for you. For sleeping."'],
      friend: ['"People used to ask about the ears. Now they just ask about the roses."'],
      close: ['Her tail, which you\'d swear you never noticed before, swishes once. "Stay a bit?"']
    },
    morrow: {
      cold: ['Morrow looks through you, as though you\'re weather.'],
      neutral: ['"The hens like you. That is uncommon."', '"Frost tonight. The ground told me."'],
      friendly: ['"You may help with the goats, if you wish. They are honest creatures."'],
      friend: ['"I came here a long time ago. I liked the quiet. I stayed."'],
      close: ['Their eyes glow a little brighter. "You are a good thing to have found."']
    }
  };

  // ---------- Phase 2 content: dating lines, heart talks, bespoke romance quests ----------
  var DATING_LINES = {
    eleanor: ['She straightens your collar in passing. "Discreetly, darling. The whole council has eyes."', '"Dinner Thursday? I\'ll pretend it\'s a constituent meeting."'],
    marcus: ['"I balanced the books in record time today. Turns out I work faster when I\'m looking forward to something."', 'He slips a wrapped chocolate into your pocket. "Inventory error. Don\'t tell anyone."'],
    hart: ['"I found a sonnet that reminded me of you. Then I wrote a worse one myself."', 'He tucks a pressed leaf into your hand. "Bookmark. For whatever you\'re reading."'],
    okafor: ['"You\'re my favorite distraction. Don\'t let it go to your head. Twenty push-ups."', 'She bumps your fist, then holds on to your hand a second longer.'],
    sam: ['Sam shows you a page full of tiny drawings of your hands. "Don\'t laugh."', '"Every sketch I do lately has you sneaking into the corner."'],
    theo: ['"The lads keep asking where I disappear to. I just smile."', 'He lifts you clean off your feet in a hug. "Missed you. It\'s been, what, six hours?"'],
    rosa: ['"Come for Sunday dinner. And bring that smile, the one you save for me."', 'She pats your cheek. "Forty years I didn\'t think I\'d feel this silly again."'],
    jules: ['"I named a bread after you. It\'s sweet and a bit unpredictable."', 'They lean against you, yawning. "Five minutes. Then I\'m human again."'],
    wren: ['"You\'re late. I wasn\'t waiting. Okay, I was waiting."', 'Wren tosses you an apple. "Stole it. Kidding. Mostly."'],
    silas: ['He plays the first bar of "your" song when he spots you across the square.', '"I bought new strings. First time in two years. Wonder why."'],
    kit: ['Her ears turn pink at the tips. "I saved the best roses for you. Don\'t tell the customers."', 'She hums as she twines a flower into your hair.'],
    morrow: ['"The goats asked about you. I told them you are mine. They seemed satisfied."', 'Morrow\'s eyes glow softly when you take their hand.']
  };
  DATING_LINES.hazel = ['"I closed ten minutes early. Don\'t tell the hamsters." She laces her fingers with yours.', 'Pip lands on your shoulder now. Hazel calls that "basically a marriage proposal."'];
  DATING_LINES.dee = ['"I gave you the last appointment of the day on purpose. Obviously."', 'She tucks a strand of your hair behind your ear. "Perfect. I\'m very good."'];
  // Heart talks: unlocked at rep 15 / 40 / 70. Each: prompt, replies [{label, text, rep, aff}].
  var HEART = {
    eleanor: [{
      prompt: '"Do you think a town can be kind? Or only the people in it?"',
      replies: [{
        label: '"A town is just its people."',
        text: '"Then I\'d better keep meeting them." She seems moved.',
        rep: 5,
        aff: 2
      }, {
        label: '"Towns run on rules, not kindness."',
        text: '"Spoken like a councilman. I hate it." But she smiles.',
        rep: 1
      }, {
        label: '"Why, are you feeling unkind?"',
        text: 'She laughs, surprised. "Some days. Don\'t quote me."',
        rep: 3,
        aff: 3
      }]
    }, {
      prompt: '"My daughter won\'t speak to me. She says I chose the town over her."',
      replies: [{
        label: '"Did you?"',
        text: 'A long silence. "Sometimes. Thank you for not lying to me."',
        rep: 6,
        aff: 2
      }, {
        label: '"Have you tried calling her?"',
        text: '"Every Sunday. Voicemail." She squeezes your hand.',
        rep: 4,
        aff: 3
      }, {
        label: 'Change the subject',
        text: 'She lets you, gratefully.',
        rep: 1
      }]
    }, {
      prompt: '"If I didn\'t run again, would anyone even remember my name?"',
      replies: [{
        label: '"I would."',
        text: 'Her composure cracks into a real, unguarded smile.',
        rep: 6,
        aff: 6
      }, {
        label: '"Your name\'s on the library."',
        text: '"That was my grandfather." She laughs anyway.',
        rep: 3
      }, {
        label: '"Does it matter?"',
        text: '"...No. Maybe not." She looks lighter.',
        rep: 4,
        aff: 2
      }]
    }],
    marcus: [{
      prompt: '"You think money makes people happy?"',
      replies: [{
        label: '"It helps."',
        text: '"Honest answer. I like that."',
        rep: 4
      }, {
        label: '"Time does. Money buys time."',
        text: 'He points his pen at you. "Now that\'s business sense."',
        rep: 5,
        aff: 2
      }, {
        label: '"Not you, apparently."',
        text: 'He snorts. "Fair hit."',
        rep: 2,
        aff: 3
      }]
    }, {
      prompt: '"My wife left when the girls were small. I just... kept the store open. Every day."',
      replies: [{
        label: '"That took strength."',
        text: '"It took coffee." But he looks grateful.',
        rep: 5,
        aff: 3
      }, {
        label: '"Did you ever close for yourself?"',
        text: '"...Never. Huh."',
        rep: 6,
        aff: 2
      }, {
        label: 'Just listen',
        text: 'He talks for a long time. You listen. It helps.',
        rep: 5,
        aff: 4
      }]
    }, {
      prompt: '"The girls want to expand. Second shop. I\'m scared stiff."',
      replies: [{
        label: '"Let them try."',
        text: '"You sound like their mother." A rueful smile.',
        rep: 5,
        aff: 3
      }, {
        label: '"Run the numbers with me."',
        text: 'You spend an hour over the ledger. He looks at you differently afterward.',
        rep: 6,
        aff: 5
      }, {
        label: '"Stay small. Stay safe."',
        text: '"Maybe." He doesn\'t sound convinced.',
        rep: 2
      }]
    }],
    hart: [{
      prompt: '"What\'s the saddest line you\'ve ever read?"',
      replies: [{
        label: 'Quote something real',
        text: 'He closes his eyes. "Yes. That one." You\'ve impressed him.',
        rep: 5,
        aff: 2
      }, {
        label: '"Terms and conditions."',
        text: 'He actually wheezes laughing.',
        rep: 4,
        aff: 3
      }, {
        label: '"I don\'t really read."',
        text: 'He looks genuinely wounded.',
        rep: -2
      }]
    }, {
      prompt: '"Sometimes I think I teach because I couldn\'t write."',
      replies: [{
        label: '"Or you write through us."',
        text: '"...That\'s a generous thought."',
        rep: 6,
        aff: 3
      }, {
        label: '"Write anyway."',
        text: '"Bossy." But he\'s smiling.',
        rep: 4,
        aff: 2
      }, {
        label: '"Teaching is enough."',
        text: '"Is it?" He seems unsure.',
        rep: 2
      }]
    }, {
      prompt: '"Would you read something I wrote? Honestly read it?"',
      replies: [{
        label: '"I\'d be honored."',
        text: 'He hands you a creased notebook with trembling care.',
        rep: 6,
        aff: 6
      }, {
        label: '"Only if it rhymes."',
        text: '"It doesn\'t. Read it anyway."',
        rep: 4,
        aff: 3
      }, {
        label: '"Maybe later."',
        text: '"Of course." He tucks it away.',
        rep: 0
      }]
    }],
    okafor: [{
      prompt: '"Why are you really at the gym? Be honest."',
      replies: [{
        label: '"To get stronger."',
        text: '"Good. Keep it simple."',
        rep: 4
      }, {
        label: '"Clears my head."',
        text: '"That\'s the real reason most people come."',
        rep: 5,
        aff: 2
      }, {
        label: '"You, maybe."',
        text: 'She raises an eyebrow. "Bold. Laps."',
        rep: 2,
        aff: 4
      }]
    }, {
      prompt: '"Knee went at twenty-four. Watched my whole future limp off a field."',
      replies: [{
        label: '"You built a new one."',
        text: '"Took me five years to see that."',
        rep: 6,
        aff: 3
      }, {
        label: '"Do you miss it?"',
        text: '"Every single day."',
        rep: 5,
        aff: 2
      }, {
        label: '"Could be worse."',
        text: '"Could be." Her jaw tightens.',
        rep: -1
      }]
    }, {
      prompt: '"I don\'t let people see me tired. You\'ve seen me tired."',
      replies: [{
        label: '"You\'re allowed to be."',
        text: 'She sits down beside you, shoulders finally loose.',
        rep: 6,
        aff: 6
      }, {
        label: '"I won\'t tell."',
        text: '"Better not." A rare grin.',
        rep: 4,
        aff: 3
      }, {
        label: '"Get some sleep, Coach."',
        text: '"Yes, ma\'am." Teasing, but warm.',
        rep: 4,
        aff: 2
      }]
    }],
    sam: [{
      prompt: '"Do you think art matters? Like, actually?"',
      replies: [{
        label: '"It\'s the only thing that lasts."',
        text: 'Sam stares at you like you hung the moon.',
        rep: 5,
        aff: 3
      }, {
        label: '"It matters to you."',
        text: '"That\'s... kind of perfect."',
        rep: 5,
        aff: 2
      }, {
        label: '"Not really."',
        text: '"Oh." The sketchbook closes.',
        rep: -3
      }]
    }, {
      prompt: '"My parents want me to switch to accounting. They pay my tuition."',
      replies: [{
        label: '"It\'s your life."',
        text: '"Easy to say." But they\'re thinking.',
        rep: 4,
        aff: 2
      }, {
        label: '"Could you minor in art?"',
        text: '"I hadn\'t thought of that." Relief floods their face.',
        rep: 6,
        aff: 3
      }, {
        label: '"Show them your work."',
        text: '"...Would you come with me?"',
        rep: 5,
        aff: 4
      }]
    }, {
      prompt: '"I don\'t usually let people watch me draw. You\'re different."',
      replies: [{
        label: '"Different how?"',
        text: '"You look at things the way I do." They blush.',
        rep: 5,
        aff: 6
      }, {
        label: 'Sit closer',
        text: 'Sam leans into your shoulder as the pencil moves.',
        rep: 4,
        aff: 6
      }, {
        label: '"I\'ll go if you want."',
        text: '"No! Stay."',
        rep: 4,
        aff: 3
      }]
    }],
    theo: [{
      prompt: '"Everyone thinks I\'ve got it easy. Captain, grades, whatever."',
      replies: [{
        label: '"Do you?"',
        text: '"Not even close." He exhales.',
        rep: 5,
        aff: 2
      }, {
        label: '"You make it look easy."',
        text: '"That\'s the trick, isn\'t it."',
        rep: 4,
        aff: 2
      }, {
        label: '"Poor you."',
        text: '"Yeah, okay." He goes quiet.',
        rep: -3
      }]
    }, {
      prompt: '"My dad rowed for Hollowbrook. Won everything. I\'m just keeping up."',
      replies: [{
        label: '"Row for yourself."',
        text: '"Nobody\'s ever said that to me."',
        rep: 6,
        aff: 3
      }, {
        label: '"Beat his times."',
        text: 'His grin comes back. "Watch me."',
        rep: 4,
        aff: 2
      }, {
        label: 'Just listen',
        text: 'He talks about the water for an hour. He seems lighter.',
        rep: 5,
        aff: 3
      }]
    }, {
      prompt: '"I\'ve never told anyone I\'m scared of graduating."',
      replies: [{
        label: '"I\'m scared too."',
        text: 'He laughs shakily and bumps your shoulder.',
        rep: 5,
        aff: 6
      }, {
        label: '"You\'ll be fine."',
        text: '"Yeah. Maybe." He holds your gaze.',
        rep: 4,
        aff: 3
      }, {
        label: '"Then let\'s make this year count."',
        text: '"Deal." He doesn\'t let go of your hand.',
        rep: 5,
        aff: 6
      }]
    }],
    rosa: [{
      prompt: '"Do you call your mother, mijo?"',
      replies: [{
        label: '"Not enough."',
        text: '"Then call her tonight." A firm pat.',
        rep: 5
      }, {
        label: '"It\'s complicated."',
        text: '"It always is. Call anyway."',
        rep: 4,
        aff: 2
      }, {
        label: '"You\'re my mother here."',
        text: 'She swats you, delighted.',
        rep: 6,
        aff: 2
      }]
    }, {
      prompt: '"Miguel planted half this garden. I keep it alive so he\'s still here."',
      replies: [{
        label: '"Tell me about him."',
        text: 'She talks until the sun goes low. Laughing, mostly.',
        rep: 6,
        aff: 3
      }, {
        label: '"He\'d be proud."',
        text: '"He\'d say the tomatoes are too small." She smiles.',
        rep: 5,
        aff: 2
      }, {
        label: 'Help her weed',
        text: 'You work side by side in comfortable silence.',
        rep: 6,
        aff: 3
      }]
    }, {
      prompt: '"At my age people think you stop feeling things. They\'re wrong."',
      replies: [{
        label: '"I know they are."',
        text: 'Her eyes shine. She takes your hand.',
        rep: 5,
        aff: 6
      }, {
        label: '"What are you feeling?"',
        text: '"Foolish. Happy. Both." She laughs.',
        rep: 5,
        aff: 5
      }, {
        label: '"Of course."',
        text: 'She nods slowly.',
        rep: 3
      }]
    }],
    jules: [{
      prompt: '"Do you ever feel like you\'re living in the wrong hours?"',
      replies: [{
        label: '"Every morning."',
        text: '"Solidarity." A tired fist bump.',
        rep: 4,
        aff: 2
      }, {
        label: '"Night\'s more honest."',
        text: '"Exactly." They look at you anew.',
        rep: 5,
        aff: 3
      }, {
        label: '"Just sleep normally."',
        text: '"Wow. Revolutionary."',
        rep: -1
      }]
    }, {
      prompt: '"Culinary school kicked me out. I froze during the final service."',
      replies: [{
        label: '"Your bread is better than any chef\'s."',
        text: '"Flattery. Keep going."',
        rep: 5,
        aff: 3
      }, {
        label: '"Try again?"',
        text: '"Maybe. If someone came to watch."',
        rep: 5,
        aff: 2
      }, {
        label: 'Just listen',
        text: 'They talk, voice soft. You stay until the ovens beep.',
        rep: 6,
        aff: 3
      }]
    }, {
      prompt: '"Stay up with me till the first batch is out? It\'s nice not being alone at 4 a.m."',
      replies: [{
        label: '"Of course."',
        text: 'You share the first warm loaf, shoulders touching.',
        rep: 5,
        aff: 6
      }, {
        label: '"Only if I get the first roll."',
        text: '"Deal." They grin.',
        rep: 4,
        aff: 4
      }, {
        label: '"I need sleep."',
        text: '"Yeah. Fair."',
        rep: 1
      }]
    }],
    wren: [{
      prompt: '"Why do you keep coming down here?"',
      replies: [{
        label: '"I like the company."',
        text: '"Weirdo." But they don\'t tell you to leave.',
        rep: 5,
        aff: 2
      }, {
        label: '"Shortcut."',
        text: '"Liar." A smirk.',
        rep: 3
      }, {
        label: '"Worried about you."',
        text: '"Don\'t be." Quieter: "...Thanks."',
        rep: 5,
        aff: 3
      }]
    }, {
      prompt: '"I sleep in the old mill some nights. Don\'t look at me like that."',
      replies: [{
        label: '"You can crash at mine."',
        text: 'Wren stares. "You mean that?"',
        rep: 6,
        aff: 3
      }, {
        label: 'Say nothing, offer food',
        text: 'They take it without a word. That\'s a thank you.',
        rep: 5,
        aff: 2
      }, {
        label: '"That\'s dangerous."',
        text: '"So is everything."',
        rep: 2
      }]
    }, {
      prompt: '"I don\'t trust people. I sort of trust you. It\'s annoying."',
      replies: [{
        label: '"I won\'t waste it."',
        text: 'Wren nods once, and something unclenches.',
        rep: 6,
        aff: 6
      }, {
        label: '"Annoying how?"',
        text: '"Shut up." They\'re smiling.',
        rep: 4,
        aff: 5
      }, {
        label: '"You should trust more people."',
        text: '"Don\'t push it."',
        rep: 2
      }]
    }],
    silas: [{
      prompt: '"Do you ever hear a song and feel homesick for a place you\'ve never been?"',
      replies: [{
        label: '"All the time."',
        text: 'He plays you one. It\'s exactly that feeling.',
        rep: 5,
        aff: 3
      }, {
        label: '"That\'s just nostalgia."',
        text: '"Just." He shakes his head, amused.',
        rep: 2
      }, {
        label: '"Play me one."',
        text: 'He does. A small crowd gathers.',
        rep: 5,
        aff: 2
      }]
    }, {
      prompt: '"My old band signed without me. Took my songs, too."',
      replies: [{
        label: '"Write better ones."',
        text: '"Working on it." He taps his notebook.',
        rep: 5,
        aff: 2
      }, {
        label: '"That\'s theft."',
        text: '"Couldn\'t afford the lawyer."',
        rep: 4,
        aff: 2
      }, {
        label: 'Just listen',
        text: 'He talks between songs. You drop in your last coins.',
        rep: 6,
        aff: 3
      }]
    }, {
      prompt: '"There\'s an open mic at the pub. I haven\'t played indoors in years."',
      replies: [{
        label: '"I\'ll be front row."',
        text: 'He looks at you like you\'ve handed him something precious.',
        rep: 6,
        aff: 6
      }, {
        label: '"You\'re ready."',
        text: '"You think so?" He believes you.',
        rep: 5,
        aff: 4
      }, {
        label: '"Busking suits you."',
        text: '"Maybe." He sounds disappointed.',
        rep: 1
      }]
    }],
    kit: [{
      prompt: '"Do the ears bother you? Honestly."',
      replies: [{
        label: '"They\'re lovely."',
        text: 'They flick, pleased, and turn faintly pink.',
        rep: 5,
        aff: 3
      }, {
        label: '"I hadn\'t noticed."',
        text: '"Liar." But she\'s grinning.',
        rep: 4,
        aff: 2
      }, {
        label: '"Are they real?"',
        text: '"Rude." Ears flatten.',
        rep: -3
      }]
    }, {
      prompt: '"My grandmother said our family made a bargain with the woods. I never asked what we gave."',
      replies: [{
        label: '"Want to find out?"',
        text: '"...Maybe. With you."',
        rep: 5,
        aff: 3
      }, {
        label: '"Some things should stay secret."',
        text: '"That\'s what she said, too."',
        rep: 4,
        aff: 2
      }, {
        label: '"Folklore\'s just stories."',
        text: 'Her tail twitches. "Is it?"',
        rep: 2
      }]
    }, {
      prompt: '"Foxes mate for life. Did you know that?" She looks very interested in the roses.',
      replies: [{
        label: '"I like that."',
        text: 'Her ears swivel toward you and stay there.',
        rep: 5,
        aff: 7
      }, {
        label: '"Is that a hint?"',
        text: '"Maybe." Bright pink.',
        rep: 4,
        aff: 6
      }, {
        label: '"Neat fact."',
        text: '"...Yes. Neat."',
        rep: 1
      }]
    }],
    morrow: [{
      prompt: '"Do you know what you are for?"',
      replies: [{
        label: '"Still figuring it out."',
        text: '"Good. Those who know are often wrong."',
        rep: 5,
        aff: 2
      }, {
        label: '"Helping people."',
        text: 'Morrow considers. "That is a fine purpose."',
        rep: 5,
        aff: 2
      }, {
        label: '"What are you for?"',
        text: '"Keeping. Things, places, creatures." A faint glow.',
        rep: 4,
        aff: 3
      }]
    }, {
      prompt: '"I have watched this valley for longer than the college has stood. I do not age as you do."',
      replies: [{
        label: '"Is it lonely?"',
        text: '"Yes." The honesty is startling.',
        rep: 6,
        aff: 4
      }, {
        label: '"I don\'t care."',
        text: '"...That is kind. And strange."',
        rep: 5,
        aff: 3
      }, {
        label: '"That\'s impossible."',
        text: '"Many true things are."',
        rep: 2
      }]
    }, {
      prompt: '"Stay through the frost with me tonight? The fields sing when they freeze."',
      replies: [{
        label: '"I\'d love to."',
        text: 'You listen together. The fields do sing, faintly.',
        rep: 5,
        aff: 7
      }, {
        label: '"Will you keep me warm?"',
        text: 'A long coat around your shoulders, and their hand in yours.',
        rep: 4,
        aff: 6
      }, {
        label: '"Too cold for me."',
        text: '"Another night, then."',
        rep: 1
      }]
    }]
  };
  HEART.hazel = [{
    prompt: '"People think running a pet shop is all puppies. Mostly it\'s cleaning and worrying."',
    replies: [{
      label: '"What do you worry about?"',
      text: '"The ones nobody takes home." She glances at an old tabby in the corner.',
      rep: 5,
      aff: 2
    }, {
      label: '"Sounds worth it."',
      text: '"It is. Most days."',
      rep: 4
    }, {
      label: '"So it\'s a job like any other."',
      text: '"No," she says, firmly. "It isn\'t."',
      rep: -2
    }]
  }, {
    prompt: '"I was a keeper at the city zoo for six years. I quit the day they sold the old animals to a roadside attraction."',
    replies: [{
      label: '"That took courage."',
      text: '"It took crying in a staff car park. But thank you."',
      rep: 6,
      aff: 3
    }, {
      label: '"Is that why you\'re so careful now?"',
      text: '"Every exotic I sell, I vet the buyer first. Including you, eventually."',
      rep: 5,
      aff: 2
    }, {
      label: 'Just listen',
      text: 'She talks while she cleans a tank. You hand her the sponge without being asked.',
      rep: 6,
      aff: 3
    }]
  }, {
    prompt: '"I trust you with them. That\'s rarer than trusting people, for me."',
    replies: [{
      label: '"I won\'t let you down."',
      text: 'She smiles, really smiles, and Pip chirps in agreement.',
      rep: 6,
      aff: 6
    }, {
      label: '"Do you trust me with you?"',
      text: 'A long pause. Her cheeks go pink. "...Working on it."',
      rep: 4,
      aff: 7
    }, {
      label: '"They\'re easy to like."',
      text: '"So are you. Annoyingly."',
      rep: 5,
      aff: 4
    }]
  }];
  HEART.dee = [{
    prompt: '"Everyone tells me their secrets. Nobody ever asks for mine."',
    replies: [{
      label: '"So tell me one."',
      text: '"I can\'t whistle. Thirty-six years. Tragic." She grins, but she looks pleased you asked.',
      rep: 5,
      aff: 2
    }, {
      label: '"Maybe they\'re scared to."',
      text: '"Smart people." A wink.',
      rep: 3
    }, {
      label: '"Do you want them to?"',
      text: 'The scissors pause. "...Sometimes."',
      rep: 5,
      aff: 3
    }]
  }, {
    prompt: '"I was engaged once. He said I talked too much. I said he listened too little."',
    replies: [{
      label: '"He was wrong."',
      text: '"Oh, I know. But thank you."',
      rep: 5,
      aff: 3
    }, {
      label: '"I like hearing you talk."',
      text: 'She actually goes quiet, cheeks pink.',
      rep: 5,
      aff: 5
    }, {
      label: '"Maybe you both were."',
      text: '"Hm. Fair, honestly."',
      rep: 3
    }]
  }, {
    prompt: '"I\'ve made this whole town look good for ten years. Nobody does my hair."',
    replies: [{
      label: '"Let me try."',
      text: 'You make a mess of it. She laughs until she cries, then refuses to fix it all day.',
      rep: 6,
      aff: 7
    }, {
      label: '"You look beautiful anyway."',
      text: '"Flatterer." She hides a smile behind the hairspray.',
      rep: 5,
      aff: 5
    }, {
      label: '"Hire someone."',
      text: '"Practical. Ugh."',
      rep: 1
    }]
  }];
  // Bespoke romance quests for NPCs that previously used the generic dinner.
  // Step kinds: item (give in conversation), meet (location + hour window, scene text).
  var ROMANCE_PLUS = {
    dee: {
      title: 'Karaoke Night',
      offer: '"Friday, the Lantern, karaoke. I need a duet partner who won\'t embarrass me. Or will, adorably. Bring me flowers, I deserve them."',
      summary: 'Dee wants you as her duet partner at the Lantern Pub\'s karaoke night. Bring her flowers.',
      steps: [{
        kind: 'item',
        item: 'flowers',
        text: 'Bring Dee a bouquet of flowers.'
      }, {
        kind: 'meet',
        loc: 'bar',
        from: 20,
        to: 23,
        text: 'Meet Dee at the Lantern Pub between 20:00 and 23:00.',
        scene: 'Dee picks the cheesiest love song in the binder. You are both terrible, and the whole pub sings along anyway. Outside under the lantern, breathless and laughing, she pulls you close. "For the record, I never sing with anyone," she says, and kisses you.'
      }]
    },
    hazel: {
      title: 'Wings',
      offer: '"Someone brought in a barn owl with a hurt wing. I can\'t keep it at the shop. Would you help me nurse it? Bring a book on owls, if the library has one, and meet me in the woods when it\'s ready to fly."',
      summary: 'Hazel is nursing an injured barn owl. Bring her a book to help, then help release it in Hollow Woods at dusk.',
      steps: [{
        kind: 'item',
        item: 'book',
        text: 'Bring Hazel a used paperback from the library (an owl guide).'
      }, {
        kind: 'meet',
        loc: 'woods',
        from: 18,
        to: 21,
        text: 'Meet Hazel in Hollow Woods between 18:00 and 21:00 to release the owl.',
        scene: 'The owl blinks at you from its box, then lifts into the dusk, pale and silent, and is gone into the trees. Hazel lets out a breath she seems to have held for weeks. "I never get to see the ending," she whispers. "Thank you for being here for it." She takes your hand, and then she kisses you, quietly, as the woods go dark.'
      }]
    },
    eleanor: {
      title: 'After the Council Meeting',
      offer: '"The council runs late Thursday. Walk me home after? And bring flowers for the town hall vase. Our little secret."',
      summary: 'Eleanor asked you to bring flowers and walk her home after a late council meeting.',
      steps: [{
        kind: 'item',
        item: 'flowers',
        text: 'Bring Eleanor a bouquet of flowers.'
      }, {
        kind: 'meet',
        loc: 'town_hall',
        from: 19,
        to: 22,
        text: 'Meet Eleanor at the town hall between 19:00 and 22:00.',
        scene: 'The council chamber empties. Eleanor kicks off her heels and walks barefoot beside you down the lamplit street. At her gate she hesitates, then kisses you, quick and certain. "Don\'t tell the newspaper."'
      }]
    },
    marcus: {
      title: 'Closing Time',
      offer: '"Stay after close Saturday. I\'ll cook. I\'m a terrible cook. Bring coffee to compensate."',
      summary: 'Marcus invited you for a homemade dinner at the store after closing. Bring coffee.',
      steps: [{
        kind: 'item',
        item: 'coffee',
        text: 'Bring Marcus a takeaway coffee.'
      }, {
        kind: 'meet',
        loc: 'market',
        from: 18,
        to: 21,
        text: 'Meet Marcus at the market between 18:00 and 21:00.',
        scene: 'Pasta on a camp stove between the shelves, slightly burnt. Marcus laughs at himself for the first time you\'ve seen. When he walks you to the door, he kisses you under the flickering OPEN sign he forgot to turn off.'
      }]
    },
    hart: {
      title: 'Margins',
      offer: '"There\'s a first edition reading at the library after hours. I\'d like you there. Bring something you\'d want me to read."',
      summary: 'Professor Hart invited you to an after-hours reading at the library. Bring a book.',
      steps: [{
        kind: 'item',
        item: 'book',
        text: 'Bring Professor Hart a used paperback.'
      }, {
        kind: 'meet',
        loc: 'library',
        from: 19,
        to: 23,
        text: 'Meet Professor Hart at the library between 19:00 and 23:00.',
        scene: 'He reads aloud from your paperback by lamplight, voice low, stopping to scribble in the margins. When the last page turns, he looks up and says, very quietly, "I\'ve run out of words." You kiss him so he doesn\'t need any.'
      }]
    },
    okafor: {
      title: 'Night Run',
      offer: '"Track, after dark. No students, no whistles. Just a run. Bring water, I always forget."',
      summary: 'Coach Okafor invited you for a private night run. Bring water.',
      steps: [{
        kind: 'item',
        item: 'water',
        text: 'Bring Coach Okafor a bottle of water.'
      }, {
        kind: 'meet',
        loc: 'gym',
        from: 20,
        to: 22,
        text: 'Meet Coach Okafor at the gym between 20:00 and 22:00.',
        scene: 'Laps under the floodlights, matching stride for stride. She wins, obviously. Breathless and laughing on the grass afterward, she rolls over and kisses you. "Don\'t slow down on my account."'
      }]
    },
    rosa: {
      title: 'Miguel\'s Recipe',
      offer: '"I want to cook Miguel\'s mole again. I haven\'t since he passed. Help me? Bring something sweet."',
      summary: 'Rosa wants to cook her late husband\'s recipe again with you. Bring a pastry.',
      steps: [{
        kind: 'item',
        item: 'pastry',
        text: 'Bring Rosa a pastry.'
      }, {
        kind: 'meet',
        loc: 'residential',
        from: 17,
        to: 20,
        text: 'Meet Rosa at Elm Row between 17:00 and 20:00.',
        scene: 'Three hours, forty ingredients, one old radio. She cries a little and laughs more. Over the dishes she takes your face in her flour-dusted hands and kisses you, soft and brave.'
      }]
    },
    jules: {
      title: 'First Batch',
      offer: '"There\'s a quiet hour at the bakery before dawn. Come be there for it. Bring coffee. Obviously."',
      summary: 'Jules asked you to keep them company at the bakery before dawn. Bring coffee.',
      steps: [{
        kind: 'item',
        item: 'coffee',
        text: 'Bring Jules a takeaway coffee.'
      }, {
        kind: 'meet',
        loc: 'cafe',
        from: 3,
        to: 6,
        text: 'Meet Jules at the café between 03:00 and 06:00.',
        scene: 'The ovens hum. Jules shows you how to braid dough, hands over yours. The first batch comes out golden, and so does the sky. They kiss you tasting of cinnamon. "Best shift ever."'
      }]
    },
    silas: {
      title: 'Open Mic',
      offer: '"Open mic at the Lantern. I\'m going to play. Be there, or I\'ll lose my nerve."',
      summary: 'Silas is playing the open mic at the Lantern Pub and wants you there.',
      steps: [{
        kind: 'meet',
        loc: 'bar',
        from: 20,
        to: 23,
        text: 'Meet Silas at the Lantern Pub between 20:00 and 23:00.',
        scene: 'His hands shake on the first chord, then steady. The last song is new: it\'s about you, unmistakably. The pub applauds. Outside, under the lantern, he kisses you like he\'s been rehearsing it for weeks.'
      }]
    },
    morrow: {
      title: 'First Frost',
      offer: '"The first frost comes soon. The fields will sing. I would hear it with you."',
      summary: 'Morrow wants you to listen to the frost sing over the farm fields at night.',
      steps: [{
        kind: 'meet',
        loc: 'campus_farm',
        from: 21,
        to: 24,
        text: 'Meet Morrow at the campus farm after 21:00.',
        scene: 'Frost spreads across the furrows with a sound like distant bells. Morrow\'s eyes glow in the dark. "In all my years, I have never shared this," they say, and kiss you, cold and gentle.'
      }]
    }
  };

  // ---------- Pet reactions (hooks into Jimmy's G.pets once published) ----------
  // like: +2 adores, +1 likes, 0 neutral, -1 dislikes. Optional per-species overrides.
  var PET_REACT = {
    eleanor: {
      like: 1,
      line: 'She crouches, pearls swinging. "And who is this distinguished citizen?"'
    },
    marcus: {
      like: -1,
      line: '"Not in the store. Health code. Wait, is that thing shedding on my stock?"'
    },
    hart: {
      like: 1,
      line: '"A familiar! Every scholar needs one." He offers a solemn knuckle to sniff.',
      species: {
        cat: {
          like: 2,
          line: '"A cat. Of course. T.S. Eliot would approve." He looks delighted.'
        }
      }
    },
    okafor: {
      like: 1,
      line: '"Cute. Is it getting enough exercise?"',
      species: {
        dog: {
          like: 2,
          line: '"Now that\'s a running partner. Bring them to the park at six."'
        }
      }
    },
    sam: {
      like: 2,
      line: 'Sam gasps. "Hold still, both of you. I need to draw this immediately."'
    },
    theo: {
      like: 1,
      line: '"Ha! Who\'s a good one? Look at that face."',
      species: {
        dog: {
          like: 2,
          line: 'Theo is on the ground wrestling with your dog in under three seconds.'
        }
      }
    },
    rosa: {
      like: 1,
      line: '"Ay, precioso. Is it eating enough? You both look thin."',
      species: {
        parrot: {
          like: 2,
          line: '"A parrot! My Miguel had one. It only knew swear words." She cackles.'
        }
      }
    },
    jules: {
      like: 1,
      line: '"Keep it away from the flour. Actually, no, come here, little one."'
    },
    wren: {
      like: 1,
      line: 'Wren pretends not to care, then quietly slips it a bit of sandwich.',
      species: {
        ferret: {
          like: 2,
          line: '"A ferret? Okay. You just became forty percent cooler."'
        }
      }
    },
    silas: {
      like: 1,
      line: 'He plays a little three-note tune just for your pet.'
    },
    kit: {
      like: 2,
      line: 'Kit\'s ears perk straight up. Your pet goes very still, then trots right over to her, perfectly calm.',
      species: {
        rabbit: {
          like: 1,
          line: 'The rabbit freezes. Kit\'s ears droop. "Sorry. Old instincts on both sides."'
        }
      }
    },
    hazel: {
      like: 2,
      line: 'Hazel checks your pet\'s ears, teeth, and coat in about four seconds flat. "Healthy. Good. You\'re doing right by them."'
    },
    dee: {
      like: 1,
      line: '"Oh, look at this little face! Do they need a trim? I do dogs on Tuesdays. I don\'t, but I would."'
    },
    morrow: {
      like: 2,
      line: 'Morrow kneels. Your pet settles instantly, as if listening to something you can\'t hear.'
    }
  };
  function petWith() {
    var P = window.G && window.G.pets;
    if (!P) return null;
    try {
      var f = typeof P.following === 'function' ? P.following() : typeof P.active === 'function' ? P.active() : null;
      var pet = Array.isArray(f) ? f[0] : f;
      return pet && pet.species ? pet : null;
    } catch (e) {
      return null;
    }
  }
  function petReaction(state, id) {
    var r = rel(state, id),
      t = time();
    var extra = '';
    if (id === 'hazel' && r.exoticDay !== t.day && window.G.pets && window.G.pets.list) {
      var ex = ['hedgehog', 'chinchilla', 'tortoise', 'axolotl', 'cornsnake', 'sugarglider', 'sugar_glider'];
      var cared = window.G.pets.list().filter(function (p) {
        return ex.includes(p.species) && !p.runaway && (p.happiness === undefined || p.happiness >= 500);
      });
      if (cared.length) {
        r.exoticDay = t.day;
        _changeRep(state, 'hazel', 2);
        extra = "<p>Hazel asks after " + (cared[0].name || 'your ' + cared[0].species) + " and nods at your answers. \"You're looking after them properly. Good.\"</p>";
      }
    }
    var pet = petWith();
    if (!pet) return extra;
    if (r.petDay === t.day) return extra;
    r.petDay = t.day;
    var base = PET_REACT[id];
    var sp = base.species && base.species[pet.species] || base;
    var like = sp.like;
    if (like > 0) _changeRep(state, id, like * 2);
    if (like < 0) _changeRep(state, id, -2);
    if (like > 0) {
      try {
        if (window.G.pets.care) window.G.pets.care(pet.id, 'bond', like * 5);else if (window.G.pets.addBond) window.G.pets.addBond(pet.id, like * 5);
      } catch (e) {}
    }
    return extra + ("<p><i>" + (pet.name || 'Your ' + pet.species) + "</i>: " + sp.line + "</p>");
  }
  SMALLTALK.hazel = {
    cold: ['"If you\'re just here to tap on the glass, the door\'s behind you."'],
    neutral: ['"Kibble\'s on aisle two. Don\'t buy the cheap stuff, it\'s mostly sawdust."', 'Her parakeet, Pip, eyes you suspiciously. "He\'s deciding if he likes you."'],
    friendly: ['"Pip said hello to you. He never does that. I\'m a little jealous."', '"Every animal in here came from somewhere. I like to know where."'],
    friend: ['"Want to help with feeding time? The guinea pigs riot if I\'m late."'],
    close: ['She leans on the counter, chin in hand. "You\'re good with them, you know. They can tell."']
  };
  SMALLTALK.dee = {
    cold: ['"Appointments only, sweetie. And I\'m booked. Forever."'],
    neutral: ['"Sit, sit. Oh, who cut this last? Never mind. I\'ll fix it."', '"You didn\'t hear it from me, but the Lantern is watering down the cider."'],
    friendly: ['"You have great hair. Criminally under-styled, but great."', '"I know everything that happens in this town. Hair makes people talk."'],
    friend: ['"I\'ve been doing hair since I was sixteen. My mum\'s kitchen, a towel, and a lot of crying clients."'],
    close: ['She spins your chair to face her. "Forget the gossip. How are YOU actually doing?"']
  };
  // ---------- Phase 3: birthdays, condition reactions, invitations, jealousy, breakups ----------
  var BIRTHDAYS = {
    // season + day of season (28-day seasons)
    eleanor: ['Winter', 3],
    marcus: ['Spring', 14],
    hart: ['Autumn', 21],
    okafor: ['Summer', 9],
    sam: ['Spring', 2],
    theo: ['Summer', 25],
    rosa: ['Winter', 18],
    jules: ['Autumn', 7],
    wren: ['Winter', 27],
    silas: ['Autumn', 13],
    kit: ['Spring', 20],
    morrow: ['Winter', 1],
    hazel: ['Summer', 16],
    dee: ['Spring', 26]
  };
  function isBirthday(id) {
    var b = BIRTHDAYS[id],
      t = time();
    return !!b && t.season === b[0] && t.dayOfSeason === b[1];
  }
  function conditionLine(state, id) {
    var r = rel(state, id),
      t = time();
    if (r.condDay === t.day) return '';
    var st = state.stats || {},
      needs = st.needs || {},
      cl = st.clothing || {},
      stat = st.status || {};
    var lines = [];
    var wet = Math.max(cl.upperWetness || 0, cl.lowerWetness || 0);
    var warm = rel(state, id).rep >= 15;
    if (wet >= 60) lines.push(warm ? pronouns(id).Sub + " hand" + (pronouns(id).be === 'are' ? '' : 's') + " you a napkin. \"You're soaked. Go get dry before you catch something.\"" : 'They glance at your damp clothes and edge away slightly.');else if ((needs.fatigue || 0) >= 750) lines.push(warm ? '"You look exhausted. Have you slept at all?"' : '"Rough night?" It doesn\'t sound like sympathy.');else if ((needs.stress || 0) >= 750 && warm) lines.push('"Hey. You seem wound tight. Want to talk about it?"');else if ((stat.crime || 0) >= 300 && ['eleanor', 'hart', 'okafor', 'rosa', 'marcus'].includes(id)) {
      lines.push('"I\'ve heard some things about you lately. I hope they aren\'t true."');
      _changeRep(state, id, -2, true);
    } else if ((stat.crime || 0) >= 300 && id === 'wren') lines.push('"Heard you\'ve been busy. Careful. People talk."');else if ((stat.kindnessFame || 0) >= 300 && warm) lines.push('"People keep telling me how kind you\'ve been. It\'s nice to hear."');
    if (!lines.length) return '';
    r.condDay = t.day;
    return "<p>" + nm(id) + ": " + lines[0] + "</p>";
  }
  function birthdayGreet(state, id) {
    if (!isBirthday(id)) return '';
    var known = flag(state, 'bday_' + id);
    return known ? "<p>It's " + BY_ID[id].name + "'s birthday today. A gift would mean a lot.</p>" : "<p>" + nm(id) + " seems unusually cheerful today.</p>";
  }
  function partners(state) {
    return ROSTER.filter(function (n) {
      return rel(state, n.id).romance >= 3;
    }).map(function (n) {
      return n.id;
    });
  }
  function dailySocial(state) {
    var t = time(),
      N = ns(state);
    N.invites = N.invites || {};
    // Missed invitations
    for (var id in N.invites) {
      var iv = N.invites[id];
      if (!iv.done && iv.day < t.day) {
        _changeRep(state, id, -3);
        window.G.notify("You missed " + BY_ID[id].name + "'s invitation.", 'down');
        delete N.invites[id];
      } else if (iv.done && iv.day < t.day) delete N.invites[id];
    }
    // New invitation (at most one a day) from someone who likes you
    var friends = ROSTER.filter(function (n) {
      return rel(state, n.id).met && rel(state, n.id).rep >= 40 && !N.invites[n.id];
    });
    if (friends.length && Math.random() < 0.25) {
      var n = pick(friends);
      var spots = {
        eleanor: 'cafe',
        marcus: 'bar',
        hart: 'library',
        okafor: 'park',
        sam: 'park',
        theo: 'town_square',
        rosa: 'residential',
        jules: 'cafe',
        wren: 'alley',
        silas: 'town_square',
        kit: 'park',
        morrow: 'campus_farm',
        hazel: 'park',
        dee: 'bar'
      };
      var hour = t.isWeekend ? pick([11, 14, 17]) : pick([17, 18, 19]);
      spots[n.id] = spots[n.id] || INVITE_SPOT[n.id] || 'cafe';
      N.invites[n.id] = {
        day: t.day,
        loc: spots[n.id],
        hour: hour,
        done: false
      };
      var place = window.G.world && window.G.world.location && window.G.world.location(spots[n.id]) ? window.G.world.location(spots[n.id]).name : spots[n.id];
      window.G.notify("A note from " + n.name + ": \"Meet me at " + place + " around " + hour + ":00 today?\"", 'info');
    }
    processRumors(state);
    // Jealousy: dating more than one person risks someone finding out
    var ps = partners(state);
    if (ps.length > 1) {
      var deeBoost = rel(state, 'dee').met ? 0.05 : 0;
      ps.forEach(function (id) {
        if (Math.random() < 0.08 + deeBoost) {
          var r = rel(state, id);
          window.G.notify(BY_ID[id].name + " has heard you're seeing someone else.", 'down');
          _changeRep(state, id, -8);
          r.aff = clamp(r.aff - 15, 0, 100);
          window.G.notify(BY_ID[id].name + ": Affection -15", 'down');
          if (r.aff < 30) {
            r.romance = 1;
            window.G.notify(BY_ID[id].name + " has ended things with you.", 'down');
          }
        }
      });
    }
  }
  function inviteActions(state) {
    var out = [],
      t = time(),
      here = loc(state),
      N = ns(state);
    var _loop = function _loop(id) {
      var iv = N.invites[id];
      if (iv.done || iv.day !== t.day || here !== iv.loc || t.hour < iv.hour || t.hour >= iv.hour + 2) return 1; // continue
      out.push({
        label: "Meet " + BY_ID[id].name + " (invitation)",
        run: function run(s) {
          iv.done = true;
          _changeRep(s, id, 6);
          if (rel(s, id).romance >= 1) changeAff(s, id, 3);
          safeChange('stats.needs.stress', -40);
          return {
            text: nm(id) + " waves you over. " + pick(['You spend an easy hour together, talking about nothing and everything.', 'They had been hoping you would come. It shows.', 'Time goes by faster than either of you notices.']),
            minutes: 60
          };
        }
      });
    };
    for (var id in N.invites || {}) {
      if (_loop(id)) continue;
    }
    return out;
  }

  // ---------- Phase 4: new NPC content ----------
  Object.assign(SMALLTALK, {
    raman: {
      cold: ['"Unless you are here about the lab safety form, I am busy."'],
      neutral: ['"Everything is chemistry. Bread, rust, falling in love. Mostly bread."', '"Do not touch the purple tray. I mean it, and so does the tray."'],
      friendly: ['"You have soil under your nails. Good. It means you were useful."'],
      friend: ['"I wanted to be a poet. Then I found out that tomatoes actually answer you."'],
      close: ['She hands you a seedling in a yoghurt pot. "Name it. Then keep it alive. That is friendship, scientifically."']
    },
    ollie: {
      cold: ['Ollie flinches and turns up his headphones.'],
      neutral: ['"Oh! H-hi. Sorry. I was humming. Was I humming?"', '"The practice rooms are booked until December. I play in the stairwell. The acoustics are... fine."'],
      friendly: ['"I wrote down a tune that you\'d like, maybe. Or not. Probably not."'],
      friend: ['"You\'re the only person here I don\'t rehearse conversations with first."'],
      close: ['He actually meets your eyes. "I played better this week. I think it\'s because of you."']
    },
    mina: {
      cold: ['"I have a three-minute window. You\'ve used two."'],
      neutral: ['"Have you signed the petition? There is always a petition."', '"Theo thinks the rowing budget is sacred. Theo is wrong."'],
      friendly: ['"You\'re organised enough to be dangerous. I respect that."'],
      friend: ['"Everyone thinks I want to be mayor. I want to be the person the mayor calls."'],
      close: ['She closes the planner, which you have never seen her do. "Just talk to me. No agenda."']
    },
    benny: {
      cold: ['"Docks are public. Doesn\'t mean you\'re welcome on mine."'],
      neutral: ['"River\'s low. Fish are sulking."', '"Don\'t stand on the coiled rope. That\'s how people end up swimming."'],
      friendly: ['"You\'re alright, kid. You don\'t stare at the tattoos."'],
      friend: ['"Did six years. Came out, and the river was still here. Only thing that waited."'],
      close: ['He tosses you the end of a net. "Here. Hold this. Nobody else I\'d trust with it."']
    },
    nell: {
      cold: ['Nell does not look up from her basket. The birds stop singing until you leave.'],
      neutral: ['"Nettles for the blood, yarrow for the cuts, and patience for everything else."', '"You walked here the long way. Good. The short way is not for you yet."'],
      friendly: ['"Take this sprig of rosemary. For remembering. You will need it."'],
      friend: ['"Rosa Delgado thinks I am a quack. I delivered her eldest. She does not remember that."'],
      close: ['She laughs, and for a moment the wood seems to lean closer to listen. "You may come here whenever you like."']
    },
    fen: {
      cold: ['Fen watches the water instead of you.'],
      neutral: ['"Crossing is a dollar. Coming back is free, if you come back."', '"The river is in a mood today. Mind your feet."'],
      friendly: ['"You asked my name properly the first time. Few do."'],
      friend: ['"I have rowed this stretch a long while. Longer than the bridge. Longer than the bridge before that."'],
      close: ['Fen trails a hand in the river and smiles. "It likes you. It doesn\'t like anyone."']
    }
  });
  Object.assign(DATING_LINES, {
    raman: ['"I labelled a seed tray with your name. Purely for record-keeping." She is blushing.', 'She takes off her goggles to kiss your cheek, which you are told is a great honour.'],
    ollie: ['He plays four notes when he sees you. "That\'s yours. Everyone gets four notes. Yours are the nicest."', 'Ollie holds your hand under the table and goes very red about it.'],
    mina: ['"I scheduled you in. Permanently. Don\'t argue, it\'s in pen."', 'She straightens your collar. "Campaign photo. Kidding. Mostly."'],
    benny: ['"Saved you the best of the catch. Don\'t tell the cat."', 'He hums an old sea song under his breath when you sit beside him.'],
    nell: ['"I dreamt you would come by today. I put the kettle on before you knocked."', 'A bramble catches your sleeve, and Nell scolds it gently until it lets go.'],
    fen: ['"No fare for you. Not ever." Fen brushes river-cold fingers over yours.', '"The water was calmer this morning. I think it knew you were coming."']
  });
  Object.assign(HEART, {
    raman: [{
      prompt: '"Why do you study? Honestly."',
      replies: [{
        label: '"To understand things."',
        text: '"Good. Most people only want the certificate." She nods slowly.',
        rep: 5,
        aff: 2
      }, {
        label: '"To get a good job."',
        text: '"Honest. I can work with honest."',
        rep: 3
      }, {
        label: '"I haven\'t worked it out yet."',
        text: '"Neither had I, at your age. Or at forty." She laughs.',
        rep: 4,
        aff: 3
      }]
    }, {
      prompt: '"My husband thinks I love the greenhouse more than I love him. He may be right."',
      replies: [{
        label: '"Have you told him that?"',
        text: '"We are... separated. So, in a way, yes." She looks at you differently.',
        rep: 5,
        aff: 3
      }, {
        label: '"Plants don\'t argue back."',
        text: '"Exactly! At last, someone understands."',
        rep: 4,
        aff: 2
      }, {
        label: 'Just listen',
        text: 'She talks about her marriage for a long time, carefully, as if testing each word.',
        rep: 6,
        aff: 3
      }]
    }, {
      prompt: '"If I left the college, would anyone keep the greenhouse alive?"',
      replies: [{
        label: '"I would."',
        text: 'She looks at you for a very long time. "I believe you."',
        rep: 6,
        aff: 6
      }, {
        label: '"Don\'t leave."',
        text: '"Ha. Nobody has asked me that before."',
        rep: 5,
        aff: 4
      }, {
        label: '"Someone always does."',
        text: '"That is true of greenhouses. Less so of people."',
        rep: 3
      }]
    }],
    ollie: [{
      prompt: '"Do you ever feel like everyone else got the instructions and you didn\'t?"',
      replies: [{
        label: '"All the time."',
        text: 'He breathes out, shakily relieved. "Oh. Okay. Good. Not good, but good."',
        rep: 5,
        aff: 3
      }, {
        label: '"Nobody has instructions."',
        text: '"That\'s... actually really comforting?"',
        rep: 4,
        aff: 2
      }, {
        label: '"You just have to fake it."',
        text: '"I\'m bad at faking." But he smiles.',
        rep: 2
      }]
    }, {
      prompt: '"My dad wanted me to do engineering. I said music. We haven\'t talked since."',
      replies: [{
        label: '"You were brave."',
        text: '"I was terrified." "That\'s what brave is," you say. He goes quiet.',
        rep: 6,
        aff: 3
      }, {
        label: '"Maybe call him?"',
        text: '"Maybe. After the recital. If it goes well."',
        rep: 4,
        aff: 2
      }, {
        label: '"Play me something instead."',
        text: 'He does, right there in the corridor. It\'s beautiful and a little sad.',
        rep: 5,
        aff: 4
      }]
    }, {
      prompt: '"Would you come to my recital? You don\'t have to. I just... would like you there."',
      replies: [{
        label: '"Front row."',
        text: 'He grins so widely he has to look away.',
        rep: 6,
        aff: 6
      }, {
        label: '"Wouldn\'t miss it."',
        text: '"Okay. Okay! Now I really can\'t mess up."',
        rep: 5,
        aff: 4
      }, {
        label: '"If I\'m free."',
        text: '"Right. Yeah. Sure." He deflates a little.',
        rep: 1
      }]
    }],
    mina: [{
      prompt: '"Is it bad that I like winning more than I like being liked?"',
      replies: [{
        label: '"It\'s honest."',
        text: '"Honest. I\'ll take honest."',
        rep: 4,
        aff: 2
      }, {
        label: '"Can\'t you have both?"',
        text: '"I\'m working on it. You\'re helping, apparently."',
        rep: 5,
        aff: 3
      }, {
        label: '"A bit, yeah."',
        text: 'She laughs, startled. "Rude. Accurate."',
        rep: 3,
        aff: 2
      }]
    }, {
      prompt: '"My parents run a restaurant. Eighteen-hour days. I swore I would never be that tired."',
      replies: [{
        label: '"You already are."',
        text: 'She opens her mouth to argue, then doesn\'t. "...Yes. I am."',
        rep: 6,
        aff: 3
      }, {
        label: '"What would you rather be?"',
        text: '"Nobody has asked me that since I was nine." She thinks about it.',
        rep: 5,
        aff: 4
      }, {
        label: '"They must be proud."',
        text: '"They are. I wish that made it easier."',
        rep: 4
      }]
    }, {
      prompt: '"If I lose the election, who am I?"',
      replies: [{
        label: '"Still you."',
        text: 'She takes your hand, briefly, and squeezes. "Thank you."',
        rep: 6,
        aff: 6
      }, {
        label: '"Someone with free evenings."',
        text: '"Imagine." She laughs properly for the first time.',
        rep: 5,
        aff: 3
      }, {
        label: '"You won\'t lose."',
        text: '"Flattery. I\'ll allow it."',
        rep: 3,
        aff: 1
      }]
    }],
    benny: [{
      prompt: '"You ever done something you can\'t take back?"',
      replies: [{
        label: '"Yes."',
        text: 'He nods once. No questions. "Then you know."',
        rep: 5,
        aff: 2
      }, {
        label: '"Not yet."',
        text: '"Keep it that way, kid."',
        rep: 3
      }, {
        label: '"What did you do?"',
        text: '"Stole a car. Crashed it. Hurt a man. He got better. I didn\'t, for a while."',
        rep: 5,
        aff: 3
      }]
    }, {
      prompt: '"Got a son. Twenty-two. Lives in the city. Doesn\'t write."',
      replies: [{
        label: '"Do you write to him?"',
        text: '"...Can\'t read good. Can\'t write good." He looks ashamed. "Never told anyone that."',
        rep: 7,
        aff: 3
      }, {
        label: '"Give him time."',
        text: '"Gave him six years. Wasn\'t my choice."',
        rep: 3
      }, {
        label: 'Sit with him a while',
        text: 'You watch the river together. It helps.',
        rep: 5,
        aff: 3
      }]
    }, {
      prompt: '"People see the record. You see something else. Why?"',
      replies: [{
        label: '"Because I know you."',
        text: 'He has to look away, at the water. "Damn river\'s in my eye."',
        rep: 6,
        aff: 6
      }, {
        label: '"Everyone deserves a second go."',
        text: '"Most say that. You mean it."',
        rep: 5,
        aff: 3
      }, {
        label: '"You make good coffee."',
        text: 'A huge, surprised laugh. "That I do."',
        rep: 4,
        aff: 2
      }]
    }],
    nell: [{
      prompt: '"What do you think lives in these woods?"',
      replies: [{
        label: '"Foxes. Owls. Maybe you."',
        text: '"Maybe me," she agrees, eyes glinting.',
        rep: 4,
        aff: 2
      }, {
        label: '"Things older than the town."',
        text: 'She looks at you sharply, then smiles. "You listen. Good."',
        rep: 6,
        aff: 2
      }, {
        label: '"Nothing. It\'s just trees."',
        text: '"Trees are never just trees." She is not offended.',
        rep: 2
      }]
    }, {
      prompt: '"I had a sister once. She went across the river and did not come back the same."',
      replies: [{
        label: '"Is that why you don\'t cross?"',
        text: '"One of the reasons. The other is my business." But she is pleased you noticed.',
        rep: 6,
        aff: 3
      }, {
        label: '"I\'m sorry."',
        text: '"So was she, I think. In the end."',
        rep: 4,
        aff: 2
      }, {
        label: '"Tell me about her."',
        text: 'She does, for an hour, and the light changes strangely while she talks.',
        rep: 5,
        aff: 4
      }]
    }, {
      prompt: '"Would you remember me, if I let you forget?"',
      replies: [{
        label: '"Don\'t let me."',
        text: 'She tucks a sprig of rosemary behind your ear. "Then I won\'t."',
        rep: 6,
        aff: 6
      }, {
        label: '"I\'d remember anyway."',
        text: '"Many have said so." A pause. "You might be the first to mean it."',
        rep: 5,
        aff: 4
      }, {
        label: '"Is that a threat?"',
        text: 'She laughs like birdsong. "A courtesy."',
        rep: 3,
        aff: 2
      }]
    }],
    fen: [{
      prompt: '"What do you think the river carries?"',
      replies: [{
        label: '"Water and mud."',
        text: '"Also those." Fen seems amused.',
        rep: 2
      }, {
        label: '"Memories."',
        text: 'Fen goes still. "Yes. That too."',
        rep: 6,
        aff: 2
      }, {
        label: '"Whatever people throw in."',
        text: '"Unfortunately," Fen sighs, fishing out a crisp packet.',
        rep: 4,
        aff: 2
      }]
    }, {
      prompt: '"Morrow and I came here around the same time. We do not talk about from where."',
      replies: [{
        label: '"You don\'t have to."',
        text: '"Thank you." The water calms around the boat.',
        rep: 6,
        aff: 3
      }, {
        label: '"Somewhere far?"',
        text: '"Somewhere close, in the wrong direction."',
        rep: 4,
        aff: 2
      }, {
        label: '"Are you happy here?"',
        text: '"Happier, lately." Fen looks at you a moment too long.',
        rep: 5,
        aff: 4
      }]
    }, {
      prompt: '"Will you ride across with me tonight? No fare. No reason."',
      replies: [{
        label: '"Yes."',
        text: 'The crossing is silent, and the stars are doubled in the water.',
        rep: 6,
        aff: 6
      }, {
        label: '"Where does it go?"',
        text: '"Only to the other bank. Tonight."',
        rep: 4,
        aff: 3
      }, {
        label: '"Another time."',
        text: '"There are always other times. For me."',
        rep: 2
      }]
    }]
  });
  Object.assign(PET_REACT, {
    raman: {
      like: 1,
      line: '"Fascinating. Has it been vaccinated? Wonderful creature, wonderful."'
    },
    ollie: {
      like: 2,
      line: 'Ollie sits right down on the floor and lets your pet climb all over him. He is beaming.'
    },
    mina: {
      like: 0,
      line: '"Cute. Keep it off my blazer."',
      species: {
        cat: {
          like: 1,
          line: '"Oh. Oh, it\'s purring. Okay. I like this one."'
        }
      }
    },
    benny: {
      like: 1,
      line: '"Good little beast. Here." He finds a scrap of fish somewhere.',
      species: {
        cat: {
          like: 2,
          line: 'The cat walks straight to Benny. "Dockcats know their own," he says, pleased.'
        }
      }
    },
    nell: {
      like: 2,
      line: 'Your pet sits down at Nell\'s feet and looks at her as if waiting for an instruction.'
    },
    fen: {
      like: 1,
      line: 'Fen crouches and murmurs something. Your pet seems to understand it better than you do.',
      species: {
        dog: {
          like: 0,
          line: 'The dog barks once at Fen, then whines and hides behind you.'
        }
      }
    }
  });
  Object.assign(BIRTHDAYS, {
    raman: ['Autumn', 4],
    ollie: ['Winter', 10],
    mina: ['Summer', 2],
    benny: ['Spring', 8],
    nell: ['Autumn', 28],
    fen: ['Summer', 21]
  });
  var INVITE_SPOT = {
    raman: 'campus_farm',
    ollie: 'dorm_hall',
    mina: 'cafe',
    benny: 'docks',
    nell: 'woods',
    fen: 'docks'
  };
  Object.assign(ROMANCE_PLUS, {
    raman: {
      title: 'Under Glass',
      offer: '"The night-blooming cereus in the greenhouse opens once a year, for one night. I would like to see it with someone. Bring tea. Proper tea."',
      summary: 'Dr. Raman wants you there when the greenhouse\'s night-blooming cactus opens. Bring her a tin of herbal tea.',
      steps: [{
        kind: 'item',
        item: 'herbal_tea',
        text: 'Bring Dr. Raman a tin of herbal tea.'
      }, {
        kind: 'meet',
        loc: 'campus_farm',
        from: 19,
        to: 23,
        text: 'Meet Dr. Raman in the farm greenhouse between 19:00 and 23:00.',
        scene: 'The greenhouse smells of wet earth and something sweet. At ten past ten the great white flower unfolds, slow as breathing. Priya forgets to take notes. "I have watched this alone for nine years," she says, and when she kisses you her hands still smell of soil.'
      }]
    },
    ollie: {
      title: 'Four Notes',
      offer: '"I wrote something. For you. I want to play it for you in the park, at dusk, when nobody\'s around. Bring chocolate? It helps my nerves."',
      summary: 'Ollie wrote you a song and wants to play it in the park at dusk. Bring him chocolate for his nerves.',
      steps: [{
        kind: 'item',
        item: 'chocolate',
        text: 'Bring Ollie a bar of chocolate.'
      }, {
        kind: 'meet',
        loc: 'park',
        from: 18,
        to: 22,
        text: 'Meet Ollie at Millpond Park between 18:00 and 22:00.',
        scene: 'He plays by the pond with his eyes shut. The song starts with four notes you recognise, and grows into something that makes the ducks go quiet. When it ends he is shaking. You take the violin out of his hands, carefully, and kiss him.'
      }]
    },
    mina: {
      title: 'Off the Record',
      offer: '"The debate is Thursday. After it, I want one hour where I am not the president of anything. Meet me in the square. Bring coffee, I will have earned it."',
      summary: 'Mina wants one hour off the record with you after the council debate. Bring her a coffee.',
      steps: [{
        kind: 'item',
        item: 'coffee',
        text: 'Bring Mina a takeaway coffee.'
      }, {
        kind: 'meet',
        loc: 'town_square',
        from: 20,
        to: 23,
        text: 'Meet Mina in the Town Square between 20:00 and 23:00.',
        scene: 'She takes off the blazer and sits on the edge of the fountain, kicking her heels. For an hour she talks about nothing that matters. When the church clock strikes, she leans in. "Off the record," she says, and kisses you.'
      }]
    },
    benny: {
      title: 'Low Tide',
      offer: '"Never taken anyone out on the boat. Sunset, Sunday. Bring a sandwich. I\'ll bring the rest."',
      summary: 'Benny wants to take you out on his boat at sunset. Bring a sandwich.',
      steps: [{
        kind: 'item',
        item: 'sandwich',
        text: 'Bring Benny a sandwich.'
      }, {
        kind: 'meet',
        loc: 'docks',
        from: 18,
        to: 21,
        text: 'Meet Benny at the River Docks between 18:00 and 21:00.',
        scene: 'The boat creaks out into a river gone gold. Benny catches nothing and doesn\'t care. He tells you about his son, and his years inside, and you tell him things you haven\'t told anyone. When he kisses you, it is careful, like he is afraid you will break, or he will.'
      }]
    },
    nell: {
      title: 'Hedge Light',
      offer: '"There is a light that walks in the woods on certain nights. I would show you, if you are brave. Bring something sweet for the hedge, it is only polite."',
      summary: 'Nell wants to show you the walking light in Hollow Woods. Bring a bar of chocolate as an offering.',
      steps: [{
        kind: 'item',
        item: 'chocolate',
        text: 'Bring Nell a bar of chocolate.'
      }, {
        kind: 'meet',
        loc: 'woods',
        from: 21,
        to: 24,
        text: 'Meet Nell in Hollow Woods after 21:00.',
        scene: 'Nell leaves the chocolate on a stone. Later it is gone. A pale light drifts between the trees, and Nell holds your hand so you do not follow it. "Most people only see it once," she whispers. "I would like you to see it many times." She kisses you, and the woods are very quiet.'
      }]
    },
    fen: {
      title: 'The Crossing',
      offer: '"Once a year I make a crossing that is not for fares. I would take you. Bring a pastry. The river likes to be bribed."',
      summary: 'Fen wants to take you on a special late-night crossing. Bring a pastry for the river.',
      steps: [{
        kind: 'item',
        item: 'pastry',
        text: 'Bring Fen a pastry.'
      }, {
        kind: 'meet',
        loc: 'docks',
        from: 21,
        to: 24,
        text: 'Meet Fen at the River Docks after 21:00.',
        scene: 'Fen drops the pastry into the water, and the current carries the boat without the oars. Halfway across, the far bank goes dim and the stars come very close. "This is the only place I have ever felt at home," Fen says. "Until you." The kiss tastes faintly of river.'
      }]
    }
  });

  // ---------- NPC-to-NPC relationships ----------
  var RELATIONS = [['sam', 'ollie', 'friends', 'They share a dorm corridor and a sketchbook-for-mixtape trading habit.'], ['sam', 'theo', 'exes', 'They dated in first year. It ended badly, and they are still careful around each other.'], ['theo', 'mina', 'rivals', 'Mina wants to cut the rowing budget. Theo would rather die.'], ['mina', 'eleanor', 'friends', 'Mina interns at the town hall on weekends, and Eleanor sees a lot of herself in her.'], ['eleanor', 'marcus', 'rivals', 'They have been fighting about parking on Main Street for six years.'], ['marcus', 'dee', 'exes', 'They were engaged once. Dee still cuts his hair, which says a lot about both of them.'], ['marcus', 'benny', 'rivals', 'Benny sells fish off his boat for half of what Marcus charges.'], ['hart', 'raman', 'friends', 'The two of them have a standing Friday argument about whether poetry or chemistry matters more.'], ['okafor', 'raman', 'rivals', 'Every year they fight over the same slice of the science and sports budget.'], ['okafor', 'theo', 'friends', 'She is the reason he became captain, and they both know it.'], ['rosa', 'jules', 'friends', 'Rosa leaves soup on Jules\'s doorstep after night shifts. Jules leaves bread on hers.'], ['rosa', 'nell', 'rivals', 'Rosa calls Nell\'s remedies nonsense. Nell calls Rosa\'s hip a self-inflicted wound.'], ['wren', 'benny', 'friends', 'Benny looks out for Wren and pretends he doesn\'t.'], ['wren', 'mina', 'rivals', 'They were roommates in first year, before Wren dropped out. Neither has forgiven the other.'], ['silas', 'jules', 'exes', 'They lived together for a year, and the songs about it are still on Silas\'s set list.'], ['silas', 'ollie', 'friends', 'Silas gives Ollie free lessons on stage nerves, and Ollie pays him in sandwiches.'], ['kit', 'nell', 'friends', 'They have known each other a very long time, perhaps longer than seems possible.'], ['kit', 'hazel', 'friends', 'Kit supplies the pet shop\'s catnip and Hazel supplies Kit\'s gossip about dogs.'], ['morrow', 'fen', 'friends', 'They arrived in Hollowbrook around the same time, and neither will say from where.'], ['dee', 'hazel', 'friends', 'Their shops share a wall in the shopping centre and a kettle in the back.'], ['fen', 'benny', 'rivals', 'Two people, one river, and some strong opinions about who has right of way.']];
  function links(id) {
    return RELATIONS.filter(function (r) {
      return r[0] === id || r[1] === id;
    }).map(function (r) {
      return {
        other: r[0] === id ? r[1] : r[0],
        type: r[2],
        note: r[3],
        key: [r[0], r[1]].sort().join('_')
      };
    });
  }
  function linkOf(a, b) {
    return links(a).find(function (l) {
      return l.other === b;
    }) || null;
  }
  // Word gets around: helping or hurting someone shifts how their friends and rivals see you.
  function ripple(state, id, kind) {
    links(id).forEach(function (l) {
      if (!rel(state, l.other)) return;
      var d = kind === 'help' ? l.type === 'friends' ? 3 : l.type === 'rivals' ? -2 : 0 : l.type === 'friends' ? -3 : l.type === 'rivals' ? 1 : 0;
      if (d) _changeRep(state, l.other, d, true);
    });
  }
  var PAIR_LINES = {
    friends: ['are deep in conversation, laughing at something only they understand.', 'wave at each other across the room like old friends.', 'are sharing a bag of crisps and arguing amiably.'],
    rivals: ['are pointedly ignoring each other.', 'exchange a very polite, very frosty nod.', 'are arguing in low voices. They stop when they see you.'],
    exes: ['are carefully standing as far apart as possible.', 'catch each other\'s eye, then both look away too quickly.', 'have a stiff, short conversation that seems to cost them both.']
  };
  function pairScenes(state, here) {
    var out = [];
    for (var i = 0; i < here.length; i++) for (var j = i + 1; j < here.length; j++) {
      var l = linkOf(here[i], here[j]);
      if (l) {
        out.push(nm(here[i]) + " and " + nm(here[j]) + " " + pick(PAIR_LINES[l.type]));
        setFlag(state, 'link_' + l.key);
      }
    }
    return out;
  }
  // Jealousy: flirting while you're with someone else
  function flirtJealousy(state, id) {
    var ps = partners(state).filter(function (p) {
      return p !== id;
    });
    if (!ps.length) return '';
    var here = present(state);
    var seen = ps.find(function (p) {
      return here.includes(p);
    });
    var N = ns(state);
    if (seen) {
      var r = rel(state, seen);
      _changeRep(state, seen, -10);
      r.aff = clamp(r.aff - 20, 0, 100);
      window.G.notify(BY_ID[seen].name + ": Affection -20", 'down');
      if (r.aff < 30) {
        r.romance = 1;
        window.G.notify(BY_ID[seen].name + " has ended things with you.", 'down');
      }
      return "<p>" + nm(seen) + " saw that. " + pronouns(seen).Sub + " " + (pronouns(seen).be === 'are' ? 'turn' : 'turns') + " and " + (pronouns(seen).be === 'are' ? 'walk' : 'walks') + " out without a word.</p>";
    }
    N.rumors = N.rumors || [];
    var chance = 0.18 + (rel(state, 'dee').met ? 0.1 : 0);
    ps.forEach(function (p) {
      var close = linkOf(p, id) && linkOf(p, id).type === 'friends' ? 0.15 : 0;
      if (Math.random() < chance + close) N.rumors.push({
        partner: p,
        with: id,
        day: time().day
      });
    });
    return '';
  }
  function processRumors(state) {
    var N = ns(state);
    (N.rumors || []).forEach(function (rm) {
      var r = rel(state, rm.partner);
      if (!r || r.romance < 3) return;
      window.G.notify(BY_ID[rm.partner].name + " heard you were flirting with " + BY_ID[rm.with].name + ".", 'down');
      _changeRep(state, rm.partner, -6);
      r.aff = clamp(r.aff - 12, 0, 100);
      window.G.notify(BY_ID[rm.partner].name + ": Affection -12", 'down');
      r.hurt = time().day;
      if (r.aff < 30) {
        r.romance = 1;
        window.G.notify(BY_ID[rm.partner].name + " has ended things with you.", 'down');
      }
    });
    N.rumors = [];
  }
  // Greeting extras: exes of your partner, a recent hurt, full moon and market-day touches
  function socialGreet(state, id) {
    var t = time(),
      r = rel(state, id);
    var out = '';
    if (r.hurt !== undefined && t.day - r.hurt <= 1 && r.romance >= 3) out += "<p>" + nm(id) + " is quiet with you today. Something you did got back to " + pronouns(id).obj + ".</p>";
    var ex = links(id).find(function (l) {
      return l.type === 'exes' && rel(state, l.other) && rel(state, l.other).romance >= 3;
    });
    if (ex && r.exDay !== t.day) {
      r.exDay = t.day;
      out += "<p>" + nm(id) + ": \"So. You and " + BY_ID[ex.other].name + ".\" A pause. \"Good luck with that.\"</p>";
    }
    var W = window.G.world || {};
    try {
      if (W.moonFull && W.moonFull() && t.hour >= 19 && ['kit', 'morrow', 'nell', 'fen'].includes(id)) out += "<p>" + nm(id) + " keeps glancing up at the full moon, " + pick(['restless', 'oddly bright-eyed', 'humming under their breath']) + ".</p>";
    } catch (e) {}
    return out;
  }
  // Saturday farmers' market: some people set up stalls in the square
  var MARKET_STALLS = {
    rosa: 'tomatoes',
    jules: 'bread',
    kit: 'cut flowers',
    nell: 'herbs and tinctures',
    benny: 'smoked fish'
  };

  // ---------- Dialogue trees (topics) ----------
  // Each topic: { label, need(state,id)->bool, run(state,id)->{text,minutes} }
  var TOPICS = [{
    label: 'Chat',
    need: function need() {
      return true;
    },
    run: function run(state, id) {
      var st = _stage(state, id).key;
      var pool = rel(state, id).romance >= 3 && DATING_LINES[id] ? DATING_LINES[id] : SMALLTALK[id][st] || SMALLTALK[id].neutral;
      var r = rel(state, id);
      var t = time();
      var gain = 0;
      if (r.lastChatDay !== t.day) {
        gain = st === 'hostile' ? 1 : 3;
        r.lastChatDay = t.day;
      }
      if (gain) _changeRep(state, id, gain);
      return {
        text: nm(id) + ": " + pick(pool),
        minutes: 10
      };
    }
  }, {
    label: 'Ask about them',
    need: function need(s, id) {
      return rel(s, id).rep >= -10;
    },
    run: function run(state, id) {
      var n = BY_ID[id],
        p = pronouns(id);
      rel(state, id).known = true;
      var b = BIRTHDAYS[id];
      var bt = '';
      if (b && rel(state, id).rep >= 15) {
        setFlag(state, 'bday_' + id);
        bt = " Their birthday is day " + b[1] + " of " + b[0] + ".";
      }
      return {
        text: nm(id) + " is " + n.role.toLowerCase() + ". " + n.blurb + " " + p.Sub + " " + p.be + " " + (typeof n.age === 'number' ? n.age : n.age) + "." + bt,
        minutes: 10
      };
    }
  }, {
    label: 'Ask who they\'re close to',
    need: function need(s, id) {
      return rel(s, id).rep >= 10 && links(id).length > 0;
    },
    run: function run(state, id) {
      var ls = links(id),
        unknown = ls.filter(function (l) {
          return !flag(state, 'link_' + l.key);
        });
      var l = unknown.length ? pick(unknown) : pick(ls);
      setFlag(state, 'link_' + l.key);
      var lead = {
        friends: "\"" + BY_ID[l.other].name + "? We're good friends.\"",
        rivals: pronouns(id).Sub + " " + (pronouns(id).be === 'are' ? 'roll' : 'rolls') + " " + pronouns(id).pos + " eyes. \"Don't get me started on " + BY_ID[l.other].name + ".\"",
        exes: pronouns(id).Sub + " " + (pronouns(id).be === 'are' ? 'go' : 'goes') + " a little quiet. \"" + BY_ID[l.other].name + " and I used to be together.\""
      }[l.type];
      return {
        text: nm(id) + ": " + lead + " " + l.note,
        minutes: 10
      };
    }
  }, {
    label: 'Compliment',
    need: function need(s, id) {
      return rel(s, id).rep >= 0;
    },
    run: function run(state, id) {
      var r = rel(state, id),
        t = time();
      if (r.lastCompDay === t.day) {
        _changeRep(state, id, -2);
        return {
          text: nm(id) + " gives you a look. \"Twice in one day? Laying it on a bit thick.\"",
          minutes: 5
        };
      }
      r.lastCompDay = t.day;
      _changeRep(state, id, 2);
      if (r.rep >= 15) changeAff(state, id, 3);
      return {
        text: "You tell " + nm(id) + " something nice and mean it. " + pronouns(id).Sub + " " + (pronouns(id).be === 'are' ? 'look' : 'looks') + " pleased.",
        minutes: 5
      };
    }
  }, {
    label: 'Flirt',
    need: function need(s, id) {
      return rel(s, id).rep >= 15;
    },
    run: function run(state, id) {
      var r = rel(state, id),
        t = time();
      if (r.lastFlirtDay === t.day) return {
        text: nm(id) + " laughs. \"Save some charm for tomorrow.\"",
        minutes: 5
      };
      r.lastFlirtDay = t.day;
      var chance = 0.35 + r.rep / 200 + r.aff / 300;
      if (Math.random() < chance) {
        changeAff(state, id, 5);
        var jl = flirtJealousy(state, id);
        return {
          text: jl + ("You flirt with " + nm(id) + ". " + pick(['A slow smile.', 'They duck their head, cheeks warm.', 'A laugh, and a lingering look.', '"Oh, is that how it is?"'])),
          minutes: 10
        };
      }
      _changeRep(state, id, -3);
      safeChange('stats.needs.stress', 20);
      return {
        text: "You flirt with " + nm(id) + ". It lands badly. An awkward silence settles.",
        minutes: 10
      };
    }
  }, {
    label: 'Talk about something real',
    need: function need(s, id) {
      var k = rel(s, id).heart || 0;
      return HEART[id] && k < 3 && rel(s, id).rep >= [15, 40, 70][k] && rel(s, id).heartDay !== time().day;
    },
    heart: true
  }, {
    label: 'Give a gift',
    need: function need(s, id) {
      return Object.keys(ITEMS).some(function (it) {
        return has(s, it);
      });
    },
    sub: true
  }, {
    label: 'Ask on a date',
    need: function need(s, id) {
      return rel(s, id).romance >= 3;
    },
    run: function run(state, id) {
      var t = time();
      var d = ns(state).dates;
      if (d[id] && d[id].day === t.day) return {
        text: "\"We already saw each other today, silly.\"",
        minutes: 5
      };
      var spot = pick(['cafe', 'park', 'main_street']);
      d[id] = {
        day: t.day,
        loc: spot,
        active: false,
        hour: Math.min(21, Math.max(t.hour + 2, 18))
      };
      return {
        text: nm(id) + " lights up. \"Meet me at the " + (window.G.world && window.G.world.location(spot) ? window.G.world.location(spot).name : spot) + " around " + d[id].hour + ":00?\"",
        minutes: 10
      };
    }
  }, {
    label: 'End things',
    need: function need(s, id) {
      return rel(s, id).romance >= 3;
    },
    run: function run(state, id) {
      var r = rel(state, id);
      r.romance = 1;
      r.aff = 20;
      _changeRep(state, id, -15);
      window.G.notify("You and " + BY_ID[id].name + " are no longer together.", 'down');
      safeChange('stats.needs.stress', 120);
      return {
        text: "You tell " + nm(id) + " it's over. " + pick(['They nod slowly, eyes shining, and don\'t say anything at all.', '"I had a feeling," they say quietly.', 'There is a long, awful silence.']),
        minutes: 20
      };
    }
  }, {
    label: 'Insult',
    need: function need() {
      return true;
    },
    run: function run(state, id) {
      _changeRep(state, id, -10);
      if (rel(state, id).aff > 0) changeAff(state, id, -8);
      ripple(state, id, 'hurt');
      return {
        text: "You say something cutting to " + nm(id) + ". " + pick(['They stare at you, hurt.', 'Their face closes like a door.', '"Wow. Okay."']),
        minutes: 5
      };
    }
  }, {
    label: 'Say goodbye',
    need: function need() {
      return true;
    },
    run: function run(state, id) {
      ns(state).talking = null;
      return {
        text: "You say goodbye to " + nm(id) + ".",
        minutes: 1
      };
    }
  }];

  // ---------- Quests ----------
  // step: { text, done(state)->bool }   Journal shows the first undone step.
  var QUESTS = {
    // Regular quests
    rosa_meds: {
      giver: 'rosa',
      title: 'Rosa\'s Prescription',
      minRep: 0,
      offer: '"Would you be a dear and pick up my blood pressure pills from the market? My hip won\'t make it today."',
      summary: 'Rosa needs her medication picked up from the market pharmacy counter.',
      steps: [{
        text: 'Collect Rosa\'s prescription at the market.',
        done: function done(s) {
          return flag(s, 'rosa_meds_got');
        }
      }, {
        text: 'Bring the pills back to Rosa.',
        done: function done(s) {
          return flag(s, 'rosa_meds_given');
        }
      }],
      reward: function reward(s) {
        _changeRep(s, 'rosa', 12);
        safeChange('money', 10);
        safeChange('stats.status.kindnessFame', 5);
      }
    },
    hart_book: {
      giver: 'hart',
      title: 'The Overdue Volume',
      minRep: 0,
      offer: '"I\'ve lost my annotated Dickinson. I suspect the library. Would you look?"',
      summary: 'Professor Hart misplaced his annotated poetry collection, probably at the library.',
      steps: [{
        text: 'Search the library for Hart\'s book.',
        done: function done(s) {
          return flag(s, 'hart_book_got');
        }
      }, {
        text: 'Return the book to Professor Hart.',
        done: function done(s) {
          return flag(s, 'hart_book_given');
        }
      }],
      reward: function reward(s) {
        _changeRep(s, 'hart', 12);
        safeChange('school.grades.lit', 5);
      }
    },
    marcus_stock: {
      giver: 'marcus',
      title: 'Inventory Day',
      minRep: 5,
      offer: '"I need someone to count crates for two hours. Thirty dollars. Interested?"',
      summary: 'Marcus will pay you to help count stock at the store.',
      steps: [{
        text: 'Help Marcus with inventory at the market (2 hours).',
        done: function done(s) {
          return flag(s, 'marcus_stock_done');
        }
      }],
      reward: function reward(s) {
        _changeRep(s, 'marcus', 8);
        safeChange('money', 30);
        safeChange('stats.status.businessFame', 5);
      }
    },
    wren_parcel: {
      giver: 'wren',
      title: 'No Questions Asked',
      minRep: 10,
      offer: '"Need a parcel taken to the old mill. Don\'t open it. Don\'t get seen."',
      summary: 'Wren asked you to carry a mysterious parcel to the Old Mill, quietly.',
      steps: [{
        text: 'Take Wren\'s parcel to the Old Mill after dark (20:00 or later).',
        done: function done(s) {
          return flag(s, 'wren_parcel_done');
        }
      }],
      reward: function reward(s) {
        _changeRep(s, 'wren', 15);
        safeChange('money', 25);
        safeChange('stats.status.crime', 5);
      }
    },
    okafor_laps: {
      giver: 'okafor',
      title: 'Morning Discipline',
      minRep: 0,
      offer: '"Show up at the park at six, three mornings. Prove you\'re serious."',
      summary: 'Coach Okafor challenged you to train at the park at 6 a.m. on three mornings.',
      steps: [{
        text: 'Run laps at the park between 6:00 and 7:00 (3 times).',
        done: function done(s) {
          return (ns(s).counters.okafor_laps || 0) >= 3;
        }
      }],
      reward: function reward(s) {
        _changeRep(s, 'okafor', 15);
        window.G.stats && window.G.stats.train ? window.G.stats.train('physique', 20) : safeChange('stats.core.physique.value', 20);
      }
    },
    hazel_ferret: {
      giver: 'hazel',
      title: 'The Escape Artist',
      minRep: 10,
      offer: '"Biscuit got out. Again. He\'s a ferret, he\'s brown, he\'s an idiot. Check the shopping centre atrium and the park?"',
      summary: 'Biscuit the ferret escaped from Hazel\'s pet shop. He was last seen heading for the atrium or the park.',
      steps: [{
        text: 'Search the shopping centre atrium or the park for Biscuit.',
        done: function done(s) {
          return flag(s, 'hazel_ferret_got');
        }
      }, {
        text: 'Bring Biscuit back to Hazel.',
        done: function done(s) {
          return flag(s, 'hazel_ferret_given');
        }
      }],
      reward: function reward(s) {
        _changeRep(s, 'hazel', 15);
        safeChange('stats.status.kindnessFame', 3);
        if (window.G.stats && window.G.stats.trainSkill) {
          try {
            window.G.stats.trainSkill('tending', 20);
          } catch (e) {}
        }
      }
    },
    // Romance quests (unlock at Smitten; completing one starts dating)
    rom_sam: {
      giver: 'sam',
      title: 'Sit for a Portrait',
      romance: true,
      offer: '"Would you... sit for me? For a portrait. In the park, at golden hour."',
      summary: 'Sam wants to paint your portrait in the park at golden hour.',
      steps: [{
        text: 'Buy Sam a new sketchbook.',
        done: function done(s) {
          return flag(s, 'rom_sam_gift');
        }
      }, {
        text: 'Meet Sam at the park between 16:00 and 19:00 and sit for the portrait.',
        done: function done(s) {
          return flag(s, 'rom_sam_sat');
        }
      }]
    },
    rom_theo: {
      giver: 'theo',
      title: 'Dawn on the Water',
      romance: true,
      offer: '"Come out on the boat with me. Just us. Docks, six a.m. Before anyone else."',
      summary: 'Theo invited you rowing at dawn, just the two of you.',
      steps: [{
        text: 'Meet Theo at the docks between 6:00 and 8:00.',
        done: function done(s) {
          return flag(s, 'rom_theo_row');
        }
      }]
    },
    rom_kit: {
      giver: 'kit',
      title: 'The Moonflower',
      romance: true,
      offer: '"There\'s a moonflower that only opens one night a month. Find me in the park after dark?"',
      summary: 'Kit wants to show you a rare moonflower blooming in the park at night.',
      steps: [{
        text: 'Ask Rosa about the old moonflower patch.',
        done: function done(s) {
          return flag(s, 'rom_kit_rosa');
        }
      }, {
        text: 'Meet Kit in the park after 20:00.',
        done: function done(s) {
          return flag(s, 'rom_kit_bloom');
        }
      }]
    },
    rom_wren: {
      giver: 'wren',
      title: 'Rooftop',
      romance: true,
      offer: '"I know a roof with the best view in town. Nobody else knows it. Bring food."',
      summary: 'Wren wants to show you a secret rooftop. Bring something to eat.',
      steps: [{
        text: 'Bring a sandwich.',
        done: function done(s) {
          return has(s, 'sandwich') || flag(s, 'rom_wren_food');
        }
      }, {
        text: 'Meet Wren in the alley after 19:00.',
        done: function done(s) {
          return flag(s, 'rom_wren_roof');
        }
      }]
    }
  };
  // ---------- Hollowbrook Grocer: Dot the cashier + classmates out shopping ----------
  Object.assign(SMALLTALK, {
    dot: {
      cold: ['"Card or cash. Bag\'s five cents."'],
      neutral: ['"You\'re one of the college lot. I can tell by the noodles."', '"Milk\'s on offer. Don\'t buy the one at the front, it\'s the oldest."', '"Self-checkout\'s broken again. Thank goodness. I hate that thing."'],
      friendly: ['"I put a few of the good apples aside. Don\'t tell the manager."', '"You\'re eating better. I notice these things. It\'s my job, practically."'],
      friend: ['"Thirty-one years on this till. I\'ve rung up half this town\'s weddings and all of its hangovers."'],
      close: ['She slips a chocolate bar into your bag without scanning it and winks. "Staff discount. Very unofficial."']
    }
  });
  Object.assign(DATING_LINES, {
    dot: ['"Closing up in ten. Walk me to the bus?"', 'She has saved you the last fresh loaf, wrapped in paper with a little heart drawn on it.']
  });
  Object.assign(HEART, {
    dot: [{
      prompt: '"Do you ever think about what people buy? It tells you everything."',
      replies: [{
        label: '"What does mine say?"',
        text: '"That you\'re tired and you\'re trying. Mostly trying." She smiles. "It\'s a good basket."',
        rep: 5,
        aff: 2
      }, {
        label: '"That\'s a bit nosy."',
        text: '"Nosy\'s free. Bag\'s five cents."',
        rep: 2
      }, {
        label: '"Tell me a secret one."',
        text: '"The mayor buys the same frozen lasagne every Friday. Every. Friday."',
        rep: 4,
        aff: 2
      }]
    }, {
      prompt: '"My husband used to do the late shift with me. Six years gone now."',
      replies: [{
        label: '"What was he like?"',
        text: '"Terrible at maths. Wonderful at everything else." Her voice catches, then steadies.',
        rep: 6,
        aff: 3
      }, {
        label: '"I\'m sorry."',
        text: '"Don\'t be. I had him. Plenty don\'t get that."',
        rep: 4
      }, {
        label: 'Help her stack the baskets',
        text: 'You work side by side in silence. She squeezes your arm when you\'re done.',
        rep: 5,
        aff: 3
      }]
    }, {
      prompt: '"A chain wants to buy the shop off Marcus. I\'ve not told anyone."',
      replies: [{
        label: '"We\'ll fight it."',
        text: '"We?" She laughs, and then she cries a little, and then she laughs again. "We, then."',
        rep: 7,
        aff: 6
      }, {
        label: '"Talk to Mina. She loves a petition."',
        text: '"The council girl? Maybe I will."',
        rep: 5,
        aff: 2
      }, {
        label: '"Would you retire?"',
        text: '"And do what? Talk to the cat?"',
        rep: 3
      }]
    }]
  });
  Object.assign(PET_REACT, {
    dot: {
      like: 1,
      line: '"No dogs in the shop, love." She sneaks it a biscuit anyway.'
    }
  });
  Object.assign(BIRTHDAYS, {
    dot: ['Spring', 17]
  });
  INVITE_SPOT.dot = 'cafe';
  Object.assign(ROMANCE_PLUS, {
    dot: {
      title: 'Closing Time',
      offer: '"I\'ve never once left this shop on time. Come by at closing and make me. Bring something sweet."',
      summary: 'Dot wants you to come by Hollowbrook Grocer at closing time. Bring chocolate.',
      steps: [{
        kind: 'item',
        item: 'chocolate',
        text: 'Bring Dot a bar of chocolate.'
      }, {
        kind: 'meet',
        loc: 'market',
        from: 21,
        to: 22,
        text: 'Meet Dot at Hollowbrook Grocer between 21:00 and 22:00.',
        scene: 'Dot switches off the lights aisle by aisle until only the fridges hum. You share the chocolate sitting on the counter, legs swinging like teenagers. She tells you she always wanted to see the sea in winter. When she kisses you, she tastes of chocolate and she laughs into it, and then the evening is just yours.'
      }]
    }
  });
  RELATIONS.push(['dot', 'rosa', 'friends', 'Rosa and Dot have done the Sunday crossword together for twenty years.'], ['dot', 'marcus', 'friends', 'Marcus owns the Grocer, but everyone knows Dot runs it. They bicker like an old married couple.'], ['dot', 'jules', 'friends', 'Jules bakes the bread Dot sells, and Dot pretends not to know Jules eats half of it.']);
  // ---------- Officer Dunn, town constable ----------
  Object.assign(SMALLTALK, {
    dunn: {
      cold: ['"Keep your nose clean and we\'ll get along fine."'],
      neutral: ['"Afternoon. Mind the cobbles, they\'re slick after rain."', '"Student? Lock your bike. Twice."', '"Quiet day. I like quiet days."'],
      friendly: ['"If anyone gives you bother on the late bus, you tell me."', 'He offers you a cup of tea from his Thermos. It is extremely strong.'],
      friend: ['"Twenty years on this beat. Most of it is lost cats and parking. I wouldn\'t swap it."'],
      close: ['"You\'re one of the good ones. Don\'t let this town tell you otherwise."']
    }
  });
  Object.assign(DATING_LINES, {
    dunn: ['"Shift ends at eight. I know a bench by the millpond with the best view in town."']
  });
  Object.assign(HEART, {
    dunn: [{
      prompt: '"People think the job is catching criminals. It\'s mostly listening."',
      replies: [{
        label: '"Listening to what?"',
        text: '"Whatever people need to say before they feel better." He taps his notebook. "Then I write it down so they know it mattered."',
        rep: 5,
        aff: 2
      }, {
        label: '"Sounds boring."',
        text: '"Boring is the goal," he says, not offended at all.',
        rep: 2
      }, {
        label: 'Walk a lap of the square with him',
        text: 'He nods to every shopkeeper by name. Every one of them nods back.',
        rep: 5,
        aff: 3
      }]
    }]
  });
  Object.assign(PET_REACT, {
    dunn: {
      like: 1,
      line: 'He crouches, very seriously, and lets it sniff his glove. "Good dog. Law-abiding."'
    }
  });
  Object.assign(BIRTHDAYS, {
    dunn: ['Autumn', 9]
  });
  INVITE_SPOT.dunn = 'cafe';
  RELATIONS.push(['dunn', 'dot', 'friends', 'Dunn buys his tea biscuits from Dot every morning and pretends it\'s a security check.'], ['dunn', 'wren', 'rivals', 'Dunn has never quite caught Wren at anything, and they both know it.']);
  var _loop2 = function _loop2() {
    var R = ROMANCE_PLUS[id],
      qid = 'rom_' + id;
    QUESTS[qid] = {
      giver: id,
      title: R.title,
      romance: true,
      offer: R.offer,
      summary: R.summary,
      plus: R,
      steps: R.steps.map(function (st, i) {
        return {
          text: st.text,
          done: function done(s) {
            return flag(s, qid + '_s' + i);
          }
        };
      })
    };
  };
  for (var id in ROMANCE_PLUS) {
    _loop2();
  }
  // Generic romance quest for anyone without a bespoke one.
  ROSTER.forEach(function (n) {
    var qid = 'rom_' + n.id;
    if (QUESTS[qid]) return;
    QUESTS[qid] = {
      giver: n.id,
      title: "An Evening with " + (n.name.split(' ')[0] === 'Professor' || n.name.split(' ')[0] === 'Coach' ? n.name.split(' ').slice(1).join(' ') : n.name.split(' ')[0]),
      romance: true,
      offer: "\"Would you want to... have dinner sometime? Somewhere quiet.\"",
      summary: n.name + " asked you to a quiet dinner. Bring something thoughtful.",
      steps: [{
        text: "Bring " + n.name + " a gift that suits their tastes.",
        done: function done(s) {
          return flag(s, qid + '_gift');
        }
      }, {
        text: 'Meet at the cafe between 18:00 and 21:00.',
        done: function done(s) {
          return flag(s, qid + '_dinner');
        }
      }]
    };
  });

  // ---------- Phase 4: two more quests per NPC ----------
  // Steps run in order. kinds: item (give to `to` or the giver), talk (talk to `to`), go (an action at loc during [from,to)).
  var It = function It(item, text, to) {
    return {
      kind: 'item',
      item: item,
      text: text,
      to: to
    };
  };
  var Tk = function Tk(to, text, label, reply) {
    return {
      kind: 'talk',
      to: to,
      text: text,
      label: label,
      reply: reply
    };
  };
  // Usual duration for an option, read from the literal minutes its run() returns (most common value; ties go to the longer one).
  var minsCache = new Map();
  var guessMins = function guessMins(fn) {
    if (typeof fn !== 'function') return null;
    if (minsCache.has(fn)) return minsCache.get(fn);
    var c = {};
    String(fn).replace(/minutes\s*:\s*(\d+)/g, function (m, v) {
      c[v] = (c[v] || 0) + 1;
      return m;
    });
    var best = null;
    Object.keys(c).forEach(function (v) {
      if (+v > 0 && (best === null || c[v] > c[best] || c[v] === c[best] && +v > +best)) best = v;
    });
    var r = best === null ? null : +best;
    minsCache.set(fn, r);
    return r;
  };
  var Go = function Go(loc, from, to, text, label, scene, minutes, fx) {
    return Object.assign({
      kind: 'go',
      loc: loc,
      from: from,
      to: to,
      text: text,
      label: label,
      scene: scene,
      minutes: minutes || 60
    }, fx || {});
  };
  var QX = [
  // Eleanor
  {
    id: 'eleanor_notices',
    giver: 'eleanor',
    title: 'Notices',
    minRep: 5,
    offer: '"The town meeting notices need putting up. The square, Main Street, the shopping centre. Would you? The intern is at an exam."',
    summary: 'Eleanor needs town meeting notices pinned up around Hollowbrook.',
    steps: [Go('town_square', 8, 20, 'Pin a notice on the Town Square board.', 'Pin up Eleanor\'s notice', 'You pin the notice between a lost cat poster and an advert for guitar lessons.', 15), Go('main_street', 8, 20, 'Pin a notice on Main Street.', 'Pin up Eleanor\'s notice', 'A shopkeeper lets you tape it inside her window and reads it twice.', 15), Go('shopping_centre', 9, 20, 'Pin a notice in the shopping centre.', 'Pin up Eleanor\'s notice', 'Security pretends not to see you use their corkboard.', 15)],
    reward: {
      rep: 10,
      money: 15,
      fame: ['kindnessFame', 3]
    }
  }, {
    id: 'eleanor_listening',
    giver: 'eleanor',
    title: 'Listening Tour',
    minRep: 35,
    after: 'eleanor_notices',
    offer: '"Mina tells me the students think I never listen. Bring me three honest complaints. Honest ones. I can take it."',
    summary: 'Eleanor wants three honest complaints about the town from students.',
    steps: [Tk('mina', 'Ask Mina what students really think of the mayor.', 'Ask what students think of the mayor', '"Bus fares, rents, and the fact the library shuts at eleven during exams. Tell her I said so."'), Tk('theo', 'Ask Theo for a complaint.', 'Ask Theo what he\'d tell the mayor', '"The river path has no lights. We row at six and nearly die every morning."'), Tk('sam', 'Ask Sam for a complaint.', 'Ask Sam what they\'d tell the mayor', '"There\'s nowhere in town for students to show art. Not one wall."'), Tk('eleanor', 'Report back to Eleanor.', 'Give Eleanor the complaints', 'She writes every word down. "Lights on the river path. That I can do by spring."')],
    reward: {
      rep: 12,
      fame: ['socialiteFame', 6]
    }
  },
  // Marcus
  {
    id: 'marcus_rounds',
    giver: 'marcus',
    title: 'Deliveries',
    minRep: 5,
    offer: '"My van\'s in the shop. Two boxes need delivering: Rosa on Elm Row, and Jules\'s flour. Twenty dollars."',
    summary: 'Marcus needs two grocery boxes delivered by hand.',
    steps: [Tk('rosa', 'Deliver Rosa\'s grocery box.', 'Hand Rosa her grocery box', '"Finally! Tell Marcus his tomatoes are a disgrace. Mine are better."'), Tk('jules', 'Deliver Jules\'s flour order.', 'Hand Jules the flour order', '"Twenty-five kilos. You carried this? You\'re my hero for at least an hour."')],
    reward: {
      rep: 8,
      money: 20,
      fame: ['businessFame', 3]
    }
  }, {
    id: 'marcus_benny',
    giver: 'marcus',
    title: 'The Supplier',
    minRep: 35,
    after: 'marcus_rounds',
    offer: '"Benny Moss sells fish off his boat for half my price. I can\'t beat him, so maybe I should buy from him. Put out feelers? He won\'t talk to me."',
    summary: 'Marcus wants you to sound out Benny Moss about supplying the store.',
    steps: [Tk('benny', 'Put Marcus\'s offer to Benny at the docks.', 'Tell Benny that Marcus wants to buy his fish', 'Benny squints. "Vane wants my fish? Tell him fair price, cash, and he says please. In person."'), Tk('marcus', 'Tell Marcus what Benny said.', 'Tell Marcus what Benny said', '"In person. And please." Marcus pinches the bridge of his nose. "...Fine. Fine!"')],
    reward: {
      rep: 10,
      money: 25,
      fame: ['businessFame', 5],
      also: {
        benny: 5
      }
    }
  },
  // Hart
  {
    id: 'hart_found_poem',
    giver: 'hart',
    title: 'Found Poetry',
    minRep: 5,
    offer: '"An assignment, just for you: find me poetry in the wild. Graffiti, a gravestone, anything someone meant."',
    summary: 'Professor Hart wants you to find two pieces of poetry out in the world.',
    steps: [Go('alley', 0, 24, 'Copy down the verse sprayed in the Back Alley.', 'Copy the verse sprayed on the alley wall', 'In faded silver paint, half hidden by a drainpipe: "we were here, and it was loud, and it was ours." You copy it carefully.', 20), Go('church', 7, 20, 'Copy an epitaph in St. Aldric\'s churchyard.', 'Copy an epitaph in the churchyard', 'On a mossy stone: "She kept the light on." Nothing else. It is the best poem you have read all term.', 30), Tk('hart', 'Bring your findings to Professor Hart.', 'Show Professor Hart your found poems', 'He reads them twice, then a third time. "This," he taps the epitaph, "is why we bother."')],
    reward: {
      rep: 10,
      train: ['awareness', 10]
    }
  }, {
    id: 'hart_novel',
    giver: 'hart',
    title: 'The Manuscript',
    minRep: 35,
    after: 'hart_found_poem',
    offer: '"I\'ve finished the novel. I need one honest reader, and then Priya Raman, who will be brutal. Will you read it? I left a copy at the library desk."',
    summary: 'Professor Hart finished his novel and wants honest readers.',
    steps: [Go('library', 8, 23, 'Read Hart\'s manuscript at the library (3 hours).', 'Read Hart\'s manuscript', 'Three hundred pages about a lighthouse keeper who writes letters to no one. It is slow, and strange, and the last chapter makes you put it down and stare out of the window.', 180, {
      fatigue: 60
    }), Tk('raman', 'Get Dr. Raman\'s verdict.', 'Ask Dr. Raman what she thought of Hart\'s novel', '"Chapter four is unforgivable. The ending is the best thing he\'s ever written. Do not tell him I said the second part."'), Tk('hart', 'Give Professor Hart your verdict.', 'Give Professor Hart your honest verdict', 'He listens without interrupting, which you suspect is a first. "The ending. Really?" He looks younger.')],
    reward: {
      rep: 15,
      train: ['willpower', 10],
      grade: ['lit', 5]
    }
  },
  // Okafor
  {
    id: 'okafor_bibs',
    giver: 'okafor',
    title: 'Lost Kit',
    minRep: 5,
    offer: '"Somebody left the team bibs at the docks after the river run. Bring them back before they walk off by themselves."',
    summary: 'Coach Okafor needs the team bibs fetched from the docks.',
    steps: [Go('docks', 6, 22, 'Collect the bag of bibs from the River Docks.', 'Collect the abandoned team bibs', 'The bag is under a bench, damp and indescribably fragrant. You carry it at arm\'s length.', 15), Tk('okafor', 'Return the bibs to Coach Okafor.', 'Hand Coach Okafor the bibs', '"Don\'t breathe in. Good lad. Good lass. Good whatever you are. Thank you."')],
    reward: {
      rep: 8,
      train: ['physique', 5]
    }
  }, {
    id: 'okafor_trials',
    giver: 'okafor',
    title: 'Time Trial',
    minRep: 35,
    after: 'okafor_bibs',
    offer: '"I\'ve seen you train. Drills with Theo in the gym, then a dawn time trial at the docks. Show me what you\'ve got."',
    summary: 'Coach Okafor wants to see you do drills and a dawn time trial.',
    steps: [Go('gym', 15, 18, 'Do sprint drills at the gym in the afternoon.', 'Run sprint drills', 'Shuttles, ladders, and Theo shouting encouragement that is mostly swearing. You nearly throw up. You don\'t.', 60, {
      fatigue: 120,
      thirst: -100
    }), Go('docks', 6, 8, 'Run the dawn time trial along the river path.', 'Run the dawn time trial', 'Mist, cold air, and your own breath. At the finish Okafor looks at her stopwatch for a long time. "Huh," she says. From her, that is a medal.', 45, {
      fatigue: 100
    }), Tk('okafor', 'Hear Coach Okafor\'s verdict.', 'Ask Coach Okafor how you did', '"You\'re on the list for the spring meet. Don\'t make me regret it."')],
    reward: {
      rep: 15,
      train: ['physique', 20],
      skill: ['athletics', 15]
    }
  },
  // Sam
  {
    id: 'sam_yellow',
    giver: 'sam',
    title: 'Cadmium Yellow',
    minRep: 5,
    offer: '"I ran out of yellow mid-sunflower. The grocer keeps paint on the craft shelf. I\'d go, but I\'m holding the composition in my head."',
    summary: 'Sam needs a tube of yellow paint from the grocer\'s craft shelf.',
    steps: [Go('market', 8, 21, 'Buy a tube of yellow paint at the grocer ($5).', 'Buy a tube of yellow paint ($5)', 'The last tube, hidden behind a stack of glitter glue.', 5, {
      cost: 5
    }), Tk('sam', 'Bring Sam the paint.', 'Give Sam the yellow paint', 'Sam snatches it and kisses the tube. "You saved this sunflower\'s life."')],
    reward: {
      rep: 8,
      aff: 2
    }
  }, {
    id: 'sam_show',
    giver: 'sam',
    title: 'Opening Night',
    minRep: 35,
    after: 'sam_yellow',
    offer: '"The student show needs hanging, and I want live music at the opening. Ollie would be perfect, but he\'d die if I asked. You ask."',
    summary: 'Help Sam hang the student art show and talk Ollie into playing the opening.',
    steps: [Go('lecture_hall', 16, 21, 'Help hang the student show in the lecture building.', 'Help hang the student art show', 'Two hours of spirit levels and arguing about whether a painting is upside down. It is, it turns out, meant to be.', 120), Tk('ollie', 'Talk Ollie into playing at the opening.', 'Ask Ollie to play at Sam\'s opening', 'He goes white, then pink. "For Sam? Okay. Okay. I\'ll play quietly. In a corner. Facing the wall."'), Go('quad', 17, 21, 'Go to the opening night on the quad.', 'Go to Sam\'s opening night', 'Fairy lights, warm wine, and Ollie playing in a corner, facing the wall, beautifully. Sam cries a little when someone buys a painting.', 90, {
      stress: -60
    })],
    reward: {
      rep: 15,
      train: ['beauty', 5],
      also: {
        ollie: 4
      }
    }
  },
  // Theo
  {
    id: 'theo_essay',
    giver: 'theo',
    title: 'Due Friday',
    minRep: 5,
    offer: '"I have an essay due Friday and I have written the title. Help? Hart said to use proper sources, whatever those are."',
    summary: 'Theo needs help with an essay. Get sources from Professor Hart, then sit with him at the library.',
    steps: [Tk('hart', 'Ask Professor Hart which sources Theo should use.', 'Ask Professor Hart about sources for Theo\'s essay', '"Tell Mr. Lindqvist that Wikipedia is not a source, it is a mood. Here, three books."'), Go('library', 17, 23, 'Help Theo write the essay at the library.', 'Help Theo with his essay', 'Theo writes four hundred words, deletes three hundred, then gets it. "Oh! It\'s like rowing! You just keep going!" It is not like rowing. It works anyway.', 120), Tk('theo', 'Check in with Theo.', 'Ask Theo how the essay went', '"B-minus! A B-minus! I\'m framing it."')],
    reward: {
      rep: 10,
      train: ['awareness', 5]
    }
  }, {
    id: 'theo_sorry',
    giver: 'theo',
    title: 'Old Paint',
    minRep: 35,
    after: 'theo_essay',
    offer: '"Sam and I... it ended badly, first year. My fault. I want to say sorry properly. Would you give Sam flowers from me? I can\'t face it."',
    summary: 'Theo wants to apologise to his ex, Sam. Bring Sam a bouquet of flowers from him.',
    steps: [It('flowers', 'Give Sam a bouquet of flowers from Theo.', 'sam'), Tk('theo', 'Tell Theo how Sam took it.', 'Tell Theo how Sam took the flowers', 'He lets out a breath. "Sam said that? Okay. Okay." He looks lighter than you\'ve ever seen him.')],
    reward: {
      rep: 12,
      also: {
        sam: 6
      }
    }
  },
  // Rosa
  {
    id: 'rosa_blight',
    giver: 'rosa',
    title: 'Blight',
    minRep: 5,
    offer: '"My tomatoes have blight. I refuse to ask that witch in the woods. You ask her. Don\'t say it\'s for me."',
    summary: 'Rosa\'s tomatoes have blight. Ask Nell Bramble for a remedy without saying who it\'s for.',
    steps: [Tk('nell', 'Ask Nell Bramble for a blight remedy.', 'Ask Nell about a remedy for tomato blight', 'Nell hands you a jar without looking up. "Tell Rosa to water the roots, not the leaves. And that she is welcome."'), Go('residential', 7, 19, 'Treat Rosa\'s tomatoes on Elm Row.', 'Treat Rosa\'s tomatoes', 'You spray every plant and water at the roots. Rosa watches from the porch, arms folded, refusing to ask where the remedy came from.', 45), Tk('rosa', 'Tell Rosa the job\'s done.', 'Tell Rosa her tomatoes are treated', '"It worked? Of course it worked. I knew it would." A pause. "...Tell her thank you."')],
    reward: {
      rep: 10,
      skill: ['tending', 10],
      fame: ['kindnessFame', 3],
      also: {
        nell: 3
      }
    }
  }, {
    id: 'rosa_photos',
    giver: 'rosa',
    title: 'Miguel\'s Photographs',
    minRep: 35,
    after: 'rosa_blight',
    offer: '"There is a box of photos in my attic. Forty years. I want them in albums before my eyes go. And I forget what year we married, if you can believe it."',
    summary: 'Help Rosa sort her photos, and find her wedding date in the parish register.',
    steps: [Go('residential', 9, 20, 'Sort the photo box in Rosa\'s attic (2 hours).', 'Sort Rosa\'s photographs', 'Black-and-white weddings, colour christenings, a young man with a moustache laughing at the camera. You put them in order, and Rosa narrates every one.', 120), Go('church', 7, 20, 'Check St. Aldric\'s parish register for the wedding date.', 'Search the parish register', 'Delgado, Miguel, and Ortega, Rosa. The ink is brown with age. The fourteenth of June.', 30), Tk('rosa', 'Tell Rosa the date.', 'Tell Rosa her wedding date', '"The fourteenth. Of course. It rained." She holds your hand very tightly.')],
    reward: {
      rep: 15,
      fame: ['kindnessFame', 5]
    }
  },
  // Jules
  {
    id: 'jules_buns',
    giver: 'jules',
    title: 'Secret Ingredient',
    minRep: 5,
    offer: '"Rosa makes these conchas. I would sell my soul for that recipe. She won\'t give it to me. Charm it out of her."',
    summary: 'Jules wants Rosa\'s concha recipe. Coax it out of her.',
    steps: [Tk('rosa', 'Coax the concha recipe out of Rosa.', 'Ask Rosa for her concha recipe', '"For Jules? Fine. But the secret is lard, and patience, and you tell nobody else." She writes it on a napkin.'), Tk('jules', 'Give Jules the recipe.', 'Give Jules Rosa\'s recipe', 'Jules reads the napkin and puts a hand on their heart. "Lard. Of course it\'s lard."')],
    reward: {
      rep: 8,
      skill: ['cooking', 10],
      also: {
        rosa: 2
      }
    }
  }, {
    id: 'jules_stall',
    giver: 'jules',
    title: 'The Stall',
    minRep: 35,
    after: 'jules_buns',
    offer: '"I want to sell at the Saturday market. Just to see if anyone likes my bread. Run the stall with me? I can\'t do the talking-to-people part."',
    summary: 'Help Jules run a bread stall at the Saturday farmers\' market in the Town Square.',
    steps: [Go('town_square', 8, 13, 'Run Jules\'s bread stall at the Saturday market (8:00 to 13:00).', 'Run Jules\'s bread stall', 'You do the talking. Jules does the blushing. You sell out by eleven, and a woman asks if Jules does wedding cakes.', 180, {
      market: true,
      fatigue: 60
    }), Tk('jules', 'Split the takings with Jules.', 'Count the takings with Jules', '"Sold out. Sold. Out." They hug you, flour and all.')],
    reward: {
      rep: 15,
      money: 30,
      fame: ['businessFame', 5]
    }
  },
  // Wren
  {
    id: 'wren_skip',
    giver: 'wren',
    title: 'Skip Night',
    minRep: 5,
    offer: '"The shopping centre bins perfectly good food at closing. Help me grab some before they lock the skip. Benny\'s got nothing in this week."',
    summary: 'Help Wren take thrown-out food from the shopping centre skip, and share it with Benny.',
    steps: [Go('shopping_centre', 18, 22, 'Raid the skip behind the shopping centre after 18:00.', 'Raid the shopping centre skip with Wren', 'Bagged salads, day-old bread, a whole wheel of brie still in its wax. Wren keeps watch while you fill a rucksack. Nobody notices. You feel like a bandit.', 30, {
      crime: 2
    }), Tk('benny', 'Share the haul with Benny.', 'Give Benny some of the skip food', 'Benny looks in the bag. "Is that brie?" He tries not to look grateful, and fails.')],
    reward: {
      rep: 10,
      fame: ['kindnessFame', 2],
      also: {
        benny: 4
      }
    }
  }, {
    id: 'wren_forms',
    giver: 'wren',
    title: 'Re-enrolment',
    minRep: 35,
    after: 'wren_skip',
    offer: '"Don\'t laugh. I want to go back. Finish the degree. Mina knows how the forms work. I\'d rather eat glass than ask her."',
    summary: 'Wren wants to re-enrol at the college. Get Mina\'s help, and pick up the forms.',
    steps: [Tk('mina', 'Persuade Mina to help Wren with the forms.', 'Ask Mina to help Wren re-enrol', 'Mina goes very still. "Wren wants to come back?" A long pause. "...Tell her section C is a trap. I\'ll fill in the rest."'), Go('deans_office', 8, 17, 'Pick up the re-enrolment forms at the Dean\'s Office.', 'Collect Wren\'s re-enrolment forms', 'The secretary hands them over with a look that says she has seen everything twice.', 20), Tk('wren', 'Give Wren the forms.', 'Give Wren the forms', 'Wren reads Mina\'s handwriting in the margins for a long time. "She did all this?" Quietly: "Huh."')],
    reward: {
      rep: 18,
      fame: ['kindnessFame', 5],
      also: {
        mina: 4
      }
    }
  },
  // Silas
  {
    id: 'silas_strings',
    giver: 'silas',
    title: 'Broken String',
    minRep: 5,
    offer: '"Snapped my G string. Not a joke. The shop in the shopping centre sells them, but I owe them money."',
    summary: 'Silas needs new guitar strings from the shopping centre.',
    steps: [Go('shopping_centre', 9, 20, 'Buy guitar strings at the shopping centre ($8).', 'Buy a set of guitar strings ($8)', 'The shop assistant asks if they\'re for Silas. "Tell him he still owes us," she says, smiling.', 10, {
      cost: 8
    }), Tk('silas', 'Give Silas the strings.', 'Give Silas the strings', 'He restrings in two minutes flat and plays you something bright and quick. "That one was free."')],
    reward: {
      rep: 8,
      stressFx: -20
    }
  }, {
    id: 'silas_notebook',
    giver: 'silas',
    title: 'The Songbook',
    minRep: 35,
    after: 'silas_strings',
    offer: '"Jules still has my notebook of songs. From when we lived together. I can\'t ask. Would you?"',
    summary: 'Get Silas\'s old songbook back from his ex, Jules.',
    steps: [Tk('jules', 'Ask Jules for Silas\'s notebook.', 'Ask Jules about Silas\'s songbook', 'Jules digs it out of a drawer. "I kept it safe. Tell him... tell him the third song is still my favourite."'), Tk('silas', 'Return the songbook to Silas.', 'Give Silas his songbook', 'He opens it to the third song without looking. "She said that?" He has to stop for a moment.')],
    reward: {
      rep: 15,
      also: {
        jules: 3
      }
    }
  },
  // Kit
  {
    id: 'kit_wedding',
    giver: 'kit',
    title: 'Two Hundred Roses',
    minRep: 5,
    offer: '"A wedding order. Two hundred roses, all de-thorned, delivered to the church by tonight. Help?"',
    summary: 'Help Kit prepare a wedding order and deliver it to St. Aldric\'s Church.',
    steps: [Go('florist', 9, 18, 'Help Kit strip thorns at the florist (2 hours).', 'Strip thorns for the wedding order', 'Two hours, two hundred roses, and only a few pricked fingers. Kit\'s ears twitch to the radio the whole time.', 120), Go('church', 7, 20, 'Deliver the arrangements to St. Aldric\'s Church.', 'Deliver the wedding flowers', 'The church smells like a garden by the time you\'re done. The bride\'s mother cries, which you\'re told is a good sign.', 40)],
    reward: {
      rep: 10,
      money: 20,
      skill: ['tending', 5]
    }
  }, {
    id: 'kit_comb',
    giver: 'kit',
    title: 'Something Old',
    minRep: 35,
    after: 'kit_wedding',
    offer: '"Nell keeps something of my grandmother\'s. A comb. She won\'t give it to just anyone, but I think she\'d give it to you."',
    summary: 'Ask Nell Bramble for Kit\'s grandmother\'s comb.',
    steps: [Tk('nell', 'Ask Nell for Kit\'s grandmother\'s comb.', 'Ask Nell for Kit\'s grandmother\'s comb', 'Nell takes a small carved comb out of her shawl as if she had been waiting. "Tell the fox it was always hers."'), Tk('kit', 'Give Kit the comb.', 'Give Kit her grandmother\'s comb', 'Kit holds it to her chest, ears flat with feeling. "It smells like her house," she whispers.')],
    reward: {
      rep: 15,
      also: {
        nell: 5
      }
    }
  },
  // Morrow
  {
    id: 'morrow_goats',
    giver: 'morrow',
    title: 'The Goat Situation',
    minRep: 5,
    offer: '"The goats have found a hole in the fence. One has gone to the pond. She is called Duchess. She does not want to come back."',
    summary: 'Mend the farm fence, then fetch Duchess the goat back from the park pond.',
    steps: [Go('campus_farm', 6, 19, 'Mend the goat pen fence at the farm.', 'Mend the goat pen fence', 'Wire, posts, and a hammer. The other goats supervise. They are not impressed.', 60, {
      fatigue: 60
    }), Go('park', 6, 22, 'Find Duchess at Millpond Park and bring her home.', 'Coax Duchess the goat home', 'Duchess is eating a bin. It takes a sandwich, two apologies and a long walk to persuade her home.', 60), Tk('morrow', 'Tell Morrow the goats are safe.', 'Tell Morrow Duchess is home', '"Duchess has told me you were very patient." Morrow\'s eyes glow. "She is lying, but kindly."')],
    reward: {
      rep: 10,
      skill: ['tending', 10],
      train: ['physique', 5]
    }
  }, {
    id: 'morrow_message',
    giver: 'morrow',
    title: 'Across the Water',
    minRep: 35,
    after: 'morrow_goats',
    offer: '"There is someone at the river I have not spoken with in a long while. Tell Fen that Morrow remembers the hill."',
    summary: 'Carry a message from Morrow to Fen at the River Docks, and bring back the answer.',
    steps: [Tk('fen', 'Tell Fen that Morrow remembers the hill.', 'Tell Fen that Morrow remembers the hill', 'Fen is quiet for a long time. "Tell Morrow the hill remembers too. And that the boat is always there."'), Tk('morrow', 'Bring Fen\'s answer back to Morrow.', 'Give Morrow Fen\'s answer', 'Morrow closes their eyes. When they open them, they are very bright. "Thank you. You do not know what you carried. It was heavy."')],
    reward: {
      rep: 15,
      train: ['awareness', 10],
      also: {
        fen: 5
      }
    }
  },
  // Hazel
  {
    id: 'hazel_kittens',
    giver: 'hazel',
    title: 'Foster Week',
    minRep: 5,
    offer: '"A litter of kittens came in. They need their checks at the vet next door before I can rehome them. Would you take them over?"',
    summary: 'Take Hazel\'s foster kittens to the vet clinic for their checks.',
    steps: [Go('vet_clinic', 8, 18, 'Take the foster kittens to the vet clinic.', 'Take the kittens for their check-up', 'Four kittens, one carrier, and a lot of very small outrage. All healthy. The vet names one after you.', 60), Tk('hazel', 'Report back to Hazel.', 'Tell Hazel the kittens are healthy', '"All four? Oh, good." Pip whistles from her shoulder. "Pip says thank you. I say thank you too."')],
    reward: {
      rep: 10,
      skill: ['tending', 5],
      fame: ['kindnessFame', 4]
    }
  }, {
    id: 'hazel_homes',
    giver: 'hazel',
    title: 'Forever Homes',
    minRep: 35,
    after: 'hazel_kittens',
    offer: '"Three animals need homes: an old tabby, a collie, and a very shy rabbit. You know everyone. Ask around?"',
    summary: 'Find homes for three of Hazel\'s rescues by asking around town.',
    steps: [Tk('rosa', 'Ask Rosa about adopting the old tabby.', 'Ask Rosa if she\'d adopt an old tabby', '"An old cat? For an old woman? Yes. Obviously. Bring her Tuesday."'), Tk('okafor', 'Ask Coach Okafor about the collie.', 'Ask Coach Okafor if she\'d adopt a collie', '"A collie. A running collie." She is already smiling. "Fine. Yes."'), Tk('ollie', 'Ask Ollie about the shy rabbit.', 'Ask Ollie if he\'d adopt a shy rabbit', '"A shy rabbit? I\'m a shy rabbit." He nods very fast. "Yes. Please."'), Tk('hazel', 'Tell Hazel the good news.', 'Tell Hazel all three have homes', 'Hazel sits down on an upturned crate and laughs with relief. "You absolute miracle."')],
    reward: {
      rep: 15,
      fame: ['kindnessFame', 6],
      also: {
        rosa: 2,
        okafor: 2,
        ollie: 2
      }
    }
  },
  // Dee
  {
    id: 'dee_model',
    giver: 'dee',
    title: 'Hair Model',
    minRep: 5,
    offer: '"I need a model for the stylists\' showcase. Two hours in the chair. You get paid, you get gorgeous. Win-win."',
    summary: 'Sit as Dee\'s hair model for the showcase at the salon.',
    steps: [Go('hair_salon', 9, 18, 'Sit as Dee\'s model at the salon (2 hours).', 'Sit for Dee\'s showcase', 'Two hours of pins, spray and gossip. A room full of stylists applauds your head. Dee takes all the credit, rightly. Every pin comes out at the end.', 120), Tk('dee', 'Collect your fee from Dee.', 'Ask Dee how the showcase went', '"First place, darling. You were a canvas." She tucks twenty dollars in your pocket.')],
    reward: {
      rep: 10,
      money: 20,
      train: ['beauty', 8]
    }
  }, {
    id: 'dee_lilies',
    giver: 'dee',
    title: 'The One Thing Dee Doesn\'t Know',
    minRep: 35,
    after: 'dee_model',
    offer: '"Someone has left lilies at my door every Monday for a month. Anonymous. I know everything in this town except this. It is killing me."',
    summary: 'Find out who has been leaving lilies at Dee\'s salon door.',
    steps: [Tk('kit', 'Ask Kit who has been buying lilies.', 'Ask Kit who\'s been buying lilies', 'Kit\'s ears twitch. "I\'m not supposed to say. He pays cash. He\'s very bad at whistling."'), Tk('marcus', 'Ask Marcus about the lilies.', 'Ask Marcus if he\'s been leaving Dee lilies', 'Marcus goes the colour of a tomato. "They were her wedding flowers. I just... don\'t tell her. Tell her. I don\'t know."'), Tk('dee', 'Tell Dee who it was.', 'Tell Dee who leaves the lilies', 'Dee puts down her scissors for the first time you\'ve ever seen. "Marcus," she says, softly. "That idiot."')],
    reward: {
      rep: 15,
      also: {
        marcus: 4
      }
    }
  },
  // Raman
  {
    id: 'raman_seeds',
    giver: 'raman',
    title: 'Seed Bank',
    minRep: 5,
    offer: '"I\'m building a seed bank of local wildflowers. Collect seed heads in Hollow Woods, then help me sow them in the greenhouse."',
    summary: 'Collect wild seeds in Hollow Woods and sow them in the farm greenhouse.',
    steps: [Go('woods', 7, 19, 'Collect wild seed heads in Hollow Woods.', 'Collect wild seed heads', 'Knapweed, campion, and something Nell, watching from the path, tells you not to pick. You don\'t.', 60), Go('campus_farm', 6, 19, 'Sow the seed trays in the farm greenhouse.', 'Sow the seed trays', 'Forty trays, neatly labelled. Priya inspects your handwriting and approves.', 60), Tk('raman', 'Report to Dr. Raman.', 'Tell Dr. Raman the trays are sown', '"Excellent. In six weeks we will know if you have a green thumb or are merely enthusiastic."')],
    reward: {
      rep: 10,
      skill: ['tending', 10],
      train: ['awareness', 5]
    }
  }, {
    id: 'raman_night',
    giver: 'raman',
    title: 'Midnight Readings',
    minRep: 35,
    after: 'raman_seeds',
    offer: '"My experiment needs readings at midnight. My assistant has flu. You are reliable, which in a scientist is rarer than genius."',
    summary: 'Take Dr. Raman\'s midnight lab readings in the lecture building.',
    steps: [Go('lecture_hall', 0, 3, 'Take the readings in the lab between midnight and 3:00.', 'Take the midnight lab readings', 'The building hums after dark. You write numbers into a notebook by the light of the fume hood, and feel, for an hour, like a real scientist.', 60, {
      fatigue: 80
    }), Tk('raman', 'Give Dr. Raman the readings.', 'Give Dr. Raman the readings', 'She checks them twice. "Clean data. Do you know how rare that is?" She sounds almost moved.')],
    reward: {
      rep: 15,
      train: ['awareness', 10],
      grade: ['sci', 4]
    }
  },
  // Ollie
  {
    id: 'ollie_listen',
    giver: 'ollie',
    title: 'Stage Fright',
    minRep: 5,
    offer: '"Would you listen to me play? Just you. In the stairwell. I need to practise playing in front of a person."',
    summary: 'Listen to Ollie practise, then ask Silas for advice on stage nerves.',
    steps: [Go('dorm_hall', 19, 23, 'Listen to Ollie practise in the Ashford Hall stairwell.', 'Listen to Ollie practise', 'He plays facing the wall at first. Halfway through he turns round. By the end he\'s looking at you.', 60, {
      stress: -40
    }), Tk('silas', 'Ask Silas for stage-nerve advice for Ollie.', 'Ask Silas how to beat stage nerves', '"Tell the kid to pick one face in the crowd and play to them. Works every time. Usually."'), Tk('ollie', 'Pass Silas\'s advice to Ollie.', 'Give Ollie Silas\'s advice', '"One face. Okay." He looks at you, then very quickly away.')],
    reward: {
      rep: 10,
      fame: ['kindnessFame', 2]
    }
  }, {
    id: 'ollie_openmic',
    giver: 'ollie',
    title: 'First Open Mic',
    minRep: 35,
    after: 'ollie_listen',
    offer: '"I signed up for the Lantern open mic. I want to throw up. Please sit at the front. I\'ll play to your face."',
    summary: 'Sit in the front row for Ollie\'s first open mic at the Lantern Pub.',
    steps: [Go('bar', 20, 23, 'Watch Ollie\'s open mic at the Lantern Pub (20:00 to 23:00).', 'Sit at the front for Ollie\'s open mic', 'His bow shakes on the first note. Then he finds you, and steadies. The pub goes quiet, then very loud. Silas whistles from the back.', 90, {
      stress: -60
    }), Tk('ollie', 'Congratulate Ollie.', 'Tell Ollie he was brilliant', '"I didn\'t throw up!" he says, glowing. "I did not throw up!"')],
    reward: {
      rep: 15,
      also: {
        silas: 3
      }
    }
  },
  // Mina
  {
    id: 'mina_petition',
    giver: 'mina',
    title: 'Petition',
    minRep: 5,
    offer: '"Longer library hours during exams. I need three signatures from people who matter. Sam, Theo, and Professor Hart."',
    summary: 'Collect three signatures for Mina\'s library-hours petition.',
    steps: [Tk('sam', 'Get Sam\'s signature.', 'Ask Sam to sign Mina\'s petition', 'Sam signs with a tiny doodle of a book. "For Mina? Sure. She scares me, but sure."'), Tk('theo', 'Get Theo\'s signature.', 'Ask Theo to sign Mina\'s petition', 'Theo groans. "If it\'s for Mina, it\'s a trap." He signs anyway. "Longer library hours is fair."'), Tk('hart', 'Get Professor Hart\'s signature.', 'Ask Professor Hart to sign Mina\'s petition', '"Longer library hours? I would sign in blood. Ink will do." He signs with a flourish.'), Tk('mina', 'Hand Mina the signatures.', 'Give Mina the signed petition', '"Theo signed? You\'re a miracle worker. Don\'t tell anyone I said miracle."')],
    reward: {
      rep: 10,
      fame: ['socialiteFame', 4]
    }
  }, {
    id: 'mina_campaign',
    giver: 'mina',
    title: 'Campaign Trail',
    minRep: 35,
    after: 'mina_petition',
    offer: '"Re-election. Flyers on the quad, and I need the mayor\'s endorsement. She likes you. Everyone likes you. It\'s annoying."',
    summary: 'Hand out Mina\'s flyers and get Mayor Whitlock\'s endorsement.',
    steps: [Go('quad', 9, 17, 'Hand out flyers on the Main Quad (2 hours).', 'Hand out Mina\'s campaign flyers', 'You hand out two hundred flyers and pick up about forty off the ground. Several people say they\'ll vote for you, which is not the point.', 120, {
      fatigue: 40
    }), Tk('eleanor', 'Ask Mayor Whitlock to endorse Mina.', 'Ask Eleanor to endorse Mina', '"Endorse Mina? I\'ve been waiting for her to ask. Tell her she has it, and that she owes me nothing."'), Tk('mina', 'Give Mina the good news.', 'Tell Mina she has the mayor\'s endorsement', 'Mina reads the note and has to sit down. "She said I owe her nothing?" Quietly: "I owe you, though."')],
    reward: {
      rep: 15,
      skill: ['charm', 10],
      also: {
        eleanor: 3
      }
    }
  },
  // Benny
  {
    id: 'benny_nets',
    giver: 'benny',
    title: 'Mending',
    minRep: 5,
    offer: '"Nets don\'t mend themselves. Two hours. Fifteen dollars and a fish."',
    summary: 'Help Benny mend his fishing nets at the docks.',
    steps: [Go('docks', 5, 13, 'Mend nets with Benny at the River Docks (2 hours).', 'Mend nets with Benny', 'Needle, twine, knot, pull. Benny talks the whole time about fish he has known. Your fingers ache. It is weirdly peaceful.', 120, {
      fatigue: 50
    })],
    reward: {
      rep: 8,
      money: 15,
      train: ['willpower', 5]
    }
  }, {
    id: 'benny_letter',
    giver: 'benny',
    title: 'Letter Home',
    minRep: 35,
    after: 'benny_nets',
    offer: '"My son. I want to write him. I can\'t write good. You write, I\'ll talk. Library\'s quiet. Then post it at the town hall."',
    summary: 'Help Benny write a letter to his son, then post it.',
    steps: [Go('library', 8, 23, 'Write Benny\'s letter at the library.', 'Write Benny\'s letter to his son', 'Benny talks, slowly. You write. "Tell him I\'m sorry. No. Tell him I\'m proud. Both." It takes an hour and both of you need a minute afterwards.', 60), Go('town_hall', 8, 18, 'Post the letter at the town hall post box.', 'Post Benny\'s letter', 'It drops into the box with a soft sound that feels much bigger than it is.', 10), Tk('benny', 'Tell Benny it\'s posted.', 'Tell Benny the letter is posted', 'He nods. Just nods. Then he grips your shoulder so hard it hurts. "Thanks, kid."')],
    reward: {
      rep: 18,
      fame: ['kindnessFame', 6]
    }
  },
  // Nell
  {
    id: 'nell_gather',
    giver: 'nell',
    title: 'Gathering',
    minRep: 5,
    offer: '"Yarrow, picked with the dew still on it. Moonwort from the millpond, after dark. I can do one. I cannot do both."',
    summary: 'Gather dew-wet yarrow in the woods at dawn, and moonwort at the park pond after dark.',
    steps: [Go('woods', 5, 8, 'Gather yarrow in Hollow Woods before 8:00.', 'Gather dew-wet yarrow', 'The woods are silver with dew. You find the yarrow exactly where Nell said, as if it had been waiting.', 45), Go('park', 20, 24, 'Pick moonwort by the millpond after 20:00.', 'Pick moonwort by the pond', 'The little fern-leaves shine faintly under the moon. You decide not to think about that.', 30), Tk('nell', 'Bring Nell the herbs.', 'Give Nell the herbs', 'She sniffs them and nods. "Well picked. The woods like you." It sounds like a compliment and a warning.')],
    reward: {
      rep: 10,
      skill: ['tending', 8],
      train: ['awareness', 5]
    }
  }, {
    id: 'nell_parcel',
    giver: 'nell',
    title: 'Running Water',
    minRep: 35,
    after: 'nell_gather',
    offer: '"There is a parcel for me across the river. I do not cross running water. Do not ask. Fen will take you."',
    summary: 'Ask Fen to ferry you across the river to collect Nell\'s parcel.',
    steps: [Tk('fen', 'Ask Fen to take you across the river.', 'Ask Fen to ferry you across for Nell', '"For Nell? No fare." Fen is already untying the boat. "Come back when you\'re ready."'), Go('docks', 14, 23, 'Cross the river and collect Nell\'s parcel.', 'Cross the river and collect the parcel', 'On the far bank, a parcel wrapped in brown paper sits on a fence post. Nobody is there. The crossing back feels longer.', 60), Tk('nell', 'Give Nell the parcel.', 'Give Nell the parcel', 'She unwraps it with shaking hands: a faded ribbon and a pressed flower. "My sister\'s," she says. "Thank you."')],
    reward: {
      rep: 15,
      train: ['awareness', 10],
      also: {
        fen: 5
      }
    }
  },
  // Fen
  {
    id: 'fen_lamp',
    giver: 'fen',
    title: 'The Lamp',
    minRep: 5,
    offer: '"My lamp has gone out. It only takes the oil they keep at the Lantern Pub. Old habits."',
    summary: 'Fetch lamp oil from the Lantern Pub for Fen\'s lamp.',
    steps: [Go('bar', 12, 24, 'Ask for lamp oil at the Lantern Pub.', 'Ask the Lantern Pub for lamp oil', 'The landlord fetches a dusty bottle from under the bar without asking who it\'s for. "Tell Fen it\'s on the house. Always is."', 10), Tk('fen', 'Bring Fen the lamp oil.', 'Give Fen the lamp oil', 'The lamp catches with a soft green flame. Fen smiles. "Better. It was dark without it."')],
    reward: {
      rep: 8,
      train: ['awareness', 5]
    }
  }, {
    id: 'fen_names',
    giver: 'fen',
    title: 'Names on the Water',
    minRep: 35,
    after: 'fen_lamp',
    offer: '"Once a year I read the names of those the river took. Morrow used to stand with me. Ask them to come. And come yourself."',
    summary: 'Ask Morrow to join Fen, then read the names of the drowned with them at the docks at night.',
    steps: [Tk('morrow', 'Ask Morrow to come to the docks.', 'Ask Morrow to join Fen at the docks', 'Morrow\'s eyes glow softly. "Yes. I should never have stopped."'), Go('docks', 21, 24, 'Read the names on the water with Fen and Morrow after 21:00.', 'Read the names on the water', 'Fen reads, Morrow answers, and you light a candle for each name. There are a great many. The river is very still the whole time.', 60, {
      stress: -40
    })],
    reward: {
      rep: 15,
      train: ['willpower', 10],
      also: {
        morrow: 5
      }
    }
  }];
  QX.push({
    id: 'dot_delivery',
    giver: 'dot',
    title: 'Delivery Day',
    minRep: 5,
    offer: '"Lorry\'s early and the stock boy\'s late. Give me an hour shifting tins and I\'ll see you right."',
    summary: 'Help Dot restock the shelves at Hollowbrook Grocer.',
    steps: [Go('market', 7, 15, 'Restock shelves with Dot at Hollowbrook Grocer (1 hour).', 'Restock the shelves with Dot', 'Tins, cereal, a pallet of toilet roll that fights back. Dot directs you like an air traffic controller and hums the whole time.', 60, {
      fatigue: 30
    })],
    reward: {
      rep: 8,
      money: 12,
      skill: ['housekeeping', 3]
    }
  }, {
    id: 'dot_petition',
    giver: 'dot',
    title: 'Save the Grocer',
    minRep: 35,
    after: 'dot_delivery',
    offer: '"A supermarket chain wants Marcus to sell up, and he\'s tempted. If enough people sign, the council has to hear it, and he\'ll listen to the council. Would you ask around? Start with that council girl."',
    summary: 'Help Dot gather support to keep Hollowbrook Grocer open.',
    steps: [Tk('mina', 'Ask Mina Sato to back Dot\'s petition.', 'Ask Mina to back Dot\'s petition', 'Mina\'s eyes light up. "A petition? For a local business? Give me that clipboard."'), Go('town_square', 9, 17, 'Collect signatures in Market Square.', 'Collect signatures for the Grocer', 'Two hours with a clipboard. Most people sign. One man asks if the Grocer will finally stock oat milk. You promise nothing.', 120, {
      fatigue: 20
    }), Tk('dot', 'Bring the signatures back to Dot.', 'Give Dot the signatures', 'She counts them twice, then a third time, and has to sit down on a crate. "Well. Well, well."')],
    reward: {
      rep: 18,
      fame: ['kindnessFame', 6],
      also: {
        mina: 5,
        rosa: 4
      }
    }
  });
  var qxFlag = function qxFlag(q, i) {
    return 'qx_' + q + '_s' + i;
  };
  var qxPrevDone = function qxPrevDone(state, Q, i) {
    return Q.steps.slice(0, i).every(function (_, j) {
      return flag(state, qxFlag(Q.id, j));
    });
  };
  QX.forEach(function (Q) {
    QUESTS[Q.id] = {
      giver: Q.giver,
      title: Q.title,
      minRep: Q.minRep,
      after: Q.after,
      offer: Q.offer,
      summary: Q.summary,
      qx: Q,
      steps: Q.steps.map(function (st, i) {
        return {
          text: st.text,
          done: function done(s) {
            return flag(s, qxFlag(Q.id, i));
          }
        };
      }),
      reward: function reward(s) {
        var R = Q.reward || {};
        if (R.rep) _changeRep(s, Q.giver, R.rep);
        if (R.aff && rel(s, Q.giver).rep >= 15) changeAff(s, Q.giver, R.aff);
        if (R.money) safeChange('money', R.money);
        if (R.fame) safeChange('stats.status.' + R.fame[0], R.fame[1]);
        if (R.stressFx) safeChange('stats.needs.stress', R.stressFx);
        try {
          if (R.train && window.G.stats && window.G.stats.train) window.G.stats.train(R.train[0], R.train[1]);
        } catch (e) {}
        try {
          if (R.skill && window.G.stats && window.G.stats.trainSkill) window.G.stats.trainSkill(R.skill[0], R.skill[1]);
        } catch (e) {}
        try {
          if (R.grade && s.school && s.school.grades && typeof s.school.grades[R.grade[0]] === 'number') s.school.grades[R.grade[0]] = Math.min(100, s.school.grades[R.grade[0]] + R.grade[1]);
        } catch (e) {}
        if (R.also) for (var o in R.also) if (rel(s, o)) _changeRep(s, o, R.also[o]);
      }
    };
  });
  function qxTalkOptions(state, id) {
    var out = [];
    QX.forEach(function (Q) {
      if (questStatus(state, Q.id) !== 'active') return;
      Q.steps.forEach(function (st, i) {
        if (flag(state, qxFlag(Q.id, i)) || !qxPrevDone(state, Q, i)) return;
        if (st.kind === 'talk' && st.to === id) out.push({
          label: st.label,
          run: function run(s) {
            setFlag(s, qxFlag(Q.id, i));
            return {
              text: nm(id) + ": " + st.reply,
              minutes: 10
            };
          }
        });
        if (st.kind === 'item' && (st.to || Q.giver) === id && has(state, st.item)) out.push({
          label: "Give " + BY_ID[id].name + " the " + ITEMS[st.item].name + " (" + Q.title + ")",
          run: function run(s) {
            ns(s).items[st.item]--;
            setFlag(s, qxFlag(Q.id, i));
            return {
              text: nm(id) + " takes the " + ITEMS[st.item].name + ". " + (st.to && st.to !== Q.giver ? "\"From " + BY_ID[Q.giver].name + "? Really?\" " + pronouns(id).Sub + " " + (pronouns(id).be === 'are' ? 'look' : 'looks') + " at the gift for a long moment." : '"Perfect. Thank you."'),
              minutes: 5
            };
          }
        });
      });
    });
    return out;
  }
  function qxLocationActions(state) {
    var out = [],
      here = loc(state),
      t = time();
    QX.forEach(function (Q) {
      if (questStatus(state, Q.id) !== 'active') return;
      Q.steps.forEach(function (st, i) {
        if (st.kind !== 'go' || st.loc !== here || flag(state, qxFlag(Q.id, i)) || !qxPrevDone(state, Q, i)) return;
        var h = t.hour;
        var inWin = st.from <= st.to ? h >= st.from && h < st.to : h >= st.from || h < st.to;
        if (!inWin) return;
        if (st.market) {
          var live = false;
          try {
            live = !!(window.G.world && window.G.world.marketLive && window.G.world.marketLive());
          } catch (e) {}
          if (!live) return;
        }
        out.push({
          label: st.label,
          time: st.minutes,
          run: function run(s) {
            if (st.cost && money(s) < st.cost) return {
              text: 'You check your wallet. Not enough.',
              minutes: 1
            };
            if (st.cost) safeChange('money', -st.cost);
            setFlag(s, qxFlag(Q.id, i));
            if (st.fatigue) safeChange('stats.needs.fatigue', st.fatigue);
            if (st.thirst) safeChange('stats.needs.thirst', st.thirst);
            if (st.stress) safeChange('stats.needs.stress', st.stress);
            if (st.crime) safeChange('stats.status.crime', st.crime);
            return {
              text: st.scene,
              minutes: st.minutes
            };
          }
        });
      });
    });
    return out;
  }
  function unlockRomanceQuest(state, id) {
    var q = 'rom_' + id;
    if (!ns(state).quests[q]) ns(state).offers[q] = true;
  }
  function questStatus(state, q) {
    return ns(state).quests[q];
  } // undefined | 'active' | 'done'
  function startQuest(state, q) {
    ns(state).quests[q] = 'active';
    delete ns(state).offers[q];
    window.G.notify("New journal entry: " + QUESTS[q].title, 'info');
  }
  function checkQuests(state) {
    for (var q in ns(state).quests) {
      if (ns(state).quests[q] !== 'active') continue;
      var def = QUESTS[q];
      if (def.steps.every(function (st) {
        return st.done(state);
      })) finishQuest(state, q);
    }
  }
  function finishQuest(state, q) {
    var def = QUESTS[q];
    ns(state).quests[q] = 'done';
    window.G.notify("Quest complete: " + def.title, 'up');
    if (def.reward) def.reward(state);
    if (!def.romance) ripple(state, def.giver, 'help');
    if (def.romance) {
      var r = rel(state, def.giver);
      r.romance = 3;
      changeAff(state, def.giver, 10);
      window.G.notify("You are now dating " + BY_ID[def.giver].name + ".", 'up');
    }
  }

  // ---------- Location actions tied to quests / shopping ----------
  function locationActions(state) {
    var here = loc(state),
      t = time(),
      out = qxLocationActions(state);
    // Shopping for gift items
    var _loop3 = function _loop3(it) {
      var I = ITEMS[it];
      if (I.shop !== here) return 1; // continue
      out.push({
        label: "Buy a " + I.name + " ($" + I.price + ")",
        run: function run(s) {
          if (money(s) < I.price) return {
            text: 'You check your wallet. Not enough.',
            minutes: 1
          };
          safeChange('money', -I.price);
          addItem(s, it);
          return {
            text: "You buy a " + I.name + ".",
            minutes: 5
          };
        }
      });
    };
    for (var it in ITEMS) {
      if (_loop3(it)) continue;
    }
    var A = function A(label, cond, fn) {
      if (cond) out.push({
        label: label,
        run: fn
      });
    };
    A('Ask at the pharmacy counter for Rosa\'s pills', here === 'market' && questStatus(state, 'rosa_meds') === 'active' && !flag(state, 'rosa_meds_got'), function (s) {
      setFlag(s, 'rosa_meds_got');
      return {
        text: 'The pharmacist hands over a paper bag. "Tell Rosa to stop lifting heavy pots."',
        minutes: 10
      };
    });
    A('Search the stacks for Hart\'s book', here === 'library' && questStatus(state, 'hart_book') === 'active' && !flag(state, 'hart_book_got'), function (s) {
      if (Math.random() < 0.5) {
        setFlag(s, 'hart_book_got');
        return {
          text: 'Wedged behind the encyclopedias: a battered Dickinson, margins crowded with tiny handwriting.',
          minutes: 30
        };
      }
      return {
        text: 'You search for half an hour. Nothing yet.',
        minutes: 30
      };
    });
    A('Count crates with Marcus (2 hours)', here === 'market' && questStatus(state, 'marcus_stock') === 'active' && !flag(state, 'marcus_stock_done') && whereIs('marcus') === 'market', function (s) {
      setFlag(s, 'marcus_stock_done');
      safeChange('stats.needs.fatigue', 80);
      return {
        text: 'Two hours of crates, clipboards, and Marcus muttering numbers. Your back aches. It\'s honest work.',
        minutes: 120
      };
    });
    A('Drop off Wren\'s parcel', here === 'old_mill' && questStatus(state, 'wren_parcel') === 'active' && !flag(state, 'wren_parcel_done') && t.hour >= 20, function (s) {
      setFlag(s, 'wren_parcel_done');
      safeChange('stats.needs.stress', 40);
      return {
        text: 'A figure in a raincoat takes the parcel without a word. Your heart doesn\'t slow down for a while.',
        minutes: 15
      };
    });
    A('Run laps for Coach Okafor', here === 'park' && questStatus(state, 'okafor_laps') === 'active' && t.hour === 6 && ns(state).counters.okafor_lastDay !== t.day, function (s) {
      var c = ns(s).counters;
      c.okafor_laps = (c.okafor_laps || 0) + 1;
      c.okafor_lastDay = t.day;
      safeChange('stats.needs.fatigue', 100);
      safeChange('stats.needs.thirst', -80);
      return {
        text: "You run until your lungs burn. Coach Okafor, across the field, gives a single nod. (" + c.okafor_laps + "/3)",
        minutes: 45
      };
    });
    A('Look for Biscuit the ferret', (here === 'shopping_centre' || here === 'park') && questStatus(state, 'hazel_ferret') === 'active' && !flag(state, 'hazel_ferret_got'), function (s) {
      if (Math.random() < 0.45) {
        setFlag(s, 'hazel_ferret_got');
        return {
          text: here === 'park' ? 'A brown blur is wrestling a crisp packet under a bench. Biscuit lets you scoop him up, then immediately tries to climb into your sleeve.' : 'Behind the atrium fountain, a ferret is stealing coins out of the wishing pool. You catch Biscuit mid-heist.',
          minutes: 20
        };
      }
      return {
        text: 'You check under benches and behind planters. No ferret. Yet.',
        minutes: 20
      };
    });
    // Romance quest meetings
    A('Sit for Sam\'s portrait', here === 'park' && questStatus(state, 'rom_sam') === 'active' && flag(state, 'rom_sam_gift') && t.hour >= 16 && t.hour < 19 && whereIs('sam') === 'park', function (s) {
      setFlag(s, 'rom_sam_sat');
      return {
        text: 'The light goes honey-gold. Sam paints in silence, glancing up at you again and again. When they finally turn the canvas around, you look... loved. "I didn\'t mean to make it so obvious," Sam whispers. You kiss them before they can apologize.',
        minutes: 120
      };
    });
    A('Row out with Theo', here === 'docks' && questStatus(state, 'rom_theo') === 'active' && t.hour >= 6 && t.hour < 8, function (s) {
      setFlag(s, 'rom_theo_row');
      safeChange('stats.needs.fatigue', 60);
      return {
        text: 'Mist on the water, oars dipping in rhythm. Halfway across the lake Theo stops rowing. "I don\'t do this with anyone else," he says, and leans in. The boat rocks. You both laugh into the kiss.',
        minutes: 90
      };
    });
    A('Wait for the moonflower with Kit', here === 'park' && questStatus(state, 'rom_kit') === 'active' && flag(state, 'rom_kit_rosa') && t.hour >= 20, function (s) {
      setFlag(s, 'rom_kit_bloom');
      return {
        text: 'In Rosa\'s old patch behind the willows, a pale bud unfurls under the moon. Kit\'s ears tilt toward you. "I\'ve watched this alone for years," she says softly, and takes your hand.',
        minutes: 90
      };
    });
    A('Climb to Wren\'s rooftop', here === 'alley' && questStatus(state, 'rom_wren') === 'active' && has(state, 'sandwich') && t.hour >= 19, function (s) {
      ns(s).items.sandwich--;
      setFlag(s, 'rom_wren_food');
      setFlag(s, 'rom_wren_roof');
      return {
        text: 'A fire escape, a loose ladder, then the whole town spread out in lights. You split the sandwich. Wren is quiet for a long time, then rests their head on your shoulder. "Don\'t make it weird," they mutter. You don\'t.',
        minutes: 120
      };
    });
    // Generic dinner romance quests
    ROSTER.forEach(function (n) {
      var q = 'rom_' + n.id;
      if (['rom_sam', 'rom_theo', 'rom_kit', 'rom_wren'].includes(q)) return;
      if (QUESTS[q] && QUESTS[q].plus) {
        var R = QUESTS[q].plus;
        R.steps.forEach(function (st, i) {
          if (st.kind !== 'meet') return;
          var prevDone = R.steps.slice(0, i).every(function (_, j) {
            return flag(state, q + '_s' + j);
          });
          var h = t.hour === 0 && st.to === 24 ? 24 : t.hour;
          A("Meet " + n.name, here === st.loc && questStatus(state, q) === 'active' && prevDone && !flag(state, q + '_s' + i) && h >= st.from && h < st.to, function (s) {
            setFlag(s, q + '_s' + i);
            return {
              text: st.scene,
              minutes: 120
            };
          });
        });
        return;
      }
      A("Have dinner with " + n.name, here === 'cafe' && questStatus(state, q) === 'active' && flag(state, q + '_gift') && t.hour >= 18 && t.hour < 21, function (s) {
        setFlag(s, q + '_dinner');
        return {
          text: "Candlelight, shared dessert, and a conversation that runs long past closing. Walking out, " + nm(n.id) + " takes your hand and kisses you goodnight.",
          minutes: 120
        };
      });
    });
    return out;
  }

  // ---------- Dialogue options while talking ----------
  function questTopics(state, id) {
    var out = [];
    var _loop4 = function _loop4(q) {
        var def = QUESTS[q];
        if (def.giver !== id) return 0; // continue
        var st = questStatus(state, q);
        var canOffer = !st && (def.romance ? ns(state).offers[q] : rel(state, id).rep >= (def.minRep || 0) && (!def.after || questStatus(state, def.after) === 'done'));
        if (canOffer && !def.romance && out.some(function (o) {
          return o.sideOffer;
        })) return 0; // continue
        if (canOffer) out.push({
          label: def.romance ? "(Romance) Talk about " + def.title.toLowerCase() : "Ask if " + pronouns(id).sub + " need" + (pronouns(id).be === 'are' ? '' : 's') + " help",
          run: function run(s) {
            startQuest(s, q);
            return {
              text: nm(id) + ": " + def.offer,
              minutes: 10
            };
          },
          sideOffer: !def.romance
        });
      },
      _ret;
    for (var q in QUESTS) {
      _ret = _loop4(q);
      if (_ret === 0) continue;
    }
    qxTalkOptions(state, id).forEach(function (o) {
      return out.push(o);
    });
    var pq = QUESTS['rom_' + id];
    if (pq && pq.plus && questStatus(state, 'rom_' + id) === 'active') {
      pq.plus.steps.forEach(function (st, i) {
        if (st.kind !== 'item' || flag(state, 'rom_' + id + '_s' + i) || !has(state, st.item)) return;
        out.push({
          label: "Give " + BY_ID[id].name + " the " + ITEMS[st.item].name,
          run: function run(s) {
            ns(s).items[st.item]--;
            setFlag(s, 'rom_' + id + '_s' + i);
            changeAff(s, id, 4);
            return {
              text: nm(id) + " takes the " + ITEMS[st.item].name + " and smiles. \"You remembered.\"",
              minutes: 5
            };
          }
        });
      });
    }
    if (id === 'hazel' && questStatus(state, 'hazel_ferret') === 'active' && flag(state, 'hazel_ferret_got') && !flag(state, 'hazel_ferret_given')) out.push({
      label: 'Hand Biscuit back to Hazel',
      run: function run(s) {
        setFlag(s, 'hazel_ferret_given');
        return {
          text: '"You absolute menace," Hazel tells the ferret, kissing his head. To you: "Thank you. Really."',
          minutes: 5
        };
      }
    });
    if (id === 'hazel' && flag(state, 'exotics_unlocked')) out.push({
      label: 'Ask about the back room',
      run: function run(s) {
        return {
          text: '"The exotics are in the back. I\'ll introduce you properly. Every one of them is rescued or ethically bred, and I check in on them after they go home."',
          minutes: 5
        };
      }
    });
    if (id === 'dee' && rel(state, id).rep >= 5 && rel(state, id).gossipDay !== time().day) out.push({
      label: 'Ask for the latest gossip',
      run: function run(s) {
        rel(s, 'dee').gossipDay = time().day;
        var others = ROSTER.filter(function (n) {
          return n.id !== 'dee';
        });
        var n = pick(others),
          kind = Math.random() < 0.5 ? 'gift' : 'where';
        var line;
        if (kind === 'gift') {
          var fav = Object.keys(n.gifts).filter(function (k) {
            return n.gifts[k] >= 2;
          });
          var hate = Object.keys(n.gifts).filter(function (k) {
            return n.gifts[k] < 0;
          });
          line = "\"" + n.name + "? " + (fav.length ? 'Absolutely melts for a ' + ITEMS[pick(fav)].name + '.' : 'Impossible to shop for.') + (hate.length ? ' Never give them a ' + ITEMS[hate[0]].name + ', trust me.' : '') + "\"";
          ns(s).flags['likes_' + n.id] = true;
        } else {
          var e = pick(n.schedule);
          var dn = ['Mondays', 'Tuesdays', 'Wednesdays', 'Thursdays', 'Fridays', 'Saturdays', 'Sundays'];
          var place = window.G.world && window.G.world.location && window.G.world.location(e.loc) ? window.G.world.location(e.loc).name : e.loc;
          line = "\"If you want to bump into " + n.name + ", try " + place + ", " + (e.days.length === 7 ? 'most days' : dn[e.days[0]]) + ", around " + e.from + ":00.\"";
        }
        _changeRep(s, 'dee', 1, true);
        return {
          text: nm('dee') + " leans in, scissors paused. " + line,
          minutes: 15
        };
      }
    });
    if (id === 'dee' && rel(state, id).rep >= 0) {
      var H = window.G.salon;
      var note = null;
      try {
        if (H && H.scruffy && H.scruffy()) note = '"Darling, your hair is staging a rebellion. Book a trim. Today."';else if (H && H.rootsShowing && H.rootsShowing()) note = '"Your roots are showing. I say that with love."';
      } catch (e) {}
      if (note && rel(state, id).hairDay !== time().day) out.push({
        label: 'Ask Dee what she thinks of your hair',
        run: function run(s) {
          rel(s, 'dee').hairDay = time().day;
          return {
            text: nm('dee') + ": " + note,
            minutes: 2
          };
        }
      });
    }
    // Hand-in topics
    if (id === 'rosa' && questStatus(state, 'rosa_meds') === 'active' && flag(state, 'rosa_meds_got') && !flag(state, 'rosa_meds_given')) out.push({
      label: 'Give Rosa her pills',
      run: function run(s) {
        setFlag(s, 'rosa_meds_given');
        return {
          text: '"Bless you." She presses ten dollars into your hand and won\'t take it back.',
          minutes: 5
        };
      }
    });
    if (id === 'hart' && questStatus(state, 'hart_book') === 'active' && flag(state, 'hart_book_got') && !flag(state, 'hart_book_given')) out.push({
      label: 'Return Hart\'s book',
      run: function run(s) {
        setFlag(s, 'hart_book_given');
        return {
          text: 'He holds it like a lost pet. "I could kiss you. Academically speaking."',
          minutes: 5
        };
      }
    });
    if (id === 'rosa' && questStatus(state, 'rom_kit') === 'active' && !flag(state, 'rom_kit_rosa')) out.push({
      label: 'Ask about the moonflower patch',
      run: function run(s) {
        setFlag(s, 'rom_kit_rosa');
        return {
          text: '"Behind the willows in the park. My late husband planted it. Tell that fox girl to water it, would you?"',
          minutes: 10
        };
      }
    });
    if (id === 'sam' && questStatus(state, 'rom_sam') === 'active' && has(state, 'sketchbook') && !flag(state, 'rom_sam_gift')) out.push({
      label: 'Give Sam the sketchbook',
      run: function run(s) {
        ns(s).items.sketchbook--;
        setFlag(s, 'rom_sam_gift');
        changeAff(s, 'sam', 5);
        return {
          text: 'Sam hugs it to their chest. "Golden hour. The park. Don\'t be late."',
          minutes: 5
        };
      }
    });
    return out;
  }
  function giftOptions(state, id) {
    return giftOptionsBase(state, id).map(function (o) {
      return o.label === 'Never mind' ? o : {
        label: o.label,
        time: 5,
        run: function run(s) {
          var res = o.run(s);
          if (isBirthday(id) && rel(s, id).bdayGiftDay !== time().day) {
            rel(s, id).bdayGiftDay = time().day;
            _changeRep(s, id, 8);
            changeAff(s, id, 4);
            res.text = "\"You remembered my birthday?\" " + res.text;
          }
          return res;
        }
      };
    });
  }
  function giftOptionsBase(state, id) {
    var n = BY_ID[id];
    return Object.keys(ITEMS).filter(function (it) {
      return has(state, it);
    }).map(function (it) {
      return {
        label: "Give the " + ITEMS[it].name,
        run: function run(s) {
          ns(s).items[it]--;
          var v = n.gifts[it] || 0;
          var q = 'rom_' + id;
          if (questStatus(s, q) === 'active' && v >= 2 && !flag(s, q + '_gift')) setFlag(s, q + '_gift');
          ns(s).talking = {
            id: id,
            node: 'root'
          };
          if (v >= 3) {
            _changeRep(s, id, 8);
            changeAff(s, id, 6);
            return {
              text: nm(id) + " gasps. \"How did you know?\" This was exactly right.",
              minutes: 5
            };
          }
          if (v === 2) {
            _changeRep(s, id, 5);
            changeAff(s, id, 3);
            return {
              text: nm(id) + " smiles warmly. \"That's lovely, thank you.\"",
              minutes: 5
            };
          }
          if (v === 1) {
            _changeRep(s, id, 2);
            return {
              text: nm(id) + " accepts it politely.",
              minutes: 5
            };
          }
          if (v < 0) {
            _changeRep(s, id, -4);
            return {
              text: nm(id) + " winces. \"...Thanks, I guess.\"",
              minutes: 5
            };
          }
          _changeRep(s, id, 1);
          return {
            text: nm(id) + " takes it, a little puzzled.",
            minutes: 5
          };
        }
      };
    }).concat([{
      label: 'Never mind',
      run: function run(s) {
        ns(s).talking = {
          id: id,
          node: 'root'
        };
        return {
          text: "You put your things away.",
          minutes: 1
        };
      }
    }]);
  }
  function talkingOptions(state) {
    var _ns$talking = ns(state).talking,
      id = _ns$talking.id,
      node = _ns$talking.node;
    if (!present(state).includes(id)) {
      ns(state).talking = null;
      return null;
    }
    if (node === 'gift') return giftOptions(state, id);
    if (node === 'heart') {
      var k = rel(state, id).heart || 0,
        H = HEART[id][k];
      return H.replies.map(function (r) {
        return {
          label: r.label,
          run: function run(s) {
            var rr = rel(s, id);
            rr.heart = k + 1;
            rr.heartDay = time().day;
            ns(s).talking = {
              id: id,
              node: 'root'
            };
            if (r.rep) _changeRep(s, id, r.rep);
            if (r.aff && rr.rep >= 15) changeAff(s, id, r.aff);
            return {
              text: nm(id) + ": " + r.text,
              minutes: 15
            };
          }
        };
      });
    }
    var opts = questTopics(state, id);
    TOPICS.forEach(function (tp) {
      if (!tp.need(state, id)) return;
      if (tp.heart) opts.push({
        label: tp.label,
        run: function run(s) {
          ns(s).talking = {
            id: id,
            node: 'heart'
          };
          return {
            text: nm(id) + ": " + HEART[id][rel(s, id).heart || 0].prompt,
            minutes: 5
          };
        }
      });else if (tp.sub) opts.push({
        label: tp.label,
        time: 1,
        run: function run(s) {
          ns(s).talking = {
            id: id,
            node: 'gift'
          };
          return {
            text: "What will you give " + nm(id) + "?",
            minutes: 0
          };
        }
      });else opts.push({
        label: tp.label,
        time: guessMins(tp.run),
        run: function run(s) {
          return tp.run(s, id);
        }
      });
    });
    return opts;
  }

  // ---------- Dates (scheduled meetups once dating) ----------
  function dateOptions(state) {
    var out = [],
      t = time(),
      here = loc(state);
    var _loop5 = function _loop5(_id) {
      var d = ns(state).dates[_id];
      if (d.day !== t.day || d.loc !== here || d.done) return 1; // continue
      if (t.hour >= d.hour && t.hour < d.hour + 3) {
        out.push({
          label: "Go on your date with " + BY_ID[_id].name,
          run: function run(s) {
            d.done = true;
            changeAff(s, _id, 6);
            _changeRep(s, _id, 4);
            safeChange('stats.needs.stress', -80);
            var r = rel(s, _id);
            if (r.romance === 3 && r.aff >= 90) {
              r.romance = 4;
              window.G.notify("You and " + BY_ID[_id].name + " are now partners.", 'up');
            }
            return {
              text: pick(["You and " + nm(_id) + " lose track of time talking. The walk home is slow on purpose.", nm(_id) + " steals a bite of your food and grins. It is, somehow, the best evening all week.", "A shared umbrella, a long kiss under a streetlamp, and then a fade into the rest of the night."]),
              minutes: 120
            };
          }
        });
      }
    };
    for (var _id in ns(state).dates) {
      if (_loop5(_id)) continue;
    }
    return out;
  }

  // ---------- Journal ----------
  function journalHTML(state) {
    var q = ns(state).quests;
    var active = [],
      done = [];
    for (var _id2 in q) {
      var def = QUESTS[_id2];
      if (q[_id2] === 'active') {
        var next = def.steps.find(function (st) {
          return !st.done(state);
        });
        active.push("<div class=\"jentry\"><b>" + def.title + "</b> <i>(" + BY_ID[def.giver].name + ")</i><br>" + def.summary + "<br>&rarr; " + (next ? next.text : 'Almost done.') + "</div>");
      } else done.push("<li><s>" + def.title + "</s></li>");
    }
    var people = ROSTER.filter(function (n) {
      return rel(state, n.id).met;
    }).map(function (n) {
      var r = rel(state, n.id);
      var fav = flag(state, 'likes_' + n.id) ? ' Likes: ' + Object.keys(n.gifts).filter(function (k) {
        return n.gifts[k] >= 2;
      }).map(function (k) {
        return ITEMS[k].name;
      }).join(', ') + '.' : '';
      var bd = flag(state, 'bday_' + n.id) ? " Birthday: day " + BIRTHDAYS[n.id][1] + " of " + BIRTHDAYS[n.id][0] + "." : '';
      return "<li><b>" + n.name + "</b> (" + n.group + "): " + _stage(state, n.id).label + ", romance: " + ROMANCE[r.romance] + "." + fav + bd + "</li>";
    });
    return "<p class=\"flavor\">A battered notebook. Half lists, half doodles, all the things you meant to remember.</p>\n      <h4>Active</h4>" + (active.join('') || '<p>Nothing pressing. Enjoy it while it lasts.</p>') + "\n      <h4>Invitations</h4>" + (Object.keys(ns(state).invites || {}).filter(function (id) {
      return !ns(state).invites[id].done;
    }).map(function (id) {
      var iv = ns(state).invites[id];
      var pl = window.G.world && window.G.world.location && window.G.world.location(iv.loc) ? window.G.world.location(iv.loc).name : iv.loc;
      return "<div class=\"jentry\">" + BY_ID[id].name + ": " + pl + ", around " + iv.hour + ":00 today.</div>";
    }).join('') || '<p>No one is waiting on you today.</p>') + "\n      <h4>Completed</h4><ul>" + (done.join('') || '<li>None yet.</li>') + "</ul>\n      <h4>Connections</h4><ul>" + (RELATIONS.filter(function (r) {
      return flag(state, 'link_' + [r[0], r[1]].sort().join('_'));
    }).map(function (r) {
      return "<li>" + BY_ID[r[0]].name + " and " + BY_ID[r[1]].name + ": " + {
        friends: 'friends',
        rivals: 'rivals',
        exes: 'exes'
      }[r[2]] + ". " + r[3] + "</li>";
    }).join('') || '<li>You don\'t know who\'s close to whom yet. Ask around.</li>') + "</ul>\n      <h4>People</h4><ul>" + (people.join('') || '<li>You haven\'t really met anyone yet.</li>') + "</ul>";
  }
  function ensureRels(state) {
    var N = state.npcs;
    if (!N) return;
    ['rel', 'quests', 'offers', 'flags', 'counters', 'items', 'dates'].forEach(function (k) {
      N[k] = N[k] || {};
    });
    ROSTER.forEach(function (n) {
      if (!N.rel[n.id]) N.rel[n.id] = {
        rep: 0,
        aff: 0,
        romance: 0,
        met: false,
        known: false
      };
    });
  }
  function marketGreet(state, id) {
    if (!MARKET_STALLS[id] || whereIs(id) !== 'town_square') return '';
    var live = false;
    try {
      live = !!window.G.world.marketLive();
    } catch (e) {}
    return live ? "<p>" + nm(id) + " is minding a market stall of " + MARKET_STALLS[id] + ".</p>" : '';
  }
  // Classmates sometimes pop out for groceries (a stable pick per day so they don't flicker in and out).
  var GROCER_STUDENTS = ['sam', 'theo', 'ollie', 'mina'];
  var GROCER_LINES = {
    sam: '"Don\'t judge my basket," Sam says. It is entirely instant noodles and a single, defiant lemon.',
    theo: 'Theo is reading the protein content of every yoghurt with great seriousness.',
    ollie: 'Ollie is frozen in front of the cereal, as if choosing wrong would be permanent.',
    mina: 'Mina has a written list, in colour-coded pens, and is ticking it off at speed.'
  };
  function grocerRun(id) {
    if (!GROCER_STUDENTS.includes(id)) return false;
    var t = time();
    var h = t.hour,
      wk = t.weekdayIndex >= 5;
    var slot = wk ? h >= 11 && h < 13 : h >= 17 && h < 19;
    if (!slot) return false;
    var seed = (t.day * 31 + id.charCodeAt(0) * 7 + id.length * 13) % 7;
    return seed < 2; // roughly 2 days in 7
  }
  function grocerGreet(state, id) {
    return loc(state) === 'market' && grocerRun(id) && GROCER_LINES[id] ? "<p>You bump into " + nm(id) + " in the aisles. " + GROCER_LINES[id] + "</p>" : '';
  }
  var CASHIER_LINES = ['The evening cashier, a student from the college, scans your things without looking up from a textbook.', 'The cashier asks if you want a bag, then sighs when you say yes.', 'A tired cashier wishes you a good night and seems to mean it.'];
  // ---------- Smell, accidents and being seen (named NPC side) ----------
  // Reads the player's state defensively so it works with whatever stats.js / wardrobe.js expose:
  //   strong: soiled lower clothing (stats.clothing.lowerSoiled, a worn item with .soiled, or an unwashed bowel accident)
  //   mild:   wet/dirty clothes (stats.flags.dirty) or low hygiene (stats.needs.hygiene < 250, if tracked)
  var SMELL_TXT = {
    tease: [function (id) {
      return nm(id) + " wrinkles " + pronouns(id).pos + " nose, then grins. \"Is that you? Wow. Okay.\" It is going to come up again.";
    }, function (id) {
      return nm(id) + " makes a show of fanning the air when you get close.";
    }],
    avoid: [function (id) {
      return nm(id) + " takes a small step back mid-sentence and keeps the conversation short.";
    }, function (id) {
      return nm(id) + " suddenly remembers somewhere else to be.";
    }],
    tip: [function (id) {
      return nm(id) + " leans in, voice low. \"Hey, not to be weird, but you might want to change before anyone else notices.\"";
    }, function (id) {
      return nm(id) + " quietly presses a pack of wipes into your hand. \"No questions. Go sort it out.\"";
    }],
    kind: [function (id) {
      return nm(id) + " notices, and you can tell. " + pronouns(id).Sub + " just touch" + (pronouns(id).be === 'are' ? '' : 'es') + " your arm. \"Go home and change. I'll still be here.\"";
    }],
    fey: [function (id) {
      return nm(id) + " tilts " + pronouns(id).pos + " head, nostrils flaring like an animal's. \"You smell of a bad day.\" Then, more gently: \"Water will fix it.\"";
    }]
  };
  function _smellLevel() {
    var G_ = window.G,
      st = G_ && G_.state && G_.state.stats;
    if (!st) return 0;
    var c = st.clothing || {},
      f = st.flags || {},
      nd = st.needs || {},
      N = ns(G_.state);
    var soiled = !!c.lowerSoiled || !!c.soiled;
    try {
      var Wd = G_.wardrobe || window.Wardrobe;
      if (!soiled && Wd && typeof Wd.soiled === 'function') soiled = !!Wd.soiled();
    } catch (e) {}
    try {
      var W = window.Wardrobe;
      if (!soiled && W && W.worn) ['bottom', 'under', 'underwear'].forEach(function (sl) {
        var it = W.worn(sl);
        if (it && (it.soiled || it.tags && it.tags.indexOf && it.tags.indexOf('soiled') >= 0)) soiled = true;
      });
    } catch (e) {}
    if (!soiled && N.smell && N.smell.kind === 'bowels' && f.dirty) soiled = true;
    if (!f.dirty && !c.lowerSoiled && !c.soiled && N.smell) N.smell = null; // cleaned up
    if (soiled) return 2;
    if (f.dirty || typeof nd.hygiene === 'number' && nd.hygiene < 250) return 1;
    return 0;
  }
  // Smell gets stronger the longer soiled clothes stay on (Lucy's soiledHours), up to double after ~4h.
  function smellScale() {
    try {
      var Wd = window.G.wardrobe || window.Wardrobe;
      var h = Wd && typeof Wd.soiledHours === 'function' ? Wd.soiledHours() : 0;
      return 1 + Math.min(1, (h || 0) / 4);
    } catch (e) {
      return 1;
    }
  }
  // Ron's G.world.crowd(): 0-1 busyness of the current place. Ignored if it is not a number yet.
  function crowdScale(dflt) {
    try {
      var v = window.G.world.crowd();
      return typeof v === 'number' ? Math.max(0.1, v) : dflt;
    } catch (e) {
      return dflt;
    }
  }
  function onCampusHere() {
    try {
      return !!(window.G.world.onCampus && window.G.world.onCampus());
    } catch (e) {
      return false;
    }
  }
  function spotted(by, kind, extra) {
    var student = by && BY_ID[by] ? BY_ID[by].group === 'Students' : onCampusHere();
    try {
      window.G.emit && window.G.emit('spotted', Object.assign({
        by: by || 'stranger',
        kind: kind,
        student: student,
        src: 'npcs',
        where: loc(window.G.state)
      }, extra || {}));
    } catch (e) {}
  }
  // One NPC notices the smell: personality decides the reaction. Returns html.
  function smellReact(state, id, lvl) {
    var r = rel(state, id),
      sk = _stage(state, id).key,
      t = time(),
      N = ns(state);
    N.smelled = N.smelled || {};
    N.smelled[id] = t.day;
    var kind;
    if (BY_ID[id].group === 'Non-Human') kind = 'fey';else if (r.romance >= 3 || sk === 'close') kind = 'kind';else if (sk === 'friend' || sk === 'friendly' || ['rosa', 'hazel', 'raman', 'ollie', 'jules'].includes(id)) kind = 'tip';else if (sk === 'hostile' || sk === 'cold' || ['theo', 'dee', 'wren'].includes(id)) kind = 'tease';else kind = 'avoid';
    var rep = {
      tease: -3,
      avoid: -2,
      tip: 0,
      kind: 0,
      fey: 0
    }[kind] * lvl;
    if (rep) _changeRep(state, id, rep, true);
    if (kind === 'kind' || kind === 'tip') {
      N.smellFix = N.smellFix || {};
      N.smellFix[id] = {
        day: t.day,
        hour: t.hour
      };
    }
    if (kind === 'tease' && id === 'dee') {
      N.flags.dee_gossip_smell = t.day;
    }
    spotted(id, 'smell', {
      reaction: kind,
      strength: lvl
    });
    return "<p class=\"scene smell\">" + pick(SMELL_TXT[kind])(id) + "</p>";
  }
  // Close friends/partners lose a little affection if you leave it unfixed for 2+ hours after they told you.
  function smellAftercare(state) {
    var N = ns(state),
      fx = N.smellFix;
    if (!fx) return;
    var t = time(),
      lvl = _smellLevel();
    Object.keys(fx).forEach(function (id) {
      var hrs = (t.day - fx[id].day) * 24 + (t.hour - fx[id].hour);
      if (lvl === 0) {
        delete fx[id];
        return;
      }
      if (hrs >= 2) {
        delete fx[id];
        changeAff(state, id, -3);
        if (rel(state, id).romance >= 3) window.G.notify(BY_ID[id].name + " wishes you had taken the hint.", 'down');
      }
    });
  }
  // Passive check each tick for people you are standing near.
  function smellTick(state, minutes) {
    var lvl = _smellLevel();
    if (!lvl) return;
    var N = ns(state),
      t = time(),
      here = present(state);
    N.smelled = N.smelled || {};
    var out = '';
    here.forEach(function (id) {
      if (N.smelled[id] === t.day) return;
      var p = (lvl === 2 ? 0.35 : 0.12) * smellScale() * Math.min(1, (minutes || 10) / 30);
      if (Math.random() < p) out += smellReact(state, id, lvl);
    });
    // Generic people: busy public places in daytime
    if (!out && here.length === 0) {
      var l = window.G.world && window.G.world.location && window.G.world.location(loc(state));
      var busy = t.hour >= 8 && t.hour < 21 && l && !/woods|old_mill|alley|dorm_room/.test(loc(state));
      if (busy && (N.strangerSmell || -1) !== t.day * 24 + t.hour && Math.random() < (lvl === 2 ? 0.15 : 0.05) * smellScale() * crowdScale(0.6) * Math.min(1, (minutes || 10) / 30)) {
        N.strangerSmell = t.day * 24 + t.hour;
        out += "<p class=\"scene smell\">" + pick(onCampusHere() ? ['Two students at the next table go quiet, then start whispering.', 'Someone in the hallway coughs pointedly as you pass.'] : ['A passer-by gives you a wide berth.', 'A kid asks their parent, loudly, what that smell is.']) + "</p>";
        spotted(null, 'smell', {
          strength: lvl
        });
      }
    }
    if (out && window.G.appendStory) window.G.appendStory(out);
  }
  // Remember who saw an accident or someone going outdoors, for next time you talk.
  function hookSightings() {
    var G_ = window.G;
    if (!G_ || !G_.on || G_.__npcSightHook) return;
    G_.__npcSightHook = true;
    G_.on('accident', function (d) {
      var _Object$assign;
      var s = G_.state;
      if (!s || !s.npcs) return;
      ns(s).smell = {
        kind: d && d.kind,
        day: time().day
      };
      if (d && !d.contained && !d.absorbed && d.witness && BY_ID[d.witness]) ns(s).sawYou = Object.assign(ns(s).sawYou || {}, (_Object$assign = {}, _Object$assign[d.witness] = {
        kind: 'accident',
        day: time().day
      }, _Object$assign));
    });
    G_.on('spotted', function (d) {
      var _Object$assign2;
      var s = G_.state;
      if (!s || !s.npcs || !d || d.src === 'npcs' || !BY_ID[d.by]) return;
      ns(s).sawYou = Object.assign(ns(s).sawYou || {}, (_Object$assign2 = {}, _Object$assign2[d.by] = {
        kind: d.kind,
        day: time().day
      }, _Object$assign2));
      var sk = _stage(s, d.by).key;
      if (sk === 'hostile' || sk === 'cold' || sk === 'neutral') _changeRep(s, d.by, -2, true);
    });
  }
  // ---------- Undressed in public (Lucy: G.wardrobe.exposed(); Ron: G.world.isPublic()) ----------
  var PRIVATE_LOCS = /^(dorm_room|home_|restroom|bathroom|fitting_room|changing_room)/;
  function exposedNow(state) {
    try {
      var Wd = window.G.wardrobe || window.Wardrobe;
      if (Wd && typeof Wd.exposed === 'function') {
        var e = Wd.exposed();
        return Array.isArray(e) ? e.length > 0 : e && typeof e === 'object' ? Object.keys(e).some(function (k) {
          return e[k];
        }) : !!e;
      }
    } catch (e) {}
    try {
      var w = state.wardrobe;
      if (!w || !w.starter || !w.worn) return false;
      var v = w.worn;
      return v.bottom == null && v.under_bottom == null || v.top == null && v.under_top == null && v.outer == null;
    } catch (e) {
      return false;
    }
  }
  function publicNow(state) {
    try {
      var W_ = window.G.world;
      if (W_ && typeof W_.isPublic === 'function') return !!W_.isPublic();
      if (W_ && typeof W_.isPrivate === 'function') return !W_.isPrivate();
    } catch (e) {}
    return !PRIVATE_LOCS.test(loc(state));
  }
  function coverScale(state) {
    var m = 1;
    try {
      var St = window.G.stats;
      if (St && typeof St.noticeMult === 'function') m = St.noticeMult();else {
        var f = state.stats && state.stats.flags;
        if (f && (f.covering || f.coverUp)) m = 0.5;
      }
    } catch (e) {}
    try {
      if (window.G.world.isSecluded && window.G.world.isSecluded()) m *= 0.4;
    } catch (e) {}
    return typeof m === 'number' ? m : 1;
  }
  var EXPOSE_TXT = {
    kind: [function (id) {
      return nm(id) + " steps in front of you without a word, shrugs off a layer and holds it out. \"Here. Let's get you somewhere private.\"";
    }, function (id) {
      return nm(id) + " keeps " + pronouns(id).pos + " eyes on your face. \"Okay. You're okay. Take my coat.\"";
    }],
    look: [function (id) {
      return nm(id) + " turns sharply to study a shop window until you've passed.";
    }, function (id) {
      return nm(id) + " goes red and looks anywhere but at you.";
    }],
    callout: [function (id) {
      return nm(id) + ": \"Seriously? Get some clothes on!\"";
    }, function (id) {
      return nm(id) + " makes a show of shielding " + pronouns(id).pos + " eyes.";
    }]
  };
  function exposeReact(state, id) {
    var r = rel(state, id),
      sk = _stage(state, id).key;
    var kind = r.romance >= 3 || sk === 'close' || sk === 'friend' ? 'kind' : sk === 'hostile' || sk === 'cold' || ['theo', 'dee'].includes(id) ? 'callout' : 'look';
    if (BY_ID[id].group === 'Non-Human') kind = 'look';
    var d = {
      kind: 0,
      look: -2,
      callout: -4
    }[kind];
    if (d) _changeRep(state, id, d, true);
    spotted(id, 'exposed', {
      reaction: kind
    });
    return "<p class=\"scene exposed\">" + pick(EXPOSE_TXT[kind])(id) + "</p>";
  }
  function dunnStep(state) {
    var N = ns(state),
      t = time();
    N.dunnWarn = N.dunnWarn || -99;
    spotted('dunn', 'exposed', {
      reaction: 'officer'
    });
    if (t.day - N.dunnWarn > 7) {
      N.dunnWarn = t.day;
      _changeRep(state, 'dunn', -2, true);
      return "<p class=\"scene exposed\">" + nm('dunn') + " unclips his rain cape and drapes it over your shoulders in one practised move. \"First and last warning. Home, or somewhere with a door. Now, please.\"</p>";
    }
    _changeRep(state, 'dunn', -5, true);
    safeChange('money', -25);
    safeChange('stats.status.crime', 2);
    return "<p class=\"scene exposed\">" + nm('dunn') + " sighs and gets out his notebook. \"We've talked about this.\" He writes you a $25 fine for indecency and walks you to the nearest restroom.</p>";
  }
  function exposeTick(state, minutes) {
    var N = ns(state),
      t = time();
    var inPub = null;
    try {
      var Wd = window.G.wardrobe || window.Wardrobe;
      if (Wd && typeof Wd.exposedInPublic === 'function') {
        var e = Wd.exposedInPublic();
        inPub = Array.isArray(e) ? e.length > 0 : e && typeof e === 'object' ? Object.keys(e).some(function (k) {
          return e[k];
        }) : !!e;
      }
    } catch (e) {}
    if (inPub === null) inPub = exposedNow(state) && publicNow(state);
    if (!inPub) {
      N.exposedSince = null;
      return;
    }
    if (N.exposedSince == null) N.exposedSince = t.day * 1440 + t.hour * 60 + (t.minute || 0);
    N.exposedSeen = N.exposedSeen || {};
    var hr = t.day * 24 + t.hour,
      f = Math.min(1, (minutes || 10) / 30) * coverScale(state),
      here = present(state);
    var out = '';
    if (here.includes('dunn') && N.exposedSeen.dunn !== hr && Math.random() < 0.8 * f) {
      N.exposedSeen.dunn = hr;
      out += dunnStep(state);
    }
    here.forEach(function (id) {
      if (id === 'dunn' || N.exposedSeen[id] === hr) return;
      if (Math.random() < 0.7 * f) {
        N.exposedSeen[id] = hr;
        out += exposeReact(state, id);
      }
    });
    // Word gets around town: everyone you know cools a little for each hour you stay out like this
    if (N.exposedGossip !== hr && Math.random() < f * crowdScale(0.5)) {
      N.exposedGossip = hr;
      ROSTER.forEach(function (n) {
        if (n.group !== 'Non-Human' && rel(state, n.id).met && !here.includes(n.id)) _changeRep(state, n.id, -1, true);
      });
    }
    if (!here.length && N.exposedSeen.stranger !== hr && Math.random() < 0.5 * f * crowdScale(0.6)) {
      N.exposedSeen.stranger = hr;
      out += "<p class=\"scene exposed\">" + pick(onCampusHere() ? ['A group of students stops talking all at once.', 'Someone in the hallway hurriedly holds a folder up between you.'] : ['A passer-by steers their kid across the street.', 'Somebody mutters that they are calling the police.', 'A shopkeeper pulls their blind down.']) + "</p>";
      spotted(null, 'exposed');
    }
    if (out && window.G.appendStory) window.G.appendStory(out);
  }
  // Bagginess (Lucy): name none..maximum or 0..4; tight lower/outer clothes may let a worn brief show.
  var BAG = {
    none: 0,
    low: 1,
    normal: 2,
    high: 3,
    maximum: 4,
    max: 4
  };
  function bagOf(slot) {
    try {
      var l = G_.wardrobe && G_.wardrobe.layer && G_.wardrobe.layer(slot);
      if (!l) return null;
      var b = l.bagginess != null ? l.bagginess : l.baggyness;
      if (b == null) return null;
      return typeof b === 'number' ? b : BAG[String(b).toLowerCase()] != null ? BAG[String(b).toLowerCase()] : 2;
    } catch (e) {
      return null;
    }
  }
  function briefShows(state, id) {
    var c = state.stats && state.stats.clothing;
    if (!c || !c.diaper) return '';
    var Wd = window.G.wardrobe || window.Wardrobe;
    var vis = null,
      noise = 0;
    try {
      if (Wd && typeof Wd.briefVisible === 'function') vis = !!Wd.briefVisible();
    } catch (e) {}
    try {
      if (Wd && typeof Wd.briefNoise === 'function') noise = Number(Wd.briefNoise()) || 0;
    } catch (e) {}
    var cover = 0;
    if (vis === null) {
      var lo = bagOf('lower'),
        ja = bagOf('jacket');
      cover = Math.max(lo == null ? 2 : lo, ja == null ? 0 : ja);
      vis = cover < 2;
    }
    var heard = noise >= 2 && Math.random() < (noise - 1) * 0.04 * coverScale(state);
    if (!vis && !heard) return '';
    var N = ns(state);
    N.briefSeen = N.briefSeen || {};
    var t = time();
    if (N.briefSeen[id] != null && t.day - N.briefSeen[id] < 7) return '';
    if (vis && !heard && Math.random() >= (cover === 0 ? 0.08 : 0.04) * coverScale(state)) return '';
    N.briefSeen[id] = t.day;
    var sk = _stage(state, id).key;
    if (sk === 'hostile' || sk === 'cold') {
      _changeRep(state, id, -1, true);
      return "<p>" + nm(id) + "'s eyes drop to your waistband for a second. " + pronouns(id).Sub + " " + (pronouns(id).be === 'are' ? 'don\'t' : 'doesn\'t') + " say anything, which is somehow worse.</p>";
    }
    if (heard && !vis) return "<p>" + nm(id) + " glances round at a rustle, then politely carries on. Nothing is said.</p>";
    return "<p>" + nm(id) + "'s glance catches your waistband, then moves politely on. Nothing is said.</p>";
  }
  function sightGreet(state, id) {
    var N = ns(state),
      sw = N.sawYou && N.sawYou[id],
      t = time();
    var out = '';
    if (sw && t.day - sw.day <= 3 && !sw.said) {
      sw.said = true;
      var sk = _stage(state, id).key,
        P = pronouns(id);
      var acc = sw.kind === 'accident';
      if (sk === 'hostile' || sk === 'cold') out += "<p>" + nm(id) + ": \"" + (acc ? 'Dry today?' : 'Found a proper bathroom yet?') + "\" " + P.Sub + " look" + (P.be === 'are' ? '' : 's') + " pleased with " + (P.sub === 'they' ? 'themself' : P.sub === 'she' ? 'herself' : 'himself') + ".</p>";else if (sk === 'neutral') out += "<p>" + nm(id) + " is a little awkward with you, like " + P.sub + " " + P.be + " trying not to mention something.</p>";else out += "<p>" + nm(id) + ": \"" + (acc ? 'Hey. About the other day. It happens to everyone, okay? I mean it.' : 'You okay? Rough day the other day.') + "\"</p>";
    }
    if (_smellLevel() && N.smelled && N.smelled[id] !== t.day) out += smellReact(state, id, _smellLevel());
    out += briefShows(state, id);
    if (N.flags.dee_gossip_smell !== undefined && id !== 'dee' && t.day - N.flags.dee_gossip_smell <= 2 && Math.random() < 0.3 && rel(state, 'dee').met) {
      N.flags.dee_gossip_smell = -99;
      out += "<p>" + nm(id) + ": \"Dee was telling everyone some story about you. I didn't believe half of it.\"</p>";
    }
    return out;
  }
  // ---------- Module ----------
  var mod = {
    id: 'npcs',
    init: function init(state) {
      hookSightings();
      if (state.npcs) {
        ensureRels(state);
        return;
      }
      var rels = {};
      ROSTER.forEach(function (n) {
        return rels[n.id] = {
          rep: 0,
          aff: 0,
          romance: 0,
          met: false,
          known: false
        };
      });
      rels.rosa.rep = 15;
      rels.jules.rep = 5; // neighbors start warm
      state.npcs = {
        rel: rels,
        quests: {},
        offers: {},
        flags: {},
        counters: {},
        items: {},
        dates: {},
        talking: null
      };
    },
    onTick: function onTick(minutes, state) {
      ensureRels(state);
      hookSightings();
      if (!ns(state).talking) smellTick(state, minutes);
      if (!ns(state).talking) {
        try {
          exposeTick(state, minutes);
        } catch (e) {}
      }
      smellAftercare(state);
      // Gentle reputation drift toward 0 once per day for people you ignore.
      var t = time();
      if (ns(state).lastDay !== t.day) {
        var firstDay = ns(state).lastDay === undefined;
        ns(state).lastDay = t.day;
        if (!firstDay) dailySocial(state);
        ROSTER.forEach(function (n) {
          var r = rel(state, n.id);
          if (r.lastChatDay !== undefined && t.day - r.lastChatDay > 7 && r.rep > 20) r.rep -= 1;
          if (r.romance >= 3 && r.lastChatDay !== undefined && t.day - r.lastChatDay > 5) changeAff(state, n.id, -2);
        });
      }
      checkQuests(state);
    },
    getOptions: function getOptions(state) {
      var res = {
        dialogue: [],
        actions: [],
        travel: [],
        other: []
      };
      var wrap = function wrap(o) {
        var tm = typeof o.time === 'number' ? o.time : guessMins(o.run);
        var w = {
          label: o.label,
          run: function run(s) {
            var r = o.run(s);
            checkQuests(s);
            return r;
          }
        };
        if (tm) w.time = tm;
        return w;
      };
      if (ns(state).talking) {
        var t = talkingOptions(state);
        if (t) {
          res.dialogue = t.map(wrap);
          return res;
        }
      }
      present(state).forEach(function (id) {
        var r = rel(state, id);
        res.dialogue.push(wrap({
          time: r.met ? 1 : 5,
          label: r.met ? "Talk to " + BY_ID[id].name : "Approach " + (r.known ? BY_ID[id].name : 'the ' + BY_ID[id].role.toLowerCase()),
          run: function run(s) {
            var rr = rel(s, id);
            var first = !rr.met;
            rr.met = true;
            rr.known = true;
            ns(s).talking = {
              id: id,
              node: 'root'
            };
            var st = _stage(s, id).key;
            var pr = petReaction(s, id) + birthdayGreet(s, id) + conditionLine(s, id) + socialGreet(s, id) + marketGreet(s, id) + grocerGreet(s, id) + sightGreet(s, id);
            if (first) return {
              text: pr + ("You introduce yourself. " + BY_ID[id].blurb + " \"" + BY_ID[id].name + ",\" " + pronouns(id).sub + " say" + (pronouns(id).be === 'are' ? '' : 's') + ". \"Nice to meet you.\""),
              minutes: 5
            };
            var greet = rel(s, id).romance >= 3 ? 'breaks into a smile meant only for you.' : {
              hostile: 'glares at you.',
              cold: 'barely acknowledges you.',
              neutral: 'nods hello.',
              friendly: 'smiles when they see you.',
              friend: 'waves you over.',
              close: 'lights up the moment you arrive.'
            }[st];
            return {
              text: nm(id) + " " + greet + pr,
              minutes: 1
            };
          }
        }));
      });
      res.actions = locationActions(state).concat(dateOptions(state), inviteActions(state)).map(wrap);
      // Who's around (flavor), shown under Other
      var here = present(state);
      if (here.length) res.other.push({
        time: 1,
        label: "Look around (" + here.length + " familiar face" + (here.length > 1 ? 's' : '') + ")",
        run: function run(s) {
          var pairs = pairScenes(s, here);
          return {
            text: here.map(function (id) {
              return nm(id) + ": " + BY_ID[id].blurb;
            }).join('<br>') + (pairs.length ? '<p>' + pairs.join('<br>') + '</p>' : ''),
            minutes: 1
          };
        }
      });
      return res;
    }
  };

  // Jimmy: NPCS.witness(state, 'accident'|'smell'|'relieved', id?) -> html reaction from a present named NPC ('' if nobody).
  function witnessApi(state, kind, id) {
    state = state || window.G.state;
    if (!state || !state.npcs) return '';
    var here = present(state);
    id = id && here.includes(id) ? id : here[Math.floor(Math.random() * here.length)];
    if (!id) return '';
    if (kind === 'smell') return smellReact(state, id, _smellLevel() || 1);
    var N = ns(state);
    N.sawYou = N.sawYou || {};
    N.sawYou[id] = {
      kind: kind === 'relieved' ? 'relief' : 'accident',
      day: time().day
    };
    var sk = _stage(state, id).key;
    if (sk === 'hostile' || sk === 'cold' || sk === 'neutral') _changeRep(state, id, -2, true);
    return '';
  }
  window.NPCS = {
    witness: witnessApi,
    smellLevel: function smellLevel() {
      return _smellLevel();
    },
    changeRep: function changeRep(state, id, d, quiet) {
      if (state && state.npcs && state.npcs.rel[id]) _changeRep(state, id, d, quiet);
    },
    relations: RELATIONS,
    rep: function rep(id) {
      return S() && S().npcs ? S().npcs.rel[id].rep : 0;
    },
    list: ROSTER,
    byId: BY_ID,
    quests: QUESTS,
    items: ITEMS,
    journalHTML: journalHTML,
    present: present,
    pronouns: pronouns,
    whereIs: whereIs,
    stage: _stage
  };
  window.G && (window.G.npcs = {
    exoticsUnlocked: function exoticsUnlocked() {
      return !!(window.G.state && window.G.state.npcs && window.G.state.npcs.flags.exotics_unlocked);
    },
    rep: function rep(id) {
      return window.G.state && window.G.state.npcs ? window.G.state.npcs.rel[id].rep : 0;
    },
    stage: function stage(id) {
      return _stage(window.G.state, id).key;
    },
    isDating: function isDating(id) {
      return window.G.state && window.G.state.npcs ? window.G.state.npcs.rel[id].romance >= 3 : false;
    },
    whereIs: whereIs
  });
  function hook() {
    window.G.register(mod);
    if (window.G.addTab) window.G.addTab({
      id: 'journal',
      label: 'Journal',
      order: 40,
      render: function render(st) {
        return st.npcs ? journalHTML(st) : '<p>Nothing yet.</p>';
      }
    });
  }
  if (window.G && window.G.register) hook();else window.addEventListener('DOMContentLoaded', function () {
    return window.G && hook();
  });
})();