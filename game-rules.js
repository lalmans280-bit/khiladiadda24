(() => {
  const createForm = document.getElementById('createForm');
  const challengeButton = createForm?.querySelector('button[type="submit"]');
  if (!createForm || !challengeButton) return;

  const style = document.createElement('style');
  style.textContent = `
    .challenge-actions{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:10px;margin-top:10px}
    .challenge-actions>.btn{min-width:0;min-height:48px;margin:0}
    .challenge-actions>.btn.game-rules-button{align-self:center;min-height:36px;padding:5px 9px;font-size:12px;white-space:nowrap}
    .challenge-info-row{display:flex;align-items:center;justify-content:space-between;gap:8px;margin:0 0 12px}
    .challenge-info-row>.muted{min-width:0;margin:0}
    .challenge-info-row .game-rules-button{flex:none;min-height:34px;padding:5px 9px;font-size:12px;white-space:nowrap}
    #view-home #createForm .challenge-actions>.btn[type="submit"]{border-color:#438954;background:#32834b;color:#fff}
    .game-rules-dialog{width:min(760px,calc(100vw - 24px));max-width:none;max-height:88vh;overflow:hidden;padding:0;border:1px solid #536b55;border-radius:12px;color:#edf5ef;background:#17231b}
    .game-rules-dialog::backdrop{background:#050a08c9;backdrop-filter:blur(3px)}
    .game-rules-header{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:14px 18px;border-bottom:1px solid #35483a;background:#1b2720}
    .game-rules-header h2{margin:0;color:#f0c85b;font-size:21px}
    .game-rules-body{max-height:calc(88vh - 68px);overflow-y:auto;padding:16px 20px 24px}
    .game-rules-section{padding:0 0 18px;margin:0 0 18px;border-bottom:1px solid #35483a}
    .game-rules-section:last-child{border-bottom:0}
    .game-rules-section h3{margin:0 0 10px;color:#f0c85b;font-size:17px}
    .game-rules-section ol{margin:0;padding-left:25px}
    .game-rules-section li{padding:3px 0 3px 4px}
    @media(max-width:600px){.challenge-actions{grid-template-columns:minmax(0,1fr) auto;gap:7px}.challenge-actions>.btn{padding:8px 10px;font-size:14px}.game-rules-header{padding:12px 14px}.game-rules-body{padding:14px 16px 20px}.game-rules-section li{font-size:14px}}
  `;
  document.head.append(style);

  const rulesDialog = document.createElement('dialog');
  rulesDialog.className = 'game-rules-dialog';
  rulesDialog.setAttribute('aria-labelledby', 'gameRulesTitle');

  const ruleSections = [
    {
      title: '🎲 LUDO CLASSIC – हिंदी नियम',
      rules: [
        'Ludo Classic में 2 खिलाड़ी खेल सकते हैं।',
        'प्रत्येक खिलाड़ी के पास 4 गोटियाँ होती हैं।',
        'आवश्यक नंबर आने पर गोटी घर से Open होती है।',
        '<strong>एक बार किसी खिलाड़ी की गोटी Open हो जाने के बाद गेम Cancel नहीं माना जाएगा।</strong>',
        'गोटी Open होने के बाद खिलाड़ी को जो भी Loss होता है, वह <strong>Valid Loss</strong> माना जाएगा।',
        'गेम शुरू होने के बाद खिलाड़ी अपनी इच्छा से गेम Cancel करके Loss से बच नहीं सकता।',
        'यदि किसी खिलाड़ी की गोटी प्रतिद्वंद्वी की गोटी वाले स्थान पर पहुँचती है, तो प्रतिद्वंद्वी की गोटी वापस घर जा सकती है।',
        'सुरक्षित स्थान पर मौजूद गोटी को काटा नहीं जा सकता।',
        'सभी गोटियों को सबसे पहले अंतिम स्थान तक पहुँचाने वाला खिलाड़ी विजेता माना जाएगा।',
        'किसी भी प्रकार की Cheating, unfair play या game manipulation की अनुमति नहीं है।',
        'गेम का परिणाम गेम के दौरान होने वाली गतिविधियों के आधार पर मान्य माना जाएगा।'
      ]
    },
    {
      title: '🎲 LUDO CLASSIC – English Rules',
      rules: [
        'Ludo Classic can be played by 2 players.',
        'Each player has 4 tokens.',
        'A token opens when the required dice number is rolled.',
        '<strong>Once a player’s token has been opened, the game will not be considered cancelled.</strong>',
        'Any loss occurring after the token has been opened will be considered a <strong>Valid Loss</strong>.',
        'A player cannot cancel the game voluntarily after it has started in order to avoid a loss.',
        'If a player’s token lands on an opponent’s token, the opponent’s token may be sent back home.',
        'Tokens on safe spots cannot be captured.',
        'The player who gets all their tokens to the final destination first is considered the winner.',
        'Cheating, unfair play, or game manipulation is strictly prohibited.',
        'The game result will be considered valid based on the events occurring during the game.'
      ]
    },
    {
      title: '🐍 SNAKE GAME – हिंदी नियम',
      rules: [
        'Snake Game में खिलाड़ी Snake को नियंत्रित करके Food/Points प्राप्त करता है।',
        'Food खाने पर Snake की लंबाई और खिलाड़ी का Score बढ़ता है।',
        'खिलाड़ी को दीवार और Snake के अपने शरीर से टकराने से बचना होता है।',
        'दीवार या अपने शरीर से टकराने पर गेम समाप्त हो जाता है।',
        'गेम समाप्त होने तक प्राप्त Score के आधार पर परिणाम निर्धारित किया जाएगा।',
        'गेम शुरू होने के बाद खिलाड़ी अपनी इच्छा से गेम Cancel करके Loss से बच नहीं सकता।',
        'यदि गेम के दौरान Loss होता है, तो वह <strong>Valid Loss</strong> माना जाएगा।',
        'किसी तकनीकी समस्या या गेम डिस्कनेक्शन की स्थिति में परिणाम प्लेटफॉर्म के निर्धारित नियमों के अनुसार तय किया जाएगा।',
        'किसी भी प्रकार की Cheating, unfair play या game manipulation की अनुमति नहीं है।',
        'गेम का Final Result सिस्टम द्वारा दर्ज किए गए गेम परिणाम के अनुसार मान्य होगा।'
      ]
    },
    {
      title: '🐍 SNAKE GAME – English Rules',
      rules: [
        'In Snake Game, the player controls the Snake and collects Food/Points.',
        'Eating food increases the Snake’s length and the player’s Score.',
        'The player must avoid hitting the walls and the Snake’s own body.',
        'The game ends if the Snake hits a wall or its own body.',
        'The result will be determined based on the score achieved before the game ends.',
        'A player cannot voluntarily cancel the game after it has started to avoid a loss.',
        'Any loss occurring during the game will be considered a <strong>Valid Loss</strong>.',
        'In case of a technical issue or game disconnection, the result will be determined according to the platform’s applicable rules.',
        'Cheating, unfair play, or game manipulation is strictly prohibited.',
        'The Final Result will be considered valid according to the result recorded by the system.'
      ]
    }
  ];

  rulesDialog.innerHTML = `
    <div class="game-rules-header">
      <h2 id="gameRulesTitle">Game Rules</h2>
      <button class="btn secondary small" type="button" data-close-rules aria-label="Close game rules">Close</button>
    </div>
    <div class="game-rules-body">
      ${ruleSections.map(section => `
        <section class="game-rules-section">
          <h3>${section.title}</h3>
          <ol>${section.rules.map(rule => `<li>${rule}</li>`).join('')}</ol>
        </section>
      `).join('')}
    </div>
  `;
  document.body.append(rulesDialog);

  const actions = document.createElement('div');
  actions.className = 'challenge-actions';
  const rulesButton = document.createElement('button');
  rulesButton.className = 'btn secondary game-rules-button';
  rulesButton.type = 'button';
  rulesButton.textContent = 'Game Rules';
  rulesButton.setAttribute('aria-haspopup', 'dialog');
  if (challengeButton.hidden) {
    const amountHint = createForm.previousElementSibling;
    const infoRow = document.createElement('div');
    infoRow.className = 'challenge-info-row';
    amountHint.before(infoRow);
    infoRow.append(amountHint, rulesButton);
  } else {
    challengeButton.before(actions);
    actions.append(challengeButton, rulesButton);
  }

  rulesButton.addEventListener('click', () => rulesDialog.showModal());
  rulesDialog.querySelector('[data-close-rules]').addEventListener('click', () => rulesDialog.close());
  rulesDialog.addEventListener('click', event => {
    if (event.target === rulesDialog) rulesDialog.close();
  });
})();