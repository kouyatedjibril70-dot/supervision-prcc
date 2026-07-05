/* ═══════════════════════════════════════════════════════════════════════════
   Supervision PRCC — Analyse de faisabilité — app.js v2.1 (Tostan)
   Palette: Vert Tostan #8BC34A | Accents du logo
   ═══════════════════════════════════════════════════════════════════════════ */

const COLORS = {
  vert: '#8BC34A',
  vertDark: '#689F38',
  vertLight: '#C5E1A5',
  vertPale: '#E8F5E9',
  orange: '#FF9800',
  orangeLight: '#FFE0B2',
  rouge: '#E53935',
  rougeLight: '#FFCDD2',
  primary: '#8BC34A',
  primaryDark: '#689F38',
  primaryLight: '#C5E1A5',
  blue: '#039BE5',
  blueLight: '#E1F5FE',
  slate: '#1f2937',
  muted: '#6b7280'
};

const fad = DATA.fad, anchors = DATA.anchors;
const fadSN = fad.filter(f => f.pays === 'Sénégal');
const fadGB = fad.filter(f => f.pays === 'Guinée-Bissau');
const ancSN = anchors.filter(a => a.pays === 'Sénégal');
const ancGB = anchors.filter(a => a.pays === 'Guinée-Bissau');

/* ═══════════════════════════════════════════════════════════════════════════
   UTILITAIRES
   ═══════════════════════════════════════════════════════════════════════════ */

const pct = (n, d) => Math.round(n / d * 100) + ' %';
const cov15 = arr => arr.filter(f => f.dist <= 15).length;

