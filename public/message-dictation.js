(() => {
  const button = document.getElementById('dictationButton');
  const input = document.getElementById('message');
  const status = document.getElementById('dictationStatus');
  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!button || !input || !status) return;

  let recognition = null;
  let shouldListen = false;
  let recognitionActive = false;
  let restartTimer = 0;

  function setStatus(message, isError = false) {
    status.textContent = message;
    status.classList.toggle('error', isError);
  }

  function updateButton() {
    button.textContent = shouldListen ? '⏹ बोलना रोकें' : '🎙️ बोलकर लिखें';
    button.setAttribute('aria-pressed', String(shouldListen));
  }

  function appendTranscript(value) {
    const text = String(value || '').trim();
    if (!text) return;

    const current = input.value;
    const start = Number.isInteger(input.selectionStart) ? input.selectionStart : current.length;
    const end = Number.isInteger(input.selectionEnd) ? input.selectionEnd : start;
    const before = current.slice(0, start);
    const after = current.slice(end);
    const prefix = before && !/\s$/u.test(before) ? ' ' : '';
    const suffix = after && !/^\s/u.test(after) ? ' ' : '';
    const insertion = `${prefix}${text}${suffix}`;
    const available = input.maxLength > 0
      ? input.maxLength - (current.length - (end - start))
      : insertion.length;
    const safeInsertion = insertion.slice(0, Math.max(0, available));
    if (!safeInsertion) {
      setStatus('Message की 1000 अक्षरों की सीमा पूरी हो गई है।', true);
      return;
    }

    input.setRangeText(safeInsertion, start, end, 'end');
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.focus();
    setStatus(safeInsertion.length < insertion.length
      ? 'Message की 1000 अक्षरों की सीमा पूरी हो गई है।'
      : 'बोले गए शब्द message में लिखे गए हैं; भेजने के लिए Message बटन दबाएँ।');
  }

  function startRecognition() {
    if (!shouldListen || !recognition) return;
    try {
      recognition.start();
      recognitionActive = true;
    } catch (error) {
      shouldListen = false;
      recognitionActive = false;
      updateButton();
      setStatus(`माइक शुरू नहीं हो पाया: ${error.message}`, true);
    }
  }

  function stopDictation() {
    shouldListen = false;
    window.clearTimeout(restartTimer);
    restartTimer = 0;
    if (recognition && recognitionActive) {
      try {
        recognition.stop();
      } catch (error) {
        setStatus(`माइक बंद नहीं हो पाया: ${error.message}`, true);
      }
    }
    recognitionActive = false;
    updateButton();
    setStatus('बोलना रुक गया। लिखा हुआ message भेजने के लिए Message बटन दबाएँ।');
  }

  function startDictation() {
    if (!Recognition) {
      setStatus('इस browser में voice typing उपलब्ध नहीं है। Chrome या Android browser में कोशिश करें।', true);
      return;
    }
    if (!window.isSecureContext) {
      setStatus('Voice typing के लिए वेबसाइट HTTPS पर खोलें।', true);
      return;
    }

    recognition = new Recognition();
    recognition.lang = 'hi-IN';
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.onresult = event => {
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index];
        if (result.isFinal) appendTranscript(result[0]?.transcript);
      }
    };
    recognition.onerror = event => {
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        shouldListen = false;
        updateButton();
        setStatus('माइक की अनुमति नहीं मिली। Browser settings में microphone अनुमति दें।', true);
      } else if (event.error !== 'no-speech' && event.error !== 'aborted') {
        setStatus(`Voice typing में समस्या हुई: ${event.error}`, true);
      }
    };
    recognition.onend = () => {
      recognitionActive = false;
      if (!shouldListen) {
        updateButton();
        return;
      }
      window.clearTimeout(restartTimer);
      restartTimer = window.setTimeout(startRecognition, 250);
    };

    shouldListen = true;
    updateButton();
    setStatus('अब बोलें; शब्द message में लिखेंगे, अपने-आप नहीं भेजेंगे।');
    startRecognition();
  }

  button.addEventListener('click', () => {
    if (shouldListen) stopDictation();
    else startDictation();
  });

  updateButton();
  if (!Recognition) {
    button.disabled = true;
    setStatus('इस browser में voice typing उपलब्ध नहीं है। Chrome या Android browser में कोशिश करें।', true);
  }
})();
