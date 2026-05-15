export const config = { runtime: 'edge' };

export default async function handler(req) {
  const js = `
(function() {
  'use strict';

  var PROCESSED_ATTR = 'data-wc-sparkline';

  function makeSVGSparkline(scores) {
    if (!scores || scores.length < 2) return '';
    var w = 60, h = 24, pad = 2;
    var minS = Math.min.apply(null, scores);
    var maxS = Math.max.apply(null, scores);
    var range = maxS - minS || 1;
    var step = (w - pad * 2) / (scores.length - 1);
    var points = scores.map(function(s, i) {
      var x = pad + i * step;
      var y = h - pad - ((s - minS) / range) * (h - pad * 2);
      return x.toFixed(1) + ',' + y.toFixed(1);
    }).join(' ');
    // Color based on trend
    var trend = scores[scores.length - 1] - scores[0];
    var color = trend > 0 ? '#16a34a' : trend < 0 ? '#dc2626' : '#64748b';
    // Last point
    var last = points.split(' ').pop().split(',');
    var dotSvg = '<circle cx="' + last[0] + '" cy="' + last[1] + '" r="2.5" fill="' + color + '"/>';
    return '<svg width="' + w + '" height="' + h + '" viewBox="0 0 ' + w + ' ' + h + '" style="display:inline-block;vertical-align:middle;margin-left:8px;flex-shrink:0">' +
      '<polyline points="' + points + '" fill="none" stroke="' + color + '" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"/>' +
      dotSvg +
      '</svg>';
  }

  function buildSparklines() {
    var items = document.querySelectorAll('.history-item:not([' + PROCESSED_ATTR + '])');
    if (!items.length) return;

    // Collect all items to build per-student score arrays
    var allItems = document.querySelectorAll('.history-item');
    var studentScores = {};
    var studentItems = {};

    allItems.forEach(function(item) {
      var nameEl = item.querySelector('.history-name');
      var scoreEl = item.querySelector('.history-score');
      if (!nameEl || !scoreEl) return;
      var name = nameEl.textContent.trim();
      var score = parseFloat(scoreEl.textContent.trim());
      if (isNaN(score)) return;
      if (!studentScores[name]) {
        studentScores[name] = [];
        studentItems[name] = [];
      }
      studentScores[name].push(score);
      studentItems[name].push(item);
    });

    // For each student with 2+ corrections, add sparkline
    Object.keys(studentScores).forEach(function(name) {
      var scores = studentScores[name];
      if (scores.length < 2) return;
      // Reverse so oldest first (history shows newest first)
      var chartScores = scores.slice().reverse();
      var svg = makeSVGSparkline(chartScores);
      if (!svg) return;

      studentItems[name].forEach(function(item) {
        if (item.getAttribute(PROCESSED_ATTR)) return;
        item.setAttribute(PROCESSED_ATTR, '1');
        var nameEl = item.querySelector('.history-name');
        if (!nameEl) return;
        // Wrap in flex container if not already
        nameEl.style.display = 'flex';
        nameEl.style.alignItems = 'center';
        nameEl.style.gap = '4px';
        // Add sparkline only to first occurrence (most recent) - show trend tooltip on all
        var div = document.createElement('span');
        div.innerHTML = svg;
        div.title = 'Evolución: ' + chartScores.map(function(s) { return s.toFixed(1); }).join(' → ');
        nameEl.appendChild(div);
      });
    });

    // Mark any remaining unprocessed items to avoid re-processing
    items.forEach(function(item) {
      item.setAttribute(PROCESSED_ATTR, '1');
    });
  }

  // Run on DOM changes
  var observer = new MutationObserver(function(mutations) {
    var hasNew = mutations.some(function(m) {
      return Array.from(m.addedNodes).some(function(n) {
        return n.nodeType === 1 && (
          n.classList && n.classList.contains('history-item') ||
          (n.querySelector && n.querySelector('.history-item'))
        );
      });
    });
    if (hasNew) {
      setTimeout(buildSparklines, 100);
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });

  // Also run on initial load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() { setTimeout(buildSparklines, 500); });
  } else {
    setTimeout(buildSparklines, 500);
  }
})();
`;

  return new Response(js, {
    status: 200,
    headers: {
      'Content-Type': 'application/javascript',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