function hav(a, b) {
  const R = 6371, r = Math.PI / 180;
  const dp = (b.lat - a.lat) * r, dl = (b.lon - a.lon) * r;
  const x = Math.sin(dp / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dl / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

const median = v => {
  const s = [...v].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
};
const mean = v => v.reduce((a, b) => a + b, 0) / v.length;

function animateEntry(selector, delay = 0) {
  const els = document.querySelectorAll(selector);
  els.forEach((el, i) => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(20px)';
    setTimeout(() => {
      el.style.transition = 'opacity 0.5s cubic-bezier(0.4,0,0.2,1), transform 0.5s cubic-bezier(0.4,0,0.2,1)';
      el.style.opacity = '1';
      el.style.transform = 'translateY(0)';
    }, delay + i * 80);
  });
}

/* ═══════════════════════════════════════════════════════════════════════════
   SPLASH & TABS
   ═══════════════════════════════════════════════════════════════════════════ */

function closeSplash() {
  const splash = document.getElementById('splash');
  splash.classList.add('hidden');
  document.body.classList.remove('splash-lock');
  setTimeout(() => {
    splash.style.display = 'none';
    initCarte();
    maps.main && maps.main.invalidateSize();
    animateEntry('.card.kpi', 300);
  }, 900);
}

document.querySelectorAll('nav button').forEach(b => b.addEventListener('click', () => {
  document.querySelectorAll('nav button').forEach(x => x.classList.remove('active'));
  document.querySelectorAll('.tab').forEach(x => x.classList.remove('active'));
  b.classList.add('active');
  const tab = b.dataset.tab;
  const tabEl = document.getElementById('tab-' + tab);
  tabEl.classList.add('active');

  if (tab === 'carte') {
    if (!maps.main) { initCarte(); }
    setTimeout(() => {
      if (maps.main) {
        maps.main.invalidateSize();
        refitCarte();
      }
    }, 100);
  } else if (tab === 'comparateur') {
    if (!maps.gb) { setTimeout(initComparateur, 150); }
    else {
      setTimeout(() => {
        maps.gb.invalidateSize();
        maps.sn.invalidateSize();
      }, 100);
    }
  }

  setTimeout(() => animateEntry('#tab-' + tab + ' .card', 100), 150);
}));

window.addEventListener('resize', () => {
  Object.values(maps).forEach(m => m && m.invalidateSize());
});

/* ═══════════════════════════════════════════════════════════════════════════
   KPIS
   ═══════════════════════════════════════════════════════════════════════════ */

function animateCounter(el, target, suffix = '', duration = 1200) {
  const start = performance.now();
  const isPct = suffix.includes('%');
  const numTarget = parseFloat(target);

  function update(now) {
    const elapsed = now - start;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    const current = numTarget * eased;

    if (isPct) {
      el.textContent = Math.round(current) + ' %';
    } else if (suffix.includes('km')) {
      el.textContent = Math.round(current) + ' km';
    } else {
      el.textContent = Math.round(current) + suffix;
    }

    if (progress < 1) requestAnimationFrame(update);
    else el.textContent = target + suffix;
  }
  requestAnimationFrame(update);
}

const kpiGB = pct(cov15(fadGB), fadGB.length);
const kpiSN = pct(cov15(fadSN), fadSN.length);
const kpiMinSN = Math.round(Math.min(...fadSN.map(f => f.dist)));

setTimeout(() => {
  animateCounter(document.getElementById('kpiGB'), parseInt(kpiGB), ' %');
  animateCounter(document.getElementById('kpiSN'), parseInt(kpiSN), ' %');
  animateCounter(document.getElementById('kpiMinSN'), kpiMinSN, ' km');
}, 1000);

/* ═══════════════════════════════════════════════════════════════════════════
   CHARTS
   ═══════════════════════════════════════════════════════════════════════════ */

Chart.defaults.color = '#6b7280';
Chart.defaults.borderColor = 'rgba(0,0,0,0.06)';
Chart.defaults.font.family = "'Inter', 'Segoe UI', system-ui, sans-serif";
Chart.defaults.font.size = 12;

const bins = ['0-5 km', '5-15 km', '15-50 km', '50-100 km', 'plus de 100 km'];
const binIt = arr => [
  arr.filter(f => f.dist <= 5).length,
  arr.filter(f => f.dist > 5 && f.dist <= 15).length,
  arr.filter(f => f.dist > 15 && f.dist <= 50).length,
  arr.filter(f => f.dist > 50 && f.dist <= 100).length,
  arr.filter(f => f.dist > 100).length
];

new Chart(document.getElementById('chartDist'), {
  type: 'bar',
  data: {
    labels: bins,
    datasets: [
      {
        label: 'Guinée-Bissau',
        data: binIt(fadGB),
        backgroundColor: 'rgba(139,195,74,0.85)',
        borderColor: '#8BC34A',
        borderWidth: 1,
        borderRadius: 6,
        borderSkipped: false
      },
      {
        label: 'Sénégal',
        data: binIt(fadSN),
        backgroundColor: 'rgba(229,57,53,0.85)',
        borderColor: '#E53935',
        borderWidth: 1,
        borderRadius: 6,
        borderSkipped: false
      }
    ]
  },
  options: {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 1000, easing: 'easeOutQuart' },
    plugins: {
      legend: {
        position: 'bottom',
        labels: { padding: 20, usePointStyle: true, pointStyle: 'circle' }
      },
      tooltip: {
        backgroundColor: 'rgba(31,41,55,0.95)',
        titleFont: { size: 13, weight: '600' },
        bodyFont: { size: 12 },
        padding: 12,
        cornerRadius: 8,
        displayColors: true
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: { color: 'rgba(0,0,0,0.04)' },
        title: { display: true, text: 'Nb communautés PRCC terminé', font: { weight: '600' } }
      },
      x: {
        grid: { display: false }
      }
    }
  }
});

