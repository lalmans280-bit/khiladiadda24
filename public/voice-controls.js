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
  let restartTimer = 0;
  let pendingAction = null;
  let pendingTimer = 0;

  function setStatus(message, error = false) {
    status.textContent = message;
    status.classList.toggle('error', error);
  }

  function normalize(text) {
    return String(text || '')
      .toLowerCase()
      .replace(/[०-९]/g, digit => String('०१२३४५६७८९'.indexOf(digit)))
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
    if (message) setStatus(message);
  }

  function askConfirmation(label, action) {
    clearPending();
    pendingAction = action;
    confirmButton.hidden = false;
    cancelButton.hidden = false;
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

  async function prepareCancellation() {
    app.setView('home');
    await app.refresh();
    const openCancels = [...document.querySelectorAll('#openMatches [data-cancel-match]')];
    const runningCancels = [...document.querySelectorAll('#runningMatches [data-running-cancel]')]
      .filter(button => button.dataset.roomCodeShared !== '1');
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
    if (matchesAny(text, [/cancel/, /कैंसल/, /रद्द/, /रद्द कर/]) && matchesAny(text, [/battle/, /बैटल/, /game/, /गेम/])) {
      await prepareCancellation();
      return;
    }
    if (matchesAny(text, [/निकाल/, /withdraw/, /निकासी/])) {
      const amount = getAmount(text);
      if (!Number.isFinite(amount)) {
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
    setStatus('यह आवाज़ कमांड समझ नहीं आया। प्रोफ़ाइल में दिए उदाहरण बोलें।', true);
  }

  function stopListening() {
    listening = false;
    window.clearTimeout(restartTimer);
    if (recognition) recognition.stop();
    clearPending('आवाज़ बंद है।');
    startButton.disabled = !Recognition;
    stopButton.disabled = true;
  }

  if (!Recognition) {
    startButton.disabled = true;
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
      stopButton.disabled = true;
      startButton.disabled = false;
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
          stopButton.disabled = true;
          startButton.disabled = false;
          setStatus(`माइक शुरू नहीं हो पाया: ${error.message}`, true);
        }
      }, 250);
    };
    startButton.addEventListener('click', () => {
      if (!window.isSecureContext) {
        setStatus('माइक के लिए वेबसाइट HTTPS पर खोलें।', true);
        return;
      }
      try {
        recognition.start();
        listening = true;
        startButton.disabled = true;
        stopButton.disabled = false;
        setStatus('माइक चालू है। हिंदी में कमांड बोलें।');
      } catch (error) {
        setStatus(`माइक शुरू नहीं हो पाया: ${error.message}`, true);
      }
    });
  }

  stopButton.addEventListener('click', stopListening);
  confirmButton.addEventListener('click', confirmPending);
  cancelButton.addEventListener('click', cancelPending);
})();
