(() => {
  const app = window.matchApp;
  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const controlPanel = document.getElementById('voiceControls');
  const startButton = document.getElementById('voiceStart');
  const stopButton = document.getElementById('voiceStop');
  const confirmButton = document.getElementById('voiceConfirm');
  const cancelButton = document.getElementById('voiceCancel');
  const status = document.getElementById('voiceStatus');
  if (!app || !controlPanel || !startButton || !stopButton || !confirmButton || !cancelButton || !status) return;
  controlPanel.addEventListener('click', event => event.stopPropagation());
  const commandHelp = controlPanel.querySelector('p.muted');
  if (commandHelp) {
    commandHelp.textContent = 'होम पर 🎤 Voice दबाकर बोलें: पेज/गेम का नाम खोलो, “500 रुपये की बैटल लगाओ”, या किसी दिख रहे बटन का नाम लेकर “दबाओ” कहें। हर submit से पहले पुष्टि होगी।';
  }
  const homeRefreshButton = document.getElementById('refreshOpen');
  const homeRow = homeRefreshButton?.parentElement;
  let homeStartButton = null;
  let homeConfirmButton = null;
  let homeCancelButton = null;
  let homeStatus = null;
  if (homeRow && !document.getElementById('voiceHomeToggle')) {
    homeStartButton = document.createElement('button');
    homeStartButton.id = 'voiceHomeToggle';
    homeStartButton.type = 'button';
    homeStartButton.className = 'btn secondary small';
    homeStartButton.textContent = '🎤 Voice';
    homeRefreshButton.after(homeStartButton);
    homeConfirmButton = document.createElement('button');
    homeConfirmButton.id = 'voiceHomeConfirm';
    homeConfirmButton.type = 'button';
    homeConfirmButton.className = 'btn green small';
    homeConfirmButton.textContent = 'हाँ, पुष्टि';
    homeConfirmButton.hidden = true;
    homeStartButton.after(homeConfirmButton);
    homeCancelButton = document.createElement('button');
    homeCancelButton.id = 'voiceHomeCancel';
    homeCancelButton.type = 'button';
    homeCancelButton.className = 'btn danger small';
    homeCancelButton.textContent = 'नहीं';
    homeCancelButton.hidden = true;
    homeConfirmButton.after(homeCancelButton);
    homeRow.style.flexDirection = 'row';
    homeRow.style.alignItems = 'center';
    homeRow.style.justifyContent = 'flex-end';
    homeRow.style.flexWrap = 'wrap';
    homeStatus = document.createElement('p');
    homeStatus.className = 'notice';
    homeStatus.setAttribute('role', 'status');
    homeStatus.setAttribute('aria-live', 'polite');
    homeStatus.hidden = true;
    homeRow.parentElement.insertBefore(homeStatus, homeRow.nextSibling);
  }

  const hindiNumbers = new Map([
    ['शून्य', 0], ['एक', 1], ['इक', 1], ['दो', 2], ['तीन', 3], ['चार', 4],
    ['पांच', 5], ['पाँच', 5], ['छह', 6], ['छः', 6], ['सात', 7], ['आठ', 8],
    ['नौ', 9], ['दस', 10], ['ग्यारह', 11], ['बारह', 12], ['तेरह', 13],
    ['चौदह', 14], ['पंद्रह', 15], ['सोलह', 16], ['सत्रह', 17], ['अठारह', 18],
    ['उन्नीस', 19], ['बीस', 20], ['तीस', 30], ['चालीस', 40], ['पचास', 50],
    ['साठ', 60], ['सत्तर', 70], ['अस्सी', 80], ['नब्बे', 90],
    ['शत', 100], ['सौ', 100], ['हजार', 1000], ['हज़ार', 1000],
    ['लाख', 100000], ['one', 1], ['two', 2], ['three', 3], ['four', 4],
    ['five', 5], ['six', 6], ['seven', 7], ['eight', 8], ['nine', 9],
    ['ten', 10], ['hundred', 100], ['thousand', 1000], ['lakh', 100000]
  ]);
  let recognition = null;
  let listening = false;
  let aiAssistantEnabled = false;
  let aiThinking = false;
  let restartTimer = 0;
  let pendingAction = null;
  let pendingTimer = 0;

  function setStatus(message, error = false) {
    status.textContent = message;
    status.classList.toggle('error', error);
    if (homeStatus) {
      homeStatus.textContent = message;
      homeStatus.classList.toggle('error', error);
      homeStatus.hidden = false;
    }
  }

  function normalize(text) {
    return String(text || '')
      .toLowerCase()
      .replace(/[०-९]/g, digit => String('०१२३४५६७८९'.indexOf(digit)))
      .replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27FF}]/gu, ' ')
      .replace(/[.,!?।:;₹]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function amountFromWords(text) {
    const tokens = normalize(text).split(/\s+/);
    let total = 0;
    let group = 0;
    let found = false;
    for (const token of tokens) {
      const value = hindiNumbers.get(token);
      if (value === undefined) continue;
      found = true;
      if (value === 100) {
        group = (group || 1) * 100;
      } else if (value === 1000 || value === 100000) {
        total += (group || 1) * value;
        group = 0;
      } else {
        group += value;
      }
    }
    return found ? total + group : NaN;
  }

  function getAmount(text) {
    const digits = normalize(text).match(/\b\d[\d,]*\b/);
    const amount = digits ? Number(digits[0].replace(/,/g, '')) : amountFromWords(text);
    return Number.isSafeInteger(amount) && amount > 0 ? amount : NaN;
  }

  function clearPending(message) {
    window.clearTimeout(pendingTimer);
    pendingTimer = 0;
    pendingAction = null;
    confirmButton.hidden = true;
    cancelButton.hidden = true;
    if (homeConfirmButton) homeConfirmButton.hidden = true;
    if (homeCancelButton) homeCancelButton.hidden = true;
    if (message) setStatus(message);
  }

  function askConfirmation(label, action) {
    clearPending();
    pendingAction = action;
    confirmButton.hidden = false;
    cancelButton.hidden = false;
    if (homeConfirmButton) homeConfirmButton.hidden = false;
    if (homeCancelButton) homeCancelButton.hidden = false;
    setStatus(`${label} तैयार है। जारी रखने के लिए “हाँ, पुष्टि करें” बोलें; रोकने के लिए “नहीं” बोलें।`);
    pendingTimer = window.setTimeout(() => {
      clearPending('पुष्टि का समय समाप्त हुआ; कोई अनुरोध नहीं भेजा गया।');
    }, 45000);
  }

  function confirmPending() {
    if (!pendingAction) return false;
    const action = pendingAction;
    clearPending('पुष्टि हो गई।');
    Promise.resolve().then(action).catch(error => {
      setStatus(error?.message || 'यह काम पूरा नहीं हो पाया।', true);
    });
    return true;
  }

  function cancelPending() {
    if (!pendingAction) return false;
    clearPending('ठीक है, अनुरोध रोक दिया गया है।');
    return true;
  }

  function matchesAny(text, expressions) {
    return expressions.some(expression => expression.test(text));
  }

  function makeBattle(amount) {
    const input = app.el('entryAmount');
    const form = app.el('createForm');
    if (!input || !form) throw new Error('बैटल बनाने का विकल्प उपलब्ध नहीं है।');
    if (amount < Number(input.min) || amount > Number(input.max) || amount % Number(input.step) !== 0) {
      throw new Error('बैटल राशि ₹50 से शुरू होती है और ₹50 के चरणों में होनी चाहिए।');
    }
    app.setView('home');
    input.value = String(amount);
    askConfirmation(`₹${amount.toLocaleString('en-IN')} की बैटल`, () => form.requestSubmit());
  }

  function prepareWithdrawal(amount) {
    const form = app.el('withdrawForm');
    const input = form?.elements?.amount;
    if (!form || !input) throw new Error('निकासी का विकल्प उपलब्ध नहीं है।');
    if (amount < Number(input.min) || amount % Number(input.step) !== 0) {
      throw new Error('निकासी ₹500 से शुरू होती है और ₹100 के चरणों में होनी चाहिए।');
    }
    app.setView('wallet');
    input.value = String(amount);
    askConfirmation(`₹${amount.toLocaleString('en-IN')} की निकासी`, () => form.requestSubmit());
  }

  function prepareDeposit(amount) {
    const form = app.el('qrForm');
    const input = app.el('depositAmount');
    if (!form || !input) throw new Error('जमा करने का विकल्प उपलब्ध नहीं है।');
    if (amount < Number(input.min)) throw new Error(`जमा राशि कम से कम ₹${input.min} होनी चाहिए।`);
    app.setView('wallet');
    input.value = String(amount);
    askConfirmation(`₹${amount.toLocaleString('en-IN')} का जमा QR`, () => form.requestSubmit());
  }

  async function prepareJoin(amount) {
    app.setView('home');
    await app.refresh();
    const candidates = [...document.querySelectorAll('#openMatches [data-join]')]
      .filter(button => Number(button.dataset.joinAmount) === amount);
    if (candidates.length !== 1) {
      setStatus(candidates.length
        ? `₹${amount.toLocaleString('en-IN')} वाली एक से अधिक बैटल हैं। सही बैटल स्क्रीन से चुनें।`
        : `₹${amount.toLocaleString('en-IN')} की खुली बैटल नहीं मिली।`, true);
      return;
    }
    const matchId = candidates[0].dataset.join;
    askConfirmation(`₹${amount.toLocaleString('en-IN')} की बैटल में शामिल होना`, () => {
      const currentButton = [...document.querySelectorAll('#openMatches [data-join]')]
        .find(button => button.dataset.join === matchId);
      if (!currentButton) throw new Error('बैटल बदल गई है। सूची फिर से खोलकर कोशिश करें।');
      currentButton.click();
    });
  }

  function chooseGame(text) {
    const games = [
      [/लूडो रेस|ludo race/, 'LUDO_RACE'],
      [/पॉपुलर लूडो|popular ludo/, 'POPULAR_LUDO'],
      [/स्नेक|snake/, 'SNAKE'],
      [/लूडो क्लासिक|ludo classic|classic ludo/, 'LUDO']
    ];
    const game = games.find(([pattern]) => pattern.test(text));
    if (!game) return false;
    const select = app.el('gameType');
    if (!select) throw new Error('Game selection उपलब्ध नहीं है।');
    app.setView('home');
    select.value = game[1];
    select.dispatchEvent(new Event('change', { bubbles: true }));
    if (matchesAny(text, [/बैटल/, /battle/, /challenge/])
        && matchesAny(text, [/लगाओ/, /बनाओ/, /शुरू/, /create/, /start/, /set/])) {
      const amount = getAmount(text);
      if (!Number.isFinite(amount)) {
        setStatus('बैटल की राशि बोलें, जैसे “पाँच सौ रुपये की लूडो रेस बैटल लगाओ”।', true);
        return true;
      }
      makeBattle(amount);
      return true;
    }
    setStatus(`${select.selectedOptions?.[0]?.textContent || 'Game'} चुना गया।`);
    return true;
  }

  function prepareProfileName(text) {
    const match = text.match(/(?:mera naam|my name is|player name|player ka naam|मेरा नाम|मेरा खिलाड़ी नाम|खिलाड़ी का नाम|नाम)\s+(.+?)(?:\s+(?:save|सेव|सहेज|बदल|बदलो|करो|कर दें))?$/);
    if (!match) return false;
    const name = match[1].trim();
    const input = app.el('username');
    const form = app.el('profileForm');
    if (!name || !input || !form) {
      setStatus('Player name बोलें, जैसे “मेरा नाम Rahul सेव करो”।', true);
      return true;
    }
    app.setView('profile');
    input.value = name;
    askConfirmation(`Player name “${name}” सेव करना`, () => form.requestSubmit());
    return true;
  }

  function chooseVisibleOption(text) {
    if (!matchesAny(text, [/select/, /choose/, /chuno/, /चुनो/, /चुनें/, /चुने/])) return false;
    const selects = [...document.querySelectorAll('select')]
      .filter(select => !select.disabled
        && !select.closest('[hidden],.view:not(.active)')
        && (!select.getClientRects || select.getClientRects().length > 0));
    const matches = selects.flatMap(select => [...select.options]
      .filter(option => !option.disabled && option.value && text.includes(normalize(option.textContent)))
      .map(option => ({ select, option })));
    if (matches.length !== 1) {
      if (matches.length > 1) setStatus('यह विकल्प एक से अधिक जगह है। कृपया स्क्रीन पर चुनें।', true);
      return matches.length > 0;
    }
    const { select, option } = matches[0];
    select.value = option.value;
    select.dispatchEvent(new Event('change', { bubbles: true }));
    setStatus(`${option.textContent.trim()} चुना गया।`);
    return true;
  }

  function fillRoomCode(text) {
    const match = text.match(/(?:room code|रूम कोड)\s+(\d{4,8})/);
    if (!match) return false;
    const fields = [...document.querySelectorAll('#roomCode,input[data-running-room-code]')]
      .filter(input => !input.disabled
        && !input.closest('[hidden],.view:not(.active)')
        && (!input.getClientRects || input.getClientRects().length > 0));
    if (fields.length !== 1) {
      setStatus(fields.length
        ? 'एक से अधिक room code fields हैं। सही मैच खोलकर code बोलें।'
        : 'Room code field पहले स्क्रीन पर खोलें।', true);
      return true;
    }
    fields[0].value = match[1];
    fields[0].dispatchEvent(new Event('input', { bubbles: true }));
    setStatus('Room code भर दिया है। Share करने से पहले स्क्रीन पर code जाँचें।');
    return true;
  }

  function getVisibleControls() {
    return [...document.querySelectorAll('button,a,[role="button"]')]
      .filter(control => !control.disabled
        && control.getAttribute('aria-disabled') !== 'true'
        && !control.closest('[hidden],.view:not(.active),#voiceControls')
        && (!control.getClientRects || control.getClientRects().length > 0)
        && !['voiceHomeToggle', 'voiceHomeConfirm', 'voiceHomeCancel'].includes(control.id));
  }

  function clickNamedControl(text) {
    const actionWords = /(?:dabao|click|press|karo|karein|bhejo|bhejein|submit|save|share|copy|kholo|open|select|chuno|start|refresh|banao|banayein|logout|log out|sign out|दबाओ|दबाएं|करो|करें|भेजो|भेजें|सेव|खोलो|खोलें|चुनो|शुरू|बनाओ|बनाएं|बनाइए)/;
    if (!actionWords.test(text)) return false;
    const ignoredWords = new Set(['ke', 'liye', 'ka', 'ki', 'ko', 'and', 'the', 'a', 'an', 'please', 'button', 'option', 'बटन']);
    const getControlWords = value => normalize(value).split(/\s+/).filter(word => word && !ignoredWords.has(word));
    const commandWords = new Set(getControlWords(text));
    const controls = getVisibleControls();
    const matches = controls.filter(control => {
      const label = normalize(control.getAttribute('aria-label') || control.innerText || control.textContent);
      if (label.length <= 2) return false;
      if (text.includes(label)) return true;
      const labelWords = getControlWords(label);
      const identifyingWords = labelWords.filter(word => !actionWords.test(word));
      const requiredWords = identifyingWords.length ? identifyingWords : labelWords;
      return requiredWords.length > 0 && requiredWords.every(word => commandWords.has(word));
    });
    if (matches.length > 1) {
      setStatus('यह नाम एक से अधिक विकल्पों से मिलता है। कृपया स्क्रीन पर सही विकल्प चुनें।', true);
      return true;
    }
    if (!matches.length) return false;
    const control = matches[0];
    askConfirmation(`“${normalize(control.innerText || control.textContent)}” विकल्प`, () => {
      if (!control.isConnected) throw new Error('यह विकल्प अब उपलब्ध नहीं है। स्क्रीन पर दोबारा देखें।');
      control.click();
    });
    return true;
  }

  function cancellationReasonPhrase(reason) {
    return {
      OPPONENT_NOT_JOINED: 'opponent not joined',
      OPPONENT_NOT_RESPONDING: 'opponent not responding',
      WRONG_ROOM_CODE: 'wrong room code',
      TECHNICAL_ISSUE: 'technical issue',
      OTHER: 'other'
    }[reason] || '';
  }

  function selectGameType(gameType) {
    const names = {
      LUDO: 'ludo classic',
      POPULAR_LUDO: 'popular ludo',
      LUDO_RACE: 'ludo race',
      SNAKE: 'snake'
    };
    return names[gameType] ? chooseGame(names[gameType]) : false;
  }

  async function executeAIIntent(intent) {
    if (!intent || intent.action === 'unknown') {
      setStatus('AI assistant कमांड नहीं समझ पाया। थोड़ा अलग बोलकर कोशिश करें।', true);
      return;
    }

    if (intent.action === 'navigate') {
      if (intent.view === 'support') window.location.href = '/support.html';
      else if (intent.view === 'chat') window.location.href = '/chat.html';
      else if (['home', 'wallet', 'profile', 'history'].includes(intent.view)) {
        app.setView(intent.view);
        setStatus(`${intent.view} पेज खुल गया।`);
      } else {
        setStatus('AI assistant ने पेज नहीं पहचाना।', true);
      }
      return;
    }
    if (intent.action === 'select_game') {
      if (!selectGameType(intent.gameType)) setStatus('AI assistant ने game नहीं पहचाना।', true);
      return;
    }
    if (intent.action === 'create_battle') {
      if (intent.gameType) selectGameType(intent.gameType);
      if (!Number.isFinite(intent.amount) || intent.amount <= 0) {
        app.setView('home');
        setStatus('बैटल की राशि बताइए, जैसे “500 रुपये की बैटल लगाओ”।', true);
        return;
      }
      makeBattle(intent.amount);
      return;
    }
    if (intent.action === 'join_battle') {
      if (!Number.isFinite(intent.amount) || intent.amount <= 0) {
        setStatus('Join करने वाली बैटल की राशि बताइए।', true);
        return;
      }
      await prepareJoin(intent.amount);
      return;
    }
    if (intent.action === 'cancel_battle') {
      await prepareCancellation(`cancel battle ${cancellationReasonPhrase(intent.reason)}`);
      return;
    }
    if (intent.action === 'deposit' || intent.action === 'withdraw') {
      if (!Number.isFinite(intent.amount) || intent.amount <= 0) {
        app.setView('wallet');
        setStatus('Request की राशि बोलें। UPI ID और payment details हाथ से भरें।', true);
        return;
      }
      if (intent.action === 'deposit') prepareDeposit(intent.amount);
      else prepareWithdrawal(intent.amount);
      return;
    }
    if (intent.action === 'click_control') {
      if (!clickNamedControl(`${intent.controlLabel} click`)) {
        setStatus('यह विकल्प अभी दिखाई नहीं दे रहा। पहले उसका पेज खोलें।', true);
      }
      return;
    }
    if (intent.action === 'select_option') {
      if (!intent.optionLabel || !chooseVisibleOption(`${intent.optionLabel} select`)) {
        setStatus('AI assistant को यह visible option नहीं मिला। स्क्रीन से चुनें।', true);
      }
      return;
    }
    if (intent.action === 'profile_name') {
      const input = app.el('username');
      const form = app.el('profileForm');
      const name = String(intent.name || '').trim();
      if (!input || !form || name.length < 2 || name.length > 40) {
        setStatus('Player name उपलब्ध नहीं है या उसकी लंबाई गलत है।', true);
        return;
      }
      app.setView('profile');
      input.value = name;
      askConfirmation(`Player name “${name}” सेव करना`, () => form.requestSubmit());
      return;
    }
    if (intent.action === 'room_code') {
      if (!fillRoomCode(`room code ${intent.roomCode}`)) {
        setStatus('पहले running battle का room code field खोलें।', true);
      }
      return;
    }
    if (intent.action === 'stop_listening') {
      stopListening();
      return;
    }
    setStatus('AI assistant ने यह विकल्प नहीं समझा।', true);
  }

  async function interpretWithAI(transcript) {
    if (/\b(?:aadhaar|aadhar|otp|pin|password|passcode|cvv|upi\s*id|bank account|account number)\b/i.test(transcript)
        || /\b\d{10,12}\b/.test(transcript)
        || /\b[\w.+-]+@[\w.-]+\b/.test(transcript)
        || /आधार|ओटीपी|यूपीआई/.test(transcript)) {
      setStatus('संवेदनशील जानकारी AI को नहीं भेजी जाएगी। Aadhaar, OTP, UPI ID या password न बोलें।', true);
      return;
    }
    if (aiThinking) {
      setStatus('AI assistant अभी पिछला command समझ रहा है। कृपया रुकें।');
      return;
    }
    aiThinking = true;
    setStatus('AI assistant command समझ रहा है। अपरिचित आवाज़ का text Google Gemini को भेजा जाएगा।');
    try {
      const result = await app.api('/api/assistant/interpret', {
        method: 'POST',
        body: JSON.stringify({
          text: transcript,
          visibleControls: getVisibleControls()
            .map(control => normalize(control.getAttribute('aria-label') || control.innerText || control.textContent))
            .filter(label => label.length > 2)
            .slice(0, 40)
        })
      });
      await executeAIIntent(result.intent);
    } finally {
      aiThinking = false;
    }
  }

  function cancellationReason(text) {
    if (matchesAny(text, [/wrong room code/, /galat room code/, /गलत.*रूम कोड/, /गलत कोड/])) return 'WRONG_ROOM_CODE';
    if (matchesAny(text, [/opponent.*not joined/, /opponent.*did not join/, /सामने वाला.*नहीं जुड़ा/])) return 'OPPONENT_NOT_JOINED';
    if (matchesAny(text, [/opponent.*(?:respond|reply|response)/, /opponent.*जवाब/, /जवाब नहीं/, /विरोधी.*जवाब/])) return 'OPPONENT_NOT_RESPONDING';
    if (matchesAny(text, [/technical issue/, /technical problem/, /तकनीकी समस्या/])) return 'TECHNICAL_ISSUE';
    if (matchesAny(text, [/\bother\b/, /अन्य/, /दूसरा कारण/])) return 'OTHER';
    return '';
  }

  async function prepareCancellation(text) {
    app.setView('home');
    await app.refresh();
    const openCancels = [...document.querySelectorAll('#openMatches [data-cancel-match]')];
    const runningCancels = [...document.querySelectorAll('#runningMatches [data-running-cancel]')];
    const candidates = [...openCancels, ...runningCancels];
    if (candidates.length !== 1) {
      setStatus(candidates.length
        ? 'एक से अधिक बैटल रद्द हो सकती हैं। सही बैटल के Cancel बटन को चुनें।'
        : 'रद्द करने योग्य बैटल नहीं मिली। Room code साझा हो चुका हो तो कारण चुनने के लिए स्क्रीन पर Cancel दबाएँ।', true);
      return;
    }
    const candidate = candidates[0];
    const isOpenCancel = candidate.hasAttribute('data-cancel-match');
    const matchId = isOpenCancel ? candidate.dataset.cancelMatch : candidate.dataset.runningCancel;
    if (!isOpenCancel && candidate.dataset.roomCodeShared === '1') {
      const reason = cancellationReason(text);
      if (!reason) {
        setStatus('Room code साझा हो चुका है। कारण के साथ बोलें: “cancel battle wrong room code” या “cancel battle technical issue”। Admin की मंज़ूरी के बाद ही cancellation/refund होगा।');
        return;
      }
      askConfirmation('Admin review के लिए battle cancellation request', async () => {
        const result = await app.api('/api/matches/cancel', {
          method: 'POST',
          body: JSON.stringify({ matchId, reason })
        });
        app.notify(result.message);
        await app.refresh();
      });
      return;
    }
    askConfirmation('आपकी एक बैटल रद्द करना', () => {
      const currentButton = [...document.querySelectorAll(isOpenCancel
        ? '#openMatches [data-cancel-match]'
        : '#runningMatches [data-running-cancel]')]
        .find(button => (isOpenCancel ? button.dataset.cancelMatch : button.dataset.runningCancel) === matchId);
      if (!currentButton) throw new Error('बैटल बदल गई है। सूची फिर से खोलकर कोशिश करें।');
      currentButton.click();
    });
  }

  async function handleCommand(transcript) {
    const text = normalize(transcript);
    if (!text) return;
    if (matchesAny(text, [/voice stop/, /stop voice/, /^stop$/, /^रोक दो$/, /^रोकें$/, /आवाज़ बंद/, /आवाज बंद/, /माइक बंद/, /सुनना बंद/])) {
      cancelPending();
      stopListening();
      return;
    }
    if (pendingAction) {
      if (matchesAny(text, [/\bno\b/, /\bnahi\b/, /नहीं/, /मत रोक/, /रद्द/])) {
        cancelPending();
      } else if (matchesAny(text, [/\byes\b/, /\bconfirm\b/, /haan/, /हाँ/, /हां/, /पुष्टि/, /जारी रखें/])) {
        confirmPending();
      } else {
        setStatus('काम लंबित है। “हाँ, पुष्टि करें” या “नहीं” बोलें।');
      }
      return;
    }

    if (prepareProfileName(text)) return;
    if (fillRoomCode(text)) return;
    if (matchesAny(text, [/प्रोफाइल/, /प्रोफ़ाइल/, /profile/])
        && matchesAny(text, [/save/, /सेव/, /सहेज/, /submit/, /करें/])) {
      const form = app.el('profileForm');
      if (form) {
        app.setView('profile');
        askConfirmation('प्रोफ़ाइल विवरण सेव करना', () => form.requestSubmit());
        return;
      }
    }
    if (matchesAny(text, [/प्रोफाइल/, /प्रोफ़ाइल/, /profile/])) {
      app.setView('profile');
      setStatus('प्रोफ़ाइल खुल गई।');
      return;
    }
    if (matchesAny(text, [/हिस्ट्री/, /इतिहास/, /history/])) {
      app.setView('history');
      setStatus('खाते का इतिहास खुल गया।');
      return;
    }
    if (matchesAny(text, [/सहायता/, /support/])) {
      window.location.href = '/support.html';
      return;
    }
    if (matchesAny(text, [/chat/, /चैट/])) {
      window.location.href = '/chat.html';
      return;
    }
    if (matchesAny(text, [/वॉलेट/, /wallet/]) && !/निकाल|withdraw|जमा|deposit/.test(text)) {
      app.setView('wallet');
      setStatus('वॉलेट खुल गया।');
      return;
    }
    if (matchesAny(text, [/होम/, /home/, /बैटल दिखा/, /खुले बैटल/])) {
      app.setView('home');
      setStatus('होम और बैटल सूची खुल गई।');
      return;
    }
    if (matchesAny(text, [/kyc/, /के वाई सी/, /पहचान जाँच/])) {
      if (matchesAny(text, [/submit/, /bhejo/, /bhejein/, /भेजो/, /भेजें/])) {
        app.setView('wallet');
        const submitButton = app.el('kycForm')?.querySelector('button[type="submit"]');
        if (submitButton) {
          askConfirmation('KYC review request भेजना', () => submitButton.form.requestSubmit(submitButton));
          return;
        }
      }
      if (clickNamedControl(text)) return;
      app.setView('wallet');
      setStatus('KYC विकल्प खुल गया। Aadhaar number और तस्वीर सुरक्षा के लिए हाथ से भरें।');
      return;
    }
    if (matchesAny(text, [/language/, /भाषा/]) && matchesAny(text, [/english/, /अंग्रेज़ी/, /अंग्रेजी/, /en/])) {
      document.querySelector('[data-lang-toggle="en"]')?.click();
      setStatus('English भाषा चुनी गई।');
      return;
    }
    if (matchesAny(text, [/language/, /भाषा/]) && matchesAny(text, [/hindi/, /हिंदी/, /hi/])) {
      document.querySelector('[data-lang-toggle="hi"]')?.click();
      setStatus('हिंदी भाषा चुनी गई।');
      return;
    }
    if (matchesAny(text, [/cancel/, /कैंसल/, /रद्द/, /रद्द कर/]) && matchesAny(text, [/battle/, /बैटल/, /game/, /गेम/])) {
      await prepareCancellation(text);
      return;
    }
    if (matchesAny(text, [/join/, /जुड़/, /शामिल/]) && matchesAny(text, [/battle/, /बैटल/, /game/, /गेम/])) {
      const amount = getAmount(text);
      if (!Number.isFinite(amount)) {
        setStatus('किस राशि की बैटल join करनी है, जैसे “500 वाली बैटल में शामिल हो”।', true);
        return;
      }
      await prepareJoin(amount);
      return;
    }
    if (chooseGame(text)) return;
    if (chooseVisibleOption(text)) return;
    if (matchesAny(text, [/निकाल/, /withdraw/, /निकासी/])) {
      const amount = getAmount(text);
      if (!Number.isFinite(amount)) {
        const form = app.el('withdrawForm');
        if (form && matchesAny(text, [/submit/, /request/, /bhejo/, /bhejein/, /भेजो/, /भेजें/])) {
          app.setView('wallet');
          askConfirmation('निकासी अनुरोध भेजना', () => form.requestSubmit());
          return;
        }
        app.setView('wallet');
        setStatus('निकासी की राशि बोलें, जैसे “पाँच सौ रुपये निकालो”।', true);
        return;
      }
      prepareWithdrawal(amount);
      return;
    }
    if (matchesAny(text, [/जमा/, /deposit/, /डिपॉजिट/])) {
      const amount = getAmount(text);
      if (!Number.isFinite(amount)) {
        const form = app.el('depositForm');
        if (form && !form.hidden
            && matchesAny(text, [/submit/, /request/, /bhejo/, /bhejein/, /भेजो/, /भेजें/])) {
          askConfirmation('जमा अनुरोध भेजना', () => form.requestSubmit());
          return;
        }
        app.setView('wallet');
        setStatus('जमा राशि बोलें, जैसे “जमा पाँच सौ रुपये”।', true);
        return;
      }
      prepareDeposit(amount);
      return;
    }
    if (matchesAny(text, [/battle/, /बैटल/, /चैलेंज/, /challenge/])
        && matchesAny(text, [/लगाओ/, /बनाओ/, /शुरू/, /create/, /start/, /set/])) {
      const amount = getAmount(text);
      if (!Number.isFinite(amount)) {
        app.setView('home');
        setStatus('बैटल की राशि बोलें, जैसे “पाँच सौ रुपये की बैटल लगाओ”।', true);
        return;
      }
      makeBattle(amount);
      return;
    }
    if (matchesAny(text, [/menu/, /मेन्यू/, /मेनू/]) && matchesAny(text, [/खोल/, /open/, /show/])) {
      document.getElementById('menuToggle')?.click();
      setStatus('मेन्यू खुल गया।');
      return;
    }
    if (clickNamedControl(text)) return;
    await interpretWithAI(transcript);
  }

  function updateVoiceButtons() {
    startButton.disabled = !Recognition || listening;
    stopButton.disabled = !listening;
    startButton.textContent = aiAssistantEnabled ? '🎤 AI Assistant शुरू करें' : '🎤 आवाज़ शुरू करें';
    if (homeStartButton) {
      homeStartButton.disabled = !Recognition;
      homeStartButton.textContent = listening ? '⏹ रोकें' : aiAssistantEnabled ? '🎤 AI Assistant' : '🎤 Voice';
      homeStartButton.setAttribute('aria-pressed', String(listening));
      homeStartButton.title = listening ? 'आवाज़ बंद करें' : 'Hindi voice assistant शुरू करें';
    }
  }

  function stopListening() {
    const wasListening = listening;
    listening = false;
    window.clearTimeout(restartTimer);
    if (recognition && wasListening) {
      try {
        recognition.stop();
      } catch (error) {
        setStatus(`माइक बंद नहीं हो पाया: ${error.message}`, true);
      }
    }
    clearPending('आवाज़ बंद है।');
    updateVoiceButtons();
  }

  function startListening() {
    if (!Recognition) {
      setStatus('इस ब्राउज़र में Hindi voice recognition उपलब्ध नहीं है।', true);
      return;
    }
    if (!window.isSecureContext) {
      setStatus('माइक के लिए वेबसाइट HTTPS पर खोलें।', true);
      return;
    }
    try {
      recognition.start();
      listening = true;
      updateVoiceButtons();
      setStatus(aiAssistantEnabled
        ? 'AI assistant सुन रहा है। अनजान command समझने के लिए transcript Google Gemini को भेजा जाएगा।'
        : 'माइक चालू है। हिंदी में वेबसाइट के विकल्प बोलें।');
    } catch (error) {
      setStatus(`माइक शुरू नहीं हो पाया: ${error.message}`, true);
    }
  }

  if (!Recognition) {
    updateVoiceButtons();
    setStatus('इस ब्राउज़र में Hindi voice recognition उपलब्ध नहीं है। Chrome या Android browser में HTTPS पर कोशिश करें।', true);
  } else {
    recognition = new Recognition();
    recognition.lang = 'hi-IN';
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.onresult = event => {
      const result = event.results[event.results.length - 1];
      if (!result?.isFinal) return;
      const transcript = result[0]?.transcript || '';
      setStatus(`सुना: “${transcript}”`);
      handleCommand(transcript).catch(error => setStatus(error?.message || 'कमांड पूरा नहीं हो पाया।', true));
    };
    recognition.onerror = event => {
      if (event.error === 'no-speech' || event.error === 'aborted') return;
      listening = false;
      updateVoiceButtons();
      setStatus(event.error === 'not-allowed' || event.error === 'service-not-allowed'
        ? 'माइक की अनुमति नहीं मिली। Browser settings में microphone अनुमति दें।'
        : `आवाज़ पहचान में समस्या हुई: ${event.error}`, true);
    };
    recognition.onend = () => {
      if (!listening) return;
      window.clearTimeout(restartTimer);
      restartTimer = window.setTimeout(() => {
        if (!listening) return;
        try {
          recognition.start();
        } catch (error) {
          listening = false;
          updateVoiceButtons();
          setStatus(`माइक शुरू नहीं हो पाया: ${error.message}`, true);
        }
      }, 250);
    };
  }

  startButton.addEventListener('click', startListening);
  stopButton.addEventListener('click', stopListening);
  confirmButton.addEventListener('click', confirmPending);
  cancelButton.addEventListener('click', cancelPending);
  homeStartButton?.addEventListener('click', event => {
    event.stopPropagation();
    if (listening) stopListening();
    else startListening();
  });
  homeConfirmButton?.addEventListener('click', event => {
    event.stopPropagation();
    confirmPending();
  });
  homeCancelButton?.addEventListener('click', event => {
    event.stopPropagation();
    cancelPending();
  });
  app.api('/api/assistant/status').then(({ enabled }) => {
    if (!enabled) return;
    aiAssistantEnabled = true;
    const heading = controlPanel.querySelector('h2');
    if (heading) heading.textContent = '🎙️ Hindi AI voice assistant';
    if (commandHelp) {
      commandHelp.textContent += ' अनजान command समझने के लिए transcript Google Gemini को भेजा जाएगा; sensitive जानकारी न बोलें।';
    }
    updateVoiceButtons();
  }).catch(error => {
    setStatus(error?.message || 'AI assistant status नहीं मिल पाया।', true);
  });
})();
