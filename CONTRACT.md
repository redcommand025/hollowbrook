# Slice-of-life sandbox: team contract (owner: Jenny)

Plain HTML5 + vanilla JS, no build step, no external CDNs. Open index.html directly.

## Content guardrails (non-negotiable)
- Setting: a small town with a residential COLLEGE ("Hollowbrook College"). Every character, player included, is 18+. Say "college/students", never high school or ages under 18.
- Romance is wholesome-to-PG-13: dating, flirting, kissing, fade-to-black. No explicit sexual content.
- Bladder/bowels/accidents are survival-sim needs, written matter-of-fact and brief (embarrassment, stress, wet clothes). Never fetishized or sexualized.
- Skulduggery is light-touch petty crime with consequences, not violence.
- Grounded tone: creative but not outlandish. Non-human NNPCs are subtle folklore (e.g. a fox-eared florist), not monsters.

## Files and owners
- index.html, css/style.css, js/engine.js (state, time ticks, screen render, save/load, notify)  -> Jenny
- js/modules/creation.js (world/character creation, paperdoll, NNPC gender/appearance tab)  -> Lucy
- js/modules/stats.js (skills tiers F..S, Beauty/Physique/Willpower/Awareness, traits, attitudes, transformations, needs: fatigue/stress/control/bladder/bowels/thirst/hunger, clothing wetness/integrity, character menu tabs)  -> Jimmy
- js/modules/world.js (set map + locations, travel times, clock/calendar, weather, random events)  -> Ron
- js/modules/school.js (classes, timetable, grades, delinquency, exams) + skulduggery + tending/farm  -> Ted
- js/modules/npcs.js (named NPCs: Influential, Teachers, Students, Neighbors, Outcasts, Non-Human; schedules, dialogue trees, reputation, romance, quests, journal)  -> Roy

## Module API (engine.js exposes window.G)
G.state            single save-able object. Each module owns G.state.<module> (creation, stats, world, school, npcs).
G.register(mod)    mod = { id, init(state), onTick(minutes, state), getOptions(state) -> {dialogue:[], actions:[], travel:[], other:[]} }
   option = { label, run(state) -> { text: "story html", minutes: N } }
G.story(html)      replaces the story text (no log).
G.notify(msg, kind) appends a stat-change line under the story, e.g. "Stress +40", kind: "up"|"down"|"info".
G.change(path, delta) changes a numeric stat, clamps, and auto-notifies. e.g. G.change('stats.needs.bladder', 50)
G.on(event, fn) / G.emit(event, data)  events: 'tick', 'arrive', 'newDay', 'action'.
G.time             {day, hour, minute, weekday}; owned by world.js, read by everyone.

Main screen order: story text, then Dialogue / Actions / Travel / Other. Side panel: Money, Fatigue, Stress, Control, Bladder, Bowels, Thirst, Hunger, and a "Character" button (Characteristics, Status, Clothing, Journal tabs).
NNPC names are fixed constants; only gender/appearance are editable at creation.
Put questions for the user as "@red [question]"; ask Jenny everything else.

## Engine is live (Jenny, v0.1). Extra API beyond the above
- Meter directions: fatigue, stress, bladder, bowels are BAD WHEN HIGH. thirst, hunger, control are GOOD WHEN HIGH (1000 = fully hydrated/fed). Drinking/eating = positive G.change on thirst/hunger.
- Ranges: stats.needs.* clamp 0..1000, stats.clothing.* clamp 0..100, money >= 0. Override with G.limits['path'] = [min,max]; friendly notice names via G.labels['path'] = 'Name'.
- Starting state: money 40, needs {fatigue 0, stress 100, control 800, bladder 150, bowels 100, thirst 800, hunger 750}, clothing wetness 0 / integrity 100.
- G.addTab({ id, label, order, render(state) -> html }) adds a Character menu tab. Suggested orders: characteristics 10, status 20, clothing 30, journal 40.
- G.get(path) / G.set(path, v) read/write state paths. G.change(path, delta, {silent:true}) skips the notice.
- G.state.lock = { reason, allow: ['dialogue'] } hides other option groups (class in session, passed out). Options with always:true ignore locks. Clear with G.state.lock = null.
- G.interrupt({ text, minutes }) forces a scene outside the normal option flow (e.g. passing out).
- Option fields: label, run, disabled, hint (tooltip), always.
- Tick order: world.onTick first (owns the clock), then the other modules. Autosave to localStorage after every action.
- Number keys 1-9 pick visible options. Test harness: tests/engine-test.html.

