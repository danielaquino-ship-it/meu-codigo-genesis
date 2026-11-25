(() => {
  if (document.getElementById('gc-pro-dock-host')) {
    document.getElementById('gc-pro-dock-host').remove();
    if (window.__gcProInterval) clearInterval(window.__gcProInterval);
    document.querySelectorAll('.gc-pro-card-timer, #gc-pro-copy-both-btn').forEach(el => el.remove());
  }

  // ===== CONFIGURAÇÕES E STORAGE =====
  const TODAY_STR = new Date().toISOString().slice(0, 10);
  const TODAY_KEY = 'gc_pro_interactions_v3_' + TODAY_STR;
  const ADJ_KEY = 'gc_pro_adjustments_v1_' + TODAY_STR;
  const CFG_KEY = 'gc_pro_config_v3';
  const METRICS_KEY = 'gc_pro_metrics_v3';
  const THRESHOLD_SEC = 70; // 1m 10s
  const DASH_PIP_URL = 'https://script.google.com/a/macros/grupobrisanet.com.br/s/AKfycbysdYRZyX0strR8XbMVoc2UEKB6mHGzD8iugx1-O8_NFRkZJeiiulLpIlv4gA1fANp2/exec';

  const THEMES = {
    deepspace: {
      name: 'Deep Space', desc: 'Azul cósmico com pulso ciano orbital',
      bg: '#0b101d', surface: '#121a2d', border: '#243454', text: '#eaf2ff', muted: '#8ba3c7',
      grad: 'linear-gradient(135deg, #0f2046, #1d4ed8, #06b6d4, #0f2046)',
      accent: '#38bdf8', success: '#22c55e', danger: '#f43f5e'
    },
    nebula: {
      name: 'Nebula Pulse', desc: 'Nebulosa violeta com brilho magenta',
      bg: '#120d1d', surface: '#1b132b', border: '#352452', text: '#f3ecff', muted: '#a792c9',
      grad: 'linear-gradient(135deg, #2e1065, #7c3aed, #c026d3, #2e1065)',
      accent: '#c084fc', success: '#34d399', danger: '#fb7185'
    },
    aurora: {
      name: 'Quantum Aurora', desc: 'Luz boreal esmeralda e azul quântico',
      bg: '#091616', surface: '#102424', border: '#1f4242', text: '#e6f7f5', muted: '#7fb3ad',
      grad: 'linear-gradient(135deg, #064e3b, #059669, #0891b2, #064e3b)',
      accent: '#2dd4bf', success: '#4ade80', danger: '#f87171'
    },
    cyber: {
      name: 'Cyber Obsidian', desc: 'Grafite metálico com índigo neural',
      bg: '#111318', surface: '#191d26', border: '#2d3545', text: '#edf0f7', muted: '#8e98ad',
      grad: 'linear-gradient(135deg, #1e293b, #4f46e5, #6366f1, #1e293b)',
      accent: '#818cf8', success: '#22c55e', danger: '#ef4444'
    },
    horizon: {
      name: 'Event Horizon', desc: 'Ônix espacial com borda solar âmbar',
      bg: '#14110f', surface: '#1f1a16', border: '#3d3126', text: '#faf3eb', muted: '#b5a291',
      grad: 'linear-gradient(135deg, #451a03, #d97706, #ea580c, #451a03)',
      accent: '#f59e0b', success: '#22c55e', danger: '#ef4444'
    }
  };

  const METRIC_META = {
    'Number of Interaction Answered': { label: 'Qtd. Interações Atendidas', type: 'high', min: 32, mid: 36, max: 40, scaleMax: 44 },
    'Number of Interaction': { label: 'Total de Interações', type: 'high', min: 32, mid: 36, max: 40, scaleMax: 44 },
    'Average After Call Work': { label: 'TPC Médio', type: 'mid', min: 5, midLow: 10, midHigh: 15, max: 30, scaleMax: 35 },
    'Average Handle Time': { label: 'TMA Geral', type: 'mid', min: 60, midLow: 300, midHigh: 460, max: 600, scaleMax: 900 },
    'Interaction Answered Ratio': { label: 'Taxa de Atendimento', type: 'high', min: 83, mid: 88, max: 92, scaleMax: 100 },
    'Calls Transferred Ratio': { label: 'Taxa de Transferência', type: 'low', min: 10, mid: 20, max: 35, scaleMax: 100 },
    'After Call Work Time Ratio': { label: 'Taxa de TPC', type: 'low', min: 2, mid: 5, max: 10, scaleMax: 25 },
    'Hold Time Ratio': { label: 'Taxa de Espera', type: 'low', min: 5, mid: 15, max: 30, scaleMax: 60 },
    'Average Hold Time': { label: 'Tempo Médio em Espera', type: 'low', min: 60, mid: 180, max: 360, scaleMax: 720 },
    'AVERAGE_TALK_TIME': { label: 'Tempo Médio de Conversa', type: 'mid', min: 60, midLow: 180, midHigh: 360, max: 480, scaleMax: 660 },
    'AVERAGE_ALERT_TIME': { label: 'Tempo Médio de Alerta', type: 'low', min: 3, mid: 6, max: 10, scaleMax: 20 },
    'Number of Transfer': { label: 'Qtd. de Transferências', type: 'low', min: 2, mid: 5, max: 10, scaleMax: 20 },
    'Total Talk Time': { label: 'Tempo Total de Conversa', type: 'high', min: 3600, mid: 10800, max: 18000, scaleMax: 21600 }
  };

  let config = Object.assign({
    theme: 'deepspace',
    showClock: true,
    apiUrl: 'https://api.groq.com/openai/v1/chat/completions',
    apiKey: '',
    model: 'openai/gpt-oss-20b'
  }, JSON.parse(localStorage.getItem(CFG_KEY) || '{}'));

  let interactions = JSON.parse(localStorage.getItem(TODAY_KEY) || '{}');
  let adjustments = Object.assign({ chatOffset: 0, voiceOffset: 0 }, JSON.parse(localStorage.getItem(ADJ_KEY) || '{}'));
  let cachedMetrics = JSON.parse(localStorage.getItem(METRICS_KEY) || '{"updatedAt":null,"points":null,"items":[]}');
  let menuOpen = false;
  let pipLoaded = false;

  const saveConfig = () => localStorage.setItem(CFG_KEY, JSON.stringify(config));
  const saveInteractions = () => localStorage.setItem(TODAY_KEY, JSON.stringify(interactions));
  const saveAdjustments = () => localStorage.setItem(ADJ_KEY, JSON.stringify(adjustments));
  const saveMetrics = () => localStorage.setItem(METRICS_KEY, JSON.stringify(cachedMetrics));

  // ===== PRIVACIDADE E UTILITÁRIOS =====
  const hashStr = (str) => {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h += (h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24);
    }
    return 'ATD-' + (h >>> 0).toString(36).toUpperCase().slice(0, 6);
  };

  const scrubPII = (text) => (text || '')
    .replace(/\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g, '[CPF_OCULTO]')
    .replace(/\b\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}\b/g, '[CNPJ_OCULTO]')
    .replace(/\b(?:\+?55\s?)?(?:\(?\d{2}\)?\s?)?(?:9\d{4}|\d{4})-?\d{4}\b/g, '[TEL_OCULTO]')
    .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-z]{2,}/gi, '[EMAIL_OCULTO]')
    .replace(/\b\d{5}-?\d{3}\b/g, '[CEP_OCULTO]')
    .replace(/\b\d{2}\/\d{2}\/\d{4}\b/g, '[DATA_OCULTA]')
    .trim();

  const fmtTime = (s) => {
    const sec = Math.max(0, Math.round(s || 0));
    const m = Math.floor(sec / 60);
    const r = sec % 60;
    return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
  };

  const fmtMetricVal = (val, unitType) => {
    if (val === null || val === undefined || Number.isNaN(val)) return '-';
    if (unitType === 'Seconds') {
      const total = Math.round(val);
      const h = Math.floor(total / 3600);
      const m = Math.floor((total % 3600) / 60);
      const s = total % 60;
      if (h > 0) return `${h}h ${m}m`;
      if (m > 0) return s > 0 ? `${m}m ${s}s` : `${m}m`;
      return `${s}s`;
    }
    if (unitType === 'Percent') return `${val.toFixed(1).replace('.', ',')}%`;
    return String(Math.round(val));
  };

  // ===== API DE MÉTRICAS DO GENESYS =====
  const getGenesysToken = () => {
    for (const raw of [
      sessionStorage.getItem('gcui_auth'),
      sessionStorage.getItem('gcui_session'),
      localStorage.getItem('pc_auth')
    ]) {
      if (!raw) continue;
      try {
        const o = JSON.parse(raw);
        const t = o.token || o.access_token || o.accessToken || o?.auth?.token || o?.session?.token;
        if (t && t.length > 20) return t;
      } catch {}
      const clean = raw.replace(/^["']|["']$/g, '').trim();
      if (clean.length > 20 && !clean.includes(' ')) return clean;
    }
    return null;
  };

  const evaluateLifeBar = (val, unitType, rule) => {
    if (!rule) {
      const pct = unitType === 'Percent' ? Math.max(2, Math.min(98, val)) : 50;
      return {
        pct, inTarget: false, segments: ['seg-0', 'seg-1', 'seg-2', 'seg-3'],
        minLbl: '0', midLbl: unitType === 'Percent' ? '50%' : '-', maxLbl: unitType === 'Percent' ? '100%' : '-'
      };
    }
    const scaleMax = rule.scaleMax || rule.max * 1.2;
    const pct = Math.max(2, Math.min(98, (val / scaleMax) * 100));

    if (rule.type === 'high') {
      return {
        pct, inTarget: val >= rule.max, segments: ['seg-0', 'seg-1', 'seg-2', 'seg-3'],
        minLbl: fmtMetricVal(rule.min, unitType), midLbl: fmtMetricVal(rule.mid, unitType), maxLbl: fmtMetricVal(rule.max, unitType)
      };
    }
    if (rule.type === 'low') {
      return {
        pct, inTarget: val <= rule.min, segments: ['seg-3', 'seg-2', 'seg-1', 'seg-0'],
        minLbl: fmtMetricVal(rule.min, unitType), midLbl: fmtMetricVal(rule.mid, unitType), maxLbl: fmtMetricVal(rule.max, unitType)
      };
    }
    return {
      pct, inTarget: val >= rule.midLow && val <= rule.midHigh, segments: ['seg-0', 'seg-2', 'seg-3', 'seg-2', 'seg-0'],
      minLbl: fmtMetricVal(rule.min, unitType),
      midLbl: `${fmtMetricVal(rule.midLow, unitType)}–${fmtMetricVal(rule.midHigh, unitType)}`,
      maxLbl: fmtMetricVal(rule.max, unitType)
    };
  };

  const syncMetricsAPI = async () => {
    const token = getGenesysToken();
    const statusEl = shadow.getElementById('met-status');
    if (!token) {
      if (statusEl) statusEl.textContent = 'Sessão do Genesys não detectada.';
      return;
    }

    const hostApi = location.hostname.replace(/^apps?\./, 'api.');
    const headers = { Authorization: 'Bearer ' + token };
    if (statusEl) statusEl.textContent = 'Atualizando indicadores...';

    try {
      const [valRes, ptsRes] = await Promise.all([
        fetch(`https://${hostApi}/api/v2/gamification/scorecards/values/trends?startWorkday=${TODAY_STR}&endWorkday=${TODAY_STR}`, { headers }),
        fetch(`https://${hostApi}/api/v2/gamification/scorecards/points/trends?startWorkday=${TODAY_STR}&endWorkday=${TODAY_STR}`, { headers })
      ]);

      let points = cachedMetrics.points;
      if (ptsRes.ok) {
        const ptsData = await ptsRes.json();
        points = ptsData?.averagePoints ?? ptsData?.trend?.[0]?.points ?? points;
      }

      if (valRes.ok) {
        const valData = await valRes.json();
        const items = (valData?.results || []).map((r) => {
          const rawName = r.metricDefinition?.name || 'Indicador';
          const rule = METRIC_META[rawName];
          const val = r.average ?? r.trend?.[0]?.value ?? 0;
          const unitType = r.unitType || 'Number';
          const bar = evaluateLifeBar(val, unitType, rule);
          return {
            rawName,
            title: rule ? rule.label : rawName,
            valueFormatted: fmtMetricVal(val, unitType),
            pct: bar.pct,
            inTarget: bar.inTarget,
            segments: bar.segments,
            minLbl: bar.minLbl,
            midLbl: bar.midLbl,
            maxLbl: bar.maxLbl,
            priority: rule ? Object.keys(METRIC_META).indexOf(rawName) : 99
          };
        }).sort((a, b) => a.priority - b.priority);

        cachedMetrics = {
          updatedAt: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
          points,
          items
        };
        saveMetrics();
        renderMetrics();
      }
    } catch {
      if (statusEl) statusEl.textContent = 'Erro ao atualizar. Clique em ↻.';
    }
  };

  // ===== DETECÇÃO GENESYS (CARD LATERAL + CABEÇALHO) =====
  const findSelectedRosterCard = (rawName) => {
    const list = document.querySelector('.acd-interactions-list .interactions');
    if (!list) return null;
    let card = list.querySelector('[aria-selected="true"], .selected, .active');
    if (!card && rawName) {
      card = Array.from(list.children).find(el => el.textContent && el.textContent.includes(rawName.slice(0, 12)));
    }
    return card || null;
  };

  const getRosterTextSnapshot = () => {
    const list = document.querySelector('.acd-interactions-list .interactions');
    return list ? list.textContent || '' : '';
  };

  const detectActiveInteraction = () => {
    const container = document.querySelector('.selected-interaction-container');
    if (!container || container.classList.contains('hidden') || container.offsetParent === null) {
      return null;
    }
    const nameEl = container.querySelector('#interaction-header-participant-name');
    const rawName = nameEl ? nameEl.textContent.trim() : '';
    const cleanName = scrubPII(rawName) || 'Interação';

    const iconWrap = container.querySelector('.interaction-type-icon-v2');
    const guxIcon = iconWrap ? iconWrap.querySelector('gux-icon') : null;
    const iconName = (guxIcon ? guxIcon.getAttribute('icon-name') : '') || '';
    const iconClass = iconWrap ? iconWrap.className : '';
    const isVoice = /phone|call|voice|audio/i.test(iconName + ' ' + iconClass);

    const uuidMatch = window.location.hash.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
    const card = findSelectedRosterCard(rawName);
    const domHint = card ? (card.getAttribute('data-conversation-id') || card.getAttribute('id') || '') : '';

    const uniqueSeed = uuidMatch ? uuidMatch[0] : (domHint || rawName);
    if (!uniqueSeed) return null;

    return {
      key: hashStr(uniqueSeed),
      name: cleanName,
      rawName,
      card,
      channel: isVoice ? 'voice' : 'chat'
    };
  };

  // ===== INJEÇÃO 1: CRONÔMETRO PEQUENO NO CARD LATERAL =====
  const updateCardTimerBadge = (card, rec) => {
    if (!card) return;
    if (getComputedStyle(card).position === 'static') card.style.position = 'relative';
    let badge = card.querySelector('.gc-pro-card-timer');
    if (!badge) {
      badge = document.createElement('span');
      badge.className = 'gc-pro-card-timer';
      badge.style.cssText = 'position:absolute;top:2px;left:12px;font-size:10px;font-weight:700;line-height:1;pointer-events:none;z-index:5;font-family:Inter,system-ui,sans-serif;letter-spacing:0.3px;';
      card.appendChild(badge);
    }
    if (rec.counted) {
      badge.textContent = '✓';
      badge.style.color = '#16a34a';
      badge.style.fontSize = '11px';
    } else {
      badge.textContent = fmtTime(rec.seconds);
      badge.style.color = '#475569';
      badge.style.fontSize = '10px';
    }
  };

  // ===== INJEÇÃO 2: BOTÃO COPIAR NOME + URL =====
  const ensureCopyBothButton = () => {
    const actionsBox = document.querySelector('.selected-interaction-container .interaction-header-v2 .actions-container');
    if (!actionsBox || document.getElementById('gc-pro-copy-both-btn')) return;

    const btn = document.createElement('button');
    btn.id = 'gc-pro-copy-both-btn';
    btn.type = 'button';
    btn.title = 'Copiar Nome + URL da interação';
    btn.innerHTML = '🔗';
    btn.style.cssText = `
      width: 32px; height: 32px; margin-left: 6px; border-radius: 6px;
      border: 1px solid #cbd5e1; background: #e2e8f0; color: #1e293b;
      cursor: pointer; display: inline-flex; align-items: center; justify-content: center;
      font-size: 14px; transition: all .15s ease; vertical-align: middle;
    `;
    btn.onmouseenter = () => { btn.style.background = '#cbd5e1'; };
    btn.onmouseleave = () => { btn.style.background = '#e2e8f0'; };

    btn.onclick = async () => {
      const nameEl = document.querySelector('.selected-interaction-container #interaction-header-participant-name');
      const name = scrubPII(nameEl ? nameEl.textContent.trim() : '') || 'Interação';

      let url = window.location.href;
      const nativeCopy = document.querySelector('.selected-interaction-container .copy-action-button');
      if (nativeCopy) {
        nativeCopy.click();
        await new Promise(r => setTimeout(r, 140));
        try {
          const clip = await navigator.clipboard.readText();
          if (clip && /^https?:\/\//i.test(clip.trim())) url = clip.trim();
        } catch {}
      }

      await navigator.clipboard.writeText(`${name}\n${url}`);
      btn.innerHTML = '✓';
      btn.style.background = '#16a34a';
      btn.style.color = '#fff';
      btn.style.borderColor = '#16a34a';
      setTimeout(() => {
        btn.innerHTML = '🔗';
        btn.style.background = '#e2e8f0';
        btn.style.color = '#1e293b';
        btn.style.borderColor = '#cbd5e1';
      }, 1500);
    };

    actionsBox.appendChild(btn);
  };

  // ===== SHADOW DOM =====
  const host = document.createElement('div');
  host.id = 'gc-pro-dock-host';
  host.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:2147483647;font-family:Inter,system-ui,-apple-system,sans-serif;';
  document.body.appendChild(host);
  const shadow = host.attachShadow({ mode: 'open' });

  shadow.innerHTML = `
    <style>
      * { box-sizing: border-box; margin: 0; padding: 0; }
      @keyframes gradMove {
        0% { background-position: 0% 50%; }
        50% { background-position: 100% 50%; }
        100% { background-position: 0% 50%; }
      }
      @keyframes pulsePin {
        0%, 100% { box-shadow: 0 0 0 2px rgba(255,255,255,.85), 0 0 8px var(--accent); }
        50% { box-shadow: 0 0 0 3px #fff, 0 0 14px var(--accent); }
      }
      .anim-grad {
        background: var(--grad);
        background-size: 260% 260%;
        animation: gradMove 9s ease infinite;
      }

      /* RELÓGIO FLUTUANTE ARRASTÁVEL */
      .clock-pill {
        position: fixed; top: 14px; right: 22px; pointer-events: auto;
        background: var(--bg); color: var(--text); border: 1px solid var(--accent);
        border-radius: 99px; padding: 6px 13px; display: flex; align-items: center; gap: 8px;
        box-shadow: 0 6px 20px rgba(0,0,0,.45), 0 0 12px rgba(0,0,0,.2);
        cursor: grab; user-select: none; font-variant-numeric: tabular-nums;
      }
      .clock-pill:active { cursor: grabbing; }
      .clock-pill.hidden { display: none; }
      .clock-orb { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
      .clock-time { font-size: 13px; font-weight: 800; letter-spacing: .8px; color: var(--text); }

      /* DOCK CIRCULAR EMPILHADO */
      .fab-wrap {
        position: fixed; bottom: 22px; right: 22px; pointer-events: auto;
        display: flex; flex-direction: column-reverse; align-items: center; gap: 10px;
        user-select: none;
      }
      .fab-main {
        width: 52px; height: 52px; border-radius: 50%; border: 1px solid rgba(255,255,255,.22);
        color: #fff; font-size: 20px; cursor: grab; display: grid; place-items: center;
        box-shadow: 0 8px 24px rgba(0,0,0,.45); transition: transform .2s ease;
      }
      .fab-main:active { cursor: grabbing; }
      .fab-main.open { transform: rotate(45deg); }

      .fab-stack {
        display: flex; flex-direction: column; gap: 10px; align-items: center;
        opacity: 0; transform: translateY(14px) scale(.85); pointer-events: none;
        transition: all .22s cubic-bezier(.22,1,.36,1);
      }
      .fab-stack.open { opacity: 1; transform: translateY(0) scale(1); pointer-events: auto; }

      .fab-sub {
        width: 44px; height: 44px; border-radius: 50%; border: 1px solid var(--border);
        background: var(--bg); color: var(--text); font-size: 17px; cursor: pointer;
        display: grid; place-items: center; position: relative;
        box-shadow: 0 6px 16px rgba(0,0,0,.35); transition: all .18s ease;
      }
      .fab-sub:hover { border-color: var(--accent); transform: scale(1.08); }
      .fab-sub.active { border-color: var(--accent); box-shadow: 0 0 12px var(--accent); }
      .fab-sub::after {
        content: attr(data-tip); position: absolute; right: 54px; white-space: nowrap;
        background: var(--surface); color: var(--text); border: 1px solid var(--border);
        padding: 4px 8px; border-radius: 6px; font-size: 11px; font-weight: 600;
        opacity: 0; pointer-events: none; transition: opacity .15s;
      }
      .fab-sub:hover::after { opacity: 1; }

      /* PAINÉIS ARRASTÁVEIS E REDIMENSIONÁVEIS */
      .panel {
        position: fixed; width: 350px; height: 460px; min-width: 240px; min-height: 220px;
        max-width: 92vw; max-height: 90vh; pointer-events: auto;
        background: var(--bg); color: var(--text); border: 1px solid var(--border);
        border-radius: 14px; box-shadow: 0 16px 40px rgba(0,0,0,.5);
        display: none; flex-direction: column; overflow: hidden;
      }
      .panel.open { display: flex; }
      #panel-int, #panel-pip, #panel-met { resize: both; }
      #panel-ai { height: auto; max-height: 540px; }
      #panel-vis, #panel-cfg { height: auto; width: 320px; }
      #panel-pip { width: 460px; height: 420px; }
      #panel-met { width: 390px; height: 500px; }

      .p-head {
        display: flex; justify-content: space-between; align-items: center; flex-shrink: 0;
        padding: 10px 14px; cursor: grab; user-select: none; color: #fff;
        border-bottom: 1px solid rgba(255,255,255,.12);
      }
      .p-head:active { cursor: grabbing; }
      .p-title { font-size: 12.5px; font-weight: 700; letter-spacing: .3px; }
      .p-head-actions { display: flex; gap: 6px; align-items: center; }
      .p-close, .p-icon-btn {
        background: rgba(0,0,0,.25); border: none; color: #fff; width: 22px; height: 22px;
        border-radius: 50%; cursor: pointer; font-size: 12px; display: grid; place-items: center;
      }
      .p-close:hover, .p-icon-btn:hover { background: rgba(0,0,0,.45); }
      .p-body {
        padding: 12px 14px; flex: 1; min-height: 0; overflow-y: auto;
        display: flex; flex-direction: column; gap: 10px;
      }

      /* CRONÔMETRO NO TOPO */
      .status-box {
        background: var(--surface); border: 1px solid var(--border); border-radius: 9px;
        padding: 8px 11px; font-size: 12px; display: flex; justify-content: space-between; align-items: center;
        flex-shrink: 0;
      }
      .dot { width: 8px; height: 8px; border-radius: 50%; display: inline-block; margin-right: 6px; background: var(--muted); }
      .dot.live { background: var(--success); box-shadow: 0 0 8px var(--success); }
      #live-timer { font-size: 12px; font-variant-numeric: tabular-nums; }
      #live-timer.done { color: var(--success); font-size: 15px; }

      /* QUADRADOS DO CONTADOR */
      .stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; flex-shrink: 0; }
      .stat-sq {
        aspect-ratio: 1 / 1; border-radius: 12px; background: var(--surface);
        border: 1px solid var(--border); display: flex; flex-direction: column;
        align-items: center; justify-content: center; gap: 4px;
      }
      .stat-sq.primary { border-color: var(--accent); }
      .stat-sq .num { font-size: 24px; font-weight: 800; line-height: 1; color: var(--text); }
      .stat-sq.primary .num { color: var(--accent); }
      .stat-sq .lbl { font-size: 10px; font-weight: 600; color: var(--muted); text-transform: uppercase; letter-spacing: .5px; }

      /* CAIXA DO TMA */
      .tma-box {
        background: var(--surface); border: 1px solid var(--border); border-radius: 10px;
        padding: 8px 12px; display: flex; justify-content: space-between; align-items: center;
        flex-shrink: 0;
      }
      .tma-lbl { font-size: 11px; font-weight: 700; color: var(--text); text-transform: uppercase; letter-spacing: .4px; }
      .tma-num { font-size: 17px; font-weight: 800; color: var(--accent); font-variant-numeric: tabular-nums; }

      .list { display: flex; flex-direction: column; gap: 6px; flex: 1; min-height: 56px; overflow-y: auto; }
      .item {
        background: var(--surface); border: 1px solid var(--border); border-radius: 8px;
        padding: 7px 10px; display: flex; justify-content: space-between; align-items: center; font-size: 11.5px; gap: 8px;
      }
      .item strong { display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 220px; }
      .item small { color: var(--muted); display: block; font-size: 10.5px; margin-top: 2px; }
      .check-badge {
        width: 22px; height: 22px; border-radius: 50%; display: grid; place-items: center;
        background: rgba(34, 197, 94, .14); border: 1px solid var(--success);
        color: var(--success); font-size: 12px; font-weight: 800; flex-shrink: 0;
      }

      /* MÉTRICAS COM BARRINHA DE VIDA ADAPTADA AO VISUAL */
      .met-summary-bar {
        display: flex; justify-content: space-between; align-items: center;
        background: var(--surface); border: 1px solid var(--border); border-radius: 9px;
        padding: 8px 11px; flex-shrink: 0;
      }
      .met-pts-pill {
        font-size: 12px; font-weight: 800; color: var(--accent);
        background: var(--bg); border: 1px solid var(--border); padding: 3px 9px; border-radius: 99px;
      }
      .metrics-list { display: flex; flex-direction: column; gap: 9px; }
      .life-card {
        background: var(--surface); border: 1px solid var(--border); border-radius: 10px;
        padding: 10px 11px; display: flex; flex-direction: column; gap: 7px;
      }
      .life-card.in-target { border-color: var(--accent); box-shadow: inset 0 0 0 1px rgba(255,255,255,.06); }
      .life-top { display: flex; justify-content: space-between; align-items: center; gap: 8px; }
      .life-title { font-size: 12px; font-weight: 700; color: var(--text); }
      .life-val {
        font-size: 12px; font-weight: 800; color: var(--text);
        background: var(--bg); border: 1px solid var(--border); padding: 2px 7px; border-radius: 6px;
        flex-shrink: 0;
      }
      .life-val.ok { color: var(--accent); border-color: var(--accent); }

      .life-bar-wrap { position: relative; padding: 5px 0; }
      .life-bar {
        display: flex; width: 100%; height: 11px; border-radius: 99px; overflow: hidden;
        background: var(--bg); border: 1px solid var(--border); gap: 2px; padding: 1px;
      }
      .life-seg { flex: 1; height: 100%; border-radius: 99px; }
      .seg-0 { background: var(--accent); opacity: 0.16; }
      .seg-1 { background: var(--accent); opacity: 0.38; }
      .seg-2 { background: var(--accent); opacity: 0.68; }
      .seg-3 { background: var(--grad); background-size: 260% 260%; animation: gradMove 9s ease infinite; opacity: 1; }

      .life-pin {
        position: absolute; top: 50%; transform: translate(-50%, -50%);
        width: 14px; height: 14px; border-radius: 50%; background: #fff;
        border: 2.5px solid var(--accent); z-index: 3; animation: pulsePin 2.2s infinite;
      }

      .life-scales {
        display: flex; justify-content: space-between; align-items: center;
        font-size: 10px; color: var(--muted); gap: 6px;
      }
      .life-scales span strong { color: var(--text); font-weight: 600; }

      /* CONFIGURAÇÕES */
      .cfg-group {
        background: var(--surface); border: 1px solid var(--border); border-radius: 10px;
        padding: 10px 11px; display: flex; flex-direction: column; gap: 8px;
      }
      .cfg-title { font-size: 11.5px; font-weight: 700; color: var(--accent); text-transform: uppercase; letter-spacing: .4px; }
      .cfg-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
      .field-lbl { font-size: 11px; color: var(--muted); display: block; margin-bottom: 4px; }

      /* MINI TELA DASH PIP */
      .pip-frame { width: 100%; height: 100%; border: 0; background: #fff; flex: 1; }

      .btn {
        color: #fff; border: none; border-radius: 8px; padding: 8px 12px;
        font-size: 12px; font-weight: 600; cursor: pointer; transition: opacity .15s;
      }
      .btn:hover { opacity: .9; }
      .btn.sec { background: var(--surface); color: var(--text); border: 1px solid var(--border); }
      .btn.sec:hover { border-color: var(--accent); }
      .btn.rec { background: var(--danger); }
      .btn.sm { padding: 5px 9px; font-size: 11px; }
      .row { display: flex; gap: 6px; align-items: center; flex-shrink: 0; flex-wrap: wrap; }

      textarea, input {
        width: 100%; background: var(--bg); color: var(--text); border: 1px solid var(--border);
        border-radius: 8px; padding: 7px 9px; font-size: 12px; font-family: inherit; resize: vertical;
      }
      textarea:focus, input:focus { outline: none; border-color: var(--accent); }
      .note { font-size: 11px; color: var(--muted); line-height: 1.4; }
      .summary-out {
        background: var(--surface); border: 1px solid var(--border); border-radius: 8px;
        padding: 10px; font-size: 12px; line-height: 1.5; white-space: pre-wrap; min-height: 68px;
      }
      .theme-card {
        display: flex; justify-content: space-between; align-items: center; padding: 10px 12px;
        border-radius: 10px; border: 1px solid var(--border); background: var(--surface); cursor: pointer;
      }
      .theme-card.selected { border-color: var(--accent); box-shadow: 0 0 0 1px var(--accent); }
      .preview-orb { width: 26px; height: 26px; border-radius: 50%; border: 1px solid rgba(255,255,255,.25); }
      details summary { font-size: 11px; color: var(--muted); cursor: pointer; margin-bottom: 6px; }
    </style>

    <!-- RELÓGIO FLUTUANTE (H:M:S) -->
    <div id="gc-clock" class="clock-pill" title="Arraste para mover o relógio">
      <span class="clock-orb anim-grad"></span>
      <span id="gc-clock-time" class="clock-time">00:00:00</span>
    </div>

    <!-- PAINEL 1: INTERAÇÕES -->
    <div id="panel-int" class="panel open" style="bottom: 88px; right: 22px;">
      <div class="p-head anim-grad" data-drag="panel-int">
        <span class="p-title">Interações</span>
        <button class="p-close" data-toggle="panel-int">✕</button>
      </div>
      <div class="p-body">
        <div class="status-box">
          <div style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:230px;">
            <span id="live-dot" class="dot"></span><span id="live-label">Aguardando conversa...</span>
          </div>
          <strong id="live-timer">00:00</strong>
        </div>

        <div class="stats-grid">
          <div class="stat-sq primary">
            <span id="sq-total" class="num">0</span>
            <span class="lbl">Total</span>
          </div>
          <div class="stat-sq">
            <span id="sq-chat" class="num">0</span>
            <span class="lbl">Chat</span>
          </div>
          <div class="stat-sq">
            <span id="sq-voice" class="num">0</span>
            <span class="lbl">Voz</span>
          </div>
        </div>

        <!-- CONTADOR DE TMA -->
        <div class="tma-box" title="(Fala/Interação + Espera/Hold + Tabulação pós-atendimento) ÷ Total de atendimentos finalizados">
          <div>
            <span class="tma-lbl">TMA Calculado</span>
            <small id="tma-sub" class="note" style="display:block;font-size:10px;">0 atendimentos finalizados</small>
          </div>
          <strong id="tma-val" class="tma-num">00:00</strong>
        </div>

        <div id="int-list" class="list"></div>

        <div class="row" style="justify-content: space-between; border-top: 1px solid var(--border); padding-top: 8px;">
          <div class="row">
            <button id="btn-open-pip" class="btn anim-grad sm">Dash PIP</button>
            <button class="btn sec sm" data-toggle="panel-met">Métricas</button>
          </div>
          <button id="btn-clear-int" class="btn sec sm">Zerar Dia</button>
        </div>
      </div>
    </div>

    <!-- MINI TELA FLUTUANTE: DASH PIP -->
    <div id="panel-pip" class="panel" style="bottom: 88px; right: 386px;">
      <div class="p-head anim-grad" data-drag="panel-pip">
        <span class="p-title">Dash PIP • Verificação de Meta</span>
        <div class="p-head-actions">
          <button id="btn-pip-reload" class="p-icon-btn" title="Recarregar">↻</button>
          <button id="btn-pip-ext" class="p-icon-btn" title="Abrir em nova aba">↗</button>
          <button class="p-close" data-toggle="panel-pip">✕</button>
        </div>
      </div>
      <iframe id="pip-iframe" class="pip-frame" sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"></iframe>
    </div>

    <!-- PAINEL: MÉTRICAS -->
    <div id="panel-met" class="panel" style="bottom: 88px; right: 386px;">
      <div class="p-head anim-grad" data-drag="panel-met">
        <span class="p-title">Métricas</span>
        <div class="p-head-actions">
          <button id="btn-met-sync" class="p-icon-btn" title="Atualizar agora">↻</button>
          <button class="p-close" data-toggle="panel-met">✕</button>
        </div>
      </div>
      <div class="p-body">
        <div class="met-summary-bar">
          <span id="met-status" class="note">Carregando indicadores...</span>
          <span id="met-pts" class="met-pts-pill">💎 -- pts</span>
        </div>
        <div id="met-list" class="metrics-list"></div>
      </div>
    </div>

    <!-- PAINEL: IA RESUMO -->
    <div id="panel-ai" class="panel" style="bottom: 88px; right: 386px;">
      <div class="p-head anim-grad" data-drag="panel-ai">
        <span class="p-title">✨ Resumo IA • gpt-oss-20b</span>
        <button class="p-close" data-toggle="panel-ai">✕</button>
      </div>
      <div class="p-body">
        <details>
          <summary>⚙ Configurar API (Groq / OpenRouter / OpenAI)</summary>
          <div style="display:flex;flex-direction:column;gap:6px;margin-bottom:6px;">
            <input id="ai-url" placeholder="Endpoint URL" />
            <input id="ai-key" type="password" placeholder="API Key (salva localmente)" />
            <button id="ai-save-cfg" class="btn sec" style="padding:5px;">Salvar</button>
          </div>
        </details>
        <div class="row">
          <button id="btn-rec" class="btn sec" style="flex:1;">🎙 Gravar Voz</button>
          <button id="btn-clear-txt" class="btn sec">Limpar</button>
        </div>
        <textarea id="ai-input" rows="5" placeholder="Transcreva por voz ou cole o atendimento. A IA identifica Atendente, Cliente e se a ligação caiu ou foi finalizada (sem salvar dados pessoais)."></textarea>
        <button id="btn-summarize" class="btn anim-grad">Gerar Resumo em 1 Mensagem</button>
        <div id="ai-output" class="summary-out">O resumo estruturado aparecerá aqui.</div>
        <button id="btn-copy-ai" class="btn sec">Copiar Resumo</button>
      </div>
    </div>

    <!-- PAINEL: VISUAIS -->
    <div id="panel-vis" class="panel" style="bottom: 240px; right: 82px;">
      <div class="p-head anim-grad" data-drag="panel-vis">
        <span class="p-title">🎨 Visuais Tecnológicos</span>
        <button class="p-close" data-toggle="panel-vis">✕</button>
      </div>
      <div class="p-body" id="theme-list"></div>
    </div>

    <!-- PAINEL: CONFIGURAÇÕES (ENGRENAGEM) -->
    <div id="panel-cfg" class="panel" style="bottom: 200px; right: 82px;">
      <div class="p-head anim-grad" data-drag="panel-cfg">
        <span class="p-title">⚙️ Configurações</span>
        <button class="p-close" data-toggle="panel-cfg">✕</button>
      </div>
      <div class="p-body">
        <div class="cfg-group">
          <span class="cfg-title">Editar Contagem Manual</span>
          <div class="cfg-grid">
            <div>
              <label class="field-lbl" for="cfg-chat-num">Interações Chat</label>
              <input id="cfg-chat-num" type="number" min="0" value="0" />
            </div>
            <div>
              <label class="field-lbl" for="cfg-voice-num">Interações Voz</label>
              <input id="cfg-voice-num" type="number" min="0" value="0" />
            </div>
          </div>
          <div class="row" style="justify-content: space-between;">
            <span id="cfg-msg" class="note">O Total soma Chat + Voz.</span>
            <button id="btn-cfg-apply" class="btn anim-grad sm">Aplicar</button>
          </div>
        </div>

        <div class="cfg-group">
          <span class="cfg-title">Relógio em Tela</span>
          <div class="row" style="justify-content: space-between;">
            <span class="note">Exibir relógio flutuante (h:m:s)</span>
            <button id="btn-toggle-clock" class="btn sec sm">Ocultar</button>
          </div>
        </div>

        <div class="cfg-group">
          <span class="cfg-title">Cálculo de TMA</span>
          <span class="note">Fórmula: (Interação + Espera + Tabulação) ÷ Atendimentos encerrados e tabulados.</span>
          <button id="btn-reset-tma" class="btn sec sm" style="align-self:flex-start;">Zerar Histórico de TMA</button>
        </div>
      </div>
    </div>

    <!-- BOTÃO PRINCIPAL REDONDO + PILHA EXPANSÍVEL -->
    <div id="fab-wrap" class="fab-wrap">
      <button id="fab-main" class="fab-main anim-grad" title="Clique para abrir | Arraste para mover">✦</button>
      <div id="fab-stack" class="fab-stack">
        <button class="fab-sub active" data-toggle="panel-int" data-tip="Interações">📊</button>
        <button class="fab-sub" data-toggle="panel-met" data-tip="Métricas">📈</button>
        <button class="fab-sub" data-toggle="panel-ai" data-tip="Resumo IA">✨</button>
        <button class="fab-sub" data-toggle="panel-vis" data-tip="Visuais">🎨</button>
        <button class="fab-sub" data-toggle="panel-cfg" data-tip="Configurações">⚙️</button>
      </div>
    </div>
  `;

  // ===== ARRASTAR (PAINÉIS, BOTÕES E RELÓGIO) =====
  const makeDraggable = (el, handle, onClickIfNoDrag) => {
    let startX, startY, origLeft, origTop, moved = false;
    handle.addEventListener('mousedown', (e) => {
      if (e.target.closest('button.p-close, button.p-icon-btn')) return;
      const rect = el.getBoundingClientRect();
      startX = e.clientX; startY = e.clientY;
      origLeft = rect.left; origTop = rect.top;
      moved = false;

      const onMove = (ev) => {
        const dx = ev.clientX - startX;
        const dy = ev.clientY - startY;
        if (Math.abs(dx) > 4 || Math.abs(dy) > 4) moved = true;
        if (!moved) return;
        el.style.right = 'auto';
        el.style.bottom = 'auto';
        el.style.left = Math.max(6, Math.min(window.innerWidth - rect.width - 6, origLeft + dx)) + 'px';
        el.style.top = Math.max(6, Math.min(window.innerHeight - rect.height - 6, origTop + dy)) + 'px';
      };

      const onUp = () => {
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
        if (!moved && onClickIfNoDrag) onClickIfNoDrag();
      };

      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
    });
  };

  shadow.querySelectorAll('[data-drag]').forEach(head => {
    makeDraggable(shadow.getElementById(head.dataset.drag), head);
  });

  const clockEl = shadow.getElementById('gc-clock');
  const clockTimeEl = shadow.getElementById('gc-clock-time');
  makeDraggable(clockEl, clockEl);

  const fabWrap = shadow.getElementById('fab-wrap');
  const fabMain = shadow.getElementById('fab-main');
  const fabStack = shadow.getElementById('fab-stack');
  makeDraggable(fabWrap, fabMain, () => {
    menuOpen = !menuOpen;
    fabMain.classList.toggle('open', menuOpen);
    fabStack.classList.toggle('open', menuOpen);
  });

  // ===== TOGGLE INDEPENDENTE DOS PAINÉIS =====
  const togglePanelById = (id) => {
    const panel = shadow.getElementById(id);
    if (!panel) return;
    const isOpen = panel.classList.toggle('open');
    const subBtn = shadow.querySelector(`.fab-sub[data-toggle="${id}"]`);
    if (subBtn) subBtn.classList.toggle('active', isOpen);
    if (id === 'panel-met' && isOpen) syncMetricsAPI();
    if (id === 'panel-cfg' && isOpen) syncConfigInputs();
  };

  shadow.querySelectorAll('[data-toggle]').forEach(btn => {
    btn.addEventListener('click', () => togglePanelById(btn.dataset.toggle));
  });

  // ===== CONFIGURAÇÕES (EDIÇÃO MANUAL + RELÓGIO + TMA) =====
  const getAutoCounts = () => {
    const valid = Object.values(interactions).filter(v => v.counted);
    return {
      chat: valid.filter(v => v.channel === 'chat').length,
      voice: valid.filter(v => v.channel === 'voice').length
    };
  };

  const syncConfigInputs = () => {
    const auto = getAutoCounts();
    shadow.getElementById('cfg-chat-num').value = Math.max(0, auto.chat + (adjustments.chatOffset || 0));
    shadow.getElementById('cfg-voice-num').value = Math.max(0, auto.voice + (adjustments.voiceOffset || 0));
    shadow.getElementById('btn-toggle-clock').textContent = config.showClock ? 'Ocultar' : 'Mostrar';
    clockEl.classList.toggle('hidden', !config.showClock);
  };

  shadow.getElementById('btn-cfg-apply').onclick = () => {
    const auto = getAutoCounts();
    const desiredChat = Math.max(0, parseInt(shadow.getElementById('cfg-chat-num').value, 10) || 0);
    const desiredVoice = Math.max(0, parseInt(shadow.getElementById('cfg-voice-num').value, 10) || 0);
    adjustments.chatOffset = desiredChat - auto.chat;
    adjustments.voiceOffset = desiredVoice - auto.voice;
    saveAdjustments();
    renderInteractions();
    const msg = shadow.getElementById('cfg-msg');
    msg.textContent = 'Números atualizados ✓';
    setTimeout(() => { msg.textContent = 'O Total soma Chat + Voz.'; }, 2000);
  };

  shadow.getElementById('btn-toggle-clock').onclick = () => {
    config.showClock = !config.showClock;
    saveConfig();
    syncConfigInputs();
  };

  shadow.getElementById('btn-reset-tma').onclick = () => {
    if (confirm('Zerar apenas os tempos acumulados de TMA de hoje?')) {
      Object.values(interactions).forEach(v => {
        v.tmaSeconds = 0;
        v.tmaFinalized = false;
        v.missingTicks = 0;
      });
      saveInteractions();
      renderInteractions();
    }
  };

  // ===== DASH PIP =====
  const pipIframe = shadow.getElementById('pip-iframe');
  shadow.getElementById('btn-open-pip').onclick = () => {
    if (!pipLoaded) {
      pipIframe.src = DASH_PIP_URL;
      pipLoaded = true;
    }
    togglePanelById('panel-pip');
  };
  shadow.getElementById('btn-pip-reload').onclick = () => {
    pipIframe.src = DASH_PIP_URL;
    pipLoaded = true;
  };
  shadow.getElementById('btn-pip-ext').onclick = () => {
    window.open(DASH_PIP_URL, '_blank', 'noopener,noreferrer');
  };

  // ===== RENDERIZAÇÃO DAS MÉTRICAS =====
  const renderMetrics = () => {
    const statusEl = shadow.getElementById('met-status');
    const ptsEl = shadow.getElementById('met-pts');
    const listEl = shadow.getElementById('met-list');

    ptsEl.textContent = `💎 ${cachedMetrics.points ?? '--'} pts`;

    if (!cachedMetrics.items || !cachedMetrics.items.length) {
      statusEl.textContent = 'Buscando indicadores...';
      listEl.innerHTML = '<div class="note" style="text-align:center;padding:24px 8px;">Aguardando dados da API do Genesys...</div>';
      return;
    }

    statusEl.textContent = `${cachedMetrics.items.length} indicadores • ${cachedMetrics.updatedAt}`;
    listEl.innerHTML = cachedMetrics.items.map((m) => `
      <div class="life-card ${m.inTarget ? 'in-target' : ''}">
        <div class="life-top">
          <span class="life-title">${m.title}</span>
          <span class="life-val ${m.inTarget ? 'ok' : ''}">${m.valueFormatted}</span>
        </div>
        <div class="life-bar-wrap">
          <div class="life-bar">
            ${m.segments.map(s => `<div class="life-seg ${s}"></div>`).join('')}
          </div>
          <div class="life-pin" style="left:${m.pct.toFixed(1)}%;" title="Você está aqui: ${m.valueFormatted}"></div>
        </div>
        <div class="life-scales">
          <span>Mín: <strong>${m.minLbl}</strong></span>
          <span>Méd/Alvo: <strong>${m.midLbl}</strong></span>
          <span>Máx: <strong>${m.maxLbl}</strong></span>
        </div>
      </div>
    `).join('');
  };

  shadow.getElementById('btn-met-sync').onclick = () => syncMetricsAPI();

  // ===== TEMAS =====
  const applyTheme = (key) => {
    const t = THEMES[key] || THEMES.deepspace;
    config.theme = key;
    saveConfig();
    const s = host.style;
    s.setProperty('--bg', t.bg);
    s.setProperty('--surface', t.surface);
    s.setProperty('--border', t.border);
    s.setProperty('--text', t.text);
    s.setProperty('--muted', t.muted);
    s.setProperty('--grad', t.grad);
    s.setProperty('--accent', t.accent);
    s.setProperty('--success', t.success);
    s.setProperty('--danger', t.danger);
    renderThemes();
  };

  const renderThemes = () => {
    const box = shadow.getElementById('theme-list');
    box.innerHTML = '';
    Object.entries(THEMES).forEach(([k, t]) => {
      const card = document.createElement('div');
      card.className = 'theme-card' + (config.theme === k ? ' selected' : '');
      card.innerHTML = `
        <div>
          <strong style="font-size:12px;">${t.name}</strong>
          <div class="note">${t.desc}</div>
        </div>
        <div class="preview-orb anim-grad" style="background:${t.grad};background-size:260% 260%;"></div>`;
      card.onclick = () => applyTheme(k);
      box.appendChild(card);
    });
  };

  // ===== RENDERIZAÇÃO DE INTERAÇÕES + TMA =====
  const renderInteractions = () => {
    const auto = getAutoCounts();
    const chats = Math.max(0, auto.chat + (adjustments.chatOffset || 0));
    const voices = Math.max(0, auto.voice + (adjustments.voiceOffset || 0));
    const total = chats + voices;

    shadow.getElementById('sq-total').textContent = total;
    shadow.getElementById('sq-chat').textContent = chats;
    shadow.getElementById('sq-voice').textContent = voices;

    // Cálculo do TMA: (Interação + Espera + Tabulação) ÷ Total de atendimentos finalizados
    const finalizedForTma = Object.values(interactions).filter(v => v.tmaFinalized && (v.tmaSeconds || 0) >= 10);
    const totalTmaSec = finalizedForTma.reduce((acc, v) => acc + (v.tmaSeconds || 0), 0);
    const avgTma = finalizedForTma.length ? Math.round(totalTmaSec / finalizedForTma.length) : 0;

    shadow.getElementById('tma-val').textContent = fmtTime(avgTma);
    shadow.getElementById('tma-sub').textContent = `${finalizedForTma.length} ${finalizedForTma.length === 1 ? 'atendimento finalizado' : 'atendimentos finalizados'}`;

    const valid = Object.entries(interactions).filter(([, v]) => v.counted);
    const list = shadow.getElementById('int-list');
    if (!valid.length) {
      list.innerHTML = '<div class="note" style="text-align:center;padding:12px 0;">Nenhuma interação atingiu 1m 10s hoje.</div>';
      return;
    }
    list.innerHTML = valid
      .sort((a, b) => b[1].countedTs - a[1].countedTs)
      .map(([, v]) => `
        <div class="item">
          <div style="min-width:0;">
            <strong title="${v.name}">${v.channel === 'voice' ? '📞' : '💬'} ${v.name}</strong>
            <small>${v.channel === 'voice' ? 'Voz' : 'Chat'} • ${v.countedAt}${v.tmaFinalized ? ' • TMA ' + fmtTime(v.tmaSeconds) : ' • Em andamento'}</small>
          </div>
          <span class="check-badge" title="Contabilizada">✓</span>
        </div>`).join('');
  };

  shadow.getElementById('btn-clear-int').onclick = () => {
    if (confirm('Zerar a contagem de interações e TMA de hoje?')) {
      interactions = {};
      adjustments = { chatOffset: 0, voiceOffset: 0 };
      saveInteractions();
      saveAdjustments();
      document.querySelectorAll('.gc-pro-card-timer').forEach(el => el.remove());
      renderInteractions();
      syncConfigInputs();
    }
  };

  // ===== MONITORAMENTO (1s): RELÓGIO + INTERAÇÕES + TMA =====
  const updateClock = () => {
    clockTimeEl.textContent = new Date().toLocaleTimeString('pt-BR', {
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
  };

  let tickCount = 0;
  window.__gcProInterval = setInterval(() => {
    tickCount += 1;
    updateClock();
    ensureCopyBothButton();

    if (tickCount % 180 === 0) syncMetricsAPI();

    const active = detectActiveInteraction();
    const rosterText = getRosterTextSnapshot();
    const dot = shadow.getElementById('live-dot');
    const lbl = shadow.getElementById('live-label');
    const tmr = shadow.getElementById('live-timer');

    // Registra ou atualiza a interação ativa
    if (active) {
      if (!interactions[active.key]) {
        interactions[active.key] = {
          name: active.name,
          rawName: active.rawName,
          channel: active.channel,
          seconds: 0,
          counted: false,
          countedAt: null,
          countedTs: 0,
          tmaSeconds: 0,
          tmaFinalized: false,
          missingTicks: 0
        };
      }
      const rec = interactions[active.key];
      rec.name = active.name;
      rec.rawName = active.rawName || rec.rawName;

      if (!rec.counted) {
        rec.seconds += 1;
        if (rec.seconds >= THRESHOLD_SEC) {
          rec.counted = true;
          rec.countedAt = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
          rec.countedTs = Date.now();
        }
      }

      updateCardTimerBadge(active.card, rec);

      dot.classList.add('live');
      if (rec.counted) {
        lbl.textContent = `${active.channel === 'voice' ? '📞' : '💬'} ${active.name}`;
        tmr.textContent = '✓';
        tmr.classList.add('done');
      } else {
        lbl.textContent = `${active.channel === 'voice' ? '📞' : '💬'} ${active.name}`;
        tmr.textContent = fmtTime(rec.seconds);
        tmr.classList.remove('done');
      }
    } else {
      dot.classList.remove('live');
      tmr.classList.remove('done');
      lbl.textContent = 'Pausado / Sem conversa ativa';
      tmr.textContent = '00:00';
    }

    // Atualiza o TMA de todos os atendimentos em andamento (Fala/Interação + Hold + Tabulação)
    // Para automaticamente quando o chamado é encerrado e tabulado (sai da lista de conversas ativas)
    Object.entries(interactions).forEach(([key, rec]) => {
      if (rec.tmaFinalized) return;
      const isCurrentlySelected = active && active.key === key;
      const hint = (rec.rawName || rec.name || '').slice(0, 12);
      const stillInRoster = hint && rosterText.includes(hint);

      if (isCurrentlySelected || stillInRoster) {
        rec.tmaSeconds = (rec.tmaSeconds || 0) + 1;
        rec.missingTicks = 0;
      } else {
        rec.missingTicks = (rec.missingTicks || 0) + 1;
        if (rec.missingTicks >= 3) {
          rec.tmaFinalized = true;
        }
      }
    });

    saveInteractions();
    renderInteractions();
  }, 1000);

  // ===== IA RESUMO + VOZ =====
  const urlIn = shadow.getElementById('ai-url');
  const keyIn = shadow.getElementById('ai-key');
  const txtIn = shadow.getElementById('ai-input');
  const outEl = shadow.getElementById('ai-output');
  urlIn.value = config.apiUrl;
  keyIn.value = config.apiKey;

  shadow.getElementById('ai-save-cfg').onclick = () => {
    config.apiUrl = urlIn.value.trim();
    config.apiKey = keyIn.value.trim();
    saveConfig();
    outEl.textContent = 'Configuração salva.';
  };

  shadow.getElementById('btn-clear-txt').onclick = () => { txtIn.value = ''; };

  const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
  let recognition = null, isRecording = false;
  const btnRec = shadow.getElementById('btn-rec');

  if (SpeechRec) {
    recognition = new SpeechRec();
    recognition.lang = 'pt-BR';
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.onresult = (e) => {
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) {
          txtIn.value += (txtIn.value ? ' ' : '') + e.results[i][0].transcript.trim();
        }
      }
    };
    recognition.onend = () => { if (isRecording) recognition.start(); };
  }

  btnRec.onclick = () => {
    if (!recognition) {
      outEl.textContent = 'Navegador sem suporte a transcrição nativa (use Chrome ou Edge).';
      return;
    }
    if (!isRecording) {
      isRecording = true;
      recognition.start();
      btnRec.textContent = '⏹ Parar Gravação';
      btnRec.classList.add('rec');
    } else {
      isRecording = false;
      recognition.stop();
      btnRec.textContent = '🎙 Gravar Voz';
      btnRec.classList.remove('rec');
    }
  };

  shadow.getElementById('btn-summarize').onclick = async () => {
    const raw = txtIn.value.trim();
    if (!raw) { outEl.textContent = 'Grave ou cole o atendimento antes de resumir.'; return; }
    if (!config.apiKey) { outEl.textContent = 'Informe sua API Key na configuração acima.'; return; }

    const safeText = scrubPII(raw);
    outEl.textContent = 'Analisando papéis e gerando resumo seguro...';

    try {
      const res = await fetch(config.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + config.apiKey
        },
        body: JSON.stringify({
          model: config.model,
          temperature: 0.2,
          messages: [
            {
              role: 'system',
              content: 'Você é um analista de atendimento. Analise a transcrição e gere UMA ÚNICA mensagem objetiva em português resumindo o atendimento. REGRAS OBRIGATÓRIAS: 1) Identifique claramente o que o Cliente solicitou/relatou e o que o Atendente orientou/executou. 2) Identifique e informe explicitamente se a ligação/atendimento foi finalizado normalmente ou se caiu/foi interrompido abruptamente. 3) NUNCA inclua ou guarde dados pessoais do cliente (nome, CPF, telefone, e-mail, endereço ou protocolo sensível).'
            },
            { role: 'user', content: safeText }
          ]
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || 'Erro na API');
      outEl.textContent = data.choices[0].message.content.trim();
    } catch (err) {
      outEl.textContent = 'Erro: ' + err.message;
    }
  };

  shadow.getElementById('btn-copy-ai').onclick = () => {
    navigator.clipboard.writeText(outEl.textContent);
    const btn = shadow.getElementById('btn-copy-ai');
    btn.textContent = 'Copiado!';
    setTimeout(() => btn.textContent = 'Copiar Resumo', 1500);
  };

  // ===== INICIALIZAÇÃO =====
  applyTheme(config.theme);
  updateClock();
  syncConfigInputs();
  renderInteractions();
  renderMetrics();
  syncMetricsAPI();
})();
