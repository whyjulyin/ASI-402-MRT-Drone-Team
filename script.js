/* =====================================================================
   script.js — page behaviour and data-driven content
   Navigation, tables, mission cards, test log, risk matrix, Gantt chart,
   team cards and appendices. Content comes from js/data.js.
   ===================================================================== */
(function () {
  'use strict';
  var D = window.DRONE, M = window.MRT;
  if (!D || !M) return;
  var $ = M.$, $$ = M.$$, h = M.h, fmt = M.fmt, safe = M.safe;

  /* -------------------------------------------------------- utilities */
  function tag(ev, text) {
    var e = D.evidence[ev] || { label: ev, hint: '' };
    return h('span', { class: 'tag tag-' + ev, title: e.hint, text: text || e.label });
  }
  function cell(v, isHead, cls) {
    var c = h(isHead ? 'th' : 'td', { class: cls || null, scope: isHead ? 'row' : null });
    if (v == null) v = '';
    if (typeof v === 'string' || typeof v === 'number') c.textContent = String(v); else c.appendChild(v);
    return c;
  }
  /* Simple table builder. opts: {num:[column indexes], rowClass:fn, head:false} */
  function table(el, cols, rows, opts) {
    if (!el) return;
    opts = opts || {};
    var num = opts.num || [];
    el.textContent = '';
    if (cols) {
      el.appendChild(h('thead', null, [h('tr', null, cols.map(function (c, i) {
        return h('th', { scope: 'col', text: c, class: num.indexOf(i) >= 0 ? 'num' : null });
      }))]));
    }
    el.appendChild(h('tbody', null, rows.map(function (r, ri) {
      var tr = h('tr', { class: opts.rowClass ? opts.rowClass(r, ri) : null });
      r.forEach(function (v, i) { tr.appendChild(cell(v, i === 0 && opts.head !== false, num.indexOf(i) >= 0 ? 'num' : null)); });
      return tr;
    })));
  }
  function dl(el, pairs) {
    if (!el) return;
    el.textContent = '';
    pairs.forEach(function (p) { el.appendChild(h('dt', { text: p[0] })); el.appendChild(h('dd', { text: p[1] })); });
  }
  function serialDate(n) { return new Date(Date.UTC(1899, 11, 30) + n * 86400000); }
  var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  function dateText(n) { var d = serialDate(n); return d.getUTCDate() + ' ' + MONTHS[d.getUTCMonth()] + ' ' + d.getUTCFullYear(); }
  function pad2(n) { return n < 10 ? '0' + n : String(n); }

  /* ------------------------------------------------------- navigation */
  function navigation() {
    var nav = $('#nav'), toggle = $('#nav-toggle'), bar = $('#progress-bar');
    var links = $$('a', nav), sections = links.map(function (a) { return $(a.getAttribute('href')); });
    toggle.addEventListener('click', function () {
      var open = nav.classList.toggle('open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    links.forEach(function (a) { a.addEventListener('click', function () { nav.classList.remove('open'); toggle.setAttribute('aria-expanded', 'false'); }); });
    var ticking = false;
    function update() {
      ticking = false;
      var doc = document.documentElement, max = doc.scrollHeight - window.innerHeight;
      bar.style.width = (max > 0 ? Math.min(100, window.scrollY / max * 100) : 0) + '%';
      var probe = window.scrollY + window.innerHeight * 0.32, current = -1;
      sections.forEach(function (sec, i) { if (sec && sec.offsetTop <= probe) current = i; });
      links.forEach(function (a, i) {
        var on = i === current;
        if (a.classList.contains('on') !== on) {
          a.classList.toggle('on', on);
          if (on) { a.setAttribute('aria-current', 'true'); } else a.removeAttribute('aria-current');
        }
      });
    }
    function onScroll() { if (!ticking) { ticking = true; requestAnimationFrame(update); } }
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    update();
    /* open an appendix panel when it is the link target */
    function openTarget() {
      var id = location.hash.slice(1); if (!id) return;
      var t = document.getElementById(id);
      if (t && t.tagName === 'DETAILS') t.open = true;
    }
    window.addEventListener('hashchange', openTarget);
    openTarget();
  }

  /* ------------------------------------------------------------- hero */
  function kpis() {
    var el = $('#kpis'); if (!el) return;
    D.headline.forEach(function (k) {
      el.appendChild(h('div', { class: 'kpi' }, [
        h('span', { class: 'kpi-val' }, [k.value, h('small', { text: k.unit })]),
        h('span', { class: 'kpi-label', text: k.label }),
        h('span', { class: 'kpi-note', text: k.note }),
        tag(k.ev)
      ]));
    });
  }

  /* ---------------------------------------------------------- mission */
  
function missions() {
  var grid = $('#mission-grid');
  if (!grid) return;

  D.missions.forEach(function (m) {
    var card = h('article', {
      class: 'card mission-static' + (m.drone ? '' : ' mission-disabled')
    });

    card.appendChild(h('span', {
      class: 'pts',
      text: m.points + ' points'
    }));

    card.appendChild(h('h4', {
      text: m.name + ' Mission'
    }));

    card.appendChild(h('span', {
      class: 'mission-status',
      text: m.drone ? 'Drone Permitted' : 'No Drone'
    }));

    card.appendChild(h('p', {
      class: 'rover',
      text: m.rover
    }));

    if (m.drone) {
      card.appendChild(
        h('ul', { class: 'roles' },
          m.roles.map(function (r) {
            return h('li', null, [
              h('b', { text: r[0] }),
              h('span', { text: r[1] })
            ]);
          })
        )
      );
    } else {
      card.appendChild(h('p', {
        class: 'no-drone',
        text: 'Drone use is not allowed in this mission.'
      }));
    }

    grid.appendChild(card);
  });
}

  function requirements() {
    var el = $('#req-cards'); if (!el) return;
    D.requirements.forEach(function (grp) {
      var list = h('dl', { class: 'spec' });
      dl(list, grp.items);
      el.appendChild(h('article', { class: 'card req' }, [h('h4', { text: grp.group }), list]));
    });
    table($('#targets-table'), ['Design target', 'Requirement', 'Current estimate', 'Evidence', 'Status'],
      D.targets.map(function (t) {
        var now = h('span', null, [h('strong', { text: t.now }), h('br'), h('small', { text: t.basis })]);
        return [t.goal, t.target, now, tag(t.ev), h('span', { class: 'status' + (t.ok ? '' : ' gap'), text: t.ok ? 'On track' : 'Gap' })];
      }));
  }

  /* ------------------------------------------------------- background */
  function lessons() {
    var el = $('#lessons'); if (!el) return;
    D.predecessor.lessons.forEach(function (l, i) {
      el.appendChild(h('article', { class: 'lesson' }, [
        h('span', { class: 'lesson-n', text: pad2(i + 1) }),
        h('h4', { text: l.issue }),
        h('p', null, [h('span', { class: 'k', text: 'Found' }), l.found]),
        h('p', { class: 'response' }, [h('span', { class: 'k', text: 'Our response' }), l.response, ' ', h('a', { class: 'more', href: l.link, text: 'See how' })])
      ]));
    });
  }

  /* ---------------------------------------------------------- concept */
  
function methodology() {
  var grid = $('#method-grid');
  if (!grid) return;

  D.methodology.forEach(function (m, i) {
    var card = h('article', {
      class: 'card method-static'
    });

    card.appendChild(h('span', {
      class: 'big-n',
      text: pad2(i + 1)
    }));

    card.appendChild(h('h4', {
      text: m.step
    }));

    card.appendChild(h('p', {
      class: 'method-subtitle',
      text: m.sub
    }));

    card.appendChild(h('p', {
      text: m.text
    }));

    if (m.loop) {
      card.appendChild(h('p', {
        class: 'loop',
        text: m.loop
      }));
    }

    grid.appendChild(card);
  });
}


  /* ------------------------------------------------------- propulsion */
  function propulsionTables() {
    var mt = $('#motor-table');
    if (mt) {
      mt.appendChild(h('thead', null, [h('tr', null, [h('th', { text: 'At 1,250 gf hover' }), h('th', { text: D.motors.cols[0] }), h('th', { class: 'sel', text: D.motors.cols[1] + ' · selected' })])]));
      mt.appendChild(h('tbody', null, D.motors.rows.map(function (r) {
        return h('tr', null, [h('th', { scope: 'row', text: r[0] }), h('td', { text: r[1] }), h('td', { class: 'sel', text: r[2] })]);
      })));
    }
    var gains = $('#motor-gains');
    if (gains) D.motors.gains.forEach(function (g) { gains.appendChild(h('div', { class: 'gain' }, [h('b', { text: g.value }), h('span', { text: g.label })])); });
    table($('#prop-table'), ['Propeller', 'Hover power', 'Hover throttle', 'Max tested thrust'],
      D.props.map(function (p) { return [p.size + (p.selected ? ' · selected' : ''), fmt(p.power, 1) + ' W', fmt(p.throttle, 1) + '%', fmt(p.max) + ' gf']; }),
      { num: [1, 2, 3], rowClass: function (r, i) { return D.props[i].selected ? 'sel' : null; } });
    dl($('#battery-spec'), D.battery);
    dl($('#frame-facts'), D.frame);
  }

  /* ------------------------------------------------------- electrical */
  function electrical() {
    table($('#gauge-table'), ['Gauge', 'Used for'], D.wiring.gauges.map(function (g) {
      return [h('span', { class: 'mono' }, [h('i', { class: 'kind kind-' + g[2] }), g[0]]), g[1]];
    }));
    var pre = $('#prefix-list');
    if (pre) D.wiring.prefixes.forEach(function (p) { pre.appendChild(h('li', { class: 'chip' }, [h('b', { text: p[0] + 'xx' }), p[1]])); });
    table($('#port-table'), ['Pixhawk port', 'Connects to', 'Carries'], D.ports.map(function (p) {
      return [h('span', { class: 'mono' }, [h('i', { class: 'kind kind-' + p[3] }), p[0]]), p[1], p[2]];
    }));
    var st = $('#software-stack');
    if (st) D.software.forEach(function (x) {
      st.appendChild(h('li', { class: 'stack-item' + (x.core ? ' core' : '') }, [
        h('span', { class: 'dev', text: x.device }), h('span', { class: 'runs', text: x.runs }),
        h('span', { class: 'does', text: x.does }), x.via ? h('span', { class: 'via', text: x.via }) : null
      ]));
    });
    var ck = $('#power-checks');
    if (ck) D.wiring.checks.forEach(function (c) { ck.appendChild(h('li', { text: c })); });
  }

  /* ------------------------------------------------------------ comms */
  function commsTables() {
    table($('#link-table'), ['Link', 'Band', 'Hardware', 'Purpose'], D.links.table);
    var L = D.links;
    table($('#link-inputs'), ['Link', 'Frequency (MHz)', 'TX power (dBm)', 'TX gain (dBi)', 'RX gain (dBi)', 'Sensitivity (dBm)', 'Path loss (dB)', 'Received (dBm)', 'Margin (dB)', '20 dB range'],
      L.options.map(function (o) {
        var r = M.linkAt(o, L.hop, false);
        return [o.name, fmt(o.f), o.ptx, o.gtx === 0 ? 'in TX power' : o.gtx, o.grx, o.sens, fmt(r.fspl, 1), fmt(r.prx, 1), fmt(r.margin, 1), M.kmText(M.rangeFor(o, L.marginTarget, false))];
      }), { num: [1, 2, 3, 4, 5, 6, 7, 8, 9] });
    var rc = {}; L.options.forEach(function (o) { rc[o.id] = o; });
    table($('#cable-table'), ['Band', 'LMR400 attenuation', 'Loss over 20 m', 'Control margin after cable'],
      [[D.cableLoss[0], rc.rc900], [D.cableLoss[1], rc.rc24]].map(function (p) {
        return [p[0].band, fmt(p[0].alpha, 1) + ' dB per 100 m', fmt(p[0].loss, 2) + ' dB', fmt(M.linkAt(p[1], L.hop, true).margin, 1) + ' dB'];
      }), { num: [1, 2, 3] });
  }

  /* ---------------------------------------------------------- testing */
  function testing() {
    var pipe = $('#pipeline');
    if (pipe) D.progress.forEach(function (p) {
      pipe.appendChild(h('li', { class: 'stage ' + p.state }, [
        h('span', { class: 'stage-state', text: p.state === 'done' ? 'Complete' : 'Up next' }),
        h('h4', { text: p.stage }),
        h('ul', null, p.items.map(function (t) { return h('li', { text: t }); }))
      ]));
    });
    table($('#validation-table'), ['What', 'How', 'Status'], D.validation.map(function (v) { return [v[0], v[1], tag(v[2])]; }));

    var tabs = $('#ping-tabs'), term = $('#ping-terminal'), cap = $('#ping-caption');
    if (!tabs) return;
    var order = ['router', 'extender'], cur = 'router', token = 0;
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    order.forEach(function (k) {
      tabs.appendChild(h('button', { type: 'button', role: 'tab', 'data-k': k, text: D.ping[k].title, onclick: function () { cur = k; render(true); } }));
    });
    function lineNode(t) {
      var cls = t.charAt(0) === '>' ? 'cmd' : /^Reply|Lost = 0/.test(t.trim()) ? 'ok' : /timed out|100% loss/.test(t) ? 'bad' : null;
      return h('span', { class: cls, text: t + '\n' });
    }
    function render(animate) {
      var p = D.ping[cur], mine = ++token;
      $$('button', tabs).forEach(function (b) { var on = b.getAttribute('data-k') === cur; b.classList.toggle('on', on); b.setAttribute('aria-selected', on ? 'true' : 'false'); });
      term.textContent = '';
      term.setAttribute('aria-label', p.title + ' ping log: ' + p.verdict);
      cap.textContent = '';
      cap.appendChild(h('span', { class: 'verdict' + (p.ok ? '' : ' fail'), text: p.verdict }));
      cap.appendChild(document.createTextNode(p.ok ? 'All four packets returned, in 2–30 ms.' : 'No packets returned.'));
      if (!animate || reduce) { p.lines.forEach(function (t) { term.appendChild(lineNode(t)); }); return; }
      var i = 0;
      (function step() {
        if (mine !== token || i >= p.lines.length) return;
        term.appendChild(lineNode(p.lines[i++]));
        setTimeout(step, 110);
      })();
    }
    render(false);
  }

  /* ------------------------------------------------------------- plan */
  function margins() {
    var el = $('#margin-chips'); if (!el) return;
    D.margins.forEach(function (m) { el.appendChild(h('li', { class: 'chip' }, [h('b', { text: m[1] }), m[0]])); });
  }
  function risks() {
    var mx = $('#risk-matrix'), list = $('#risk-list'); if (!mx) return;
    var ax = D.riskAxes, state = 'before', sel = 1;
    function render() {
      mx.textContent = '';
      for (var li = ax.likelihood.length - 1; li >= 0; li--) {
        mx.appendChild(h('div', { class: 'ax', text: ax.likelihood[li] }));
        ax.severity.forEach(function (sv) {
          var here = D.risks.filter(function (r) { return r[state].l === ax.likelihood[li] && r[state].s === sv; });
          var c = h('div', { class: 'cell' + (here.length ? ' lv-' + here[0][state].level : '') });
          here.forEach(function (r) {
            c.appendChild(h('button', { type: 'button', class: 'marker' + (r.id === sel ? ' on' : ''), text: String(r.id),
              'aria-label': 'Hazard ' + r.id + ': ' + r.hazard + ', ' + r[state].level + ' risk', onclick: function () { sel = r.id; render(); } }));
          });
          if (here.length) c.appendChild(h('small', { text: here[0][state].level }));
          mx.appendChild(c);
        });
      }
      mx.appendChild(h('div', { class: 'ax', text: '' }));
      ax.severity.forEach(function (sv) { mx.appendChild(h('div', { class: 'ax col', text: sv })); });
      mx.appendChild(h('div', { class: 'matrix-cap', text: 'Likelihood (rows) × severity (columns)' }));

      list.textContent = '';
      D.risks.forEach(function (r) {
        list.appendChild(h('button', { type: 'button', class: 'risk-item' + (r.id === sel ? ' on' : ''), 'aria-pressed': r.id === sel ? 'true' : 'false',
          onclick: function () { sel = r.id; render(); } }, [
          h('span', { class: 'marker' + (r.id === sel ? ' on' : ''), text: String(r.id) }),
          h('h4', { text: r.hazard }),
          h('p', { text: r.cause }),
          h('div', { class: 'levels' }, [
            h('span', { class: 'level lv-' + r.before.level, text: r.before.level + ' · ' + r.before.l + ' × ' + r.before.s }),
            h('span', { text: '→' }),
            h('span', { class: 'level lv-' + r.after.level, text: r.after.level + ' · ' + r.after.l + ' × ' + r.after.s })
          ]),
          h('p', null, [h('strong', { text: 'Mitigation: ' }), r.action])
        ]));
      });
    }
    $$('#risk-toggle button').forEach(function (b) {
      b.addEventListener('click', function () {
        state = b.getAttribute('data-state');
        $$('#risk-toggle button').forEach(function (x) { x.classList.toggle('on', x === b); x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
        render();
      });
    });
    render();
  }
  function phases() {
    var el = $('#phase-list'); if (!el) return;
    var label = { done: 'Done', active: 'In progress', next: 'Planned' };
    D.phases.forEach(function (p) {
      el.appendChild(h('li', { class: 'phase ' + p.state }, [
        h('span', { class: 'phase-n', text: 'Phase ' + p.n }),
        h('h4', { text: p.name }), h('span', { class: 'when', text: p.when }),
        h('span', { class: 'state', text: label[p.state] }), h('p', { text: p.text })
      ]));
    });
  }
  function gantt() {
    var el = $('#gantt'), filters = $('#gantt-filters'); if (!el) return;
    var G = D.gantt, groups = [['all', 'All tasks'], ['Design', 'Design'], ['Build', 'Build'], ['Comms', 'Comms'], ['Testing', 'Testing'], ['Milestone', 'Milestones']];
    var cur = 'all';
    /* week labels as used in the team workbook */
    var sem = ['1', '2', '3', '4', '5', '6', 'recess', '7', '8', '9', '10', '11', '12', '13', 'reading week', 'exam week 1', 'exam week 2'];
    var brk = ['1', '2', '3', '4', '5'];
    var weekNames = [];
    G.bands.forEach(function (b) { (b[1] === 17 ? sem : brk).forEach(function (w) { weekNames.push(b[0] + ', ' + (/^\d+$/.test(w) ? 'week ' + w : w)); }); });
    function weekOf(serial) { return M.clamp(Math.floor((serial - G.origin) / 7), 0, G.weeks - 1); }
    groups.forEach(function (g, i) {
      filters.appendChild(h('button', { type: 'button', 'data-g': g[0], class: i ? '' : 'on', text: g[1], 'aria-pressed': i ? 'false' : 'true',
        onclick: function () { cur = g[0]; render(); } }));
    });
    function render() {
      $$('button', filters).forEach(function (b) { var on = b.getAttribute('data-g') === cur; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on ? 'true' : 'false'); });
      el.textContent = '';
      var bands = h('div', { class: 'g-bands' });
      G.bands.forEach(function (b) { var d = h('div', { class: 'g-band', text: b[0] }); d.style.width = 'calc(' + b[1] + ' * var(--wk))'; bands.appendChild(d); });
      el.appendChild(h('div', { class: 'g-head' }, [h('div', { class: 'g-band', text: 'Task' }), bands]));
      var body = h('div', { class: 'g-body' });
      G.tasks.forEach(function (t) {
        var section = t[1] === 'Planning' ? 'Design' : t[1];
        if (cur !== 'all' && section !== cur) return;
        var start = (t[4] - G.origin) / 7, len = (t[5] - t[4] + 1) / 7, isMs = t[1] === 'Milestone' && t[5] - t[4] < 7;
        var when = t[4] === t[5] ? dateText(t[4]) : dateText(t[4]) + ' – ' + dateText(t[5]);
        var status = t[6] >= 1 ? 'Complete' : t[6] > 0 ? Math.round(t[6] * 100) + '% complete' : 'Planned';
        var mark;
        if (isMs) {
          mark = h('button', { type: 'button', class: 'g-ms' + (t[6] >= 1 ? ' done' : ''), 'aria-label': t[2] + ', milestone, ' + when + ', ' + status });
          mark.style.left = 'calc(' + (start + len / 2).toFixed(3) + ' * var(--wk))';
        } else {
          mark = h('button', { type: 'button', class: 'g-bar', 'aria-label': t[2] + ', ' + when + ', ' + status }, [h('span')]);
          mark.style.left = 'calc(' + start.toFixed(3) + ' * var(--wk))';
          mark.style.width = 'calc(' + len.toFixed(3) + ' * var(--wk))';
          mark.firstChild.style.width = Math.round(t[6] * 100) + '%';
        }
        M.hover(mark, function () {
          return { title: t[2], rows: [{ value: status, label: t[3] }, { value: when, label: '' }, { value: weekNames[weekOf(t[4])], label: '' }] };
        });
        body.appendChild(h('div', { class: 'g-row' }, [
          h('div', { class: 'g-lab' }, [h('i', { text: String(t[0]) }), h('span', { text: t[2], title: t[2] })]),
          h('div', { class: 'g-lane' }, [mark])
        ]));
      });
      var today = h('div', { class: 'g-today' }, [h('span', { text: 'Report date' })]);
      today.style.left = 'calc(var(--lab) + ' + ((G.reportDate - G.origin) / 7).toFixed(3) + ' * var(--wk))';
      body.appendChild(today);
      el.appendChild(body);
    }
    render();
    var fig = el.parentNode.parentNode;
    fig.insertBefore(h('div', { class: 'g-key' }, [
      h('span', null, [h('i', { class: 'kb' }), 'Completed']), h('span', null, [h('i', { class: 'kp' }), 'Planned']),
      h('span', null, [h('i', { class: 'km2' }), 'Milestone'])
    ]), fig.querySelector('figcaption'));
  }

  /* ------------------------------------------------------------- team */
  function team() {
    var el = $('#team-cards'); if (!el) return;
    var names = { concept: '03 Concept', propulsion: '04 Propulsion', airframe: '05 Airframe', electrical: '06 Electrical', comms: '07 Comms', testing: '08 Testing' };
    D.team.forEach(function (m) {
      var initials = m.short.charAt(0);
      var av = h('div', { class: 'avatar' }, [m.photo ? h('img', { src: m.photo, alt: 'Portrait of ' + m.short, width: 78, height: 78, loading: 'lazy' }) : initials]);
      el.appendChild(h('article', { class: 'member' }, [
        av, h('h3', { text: m.name }), h('p', { class: 'role', text: m.role }), h('p', { class: 'track-l', text: m.track }),
        h('ul', null, m.work.map(function (w) { return h('li', { text: w }); })),
        h('div', { class: 'jump' }, m.sections.map(function (s) { return h('a', { href: '#' + s, text: names[s] }); }))
      ]));
    });
    var wt = $('#workstream-table'), W = D.workstreams;
    if (wt) {
      wt.appendChild(h('thead', null, [h('tr', null, [h('th', { text: 'Member' })].concat(W.phases.map(function (p) { return h('th', { scope: 'col', text: p }); })))]));
      wt.appendChild(h('tbody', null, W.rows.map(function (r) {
        var tr = h('tr', null, [h('th', { scope: 'row', text: r[0] })]);
        for (var i = 1; i < r.length; i++) {
          var span = 1;
          while (i + span < r.length && r[i + span] === r[i]) span++;
          tr.appendChild(h('td', { text: r[i], colspan: span > 1 ? span : null, class: span > 1 ? 'span' : null }));
          i += span - 1;
        }
        return tr;
      })));
    }
    var sub = $('#subsystems');
    if (sub) D.subsystems.forEach(function (s) { sub.appendChild(h('li', { class: s[0] === 'Drone' ? 'ours' : null }, [h('b', { text: s[0] }), s[1]])); });
  }

  /* -------------------------------------------------------- appendices */
  function appendix() {
    var bomEl = $('#bom-table'), filters = $('#bom-filters');
    if (bomEl) {
      var groups = ['All'], cur = 'All', nominal = 0;
      D.bom.forEach(function (r) { if (groups.indexOf(r[0]) < 0) groups.push(r[0]); nominal += r[3] * r[4]; });
      var design = nominal * (1 + D.bomGrowth);
      groups.forEach(function (g, i) {
        filters.appendChild(h('button', { type: 'button', 'data-g': g, class: i ? '' : 'on', text: g, 'aria-pressed': i ? 'false' : 'true', onclick: function () { cur = g; render(); } }));
      });
      var render = function () {
        $$('button', filters).forEach(function (b) { var on = b.getAttribute('data-g') === cur; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on ? 'true' : 'false'); });
        bomEl.textContent = '';
        bomEl.appendChild(h('thead', null, [h('tr', null, ['Item', 'Part', 'Qty', 'Unit (g)', 'Subtotal (g)', 'Share of take-off mass', 'Mean / peak (W)'].map(function (c, i) {
          return h('th', { scope: 'col', text: c, class: i >= 2 && i <= 4 ? 'num' : null });
        }))]));
        var tb = h('tbody'), last = null, sub = 0;
        D.bom.forEach(function (r) {
          if (cur !== 'All' && r[0] !== cur) return;
          if (r[0] !== last) { last = r[0]; tb.appendChild(h('tr', { class: 'group' }, [h('th', { colspan: 7, text: r[0] })])); }
          var st = r[3] * r[4], share = st / design * 100; sub += st;
          var bar = h('span', { class: 'bar' }); bar.style.width = Math.max(1, share * 3).toFixed(1) + '%';
          tb.appendChild(h('tr', null, [
            cell(r[1], true), cell(r[2]), cell(r[3], false, 'num'), cell(fmt(r[4], r[4] % 1 ? 1 : 0), false, 'num'), cell(fmt(st, st % 1 ? 1 : 0), false, 'num'),
            cell(h('span', null, [fmt(share, 1) + '%', bar])), cell(r[5] == null ? '–' : r[5] + ' / ' + r[6])
          ]));
        });
        if (cur === 'All') {
          tb.appendChild(h('tr', { class: 'total' }, [cell('Nominal total', true), cell(''), cell(''), cell(''), cell(fmt(nominal, 1), false, 'num'), cell(''), cell('')]));
          tb.appendChild(h('tr', null, [cell('Growth allowance, 5%', true), cell('Wiring, fasteners, mounts'), cell(''), cell(''), cell(fmt(design - nominal, 1), false, 'num'), cell(''), cell('')]));
          tb.appendChild(h('tr', { class: 'total' }, [cell('Design take-off mass', true), cell('URC limit 5,000 g'), cell(''), cell(''), cell(fmt(design, 1), false, 'num'), cell('100%'), cell('')]));
        } else {
          tb.appendChild(h('tr', { class: 'total' }, [cell(cur + ' subtotal', true), cell(''), cell(''), cell(''), cell(fmt(sub, 1), false, 'num'), cell(fmt(sub / design * 100, 1) + '%'), cell('')]));
        }
        bomEl.appendChild(tb);
      };
      render();
    }
    dl($('#ground-list'), D.ground);

    var fc = $('#fc-table');
    if (fc) table(fc, D.fc.cols, D.fc.rows.map(function (r) { return [r[0] + (r[10] ? ' · selected' : '')].concat(r.slice(1, 10)); }),
      { num: [2, 3, 4, 5, 6, 7, 8], rowClass: function (r, i) { return D.fc.rows[i][10] ? 'sel' : null; } });

    table($('#motor-data'), ['Throttle (%)', 'Thrust (gf)', 'Current (A)', 'Input power (W)', 'Test voltage (V)', 'Efficiency (gf/W)'],
      D.motorTest.map(function (r) { return [fmt(r[0] * 100), fmt(r[1]), fmt(r[2], 2), fmt(r[3], 1), fmt(r[4], 2), fmt(r[1] / r[3], 2)]; }),
      { num: [0, 1, 2, 3, 4, 5], head: false });

    var ab = $('#abbr-list'), search = $('#abbr-search');
    if (ab) {
      var renderAbbr = function () {
        var q = (search.value || '').trim().toLowerCase();
        ab.textContent = '';
        D.abbreviations.forEach(function (a) {
          if (q && (a[0] + ' ' + a[1]).toLowerCase().indexOf(q) < 0) return;
          ab.appendChild(h('div', null, [h('dt', { text: a[0] }), h('dd', { text: a[1] })]));
        });
      };
      search.addEventListener('input', renderAbbr);
      renderAbbr();
    }
    var refs = $('#ref-list');
    if (refs) D.references.forEach(function (r) {
      var body = h('span', null, [r[0] + '. ' + r[1] + '. ']);
      if (r[2]) body.appendChild(h('a', { href: r[2], target: '_blank', rel: 'noopener', text: r[2].replace(/^https?:\/\//, '') }));
      refs.appendChild(h('li', null, [body]));
    });
  }

  /* -------------------------------------------------- reveal on scroll */
  function reveal() {
    if (!('IntersectionObserver' in window)) return;
    var nodes = $$('.sec-head, .band .card, .band .figure, .band .table-wrap, .lesson, .member, .stage, .phase, .findings li, .track');
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -6% 0px', threshold: 0.04 });
    nodes.forEach(function (n) {
      if (n.closest('details') || n.closest('.figure .table-wrap')) return;
      n.classList.add('reveal'); io.observe(n);
    });
  }

  /* ------------------------------------------------------ word counter
     Type siteWordCount() in the browser console to check the report
     against the CDE4301 limit (6,000 words for four members, appendices
     excluded). Data tables under charts are treated as figures.            */
  window.siteWordCount = function () {
    var re = /[A-Za-z0-9][A-Za-z0-9'’.,/×%°:+-]*/g;
    function count(text) { return (String(text).match(re) || []).length; }
    var out = {}, total = 0;
    $$('main > section').forEach(function (sec) {
      if (sec.id === 'appendix') return;
      var c = sec.cloneNode(true);
      $$('details.chart-data, script, style', c).forEach(function (n) { n.parentNode.removeChild(n); });
      var n = count(c.textContent);
      out[sec.id || 'hero'] = n; total += n;
    });
    /* text that only appears after interaction */
    var all = 0, shown = 0;
    D.missions.forEach(function (m) { all += count(m.rover + ' ' + m.roles.map(function (r) { return r.join(' '); }).join(' ')); });
    D.methodology.forEach(function (m) { all += count(m.text + ' ' + (m.loop || '')); });
    Object.keys(D.anatomy.notes).forEach(function (k) { all += count(D.anatomy.notes[k].title + ' ' + D.anatomy.notes[k].text); });
    D.arch.blocks.forEach(function (b) { all += count(b.title + ' ' + b.sub + ' ' + b.inside.join(' ') + ' ' + b.why.join(' ')); });
    D.links.options.forEach(function (o) { all += count(o.note); });
    ['#mission-panel', '#method-panel', '#anatomy-note', '#arch-panel', '#lk-note'].forEach(function (s) { var n = $(s); if (n) shown += count(n.textContent); });
    out['(main body as shown)'] = total;
    out['(all interactive states)'] = total + Math.max(0, all - shown);
    if (window.console && console.table) console.table(out);
    return out;
  };

  safe('navigation', navigation);
  safe('hero figures', kpis);
  safe('missions', missions);
  safe('requirements', requirements);
  safe('lessons', lessons);
  safe('methodology', methodology);
  safe('propulsion tables', propulsionTables);
  safe('electrical tables', electrical);
  safe('comms tables', commsTables);
  safe('testing', testing);
  safe('margins', margins);
  safe('risks', risks);
  safe('phases', phases);
  safe('gantt', gantt);
  safe('team', team);
  safe('appendix', appendix);
  safe('reveal', reveal);
})();
