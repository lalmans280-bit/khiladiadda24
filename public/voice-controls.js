(() => {
  const app = window.matchApp;
  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const speechSynthesis = window.speechSynthesis;
  const SpeechSynthesisUtterance = window.SpeechSynthesisUtterance;
  const controlPanel = document.getElementById('voiceControls');
  const startButton = document.getElementById('voiceStart');
  const stopButton = document.getElementById('voiceStop');
  const status = document.getElementById('voiceStatus');
  if (!app || !controlPanel || !startButton || !stopButton || !status) return;
  controlPanel.addEventListener('click', event => event.stopPropagation());
  const commandHelp = controlPanel.querySelector('p.muted');
  if (commandHelp) {
    commandHelp.textContent = 'Header ke neeche 🎤 AI Assistant दबाकर Hindi, Hinglish ya English mein bolen: “500 रुपये की बैटल लगाओ”, “wallet kholo”, “paise jama karo” या किसी दिख रहे विकल्प का नाम बोलें। बोला गया command तुरंत चलेगा।';
    commandHelp.textContent += speechSynthesis && SpeechSynthesisUtterance
      ? ' जवाब हिंदी आवाज़ में सुनाई देंगे; उपलब्ध होने पर महिला voice चुनी जाएगी।'
      : ' इस browser में बोलकर जवाब उपलब्ध नहीं हैं।';
  }
  const homeAssistantSlot = document.getElementById('aiAssistantHomeSlot');
  let homeStartButton = null;
  let homeStatus = null;
  if (homeAssistantSlot && !document.getElementById('voiceHomeToggle')) {
    homeStartButton = document.createElement('button');
    homeStartButton.id = 'voiceHomeToggle';
    homeStartButton.type = 'button';
    homeStartButton.className = 'btn secondary small';
    homeStartButton.textContent = '🎤 AI Assistant';
    homeAssistantSlot.append(homeStartButton);
    homeStatus = document.createElement('p');
    homeStatus.className = 'notice';
    homeStatus.setAttribute('role', 'status');
    homeStatus.setAttribute('aria-live', 'polite');
    homeStatus.hidden = true;
    homeAssistantSlot.append(homeStatus);
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
  let recognitionActive = false;
  let listening = false;
  let voiceRepliesEnabled = false;
  let replySpeaking = false;
  let activeUtterance = null;
  let aiAssistantEnabled = false;
  let aiThinking = false;
  let restartTimer = 0;

  function chooseHindiReplyVoice() {
    if (!speechSynthesis) return null;
    const voices = speechSynthesis.getVoices();
    const hindiVoices = voices.filter(voice => /^hi(?:$|-|_)/i.test(voice.lang));
    const feminineName = /female|woman|kalpana|aditi|heera|priya|swara|kajal|neerja|sangeeta|raveena|meera|isha/i;
    return hindiVoices.find(voice => feminineName.test(voice.name)) || hindiVoices[0] || null;
  }

  function finishSpokenReply(utterance) {
    if (activeUtterance !== utterance) return;
    activeUtterance = null;
    replySpeaking = false;
    if (!listening || !recognition) return;
    try {
      recognition.start();
      recognitionActive = true;
    } catch (error) {
      listening = false;
      updateVoiceButtons();
      setStatus(`माइक फिर से शुरू नहीं हो पाया: ${error.message}`, true);
    }
  }

  function speakStatus(message) {
    const text = String(message || '').trim();
    if (!voiceRepliesEnabled || !speechSynthesis || !SpeechSynthesisUtterance
        || !text || /^सुना:/u.test(text) || /command समझ रहा है/u.test(text)) return;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'hi-IN';
    utterance.rate = 0.96;
    utterance.pitch = 1.12;
    const voice = chooseHindiReplyVoice();
    if (voice) utterance.voice = voice;
    utterance.onend = () => finishSpokenReply(utterance);
    utterance.onerror = () => finishSpokenReply(utterance);

    activeUtterance = utterance;
    replySpeaking = true;
    window.clearTimeout(restartTimer);
    restartTimer = 0;
    speechSynthesis.cancel();
    if (listening && recognition && recognitionActive) {
      try {
        recognition.stop();
        recognitionActive = false;
      } catch (error) {
        console.error('Hindi voice recognition could not pause for a spoken reply.', error);
        listening = false;
        voiceRepliesEnabled = false;
        updateVoiceButtons();
      }
    }
    speechSynthesis.speak(utterance);
  }

  function setStatus(message, error = false, speak = true) {
    status.textContent = message;
    status.classList.toggle('error', error);
    if (homeStatus) {
      homeStatus.textContent = message;
      homeStatus.classList.toggle('error', error);
      homeStatus.hidden = false;
    }
    if (speak) speakStatus(message);
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

  function runVoiceAction(label, action) {
    setStatus(`${label} शुरू किया जा रहा है।`);
    try {
      Promise.resolve(action()).catch(error => {
        setStatus(error?.message || 'यह काम पूरा नहीं हो पाया।', true);
      });
    } catch (error) {
      setStatus(error?.message || 'यह काम पूरा नहीं हो पाया।', true);
    }
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
    runVoiceAction(`₹${amount.toLocaleString('en-IN')} की बैटल`, () => form.requestSubmit());
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
    runVoiceAction(`₹${amount.toLocaleString('en-IN')} की निकासी`, () => form.requestSubmit());
  }

  function prepareDeposit(amount) {
    const form = app.el('qrForm');
    const input = app.el('depositAmount');
    if (!form || !input) throw new Error('जमा करने का विकल्प उपलब्ध नहीं है।');
    if (amount < Number(input.min)) throw new Error(`जमा राशि कम से कम ₹${input.min} होनी चाहिए।`);
    app.setView('wallet');
    input.value = String(amount);
    runVoiceAction(`₹${amount.toLocaleString('en-IN')} का जमा QR`, () => form.requestSubmit());
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
    runVoiceAction(`₹${amount.toLocaleString('en-IN')} की बैटल में शामिल होना`, () => {
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
    runVoiceAction(`Player name “${name}” सेव करना`, () => form.requestSubmit());
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
        && control.id !== 'voiceHomeToggle');
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
    runVoiceAction(`“${normalize(control.innerText || control.textContent)}” विकल्प`, () => {
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
      setStatus('AI assistant कमांड नहीं समझ पाया। Hindi या Hinglish में कोशिश करें, जैसे “500 की battle लगाओ” या “wallet kholo”।', true);
      return;
    }

    if (intent.action === 'navigate') {
      if (intent.view === 'support') window.location.href = '/support.html';
      else if (intent.view === 'chat') window.location.href = '/support.html';
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
      runVoiceAction(`Player name “${name}” सेव करना`, () => form.requestSubmit());
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
    setStatus('AI assistant command समझ रहा है। अपरिचित आवाज़ का text Google Gemini को भेजा जाएगा।', false, false);
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
      runVoiceAction('Admin review के लिए battle cancellation request', async () => {
        const result = await app.api('/api/matches/cancel', {
          method: 'POST',
          body: JSON.stringify({ matchId, reason })
        });
        app.notify(result.message);
        await app.refresh();
      });
      return;
    }
    runVoiceAction('आपकी एक बैटल रद्द करना', () => {
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
      stopListening();
      return;
    }
    if (prepareProfileName(text)) return;
    if (fillRoomCode(text)) return;
    if (matchesAny(text, [/प्रोफाइल/, /प्रोफ़ाइल/, /profile/])
        && matchesAny(text, [/save/, /सेव/, /सहेज/, /submit/, /करें/])) {
      const form = app.el('profileForm');
      if (form) {
        app.setView('profile');
        runVoiceAction('प्रोफ़ाइल विवरण सेव करना', () => form.requestSubmit());
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
      window.location.href = '/support.html';
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
          runVoiceAction('KYC review request भेजना', () => submitButton.form.requestSubmit(submitButton));
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
          runVoiceAction('निकासी अनुरोध भेजना', () => form.requestSubmit());
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
          runVoiceAction('जमा अनुरोध भेजना', () => form.requestSubmit());
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
    startButton.textContent = '🎤 AI Assistant शुरू करें';
    if (homeStartButton) {
      homeStartButton.disabled = !Recognition;
      homeStartButton.textContent = listening ? '⏹ रोकें' : '🎤 AI Assistant';
      homeStartButton.setAttribute('aria-pressed', String(listening));
      homeStartButton.title = listening
        ? 'आवाज़ बंद करें'
        : aiAssistantEnabled ? 'Hindi AI Assistant शुरू करें' : 'Voice controls; AI service अभी उपलब्ध नहीं है';
    }
  }

  function stopListening() {
    const wasListening = listening;
    listening = false;
    voiceRepliesEnabled = false;
    window.clearTimeout(restartTimer);
    if (activeUtterance && speechSynthesis) {
      activeUtterance = null;
      replySpeaking = false;
      speechSynthesis.cancel();
    }
    if (recognition && wasListening && recognitionActive) {
      try {
        recognition.stop();
        recognitionActive = false;
      } catch (error) {
        setStatus(`माइक बंद नहीं हो पाया: ${error.message}`, true);
      }
    }
    setStatus('आवाज़ बंद है।');
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
      recognitionActive = true;
      listening = true;
      voiceRepliesEnabled = true;
      updateVoiceButtons();
      setStatus(aiAssistantEnabled
        ? 'AI assistant सुन रहा है। अनजान command समझने के लिए transcript Google Gemini को भेजा जाएगा।'
        : 'माइक चालू है। हिंदी में वेबसाइट के विकल्प बोलें।', false, false);
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
      setStatus(`सुना: “${transcript}”`, false, false);
      handleCommand(transcript).catch(error => setStatus(error?.message || 'कमांड पूरा नहीं हो पाया।', true));
    };
    recognition.onerror = event => {
      if (event.error === 'no-speech' || event.error === 'aborted') return;
      listening = false;
      recognitionActive = false;
      updateVoiceButtons();
      setStatus(event.error === 'not-allowed' || event.error === 'service-not-allowed'
        ? 'माइक की अनुमति नहीं मिली। Browser settings में microphone अनुमति दें।'
        : `आवाज़ पहचान में समस्या हुई: ${event.error}`, true);
    };
    recognition.onend = () => {
      recognitionActive = false;
      if (!listening || replySpeaking) return;
      window.clearTimeout(restartTimer);
      restartTimer = window.setTimeout(() => {
        if (!listening) return;
        try {
          recognition.start();
          recognitionActive = true;
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
  homeStartButton?.addEventListener('click', event => {
    event.stopPropagation();
    if (listening) stopListening();
    else startListening();
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
