/* Chart runtime for the comment-ratio report. Inlined into the generated page. */
(function () {
  'use strict';

  var SVG_NS = 'http://www.w3.org/2000/svg';
  var MONTHS = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];

  function pct(value, digits) {
    if (value === null || value === undefined) return '—';
    return (value * 100).toFixed(digits === undefined ? 1 : digits) + '%';
  }

  function int(value) {
    return value.toLocaleString('en-US');
  }

  function monthLabel(ms) {
    var d = new Date(ms);
    return MONTHS[d.getUTCMonth()] + ' ' + String(d.getUTCFullYear()).slice(2);
  }

  function dayTick(ms) {
    var d = new Date(ms);
    return d.getUTCDate() + ' ' + MONTHS[d.getUTCMonth()];
  }

  function el(name, attrs, children) {
    var node = document.createElementNS(SVG_NS, name);
    for (var key in attrs) {
      if (attrs[key] !== null && attrs[key] !== undefined)
        node.setAttribute(key, attrs[key]);
    }
    (children || []).forEach(function (child) {
      node.appendChild(child);
    });
    return node;
  }

  function text(content, attrs) {
    var node = el('text', attrs);
    node.textContent = content;
    return node;
  }

  /** Nice round tick step for a 0..max axis. */
  function ticks(max, count) {
    var raw = max / count;
    var magnitude = Math.pow(10, Math.floor(Math.log(raw) / Math.LN10));
    var step = [1, 2, 2.5, 5, 10].reduce(function (best, multiple) {
      var candidate = multiple * magnitude;
      return candidate >= raw && (best === null || candidate < best)
        ? candidate
        : best;
    }, null);
    var out = [];
    for (var value = 0; value <= max + step / 2; value += step) out.push(value);
    return out;
  }

  function tooltipFor(container) {
    var node = document.createElement('div');
    node.className = 'tooltip';
    container.appendChild(node);
    return node;
  }

  function place(tip, container, x, y) {
    var width = tip.offsetWidth;
    var left = Math.max(
      4,
      Math.min(container.clientWidth - width - 4, x - width / 2),
    );
    tip.style.left = left + 'px';
    tip.style.top = Math.max(4, y) + 'px';
  }

  // ---------------------------------------------------------------- line chart

  function lineChart(container, config) {
    var W = 900;
    var H = 372;
    var m = {
      top: config.annotations && config.annotations.length ? 58 : 24,
      right: 116,
      bottom: 40,
      left: 54,
    };
    var plotW = W - m.left - m.right;
    var plotH = H - m.top - m.bottom;

    var all = [];
    config.series.forEach(function (s) {
      s.points.forEach(function (p) {
        if (p[1] !== null) all.push(p[1]);
      });
    });
    var yMax = config.yMax || Math.max.apply(null, all) * 1.12;
    var t0 = config.tMin;
    var t1 = config.tMax;

    var x = function (t) {
      return m.left + ((t - t0) / (t1 - t0)) * plotW;
    };
    var y = function (v) {
      return m.top + plotH - (v / yMax) * plotH;
    };

    var svg = el('svg', {
      viewBox: '0 0 ' + W + ' ' + H,
      role: 'img',
      'aria-label': config.ariaLabel,
    });

    // Horizontal grid + y axis labels
    ticks(yMax, 5).forEach(function (value) {
      svg.appendChild(
        el('line', {
          x1: m.left,
          x2: m.left + plotW,
          y1: y(value),
          y2: y(value),
          stroke: 'var(--grid)',
          'stroke-width': 1,
        }),
      );
      svg.appendChild(
        text(config.yTick ? config.yTick(value) : pct(value, 0), {
          x: m.left - 10,
          y: y(value) + 4,
          fill: 'var(--text-muted)',
          'font-size': 11.5,
          'text-anchor': 'end',
          'font-variant-numeric': 'tabular-nums',
        }),
      );
    });

    // X axis ticks, one per month point of the first series. Two snapshots can
    // fall in the same month (the 1st, and the head commit), so a label is only
    // drawn when it differs from the previous one.
    var lastLabel = null;
    var lastLabelX = -Infinity;
    config.series[0].points.forEach(function (p) {
      if (monthLabel(p[0]) === lastLabel) return;
      // Two samples a fortnight apart sit close enough for their labels to
      // collide, so a new one is only drawn once there is room for it.
      if (x(p[0]) - lastLabelX < 44) return;
      lastLabel = monthLabel(p[0]);
      lastLabelX = x(p[0]);
      svg.appendChild(
        text(monthLabel(p[0]), {
          x: x(p[0]),
          y: m.top + plotH + 20,
          fill: 'var(--text-muted)',
          'font-size': 11.5,
          'text-anchor': 'middle',
        }),
      );
    });
    svg.appendChild(
      el('line', {
        x1: m.left,
        x2: m.left + plotW,
        y1: m.top + plotH,
        y2: m.top + plotH,
        stroke: 'var(--axis)',
        'stroke-width': 1,
      }),
    );

    // Model-release reference lines, labelled in two staggered rows so that
    // two releases a few weeks apart do not overprint each other.
    (config.annotations || []).forEach(function (a, i) {
      if (a.t < t0 || a.t > t1) return;
      var ax = x(a.t);
      svg.appendChild(
        el('line', {
          x1: ax,
          x2: ax,
          y1: m.top - 6,
          y2: m.top + plotH,
          stroke: 'var(--annotation)',
          'stroke-width': 1,
          'stroke-dasharray': '3 4',
          opacity: 0.85,
        }),
      );
      svg.appendChild(
        text(a.label, {
          x: Math.max(m.left + 2, Math.min(m.left + plotW - 2, ax)),
          y: m.top - 34 + (i % 2 === 0 ? 0 : 16),
          fill: 'var(--text-secondary)',
          'font-size': 11.5,
          'font-weight': 500,
          'text-anchor': 'middle',
        }),
      );
    });

    // Series
    config.series.forEach(function (s) {
      var d = '';
      s.points.forEach(function (p) {
        if (p[1] === null) return;
        d +=
          (d ? 'L' : 'M') + x(p[0]).toFixed(2) + ' ' + y(p[1]).toFixed(2) + ' ';
      });
      svg.appendChild(
        el('path', {
          d: d,
          fill: 'none',
          stroke: s.color,
          'stroke-width': 2,
          'stroke-linejoin': 'round',
          'stroke-linecap': 'round',
        }),
      );
      s.points.forEach(function (p) {
        if (p[1] === null) return;
        svg.appendChild(
          el('circle', {
            cx: x(p[0]),
            cy: y(p[1]),
            r: 4,
            fill: s.color,
            stroke: 'var(--surface-1)',
            'stroke-width': 2,
          }),
        );
      });
      // Direct label at the series end, so identity never rests on colour alone.
      var last = s.points
        .filter(function (p) {
          return p[1] !== null;
        })
        .pop();
      if (last) {
        svg.appendChild(
          text(s.name, {
            x: m.left + plotW + 10,
            y: y(last[1]) + 1,
            fill: 'var(--text-secondary)',
            'font-size': 12,
          }),
        );
        svg.appendChild(
          text(config.yTick ? config.yTick(last[1]) : pct(last[1]), {
            x: m.left + plotW + 10,
            y: y(last[1]) + 15,
            fill: 'var(--text-primary)',
            'font-size': 12,
            'font-weight': 600,
          }),
        );
      }
    });

    var crosshair = el('line', {
      x1: 0,
      x2: 0,
      y1: m.top,
      y2: m.top + plotH,
      stroke: 'var(--axis)',
      'stroke-width': 1,
      opacity: 0,
    });
    svg.appendChild(crosshair);

    var overlay = el('rect', {
      x: m.left,
      y: m.top,
      width: plotW,
      height: plotH,
      fill: 'transparent',
    });
    svg.appendChild(overlay);
    container.appendChild(svg);

    var tip = tooltipFor(container);
    var points = config.series[0].points;

    function onMove(event) {
      var box = svg.getBoundingClientRect();
      var svgX = ((event.clientX - box.left) / box.width) * W;
      var best = 0;
      var bestDistance = Infinity;
      points.forEach(function (p, i) {
        var distance = Math.abs(x(p[0]) - svgX);
        if (distance < bestDistance) {
          bestDistance = distance;
          best = i;
        }
      });
      var t = points[best][0];
      crosshair.setAttribute('x1', x(t));
      crosshair.setAttribute('x2', x(t));
      crosshair.setAttribute('opacity', 1);

      var html = '<b>' + monthLabel(t) + '</b>';
      config.series.forEach(function (s) {
        var value = s.points[best] ? s.points[best][1] : null;
        html +=
          '<div class="row"><span class="swatch" style="background:' +
          s.color +
          '"></span>' +
          s.name +
          ' <b>' +
          (config.yTick ? config.yTick(value) : pct(value)) +
          '</b></div>';
      });
      if (config.note && config.note[best])
        html +=
          '<div style="color:var(--text-muted)">' +
          config.note[best] +
          '</div>';
      tip.innerHTML = html;
      tip.classList.add('on');
      place(tip, container, (x(t) / W) * box.width, 8);
    }

    svg.addEventListener('mousemove', onMove);
    svg.addEventListener('mouseleave', function () {
      tip.classList.remove('on');
      crosshair.setAttribute('opacity', 0);
    });
  }

  // ----------------------------------------------------------------- dot chart

  /**
   * One dot per day: area carries how much was written, colour carries which
   * model wrote it. No connecting line — the days are not evenly spaced and a
   * line across a weekend would invent a trend that is not measured.
   */
  function dotChart(container, config) {
    var W = 900;
    var H = 340;
    var m = { top: 46, right: 20, bottom: 40, left: 54 };
    var plotW = W - m.left - m.right;
    var plotH = H - m.top - m.bottom;

    var yMax =
      Math.max.apply(
        null,
        config.points.map(function (p) {
          return p.ratio;
        }),
      ) * 1.18;
    var maxAdded = Math.max.apply(
      null,
      config.points.map(function (p) {
        return p.added;
      }),
    );
    var t0 = config.tMin;
    var t1 = config.tMax;
    var x = function (t) {
      return m.left + ((t - t0) / (t1 - t0)) * plotW;
    };
    var y = function (v) {
      return m.top + plotH - (v / yMax) * plotH;
    };
    // Area, not radius, carries the value: doubling the lines doubles the ink.
    var r = function (added) {
      return 3.5 + 8.5 * Math.sqrt(added / maxAdded);
    };

    var svg = el('svg', {
      viewBox: '0 0 ' + W + ' ' + H,
      role: 'img',
      'aria-label': config.ariaLabel,
    });

    ticks(yMax, 4).forEach(function (value) {
      svg.appendChild(
        el('line', {
          x1: m.left,
          x2: m.left + plotW,
          y1: y(value),
          y2: y(value),
          stroke: 'var(--grid)',
          'stroke-width': 1,
        }),
      );
      svg.appendChild(
        text(pct(value, 0), {
          x: m.left - 10,
          y: y(value) + 4,
          fill: 'var(--text-muted)',
          'font-size': 11.5,
          'text-anchor': 'end',
          'font-variant-numeric': 'tabular-nums',
        }),
      );
    });

    var lastX = -Infinity;
    config.points.forEach(function (p) {
      if (x(p.t) - lastX < 52) return;
      lastX = x(p.t);
      svg.appendChild(
        text(dayTick(p.t), {
          x: x(p.t),
          y: m.top + plotH + 20,
          fill: 'var(--text-muted)',
          'font-size': 11.5,
          'text-anchor': 'middle',
        }),
      );
    });
    svg.appendChild(
      el('line', {
        x1: m.left,
        x2: m.left + plotW,
        y1: m.top + plotH,
        y2: m.top + plotH,
        stroke: 'var(--axis)',
        'stroke-width': 1,
      }),
    );

    (config.annotations || []).forEach(function (a) {
      var ax = x(a.t);
      svg.appendChild(
        el('line', {
          x1: ax,
          x2: ax,
          y1: m.top - 8,
          y2: m.top + plotH,
          stroke: 'var(--annotation)',
          'stroke-width': 1,
          'stroke-dasharray': '3 4',
        }),
      );
      svg.appendChild(
        text(a.label, {
          x: ax,
          y: m.top - 16,
          fill: 'var(--text-secondary)',
          'font-size': 11.5,
          'font-weight': 500,
          'text-anchor': 'middle',
        }),
      );
    });

    var tip = tooltipFor(container);
    config.points.forEach(function (p) {
      var dot = el('circle', {
        cx: x(p.t),
        cy: y(p.ratio),
        r: r(p.added),
        fill: p.color,
        stroke: 'var(--surface-1)',
        'stroke-width': 2,
      });
      svg.appendChild(dot);
      // The hit area is bigger than the dot, so a small day is still reachable.
      var hit = el('circle', {
        cx: x(p.t),
        cy: y(p.ratio),
        r: Math.max(14, r(p.added) + 4),
        fill: 'transparent',
      });
      hit.addEventListener('mouseenter', function () {
        tip.innerHTML =
          '<b>' +
          p.label +
          '</b><div class="row"><span class="swatch" style="background:' +
          p.color +
          '"></span>' +
          p.model +
          '</div><div>' +
          pct(p.ratio) +
          ' of ' +
          int(p.added) +
          ' added lines</div>';
        tip.classList.add('on');
        var box = svg.getBoundingClientRect();
        place(
          tip,
          container,
          (x(p.t) / W) * box.width,
          (y(p.ratio) / H) * box.height - 70,
        );
      });
      hit.addEventListener('mouseleave', function () {
        tip.classList.remove('on');
      });
      svg.appendChild(hit);
    });

    container.appendChild(svg);
  }

  // ----------------------------------------------------------------- bar chart

  function barChart(container, config) {
    var W = 900;
    var rowH = 30;
    var m = { top: 26, right: 74, bottom: 34, left: 216 };
    var plotW = W - m.left - m.right;
    var H = m.top + config.items.length * rowH + m.bottom;

    var max = Math.max.apply(
      null,
      config.items.map(function (d) {
        return Math.max(d.value, d.p75 || 0);
      }),
    );
    var xMax = max * 1.08;
    var x = function (v) {
      return m.left + (v / xMax) * plotW;
    };

    var svg = el('svg', {
      viewBox: '0 0 ' + W + ' ' + H,
      role: 'img',
      'aria-label': config.ariaLabel,
    });

    ticks(xMax, 5).forEach(function (value) {
      svg.appendChild(
        el('line', {
          x1: x(value),
          x2: x(value),
          y1: m.top - 6,
          y2: m.top + config.items.length * rowH,
          stroke: 'var(--grid)',
          'stroke-width': 1,
        }),
      );
      svg.appendChild(
        text(pct(value, 0), {
          x: x(value),
          y: m.top + config.items.length * rowH + 18,
          fill: 'var(--text-muted)',
          'font-size': 11.5,
          'text-anchor': 'middle',
        }),
      );
    });

    var tip = tooltipFor(container);

    config.items.forEach(function (d, i) {
      var cy = m.top + i * rowH + rowH / 2;
      var barH = 13;
      svg.appendChild(
        text(d.label, {
          x: m.left - 12,
          y: cy + 4,
          fill: 'var(--text-primary)',
          'font-size': 12.5,
          'text-anchor': 'end',
        }),
      );
      svg.appendChild(
        el('rect', {
          x: m.left,
          y: cy - barH / 2,
          width: Math.max(1, x(d.value) - m.left),
          height: barH,
          rx: 4,
          fill: d.muted ? 'var(--text-muted)' : 'var(--series-1)',
          opacity: d.muted ? 0.45 : 1,
        }),
      );
      // Interquartile range of per-commit ratios, as the robustness check.
      if (d.p25 !== null && d.p25 !== undefined) {
        svg.appendChild(
          el('line', {
            x1: x(d.p25),
            x2: x(d.p75),
            y1: cy,
            y2: cy,
            stroke: 'var(--text-primary)',
            'stroke-width': 1.5,
            opacity: 0.55,
          }),
        );
        svg.appendChild(
          el('circle', {
            cx: x(d.median),
            cy: cy,
            r: 4,
            fill: 'var(--surface-1)',
            stroke: 'var(--text-primary)',
            'stroke-width': 1.75,
          }),
        );
      }
      // Sits past whichever of the bar end and the whisker end reaches furthest.
      var labelX =
        Math.max(
          x(d.value),
          d.p75 === null || d.p75 === undefined ? 0 : x(d.p75),
        ) + 9;
      svg.appendChild(
        text(pct(d.value), {
          x: labelX,
          y: cy + 4,
          fill: 'var(--text-primary)',
          'font-size': 12,
          'font-weight': 600,
          'font-variant-numeric': 'tabular-nums',
        }),
      );

      var hit = el('rect', {
        x: 0,
        y: cy - rowH / 2,
        width: W,
        height: rowH,
        fill: 'transparent',
      });
      hit.addEventListener('mouseenter', function () {
        tip.innerHTML =
          '<b>' +
          d.label +
          '</b><div>Pooled <b>' +
          pct(d.value) +
          '</b></div>' +
          (d.median !== null && d.median !== undefined
            ? '<div>Médiane par commit <b>' +
              pct(d.median) +
              '</b> (P25 ' +
              pct(d.p25) +
              ' – P75 ' +
              pct(d.p75) +
              ')</div>'
            : '') +
          '<div style="color:var(--text-muted)">' +
          int(d.commits) +
          ' commits · +' +
          int(d.added) +
          ' lines</div>';
        tip.classList.add('on');
        place(
          tip,
          container,
          (x(d.value) / W) * container.clientWidth,
          cy * (container.clientWidth / W) - 10,
        );
      });
      hit.addEventListener('mouseleave', function () {
        tip.classList.remove('on');
      });
      svg.appendChild(hit);
    });

    container.appendChild(svg);
  }

  // ---------------------------------------------------------------- table view

  function table(container, columns, rows) {
    // A table of figures cannot wrap without becoming unreadable, so it gets
    // its own scroller rather than pushing the page sideways on a phone.
    var scroller = document.createElement('div');
    scroller.className = 'table-scroll';
    var node = document.createElement('table');
    var head = document.createElement('tr');
    columns.forEach(function (c) {
      var th = document.createElement('th');
      th.textContent = c;
      head.appendChild(th);
    });
    node.appendChild(head);
    rows.forEach(function (row) {
      var tr = document.createElement('tr');
      row.forEach(function (cell) {
        var td = document.createElement('td');
        td.textContent = cell;
        tr.appendChild(td);
      });
      node.appendChild(tr);
    });
    scroller.appendChild(node);
    container.appendChild(scroller);
  }

  window.VIZ = {
    lineChart: lineChart,
    dotChart: dotChart,
    barChart: barChart,
    table: table,
    pct: pct,
    int: int,
    monthLabel: monthLabel,
  };
})();
