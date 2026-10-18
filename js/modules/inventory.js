/* Inventory (Lucy): the Bag tab and grocery carry limit, layered on Jimmy's G.groceries (stats.js owns the food itself).
 * Carry limit: 24 portions, or 36 with a canvas tote bag ($8 at Hollowbrook Grocer).
 * State: G.state.inventory = { tote: bool }.  API: G.inventory = { limit(), used(), room(), hasTote() }.
 */
(function () {
  'use strict';
  var BASE = 24, TOTE = 12, TOTE_PRICE = 8;
  function G_() { return window.G; }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function I(state) { state = state || G_().state; if (!state.inventory || state.inventory.lots) state.inventory = { tote: !!(state.inventory && state.inventory.tote) }; return state.inventory; }
  function limit() { return BASE + (I().tote ? TOTE : 0); }
  function used() { var g = G_().groceries; return g && g.total ? g.total() : 0; }
  function money() { return (G_().state.money) || 0; }
  function hookLimit() { var g = G_().groceries; if (g && g.limit !== limit) g.limit = limit; }

  var mod = {
    id: 'inventory',
    init: function (state) { I(state); hookLimit(); },
    onTick: function () { hookLimit(); },
    getOptions: function (state) {
      var out = { dialogue: [], actions: [], travel: [], other: [] };
      hookLimit();
      var w = G_().world, hid = w && w.hereId ? w.hereId() : null;
      if (hid === 'market' && !I(state).tote) out.actions.push({
        label: 'Buy a canvas tote bag ($' + TOTE_PRICE + ')', sub: 'Groceries', time: 1, disabled: money() < TOTE_PRICE,
        hint: 'Carry ' + TOTE + ' more portions of groceries.',
        run: function () {
          if (money() < TOTE_PRICE) return { text: '<p>Not today.</p>', minutes: 1 };
          G_().change('money', -TOTE_PRICE); I().tote = true;
          return { text: '<p>Dot rings up a sturdy canvas tote with "Hollowbrook Grocer" stencilled on the side. Room for a proper shop now.</p>', minutes: 1 };
        }
      });
      return out;
    }
  };

  function boot() {
    var g = G_(); if (!g || !g.register) return setTimeout(boot, 20);
    g.register(mod); hookLimit();
    if (g.on) g.on('start', function () { hookLimit(); });
    if (g.addTab) g.addTab({
      id: 'bag', label: 'Bag', order: 37,
      render: function () {
        hookLimit();
        var list = g.groceries && g.groceries.list ? g.groceries.list() : [];
        var rows = list.map(function (x) {
          var d = g.groceries.CATALOG && g.groceries.CATALOG[x.id], unit = d && d.unit ? d.unit : 'item';
          return '<li>' + esc(x.label) + ': ' + x.count + ' ' + esc(unit) + (x.count === 1 ? '' : 's') + (x.off ? ' <span class="flavor">(' + x.off + ' gone off)</span>' : '') + '</li>';
        }).join('');
        return '<h3>Bag</h3><p class="flavor">Groceries: ' + used() + ' of ' + limit() + ' portions carried' + (I().tote ? ', with your canvas tote.' : '. A canvas tote from the grocer would hold more.') + '</p>' +
          (rows ? '<ul>' + rows + '</ul>' : '<p class="flavor">No groceries. Hollowbrook Grocer on Main Street is open 7:00 to 22:00.</p>');
      }
    });
  }

  var api = { limit: limit, used: used, room: function () { return limit() - used(); }, hasTote: function () { return !!I().tote; }, module: mod };
  window.Inventory = api;
  if (window.G) window.G.inventory = api;
  boot();
})();
