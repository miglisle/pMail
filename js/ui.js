/* pMail — UI primitives: menus, dialogs, notification bar, tooltips */
(function (PM) {
  'use strict';
  const U = PM.util;
  const UI = (PM.ui = {});

  /* ---------- Popups & menus ---------- */
  let openPopup = null;

  UI.closePopup = function () {
    if (openPopup) {
      const p = openPopup;
      openPopup = null;
      p.el.remove();
      if (p.anchor) p.anchor.classList.remove('active');
      p.onClose && p.onClose();
    }
  };
  UI.popupOpen = () => !!openPopup;

  UI.position = function (el, anchor, opts = {}) {
    const r = anchor.getBoundingClientRect ? anchor.getBoundingClientRect() : anchor;
    el.style.visibility = 'hidden';
    el.style.left = '0px'; el.style.top = '0px';
    document.body.appendChild(el);
    const w = el.offsetWidth, h = el.offsetHeight;
    const vw = window.innerWidth, vh = window.innerHeight;
    let x = opts.align === 'right' ? r.right - w : r.left;
    let y = opts.above ? r.top - h - 2 : r.bottom + (opts.gap != null ? opts.gap : 2);
    if (opts.side) { x = r.right + 2; y = r.top - 6; if (x + w > vw - 4) x = r.left - w - 2; }
    if (x + w > vw - 4) x = vw - w - 4;
    if (x < 4) x = 4;
    if (y + h > vh - 4) y = Math.max(4, opts.side ? vh - h - 4 : r.top - h - 2);
    if (y < 4) y = 4;
    el.style.left = x + 'px'; el.style.top = y + 'px';
    el.style.visibility = '';
  };

  UI.popup = function (anchor, el, opts = {}) {
    UI.closePopup();
    el.classList.add('pm-popup');
    UI.position(el, anchor, opts);
    if (anchor && anchor.classList) anchor.classList.add('active');
    openPopup = { el, anchor: anchor && anchor.classList ? anchor : null, onClose: opts.onClose };
    return { el, close: UI.closePopup };
  };

  document.addEventListener('mousedown', (e) => {
    if (!openPopup) return;
    if (openPopup.el.contains(e.target)) return;
    if (openPopup.anchor && openPopup.anchor.contains(e.target)) return;
    UI.closePopup();
  }, true);
  window.addEventListener('resize', () => UI.closePopup());

  /* items: {label, html, action, checked, radio, disabled, sep, header, hint, sub, cls, keep} */
  UI.menu = function (anchor, items, opts = {}) {
    if (openPopup && openPopup.anchor === anchor && !opts.force) { UI.closePopup(); return null; }
    const el = buildMenu(items, opts);
    const p = UI.popup(anchor, el, opts);
    el.focus({ preventScroll: true });
    return p;
  };

  function buildMenu(items, opts) {
    const el = U.h(`<div class="jm ${opts.className || ''}" role="menu" tabindex="-1"></div>`);
    if (opts.minWidth) el.style.minWidth = opts.minWidth + 'px';
    let subOpen = null;
    const closeSub = () => { if (subOpen) { subOpen.remove(); subOpen = null; } };
    items.forEach((it) => {
      if (!it) return;
      if (it.sep) { el.appendChild(U.h('<div class="jm-sep" role="separator"></div>')); return; }
      if (it.header) { el.appendChild(U.h(`<div class="jm-header">${U.esc(it.header)}</div>`)); return; }
      if (it.node) { el.appendChild(it.node); return; }
      const row = U.h(`<div class="jm-item${it.disabled ? ' dis' : ''}${it.checked ? ' chk' : ''}${it.sub ? ' has-sub' : ''} ${it.cls || ''}" role="menuitem" tabindex="-1"></div>`);
      row.innerHTML = `<span class="jm-check">${it.checked ? PM.icon('check', 16) : ''}</span>${it.html || U.esc(it.label)}${it.hint ? `<span class="jm-hint">${U.esc(it.hint)}</span>` : ''}${it.sub ? '<span class="jm-arrow"></span>' : ''}`;
      if (!it.disabled) {
        row.addEventListener('mouseenter', () => {
          U.$$('.jm-item.hl', el).forEach((x) => x.classList.remove('hl'));
          row.classList.add('hl');
          closeSub();
          if (it.sub) {
            subOpen = buildMenu(typeof it.sub === 'function' ? it.sub() : it.sub, { className: 'jm-sub' });
            subOpen.classList.add('pm-popup');
            el.appendChild(subOpen);
            const r = row.getBoundingClientRect();
            subOpen.style.position = 'fixed';
            UI.position(subOpen, r, { side: true });
            el.appendChild(subOpen);
          }
        });
        row.addEventListener('click', (e) => {
          e.stopPropagation();
          if (it.sub) return;
          if (!it.keep) UI.closePopup();
          it.action && it.action(e);
        });
      }
      el.appendChild(row);
    });
    el.addEventListener('keydown', (e) => {
      const rows = U.$$(':scope > .jm-item:not(.dis)', el);
      let i = rows.findIndex((r) => r.classList.contains('hl'));
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        i = e.key === 'ArrowDown' ? (i + 1) % rows.length : (i - 1 + rows.length) % rows.length;
        rows.forEach((r) => r.classList.remove('hl'));
        rows[i] && rows[i].classList.add('hl');
      } else if (e.key === 'Enter' && i >= 0) { e.preventDefault(); rows[i].click(); }
      else if (e.key === 'Escape') { e.preventDefault(); UI.closePopup(); }
    });
    return el;
  }

  /* ---------- Dialogs ---------- */
  const dialogs = [];
  UI.dialog = function (o) {
    const ov = U.h('<div class="dlg-overlay"></div>');
    const d = U.h(`<div class="dlg ${o.className || ''}" role="dialog" aria-modal="true" tabindex="-1">
      <div class="dlg-title"><span>${U.esc(o.title || '')}</span>${o.noX ? '' : '<button class="dlg-x" aria-label="Close">' + PM.icon('close', 14) + '</button>'}</div>
      <div class="dlg-body"></div><div class="dlg-btns"></div></div>`);
    if (o.width) d.style.width = o.width + 'px';
    const body = U.$('.dlg-body', d);
    if (typeof o.body === 'string') body.innerHTML = o.body; else if (o.body) body.appendChild(o.body);
    const btns = U.$('.dlg-btns', d);
    const close = (res) => {
      ov.remove(); d.remove();
      const i = dialogs.indexOf(api); if (i >= 0) dialogs.splice(i, 1);
      o.onClose && o.onClose(res);
    };
    (o.buttons || [{ label: 'OK', primary: true }]).forEach((b) => {
      const btn = U.h(`<button class="jb ${b.primary ? 'jb-blue' : ''} ${b.red ? 'jb-red' : ''}">${U.esc(b.label)}</button>`);
      btn.addEventListener('click', () => { if (b.action && b.action(api) === false) return; close(b.value); });
      btns.appendChild(btn);
    });
    if (!(o.buttons || [1]).length) btns.remove();
    const x = U.$('.dlg-x', d);
    x && x.addEventListener('click', () => close(null));
    d.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { e.stopPropagation(); close(null); }
      if (e.key === 'Enter' && e.target.tagName === 'INPUT' && e.target.type !== 'checkbox') {
        const p = U.$('.jb-blue', btns) || U.$('.jb', btns);
        if (p) { e.preventDefault(); p.click(); }
      }
    });
    document.body.append(ov, d);
    const api = { el: d, body, close };
    dialogs.push(api);
    const f = U.$('input:not([type=hidden]):not([type=checkbox]):not([type=radio]),textarea', body);
    setTimeout(() => (f ? (f.focus(), f.select && f.select()) : (U.$('.jb-blue', btns) || d).focus()), 0);
    return api;
  };
  UI.dialogOpen = () => dialogs.length > 0;

  UI.alert = (msg, title) => new Promise((res) => UI.dialog({ title: title || '', body: `<div class="dlg-msg">${msg}</div>`, buttons: [{ label: 'OK', primary: true }], onClose: () => res() }));
  UI.confirm = (msg, opts = {}) => new Promise((res) => UI.dialog({
    title: opts.title || 'Confirm', body: `<div class="dlg-msg">${msg}</div>`,
    buttons: [{ label: opts.ok || 'OK', primary: true, value: true }, { label: opts.cancel || 'Cancel', value: false }],
    onClose: (v) => res(!!v),
  }));
  UI.prompt = (o) => new Promise((res) => {
    const body = U.h(`<div><div class="dlg-label">${U.esc(o.label || '')}</div><input class="ji" type="text" value="${U.esc(o.value || '')}" style="width:100%"></div>`);
    UI.dialog({
      title: o.title || '', body, width: o.width || 420,
      buttons: [{ label: o.ok || 'OK', primary: true, action: () => { res(U.$('input', body).value); } }, { label: 'Cancel', action: () => res(null) }],
      onClose: (v) => { if (v === null) res(null); },
    });
  });

  /* ---------- Yellow notification bar ---------- */
  let nTimer = null;
  UI.notify = function (html, o = {}) {
    const bar = U.$('#notify');
    clearTimeout(nTimer);
    const links = [];
    if (o.undo) links.push({ label: 'Undo', action: o.undo, id: 'undo' });
    (o.links || []).forEach((l) => links.push(l));
    bar.innerHTML = `<div class="nb"><span class="nb-msg">${html}</span>${links.map((l, i) => `<span class="nb-link" data-i="${i}" role="link" tabindex="0">${U.esc(l.label)}</span>`).join('')}</div>`;
    U.$$('.nb-link', bar).forEach((a) => a.addEventListener('click', () => {
      const l = links[+a.dataset.i];
      UI.hideNotify();
      l.action && l.action();
    }));
    bar.hidden = false;
    PM.app && (PM.app.lastUndo = o.undo || null);
    if (o.sticky) return;
    nTimer = setTimeout(UI.hideNotify, o.timeout || (links.length ? 20000 : 8000));
  };
  UI.hideNotify = () => { clearTimeout(nTimer); const b = U.$('#notify'); if (b) b.hidden = true; };

  UI.loading = (on) => { if (on) UI.notify('Loading...', { sticky: true }); else UI.hideNotify(); };

  /* ---------- Tooltips ---------- */
  let tipTimer = null, tipEl = null, tipFor = null;
  function showTip(target) {
    const text = target.getAttribute('data-tip');
    if (!text) return;
    tipEl = tipEl || document.getElementById('tooltip');
    tipEl.innerHTML = `<div class="tt-arrow"></div><div class="tt-text">${U.esc(text)}</div>`;
    tipEl.hidden = false;
    const r = target.getBoundingClientRect();
    const w = tipEl.offsetWidth;
    let x = r.left + r.width / 2 - w / 2;
    x = U.clamp(x, 4, window.innerWidth - w - 4);
    let y = r.bottom + 8;
    let below = true;
    if (y + tipEl.offsetHeight > window.innerHeight - 4) { y = r.top - tipEl.offsetHeight - 8; below = false; }
    tipEl.classList.toggle('above', !below);
    tipEl.style.left = x + 'px';
    tipEl.style.top = y + 'px';
    U.$('.tt-arrow', tipEl).style.left = (r.left + r.width / 2 - x - 6) + 'px';
  }
  const hideTip = () => { clearTimeout(tipTimer); tipFor = null; if (tipEl) tipEl.hidden = true; };
  document.addEventListener('mouseover', (e) => {
    const t = e.target.closest && e.target.closest('[data-tip]');
    if (t === tipFor) return;
    hideTip();
    if (!t) return;
    tipFor = t;
    tipTimer = setTimeout(() => { if (tipFor === t && document.body.contains(t)) showTip(t); }, 450);
  });
  document.addEventListener('mousedown', hideTip, true);
  document.addEventListener('scroll', hideTip, true);
  UI.hideTip = hideTip;

  /* ---------- Small builders ---------- */
  UI.checkbox = (state) => `<span class="cb${state === true ? ' on' : state === 'some' ? ' some' : ''}" role="checkbox" aria-checked="${state === true}"></span>`;
  UI.btn = (o) => `<button class="jb${o.cls ? ' ' + o.cls : ''}" ${o.id ? `id="${o.id}"` : ''} data-act="${o.act || ''}" ${o.tip ? `data-tip="${U.esc(o.tip)}"` : ''} aria-label="${U.esc(o.tip || o.label || '')}">${o.html || U.esc(o.label || '')}${o.caret ? '<span class="caret"></span>' : ''}</button>`;

  /* Default "no photo" silhouette, or the user's own picture */
  UI.avatar = function (addr, size = 40, cls = '') {
    const S = PM.store;
    if (S.isMe(addr) && S.settings().picture) return `<img class="av ${cls}" src="${S.settings().picture}" width="${size}" height="${size}" alt="">`;
    const c = addr && S.contactByEmail(addr.email);
    if (c && c.photo) return `<img class="av ${cls}" src="${c.photo}" width="${size}" height="${size}" alt="">`;
    return `<span class="av av-def ${cls}" style="width:${size}px;height:${size}px"><svg viewBox="0 0 40 40" width="${size}" height="${size}" aria-hidden="true"><circle cx="20" cy="15" r="7.5"/><path d="M5 40c0-9 6.7-14.5 15-14.5S35 31 35 40z"/></svg></span>`;
  };
})(window.PM);
