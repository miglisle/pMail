/* pMail — Tasks window */
(function (PM) {
  'use strict';
  const U = PM.util, UI = PM.ui, S = PM.store;
  const TK = (PM.tasks = { el: null });

  TK.open = function () {
    if (TK.el) { TK.el.classList.remove('min'); focusFirst(); return; }
    const el = U.h(`<div class="cw tw" tabindex="-1"><div class="cw-head" data-k="head"><span class="cw-title">Tasks</span><span class="cw-hb">
      <button class="cw-hbtn" data-k="min" aria-label="Minimize" data-tip="Minimize">${PM.icon('minimize', 14)}</button><button class="cw-hbtn" data-k="close" aria-label="Close" data-tip="Close">${PM.icon('close', 14)}</button></span></div>
      <div class="tw-sub">${U.esc(U.firstName(S.me().name))}'s list</div>
      <div class="tw-list" role="list"></div>
      <div class="tw-foot"><button class="jb tw-btn tb-text" data-k="actions">Actions<span class="caret"></span></button>
        <button class="jb tw-btn" data-k="add" data-tip="Add task" aria-label="Add task">${PM.icon('add', 16)}</button>
        <button class="jb tw-btn" data-k="del" data-tip="Delete task" aria-label="Delete task">${PM.icon('delete', 16)}</button></div></div>`);
    TK.el = el;
    let focusId = null;
    const list = U.$('.tw-list', el);
    const draw = () => {
      const tasks = S.tasks();
      list.innerHTML = tasks.map((t) => `<div class="tw-t${t.done ? ' done' : ''}" data-id="${t.id}" role="listitem"><span class="tw-cb">${UI.checkbox(t.done)}</span><input class="tw-in" value="${U.esc(t.title)}" placeholder="" aria-label="Task">${t.threadKey ? `<a class="tw-link" href="#all/${t.threadKey}" title="Related email">${PM.icon('mail', 14)}</a>` : ''}</div>`).join('') ||
        '<div class="tw-empty">No tasks. Click <b>+</b> to add one.</div>';
      if (focusId) { const inp = U.$(`.tw-t[data-id="${focusId}"] .tw-in`, list); if (inp) { inp.focus(); inp.setSelectionRange(inp.value.length, inp.value.length); } }
    };
    TK.draw = draw;
    list.addEventListener('click', (e) => {
      const cb = e.target.closest('.tw-cb');
      if (cb) { const id = cb.closest('.tw-t').dataset.id; const t = S.tasks().find((x) => x.id === id); S.updateTask(id, { done: !t.done }); draw(); }
    });
    list.addEventListener('focusin', (e) => { const r = e.target.closest('.tw-t'); if (r) { focusId = r.dataset.id; U.$$('.tw-t', list).forEach((x) => x.classList.toggle('cur', x === r)); } });
    list.addEventListener('input', (e) => { const r = e.target.closest('.tw-t'); if (r) S.updateTask(r.dataset.id, { title: e.target.value }); });
    list.addEventListener('keydown', (e) => {
      const r = e.target.closest('.tw-t');
      if (!r) return;
      e.stopPropagation();
      if (e.key === 'Enter') { const t = S.addTask({ title: '' }, r.dataset.id); focusId = t.id; draw(); }
      else if (e.key === 'Backspace' && !e.target.value) { e.preventDefault(); const rows = U.$$('.tw-t', list); const i = rows.indexOf(r); S.deleteTask(r.dataset.id); focusId = rows[i - 1] ? rows[i - 1].dataset.id : null; draw(); }
      else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') { const rows = U.$$('.tw-t', list); const n = rows[rows.indexOf(r) + (e.key === 'ArrowUp' ? -1 : 1)]; if (n) U.$('.tw-in', n).focus(); }
    });
    el.addEventListener('click', (e) => {
      const k = e.target.closest('[data-k]');
      if (!k) return;
      switch (k.dataset.k) {
        case 'close': el.remove(); TK.el = null; break;
        case 'min': case 'head': if (e.target.closest('.cw-hbtn') || k.dataset.k === 'head') el.classList.toggle('min'); break;
        case 'add': { const t = S.addTask({ title: '' }, focusId); focusId = t.id; draw(); break; }
        case 'del': if (focusId) { S.deleteTask(focusId); focusId = null; draw(); } break;
        case 'actions': UI.menu(k, [
          { label: 'Clear completed', action: () => { S.clearCompleted(); draw(); } },
          { label: 'Sort by title', action: () => { S.raw().tasks.sort((a, b) => a.title.localeCompare(b.title)); S.changed({ tasks: true }); draw(); } },
          { sep: true },
          { label: 'Email task list', action: () => PM.compose.open({ subject: 'Task list', html: '<ul>' + S.tasks().map((t) => `<li>${t.done ? '<s>' : ''}${U.esc(t.title)}${t.done ? '</s>' : ''}</li>`).join('') + '</ul>' }) },
          { label: 'Print task list', action: () => { const w = window.open('', '_blank'); if (!w) return; w.document.write(`<title>Tasks</title><body style="font:13px Arial"><h3>Tasks</h3><ul>${S.tasks().map((t) => `<li>${t.done ? '✔ ' : ''}${U.esc(t.title)}</li>`).join('')}</ul><script>print()<\/script>`); w.document.close(); } },
        ], { above: true, minWidth: 170 }); break;
      }
    });
    U.$('#dock').appendChild(el);
    draw();
    function focusFirst() { const i = U.$('.tw-in', el); if (i) i.focus(); }
    focusFirst();
  };
  PM.bus.on('change', (w) => { if (w && w.tasks && TK.el && !TK.el.contains(document.activeElement)) TK.draw(); });
})(window.PM);
