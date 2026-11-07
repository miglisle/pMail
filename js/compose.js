/* pMail — compose: docked windows, full-screen, inline replies, recipients, formatting, drafts, undo send */
(function (PM) {
  'use strict';
  const U = PM.util, UI = PM.ui, S = PM.store;
  const C = (PM.compose = { list: [] });

  const EMOJI = '😀 😃 😄 😁 😆 😅 😂 🙂 😉 😊 😇 😍 😘 😋 😎 🤓 🤔 😐 😏 😴 😮 😢 😭 😡 👍 👎 👏 🙌 🙏 💪 👋 ✌️ 🤞 ❤️ 💔 ⭐ 🔥 🎉 🎂 🎁 ☕ 🍕 🍰 🌟 ☀️ 🌧️ ❄️ 🌈 🌻 🏔️ 🚗 ✈️ 🏠 💼 📎 📅 ✅ ❌ ⚠️ 💡 📌'.split(' ');
  const FONTS = [['Sans Serif', 'arial,helvetica,sans-serif'], ['Serif', 'times new roman,serif'], ['Fixed Width', 'monospace,monospace'], ['Wide', 'arial black,sans-serif'], ['Narrow', 'arial narrow,sans-serif'], ['Comic Sans MS', 'comic sans ms,sans-serif'], ['Garamond', 'garamond,serif'], ['Georgia', 'georgia,serif'], ['Tahoma', 'tahoma,sans-serif'], ['Trebuchet MS', 'trebuchet ms,sans-serif'], ['Verdana', 'verdana,sans-serif']];
  const SIZES = [['Small', '1'], ['Normal', ''], ['Large', '4'], ['Huge', '6']];
  const PALETTE = ['#000000', '#444444', '#666666', '#999999', '#cccccc', '#eeeeee', '#f3f3f3', '#ffffff', '#ff0000', '#ff9900', '#ffff00', '#00ff00', '#00ffff', '#0000ff', '#9900ff', '#ff00ff',
    '#f4cccc', '#fce5cd', '#fff2cc', '#d9ead3', '#d0e0e3', '#cfe2f3', '#d9d2e9', '#ead1dc', '#ea9999', '#f9cb9c', '#ffe599', '#b6d7a8', '#a2c4c9', '#9fc5e8', '#b4a7d6', '#d5a6bd',
    '#e06666', '#f6b26b', '#ffd966', '#93c47d', '#76a5af', '#6fa8dc', '#8e7cc3', '#c27ba0', '#cc0000', '#e69138', '#f1c232', '#6aa84f', '#45818e', '#3d85c6', '#674ea7', '#a64d79',
    '#990000', '#b45f06', '#bf9000', '#38761d', '#134f5c', '#0b5394', '#351c75', '#741b47', '#660000', '#783f04', '#7f6000', '#274e13', '#0c343d', '#073763', '#20124d', '#4c1130'];

  const splitQuote = (html) => {
    const doc = new DOMParser().parseFromString('<body>' + (html || ''), 'text/html');
    const q = doc.querySelector('.pm_quote');
    if (!q) return [html || '', ''];
    const quote = q.outerHTML;
    q.remove();
    return [doc.body.innerHTML, quote];
  };

  const sizeStyle = () => ({ small: '11px', normal: '13px', large: '16px', huge: '24px' }[S.settings().fontSize] || '13px');

  class Compose {
    constructor(o) {
      this.id = U.uid(8);
      this.inline = !!o.inline;
      this.kind = o.kind || 'new';
      this.draftId = o.draftId || null;
      this.threadId = o.threadId || null;
      this.threadKey = o.threadKey || o.threadId || null;
      this.inReplyTo = o.inReplyTo || null;
      this.to = (o.to || []).slice();
      this.cc = (o.cc || []).slice();
      this.bcc = (o.bcc || []).slice();
      this.subject = o.subject || '';
      this.quote = o.quote || '';
      this.attachments = (o.attachments || []).slice();
      this.plain = false;
      this.state = o.max || (!this.inline && S.settings().composeFullscreen) ? 'max' : 'normal';
      this.editSubject = !!o.editSubject;
      this.build(o.html || '');
      this.lastSaved = this.signature();
      this.save = U.debounce(() => this.saveDraft(), 1500);
    }

    /* ---------- DOM ---------- */
    build(html) {
      const me = S.me();
      const tool = (c, icon, tip, extra = '') => `<button class="cw-tool ${extra}" data-c="${c}" data-tip="${U.esc(tip)}" aria-label="${U.esc(tip)}" tabindex="-1">${PM.icon(icon, 20)}</button>`;
      const fb = (f, icon, tip) => `<button class="cw-fb" data-f="${f}" data-tip="${U.esc(tip)}" aria-label="${U.esc(tip)}" tabindex="-1">${PM.icon(icon, 18)}</button>`;
      const el = U.h(`<div class="cw${this.inline ? ' cw-inline' : ''}" tabindex="-1" role="dialog" aria-label="Compose">
        ${this.inline ? '' : `<div class="cw-head" data-c="head"><span class="cw-title">New Message</span><span class="cw-hb">
          <button class="cw-hbtn" data-c="min" aria-label="Minimize" data-tip="Minimize">${PM.icon('minimize', 14)}</button>
          <button class="cw-hbtn" data-c="max" aria-label="Full-screen" data-tip="Full-screen">${PM.icon('expand', 14)}</button>
          <button class="cw-hbtn" data-c="close" aria-label="Save &amp; close" data-tip="Save &amp; close">${PM.icon('close', 14)}</button></span></div>`}
        ${this.inline ? '' : `<div class="cw-mhead"><button class="m-ib" data-c="close" aria-label="Back">${PM.icon('back', 24)}</button><span class="cw-mtitle">Compose</span>
          <button class="m-ib" data-c="attach" aria-label="Attach file">${PM.icon('attach', 24, 'm-rot')}</button><button class="m-ib" data-c="send" aria-label="Send">${PM.icon('send', 24)}</button><button class="m-ib" data-c="opts" aria-label="More options">${PM.icon('moreVert', 24)}</button></div>`}
        <div class="cw-main">
          ${this.inline ? `<div class="cw-iav">${UI.avatar(me, 40)}</div>` : ''}
          <div class="cw-box">
            ${this.inline ? `<div class="cw-ihead"><button class="jb cw-kind" data-c="kind" aria-label="Type of response" tabindex="-1"><span class="cw-kind-ic"></span><span class="caret"></span></button><span class="cw-irec" data-c="expandRec"></span><button class="cw-pop" data-c="popout" data-tip="Pop out reply" aria-label="Pop out reply" tabindex="-1">${PM.icon('newWindow', 16)}</button></div>` : ''}
            <div class="cw-fields">
              <div class="cw-row cw-from"><span class="cw-lbl">From</span><span class="cw-fromv">${U.esc(me.email)}</span></div>
              <div class="cw-row cw-to"><span class="cw-lbl">To</span><div class="rcpt" data-f="to"><input class="rcpt-in" type="text" autocomplete="off" spellcheck="false" aria-label="To"></div><span class="cw-ccbcc"><a href="#" data-c="showcc" tabindex="-1">Cc</a><a href="#" data-c="showbcc" tabindex="-1">Bcc</a></span></div>
              <div class="cw-row cw-cc" hidden><span class="cw-lbl">Cc</span><div class="rcpt" data-f="cc"><input class="rcpt-in" type="text" autocomplete="off" spellcheck="false" aria-label="Cc"></div></div>
              <div class="cw-row cw-bcc" hidden><span class="cw-lbl">Bcc</span><div class="rcpt" data-f="bcc"><input class="rcpt-in" type="text" autocomplete="off" spellcheck="false" aria-label="Bcc"></div></div>
              <div class="cw-row cw-subj"><input class="cw-subject" type="text" placeholder="Subject" aria-label="Subject"></div>
            </div>
            <div class="cw-scroll">
              <div class="cw-ed" contenteditable="true" role="textbox" aria-multiline="true" aria-label="Message Body" style="font-family:${S.settings().fontFamily};font-size:${sizeStyle()}"></div>
              <div class="cw-trim" data-c="showquote" hidden role="button" data-tip="Show trimmed content">···</div>
              <div class="cw-atts"></div>
            </div>
            <div class="cw-fmt" hidden>
              <button class="cw-fb cw-fsel" data-f="font" tabindex="-1" data-tip="Font"><span class="cw-fname">Sans Serif</span><span class="caret"></span></button>
              <button class="cw-fb cw-fsel" data-f="size" tabindex="-1" data-tip="Size"><span style="font-size:15px;font-weight:bold">T<small>T</small></span><span class="caret"></span></button>
              <span class="cw-fsep"></span>${fb('bold', 'bold', 'Bold (Ctrl-B)')}${fb('italic', 'italic', 'Italic (Ctrl-I)')}${fb('underline', 'underline', 'Underline (Ctrl-U)')}
              <button class="cw-fb cw-fsel" data-f="color" tabindex="-1" data-tip="Text color">${PM.icon('color', 18)}<span class="caret"></span></button>
              <span class="cw-fsep"></span><button class="cw-fb cw-fsel" data-f="align" tabindex="-1" data-tip="Align">${PM.icon('alignLeft', 18)}<span class="caret"></span></button>
              ${fb('olist', 'olist', 'Numbered list')}${fb('ulist', 'ulist', 'Bulleted list')}${fb('outdent', 'outdent', 'Indent less')}${fb('indent', 'indent', 'Indent more')}${fb('quote', 'quote', 'Quote')}
              <span class="cw-fsep"></span>${fb('strike', 'strike', 'Strikethrough')}${fb('clear', 'clearFormat', 'Remove formatting')}
            </div>
            <div class="cw-foot">
              <button class="jb jb-blue cw-send" data-c="send" data-tip="Send (Ctrl-Enter)">Send</button>
              ${this.inline && S.settings().sendArchive ? `<button class="jb jb-blue cw-send cw-sa" data-c="sendArchive" data-tip="Send and archive">Send + ${PM.icon('archive', 16)}</button>` : ''}
              <span class="cw-tools">${tool('fmt', 'format', 'Formatting options', 'cw-fmtbtn')}${tool('attach', 'attach', 'Attach files')}${tool('link', 'link', 'Insert link (Ctrl-K)')}${tool('emoji', 'emoji', 'Insert emoji')}${tool('photo', 'photo', 'Insert photo')}</span>
              <span class="cw-saved" aria-live="polite"></span>
              <span class="cw-foot-r">${tool('discard', 'delete', 'Discard draft')}<button class="cw-tool cw-opts" data-c="opts" data-tip="More options" aria-label="More options" tabindex="-1"><span class="caret"></span></button></span>
            </div>
          </div>
        </div>
        <div class="cw-drop">Drop files here</div>
        <input type="file" class="cw-file" multiple hidden>
        <input type="file" class="cw-img" accept="image/*" hidden>
      </div>`);
      this.el = el;
      this.ed = U.$('.cw-ed', el);
      this.subjEl = U.$('.cw-subject', el);
      this.subjEl.value = this.subject;
      this.ed.innerHTML = U.sanitize(html);
      if (this.cc.length) U.$('.cw-cc', el).hidden = false;
      if (this.bcc.length) U.$('.cw-bcc', el).hidden = false;
      if (this.inline && !this.editSubject) U.$('.cw-subj', el).hidden = true;
      ['to', 'cc', 'bcc'].forEach((f) => this.drawChips(f));
      this.drawAtts();
      this.updateTitle();
      this.updateQuote();
      if (this.inline) this.updateInlineHead();
      this.bind();
    }

    updateTitle() {
      if (this.inline) return;
      const t = U.$('.cw-title', this.el);
      t.textContent = this.subjEl.value.trim() || (this.kind === 'new' ? 'New Message' : this.kind === 'forward' ? 'Fwd: ' : 'New Message');
    }

    updateInlineHead() {
      const ic = { reply: 'reply', replyall: 'replyAll', forward: 'forward', new: 'reply' }[this.kind];
      U.$('.cw-kind-ic', this.el).innerHTML = PM.icon(ic, 18);
      const rec = [...this.to, ...this.cc, ...this.bcc];
      const irec = U.$('.cw-irec', this.el);
      const expanded = this.el.classList.contains('rec-open') || !rec.length || this.kind === 'forward';
      this.el.classList.toggle('rec-open', expanded);
      irec.innerHTML = expanded ? '' : U.esc(rec.map((a) => (a.name ? a.name : a.email)).join(', ')) + (this.bcc.length ? '' : '');
    }

    updateQuote() {
      U.$('.cw-trim', this.el).hidden = !this.quote;
    }

    /* ---------- recipients ---------- */
    drawChips(f) {
      const box = U.$(`.rcpt[data-f="${f}"]`, this.el);
      const input = U.$('.rcpt-in', box);
      U.$$('.chip', box).forEach((c) => c.remove());
      this[f].forEach((a, i) => {
        const bad = !U.isValidEmail(a.email);
        const chip = U.h(`<span class="chip${bad ? ' bad' : ''}" data-i="${i}" title="${U.esc(U.fmtAddr(a))}"><span class="chip-n">${U.esc(a.name || a.email)}</span><span class="chip-x" role="button" aria-label="Remove">×</span></span>`);
        box.insertBefore(chip, input);
      });
      if (this.inline) this.updateInlineHead();
    }

    commit(f, text) {
      const addrs = U.parseAddresses(text);
      addrs.forEach((a) => {
        if (!a.name) { const c = S.contactByEmail(a.email); if (c) a.name = c.name; }
        if (!this[f].some((x) => x.email.toLowerCase() === a.email.toLowerCase())) this[f].push(a);
      });
      this.drawChips(f);
      this.changed();
    }

    commitAll() {
      U.$$('.rcpt', this.el).forEach((box) => {
        const inp = U.$('.rcpt-in', box);
        if (inp.value.trim()) { this.commit(box.dataset.f, inp.value); inp.value = ''; }
      });
      this.closeAc();
    }

    showAc(box, inp) {
      const q = inp.value.trim();
      const res = S.suggest(q, 6).filter((c) => !this[box.dataset.f].some((x) => x.email === c.email));
      if (!q || !res.length) return this.closeAc();
      if (!this.ac) { this.ac = U.h('<div class="ac" role="listbox"></div>'); document.body.appendChild(this.ac); }
      this.acItems = res;
      this.acIndex = 0;
      this.acBox = box;
      const hi = (s) => U.esc(s).replace(new RegExp('(^|\\s|\\.|@)(' + q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'i'), '$1<b>$2</b>');
      this.ac.innerHTML = res.map((c, i) => `<div class="ac-i${i === 0 ? ' hl' : ''}" data-i="${i}" role="option"><span class="ac-n">${hi(c.name || c.email)}</span> <span class="ac-e">${hi(c.email)}</span></div>`).join('');
      const r = inp.getBoundingClientRect();
      this.ac.style.left = Math.max(4, r.left - 4) + 'px';
      this.ac.style.top = r.bottom + 4 + 'px';
      this.ac.hidden = false;
      this.ac.onmousedown = (e) => {
        e.preventDefault();
        const it = e.target.closest('.ac-i');
        if (!it) return;
        this.pickAc(+it.dataset.i, inp);
      };
    }
    pickAc(i, inp) {
      const c = this.acItems[i];
      const f = this.acBox.dataset.f;
      inp.value = '';
      this.commit(f, U.fmtAddr({ name: c.name, email: c.email }));
      this.closeAc();
      inp.focus();
    }
    closeAc() { if (this.ac) this.ac.hidden = true; this.acItems = null; }
    moveAc(d) {
      if (!this.acItems) return;
      this.acIndex = U.clamp(this.acIndex + d, 0, this.acItems.length - 1);
      U.$$('.ac-i', this.ac).forEach((x, i) => x.classList.toggle('hl', i === this.acIndex));
    }

    /* ---------- attachments ---------- */
    drawAtts() {
      const box = U.$('.cw-atts', this.el);
      box.innerHTML = this.attachments.map((a, i) => `<div class="cw-att" data-i="${i}"><span class="cw-att-n">${U.esc(a.name)}</span><span class="cw-att-s">(${U.fileSize(a.size || 0)})</span><span class="cw-att-x" role="button" aria-label="Remove attachment" data-tip="Remove attachment">×</span></div>`).join('');
    }
    async addFiles(files) {
      for (const f of Array.from(files)) {
        try { this.attachments.push(await PM.att.readFile(f)); }
        catch (err) { UI.alert(U.esc(err.message), 'Large files'); }
      }
      this.drawAtts();
      this.changed();
    }

    /* ---------- state ---------- */
    bodyHtml() {
      let h = this.plain ? U.textToHtml(this.ed.innerText) : this.ed.innerHTML;
      if (this.quote) h += this.quote;
      return h;
    }
    collect() {
      return {
        draftId: this.draftId, threadId: this.threadId, inReplyTo: this.inReplyTo,
        to: this.to.slice(), cc: this.cc.slice(), bcc: this.bcc.slice(),
        subject: this.subjEl.value, html: this.bodyHtml(), attachments: this.attachments.slice(),
      };
    }
    signature() {
      return JSON.stringify([this.to, this.cc, this.bcc, this.subjEl.value, this.ed.innerHTML, this.quote.length, this.attachments.map((a) => a.id)]);
    }
    isEmpty() {
      const clone = this.ed.cloneNode(true);
      clone.querySelectorAll('.pm_sig,.pm_fwd').forEach((n) => n.remove());
      const text = (clone.textContent || '').replace(/[\s\u00a0]+/g, '');
      const media = !!clone.querySelector('img');
      const noRcpt = !this.to.length && !this.cc.length && !this.bcc.length;
      if (this.kind === 'new') return noRcpt && !this.subjEl.value.trim() && !text && !media && !this.attachments.length;
      if (this.kind === 'forward') return noRcpt && !text && !media;
      return !text && !media && !this.attachments.length;
    }
    changed() {
      this.setSaved('');
      this.save();
    }
    setSaved(t) { const s = U.$('.cw-saved', this.el); if (s) s.textContent = t; }
    saveDraft(force) {
      const sig = this.signature();
      if (!force && sig === this.lastSaved) return;
      if (this.destroyed) return;
      if (this.isEmpty() && !this.draftId) return;
      this.setSaved('Saving…');
      this.draftId = S.saveDraft(this.collect());
      if (!this.threadId) this.threadId = S.msg(this.draftId).threadId;
      this.lastSaved = sig;
      setTimeout(() => !this.destroyed && this.setSaved('Saved'), 250);
    }

    /* ---------- lifecycle ---------- */
    mount() {
      if (this.inline) return;
      const dock = U.$('#dock');
      dock.appendChild(this.el);
      this.applyState();
      this.el.classList.add('cw-enter');
      setTimeout(() => this.el.classList.remove('cw-enter'), 400);
    }
    applyState() {
      const el = this.el;
      el.classList.toggle('min', this.state === 'min');
      el.classList.toggle('max', this.state === 'max');
      let ov = U.$('#cw-overlay');
      if (this.state === 'max') {
        if (!ov) { ov = U.h('<div id="cw-overlay"></div>'); document.body.appendChild(ov); ov.addEventListener('click', () => { const m = C.list.find((c) => c.state === 'max'); if (m) { m.state = 'normal'; m.applyState(); } }); }
        document.body.appendChild(el);
        C.list.forEach((c) => { if (c !== this && c.state === 'max') { c.state = 'normal'; c.applyState(); } });
      } else if (!this.inline) {
        if (el.parentNode !== U.$('#dock')) U.$('#dock').appendChild(el);
        if (ov && !C.list.some((c) => c.state === 'max' && c !== this)) ov.remove();
      }
      const mx = U.$('[data-c="max"]', el);
      if (mx) { mx.innerHTML = PM.icon(this.state === 'max' ? 'shrink' : 'expand', 14); mx.dataset.tip = this.state === 'max' ? 'Exit full-screen' : 'Full-screen'; }
      const mn = U.$('[data-c="min"]', el);
      if (mn) mn.dataset.tip = this.state === 'min' ? 'Maximize' : 'Minimize';
    }
    focus(where) {
      if (this.state === 'min') { this.state = 'normal'; this.applyState(); }
      setTimeout(() => {
        if (where === 'body' || (this.to.length && where !== 'to')) {
          this.ed.focus();
          const r = document.createRange(); r.setStart(this.ed, 0); r.collapse(true);
          const s = window.getSelection(); s.removeAllRanges(); s.addRange(r);
        } else U.$('.cw-to .rcpt-in', this.el).focus();
        if (this.inline) this.el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }, 0);
    }
    destroy() {
      this.destroyed = true;
      this.save.cancel();
      this.closeAc();
      if (this.ac) this.ac.remove();
      this.el.remove();
      C.list = C.list.filter((c) => c !== this);
      if (!C.list.some((c) => c.state === 'max')) { const ov = U.$('#cw-overlay'); ov && ov.remove(); }
      if (this.inline) PM.app.schedule();
    }
    close() {
      this.commitAll();
      const empty = this.isEmpty();
      if (empty) { if (this.draftId) S.deleteDraft(this.draftId); }
      else this.saveDraft(!this.draftId);
      const mobile = PM.mobile && PM.mobile.active && !this.inline;
      if (mobile) {
        this.el.classList.add('cw-leave');
        setTimeout(() => this.destroy(), 220);
        if (!empty) UI.notify('Message saved as draft.');
      } else this.destroy();
    }
    discard() {
      const data = this.collect();
      const id = this.draftId;
      const inline = this.inline, kind = this.kind, threadKey = this.threadKey;
      this.destroy();
      if (id) S.deleteDraft(id);
      UI.notify('Your draft has been discarded.', {
        undo: () => {
          const nid = S.saveDraft({ ...data, draftId: null });
          if (inline && PM.app.route.mode === 'thread' && PM.app.route.threadId === threadKey) C.openInline({ draftId: nid, threadId: data.threadId, threadKey, kind, focus: true });
          else C.openDraft(nid);
        },
      });
    }

    /* ---------- send ---------- */
    async send(archive) {
      this.commitAll();
      const all = [...this.to.map((a) => ['To', a]), ...this.cc.map((a) => ['Cc', a]), ...this.bcc.map((a) => ['Bcc', a])];
      if (!all.length) return UI.alert('Please specify at least one recipient.', 'Error');
      const bad = all.find(([, a]) => !U.isValidEmail(a.email));
      if (bad) return UI.alert(`The address "${U.esc(bad[1].email)}" in the "${bad[0]}" field was not recognized. Please make sure that all addresses are properly formed.`, 'Error');
      const text = this.ed.innerText.trim();
      if (!this.subjEl.value.trim()) {
        const ok = await UI.confirm(text ? 'Send this message without a subject?' : 'Send this message without a subject or text in the body?', { title: 'Confirm', ok: 'OK' });
        if (!ok) return;
      }
      if (!this.attachments.length && /\b(attached|attachment|attaching|enclosed)\b/i.test(text)) {
        const ok = await UI.confirm('Did you mean to attach files? You wrote "attached" in your message, but there are no files attached. Send anyway?', { title: 'Confirm', ok: 'OK' });
        if (!ok) return;
      }
      if (this.destroyed) return;
      const data = this.collect();
      const opts = { inline: this.inline, kind: this.kind, threadKey: this.threadKey, quote: this.quote };
      this.destroy();
      C.dispatch(data, opts, archive);
    }

    /* ---------- events ---------- */
    bind() {
      const el = this.el;
      el.addEventListener('mousedown', (e) => {
        if (e.target.closest('.cw-fb,.cw-tool,[data-f]')) e.preventDefault();
        C.list.forEach((c) => c.el.classList.toggle('focused', c === this));
      });
      el.addEventListener('click', (e) => {
        const chipX = e.target.closest('.chip-x');
        if (chipX) {
          const box = chipX.closest('.rcpt'), i = +chipX.closest('.chip').dataset.i;
          this[box.dataset.f].splice(i, 1);
          this.drawChips(box.dataset.f);
          this.changed();
          return;
        }
        const attX = e.target.closest('.cw-att-x');
        if (attX) { this.attachments.splice(+attX.closest('.cw-att').dataset.i, 1); this.drawAtts(); this.changed(); return; }
        const box = e.target.closest('.rcpt');
        if (box && !e.target.closest('.chip')) { U.$('.rcpt-in', box).focus(); return; }
        const f = e.target.closest('[data-f]');
        if (f && !f.classList.contains('rcpt')) { this.format(f.dataset.f, f); return; }
        const c = e.target.closest('[data-c]');
        if (!c) return;
        e.preventDefault();
        this.command(c.dataset.c, c, e);
      });
      el.addEventListener('dblclick', (e) => {
        const chip = e.target.closest('.chip');
        if (!chip) return;
        const box = chip.closest('.rcpt'), f = box.dataset.f, i = +chip.dataset.i;
        const a = this[f].splice(i, 1)[0];
        this.drawChips(f);
        const inp = U.$('.rcpt-in', box);
        inp.value = U.fmtAddr(a);
        inp.focus();
      });
      U.$$('.rcpt-in', el).forEach((inp) => {
        const box = inp.closest('.rcpt');
        inp.addEventListener('input', () => {
          if (/[,;]/.test(inp.value)) {
            const parts = inp.value.split(/[,;]/);
            const last = parts.pop();
            this.commit(box.dataset.f, parts.join(','));
            inp.value = last.trimStart();
          }
          this.showAc(box, inp);
        });
        inp.addEventListener('keydown', (e) => {
          if (this.acItems && this.acBox === box) {
            if (e.key === 'ArrowDown') { e.preventDefault(); return this.moveAc(1); }
            if (e.key === 'ArrowUp') { e.preventDefault(); return this.moveAc(-1); }
            if (e.key === 'Enter' || e.key === 'Tab') { if (inp.value.trim()) { e.preventDefault(); return this.pickAc(this.acIndex, inp); } }
            if (e.key === 'Escape') { e.stopPropagation(); return this.closeAc(); }
          }
          if ((e.key === 'Enter' || e.key === 'Tab') && inp.value.trim()) {
            if (e.key === 'Enter') e.preventDefault();
            this.commit(box.dataset.f, inp.value);
            inp.value = '';
            this.closeAc();
          } else if (e.key === 'Backspace' && !inp.value && this[box.dataset.f].length) {
            this[box.dataset.f].pop();
            this.drawChips(box.dataset.f);
            this.changed();
          }
        });
        inp.addEventListener('blur', () => setTimeout(() => {
          if (this.destroyed || document.activeElement === inp) return;
          if (inp.value.trim()) { this.commit(box.dataset.f, inp.value); inp.value = ''; }
          this.closeAc();
        }, 150));
        inp.addEventListener('paste', () => setTimeout(() => { if (/[,;\n]/.test(inp.value) || U.isValidEmail(inp.value.trim())) { this.commit(box.dataset.f, inp.value.replace(/\n/g, ',')); inp.value = ''; this.closeAc(); } }, 0));
      });
      this.subjEl.addEventListener('input', () => { this.updateTitle(); this.changed(); });
      this.subjEl.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); this.ed.focus(); } });
      const ph = () => this.ed.classList.toggle('is-empty', !this.ed.textContent.trim() && !this.ed.querySelector('img,li,blockquote'));
      ph();
      this.ed.addEventListener('input', () => { ph(); this.changed(); });
      this.ed.addEventListener('paste', (e) => {
        if (this.plain) { e.preventDefault(); document.execCommand('insertText', false, e.clipboardData.getData('text/plain')); return; }
        const html = e.clipboardData && e.clipboardData.getData('text/html');
        if (html) { e.preventDefault(); document.execCommand('insertHTML', false, U.sanitize(html)); }
      });
      el.addEventListener('keydown', (e) => {
        const mod = e.ctrlKey || e.metaKey;
        if (mod && e.key === 'Enter') { e.preventDefault(); this.send(); }
        else if (mod && e.shiftKey && (e.key === 'C' || e.key === 'c')) { e.preventDefault(); this.command('showcc'); }
        else if (mod && e.shiftKey && (e.key === 'B' || e.key === 'b')) { e.preventDefault(); this.command('showbcc'); }
        else if (mod && (e.key === 'k' || e.key === 'K') && e.target === this.ed) { e.preventDefault(); this.insertLink(); }
        else if (e.key === 'Escape' && !this.inline && !UI.popupOpen()) { e.stopPropagation(); if (this.state === 'max') { this.state = 'normal'; this.applyState(); } else this.ed.blur(); }
      });
      U.$('.cw-file', el).addEventListener('change', (e) => { this.addFiles(e.target.files); e.target.value = ''; });
      U.$('.cw-img', el).addEventListener('change', async (e) => {
        const f = e.target.files[0];
        e.target.value = '';
        if (!f) return;
        try {
          const a = await PM.att.readFile(f);
          this.ed.focus();
          this.restoreRange();
          document.execCommand('insertHTML', false, `<img src="${a.data}" alt="${U.esc(a.name)}" style="max-width:100%">`);
          this.changed();
        } catch (err) { UI.alert(U.esc(err.message)); }
      });
      // file drag & drop
      el.addEventListener('dragover', (e) => { if (e.dataTransfer && Array.from(e.dataTransfer.types).includes('Files')) { e.preventDefault(); el.classList.add('dropping'); } });
      el.addEventListener('dragleave', (e) => { if (!el.contains(e.relatedTarget)) el.classList.remove('dropping'); });
      el.addEventListener('drop', (e) => { if (e.dataTransfer && e.dataTransfer.files.length) { e.preventDefault(); el.classList.remove('dropping'); this.addFiles(e.dataTransfer.files); } });
      this.ed.addEventListener('keyup', () => this.saveRange());
      this.ed.addEventListener('mouseup', () => this.saveRange());
    }

    saveRange() {
      const s = window.getSelection();
      if (s.rangeCount && this.ed.contains(s.anchorNode)) this.range = s.getRangeAt(0).cloneRange();
    }
    restoreRange() {
      if (!this.range) return;
      const s = window.getSelection();
      s.removeAllRanges();
      s.addRange(this.range);
    }

    command(c, btn) {
      switch (c) {
        case 'head': if (this.state === 'min') { this.state = 'normal'; this.applyState(); } else if (this.state === 'normal') { this.state = 'min'; this.applyState(); } break;
        case 'min': this.state = this.state === 'min' ? 'normal' : 'min'; this.applyState(); break;
        case 'max': this.state = this.state === 'max' ? 'normal' : 'max'; this.applyState(); this.focus('body'); break;
        case 'close': this.close(); break;
        case 'showcc': U.$('.cw-cc', this.el).hidden = false; U.$('.cw-cc .rcpt-in', this.el).focus(); break;
        case 'showbcc': U.$('.cw-bcc', this.el).hidden = false; U.$('.cw-bcc .rcpt-in', this.el).focus(); break;
        case 'send': this.send(false); break;
        case 'sendArchive': this.send(true); break;
        case 'discard': this.discard(); break;
        case 'attach': U.$('.cw-file', this.el).click(); break;
        case 'photo': this.saveRange(); U.$('.cw-img', this.el).click(); break;
        case 'link': this.insertLink(); break;
        case 'emoji': this.emojiPicker(btn); break;
        case 'fmt': {
          const f = U.$('.cw-fmt', this.el);
          f.hidden = !f.hidden;
          btn.classList.toggle('on', !f.hidden);
          break;
        }
        case 'showquote':
          this.ed.insertAdjacentHTML('beforeend', '<br>' + this.quote);
          this.quote = '';
          this.updateQuote();
          this.changed();
          break;
        case 'opts': this.optionsMenu(btn); break;
        case 'kind': this.kindMenu(btn); break;
        case 'expandRec': this.el.classList.add('rec-open'); this.updateInlineHead(); U.$('.cw-to .rcpt-in', this.el).focus(); break;
        case 'popout': this.popout(); break;
      }
    }

    format(f, btn) {
      if (this.plain) return;
      this.ed.focus();
      const ex = (cmd, val) => { document.execCommand(cmd, false, val); this.changed(); };
      switch (f) {
        case 'bold': return ex('bold');
        case 'italic': return ex('italic');
        case 'underline': return ex('underline');
        case 'strike': return ex('strikeThrough');
        case 'olist': return ex('insertOrderedList');
        case 'ulist': return ex('insertUnorderedList');
        case 'indent': return ex('indent');
        case 'outdent': return ex('outdent');
        case 'quote': return ex('formatBlock', 'blockquote');
        case 'clear': return ex('removeFormat');
        case 'font': {
          this.saveRange();
          return UI.menu(btn, FONTS.map(([n, v]) => ({ html: `<span style="font-family:${v}">${n}</span>`, action: () => { this.restoreRange(); ex('fontName', v); U.$('.cw-fname', this.el).textContent = n; } })), { above: true });
        }
        case 'size': {
          this.saveRange();
          return UI.menu(btn, SIZES.map(([n, v]) => ({ html: `<span style="font-size:${{ Small: '11px', Normal: '13px', Large: '17px', Huge: '24px' }[n]}">${n}</span>`, action: () => { this.restoreRange(); if (v) ex('fontSize', v); else ex('fontSize', '2'); } })), { above: true });
        }
        case 'align': {
          this.saveRange();
          return UI.menu(btn, [['alignLeft', 'Left', 'justifyLeft'], ['alignCenter', 'Center', 'justifyCenter'], ['alignRight', 'Right', 'justifyRight']].map(([ic, n, cmd]) => ({ html: `${PM.icon(ic, 18, 'jm-ic')} ${n}`, action: () => { this.restoreRange(); ex(cmd); } })), { above: true });
        }
        case 'color': {
          this.saveRange();
          const pal = (cmd) => `<div class="pal">${PALETTE.map((c) => `<span class="pal-c" data-cmd="${cmd}" data-c="${c}" style="background:${c}" title="${c}"></span>`).join('')}</div>`;
          const el = U.h(`<div class="jm pal-pop"><div class="pal-col"><div class="pal-h">Background color</div>${pal('hiliteColor')}</div><div class="pal-col"><div class="pal-h">Text color</div>${pal('foreColor')}</div></div>`);
          el.addEventListener('mousedown', (e) => e.preventDefault());
          el.addEventListener('click', (e) => {
            const c = e.target.closest('.pal-c');
            if (!c) return;
            UI.closePopup();
            this.ed.focus();
            this.restoreRange();
            ex(c.dataset.cmd, c.dataset.c);
          });
          UI.popup(btn, el, { above: true });
        }
      }
    }

    insertLink() {
      this.saveRange();
      const sel = window.getSelection();
      const selText = sel && this.ed.contains(sel.anchorNode) ? String(sel) : '';
      const body = U.h(`<div class="link-dlg"><div class="ld-row"><label>Text to display:</label><input class="ji" id="ld-text" value="${U.esc(selText)}"></div>
        <div class="ld-row"><label>Link to:</label><div><div class="dlg-label">To what URL should this link go?</div><input class="ji" id="ld-url" placeholder="https://"><div class="dlg-fine"><b>Not sure what to put in the box?</b> First, find the page on the web that you want to link to. Then copy the web address from your browser's address bar and paste it into the box above.</div></div></div></div>`);
      UI.dialog({
        title: 'Edit Link', body, width: 560,
        buttons: [{ label: 'OK', primary: true, action: () => {
          let url = U.$('#ld-url', body).value.trim();
          const text = U.$('#ld-text', body).value || url;
          if (!url) return;
          if (!/^(https?:|mailto:)/i.test(url)) url = (U.isValidEmail(url) ? 'mailto:' : 'https://') + url;
          this.ed.focus();
          this.restoreRange();
          document.execCommand('insertHTML', false, `<a href="${U.esc(url)}">${U.esc(text)}</a>`);
          this.changed();
        } }, { label: 'Cancel' }],
      });
      setTimeout(() => U.$(selText ? '#ld-url' : '#ld-text', body).focus(), 30);
    }

    emojiPicker(btn) {
      this.saveRange();
      const el = U.h(`<div class="jm emoji-pop">${EMOJI.map((e) => `<span class="emo" role="button">${e}</span>`).join('')}</div>`);
      el.addEventListener('mousedown', (e) => e.preventDefault());
      el.addEventListener('click', (e) => {
        const em = e.target.closest('.emo');
        if (!em) return;
        UI.closePopup();
        this.ed.focus();
        this.restoreRange();
        document.execCommand('insertText', false, em.textContent);
        this.saveRange();
        this.changed();
      });
      UI.popup(btn, el, { above: true });
    }

    optionsMenu(btn) {
      const s = S.settings();
      const mob = PM.mobile && PM.mobile.active;
      UI.menu(btn, [
        mob ? { label: 'Insert photo', action: () => this.command('photo') } : null,
        mob ? { label: 'Insert link', action: () => this.insertLink() } : null,
        mob ? { label: 'Insert emoji', action: () => this.emojiPicker(btn) } : null,
        mob ? { label: 'Formatting options', action: () => this.command('fmt', U.$('.cw-fmtbtn', this.el)) } : null,
        mob ? { label: 'Discard', action: () => this.discard() } : null,
        mob ? { sep: true } : null,
        this.inline || mob ? null : { label: 'Default to full-screen', checked: s.composeFullscreen, action: () => S.setSettings({ composeFullscreen: !s.composeFullscreen }) },
        this.inline || mob ? null : { sep: true },
        { label: 'Plain text mode', checked: this.plain, action: () => this.togglePlain() },
        { sep: true },
        { label: 'Print', action: () => this.print() },
        { label: 'Check spelling', checked: this.ed.spellcheck, action: () => { this.ed.spellcheck = !this.ed.spellcheck; this.ed.blur(); this.ed.focus(); } },
      ], { above: true, align: 'right', minWidth: 200 });
    }

    togglePlain() {
      if (!this.plain) {
        if (/<(b|i|u|font|span|img|a|ul|ol|blockquote|strike)\b/i.test(this.ed.innerHTML)) {
          UI.confirm('Converting this message to plain text will lose some formatting. Are you sure you want to continue?', { ok: 'OK' }).then((ok) => { if (ok) this.setPlain(true); });
        } else this.setPlain(true);
      } else this.setPlain(false);
    }
    setPlain(on) {
      this.plain = on;
      if (on) this.ed.innerText = this.ed.innerText;
      this.el.classList.toggle('plain', on);
      U.$('.cw-fmt', this.el).hidden = true;
      this.changed();
    }

    print() {
      const w = window.open('', '_blank');
      if (!w) return;
      const addr = (l) => l.map((a) => U.esc(U.fmtAddr(a))).join(', ');
      w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${U.esc(this.subjEl.value)}</title><style>body{font:13px Arial,sans-serif;margin:24px}</style></head><body>
        <b>${U.esc(this.subjEl.value || '(no subject)')}</b><br>To: ${addr(this.to)}${this.cc.length ? '<br>Cc: ' + addr(this.cc) : ''}<hr>${U.sanitize(this.bodyHtml())}<script>setTimeout(function(){print()},200)<\/script></body></html>`);
      w.document.close();
    }

    kindMenu(btn) {
      const m = this.inReplyTo && S.msg(this.inReplyTo);
      UI.menu(btn, [
        m ? { html: `${PM.icon('reply', 16, 'jm-ic')} Reply`, checked: this.kind === 'reply', action: () => this.switchKind('reply', m) } : null,
        m ? { html: `${PM.icon('replyAll', 16, 'jm-ic')} Reply to all`, checked: this.kind === 'replyall', action: () => this.switchKind('replyall', m) } : null,
        m ? { html: `${PM.icon('forward', 16, 'jm-ic')} Forward`, checked: this.kind === 'forward', action: () => this.switchKind('forward', m) } : null,
        { sep: true },
        { label: 'Edit subject', action: () => { U.$('.cw-subj', this.el).hidden = false; this.subjEl.focus(); } },
        { label: 'Pop out reply', action: () => this.popout() },
      ], { minWidth: 170 });
    }

    switchKind(kind, m) {
      const r = recipientsFor(m, kind);
      this.kind = kind;
      this.to = r.to; this.cc = r.cc; this.bcc = [];
      U.$('.cw-cc', this.el).hidden = !this.cc.length;
      this.subjEl.value = subjectFor(m, kind);
      if (kind === 'forward') {
        this.quote = '';
        if (!this.ed.querySelector('.pm_fwd')) this.ed.insertAdjacentHTML('beforeend', forwardBlock(m));
        m.attachments.forEach((a) => { if (!this.attachments.some((x) => x.id === a.id)) this.attachments.push({ ...a }); });
        this.drawAtts();
      } else {
        const f = this.ed.querySelector('.pm_fwd');
        if (f) f.remove();
        if (!this.quote) this.quote = quoteBlock(m);
        this.attachments = this.attachments.filter((a) => !m.attachments.some((x) => x.id === a.id));
        this.drawAtts();
      }
      ['to', 'cc', 'bcc'].forEach((f) => this.drawChips(f));
      this.el.classList.toggle('rec-open', kind === 'forward');
      this.updateInlineHead();
      this.updateQuote();
      this.changed();
      this.focus(kind === 'forward' ? 'to' : 'body');
    }

    popout() {
      this.commitAll();
      this.saveDraft(true);
      const d = this.collect();
      const [html] = splitQuote(d.html);
      this.destroy();
      const c = new Compose({ ...d, html, quote: this.quote, kind: this.kind, threadKey: this.threadKey });
      C.list.push(c);
      c.mount();
      c.focus('body');
    }
  }

  /* ---------- helpers for replies ---------- */
  function recipientsFor(m, kind) {
    const me = S.me();
    const notMe = (a) => !S.isMe(a);
    const uniq = (list) => list.filter((a, i) => list.findIndex((b) => b.email.toLowerCase() === a.email.toLowerCase()) === i);
    if (kind === 'forward') return { to: [], cc: [] };
    const fromMe = S.isMe(m.from);
    if (kind === 'reply') return { to: fromMe ? m.to.slice() : [m.replyTo || m.from], cc: [] };
    const to = fromMe ? m.to.slice() : uniq([m.replyTo || m.from, ...m.to.filter(notMe)]);
    const cc = uniq(m.cc.filter(notMe)).filter((a) => !to.some((t) => t.email === a.email));
    void me;
    return { to, cc };
  }
  function subjectFor(m, kind) {
    const s = (m.subject || '').replace(/^((re|fwd?):\s*)+/i, '');
    return (kind === 'forward' ? 'Fwd: ' : 'Re: ') + s;
  }
  function quoteBlock(m) {
    return `<div class="pm_quote"><div dir="ltr">${U.quoteHeader(m)}<br></div><blockquote class="pm_quote_b" style="margin:0 0 0 .8ex;border-left:1px #ccc solid;padding-left:1ex">${m.html}</blockquote></div>`;
  }
  function forwardBlock(m) {
    const addr = (l) => l.map((a) => (a.name ? `${U.esc(a.name)} &lt;<a href="mailto:${U.esc(a.email)}">${U.esc(a.email)}</a>&gt;` : `<a href="mailto:${U.esc(a.email)}">${U.esc(a.email)}</a>`)).join(', ');
    return `<div class="pm_fwd"><br>---------- Forwarded message ----------<br>From: <b>${addr([m.from])}</b><br>Date: ${U.esc(U.fullDate(m.date))}<br>Subject: ${U.esc(m.subject)}<br>To: ${addr(m.to)}${m.cc.length ? '<br>Cc: ' + addr(m.cc) : ''}<br><br>${m.html}</div>`;
  }
  const sigHtml = () => {
    const s = S.settings();
    return s.signatureOn && s.signature ? `<br><div class="pm_sig">-- <br>${U.textToHtml(s.signature)}</div>` : '';
  };

  /* ---------- public API ---------- */
  C.open = function (o = {}) {
    if (C.list.filter((c) => !c.inline).length >= 4) {
      const oldest = C.list.find((c) => !c.inline && c.state !== 'min');
      if (oldest) { oldest.state = 'min'; oldest.applyState(); }
    }
    const c = new Compose({ ...o, html: o.html != null ? o.html : '<br>' + sigHtml() });
    C.list.push(c);
    c.mount();
    c.focus(o.focus || (o.to && o.to.length ? 'body' : 'to'));
    return c;
  };

  C.openDraft = function (draftId) {
    const ex = C.list.find((c) => c.draftId === draftId);
    if (ex) { if (ex.state === 'min') { ex.state = 'normal'; ex.applyState(); } ex.focus('body'); return ex; }
    const m = S.msg(draftId);
    if (!m) return null;
    const [html, quote] = splitQuote(m.html);
    const c = new Compose({ draftId, threadId: m.threadId, inReplyTo: m.inReplyTo, to: m.to, cc: m.cc, bcc: m.bcc, subject: m.subject, html, quote, attachments: m.attachments, kind: m.inReplyTo ? 'reply' : 'new' });
    C.list.push(c);
    c.mount();
    c.focus('body');
    return c;
  };

  C.openInline = function (o) {
    const m = o.draftId && S.msg(o.draftId);
    let data = o;
    if (m) {
      const [html, quote] = splitQuote(m.html);
      data = { ...o, threadId: m.threadId, inReplyTo: m.inReplyTo, to: m.to, cc: m.cc, bcc: m.bcc, subject: m.subject, html, quote, attachments: m.attachments, kind: o.kind || (m.subject.startsWith('Fwd:') ? 'forward' : 'reply') };
    }
    const c = new Compose({ ...data, inline: true, threadKey: o.threadKey || o.threadId });
    C.list.push(c);
    if (o.focus) c.focus('body');
    return c;
  };

  C.inlineFor = (key) => C.list.find((c) => c.inline && c.threadKey === key) || null;

  C.reply = function (m, kind, o = {}) {
    const key = o.threadKey || S.threadKeyOf(m);
    const existing = o.inline && C.inlineFor(key);
    if (existing) { if (existing.kind !== kind && existing.inReplyTo === m.id) existing.switchKind(kind, m); existing.focus(kind === 'forward' ? 'to' : 'body'); return existing; }
    const r = recipientsFor(m, kind);
    const data = {
      kind, threadId: m.threadId, threadKey: key, inReplyTo: m.id, to: r.to, cc: r.cc,
      subject: subjectFor(m, kind),
      html: kind === 'forward' ? '<br>' + sigHtml() + forwardBlock(m) : '<br>' + sigHtml(),
      quote: kind === 'forward' ? '' : quoteBlock(m),
      attachments: kind === 'forward' ? m.attachments.map((a) => ({ ...a })) : [],
    };
    if (o.inline && PM.app.route.mode === 'thread' && !(PM.mobile && PM.mobile.active)) {
      const c = new Compose({ ...data, inline: true });
      C.list.push(c);
      PM.app.render(false);
      c.focus(kind === 'forward' ? 'to' : 'body');
      return c;
    }
    return C.open(data);
  };

  C.closeForDraft = (id) => C.list.filter((c) => c.draftId === id).forEach((c) => c.destroy());
  C.closeAll = (save) => C.list.slice().forEach((c) => (save ? c.close() : c.destroy()));
  C.anyFocused = () => C.list.some((c) => c.el.contains(document.activeElement));

  /* Inline replies are saved and closed when leaving their conversation */
  C.onRoute = function (route) {
    C.list.filter((c) => c.inline && !(route.mode === 'thread' && route.threadId === c.threadKey)).forEach((c) => c.close());
  };

  /* Undo-send pipeline */
  C.dispatch = function (data, opts, archive) {
    const delay = +S.settings().undoSend || 0;
    let done = false, timer = null;
    if (data.draftId) { S.deleteDraft(data.draftId); data = { ...data, draftId: null }; }
    const onUnload = () => { if (!done) commit(); };
    window.addEventListener('beforeunload', onUnload);
    const viewLink = (m) => ({ label: 'View message', action: () => { commit(); const key = S.threadKeyOf(S.msg(m.id) || m); PM.app.go('#sent/' + key); } });
    let sentMsg = null;
    const commit = () => {
      if (done) return sentMsg;
      done = true;
      clearTimeout(timer);
      window.removeEventListener('beforeunload', onUnload);
      sentMsg = S.send(data);
      if (archive && opts.threadKey) S.archive([opts.threadKey], 'normal');
      if (sentMsg.labels.includes('INBOX')) PM.mailer.notifyNew(sentMsg);
      return sentMsg;
    };
    const reopen = () => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      window.removeEventListener('beforeunload', onUnload);
      const nd = { ...data };
      if (opts.inline && PM.app.route.mode === 'thread' && PM.app.route.threadId === opts.threadKey) {
        const [html, quote] = splitQuote(nd.html);
        const c = new Compose({ ...nd, html, quote, inline: true, kind: opts.kind, threadKey: opts.threadKey });
        C.list.push(c);
        c.saveDraft(true);
        PM.app.render(false);
        c.focus('body');
      } else {
        const [html, quote] = splitQuote(nd.html);
        const c = new Compose({ ...nd, html, quote, kind: opts.kind, threadKey: opts.threadKey });
        C.list.push(c);
        c.mount();
        c.saveDraft(true);
        c.focus('body');
      }
      UI.notify('Sending undone.');
    };
    if (delay > 0) {
      UI.notify('Your message has been sent.', { undo: reopen, links: [{ label: 'View message', action: () => { const m = commit(); PM.app.go('#sent/' + S.threadKeyOf(m)); } }], timeout: delay * 1000 });
      timer = setTimeout(() => {
        const m = commit();
        UI.notify('Your message has been sent.', { links: [viewLink(m)] });
      }, delay * 1000);
    } else {
      UI.notify('Sending...', { sticky: true });
      setTimeout(() => { const m = commit(); UI.notify('Your message has been sent.', { links: [viewLink(m)] }); }, 500);
    }
  };
})(window.PM);
