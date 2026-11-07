/* pMail — boot & simulated mail delivery */
(function (PM) {
  'use strict';
  const U = PM.util, S = PM.store;

  /* New demo mail trickles in while the app is open (and on Refresh). */
  const M = (PM.mailer = { last: Date.now() });
  M.check = function (manual) {
    if (!S.pendingIncoming()) return null;
    if (manual && Date.now() - M.last < 15000) return null;
    M.last = Date.now();
    const m = S.deliverNext();
    if (m) M.notifyNew(m);
    return m;
  };
  M.notifyNew = function (m) {
    const mode = S.settings().notifications;
    if (mode === 'off' || !window.Notification || Notification.permission !== 'granted') return;
    if (!S.has(m, 'INBOX') || !S.has(m, 'UNREAD')) return;
    if (mode === 'important' && !S.has(m, 'IMPORTANT')) return;
    try {
      const n = new Notification(m.from.name || m.from.email, { body: m.subject + '\n' + S.snippetOf(m).slice(0, 120), icon: 'img/favicon.svg', tag: m.id });
      n.onclick = () => { window.focus(); PM.app.go('#inbox/' + S.threadKeyOf(m)); n.close(); };
    } catch (e) { /* ignore */ }
  };
  M.start = function () {
    const tick = () => {
      M.check(false);
      setTimeout(tick, 70000 + Math.random() * 80000);
    };
    setTimeout(tick, 45000);
  };

  function boot() {
    S.load();
    const loading = U.$('#loading');
    U.$('#loading-user').textContent = S.me().email;
    const bar = U.$('#loading-bar span');
    let p = 0;
    const iv = setInterval(() => { p = Math.min(100, p + 18 + Math.random() * 20); bar.style.width = p + '%'; }, 70);
    setTimeout(() => {
      clearInterval(iv);
      bar.style.width = '100%';
      U.$('#app').hidden = false;
      PM.app.init();
      loading.classList.add('done');
      setTimeout(() => loading.remove(), 320);
    }, 520);
  }
  // Keep tabs in sync if pMail is open in two windows
  window.addEventListener('storage', (e) => {
    if (e.key === 'pmail.state.v1' && e.newValue) { S.load(); PM.bus.emit('change', { external: true }); }
  });
  window.addEventListener('beforeunload', () => { PM.compose.list.forEach((c) => c.saveDraft && c.saveDraft()); S.flush(); });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})(window.PM);
