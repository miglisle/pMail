/* pMail — conversation view */
(function (PM) {
  'use strict';
  const U = PM.util, UI = PM.ui, S = PM.store;
  const T = (PM.thread = { exp: new Map(), showAll: new Set(), trimmed: new Set(), unreadAtOpen: new Set() });

  T.opened = function (key) {
    const scope = PM.app.scope();
    const th = S.thread(key, scope);
    T.exp.clear();
    T.unreadAtOpen = new Set(th ? th.msgs.filter((m) => S.has(m, 'UNREAD')).map((m) => m.id) : []);
    if (th && th.unread) S.setRead([key], true, scope);
  };

  const nameOf = (a) => (S.isMe(a) ? 'me' : a.name || a.email);
  const shortName = (a) => (S.isMe(a) ? 'me' : U.firstName(a.name) || a.email);

  function recipientsLine(m) {
    const to = [...(m.to || []), ...(m.cc || [])];
    let s = to.length ? 'to ' + to.map(shortName).join(', ') : 'to undisclosed recipients';
    if ((m.bcc || []).some((a) => S.isMe(a))) s += ', bcc: me';
    else if ((m.bcc || []).length && S.isMe(m.from)) s += ', bcc: ' + m.bcc.map(shortName).join(', ');
    return U.esc(s);
  }

  function splitQuote(html) {
    const doc = new DOMParser().parseFromString('<body>' + html, 'text/html');
    const q = doc.querySelector('.pm_quote, .gmail_quote, blockquote[type=cite]');
    if (!q) return [html, ''];
    const quote = q.outerHTML;
    q.remove();
    return [doc.body.innerHTML, quote];
  }

  function attHtml(m) {
    if (!m.attachments || !m.attachments.length) return '';
    const n = m.attachments.length;
    return `<div class="att-wrap"><div class="att-h">${n === 1 ? '1 Attachment' : n + ' Attachments'}${n > 1 ? `<a href="#" class="att-all" data-mid="${m.id}">Download all</a>` : ''}</div><div class="att-list">${m.attachments.map((a) => `
      <div class="att" data-mid="${m.id}" data-aid="${a.id}" title="${U.esc(a.name)} (${U.fileSize(a.size || 0)})">
        <div class="att-thumb">${PM.att.thumb(a, m)}</div>
        <div class="att-foot">${PM.att.badge(a)}<span class="att-name">${U.esc(a.name)}</span></div>
        <div class="att-hover"><span class="att-hname">${U.esc(a.name)}</span><span class="att-btns"><button class="att-b" data-ab="dl" data-tip="Download" aria-label="Download">${PM.icon('download', 18)}</button></span></div>
      </div>`).join('')}</div></div>`;
  }

  function msgHtml(m, th, expanded) {
    const starred = S.has(m, 'STARRED');
    const unread = T.unreadAtOpen.has(m.id);
    if (!expanded) {
      return `<div class="msg col${unread ? ' un' : ''}" data-mid="${m.id}">
        <div class="msg-av">${UI.avatar(m.from, 40)}</div>
        <div class="msg-colrow"><span class="msg-from">${U.esc(nameOf(m.from))}</span><span class="msg-snip">${U.esc(S.snippetOf(m))}</span></div>
        <div class="msg-r">${m.attachments && m.attachments.length ? PM.icon('attach', 16, 'msg-clip') : ''}<span class="msg-date" title="${U.esc(U.fullDate(m.date))}">${U.msgDate(m.date)}</span>
          <span class="msg-star" data-ma="star" role="button" aria-label="Star">${PM.starIcon(starred)}</span></div></div>`;
    }
    const [body, quote] = splitQuote(m.html || '');
    const showQ = T.trimmed.has(m.id);
    return `<div class="msg exp" data-mid="${m.id}">
      <div class="msg-head">
        <div class="msg-av">${UI.avatar(m.from, 40)}</div>
        <div class="msg-meta">
          <div class="msg-l1"><span class="msg-from"><span class="msg-name">${U.esc(m.from.name || m.from.email)}</span>${m.from.name ? ` <span class="msg-email">&lt;${U.esc(m.from.email)}&gt;</span>` : ''}</span></div>
          <div class="msg-to"><span>${recipientsLine(m)}</span><span class="msg-det" data-ma="details" role="button" aria-label="Show details"></span></div>
        </div>
        <div class="msg-r">
          ${m.attachments && m.attachments.length ? PM.icon('attach', 16, 'msg-clip') : ''}
          <span class="msg-date" title="${U.esc(U.fullDate(m.date))}">${U.msgDate(m.date)}</span>
          <span class="msg-star" data-ma="star" role="button" data-tip="${starred ? 'Starred' : 'Not starred'}" aria-label="Star">${PM.starIcon(starred)}</span>
          <span class="jb-grp"><button class="jb mb" data-ma="reply" data-tip="Reply" aria-label="Reply">${PM.icon('reply', 18)}</button><button class="jb mb mb-more" data-ma="more" data-tip="More" aria-label="More"><span class="caret"></span></button></span>
        </div>
      </div>
      <div class="msg-body">
        <div class="msg-html">${U.sanitize(body)}</div>
        ${quote ? `<div class="msg-trim${showQ ? ' open' : ''}" data-ma="trim" role="button" data-tip="${showQ ? 'Hide expanded content' : 'Show trimmed content'}">···</div>${showQ ? `<div class="msg-quote">${U.sanitize(quote)}</div>` : ''}` : ''}
        ${attHtml(m)}
      </div>
    </div>`;
  }

  function chipsHtml(th, scope) {
    const out = [];
    if (scope === 'spam') out.push(`<span class="tl-chip">Spam<span class="tl-x" data-rm="SPAM" data-tip="Remove this label">×</span></span>`);
    if (scope === 'trash') out.push(`<span class="tl-chip">Trash<span class="tl-x" data-rm="TRASH" data-tip="Remove this label">×</span></span>`);
    if (th.inbox && scope === 'normal') out.push(`<span class="tl-chip">Inbox<span class="tl-x" data-rm="INBOX" data-tip="Remove this label">×</span></span>`);
    if (th.muted) out.push(`<span class="tl-chip">Muted<span class="tl-x" data-rm="MUTED" data-tip="Unmute">×</span></span>`);
    th.labels.forEach((id) => {
      const l = S.label(id);
      if (!l) return;
      out.push(`<span class="tl-chip" style="${l.color ? `background:${l.color.bg};color:${l.color.fg}` : ''}"><a href="#label/${PM.app.enc(l.name)}">${U.esc(l.name)}</a><span class="tl-x" data-rm="${l.id}" data-tip="Remove this label">×</span></span>`);
    });
    return out.join('');
  }

  T.render = function (el, route) {
    const app = PM.app;
    const view = route.view;
    const scope = S.scopeOf(view);
    app.allThreads = S.threadsFor(view);
    app.page = [];
    const th = S.thread(route.threadId, scope);
    const inline = PM.compose.inlineFor(route.threadId);
    if (!th) {
      if (inline && inline.el.parentNode) inline.el.remove();
      el.className = 'view-thread';
      el.innerHTML = `<div class="th"><div class="empty">This conversation could not be found. It may have been deleted. <a href="${PM.app.listHash(route)}">Return to ${U.esc(PM.app.viewName(view))}</a></div></div>`;
      return;
    }
    const msgs = th.msgs.filter((m) => !S.has(m, 'DRAFT'));
    const drafts = th.msgs.filter((m) => S.has(m, 'DRAFT'));
    const lastId = msgs.length ? msgs[msgs.length - 1].id : null;
    const isExp = (m) => (T.exp.has(m.id) ? T.exp.get(m.id) : m.id === lastId || T.unreadAtOpen.has(m.id) || msgs.length === 1);

    const rows = [];
    const showAll = T.showAll.has(th.id);
    let i = 0;
    while (i < msgs.length) {
      const m = msgs[i];
      // collapse long runs of collapsed messages into "N older messages"
      if (!showAll && i > 0 && !isExp(m)) {
        let j = i;
        while (j < msgs.length - 1 && !isExp(msgs[j])) j++;
        const run = j - i;
        if (run >= 3) {
          rows.push(`<div class="msg-gap" data-ma="showall" role="button"><span class="gap-lines"></span><span class="gap-n">${run}</span><span class="gap-t">older messages</span></div>`);
          i = j;
          continue;
        }
      }
      rows.push(msgHtml(m, th, isExp(m)));
      i++;
    }
    const banner = scope === 'spam'
      ? `<div class="spam-warn"><b>Why is this message in Spam?</b> It's similar to messages that were detected by our spam filters. <a href="#" data-ta="notspam">Report not spam</a></div>` : '';
    const lastMsg = msgs[msgs.length - 1];
    const many = lastMsg && ([...lastMsg.to, ...lastMsg.cc].filter((a) => !S.isMe(a)).length + (S.isMe(lastMsg.from) ? 0 : 1)) > 1;
    const replyBox = !msgs.length ? '' : `<div class="reply-box">
      <div class="msg-av">${UI.avatar(S.me(), 40)}</div>
      <div class="rb-in" data-ta="reply">Click here to <a href="#" data-ta="reply">Reply</a>${many ? ', <a href="#" data-ta="replyall">Reply to all</a>,' : ''} or <a href="#" data-ta="forward">Forward</a></div></div>`;
    const allExp = msgs.every(isExp);
    const top = `<div class="th-subj-row">
          ${S.settings().importanceMarkers ? `<span class="th-imp" data-ta="imp" role="button" data-tip="${th.important ? 'Click to teach pMail this conversation is not important.' : 'Click to teach pMail this conversation is important.'}">${PM.impIcon(th.important)}</span>` : ''}
          <h2 class="th-subj">${U.esc(th.subject || '(no subject)')}</h2>
          <span class="th-chips">${chipsHtml(th, scope)}</span>
        </div>
        <div class="th-icons">
          <button class="ib" data-ta="toggleAll" data-tip="${allExp ? 'Collapse all' : 'Expand all'}" aria-label="${allExp ? 'Collapse all' : 'Expand all'}">${PM.icon(allExp ? 'collapseAll' : 'expandAll', 20)}</button>
          <button class="ib" data-ta="print" data-tip="Print all" aria-label="Print all">${PM.icon('print', 20)}</button>
          <button class="ib" data-ta="newwin" data-tip="In new window" aria-label="In new window">${PM.icon('newWindow', 20)}</button>
        </div>`;

    const existing = el.className === 'view-thread' && U.$('.th', el);
    if (existing && existing.dataset.tid === th.id) {
      // update in place so an inline reply being typed keeps focus and caret
      U.$('.th-top', existing).innerHTML = top;
      U.$('.th-banner', existing).innerHTML = banner;
      U.$('.msgs', existing).innerHTML = rows.join('');
    } else {
      if (inline && inline.el.parentNode) inline.el.remove();
      el.className = 'view-thread';
      el.innerHTML = `<div class="th" data-tid="${th.id}"><div class="th-top">${top}</div><div class="th-banner">${banner}</div><div class="msgs">${rows.join('')}</div><div class="th-reply-slot"></div></div>`;
    }
    const slot = U.$('.th-reply-slot', el);
    let comp = inline;
    if (!comp && drafts.length) comp = PM.compose.openInline({ draftId: drafts[0].id, threadId: th.id, focus: false });
    if (comp) { if (comp.el.parentNode !== slot) { slot.innerHTML = ''; slot.appendChild(comp.el); } }
    else if (!U.$('.reply-box', slot) || slot.dataset.many !== String(!!many)) { slot.innerHTML = replyBox; slot.dataset.many = String(!!many); }
  };

  /* ---------- actions ---------- */
  T.reply = function (kind, msgId) {
    const app = PM.app;
    const th = S.thread(app.route.threadId, app.scope());
    if (!th) return;
    const msgs = th.msgs.filter((m) => !S.has(m, 'DRAFT'));
    const m = msgId ? S.msg(msgId) : msgs[msgs.length - 1];
    if (!m) return;
    PM.compose.reply(m, kind || (S.settings().replyAll ? 'replyall' : 'reply'), { inline: true, threadKey: th.id });
  };

  T.print = function (key, noPrint) {
    const th = S.thread(key, PM.app.scope());
    if (!th) return;
    const me = S.me();
    const msgs = th.msgs.filter((m) => !S.has(m, 'DRAFT'));
    const w = window.open('', '_blank');
    if (!w) { UI.notify('Please allow pop-up windows to print.'); return; }
    const addr = (list) => list.map((a) => U.esc(a.name ? `${a.name} <${a.email}>` : a.email)).join(', ');
    w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>pMail - ${U.esc(th.subject)}</title><style>
      body{font:13px Arial,sans-serif;color:#222;margin:20px 28px}
      .top{display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #999;padding-bottom:6px;margin-bottom:12px}
      .who{font-weight:bold}.subj{font-size:16px;font-weight:bold;margin:8px 0 2px}.n{color:#666;margin-bottom:12px}
      .m{border-top:1px solid #aaa;padding:10px 0 14px}.mh{display:flex;justify-content:space-between}.mh b{font-size:13px}
      .to{color:#555;margin:2px 0 12px;font-size:12px}img{max-width:100%}table{max-width:100%}
      </style></head><body><div class="top">${PM.logo(28)}<div class="who">${U.esc(me.name)} &lt;${U.esc(me.email)}&gt;</div></div>
      <div class="subj">${U.esc(th.subject || '(no subject)')}</div><div class="n">${msgs.length} message${msgs.length === 1 ? '' : 's'}</div>
      ${msgs.map((m) => `<div class="m"><div class="mh"><span><b>${U.esc(m.from.name || m.from.email)}</b> &lt;${U.esc(m.from.email)}&gt;</span><span>${U.esc(U.fullDate(m.date))}</span></div>
        <div class="to">To: ${addr(m.to)}${m.cc.length ? '<br>Cc: ' + addr(m.cc) : ''}</div><div>${U.sanitize(m.html)}</div>
        ${m.attachments && m.attachments.length ? `<div style="margin-top:10px;color:#555">${m.attachments.map((a) => '📎 ' + U.esc(a.name) + ' (' + U.fileSize(a.size || 0) + ')').join('<br>')}</div>` : ''}</div>`).join('')}
      ${noPrint ? '' : '<script>setTimeout(function(){window.print()},250)<\/script>'}</body></html>`);
    w.document.close();
  };

  function msgMenu(anchor, m) {
    const app = PM.app;
    const fromName = m.from.name || m.from.email;
    const blocked = S.settings().blocked.some((b) => b.toLowerCase() === m.from.email.toLowerCase());
    const many = [...m.to, ...m.cc].filter((a) => !S.isMe(a)).length + (S.isMe(m.from) ? 0 : 1) > 1;
    const items = [
      { html: `${PM.icon('reply', 16, 'jm-ic')} Reply`, action: () => T.reply('reply', m.id) },
      many ? { html: `${PM.icon('replyAll', 16, 'jm-ic')} Reply to all`, action: () => T.reply('replyall', m.id) } : null,
      { html: `${PM.icon('forward', 16, 'jm-ic')} Forward`, action: () => T.reply('forward', m.id) },
      { label: 'Filter messages like this', action: () => PM.searchUI.openAdvanced({ from: m.from.email }, true) },
      { label: 'Print', action: () => T.print(app.route.threadId) },
      { sep: true },
      { label: 'Delete this message', action: () => {
        const undo = S.msgOp(m.id, 'trash');
        UI.notify('The message has been moved to the Trash.', { undo });
        if (!S.thread(app.route.threadId, app.scope())) app.go(app.listHash(app.route));
      } },
      S.isMe(m.from) ? null : { label: blocked ? `Unblock "${fromName}"` : `Block "${fromName}"`, action: () => blockSender(m, blocked) },
      { label: 'Report spam', action: () => { const undo = S.msgOp(m.id, 'spam'); UI.notify('The message has been marked as spam.', { undo }); if (!S.thread(app.route.threadId, app.scope())) app.go(app.listHash(app.route)); } },
      { label: 'Report phishing', action: () => { S.msgOp(m.id, 'spam'); UI.notify('Thanks for reporting this message. The message has been moved to Spam.'); if (!S.thread(app.route.threadId, app.scope())) app.go(app.listHash(app.route)); } },
      { label: 'Show original', action: () => showOriginal(m) },
      { sep: true },
      { label: 'Mark unread from here', action: () => {
        const th = S.thread(app.route.threadId, app.scope());
        let on = false;
        th.msgs.forEach((x) => { if (x.id === m.id) on = true; if (on && !S.has(x, 'DRAFT')) S.msgOp(x.id, 'unread'); });
        app.go(app.listHash(app.route));
      } },
    ];
    UI.menu(anchor, items, { align: 'right', minWidth: 200 });
  }

  function blockSender(m, unblock) {
    const email = m.from.email;
    if (unblock) {
      S.setSettings({ blocked: S.settings().blocked.filter((b) => b.toLowerCase() !== email.toLowerCase()) });
      UI.notify(`${U.esc(email)} has been unblocked.`);
      return;
    }
    UI.confirm(`Block <b>${U.esc(email)}</b>?<br><br>Future messages from this sender will be sent to Spam.`, { title: 'Block this email address', ok: 'Block' }).then((ok) => {
      if (!ok) return;
      S.setSettings({ blocked: [...S.settings().blocked, email] });
      UI.notify(`You have blocked ${U.esc(email)}. New messages from this sender will be sent to Spam.`, { links: [{ label: 'Unblock', action: () => S.setSettings({ blocked: S.settings().blocked.filter((b) => b !== email) }) }] });
    });
  }

  function showOriginal(m) {
    const hdr = (list) => list.map((a) => (a.name ? `${a.name} <${a.email}>` : a.email)).join(', ');
    const d = new Date(m.date);
    const raw = [
      `Delivered-To: ${S.me().email}`,
      `Message-ID: <${m.id}@${m.from.email.split('@')[1]}>`,
      `Date: ${d.toUTCString().replace('GMT', '+0000')}`,
      `From: ${hdr([m.from])}`,
      `To: ${hdr(m.to)}`,
      m.cc.length ? `Cc: ${hdr(m.cc)}` : null,
      `Subject: ${m.subject}`,
      'MIME-Version: 1.0',
      'Content-Type: text/html; charset="UTF-8"',
      '',
      m.html,
    ].filter((x) => x != null).join('\n');
    UI.dialog({
      title: 'Original Message', width: 760, className: 'dlg-orig',
      body: `<table class="orig-t"><tr><td>Message ID</td><td>&lt;${U.esc(m.id)}@${U.esc(m.from.email.split('@')[1])}&gt;</td></tr><tr><td>Created at:</td><td>${U.esc(U.fullDate(m.date))}</td></tr><tr><td>From:</td><td>${U.esc(hdr([m.from]))}</td></tr><tr><td>To:</td><td>${U.esc(hdr(m.to))}</td></tr><tr><td>Subject:</td><td>${U.esc(m.subject)}</td></tr></table><pre class="orig-raw">${U.esc(raw)}</pre>`,
      buttons: [{ label: 'Download Original', action: () => { U.download('original_msg.eml', URL.createObjectURL(new Blob([raw], { type: 'message/rfc822' }))); return false; } }, { label: 'Close', primary: true }],
    });
  }

  function details(anchor, m) {
    const row = (k, v) => (v ? `<tr><td class="dt-k">${k}:</td><td class="dt-v">${v}</td></tr>` : '');
    const addr = (list) => list.map((a) => `${a.name ? `<b>${U.esc(a.name)}</b> ` : ''}&lt;${U.esc(a.email)}&gt;`).join(',<br>');
    const dom = m.from.email.split('@')[1];
    const el = U.h(`<div class="det-pop"><table>
      ${row('from', addr([m.from]))}${m.replyTo ? row('reply-to', addr([m.replyTo])) : ''}${row('to', addr(m.to))}${row('cc', addr(m.cc))}${S.isMe(m.from) || (m.bcc || []).some((a) => S.isMe(a)) ? row('bcc', addr(m.bcc || [])) : ''}
      ${row('date', U.esc(U.fullDate(m.date)))}${row('subject', U.esc(m.subject))}${row('mailed-by', U.esc(dom))}${S.isMe(m.from) ? '' : row('signed-by', U.esc(dom))}
      ${S.has(m, 'IMPORTANT') ? row(PM.impIcon(true), 'Important mainly because of the people in the conversation.') : ''}</table></div>`);
    UI.popup(anchor, el, { gap: 4 });
  }

  T.bind = function (el) {
    el.addEventListener('click', (e) => {
      if (el.className !== 'view-thread') return;
      const app = PM.app;
      const key = app.route.threadId;
      const scope = app.scope();
      const chipX = e.target.closest('.tl-x');
      if (chipX) {
        const id = chipX.dataset.rm;
        let undo;
        if (id === 'INBOX') { undo = S.archive([key], scope); UI.notify('The conversation has been archived.', { undo }); app.afterRemove(); }
        else if (id === 'MUTED') { undo = S.unmute([key], scope); UI.notify('The conversation has been unmuted.', { undo }); }
        else if (id === 'SPAM') { undo = S.notSpam([key]); UI.notify('The conversation has been unmarked as spam and moved to the Inbox.', { undo }); app.afterRemove(); }
        else if (id === 'TRASH') { undo = S.untrash([key]); UI.notify('The conversation has been moved to the Inbox.', { undo }); app.afterRemove(); }
        else { const l = S.label(id); undo = S.setLabel([key], id, false, scope); UI.notify(`The conversation has been removed from "${U.esc(l.name)}".`, { undo }); if (app.route.view.label === id) app.afterRemove(); }
        return;
      }
      const ta = e.target.closest('[data-ta]');
      if (ta) {
        e.preventDefault();
        const a = ta.dataset.ta;
        if (a === 'reply' || a === 'replyall' || a === 'forward') return T.reply(a);
        if (a === 'print') return T.print(key);
        if (a === 'newwin') return T.print(key, true);
        if (a === 'notspam') return app.act('notSpam');
        if (a === 'imp') {
          const th = S.thread(key, scope);
          const undo = S.setImportant([key], !th.important, scope);
          UI.notify(th.important ? 'The conversation has been marked as not important.' : 'The conversation has been marked as important.', { undo });
          return;
        }
        if (a === 'toggleAll') {
          const th = S.thread(key, scope);
          const msgs = th.msgs.filter((m) => !S.has(m, 'DRAFT'));
          const lastId = msgs[msgs.length - 1].id;
          const all = msgs.every((m) => (T.exp.has(m.id) ? T.exp.get(m.id) : m.id === lastId || T.unreadAtOpen.has(m.id) || msgs.length === 1));
          msgs.forEach((m) => T.exp.set(m.id, !all || (msgs.length === 1)));
          if (!all) T.showAll.add(key);
          app.schedule();
          return;
        }
        return;
      }
      const att = e.target.closest('.att');
      if (att) {
        const m = S.msg(att.dataset.mid);
        const a = m && m.attachments.find((x) => x.id === att.dataset.aid);
        if (!a) return;
        if (e.target.closest('[data-ab="dl"]')) PM.att.download(a, m);
        else PM.att.preview(a, m, m.attachments);
        return;
      }
      const all = e.target.closest('.att-all');
      if (all) { e.preventDefault(); const m = S.msg(all.dataset.mid); m.attachments.forEach((a, i) => setTimeout(() => PM.att.download(a, m), i * 250)); return; }
      const ma = e.target.closest('[data-ma]');
      const msgEl = e.target.closest('.msg');
      if (ma) {
        const a = ma.dataset.ma;
        if (a === 'showall') { T.showAll.add(key); app.schedule(); return; }
        const m = msgEl && S.msg(msgEl.dataset.mid);
        if (!m) return;
        if (a === 'star') { UI.hideTip(); S.msgOp(m.id, S.has(m, 'STARRED') ? 'unstar' : 'star'); return; }
        if (a === 'reply') return T.reply(S.settings().replyAll ? 'replyall' : 'reply', m.id);
        if (a === 'more') return msgMenu(ma, m);
        if (a === 'details') return details(ma, m);
        if (a === 'trim') { if (T.trimmed.has(m.id)) T.trimmed.delete(m.id); else T.trimmed.add(m.id); app.schedule(); return; }
      }
      if (msgEl && !e.target.closest('a,button,.msg-body')) {
        const id = msgEl.dataset.mid;
        const exp = msgEl.classList.contains('exp');
        if (exp && window.getSelection && String(window.getSelection())) return;
        T.exp.set(id, !exp);
        app.schedule();
      }
      if (msgEl && msgEl.classList.contains('col')) { T.exp.set(msgEl.dataset.mid, true); app.schedule(); }
    });

    /* Contact hover card on sender names */
    let hcTimer = null, hcHide = null, hcEl = null, hcFor = null;
    const hideCard = () => { clearTimeout(hcTimer); if (hcEl) { hcEl.remove(); hcEl = null; hcFor = null; } };
    el.addEventListener('mouseover', (e) => {
      if (el.className !== 'view-thread') return;
      const t = e.target.closest('.msg-name, .msg-email, .msg.col .msg-from');
      if (!t) return;
      clearTimeout(hcHide);
      if (hcFor === t) return;
      clearTimeout(hcTimer);
      hcTimer = setTimeout(() => {
        const m = S.msg(t.closest('.msg').dataset.mid);
        if (!m) return;
        hideCard();
        hcFor = t;
        const a = m.from;
        const c = S.contactByEmail(a.email);
        const me = S.isMe(a);
        hcEl = U.h(`<div class="hc pm-popup"><div class="hc-top">${UI.avatar(a, 64)}<div class="hc-info"><div class="hc-name">${U.esc(a.name || a.email)}</div><div class="hc-email">${U.esc(a.email)}</div>${c && c.company ? `<div class="hc-co">${U.esc(c.company)}</div>` : ''}${c && c.phone ? `<div class="hc-co">${U.esc(c.phone)}</div>` : ''}</div></div>
          <div class="hc-foot">${me ? '' : `<button class="jb" data-hc="mail">${PM.icon('mail', 16)}</button>${c && c.group === 'my' ? `<button class="jb" data-hc="chat">${PM.icon('chat', 16)}</button><button class="jb tb-text" data-hc="view">View contact</button>` : '<button class="jb tb-text" data-hc="add">Add to contacts</button>'}`}<a href="#search/${PM.app.enc('from:' + a.email)}" class="hc-more" data-hc="emails">Emails</a></div></div>`);
        hcEl.addEventListener('mouseenter', () => clearTimeout(hcHide));
        hcEl.addEventListener('mouseleave', () => { hcHide = setTimeout(hideCard, 300); });
        hcEl.addEventListener('click', (ev) => {
          const b = ev.target.closest('[data-hc]');
          if (!b) return;
          const k = b.dataset.hc;
          hideCard();
          if (k === 'mail') PM.compose.open({ to: [{ name: a.name, email: a.email }] });
          else if (k === 'chat') PM.chat.open(c);
          else if (k === 'view') PM.app.go('#contacts/my/' + c.id);
          else if (k === 'add') { S.ensureContact(a); const nc = S.contactByEmail(a.email); nc.group = 'my'; nc.name = nc.name || a.name; S.changed({ contacts: true }); UI.notify(`${U.esc(a.name || a.email)} has been added to your contacts.`); }
        });
        UI.position(hcEl, t.getBoundingClientRect(), { gap: 6 });
      }, 550);
    });
    el.addEventListener('mouseout', (e) => {
      const t = e.target.closest('.msg-name, .msg-email, .msg.col .msg-from');
      if (!t || t.contains(e.relatedTarget)) return;
      clearTimeout(hcTimer);
      hcHide = setTimeout(hideCard, 300);
    });
    el.addEventListener('mousedown', (e) => { if (hcEl && !hcEl.contains(e.target)) hideCard(); });
    PM.bus.on('change', () => { if (hcFor && !document.body.contains(hcFor)) hideCard(); });
  };
})(window.PM);