const regs = [...new Set(fadSN.map(f => f.region))].sort();
new Chart(document.getElementById('chartReg'), {
  type: 'bar',
  data: {
    labels: regs,
    datasets: [{
      label: 'Distance moyenne (km) vers PRCC supervisé',
      data: regs.map(r => mean(fadSN.filter(f => f.region === r).map(f => f.dist))),
      backgroundColor: 'rgba(255,152,0,0.85)',
      borderColor: '#FF9800',
      borderWidth: 1,
      borderRadius: 6,
      borderSkipped: false
    }]
  },
  options: {
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 1000, easing: 'easeOutQuart' },
    plugins: {
      legend: { position: 'bottom', labels: { padding: 20 } },
      tooltip: {
        backgroundColor: 'rgba(31,41,55,0.95)',
        padding: 12,
        cornerRadius: 8,
        callbacks: {
          label: ctx => `Distance moyenne: ${ctx.raw.toFixed(1)} km`
        }
      }
    },
    scales: {
      x: {
        beginAtZero: true,
        grid: { color: 'rgba(0,0,0,0.04)' },
        title: { display: true, text: 'km', font: { weight: '600' } }
      },
      y: { grid: { display: false } }
    }
  }
});

/* ═══════════════════════════════════════════════════════════════════════════
   TABLE SYNTHÈSE
   ═══════════════════════════════════════════════════════════════════════════ */

(function () {
  const rows = [];
  const mk = (zone, anc, fads) => {
    const c = cov15(fads);
    const avg = fads.length ? mean(fads.map(f => f.dist)).toFixed(1) : '—';
    const badgeClass = c / Math.max(fads.length, 1) > 0.7 ? 'b-vert' : c > 0 ? 'b-orange' : 'b-rouge';
    const badgeText = fads.length ? pct(c, fads.length) : '—';

    rows.push(`<tr>
      <td><b>${zone}</b></td>
      <td>${anc}</td>
      <td>${fads.length}</td>
      <td>${avg} km</td>
      <td><span class="badge ${badgeClass}">${badgeText}</span></td>
    </tr>`);
  };

  mk('🇬🇼 Guinée-Bissau (Bafata)', ancGB.length, fadGB);
  regs.forEach(r => mk('🇸🇳 ' + r, ancSN.filter(a => a.region === r).length, fadSN.filter(f => f.region === r)));

  const stl = ancSN.filter(a => a.region === 'Saint-Louis').length;
  rows.push(`<tr>
    <td>🇸🇳 Saint-Louis (Dagana)</td>
    <td>${stl}</td>
    <td>0</td>
    <td>—</td>
    <td><span class="badge b-gold">zone ancre uniquement</span></td>
  </tr>`);

  document.getElementById('tblSynth').innerHTML =
    `<tr>
      <th>Zone</th>
      <th>PRCC en cours</th>
      <th>Communautés PRCC terminé</th>
      <th>Distance moyenne vers un superviseur</th>
      <th>Couverture jusqu'à 15 km</th>
    </tr>` + rows.join('');
})();

/* ═══════════════════════════════════════════════════════════════════════════
   CARTE PRINCIPALE
   ═══════════════════════════════════════════════════════════════════════════ */

const maps = {};

const tiles = () => L.tileLayer(
  'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  {
    attribution: '© OpenStreetMap contributors',
    maxZoom: 19
  }
);

let layerFad, layerAnc, layerFx;
let radiusKm = 15, selectedAnchor = null, curF = [], curA = [];

function popupFad(f) {
  let distLine = '';
  if (selectedAnchor) {
    const d = hav(selectedAnchor, f);
    const color = d <= 5 ? COLORS.vert : d <= radiusKm ? COLORS.orange : COLORS.rouge;
    distLine = `<br><span style="color:${color};font-weight:700">Distance à ${selectedAnchor.com} : ${d.toFixed(1)} km</span>`;
  }
  return `<b style="font-size:1rem;color:${COLORS.slate}">${f.com}</b>
    <div style="color:${COLORS.muted};margin:4px 0">${f.region} · ${f.dept}</div>
    <div>PRCC terminé en <b>${f.fin}</b></div>
    <div style="margin-top:6px;color:${COLORS.muted};font-size:0.8rem">Plus proche: ${f.nearest} (${f.dist} km)</div>
    ${distLine}`;
}

