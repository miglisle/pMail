/* pMail — application shell: routing, navigation, toolbar, actions */
(function (PM) {
  'use strict';
  const U = PM.util, UI = PM.ui;
  const S = PM.store;
  const A = (PM.app = { sel: new Set(), cursor: 0, page: [], lastUndo: null, lastClicked: null });

  A.SYS = { inbox: 'Inbox', starred: 'Starred', imp: 'Important', chats: 'Chats', sent: 'Sent Mail', drafts: 'Drafts', all: 'All Mail', spam: 'Spam', trash: 'Trash' };
  A.CAT_NAMES = { personal: 'Primary', social: 'Social', promotions: 'Promotions', updates: 'Updates', forums: 'Forums' };
  A.CAT_COLORS = { personal: '#dd4b39', social: '#4285f4', promotions: '#0f9d58', updates: '#f4b400', forums: '#7e57c2' };
  A.CAT_ICONS = { personal: 'inbox', social: 'people', promotions: 'tag', updates: 'info', forums: 'forum' };

  const enc = (s) => encodeURIComponent(s).replace(/%20/g, '+');
  const dec = (s) => { try { return decodeURIComponent(String(s || '').replace(/\+/g, ' ')); } catch (e) { return s; } };
  A.enc = enc;

  /* ---------------- Routing ---------------- */
  A.parse = function (hash) {
    const h = String(hash || '').replace(/^#/, '') || 'inbox';
    const parts = h.split('/');
    const head = parts[0];
    const r = { mode: 'list', page: 1, threadId: null, view: null, hash: '#' + h };
    let rest = [];
    if (head === 'settings') { r.mode = 'settings'; r.tab = parts[1] || 'general'; return r; }
    if (head === 'contacts') { r.mode = 'contacts'; r.group = 'my'; r.contactId = null; parts.slice(1).forEach((p) => { if (/^(my|starred|other|frequent)$/.test(p)) r.group = p; else if (p === 'new') r.contactId = 'new'; else if (p) r.contactId = p; }); return r; }
    if (head === 'label') {
      const name = dec(parts[1]);
      const l = S.labelByName(name);
      r.view = { type: 'label', label: l ? l.id : '__missing', name };
      rest = parts.slice(2);
    } else if (head === 'category') {
      const cat = parts[1] === 'primary' ? 'personal' : parts[1];
      r.view = S.CATS.includes(cat) ? (cat === 'personal' ? { type: 'inbox' } : { type: 'category', cat }) : { type: 'inbox' };
      rest = parts.slice(2);
    } else if (head === 'catlabel') {
      r.view = { type: 'catlabel', cat: parts[1] };
      rest = parts.slice(2);
    } else if (head === 'search' || head === 'advanced-search') {
      r.view = { type: 'search', query: dec(parts[1]) };
      rest = parts.slice(2);
    } else if (A.SYS[head]) {
      r.view = { type: head };
      rest = parts.slice(1);
    } else {
      r.view = { type: 'inbox' };
    }
    for (const p of rest) {
      if (/^p\d+$/.test(p)) r.page = Math.max(1, +p.slice(1));
      else if (/^[0-9a-f]{16}$/.test(p)) { r.threadId = p; r.mode = 'thread'; }
    }
    return r;
  };

  A.baseHash = function (view) {
    if (!view) return '#inbox';
    switch (view.type) {
      case 'label': { const l = S.label(view.label); return '#label/' + enc(l ? l.name : view.name || ''); }
      case 'category': return '#category/' + view.cat;
      case 'catlabel': return '#catlabel/' + view.cat;
      case 'search': return '#search/' + enc(view.query || '');
      default: return '#' + view.type;
    }
  };
  A.listHash = (r) => A.baseHash(r.view) + (r.page > 1 ? '/p' + r.page : '');
  A.threadHash = (key, r) => A.baseHash((r || A.route).view) + '/' + key;
  A.go = (hash) => { if (location.hash === hash) A.onRoute(); else location.hash = hash; };

  A.viewName = function (view) {
    if (!view) return '';
    if (view.type === 'label') { const l = S.label(view.label); return l ? l.name.split('/').pop() : view.name; }
    if (view.type === 'category' || view.type === 'catlabel') return A.CAT_NAMES[view.cat];
    if (view.type === 'search') return 'Search results';
    return A.SYS[view.type] || '';
  };

  A.scope = () => S.scopeOf(A.route.view);

  let prevRoute = null;
  A.onRoute = function () {
    UI.closePopup();
    const r = A.parse(location.hash);
    const prev = prevRoute;
    A.route = r;
    PM.compose.onRoute(r);
    if (!prev || A.baseHash(prev.view) !== A.baseHash(r.view) || prev.mode !== r.mode || prev.page !== r.page) {
      if (r.mode !== 'thread') A.sel.clear();
    }
    if (r.mode === 'list' && (!prev || prev.mode !== 'list' || A.baseHash(prev.view) !== A.baseHash(r.view) || prev.page !== r.page)) {
      if (!(prev && prev.mode === 'thread' && A.baseHash(prev.view) === A.baseHash(r.view))) A.cursor = 0;
    }
    if (r.mode === 'thread' && (!prev || prev.threadId !== r.threadId)) PM.thread.opened(r.threadId);
    if (r.mode === 'list' && r.view.type === 'category') S.markTabSeen(r.view.cat);
    if (r.mode === 'list' && r.view.type === 'inbox' && S.tabsEnabled()) { /* Primary has no "new" badge */ }
    prevRoute = r;
    const sq = U.$('#q');
    if (sq && document.activeElement !== sq) sq.value = r.view && r.view.type === 'search' ? r.view.query : '';
    S.touch();
    A.render(true);
    const content = U.$('#content');
    if (!prev || prev.hash !== r.hash) {
      if (r.mode === 'list' && prev && prev.mode === 'thread' && A._listScroll != null && A.baseHash(prev.view) === A.baseHash(r.view)) content.scrollTop = A._listScroll;
      else content.scrollTop = 0;
    }
  };

  /* ---------------- Rendering ---------------- */
  let rafPending = false;
  A.schedule = function () {
    if (rafPending) return;
    rafPending = true;
    requestAnimationFrame(() => { rafPending = false; A.render(false); });
  };

  A.render = function (routeChanged) {
    if (!A.route) return;
    applyBodyClasses();
    if (PM.mobile && PM.mobile.active) { PM.mobile.render(A.route, routeChanged); updateTitle(); return; }
    renderNav();
    const content = U.$('#content');
    const keep = content.scrollTop;
    if (A.route.mode === 'list') PM.list.render(content, A.route);
    else if (A.route.mode === 'thread') PM.thread.render(content, A.route, routeChanged);
    else if (A.route.mode === 'settings') PM.settingsView.render(content, A.route, routeChanged);
    else if (A.route.mode === 'contacts') PM.contacts.render(content, A.route, routeChanged);
    if (!routeChanged) content.scrollTop = keep;
    renderToolbar();
    updateTitle();
    renderHeader();
    PM.chat && PM.chat.renderRoster();
  };

  let headerSig = '';
  function renderHeader() {
    const me = S.me();
    const sig = me.name + '|' + me.email + '|' + S.settings().picture.length;
    if (sig === headerSig) return;
    headerSig = sig;
    U.$('#gb-name').textContent = '+' + U.firstName(me.name);
    U.$('#gb-account').innerHTML = UI.avatar(me, 32);
    U.$('#gb-account').setAttribute('data-tip', `pMail Account: ${me.name} (${me.email})`);
  }

  function applyBodyClasses() {
    const s = S.settings();
    const b = document.body;
    b.className = b.className.replace(/\b(density|theme)-\S+/g, '').trim();
    b.classList.add('density-' + s.density, 'theme-' + s.theme);
    const th = PM.themes && PM.themes.get(s.theme);
    b.classList.toggle('theme-img', !!(th && th.img));
    b.classList.toggle('theme-darkish', !!(th && th.dark));
    b.classList.toggle('labels-text', s.buttonLabels === 'text');
    b.classList.toggle('no-chat', !s.chatOn);
    if (th && th.img) document.documentElement.style.setProperty('--theme-img', th.img); else document.documentElement.style.removeProperty('--theme-img');
  }

  /* ---------------- Title & favicon ---------------- */
  let lastIcon = '';
  function updateTitle() {
    const r = A.route, me = S.me();
    let t;
    const c = S.counts();
    if (r.mode === 'thread') { const th = S.thread(r.threadId, A.scope()); t = th ? th.subject || '(no subject)' : 'pMail'; }
    else if (r.mode === 'settings') t = 'Settings';
    else if (r.mode === 'contacts') t = 'Contacts';
    else {
      t = A.viewName(r.view);
      let n = 0;
      if (r.view.type === 'inbox') n = c.inbox;
      else if (r.view.type === 'drafts') n = c.drafts;
      else if (r.view.type === 'spam') n = c.spam;
      else if (r.view.type === 'label') n = c.labels[r.view.label] || 0;
      if (n) t += ` (${U.num(n)})`;
    }
    document.title = `${t} - ${me.email} - pMail`;
    const want = S.settings().labs.unreadIcon ? String(c.inbox) : '';
    if (want !== lastIcon) { lastIcon = want; setFavicon(want ? c.inbox : 0); }
  }
  function setFavicon(n) {
    const link = U.$('#favicon');
    if (!n) { link.href = 'img/favicon.svg'; return; }
    const cv = document.createElement('canvas'); cv.width = cv.height = 32;
    const x = cv.getContext('2d');
    x.fillStyle = '#fff'; x.strokeStyle = '#bbb'; x.lineWidth = 2;
    x.fillRect(1, 6, 30, 21); x.strokeRect(1, 6, 30, 21);
    x.strokeStyle = '#dd4b39'; x.lineWidth = 4; x.beginPath(); x.moveTo(3, 8); x.lineTo(16, 18); x.lineTo(29, 8); x.stroke();
    x.fillStyle = '#d14836'; x.fillRect(12, 14, 20, 16);
    x.fillStyle = '#fff'; x.font = 'bold 13px Arial'; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.fillText(n > 99 ? '99+' : String(n), 22, 22.5);
    link.href = cv.toDataURL();
  }

  /* ---------------- Navigation (left column) ---------------- */
  A.navKey = function () {
    const r = A.route;
    if (!r || r.mode === 'settings' || !r.view) return '';
    const v = r.view;
    if (v.type === 'label') return 'label:' + v.label;
    if (v.type === 'category') return 'inbox';
    if (v.type === 'catlabel') return 'cat:' + v.cat;
    if (v.type === 'search') return '';
    return v.type;
  };

  function navItem(o) {
    const pad = 30 + (o.depth || 0) * 12;
    return `<div class="nl${o.sel ? ' sel' : ''}${o.bold ? ' bold' : ''}${o.cls ? ' ' + o.cls : ''}" data-href="${o.href}" ${o.drop ? `data-drop="${o.drop}"` : ''} style="padding-left:${pad}px">
      ${o.sq !== undefined ? `<span class="nl-sq" style="${o.sq ? `background:${o.sq}` : ''}"></span>` : ''}
      <a class="nl-a" href="${o.href}" title="${U.esc(o.title || o.name)}"><span class="nl-name">${U.esc(o.name)}</span>${o.count ? `<span class="nl-cnt">&nbsp;(${U.num(o.count)})</span>` : ''}</a>
      ${o.menu ? `<span class="nl-menu" data-label="${o.menu}" role="button" aria-label="Label options"></span>` : ''}
    </div>`;
  }

  function renderNav() {
    const nav = U.$('#nav-labels');
    if (!nav) return;
    if (A.route.mode === 'contacts') { PM.contacts.renderNav(nav); U.$('#compose-btn').textContent = 'NEW CONTACT'; return; }
    U.$('#compose-btn').textContent = 'COMPOSE';
    const c = S.counts(), s = S.settings(), cur = A.navKey();
    const main = [], more = [];
    const sysOrder = [
      ['inbox', 'Inbox', c.inbox, 'INBOX'], ['starred', 'Starred', 0, 'STARRED'], ['imp', 'Important', 0, 'IMPORTANT'],
      ['chats', 'Chats', 0, null], ['sent', 'Sent Mail', 0, null], ['drafts', 'Drafts', c.drafts, null],
      ['all', 'All Mail', 0, null], ['spam', 'Spam', c.spam, 'SPAM'], ['trash', 'Trash', 0, 'TRASH'],
    ];
    const visKey = { starred: 'starred', imp: 'important', chats: 'chats', sent: 'sent', drafts: 'drafts', all: 'all', spam: 'spam', trash: 'trash' };
    for (const [key, name, count, drop] of sysOrder) {
      const vis = key === 'inbox' ? 'show' : s.sysLabels[visKey[key]];
      const html = navItem({ href: '#' + key, name, count, sel: cur === key, bold: !!count && key !== 'drafts', drop });
      if (vis === 'show' || cur === key || (vis === 'unread' && count)) main.push(html); else more.push(html);
    }
    // Categories
    const catVis = s.sysLabels.categories;
    const catsHtml = [`<div class="nl nl-cats${s.navCatsOpen ? ' open' : ''}" data-act="toggle-cats" style="padding-left:18px"><span class="nl-tri"></span><a class="nl-a"><span class="nl-name">Categories</span></a></div>`];
    if (s.navCatsOpen) ['social', 'updates', 'forums', 'promotions'].forEach((cat) => {
      if (s.catLabels[cat] === 'hide' && cur !== 'cat:' + cat) return;
      catsHtml.push(navItem({ href: '#catlabel/' + cat, name: A.CAT_NAMES[cat], depth: 1, sel: cur === 'cat:' + cat, drop: 'CAT:' + cat, count: 0 }));
    });
    (catVis === 'show' ? main : more).push(catsHtml.join(''));
    // User labels
    for (const l of S.labels()) {
      const depth = l.name.split('/').length - 1;
      const count = c.labels[l.id] || 0;
      const html = navItem({ href: '#label/' + enc(l.name), name: l.name.split('/').pop(), title: l.name, count, depth, sel: cur === 'label:' + l.id, bold: !!count, drop: l.id, sq: l.color ? l.color.bg : '', menu: l.id });
      if (l.show === 'show' || cur === 'label:' + l.id || (l.show === 'unread' && count)) main.push(html); else more.push(html);
    }
    const open = s.navMore;
    let html = main.join('');
    html += `<div class="nl nl-more" data-act="toggle-more" style="padding-left:30px"><a class="nl-a"><span class="nl-name">${open ? 'Less' : 'More'}</span><span class="${open ? 'caret-up' : 'caret'}"></span></a></div>`;
    if (open) {
      html += more.join('');
      html += `<div class="nl nl-link" data-act="manage-labels" style="padding-left:30px"><a class="nl-a"><span class="nl-name">Manage labels</span></a></div>`;
      html += `<div class="nl nl-link" data-act="new-label" style="padding-left:30px"><a class="nl-a"><span class="nl-name">Create new label</span></a></div>`;
    }
    const sc = nav.scrollTop;
    nav.innerHTML = html;
    nav.scrollTop = sc;
  }

  function bindNav() {
    const nav = U.$('#nav-labels');
    nav.addEventListener('click', (e) => {
      const menu = e.target.closest('.nl-menu');
      if (menu) { e.preventDefault(); e.stopPropagation(); A.labelOptions(menu, menu.dataset.label); return; }
      const it = e.target.closest('.nl');
      if (!it) return;
      e.preventDefault();
      const act = it.dataset.act;
      if (act === 'toggle-more') { S.setSettings({ navMore: !S.settings().navMore }); return; }
      if (act === 'toggle-cats') { S.setSettings({ navCatsOpen: !S.settings().navCatsOpen }); return; }
      if (act === 'manage-labels') { A.go('#settings/labels'); return; }
      if (act === 'new-label') { A.newLabelDialog(); return; }
      if (it.dataset.href) {
        if (it.dataset.href === location.hash) A.onRoute(); else A.go(it.dataset.href);
      }
    });
    // Drag & drop targets
    nav.addEventListener('dragover', (e) => {
      const it = e.target.closest('.nl[data-drop]');
      if (!it || !A.dragKeys) return;
      e.preventDefault();
      U.$$('.nl.drop', nav).forEach((x) => x !== it && x.classList.remove('drop'));
      it.classList.add('drop');
    });
    nav.addEventListener('dragleave', (e) => { const it = e.target.closest('.nl'); if (it && !it.contains(e.relatedTarget)) it.classList.remove('drop'); });
    nav.addEventListener('drop', (e) => {
      const it = e.target.closest('.nl[data-drop]');
      U.$$('.nl.drop', nav).forEach((x) => x.classList.remove('drop'));
      if (!it || !A.dragKeys) return;
      e.preventDefault();
      A.dropOn(it.dataset.drop, A.dragKeys);
      A.dragKeys = null;
    });
  }

  A.dropOn = function (target, keys) {
    const scope = A.scope();
    const n = keys.length;
    const conv = n === 1 ? 'The conversation has' : `${n} conversations have`;
    let undo;
    if (target === 'STARRED') { undo = S.setStar(keys, true, scope); UI.notify(`${conv} been starred.`, { undo }); }
    else if (target === 'IMPORTANT') { undo = S.setImportant(keys, true, scope); UI.notify(`${conv} been marked as important.`, { undo }); }
    else if (target === 'INBOX') { undo = S.moveTo(keys, 'INBOX', A.route.view, scope); UI.notify(`${conv} been moved to the Inbox.`, { undo }); }
    else if (target === 'TRASH') { undo = S.trash(keys, scope); UI.notify(`${conv} been moved to the Trash.`, { undo }); }
    else if (target === 'SPAM') { undo = S.spam(keys, scope); UI.notify(`${conv} been marked as spam.`, { undo }); }
    else if (target.startsWith('CAT:')) { const cat = target.slice(4); undo = S.setCategory(keys, cat, scope); UI.notify(`${conv} been moved to "${A.CAT_NAMES[cat]}".`, { undo }); }
    else { const l = S.label(target); undo = S.moveTo(keys, target, A.route.view, scope); UI.notify(`${conv} been moved to "${U.esc(l.name)}".`, { undo }); }
    A.afterRemove();
  };

  /* Label options (hover arrow next to a label in the nav) */
  A.labelOptions = function (anchor, id) {
    const l = S.label(id);
    if (!l) return;
    const colorNode = () => {
      const el = U.h(`<div class="lc-pal"></div>`);
      PM.LABEL_COLORS.forEach(([bg, fg]) => {
        const sw = U.h(`<span class="lc-sw" style="background:${bg};color:${fg}" title="${bg}">a</span>`);
        sw.addEventListener('click', () => { UI.closePopup(); S.updateLabel(id, { color: { bg, fg } }); });
        el.appendChild(sw);
      });
      const rm = U.h('<div class="jm-item lc-rm"><span class="jm-check"></span>Remove color</div>');
      rm.addEventListener('click', () => { UI.closePopup(); S.updateLabel(id, { color: null }); });
      const wrap = U.h('<div></div>');
      wrap.append(el, rm);
      return wrap;
    };
    UI.menu(anchor, [
      { label: 'Label color', sub: () => [{ node: colorNode() }] },
      { sep: true },
      { header: 'In label list:' },
      { label: 'Show', checked: l.show === 'show', action: () => S.updateLabel(id, { show: 'show' }) },
      { label: 'Show if unread', checked: l.show === 'unread', action: () => S.updateLabel(id, { show: 'unread' }) },
      { label: 'Hide', checked: l.show === 'hide', action: () => S.updateLabel(id, { show: 'hide' }) },
      { sep: true },
      { label: 'Edit', action: () => A.editLabelDialog(id) },
      { label: `Remove label`, action: () => A.removeLabel(id) },
      { label: 'Add sublabel', action: () => A.newLabelDialog(id) },
    ], { side: false, minWidth: 180 });
  };

  PM.LABEL_COLORS = [
    ['#000000', '#ffffff'], ['#434343', '#ffffff'], ['#666666', '#ffffff'], ['#999999', '#ffffff'], ['#cccccc', '#000000'], ['#efefef', '#000000'], ['#f3f3f3', '#000000'],
    ['#fb4c2f', '#ffffff'], ['#ffad47', '#ffffff'], ['#fad165', '#000000'], ['#16a766', '#ffffff'], ['#43d692', '#ffffff'], ['#4a86e8', '#ffffff'], ['#a479e2', '#ffffff'],
    ['#f691b3', '#ffffff'], ['#f6c5be', '#822111'], ['#ffe6c7', '#a46a21'], ['#fef1d1', '#aa8831'], ['#b9e4d0', '#076239'], ['#c6f3de', '#0b4f30'], ['#c9daf8', '#1c4587'],
    ['#e4d7f5', '#41236d'], ['#fcdee8', '#83334c'], ['#cc3a21', '#ffffff'], ['#eaa041', '#ffffff'], ['#f2c960', '#000000'], ['#149e60', '#ffffff'], ['#3c78d8', '#ffffff'],
  ];

  A.newLabelDialog = function (parentId, cb) {
    const opts = S.labels().map((l) => `<option value="${l.id}" ${l.id === parentId ? 'selected' : ''}>${U.esc(l.name)}</option>`).join('');
    const body = U.h(`<div class="nlab">
      <div class="dlg-label">Please enter a new label name:</div>
      <input class="ji" type="text" id="nl-name" style="width:100%">
      <label class="nlab-nest"><input type="checkbox" id="nl-nest" ${parentId ? 'checked' : ''}> Nest label under:</label>
      <select class="js" id="nl-parent" ${parentId ? '' : 'disabled'} style="width:100%"><option value="">Please select a parent...</option>${opts}</select></div>`);
    U.$('#nl-nest', body).addEventListener('change', (e) => { U.$('#nl-parent', body).disabled = !e.target.checked; });
    UI.dialog({
      title: 'New Label', body, width: 420,
      buttons: [{ label: 'Create', primary: true, action: () => {
        const name = U.$('#nl-name', body).value.trim();
        if (!name) { UI.alert('Please enter a name for the label.'); return false; }
        if (S.labelByName(name)) { UI.alert(`The label name you have chosen already exists. Please try another name.`); return false; }
        const parent = U.$('#nl-nest', body).checked ? U.$('#nl-parent', body).value : '';
        const l = S.createLabel(name, parent || null);
        UI.notify(`The label "${U.esc(l.name)}" has been created.`);
        cb && cb(l);
      } }, { label: 'Cancel' }],
    });
  };

  A.editLabelDialog = function (id) {
    const l = S.label(id);
    const parts = l.name.split('/');
    const leaf = parts.pop();
    const parentName = parts.join('/');
    const opts = S.labels().filter((x) => x.id !== id && !x.name.startsWith(l.name + '/')).map((x) => `<option value="${U.esc(x.name)}" ${x.name === parentName ? 'selected' : ''}>${U.esc(x.name)}</option>`).join('');
    const body = U.h(`<div class="nlab"><div class="dlg-label">Label name:</div><input class="ji" id="el-name" value="${U.esc(leaf)}" style="width:100%">
      <label class="nlab-nest"><input type="checkbox" id="el-nest" ${parentName ? 'checked' : ''}> Nest label under:</label>
      <select class="js" id="el-parent" ${parentName ? '' : 'disabled'} style="width:100%"><option value="">Please select a parent...</option>${opts}</select></div>`);
    U.$('#el-nest', body).addEventListener('change', (e) => { U.$('#el-parent', body).disabled = !e.target.checked; });
    UI.dialog({
      title: 'Edit label', body, width: 420,
      buttons: [{ label: 'Save', primary: true, action: () => {
        const nm = U.$('#el-name', body).value.trim();
        if (!nm) return false;
        const par = U.$('#el-nest', body).checked ? U.$('#el-parent', body).value : '';
        const full = (par ? par + '/' : '') + nm;
        const ex = S.labelByName(full);
        if (ex && ex.id !== id) { UI.alert('The label name you have chosen already exists. Please try another name.'); return false; }
        const wasCurrent = A.route.view && A.route.view.label === id;
        S.updateLabel(id, { name: full });
        if (wasCurrent) A.go('#label/' + enc(full));
      } }, { label: 'Cancel' }],
    });
  };

  A.removeLabel = function (id) {
    const l = S.label(id);
    UI.confirm(`Remove the label "${U.esc(l.name)}" and remove it from all conversations? (No conversations will be deleted.)`, { title: 'Remove label', ok: 'Delete' }).then((ok) => {
      if (!ok) return;
      const cur = A.route.view && A.route.view.label === id;
      S.deleteLabel(id);
      UI.notify(`The label "${U.esc(l.name)}" has been removed.`);
      if (cur) A.go('#inbox');
    });
  };

  /* ---------------- Toolbar (sub-header) ---------------- */
  const tbBtn = (act, icon, tip, label, extra = '') => {
    const s = S.settings();
    const text = s.buttonLabels === 'text' && label;
    return `<button class="jb tb${text ? ' tb-text' : ''} ${extra}" data-act="${act}" ${text ? '' : `data-tip="${U.esc(tip)}"`} aria-label="${U.esc(tip)}">${text ? U.esc(label) : PM.icon(icon, 18)}</button>`;
  };
  const tbMenu = (act, icon, tip, label) => {
    const s = S.settings();
    const text = s.buttonLabels === 'text' || !icon;
    return `<button class="jb tb tb-menu${text ? ' tb-text' : ''}" data-act="${act}" ${text ? '' : `data-tip="${U.esc(tip)}"`} aria-label="${U.esc(tip)}" aria-haspopup="true">${text ? U.esc(label) : PM.icon(icon, 18)}<span class="caret"></span></button>`;
  };

  A.targetKeys = function () {
    if (A.route.mode === 'thread') return [A.route.threadId];
    return Array.from(A.sel);
  };

  function selState() {
    const keys = A.page.map((t) => t.id);
    if (!keys.length || !A.sel.size) return false;
    const n = keys.filter((k) => A.sel.has(k)).length;
    if (n === keys.length) return true;
    return n ? 'some' : false;
  }

  function renderToolbar() {
    const tb = U.$('#toolbar'), right = U.$('#toolbar-right');
    const r = A.route;
    const prod = U.$('#product-switch .ps-name');
    prod.textContent = r.mode === 'contacts' ? 'Contacts' : 'pMail';
    if (r.mode === 'settings') { tb.innerHTML = ''; right.innerHTML = gearBtn(); return; }
    if (r.mode === 'contacts') { PM.contacts.renderToolbar(tb, right, gearBtn()); return; }
    const v = r.view, s = S.settings();
    const parts = [];
    const thread = r.mode === 'thread';
    const hasSel = thread || A.sel.size > 0;
    if (thread) {
      parts.push(`<div class="tb-g">${tbBtn('back', 'back', `Back to ${A.viewName(v)}`, `« Back to ${A.viewName(v)}`)}</div>`);
    } else {
      parts.push(`<div class="tb-g"><button class="jb tb tb-sel" data-act="selmenu" aria-label="Select" data-tip="Select"><span class="tb-cb" data-act="selall">${UI.checkbox(selState())}</span><span class="caret" data-act="selmenu"></span></button></div>`);
    }
    if (!hasSel) {
      parts.push(`<div class="tb-g">${tbBtn('refresh', 'refresh', 'Refresh', 'Refresh')}</div>`);
      parts.push(`<div class="tb-g">${tbMenu('more', null, 'More', 'More')}</div>`);
    } else {
      const keys = A.targetKeys();
      const scope = A.scope();
      const ths = keys.map((k) => S.thread(k, scope)).filter(Boolean);
      const anyInbox = ths.some((t) => t.inbox);
      const g1 = [];
      if (v.type === 'drafts' && !thread) {
        g1.push(`<button class="jb tb tb-text" data-act="discardDrafts">Discard drafts</button>`);
      } else if (scope === 'spam') {
        g1.push(tbBtn('deleteForever', 'deleteForever', 'Delete forever', 'Delete forever'));
        g1.push(`<button class="jb tb tb-text" data-act="notSpam">Not spam</button>`);
      } else if (scope === 'trash') {
        g1.push(`<button class="jb tb tb-text" data-act="deleteForever">Delete forever</button>`);
      } else {
        if (anyInbox || ['inbox', 'category'].includes(v.type)) g1.push(tbBtn('archive', 'archive', 'Archive', 'Archive'));
        else g1.push(tbBtn('moveInbox', 'unarchive', 'Move to Inbox', 'Move to Inbox'));
        g1.push(tbBtn('spam', 'spam', 'Report spam', 'Report spam'));
        g1.push(tbBtn('delete', 'delete', 'Delete', 'Delete'));
      }
      parts.push(`<div class="tb-g joined">${g1.join('')}</div>`);
      if (s.labs.markReadButton && !thread) parts.push(`<div class="tb-g"><button class="jb tb tb-text" data-act="markRead">Mark as read</button></div>`);
      if (v.type === 'label' && scope === 'normal') {
        const l = S.label(v.label);
        if (l) parts.push(`<div class="tb-g"><button class="jb tb" data-act="removeLabel" data-tip='Remove label "${U.esc(l.name)}"' aria-label="Remove label">${PM.icon('label', 18)}<span class="tb-x">×</span></button></div>`);
      }
      parts.push(`<div class="tb-g joined">${tbMenu('moveMenu', 'folder', 'Move to', 'Move to')}${tbMenu('labelMenu', 'label', 'Labels', 'Labels')}</div>`);
      parts.push(`<div class="tb-g">${tbMenu('more', null, 'More', 'More')}</div>`);
    }
    tb.innerHTML = parts.join('');

    // Right side: pagination / conversation position + gear
    let pg = '';
    if (thread) {
      const list = A.allThreads || [];
      const i = list.findIndex((t) => t.id === r.threadId);
      if (i >= 0) {
        pg = `<span class="pg-info"><b>${U.num(i + 1)}</b> of <b>${U.num(list.length)}</b></span>
          <div class="tb-g joined"><button class="jb tb pg-btn" data-act="newer" ${i <= 0 ? 'disabled' : ''} data-tip="Newer" aria-label="Newer">${PM.icon('left', 18)}</button><button class="jb tb pg-btn" data-act="older" ${i >= list.length - 1 ? 'disabled' : ''} data-tip="Older" aria-label="Older">${PM.icon('right', 18)}</button></div>`;
      }
    } else {
      const total = A.total || 0;
      if (total) {
        const ps = s.pageSize, from = (r.page - 1) * ps + 1, to = Math.min(total, r.page * ps);
        pg = `<span class="pg-info pg-menu" data-act="pageMenu" role="button" data-tip="Show more messages"><b>${U.num(from)}</b>–<b>${U.num(to)}</b> of <b>${U.num(total)}</b></span>
          <div class="tb-g joined"><button class="jb tb pg-btn" data-act="prevPage" ${r.page <= 1 ? 'disabled' : ''} data-tip="Newer" aria-label="Newer">${PM.icon('left', 18)}</button><button class="jb tb pg-btn" data-act="nextPage" ${to >= total ? 'disabled' : ''} data-tip="Older" aria-label="Older">${PM.icon('right', 18)}</button></div>`;
      }
    }
    right.innerHTML = pg + gearBtn();
  }
  A.renderToolbar = renderToolbar;
  A.renderNav = renderNav;

  const gearBtn = () => `<div class="tb-g"><button class="jb tb tb-menu" data-act="gear" data-tip="Settings" aria-label="Settings" aria-haspopup="true">${PM.icon('gear', 18)}<span class="caret"></span></button></div>`;

  function bindToolbar() {
    const handler = (e) => {
      const el = e.target.closest('[data-act]');
      if (!el || el.disabled) return;
      const act = el.dataset.act;
      if (act === 'selall') { e.stopPropagation(); A.toggleSelectAll(); return; }
      const btn = el.closest('button') || el;
      A.act(act, btn);
    };
    U.$('#toolbar').addEventListener('click', handler);
    U.$('#toolbar-right').addEventListener('click', handler);
  }

  A.toggleSelectAll = function () {
    const st = selState();
    if (st === true || st === 'some') A.sel.clear();
    else A.page.forEach((t) => A.sel.add(t.id));
    A.schedule();
  };

  A.select = function (which) {
    A.sel.clear();
    A.page.forEach((t) => {
      if (which === 'all' || (which === 'read' && !t.unread) || (which === 'unread' && t.unread) || (which === 'starred' && t.starred) || (which === 'unstarred' && !t.starred)) A.sel.add(t.id);
    });
    A.schedule();
  };

  /* ---------------- Actions ---------------- */
  const convPhrase = (n, verb) => (n === 1 ? `The conversation has been ${verb}.` : `${U.num(n)} conversations have been ${verb}.`);

  A.afterRemove = function () {
    if (A.route.mode === 'thread') {
      if (S.settings().labs.autoAdvance) {
        const list = A.allThreads || [];
        const i = list.findIndex((t) => t.id === A.route.threadId);
        const next = list[i + 1] || list[i - 1];
        if (next) { A.go(A.threadHash(next.id)); return; }
      }
      A.go(A.listHash(A.route));
    } else {
      A.sel.clear();
      A.schedule();
    }
  };

  A.act = function (act, anchor) {
    const r = A.route;
    const keys = A.targetKeys();
    const scope = A.scope();
    const n = keys.length;
    let undo;
    switch (act) {
      case 'back': A.go(A.listHash(r)); return;
      case 'refresh': return A.refresh();
      case 'selmenu': return UI.menu(anchor, [
        { label: 'All', action: () => A.select('all') }, { label: 'None', action: () => A.select('none') },
        { label: 'Read', action: () => A.select('read') }, { label: 'Unread', action: () => A.select('unread') },
        { label: 'Starred', action: () => A.select('starred') }, { label: 'Unstarred', action: () => A.select('unstarred') },
      ], { minWidth: 120 });
      case 'more': return A.moreMenu(anchor);
      case 'gear': return A.gearMenu(anchor);
      case 'moveMenu': return A.moveMenu(anchor);
      case 'labelMenu': return A.labelMenu(anchor);
      case 'pageMenu': return UI.menu(anchor, [
        { label: 'Newest', checked: S.settings().sort !== 'oldest', action: () => { S.setSettings({ sort: 'newest' }); A.go(A.baseHash(r.view)); } },
        { label: 'Oldest', checked: S.settings().sort === 'oldest', action: () => { S.setSettings({ sort: 'oldest' }); A.go(A.baseHash(r.view)); } },
      ], { minWidth: 120 });
      case 'prevPage': if (r.page > 1) A.go(A.baseHash(r.view) + (r.page - 1 > 1 ? '/p' + (r.page - 1) : '')); return;
      case 'nextPage': A.go(A.baseHash(r.view) + '/p' + (r.page + 1)); return;
      case 'newer': case 'older': {
        const list = A.allThreads || [];
        const i = list.findIndex((t) => t.id === r.threadId);
        const t = list[act === 'newer' ? i - 1 : i + 1];
        if (t) A.go(A.threadHash(t.id));
        return;
      }
    }
    if (!n) { if (['archive', 'delete', 'spam', 'star'].includes(act)) UI.notify('No conversations selected.'); return; }
    switch (act) {
      case 'archive': undo = S.archive(keys, scope); UI.notify(convPhrase(n, 'archived'), { undo, links: [] }); A.afterRemove(); break;
      case 'moveInbox': undo = S.toInbox(keys, scope); UI.notify(convPhrase(n, 'moved to the Inbox'), { undo }); A.afterRemove(); break;
      case 'delete': undo = S.trash(keys, scope); UI.notify(convPhrase(n, 'moved to the Trash'), { undo }); A.afterRemove(); break;
      case 'spam': undo = S.spam(keys, scope); UI.notify(n === 1 ? 'The conversation has been marked as spam and moved to Spam.' : `${U.num(n)} conversations have been marked as spam and moved to Spam.`, { undo }); A.afterRemove(); break;
      case 'notSpam': undo = S.notSpam(keys); UI.notify(n === 1 ? 'The conversation has been unmarked as spam and moved to the Inbox.' : `${U.num(n)} conversations have been unmarked as spam and moved to the Inbox.`, { undo }); A.afterRemove(); break;
      case 'deleteForever': {
        const c = S.deleteForever(keys, scope);
        UI.notify(n === 1 ? 'The conversation has been deleted.' : `${U.num(n)} conversations have been deleted.`);
        A.afterRemove();
        return c;
      }
      case 'discardDrafts': {
        const msgs = S.msgsFor(keys, scope).filter((m) => S.has(m, 'DRAFT'));
        const saved = msgs.map((m) => JSON.parse(JSON.stringify(m)));
        msgs.forEach((m) => { PM.compose.closeForDraft(m.id); S.deleteDraft(m.id); });
        UI.notify(saved.length === 1 ? 'Your draft has been discarded.' : `${saved.length} drafts have been discarded.`, { undo: () => { saved.forEach((m) => (S.raw().messages[m.id] = m)); S.changed(); } });
        A.afterRemove();
        break;
      }
      case 'removeLabel': {
        const l = S.label(r.view.label);
        undo = S.setLabel(keys, r.view.label, false, scope);
        UI.notify(n === 1 ? `The conversation has been removed from "${U.esc(l.name)}".` : `${U.num(n)} conversations have been removed from "${U.esc(l.name)}".`, { undo });
        A.afterRemove();
        break;
      }
      case 'markRead': S.setRead(keys, true, scope); if (r.mode === 'thread') A.schedule(); break;
      case 'markUnread': S.setRead(keys, false, scope); if (r.mode === 'thread') A.go(A.listHash(r)); break;
      case 'important': undo = S.setImportant(keys, true, scope); UI.notify(convPhrase(n, 'marked as important'), { undo }); break;
      case 'notImportant': undo = S.setImportant(keys, false, scope); UI.notify(convPhrase(n, 'marked as not important'), { undo }); if (v_is(r, 'imp')) A.afterRemove(); break;
      case 'star': S.setStar(keys, true, scope); break;
      case 'unstar': S.setStar(keys, false, scope); if (v_is(r, 'starred')) A.afterRemove(); break;
      case 'mute': undo = S.mute(keys, scope); UI.notify(convPhrase(n, 'muted'), { undo }); A.afterRemove(); break;
      case 'unmute': undo = S.unmute(keys, scope); UI.notify(convPhrase(n, 'unmuted'), { undo }); break;
      case 'addTask': {
        keys.forEach((k) => { const t = S.thread(k, scope); if (t) S.addTask({ title: t.subject || '(no subject)', notes: 'Related email: ' + t.subject, threadKey: k }); });
        UI.notify(n === 1 ? 'Added to Tasks.' : `${n} tasks added.`, { links: [{ label: 'View', action: () => PM.tasks.open() }] });
        break;
      }
      case 'filterLike': {
        const t = S.thread(keys[0], scope);
        const from = t && (t.msgs.find((m) => !S.isMe(m.from)) || t.msgs[0]).from;
        PM.searchUI.openAdvanced({ from: from ? from.email : '' }, true);
        break;
      }
    }
  };
  const v_is = (r, type) => r.view && r.view.type === type;

  A.refresh = function () {
    UI.loading(true);
    setTimeout(() => {
      UI.loading(false);
      PM.mailer.check(true);
      A.schedule();
    }, 350);
  };

  A.moreMenu = function (anchor) {
    const r = A.route, keys = A.targetKeys(), scope = A.scope();
    if (!keys.length) {
      return UI.menu(anchor, [
        { label: 'Mark all as read', action: () => {
          const ks = (A.allThreads || []).filter((t) => t.unread).map((t) => t.id);
          if (ks.length) S.setRead(ks, true, scope);
        } },
        { sep: true },
        { html: '<i>Select messages to see more actions</i>', disabled: true },
      ], { minWidth: 220 });
    }
    const ths = keys.map((k) => S.thread(k, scope)).filter(Boolean);
    const anyUnread = ths.some((t) => t.unread), anyRead = ths.some((t) => !t.unread);
    const anyImp = ths.some((t) => t.important), anyNotImp = ths.some((t) => !t.important);
    const anyStar = ths.some((t) => t.starred), anyNoStar = ths.some((t) => !t.starred);
    const anyMuted = ths.some((t) => t.muted);
    const items = [];
    if (r.mode !== 'thread' && anyUnread) items.push({ label: 'Mark as read', action: () => A.act('markRead') });
    if (anyRead || r.mode === 'thread') items.push({ label: 'Mark as unread', action: () => A.act('markUnread') });
    if (anyNotImp) items.push({ label: 'Mark as important', action: () => A.act('important') });
    if (anyImp) items.push({ label: 'Mark as not important', action: () => A.act('notImportant') });
    items.push({ label: 'Add to Tasks', action: () => A.act('addTask') });
    if (anyNoStar) items.push({ label: 'Add star', action: () => A.act('star') });
    if (anyStar) items.push({ label: 'Remove star', action: () => A.act('unstar') });
    items.push({ sep: true });
    items.push({ label: 'Filter messages like these', action: () => A.act('filterLike') });
    items.push(anyMuted ? { label: 'Unmute', action: () => A.act('unmute') } : { label: 'Mute', action: () => A.act('mute') });
    if (r.mode === 'thread') {
      items.push({ sep: true });
      items.push({ label: 'Print all', action: () => PM.thread.print(r.threadId) });
    }
    UI.menu(anchor, items, { minWidth: 200 });
  };

  A.gearMenu = function (anchor) {
    const s = S.settings();
    const dens = (d, name) => ({ label: name, checked: s.density === d, action: () => S.setSettings({ density: d }) });
    UI.menu(anchor, [
      { header: 'Display density:' },
      dens('comfortable', 'Comfortable'), dens('cozy', 'Cozy'), dens('compact', 'Compact'),
      { sep: true },
      { label: 'Configure inbox', action: () => A.configureInbox() },
      { sep: true },
      { label: 'Settings', action: () => A.go('#settings/general') },
      { label: 'Themes', action: () => PM.themes.dialog() },
      { sep: true },
      { label: 'Keyboard shortcuts', action: () => PM.shortcuts.help() },
      { label: 'Send feedback', action: () => A.feedback() },
      { label: 'Help', action: () => A.help() },
    ], { align: 'right', minWidth: 190 });
  };

  A.configureInbox = function () {
    const s = S.settings();
    const desc = {
      personal: 'Messages from friends and family, as well as any other messages that don\'t appear in other tabs.',
      social: 'Messages from social networks, media-sharing sites, online dating services, and other social websites.',
      promotions: 'Deals, offers, and other marketing emails.',
      updates: 'Personal, auto-generated updates including confirmations, receipts, bills, and statements.',
      forums: 'Messages from online groups, discussion boards, and mailing lists.',
    };
    const tile = (cat) => `<label class="ci-tile${cat === 'personal' ? ' fixed' : ''}">
      <span class="ci-ic" style="color:${A.CAT_COLORS[cat]}">${PM.icon(A.CAT_ICONS[cat], 34)}</span>
      <span class="ci-name"><input type="checkbox" data-cat="${cat}" ${cat === 'personal' || s.categories[cat] ? 'checked' : ''} ${cat === 'personal' ? 'disabled' : ''}> ${A.CAT_NAMES[cat]}</span>
      <span class="ci-desc">${desc[cat]}</span></label>`;
    const body = U.h(`<div class="ci">
      <div class="ci-h">Select tabs to enable</div>
      <div class="ci-tiles">${S.CATS.map(tile).join('')}</div>
      <label class="ci-star"><input type="checkbox" id="ci-starred" ${s.starredInPrimary ? 'checked' : ''}> Include starred in Primary</label>
      <div class="ci-note">To add or remove tabs click settings ${PM.icon('gear', 14)}, then Configure inbox. Drag a message into a different tab to choose which tab messages from that sender should appear in.</div></div>`);
    UI.dialog({
      title: 'Configure inbox', body, width: 720, className: 'dlg-ci',
      buttons: [{ label: 'Save', primary: true, action: () => {
        const cats = {};
        U.$$('input[data-cat]', body).forEach((i) => { if (i.dataset.cat !== 'personal') cats[i.dataset.cat] = i.checked; });
        S.setSettings({ categories: cats, starredInPrimary: U.$('#ci-starred', body).checked, inboxType: 'default' });
        if (A.route.view && A.route.view.type === 'category' && !cats[A.route.view.cat]) A.go('#inbox');
      } }, { label: 'Cancel' }],
    });
  };

  A.feedback = function () {
    const body = U.h('<div><div class="dlg-label">Describe your issue or share your ideas</div><textarea class="ji" rows="6" style="width:100%"></textarea><div class="dlg-fine">Your feedback stays on this device — pMail is a local demo and doesn\'t send data anywhere.</div></div>');
    UI.dialog({ title: 'Send feedback', body, width: 460, buttons: [{ label: 'Send', primary: true, action: () => UI.notify('Thank you for your feedback.') }, { label: 'Cancel' }] });
  };

  A.help = function () {
    UI.dialog({
      title: 'pMail Help', width: 520,
      body: `<div class="help">
        <p><b>Search like a pro.</b> Try <code>from:olivia</code>, <code>has:attachment</code>, <code>is:unread</code>, <code>label:work</code>, <code>older_than:1y</code>, <code>"exact phrase"</code>, <code>OR</code> and <code>-exclude</code>.</p>
        <p><b>Keyboard shortcuts.</b> Press <kbd>?</kbd> anywhere to see the full list (turn them on or off in Settings).</p>
        <p><b>Organize.</b> Drag conversations onto a label, or use <i>Move to</i> and <i>Labels</i> in the toolbar. Create filters from the search options arrow.</p>
        <p><b>Your data.</b> Everything is stored locally in this browser. Reset the demo mailbox from Settings &rsaquo; General.</p></div>`,
      buttons: [{ label: 'Keyboard shortcuts', action: () => setTimeout(() => PM.shortcuts.help(), 0) }, { label: 'Close', primary: true }],
    });
  };

  /* Move to ▾ */
  A.moveMenu = function (anchor) {
    const r = A.route, keys = A.targetKeys(), scope = A.scope();
    const s = S.settings();
    const targets = [];
    if (!(r.view.type === 'inbox' && scope === 'normal')) targets.push({ id: 'INBOX', name: 'Inbox' });
    if (S.tabsEnabled() || true) ['social', 'promotions', 'updates', 'forums'].forEach((c) => { if (s.categories[c] || r.view.cat === c) targets.push({ id: 'CAT:' + c, name: A.CAT_NAMES[c] }); });
    if (scope !== 'spam') targets.push({ id: 'SPAM', name: 'Spam' });
    if (scope !== 'trash') targets.push({ id: 'TRASH', name: 'Trash' });
    S.labels().forEach((l) => { if (!(r.view.type === 'label' && r.view.label === l.id)) targets.push({ id: l.id, name: l.name }); });
    const el = U.h(`<div class="jm lm" tabindex="-1"><div class="lm-title">Move to:</div><div class="lm-sw"><input class="ji lm-q" type="text" aria-label="Search labels">${PM.icon('search', 16)}</div><div class="lm-list"></div><div class="jm-sep"></div><div class="jm-item lm-create"><span class="jm-check"></span>Create new</div><div class="jm-item lm-manage"><span class="jm-check"></span>Manage labels</div></div>`);
    const list = U.$('.lm-list', el), q = U.$('.lm-q', el);
    let hl = 0;
    const doMove = (t) => {
      UI.closePopup();
      const n = keys.length;
      let undo;
      if (t.id === 'TRASH') undo = S.trash(keys, scope);
      else if (t.id === 'SPAM') undo = S.spam(keys, scope);
      else undo = S.moveTo(keys, t.id, r.view, scope);
      UI.notify(n === 1 ? `The conversation has been moved to "${U.esc(t.name)}".` : `${U.num(n)} conversations have been moved to "${U.esc(t.name)}".`, { undo });
      A.afterRemove();
    };
    const draw = () => {
      const f = q.value.trim().toLowerCase();
      const vis = targets.filter((t) => !f || t.name.toLowerCase().includes(f));
      hl = U.clamp(hl, 0, Math.max(0, vis.length - 1));
      list.innerHTML = vis.map((t, i) => `<div class="jm-item${i === hl ? ' hl' : ''}" data-i="${targets.indexOf(t)}"><span class="jm-check"></span>${U.esc(t.name)}</div>`).join('') +
        (f && !S.labelByName(f) ? `<div class="jm-item lm-new" data-new="1"><span class="jm-check"></span>"${U.esc(q.value.trim())}" (create new)</div>` : '');
      return vis;
    };
    draw();
    list.addEventListener('click', (e) => {
      const it = e.target.closest('.jm-item');
      if (!it) return;
      if (it.dataset.new) { const l = S.createLabel(q.value.trim()); doMove({ id: l.id, name: l.name }); return; }
      doMove(targets[+it.dataset.i]);
    });
    q.addEventListener('input', () => { hl = 0; draw(); });
    q.addEventListener('keydown', (e) => {
      const vis = draw();
      if (e.key === 'ArrowDown') { hl++; draw(); e.preventDefault(); }
      else if (e.key === 'ArrowUp') { hl--; draw(); e.preventDefault(); }
      else if (e.key === 'Enter') { e.preventDefault(); if (vis[hl]) doMove(vis[hl]); else if (q.value.trim()) { const l = S.createLabel(q.value.trim()); doMove({ id: l.id, name: l.name }); } }
      else if (e.key === 'Escape') UI.closePopup();
    });
    U.$('.lm-create', el).addEventListener('click', () => { UI.closePopup(); A.newLabelDialog(null, (l) => doMove({ id: l.id, name: l.name })); });
    U.$('.lm-manage', el).addEventListener('click', () => { UI.closePopup(); A.go('#settings/labels'); });
    UI.popup(anchor, el);
    setTimeout(() => q.focus(), 0);
  };

  /* Labels ▾ (tri-state checkboxes + Apply) */
  A.labelMenu = function (anchor) {
    const r = A.route, keys = A.targetKeys(), scope = A.scope();
    const ths = keys.map((k) => S.thread(k, scope)).filter(Boolean);
    const labels = S.labels();
    const init = {};
    labels.forEach((l) => {
      const n = ths.filter((t) => t.labels.includes(l.id)).length;
      init[l.id] = n === 0 ? false : n === ths.length ? true : 'some';
    });
    const cur = { ...init };
    const el = U.h(`<div class="jm lm" tabindex="-1"><div class="lm-title">Label as:</div><div class="lm-sw"><input class="ji lm-q" type="text" aria-label="Search labels">${PM.icon('search', 16)}</div><div class="lm-list"></div><div class="jm-sep"></div><div class="lm-foot"></div></div>`);
    const list = U.$('.lm-list', el), q = U.$('.lm-q', el), foot = U.$('.lm-foot', el);
    const dirty = () => labels.some((l) => cur[l.id] !== init[l.id]);
    let toggled = null;
    const apply = () => {
      UI.closePopup();
      const all = S.msgsFor(keys, scope);
      const snapshot = all.map((m) => [m.id, m.labels.slice()]);
      const added = [], removed = [];
      labels.forEach((l) => {
        if (cur[l.id] === init[l.id] || cur[l.id] === 'some') return;
        S.setLabel(keys, l.id, cur[l.id], scope);
        (cur[l.id] ? added : removed).push(l.name);
      });
      const undo = () => { snapshot.forEach(([id, ls]) => { const m = S.msg(id); if (m) m.labels = ls; }); S.changed({ undo: true }); };
      const n = keys.length;
      const what = n === 1 ? 'The conversation has been' : `${U.num(n)} conversations have been`;
      let msg;
      if (added.length && !removed.length) msg = `${what} added to "${U.esc(added.join('", "'))}".`;
      else if (removed.length && !added.length) msg = `${what} removed from "${U.esc(removed.join('", "'))}".`;
      else msg = `${what} updated.`;
      UI.notify(msg, { undo });
      if (r.view.type === 'label' && removed.includes(S.label(r.view.label) && S.label(r.view.label).name)) A.afterRemove();
    };
    const draw = () => {
      const f = q.value.trim().toLowerCase();
      list.innerHTML = labels.filter((l) => !f || l.name.toLowerCase().includes(f))
        .map((l) => `<div class="jm-item lm-row" data-id="${l.id}">${UI.checkbox(cur[l.id], l.id === toggled)}<span class="lm-name">${U.esc(l.name)}</span></div>`).join('') +
        (f && !S.labelByName(f) ? `<div class="jm-item lm-new"><span class="jm-check"></span>"${U.esc(q.value.trim())}" (create new)</div>` : '');
      foot.innerHTML = (dirty() ? '<div class="jm-item lm-apply"><span class="jm-check"></span><b>Apply</b></div>' : '') +
        '<div class="jm-item lm-create"><span class="jm-check"></span>Create new</div><div class="jm-item lm-manage"><span class="jm-check"></span>Manage labels</div>';
    };
    draw();
    list.addEventListener('click', (e) => {
      if (e.target.closest('.lm-new')) {
        const l = S.createLabel(q.value.trim());
        labels.push(l); init[l.id] = false; cur[l.id] = true; q.value = ''; apply(); return;
      }
      const row = e.target.closest('.lm-row');
      if (!row) return;
      const id = row.dataset.id;
      cur[id] = cur[id] === true ? false : true;
      toggled = id;
      draw();
      toggled = null;
    });
    foot.addEventListener('click', (e) => {
      if (e.target.closest('.lm-apply')) apply();
      else if (e.target.closest('.lm-create')) { UI.closePopup(); A.newLabelDialog(null, (l) => { S.setLabel(keys, l.id, true, scope); }); }
      else if (e.target.closest('.lm-manage')) { UI.closePopup(); A.go('#settings/labels'); }
    });
    q.addEventListener('input', draw);
    q.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        if (dirty()) return apply();
        const f = q.value.trim();
        if (!f) return;
        const ex = labels.find((l) => l.name.toLowerCase().includes(f.toLowerCase()));
        if (ex) { cur[ex.id] = true; apply(); } else { const l = S.createLabel(f); labels.push(l); init[l.id] = false; cur[l.id] = true; apply(); }
      } else if (e.key === 'Escape') UI.closePopup();
    });
    UI.popup(anchor, el);
    setTimeout(() => q.focus(), 0);
  };

  /* ---------------- Header: product switcher, apps, account ---------------- */
  function bindHeader() {
    U.$('#product-switch').addEventListener('click', (e) => {
      UI.menu(e.currentTarget, [
        { label: 'Mail', action: () => A.go('#inbox') },
        { label: 'Contacts', action: () => A.go('#contacts') },
        { label: 'Tasks', action: () => PM.tasks.open() },
      ], { minWidth: 140 });
    });
    U.$('#gb-apps').addEventListener('click', (e) => {
      const apps = [['mail', 'Mail', '#dd4b39', () => A.go('#inbox')], ['person', 'Contacts', '#4285f4', () => A.go('#contacts')], ['tasks', 'Tasks', '#0f9d58', () => PM.tasks.open()],
        ['calendar', 'Calendar', '#3f51b5'], ['cloud', 'Drive', '#f4b400'], ['doc', 'Docs', '#4285f4'], ['photo', 'Photos', '#e91e63'], ['map', 'Maps', '#34a853'], ['news', 'News', '#607d8b']];
      const el = U.h(`<div class="apps"><div class="apps-grid">${apps.map((a, i) => `<a class="app" data-i="${i}" href="#" onclick="return false"><span class="app-ic" style="background:${a[2]}">${PM.icon(a[0], 30)}</span><span class="app-n">${a[1]}</span></a>`).join('')}</div></div>`);
      el.addEventListener('click', (ev) => {
        const a = ev.target.closest('.app');
        if (!a) return;
        UI.closePopup();
        const app = apps[+a.dataset.i];
        if (app[3]) app[3](); else UI.notify(`${app[1]} isn't part of this pMail demo.`);
      });
      UI.popup(e.currentTarget, el, { align: 'right', gap: 8 });
    });
    U.$('#gb-notif').addEventListener('click', (e) => {
      const el = U.h(`<div class="notif-pop"><div class="np-h">Notifications</div><div class="np-b">${PM.icon('bell', 40)}<div>No new notifications</div></div></div>`);
      UI.popup(e.currentTarget, el, { align: 'right', gap: 8 });
    });
    const acct = (e) => {
      const me = S.me();
      const el = U.h(`<div class="acct"><div class="acct-top"><div class="acct-ph">${UI.avatar(me, 96)}<a class="acct-chg" href="#" onclick="return false">Change</a></div>
        <div class="acct-info"><div class="acct-name">${U.esc(me.name)}</div><div class="acct-email">${U.esc(me.email)}</div>
        <div class="acct-links"><a href="#settings/accounts">Account</a> – <a href="#settings/general">Privacy</a></div>
        <button class="jb jb-blue acct-my">My Account</button></div></div>
        <div class="acct-foot"><button class="jb acct-add">Add account</button><button class="jb acct-out">Sign out</button></div></div>`);
      U.$('.acct-chg', el).addEventListener('click', () => { UI.closePopup(); PM.settingsView.pickPicture(); });
      U.$('.acct-my', el).addEventListener('click', () => { UI.closePopup(); A.go('#settings/accounts'); });
      U.$('.acct-add', el).addEventListener('click', () => { UI.closePopup(); UI.notify('Adding accounts isn\'t available in this demo.'); });
      U.$('.acct-out', el).addEventListener('click', () => { UI.closePopup(); A.signOut(); });
      el.addEventListener('click', (ev) => { if (ev.target.closest('.acct-links a')) UI.closePopup(); });
      UI.popup(U.$('#gb-account'), el, { align: 'right', gap: 8 });
    };
    U.$('#gb-account').addEventListener('click', acct);
    U.$('#gb-name').addEventListener('click', acct);
    U.$('#compose-btn').addEventListener('click', () => {
      if (A.route.mode === 'contacts') A.go('#contacts/new');
      else PM.compose.open({});
    });
  }

  A.signOut = function () {
    S.flush();
    PM.compose.closeAll(true);
    const me = S.me();
    const so = U.h(`<div id="signout"><div class="so-card">${PM.logo(40)}<div class="so-h">Choose an account</div>
      <button class="so-acct">${UI.avatar(me, 40)}<span><b>${U.esc(me.name)}</b><br><span class="so-mail">${U.esc(me.email)}</span></span></button>
      <div class="so-fine">You've signed out of pMail. Choose your account to continue.</div></div></div>`);
    U.$('.so-acct', so).addEventListener('click', () => { so.remove(); U.$('#app').hidden = false; A.render(true); });
    U.$('#app').hidden = true;
    document.body.appendChild(so);
  };

  /* Footer helpers used by list view */
  A.footer = function () {
    const bytes = S.storageBytes();
    const gb = bytes / 1e9;
    const pct = Math.round((gb / 15) * 100);
    return `<div class="foot">
      <div class="foot-l">${gb.toFixed(2)} GB (${pct}%) of 15 GB used<br><a href="#settings/accounts">Manage</a></div>
      <div class="foot-m"><a href="#" data-foot="terms">Terms</a> - <a href="#" data-foot="privacy">Privacy</a> - <a href="#" data-foot="policies">Program Policies</a></div>
      <div class="foot-r">Last account activity: ${U.ago(S.raw().lastActivity)}<br><a href="#" data-foot="details">Details</a></div></div>
      ${PM.mobile && PM.mobile.small() ? '<div class="foot-view">pMail view: <b>desktop</b> | <a href="#" data-foot="mobile">mobile</a></div>' : ''}`;
  };
  A.footerClick = function (k) {
    if (k === 'mobile') { PM.mobile.setView('mobile'); return; }
    if (k === 'details') {
      const now = Date.now();
      UI.dialog({ title: 'Activity on this account', width: 560, body: `<div class="act-info"><p>This feature provides information about the last activity on this mail account and any concurrent activity.</p>
        <table class="act-t"><tr><th>Access Type</th><th>Location</th><th>Date/Time</th></tr>
        <tr><td>Browser (${U.esc(navigator.userAgent.match(/(Firefox|Edg|Chrome|Safari)\/[\d.]+/)?.[1] || 'Web')})</td><td>This device</td><td>${U.fullDate(now)}</td></tr>
        <tr><td>Browser</td><td>This device</td><td>${U.fullDate(S.raw().created)}</td></tr></table>
        <p class="dlg-fine">pMail runs entirely in your browser. Nothing is sent to a server.</p></div>`, buttons: [{ label: 'Close', primary: true }] });
    } else {
      const t = { terms: 'Terms', privacy: 'Privacy', policies: 'Program Policies' }[k];
      UI.dialog({ title: t, width: 480, body: `<div class="dlg-msg">pMail is an open-source demo email client. Your mailbox lives only in this browser's local storage — there are no servers, no ads and no tracking.</div>`, buttons: [{ label: 'OK', primary: true }] });
    }
  };

  /* ---------------- Init ---------------- */
  A.init = function () {
    bindHeader();
    bindNav();
    bindToolbar();
    PM.list.bind(U.$('#content'));
    PM.thread.bind(U.$('#content'));
    PM.searchUI.init();
    PM.chat.init();
    PM.shortcuts.init();
    PM.bus.on('change', () => A.schedule());
    PM.bus.on('storage-full', () => UI.notify('pMail couldn\'t save everything: this browser\'s storage is full. Try removing large attachments.'));
    window.addEventListener('hashchange', A.onRoute);
    PM.mobile.init();
    A.onRoute();
    PM.mailer.start();
    setInterval(() => { if (A.route && A.route.mode === 'list') A.schedule(); }, 60000);
  };
})(window.PM);
