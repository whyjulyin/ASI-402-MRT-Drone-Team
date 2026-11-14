/* =====================================================================
   charts.js — shared helpers, engineering models, calculators and charts
   No dependencies. All inputs come from js/data.js (window.DRONE).
   ===================================================================== */
(function () {
  'use strict';
  var D = window.DRONE;
  var NS = 'http://www.w3.org/2000/svg';

  /* ------------------------------------------------------------ helpers */
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  /* HTML element builder. Text always goes in through textContent. */
  function h(tag, attrs, kids) {
    var e = document.createElement(tag), k;
    if (attrs) {
      for (k in attrs) {
        if (attrs[k] == null || attrs[k] === false) continue;
        if (k === 'text') e.textContent = attrs[k];
        else if (k === 'class') e.className = attrs[k];
        else if (k.slice(0, 2) === 'on') e.addEventListener(k.slice(2), attrs[k]);
        else e.setAttribute(k, attrs[k] === true ? '' : attrs[k]);
      }
    }
    (kids || []).forEach(function (c) {
      if (c == null) return;
      e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    });
    return e;
  }
  /* SVG element builder */
  function s(tag, attrs, parent, text) {
    var e = document.createElementNS(NS, tag), k;
    if (attrs) for (k in attrs) if (attrs[k] != null) e.setAttribute(k, attrs[k]);
    if (text != null) e.textContent = text;
    if (parent) parent.appendChild(e);
    return e;
  }
  function fmt(n, d) {
    return Number(n).toLocaleString('en-US', { minimumFractionDigits: d || 0, maximumFractionDigits: d || 0 });
  }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function lin(d0, d1, r0, r1) {
    var f = function (x) { return r0 + (x - d0) / (d1 - d0) * (r1 - r0); };
    f.inv = function (y) { return d0 + (y - r0) / (r1 - r0) * (d1 - d0); };
    return f;
  }
  function logS(d0, d1, r0, r1) {
    var a = Math.log(d0), b = Math.log(d1);
    var f = function (x) { return r0 + (Math.log(x) - a) / (b - a) * (r1 - r0); };
    f.inv = function (y) { return Math.exp(a + (y - r0) / (r1 - r0) * (b - a)); };
    return f;
  }
  function cssVar(el, name) { return getComputedStyle(el).getPropertyValue(name).trim(); }
  function safe(name, fn) { try { fn(); } catch (err) { if (window.console) console.error('[MRT] ' + name + ' failed:', err); } }

  /* ------------------------------------------------------------ tooltip */
  var tipEl;
  var tip = {
    show: function (x, y, title, rows) {
      tipEl = tipEl || document.getElementById('tip');
      if (!tipEl) return;
      tipEl.textContent = '';
      if (title) tipEl.appendChild(h('b', { text: title }));
      (rows || []).forEach(function (r) {
        var row = h('div', { class: 'row' });
        if (r.color) { var key = h('i'); key.style.background = r.color; row.appendChild(key); }
        row.appendChild(h('strong', { text: r.value }));
        if (r.label) row.appendChild(h('span', { text: r.label }));
        tipEl.appendChild(row);
      });
      tipEl.hidden = false;
      var w = tipEl.offsetWidth, hh = tipEl.offsetHeight;
      var left = x + 14, top = y - hh - 12;
      if (left + w > window.innerWidth - 8) left = x - w - 14;
      if (left < 8) left = 8;
      if (top < 8) top = y + 18;
      tipEl.style.left = left + 'px';
      tipEl.style.top = top + 'px';
    },
    hide: function () { if (tipEl) tipEl.hidden = true; }
  };
  /* Per-mark tooltip: same content on hover and on keyboard focus */
  function hover(node, getContent) {
    function show(x, y) { var c = getContent(); tip.show(x, y, c.title, c.rows); }
    node.addEventListener('pointermove', function (e) { show(e.clientX, e.clientY); });
    node.addEventListener('pointerleave', tip.hide);
    node.addEventListener('focus', function () { var b = node.getBoundingClientRect(); show(b.left + b.width / 2, b.top); });
    node.addEventListener('blur', tip.hide);
  }

  /* ------------------------------------------------- chart scaffolding */
  /* Calls draw(width) now and whenever the container width changes. */
  function mount(el, draw) {
    var w = 0;
    function run() {
      var nw = Math.round(el.clientWidth);
      if (nw > 0 && nw !== w) { w = nw; draw(w); }
    }
    if ('ResizeObserver' in window) new ResizeObserver(run).observe(el);
    else window.addEventListener('resize', run);
    run();
    return function redraw() { var nw = Math.round(el.clientWidth); if (nw > 0) { w = nw; draw(w); } };
  }
  function frame(el, w, hgt, label) {
    var g = el.querySelector('svg');
    if (!g) g = s('svg', { role: 'group' }, el);
    while (g.firstChild) g.removeChild(g.firstChild);
    g.setAttribute('viewBox', '0 0 ' + w + ' ' + hgt);
    g.setAttribute('width', w);
    g.setAttribute('height', hgt);
    if (label) g.setAttribute('aria-label', label);
    return g;
  }
  function roundRight(x, y, w, hgt, r) {
    r = Math.min(r, w, hgt / 2);
    return 'M' + x + ',' + y + 'H' + (x + w - r) + 'Q' + (x + w) + ',' + y + ' ' + (x + w) + ',' + (y + r) +
      'V' + (y + hgt - r) + 'Q' + (x + w) + ',' + (y + hgt) + ' ' + (x + w - r) + ',' + (y + hgt) + 'H' + x + 'Z';
  }
  function legend(items) {
    return h('ul', { class: 'legend' }, items.map(function (it) {
      return h('li', null, [h('i', { class: 'key ' + it.key }), it.label]);
    }));
  }
  /* Table-view twin of a chart */
  function dataTable(el, cols, rows) {
    var old = el.querySelector('details.chart-data');
    var open = old ? old.open : false;
    if (old) el.removeChild(old);
    var thead = h('thead', null, [h('tr', null, cols.map(function (c) { return h('th', { text: c }); }))]);
    var tbody = h('tbody', null, rows.map(function (r) {
      return h('tr', null, r.map(function (c, i) { return h(i ? 'td' : 'th', { text: String(c), class: i ? 'num' : null }); }));
    }));
    var det = h('details', { class: 'chart-data' }, [
      h('summary', { text: 'Data table' }),
      h('div', { class: 'table-wrap' }, [h('table', { class: 'table' }, [thead, tbody])])
    ]);
    det.open = open;
    el.appendChild(det);
  }
  function readouts(el, items) {
    if (!el) return;
    el.textContent = '';
    items.forEach(function (it) {
      var v = h('span', { class: 'ro-val', text: it.value });
      if (it.unit) v.appendChild(h('small', { text: it.unit }));
      el.appendChild(h('div', { class: 'readout' + (it.state ? ' ' + it.state : '') }, [
        h('span', { class: 'ro-label', text: it.label }), v,
        it.sub ? h('span', { class: 'ro-sub', text: it.sub }) : null
      ]));
    });
  }
  function axes(g, o) {
    /* o: {x, y, xt, yt, left, right, top, bottom, xfmt, yfmt, xlabel, ylabel} */
    o.yt.forEach(function (t) {
      s('line', { class: 'gridline', x1: o.left, x2: o.right, y1: o.y(t), y2: o.y(t) }, g);
      s('text', { x: o.left - 8, y: o.y(t) + 4, 'text-anchor': 'end' }, g, o.yfmt ? o.yfmt(t) : fmt(t));
    });
    s('line', { class: 'axisline', x1: o.left, x2: o.right, y1: o.bottom, y2: o.bottom }, g);
    o.xt.forEach(function (t) {
      s('line', { class: 'axisline', x1: o.x(t), x2: o.x(t), y1: o.bottom, y2: o.bottom + 5 }, g);
      s('text', { x: o.x(t), y: o.bottom + 19, 'text-anchor': 'middle' }, g, o.xfmt ? o.xfmt(t) : fmt(t));
    });
    if (o.xlabel) s('text', { x: (o.left + o.right) / 2, y: o.bottom + 38, 'text-anchor': 'middle' }, g, o.xlabel);
    if (o.ylabel) s('text', { x: o.left - 34, y: o.top - 10, 'text-anchor': 'start' }, g, o.ylabel);
  }
  /* Crosshair + tooltip for line charts, with keyboard access */
  function crosshair(svgEl, g, o) {
    var line = s('line', { class: 'cross', y1: o.top, y2: o.bottom, visibility: 'hidden' }, g);
    var dot = s('circle', { class: 'dot ' + (o.dotClass || 'f1'), r: 5, visibility: 'hidden' }, g);
    var hit = s('rect', { class: 'hit', x: o.left, y: o.top, width: Math.max(1, o.right - o.left), height: Math.max(1, o.bottom - o.top),
      tabindex: 0, role: 'slider', 'aria-label': o.label || 'Chart values. Use the arrow keys.' }, g);
    var cur = o.start;
    function vis(v) { line.setAttribute('visibility', v); dot.setAttribute('visibility', v); }
    function place(v, showTip) {
      cur = clamp(v, o.min, o.max);
      var r = o.read(cur);
      line.setAttribute('x1', r.px); line.setAttribute('x2', r.px);
      dot.setAttribute('cx', r.px); dot.setAttribute('cy', r.py);
      vis('visible');
      hit.setAttribute('aria-valuetext', (r.title || '') + ': ' + (r.rows || []).map(function (x) { return x.value + ' ' + (x.label || ''); }).join(', '));
      if (showTip) { var b = svgEl.getBoundingClientRect(); tip.show(b.left + r.px, b.top + r.py, r.title, r.rows); }
      if (o.onChange) o.onChange(cur);
    }
    function fromEvent(e) { var b = svgEl.getBoundingClientRect(); return o.inv(e.clientX - b.left); }
    function leave() { tip.hide(); if (!o.sticky) vis('hidden'); }
    hit.addEventListener('pointermove', function (e) { place(fromEvent(e), true); });
    hit.addEventListener('pointerdown', function (e) { place(fromEvent(e), true); if (o.onPick) o.onPick(cur); });
    hit.addEventListener('pointerleave', leave);
    hit.addEventListener('keydown', function (e) {
      var d = e.key === 'ArrowRight' || e.key === 'ArrowUp' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowDown' ? -1 : 0;
      if (!d) return;
      e.preventDefault();
      var next = o.stepFn ? o.stepFn(cur, d, e.shiftKey) : cur + d * o.step * (e.shiftKey ? 5 : 1);
      place(next, true);
      if (o.onPick) o.onPick(cur);
    });
    hit.addEventListener('focus', function () { place(cur, true); });
    hit.addEventListener('blur', leave);
    if (o.sticky) place(cur, false);
    return { place: place };
  }

  /* -------------------------------------------------- engineering models */
  /* Linear interpolation of the manufacturer motor test table by thrust (gf) */
  function motorAt(thrust) {
    var T = D.motorTest, i;
    var t = clamp(thrust, T[0][1], T[T.length - 1][1]);
    for (i = 1; i < T.length - 1; i++) if (t <= T[i][1]) break;
    var a = T[i - 1], b = T[i], f = (t - a[1]) / (b[1] - a[1]);
    return {
      thrust: t,
      throttle: a[0] + f * (b[0] - a[0]),
      current: a[2] + f * (b[2] - a[2]),
      power: a[3] + f * (b[3] - a[3]),
      volts: a[4] + f * (b[4] - a[4])
    };
  }
  function usableFraction(a) { return (a.dod / 100) * (a.esc / 100) * (a.wiring / 100) * (1 - a.reserve / 100); }
  /* Hover endurance for a battery mass mb (g); the dummy mass equals mb */
  function enduranceAt(mb, a) {
    var E = D.endurance;
    var mtow = E.emptyMass + 2 * mb;
    var per = mtow / E.motors;
    var m = motorAt(per);
    var power = E.motors * m.power + a.aux;
    var usable = a.specificEnergy * mb / 1000 * usableFraction(a);
    return { mtow: mtow, per: per, throttle: m.throttle, power: power, usable: usable, time: usable / power * 60, feasible: mtow <= E.limit };
  }
  /* Concept study: airframe scaled with take-off mass, constant thrust efficiency */
  function conceptTime(M) {
    var m = D.concepts.model, a = D.endurance.defaults;
    var air = m.airAt5kg * M / 5000;
    var batt = (M / (1 + m.growth) - m.kit - air) / 2;
    var usable = a.specificEnergy * batt / 1000 * usableFraction(a);
    return usable / (M / m.gfPerW + a.aux) * 60;
  }
  function fspl(fMHz, dKm) { return 32.44 + 20 * Math.log10(fMHz) + 20 * Math.log10(dKm); }
  function linkAt(opt, dKm, cable) {
    var L = D.links.loss + (cable ? opt.cable : 0);
    var pl = fspl(opt.f, dKm);
    var prx = opt.ptx + opt.gtx + opt.grx - pl - L;
    return { fspl: pl, prx: prx, margin: prx - opt.sens, loss: L };
  }
  function rangeFor(opt, marginDb, cable) {
    var L = D.links.loss + (cable ? opt.cable : 0);
    var budget = opt.ptx + opt.gtx + opt.grx - L - opt.sens - marginDb - 32.44 - 20 * Math.log10(opt.f);
    return Math.pow(10, budget / 20);
  }
  function kmText(km) { return km >= 100 ? fmt(km) + ' km' : km >= 10 ? fmt(km, 1) + ' km' : fmt(km, 2) + ' km'; }

  /* ------------------------------------------------ 02 thrust-loss bar */
  function thrustLoss() {
    var el = $('#thrust-loss'); if (!el) return;
    var t = D.predecessor.thrust;
    var parts = [
      { cls: 'p1', v: t.delivered, label: 'Delivered on the airframe', inbar: fmt(t.delivered) + ' gf' },
      { cls: 'p2', v: t.sagLoss, label: 'Lost to battery voltage sag', inbar: '−' + fmt(t.sagLoss) },
      { cls: 'p3', v: t.washLoss, label: 'Lost to prop-wash interference', inbar: '' }
    ];
    var bar = h('div', { class: 'segbar', role: 'img', 'aria-label': 'Per-motor thrust: ' + t.bench + ' gf on the bench, ' + t.delivered + ' gf delivered on the airframe' });
    parts.forEach(function (p) {
      var seg = h('span', { class: p.cls, text: p.inbar, tabindex: 0 });
      seg.style.width = (p.v / t.bench * 100) + '%';
      hover(seg, function () { return { title: p.label, rows: [{ value: fmt(p.v) + ' gf', label: fmt(p.v / t.bench * 100, 1) + '% of bench thrust' }] }; });
      bar.appendChild(seg);
    });
    el.appendChild(bar);
    el.appendChild(h('ul', { class: 'seg-legend' }, parts.map(function (p, i) {
      return h('li', null, [h('i', { class: 'key k' + (i + 1) }), p.label + ' · ' + fmt(p.v) + ' gf']);
    })));
  }

  /* ------------------------------------------------ 03 mass-budget bars */
  function massChart() {
    var el = $('#chart-mass'); if (!el) return;
    var C = D.concepts;
    el.appendChild(legend(C.parts.map(function (p) { return { key: 'k' + p.series, label: p.label }; })));
    var holder = h('div'); el.appendChild(holder);
    dataTable(el, ['Concept'].concat(C.parts.map(function (p) { return p.label + ' (g)'; })).concat(['Total (g)']),
      C.rows.map(function (r) {
        var total = 0;
        var cells = C.parts.map(function (p) { total += r[p.key]; return fmt(r[p.key]); });
        return [r.id + ' · ' + r.name].concat(cells).concat([fmt(total)]);
      }));
    mount(holder, function (w) {
      var rowH = 62, top = 26, bottom = 30, right = 66, left = 2;
      var hgt = top + rowH * C.rows.length + bottom;
      var g = frame(holder, w, hgt, 'Stacked bars comparing the mass budget of three concepts against the 5,000 gram limit');
      var x = lin(0, 5000, left, w - right);
      [0, 1000, 2000, 3000, 4000, 5000].forEach(function (t) {
        s('line', { class: 'gridline', x1: x(t), x2: x(t), y1: top - 4, y2: hgt - bottom }, g);
        s('text', { x: x(t), y: hgt - bottom + 17, 'text-anchor': t === 0 ? 'start' : 'middle' }, g, fmt(t));
      });
      s('line', { class: 'thresh-accent', x1: x(5000), x2: x(5000), y1: 2, y2: hgt - bottom }, g);
      s('text', { class: 'lbl', x: x(5000) - 6, y: 12, 'text-anchor': 'end' }, g, 'URC limit 5,000 g');
      C.rows.forEach(function (r, i) {
        var y0 = top + i * rowH, by = y0 + 22, bh = 22, cx = 0, total = 0;
        C.parts.forEach(function (p) { total += r[p.key]; });
        s('text', { class: r.selected ? 'lbl-strong' : 'lbl', x: left, y: y0 + 14 }, g, r.id + ' · ' + r.name + (r.selected ? ' (selected)' : ''));
        C.parts.forEach(function (p, j) {
          var v = r[p.key], x0 = x(cx) + (j ? 1 : 0), x1 = x(cx + v) - 1, bw = Math.max(1, x1 - x0);
          var last = j === C.parts.length - 1;
          var shape = last ? s('path', { d: roundRight(x0, by, bw, bh, 4) }, g) : s('rect', { x: x0, y: by, width: bw, height: bh }, g);
          var pct = Math.round(v / total * 100);
          shape.setAttribute('class', 'seg-rect f' + p.series);
          shape.setAttribute('tabindex', '0');
          shape.setAttribute('role', 'img');
          shape.setAttribute('aria-label', r.name + ', ' + p.label + ': ' + fmt(v) + ' grams, ' + pct + ' percent of take-off mass');
          var txt = fmt(v);
          if (bw > txt.length * 7.2 + 12) {
            s('text', { class: 'in-fill' + (p.series === 4 ? ' dark-ink' : ''), x: x0 + bw / 2, y: by + 15.5, 'text-anchor': 'middle', 'pointer-events': 'none' }, g, txt);
          }
          hover(shape, function () {
            return { title: r.id + ' · ' + r.name, rows: [{ color: cssVar(el, '--s' + p.series), value: fmt(v) + ' g', label: p.label + ' · ' + pct + '%' }] };
          });
          cx += v;
        });
        s('text', { class: 'lbl-strong', x: x(5000) + 8, y: by + 15.5 }, g, fmt(total) + ' g');
      });
    });
  }

  /* --------------------------------------------- 03 concept endurance */
  function conceptChart() {
    var el = $('#chart-concept'); if (!el) return;
    var rows = D.concepts.rows;
    el.appendChild(legend([
      { key: 'line k1', label: 'Resized airframe, same kit (model)' },
      { key: 'k2', label: 'Today’s parts at 3 kg' }
    ]));
    var holder = h('div'); el.appendChild(holder);
    var pts = [];
    for (var M = 2500; M <= 5000; M += 50) pts.push([M, conceptTime(M)]);
    dataTable(el, ['Design take-off mass (g)', 'Hover time, model (min)'],
      pts.filter(function (p) { return p[0] % 250 === 0; }).map(function (p) { return [fmt(p[0]), fmt(p[1], 1)]; })
        .concat(rows.map(function (r) { return [r.id + ' · ' + r.name, fmt(r.hover, 1)]; })));
    mount(holder, function (w) {
      var left = 40, right = w - 18, top = 22, bottom = 250, hgt = 296;
      var g = frame(holder, w, hgt, 'Hover time against design take-off mass for the three concepts');
      var x = lin(2500, 5000, left, right), y = lin(0, 25, bottom, top);
      axes(g, { x: x, y: y, xt: [2500, 3000, 3500, 4000, 4500, 5000], yt: [0, 5, 10, 15, 20, 25], left: left, right: right, top: top, bottom: bottom,
        xlabel: 'Design take-off mass (g)', ylabel: 'Hover time (min)' });
      s('line', { class: 'thresh-accent', x1: x(5000), x2: x(5000), y1: top, y2: bottom }, g);
      s('text', { class: 'lbl', x: x(5000) - 6, y: bottom - 8, 'text-anchor': 'end' }, g, 'URC limit');
      s('path', { class: 'line c1', d: 'M' + pts.map(function (p) { return x(p[0]).toFixed(1) + ',' + y(p[1]).toFixed(1); }).join('L') }, g);
      var A = rows[0], B = rows[1], Cc = rows[2];
      var mC = D.endurance.emptyMass + 2 * D.endurance.selectedBattery;
      var cross = crosshair(g.ownerSVGElement || g, g, {
        left: left, right: right, top: top, bottom: bottom, min: 2500, max: 5000, step: 50, start: 3000,
        inv: x.inv, label: 'Hover time model. Use the arrow keys to change take-off mass.',
        read: function (v) {
          var t = conceptTime(v);
          return { px: x(v), py: y(t), title: 'Take-off mass ' + fmt(v) + ' g', rows: [{ color: cssVar(el, '--s1'), value: fmt(t, 1) + ' min', label: 'model' }] };
        }
      });
      void cross;
      s('circle', { class: 'dot f2', r: 5.5, cx: x(3000), cy: y(A.hover), 'pointer-events': 'none' }, g);
      s('circle', { class: 'dot f1', r: 5.5, cx: x(3000), cy: y(B.hover), 'pointer-events': 'none' }, g);
      s('circle', { class: 'dot f1', r: 6.5, cx: x(mC), cy: y(Cc.hover), 'pointer-events': 'none' }, g);
      s('text', { class: 'lbl', x: x(3000) + 10, y: y(A.hover) + 4, 'pointer-events': 'none' }, g, 'A · today’s parts: ' + fmt(A.hover, 1) + ' min');
      s('text', { class: 'lbl', x: x(3000) + 10, y: y(B.hover) + 18, 'pointer-events': 'none' }, g, 'B · resized: ' + fmt(B.hover, 1) + ' min');
      s('text', { class: 'lbl-strong', x: x(mC) - 10, y: y(Cc.hover) - 12, 'text-anchor': 'end', 'pointer-events': 'none' }, g, 'C · 5 kg design: ' + fmt(Cc.hover, 1) + ' min');
    });
  }

  /* ------------------------------------------ 04 propulsion sizing tool */
  function sizing() {
    var S = D.sizing;
    var mass = $('#sz-mass'), tw = $('#sz-tw'), dl = $('#sz-dl'), out = $('#sz-readouts'), note = $('#sz-note'), presets = $('#sz-presets');
    if (!mass || !out) return;
    D.diskLoadingOptions.forEach(function (o) {
      presets.appendChild(h('button', { type: 'button', class: 'preset', 'data-dl': o.dl, text: o.dl + ' N/m² → ' + o.d,
        onclick: function () { dl.value = o.dl; update(); } }));
    });
    function update() {
      var m = +mass.value, k = +tw.value, d = +dl.value;
      var hoverGf = m * 1000 / S.motors;
      var maxGf = hoverGf * k;
      var area = m * S.g / d;
      var diaIn = Math.sqrt(4 * area / (S.motors * Math.PI)) / 0.0254;
      var haveTw = S.motors * S.motorMaxGf / (m * 1000);
      var propArea = S.motors * Math.PI * Math.pow(S.selectedPropIn * 0.0254, 2) / 4;
      var haveDl = m * S.g / propArea;
      $('#sz-mass-out').textContent = fmt(m, 1) + ' kg';
      $('#sz-tw-out').textContent = fmt(k, 1) + ' : 1';
      $('#sz-dl-out').textContent = fmt(d) + ' N/m²';
      readouts(out, [
        { label: 'Hover thrust per motor', value: fmt(hoverGf), unit: 'gf', sub: fmt(hoverGf * S.g / 1000, 2) + ' N each' },
        { label: 'Peak thrust needed per motor', value: fmt(maxGf), unit: 'gf', state: S.motorMaxGf >= maxGf ? 'ok' : 'bad',
          sub: 'Selected motor: ' + fmt(S.motorMaxGf) + ' gf, T/W ' + fmt(haveTw, 2) },
        { label: 'Total rotor disk area', value: fmt(area, 3), unit: 'm²', sub: 'Four equal rotors' },
        { label: 'Propeller diameter', value: fmt(diaIn, 1), unit: 'in', state: diaIn <= S.selectedPropIn + 0.05 ? 'ok' : 'warn',
          sub: '18-inch props give ' + fmt(haveDl, 1) + ' N/m²' }
      ]);
      var match = null;
      $$('.preset', presets).forEach(function (b) {
        var on = +b.getAttribute('data-dl') === d;
        b.classList.toggle('on', on);
        b.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
      D.diskLoadingOptions.forEach(function (o) { if (o.dl === d) match = o; });
      note.textContent = match ? match.note : 'Lower disk loading cuts induced hover power but needs larger propellers and a larger frame.';
    }
    [mass, tw, dl].forEach(function (i) { i.addEventListener('input', update); });
    update();
  }

  /* --------------------------------------------- 04 motor data explorer */
  function motorChart() {
    var el = $('#chart-motor'); if (!el) return;
    var T = D.motorTest, out = $('#mt-readouts');
    var hoverGf = D.sizing.mass * 1000 / D.sizing.motors, peakGf = hoverGf * D.sizing.tw;
    var state = hoverGf;
    function show(v) {
      var m = motorAt(v);
      readouts(out, [
        { label: 'Thrust per motor', value: fmt(m.thrust), unit: 'gf' },
        { label: 'Throttle', value: fmt(m.throttle * 100, 1), unit: '%' },
        { label: 'Input power', value: fmt(m.power, 1), unit: 'W', sub: fmt(m.current, 2) + ' A at ' + fmt(m.volts, 1) + ' V' },
        { label: 'Thrust efficiency', value: fmt(m.thrust / m.power, 1), unit: 'gf/W' }
      ]);
    }
    var holder = h('div'); el.appendChild(holder);
    mount(holder, function (w) {
      var left = 44, right = w - 16, top = 34, bottom = 262, hgt = 308;
      var g = frame(holder, w, hgt, 'Electrical input power against thrust for the selected motor and propeller');
      var x = lin(0, 4000, left, right), y = lin(0, 700, bottom, top);
      axes(g, { x: x, y: y, xt: [0, 1000, 2000, 3000, 4000], yt: [0, 100, 200, 300, 400, 500, 600, 700], left: left, right: right, top: top, bottom: bottom,
        xlabel: 'Thrust per motor (gf)', ylabel: 'Input power per motor (W)' });
      s('line', { class: 'thresh-accent', x1: x(hoverGf), x2: x(hoverGf), y1: top, y2: bottom }, g);
      s('text', { class: 'lbl', x: x(hoverGf) + 6, y: top + 10 }, g, 'Hover ' + fmt(hoverGf) + ' gf');
      s('line', { class: 'thresh', x1: x(peakGf), x2: x(peakGf), y1: top, y2: bottom }, g);
      s('text', { class: 'lbl', x: x(peakGf) - 6, y: top + 28, 'text-anchor': 'end' }, g, 'Peak target ' + fmt(peakGf) + ' gf');
      s('path', { class: 'line c1', d: 'M' + T.map(function (r) { return x(r[1]).toFixed(1) + ',' + y(r[3]).toFixed(1); }).join('L') }, g);
      T.forEach(function (r) { s('circle', { class: 'dot f1', r: 3.5, cx: x(r[1]), cy: y(r[3]) }, g); });
      var lastRow = T[T.length - 1];
      s('text', { class: 'lbl', x: x(lastRow[1]) - 8, y: y(lastRow[3]) - 10, 'text-anchor': 'end' }, g, 'Max tested ' + fmt(lastRow[1]) + ' gf');
      crosshair(g, g, {
        left: left, right: right, top: top, bottom: bottom, min: T[0][1], max: lastRow[1], step: 25, start: state, sticky: true,
        inv: x.inv, dotClass: 'f2', label: 'Motor operating point. Use the arrow keys to change thrust.',
        read: function (v) {
          var m = motorAt(v);
          return { px: x(m.thrust), py: y(m.power), title: fmt(m.thrust) + ' gf per motor',
            rows: [{ color: cssVar(el, '--s1'), value: fmt(m.power, 1) + ' W', label: fmt(m.throttle * 100) + '% throttle' }] };
        },
        onChange: function (v) { state = v; show(v); }
      });
    });
    show(state);
  }

  /* ------------------------------------------- 04 endurance explorer */
  function enduranceExplorer() {
    var el = $('#chart-endurance'); if (!el) return;
    var E = D.endurance, defs = E.defaults;
    var slider = $('#en-batt');
    var inputs = { specificEnergy: $('#en-se'), dod: $('#en-dod'), esc: $('#en-esc'), wiring: $('#en-wire'), reserve: $('#en-res'), aux: $('#en-aux') };
    var units = { specificEnergy: ' Wh/kg', dod: '%', esc: '%', wiring: '%', reserve: '%', aux: ' W' };
    var outs = { specificEnergy: $('#en-se-out'), dod: $('#en-dod-out'), esc: $('#en-esc-out'), wiring: $('#en-wire-out'), reserve: $('#en-res-out'), aux: $('#en-aux-out') };
    var holder = h('div'); el.appendChild(holder);
    var boundary = (E.limit - E.emptyMass) / 2;
    function assumptions() { var a = {}, k; for (k in inputs) a[k] = +inputs[k].value; return a; }
    function draw(w) {
      var a = assumptions(), mb = +slider.value, now = enduranceAt(mb, a), sel = enduranceAt(E.selectedBattery, a);
      var pts = [], m, peak = { mb: 0, time: 0 };
      for (m = 400; m <= 2500; m += 20) { var r = enduranceAt(m, a); pts.push([m, r.time]); if (r.time > peak.time) peak = { mb: m, time: r.time }; }
      var yMax = Math.max(30, Math.ceil(peak.time / 5) * 5);
      var left = 40, right = w - 16, top = 24, bottom = 268, hgt = 314;
      var g = frame(holder, w, hgt, 'Predicted hover time against battery mass, with the 5 kilogram take-off limit');
      var x = lin(400, 2500, left, right), y = lin(0, yMax, bottom, top);
      var yt = []; for (m = 0; m <= yMax; m += 5) yt.push(m);
      s('rect', { class: 'zone', x: x(boundary), y: top, width: Math.max(0, right - x(boundary)), height: bottom - top }, g);
      axes(g, { x: x, y: y, xt: [500, 1000, 1500, 2000, 2500], yt: yt, left: left, right: right, top: top, bottom: bottom,
        xlabel: 'Battery mass (g)', ylabel: 'Hover time (min)' });
      s('text', { class: 'lbl', x: (x(boundary) + right) / 2, y: bottom - 12, 'text-anchor': 'middle' }, g, 'Take-off mass over 5 kg');
      s('line', { class: 'thresh-accent', x1: x(boundary), x2: x(boundary), y1: top, y2: bottom }, g);
      s('text', { class: 'lbl', x: x(boundary) - 6, y: top + 10, 'text-anchor': 'end' }, g, '5 kg cap · ' + fmt(boundary) + ' g');
      function path(sub) { return 'M' + sub.map(function (p) { return x(p[0]).toFixed(1) + ',' + y(p[1]).toFixed(1); }).join('L'); }
      var feas = pts.filter(function (p) { return p[0] <= boundary; }), infe = pts.filter(function (p) { return p[0] >= boundary - 20; });
      if (infe.length > 1) s('path', { class: 'line cm', d: path(infe) }, g);
      if (feas.length > 1) s('path', { class: 'line c1', d: path(feas) }, g);
      crosshair(g, g, {
        left: left, right: right, top: top, bottom: bottom, min: 400, max: 2500, step: 10, start: mb, inv: x.inv,
        label: 'Hover time against battery mass. Arrow keys change the battery mass.',
        read: function (v) {
          var r = enduranceAt(v, a);
          return { px: x(v), py: y(r.time), title: 'Battery ' + fmt(v) + ' g',
            rows: [{ color: cssVar(el, r.feasible ? '--s1' : '--s-mute'), value: fmt(r.time, 1) + ' min', label: 'take-off ' + fmt(r.mtow) + ' g' }] };
        },
        onPick: function (v) { slider.value = Math.round(v / 10) * 10; redraw(); }
      });
      /* design point and current what-if point */
      s('circle', { class: 'dot f1', r: 6, cx: x(E.selectedBattery), cy: y(sel.time), 'pointer-events': 'none' }, g);
      s('text', { class: 'lbl-strong', x: x(E.selectedBattery) - 10, y: y(sel.time) - 10, 'text-anchor': 'end', 'pointer-events': 'none' }, g,
        'Selected ' + fmt(E.selectedBattery) + ' g · ' + fmt(sel.time, 1) + ' min');
      if (Math.abs(mb - E.selectedBattery) > 5) {
        s('line', { class: 'cross', x1: x(mb), x2: x(mb), y1: y(now.time), y2: bottom, 'pointer-events': 'none' }, g);
        s('circle', { class: 'dot', r: 6, cx: x(mb), cy: y(now.time), fill: cssVar(el, '--accent'), 'pointer-events': 'none' }, g);
        var anchorEnd = x(mb) > right - 130;
        s('text', { class: 'lbl', x: x(mb) + (anchorEnd ? -10 : 10), y: y(now.time) + 18, 'text-anchor': anchorEnd ? 'end' : 'start', 'pointer-events': 'none' }, g,
          fmt(mb) + ' g · ' + fmt(now.time, 1) + ' min');
      }
      /* read-outs */
      $('#en-batt-out').textContent = fmt(mb) + ' g';
      var k; for (k in inputs) outs[k].textContent = inputs[k].value + units[k];
      var margin = E.limit - now.mtow;
      readouts($('#en-readouts'), [
        { label: 'Take-off mass', value: fmt(now.mtow), unit: 'g', state: now.feasible ? 'ok' : 'bad',
          sub: now.feasible ? fmt(margin) + ' g under the cap' : fmt(-margin) + ' g over the cap' },
        { label: 'Thrust per motor', value: fmt(now.per), unit: 'gf', sub: fmt(now.throttle * 100) + '% throttle' },
        { label: 'Hover power', value: fmt(now.power), unit: 'W', sub: fmt(now.usable) + ' Wh usable' },
        { label: 'Hover time', value: fmt(now.time, 1), unit: 'min', state: !now.feasible ? 'bad' : now.time >= 20 ? 'ok' : 'warn',
          sub: now.time >= 20 ? 'Meets the 20 min target' : 'Below the 20 min target' }
      ]);
      $('#en-headline').textContent = fmt(mb) + ' g of battery gives ' + fmt(now.time, 1) + ' min at ' + fmt(now.mtow) + ' g take-off mass' +
        (now.feasible ? '.' : ', which breaks the 5 kg cap.') + ' Unconstrained peak: ' + fmt(peak.time, 1) + ' min near ' + fmt(peak.mb) + ' g.';
      dataTable(el, ['Battery mass (g)', 'Take-off mass (g)', 'Hover power (W)', 'Hover time (min)'],
        [700, 800, 900, 1000, 1100, 1200, 1240, 1300, 1400, 1500, 1700, 1900, 2100, 2300, 2500].map(function (v) {
          var r = enduranceAt(v, a); return [fmt(v), fmt(r.mtow), fmt(r.power), fmt(r.time, 2)];
        }));
    }
    var redraw = mount(holder, draw);
    slider.addEventListener('input', redraw);
    var k; for (k in inputs) inputs[k].addEventListener('input', redraw);
    $('#en-reset').addEventListener('click', function () {
      var key; for (key in inputs) inputs[key].value = defs[key];
      slider.value = E.selectedBattery; redraw();
    });
  }

  /* ---------------------------------------- 07 margins at design range */
  var GROUP = { rc: { cls: 2, name: 'RC control' }, fpv: { cls: 3, name: 'FPV video' }, relay: { cls: 1, name: 'Rover relay' } };
  function marginsChart() {
    var el = $('#chart-margins'); if (!el) return;
    var L = D.links;
    var rows = L.options.map(function (o) { return { o: o, m: linkAt(o, L.hop, false).margin }; }).sort(function (a, b) { return b.m - a.m; });
    el.appendChild(legend([{ key: 'k2', label: 'RC control' }, { key: 'k1', label: 'Rover relay' }, { key: 'k3', label: 'FPV video' }]));
    var holder = h('div'); el.appendChild(holder);
    dataTable(el, ['Link', 'Margin at ' + L.hop + ' km (dB)', 'Against 20 dB target'],
      rows.map(function (r) { return [r.o.name, fmt(r.m, 1), r.m >= L.marginTarget ? 'Meets' : 'Below']; }));
    mount(holder, function (w) {
      var labW = 92, left = labW, right = w - 60, top = 20, rowH = 34, bottom = top + rows.length * rowH, hgt = bottom + 26;
      var g = frame(holder, w, hgt, 'Link margin of each radio link at 1.2 kilometres against the 20 decibel target');
      var x = lin(0, 60, left, right);
      [0, 20, 40, 60].forEach(function (t) {
        s('line', { class: 'gridline', x1: x(t), x2: x(t), y1: top - 4, y2: bottom }, g);
        s('text', { x: x(t), y: bottom + 17, 'text-anchor': 'middle' }, g, t + ' dB');
      });
      rows.forEach(function (r, i) {
        var yy = top + i * rowH, grp = GROUP[r.o.group], bw = Math.max(2, x(r.m) - left), ok = r.m >= L.marginTarget;
        s('text', { class: 'lbl', x: left - 8, y: yy + 19, 'text-anchor': 'end' }, g, r.o.short);
        var bar = s('path', { class: 'seg-rect f' + grp.cls, d: roundRight(left, yy + 6, bw, 18, 4), tabindex: 0, role: 'img',
          'aria-label': r.o.name + ': ' + fmt(r.m, 1) + ' decibels margin, ' + (ok ? 'meets' : 'below') + ' the 20 decibel target' }, g);
        hover(bar, function () {
          return { title: r.o.name, rows: [{ color: cssVar(el, '--s' + grp.cls), value: fmt(r.m, 1) + ' dB', label: ok ? 'meets target' : 'below target' },
            { value: kmText(rangeFor(r.o, L.marginTarget, false)), label: 'range with 20 dB margin' }] };
        });
        var lx = ok ? x(r.m) + 7 : Math.max(x(r.m) + 7, x(L.marginTarget) + 8);
        s('text', { class: 'lbl-strong', x: lx, y: yy + 19 }, g, fmt(r.m, 1));
        if (!ok) s('text', { x: lx + 34, y: yy + 19 }, g, 'below target');
      });
      s('line', { class: 'thresh-accent', x1: x(L.marginTarget), x2: x(L.marginTarget), y1: 4, y2: bottom }, g);
      s('text', { class: 'lbl', x: x(L.marginTarget) + 6, y: 11 }, g, 'Target');
    });
  }

  /* ----------------------------------------- 07 link-budget explorer */
  
function linkExplorer() {
  var grid = $('#link-graphs-grid');
  var dist = $('#lk-dist');

  if (!grid || !dist) return;

  var L = D.links;
  var graphs = [];

  // Create a graph card for every radio link
  L.options.forEach(function (o) {
    var card = h('div', {
      class: 'card link-graph-card'
    });

    var title = h('h4', {
      text: o.name
    });

    var subtitle = h('p', {
      class: 'note',
      text: o.gear
    });

    var chart = h('div', {
      class: 'chart link-chart'
    });

    var readout = h('div', {
      class: 'link-graph-readout'
    });

    card.appendChild(title);
    card.appendChild(subtitle);
    card.appendChild(chart);
    card.appendChild(readout);

    grid.appendChild(card);

    graphs.push({
      option: o,
      chart: chart,
      readout: readout
    });
  });

  function drawGraph(item) {
    var o = item.option;
    var d = Number(dist.value);

    var w = Math.max(280, item.chart.clientWidth);
    var left = 50;
    var right = w - 20;
    var top = 25;
    var bottom = 245;

    var g = frame(
      item.chart,
      w,
      290,
      'Received power against range'
    );

    var x = logS(0.1, 100, left, right);
    var y = lin(-130, -40, bottom, top);

    axes(g, {
      x: x,
      y: y,
      xt: [0.1, 1, 10, 100],
      yt: [-130, -110, -90, -70, -50],
      left: left,
      right: right,
      top: top,
      bottom: bottom,
      xfmt: function (v) { return v + ' km'; },
      xlabel: 'Range (log scale)',
      ylabel: 'Power (dBm)'
    });

    var threshold = o.sens + L.marginTarget;

    // Receiver sensitivity line
    s('line', {
      class: 'thresh',
      x1: left,
      x2: right,
      y1: y(o.sens),
      y2: y(o.sens)
    }, g);

    // Minimum 20 dB margin line
    s('line', {
      class: 'thresh-accent',
      x1: left,
      x2: right,
      y1: y(threshold),
      y2: y(threshold)
    }, g);

    // Received power curve
    var points = [];

    for (var k = 0; k <= 100; k++) {
      var range = 0.1 * Math.pow(1000, k / 100);
      var result = linkAt(o, range, false);

      points.push([
        range,
        clamp(result.prx, -130, -40)
      ]);
    }

    var group = GROUP[o.group];

    s('path', {
      class: 'line c' + group.cls,
      d: 'M' + points.map(function (p) {
        return x(p[0]).toFixed(1) +
          ',' + y(p[1]).toFixed(1);
      }).join('L')
    }, g);

    // Current operating distance
    var result = linkAt(o, d, false);

    s('line', {
      class: 'cross',
      x1: x(d),
      x2: x(d),
      y1: top,
      y2: bottom
    }, g);

    s('circle', {
      class: 'dot f' + group.cls,
      r: 6,
      cx: x(d),
      cy: y(clamp(result.prx, -130, -40))
    }, g);

    var maxRange = rangeFor(
      o,
      L.marginTarget,
      false
    );

    item.readout.textContent =
      'Received: ' + fmt(result.prx, 1) + ' dBm' +
      ' | Margin: ' + fmt(result.margin, 1) + ' dB' +
      ' | 20 dB range: ' + fmt(maxRange, 2) + ' km';
  }

  function redraw() {
    var d = Number(dist.value);

    $('#lk-dist-out').textContent =
      d.toFixed(2) + ' km';

    graphs.forEach(function (item) {
      item.chart.textContent = '';
      drawGraph(item);
    });
  }

  dist.addEventListener('input', redraw);
  window.addEventListener('resize', redraw);

  redraw();
}


  /* --------------------------------------------------------- exports */
  window.MRT = {
    $: $, $$: $$, h: h, s: s, fmt: fmt, clamp: clamp, lin: lin, cssVar: cssVar, safe: safe,
    tip: tip, hover: hover, mount: mount, frame: frame, readouts: readouts, kmText: kmText,
    motorAt: motorAt, enduranceAt: enduranceAt, conceptTime: conceptTime, usableFraction: usableFraction,
    fspl: fspl, linkAt: linkAt, rangeFor: rangeFor
  };

  safe('thrust-loss bar', thrustLoss);
  safe('mass chart', massChart);
  safe('concept chart', conceptChart);
  safe('sizing tool', sizing);
  safe('motor chart', motorChart);
  safe('endurance explorer', enduranceExplorer);
  safe('margins chart', marginsChart);
  safe('link explorer', linkExplorer);
})();