function popupAnchor(a) {
  return `<b style="font-size:1rem;color:${COLORS.slate}">${a.com}</b>
    <div style="color:${COLORS.muted};margin:4px 0">${a.region} · ${a.dept}</div>
    <div>PRCC en cours (fin <b>${a.fin}</b>)</div>
    <div style="margin-top:8px;color:${COLORS.primary};font-size:0.8rem;font-style:italic">💡 Cliquez pour analyser les communautés PRCC terminé à proximité</div>`;
}

function fadStyle(f) {
  if (selectedAnchor) {
    const d = hav(selectedAnchor, f);
    if (d <= 5) return { radius: 6, color: COLORS.vert, fillColor: COLORS.vert, fillOpacity: 0.8, weight: 1.5 };
    if (d <= radiusKm) return { radius: 6, color: COLORS.orange, fillColor: COLORS.orange, fillOpacity: 0.75, weight: 1.5 };
  }
  return { radius: 5, color: '#b91c1c', fillColor: COLORS.rouge, fillOpacity: 0.65, weight: 1 };
}

function anchorStyle(a) {
  if (selectedAnchor && a === selectedAnchor) {
    return { radius: 10, color: COLORS.primary, fillColor: COLORS.blue, fillOpacity: 0.9, weight: 3 };
  }
  return { radius: 7, color: '#1e40af', fillColor: COLORS.blue, fillOpacity: 0.85, weight: 1.5 };
}

function renderMarkers() {
  if (!layerFad || !layerAnc) return;
  layerFad.clearLayers();
  layerAnc.clearLayers();

  curF.forEach(f => {
    const s = fadStyle(f);
    L.circleMarker([f.lat, f.lon], s)
      .bindPopup(popupFad(f), { maxWidth: 280, className: 'custom-popup' })
      .addTo(layerFad);
  });

  curA.forEach(a => {
    const s = anchorStyle(a);
    L.circleMarker([a.lat, a.lon], s)
      .bindPopup(popupAnchor(a), { maxWidth: 280, className: 'custom-popup' })
      .on('click', () => selectAnchor(a))
      .addTo(layerAnc);
  });
}

function drawCircle() {
  if (!layerFx) return;
  layerFx.clearLayers();
  if (!selectedAnchor) return null;
  return L.circle([selectedAnchor.lat, selectedAnchor.lon], {
    radius: radiusKm * 1000,
    color: COLORS.primary,
    weight: 2,
    fillColor: COLORS.primary,
    fillOpacity: 0.06,
    dashArray: '8 6'
  }).addTo(layerFx);
}

function renderLegend() {
  const el = document.getElementById('mapLegend');
  if (!el) return;
  if (selectedAnchor) {
    el.innerHTML =
      `<span class="mlchip"><span class="dot legend-anchor"></span> PRCC en cours (sélectionnée)</span>
      <span class="mlchip"><span class="dot d-termine"></span> PRCC terminé (hors rayon)</span>
      <span class="mlchip"><span class="dot d-vert"></span> 5 km ou moins</span>
      <span class="mlchip"><span class="dot d-orange"></span> 5 km → ${radiusKm} km</span>`;
  } else {
    el.innerHTML =
      `<span class="mlchip"><span class="dot legend-anchor"></span> PRCC en cours (supervisée)</span>
      <span class="mlchip"><span class="dot d-termine"></span> PRCC terminé</span>`;
  }
}

