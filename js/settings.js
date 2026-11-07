/* pMail — Settings pages */
(function (PM) {
  'use strict';
  const U = PM.util, UI = PM.ui, S = PM.store;
  const SV = (PM.settingsView = {});
  const TABS = [['general', 'General'], ['labels', 'Labels'], ['inbox', 'Inbox'], ['accounts', 'Accounts and Import'], ['filters', 'Filters and Blocked Addresses'], ['fwdandpop', 'Forwarding and POP/IMAP'], ['chat', 'Chat'], ['labs', 'Labs'], ['offline', 'Offline'], ['themes', 'Themes']];

  const radio = (name, val, cur, label) => `<label class="rl"><input type="radio" name="${name}" value="${U.esc(val)}" ${String(cur) === String(val) ? 'checked' : ''}> ${label}</label>`;
  const select = (name, opts, cur) => `<select class="js" name="${name}">${opts.map((o) => { const [v, l] = Array.isArray(o) ? o : [o, o]; return `<option value="${U.esc(v)}" ${String(cur) === String(v) ? 'selected' : ''}>${U.esc(l)}</option>`; }).join('')}</select>`;
  const row = (label, desc, html, cls = '') => `<tr class="${cls}"><td class="set-l"><span class="set-lt">${label}</span>${desc ? `<div class="set-d">${desc}</div>` : ''}</td><td class="set-r">${html}</td></tr>`;
  const soon = () => UI.notify('This setting isn\'t available in the pMail demo.');

  SV.render = function (el, route, routeChanged) {
    const tab = TABS.find((t) => t[0] === route.tab) ? route.tab : 'general';
    if (!routeChanged && el.className === 'view-settings') {
      const cur = U.$('.set-body', el), sv = U.$('.set-save', el);
      if (cur && cur.dataset.tab === tab && sv && !sv.disabled) return; // don't clobber unsaved edits
    }
    const s = S.settings();
    let body = '', saveable = true;
    switch (tab) {
      case 'general': body = general(s); break;
      case 'labels': body = labels(s); saveable = false; break;
      case 'inbox': body = inbox(s); break;
      case 'accounts': body = accounts(); saveable = false; break;
      case 'filters': body = filters(s); saveable = false; break;
      case 'fwdandpop': body = fwd(s); break;
      case 'chat': body = `<table class="set-t">${row('Chat:', '', radio('chatOn', 'true', s.chatOn, 'Chat on') + radio('chatOn', 'false', s.chatOn, 'Chat off'))}</table>`; break;
      case 'labs': body = labs(s); break;
      case 'offline': body = `<table class="set-t">${row('pMail Offline:', '', `<div class="set-p">pMail keeps your whole mailbox on this device, so reading, searching, organizing and writing mail already work without a connection.</div><div class="set-p">Data is stored in this browser's local storage (about ${U.fileSize(JSON.stringify(S.raw()).length)}). Clearing site data removes it.</div>`)}</table>`; saveable = false; break;
      case 'themes': body = themesTab(s); saveable = false; break;
    }
    el.className = 'view-settings';
    el.innerHTML = `<div class="settings">
      <div class="set-top"><h2 class="set-title">Settings</h2></div>
      <div class="set-tabs">${TABS.map(([id, name]) => (id === tab ? `<span class="set-tab sel">${name}</span>` : `<a class="set-tab" href="#settings/${id}">${name}</a>`)).join('')}</div>
      <form class="set-body" data-tab="${tab}" autocomplete="off">${body}</form>
      ${saveable ? '<div class="set-btns"><button class="jb set-save" disabled>Save Changes</button><button class="jb set-cancel" disabled>Cancel</button></div>' : ''}
    </div>`;
    bind(el, tab);
  };

  function general(s) {
    const pic = UI.avatar(S.me(), 48);
    const vac = s.vacation;
    const font = [['arial,helvetica,sans-serif', 'Sans Serif'], ['times new roman,serif', 'Serif'], ['monospace,monospace', 'Fixed Width'], ['verdana,sans-serif', 'Verdana'], ['georgia,serif', 'Georgia'], ['tahoma,sans-serif', 'Tahoma']];
    return `<table class="set-t">
      ${row('Language:', '', `pMail display language: ${select('language', ['English (US)', 'English (UK)', 'Español', 'Français', 'Deutsch', 'Italiano', 'Português (Brasil)', 'Nederlands', 'Polski', '日本語'], s.language)} <a href="#" data-x="soon">Change language settings for other products</a>`)}
      ${row('Phone numbers:', '', `Default country code: ${select('country', ['United States', 'Canada', 'United Kingdom', 'Australia', 'India', 'Germany', 'France', 'Brazil', 'Japan', 'Mexico'], s.country)}`)}
      ${row('Maximum page size:', '', `Show ${select('pageSize', [10, 15, 20, 25, 50, 100], s.pageSize)} conversations per page<br>Show ${select('contactsPageSize', [50, 100, 250], s.contactsPageSize)} contacts per page`)}
      ${row('Undo Send:', '', `<label class="cbl"><input type="checkbox" name="undoOn" ${s.undoSend > 0 ? 'checked' : ''}> Enable Undo Send</label><br>Send cancellation period: ${select('undoSend', [5, 10, 20, 30], s.undoSend || 10)} seconds`)}
      ${row('Default reply behavior:', '<a href="#" data-x="help">Learn more</a>', radio('replyAll', 'false', s.replyAll, 'Reply') + radio('replyAll', 'true', s.replyAll, 'Reply all'))}
      ${row('Send and Archive:', '<a href="#" data-x="help">Learn more</a>', radio('sendArchive', 'true', s.sendArchive, 'Show "Send &amp; Archive" button in reply') + radio('sendArchive', 'false', s.sendArchive, 'Hide "Send &amp; Archive" button in reply'))}
      ${row('Default text style:', '(Use the \'Remove Formatting\' button on the toolbar to reset the default text style)', `${select('fontFamily', font, s.fontFamily)} ${select('fontSize', [['small', 'Small'], ['normal', 'Normal'], ['large', 'Large'], ['huge', 'Huge']], s.fontSize)}<div class="set-preview" style="font-family:${s.fontFamily}">This is what your body text will look like.</div>`)}
      ${row('Conversation View:', '(sets whether emails of the same topic are grouped together)', radio('conversationView', 'true', s.conversationView, 'Conversation view on') + radio('conversationView', 'false', s.conversationView, 'Conversation view off'))}
      ${row('Desktop Notifications:', '(allows pMail to display popup notifications on your desktop when new email messages arrive)<br><a href="#" data-x="notif">Click here to enable desktop notifications for pMail.</a>', radio('notifications', 'all', s.notifications, 'New mail notifications on') + radio('notifications', 'important', s.notifications, 'Important mail notifications on') + radio('notifications', 'off', s.notifications, 'Mail notifications off'))}
      ${row('Keyboard shortcuts:', '<a href="#" data-x="keys">Learn more</a>', radio('shortcuts', 'false', s.shortcuts, 'Keyboard shortcuts off') + radio('shortcuts', 'true', s.shortcuts, 'Keyboard shortcuts on'))}
      ${row('Button labels:', '', radio('buttonLabels', 'icons', s.buttonLabels, 'Icons') + radio('buttonLabels', 'text', s.buttonLabels, 'Text'))}
      ${row('My picture:', '', `<div class="set-pic">${pic}<div>Your picture is shown when you send messages and in chat.<br><a href="#" data-x="pic">Change picture</a>${s.picture ? ' · <a href="#" data-x="nopic">Remove picture</a>' : ''}</div></div>`)}
      ${row('Create contacts for auto-complete:', '', radio('autoContacts', 'true', s.autoContacts, 'When I send a message to a new person, add them to Other Contacts so that I can auto-complete to them next time') + radio('autoContacts', 'false', s.autoContacts, 'I\'ll add contacts myself'))}
      ${row('Signature:', '(appended at the end of all outgoing messages)', radio('signatureOn', 'false', s.signatureOn, 'No signature') + `<div class="set-sig">${radio('signatureOn', 'true', s.signatureOn, '')}<textarea class="ji" name="signature" rows="4">${U.esc(s.signature)}</textarea></div><label class="cbl"><input type="checkbox" name="sigBeforeQuote" ${s.sigBeforeQuote ? 'checked' : ''}> Insert this signature before quoted text in replies and remove the "--" line that precedes it.</label>`)}
      ${row('Personal level indicators:', '', radio('levelIndicators', 'false', s.levelIndicators, '<b>No indicators</b>') + radio('levelIndicators', 'true', s.levelIndicators, '<b>Show indicators</b> - Display an arrow ( › ) by messages sent to my address (not a mailing list), and a double arrow ( » ) by messages sent only to me.'))}
      ${row('Snippets:', '', radio('snippets', 'true', s.snippets, '<b>Show snippets</b> - Show snippets of the message (like Google web search!).') + radio('snippets', 'false', s.snippets, '<b>No snippets</b> - Show subject only.'))}
      ${row('Vacation responder:', '(sends an automated reply to incoming messages. If a contact sends you several messages, this automated reply will be sent at most once every 4 days)', `${radio('vacOn', 'false', vac.on, 'Vacation responder off')}${radio('vacOn', 'true', vac.on, 'Vacation responder on')}
        <table class="vac"><tr><td>First day:</td><td><input class="ji" type="date" name="vacStart" value="${U.esc(vac.start)}"></td><td><label class="cbl"><input type="checkbox" name="vacEndOn" ${vac.end ? 'checked' : ''}> Last day:</label> <input class="ji" type="date" name="vacEnd" value="${U.esc(vac.end)}"></td></tr>
        <tr><td>Subject:</td><td colspan="2"><input class="ji" name="vacSubject" value="${U.esc(vac.subject)}" style="width:100%"></td></tr>
        <tr><td>Message:</td><td colspan="2"><textarea class="ji" name="vacMessage" rows="5" style="width:100%">${U.esc(vac.message)}</textarea></td></tr>
        <tr><td></td><td colspan="2"><label class="cbl"><input type="checkbox" name="vacContacts" ${vac.contactsOnly ? 'checked' : ''}> Only send a response to people in my Contacts</label></td></tr></table>`)}
      ${row('Demo mailbox:', '(pMail stores everything in this browser)', `<button type="button" class="jb" data-x="reset">Reset demo mailbox</button> <button type="button" class="jb" data-x="export">Export my data</button>`)}
    </table>`;
  }

  function collectGeneral(form) {
    const f = new FormData(form);
    const b = (k) => f.get(k) === 'true';
    return {
      language: f.get('language'), country: f.get('country'), pageSize: +f.get('pageSize'), contactsPageSize: +f.get('contactsPageSize'),
      undoSend: f.get('undoOn') ? +f.get('undoSend') : 0, replyAll: b('replyAll'), sendArchive: b('sendArchive'),
      fontFamily: f.get('fontFamily'), fontSize: f.get('fontSize'), conversationView: b('conversationView'),
      notifications: f.get('notifications'), shortcuts: b('shortcuts'), buttonLabels: f.get('buttonLabels'),
      autoContacts: b('autoContacts'), signatureOn: b('signatureOn'), signature: f.get('signature'), sigBeforeQuote: !!f.get('sigBeforeQuote'),
      levelIndicators: b('levelIndicators'), snippets: b('snippets'),
      vacation: { on: b('vacOn'), start: f.get('vacStart'), end: f.get('vacEndOn') ? f.get('vacEnd') : '', subject: f.get('vacSubject'), message: f.get('vacMessage'), contactsOnly: !!f.get('vacContacts') },
    };
  }

  function labels(s) {
    const lnk = (kind, key, cur, opts) => opts.map(([v, l]) => (cur === v ? `<b>${l}</b>` : `<a href="#" data-lv="${kind}" data-key="${key}" data-val="${v}">${l}</a>`)).join(' ');
    const SH = [['show', 'show'], ['hide', 'hide']];
    const SHU = [['show', 'show'], ['hide', 'hide'], ['unread', 'show if unread']];
    const sys = [['Inbox', null], ['Starred', 'starred', SH], ['Important', 'important', SH], ['Chats', 'chats', SH], ['Sent Mail', 'sent', SH], ['Drafts', 'drafts', SHU], ['All Mail', 'all', SH], ['Spam', 'spam', SHU], ['Trash', 'trash', SH]];
    const total = {};
    for (const id in S.raw().messages) { const m = S.raw().messages[id]; m.labels.forEach((l) => { if (l[0] === 'L') (total[l] = total[l] || new Set()).add(m.threadId); }); }
    return `<table class="set-t set-lab">
      <tr class="lab-h"><td>System labels</td><td>Show in label list</td><td></td></tr>
      ${sys.map(([n, k, o]) => `<tr><td class="lab-n">${n}</td><td>${k ? lnk('sys', k, s.sysLabels[k], o) : '<b>show</b>'}</td><td></td></tr>`).join('')}
      <tr class="lab-h"><td>Categories</td><td>Show in label list</td><td></td></tr>
      <tr><td class="lab-n">Categories</td><td>${lnk('sys', 'categories', s.sysLabels.categories, SH)}</td><td></td></tr>
      ${['social', 'promotions', 'updates', 'forums'].map((c) => `<tr><td class="lab-n" style="padding-left:24px">${PM.app.CAT_NAMES[c]}</td><td>${lnk('cat', c, s.catLabels[c], SH)}</td><td></td></tr>`).join('')}
      <tr class="lab-h"><td>Labels</td><td>Show in label list</td><td>Actions</td></tr>
      <tr><td colspan="3"><button type="button" class="jb" data-x="newlabel">Create new label</button></td></tr>
      ${S.labels().map((l) => `<tr><td class="lab-n" style="padding-left:${8 + (l.name.split('/').length - 1) * 16}px">${l.color ? `<span class="nl-sq" style="background:${l.color.bg}"></span>` : ''}${U.esc(l.name.split('/').pop())}<span class="lab-c">${U.plural((total[l.id] || new Set()).size, 'conversation')}</span></td><td>${lnk('label', l.id, l.show, SHU)}</td><td><a href="#" data-x="rmlabel" data-id="${l.id}">remove</a> <a href="#" data-x="editlabel" data-id="${l.id}">edit</a></td></tr>`).join('')}
      <tr><td colspan="3" class="set-d">Note: Removing a label will not remove the messages with that label.</td></tr>
    </table>`;
  }

  function inbox(s) {
    const cats = ['personal', 'social', 'promotions', 'updates', 'forums'];
    return `<table class="set-t">
      ${row('Inbox type:', '', select('inboxType', [['default', 'Default'], ['important', 'Important first'], ['unread', 'Unread first'], ['starred', 'Starred first'], ['priority', 'Priority Inbox']], s.inboxType))}
      ${row('Categories:', '<a href="#" data-x="help">Learn more</a>', `${cats.map((c) => `<label class="cbl"><input type="checkbox" name="cat_${c}" ${c === 'personal' || s.categories[c] ? 'checked' : ''} ${c === 'personal' ? 'disabled' : ''}> ${PM.app.CAT_NAMES[c]}</label>`).join('<br>')}
        <div class="set-p"><b>Starred messages</b><br><label class="cbl"><input type="checkbox" name="starredInPrimary" ${s.starredInPrimary ? 'checked' : ''}> Include starred in Primary</label></div>
        <div class="set-d">Choose which message categories to show as inbox tabs. Other messages will appear in the Primary tab.<br>Deselect all categories to go back to your old inbox. Tabs appear only with the Default inbox type.</div>`)}
      ${row('Importance markers:', '', `${radio('importanceMarkers', 'true', s.importanceMarkers, 'Show markers - Show a marker ( ' + PM.impIcon(true) + ' ) by messages marked as important.')}${radio('importanceMarkers', 'false', s.importanceMarkers, 'No markers')}`)}
      ${row('Filtered mail:', '', `${radio('override', 'yes', 'no', 'Override filters - Include important messages in the inbox that may have been filtered out.')}${radio('override', 'no', 'no', 'Don\'t override filters')}`)}
    </table>`;
  }
  function collectInbox(form) {
    const f = new FormData(form);
    return {
      inboxType: f.get('inboxType'),
      categories: { social: !!f.get('cat_social'), promotions: !!f.get('cat_promotions'), updates: !!f.get('cat_updates'), forums: !!f.get('cat_forums') },
      starredInPrimary: !!f.get('starredInPrimary'), importanceMarkers: f.get('importanceMarkers') === 'true',
    };
  }

  function accounts() {
    const me = S.me();
    const gb = (S.storageBytes() / 1e9).toFixed(2);
    return `<table class="set-t">
      ${row('Change account settings:', '', '<a href="#" data-x="soon">Change password</a><br><a href="#" data-x="soon">Change password recovery options</a><br><a href="#" data-x="soon">Other account settings</a>')}
      ${row('Import mail and contacts:', '<a href="#" data-x="help">Learn more</a>', 'Import from another email account.<br><a href="#" data-x="soon">Import mail and contacts</a>')}
      ${row('Send mail as:', '(Use pMail to send from your other email addresses)', `<table class="sendas"><tr><td><b>${U.esc(me.name)}</b> &lt;${U.esc(me.email)}&gt;</td><td><a href="#" data-x="editname">edit info</a></td></tr></table><a href="#" data-x="soon">Add another email address you own</a>`)}
      ${row('Check mail from other accounts:', '', '<a href="#" data-x="soon">Add a mail account you own</a>')}
      ${row('Grant access to your account:', '(Allow others to read and send mail on your behalf)', '<a href="#" data-x="soon">Add another account</a><br>' + radio('mark', 'read', 'read', 'Mark conversation as read when opened by others') + radio('mark', 'unread', 'read', 'Leave conversation unread when opened by others'))}
      ${row('Add additional storage:', '', `You are currently using ${gb} GB (${Math.round((gb / 15) * 100)}%) of your 15 GB.<br>Need more space? <a href="#" data-x="soon">Purchase additional storage</a>`)}
    </table>`;
  }

  function describeActions(a) {
    const out = [];
    if (a.skipInbox) out.push('Skip Inbox');
    if (a.markRead) out.push('Mark as read');
    if (a.star) out.push('Star it');
    if (a.label) { const l = S.label(a.label); if (l) out.push(`Apply label "${U.esc(l.name)}"`); }
    if (a.delete) out.push('Delete it');
    if (a.neverSpam) out.push('Never send it to Spam');
    if (a.important === 'always') out.push('Mark it as important');
    if (a.important === 'never') out.push('Never mark it as important');
    if (a.category) out.push(`Categorize as ${PM.app.CAT_NAMES[a.category]}`);
    return out.join(', ');
  }

  function filters(s) {
    const fs = S.filters();
    return `<div class="set-sec"><div class="set-p">The following filters are applied to all incoming mail:</div>
      <table class="filt-t">${fs.length ? fs.map((f) => `<tr><td><b>Matches:</b> ${U.esc(S.filterQuery(f.criteria))}<br><b>Do this:</b> ${describeActions(f.actions)}</td><td class="filt-a"><a href="#" data-x="editfilter" data-id="${f.id}">edit</a> <a href="#" data-x="delfilter" data-id="${f.id}">delete</a></td></tr>`).join('') : '<tr><td class="set-d">You don\'t have any filters yet.</td><td></td></tr>'}</table>
      <div class="set-p"><a href="#" data-x="newfilter">Create a new filter</a> &nbsp; <a href="#" data-x="importfilter">Import filters</a>${fs.length ? ' &nbsp; <a href="#" data-x="exportfilter">Export</a>' : ''}</div></div>
      <div class="set-sec"><div class="set-p">The following email addresses are blocked. Messages from these addresses will appear in Spam:</div>
      <table class="filt-t">${s.blocked.length ? s.blocked.map((b) => `<tr><td>${U.esc(b)}</td><td class="filt-a"><a href="#" data-x="unblock" data-v="${U.esc(b)}">unblock</a></td></tr>`).join('') : '<tr><td class="set-d">You currently have no blocked addresses.</td><td></td></tr>'}</table>
      <div class="set-d">To block an address, open a message from that sender and choose <i>Block</i> from the <span class="caret"></span> menu next to Reply.</div></div>`;
  }

  function fwd(s) {
    const f = s.forwarding;
    return `<table class="set-t">
      ${row('Forwarding:', '<a href="#" data-x="help">Learn more</a>', f.address ? `${radio('fwdOn', 'off', f.on ? 'on' : 'off', 'Disable forwarding')}${radio('fwdOn', 'on', f.on ? 'on' : 'off', `Forward a copy of incoming mail to <b>${U.esc(f.address)}</b> (pending verification)`)}<br><a href="#" data-x="rmfwd">Remove address</a>` : '<button type="button" class="jb" data-x="addfwd">Add a forwarding address</button>')}
      ${row('POP download:', '<a href="#" data-x="help">Learn more</a>', `<b>1. Status: POP is ${f.pop === 'disabled' ? 'disabled' : 'enabled'}</b><br>${radio('pop', 'all', f.pop, 'Enable POP for <b>all mail</b>')}${radio('pop', 'now', f.pop, 'Enable POP for <b>mail that arrives from now on</b>')}${radio('pop', 'disabled', f.pop, 'Disable POP')}`)}
      ${row('IMAP access:', '(access pMail from other clients using IMAP)<br><a href="#" data-x="help">Learn more</a>', `<b>Status: IMAP is ${f.imap === 'enabled' ? 'enabled' : 'disabled'}</b><br>${radio('imap', 'enabled', f.imap, 'Enable IMAP')}${radio('imap', 'disabled', f.imap, 'Disable IMAP')}<div class="set-d">pMail is a local demo, so these settings are saved but no server is started.</div>`)}
    </table>`;
  }

  function labs(s) {
    const lab = (key, name, desc) => `<tr><td class="lab-name"><b>${name}</b><div class="set-d">${desc}</div></td><td class="lab-opt">${radio('lab_' + key, 'true', s.labs[key], 'Enable')}${radio('lab_' + key, 'false', s.labs[key], 'Disable')}</td></tr>`;
    return `<div class="set-p">pMail Labs is a testing ground for experimental features that aren't quite ready for primetime. They may change, break or disappear at any time.</div>
      <table class="set-t labs-t">${lab('autoAdvance', 'Auto-advance', 'Automatically go to the next conversation instead of your inbox after you delete, archive, or mute a conversation.')}
      ${lab('markReadButton', 'Mark As Read Button', 'Mark messages as read with one click instead of using the "More" menu.')}
      ${lab('unreadIcon', 'Unread message icon', 'See how many unread messages are in your inbox with a quick glance at the browser tab icon.')}</table>`;
  }

  function themesTab(s) {
    return `<div class="set-p">Choose a theme to change how pMail looks.</div><div class="themes"><div class="th-grid">${PM.themes.list.map((t) => `<div class="th-tile${t.id === s.theme ? ' sel' : ''}" data-theme="${t.id}" role="button" tabindex="0"><span class="th-sw" style="background:${t.img || t.sw}"></span><span class="th-n">${t.name}</span></div>`).join('')}</div></div>`;
  }

  /* ---------- events ---------- */
  function bind(el, tab) {
    const form = U.$('.set-body', el);
    const save = U.$('.set-save', el), cancel = U.$('.set-cancel', el);
    const dirty = () => { if (save) { save.disabled = false; cancel.disabled = false; } };
    form.addEventListener('input', dirty);
    form.addEventListener('change', dirty);
    form.addEventListener('submit', (e) => e.preventDefault());
    const fsel = U.$('[name=fontFamily]', form);
    if (fsel) fsel.addEventListener('change', () => (U.$('.set-preview', form).style.fontFamily = fsel.value));
    const fsize = U.$('[name=fontSize]', form);
    if (fsize) fsize.addEventListener('change', () => (U.$('.set-preview', form).style.fontSize = { small: '11px', normal: '13px', large: '16px', huge: '24px' }[fsize.value]));
    if (U.$('textarea[name=signature]', form)) U.$('textarea[name=signature]', form).addEventListener('focus', () => { U.$('input[name=signatureOn][value=true]', form).checked = true; dirty(); });
    if (save) save.addEventListener('click', () => {
      let patch = {};
      if (tab === 'general') patch = collectGeneral(form);
      else if (tab === 'inbox') patch = collectInbox(form);
      else if (tab === 'chat') patch = { chatOn: new FormData(form).get('chatOn') === 'true' };
      else if (tab === 'labs') { const f = new FormData(form); patch = { labs: { autoAdvance: f.get('lab_autoAdvance') === 'true', markReadButton: f.get('lab_markReadButton') === 'true', unreadIcon: f.get('lab_unreadIcon') === 'true' } }; }
      else if (tab === 'fwdandpop') { const f = new FormData(form); patch = { forwarding: { ...S.settings().forwarding, pop: f.get('pop'), imap: f.get('imap'), on: f.get('fwdOn') === 'on' } }; }
      if (patch.notifications && patch.notifications !== 'off' && window.Notification && Notification.permission === 'default') Notification.requestPermission();
      const convChanged = patch.conversationView != null && patch.conversationView !== S.settings().conversationView;
      S.setSettings(patch);
      if (convChanged) S.changed();
      UI.notify('Your preferences have been saved.');
      PM.app.go('#inbox');
    });
    if (cancel) cancel.addEventListener('click', () => PM.app.go('#inbox'));

    el.addEventListener('click', async (e) => {
      const lv = e.target.closest('[data-lv]');
      if (lv) {
        e.preventDefault();
        const { lv: kind, key, val } = lv.dataset;
        if (kind === 'sys') S.setSettings({ sysLabels: { [key]: val } });
        else if (kind === 'cat') S.setSettings({ catLabels: { [key]: val } });
        else S.updateLabel(key, { show: val });
        return;
      }
      const th = e.target.closest('[data-theme]');
      if (th) { S.setSettings({ theme: th.dataset.theme }); return; }
      const x = e.target.closest('[data-x]');
      if (!x) return;
      e.preventDefault();
      switch (x.dataset.x) {
        case 'soon': return soon();
        case 'help': return PM.app.help();
        case 'keys': return PM.shortcuts.help();
        case 'notif':
          if (!window.Notification) return UI.alert('Your browser doesn\'t support desktop notifications.');
          Notification.requestPermission().then((p) => UI.notify(p === 'granted' ? 'Desktop notifications are enabled.' : 'Desktop notifications were blocked by your browser.'));
          return;
        case 'pic': return SV.pickPicture();
        case 'nopic': return S.setSettings({ picture: '' });
        case 'reset': {
          const ok = await UI.confirm('Reset pMail? This deletes all your changes, sent mail, drafts, labels, filters and contacts on this device and restores the original demo mailbox.', { title: 'Reset demo mailbox', ok: 'Reset' });
          if (!ok) return;
          PM.compose.closeAll(false);
          S.reset();
          PM.app.go('#inbox');
          UI.notify('Your mailbox has been reset.');
          return;
        }
        case 'export': return U.download('pmail-export.json', URL.createObjectURL(new Blob([JSON.stringify(S.raw(), null, 2)], { type: 'application/json' })));
        case 'newlabel': return PM.app.newLabelDialog();
        case 'rmlabel': return PM.app.removeLabel(x.dataset.id);
        case 'editlabel': return PM.app.editLabelDialog(x.dataset.id);
        case 'newfilter': return PM.searchUI.openAdvanced({});
        case 'editfilter': { const f = S.filters().find((y) => y.id === x.dataset.id); return PM.searchUI.openAdvanced(f.criteria, true, f); }
        case 'delfilter': {
          const ok = await UI.confirm('Delete this filter?', { title: 'Confirm', ok: 'OK' });
          if (ok) { S.deleteFilter(x.dataset.id); UI.notify('The filter has been deleted.'); }
          return;
        }
        case 'exportfilter': return U.download('mailFilters.json', URL.createObjectURL(new Blob([JSON.stringify(S.filters(), null, 2)], { type: 'application/json' })));
        case 'importfilter': {
          const inp = U.h('<input type="file" accept=".json,application/json" hidden>');
          inp.addEventListener('change', async () => {
            try {
              const list = JSON.parse(await inp.files[0].text());
              (Array.isArray(list) ? list : []).forEach((f) => f.criteria && f.actions && S.saveFilter({ id: null, criteria: f.criteria, actions: f.actions }, false));
              UI.notify('Filters imported.');
            } catch (err) { UI.alert('That file doesn\'t contain pMail filters.'); }
          });
          document.body.appendChild(inp); inp.click(); setTimeout(() => inp.remove(), 60000);
          return;
        }
        case 'unblock': S.setSettings({ blocked: S.settings().blocked.filter((b) => b !== x.dataset.v) }); return UI.notify(`${U.esc(x.dataset.v)} has been unblocked.`);
        case 'editname': {
          const v = await UI.prompt({ title: 'Edit email address', label: 'Name:', value: S.me().name, ok: 'Save Changes' });
          if (v && v.trim()) { S.setMe({ name: v.trim() }); UI.notify('Your preferences have been saved.'); }
          return;
        }
        case 'addfwd': {
          const v = await UI.prompt({ title: 'Add a forwarding address', label: 'Please enter a new forwarding email address:', ok: 'Next' });
          if (!v) return;
          if (!U.isValidEmail(v)) return UI.alert('Please enter a valid email address.');
          S.setSettings({ forwarding: { ...S.settings().forwarding, address: v.trim(), on: false } });
          return UI.notify(`A confirmation code would be sent to ${U.esc(v.trim())} to verify permission. (Demo only — nothing is sent.)`);
        }
        case 'rmfwd': S.setSettings({ forwarding: { ...S.settings().forwarding, address: '', on: false } }); return;
      }
    });
  }

  SV.pickPicture = function () {
    const inp = U.h('<input type="file" accept="image/*" hidden>');
    inp.addEventListener('change', () => {
      const f = inp.files[0];
      if (!f) return;
      const img = new Image();
      img.onload = () => {
        const cv = document.createElement('canvas'); cv.width = cv.height = 192;
        const x = cv.getContext('2d');
        const s = Math.min(img.width, img.height);
        x.drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, 192, 192);
        S.setSettings({ picture: cv.toDataURL('image/jpeg', 0.85) });
        URL.revokeObjectURL(img.src);
        UI.notify('Your picture has been updated.');
      };
      img.src = URL.createObjectURL(f);
    });
    document.body.appendChild(inp);
    inp.click();
    setTimeout(() => inp.remove(), 60000);
  };
})(window.PM);
