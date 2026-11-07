/* pMail — Contacts manager */
(function (PM) {
  'use strict';
  const U = PM.util, UI = PM.ui, S = PM.store;
  const CT = (PM.contacts = { sel: new Set() });
  const GROUPS = { my: 'My Contacts', starred: 'Starred', frequent: 'Most Contacted', other: 'Other Contacts' };

  function inGroup(c, g) {
    if (g === 'my') return c.group === 'my';
    if (g === 'other') return c.group !== 'my';
    if (g === 'starred') return !!c.starred;
    if (g === 'frequent') return (c.freq || 0) > 0 || c.group === 'my';
    return true;
  }
  const listFor = (g) => {
    const l = S.contacts().filter((c) => inGroup(c, g));
    if (g === 'frequent') return l.sort((a, b) => (b.freq || 0) - (a.freq || 0)).slice(0, 20);
    return l.sort((a, b) => (a.name || a.email).localeCompare(b.name || b.email));
  };

  CT.renderNav = function (nav) {
    const r = PM.app.route;
    const item = (g) => {
      const n = g === 'my' || g === 'other' ? listFor(g).length : 0;
      return `<div class="nl${r.group === g && !r.contactId ? ' sel' : ''}" data-href="#contacts/${g}" style="padding-left:30px"><a class="nl-a" href="#contacts/${g}"><span class="nl-name">${GROUPS[g]}</span>${n ? `<span class="nl-cnt">&nbsp;(${n})</span>` : ''}</a></div>`;
    };
    nav.innerHTML = ['my', 'starred', 'frequent', 'other'].map(item).join('') +
      `<div class="nl-gap"></div><div class="nl nl-link" data-act="ct-import" style="padding-left:30px"><a class="nl-a"><span class="nl-name">Import Contacts...</span></a></div>
       <div class="nl nl-link" data-act="ct-export" style="padding-left:30px"><a class="nl-a"><span class="nl-name">Export...</span></a></div>
       <div class="nl nl-link" data-href="#inbox" style="padding-left:30px"><a class="nl-a" href="#inbox"><span class="nl-name">« Back to Mail</span></a></div>`;
    if (!nav._ctBound) {
      nav._ctBound = true;
      nav.addEventListener('click', (e) => {
        if (PM.app.route.mode !== 'contacts') return;
        const it = e.target.closest('[data-act]');
        if (!it) return;
        e.stopPropagation();
        if (it.dataset.act === 'ct-export') CT.exportCsv();
        if (it.dataset.act === 'ct-import') CT.importCsv();
      }, true);
    }
  };

  CT.renderToolbar = function (tb, right, gear) {
    const r = PM.app.route;
    if (r.contactId) {
      tb.innerHTML = `<div class="tb-g"><button class="jb tb tb-text" data-act="ct-back">« Back to ${GROUPS[r.group]}</button></div>
        ${r.contactId !== 'new' ? `<div class="tb-g joined"><button class="jb tb" data-act="ct-email" data-tip="Email">${PM.icon('mail', 18)}</button><button class="jb tb" data-act="ct-delete" data-tip="Delete contact">${PM.icon('delete', 18)}</button></div>` : ''}`;
    } else {
      const list = listFor(r.group);
      const n = list.filter((c) => CT.sel.has(c.id)).length;
      const st = n && n === list.length ? true : n ? 'some' : false;
      tb.innerHTML = `<div class="tb-g"><button class="jb tb tb-sel" data-act="ct-selall" aria-label="Select">${UI.checkbox(st)}</button></div>
        ${n ? `<div class="tb-g joined"><button class="jb tb" data-act="ct-email" data-tip="Email">${PM.icon('mail', 18)}</button><button class="jb tb" data-act="ct-delete" data-tip="Delete contacts">${PM.icon('delete', 18)}</button></div>
        ${r.group === 'other' ? '<div class="tb-g"><button class="jb tb tb-text" data-act="ct-addmy">Add to "My Contacts"</button></div>' : ''}` : ''}
        <div class="tb-g"><button class="jb tb tb-menu tb-text" data-act="ct-more">More<span class="caret"></span></button></div>`;
    }
    right.innerHTML = gear;
    if (!tb._ctBound) {
      tb._ctBound = true;
      tb.addEventListener('click', (e) => {
        if (PM.app.route.mode !== 'contacts') return;
        const b = e.target.closest('[data-act^="ct-"]');
        if (!b) return;
        e.stopPropagation();
        CT.act(b.dataset.act, b);
      }, true);
    }
  };

  CT.act = function (act, btn) {
    const r = PM.app.route;
    const ids = r.contactId && r.contactId !== 'new' ? [r.contactId] : Array.from(CT.sel);
    switch (act) {
      case 'ct-back': PM.app.go('#contacts/' + r.group); break;
      case 'ct-selall': {
        const list = listFor(r.group);
        if (list.every((c) => CT.sel.has(c.id))) CT.sel.clear(); else list.forEach((c) => CT.sel.add(c.id));
        PM.app.schedule();
        break;
      }
      case 'ct-email': {
        const to = ids.map((id) => S.contact(id)).filter(Boolean).map((c) => ({ name: c.name, email: c.email }));
        PM.compose.open({ to });
        break;
      }
      case 'ct-delete': {
        const n = ids.length;
        UI.confirm(n === 1 ? 'Delete this contact?' : `Delete ${n} contacts?`, { title: 'Delete contacts', ok: 'Delete' }).then((ok) => {
          if (!ok) return;
          const saved = ids.map((id) => ({ ...S.contact(id) }));
          S.deleteContacts(ids);
          CT.sel.clear();
          UI.notify(n === 1 ? 'The contact has been deleted.' : `${n} contacts have been deleted.`, { undo: () => { saved.forEach((c) => S.raw().contacts.push(c)); S.changed({ contacts: true }); } });
          if (r.contactId) PM.app.go('#contacts/' + r.group);
        });
        break;
      }
      case 'ct-addmy': ids.forEach((id) => { const c = S.contact(id); if (c) c.group = 'my'; }); CT.sel.clear(); S.changed({ contacts: true }); UI.notify('Added to "My Contacts".'); break;
      case 'ct-more': UI.menu(btn, [
        { label: 'Export...', action: CT.exportCsv }, { label: 'Import...', action: CT.importCsv },
        { sep: true }, { label: 'Print contacts', action: printContacts },
      ], { minWidth: 160 }); break;
    }
  };

  CT.render = function (el, route, routeChanged) {
    if (!routeChanged && el.className === 'view-contacts' && U.$('.ct-form.dirty', el)) return;
    el.className = 'view-contacts';
    if (route.contactId) return renderDetail(el, route);
    const list = listFor(route.group);
    el.innerHTML = `<div class="ct"><div class="ct-h"><h2>${GROUPS[route.group]}</h2><span class="ct-n">${U.plural(list.length, 'contact')}</span></div>
      ${list.length ? `<div class="ct-list">${list.slice(0, S.settings().contactsPageSize).map((c) => `<div class="ct-row${CT.sel.has(c.id) ? ' sel' : ''}" data-id="${c.id}">
        <span class="ct-chk">${UI.checkbox(CT.sel.has(c.id))}</span><span class="ct-star">${PM.starIcon(c.starred)}</span>
        <span class="ct-av">${UI.avatar(c, 28)}</span><span class="ct-name">${U.esc(c.name || '(no name)')}</span><span class="ct-email">${U.esc(c.email)}</span><span class="ct-phone">${U.esc(c.phone || '')}</span></div>`).join('')}</div>`
        : `<div class="empty">No contacts here yet. <a href="#contacts/new">Create a contact</a></div>`}</div>`;
    if (!el._ctBound) {
      el._ctBound = true;
      el.addEventListener('click', (e) => {
        if (el.className !== 'view-contacts') return;
        const rowEl = e.target.closest('.ct-row');
        if (!rowEl) return;
        const id = rowEl.dataset.id;
        if (e.target.closest('.ct-chk')) { if (CT.sel.has(id)) CT.sel.delete(id); else CT.sel.add(id); PM.app.schedule(); return; }
        if (e.target.closest('.ct-star')) { const c = S.contact(id); S.saveContact({ id, starred: !c.starred }); return; }
        PM.app.go(`#contacts/${PM.app.route.group}/${id}`);
      });
    }
  };

  function renderDetail(el, route) {
    const isNew = route.contactId === 'new';
    const c = isNew ? { name: '', email: '', phone: '', company: '', notes: '' } : S.contact(route.contactId);
    if (!c) { el.innerHTML = '<div class="empty">This contact could not be found.</div>'; return; }
    const msgs = isNew ? [] : S.threadsFor({ type: 'search', query: `from:${c.email} OR to:${c.email}` }).slice(0, 5);
    el.innerHTML = `<div class="ct ct-detail"><form class="ct-form" autocomplete="off">
      <div class="ct-top">${UI.avatar(c, 96)}<div class="ct-top-r"><input class="ji ct-big" name="name" placeholder="Name" value="${U.esc(c.name)}"><input class="ji" name="company" placeholder="Company" value="${U.esc(c.company || '')}"></div></div>
      <table class="ct-fields"><tr><td>Email</td><td><input class="ji" name="email" type="email" value="${U.esc(c.email)}"></td></tr>
      <tr><td>Phone</td><td><input class="ji" name="phone" value="${U.esc(c.phone || '')}"></td></tr>
      <tr><td>Notes</td><td><textarea class="ji" name="notes" rows="4">${U.esc(c.notes || '')}</textarea></td></tr></table>
      <div class="ct-btns"><button class="jb jb-blue" type="submit">Save</button> <button class="jb" type="button" data-ct="cancel">Cancel</button></div></form>
      ${msgs.length ? `<div class="ct-recent"><div class="ct-rh">Recent conversations</div>${msgs.map((t) => `<a class="ct-conv" href="#all/${t.id}"><span>${U.esc(t.subject || '(no subject)')}</span><span class="ct-cd">${U.listDate(t.date)}</span></a>`).join('')}</div>` : ''}</div>`;
    const form = U.$('.ct-form', el);
    form.addEventListener('input', () => form.classList.add('dirty'));
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const f = new FormData(form);
      const email = String(f.get('email') || '').trim();
      if (email && !U.isValidEmail(email)) { UI.alert('Please enter a valid email address.'); return; }
      if (!email && !String(f.get('name')).trim()) { UI.alert('Please enter a name or an email address.'); return; }
      const saved = S.saveContact({ id: isNew ? null : c.id, name: String(f.get('name')).trim(), email, phone: String(f.get('phone')).trim(), company: String(f.get('company')).trim(), notes: String(f.get('notes')), group: isNew ? 'my' : c.group === 'other' ? 'my' : c.group });
      form.classList.remove('dirty');
      UI.notify('Your contact has been saved.');
      PM.app.go(`#contacts/${route.group}/${saved.id}`);
    });
    U.$('[data-ct="cancel"]', el).addEventListener('click', () => PM.app.go('#contacts/' + route.group));
    if (isNew) setTimeout(() => U.$('[name=name]', form).focus(), 0);
  }

  CT.exportCsv = function () {
    const q = (v) => `"${String(v || '').replace(/"/g, '""')}"`;
    const csv = 'Name,E-mail Address,Phone,Company,Notes\n' + S.contacts().map((c) => [c.name, c.email, c.phone, c.company, c.notes].map(q).join(',')).join('\n');
    U.download('contacts.csv', URL.createObjectURL(new Blob([csv], { type: 'text/csv' })));
  };
  CT.importCsv = function () {
    const inp = U.h('<input type="file" accept=".csv,text/csv" hidden>');
    inp.addEventListener('change', async () => {
      const text = await inp.files[0].text();
      const lines = text.split(/\r?\n/).filter(Boolean);
      const parse = (line) => { const out = []; let cur = '', q = false; for (let i = 0; i < line.length; i++) { const ch = line[i]; if (ch === '"') { if (q && line[i + 1] === '"') { cur += '"'; i++; } else q = !q; } else if (ch === ',' && !q) { out.push(cur); cur = ''; } else cur += ch; } out.push(cur); return out; };
      const head = parse(lines.shift() || '').map((h) => h.toLowerCase());
      const iN = head.findIndex((h) => h.includes('name')), iE = head.findIndex((h) => h.includes('mail')), iP = head.findIndex((h) => h.includes('phone'));
      let n = 0;
      lines.forEach((l) => {
        const c = parse(l);
        const email = (c[iE] || '').trim();
        if (!U.isValidEmail(email) || S.contactByEmail(email)) return;
        S.saveContact({ id: null, name: (c[iN] || '').trim(), email, phone: iP >= 0 ? (c[iP] || '').trim() : '', company: '', notes: '', group: 'my' });
        n++;
      });
      UI.notify(`${U.plural(n, 'contact')} imported.`);
    });
    document.body.appendChild(inp); inp.click(); setTimeout(() => inp.remove(), 60000);
  };
  function printContacts() {
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(`<!DOCTYPE html><title>Contacts</title><style>body{font:13px Arial;margin:24px}td{padding:4px 12px;border-bottom:1px solid #ddd}</style><h2>Contacts</h2><table>${S.contacts().map((c) => `<tr><td><b>${U.esc(c.name)}</b></td><td>${U.esc(c.email)}</td><td>${U.esc(c.phone || '')}</td></tr>`).join('')}</table><script>print()<\/script>`);
    w.document.close();
  }
})(window.PM);