/* ── Analyse automatique (calculée localement à chaque interaction) ── */
function renderAnalysis() {
  const el = document.getElementById('mapAnalysis');
  if (!el) return;

  const paysVal = document.getElementById('selPays').value;
  const paysLabel = { 'Sénégal': 'au Sénégal', 'Guinée-Bissau': 'en Guinée-Bissau', 'tous': 'dans les deux pays' }[paysVal] || '';
  const regVal = document.getElementById('selRegion').value;
  const zoneLabel = regVal !== 'toutes' ? ` (région ${regVal})` : '';

  if (!curF.length && !curA.length) {
    el.innerHTML = `Aucune communauté ne correspond aux filtres actuels${zoneLabel}.`;
    return;
  }

  if (selectedAnchor) {
    if (!curF.length) {
      el.innerHTML = `<b>${selectedAnchor.com}</b> est sélectionnée, mais aucune communauté PRCC terminé n'est présente dans le filtre actuel${zoneLabel} pour évaluer la couverture.`;
      return;
    }
    const dists = curF.map(f => hav(selectedAnchor, f));
    const within5 = dists.filter(d => d <= 5).length;
    const withinRadius = dists.filter(d => d > 5 && d <= radiusKm).length;
    const covered = within5 + withinRadius;
    const beyond = curF.length - covered;
    const nearest = Math.min(...dists).toFixed(1);

    el.innerHTML = `<b>${within5}</b> communauté${within5 > 1 ? 's' : ''} à 5 km ou moins de <b>${selectedAnchor.com}</b> et <b>${withinRadius}</b> de plus entre 5 et ${radiusKm} km, soit <b>${covered}</b> au total — <b>${pct(covered, curF.length)}</b> des ${curF.length} communautés du filtre actuel${zoneLabel}. <b>${beyond}</b> reste${beyond > 1 ? 'nt' : ''} hors de portée (la plus proche à ${nearest} km).`;
    return;
  }

  if (!curF.length) {
    el.innerHTML = `Cette zone ne contient que des communautés PRCC en cours (<b>${curA.length}</b>), aucune communauté PRCC terminé${zoneLabel}.`;
    return;
  }

  const avg = mean(curF.map(f => f.dist)).toFixed(1);
  const min = Math.min(...curF.map(f => f.dist)).toFixed(1);
  const c = cov15(curF);
  const coverage = pct(c, curF.length);

  el.innerHTML = `<b>${curF.length}</b> communauté${curF.length > 1 ? 's' : ''} PRCC terminé et <b>${curA.length}</b> communauté${curA.length > 1 ? 's' : ''} PRCC en cours ${paysLabel}${zoneLabel}. <b>${coverage}</b> sont à 15 km ou moins d'une supervision (distance moyenne : <b>${avg} km</b>, minimum : <b>${min} km</b>).`;
}

function selectAnchor(a) {
  selectedAnchor = a;
  drawCircle();
  renderMarkers();

  if (maps.main) {
    maps.main.setView([a.lat, a.lon], Math.min(maps.main.getZoom() + 2, 12));
  }

  document.getElementById('btnResetSel').classList.add('visible');
  renderLegend();
  renderAnalysis();
}

function resetSelection() {
  if (!maps.main) return;
  selectedAnchor = null;
  if (layerFx) layerFx.clearLayers();
  renderMarkers();
  document.getElementById('btnResetSel').classList.remove('visible');
  renderLegend();
  renderAnalysis();
}

function refitCarte() {
  if (!maps.main) return;
  const reg = document.getElementById('selRegion').value;
  const all = [...curF, ...curA];
  if (!all.length) return;
  const opts = { padding: [40, 40] };
  if (reg !== 'toutes') opts.maxZoom = 10;
  const bounds = all.map(p => [p.lat, p.lon]);
  maps.main.fitBounds(bounds, opts);
}

function applyFilters(refit) {
  if (!maps.main) return;
  const pays = document.getElementById('selPays').value;
  const reg = document.getElementById('selRegion').value;
  curF = fad.filter(f => (pays === 'tous' || f.pays === pays) && (reg === 'toutes' || f.region === reg));
  curA = anchors.filter(a => (pays === 'tous' || a.pays === pays) && (reg === 'toutes' || a.region === reg));
  resetSelection();
  if (refit) refitCarte();
}

