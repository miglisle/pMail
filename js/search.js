/* pMail — search query language (from:, to:, subject:, is:, has:, in:, label:, before:, after:, OR, -, "", (), {}) */
(function (PM) {
  'use strict';
  const U = PM.util;
  const SR = (PM.search = {});

  const textCache = new Map();
  function textIndex(m) {
    const k = m.id + ':' + (m.html ? m.html.length : 0) + ':' + (m.subject || '').length;
    let t = textCache.get(k);
    if (t == null) {
      const addrs = [m.from, ...(m.to || []), ...(m.cc || [])].map((a) => (a ? `${a.name} ${a.email}` : '')).join(' ');
      t = (' ' + [m.subject, U.textOf(m.html), addrs, (m.attachments || []).map((a) => a.name).join(' ')].join(' ') + ' ').toLowerCase();
      textCache.set(k, t);
    }
    return t;
  }
  SR.textIndex = textIndex;

  const escRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  function wordMatch(hay, needle) {
    needle = needle.toLowerCase().trim();
    if (!needle) return true;
    if (/^[\w]/.test(needle)) return new RegExp('(^|[^a-z0-9])' + escRe(needle), 'i').test(hay);
    return hay.indexOf(needle) !== -1;
  }

  const addrStr = (a) => (a ? `${a.name || ''} <${a.email}>`.toLowerCase() : '');
  function addrMatch(list, v) {
    v = v.toLowerCase();
    if (v === 'me') v = PM.store.me().email.toLowerCase();
    return list.some((a) => a && (addrStr(a).indexOf(v) !== -1 || wordMatch(addrStr(a), v)));
  }

  function parseDate(v) {
    const m = v.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/) || null;
    if (m) return new Date(+m[1], +m[2] - 1, +m[3]).getTime();
    const m2 = v.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
    if (m2) return new Date(+m2[3] < 100 ? 2000 + +m2[3] : +m2[3], +m2[1] - 1, +m2[2]).getTime();
    const t = Date.parse(v);
    return isNaN(t) ? null : t;
  }
  function parseAge(v) {
    const m = String(v).match(/^(\d+)([dmy])$/i);
    if (!m) return null;
    const n = +m[1];
    return n * { d: 864e5, m: 30 * 864e5, y: 365 * 864e5 }[m[2].toLowerCase()];
  }
  function parseSize(v) {
    const m = String(v).match(/^(\d+(?:\.\d+)?)([kmg]?)b?$/i);
    if (!m) return null;
    return +m[1] * { '': 1, k: 1024, m: 1048576, g: 1073741824 }[m[2].toLowerCase()];
  }
  const msgSize = (m) => (m.html || '').length + (m.attachments || []).reduce((a, b) => a + (b.size || 0), 0);

  const SYS_LABEL = { inbox: 'INBOX', starred: 'STARRED', important: 'IMPORTANT', sent: 'SENT', drafts: 'DRAFT', draft: 'DRAFT', spam: 'SPAM', trash: 'TRASH', unread: 'UNREAD', muted: 'MUTED' };
  const CAT_ALIAS = { primary: 'personal', personal: 'personal', social: 'social', promotions: 'promotions', updates: 'updates', forums: 'forums' };

  function term(op, val, quoted) {
    const S = PM.store;
    const has = (m, l) => m.labels.indexOf(l) !== -1;
    const v = val.trim();
    const lv = v.toLowerCase();
    const multi = (fn) => {
      if (quoted) return (m) => fn(m, v);
      const words = v.split(/\s+/).filter(Boolean);
      return (m) => words.every((w) => fn(m, w));
    };
    switch (op) {
      case 'from': return multi((m, w) => addrMatch([m.from], w));
      case 'to': return multi((m, w) => addrMatch([...(m.to || []), ...(m.cc || []), ...(m.bcc || [])], w));
      case 'cc': return multi((m, w) => addrMatch(m.cc || [], w));
      case 'bcc': return multi((m, w) => addrMatch(m.bcc || [], w));
      case 'deliveredto': return multi((m, w) => addrMatch(m.to || [], w));
      case 'list': return multi((m, w) => addrMatch([m.from], w));
      case 'subject': return multi((m, w) => wordMatch(' ' + (m.subject || '').toLowerCase(), w));
      case 'label': {
        if (SYS_LABEL[lv]) return (m) => has(m, SYS_LABEL[lv]);
        const l = S.labelByName(v) || S.labels().find((x) => x.name.toLowerCase().replace(/[\s/]+/g, '-') === lv.replace(/[\s/]+/g, '-'));
        return l ? (m) => has(m, l.id) : () => false;
      }
      case 'in':
        if (lv === 'anywhere' || lv === 'trash' || lv === 'spam') return lv === 'anywhere' ? () => true : (m) => has(m, lv.toUpperCase());
        if (lv === 'chats' || lv === 'chat') return () => false;
        if (SYS_LABEL[lv]) return (m) => has(m, SYS_LABEL[lv]);
        return term('label', v);
      case 'is':
        if (lv === 'read') return (m) => !has(m, 'UNREAD');
        if (lv === 'unread') return (m) => has(m, 'UNREAD');
        if (lv === 'starred') return (m) => has(m, 'STARRED');
        if (lv === 'important') return (m) => has(m, 'IMPORTANT');
        if (lv === 'muted') return (m) => has(m, 'MUTED');
        if (lv === 'chat') return () => false;
        return () => false;
      case 'has':
        if (lv === 'attachment' || lv === 'attachments') return (m) => (m.attachments || []).length > 0;
        if (lv === 'star' || lv === 'yellow-star') return (m) => has(m, 'STARRED');
        if (lv === 'userlabels') return (m) => m.labels.some((l) => l[0] === 'L');
        if (lv === 'nouserlabels') return (m) => !m.labels.some((l) => l[0] === 'L');
        return () => false;
      case 'filename': return (m) => (m.attachments || []).some((a) => a.name.toLowerCase().indexOf(lv) !== -1 || a.name.toLowerCase().endsWith('.' + lv));
      case 'category': { const c = CAT_ALIAS[lv]; return c ? (m) => S.catOf(m) === c : () => false; }
      case 'after': case 'newer': { const t = parseDate(v); return t == null ? () => true : (m) => m.date >= t; }
      case 'before': case 'older': { const t = parseDate(v); return t == null ? () => true : (m) => m.date < t; }
      case 'older_than': { const a = parseAge(v); return a == null ? () => true : (m) => m.date < Date.now() - a; }
      case 'newer_than': { const a = parseAge(v); return a == null ? () => true : (m) => m.date >= Date.now() - a; }
      case 'larger': case 'size': { const n = parseSize(v); return n == null ? () => true : (m) => msgSize(m) > n; }
      case 'smaller': { const n = parseSize(v); return n == null ? () => true : (m) => msgSize(m) < n; }
      case '':
        if (quoted) return (m) => textIndex(m).indexOf(lv) !== -1;
        return (m) => wordMatch(textIndex(m), lv);
      default:
        return (m) => wordMatch(textIndex(m), op + ':' + lv) || textIndex(m).indexOf(op + ':' + lv) !== -1;
    }
  }

  const KNOWN = new Set(['from', 'to', 'cc', 'bcc', 'subject', 'label', 'in', 'is', 'has', 'filename', 'category', 'after', 'before', 'older', 'newer', 'older_than', 'newer_than', 'larger', 'smaller', 'size', 'deliveredto', 'list']);

  /* Tokenize into clauses: each clause is an OR-group of {neg, fn}. */
  function parse(q) {
    const re = /\s*(-?)(?:([a-zA-Z_]+):)?(?:"([^"]*)"?|\(([^)]*)\)?|\{([^}]*)\}?|([^\s"(){}]+))/y;
    const clauses = [];
    let scope = 'normal';
    let orNext = false;
    let m;
    q = String(q || '');
    re.lastIndex = 0;
    while (re.lastIndex < q.length && (m = re.exec(q))) {
      if (!m[0].trim()) break;
      const neg = m[1] === '-';
      let op = (m[2] || '').toLowerCase();
      if (op && !KNOWN.has(op)) { m[6] = (m[6] != null ? op + ':' + m[6] : m[6]); op = ''; }
      const quoted = m[3] != null;
      const paren = m[4];
      const brace = m[5];
      const bare = m[6];
      if (!op && !neg && bare === 'OR') { orNext = true; continue; }
      if (op === 'in') {
        const v = (bare || m[3] || '').toLowerCase();
        if (v === 'trash') scope = 'trash';
        else if (v === 'spam') scope = 'spam';
        else if (v === 'anywhere') scope = 'any';
      }
      if (op === 'is' && /^(trash|spam)$/i.test(bare || '')) scope = bare.toLowerCase();
      let alt;
      if (brace != null) {
        const parts = brace.split(/\s+/).filter(Boolean);
        alt = parts.map((w) => ({ neg: false, fn: term(op, w.replace(/^"|"$/g, ''), false) }));
        if (neg) { const fns = alt.map((a) => a.fn); alt = [{ neg: true, fn: (msg) => fns.some((f) => f(msg)) }]; }
      } else if (paren != null) {
        const inner = paren.trim();
        if (!op) { const sub = parse(inner); alt = [{ neg, fn: sub.pred }]; }
        else if (/\bOR\b/.test(inner)) { const fns = inner.split(/\s+OR\s+/).map((w) => term(op, w, false)); alt = [{ neg, fn: (msg) => fns.some((f) => f(msg)) }]; }
        else alt = [{ neg, fn: term(op, inner, false) }];
      } else {
        const val = quoted ? m[3] : bare || '';
        if (!val && !op) continue;
        alt = [{ neg, fn: term(op, val, quoted) }];
      }
      if (orNext && clauses.length) clauses[clauses.length - 1].push(...alt);
      else clauses.push(alt);
      orNext = false;
    }
    const pred = (msg) => clauses.every((alts) => alts.some((a) => (a.neg ? !a.fn(msg) : a.fn(msg))));
    return { pred, scope, empty: !clauses.length };
  }

  const cache = new Map();
  SR.compile = function (q) {
    const key = String(q || '').trim();
    let c = cache.get(key);
    if (!c) {
      c = parse(key);
      if (cache.size > 200) cache.clear();
      cache.set(key, c);
    }
    return c;
  };
  PM.bus.on('change', (w) => { if (w && w.labels) cache.clear(); });

  /* Build query from the advanced search form */
  SR.fromForm = function (f) {
    const q = [];
    const wrap = (v) => (/\s/.test(v.trim()) ? `(${v.trim()})` : v.trim());
    if (f.from) q.push('from:' + wrap(f.from));
    if (f.to) q.push('to:' + wrap(f.to));
    if (f.subject) q.push('subject:' + wrap(f.subject));
    if (f.hasWords) q.push(f.hasWords.trim());
    if (f.doesNotHave) q.push('-{' + f.doesNotHave.trim() + '}');
    if (f.size) q.push((f.sizeOp === 'smaller' ? 'smaller:' : 'larger:') + f.size + (f.sizeUnit || 'M'));
    if (f.within && f.date) {
      const d = new Date(f.date);
      if (!isNaN(d)) {
        const days = { '1d': 1, '3d': 3, '1w': 7, '2w': 14, '1m': 30, '2m': 60, '6m': 180, '1y': 365 }[f.within] || 1;
        const a = new Date(d.getTime() - days * 864e5), b = new Date(d.getTime() + days * 864e5);
        const fmt = (x) => `${x.getFullYear()}/${x.getMonth() + 1}/${x.getDate()}`;
        q.push(`after:${fmt(a)} before:${fmt(b)}`);
      }
    }
    if (f.hasAttachment) q.push('has:attachment');
    if (f.where && f.where !== 'all') q.push(f.where.startsWith('L') ? 'label:' + PM.store.label(f.where).name.replace(/\s+/g, '-') : 'in:' + f.where);
    return q.join(' ');
  };
})(window.PM);
