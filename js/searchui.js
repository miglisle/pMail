/* pMail — header search box: suggestions, search options panel and filter creation */
(function (PM) {
  'use strict';
  const U = PM.util, UI = PM.ui, S = PM.store;
  const SU = (PM.searchUI = {});
  let panel = null, sug = null, sugItems = [], sugIndex = -1;

  SU.init = function () {
    const form = U.$('#search-form'), q = U.$('#q');
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      if (sugIndex >= 0 && sugItems[sugIndex]) return pick(sugItems[sugIndex]);
      run(q.value);
    });
    U.$('#search-opts').addEventListener('click', (e) => {
      e.preventDefault();
      if (panel) return SU.closeAdvanced();
      SU.openAdvanced(parseToForm(q.value));
    });
    q.addEventListener('input', () => suggest(q.value));
    q.addEventListener('focus', () => U.$('#search-form').classList.add('focus'));
    q.addEventListener('blur', () => { U.$('#search-form').classList.remove('focus'); setTimeout(closeSuggest, 150); });
    q.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { closeSuggest(); q.blur(); }
      else if (e.key === 'ArrowDown' && sugItems.length) { e.preventDefault(); move(1); }
      else if (e.key === 'ArrowUp' && sugItems.length) { e.preventDefault(); move(-1); }
    });
    document.addEventListener('mousedown', (e) => {
      if (panel && !panel.contains(e.target) && !e.target.closest('#search-opts') && !e.target.closest('.pm-popup')) SU.closeAdvanced();
    });
  };

  function run(query) {
    query = String(query || '').trim();
    closeSuggest();
    SU.closeAdvanced();
    U.$('#q').blur();
    if (!query) { PM.app.go('#inbox'); return; }
    U.$('#q').value = query;
    PM.app.go('#search/' + PM.app.enc(query));
  }
  SU.run = run;

  /* ---------- suggestions ---------- */
  function suggest(text) {
    const t = text.trim();
    sugIndex = -1;
    if (!t || /:\S*$/.test(t) && t.split(/\s+/).length > 1) { closeSuggest(); return; }
    const contacts = /:/.test(t) ? [] : S.suggest(t, 4);
    let threads = [];
    if (t.length >= 2) threads = S.threadsFor({ type: 'search', query: t }).slice(0, 5);
    sugItems = [
      ...contacts.map((c) => ({ type: 'contact', c })),
      ...threads.map((th) => ({ type: 'thread', th })),
    ];
    if (!sugItems.length) { closeSuggest(); return; }
    if (!sug) { sug = U.h('<div id="search-sug" role="listbox"></div>'); U.$('#search-form').appendChild(sug); }
    const hi = (s) => U.esc(s).replace(new RegExp('(' + t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'ig'), '<b>$1</b>');
    sug.innerHTML = sugItems.map((it, i) => {
      if (it.type === 'contact') return `<div class="sg sg-c" data-i="${i}">${PM.icon('person', 18, 'sg-ic')}<span class="sg-n">${hi(it.c.name || it.c.email)}</span> <span class="sg-e">${hi(it.c.email)}</span></div>`;
      return `<div class="sg sg-t" data-i="${i}">${PM.icon('mail', 18, 'sg-ic')}<span class="sg-n">${hi(it.th.subject || '(no subject)')}</span> <span class="sg-e">${U.esc(it.th.msgs[it.th.msgs.length - 1].from.name || '')} · ${U.listDate(it.th.date)}</span></div>`;
    }).join('') + `<div class="sg sg-all" data-i="-1">${PM.icon('search', 18, 'sg-ic')}Search for "<b>${U.esc(t)}</b>"</div>`;
    sug.hidden = false;
    sug.onmousedown = (e) => {
      e.preventDefault();
      const it = e.target.closest('.sg');
      if (!it) return;
      const i = +it.dataset.i;
      if (i < 0) run(U.$('#q').value); else pick(sugItems[i]);
    };
  }
  function move(d) {
    sugIndex = U.clamp(sugIndex + d, -1, sugItems.length - 1);
    U.$$('.sg', sug).forEach((x, i) => x.classList.toggle('hl', i === sugIndex));
  }
  function pick(it) {
    closeSuggest();
    if (it.type === 'contact') run(it.c.email);
    else { U.$('#q').blur(); PM.app.go('#search/' + PM.app.enc(U.$('#q').value.trim()) + '/' + it.th.id); }
  }
  function closeSuggest() { if (sug) sug.hidden = true; sugItems = []; sugIndex = -1; }

  /* ---------- advanced search ---------- */
  function parseToForm(q) {
    const f = {};
    const take = (op) => {
      const re = new RegExp('(?:^|\\s)' + op + ':(?:\\(([^)]*)\\)|"([^"]*)"|(\\S+))', 'i');
      const m = q.match(re);
      if (m) { q = q.replace(m[0], ' '); return m[1] || m[2] || m[3]; }
      return '';
    };
    f.from = take('from'); f.to = take('to'); f.subject = take('subject');
    if (/\bhas:attachment\b/i.test(q)) { f.hasAttachment = true; q = q.replace(/\bhas:attachment\b/i, ''); }
    const dn = q.match(/-\{([^}]*)\}/);
    if (dn) { f.doesNotHave = dn[1]; q = q.replace(dn[0], ''); }
    f.hasWords = q.replace(/\s+/g, ' ').trim();
    return f;
  }

  SU.closeAdvanced = function () { if (panel) { panel.remove(); panel = null; } };
  SU.isOpen = () => !!panel;

  SU.openAdvanced = function (f = {}, filterStep = false, editing = null) {
    SU.closeAdvanced();
    closeSuggest();
    const labelOpts = S.labels().map((l) => `<option value="${l.id}">${U.esc(l.name)}</option>`).join('');
    panel = U.h(`<div id="adv" role="dialog" aria-label="Search options">
      <div class="adv-search">
        <div class="adv-row"><label>From</label><input class="ji" data-k="from"></div>
        <div class="adv-row"><label>To</label><input class="ji" data-k="to"></div>
        <div class="adv-row"><label>Subject</label><input class="ji" data-k="subject"></div>
        <div class="adv-row"><label>Has the words</label><input class="ji" data-k="hasWords"></div>
        <div class="adv-row"><label>Doesn't have</label><input class="ji" data-k="doesNotHave"></div>
        <div class="adv-row adv-size"><label>Size</label><select class="js" data-k="sizeOp"><option value="larger">greater than</option><option value="smaller">less than</option></select><input class="ji" data-k="size" type="number" min="0"><select class="js" data-k="sizeUnit"><option value="M">MB</option><option value="K">KB</option><option value="">Bytes</option></select></div>
        <div class="adv-row adv-date"><label>Date within</label><select class="js" data-k="within"><option value="">—</option><option value="1d">1 day</option><option value="3d">3 days</option><option value="1w">1 week</option><option value="2w">2 weeks</option><option value="1m">1 month</option><option value="2m">2 months</option><option value="6m">6 months</option><option value="1y">1 year</option></select><span class="adv-of">of</span><input class="ji" data-k="date" type="date"></div>
        <div class="adv-row"><label>Search</label><select class="js" data-k="where"><option value="all">All Mail</option><option value="inbox">Inbox</option><option value="starred">Starred</option><option value="sent">Sent Mail</option><option value="drafts">Drafts</option><option value="spam">Spam</option><option value="trash">Trash</option><option value="anywhere">Mail &amp; Spam &amp; Trash</option>${S.labels().map((l) => `<option value="${l.id}">${U.esc(l.name)}</option>`).join('')}</select></div>
        <div class="adv-row adv-chk"><label></label><span><label class="cbl"><input type="checkbox" data-k="hasAttachment"> Has attachment</label><label class="cbl"><input type="checkbox" data-k="noChats" checked> Don't include chats</label></span></div>
        <div class="adv-foot"><a href="#" class="adv-mkfilter">Create filter with this search »</a><button class="jb jb-blue adv-go" aria-label="Search">${PM.icon('search', 18)}</button></div>
      </div>
      <div class="adv-filter" hidden>
        <a href="#" class="adv-back">« back to search options</a>
        <div class="adv-fh">When a message arrives that matches this search:</div>
        <label class="cbl"><input type="checkbox" data-a="skipInbox"> Skip the Inbox (Archive it)</label>
        <label class="cbl"><input type="checkbox" data-a="markRead"> Mark as read</label>
        <label class="cbl"><input type="checkbox" data-a="star"> Star it</label>
        <label class="cbl"><input type="checkbox" data-a="applyLabel"> Apply the label:</label> <select class="js" data-a="label"><option value="">Choose label...</option>${labelOpts}<option value="__new">New label...</option></select><br>
        <label class="cbl dis"><input type="checkbox" disabled> Forward it <a href="#settings/fwdandpop">add forwarding address</a></label>
        <label class="cbl"><input type="checkbox" data-a="delete"> Delete it</label>
        <label class="cbl"><input type="checkbox" data-a="neverSpam"> Never send it to Spam</label>
        <label class="cbl"><input type="checkbox" data-a="alwaysImp"> Always mark it as important</label>
        <label class="cbl"><input type="checkbox" data-a="neverImp"> Never mark it as important</label>
        <label class="cbl"><input type="checkbox" data-a="categorize"> Categorize as:</label> <select class="js" data-a="category"><option value="">Choose category...</option><option value="personal">Primary</option><option value="social">Social</option><option value="updates">Updates</option><option value="forums">Forums</option><option value="promotions">Promotions</option></select>
        <div class="adv-ffoot"><button class="jb jb-blue adv-create">${editing ? 'Update filter' : 'Create filter'}</button><label class="cbl"><input type="checkbox" data-a="applyExisting"> Also apply filter to <b class="adv-n">0</b> matching conversations.</label></div>
        <div class="adv-note"><b>Note:</b> filter will not be applied to old conversations in Spam or Trash</div>
      </div></div>`);
    U.$('#search-form').appendChild(panel);
    const set = (k, v) => { const el = U.$(`[data-k="${k}"]`, panel); if (!el || v == null) return; if (el.type === 'checkbox') el.checked = !!v; else el.value = v; };
    Object.keys(f).forEach((k) => set(k, f[k]));
    const get = () => {
      const o = {};
      U.$$('[data-k]', panel).forEach((el) => (o[el.dataset.k] = el.type === 'checkbox' ? el.checked : el.value.trim()));
      return o;
    };
    const criteria = () => { const o = get(); return { from: o.from, to: o.to, subject: o.subject, hasWords: o.hasWords, doesNotHave: o.doesNotHave, hasAttachment: o.hasAttachment, size: o.size, sizeOp: o.sizeOp, sizeUnit: o.sizeUnit }; };
    const showFilter = () => {
      const c = criteria();
      if (!S.filterQuery(c)) { UI.alert('You must specify at least one criteria for your filter.'); return; }
      U.$('.adv-search', panel).hidden = true;
      U.$('.adv-filter', panel).hidden = false;
      U.$('.adv-n', panel).textContent = U.num(S.threadsFor({ type: 'search', query: S.filterQuery(c) }).length);
    };
    U.$('.adv-go', panel).addEventListener('click', (e) => { e.preventDefault(); const q = PM.search.fromForm(get()); if (!q) return; run(q); });
    panel.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { e.stopPropagation(); SU.closeAdvanced(); }
      if (e.key === 'Enter' && e.target.matches('.adv-search input')) { e.preventDefault(); U.$('.adv-go', panel).click(); }
    });
    U.$('.adv-mkfilter', panel).addEventListener('click', (e) => { e.preventDefault(); showFilter(); });
    U.$('.adv-back', panel).addEventListener('click', (e) => { e.preventDefault(); U.$('.adv-search', panel).hidden = false; U.$('.adv-filter', panel).hidden = true; });
    const lsel = U.$('[data-a="label"]', panel);
    lsel.addEventListener('change', () => {
      if (lsel.value === '__new') {
        lsel.value = '';
        PM.app.newLabelDialog(null, (l) => { lsel.insertAdjacentHTML('afterbegin', ''); const o = document.createElement('option'); o.value = l.id; o.textContent = l.name; lsel.insertBefore(o, lsel.lastElementChild); lsel.value = l.id; U.$('[data-a="applyLabel"]', panel).checked = true; });
      } else if (lsel.value) U.$('[data-a="applyLabel"]', panel).checked = true;
    });
    U.$('[data-a="category"]', panel).addEventListener('change', (e) => { if (e.target.value) U.$('[data-a="categorize"]', panel).checked = true; });
    U.$('.adv-create', panel).addEventListener('click', (e) => {
      e.preventDefault();
      const a = (k) => U.$(`[data-a="${k}"]`, panel);
      const actions = {
        skipInbox: a('skipInbox').checked, markRead: a('markRead').checked, star: a('star').checked,
        label: a('applyLabel').checked ? a('label').value : '', delete: a('delete').checked, neverSpam: a('neverSpam').checked,
        important: a('alwaysImp').checked ? 'always' : a('neverImp').checked ? 'never' : '',
        category: a('categorize').checked ? a('category').value : '',
      };
      if (!Object.values(actions).some(Boolean)) { UI.alert('Please select an action for your filter.'); return; }
      const fobj = { id: editing ? editing.id : null, criteria: criteria(), actions };
      const n = S.saveFilter(fobj, a('applyExisting').checked);
      SU.closeAdvanced();
      UI.notify((editing ? 'Your filter was updated.' : 'Your filter was created.') + (n ? ` It was applied to ${U.plural(n, 'conversation')}.` : ''), { links: [{ label: 'Learn more', action: () => PM.app.go('#settings/filters') }] });
    });
    if (editing) {
      const ac = editing.actions;
      const setA = (k, v) => { const el = U.$(`[data-a="${k}"]`, panel); if (el.type === 'checkbox') el.checked = !!v; else el.value = v || ''; };
      setA('skipInbox', ac.skipInbox); setA('markRead', ac.markRead); setA('star', ac.star); setA('applyLabel', !!ac.label); setA('label', ac.label);
      setA('delete', ac.delete); setA('neverSpam', ac.neverSpam); setA('alwaysImp', ac.important === 'always'); setA('neverImp', ac.important === 'never');
      setA('categorize', !!ac.category); setA('category', ac.category);
    }
    if (filterStep) showFilter();
    else setTimeout(() => U.$('[data-k="from"]', panel).focus(), 0);
  };
})(window.PM);