function initCarte() {
  if (maps.main) return;

  const mapContainer = document.getElementById('map');
  if (!mapContainer) return;

  const rect = mapContainer.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) {
    setTimeout(initCarte, 100);
    return;
  }

  maps.main = L.map('map', { scrollWheelZoom: true, zoomControl: false });
  // Vue initiale requise avant tout flyTo/flyToBounds (sinon Leaflet lève
  // "Set map center and zoom first."). Sénégal/Guinée-Bissau, zoom large.
  maps.main.setView([14.3, -14.5], 7);

  L.control.zoom({ position: 'bottomright' }).addTo(maps.main);
  tiles().addTo(maps.main);

  layerFad = L.layerGroup().addTo(maps.main);
  layerAnc = L.layerGroup().addTo(maps.main);
  layerFx = L.layerGroup().addTo(maps.main);

  applyFilters(true);

  setTimeout(() => { maps.main.invalidateSize(); }, 200);
}

document.getElementById('btnResetSel').addEventListener('click', () => {
  resetSelection();
  refitCarte();
});

/* Region select */
(function () {
  const sel = document.getElementById('selRegion');
  function fill() {
    const pays = document.getElementById('selPays').value;
    const rs = [...new Set([...fad, ...anchors].filter(x => pays === 'tous' || x.pays === pays).map(x => x.region))].sort();
    sel.innerHTML = '<option value="toutes">📍 Toutes les régions</option>' + rs.map(r => `<option>${r}</option>`).join('');
  }
  fill();
  document.getElementById('selPays').addEventListener('change', () => { fill(); applyFilters(true); });
  sel.addEventListener('change', () => applyFilters(true));
  let radiusRaf = null;
  document.getElementById('rngRadius').addEventListener('input', e => {
    radiusKm = +e.target.value;
    document.getElementById('lblRadius').textContent = radiusKm + ' km';
    // Coalesce rapid input events (slider drag fires many per second) to
    // one marker re-render per animation frame, so dragging stays smooth.
    if (radiusRaf) return;
    radiusRaf = requestAnimationFrame(() => {
      radiusRaf = null;
      if (selectedAnchor) { renderMarkers(); drawCircle(); }
      renderLegend();
      renderAnalysis();
    });
  });
})();

/* ═══════════════════════════════════════════════════════════════════════════
   COMPARATEUR
   ═══════════════════════════════════════════════════════════════════════════ */

function miniMap(id, fads, ancs, center, zoom) {
  const container = document.getElementById(id);
  if (!container) return null;

  const m = L.map(id, { scrollWheelZoom: false, zoomControl: false });
  L.control.zoom({ position: 'bottomright' }).addTo(m);
  tiles().addTo(m);

  fads.forEach(f => {
    const color = f.dist <= 15 ? COLORS.vert : f.dist <= 50 ? COLORS.orange : COLORS.rouge;
    L.circleMarker([f.lat, f.lon], {
      radius: 4, color: color, fillColor: color, fillOpacity: 0.7, weight: 1
    }).bindPopup(`<b>${f.com}</b><br>${f.dist} km`, { className: 'custom-popup' }).addTo(m);
  });

  ancs.forEach(a => {
    L.circleMarker([a.lat, a.lon], {
      radius: 6, color: '#1e40af', fillColor: COLORS.blue, fillOpacity: 0.85, weight: 1.5
    }).bindPopup(`<b>${a.com}</b>`, { className: 'custom-popup' }).addTo(m);
  });

  const bounds = [...fads, ...ancs].map(p => [p.lat, p.lon]);
  if (bounds.length) m.fitBounds(bounds, { padding: [30, 30] });

  setTimeout(() => m.invalidateSize(), 200);
  return m;
}

function initComparateur() {
  if (maps.gb) return;
  maps.gb = miniMap('mapGB', fadGB, ancGB, [12, -14.8], 9);
  maps.sn = miniMap('mapSN', fadSN, ancSN, [14, -14], 7);
}

