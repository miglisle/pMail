/* pMail — keyboard shortcuts */
(function (PM) {
  'use strict';
  const U = PM.util, UI = PM.ui, S = PM.store;
  const K = (PM.shortcuts = {});
  let prefix = null, prefixTimer = null;

  const HELP = [
    ['Jumping', [['g then i', 'Go to Inbox'], ['g then s', 'Go to Starred conversations'], ['g then t', 'Go to Sent messages'], ['g then d', 'Go to Drafts'], ['g then a', 'Go to All Mail'], ['g then c', 'Go to Contacts'], ['g then k', 'Go to Tasks'], ['g then l', 'Go to Label']]],
    ['Threadlist selection', [['* then a', 'Select all conversations'], ['* then n', 'Deselect all conversations'], ['* then r', 'Select read conversations'], ['* then u', 'Select unread conversations'], ['* then s', 'Select starred conversations'], ['* then t', 'Select unstarred conversations']]],
    ['Navigation', [['u', 'Back to threadlist'], ['k / j', 'Newer / older conversation'], ['o or <Enter>', 'Open conversation; collapse/expand conversation'], ['p / n', 'Read previous / next message'], ['`', 'Go to next inbox section'], ['~', 'Go to previous inbox section']]],
    ['Application', [['c', 'Compose'], ['/', 'Search mail'], ['q', 'Search chat contacts'], ['?', 'Open keyboard shortcut help'], ['Esc', 'Close'], ['<Ctrl> + <Enter>', 'Send message (in compose)']]],
    ['Actions', [['x', 'Select conversation'], ['s', 'Rotate superstar'], ['e', 'Archive'], ['m', 'Mute conversation'], ['!', 'Report as spam'], ['#', 'Delete'], ['r', 'Reply'], ['a', 'Reply all'], ['f', 'Forward'], ['<Shift> + i', 'Mark as read'], ['<Shift> + u', 'Mark as unread'], ['+ or =', 'Mark as important'], ['-', 'Mark as not important'], ['z', 'Undo last action'], ['l', 'Open "label as" menu'], ['v', 'Open "move to" menu'], ['y', 'Remove label / archive'], ['.', 'Open "more actions" menu'], ['<Shift> + t', 'Add conversation to Tasks']]],
  ];

  K.help = function () {
    if (U.$('#kbd-help')) return;
    const on = S.settings().shortcuts;
    const el = U.h(`<div id="kbd-help" role="dialog" aria-label="Keyboard shortcuts" tabindex="-1"><div class="kh-in">
      <div class="kh-top"><span class="kh-title">Keyboard shortcuts</span><span class="kh-links">${on ? '' : '<span class="kh-off">Keyboard shortcuts are off. </span>'}<a href="#" data-k="toggle">${on ? 'Disable' : 'Enable'}</a> <a href="#" data-k="close">Close</a></span></div>
      <div class="kh-cols">${[[HELP[0], HELP[1]], [HELP[2], HELP[3]], [HELP[4]]].map((col) => `<div class="kh-col">${col.map(([t, rows]) => `<div class="kh-sec"><div class="kh-h">${t}</div><table>${rows.map(([k, d]) => `<tr><td class="kh-k">${U.esc(k)}</td><td class="kh-d">: ${U.esc(d)}</td></tr>`).join('')}</table></div>`).join('')}</div>`).join('')}</div>
      <div class="kh-foot">Shortcuts work when no text box is focused. Press <b>Esc</b> to close.</div></div></div>`);
    const close = () => { el.remove(); document.removeEventListener('keydown', esc, true); };
    const esc = (e) => { if (e.key === 'Escape' || e.key === '?') { e.preventDefault(); e.stopPropagation(); close(); } };
    el.addEventListener('click', (e) => {
      const k = e.target.closest('[data-k]');
      if (!k) { if (e.target === el) close(); return; }
      e.preventDefault();
      if (k.dataset.k === 'toggle') { S.setSettings({ shortcuts: !S.settings().shortcuts }); close(); K.help(); }
      else close();
    });
    document.addEventListener('keydown', esc, true);
    document.body.appendChild(el);
    el.focus();
  };

  function moveCursor(d) {
    const app = PM.app;
    if (app.route.mode === 'thread') { app.act(d > 0 ? 'older' : 'newer'); return; }
    if (!app.page.length) return;
    document.body.classList.add('kbd');
    app.cursor = U.clamp(app.cursor + d, 0, app.page.length - 1);
    U.$$('.tr.kf').forEach((r) => r.classList.remove('kf'));
    const row = U.$(`.tr[data-i="${app.cursor}"]`);
    if (row) { row.classList.add('kf'); row.scrollIntoView({ block: 'nearest' }); }
  }
  const cursorThread = () => PM.app.page[PM.app.cursor];

  function withTarget(fn) {
    const app = PM.app;
    if (app.route.mode === 'list' && !app.sel.size) {
      const t = cursorThread();
      if (!t) return;
      app.sel.add(t.id);
      fn();
      return;
    }
    fn();
  }

  function goLabel() {
    const labels = S.labels();
    const el = U.h(`<div class="jm lm golabel"><div class="lm-title">Go to label:</div><div class="lm-sw"><input class="ji lm-q" type="text"></div><div class="lm-list"></div></div>`);
    const q = U.$('.lm-q', el), list = U.$('.lm-list', el);
    const targets = [...Object.entries(PM.app.SYS).map(([k, n]) => ({ n, h: '#' + k })), ...labels.map((l) => ({ n: l.name, h: '#label/' + PM.app.enc(l.name) }))];
    const draw = () => {
      const f = q.value.toLowerCase();
      const vis = targets.filter((t) => t.n.toLowerCase().includes(f)).slice(0, 12);
      list.innerHTML = vis.map((t, i) => `<div class="jm-item${i === 0 ? ' hl' : ''}" data-h="${t.h}"><span class="jm-check"></span>${U.esc(t.n)}</div>`).join('');
      return vis;
    };
    draw();
    q.addEventListener('input', draw);
    q.addEventListener('keydown', (e) => { if (e.key === 'Enter') { const v = draw(); if (v[0]) { UI.closePopup(); PM.app.go(v[0].h); } } if (e.key === 'Escape') UI.closePopup(); });
    list.addEventListener('click', (e) => { const it = e.target.closest('[data-h]'); if (it) { UI.closePopup(); PM.app.go(it.dataset.h); } });
    const r = U.$('#toolbar').getBoundingClientRect();
    UI.popup({ left: r.left, right: r.left + 200, top: r.top, bottom: r.bottom }, el);
    setTimeout(() => q.focus(), 0);
  }

  K.init = function () {
    document.addEventListener('keydown', (e) => {
      if (e.defaultPrevented) return;
      if (e.key === 'Escape') {
        if (UI.popupOpen()) { UI.closePopup(); return; }
        if (PM.searchUI.isOpen()) { PM.searchUI.closeAdvanced(); return; }
        if (U.isTyping() && document.activeElement.id === 'q') { document.activeElement.blur(); return; }
        return;
      }
      if (!S.settings().shortcuts) return;
      if (U.isTyping() || UI.dialogOpen() || U.$('.viewer') || U.$('#signout')) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const app = PM.app;
      const key = e.key;
      if (prefix) {
        const p = prefix;
        prefix = null;
        clearTimeout(prefixTimer);
        if (p === 'g') {
          const map = { i: '#inbox', s: '#starred', t: '#sent', d: '#drafts', a: '#all', c: '#contacts' };
          if (map[key]) { e.preventDefault(); app.go(map[key]); return; }
          if (key === 'k') { e.preventDefault(); PM.tasks.open(); return; }
          if (key === 'l') { e.preventDefault(); goLabel(); return; }
        }
        if (p === '*') {
          const map = { a: 'all', n: 'none', r: 'read', u: 'unread', s: 'starred', t: 'unstarred' };
          if (map[key]) { e.preventDefault(); app.select(map[key]); return; }
        }
        return;
      }
      if (UI.popupOpen()) return;
      const inThread = app.route.mode === 'thread';
      const inList = app.route.mode === 'list';
      const handled = () => e.preventDefault();
      switch (key) {
        case 'g': case '*': prefix = key; prefixTimer = setTimeout(() => (prefix = null), 1500); return handled();
        case 'c': handled(); return PM.compose.open({});
        case 'd': handled(); return PM.compose.open({});
        case '/': handled(); U.$('#q').focus(); U.$('#q').select(); return;
        case 'q': handled(); return U.$('.ro-search input') && U.$('.ro-search input').focus();
        case '?': handled(); return K.help();
        case 'j': handled(); return moveCursor(1);
        case 'k': handled(); return moveCursor(-1);
        case 'o': case 'Enter':
          if (inList) { const t = cursorThread(); if (t) { handled(); PM.list.openThread(t); } }
          else if (inThread) {
            handled();
            const cur = U.$('.msg.kcur') || U.$$('.msg').pop();
            if (cur) cur.click();
          }
          return;
        case 'u': if (inThread || (app.route.mode === 'contacts' && app.route.contactId)) { handled(); app.act('back'); if (app.route.mode === 'contacts') app.go('#contacts'); } return;
        case 'x': if (inList) { const t = cursorThread(); if (t) { handled(); if (app.sel.has(t.id)) app.sel.delete(t.id); else app.sel.add(t.id); app.schedule(); } } return;
        case 's': {
          handled();
          if (inList) { const t = cursorThread(); if (t) S.setStar([t.id], !t.starred, app.scope()); }
          else if (inThread) { const th = S.thread(app.route.threadId, app.scope()); if (th) S.setStar([th.id], !th.starred, app.scope()); }
          return;
        }
        case 'e': case 'y': if (inList || inThread) { handled(); withTarget(() => app.act(app.scope() === 'normal' ? (app.route.view.type === 'label' && key === 'y' ? 'removeLabel' : 'archive') : 'moveInbox')); } return;
        case 'm': if (inList || inThread) { handled(); withTarget(() => app.act('mute')); } return;
        case '!': if (inList || inThread) { handled(); withTarget(() => app.act(app.scope() === 'spam' ? 'notSpam' : 'spam')); } return;
        case '#': if (inList || inThread) { handled(); withTarget(() => app.act(app.scope() === 'trash' ? 'deleteForever' : 'delete')); } return;
        case 'r': case 'a': case 'f': {
          const kind = { r: 'reply', a: 'replyall', f: 'forward' }[key];
          if (inThread) { handled(); PM.thread.reply(kind); }
          else if (inList) { const t = cursorThread(); if (t) { handled(); const m = t.msgs.filter((x) => !S.has(x, 'DRAFT')).pop(); if (m) PM.compose.reply(m, kind, {}); } }
          return;
        }
        case 'I': if (inList || inThread) { handled(); withTarget(() => app.act('markRead')); } return;
        case 'U': if (inList || inThread) { handled(); withTarget(() => app.act('markUnread')); } return;
        case 'T': if (inList || inThread) { handled(); withTarget(() => app.act('addTask')); } return;
        case '+': case '=': if (inList || inThread) { handled(); withTarget(() => app.act('important')); } return;
        case '-': if (inList || inThread) { handled(); withTarget(() => app.act('notImportant')); } return;
        case 'z': if (app.lastUndo) { handled(); const u = app.lastUndo; app.lastUndo = null; UI.hideNotify(); u(); } return;
        case 'l': if ((inList && (app.sel.size || cursorThread())) || inThread) { handled(); withTarget(() => { app.renderToolbar(); const b = U.$('[data-act="labelMenu"]'); if (b) app.labelMenu(b); }); } return;
        case 'v': if ((inList && (app.sel.size || cursorThread())) || inThread) { handled(); withTarget(() => { app.renderToolbar(); const b = U.$('[data-act="moveMenu"]'); if (b) app.moveMenu(b); }); } return;
        case '.': if (inList || inThread) { handled(); withTarget(() => { app.renderToolbar(); const b = U.$('#toolbar [data-act="more"]'); if (b) app.moreMenu(b); }); } return;
        case 'n': case 'p':
          if (inThread) {
            handled();
            const msgs = U.$$('.msg');
            const cur = msgs.findIndex((m) => m.classList.contains('kcur'));
            const ni = U.clamp(cur + (key === 'n' ? 1 : -1), 0, msgs.length - 1);
            msgs.forEach((m, i) => m.classList.toggle('kcur', i === ni));
            msgs[ni] && msgs[ni].scrollIntoView({ block: 'nearest' });
          }
          return;
        case 'N': if (inThread) { handled(); app.schedule(); } return;
      }
    });
  };
})(window.PM);
