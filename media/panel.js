(function () {
  const vscode = acquireVsCodeApi();

  /* ---- i18n ---- */
  var _locale = document.body.getAttribute("data-locale") || "en";
  window._i18n.setLocale(_locale);
  var t = window._i18n.t;

  /* ---- SVG Icons ---- */
  const ICO = {
    send: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>',
    stop: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18"/></svg>',
    settings: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>',
    terminal: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>',
    history: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
    close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
    chevron: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>',
    reset: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>',
    zap: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>',
    alert: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>',
    msg: '<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
    synth: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>',
    trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>',
    back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>',
    copy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>',
    file: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>'
  };

  /** Migrate old full templates (containing {{...}}) to user-editable only */
  function migrateTemplate(text) {
    if (!text || !text.includes("{{")) return text;
    const paras = text.split(/\n\n/);
    return paras.filter(function (p) { return !p.includes("{{"); }).join("\n\n");
  }

  /* ---- State ---- */
  const S = {
    topic: "", rounds: 2, mod: "", pt: { round1: "", crossEval: "", synthesis: "" },
    defaultPt: null,  // default prompt templates received from extension host
    settingsOpen: false,
    historyOpen: false,
    historyList: [],
    viewingHistory: null,  // null = live, HistoryEntry = viewing past debate
    data: { running: false, topic: "", cwd: "", warning: "", finalReport: "",
            rounds: [], agents: [], availableAgents: 0 },
    expanded: {},  // msgKey -> bool
    promptsExpanded: false,  // whether prompt section is expanded in settings modal
    agentConfigs: [],       // raw agent configs from extension
    editAgents: []          // editable copy while settings modal is open
  };

  /* ---- Helpers ---- */
  function esc(v) { return String(v).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); }
  function agentColor(id) {
    const c = ["#6366f1","#ec4899","#f59e0b","#10b981","#3b82f6","#8b5cf6","#ef4444","#06b6d4"];
    let h = 0; for (let i = 0; i < id.length; i++) h = ((h << 5) - h + id.charCodeAt(i)) | 0;
    return c[Math.abs(h) % c.length];
  }
  function dotCls(s) { return "dot dot-" + (s === "running" || s === "waiting_permission" ? "running" : s === "done" || s === "ready" ? "done" : s === "error" ? "error" : s === "cancelled" ? "cancelled" : "pending"); }
  function statusKey(s) { return s === "running" || s === "waiting_permission" ? "running" : s === "done" || s === "ready" ? "done" : s === "error" ? "error" : ""; }
  function statusZh(s) { return {idle:t("statusIdle"),starting:t("statusStarting"),ready:t("statusReady"),running:t("statusRunning"),waiting_permission:t("statusWaitingPermission"),done:t("statusDone"),error:t("statusError"),cancelled:t("statusCancelled"),pending:t("statusPending")}[s]||s; }
  function persist() { vscode.setState({ topic: S.topic, rounds: S.rounds, mod: S.mod, pt: S.pt }); }
  function fmtTime(ts) {
    const d = new Date(ts);
    const pad = n => String(n).padStart(2, "0");
    return d.getFullYear() + "-" + pad(d.getMonth()+1) + "-" + pad(d.getDate()) + " " + pad(d.getHours()) + ":" + pad(d.getMinutes());
  }
  function firstLine(t) { if (!t) return ""; const l = t.trimStart().split("\n")[0]; return l.length > 60 ? l.slice(0,60) + "..." : l; }

  /* ---- Lightweight Markdown renderer ---- */
  function renderMd(text) {
    if (!text) return '';

    // Extract fenced code blocks to protect their content
    var codeBlocks = [];
    text = text.replace(/```(\w*)\n([\s\S]*?)```/g, function(_, lang, code) {
      codeBlocks.push('<pre class="md-codeblock"><code>' + esc(code.trimEnd()) + '</code></pre>');
      return '\x00CB' + (codeBlocks.length - 1) + '\x00';
    });

    // Extract inline code
    var inlineCodes = [];
    text = text.replace(/`([^`\n]+)`/g, function(_, code) {
      inlineCodes.push('<code class="md-ic">' + esc(code) + '</code>');
      return '\x00IC' + (inlineCodes.length - 1) + '\x00';
    });

    var lines = text.split('\n');
    var out = [];
    var inUl = false, inOl = false;

    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];

      // Code block placeholder
      var cbm = line.match(/^\x00CB(\d+)\x00$/);
      if (cbm) {
        if (inUl) { out.push('</ul>'); inUl = false; }
        if (inOl) { out.push('</ol>'); inOl = false; }
        out.push(codeBlocks[parseInt(cbm[1])]);
        continue;
      }

      // Headers
      var hm = line.match(/^(#{1,6})\s+(.+)$/);
      if (hm) {
        if (inUl) { out.push('</ul>'); inUl = false; }
        if (inOl) { out.push('</ol>'); inOl = false; }
        var lvl = hm[1].length;
        out.push('<h' + lvl + ' class="md-h md-h' + lvl + '">' + inlineFmt(hm[2]) + '</h' + lvl + '>');
        continue;
      }

      // Unordered list
      var ulm = line.match(/^(\s*)[-*+]\s+(.+)$/);
      if (ulm) {
        if (inOl) { out.push('</ol>'); inOl = false; }
        if (!inUl) { out.push('<ul class="md-list">'); inUl = true; }
        out.push('<li>' + inlineFmt(ulm[2]) + '</li>');
        continue;
      }

      // Ordered list
      var olm = line.match(/^(\s*)\d+[.)]\s+(.+)$/);
      if (olm) {
        if (inUl) { out.push('</ul>'); inUl = false; }
        if (!inOl) { out.push('<ol class="md-list">'); inOl = true; }
        out.push('<li>' + inlineFmt(olm[2]) + '</li>');
        continue;
      }

      // Close lists on blank line
      if (line.trim() === '') {
        if (inUl) { out.push('</ul>'); inUl = false; }
        if (inOl) { out.push('</ol>'); inOl = false; }
        continue;
      }

      // Horizontal rule
      if (/^[-*_]{3,}\s*$/.test(line.trim())) {
        if (inUl) { out.push('</ul>'); inUl = false; }
        if (inOl) { out.push('</ol>'); inOl = false; }
        out.push('<hr class="md-hr">');
        continue;
      }

      // Regular text
      if (inUl) { out.push('</ul>'); inUl = false; }
      if (inOl) { out.push('</ol>'); inOl = false; }
      out.push('<p class="md-p">' + inlineFmt(line) + '</p>');
    }

    if (inUl) out.push('</ul>');
    if (inOl) out.push('</ol>');

    var html = out.join('\n');
    // Restore inline code placeholders
    html = html.replace(/\x00IC(\d+)\x00/g, function(_, idx) {
      return inlineCodes[parseInt(idx)];
    });
    return html;
  }

  function inlineFmt(s) {
    s = esc(s);
    // Bold
    s = s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    s = s.replace(/__(.+?)__/g, '<strong>$1</strong>');
    // Italic (careful not to match inside bold)
    s = s.replace(/(?<!\*)\*([^*]+?)\*(?!\*)/g, '<em>$1</em>');
    s = s.replace(/(?<!_)_([^_]+?)_(?!_)/g, '<em>$1</em>');
    // Inline code placeholders are already in place
    // Links [text](url)
    s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a class="md-link" href="$2">$1</a>');
    return s;
  }
  function summaryText(t, isLive) {
    if (!t) return "";
    const lines = t.trim().split("\n").filter(function(l){ return l.trim(); });
    if (!lines.length) return "";
    if (isLive) return lines[lines.length - 1].trim();
    return lines.join("  ·  ");
  }

  /* ---- Derive message list ---- */
  function deriveMsgsFrom(source) {
    const msgs = [];
    if (source.topic) msgs.push({ k: "user", type: "user", text: source.topic });
    const rounds = source.rounds || [];
    const agents = source.agents || [];
    for (const r of rounds) {
      msgs.push({ k: "sys-" + r.id, type: "sys", title: r.title, status: r.status, detail: r.detail });
      for (const a of agents) {
        const out = a.roundOutputs ? a.roundOutputs[r.id] : "";
        if (out) msgs.push({ k: a.id + "-" + r.id, type: "agent", agent: a, round: r, text: out });
        else if (r.status === "running" && a.status === "running")
          msgs.push({ k: a.id + "-" + r.id + "-live", type: "agent-live", agent: a, round: r, text: a.liveOutput || "" });
      }
    }
    const report = source.finalReport;
    if (report) {
      const modId = source.selectedModerator;
      const mod = modId ? agents.find(function(a) { return a.id === modId; }) : undefined;
      msgs.push({ k: "synthesis", type: "synthesis", agent: mod, text: report });
    }
    return msgs;
  }

  function deriveMessages() {
    if (S.viewingHistory) return deriveMsgsFrom(S.viewingHistory);
    return deriveMsgsFrom(S.data);
  }

  /* ==================================================================
     INCREMENTAL RENDER — only touch DOM nodes that changed
     ================================================================== */
  let prevMsgKeys = [];
  let layoutBuilt = false;
  let wasRunning = false;

  function buildLayout() {
    const app = document.getElementById("app");
    app.innerHTML =
      '<div class="app">' +
        '<div class="chat-scroll" id="chatScroll"></div>' +
        '<div class="input-bar">' +
          '<textarea class="input-text" id="inp" placeholder="' + esc(t("inputPlaceholder")) + '" rows="1"></textarea>' +
          '<button class="send-btn send-btn--primary" id="bSend" title="' + esc(t("send")) + '">' + ICO.send + '</button>' +
        '</div>' +
        '<div class="history-panel" id="histPanel">' +
          '<div class="history-hdr">' +
            '<span class="history-title">' + esc(t("discussionHistory")) + '</span>' +
            '<button class="icon-btn" id="bHistClose" title="' + esc(t("close")) + '">' + ICO.close + '</button>' +
          '</div>' +
          '<div class="history-list" id="histList"></div>' +
        '</div>' +
        '<div class="perm-bg" id="permBg">' +
          '<div class="perm-dialog">' +
            '<div class="perm-hdr">' + ICO.alert + ' <span id="permTitle"></span></div>' +
            '<div class="perm-body">' +
              '<div class="perm-msg" id="permMsg"></div>' +
              '<div class="perm-input" id="permInput" style="display:none"></div>' +
              '<textarea class="perm-feedback" id="permFeedback" rows="2" style="display:none"></textarea>' +
            '</div>' +
            '<div class="perm-ft" id="permFt"></div>' +
          '</div>' +
        '</div>' +
        '<div class="modal-bg" id="modalBg">' +
          '<div class="modal">' +
            '<div class="modal-hdr"><span>' + esc(t("discussionSettings")) + '</span><button class="icon-btn" id="bMx" title="' + esc(t("close")) + '">' + ICO.close + '</button></div>' +
            '<div class="modal-body" id="modalBody"></div>' +
            '<div class="modal-ft">' +
              '<button class="btn-modal btn-modal--ghost" id="bReset">' + ICO.reset + ' ' + esc(t("reset")) + '</button>' +
              '<button class="btn-modal btn-modal--primary" id="bSave">' + ICO.check + ' ' + esc(t("save")) + '</button>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>';
    bindStaticEvents();
    layoutBuilt = true;
  }

  function update() {
    if (!layoutBuilt) buildLayout();
    updateChat();
    updateInputBar();
    updateModal();
    updateHistoryPanel();
  }

  /* ---- Chat: incremental ---- */
  function updateChat() {
    const container = document.getElementById("chatScroll");
    if (!container) return;
    const msgs = deriveMessages();

    // History banner
    let banner = container.querySelector(".hist-banner");
    if (S.viewingHistory) {
      if (!banner) {
        banner = document.createElement("div");
        banner.className = "hist-banner";
        banner.innerHTML = '<span class="hist-banner-text">' + esc(t("viewingHistory")) + '</span><button class="btn-modal btn-modal--ghost hist-banner-btn" id="bHistBack">' + ICO.back + ' ' + esc(t("backToCurrent")) + '</button>';
        container.prepend(banner);
        banner.querySelector("#bHistBack").addEventListener("click", closeHistoryView);
      }
    } else if (banner) {
      banner.remove();
    }

    if (!msgs.length && !container.querySelector(".chat-empty")) {
      container.innerHTML = (S.viewingHistory ? '<div class="hist-banner"><span class="hist-banner-text">' + esc(t("viewingHistory")) + '</span><button class="btn-modal btn-modal--ghost hist-banner-btn" id="bHistBack">' + ICO.back + ' ' + esc(t("backToCurrent")) + '</button></div>' : '')
        + '<div class="chat-empty"><div class="chat-empty-icon">' + ICO.msg + '</div><div class="chat-empty-title">' + esc(t("emptyTitle")) + '</div><div class="chat-empty-sub">' + esc(t("emptySub")) + '</div></div>';
      if (S.viewingHistory) {
        const backBtn = container.querySelector("#bHistBack");
        if (backBtn) backBtn.addEventListener("click", closeHistoryView);
      }
      prevMsgKeys = [];
      return;
    }
    if (msgs.length && container.querySelector(".chat-empty")) {
      // Keep banner if present
      const existingBanner = container.querySelector(".hist-banner");
      container.innerHTML = "";
      if (existingBanner) container.appendChild(existingBanner);
    }

    const curKeys = msgs.map(m => m.k);
    // Remove stale
    for (const pk of prevMsgKeys) {
      if (!curKeys.includes(pk)) {
        const el = container.querySelector(`[data-k="${pk}"]`);
        if (el) el.remove();
      }
    }

    let shouldScroll = false;

    for (let i = 0; i < msgs.length; i++) {
      const m = msgs[i];
      let el = container.querySelector(`[data-k="${m.k}"]`);

      if (!el) {
        el = createMsgElement(m);
        // Insert at correct position
        const nextSibling = i + 1 < msgs.length ? container.querySelector(`[data-k="${msgs[i+1].k}"]`) : null;
        if (nextSibling) container.insertBefore(el, nextSibling);
        else container.appendChild(el);
        shouldScroll = true;
      } else {
        // Update existing element in-place
        updateMsgElement(el, m);
      }
    }

    prevMsgKeys = curKeys;
    const isRunning = S.data.running;
    if (isRunning) {
      // During generation: always show latest
      container.scrollTop = container.scrollHeight;
    } else if (wasRunning) {
      // Generation just finished: scroll back to top
      container.scrollTop = 0;
    }
    wasRunning = isRunning;
    requestAnimationFrame(function() { setupMarquees(container); });
  }

  function setupMarquees(container) {
    // Remove marquee from completed (non-live) messages
    var done = container.querySelectorAll(".msg-agent:not(.is-live) .summary-inner.has-overflow");
    for (var j = 0; j < done.length; j++) {
      done[j].classList.remove("has-overflow");
      done[j].style.removeProperty("--scroll-x");
      done[j].style.removeProperty("animation-duration");
    }
    // Apply marquee only to live (streaming) collapsed messages
    var els = container.querySelectorAll(".msg-agent.is-live:not(.expanded) .msg-agent-summary");
    for (var i = 0; i < els.length; i++) {
      var outer = els[i];
      var inner = outer.querySelector(".summary-inner");
      if (!inner) continue;
      var overflow = inner.scrollWidth - outer.clientWidth;
      if (overflow > 2) {
        inner.style.setProperty("--scroll-x", "-" + overflow + "px");
        var dur = Math.max(6, Math.round(overflow / 30)) + "s";
        inner.style.animationDuration = dur;
        if (!inner.classList.contains("has-overflow")) inner.classList.add("has-overflow");
      } else {
        inner.classList.remove("has-overflow");
        inner.style.removeProperty("--scroll-x");
        inner.style.removeProperty("animation-duration");
      }
    }
  }

  function createMsgElement(m) {
    const div = document.createElement("div");
    div.setAttribute("data-k", m.k);
    fillMsgElement(div, m);
    return div;
  }

  function fillMsgElement(div, m) {
    switch (m.type) {
      case "user":
        div.className = "msg-user";
        div.textContent = m.text;
        break;
      case "sys":
        div.className = "msg-sys";
        div.innerHTML = `<span class="${dotCls(m.status)}"></span>${esc(m.title)}${m.detail ? " — " + esc(m.detail) : ""}`;
        break;
      case "agent":
      case "agent-live":
        fillAgentMsg(div, m);
        break;
      case "synthesis":
        fillSynthesisMsg(div, m);
        break;
    }
  }

  function fillAgentMsg(div, m) {
    const isLive = m.type === "agent-live";
    const key = m.k;
    const isExpanded = S.expanded[key] !== false && (S.expanded[key] || isLive);
    div.className = "msg-agent" + (isExpanded ? " expanded" : "") + (isLive ? " is-live" : "");

    const summary = summaryText(m.text, isLive);
    const st = isLive ? "running" : (m.round ? statusKey(m.round.status) : "");
    const statusText = isLive ? t("outputting") : (m.round ? statusZh(m.round.status) : "");

    const bodyContent = isLive
      ? (m.text ? '<div class="msg-stream md-body">' + renderMd(m.text) + '</div>' : '<div class="typing-dots"><span></span><span></span><span></span></div>')
      : '<div class="msg-stream md-body">' + renderMd(m.text) + '</div>';

    div.innerHTML =
      '<div class="msg-agent-bar" data-toggle="' + esc(key) + '">' +
        '<div class="msg-avatar" style="background:' + agentColor(m.agent.id) + '">' + esc(m.agent.label.charAt(0)) + '</div>' +
        '<span class="msg-agent-name">' + esc(m.agent.label) + '</span>' +
        '<span class="msg-agent-summary"><span class="summary-inner">' + esc(summary) + '</span></span>' +
        (statusText ? '<span class="msg-agent-status" data-st="' + st + '">' + esc(statusText) + '</span>' : '') +
        '<span class="msg-chevron">' + ICO.chevron + '</span>' +
      '</div>' +
      '<div class="msg-agent-body">' + bodyContent + '</div>';
  }

  function fillSynthesisMsg(div, m) {
    const key = m.k;
    const isExpanded = S.expanded[key] !== false; // default open
    div.className = "msg-agent msg-synthesis" + (isExpanded ? " expanded" : "");
    const label = m.agent ? t("finalSynthesisWithAgent", m.agent.label) : t("finalSynthesisLabel");
    div.innerHTML =
      '<div class="msg-agent-bar" data-toggle="' + esc(key) + '">' +
        '<div class="msg-avatar" style="background:var(--clr-done)">' + ICO.synth + '</div>' +
        '<span class="msg-agent-name">' + esc(label) + '</span>' +
        '<span class="msg-agent-summary"><span class="summary-inner">' + esc(summaryText(m.text, false)) + '</span></span>' +
        '<button class="btn-copy-synthesis" title="' + esc(t("copySynthesis")) + '">' + ICO.copy + '</button>' +
        '<span class="msg-chevron">' + ICO.chevron + '</span>' +
      '</div>' +
      '<div class="msg-agent-body"><div class="msg-stream md-body">' + renderMd(m.text) + '</div></div>';
  }

  function updateMsgElement(el, m) {
    switch (m.type) {
      case "user":
        el.textContent = m.text;
        break;
      case "sys": {
        const dotEl = el.querySelector(".dot");
        if (dotEl) dotEl.className = dotCls(m.status);
        // Update text: we recreate innerHTML for sys since it's tiny
        el.innerHTML = `<span class="${dotCls(m.status)}"></span>${esc(m.title)}${m.detail ? " — " + esc(m.detail) : ""}`;
        break;
      }
      case "agent-live": {
        // Update stream text in-place with markdown rendering
        const pre = el.querySelector(".msg-stream");
        if (pre) {
          pre.innerHTML = renderMd(m.text);
        } else if (m.text) {
          // Replace typing dots with stream
          const body = el.querySelector(".msg-agent-body");
          if (body) body.innerHTML = '<div class="msg-stream md-body">' + renderMd(m.text) + '</div>';
        }
        // Update summary — show latest line for live
        const sumEl = el.querySelector(".summary-inner");
        if (sumEl) sumEl.textContent = summaryText(m.text, true);
        // Auto-expand while live, but respect user's manual collapse
        if (S.expanded[m.k] !== false && !el.classList.contains("expanded")) el.classList.add("expanded");
        break;
      }
      case "agent": {
        // Final output — may have transitioned from live
        const isExpanded = S.expanded[m.k];
        if (isExpanded === undefined) {
          // Was live, now done: collapse
          el.classList.remove("expanded");
        }
        const pre = el.querySelector(".msg-stream");
        if (pre) pre.innerHTML = renderMd(m.text);
        const sumEl = el.querySelector(".summary-inner");
        if (sumEl) sumEl.textContent = summaryText(m.text, false);
        const stEl = el.querySelector(".msg-agent-status");
        if (stEl) {
          const st = m.round ? statusKey(m.round.status) : "";
          stEl.textContent = m.round ? statusZh(m.round.status) : "";
          stEl.setAttribute("data-st", st);
        }
        break;
      }
      case "synthesis": {
        const pre = el.querySelector(".msg-stream");
        if (pre) pre.innerHTML = renderMd(m.text);
        const sumEl = el.querySelector(".summary-inner");
        if (sumEl) sumEl.textContent = summaryText(m.text, false);
        break;
      }
    }
  }

  /* ---- Input bar ---- */
  function updateInputBar() {
    const bar = document.querySelector(".input-bar");
    if (bar) bar.style.display = S.viewingHistory ? "none" : "";
    const btn = document.getElementById("bSend");
    if (!btn) return;
    if (S.data.running) {
      btn.innerHTML = ICO.stop;
      btn.className = "send-btn send-btn--cancel";
      btn.title = t("cancel");
      btn.onclick = () => vscode.postMessage({ type: "cancelDebate" });
    } else {
      btn.innerHTML = ICO.send;
      btn.className = "send-btn send-btn--primary";
      btn.title = t("send");
      btn.onclick = sendDebate;
    }
    // Warning
    let wEl = document.querySelector(".msg-warn");
    if (S.data.warning && !S.data.running) {
      if (!wEl) {
        wEl = document.createElement("div");
        wEl.className = "msg-warn";
        const scroll = document.getElementById("chatScroll");
        if (scroll) scroll.appendChild(wEl);
      }
      wEl.innerHTML = ICO.alert + ' <span>' + esc(S.data.warning) + '</span>';
    } else if (wEl) {
      wEl.remove();
    }
  }

  /* ---- Settings modal ---- */
  function updateModal() {
    const bg = document.getElementById("modalBg");
    if (!bg) return;
    bg.classList.toggle("open", S.settingsOpen);
    // Only toggle visibility — don't rebuild content on every state update
  }

  /** Rebuild modal form content. Call only when opening or resetting. */
  function renderModalContent() {
    const body = document.getElementById("modalBody");
    if (!body) return;
    const agents = S.data.agents || [];
    const modOpts = '<option value="">' + esc(t("autoSelect")) + '</option>' + agents.map(a =>
      `<option value="${esc(a.id)}"${S.mod === a.id ? " selected" : ""}>${esc(a.label)}</option>`
    ).join("");
    const rOpts = [1,2,3,4,5,6,7,8].map(n => `<option value="${n}"${S.rounds===n?" selected":""}>${n}</option>`).join("");
    const runningHint = S.data.running ? '<div class="fh" style="color:var(--clr-warn);margin-bottom:4px">' + esc(t("runningHint")) + '</div>' : '';

    // Build agent cards
    if (!S.editAgents.length && S.agentConfigs.length) {
      S.editAgents = S.agentConfigs.map(function(a) {
        return { id: a.id, label: a.label, command: a.command, args: (a.args||[]).slice(), enabled: a.enabled !== false, cr: null };
      });
    }
    var agentCards = S.editAgents.map(function(a, idx) {
      var title = a.label || t("newAgent");
      var cr = a.cr; // connect result
      var resultHtml = "";
      if (cr && cr.loading) {
        resultHtml = '<div class="agent-result testing">' + esc(t("connecting")) + '</div>';
      } else if (cr && cr.success) {
        var sc = a.sessionConfig || {};
        var info = cr.agentInfo || {};
        var headline = [];
        if (info.title || info.name) headline.push('<strong>' + esc(info.title || info.name) + '</strong>');
        if (info.version) headline.push('v' + esc(info.version));
        // Extra agentInfo fields
        var skip = {name:1, title:1, version:1};
        Object.keys(info).filter(function(k){ return !skip[k] && info[k] != null && info[k] !== ""; }).forEach(function(k){
          headline.push(esc(k) + ': ' + esc(String(info[k])));
        });
        var selectsHtml = '';
        // Mode dropdown
        if (cr.modes && cr.modes.availableModes && cr.modes.availableModes.length > 0) {
          var modeVal = sc.mode || cr.modes.currentModeId;
          var mOpts = cr.modes.availableModes.map(function(m) {
            return '<option value="' + esc(m.id) + '"' + (m.id === modeVal ? ' selected' : '') + '>' + esc(m.name) + '</option>';
          }).join('');
          selectsHtml += '<div class="agent-cfg-opt"><label class="fl">' + esc(t("mode")) + '</label><select class="fi agent-cfg-sel" data-aidx="' + idx + '" data-cfgtype="mode">' + mOpts + '</select></div>';
        }
        // ConfigOptions dropdowns (model, thought_level, etc.)
        if (cr.configOptions && cr.configOptions.length) {
          for (var ci = 0; ci < cr.configOptions.length; ci++) {
            var co = cr.configOptions[ci];
            if (co.type === 'select' && co.options && co.options.length) {
              var coVal = (sc.configOptions && sc.configOptions[co.id]) || co.currentValue;
              var coOpts = co.options.map(function(o) {
                var v = o.value != null ? o.value : o.name;
                return '<option value="' + esc(v) + '"' + (v === coVal ? ' selected' : '') + '>' + esc(o.name) + '</option>';
              }).join('');
              selectsHtml += '<div class="agent-cfg-opt"><label class="fl">' + esc(co.name) + '</label><select class="fi agent-cfg-sel" data-aidx="' + idx + '" data-cfgtype="configOption" data-cfgid="' + esc(co.id) + '">' + coOpts + '</select></div>';
            }
          }
        }
        resultHtml = '<div class="agent-result success">'
          + '<div class="agent-result-headline">' + ICO.check + ' <span>' + (headline.join(' · ') || esc(t("connected"))) + '</span></div>'
          + (selectsHtml ? '<div class="agent-cfg-options">' + selectsHtml + '</div>' : '')
          + '</div>';
      } else if (cr && cr.success === false) {
        resultHtml = '<div class="agent-result error">' + ICO.alert + ' <span>' + esc(cr.error || "Connection failed") + '</span></div>';
      }

      return '<div class="agent-card">'
        + '<div class="agent-card-hdr">'
        + '<span class="agent-card-title">' + esc(title) + '</span>'
        + '<label class="agent-enabled-lbl"><input type="checkbox" class="agent-enabled" data-aidx="' + idx + '"' + (a.enabled ? ' checked' : '') + ' /> ' + esc(t("enabled")) + '</label>'
        + '<button class="icon-btn agent-del" data-aidx="' + idx + '" title="' + esc(t("delete")) + '">' + ICO.trash + '</button>'
        + '</div>'
        + '<div class="fg"><label class="fl">' + esc(t("agentName")) + '</label><input class="fi agent-name" data-aidx="' + idx + '" value="' + esc(a.label) + '" placeholder="e.g. Codex" /></div>'
        + '<div class="fr">'
        + '<div class="fg" style="flex:2"><label class="fl">' + esc(t("command")) + '</label><input class="fi agent-cmd" data-aidx="' + idx + '" value="' + esc(a.command) + '" placeholder="e.g. codex-acp" /></div>'
        + '<div class="fg" style="flex:1"><label class="fl">' + esc(t("args")) + '</label><input class="fi agent-args" data-aidx="' + idx + '" value="' + esc((a.args||[]).join(" ")) + '" placeholder="' + esc(t("argsHint")) + '" /></div>'
        + '</div>'
        + resultHtml
        + '</div>';
    }).join("");

    var promptsOpen = S.promptsExpanded;

    body.innerHTML = runningHint +
      '<div class="fr">' +
        '<div class="fg"><label class="fl">' + esc(t("crossReviewRounds")) + '</label><select class="fi" id="cR">' + rOpts + '</select></div>' +
        '<div class="fg"><label class="fl">' + esc(t("moderatorAgent")) + '</label><select class="fi" id="cM">' + modOpts + '</select></div>' +
      '</div>' +
      '<hr class="sep">' +
      '<div class="fg">' +
        '<div class="setting-section-hdr">' +
          '<label class="fl">' + esc(t("acpAgents")) + '</label>' +
          '<button class="btn-link" id="bEditJson">' + esc(t("editSettingsJson")) + '</button>' +
        '</div>' +
        '<div class="agent-list" id="agentList">' + agentCards + '</div>' +
        '<button class="btn-modal btn-modal--ghost agent-add" id="bAddAgent" style="width:100%;justify-content:center;margin-top:4px">' + esc(t("addAgent")) + '</button>' +
      '</div>' +
      '<hr class="sep">' +
      '<div class="fg">' +
        '<div class="setting-section-hdr setting-collapse" id="promptToggle">' +
          '<label class="fl" style="cursor:pointer"><span class="collapse-arrow' + (promptsOpen ? ' open' : '') + '" id="promptArrow">' + ICO.chevron + '</span> ' + esc(t("promptTemplates")) + '</label>' +
        '</div>' +
        '<div class="prompt-section' + (promptsOpen ? ' open' : '') + '" id="promptSection">' +
          '<div class="fg"><label class="fl">' + esc(t("independentProposalPrompt")) + '</label><div class="fh">' + esc(t("eachAgentInitial")) + '</div><textarea class="ft" id="cP1" rows="5">' + esc(S.pt.round1) + '</textarea></div>' +
          '<div class="fg"><label class="fl">' + esc(t("crossReviewPrompt")) + '</label><div class="fh">' + esc(t("reviewOthers")) + '</div><textarea class="ft" id="cPC" rows="5">' + esc(S.pt.crossEval) + '</textarea></div>' +
          '<div class="fg"><label class="fl">' + esc(t("finalSynthesisPrompt")) + '</label><div class="fh">' + esc(t("synthesizeAll")) + '</div><textarea class="ft" id="cPS" rows="5">' + esc(S.pt.synthesis) + '</textarea></div>' +
        '</div>' +
      '</div>';

    // Bind dynamic events
    var toggle = document.getElementById("promptToggle");
    if (toggle) toggle.addEventListener("click", function() {
      S.promptsExpanded = !S.promptsExpanded;
      var sec = document.getElementById("promptSection");
      var arrow = document.getElementById("promptArrow");
      if (sec) sec.classList.toggle("open", S.promptsExpanded);
      if (arrow) arrow.classList.toggle("open", S.promptsExpanded);
    });
    var editJson = document.getElementById("bEditJson");
    if (editJson) editJson.addEventListener("click", function() { vscode.postMessage({ type: "openSettingsJson" }); });
    var addBtn = document.getElementById("bAddAgent");
    if (addBtn) addBtn.addEventListener("click", function() {
      S.editAgents.push({ id: "", label: "", command: "", args: [], enabled: true, cr: null });
      renderModalContent();
    });
    // Delegated events on agent list
    var agentList = document.getElementById("agentList");
    if (agentList) {
      agentList.addEventListener("click", function(e) {
        var del = e.target.closest(".agent-del");
        if (del) { var di = parseInt(del.getAttribute("data-aidx")); if (!isNaN(di)) { S.editAgents.splice(di, 1); renderModalContent(); } return; }
      });
      agentList.addEventListener("input", function(e) {
        var el = e.target;
        var idx = parseInt(el.getAttribute("data-aidx"));
        if (isNaN(idx) || !S.editAgents[idx]) return;
        if (el.classList.contains("agent-name")) {
          S.editAgents[idx].label = el.value;
          var title = el.closest(".agent-card");
          if (title) { var t2 = title.querySelector(".agent-card-title"); if (t2) t2.textContent = el.value || "New Agent"; }
        } else if (el.classList.contains("agent-cmd")) {
          S.editAgents[idx].command = el.value;
        } else if (el.classList.contains("agent-args")) {
          var raw = el.value.trim(); S.editAgents[idx].args = raw ? raw.split(/\s+/) : [];
        }
      });
      agentList.addEventListener("change", function(e) {
        var el = e.target;
        if (el.classList.contains("agent-enabled")) {
          var idx = parseInt(el.getAttribute("data-aidx"));
          if (!isNaN(idx) && S.editAgents[idx]) S.editAgents[idx].enabled = el.checked;
        }
        if (el.classList.contains("agent-cfg-sel")) {
          var idx2 = parseInt(el.getAttribute("data-aidx"));
          if (isNaN(idx2) || !S.editAgents[idx2]) return;
          if (!S.editAgents[idx2].sessionConfig) S.editAgents[idx2].sessionConfig = {};
          var cfgType = el.getAttribute("data-cfgtype");
          if (cfgType === "mode") {
            S.editAgents[idx2].sessionConfig.mode = el.value;
          } else if (cfgType === "configOption") {
            var cfgId = el.getAttribute("data-cfgid");
            if (!S.editAgents[idx2].sessionConfig.configOptions) S.editAgents[idx2].sessionConfig.configOptions = {};
            S.editAgents[idx2].sessionConfig.configOptions[cfgId] = el.value;
          }
        }
      });
    }
  }

  /* ---- History panel ---- */
  function updateHistoryPanel() {
    const panel = document.getElementById("histPanel");
    if (!panel) return;
    panel.classList.toggle("open", S.historyOpen);
    if (!S.historyOpen) return;
    const list = document.getElementById("histList");
    if (!list) return;
    if (!S.historyList.length) {
      list.innerHTML = '<div class="hist-empty">' + esc(t("noHistory")) + '</div>';
      return;
    }
    list.innerHTML = S.historyList.map(function(e) {
      var statusLabel = { running: t("statusRunning"), done: t("statusDone"), error: t("statusError"), cancelled: t("statusCancelled") }[e.status] || t("statusDone");
      var statusClass = "hist-status-" + (e.status || "done");
      return '<div class="hist-item" data-hid="' + esc(e.id) + '">'
        + '<div class="hist-item-top">'
        + '<span class="hist-topic">' + esc(e.topic.length > 50 ? e.topic.slice(0,50) + "..." : e.topic) + '</span>'
        + '<span class="hist-status ' + statusClass + '">' + statusLabel + '</span>'
        + '<button class="icon-btn hist-del" data-hdel="' + esc(e.id) + '" title="' + esc(t("delete")) + '">' + ICO.trash + '</button>'
        + '</div>'
        + '<div class="hist-meta">'
        + '<span>' + esc(fmtTime(e.timestamp)) + '</span>'
        + '<span>' + esc(t("crossReviewRoundsCount", e.totalRounds)) + '</span>'
        + '<span>' + esc(e.agentLabels.join(", ")) + '</span>'
        + '</div>'
        + '</div>';
    }).join("");
  }

  function clearChatContainer() {
    const container = document.getElementById("chatScroll");
    if (container) container.innerHTML = "";
  }

  function openHistoryView(entry) {
    S.viewingHistory = entry;
    S.historyOpen = false;
    S.expanded = {};
    prevMsgKeys = [];
    clearChatContainer();
    update();
  }

  function closeHistoryView() {
    S.viewingHistory = null;
    S.expanded = {};
    prevMsgKeys = [];
    clearChatContainer();
    update();
  }

  /* ---- Permission dialog ---- */
  function showPermissionDialog(data) {
    var bg = document.getElementById("permBg");
    var titleEl = document.getElementById("permTitle");
    var msgEl = document.getElementById("permMsg");
    var inputEl = document.getElementById("permInput");
    var feedbackEl = document.getElementById("permFeedback");
    var ftEl = document.getElementById("permFt");
    if (!bg || !titleEl || !msgEl || !inputEl || !feedbackEl || !ftEl) return;

    titleEl.textContent = t("permissionTitle");
    msgEl.textContent = t("permissionMessage", data.agentLabel || "", data.toolTitle || "");

    if (data.rawInput) {
      inputEl.textContent = data.rawInput;
      inputEl.style.display = "";
    } else {
      inputEl.style.display = "none";
    }

    // Reset feedback textarea
    feedbackEl.value = "";
    feedbackEl.placeholder = t("permissionFeedback");
    feedbackEl.style.display = "";

    function getFeedback() {
      return feedbackEl ? feedbackEl.value.trim() : "";
    }

    var items = data.items || [];
    ftEl.innerHTML = "";

    // Deny button (always present)
    var denyBtn = document.createElement("button");
    denyBtn.className = "perm-btn perm-btn--deny";
    denyBtn.textContent = t("permissionDeny");
    denyBtn.onclick = function() {
      var msg = getFeedback();
      closePermissionDialog();
      vscode.postMessage({ type: "permissionResponse", message: msg || undefined });
    };
    ftEl.appendChild(denyBtn);

    // Option buttons from ACP protocol
    for (var i = 0; i < items.length; i++) {
      (function(item, idx) {
        var btn = document.createElement("button");
        // First option = primary allow, rest = secondary (allow-all, etc.)
        btn.className = "perm-btn " + (idx === 0 ? "perm-btn--allow" : "perm-btn--allow-all");
        btn.textContent = item.title;
        btn.onclick = function() {
          var msg = getFeedback();
          closePermissionDialog();
          vscode.postMessage({ type: "permissionResponse", optionId: item.optionId, message: msg || undefined });
        };
        ftEl.appendChild(btn);
      })(items[i], i);
    }

    bg.classList.add("open");
  }

  function closePermissionDialog() {
    var bg = document.getElementById("permBg");
    if (bg) bg.classList.remove("open");
  }

  /* ---- Send ---- */
  function sendDebate() {
    const topic = S.topic.trim();
    if (!topic) return;
    vscode.postMessage({ type: "runDebate", topic: topic, totalRounds: S.rounds, moderatorId: S.mod, promptTemplates: S.pt });
    S.topic = "";
    const inp = document.getElementById("inp");
    if (inp) { inp.value = ""; inp.style.height = "auto"; }
    persist();
  }

  /* ---- Static event binding (once) ---- */
  function bindStaticEvents() {
    const inp = document.getElementById("inp");
    inp.addEventListener("input", e => {
      S.topic = e.target.value;
      persist();
      e.target.style.height = "auto";
      e.target.style.height = Math.min(e.target.scrollHeight, 100) + "px";
    });
    inp.addEventListener("keydown", e => {
      if (e.key === "Enter" && !e.shiftKey && !S.data.running) { e.preventDefault(); sendDebate(); }
    });

    document.getElementById("bSend").addEventListener("click", sendDebate);
    document.getElementById("bHistClose").addEventListener("click", () => { S.historyOpen = false; update(); });
    document.getElementById("bMx").addEventListener("click", () => { S.settingsOpen = false; updateModal(); });
    document.getElementById("modalBg").addEventListener("click", e => {
      if (e.target.id === "modalBg") { S.settingsOpen = false; updateModal(); }
    });
    document.getElementById("permBg").addEventListener("click", e => {
      if (e.target.id === "permBg") { closePermissionDialog(); vscode.postMessage({ type: "permissionResponse" }); }
    });
    document.getElementById("bReset").addEventListener("click", () => {
      S.rounds = 2; S.mod = ""; S.pt = S.defaultPt ? { ...S.defaultPt } : { round1: "", crossEval: "", synthesis: "" }; persist(); renderModalContent();
    });
    document.getElementById("bSave").addEventListener("click", () => {
      const r = document.getElementById("cR"), m = document.getElementById("cM"),
        p1 = document.getElementById("cP1"), pc = document.getElementById("cPC"), ps = document.getElementById("cPS");
      if (r) S.rounds = parseInt(r.value, 10) || 2;
      if (m) S.mod = m.value;
      if (p1) S.pt.round1 = p1.value;
      if (pc) S.pt.crossEval = pc.value;
      if (ps) S.pt.synthesis = ps.value;
      // Save agent configs
      if (S.editAgents.length) {
        vscode.postMessage({ type: "saveAgentConfigs", agents: S.editAgents.map(a => ({ id: a.id, label: a.label, command: a.command, args: a.args, enabled: a.enabled, sessionConfig: a.sessionConfig || undefined })) });
      }
      persist(); S.settingsOpen = false; updateModal();
    });

    // Delegated click for history list
    document.getElementById("histList").addEventListener("click", e => {
      const del = e.target.closest("[data-hdel]");
      if (del) {
        e.stopPropagation();
        vscode.postMessage({ type: "deleteHistory", id: del.getAttribute("data-hdel") });
        return;
      }
      const item = e.target.closest("[data-hid]");
      if (item) {
        vscode.postMessage({ type: "loadHistory", id: item.getAttribute("data-hid") });
      }
    });

    // Delegated toggle for collapsible messages
    document.getElementById("chatScroll").addEventListener("click", e => {
      const copyBtn = e.target.closest(".btn-copy-synthesis");
      if (copyBtn) {
        e.stopPropagation();
        const body = copyBtn.closest(".msg-synthesis");
        if (!body) return;
        const streamEl = body.querySelector(".msg-stream");
        if (!streamEl) return;
        const text = streamEl.textContent || "";
        navigator.clipboard.writeText(text).then(() => {
          copyBtn.classList.add("copied");
          copyBtn.innerHTML = ICO.check;
          setTimeout(() => { copyBtn.classList.remove("copied"); copyBtn.innerHTML = ICO.copy; }, 2000);
        });
        return;
      }
      const bar = e.target.closest("[data-toggle]");
      if (!bar) return;
      const key = bar.getAttribute("data-toggle");
      const parent = bar.parentElement;
      if (!parent) return;
      const isExpanded = parent.classList.contains("expanded");
      if (isExpanded) { parent.classList.remove("expanded"); S.expanded[key] = false; }
      else { parent.classList.add("expanded"); S.expanded[key] = true; }
    });
  }

  /* ---- Message handler ---- */
  window.addEventListener("message", e => {
    if (!e.data) return;
    switch (e.data.type) {
      case "state":
        S.data = e.data.payload;
        // Only sync topic to input when not running (i.e. restoring after webview rebuild)
        const inp = document.getElementById("inp");
        if (!S.topic && e.data.payload.topic && !e.data.payload.running && inp && !inp.value) {
          S.topic = e.data.payload.topic;
          inp.value = S.topic;
        }
        update();
        return;
      case "historyList":
        S.historyList = e.data.entries || [];
        updateHistoryPanel();
        return;
      case "historyDetail":
        if (e.data.entry) openHistoryView(e.data.entry);
        return;
      case "defaults":
        S.defaultPt = e.data.promptTemplates;
        if (S.defaultPt) {
          if (!S.pt.round1) S.pt.round1 = S.defaultPt.round1;
          if (!S.pt.crossEval) S.pt.crossEval = S.defaultPt.crossEval;
          if (!S.pt.synthesis) S.pt.synthesis = S.defaultPt.synthesis;
          persist();
        }
        if (S.settingsOpen) renderModalContent();
        return;
      case "agentConfigs":
        S.agentConfigs = e.data.agents || [];
        if (S.settingsOpen) {
          S.editAgents = S.agentConfigs.map(function(a) {
            return { id: a.id, label: a.label, command: a.command, args: (a.args||[]).slice(), enabled: a.enabled !== false, cr: null, sessionConfig: a.sessionConfig || null };
          });
          renderModalContent();
          // Auto-connect all agents with a command
          S.editAgents.forEach(function(a, i) {
            if (a.command) {
              S.editAgents[i].cr = { loading: true };
              vscode.postMessage({ type: "connectAgent", command: a.command, args: a.args, label: a.label, connId: i + "-" + Date.now() });
            }
          });
          renderModalContent();
        }
        return;
      case "connectResult": {
        var cid = String(e.data.connId || "");
        var cidx = parseInt(cid.split("-")[0]);
        if (isNaN(cidx) || !S.editAgents[cidx]) return;
        if (e.data.success) {
          S.editAgents[cidx].cr = { success: true, agentInfo: e.data.agentInfo, modes: e.data.modes, models: e.data.models, configOptions: e.data.configOptions };
          // Initialize sessionConfig from current values if not already set
          if (!S.editAgents[cidx].sessionConfig) {
            var sc = {};
            if (e.data.modes && e.data.modes.currentModeId) sc.mode = e.data.modes.currentModeId;
            if (e.data.configOptions && e.data.configOptions.length) {
              sc.configOptions = {};
              for (var k = 0; k < e.data.configOptions.length; k++) {
                var opt = e.data.configOptions[k];
                if (opt.type === "select" && opt.options && opt.options.length) sc.configOptions[opt.id] = opt.currentValue;
              }
            }
            if (sc.mode || sc.configOptions) S.editAgents[cidx].sessionConfig = sc;
          }
        } else {
          S.editAgents[cidx].cr = { success: false, error: e.data.error };
        }
        if (S.settingsOpen) renderModalContent();
        return;
      }
      case "permissionRequest":
        showPermissionDialog(e.data);
        return;
      case "permissionDismiss":
        closePermissionDialog();
        return;
      case "triggerAction":
        if (e.data.action === "showHistory") {
          S.historyOpen = !S.historyOpen;
          if (S.historyOpen) vscode.postMessage({ type: "getHistory" });
          update();
        } else if (e.data.action === "showSettings") {
          S.settingsOpen = true; S.editAgents = []; vscode.postMessage({ type: "getAgentConfigs" }); renderModalContent(); updateModal();
        }
        return;
    }
  });

  /* ---- Restore ---- */
  const prev = vscode.getState();
  if (prev) {
    if (typeof prev.topic === "string") S.topic = prev.topic;
    if (typeof prev.rounds === "number") S.rounds = prev.rounds;
    if (typeof prev.mod === "string") S.mod = prev.mod;
    if (prev.pt) {
      S.pt = {
        round1: migrateTemplate(prev.pt.round1) || "",
        crossEval: migrateTemplate(prev.pt.crossEval) || "",
        synthesis: migrateTemplate(prev.pt.synthesis) || ""
      };
    }
  }

  buildLayout();
  const inp = document.getElementById("inp");
  if (inp && S.topic) inp.value = S.topic;
  vscode.postMessage({ type: "ready" });
})();