document.getElementById('statsGB').innerHTML =
  `<div style="display:flex;gap:1.5rem;flex-wrap:wrap;margin-top:0.8rem">
    <div><div style="font-size:1.5rem;font-weight:800;color:${COLORS.vert}">${ancGB.length}</div><div style="font-size:0.8rem;color:${COLORS.muted}">PRCC en cours</div></div>
    <div><div style="font-size:1.5rem;font-weight:800;color:${COLORS.slate}">${fadGB.length}</div><div style="font-size:0.8rem;color:${COLORS.muted}">Communautés terminées</div></div>
    <div><div style="font-size:1.5rem;font-weight:800;color:${COLORS.orange}">${mean(fadGB.map(f => f.dist)).toFixed(1)} km</div><div style="font-size:0.8rem;color:${COLORS.muted}">Distance moyenne</div></div>
    <div><div style="font-size:1.5rem;font-weight:800;color:${COLORS.vert}">${pct(cov15(fadGB), fadGB.length)}</div><div style="font-size:0.8rem;color:${COLORS.muted}">Couverture jusqu'à 15 km</div></div>
  </div>`;

document.getElementById('statsSN').innerHTML =
  `<div style="display:flex;gap:1.5rem;flex-wrap:wrap;margin-top:0.8rem">
    <div><div style="font-size:1.5rem;font-weight:800;color:${COLORS.blue}">${ancSN.length}</div><div style="font-size:0.8rem;color:${COLORS.muted}">PRCC en cours</div></div>
    <div><div style="font-size:1.5rem;font-weight:800;color:${COLORS.slate}">${fadSN.length}</div><div style="font-size:0.8rem;color:${COLORS.muted}">Communautés terminées</div></div>
    <div><div style="font-size:1.5rem;font-weight:800;color:${COLORS.orange}">${mean(fadSN.map(f => f.dist)).toFixed(1)} km</div><div style="font-size:0.8rem;color:${COLORS.muted}">Distance moyenne</div></div>
    <div><div style="font-size:1.5rem;font-weight:800;color:${COLORS.rouge}">${pct(cov15(fadSN), fadSN.length)}</div><div style="font-size:0.8rem;color:${COLORS.muted}">Couverture jusqu'à 15 km</div></div>
  </div>`;

(function () {
  const avgGB = mean(fadGB.map(f => f.dist)).toFixed(1);
  const avgSN = mean(fadSN.map(f => f.dist)).toFixed(1);
  const minGB = Math.min(...fadGB.map(f => f.dist)).toFixed(1);
  const minSN = Math.min(...fadSN.map(f => f.dist)).toFixed(1);
  const covGB = pct(cov15(fadGB), fadGB.length);
  const covSN = pct(cov15(fadSN), fadSN.length);
  const ratio = (mean(fadSN.map(f => f.dist)) / mean(fadGB.map(f => f.dist))).toFixed(0);

  document.getElementById('comparatorAnalysis').innerHTML =
    `En Guinée-Bissau, <b>${ancGB.length}</b> communautés PRCC en cours sont réparties près des <b>${fadGB.length}</b> communautés PRCC terminé : distance moyenne <b>${avgGB} km</b> (minimum ${minGB} km), <b>${covGB}</b> sont à 15 km ou moins d'une supervision. Au Sénégal, <b>${ancSN.length}</b> communautés PRCC en cours sont plus éloignées des <b>${fadSN.length}</b> communautés PRCC terminé : distance moyenne <b>${avgSN} km</b> (minimum ${minSN} km), seulement <b>${covSN}</b> sont à 15 km ou moins. La distance moyenne est <b>${ratio} fois</b> plus élevée au Sénégal qu'en Guinée-Bissau.`;
})();

