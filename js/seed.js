/* pMail — demo mailbox. Every person, company and address here is fictional. */
(function (PM) {
  'use strict';
  const U = PM.util;

  const ME = { name: 'Pat Morgan', email: 'pat.morgan@pmail.com' };

  const C = {
    olivia: ['Olivia Carter', 'olivia.carter@lumenlabs.io', 'available', '(415) 555-0142', 'Lumen Labs'],
    noah: ['Noah Patel', 'noah.patel@lumenlabs.io', 'available', '(415) 555-0178', 'Lumen Labs'],
    mia: ['Mia Chen', 'mia.chen@lumenlabs.io', 'away', '(415) 555-0119', 'Lumen Labs'],
    ethan: ['Ethan Brooks', 'ethan.brooks@lumenlabs.io', 'offline', '(415) 555-0163', 'Lumen Labs'],
    liam: ['Liam Nguyen', 'liam.nguyen@pmail.com', 'available', '(510) 555-0184', ''],
    sofia: ['Sofia Ramirez', 'sofia.ramirez@pmail.com', 'available', '(510) 555-0136', ''],
    harper: ['Harper Kim', 'harperkim88@pmail.com', 'away', '(628) 555-0101', ''],
    lucas: ['Lucas Ferreira', 'lucas.ferreira@quillpost.net', 'offline', '(628) 555-0157', ''],
    mom: ['Linda Morgan', 'linda.morgan@quillpost.net', 'available', '(503) 555-0122', ''],
    sam: ['Sam Morgan', 'sam.morgan@pmail.com', 'offline', '(503) 555-0190', ''],
    amelia: ['Amelia Novak', 'amelia@novakstudio.design', 'offline', '', 'Novak Studio'],
    james: ["James O'Connor", 'james.oconnor@greenleafpm.com', 'offline', '(415) 555-0111', 'Greenleaf Property Management'],
    grace: ['Grace Okafor', 'grace.okafor@lumenlabs.io', 'away', '(415) 555-0170', 'Lumen Labs'],
    ben: ['Ben Adler', 'ben.adler@pmail.com', 'offline', '', ''],
    team: ['pMail Team', 'team@pmail.com'],
    orbit: ['Orbit', 'notify@orbit-social.net'],
    chirp: ['Chirp', 'no-reply@chirp.social'],
    linkfolio: ['Linkfolio', 'updates@linkfolio.work'],
    northwind: ['Northwind Outfitters', 'hello@northwind-outfitters.shop'],
    pantry: ['Urban Pantry', 'orders@urbanpantry.delivery'],
    stellar: ['Stellar Electronics', 'deals@stellar-electronics.store'],
    pathfinder: ['Pathfinder Travel', 'offers@pathfinder-travel.trip'],
    vine: ['Velvet & Vine', 'cellar@velvetandvine.wine'],
    fernbrook: ['Fernbrook Books', 'newsletter@fernbrookbooks.shop'],
    cobalt: ['Cobalt Fitness', 'members@cobaltfitness.club'],
    bank: ['Larkspur Bank', 'alerts@larkspurbank.finance'],
    gitforge: ['GitForge', 'notifications@gitforge.dev'],
    nimbus: ['Nimbus Drive', 'no-reply@nimbusdrive.cloud'],
    power: ['City Power & Light', 'billing@citypowerlight.energy'],
    parcel: ['Parcelwise', 'tracking@parcelwise.delivery'],
    brightwing: ['Brightwing Airlines', 'itinerary@brightwing.air'],
    harbor: ['Harborview Hotel', 'reservations@harborviewhotel.stay'],
    dental: ['Riverside Dental', 'appointments@riversidedental.care'],
    trail: ['Trail Runners Club', 'trail-runners@lists.groupmail.org'],
    brew: ['Home Brewers Collective', 'homebrew@lists.groupmail.org'],
    garden: ['OpenGarden Dev', 'opengarden-dev@lists.groupmail.org'],
    lotto: ['Prize Notification Center', 'winner-dept@claim-rewards-now.biz'],
    phish: ['Account Security Team', 'security@acc0unt-verify-alerts.co'],
    barrister: ['Barrister Mark Olu', 'mark.olu.chambers@freemailbox.top'],
    crypto: ['Crypto Wealth Insider', 'vip@moonshot-returns.money'],
    diet: ['SlimFast Secrets', 'offers@slim-today-now.club'],
  };

  const p = (k) => (k === 'me' ? { ...ME } : { name: C[k][0], email: C[k][1] });

  const sig = (name, title) => `<div style="color:#888">--<br>${name}${title ? '<br>' + title : ''}</div>`;
  const P = (...lines) => lines.map((l) => `<div>${l || '<br>'}</div>`).join('');

  /* --- Promo templates ------------------------------------------------- */
  const promo = (o) => `
<table cellpadding="0" cellspacing="0" width="100%" style="max-width:600px;margin:0 auto;font-family:Arial,Helvetica,sans-serif;border:1px solid #e3e3e3">
  <tr><td style="background:${o.bg};color:${o.fg || '#fff'};padding:22px 28px;font-size:22px;font-weight:bold;letter-spacing:1px">${o.brand}</td></tr>
  <tr><td style="padding:34px 28px 10px;text-align:center;background:${o.hero || '#fafafa'}">
    <div style="font-size:30px;font-weight:bold;color:#222;line-height:1.2">${o.headline}</div>
    <div style="font-size:15px;color:#555;margin:14px 0 24px">${o.sub}</div>
    <a href="#" style="display:inline-block;background:${o.bg};color:${o.fg || '#fff'};text-decoration:none;font-weight:bold;padding:12px 30px;border-radius:3px">${o.cta}</a>
  </td></tr>
  ${o.items ? `<tr><td style="padding:20px 18px"><table width="100%" cellpadding="8"><tr>${o.items.map((it) => `<td width="${Math.floor(100 / o.items.length)}%" style="text-align:center;vertical-align:top"><div style="height:90px;border-radius:4px;background:${it[2]}"></div><div style="font-weight:bold;color:#333;margin-top:8px">${it[0]}</div><div style="color:${o.accent || '#c0392b'};font-weight:bold">${it[1]}</div></td>`).join('')}</tr></table></td></tr>` : ''}
  <tr><td style="padding:16px 28px 26px;font-size:11px;color:#999;line-height:1.5;border-top:1px solid #eee">${o.fine || 'You are receiving this email because you signed up for updates.'}<br><a href="#" style="color:#999">Unsubscribe</a> · <a href="#" style="color:#999">Update preferences</a> · <a href="#" style="color:#999">View in browser</a></td></tr>
</table>`;

  const notice = (o) => `
<table cellpadding="0" cellspacing="0" width="100%" style="max-width:580px;font-family:Arial,Helvetica,sans-serif;color:#333">
  <tr><td style="border-bottom:3px solid ${o.color};padding:12px 0;font-weight:bold;font-size:18px;color:${o.color}">${o.brand}</td></tr>
  <tr><td style="padding:22px 0 8px;font-size:14px;line-height:1.55">${o.body}</td></tr>
  ${o.cta ? `<tr><td style="padding:10px 0 22px"><a href="#" style="background:${o.color};color:#fff;padding:10px 20px;border-radius:3px;text-decoration:none;font-weight:bold;display:inline-block">${o.cta}</a></td></tr>` : ''}
  <tr><td style="font-size:11px;color:#999;padding-top:14px;border-top:1px solid #eee">${o.fine || 'This is an automated message. Please do not reply directly to this email.'}</td></tr>
</table>`;

  /* --- Hand-written threads -------------------------------------------- */
  // t: [days, hours, minutes] ago. read: message read. Thread flags apply to thread.
  function threads() {
    return [
      {
        key: 'hike', cat: 'personal', labels: ['Personal'], important: true,
        msgs: [
          { from: 'liam', to: ['me', 'sofia', 'harper'], t: [1, 3, 10], read: true, subject: 'Weekend hiking plan?',
            body: P('Hey all,', '', 'Weather looks great for Saturday. Anyone up for the Ridge Loop trail? It\'s about 9 miles with a nice lunch spot at the overlook.', '', 'I can drive — my car fits four. Thinking we leave around 7:30 to beat the crowds.', '', 'Liam') },
          { from: 'sofia', to: ['liam', 'me', 'harper'], t: [1, 1, 42], read: true,
            body: P('I\'m in! I\'ll bring sandwiches and the good trail mix 🙂', '', 'Harper, you still have that spare pair of poles?', '', '- Sofia') },
          { from: 'me', to: ['liam', 'sofia', 'harper'], t: [0, 20, 5], read: true,
            body: P('Count me in too. 7:30 works — I\'ll meet you at your place, Liam.', '', 'I\'ll bring the first-aid kit and extra water.', '', 'Pat') },
          { from: 'harper', to: ['liam', 'sofia', 'me'], t: [0, 2, 18],
            body: P('Yes!! Poles are packed. Can we stop for coffee on the way? I will not be a functional human at 7:30 otherwise.', '', 'Also — sunrise is at 6:58, in case anyone wants to be really ambitious (I don\'t).', '', 'H') },
        ],
      },
      {
        key: 'q4', cat: 'personal', labels: ['Work'], important: true, starred: true,
        msgs: [
          { from: 'me', to: ['olivia', 'noah', 'mia'], cc: ['ethan'], t: [2, 6, 0], read: true, subject: 'Q4 roadmap draft – feedback welcome',
            body: P('Hi team,', '', 'Attached is the first draft of the Q4 roadmap. The big themes are:', '', '<b>1. Onboarding refresh</b> — cut time-to-first-value in half', '<b>2. Offline mode</b> — read and draft without a connection', '<b>3. Performance</b> — sub-second list rendering for large accounts', '', 'Please leave comments by Thursday so I can bring a revised version to Friday\'s planning meeting.', '', 'Thanks!', 'Pat'),
            att: [['Q4-Roadmap-Draft.pdf', 284211, 'application/pdf'], ['Effort-estimates.csv', 3112, 'text/csv']] },
          { from: 'noah', to: ['me'], cc: ['olivia', 'mia', 'ethan'], t: [2, 3, 30], read: true,
            body: P('Looks solid. One concern: offline mode is a big lift on the sync layer. I\'d estimate 6–8 weeks for two engineers, not 4.', '', 'Can we scope it to read-only for Q4 and do drafts in Q1?', '', 'Noah') },
          { from: 'mia', to: ['me'], cc: ['olivia', 'noah', 'ethan'], t: [1, 22, 15], read: true,
            body: P('+1 to Noah. From the design side, onboarding needs about two weeks of research before we commit to a direction. I\'ve put a few early sketches in the attachment.', '', 'Mia'),
            att: [['onboarding-sketches.png', 418020, 'image/png']] },
          { from: 'olivia', to: ['me'], cc: ['noah', 'mia', 'ethan'], t: [0, 4, 2],
            body: P('Great discussion, everyone. Pat — let\'s go with read-only offline for Q4 and move drafts to Q1 as Noah suggested.', '', 'Please update the doc and we\'ll review it Friday. Nice work pulling this together so quickly.', '', 'Olivia', sig('Olivia Carter', 'Director of Product, Lumen Labs')) },
        ],
      },
      {
        key: 'mom-dinner', cat: 'personal', labels: ['Family'], important: true,
        msgs: [
          { from: 'mom', to: ['me'], cc: ['sam'], t: [0, 1, 25], subject: 'Dinner Sunday?',
            body: P('Hi sweetie,', '', 'Your dad and I would love to have you and Sam over for dinner on Sunday. I\'m making the lasagna you like!', '', 'Is 6 o\'clock ok? Let me know if you\'re bringing anyone.', '', 'Love,', 'Mom') },
        ],
      },
      {
        key: 'lease', cat: 'personal', labels: [], important: true,
        msgs: [
          { from: 'me', to: ['james'], t: [6, 2, 0], read: true, subject: 'Apartment lease renewal question',
            body: P('Hi James,', '', 'My lease at 1420 Alder St, Unit 3B is up at the end of January. I\'d like to renew for another 12 months — could you send over the renewal terms when you have a chance?', '', 'Also, the kitchen faucet has started dripping again. Could someone take a look?', '', 'Thanks,', 'Pat Morgan') },
          { from: 'james', to: ['me'], t: [5, 4, 30], read: true,
            body: P('Hi Pat,', '', 'Thanks for reaching out. The renewal offer is attached — rent stays the same for a 12-month term, or there\'s a 2% increase for a 6-month term.', '', 'I\'ve put in a maintenance request for the faucet; a technician should contact you within 2 business days.', '', 'Best regards,', sig("James O'Connor", 'Greenleaf Property Management<br>(415) 555-0111')),
            att: [['Lease-Renewal-Offer-3B.pdf', 156332, 'application/pdf']] },
          { from: 'me', to: ['james'], t: [5, 2, 0], read: true,
            body: P('Perfect, thank you! I\'ll sign the 12-month option and send it back this week.', '', 'Pat') },
        ],
      },
      {
        key: 'standup', cat: 'personal', labels: ['Work'], important: true,
        msgs: [
          { from: 'grace', to: ['me'], t: [0, 5, 40], subject: 'Customer interview recordings are up',
            body: P('Hi Pat,', '', 'All eight customer interview recordings from last week are uploaded to the research folder. I\'ve tagged the key moments — the onboarding confusion around "workspaces" came up in 6 of 8 sessions.', '', 'Happy to walk you through the highlights tomorrow if you have 20 minutes.', '', 'Grace') },
        ],
      },
      {
        key: 'photos', cat: 'personal', labels: ['Family'], starred: true,
        msgs: [
          { from: 'me', to: ['mom'], cc: ['sam'], t: [12, 3, 0], read: true, subject: 'Photos from the lake',
            body: P('Hi Mom,', '', 'Here are a few photos from the lake last weekend. The sunset one is my favorite!', '', 'Love,', 'Pat'),
            att: [['lake-sunset.jpg', 1843211, 'image/jpeg'], ['dock.jpg', 1520774, 'image/jpeg'], ['family-boat.jpg', 2011402, 'image/jpeg']] },
          { from: 'mom', to: ['me'], cc: ['sam'], t: [11, 20, 0], read: true,
            body: P('These are beautiful!! I\'m printing the sunset one for the hallway. Thank you for sending them.', '', 'Love you,', 'Mom') },
          { from: 'sam', to: ['me', 'mom'], t: [11, 18, 30], read: true,
            body: P('Wait, why do I look like that in the boat one 😂', '', 'Great pics though.') },
        ],
      },
      {
        key: 'bookclub', cat: 'personal', labels: ['Book Club'],
        msgs: [
          { from: 'me', to: ['harper', 'sofia', 'lucas', 'ben'], t: [3, 5, 0], read: true, subject: 'Book club pick for December',
            body: P('Hi everyone!', '', 'It\'s my turn to pick for December. I\'m torn between two:', '', '• <i>The Lighthouse Keeper\'s Almanac</i> — cozy, short, perfect for the holidays', '• <i>Cartographers of the Deep</i> — longer, but everyone keeps recommending it', '', 'Vote by Friday! Meeting is Dec 14 at my place.', '', 'Pat') },
          { from: 'lucas', to: ['me', 'harper', 'sofia', 'ben'], t: [3, 1, 0], read: true,
            body: P('Cartographers! I\'ve heard the ending is wild.') },
          { from: 'ben', to: ['me', 'harper', 'sofia', 'lucas'], t: [2, 19, 0], read: true,
            body: P('Lighthouse — December is busy and I want to actually finish the book this time 😅') },
          { from: 'harper', to: ['me', 'sofia', 'lucas', 'ben'], t: [2, 8, 0], read: true,
            body: P('Lighthouse for me too. Save Cartographers for January when we\'re all hibernating.') },
          { from: 'sofia', to: ['me', 'harper', 'lucas', 'ben'], t: [1, 9, 0],
            body: P('Agree with Harper — Lighthouse now, Cartographers in January. I\'ll bring dessert on the 14th!') },
        ],
      },
      {
        key: 'design-review', cat: 'personal', labels: ['Work'], important: true,
        msgs: [
          { from: 'mia', to: ['me', 'noah'], t: [0, 7, 15], subject: 'Design review notes – onboarding v2',
            body: P('Hi both,', '', 'Notes from today\'s review:', '', '<ul><li>Keep the 3-step flow, but merge "Invite team" into step 2</li><li>Swap the illustration on step 1 for a short product tour</li><li>Noah to check whether we can pre-fill workspace name from the email domain</li></ul>', 'Next review is Tuesday. I\'ll have updated mocks by Monday EOD.', '', 'Mia'),
            att: [['onboarding-v2-review.pdf', 902113, 'application/pdf']] },
        ],
      },
      {
        key: 'flight', cat: 'updates', labels: ['Travel'], important: true, starred: true,
        msgs: [
          { from: 'brightwing', to: ['me'], t: [4, 3, 0], read: true, subject: 'Your trip confirmation: SFO → BOS (Confirmation K7Q2XM)',
            body: notice({ brand: 'Brightwing Airlines', color: '#1a73b8', cta: 'Manage my trip',
              body: '<p>Hi Pat,</p><p>Thanks for flying with us. Your trip is confirmed.</p><table cellpadding="6" style="border:1px solid #ddd;border-collapse:collapse;font-size:13px"><tr style="background:#f3f7fb"><td><b>Flight</b></td><td><b>Depart</b></td><td><b>Arrive</b></td></tr><tr><td>BW 412</td><td>Dec 19, 7:05 AM — SFO</td><td>Dec 19, 3:41 PM — BOS</td></tr><tr><td>BW 419</td><td>Dec 27, 5:30 PM — BOS</td><td>Dec 27, 9:02 PM — SFO</td></tr></table><p>Confirmation code: <b>K7Q2XM</b><br>Passenger: PAT MORGAN · Seat 14A / 12C</p><p>Check-in opens 24 hours before departure.</p>' }),
            att: [['Itinerary-K7Q2XM.pdf', 98234, 'application/pdf'], ['BW412.ics', 1204, 'text/calendar']] },
        ],
      },
      {
        key: 'hotel', cat: 'updates', labels: ['Travel'],
        msgs: [
          { from: 'harbor', to: ['me'], t: [4, 1, 0], read: true, subject: 'Reservation confirmed — Harborview Hotel, Dec 19–27',
            body: notice({ brand: 'Harborview Hotel · Boston', color: '#2c5f6f', cta: 'View reservation',
              body: '<p>Dear Pat Morgan,</p><p>We look forward to welcoming you.</p><p><b>Check-in:</b> Fri, Dec 19 (from 3:00 PM)<br><b>Check-out:</b> Sat, Dec 27 (by 11:00 AM)<br><b>Room:</b> Deluxe King, Harbor View<br><b>Guests:</b> 1 adult<br><b>Confirmation:</b> HV-88213-PM</p><p>Free cancellation until Dec 16.</p>' }) },
        ],
      },
      {
        key: 'dentist', cat: 'updates', labels: [],
        msgs: [
          { from: 'dental', to: ['me'], t: [1, 5, 0], subject: 'Reminder: Your appointment on Nov 12 at 9:30 AM',
            body: notice({ brand: 'Riverside Dental', color: '#2a9d8f', cta: 'Confirm appointment',
              body: '<p>Hi Pat,</p><p>This is a friendly reminder of your upcoming cleaning appointment:</p><p><b>Wednesday, Nov 12 at 9:30 AM</b><br>Dr. Elena Vasquez<br>212 Riverside Ave, Suite 4</p><p>Please arrive 10 minutes early. Need to reschedule? Reply to this email or call (415) 555-0199.</p>' }) },
        ],
      },
      {
        key: 'pkg', cat: 'updates', labels: [],
        msgs: [
          { from: 'parcel', to: ['me'], t: [0, 9, 12], subject: 'Your package has shipped — arriving Monday',
            body: notice({ brand: 'Parcelwise', color: '#e67e22', cta: 'Track package',
              body: '<p>Good news! Your package from <b>Stellar Electronics</b> is on its way.</p><p><b>Tracking number:</b> PW 4417 9932 0218<br><b>Estimated delivery:</b> Monday, Nov 9 by 8:00 PM<br><b>Shipping to:</b> Pat Morgan, 1420 Alder St, Unit 3B</p>' }) },
        ],
      },
      {
        key: 'bank-alert', cat: 'updates', labels: ['Receipts'], important: true,
        msgs: [
          { from: 'bank', to: ['me'], t: [0, 11, 3], subject: 'Purchase alert: $649.00 at Stellar Electronics',
            body: notice({ brand: 'Larkspur Bank', color: '#3d5a80', cta: 'Review activity',
              body: '<p>Hello Pat,</p><p>A purchase of <b>$649.00</b> was made with your Larkspur Visa ending in <b>4821</b> at <b>STELLAR ELECTRONICS ONLINE</b>.</p><p>If you made this purchase, no action is needed. If you don\'t recognize it, call us at the number on the back of your card.</p><p>To protect your account, Larkspur Bank will never ask for your password by email.</p>', fine: 'Larkspur Bank, Member FDIC. This is a service message.' }) },
        ],
      },
      {
        key: 'nimbus', cat: 'updates', labels: [],
        msgs: [
          { from: 'nimbus', to: ['me'], t: [2, 2, 0], read: true, subject: 'Mia Chen shared "Onboarding v2 – mocks" with you',
            body: notice({ brand: 'Nimbus Drive', color: '#4a7bd0', cta: 'Open',
              body: '<p><b>Mia Chen</b> (mia.chen@lumenlabs.io) has invited you to <b>edit</b> the following folder:</p><p style="padding:10px;border:1px solid #ddd;border-radius:3px">📁 Onboarding v2 – mocks</p><p>"Here are the latest explorations — would love your eyes on flows B and C."</p>' }) },
        ],
      },
      {
        key: 'gf-pr', cat: 'updates', labels: [],
        msgs: [
          { from: 'gitforge', to: ['me'], t: [0, 6, 50], subject: '[opengarden/garden-core] Add soil moisture sensor support (#482)',
            body: P('<b>@noahp</b> requested your review on this pull request.', '', '<b>Add soil moisture sensor support #482</b>', 'Adds a driver for capacitive soil moisture sensors with calibration helpers and docs.', '', '+ 412 −38 · 9 files changed', '', '<a href="#">View it on GitForge</a>', '', '<span style="color:#888;font-size:12px">You are receiving this because your review was requested.</span>') },
        ],
      },
      {
        key: 'orbit1', cat: 'social', labels: [],
        msgs: [
          { from: 'orbit', to: ['me'], t: [0, 3, 30], subject: 'Liam Nguyen tagged you in a photo',
            body: notice({ brand: 'orbit', color: '#5b5fc7', cta: 'See photo', body: '<p><b>Liam Nguyen</b> tagged you in a photo from <b>Ridge Loop Trail</b>.</p><div style="height:150px;border-radius:6px;background:linear-gradient(135deg,#7bb4e3,#3e7d5a)"></div><p>“Throwback to last year\'s hike — round two this weekend!”</p>' }) },
        ],
      },
      {
        key: 'orbit2', cat: 'social', labels: [],
        msgs: [
          { from: 'orbit', to: ['me'], t: [0, 8, 0], subject: 'Harper Kim and 4 others commented on your post',
            body: notice({ brand: 'orbit', color: '#5b5fc7', cta: 'View comments', body: '<p><b>Harper Kim</b>: "Okay but where is this?? Adding to my list."</p><p><b>Sofia Ramirez</b>: "Stunning 😍"</p><p>…and 3 more comments on your photo.</p>' }) },
        ],
      },
      {
        key: 'chirp1', cat: 'social', labels: [],
        msgs: [
          { from: 'chirp', to: ['me'], t: [1, 2, 0], read: true, subject: 'You have 3 new followers',
            body: notice({ brand: 'chirp', color: '#16a2b8', cta: 'See who followed you', body: '<p>@lucas_ferreira, @trailmix_daily and @product_paula started following you.</p>' }) },
        ],
      },
      {
        key: 'linkfolio1', cat: 'social', labels: [],
        msgs: [
          { from: 'linkfolio', to: ['me'], t: [2, 5, 0], read: true, subject: 'You appeared in 14 searches this week',
            body: notice({ brand: 'Linkfolio', color: '#2b6cb0', cta: 'See all searches', body: '<p>Hi Pat, your profile was found by people from <b>Lumen Labs</b>, <b>Northstar Analytics</b> and 6 other companies.</p><p>Top search keywords: product management, roadmapping, user research.</p>' }) },
        ],
      },
      {
        key: 'nw1', cat: 'promotions', labels: [],
        msgs: [
          { from: 'northwind', to: ['me'], t: [0, 4, 45], subject: 'Pat, your winter layers are here ❄️ Up to 30% off',
            body: promo({ brand: 'NORTHWIND OUTFITTERS', bg: '#22313f', headline: 'Built for the cold.<br>Priced for right now.', sub: 'Up to 30% off insulated jackets, fleece and base layers.', cta: 'SHOP WINTER', items: [['Summit Down Parka', '$189', 'linear-gradient(135deg,#34495e,#5d6d7e)'], ['Alpine Fleece', '$64', 'linear-gradient(135deg,#a04000,#dc7633)'], ['Merino Base Layer', '$48', 'linear-gradient(135deg,#1e8449,#52be80)']] }) },
        ],
      },
      {
        key: 'pantry1', cat: 'promotions', labels: [],
        msgs: [
          { from: 'pantry', to: ['me'], t: [0, 10, 0], subject: 'Free delivery this weekend + fresh fall recipes 🍂',
            body: promo({ brand: 'urban pantry', bg: '#3b7a57', headline: 'Free delivery, all weekend', sub: 'Use code FALLFREE on orders over $35. Plus 5 cozy recipes our chefs can\'t stop making.', cta: 'START SHOPPING', accent: '#3b7a57', items: [['Butternut Soup Kit', '$14.99', 'linear-gradient(135deg,#e59866,#ca6f1e)'], ['Apple Crumble Box', '$11.49', 'linear-gradient(135deg,#c0392b,#f1948a)']] }) },
        ],
      },
      {
        key: 'stellar1', cat: 'promotions', labels: [],
        msgs: [
          { from: 'stellar', to: ['me'], t: [1, 6, 0], read: true, subject: 'Early access: Black Friday prices start now ⚡',
            body: promo({ brand: 'STELLAR ELECTRONICS', bg: '#111', headline: 'Early access is live', sub: 'Members get first pick on our biggest deals of the year.', cta: 'SEE THE DEALS', items: [['Aurora 14" Laptop', '$649', 'linear-gradient(135deg,#566573,#aab7b8)'], ['Pulse Earbuds', '$59', 'linear-gradient(135deg,#1b2631,#5d6d7e)'], ['Halo Smart Speaker', '$39', 'linear-gradient(135deg,#7d3c98,#bb8fce)']] }) },
        ],
      },
      {
        key: 'path1', cat: 'promotions', labels: [],
        msgs: [
          { from: 'pathfinder', to: ['me'], t: [1, 11, 0], read: true, subject: 'Winter getaways from $199 — 4 days only',
            body: promo({ brand: 'Pathfinder Travel', bg: '#0e6ba8', headline: 'Escape the cold', sub: 'Beach, mountains or city lights — save up to 40% on winter trips.', cta: 'FIND MY TRIP', items: [['Tulum, 4 nights', 'from $499', 'linear-gradient(135deg,#48c9b0,#f7dc6f)'], ['Banff, 3 nights', 'from $349', 'linear-gradient(135deg,#5dade2,#d6eaf8)']] }) },
        ],
      },
      {
        key: 'vine1', cat: 'promotions', labels: [],
        msgs: [
          { from: 'vine', to: ['me'], t: [2, 7, 0], read: true, subject: 'Your holiday wine guide is here 🍷',
            body: promo({ brand: 'Velvet &amp; Vine', bg: '#6c1d3a', headline: 'Pour something special', sub: 'Twelve bottles our sommeliers love for holiday dinners — plus 15% off mixed cases.', cta: 'READ THE GUIDE', accent: '#6c1d3a' }) },
        ],
      },
      {
        key: 'fern1', cat: 'promotions', labels: [],
        msgs: [
          { from: 'fernbrook', to: ['me'], t: [3, 2, 0], read: true, subject: 'Staff picks: the best books of the year',
            body: promo({ brand: 'Fernbrook Books', bg: '#5d4037', headline: 'Our 25 favorite reads of the year', sub: 'From quiet literary gems to page-turning thrillers. Members save 20% this week.', cta: 'BROWSE PICKS', accent: '#5d4037', items: [['The Lighthouse Keeper\'s Almanac', '$18.00', 'linear-gradient(135deg,#d4ac0d,#7e5109)'], ['Cartographers of the Deep', '$24.00', 'linear-gradient(135deg,#1a5276,#5499c7)'], ['Small Kitchen, Big Year', '$29.00', 'linear-gradient(135deg,#a93226,#f5b7b1)']] }) },
        ],
      },
      {
        key: 'cobalt1', cat: 'promotions', labels: [],
        msgs: [
          { from: 'cobalt', to: ['me'], t: [4, 6, 0], read: true, subject: 'Bring a friend free all November 💪',
            body: promo({ brand: 'COBALT FITNESS', bg: '#1f4e9c', headline: 'Better together', sub: 'Members can bring a guest free to any class this month.', cta: 'BOOK A CLASS' }) },
        ],
      },
      {
        key: 'trail1', cat: 'forums', labels: [],
        msgs: [
          { from: 'trail', to: ['me'], t: [0, 12, 0], subject: '[trail-runners] Saturday long run — Ridge Loop or Bay Trail?',
            body: P('Hi all,', '', 'Planning this Saturday\'s group long run. Options:', '', 'A) Ridge Loop — 11 mi, 1,800 ft gain', 'B) Bay Trail — 13 mi, flat, fast', '', 'Reply with A or B. We meet at 7:00 at the usual spot.', '', '— Coach Dana', '', '<span style="color:#888;font-size:12px">You received this message because you are subscribed to the "Trail Runners Club" group.<br>To unsubscribe from this group, send an email to trail-runners+unsubscribe@lists.groupmail.org.</span>') },
        ],
      },
      {
        key: 'garden1', cat: 'forums', labels: [],
        msgs: [
          { from: 'garden', to: ['me'], t: [1, 4, 0], read: true, subject: '[opengarden-dev] RFC: plugin API for custom sensors',
            body: P('Hi everyone,', '', 'I\'ve posted an RFC for a plugin API that would let people ship sensor drivers outside of core. Main goals: stable interface, versioning, and sandboxing.', '', 'Comments welcome on the thread before next Wednesday\'s maintainer call.', '', 'Thanks,', 'Priya (maintainer)', '', '<span style="color:#888;font-size:12px">You received this message because you are subscribed to the "OpenGarden Dev" group.</span>') },
        ],
      },
      {
        key: 'muted', cat: 'personal', labels: ['Work'], muted: true,
        msgs: [
          { from: 'ethan', to: ['me', 'olivia', 'noah', 'mia', 'grace'], t: [3, 4, 0], read: true, subject: 'Who\'s in for the holiday party planning committee?',
            body: P('Hey team! Looking for 3–4 volunteers to help plan this year\'s holiday party. Reply-all if you\'re interested!', '', 'Ethan') },
          { from: 'grace', to: ['ethan', 'me', 'olivia', 'noah', 'mia'], t: [3, 2, 0], read: true, body: P('I\'m in!') },
          { from: 'noah', to: ['ethan', 'me', 'olivia', 'mia', 'grace'], t: [2, 23, 0], read: true, body: P('Happy to help with music.') },
        ],
      },
      {
        key: 'amelia', cat: 'personal', labels: [], read: true,
        msgs: [
          { from: 'amelia', to: ['me'], t: [8, 4, 0], read: true, subject: 'Logo concepts for the community garden',
            body: P('Hi Pat!', '', 'As promised, here are three logo directions for the community garden project. I lean toward #2 — it reads well at small sizes and works in one color.', '', 'Let me know what the committee thinks!', '', 'Amelia', sig('Amelia Novak', 'Novak Studio · Brand & Illustration')),
            att: [['garden-logo-concepts.png', 655120, 'image/png']] },
          { from: 'me', to: ['amelia'], t: [7, 22, 0], read: true,
            body: P('These are lovely — the committee voted unanimously for #2! Can you send final files in SVG and PNG?', '', 'Thanks so much,', 'Pat') },
        ],
      },
      {
        key: 'sam-bday', cat: 'personal', labels: ['Family'], read: true, inbox: false,
        msgs: [
          { from: 'sam', to: ['me'], t: [9, 3, 0], read: true, subject: 'Mom\'s birthday gift',
            body: P('Hey, Mom\'s birthday is in three weeks. Want to go in together on something? I was thinking a nice garden bench since she\'s always out there.', '', 'Sam') },
          { from: 'me', to: ['sam'], t: [9, 1, 0], read: true, body: P('Love that idea. I\'ll look around this weekend and send you some options. Split 50/50?') },
          { from: 'sam', to: ['me'], t: [8, 20, 0], read: true, body: P('Deal 👍') },
        ],
      },
      {
        key: 'liam-lunch', cat: 'personal', labels: [], read: true,
        msgs: [
          { from: 'liam', to: ['me'], t: [10, 5, 0], read: true, subject: 'Lunch Thursday?',
            body: P('New ramen place opened near your office. Thursday at 12:30?') },
          { from: 'me', to: ['liam'], t: [10, 4, 0], read: true, body: P('Yes! See you there.') },
        ],
      },
      {
        key: 'offsite', cat: 'personal', labels: ['Work'], read: true,
        msgs: [
          { from: 'olivia', to: ['me', 'noah', 'mia', 'ethan', 'grace'], t: [13, 6, 0], read: true, subject: 'Team offsite — save the date (Jan 22–23)',
            body: P('Hi all,', '', 'Please hold Jan 22–23 for our team offsite. We\'ll be at the Redwood Retreat Center — lodging and meals covered.', '', 'Agenda to follow. Reply if you have any conflicts.', '', 'Olivia') },
        ],
      },
      {
        key: 'invite', cat: 'personal', labels: ['Work'], read: true,
        msgs: [
          { from: 'olivia', to: ['me'], t: [5, 7, 0], read: true, subject: 'Invitation: Q4 planning @ Fri Nov 13, 2pm – 3:30pm (PST)',
            body: notice({ brand: 'Calendar invitation', color: '#4285b4', cta: 'Yes · Maybe · No', body: '<p><b>Q4 planning</b></p><p><b>When</b> Fri Nov 13, 2pm – 3:30pm Pacific Time<br><b>Where</b> Lumen Labs – Room 4B "Atlas"<br><b>Who</b> Olivia Carter (organizer), Pat Morgan, Noah Patel, Mia Chen, Ethan Brooks</p><p>Review revised Q4 roadmap and finalize staffing.</p>', fine: 'Invitation from a calendar. You are receiving this email because you are an attendee of the event.' }),
            att: [['invite.ics', 2210, 'text/calendar']] },
        ],
      },
      {
        key: 'recipe', cat: 'personal', labels: ['Family'], read: true,
        msgs: [
          { from: 'mom', to: ['me'], t: [18, 2, 0], read: true, subject: 'Grandma\'s apple cake recipe',
            body: P('You asked for it, here it is! Don\'t skimp on the cinnamon.', '', '<b>Grandma Rose\'s Apple Cake</b>', '3 cups flour · 2 tsp cinnamon · 1 tsp baking soda · 1/2 tsp salt', '1 1/2 cups sugar · 1 cup oil · 3 eggs · 2 tsp vanilla', '4 apples, peeled and chopped · 1 cup walnuts', '', 'Bake at 350° for about an hour in a tube pan.', '', 'Love, Mom'),
            att: [['apple-cake.txt', 640, 'text/plain']] },
        ],
      },
      {
        key: 'pantry-receipt', cat: 'updates', labels: ['Receipts'], read: true, inbox: false,
        msgs: [
          { from: 'pantry', to: ['me'], t: [6, 5, 0], read: true, subject: 'Your Urban Pantry receipt (Order #UP-20931)',
            body: notice({ brand: 'urban pantry', color: '#3b7a57', body: '<p>Thanks for your order, Pat!</p><table cellpadding="5" style="font-size:13px;border-collapse:collapse;width:100%"><tr><td>Organic bananas (6)</td><td align="right">$2.94</td></tr><tr><td>Sourdough loaf</td><td align="right">$6.50</td></tr><tr><td>Oat milk, 64 oz</td><td align="right">$4.29</td></tr><tr><td>Butternut Soup Kit</td><td align="right">$14.99</td></tr><tr style="border-top:1px solid #ddd"><td><b>Total</b></td><td align="right"><b>$28.72</b></td></tr></table>' }) },
        ],
      },
      /* Spam */
      { key: 'spam1', cat: 'promotions', spam: true, msgs: [{ from: 'lotto', to: ['me'], t: [0, 6, 0], subject: 'CONGRATULATIONS!!! You have been selected for a $1,000 gift card', body: P('Dear Valued Customer,', '', 'You have been RANDOMLY SELECTED to receive a $1,000 gift card!!! To claim your prize simply confirm your details within 24 HOURS.', '', 'CLAIM NOW >>>', '', 'Prize Notification Center') }] },
      { key: 'spam2', cat: 'updates', spam: true, msgs: [{ from: 'phish', to: ['me'], t: [1, 3, 0], read: true, subject: 'Action required: unusual sign-in activity detected', body: P('We detected unusual activity on your acc0unt. Your mailbox will be suspended in 12 hours unless you verify your identity.', '', 'Verify here: http://acc0unt-verify-alerts.co/login', '', 'Account Security Team') }] },
      { key: 'spam3', cat: 'personal', spam: true, msgs: [{ from: 'barrister', to: ['me'], t: [3, 9, 0], read: true, subject: 'URGENT BUSINESS PROPOSAL – STRICTLY CONFIDENTIAL', body: P('Dear Friend,', '', 'I am Barrister Mark Olu, personal attorney to a late client who shares your surname. I seek your consent to present you as next of kin so that the sum of US$12.5 Million can be released to you...', '', 'Kindly reply with your full name and telephone number.') }] },
      { key: 'spam4', cat: 'promotions', spam: true, msgs: [{ from: 'crypto', to: ['me'], t: [5, 1, 0], read: true, subject: 'This coin is about to 100x — insiders are already in', body: P('Last chance to get in before the launch. Our members turned $500 into $48,000 in 3 weeks. Limited spots!') }] },
      /* Trash */
      { key: 'trash1', cat: 'promotions', trash: true, msgs: [{ from: 'diet', to: ['me'], t: [2, 4, 0], read: true, subject: 'Drop 10 lbs before the holidays', body: P('Our proven 10-day plan. Start today for just $9.99!') }] },
      { key: 'trash2', cat: 'personal', trash: true, msgs: [{ from: 'ben', to: ['me'], t: [7, 2, 0], read: true, subject: 'nvm found it', body: P('Never mind, found my keys in my jacket. Sorry for the panic!') }] },
      /* Drafts */
      { key: 'draft1', cat: 'personal', draftOnly: true, msgs: [{ from: 'me', to: ['sam'], t: [0, 3, 5], draft: true, subject: 'Ideas for Mom\'s birthday', body: P('Hey Sam,', '', 'Found a few bench options:', '• Cedar 4-ft bench — $219', '• Teak curved bench — $340', '') }] },
      /* Welcome mail (account creation) */
      { key: 'w1', cat: 'personal', read: true, msgs: [{ from: 'team', to: ['me'], t: [912, 0, 0], read: true, subject: 'Three tips to get the most out of pMail', body: welcome1() }] },
      { key: 'w2', cat: 'personal', read: true, msgs: [{ from: 'team', to: ['me'], t: [912, 0, 1], read: true, subject: 'Customize pMail with colors and themes', body: welcome2() }] },
      { key: 'w3', cat: 'personal', read: true, msgs: [{ from: 'team', to: ['me'], t: [912, 0, 2], read: true, subject: 'Stay more organized with pMail\'s inbox', body: welcome3() }] },
    ];
  }

  function welcome1() {
    return `<table cellpadding="0" cellspacing="0" style="max-width:560px;font-family:Arial,Helvetica,sans-serif;color:#333;font-size:14px;line-height:1.55">
<tr><td style="padding:10px 0 18px">${PM.logo(34)}</td></tr>
<tr><td><p>Hi Pat,</p><p><b>Tips for using your new inbox</b></p>
<p><b style="color:#dd4b39">Welcome to your inbox</b><br>Find emails fast. With the power of pMail search, you'll always find what you're looking for — try <code>from:</code>, <code>has:attachment</code> or <code>is:starred</code>.</p>
<p><b style="color:#dd4b39">Get to know the keyboard</b><br>Press <b>c</b> to compose, <b>j</b>/<b>k</b> to move between conversations and <b>?</b> to see every shortcut.</p>
<p><b style="color:#dd4b39">Keep things tidy</b><br>Archive messages you're done with instead of deleting them. They'll be waiting in All Mail whenever you need them.</p>
<p>Happy emailing,<br>The pMail Team</p></td></tr></table>`;
  }
  function welcome2() {
    return `<table cellpadding="0" cellspacing="0" style="max-width:560px;font-family:Arial,Helvetica,sans-serif;color:#333;font-size:14px;line-height:1.55">
<tr><td style="padding:10px 0 18px">${PM.logo(34)}</td></tr>
<tr><td><p>Hi Pat,</p><p>Make your inbox feel like home. Click the <b>gear</b> in the top right and choose <b>Themes</b> to pick colors or a background you love.</p>
<div style="display:flex;gap:8px;margin:16px 0"><div style="flex:1;height:60px;background:#f1f1f1;border:1px solid #ddd"></div><div style="flex:1;height:60px;background:linear-gradient(135deg,#2c3e50,#4ca1af)"></div><div style="flex:1;height:60px;background:linear-gradient(135deg,#f7971e,#ffd200)"></div><div style="flex:1;height:60px;background:#222"></div></div>
<p>You can also change how dense your inbox looks under <b>Display density</b>.</p><p>Enjoy,<br>The pMail Team</p></td></tr></table>`;
  }
  function welcome3() {
    return `<table cellpadding="0" cellspacing="0" style="max-width:560px;font-family:Arial,Helvetica,sans-serif;color:#333;font-size:14px;line-height:1.55">
<tr><td style="padding:10px 0 18px">${PM.logo(34)}</td></tr>
<tr><td><p>Hi Pat,</p><p>Your inbox sorts mail into tabs so you can see what's new at a glance and decide what to read when:</p>
<p>📥 <b>Primary</b> — conversations with people you know<br>👥 <b>Social</b> — messages from social networks<br>🏷️ <b>Promotions</b> — deals and offers<br>ℹ️ <b>Updates</b> — receipts, bills and statements<br>💬 <b>Forums</b> — mailing lists and discussion groups</p>
<p>Choose which tabs to show with <b>gear ▸ Configure inbox</b>. Drag a message to a different tab to teach pMail where it belongs.</p><p>The pMail Team</p></td></tr></table>`;
  }

  /* --- Generated history (older, mostly archived/read mail) -------------- */
  function history(rand) {
    const out = [];
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const now = new Date();
    for (let i = 1; i <= 14; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 2, 8, 15);
      const mName = months[(d.getMonth() + 11) % 12];
      const amount = (2600 + rand() * 3400).toFixed(2);
      out.push({ at: d.getTime(), cat: 'updates', labels: ['Receipts'], read: true, inbox: i > 3 ? false : true,
        msgs: [{ from: 'bank', to: ['me'], subject: `Your statement for ${mName} is ready`,
          body: notice({ brand: 'Larkspur Bank', color: '#3d5a80', cta: 'View statement', body: `<p>Hello Pat,</p><p>Your ${mName} statement for Checking ••• 4821 is now available.</p><p>Closing balance: <b>$${U.num(amount)}</b></p>`, fine: 'Larkspur Bank, Member FDIC. This is a service message.' }) }] });
      const bill = (58 + rand() * 60).toFixed(2);
      const d2 = new Date(now.getFullYear(), now.getMonth() - i, 11, 6, 40);
      out.push({ at: d2.getTime(), cat: 'updates', labels: ['Receipts'], read: true, inbox: i > 2 ? false : true,
        msgs: [{ from: 'power', to: ['me'], subject: `Your City Power & Light bill is ready — $${bill}`,
          body: notice({ brand: 'City Power &amp; Light', color: '#f39c12', cta: 'Pay bill', body: `<p>Account ending 7730</p><p>Amount due: <b>$${bill}</b><br>Due date: ${months[d2.getMonth()]} 28</p><p>You used ${Math.round(280 + rand() * 220)} kWh this period.</p>` }) }] });
    }
    const prs = ['Fix flaky scheduler test', 'Bump dependencies', 'Add humidity graph to dashboard', 'Docs: wiring diagrams for v2 board', 'Refactor watering rules engine', 'Support Celsius/Fahrenheit toggle', 'Handle sensor timeouts gracefully', 'Add dark mode to web UI', 'Improve battery estimation', 'CI: cache build artifacts'];
    prs.forEach((t, i) => {
      out.push({ at: Date.now() - (3 + i * 6.3) * 864e5 - rand() * 4e7, cat: 'updates', read: true, inbox: i < 4,
        msgs: [{ from: 'gitforge', to: ['me'], subject: `[opengarden/garden-core] ${t} (#${470 - i * 3})`,
          body: P(`<b>${['@priya-m', '@noahp', '@kofi-a', '@lena.dev'][i % 4]}</b> merged pull request <b>#${470 - i * 3}</b>.`, '', `<b>${t}</b>`, '', '<a href="#">View it on GitForge</a>', '', '<span style="color:#888;font-size:12px">You are receiving this because you are watching this repository.</span>') }] });
    });
    const runs = ['Tempo Tuesday recap', 'New member welcome thread', 'Race calendar for spring', 'Lost & found: blue water bottle', 'Shoe swap this Sunday', 'Hill repeats — who\'s in?', 'Trail maintenance volunteer day', 'Photos from the 10K'];
    runs.forEach((t, i) => {
      out.push({ at: Date.now() - (2 + i * 8.1) * 864e5 - rand() * 3e7, cat: 'forums', read: true, inbox: true,
        msgs: [{ from: 'trail', to: ['me'], subject: `[trail-runners] ${t}`, body: P('Hi runners,', '', `${t} — details below. Reply to the group if you have questions!`, '', '— Trail Runners Club', '', '<span style="color:#888;font-size:12px">You received this message because you are subscribed to the "Trail Runners Club" group.</span>') }] });
    });
    const brews = ['Fermentation temps for lagers?', 'Group buy: hops', 'Monthly tasting — bring your best', 'Kegging vs bottling debate'];
    brews.forEach((t, i) => {
      out.push({ at: Date.now() - (5 + i * 11) * 864e5, cat: 'forums', read: true, inbox: true,
        msgs: [{ from: 'brew', to: ['me'], subject: `[homebrew] ${t}`, body: P(`${t}`, '', 'Discuss on the list!', '', '<span style="color:#888;font-size:12px">You received this message because you are subscribed to the "Home Brewers Collective" group.</span>') }] });
    });
    const promos = [
      ['northwind', 'New arrivals: trail-ready rain shells', '#22313f'], ['pantry', 'Your weekly box ideas are here', '#3b7a57'], ['stellar', 'Weekend deal: 25% off headphones', '#111'],
      ['pathfinder', 'Last-minute weekend escapes', '#0e6ba8'], ['fernbrook', 'Author event: meet the writers this Thursday', '#5d4037'], ['vine', 'Club shipment preview', '#6c1d3a'],
      ['cobalt', 'New class: sunrise yoga', '#1f4e9c'], ['northwind', 'Members-only: extra 15% off', '#22313f'], ['stellar', 'Price drop on smart home bundles', '#111'],
      ['pantry', 'Meet our local farmers', '#3b7a57'], ['pathfinder', 'Fall foliage road trips', '#0e6ba8'], ['fernbrook', 'Preorder the most anticipated books of winter', '#5d4037'],
      ['northwind', 'Our biggest boot sale', '#22313f'], ['vine', 'Harvest report from the valley', '#6c1d3a'], ['cobalt', 'Your monthly progress report', '#1f4e9c'],
      ['stellar', 'Back to school tech essentials', '#111'], ['pantry', 'Snack drawer restock, 20% off', '#3b7a57'], ['pathfinder', 'Flash sale: Europe in spring', '#0e6ba8'],
      ['northwind', 'Camp in comfort — tents & bags', '#22313f'], ['fernbrook', 'Summer reading guide', '#5d4037'], ['stellar', 'Upgrade day: trade in & save', '#111'],
      ['vine', 'Rosé season is here', '#6c1d3a'], ['cobalt', 'Summer membership freeze options', '#1f4e9c'], ['pantry', 'Grill-ready boxes are back', '#3b7a57'],
      ['northwind', 'Lightweight layers for summer hikes', '#22313f'], ['pathfinder', 'Island hopping deals', '#0e6ba8'], ['stellar', 'Mid-year mega sale', '#111'],
      ['fernbrook', 'Poetry month picks', '#5d4037'], ['vine', 'Spring release party invite', '#6c1d3a'], ['pantry', 'Spring produce is in', '#3b7a57'],
      ['northwind', 'Spring cleaning sale', '#22313f'], ['stellar', 'Gadget gift guide', '#111'], ['cobalt', 'New year, new routine', '#1f4e9c'],
      ['pathfinder', 'Ski season savings', '#0e6ba8'], ['fernbrook', 'Gift cards for book lovers', '#5d4037'], ['vine', 'Sparkling picks for the new year', '#6c1d3a'],
      ['northwind', 'Gifts for the outdoorsy', '#22313f'], ['stellar', 'Cyber week starts now', '#111'], ['pantry', 'Holiday baking essentials', '#3b7a57'],
      ['pathfinder', 'Holiday travel tips & deals', '#0e6ba8'], ['cobalt', 'Thanksgiving turkey trot', '#1f4e9c'], ['northwind', 'Fleece season', '#22313f'],
    ];
    promos.forEach(([k, t, bg], i) => {
      out.push({ at: Date.now() - (5 + i * 7.4) * 864e5 - rand() * 5e7, cat: 'promotions', read: rand() > 0.15, inbox: true,
        msgs: [{ from: k, to: ['me'], subject: t, body: promo({ brand: C[k][0].toUpperCase().replace('&', '&amp;'), bg, headline: t, sub: 'Hand-picked for you. Offer ends soon — while supplies last.', cta: 'SHOP NOW' }) }] });
    });
    const social = [
      ['orbit', 'Sofia Ramirez shared a memory with you'], ['chirp', 'Your Chirp got 24 likes'], ['linkfolio', 'Congratulate Noah Patel on 3 years at Lumen Labs'],
      ['orbit', 'You have 2 new friend suggestions'], ['chirp', '@trailmix_daily mentioned you'], ['linkfolio', 'Mia Chen endorsed you for Product Strategy'],
      ['orbit', 'Lucas Ferreira invited you to "Board Game Night"'], ['chirp', 'Trending in your network'], ['orbit', 'Harper Kim posted for the first time in a while'],
      ['linkfolio', '5 jobs you may be interested in'], ['orbit', 'Your memories from 3 years ago'], ['chirp', 'You have 2 new followers'],
    ];
    social.forEach(([k, t], i) => {
      out.push({ at: Date.now() - (3 + i * 9.2) * 864e5 - rand() * 4e7, cat: 'social', read: true, inbox: true,
        msgs: [{ from: k, to: ['me'], subject: t, body: notice({ brand: C[k][0].toLowerCase(), color: { orbit: '#5b5fc7', chirp: '#16a2b8', linkfolio: '#2b6cb0' }[k], cta: 'Open', body: `<p>${t}.</p>` }) }] });
    });
    const work = [
      ['olivia', 'Weekly status – please send by EOD', 'Friendly reminder to drop your weekly status in the team doc by end of day. Thanks!'],
      ['noah', 'Sync layer perf numbers', 'Ran the benchmarks on the large-account fixture: p50 list render is 640ms, p95 is 1.9s. Most of it is in label resolution. I have a fix in progress.'],
      ['mia', 'Icon set v3', 'Finalized the v3 icon set — 128 icons, all on the 24px grid. Link in the design channel.'],
      ['grace', 'Survey results: settings page', '62% of respondents couldn\'t find the notification settings on the first try. Full readout attached in the research folder.'],
      ['ethan', 'Launch blog post draft', 'First draft of the launch post is ready for review. Would love a product sanity check on the feature list.'],
      ['olivia', 'Headcount update', 'Good news — we got approval for one more engineer and a part-time researcher in Q1.'],
      ['noah', 'Incident review: Tuesday outage', 'Root cause was an expired certificate on the sync gateway. Action items: automate renewal, add expiry alerting.'],
      ['mia', 'Usability test schedule', 'Booked 6 participants for next Wed/Thu. Pat, can you observe the Thursday sessions?'],
      ['grace', 'Persona workshop recap', 'Thanks for joining! We consolidated down to 3 primary personas. Write-up coming tomorrow.'],
      ['olivia', 'Performance review cycle kickoff', 'Self-reviews are due in two weeks. Reach out if you have questions about the new format.'],
    ];
    work.forEach(([k, t, b], i) => {
      out.push({ at: Date.now() - (14 + i * 9.5) * 864e5 - rand() * 4e7, cat: 'personal', labels: ['Work'], read: true, inbox: i < 6, important: i % 3 === 0,
        msgs: [{ from: k, to: ['me'], subject: t, body: P('Hi Pat,', '', b, '', U.firstName(C[k][0])) }] });
    });
    const friends = [
      ['harper', 'Movie night?', 'There\'s a sci-fi double feature at the Rialto on Friday. You in?'],
      ['lucas', 'Board game night — bring snacks', 'Game night at mine on Saturday at 7. I just got a new co-op game we have to try.'],
      ['sofia', 'That recipe I mentioned', 'Here\'s the link to the chickpea curry! It\'s so easy, you\'ll love it.'],
      ['liam', 'Fantasy league draft order', 'Draft order is up. You picked 4th — choose wisely 😉'],
      ['ben', 'Moving help?', 'Any chance you\'re free on the 21st to help me move a couch? Pizza and beer on me.'],
      ['harper', 'Concert tickets', 'Got an extra ticket for the Blue Herons show next month — want it?'],
      ['sam', 'Car insurance question', 'Who did you go with for car insurance? Mine just went up again.'],
      ['mom', 'Family reunion', 'Aunt Carol is organizing a family reunion next summer at the lake house. Can you make it? Let me know so I can tell her!'],
    ];
    friends.forEach(([k, t, b], i) => {
      out.push({ at: Date.now() - (16 + i * 13) * 864e5 - rand() * 4e7, cat: 'personal', labels: k === 'mom' || k === 'sam' ? ['Family'] : ['Personal'], read: true, inbox: i < 5,
        msgs: [{ from: k, to: ['me'], subject: t, body: P(b, '', U.firstName(C[k][0])) },
          ...(i % 2 === 0 ? [{ from: 'me', to: [k], dt: 3.2e6 + rand() * 2e7, body: P('Sounds good to me!') }] : [])] });
    });
    return out;
  }

  /* --- Incoming pool (arrives while you use the app) ------------------- */
  function pool() {
    return [
      { cat: 'personal', labels: ['Work'], important: true, from: 'olivia', to: ['me'], subject: 'Quick sync tomorrow?', body: P('Hi Pat,', '', 'Do you have 15 minutes tomorrow morning to go over the revised roadmap before Friday? Anytime before 11 works for me.', '', 'Olivia') },
      { thread: 'hike', cat: 'personal', labels: ['Personal'], important: true, from: 'liam', to: ['me', 'sofia', 'harper'], body: P('Coffee stop is a must, agreed. I\'ll pick everyone up — Sofia at 7:15, Pat and Harper at 7:30.', '', 'Forecast says 64° and sunny. See you Saturday!', '', 'Liam') },
      { cat: 'social', from: 'orbit', to: ['me'], subject: 'Sofia Ramirez invited you to like "Sunday Supper Club"', body: notice({ brand: 'orbit', color: '#5b5fc7', cta: 'See page', body: '<p><b>Sofia Ramirez</b> invited you to like <b>Sunday Supper Club</b>.</p>' }) },
      { cat: 'promotions', from: 'northwind', to: ['me'], subject: 'Flash sale: 40% off outerwear — today only', body: promo({ brand: 'NORTHWIND OUTFITTERS', bg: '#22313f', headline: '40% off outerwear', sub: 'Today only. No code needed.', cta: 'SHOP THE SALE' }) },
      { cat: 'updates', from: 'parcel', to: ['me'], subject: 'Out for delivery: your package arrives today', body: notice({ brand: 'Parcelwise', color: '#e67e22', cta: 'Track package', body: '<p>Your package <b>PW 4417 9932 0218</b> is out for delivery and should arrive by 8:00 PM today.</p>' }) },
      { thread: 'mom-dinner', cat: 'personal', labels: ['Family'], important: true, from: 'mom', to: ['me'], cc: ['sam'], body: P('Also, can you bring that salad you made last time? Your dad hasn\'t stopped talking about it.', '', 'Love, Mom') },
      { cat: 'personal', labels: ['Work'], important: true, from: 'mia', to: ['me', 'noah'], subject: 'Updated mocks for the onboarding flow', body: P('Hi!', '', 'Updated mocks attached — incorporated all the feedback from the review. The "invite team" step is now merged into step 2.', '', 'Mia'), att: [['onboarding-v2-mocks.png', 702314, 'image/png']] },
      { cat: 'forums', from: 'trail', to: ['me'], subject: '[trail-runners] Results: Saturday route is Ridge Loop!', body: P('Ridge Loop won 14–9. See you all at 7:00!', '', '— Coach Dana') },
    ];
  }

  /* --- Build ----------------------------------------------------------- */
  PM.seed = function () {
    let s = 20261107;
    const rand = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
    const now = Date.now();
    const messages = {};
    const threadIds = {};

    const labelDefs = [
      { name: 'Work', color: { bg: '#4986e7', fg: '#ffffff' } },
      { name: 'Personal', color: { bg: '#16a765', fg: '#ffffff' } },
      { name: 'Family', color: { bg: '#b99aff', fg: '#ffffff' } },
      { name: 'Travel', color: { bg: '#ff7537', fg: '#ffffff' } },
      { name: 'Receipts', color: { bg: '#cabdbf', fg: '#000000' } },
      { name: 'Book Club', color: null },
    ];
    const labels = labelDefs.map((l) => ({ id: 'L' + U.uid(8), name: l.name, color: l.color, show: 'show' }));
    const labelId = (n) => labels.find((l) => l.name === n).id;

    const addThread = (th, baseTime) => {
      const tid = U.uid(16);
      if (th.key) threadIds[th.key] = tid;
      let subject = '';
      let prev = null;
      th.msgs.forEach((m, i) => {
        let date;
        if (m.t) date = now - ((m.t[0] * 24 + m.t[1]) * 60 + m.t[2]) * 60000;
        else date = baseTime + (m.dt || 0);
        if (m.subject) subject = m.subject;
        const ls = [];
        const fromMe = m.from === 'me';
        if (m.draft) ls.push('DRAFT');
        else if (fromMe) ls.push('SENT');
        if (!fromMe && !th.spam && !th.trash && th.inbox !== false && !th.muted) ls.push('INBOX');
        const read = m.read || th.read || fromMe;
        if (!read) ls.push('UNREAD');
        if (th.starred && i === th.msgs.length - 1) ls.push('STARRED');
        if (th.important) ls.push('IMPORTANT');
        if (th.spam) ls.push('SPAM');
        if (th.trash) ls.push('TRASH');
        if (th.muted) ls.push('MUTED');
        ls.push('CATEGORY_' + (th.cat || 'personal').toUpperCase());
        (th.labels || []).forEach((n) => ls.push(labelId(n)));
        const id = U.uid(16);
        messages[id] = {
          id, threadId: tid, from: p(m.from), to: (m.to || []).map(p), cc: (m.cc || []).map(p), bcc: [],
          subject: i === 0 ? subject : (/^re:/i.test(subject) ? subject : 'Re: ' + subject),
          html: m.body, date, labels: Array.from(new Set(ls)),
          attachments: (m.att || []).map(([name, size, mime]) => ({ id: U.uid(8), name, size, mime, seed: true })),
          inReplyTo: prev,
        };
        prev = id;
      });
    };

    threads().forEach((th) => addThread(th, 0));
    history(rand).forEach((th) => addThread(th, th.at));

    const contacts = Object.keys(C)
      .filter((k) => C[k].length > 2)
      .map((k) => ({ id: 'c' + U.uid(8), name: C[k][0], email: C[k][1], status: C[k][2], phone: C[k][3] || '', company: C[k][4] || '', notes: '', group: 'my', starred: ['mom', 'sam', 'liam', 'olivia'].includes(k) }));
    Object.keys(C).filter((k) => C[k].length === 2 && !['lotto', 'phish', 'barrister', 'crypto', 'diet'].includes(k)).forEach((k) => {
      contacts.push({ id: 'c' + U.uid(8), name: C[k][0], email: C[k][1], status: 'offline', phone: '', company: '', notes: '', group: 'other', starred: false });
    });

    const incoming = pool().map((m) => ({
      ...m, from: p(m.from), to: m.to.map(p), cc: (m.cc || []).map(p),
      threadId: m.thread ? threadIds[m.thread] : null,
      labels: (m.labels || []).map(labelId),
    }));

    const chats = {
      'liam.nguyen@pmail.com': [
        { me: false, text: 'did you see the forecast for saturday?', time: now - 26 * 3600e3 },
        { me: true, text: 'yes!! perfect hiking weather', time: now - 26 * 3600e3 + 60e3 },
      ],
    };

    const tasks = [
      { id: U.uid(8), title: 'Sign lease renewal and send to James', done: false, notes: '', due: '' },
      { id: U.uid(8), title: 'Update Q4 roadmap (read-only offline)', done: false, notes: 'Move drafts to Q1', due: '' },
      { id: U.uid(8), title: 'Pick December book club book', done: true, notes: '', due: '' },
      { id: U.uid(8), title: 'Buy garden bench for Mom', done: false, notes: 'Split with Sam', due: '' },
    ];

    return { me: { ...ME }, labels, messages, contacts, incoming, chats, tasks };
  };
})(window.PM);
