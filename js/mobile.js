/* pMail — mobile web layout (phones): app bar with search, drawer, swipe-to-archive,
 * selection mode, full-screen compose, snackbars. Shares the store, routes and actions
 * with the classic desktop view. */
(function (PM) {
  'use strict';
  const U = PM.util, UI = PM.ui, S = PM.store;
  const M = (PM.mobile = { active: false, limit: 50, exp: new Map(), scrolls: {}, pageKey: null });
  const VIEW_KEY = 'pmail.view';
  const RECENT_KEY = 'pmail.recentSearches';
  const mq = window.matchMedia('(max-width: 760px)');
  const A = () => PM.app;

  M.small = () => mq.matches;
  M.setView = (v) => { U.storage.set(VIEW_KEY, v); M.check(true); };

  M.check = function (force) {
    const want = mq.matches && U.storage.get(VIEW_KEY, 'auto') !== 'desktop';
    if (want === M.active && !force) return;
    M.active = want;
    document.body.classList.toggle('m', want);
    UI.closePopup();
    closeDrawer();
    closeSearch();
    if (want) PM.compose.list.filter((c) => c.inline).forEach((c) => c.close());
    M.pageKey = null;
    if (A().route) A().render(true);
    window.scrollTo(0, 0);
  };

  /* ---------- dates ---------- */
  M.date = (ts) => {
    const d = new Date(ts), n = new Date();
    if (d.toDateString() === n.toDateString()) return U.time(d, true);
    if (d.getFullYear() === n.getFullYear()) return `${U.MON[d.getMonth()]} ${d.getDate()}`;
    return `${d.getMonth() + 1}/${d.getDate()}/${String(d.getFullYear()).slice(-2)}`;
  };

  const letterAvatar = (a, size = 40) => {
    if (S.isMe(a) && S.settings().picture) return `<img class="m-avi" src="${S.settings().picture}" width="${size}" height="${size}" alt="">`;
    const name = (a && (a.name || a.email)) || '?';
    const ch = (name.match(/[A-Za-z0-9]/) || ['?'])[0].toUpperCase();
    return `<span class="m-avi" style="width:${size}px;height:${size}px;line-height:${size}px;font-size:${Math.round(size * 0.45)}px;background:${U.avatarColor(a && a.email)}">${ch}</span>`;
  };
  M.avatar = letterAvatar;

  /* ---------- skeleton ---------- */
  M.init = function () {
    const root = U.h(`<div id="m-app">
      <div id="m-view"></div>
      <button id="m-fab" aria-label="Compose">${PM.icon('edit', 24)}<span class="m-fab-t">Compose</span></button>
      <div id="m-scrim"></div>
      <nav id="m-drawer" aria-label="Navigation"></nav>
      <div id="m-searchpane" role="dialog" aria-label="Search" hidden><div class="msp-bar"><button class="m-ib" data-s="back" aria-label="Back">${PM.icon('back', 24)}</button><input type="search" id="m-q" placeholder="Search in mail" autocomplete="off" enterkeyhint="search"><button class="m-ib" data-s="clear" aria-label="Clear">${PM.icon('close', 22)}</button></div><div class="msp-list"></div></div>
    </div>`);
    document.body.insertBefore(root, U.$('#dock'));
    U.$('#m-fab').addEventListener('click', () => PM.compose.open({}));
    U.$('#m-scrim').addEventListener('click', closeDrawer);
    U.$('#m-drawer').addEventListener('click', drawerClick);
    bindView(U.$('#m-view'));
    bindSearch();
    let lastY = 0;
    window.addEventListener('scroll', () => {
      if (!M.active) return;
      const y = window.scrollY;
      const fab = U.$('#m-fab');
      if (y > lastY + 6 && y > 80) fab.classList.add('mini');
      else if (y < lastY - 6) fab.classList.remove('mini');
      lastY = y;
      const top = U.$('#m-view .m-top, #m-view .m-bar');
      if (top) top.classList.toggle('raised', y > 4);
      const r = A().route;
      if (r && r.mode === 'list' && window.innerHeight + y > document.documentElement.scrollHeight - 400 && M.limit < (A().total || 0)) {
        M.limit += 50;
        A().schedule();
      }
    }, { passive: true });
    document.addEventListener('keydown', (e) => {
      if (!M.active || e.key !== 'Escape') return;
      if (document.body.classList.contains('drawer-open')) { closeDrawer(); e.stopPropagation(); }
      else if (!U.$('#m-searchpane').hidden) { closeSearch(); e.stopPropagation(); }
    }, true);
    (mq.addEventListener ? mq.addEventListener('change', () => M.check()) : mq.addListener(() => M.check()));
    M.check();
  };

  /* ---------- page rendering ---------- */
  M.render = function (route, routeChanged) {
    const view = U.$('#m-view');
    const key = route.mode === 'thread' ? 'thread:' + route.threadId : route.mode + ':' + (route.mode === 'list' ? A().baseHash(route.view) : route.hash);
    const prev = M.pageKey;
    if (routeChanged && prev && prev.startsWith('list:') && prev !== key) M.scrolls[prev] = window.scrollY;
    let page = view.firstElementChild;
    const isNew = !page || page.dataset.key !== key;
    if (isNew) {
      page = document.createElement('div');
      page.className = 'mp';
      page.dataset.key = key;
      view.replaceChildren(page);
      if (route.mode === 'list' && !(prev && prev.startsWith('thread:'))) M.limit = 50;
      if (route.mode === 'thread') M.exp.clear();
    }
    if (route.mode === 'thread') renderThread(page, route);
    else if (route.mode === 'settings') renderSettings(page);
    else if (route.mode === 'contacts') renderContacts(page);
    else renderList(page, route);
    U.$('#m-fab').hidden = route.mode !== 'list';
    if (isNew && routeChanged && prev) {
      const back = prev.startsWith('thread:') || prev.startsWith('settings:') || prev.startsWith('contacts:');
      page.classList.add(route.mode === 'list' ? (back ? 'mp-in-back' : 'mp-in-fade') : 'mp-in-right');
      setTimeout(() => page.classList.remove('mp-in-back', 'mp-in-fade', 'mp-in-right'), 400);
      if (route.mode === 'list' && back && M.scrolls[key] != null) window.scrollTo(0, M.scrolls[key]);
      else window.scrollTo(0, 0);
      U.$('#m-fab').classList.remove('mini');
    }
    M.pageKey = key;
    if (document.body.classList.contains('drawer-open')) renderDrawer();
  };

  /* ---------- conversation list ---------- */
  function topBar(view) {
    const sel = A().sel.size;
    if (sel) {
      const ths = Array.from(A().sel).map((k) => S.thread(k, A().scope())).filter(Boolean);
      const anyUnread = ths.some((t) => t.unread);
      const scope = A().scope();
      return `<header class="m-bar m-selbar"><button class="m-ib" data-m="clearsel" aria-label="Clear selection">${PM.icon('back', 24)}</button><span class="m-selc">${sel}</span><span class="m-flex"></span>
        ${scope === 'normal' ? `<button class="m-ib" data-m="${ths.some((t) => t.inbox) || ['inbox', 'category'].includes(view.type) ? 'archive' : 'moveInbox'}" aria-label="Archive">${PM.icon(ths.some((t) => t.inbox) || ['inbox', 'category'].includes(view.type) ? 'archive' : 'unarchive', 24)}</button>` : ''}
        ${scope === 'spam' ? `<button class="m-ib m-txt" data-m="notSpam">Not spam</button>` : ''}
        <button class="m-ib" data-m="${scope === 'normal' ? 'delete' : 'deleteForever'}" aria-label="Delete">${PM.icon(scope === 'normal' ? 'delete' : 'deleteForever', 24)}</button>
        <button class="m-ib" data-m="${anyUnread ? 'markRead' : 'markUnread'}" aria-label="${anyUnread ? 'Mark as read' : 'Mark as unread'}">${PM.icon(anyUnread ? 'mail' : 'markUnread', 24)}</button>
        <button class="m-ib" data-m="selmore" aria-label="More options">${PM.icon('moreVert', 24)}</button></header>`;
    }
    if (view.type === 'search') {
      return `<header class="m-top"><div class="m-search"><button class="m-ib" data-m="exitsearch" aria-label="Back">${PM.icon('back', 24)}</button><span class="m-sph m-sq" data-m="search">${U.esc(view.query)}</span><button class="m-ib" data-m="exitsearch" aria-label="Clear search">${PM.icon('close', 22)}</button></div></header>`;
    }
    return `<header class="m-top"><div class="m-search"><button class="m-ib" data-m="drawer" aria-label="Open navigation drawer">${PM.icon('menu', 24)}</button><span class="m-sph" data-m="search" role="button">Search in mail</span><button class="m-avbtn" data-m="account" aria-label="Account">${letterAvatar(S.me(), 32)}</button></div></header>`;
  }

  function sectionName(view) {
    if (view.type === 'inbox') return S.tabsEnabled() ? 'Primary' : 'Inbox';
    if (view.type === 'search') return 'Results';
    return A().viewName(view);
  }

  function catRows() {
    const c = S.counts(), s = S.settings();
    return ['social', 'promotions', 'updates', 'forums'].filter((x) => s.categories[x]).map((cat) => {
      const n = c.catNew[cat] || 0;
      const senders = (c.catSenders[cat] || []).map((m) => m.from.name || m.from.email).filter((v, i, a) => a.indexOf(v) === i);
      const any = S.threadsFor({ type: 'category', cat });
      if (!any.length) return '';
      const latest = senders.length ? senders : any.slice(0, 3).map((t) => t.msgs[t.msgs.length - 1].from.name);
      const color = A().CAT_COLORS[cat];
      return `<a class="m-cat${n ? ' new' : ''}" href="#category/${cat}"><span class="m-cat-ic" style="color:${color}">${PM.icon(A().CAT_ICONS[cat], 24)}</span>
        <span class="m-cat-b"><span class="m-cat-t">${A().CAT_NAMES[cat]}${n ? `<span class="m-cat-new" style="background:${color}">${n} new</span>` : ''}</span><span class="m-cat-s">${U.esc(latest.slice(0, 4).join(', '))}</span></span></a>`;
    }).join('');
  }

  function rowHtml(t, view) {
    const app = A();
    const sel = app.sel.has(t.id);
    const msgs = t.msgs.filter((m) => !S.has(m, 'DRAFT'));
    const other = [...msgs].reverse().find((m) => !S.isMe(m.from));
    const who = other ? other.from : msgs.length ? (view.type === 'sent' && msgs[0].to[0]) || msgs[0].from : S.me();
    const from = PM.list.participants(t, view).replace(/<span class="cnt">\((\d+)\)<\/span>/, '<span class="cnt">$1</span>');
    const atts = t.msgs.flatMap((m) => m.attachments || []);
    const chips = [];
    if (t.inbox && !['inbox', 'category'].includes(view.type) && S.scopeOf(view) === 'normal') chips.push('<span class="m-lc">Inbox</span>');
    t.labels.forEach((id) => { const l = S.label(id); if (l && !(view.type === 'label' && view.label === id)) chips.push(`<span class="m-lc" style="${l.color ? `background:${l.color.bg};color:${l.color.fg}` : ''}">${U.esc(l.name)}</span>`); });
    return `<div class="m-item" data-tid="${t.id}">
      <div class="m-swipe"><span class="m-sw-l">${PM.icon('archive', 24)}</span><span class="m-sw-r">${PM.icon('archive', 24)}</span></div>
      <div class="m-row${t.unread ? ' un' : ''}${sel ? ' sel' : ''}">
        <div class="m-av${sel ? ' flip' : ''}${M.justSel === t.id ? ' anim' : ''}" data-m="select" role="checkbox" aria-checked="${sel}"><span class="m-av-f">${letterAvatar(who, 40)}</span><span class="m-av-b">${PM.icon('check', 22)}</span></div>
        <div class="m-main">
          <div class="m-l1"><span class="m-from">${from}</span>${t.att ? PM.icon('attach', 16, 'm-clip') : ''}<span class="m-date">${M.date(t.date)}</span></div>
          <div class="m-l2"><span class="m-subj">${chips.join('')}${U.esc(t.subject || '(no subject)')}</span></div>
          <div class="m-l3"><span class="m-snip">${U.esc(t.snippet || '')}</span><span class="m-star${t.starred ? ' on' : ''}${M.justStar === t.id ? ' pop' : ''}" data-m="star" role="button" aria-label="${t.starred ? 'Starred' : 'Not starred'}">${PM.starIcon(t.starred)}</span></div>
          ${atts.length ? `<div class="m-atts-row">${atts.slice(0, 2).map((a) => `<span class="m-attchip">${PM.att.badge(a)}<span>${U.esc(a.name)}</span></span>`).join('')}${atts.length > 2 ? `<span class="m-attmore">+${atts.length - 2}</span>` : ''}</div>` : ''}
        </div>
      </div></div>`;
  }

  function renderList(page, route) {
    const app = A(), view = route.view;
    const threads = S.threadsFor(view);
    app.allThreads = threads;
    const shown = threads.slice(0, M.limit);
    app.page = shown;
    app.total = threads.length;
    for (const k of Array.from(app.sel)) if (!shown.some((t) => t.id === k)) app.sel.delete(k);
    const parts = [topBar(view)];
    parts.push('<div class="m-list">');
    parts.push(`<div class="m-sec">${U.esc(sectionName(view))}</div>`);
    if (view.type === 'inbox' && S.tabsEnabled()) parts.push(catRows());
    if ((view.type === 'trash' || view.type === 'spam') && threads.length) parts.push(`<div class="m-banner">Messages that have been in ${view.type === 'trash' ? 'Trash' : 'Spam'} more than 30 days will be automatically deleted. <button class="m-link" data-m="empty-${view.type}">${view.type === 'trash' ? 'Empty Trash now' : 'Empty Spam now'}</button></div>`);
    if (shown.length) parts.push(shown.map((t) => rowHtml(t, view)).join(''));
    else parts.push(`<div class="m-empty">${PM.icon(view.type === 'search' ? 'search' : 'inbox', 64)}<div>${view.type === 'search' ? 'No results' : view.type === 'inbox' || view.type === 'category' ? 'Nothing in ' + U.esc(sectionName(view)) : 'Nothing in ' + U.esc(A().viewName(view))}</div></div>`);
    if (shown.length < threads.length) parts.push('<div class="m-more"><span class="m-spin"></span></div>');
    parts.push(`<div class="m-foot">pMail view: <b>mobile</b> | <a href="#" data-m="desktop">desktop</a></div>`);
    parts.push('</div>');
    page.className = page.className.replace(/\bmp-(list|thread|settings|contacts)\b/g, '') + ' mp-list';
    page.innerHTML = parts.join('');
    M.justSel = M.justStar = null;
  }

  /* ---------- conversation ---------- */
  const splitQuote = (html) => {
    const doc = new DOMParser().parseFromString('<body>' + (html || ''), 'text/html');
    const q = doc.querySelector('.pm_quote, .gmail_quote, blockquote[type=cite]');
    if (!q) return [html || '', ''];
    const quote = q.outerHTML;
    q.remove();
    return [doc.body.innerHTML, quote];
  };
  const shortName = (a) => (S.isMe(a) ? 'me' : U.firstName(a.name) || a.email);

  function msgHtml(m, exp) {
    const name = S.isMe(m.from) ? (exp ? S.me().name : 'me') : m.from.name || m.from.email;
    if (!exp) {
      return `<div class="mm col${PM.thread.unreadAtOpen.has(m.id) ? ' un' : ''}" data-mid="${m.id}" data-mm="toggle">${letterAvatar(m.from, 40)}<div class="mm-meta"><div class="mm-l1"><span class="mm-name">${U.esc(name)}</span>${m.attachments && m.attachments.length ? PM.icon('attach', 16, 'm-clip') : ''}<span class="mm-date">${M.date(m.date)}</span></div><div class="mm-snip">${U.esc(S.snippetOf(m))}</div></div></div>`;
    }
    const [body, quote] = splitQuote(m.html);
    const showQ = M.exp.get('q:' + m.id);
    const det = M.exp.get('d:' + m.id);
    const to = [...m.to, ...m.cc];
    const addr = (l) => l.map((a) => `${U.esc(a.name || a.email)}${a.name ? ` <span class="mm-e">${U.esc(a.email)}</span>` : ''}`).join('<br>');
    return `<div class="mm exp" data-mid="${m.id}">
      <div class="mm-h" data-mm="toggle">${letterAvatar(m.from, 40)}
        <div class="mm-meta"><div class="mm-l1"><span class="mm-name">${U.esc(name)}</span><span class="mm-date">${M.date(m.date)}</span></div>
        <div class="mm-to" data-mm="details">to ${U.esc(to.length ? to.map(shortName).join(', ') : 'undisclosed recipients')}<span class="caret"></span></div></div>
        <button class="m-ib mm-rp" data-mm="reply" aria-label="Reply">${PM.icon('reply', 22)}</button><button class="m-ib mm-mo" data-mm="more" aria-label="More">${PM.icon('moreVert', 22)}</button></div>
      ${det ? `<div class="mm-det"><table><tr><td>From</td><td>${addr([m.from])}</td></tr><tr><td>To</td><td>${addr(m.to)}</td></tr>${m.cc.length ? `<tr><td>Cc</td><td>${addr(m.cc)}</td></tr>` : ''}<tr><td>Date</td><td>${U.esc(U.fullDate(m.date))}</td></tr></table></div>` : ''}
      <div class="mm-body">${U.sanitize(body)}${quote ? `<button class="mm-q" data-mm="quote" aria-label="Show quoted text">•••</button>${showQ ? `<div class="mm-quote">${U.sanitize(quote)}</div>` : ''}` : ''}</div>
      ${m.attachments && m.attachments.length ? `<div class="m-atts">${m.attachments.map((a) => `<div class="m-att" data-mid="${m.id}" data-aid="${a.id}"><div class="m-att-th">${PM.att.thumb(a, m)}</div><div class="m-att-n">${PM.att.badge(a)}<span>${U.esc(a.name)}</span></div></div>`).join('')}</div>` : ''}
    </div>`;
  }

  function renderThread(page, route) {
    const app = A(), view = route.view, scope = S.scopeOf(view);
    app.allThreads = S.threadsFor(view);
    app.page = [];
    const th = S.thread(route.threadId, scope);
    page.className = page.className.replace(/\bmp-(list|thread|settings|contacts)\b/g, '') + ' mp-thread';
    if (!th) {
      page.innerHTML = `<header class="m-bar"><button class="m-ib" data-m="back" aria-label="Back">${PM.icon('back', 24)}</button></header><div class="m-empty">This conversation could not be found.</div>`;
      return;
    }
    const msgs = th.msgs.filter((m) => !S.has(m, 'DRAFT'));
    const drafts = th.msgs.filter((m) => S.has(m, 'DRAFT'));
    const last = msgs[msgs.length - 1];
    const isExp = (m) => (M.exp.has(m.id) ? M.exp.get(m.id) : m === last || PM.thread.unreadAtOpen.has(m.id) || msgs.length === 1);
    const rows = [];
    for (let i = 0; i < msgs.length; i++) {
      const m = msgs[i];
      if (!M.exp.get('all') && i > 0 && !isExp(m)) {
        let j = i;
        while (j < msgs.length - 1 && !isExp(msgs[j])) j++;
        if (j - i >= 2) { rows.push(`<div class="mm-gap" data-mm="all" role="button"><span class="mm-gap-n">${j - i}</span></div>`); i = j - 1; continue; }
      }
      rows.push(msgHtml(m, isExp(m)));
    }
    drafts.forEach((d) => rows.push(`<div class="mm col mm-draft" data-draft="${d.id}">${letterAvatar(S.me(), 40)}<div class="mm-meta"><div class="mm-l1"><span class="mm-name draft">Draft</span><span class="mm-date">${M.date(d.date)}</span></div><div class="mm-snip">${U.esc(S.snippetOf(d) || ' ')}</div></div></div>`));
    const inInbox = th.inbox || ['inbox', 'category'].includes(view.type);
    const chips = [];
    if (scope === 'spam') chips.push('<span class="m-lc">Spam</span>');
    if (scope === 'trash') chips.push('<span class="m-lc">Trash</span>');
    if (th.inbox && scope === 'normal') chips.push('<span class="m-lc">Inbox</span>');
    th.labels.forEach((id) => { const l = S.label(id); if (l) chips.push(`<span class="m-lc" style="${l.color ? `background:${l.color.bg};color:${l.color.fg}` : ''}">${U.esc(l.name)}</span>`); });
    const many = last && ([...last.to, ...last.cc].filter((a) => !S.isMe(a)).length + (S.isMe(last.from) ? 0 : 1)) > 1;
    page.innerHTML = `<header class="m-bar"><button class="m-ib" data-m="back" aria-label="Back">${PM.icon('back', 24)}</button><span class="m-flex"></span>
        ${scope === 'normal' ? `<button class="m-ib" data-m="${inInbox ? 'archive' : 'moveInbox'}" aria-label="${inInbox ? 'Archive' : 'Move to Inbox'}">${PM.icon(inInbox ? 'archive' : 'unarchive', 24)}</button>` : ''}
        ${scope === 'spam' ? '<button class="m-ib m-txt" data-m="notSpam">Not spam</button>' : ''}
        <button class="m-ib" data-m="${scope === 'normal' ? 'delete' : 'deleteForever'}" aria-label="Delete">${PM.icon(scope === 'normal' ? 'delete' : 'deleteForever', 24)}</button>
        <button class="m-ib" data-m="markUnread" aria-label="Mark as unread">${PM.icon('markUnread', 24)}</button>
        <button class="m-ib" data-m="threadmore" aria-label="More options">${PM.icon('moreVert', 24)}</button></header>
      <div class="mt-subj"><h1>${U.esc(th.subject || '(no subject)')} ${chips.join('')}</h1><span class="m-star${th.starred ? ' on' : ''}${M.justStar === th.id ? ' pop' : ''}" data-m="tstar" role="button" aria-label="Star">${PM.starIcon(th.starred)}</span></div>
      <div class="mt-msgs">${rows.join('')}</div>
      ${(M.justStar = null) || ''}${msgs.length ? `<div class="mt-actions"><button data-mm="reply-last">${PM.icon('reply', 20)}Reply</button>${many ? `<button data-mm="replyall-last">${PM.icon('replyAll', 20)}Reply all</button>` : ''}<button data-mm="forward-last">${PM.icon('forward', 20)}Forward</button></div>` : ''}`;
  }

  /* ---------- settings (mobile) ---------- */
  const sw = (key, on) => `<span class="sw${on ? ' on' : ''}" data-sw="${key}" role="switch" aria-checked="${!!on}"><span class="sw-t"></span><span class="sw-k"></span></span>`;
  function renderSettings(page) {
    const s = S.settings(), me = S.me();
    page.className = page.className.replace(/\bmp-(list|thread|settings|contacts)\b/g, '') + ' mp-settings';
    const sel = (key, opts, cur) => `<select class="ms-sel" data-sel="${key}">${opts.map(([v, l]) => `<option value="${v}" ${String(v) === String(cur) ? 'selected' : ''}>${l}</option>`).join('')}</select>`;
    page.innerHTML = `<header class="m-bar"><button class="m-ib" data-m="back-inbox" aria-label="Back">${PM.icon('back', 24)}</button><span class="m-title">Settings</span></header>
      <div class="ms">
        <div class="ms-acct">${letterAvatar(me, 48)}<div><div class="ms-n">${U.esc(me.name)}</div><div class="ms-e">${U.esc(me.email)}</div></div><button class="m-link" data-m="editname">Edit name</button></div>
        <div class="ms-h">General</div>
        <label class="ms-row"><span class="ms-t">Conversation view<span class="ms-s">Group emails with the same topic together</span></span>${sw('conversationView', s.conversationView)}</label>
        <div class="ms-row"><span class="ms-t">Undo send<span class="ms-s">Cancellation period</span></span>${sel('undoSend', [[0, 'Off'], [5, '5 seconds'], [10, '10 seconds'], [20, '20 seconds'], [30, '30 seconds']], s.undoSend)}</div>
        <div class="ms-row"><span class="ms-t">Default reply action</span>${sel('replyAll', [['false', 'Reply'], ['true', 'Reply all']], String(s.replyAll))}</div>
        <label class="ms-row"><span class="ms-t">Snippets<span class="ms-s">Show a preview of each message</span></span>${sw('snippets', s.snippets)}</label>
        <div class="ms-row" data-m="signature" role="button"><span class="ms-t">Mobile signature<span class="ms-s">${s.signatureOn && s.signature ? U.esc(s.signature.split('\n')[0]) : 'Not set'}</span></span></div>
        <div class="ms-h">Inbox categories</div>
        ${['social', 'promotions', 'updates', 'forums'].map((c) => `<label class="ms-row"><span class="ms-t">${A().CAT_NAMES[c]}</span>${sw('cat_' + c, s.categories[c])}</label>`).join('')}
        <div class="ms-h">Notifications</div>
        <div class="ms-row"><span class="ms-t">Desktop notifications</span>${sel('notifications', [['off', 'Off'], ['important', 'Important only'], ['all', 'All new mail']], s.notifications)}</div>
        <div class="ms-h">Other</div>
        <div class="ms-row" data-m="desktop" role="button"><span class="ms-t">Desktop version<span class="ms-s">Switch to the classic desktop view</span></span></div>
        <div class="ms-row" data-m="reset" role="button"><span class="ms-t ms-warn">Reset demo mailbox<span class="ms-s">Restore the original demo data on this device</span></span></div>
      </div>`;
  }

  function renderContacts(page) {
    page.className = page.className.replace(/\bmp-(list|thread|settings|contacts)\b/g, '') + ' mp-contacts';
    const list = S.contacts().filter((c) => c.group === 'my').sort((a, b) => a.name.localeCompare(b.name));
    page.innerHTML = `<header class="m-bar"><button class="m-ib" data-m="back-inbox" aria-label="Back">${PM.icon('back', 24)}</button><span class="m-title">Contacts</span></header>
      <div class="mc">${list.map((c) => `<div class="mc-row" data-cid="${c.id}">${letterAvatar(c, 40)}<div class="mc-b"><div class="mc-n">${U.esc(c.name || c.email)}</div><div class="mc-e">${U.esc(c.email)}</div></div><button class="m-ib" data-m="mailcontact" aria-label="Email">${PM.icon('mail', 22)}</button></div>`).join('')}</div>`;
  }

  /* ---------- drawer ---------- */
  function renderDrawer() {
    const d = U.$('#m-drawer');
    const c = S.counts(), s = S.settings(), cur = A().navKey(), r = A().route;
    const item = (href, icon, name, count, sel, color) => `<a class="md-i${sel ? ' sel' : ''}" href="${href}">${color ? `<span class="md-lic" style="color:${color}">${PM.icon('label', 22)}</span>` : PM.icon(icon, 22)}<span class="md-n">${U.esc(name)}</span>${count ? `<span class="md-c">${typeof count === 'number' ? U.num(count) : U.esc(count)}</span>` : ''}</a>`;
    const parts = [`<div class="md-head">${PM.logo(28)}</div><div class="md-scroll">`];
    if (S.tabsEnabled()) {
      parts.push(item('#inbox', 'inbox', 'Primary', c.inbox, r.mode === 'list' && r.view.type === 'inbox'));
      ['social', 'promotions', 'updates', 'forums'].filter((x) => s.categories[x]).forEach((cat) => {
        parts.push(item('#category/' + cat, A().CAT_ICONS[cat], A().CAT_NAMES[cat], c.catNew[cat] ? c.catNew[cat] + ' new' : 0, r.mode === 'list' && r.view.type === 'category' && r.view.cat === cat));
      });
    } else parts.push(item('#inbox', 'inbox', 'Inbox', c.inbox, cur === 'inbox'));
    parts.push('<div class="md-h">All labels</div>');
    parts.push(item('#starred', 'star', 'Starred', 0, cur === 'starred'));
    parts.push(item('#imp', 'important', 'Important', 0, cur === 'imp'));
    parts.push(item('#sent', 'send', 'Sent', 0, cur === 'sent'));
    parts.push(item('#drafts', 'doc', 'Drafts', c.drafts, cur === 'drafts'));
    parts.push(item('#all', 'allMail', 'All mail', 0, cur === 'all'));
    parts.push(item('#spam', 'spam', 'Spam', c.spam, cur === 'spam'));
    parts.push(item('#trash', 'delete', 'Trash', 0, cur === 'trash'));
    const labels = S.labels();
    if (labels.length) {
      parts.push('<div class="md-h">Labels</div>');
      labels.forEach((l) => parts.push(item('#label/' + A().enc(l.name), 'label', l.name, c.labels[l.id] || 0, cur === 'label:' + l.id, l.color ? l.color.bg : '#5f6368')));
    }
    parts.push('<div class="md-sep"></div>');
    parts.push(item('#contacts', 'people', 'Contacts', 0, r.mode === 'contacts'));
    parts.push(`<a class="md-i" href="#" data-d="tasks">${PM.icon('tasks', 22)}<span class="md-n">Tasks</span></a>`);
    parts.push(item('#settings/general', 'settings2', 'Settings', 0, r.mode === 'settings'));
    parts.push(`<a class="md-i" href="#" data-d="help">${PM.icon('help', 22)}<span class="md-n">Help &amp; feedback</span></a>`);
    parts.push(`<a class="md-i" href="#" data-d="desktop">${PM.icon('desktop', 22)}<span class="md-n">Desktop version</span></a>`);
    parts.push('</div>');
    d.innerHTML = parts.join('');
  }
  function openDrawer() { renderDrawer(); document.body.classList.add('drawer-open'); }
  function closeDrawer() { document.body.classList.remove('drawer-open'); }
  function drawerClick(e) {
    const a = e.target.closest('a');
    if (!a) return;
    const k = a.dataset.d;
    closeDrawer();
    if (k) {
      e.preventDefault();
      if (k === 'desktop') M.setView('desktop');
      else if (k === 'help') A().help();
      else if (k === 'tasks') PM.tasks.open();
      return;
    }
    if (a.getAttribute('href') === location.hash) { e.preventDefault(); A().onRoute(); }
  }

  /* ---------- search pane ---------- */
  function bindSearch() {
    const pane = U.$('#m-searchpane'), q = U.$('#m-q'), list = U.$('.msp-list', pane);
    const draw = () => {
      const t = q.value.trim();
      if (!t) {
        const rec = U.storage.get(RECENT_KEY, []);
        list.innerHTML = rec.map((r) => `<div class="msp-i" data-q="${U.esc(r)}">${PM.icon('clock', 22)}<span>${U.esc(r)}</span></div>`).join('') || '<div class="msp-hint">Search by sender, subject or words. Operators like <b>from:</b>, <b>has:attachment</b> and <b>is:unread</b> work too.</div>';
        return;
      }
      const contacts = /:/.test(t) ? [] : S.suggest(t, 5);
      const threads = t.length >= 2 ? S.threadsFor({ type: 'search', query: t }).slice(0, 5) : [];
      list.innerHTML = `<div class="msp-i" data-q="${U.esc(t)}">${PM.icon('search', 22)}<span>Search for "<b>${U.esc(t)}</b>"</span></div>` +
        contacts.map((c) => `<div class="msp-i" data-q="${U.esc(c.email)}">${letterAvatar(c, 28)}<span>${U.esc(c.name || c.email)} <span class="msp-e">${U.esc(c.email)}</span></span></div>`).join('') +
        threads.map((th) => `<div class="msp-i" data-tid="${th.id}">${PM.icon('mail', 22)}<span>${U.esc(th.subject || '(no subject)')} <span class="msp-e">${U.esc(th.msgs[th.msgs.length - 1].from.name || '')}</span></span></div>`).join('');
    };
    M.openSearch = () => {
      const r = A().route;
      q.value = r.view && r.view.type === 'search' ? r.view.query : '';
      pane.hidden = false;
      pane.classList.remove('msp-out');
      draw();
      setTimeout(() => q.focus(), 30);
    };
    q.addEventListener('input', draw);
    q.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); run(q.value); } });
    pane.addEventListener('click', (e) => {
      const b = e.target.closest('[data-s]');
      if (b) { if (b.dataset.s === 'back') closeSearch(); else { q.value = ''; draw(); q.focus(); } return; }
      const it = e.target.closest('.msp-i');
      if (!it) return;
      if (it.dataset.tid) { closeSearch(); A().go('#search/' + A().enc(q.value.trim()) + '/' + it.dataset.tid); }
      else run(it.dataset.q);
    });
    function run(t) {
      t = String(t || '').trim();
      if (!t) return;
      const rec = U.storage.get(RECENT_KEY, []).filter((x) => x !== t);
      rec.unshift(t);
      U.storage.set(RECENT_KEY, rec.slice(0, 8));
      closeSearch();
      A().go('#search/' + A().enc(t));
    }
  }
  function closeSearch() { const p = U.$('#m-searchpane'); if (p && !p.hidden) { p.hidden = true; U.$('#m-q').blur(); } }

  /* ---------- interactions ---------- */
  function bindView(view) {
    let g = null; // active gesture
    let suppressClick = false;

    view.addEventListener('pointerdown', (e) => {
      if (!M.active || (e.pointerType === 'mouse' && e.button !== 0)) return;
      const item = e.target.closest('.m-item');
      if (!item || e.target.closest('[data-m="star"]')) return;
      g = { item, fg: item.querySelector('.m-row'), x0: e.clientX, y0: e.clientY, dx: 0, mode: null, id: e.pointerId };
      g.fg.classList.add('pressed');
      g.long = setTimeout(() => {
        if (g && !g.mode) {
          g.mode = 'long';
          g.fg.classList.remove('pressed');
          toggleSel(item.dataset.tid);
          if (navigator.vibrate) try { navigator.vibrate(15); } catch (err) { /* ignore */ }
        }
      }, 480);
    });
    view.addEventListener('pointermove', (e) => {
      if (!g || e.pointerId !== g.id) return;
      const dx = e.clientX - g.x0, dy = e.clientY - g.y0;
      if (!g.mode) {
        if (Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy) * 1.3 && !A().sel.size && canSwipe()) {
          g.mode = 'swipe';
          clearTimeout(g.long);
          g.fg.classList.remove('pressed');
          g.fg.style.transition = 'none';
          try { g.item.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
        } else if (Math.abs(dy) > 8 || Math.abs(dx) > 10) {
          g.mode = 'scroll';
          clearTimeout(g.long);
          g.fg.classList.remove('pressed');
        }
      }
      if (g.mode === 'swipe') {
        g.dx = dx;
        g.fg.style.transform = `translateX(${dx}px)`;
        g.item.classList.toggle('sw-right', dx > 0);
        g.item.classList.toggle('sw-armed', Math.abs(dx) > g.item.offsetWidth * 0.3);
      }
    });
    const end = (e, cancel) => {
      if (!g || (e && e.pointerId !== g.id)) return;
      clearTimeout(g.long);
      g.fg.classList.remove('pressed');
      if (g.mode === 'swipe') {
        suppressClick = true;
        setTimeout(() => (suppressClick = false), 50);
        if (!cancel && Math.abs(g.dx) > g.item.offsetWidth * 0.3) commitSwipe(g.item, g.fg, g.dx > 0);
        else { g.fg.style.transition = ''; g.fg.style.transform = ''; g.item.classList.remove('sw-armed'); }
      } else if (g.mode === 'long') { suppressClick = true; setTimeout(() => (suppressClick = false), 50); }
      g = null;
    };
    view.addEventListener('pointerup', (e) => end(e, false));
    view.addEventListener('pointercancel', (e) => end(e, true));
    view.addEventListener('contextmenu', (e) => { if (e.target.closest('.m-item')) e.preventDefault(); });

    view.addEventListener('click', (e) => {
      if (!M.active) return;
      if (suppressClick) { e.preventDefault(); e.stopPropagation(); return; }
      const app = A();
      const r = app.route;
      const mEl = e.target.closest('[data-m]');
      const act = mEl && mEl.dataset.m;
      const item = e.target.closest('.m-item');
      if (act === 'star' && item) {
        const t = app.page.find((x) => x.id === item.dataset.tid);
        if (t) { M.justStar = t.id; S.setStar([t.id], !t.starred, app.scope()); }
        return;
      }
      if (act === 'select' && item) { toggleSel(item.dataset.tid); return; }
      if (item && !act) {
        if (app.sel.size) { toggleSel(item.dataset.tid); return; }
        const t = app.page.find((x) => x.id === item.dataset.tid);
        if (!t) return;
        if (t.draftOnly) { PM.compose.openDraft(t.msgs.find((m) => S.has(m, 'DRAFT')).id); return; }
        item.querySelector('.m-row').classList.add('opening');
        app.go(app.threadHash(t.id));
        return;
      }
      if (act) { e.preventDefault(); return command(act, mEl, e); }
      // conversation interactions
      const mm = e.target.closest('[data-mm]');
      const draft = e.target.closest('[data-draft]');
      if (draft) { PM.compose.openDraft(draft.dataset.draft); return; }
      const att = e.target.closest('.m-att');
      if (att) {
        const m = S.msg(att.dataset.mid);
        const a = m && m.attachments.find((x) => x.id === att.dataset.aid);
        if (a) PM.att.preview(a, m, m.attachments);
        return;
      }
      if (!mm) return;
      const k = mm.dataset.mm;
      const msgEl = e.target.closest('.mm');
      const m = msgEl && S.msg(msgEl.dataset.mid);
      const th = S.thread(r.threadId, app.scope());
      const lastMsg = th && th.msgs.filter((x) => !S.has(x, 'DRAFT')).pop();
      switch (k) {
        case 'toggle': if (m) { if (e.target.closest('a')) return; M.exp.set(m.id, !msgEl.classList.contains('exp')); app.schedule(); } return;
        case 'details': e.stopPropagation(); if (m) { M.exp.set('d:' + m.id, !M.exp.get('d:' + m.id)); app.schedule(); } return;
        case 'quote': if (m) { M.exp.set('q:' + m.id, !M.exp.get('q:' + m.id)); app.schedule(); } return;
        case 'all': M.exp.set('all', true); app.schedule(); return;
        case 'reply': if (m) PM.compose.reply(m, S.settings().replyAll ? 'replyall' : 'reply', {}); return;
        case 'more': if (m) msgMenu(mm, m); return;
        case 'reply-last': if (lastMsg) PM.compose.reply(lastMsg, 'reply', {}); return;
        case 'replyall-last': if (lastMsg) PM.compose.reply(lastMsg, 'replyall', {}); return;
        case 'forward-last': if (lastMsg) PM.compose.reply(lastMsg, 'forward', {}); return;
      }
    });

    view.addEventListener('change', (e) => {
      const sel = e.target.closest('[data-sel]');
      if (!sel) return;
      const k = sel.dataset.sel, v = sel.value;
      if (k === 'undoSend') S.setSettings({ undoSend: +v });
      else if (k === 'replyAll') S.setSettings({ replyAll: v === 'true' });
      else if (k === 'notifications') { S.setSettings({ notifications: v }); if (v !== 'off' && window.Notification && Notification.permission === 'default') Notification.requestPermission(); }
      UI.notify('Settings saved.');
    });
    view.addEventListener('click', (e) => {
      const s = e.target.closest('[data-sw]');
      if (!s || !M.active) return;
      e.preventDefault();
      const k = s.dataset.sw;
      const on = !s.classList.contains('on');
      s.classList.toggle('on', on);
      setTimeout(() => {
        if (k.startsWith('cat_')) S.setSettings({ categories: { [k.slice(4)]: on } });
        else { S.setSettings({ [k]: on }); if (k === 'conversationView') S.changed(); }
      }, 180);
    });
  }

  function canSwipe() {
    const scope = A().scope();
    return scope === 'normal' && A().route.mode === 'list';
  }

  function commitSwipe(item, fg, right) {
    const app = A();
    const key = item.dataset.tid;
    const t = app.page.find((x) => x.id === key);
    fg.style.transition = 'transform .18s ease-out';
    fg.style.transform = `translateX(${right ? '' : '-'}110%)`;
    setTimeout(() => {
      item.style.height = item.offsetHeight + 'px';
      void item.offsetHeight;
      item.classList.add('collapse');
      setTimeout(() => {
        const scope = app.scope();
        if (t && t.inbox) {
          const undo = S.archive([key], scope);
          UI.notify('Archived', { undo });
        } else {
          const undo = S.trash([key], scope);
          UI.notify('Moved to Trash', { undo });
        }
      }, 200);
    }, 170);
  }

  function toggleSel(key) {
    const app = A();
    if (app.sel.has(key)) app.sel.delete(key); else app.sel.add(key);
    M.justSel = key;
    app.render(false);
  }

  function command(act, el) {
    const app = A();
    switch (act) {
      case 'drawer': return openDrawer();
      case 'search': return M.openSearch();
      case 'exitsearch': return app.go('#inbox');
      case 'account': return accountSheet(el);
      case 'clearsel': app.sel.clear(); return app.render(false);
      case 'back': return app.go(app.listHash(app.route));
      case 'back-inbox': return app.go('#inbox');
      case 'desktop': return M.setView('desktop');
      case 'tstar': { const th = S.thread(app.route.threadId, app.scope()); if (th) { M.justStar = th.id; S.setStar([th.id], !th.starred, app.scope()); } return; }
      case 'archive': case 'moveInbox': case 'delete': case 'deleteForever': case 'notSpam': case 'markRead': case 'markUnread':
        return app.act(act);
      case 'selmore': case 'threadmore': return moreMenu(el);
      case 'empty-trash': case 'empty-spam': {
        const which = act.slice(6);
        UI.confirm(`Delete all conversations in ${which === 'trash' ? 'Trash' : 'Spam'} permanently?`, { title: which === 'trash' ? 'Empty Trash' : 'Empty Spam', ok: 'Empty' }).then((ok) => {
          if (ok) { const n = S.emptyFolder(which); UI.notify(`${U.plural(n, 'conversation')} deleted`); }
        });
        return;
      }
      case 'editname': UI.prompt({ title: 'Your name', label: 'Name shown on messages you send', value: S.me().name, ok: 'Save' }).then((v) => { if (v && v.trim()) S.setMe({ name: v.trim() }); }); return;
      case 'signature': {
        const s = S.settings();
        const body = U.h(`<div><textarea class="ji" rows="4" style="width:100%">${U.esc(s.signature)}</textarea></div>`);
        UI.dialog({ title: 'Mobile signature', body, buttons: [{ label: 'OK', primary: true, action: () => { const v = U.$('textarea', body).value; S.setSettings({ signature: v, signatureOn: !!v.trim() }); } }, { label: 'Cancel' }] });
        return;
      }
      case 'reset':
        UI.confirm('Reset pMail? This deletes your changes on this device and restores the demo mailbox.', { title: 'Reset demo mailbox', ok: 'Reset' }).then((ok) => { if (ok) { PM.compose.closeAll(false); S.reset(); app.go('#inbox'); UI.notify('Mailbox reset'); } });
        return;
      case 'mailcontact': { const row = el.closest('.mc-row'); const c = S.contact(row.dataset.cid); if (c) PM.compose.open({ to: [{ name: c.name, email: c.email }] }); return; }
    }
  }

  function moreMenu(anchor) {
    const app = A(), keys = app.targetKeys(), scope = app.scope();
    const ths = keys.map((k) => S.thread(k, scope)).filter(Boolean);
    const anyImp = ths.some((t) => t.important), anyStar = ths.some((t) => t.starred), anyMuted = ths.some((t) => t.muted);
    const items = [
      { label: 'Move to', action: () => setTimeout(() => app.moveMenu(anchor), 0) },
      { label: 'Change labels', action: () => setTimeout(() => app.labelMenu(anchor), 0) },
      anyImp ? { label: 'Mark not important', action: () => app.act('notImportant') } : { label: 'Mark important', action: () => app.act('important') },
      anyStar ? { label: 'Remove star', action: () => app.act('unstar') } : { label: 'Add star', action: () => app.act('star') },
      anyMuted ? { label: 'Unmute', action: () => app.act('unmute') } : { label: 'Mute', action: () => app.act('mute') },
      scope === 'spam' ? { label: 'Not spam', action: () => app.act('notSpam') } : { label: 'Report spam', action: () => app.act('spam') },
      { label: 'Add to Tasks', action: () => app.act('addTask') },
    ];
    if (app.route.mode === 'list') items.push({ sep: true }, { label: 'Select all', action: () => app.select('all') });
    else items.push({ label: 'Print', action: () => PM.thread.print(app.route.threadId) });
    UI.menu(anchor, items, { align: 'right', minWidth: 200, force: true });
  }

  function msgMenu(anchor, m) {
    const many = [...m.to, ...m.cc].filter((a) => !S.isMe(a)).length + (S.isMe(m.from) ? 0 : 1) > 1;
    UI.menu(anchor, [
      { label: 'Reply', action: () => PM.compose.reply(m, 'reply', {}) },
      many ? { label: 'Reply all', action: () => PM.compose.reply(m, 'replyall', {}) } : null,
      { label: 'Forward', action: () => PM.compose.reply(m, 'forward', {}) },
      { label: S.has(m, 'STARRED') ? 'Remove star' : 'Add star', action: () => S.msgOp(m.id, S.has(m, 'STARRED') ? 'unstar' : 'star') },
      { label: 'Mark unread from here', action: () => { const th = S.thread(A().route.threadId, A().scope()); let on = false; th.msgs.forEach((x) => { if (x.id === m.id) on = true; if (on && !S.has(x, 'DRAFT')) S.msgOp(x.id, 'unread'); }); A().go(A().listHash(A().route)); } },
      { label: 'Delete', action: () => { const undo = S.msgOp(m.id, 'trash'); UI.notify('Message moved to Trash', { undo }); if (!S.thread(A().route.threadId, A().scope())) A().go(A().listHash(A().route)); } },
      { label: 'Print', action: () => PM.thread.print(A().route.threadId) },
    ], { align: 'right', minWidth: 200, force: true });
  }

  function accountSheet(anchor) {
    const me = S.me();
    const el = U.h(`<div class="m-acct"><div class="m-acct-top">${letterAvatar(me, 56)}<div><div class="m-acct-n">${U.esc(me.name)}</div><div class="m-acct-e">${U.esc(me.email)}</div></div></div>
      <button class="m-acct-i" data-a="settings">${PM.icon('settings2', 22)}Settings</button>
      <button class="m-acct-i" data-a="desktop">${PM.icon('desktop', 22)}Desktop version</button>
      <button class="m-acct-i" data-a="out">${PM.icon('person', 22)}Sign out</button></div>`);
    el.addEventListener('click', (e) => {
      const b = e.target.closest('[data-a]');
      if (!b) return;
      UI.closePopup();
      if (b.dataset.a === 'settings') A().go('#settings/general');
      else if (b.dataset.a === 'desktop') M.setView('desktop');
      else A().signOut();
    });
    UI.popup(anchor, el, { align: 'right', gap: 6 });
  }
})(window.PM);