## dorm.js (Jenny)
Furniture at 'furniture_store', delivered 08:00 next day, 12 space units in dorm_room. Room tab at order 45.
G.dorm.has(id) for: topper, bed, curtains, lamp, chair, bookshelf, fridge, kettle, rug, lights, plants, mirror, records, mat, wardrobe, petbed, cattree, tank.
G.dorm.studyBonus() (0..0.25, multiply study gains: Ted), G.dorm.sleepBonus(), G.dorm.extraOutfitSpace() (Lucy), G.dorm.comfort().
Pets (Jimmy): petbed, cattree, tank are pet furniture; lizards should require tank.

## Hair (Lucy, js/modules/salon.js)
State `G.state.hair {length cm, natural, dyed, dyeDays, lastCut}`. Grows ~1 cm per game week; short cuts grow out into longer styles.
`G.salon.length()`, `band()` (buzzed|short|ear|chin|shoulder|midback|waist), `lengthWord()`, `scruffy()`, `rootsShowing()`, `faded()`, `dyed()`, `natural()`, `daysSinceCut()`, `note()`.
Event `hairChanged {what: cut|dye|grow|style, style, color}`. Location `hair_salon` (Ron).


## Banners
`G.addBanner(fn)`: fn() returns an HTML string or null, re-evaluated every render, and shown in a persistent strip above the story text (not replaced by turn text).


## Action times
Every option should declare `minutes` (aliases `mins`, `time`; a number or a function(state) returning one) matching the minutes its run() returns. The engine appends it to the label as (h:mm), e.g. `Nap for an hour (1:00)`, `Look around (0:05)`. Labels that already contain (h:mm) are left alone. For variable actions, declare the typical or minimum time. Instant UI options (menus, checks costing 0 minutes) can omit it.

### Soiled clothing (Lucy, wardrobe.js)
- On `accident` with `kind: 'bowels'` (or `'soiled'`), the worn bottoms get `soiled: true` and the event `soiled` is emitted.
- `G.wardrobe.soiled()` (alias `isSoiled()`) returns true while the worn bottoms are soiled. `G.wardrobe.soiledHours()` returns hours worn since, and `G.wardrobe.markSoiled()` sets it manually.
- Changing out of soiled bottoms, or a restroom clean-up or shower (when `stats.flags.dirty` is cleared), ends it. While soiled: style −4 and stress +6 per hour. The accident event can use `kind` or `type`. Soiled items can't be worn again until laundry.

### Inventory (Lucy, inventory.js)
- Builds on Jimmy's `G.groceries`, and sets `G.groceries.limit` to 24 portions, or 36 with a canvas tote bag ($8 at the grocer).
- The Bag tab lists `G.groceries.list()` with counts and anything gone off.
- `G.inventory.limit()`, `used()`, `room()` and `hasTote()`.

## Clothing layers and stats (Lucy, wardrobe.js)
- Slots: under_top, under_bottom, top, bottom, shoes, outer (jacket), plus head/face/ears/neck. stats.clothing.upper*/lower* = outer top/bottom (unchanged).
- Mirrored: stats.clothing.underUpperWetness/Integrity, underLowerWetness/Integrity, jacketWetness/Integrity, diaper.
- Every item: integrity (current/max; cheap thin pieces have a lower max), warmth 0-4 (scaled by integrity), bagginess 0-4, absorption in ml.
- Integrity 0 = ruined: no wash, no mend, only "Throw away". 100% wetness costs ~1/hour; soiling costs 15.
- G.wardrobe: absorb(kind), soak(slot, ml) -> overflow ml, layer(name) -> {wetness, integrity, maxIntegrity, warmth, warmthLevel, bagginess, absorption, soiled},
  conceal('lower'|'chest'|'stash') -> 0-4, briefVisible(), warmth(), stats(id), LEVEL, soiled(), wearingBrief(), briefFull(), briefs().
- Undressing (Lucy): any slot can be taken off at home or in the fitting room ("Get undressed" removes all). G.wardrobe.exposure() -> {upper, lower} each null | 'under' | 'bare'; isNaked(); exposedInPublic() (false at home, in the fitting room, or while hiding).
- In public while exposed: stress, and every 30 min a crowd-weighted chance of `spotted {kind:'exposed', by:'students'|'public', src:'wardrobe', severity}` plus an `exposed` event. "Find somewhere out of sight to hide" stops it until you move.
- Paperdoll: tears/holes by integrity fraction, darker when soaked, stain when soiled, underwear shown when bottoms are off, black censor bars when bare.
