/* pMail — state, persistence and mailbox operations.
 * Model mirrors a label-based mailbox: every message carries labels
 * (INBOX, UNREAD, STARRED, SENT, DRAFT, SPAM, TRASH, CATEGORY_*, user label ids).
 * A conversation's state is derived from its messages. */
(function (PM) {
  'use strict';
  const U = PM.util;
  const KEY = 'pmail.state.v1';

  const CATS = ['personal', 'social', 'promotions', 'updates', 'forums'];
  const CAT_LABEL = (c) => 'CATEGORY_' + c.toUpperCase();

  const DEFAULTS = {
    pageSize: 50,
    contactsPageSize: 250,
    undoSend: 10,
    replyAll: false,
    sendArchive: false,
    fontFamily: 'arial,helvetica,sans-serif',
    fontSize: 'normal',
    conversationView: true,
    notifications: 'off',
    shortcuts: true,
    buttonLabels: 'icons',
    autoContacts: true,
    signatureOn: false,
    signature: '',
    sigBeforeQuote: false,
    levelIndicators: false,
    snippets: true,
    vacation: { on: false, start: '', end: '', subject: '', message: '', contactsOnly: false },
    density: 'comfortable',
    inboxType: 'default',
    categories: { social: true, promotions: true, updates: false, forums: false },
    starredInPrimary: true,
    importanceMarkers: true,
    theme: 'light',
    chatOn: true,
    sysLabels: { starred: 'show', important: 'show', chats: 'hide', sent: 'show', drafts: 'show', all: 'hide', spam: 'hide', trash: 'hide', categories: 'hide' },
    catLabels: { social: 'show', promotions: 'show', updates: 'show', forums: 'show' },
    labs: { autoAdvance: false, markReadButton: false, unreadIcon: false },
    forwarding: { address: '', pop: 'disabled', imap: 'disabled' },
    language: 'English (US)',
    country: 'United States',
    composeFullscreen: false,
    navMore: false,
    navCatsOpen: false,
    picture: '',
    blocked: [],
    sort: 'newest',
  };

  let state = null;
  let version = 0;
  const S = (PM.store = { CATS, CAT_LABEL });

  /* ---------- persistence ---------- */
  let saveFailedWarned = false;
  const persist = U.debounce(() => {
    if (!U.storage.set(KEY, state) && !saveFailedWarned) {
      saveFailedWarned = true;
      PM.bus.emit('storage-full');
    }
  }, 300);

  function changed(what) {
    version++;
    persist();
    PM.bus.emit('change', what || {});
  }
  S.changed = changed;
  S.flush = () => persist.flush();

  S.load = function () {
    const saved = U.storage.get(KEY, null);
    if (saved && saved.v === 1 && saved.messages) state = saved;
    else fresh();
    state.settings = deepMerge(JSON.parse(JSON.stringify(DEFAULTS)), state.settings || {});
    state.tabSeen = state.tabSeen || {};
    state.filters = state.filters || [];
    state.tasks = state.tasks || [];
    state.chats = state.chats || {};
    state.incoming = state.incoming || [];
    state.lastActivity = state.lastActivity || Date.now();
    version++;
  };

  function deepMerge(a, b) {
    for (const k of Object.keys(b)) {
      if (b[k] && typeof b[k] === 'object' && !Array.isArray(b[k]) && a[k] && typeof a[k] === 'object') a[k] = deepMerge(a[k], b[k]);
      else a[k] = b[k];
    }
    return a;
  }

  function fresh() {
    const seed = PM.seed();
    state = {
      v: 1, created: Date.now(), me: seed.me, settings: JSON.parse(JSON.stringify(DEFAULTS)),
      labels: seed.labels, messages: seed.messages, contacts: seed.contacts, filters: [],
      tasks: seed.tasks, chats: seed.chats, incoming: seed.incoming, tabSeen: {}, lastActivity: Date.now(),
    };
  }

  S.reset = function () {
    fresh();
    persist.flush();
    changed({ reset: true });
  };

  S.raw = () => state;
  S.me = () => state.me;
  S.isMe = (addr) => !!addr && String(addr.email || addr).toLowerCase() === state.me.email.toLowerCase();
  S.settings = () => state.settings;
  S.setSettings = (patch) => { deepMerge(state.settings, patch); changed({ settings: true }); };
  S.touch = () => { state.lastActivity = Date.now(); persist(); };
  S.version = () => version;

  /* ---------- messages & threads ---------- */
  S.msg = (id) => state.messages[id];
  S.has = (m, l) => m.labels.indexOf(l) !== -1;
  const has = S.has;
  const add = (m, l) => { if (m.labels.indexOf(l) === -1) m.labels.push(l); };
  const rem = (m, l) => { const i = m.labels.indexOf(l); if (i !== -1) m.labels.splice(i, 1); };

  S.catOf = (m) => {
    for (const c of CATS) if (has(m, CAT_LABEL(c))) return c;
    return 'personal';
  };

  let threadCache = { v: -1, map: null };
  function threadMap() {
    if (threadCache.v === version) return threadCache.map;
    const map = new Map();
    const byConv = state.settings.conversationView;
    for (const id in state.messages) {
      const m = state.messages[id];
      const key = byConv ? m.threadId : m.id;
      let arr = map.get(key);
      if (!arr) map.set(key, (arr = []));
      arr.push(m);
    }
    for (const arr of map.values()) arr.sort((a, b) => a.date - b.date);
    threadCache = { v: version, map };
    return map;
  }

  const inScope = (m, scope) => {
    if (scope === 'any') return true;
    if (scope === 'trash') return has(m, 'TRASH');
    if (scope === 'spam') return has(m, 'SPAM') && !has(m, 'TRASH');
    return !has(m, 'TRASH') && !has(m, 'SPAM');
  };
  S.inScope = inScope;

  S.scopeOf = (view) => {
    if (!view) return 'normal';
    if (view.type === 'trash') return 'trash';
    if (view.type === 'spam') return 'spam';
    if (view.type === 'search') return PM.search.compile(view.query).scope;
    return 'normal';
  };

  function viewPred(view) {
    const s = state.settings;
    switch (view.type) {
      case 'inbox': {
        const tabs = S.tabsEnabled();
        if (!tabs || s.inboxType !== 'default') return (m) => has(m, 'INBOX');
        return (m) => has(m, 'INBOX') && (S.catOf(m) === 'personal' || !s.categories[S.catOf(m)] || (s.starredInPrimary && has(m, 'STARRED')));
      }
      case 'category': return (m) => has(m, 'INBOX') && S.catOf(m) === view.cat;
      case 'starred': return (m) => has(m, 'STARRED');
      case 'imp': return (m) => has(m, 'IMPORTANT');
      case 'sent': return (m) => has(m, 'SENT');
      case 'drafts': return (m) => has(m, 'DRAFT');
      case 'all': return () => true;
      case 'spam': return () => true;
      case 'trash': return () => true;
      case 'chats': return () => false;
      case 'label': return (m) => has(m, view.label);
      case 'catlabel': return (m) => S.catOf(m) === view.cat;
      case 'search': return PM.search.compile(view.query).pred;
      default: return () => false;
    }
  }

  S.tabsEnabled = () => {
    const c = state.settings.categories;
    return state.settings.inboxType === 'default' && (c.social || c.promotions || c.updates || c.forums);
  };

  function summarize(key, msgs, all) {
    const last = msgs[msgs.length - 1];
    const nonDraft = msgs.filter((m) => !has(m, 'DRAFT'));
    const first = nonDraft[0] || msgs[0];
    const snipSrc = nonDraft[nonDraft.length - 1] || last;
    const user = new Set();
    let unread = false, starred = false, important = false, att = false, draft = false, inbox = false, muted = false;
    for (const m of msgs) {
      if (has(m, 'UNREAD')) unread = true;
      if (has(m, 'STARRED')) starred = true;
      if (has(m, 'IMPORTANT')) important = true;
      if (has(m, 'DRAFT')) draft = true;
      if (has(m, 'INBOX')) inbox = true;
      if (has(m, 'MUTED')) muted = true;
      if (m.attachments && m.attachments.length) att = true;
      for (const l of m.labels) if (l[0] === 'L') user.add(l);
    }
    return {
      id: key, msgs, all, last, date: last.date,
      subject: first.subject || '', snippet: snippetOf(snipSrc),
      unread, starred, important, att, draft, inbox, muted,
      draftOnly: draft && !nonDraft.length,
      labels: Array.from(user), cat: S.catOf(first), count: msgs.length,
    };
  }

  const snipCache = new Map();
  function snippetOf(m) {
    const k = m.id + ':' + (m.html ? m.html.length : 0);
    let s = snipCache.get(k);
    if (s == null) { s = U.textOf(m.html).slice(0, 220); snipCache.set(k, s); }
    return s;
  }
  S.snippetOf = snippetOf;

  /* All conversations matching a view, newest first. */
  S.threadsFor = function (view) {
    const scope = S.scopeOf(view);
    const pred = viewPred(view);
    const out = [];
    for (const [key, all] of threadMap()) {
      const msgs = all.filter((m) => inScope(m, scope));
      if (!msgs.length) continue;
      if (!msgs.some(pred)) continue;
      out.push(summarize(key, msgs, all));
    }
    out.sort((a, b) => b.date - a.date);
    if (state.settings.sort === 'oldest' && view.type !== 'drafts') out.reverse();
    return out;
  };

  S.thread = function (key, scope) {
    const all = threadMap().get(key);
    if (!all) return null;
    let msgs = all.filter((m) => inScope(m, scope || 'normal'));
    if (!msgs.length) msgs = all.filter((m) => inScope(m, 'any'));
    if (!msgs.length) return null;
    return summarize(key, msgs, all);
  };

  S.threadKeyOf = (m) => (state.settings.conversationView ? m.threadId : m.id);

  /* ---------- counts for navigation ---------- */
  let countCache = { v: -1 };
  S.counts = function () {
    if (countCache.v === version) return countCache.c;
    const c = { inbox: 0, drafts: 0, spam: 0, labels: {}, cats: {}, catNew: {}, catSenders: {}, starred: 0, imp: 0 };
    const tabs = S.tabsEnabled();
    const s = state.settings;
    for (const [, all] of threadMap()) {
      const normal = all.filter((m) => inScope(m, 'normal'));
      const spam = all.filter((m) => inScope(m, 'spam'));
      if (spam.some((m) => has(m, 'UNREAD'))) c.spam++;
      if (!normal.length) continue;
      const unread = normal.some((m) => has(m, 'UNREAD'));
      for (const m of normal) if (has(m, 'DRAFT')) c.drafts++;
      const inbox = normal.filter((m) => has(m, 'INBOX'));
      if (inbox.length && unread) {
        const cats = new Set(inbox.map((m) => S.catOf(m)));
        const starredP = s.starredInPrimary && inbox.some((m) => has(m, 'STARRED'));
        if (!tabs || cats.has('personal') || starredP || [...cats].some((x) => !s.categories[x])) c.inbox++;
        const last = normal[normal.length - 1];
        for (const cat of cats) {
          if (cat === 'personal') continue;
          c.cats[cat] = (c.cats[cat] || 0) + 1;
          if (last.date > (state.tabSeen[cat] || 0)) {
            c.catNew[cat] = (c.catNew[cat] || 0) + 1;
            (c.catSenders[cat] = c.catSenders[cat] || []).push(last);
          }
        }
      }
      if (unread) {
        const ls = new Set();
        normal.forEach((m) => m.labels.forEach((l) => l[0] === 'L' && ls.add(l)));
        ls.forEach((l) => (c.labels[l] = (c.labels[l] || 0) + 1));
        if (normal.some((m) => has(m, 'IMPORTANT'))) c.imp++;
      }
    }
    for (const k in c.catSenders) c.catSenders[k].sort((a, b) => b.date - a.date);
    countCache = { v: version, c };
    return c;
  };

  S.markTabSeen = (cat) => { state.tabSeen[cat] = Date.now(); version++; persist(); };

  /* ---------- modifications (all return an undo function) ---------- */
  function idsFor(keys, scope) {
    const map = threadMap();
    const out = [];
    for (const k of keys) (map.get(k) || []).forEach((m) => { if (inScope(m, scope || 'normal')) out.push(m); });
    return out;
  }
  S.msgsFor = idsFor;

  function snapshot(msgs) {
    const snap = msgs.map((m) => [m.id, m.labels.slice()]);
    return () => {
      snap.forEach(([id, ls]) => { if (state.messages[id]) state.messages[id].labels = ls; });
      changed({ undo: true });
    };
  }

  function modify(keys, scope, fn) {
    const msgs = idsFor(keys, scope);
    const undo = snapshot(msgs);
    msgs.forEach(fn);
    changed();
    return undo;
  }

  S.archive = (keys, scope) => modify(keys, scope, (m) => rem(m, 'INBOX'));
  S.toInbox = (keys, scope) => modify(keys, scope, (m) => { rem(m, 'TRASH'); rem(m, 'SPAM'); if (!has(m, 'DRAFT')) add(m, 'INBOX'); });
  S.trash = (keys, scope) => modify(keys, scope, (m) => { add(m, 'TRASH'); rem(m, 'INBOX'); m.trashedAt = Date.now(); });
  S.untrash = (keys) => modify(keys, 'trash', (m) => { rem(m, 'TRASH'); if (!has(m, 'SENT') && !has(m, 'DRAFT')) add(m, 'INBOX'); });
  S.spam = (keys, scope) => modify(keys, scope, (m) => { add(m, 'SPAM'); rem(m, 'INBOX'); });
  S.notSpam = (keys) => modify(keys, 'spam', (m) => { rem(m, 'SPAM'); add(m, 'INBOX'); });
  S.mute = (keys, scope) => modify(keys, scope, (m) => { add(m, 'MUTED'); rem(m, 'INBOX'); });
  S.unmute = (keys, scope) => modify(keys, scope, (m) => rem(m, 'MUTED'));
  S.setImportant = (keys, on, scope) => modify(keys, scope, (m) => (on ? add(m, 'IMPORTANT') : rem(m, 'IMPORTANT')));
  S.setLabel = (keys, labelId, on, scope) => modify(keys, scope, (m) => (on ? add(m, labelId) : rem(m, labelId)));
  S.setCategory = (keys, cat, scope) => modify(keys, scope, (m) => { CATS.forEach((c) => rem(m, CAT_LABEL(c))); add(m, CAT_LABEL(cat)); });

  S.setRead = function (keys, read, scope) {
    const msgs = idsFor(keys, scope);
    const undo = snapshot(msgs);
    if (read) msgs.forEach((m) => rem(m, 'UNREAD'));
    else {
      const map = new Map();
      msgs.forEach((m) => { if (!has(m, 'DRAFT') && !has(m, 'SENT')) map.set(S.threadKeyOf(m), m); });
      if (!map.size) msgs.forEach((m) => !has(m, 'DRAFT') && map.set(S.threadKeyOf(m), m));
      map.forEach((m) => add(m, 'UNREAD'));
    }
    changed();
    return undo;
  };

  S.setStar = function (keys, on, scope) {
    const msgs = idsFor(keys, scope);
    const undo = snapshot(idsFor(keys, 'any'));
    if (on) {
      const last = new Map();
      msgs.forEach((m) => { if (!has(m, 'DRAFT')) last.set(S.threadKeyOf(m), m); });
      if (!last.size) msgs.forEach((m) => last.set(S.threadKeyOf(m), m));
      last.forEach((m) => add(m, 'STARRED'));
    } else idsFor(keys, 'any').forEach((m) => rem(m, 'STARRED'));
    changed();
    return undo;
  };

  /* Move = add target, remove the label of the view we came from. */
  S.moveTo = function (keys, target, fromView, scope) {
    const msgs = idsFor(keys, scope);
    const undo = snapshot(msgs);
    msgs.forEach((m) => {
      if (fromView) {
        if (fromView.type === 'label' && fromView.label !== target) rem(m, fromView.label);
        if (['inbox', 'category'].includes(fromView.type) || scope !== 'normal') rem(m, 'INBOX');
      }
      rem(m, 'TRASH'); rem(m, 'SPAM');
      if (target === 'INBOX') { if (!has(m, 'DRAFT')) add(m, 'INBOX'); }
      else if (target === 'TRASH') { add(m, 'TRASH'); rem(m, 'INBOX'); }
      else if (target === 'SPAM') { add(m, 'SPAM'); rem(m, 'INBOX'); }
      else if (target.startsWith('CAT:')) { CATS.forEach((c) => rem(m, CAT_LABEL(c))); add(m, CAT_LABEL(target.slice(4))); if (!has(m, 'SENT') && !has(m, 'DRAFT')) add(m, 'INBOX'); }
      else add(m, target);
    });
    changed();
    return undo;
  };

  S.deleteForever = function (keys, scope) {
    const msgs = idsFor(keys, scope);
    msgs.forEach((m) => delete state.messages[m.id]);
    changed();
    return msgs.length;
  };

  /* Single-message operations (inside a conversation) */
  S.msgOp = function (id, op) {
    const m = state.messages[id];
    if (!m) return () => {};
    const undo = snapshot([m]);
    if (op === 'star') add(m, 'STARRED');
    else if (op === 'unstar') rem(m, 'STARRED');
    else if (op === 'read') rem(m, 'UNREAD');
    else if (op === 'unread') add(m, 'UNREAD');
    else if (op === 'trash') { add(m, 'TRASH'); rem(m, 'INBOX'); }
    else if (op === 'untrash') rem(m, 'TRASH');
    else if (op === 'spam') { add(m, 'SPAM'); rem(m, 'INBOX'); }
    else if (op === 'delete') { delete state.messages[id]; }
    changed();
    return undo;
  };

  S.emptyFolder = function (which) {
    const label = which === 'trash' ? 'TRASH' : 'SPAM';
    let n = 0;
    const keys = new Set();
    for (const id in state.messages) if (has(state.messages[id], label)) { keys.add(S.threadKeyOf(state.messages[id])); delete state.messages[id]; n++; }
    changed();
    return keys.size;
  };

  /* ---------- drafts & sending ---------- */
  S.saveDraft = function (d) {
    let m = d.draftId && state.messages[d.draftId];
    if (!m) {
      const id = U.uid(16);
      m = state.messages[id] = { id, threadId: d.threadId || U.uid(16), labels: ['DRAFT', 'CATEGORY_PERSONAL'], attachments: [], inReplyTo: d.inReplyTo || null };
      if (d.threadId) {
        const sib = Object.values(state.messages).find((x) => x.threadId === d.threadId && x.id !== id);
        if (sib) sib.labels.forEach((l) => { if (l[0] === 'L') add(m, l); });
      }
    }
    Object.assign(m, {
      from: { ...state.me }, to: d.to || [], cc: d.cc || [], bcc: d.bcc || [],
      subject: d.subject || '', html: d.html || '', date: Date.now(), attachments: d.attachments || [],
    });
    changed({ draft: m.id });
    return m.id;
  };

  S.deleteDraft = function (id) {
    if (state.messages[id]) { delete state.messages[id]; changed({ draft: id }); }
  };

  S.send = function (d) {
    if (d.draftId) delete state.messages[d.draftId];
    const id = U.uid(16);
    const toMe = [...(d.to || []), ...(d.cc || []), ...(d.bcc || [])].some((a) => S.isMe(a));
    const labels = ['SENT', 'CATEGORY_PERSONAL'];
    if (toMe) labels.push('INBOX', 'UNREAD');
    const threadId = d.threadId || U.uid(16);
    const sibling = Object.values(state.messages).find((x) => x.threadId === threadId && x.id !== id);
    if (sibling && has(sibling, 'MUTED')) labels.push('MUTED');
    const m = (state.messages[id] = {
      id, threadId, from: { ...state.me }, to: d.to || [], cc: d.cc || [], bcc: d.bcc || [],
      subject: d.subject || '', html: d.html || '', date: Date.now(), labels, attachments: d.attachments || [], inReplyTo: d.inReplyTo || null,
    });
    if (state.settings.autoContacts) [...m.to, ...m.cc, ...m.bcc].forEach((a) => S.ensureContact(a, true));
    changed({ sent: id });
    return m;
  };

  /* ---------- incoming mail ---------- */
  S.pendingIncoming = () => state.incoming.length;

  S.deliver = function (inc) {
    const id = U.uid(16);
    let threadId = inc.threadId && Object.values(state.messages).some((x) => x.threadId === inc.threadId) ? inc.threadId : U.uid(16);
    let subject = inc.subject;
    if (!subject) {
      const first = Object.values(state.messages).filter((x) => x.threadId === threadId).sort((a, b) => a.date - b.date)[0];
      subject = first ? (/^re:/i.test(first.subject) ? first.subject : 'Re: ' + first.subject) : '(no subject)';
    }
    const labels = ['UNREAD', CAT_LABEL(inc.cat || 'personal'), ...(inc.labels || [])];
    if (inc.important) labels.push('IMPORTANT');
    const siblings = Object.values(state.messages).filter((x) => x.threadId === threadId);
    const muted = siblings.some((x) => has(x, 'MUTED'));
    if (muted) labels.push('MUTED'); else labels.push('INBOX');
    const m = (state.messages[id] = {
      id, threadId, from: inc.from, to: inc.to, cc: inc.cc || [], bcc: [], subject, html: inc.html || inc.body,
      date: Date.now(), labels: Array.from(new Set(labels)),
      attachments: (inc.att || inc.attachments || []).map((a) => (Array.isArray(a) ? { id: U.uid(8), name: a[0], size: a[1], mime: a[2], seed: true } : a)),
      inReplyTo: siblings.length ? siblings[siblings.length - 1].id : null,
    });
    if (state.settings.blocked.some((b) => b.toLowerCase() === m.from.email.toLowerCase())) { add(m, 'SPAM'); rem(m, 'INBOX'); }
    applyFilters(m);
    vacationReply(m);
    changed({ incoming: id });
    return m;
  };

  S.deliverNext = function () {
    const inc = state.incoming.shift();
    if (!inc) return null;
    return S.deliver(inc);
  };

  function vacationReply(m) {
    const v = state.settings.vacation;
    if (!v.on || has(m, 'SPAM') || S.isMe(m.from)) return;
    const today = new Date().toISOString().slice(0, 10);
    if (v.start && today < v.start) return;
    if (v.end && today > v.end) return;
    if (v.contactsOnly && !state.contacts.some((c) => c.group === 'my' && c.email.toLowerCase() === m.from.email.toLowerCase())) return;
    state.vacationSent = state.vacationSent || {};
    if (state.vacationSent[m.from.email] && Date.now() - state.vacationSent[m.from.email] < 4 * 864e5) return;
    state.vacationSent[m.from.email] = Date.now();
    const rid = U.uid(16);
    state.messages[rid] = {
      id: rid, threadId: m.threadId, from: { ...state.me }, to: [m.from], cc: [], bcc: [],
      subject: v.subject || ('Re: ' + m.subject.replace(/^re:\s*/i, '')), html: U.textToHtml(v.message || ''), date: Date.now() + 1000,
      labels: ['SENT', 'CATEGORY_PERSONAL'], attachments: [], inReplyTo: m.id,
    };
  }

  /* ---------- filters ---------- */
  S.filterQuery = function (c) {
    const q = [];
    const wrap = (v) => (/\s/.test(v) ? `(${v})` : v);
    if (c.from) q.push('from:' + wrap(c.from));
    if (c.to) q.push('to:' + wrap(c.to));
    if (c.subject) q.push('subject:' + wrap(c.subject));
    if (c.hasWords) q.push(c.hasWords);
    if (c.doesNotHave) q.push('-{' + c.doesNotHave + '}');
    if (c.hasAttachment) q.push('has:attachment');
    if (c.size) q.push((c.sizeOp === 'smaller' ? 'smaller:' : 'larger:') + c.size + (c.sizeUnit || 'M'));
    return q.join(' ');
  };

  function applyActions(m, a) {
    if (a.skipInbox) rem(m, 'INBOX');
    if (a.markRead) rem(m, 'UNREAD');
    if (a.star) add(m, 'STARRED');
    if (a.label && state.labels.some((l) => l.id === a.label)) add(m, a.label);
    if (a.delete) { add(m, 'TRASH'); rem(m, 'INBOX'); }
    if (a.neverSpam) rem(m, 'SPAM');
    if (a.important === 'always') add(m, 'IMPORTANT');
    if (a.important === 'never') rem(m, 'IMPORTANT');
    if (a.category) { CATS.forEach((c) => rem(m, CAT_LABEL(c))); add(m, CAT_LABEL(a.category)); }
  }

  function applyFilters(m) {
    for (const f of state.filters) {
      const q = S.filterQuery(f.criteria);
      if (!q) continue;
      if (PM.search.compile(q).pred(m)) applyActions(m, f.actions);
    }
  }

  S.filters = () => state.filters;
  S.saveFilter = function (f, applyExisting) {
    if (!f.id) { f.id = U.uid(8); state.filters.push(f); }
    else { const i = state.filters.findIndex((x) => x.id === f.id); if (i >= 0) state.filters[i] = f; }
    let n = 0;
    if (applyExisting) {
      const c = PM.search.compile(S.filterQuery(f.criteria));
      const touched = new Set();
      for (const id in state.messages) {
        const m = state.messages[id];
        if (inScope(m, 'normal') && c.pred(m)) { applyActions(m, f.actions); touched.add(m.threadId); }
      }
      n = touched.size;
    }
    changed();
    return n;
  };
  S.deleteFilter = (id) => { state.filters = state.filters.filter((f) => f.id !== id); changed(); };

  /* ---------- labels ---------- */
  S.labels = () => state.labels.slice().sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
  S.label = (id) => state.labels.find((l) => l.id === id);
  S.labelByName = (name) => state.labels.find((l) => l.name.toLowerCase() === String(name).toLowerCase() || l.name.toLowerCase().replace(/[\s/]+/g, '-') === String(name).toLowerCase());
  S.createLabel = function (name, parentId) {
    name = String(name || '').trim().replace(/\s*\/\s*/g, '/');
    if (!name) return null;
    if (parentId) { const p = S.label(parentId); if (p) name = p.name + '/' + name; }
    const ex = S.labelByName(name);
    if (ex) return ex;
    const l = { id: 'L' + U.uid(8), name, color: null, show: 'show' };
    state.labels.push(l);
    changed({ labels: true });
    return l;
  };
  S.updateLabel = function (id, patch) {
    const l = S.label(id);
    if (!l) return;
    if (patch.name != null && patch.name !== l.name) {
      const old = l.name;
      state.labels.forEach((x) => { if (x.name.startsWith(old + '/')) x.name = patch.name + x.name.slice(old.length); });
    }
    Object.assign(l, patch);
    changed({ labels: true });
  };
  S.deleteLabel = function (id) {
    state.labels = state.labels.filter((l) => l.id !== id);
    for (const mid in state.messages) rem(state.messages[mid], id);
    changed({ labels: true });
  };

  /* ---------- contacts ---------- */
  S.contacts = () => state.contacts;
  S.contact = (id) => state.contacts.find((c) => c.id === id);
  S.contactByEmail = (e) => state.contacts.find((c) => c.email.toLowerCase() === String(e || '').toLowerCase());
  S.ensureContact = function (a, bump) {
    if (!a || !a.email || S.isMe(a)) return;
    let c = S.contactByEmail(a.email);
    if (!c) { c = { id: 'c' + U.uid(8), name: a.name || '', email: a.email, phone: '', company: '', notes: '', group: 'other', status: 'offline', starred: false, freq: 0 }; state.contacts.push(c); }
    if (bump) c.freq = (c.freq || 0) + 1;
  };
  S.saveContact = function (c) {
    if (!c.id) { c.id = 'c' + U.uid(8); c.group = c.group || 'my'; c.status = c.status || 'offline'; state.contacts.push(c); }
    else Object.assign(S.contact(c.id), c);
    changed({ contacts: true });
    return c;
  };
  S.deleteContacts = function (ids) {
    state.contacts = state.contacts.filter((c) => !ids.includes(c.id));
    changed({ contacts: true });
  };
  S.suggest = function (q, limit = 8) {
    q = String(q || '').toLowerCase().trim();
    if (!q) return [];
    const words = (s) => String(s || '').toLowerCase().split(/[\s.@_-]+/);
    return state.contacts
      .filter((c) => c.email.toLowerCase().startsWith(q) || words(c.name).some((w) => w.startsWith(q)) || c.name.toLowerCase().startsWith(q) || words(c.email).some((w) => w.startsWith(q)))
      .sort((a, b) => (b.group === 'my') - (a.group === 'my') || (b.freq || 0) - (a.freq || 0) || a.name.localeCompare(b.name))
      .slice(0, limit);
  };

  /* ---------- tasks ---------- */
  S.tasks = () => state.tasks;
  S.addTask = function (t, afterId) {
    const task = { id: U.uid(8), title: '', done: false, notes: '', due: '', ...t };
    const i = afterId ? state.tasks.findIndex((x) => x.id === afterId) : -1;
    if (i >= 0) state.tasks.splice(i + 1, 0, task); else state.tasks.unshift(task);
    changed({ tasks: true });
    return task;
  };
  S.updateTask = (id, patch) => { const t = state.tasks.find((x) => x.id === id); if (t) { Object.assign(t, patch); changed({ tasks: true }); } };
  S.deleteTask = (id) => { state.tasks = state.tasks.filter((x) => x.id !== id); changed({ tasks: true }); };
  S.clearCompleted = () => { state.tasks = state.tasks.filter((x) => !x.done); changed({ tasks: true }); };

  /* ---------- chat ---------- */
  S.chat = (email) => (state.chats[email] = state.chats[email] || []);
  S.addChat = (email, entry) => { S.chat(email).push({ time: Date.now(), ...entry }); changed({ chat: email }); };

  /* ---------- account ---------- */
  S.setMe = (patch) => { Object.assign(state.me, patch); changed({ me: true }); };
  S.storageBytes = function () {
    let b = 0;
    for (const id in state.messages) {
      const m = state.messages[id];
      b += (m.html || '').length + 600;
      (m.attachments || []).forEach((a) => (b += a.size || 0));
    }
    return b;
  };
})(window.PM);
