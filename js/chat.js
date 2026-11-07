/* pMail — chat roster (below the labels) and chat windows */
(function (PM) {
  'use strict';
  const U = PM.util, UI = PM.ui, S = PM.store;
  const CH = (PM.chat = { windows: [] });
  const REPLIES = ['Haha, totally 😄', 'Sounds good!', 'Yep, I\'m around.', 'Let me check and get back to you.', 'Nice! 👍', 'Oh really? Tell me more.', 'Can\'t talk long, in a meeting — ping you after?', 'Ha, same.', 'Sure thing!', 'Ooh, good idea.'];
  let filter = '';

  CH.init = function () {
    const r = U.$('#roster');
    r.innerHTML = `<div class="ro-me"><span class="ro-av">${UI.avatar(S.me(), 28)}</span><span class="ro-name"></span><span class="caret"></span><button class="ro-new" data-tip="New chat" aria-label="New chat">${PM.icon('add', 18)}</button></div>
      <div class="ro-search"><input type="text" placeholder="Search people..." aria-label="Search people"></div>
      <div class="ro-list"></div>
      <div class="ro-foot"><button data-tip="Contacts" data-ro="contacts">${PM.icon('person', 18)}</button><button data-tip="Chats" data-ro="chats" class="on">${PM.icon('quoteBubble', 18)}</button><button data-tip="Phone" data-ro="phone">${PM.icon('phone', 18)}</button></div>`;
    U.$('.ro-search input', r).addEventListener('input', (e) => { filter = e.target.value.trim().toLowerCase(); CH.renderRoster(); });
    U.$('.ro-search input', r).addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { const c = visible()[0]; if (c) { CH.open(c); e.target.value = ''; filter = ''; CH.renderRoster(); } }
      if (e.key === 'Escape') { e.target.value = ''; filter = ''; CH.renderRoster(); e.target.blur(); }
    });
    r.addEventListener('click', (e) => {
      const row = e.target.closest('.ro-c');
      if (row) { const c = S.contact(row.dataset.id); if (c) CH.open(c); return; }
      const f = e.target.closest('[data-ro]');
      if (f) {
        if (f.dataset.ro === 'contacts') PM.app.go('#contacts');
        else if (f.dataset.ro === 'phone') UI.notify('Calling isn\'t available in this demo.');
        return;
      }
      if (e.target.closest('.ro-new')) { U.$('.ro-search input', r).focus(); return; }
      if (e.target.closest('.ro-me')) {
        const me = S.me();
        UI.menu(U.$('.ro-me', r), [
          { header: me.name },
          { label: 'Available', checked: (S.settings().chatStatus || 'available') === 'available', action: () => S.setSettings({ chatStatus: 'available' }) },
          { label: 'Busy', checked: S.settings().chatStatus === 'busy', action: () => S.setSettings({ chatStatus: 'busy' }) },
          { label: 'Invisible', checked: S.settings().chatStatus === 'invisible', action: () => S.setSettings({ chatStatus: 'invisible' }) },
          { sep: true },
          { label: 'Sign out of chat', action: () => S.setSettings({ chatOn: false }) },
        ], { minWidth: 170 });
      }
    });
    CH.renderRoster();
  };

  const STATUS_ORDER = { available: 0, away: 1, offline: 2 };
  function visible() {
    return S.contacts().filter((c) => c.group === 'my' && (!filter || (c.name + ' ' + c.email).toLowerCase().includes(filter)))
      .sort((a, b) => (STATUS_ORDER[a.status] ?? 2) - (STATUS_ORDER[b.status] ?? 2) || a.name.localeCompare(b.name));
  }

  CH.renderRoster = function () {
    const r = U.$('#roster');
    if (!r || !r.firstChild) return;
    const me = S.me();
    const st = S.settings().chatStatus || 'available';
    U.$('.ro-name', r).innerHTML = `<span class="dot ${st === 'busy' ? 'busy' : st === 'invisible' ? 'offline' : 'available'}"></span>${U.esc(U.firstName(me.name))}`;
    U.$('.ro-av', r).innerHTML = UI.avatar(me, 28);
    const list = visible().slice(0, filter ? 30 : 12);
    U.$('.ro-list', r).innerHTML = list.map((c) => `<div class="ro-c" data-id="${c.id}" title="${U.esc(c.name)} <${U.esc(c.email)}>">${UI.avatar(c, 24)}<span class="dot ${c.status || 'offline'}"></span><span class="ro-cn">${U.esc(c.name || c.email)}</span></div>`).join('') ||
      `<div class="ro-empty">${filter ? 'No matches' : 'No contacts'}</div>`;
  };

  CH.open = function (c) {
    let w = CH.windows.find((x) => x.c.email === c.email);
    if (w) { w.min = false; w.el.classList.remove('min'); U.$('textarea', w.el).focus(); return; }
    const el = U.h(`<div class="cw chw" tabindex="-1"><div class="cw-head" data-k="head"><span class="dot ${c.status || 'offline'}"></span><span class="cw-title">${U.esc(c.name || c.email)}</span><span class="cw-hb">
      <button class="cw-hbtn" data-k="min" aria-label="Minimize" data-tip="Minimize">${PM.icon('minimize', 14)}</button><button class="cw-hbtn" data-k="close" aria-label="Close" data-tip="Close">${PM.icon('close', 14)}</button></span></div>
      <div class="chw-log" aria-live="polite"></div><div class="chw-typing" hidden>${U.esc(U.firstName(c.name))} is typing…</div>
      <div class="chw-in"><textarea rows="1" placeholder="${c.status === 'offline' ? 'Send a message (they\'re offline)...' : 'Send a message...'}" aria-label="Chat message"></textarea></div></div>`);
    w = { c, el, min: false };
    CH.windows.push(w);
    const draw = () => {
      const log = U.$('.chw-log', el);
      const items = S.chat(c.email);
      let lastDay = '';
      log.innerHTML = items.map((m) => {
        const d = new Date(m.time).toDateString();
        const head = d !== lastDay ? `<div class="chw-day">${U.listDate(m.time)}</div>` : '';
        lastDay = d;
        return `${head}<div class="chw-m ${m.me ? 'me' : 'them'}"><span class="chw-b">${U.esc(m.text)}</span></div>`;
      }).join('') || `<div class="chw-day">Say hi to ${U.esc(U.firstName(c.name) || c.email)}!</div>`;
      log.scrollTop = log.scrollHeight;
    };
    w.draw = draw;
    draw();
    const ta = U.$('textarea', el);
    ta.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        const text = ta.value.trim();
        if (!text) return;
        ta.value = '';
        S.addChat(c.email, { me: true, text });
        draw();
        if (c.status === 'available' || c.status === 'away') {
          const typing = U.$('.chw-typing', el);
          setTimeout(() => { typing.hidden = false; }, 800);
          setTimeout(() => {
            typing.hidden = true;
            S.addChat(c.email, { me: false, text: REPLIES[Math.floor(Math.random() * REPLIES.length)] });
            draw();
            if (w.min) el.classList.add('blink');
          }, 2200 + Math.random() * 1800);
        }
      }
    });
    el.addEventListener('click', (e) => {
      const k = e.target.closest('[data-k]');
      if (!k) { el.classList.remove('blink'); return; }
      if (k.dataset.k === 'close') { el.remove(); CH.windows = CH.windows.filter((x) => x !== w); }
      else { w.min = !w.min; el.classList.toggle('min', w.min); el.classList.remove('blink'); if (!w.min) ta.focus(); }
    });
    U.$('#dock').appendChild(el);
    ta.focus();
  };
})(window.PM);
