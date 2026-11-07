/* pMail — conversation list (thread list) view */
(function (PM) {
  'use strict';
  const U = PM.util, UI = PM.ui, S = PM.store;
  const L = (PM.list = {});
  const A = () => PM.app;

  const EMPTY = {
    personal: ['Your Primary tab is empty.', 'Personal messages and messages that don\'t appear in other tabs will be shown here.'],
    social: ['Your Social tab is empty.', 'Messages from social networks, media-sharing sites, online dating services, and other social websites will be shown here.'],
    promotions: ['Your Promotions tab is empty.', 'Deals, offers, and other marketing emails will be shown here.'],
    updates: ['Your Updates tab is empty.', 'Personal, auto-generated updates including confirmations, receipts, bills, and statements will be shown here.'],
    forums: ['Your Forums tab is empty.', 'Messages from online groups, discussion boards, and mailing lists will be shown here.'],
  };

  /* "Liam, me, Sofia (4)" with unread senders in bold and "Draft" in red */
  L.participants = function (t, view) {
    const msgs = t.msgs.filter((m) => !S.has(m, 'DRAFT'));
    const draftN = t.msgs.length - msgs.length;
    if (!msgs.length) return `<span class="draft">Draft</span>`;
    const allMe = msgs.every((m) => S.isMe(m.from));
    let html;
    if (view && view.type === 'sent' && allMe) {
      const rec = [];
      msgs.forEach((m) => [...m.to, ...m.cc].forEach((a) => { if (!rec.some((x) => x.email === a.email)) rec.push(a); }));
      const names = rec.map((a) => (S.isMe(a) ? 'me' : rec.length > 1 ? U.firstName(a.name) || a.email.split('@')[0] : a.name || a.email));
      html = 'To: ' + U.esc(names.slice(0, 3).join(', ') + (names.length > 3 ? ', ..' : ''));
    } else {
      const seen = [];
      msgs.forEach((m) => {
        let s = seen.find((x) => x.email === m.from.email.toLowerCase());
        if (!s) seen.push((s = { email: m.from.email.toLowerCase(), a: m.from, unread: false }));
        if (S.has(m, 'UNREAD')) s.unread = true;
      });
      const nm = (s) => {
        if (S.isMe(s.a)) return 'me';
        if (seen.length === 1) return s.a.name || s.a.email;
        return U.firstName(s.a.name) || s.a.email.split('@')[0];
      };
      let show = seen;
      if (seen.length > 3) show = [seen[0], null, seen[seen.length - 2], seen[seen.length - 1]];
      html = show.map((s) => (s ? (s.unread ? `<b>${U.esc(nm(s))}</b>` : U.esc(nm(s))) : '..')).join(', ').replace(/, \.\., /, ' .. ');
    }
    if (draftN) html += `, <span class="draft">Draft${draftN > 1 ? 's' : ''}</span>`;
    if (t.msgs.length > 1) html += ` <span class="cnt">(${t.msgs.length})</span>`;
    return html;
  };

  function sectionsFor(view, threads) {
    const type = S.settings().inboxType;
    if (view.type !== 'inbox' || type === 'default') return null;
    const imp = (t) => t.important && t.unread;
    if (type === 'important') return [['Important and unread', threads.filter(imp)], ['Everything else', threads.filter((t) => !imp(t))]];
    if (type === 'unread') return [['Unread', threads.filter((t) => t.unread)], ['Everything else', threads.filter((t) => !t.unread)]];
    if (type === 'starred') return [['Starred', threads.filter((t) => t.starred)], ['Everything else', threads.filter((t) => !t.starred)]];
    if (type === 'priority') {
      const a = threads.filter(imp), b = threads.filter((t) => t.starred && !imp(t));
      return [['Important and unread', a], ['Starred', b], ['Everything else', threads.filter((t) => !imp(t) && !t.starred)]];
    }
    return null;
  }

  const collapsed = {};

  L.row = function (t, view, idx) {
    const app = A(), s = S.settings();
    const sel = app.sel.has(t.id);
    const labelChips = [];
    if (t.inbox && !['inbox', 'category'].includes(view.type) && S.scopeOf(view) === 'normal') labelChips.push('<span class="lc lc-sys">Inbox</span>');
    t.labels.forEach((id) => {
      if (view.type === 'label' && view.label === id) return;
      const l = S.label(id);
      if (!l) return;
      labelChips.push(`<span class="lc" style="${l.color ? `background:${l.color.bg};color:${l.color.fg}` : ''}" data-label="${U.esc(l.name)}">${U.esc(l.name)}</span>`);
    });
    if (S.scopeOf(view) === 'any') { if (t.msgs.some((m) => S.has(m, 'TRASH'))) labelChips.push('<span class="lc lc-sys">Trash</span>'); if (t.msgs.some((m) => S.has(m, 'SPAM'))) labelChips.push('<span class="lc lc-sys">Spam</span>'); }
    let lvl = '';
    if (s.levelIndicators) {
      const m = t.msgs[t.msgs.length - 1];
      const rec = [...(m.to || []), ...(m.cc || [])];
      if (rec.some((a) => S.isMe(a))) lvl = rec.length === 1 ? '›' : '»';
    }
    const snippet = s.snippets && t.snippet ? `<span class="snip"> - ${U.esc(t.snippet)}</span>` : '';
    return `<div class="tr${t.unread ? ' un' : ' rd'}${sel ? ' sel' : ''}${idx === app.cursor ? ' kf' : ''}" data-tid="${t.id}" data-i="${idx}" draggable="true" role="row">
      <div class="td c-drag" aria-hidden="true"></div>
      <div class="td c-chk">${UI.checkbox(sel, app.justChecked === t.id)}</div>
      <div class="td c-star" data-tip="${t.starred ? 'Starred' : 'Not starred'}">${PM.starIcon(t.starred)}</div>
      ${s.importanceMarkers ? `<div class="td c-imp" data-tip="${t.important ? 'Click to teach pMail this conversation is not important.' : 'Click to teach pMail this conversation is important.'}">${PM.impIcon(t.important)}</div>` : ''}
      ${s.levelIndicators ? `<div class="td c-lvl">${lvl}</div>` : ''}
      <div class="td c-from" title="${U.esc(t.msgs.map((m) => m.from.email).filter((v, i, a) => a.indexOf(v) === i).join(', '))}">${L.participants(t, view)}</div>
      <div class="td c-subj"><div class="subj-in">${labelChips.join('')}<span class="subj">${U.esc(t.subject || '(no subject)')}</span>${snippet}</div></div>
      <div class="td c-att">${t.att ? PM.icon('attach', 16) : ''}</div>
      <div class="td c-date" title="${U.esc(U.fullDate(t.date))}"><span>${U.listDate(t.date)}</span></div>
    </div>`;
  };

  function tabsHtml(view) {
    const s = S.settings(), c = S.counts();
    const cats = ['personal', ...['social', 'promotions', 'updates', 'forums'].filter((x) => s.categories[x])];
    const cur = view.type === 'category' ? view.cat : 'personal';
    return `<div class="tabs" role="tablist">${cats.map((cat) => {
      const selected = cat === cur;
      const nNew = cat === 'personal' ? 0 : c.catNew[cat] || 0;
      const senders = cat === 'personal' ? [] : (c.catSenders[cat] || []).map((m) => m.from.name || m.from.email).filter((v, i, a) => a.indexOf(v) === i);
      const color = PM.app.CAT_COLORS[cat];
      return `<div class="tab${selected ? ' sel' : ''}" role="tab" aria-selected="${selected}" data-cat="${cat}" data-drop="CAT:${cat}" style="--tc:${color}">
        <span class="tab-ic">${PM.icon(PM.app.CAT_ICONS[cat], 20)}</span>
        <span class="tab-t"><span class="tab-name">${PM.app.CAT_NAMES[cat]}${!selected && nNew ? `<span class="tab-new" style="background:${color}">${nNew} new</span>` : ''}</span>
        ${!selected && nNew ? `<span class="tab-snip">${U.esc(senders.slice(0, 4).join(', '))}</span>` : ''}</span></div>`;
    }).join('')}<div class="tab-add" data-act="configure" data-tip="Configure inbox">${PM.icon('add', 18)}</div></div>`;
  }

  L.render = function (el, route) {
    const app = A(), view = route.view, s = S.settings();
    const threads = S.threadsFor(view);
    app.allThreads = threads;
    const ps = s.pageSize;
    const sections = sectionsFor(view, threads);
    let pageThreads, total;
    const parts = [];

    if ((view.type === 'inbox' || view.type === 'category') && S.tabsEnabled()) parts.push(tabsHtml(view));
    const scope = S.scopeOf(view);
    if (view.type === 'trash' && threads.length) parts.push(`<div class="banner">Messages that have been in Trash more than 30 days will be automatically deleted. <a href="#" data-act="emptyTrash">Empty Trash now</a></div>`);
    if (view.type === 'spam' && threads.length) parts.push(`<div class="banner">Messages that have been in Spam more than 30 days will be automatically deleted. <a href="#" data-act="emptySpam">Delete all spam messages now</a></div>`);
    if (view.type === 'search' && scope === 'normal' && view.query) {
      const any = S.threadsFor({ type: 'search', query: view.query + ' in:anywhere' }).length;
      if (any > threads.length) parts.push(`<div class="banner">Some messages in Trash or Spam match your search. <a href="${PM.app.baseHash({ type: 'search', query: view.query + ' in:anywhere' })}">View messages</a></div>`);
    }

    if (sections) {
      total = threads.length;
      let idx = 0;
      pageThreads = [];
      const rows = [];
      sections.forEach(([title, list], si) => {
        const last = si === sections.length - 1;
        const shown = last ? list.slice((route.page - 1) * ps, route.page * ps) : list.slice(0, 25);
        const isCol = collapsed[title];
        rows.push(`<div class="sec-h${isCol ? ' col' : ''}" data-sec="${U.esc(title)}"><span class="sec-tri"></span><span class="sec-t">${U.esc(title)}</span><span class="sec-n">${list.length ? `${U.num(Math.min(list.length, 1))}–${U.num(shown.length)} of ${U.num(list.length)}` : ''}</span></div>`);
        if (!isCol) {
          if (!shown.length) rows.push(`<div class="sec-empty">${title === 'Everything else' ? 'Nothing here.' : `Woohoo! You've read all the messages in your inbox.`}</div>`);
          shown.forEach((t) => { rows.push(L.row(t, view, idx++)); pageThreads.push(t); });
        }
      });
      total = sections[sections.length - 1][1].length;
      parts.push(`<div class="tl" role="grid">${rows.join('')}</div>`);
    } else {
      total = threads.length;
      const maxPage = Math.max(1, Math.ceil(total / ps));
      if (route.page > maxPage) route.page = maxPage;
      pageThreads = threads.slice((route.page - 1) * ps, route.page * ps);
      if (pageThreads.length) parts.push(`<div class="tl" role="grid">${pageThreads.map((t, i) => L.row(t, view, i)).join('')}</div>`);
      else parts.push(emptyState(view));
    }
    app.page = pageThreads;
    app.total = total;
    if (app.cursor >= pageThreads.length) app.cursor = Math.max(0, pageThreads.length - 1);
    // prune selection to visible
    for (const k of Array.from(app.sel)) if (!pageThreads.some((t) => t.id === k)) app.sel.delete(k);
    parts.push(PM.app.footer());
    el.className = 'view-list';
    el.innerHTML = parts.join('');
    app.justChecked = null;
  };

  function emptyState(view) {
    const t = view.type;
    let html;
    if (t === 'inbox' && S.tabsEnabled()) html = `<b>${EMPTY.personal[0]}</b><br>${EMPTY.personal[1]}`;
    else if (t === 'category') html = `<b>${EMPTY[view.cat][0]}</b><br>${EMPTY[view.cat][1]}`;
    else if (t === 'inbox') html = `<b>No new mail!</b> Want to read updates from your favorite sites? Try organizing them with labels.`;
    else if (t === 'starred') html = `No starred messages. Stars let you give messages a special status to make them easier to find. To star a message, click on the star outline beside any message or conversation.`;
    else if (t === 'imp') html = `No important messages. Messages are automatically marked as important based on what you open and reply to. Click the marker beside any conversation to mark it.`;
    else if (t === 'sent') html = `No sent messages! <a href="#" data-act="compose">Send</a> one now!`;
    else if (t === 'drafts') html = `You don't have any saved drafts.<br>Saving a draft allows you to keep a message you aren't ready to send yet.`;
    else if (t === 'spam') html = `Hooray, no spam here!`;
    else if (t === 'trash') html = `No conversations in the Trash.`;
    else if (t === 'chats') html = `No chats. Chat history is stored on this device only.`;
    else if (t === 'label' && view.label === '__missing') html = `The label "${U.esc(view.name)}" doesn't exist. <a href="#inbox">Return to Inbox</a>`;
    else if (t === 'search') html = `No messages matched your search. Try using <a href="#" data-act="searchOptions">search options</a> such as sender, date, size and more.`;
    else html = `There are no conversations with this label.`;
    return `<div class="empty">${html}</div>`;
  }

  /* ---------- events ---------- */
  L.bind = function (el) {
    let dragImage = null;
    el.addEventListener('click', (e) => {
      if (el.className !== 'view-list') return;
      const app = A();
      const act = e.target.closest('[data-act]');
      if (act) {
        e.preventDefault();
        const a = act.dataset.act;
        if (a === 'emptyTrash' || a === 'emptySpam') return emptyFolder(a === 'emptyTrash' ? 'trash' : 'spam');
        if (a === 'compose') return PM.compose.open({});
        if (a === 'searchOptions') return PM.searchUI.openAdvanced({});
        if (a === 'configure') return PM.app.configureInbox();
      }
      const foot = e.target.closest('[data-foot]');
      if (foot) { e.preventDefault(); return PM.app.footerClick(foot.dataset.foot); }
      const sec = e.target.closest('.sec-h');
      if (sec) { collapsed[sec.dataset.sec] = !collapsed[sec.dataset.sec]; PM.app.schedule(); return; }
      const tab = e.target.closest('.tab');
      if (tab) {
        const cat = tab.dataset.cat;
        PM.app.go(cat === 'personal' ? '#inbox' : '#category/' + cat);
        return;
      }
      const row = e.target.closest('.tr');
      if (!row) return;
      const key = row.dataset.tid;
      const idx = +row.dataset.i;
      const t = app.page.find((x) => x.id === key);
      if (!t) return;
      if (e.target.closest('.c-chk')) {
        if (e.shiftKey && app.lastClicked != null) {
          const a = Math.min(app.lastClicked, idx), b = Math.max(app.lastClicked, idx);
          const on = !app.sel.has(key);
          for (let i = a; i <= b; i++) { const k = app.page[i] && app.page[i].id; if (k) on ? app.sel.add(k) : app.sel.delete(k); }
        } else if (app.sel.has(key)) app.sel.delete(key); else app.sel.add(key);
        app.justChecked = key;
        app.lastClicked = idx;
        app.cursor = idx;
        PM.app.schedule();
        return;
      }
      if (e.target.closest('.c-star')) { UI.hideTip(); S.setStar([key], !t.starred, S.scopeOf(app.route.view)); return; }
      if (e.target.closest('.c-imp')) {
        UI.hideTip();
        const undo = S.setImportant([key], !t.important, S.scopeOf(app.route.view));
        UI.notify(t.important ? 'The conversation has been marked as not important.' : 'The conversation has been marked as important.', { undo });
        return;
      }
      openThread(t);
    });

    el.addEventListener('dragstart', (e) => {
      const row = e.target.closest && e.target.closest('.tr');
      if (!row) return;
      const app = A();
      const key = row.dataset.tid;
      const keys = app.sel.has(key) ? Array.from(app.sel) : [key];
      app.dragKeys = keys;
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', keys.join(','));
      dragImage = U.h(`<div class="drag-img">${PM.icon('mail', 16)} Move ${keys.length} conversation${keys.length > 1 ? 's' : ''}</div>`);
      document.body.appendChild(dragImage);
      e.dataTransfer.setDragImage(dragImage, 10, 10);
      document.body.classList.add('dragging');
    });
    el.addEventListener('dragend', () => {
      if (dragImage) { dragImage.remove(); dragImage = null; }
      document.body.classList.remove('dragging');
      U.$$('.drop').forEach((x) => x.classList.remove('drop'));
      setTimeout(() => (A().dragKeys = null), 0);
    });
    el.addEventListener('dragover', (e) => {
      const tab = e.target.closest('.tab[data-drop]');
      if (!tab || !A().dragKeys) return;
      e.preventDefault();
      tab.classList.add('drop');
    });
    el.addEventListener('dragleave', (e) => { const tab = e.target.closest('.tab'); if (tab && !tab.contains(e.relatedTarget)) tab.classList.remove('drop'); });
    el.addEventListener('drop', (e) => {
      const tab = e.target.closest('.tab[data-drop]');
      if (!tab || !A().dragKeys) return;
      e.preventDefault();
      tab.classList.remove('drop');
      PM.app.dropOn(tab.dataset.drop, A().dragKeys);
    });
  };

  function openThread(t) {
    const app = A();
    if (t.draftOnly) {
      const d = t.msgs.find((m) => S.has(m, 'DRAFT'));
      PM.compose.openDraft(d.id);
      return;
    }
    app._listScroll = U.$('#content').scrollTop;
    app.cursor = app.page.indexOf(t);
    PM.app.go(PM.app.threadHash(t.id));
  }
  L.openThread = openThread;

  function emptyFolder(which) {
    const n = S.threadsFor({ type: which }).length;
    const label = which === 'trash' ? 'Trash' : 'Spam';
    UI.confirm(`You are about to permanently delete ${U.plural(n, 'conversation')} in ${label}. Are you sure you want to continue?`, { title: 'Confirm deleting messages', ok: 'OK' }).then((ok) => {
      if (!ok) return;
      const c = S.emptyFolder(which);
      UI.notify(c === 1 ? 'The conversation has been deleted.' : `${U.num(c)} conversations have been deleted.`);
    });
  }
})(window.PM);
