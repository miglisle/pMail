/* pMail — themes */
(function (PM) {
  'use strict';
  const U = PM.util, UI = PM.ui, S = PM.store;
  const LIST = [
    { id: 'light', name: 'Light', sw: '#f1f1f1' },
    { id: 'softgray', name: 'Soft Gray', sw: '#d9d9d9' },
    { id: 'dark', name: 'Dark', sw: '#2d2d2d', dark: true },
    { id: 'contrast', name: 'High Contrast', sw: '#000', dark: true },
    { id: 'ocean', name: 'Ocean', img: 'linear-gradient(160deg,#0f2027 0%,#203a43 45%,#2c5364 100%)', dark: true },
    { id: 'forest', name: 'Forest', img: 'linear-gradient(160deg,#134e5e 0%,#2f7a4f 55%,#71b280 100%)', dark: true },
    { id: 'sunset', name: 'Sunset', img: 'linear-gradient(160deg,#ff7e5f 0%,#feb47b 100%)' },
    { id: 'lavender', name: 'Lavender', img: 'linear-gradient(160deg,#a18cd1 0%,#fbc2eb 100%)' },
    { id: 'aurora', name: 'Aurora', img: 'radial-gradient(ellipse at 20% 0%,#3ad59f 0%,transparent 55%),radial-gradient(ellipse at 80% 10%,#6b5bff 0%,transparent 50%),linear-gradient(180deg,#0b1026,#152048)', dark: true },
    { id: 'desert', name: 'Desert', img: 'linear-gradient(180deg,#f6d365 0%,#fda085 60%,#c06c4e 100%)' },
    { id: 'graphite', name: 'Graphite', img: 'repeating-linear-gradient(45deg,#3a3a3a 0 2px,#333 2px 9px)', dark: true },
    { id: 'sky', name: 'Clear Sky', img: 'linear-gradient(180deg,#56ccf2 0%,#a5e1f7 60%,#e9f7fd 100%)' },
  ];
  PM.themes = {
    list: LIST,
    get: (id) => LIST.find((t) => t.id === id) || LIST[0],
    dialog() {
      const cur = S.settings().theme;
      const body = U.h(`<div class="themes"><div class="th-grid">${LIST.map((t) => `<div class="th-tile${t.id === cur ? ' sel' : ''}" data-id="${t.id}" role="button" tabindex="0"><span class="th-sw" style="background:${t.img || t.sw}"></span><span class="th-n">${t.name}</span></div>`).join('')}</div></div>`);
      const before = cur;
      body.addEventListener('click', (e) => {
        const t = e.target.closest('.th-tile');
        if (!t) return;
        U.$$('.th-tile', body).forEach((x) => x.classList.toggle('sel', x === t));
        S.setSettings({ theme: t.dataset.id });
      });
      UI.dialog({
        title: 'Pick your theme', body, width: 640,
        buttons: [{ label: 'Save', primary: true }, { label: 'Cancel', action: () => { S.setSettings({ theme: before }); } }],
        onClose: (v) => { if (v === null) S.setSettings({ theme: before }); },
      });
    },
  };
})(window.PM);
