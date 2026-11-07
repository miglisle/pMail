/* pMail — shared helpers */
window.PM = window.PM || {};
(function (PM) {
  'use strict';
  const U = (PM.util = {});

  const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  U.esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ESC[c]);

  U.uid = (n = 16) => {
    let s = '';
    const a = new Uint8Array(n);
    (window.crypto || window.msCrypto).getRandomValues(a);
    for (let i = 0; i < n; i++) s += (a[i] % 16).toString(16);
    return s;
  };

  U.$ = (sel, root) => (root || document).querySelector(sel);
  U.$$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

  U.h = (html) => {
    const t = document.createElement('template');
    t.innerHTML = html.trim();
    return t.content.firstElementChild;
  };

  U.debounce = (fn, ms) => {
    let t;
    const d = function (...args) {
      clearTimeout(t);
      t = setTimeout(() => fn.apply(this, args), ms);
    };
    d.flush = () => { clearTimeout(t); fn(); };
    d.cancel = () => clearTimeout(t);
    return d;
  };

  U.clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  /* ---------- HTML handling ---------- */
  const parser = new DOMParser();
  U.textOf = (html) => {
    if (!html) return '';
    const doc = parser.parseFromString('<body>' + html, 'text/html');
    doc.querySelectorAll('style,script,.pm-quote,blockquote.pm_quote').forEach((n) => n.remove());
    doc.querySelectorAll('br,p,div,li,tr,h1,h2,h3,h4').forEach((n) => n.append(' '));
    return (doc.body.textContent || '').replace(/\s+/g, ' ').trim();
  };

  const ALLOWED_URL = /^(https?:|mailto:|data:image\/|#|blob:)/i;
  U.sanitize = (html) => {
    const doc = parser.parseFromString('<body>' + (html || ''), 'text/html');
    doc.querySelectorAll('script,iframe,object,embed,link,meta,base,form,input,button,textarea,select').forEach((n) => n.remove());
    doc.body.querySelectorAll('*').forEach((el) => {
      for (const attr of Array.from(el.attributes)) {
        const name = attr.name.toLowerCase();
        if (name.startsWith('on')) el.removeAttribute(attr.name);
        else if ((name === 'href' || name === 'src' || name === 'xlink:href' || name === 'action') && !ALLOWED_URL.test(attr.value.trim())) el.removeAttribute(attr.name);
      }
      if (el.tagName === 'A') { el.setAttribute('target', '_blank'); el.setAttribute('rel', 'noopener noreferrer'); }
    });
    return doc.body.innerHTML;
  };

  U.textToHtml = (txt) => U.esc(txt).replace(/\r?\n/g, '<br>');

  /* ---------- Addresses ---------- */
  U.EMAIL_RE = /^[^\s@<>()",;:]+@[^\s@<>()",;:]+\.[^\s@<>()",;:]{2,}$/i;
  U.isValidEmail = (e) => U.EMAIL_RE.test(String(e || '').trim());

  U.parseAddresses = (str) => {
    const out = [];
    if (!str) return out;
    const parts = [];
    let cur = '', q = false, ang = false;
    for (const ch of String(str)) {
      if (ch === '"') q = !q;
      if (ch === '<') ang = true;
      if (ch === '>') ang = false;
      if ((ch === ',' || ch === ';') && !q && !ang) { parts.push(cur); cur = ''; } else cur += ch;
    }
    parts.push(cur);
    for (let p of parts) {
      p = p.trim();
      if (!p) continue;
      const m = p.match(/^"?([^"<]*?)"?\s*<([^>]+)>$/);
      if (m) out.push({ name: m[1].trim(), email: m[2].trim() });
      else out.push({ name: '', email: p.replace(/^<|>$/g, '') });
    }
    return out;
  };

  U.fmtAddr = (a) => (a.name ? `${a.name} <${a.email}>` : a.email);
  U.firstName = (n) => String(n || '').trim().split(/\s+/)[0] || '';

  /* ---------- Dates ---------- */
  const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const DAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  U.MON = MON;
  const sameDay = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

  U.time = (d, upper) => {
    let h = d.getHours();
    const m = d.getMinutes();
    const ap = h >= 12 ? 'pm' : 'am';
    h = h % 12 || 12;
    return `${h}:${String(m).padStart(2, '0')} ${upper ? ap.toUpperCase() : ap}`;
  };

  /* Thread-list date column: "3:45 pm" | "Nov 5" | "11/5/24" */
  U.listDate = (ts) => {
    const d = new Date(ts), n = new Date();
    if (sameDay(d, n)) return U.time(d);
    if (d.getFullYear() === n.getFullYear()) return `${MON[d.getMonth()]} ${d.getDate()}`;
    return `${d.getMonth() + 1}/${d.getDate()}/${String(d.getFullYear()).slice(-2)}`;
  };

  /* "Wed, Nov 5, 2026 at 3:45 PM" */
  U.fullDate = (ts) => {
    const d = new Date(ts);
    return `${DAY[d.getDay()]}, ${MON[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()} at ${U.time(d, true)}`;
  };

  U.ago = (ts) => {
    const s = Math.max(0, (Date.now() - ts) / 1000);
    if (s < 60) return '0 minutes ago';
    const m = Math.floor(s / 60);
    if (m < 60) return `${m} minute${m === 1 ? '' : 's'} ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h} hour${h === 1 ? '' : 's'} ago`;
    const dd = Math.floor(h / 24);
    if (dd < 30) return `${dd} day${dd === 1 ? '' : 's'} ago`;
    const mo = Math.floor(dd / 30);
    if (mo < 12) return `${mo} month${mo === 1 ? '' : 's'} ago`;
    const y = Math.floor(dd / 365);
    return `${y} year${y === 1 ? '' : 's'} ago`;
  };

  /* Message-header date: "3:45 PM (2 hours ago)" | "Nov 5 (2 days ago)" | "11/5/24" */
  U.msgDate = (ts) => {
    const d = new Date(ts), n = new Date();
    if (sameDay(d, n)) return `${U.time(d, true)} (${U.ago(ts)})`;
    const days = (n - d) / 864e5;
    if (days < 31) return `${MON[d.getMonth()]} ${d.getDate()} (${U.ago(ts)})`;
    if (d.getFullYear() === n.getFullYear()) return `${MON[d.getMonth()]} ${d.getDate()}`;
    return `${d.getMonth() + 1}/${d.getDate()}/${String(d.getFullYear()).slice(-2)}`;
  };

  /* "On Wed, Nov 5, 2026 at 3:45 PM, Liam Nguyen <liam@x.com> wrote:" */
  U.quoteHeader = (msg) => `On ${U.fullDate(msg.date)}, ${U.esc(msg.from.name || msg.from.email)} &lt;<a href="mailto:${U.esc(msg.from.email)}">${U.esc(msg.from.email)}</a>&gt; wrote:`;

  U.fileSize = (b) => {
    if (b < 1024) return `${b} B`;
    if (b < 1024 * 1024) return `${Math.round(b / 1024)} KB`;
    return `${(b / 1024 / 1024).toFixed(1)} MB`;
  };

  U.plural = (n, w, pl) => `${n} ${n === 1 ? w : pl || w + 's'}`;
  U.num = (n) => Number(n).toLocaleString('en-US');

  /* ---------- Storage ---------- */
  U.storage = {
    get(k, def) {
      try { const v = localStorage.getItem(k); return v == null ? def : JSON.parse(v); } catch (e) { return def; }
    },
    set(k, v) {
      try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { console.warn('pMail: storage failed', e); return false; }
    },
    del(k) { try { localStorage.removeItem(k); } catch (e) { /* ignore */ } },
  };

  /* ---------- Event bus ---------- */
  const handlers = {};
  PM.bus = {
    on(ev, fn) { (handlers[ev] = handlers[ev] || []).push(fn); },
    off(ev, fn) { handlers[ev] = (handlers[ev] || []).filter((f) => f !== fn); },
    emit(ev, data) { (handlers[ev] || []).slice().forEach((f) => f(data)); },
  };

  /* Color for letter avatars / fallback photos */
  const AV = ['#e06055', '#f6bf26', '#57bb8a', '#5e97f6', '#a1887f', '#9575cd', '#4db6ac', '#ff8a65', '#7986cb', '#90a4ae', '#f06292', '#aed581'];
  U.avatarColor = (s) => {
    let h = 0;
    for (const c of String(s || '')) h = (h * 31 + c.charCodeAt(0)) >>> 0;
    return AV[h % AV.length];
  };

  U.download = (name, href) => {
    const a = document.createElement('a');
    a.href = href; a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
  };

  U.isTyping = (el) => {
    el = el || document.activeElement;
    if (!el) return false;
    const t = el.tagName;
    return t === 'INPUT' || t === 'TEXTAREA' || t === 'SELECT' || el.isContentEditable;
  };
})(window.PM);