document.getElementById('tblComp').innerHTML = `
<tr>
  <th>Indicateur</th>
  <th>🇬🇼 Guinée-Bissau</th>
  <th>🇸🇳 Sénégal</th>
</tr>
<tr>
  <td>Communautés PRCC terminé géolocalisées</td>
  <td><b>${fadGB.length}</b></td>
  <td><b>${fadSN.length}</b></td>
</tr>
<tr>
  <td>PRCC en cours (points de supervision)</td>
  <td><b>${ancGB.length}</b></td>
  <td><b>${ancSN.length}</b></td>
</tr>
<tr>
  <td>Régions concernées</td>
  <td>1 (Bafata)</td>
  <td>6</td>
</tr>
<tr>
  <td>Distance moyenne vers un superviseur</td>
  <td><b style="color:${COLORS.vert}">${mean(fadGB.map(f => f.dist)).toFixed(1)} km</b></td>
  <td><b style="color:${COLORS.rouge}">${mean(fadSN.map(f => f.dist)).toFixed(1)} km</b></td>
</tr>
<tr>
  <td>Distance minimale</td>
  <td><b style="color:${COLORS.vert}">${Math.min(...fadGB.map(f => f.dist)).toFixed(1)} km</b></td>
  <td><b style="color:${COLORS.rouge}">${Math.min(...fadSN.map(f => f.dist)).toFixed(1)} km</b></td>
</tr>
<tr>
  <td>Couverture jusqu'à 5 km (coût zéro)</td>
  <td><span class="badge b-vert">${pct(fadGB.filter(f => f.dist <= 5).length, fadGB.length)}</span></td>
  <td><span class="badge b-rouge">0 %</span></td>
</tr>
<tr>
  <td>Couverture jusqu'à 15 km (léger détour)</td>
  <td><span class="badge b-vert">${pct(cov15(fadGB), fadGB.length)}</span></td>
  <td><span class="badge b-rouge">${pct(cov15(fadSN), fadSN.length)}</span></td>
</tr>
<tr>
  <td>Verdict modèle « en passant »</td>
  <td><span class="badge b-vert pulse">✓ FONCTIONNE</span></td>
  <td><span class="badge b-rouge pulse">✗ INAPPLICABLE TEL QUEL</span></td>
</tr>`;

/* ═══════════════════════════════════════════════════════════════════════════
   VERDICT CARDS
   ═══════════════════════════════════════════════════════════════════════════ */

(function () {
  const el = document.getElementById('verdictCards');
  regs.forEach((r, i) => {
    const F = fadSN.filter(f => f.region === r);
    const med = mean(F.map(f => f.dist)).toFixed(0);
    const near = Math.min(...F.map(f => f.dist)).toFixed(0);
    const cls = med < 60 ? 'partiel' : '';
    const badge = med < 60
      ? '<span class="badge b-orange">EXTENSION POSSIBLE</span>'
      : '<span class="badge b-rouge">CIRCUIT DÉDIÉ REQUIS</span>';
    const advice = med < 60
      ? 'Distance encore modérée : une partie des communautés est relativement proche des tournées existantes.'
      : 'Aucune tournée de superviseur ne passe à proximité de ces communautés.';

    el.innerHTML += `<div class="card verdict-card ${cls}" style="animation:fadeSlideUp 0.5s ${i * 0.1}s both">
      <h4>${r} ${badge}</h4>
      <p class="note">
        <b>${F.length}</b> communautés PRCC terminé ·
        distance moyenne vers un superviseur : <b>${med} km</b> — la communauté la plus proche est à <b>${near} km</b>.
        ${advice}
      </p>
    </div>`;
  });
})();

/* ═══════════════════════════════════════════════════════════════════════════
   INTERSECTION OBSERVER pour animations au scroll
   ═══════════════════════════════════════════════════════════════════════════ */

const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.style.opacity = '1';
      entry.target.style.transform = 'translateY(0)';
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.card:not(.kpi)').forEach(card => {
    card.style.opacity = '0';
    card.style.transform = 'translateY(20px)';
    card.style.transition = 'opacity 0.6s cubic-bezier(0.4,0,0.2,1), transform 0.6s cubic-bezier(0.4,0,0.2,1)';
    observer.observe(card);
  });
});
