(() => {
  if (document.getElementById('gc-pro-dock-host')) {
    document.getElementById('gc-pro-dock-host').remove();
    if (window.__gcProInterval) clearInterval(window.__gcProInterval);
    document.querySelectorAll('.gc-pro-card-timer, #gc-pro-copy-both-btn').forEach(el => el.remove());
  }

  // ===== CONFIGURAÇÕES E STORAGE =====
  const TODAY_KEY = 'gc_pro_interactions_v3_' + new Date().toISOString().slice(0, 10);
  const CFG_KEY = 'gc_pro_config_v3';
  const THRESHOLD_SEC = 70; // 1m 10s

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

  let config = Object.assign({
    theme: 'deepspace',
    apiUrl: 'https://api.groq.com/openai/v1/chat/completions',
    apiKey: '',
    model: 'openai/gpt-oss-20b'
  }, JSON.parse(localStorage.getItem(CFG_KEY) || '{}'));

  let interactions = JSON.parse(localStorage.getItem(TODAY_KEY) || '{}');
  let menuOpen = false;

  const saveConfig = () => localStorage.setItem(CFG_KEY, JSON.stringify(config));
  const saveInteractions = () => localStorage.setItem(TODAY_KEY, JSON.stringify(interactions));

  // ===== PRIVACIDADE E UTILITÁRIOS =====
  const hashStr = (str) => {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h += (h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24);
    }
    return 'ATD-' + (h >>> 0).toString(36).toUpperCase().slice(0, 6);
  };

  // Remove dados sensíveis (CPF, CNPJ, tel, e-mail, CEP) mantendo o nome da interação
  const scrubPII = (text) => (text || '')
    .replace(/\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g, '[CPF_OCULTO]')
    .replace(/\b\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}\b/g, '[CNPJ_OCULTO]')
    .replace(/\b(?:\+?55\s?)?(?:\(?\d{2}\)?\s?)?(?:9\d{4}|\d{4})-?\d{4}\b/g, '[TEL_OCULTO]')
    .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-z]{2,}/gi, '[EMAIL_OCULTO]')
    .replace(/\b\d{5}-?\d{3}\b/g, '[CEP_OCULTO]')
    .replace(/\b\d{2}\/\d{2}\/\d{4}\b/g, '[DATA_OCULTA]')
    .trim();

  const fmtTime = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  // ===== DETECÇÃO GENESYS (CARD LATERAL + CABEÇALHO) =====
  const findSelectedRosterCard = (rawName) => {
    const list = document.querySelector('.acd-interactions-list .interactions');
    if (!list) return null;
    let card = list.querySelector('[aria-selected="true"], .selected, .active');
    if (!card && rawName) {
      const candidates = Array.from(list.children);
      card = candidates.find(el => el.textContent && el.textContent.includes(rawName.slice(0, 12)));
    }
    return card || null;
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

  // ===== INJEÇÃO 1: CRONÔMETRO PEQUENO EM CIMA DO NOME NO CARD (FOTO 1) =====
  const updateCardTimerBadge = (card, rec) => {
    if (!card) return;
    if (getComputedStyle(card).position === 'static') {
      card.style.position = 'relative';
    }
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

  // ===== INJEÇÃO 2: BOTÃO COPIAR NOME + URL AO LADO DOS BOTÕES DA FOTO 2 =====
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
      // Se existir o botão nativo de copiar URL da interação, tenta capturar a URL exata dele
      const nativeCopy = document.querySelector('.selected-interaction-container .copy-action-button');
      if (nativeCopy) {
        nativeCopy.click();
        await new Promise(r => setTimeout(r, 140));
        try {
          const clip = await navigator.clipboard.readText();
          if (clip && /^https?:\/\//i.test(clip.trim())) url = clip.trim();
        } catch (_) {}
      }

      const payload = `${name}\n${url}`;
      await navigator.clipboard.writeText(payload);

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
      .anim-grad {
        background: var(--grad);
        background-size: 260% 260%;
        animation: gradMove 9s ease infinite;
      }

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
        position: fixed; width: 350px; height: 420px; min-width: 240px; min-height: 220px;
        max-width: 90vw; max-height: 90vh; pointer-events: auto;
        background: var(--bg); color: var(--text); border: 1px solid var(--border);
        border-radius: 14px; box-shadow: 0 16px 40px rgba(0,0,0,.5);
        display: none; flex-direction: column; overflow: hidden;
      }
      .panel.open { display: flex; }
      #panel-int { resize: both; }
      #panel-ai { height: auto; max-height: 540px; }
      #panel-vis { height: auto; }

      .p-head {
        display: flex; justify-content: space-between; align-items: center; flex-shrink: 0;
        padding: 11px 14px; cursor: grab; user-select: none; color: #fff;
        border-bottom: 1px solid rgba(255,255,255,.12);
      }
      .p-head:active { cursor: grabbing; }
      .p-title { font-size: 12.5px; font-weight: 700; letter-spacing: .3px; }
      .p-close {
        background: rgba(0,0,0,.25); border: none; color: #fff; width: 22px; height: 22px;
        border-radius: 50%; cursor: pointer; font-size: 12px; display: grid; place-items: center;
      }
      .p-close:hover { background: rgba(0,0,0,.45); }
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

      /* QUADRADOS DO CONTADOR (MESMO TAMANHO) */
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

      .list { display: flex; flex-direction: column; gap: 6px; flex: 1; min-height: 60px; overflow-y: auto; }
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

      .btn {
        color: #fff; border: none; border-radius: 8px; padding: 8px 12px;
        font-size: 12px; font-weight: 600; cursor: pointer; transition: opacity .15s;
      }
      .btn:hover { opacity: .9; }
      .btn.sec { background: var(--surface); color: var(--text); border: 1px solid var(--border); }
      .btn.sec:hover { border-color: var(--accent); }
      .btn.rec { background: var(--danger); }
      .row { display: flex; gap: 8px; align-items: center; flex-shrink: 0; }

      textarea, input {
        width: 100%; background: var(--surface); color: var(--text); border: 1px solid var(--border);
        border-radius: 8px; padding: 8px 10px; font-size: 12px; font-family: inherit; resize: vertical;
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

    <!-- PAINEL 1: INTERAÇÕES (FIXO E REDIMENSIONÁVEL) -->
    <div id="panel-int" class="panel open" style="bottom: 88px; right: 22px;">
      <div class="p-head anim-grad" data-drag="panel-int">
        <span class="p-title">📊 Interações do Dia (≥ 1m 10s)</span>
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

        <div id="int-list" class="list"></div>

        <div class="row" style="justify-content: space-between;">
          <span class="note">Sem duplicidade • Arraste o canto p/ redimensionar</span>
          <button id="btn-clear-int" class="btn sec" style="padding:4px 8px;font-size:11px;">Zerar Dia</button>
        </div>
      </div>
    </div>

    <!-- PAINEL 2: IA RESUMO -->
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

    <!-- PAINEL 3: VISUAIS -->
    <div id="panel-vis" class="panel" style="bottom: 240px; right: 82px; width: 310px;">
      <div class="p-head anim-grad" data-drag="panel-vis">
        <span class="p-title">🎨 Visuais Tecnológicos</span>
        <button class="p-close" data-toggle="panel-vis">✕</button>
      </div>
      <div class="p-body" id="theme-list"></div>
    </div>

    <!-- BOTÃO PRINCIPAL REDONDO + PILHA EXPANSÍVEL -->
    <div id="fab-wrap" class="fab-wrap">
      <button id="fab-main" class="fab-main anim-grad" title="Clique para abrir | Arraste para mover">✦</button>
      <div id="fab-stack" class="fab-stack">
        <button class="fab-sub active" data-toggle="panel-int" data-tip="Interações">📊</button>
        <button class="fab-sub" data-toggle="panel-ai" data-tip="Resumo IA">✨</button>
        <button class="fab-sub" data-toggle="panel-vis" data-tip="Visuais">🎨</button>
      </div>
    </div>
  `;

  // ===== ARRASTAR (PAINÉIS E BOTÕES) =====
  const makeDraggable = (el, handle, onClickIfNoDrag) => {
    let startX, startY, origLeft, origTop, moved = false;
    handle.addEventListener('mousedown', (e) => {
      if (e.target.closest('button.p-close')) return;
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

  const fabWrap = shadow.getElementById('fab-wrap');
  const fabMain = shadow.getElementById('fab-main');
  const fabStack = shadow.getElementById('fab-stack');
  makeDraggable(fabWrap, fabMain, () => {
    menuOpen = !menuOpen;
    fabMain.classList.toggle('open', menuOpen);
    fabStack.classList.toggle('open', menuOpen);
  });

  // ===== TOGGLE INDEPENDENTE DOS PAINÉIS =====
  shadow.querySelectorAll('[data-toggle]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.toggle;
      const panel = shadow.getElementById(id);
      const isOpen = panel.classList.toggle('open');
      const subBtn = shadow.querySelector(`.fab-sub[data-toggle="${id}"]`);
      if (subBtn) subBtn.classList.toggle('active', isOpen);
    });
  });

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

  // ===== RENDERIZAÇÃO DE INTERAÇÕES =====
  const renderInteractions = () => {
    const valid = Object.entries(interactions).filter(([, v]) => v.counted);
    const chats = valid.filter(([, v]) => v.channel === 'chat').length;
    const voices = valid.filter(([, v]) => v.channel === 'voice').length;

    shadow.getElementById('sq-total').textContent = valid.length;
    shadow.getElementById('sq-chat').textContent = chats;
    shadow.getElementById('sq-voice').textContent = voices;

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
            <small>${v.channel === 'voice' ? 'Voz' : 'Chat'} • ${v.countedAt}</small>
          </div>
          <span class="check-badge" title="Contabilizada">✓</span>
        </div>`).join('');
  };

  shadow.getElementById('btn-clear-int').onclick = () => {
    if (confirm('Zerar a contagem de interações de hoje?')) {
      interactions = {};
      saveInteractions();
      document.querySelectorAll('.gc-pro-card-timer').forEach(el => el.remove());
      renderInteractions();
    }
  };

  // ===== MONITORAMENTO (1s) =====
  window.__gcProInterval = setInterval(() => {
    ensureCopyBothButton();

    const active = detectActiveInteraction();
    const dot = shadow.getElementById('live-dot');
    const lbl = shadow.getElementById('live-label');
    const tmr = shadow.getElementById('live-timer');

    if (!active) {
      dot.classList.remove('live');
      tmr.classList.remove('done');
      lbl.textContent = 'Pausado / Sem conversa ativa';
      tmr.textContent = '00:00';
      return;
    }

    if (!interactions[active.key]) {
      interactions[active.key] = {
        name: active.name,
        channel: active.channel,
        seconds: 0,
        counted: false,
        countedAt: null,
        countedTs: 0
      };
    }

    const rec = interactions[active.key];
    rec.name = active.name;

    if (!rec.counted) {
      rec.seconds += 1;
      if (rec.seconds >= THRESHOLD_SEC) {
        rec.counted = true;
        rec.countedAt = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        rec.countedTs = Date.now();
      }
      saveInteractions();
    }

    // Atualiza o cronômetro pequeno em cima do nome no card da lista lateral (Foto 1)
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

  applyTheme(config.theme);
  renderInteractions();
})();
