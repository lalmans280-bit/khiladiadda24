(() => {
  const app = window.matchApp;
  if (!app) {
    console.error('Game feedback could not initialize: matchApp is unavailable.');
    return;
  }

  const speech = window.speechSynthesis;
  const SpeechUtterance = window.SpeechSynthesisUtterance;
  const getSpeechVoices = () => typeof speech?.getVoices === 'function' ? speech.getVoices() : [];
  let voices = getSpeechVoices();
  let voiceUnavailableNoticeShown = false;

  if (speech?.addEventListener) {
    speech.addEventListener('voiceschanged', () => {
      voices = getSpeechVoices();
    });
  }

  const reportVoiceUnavailable = error => {
    if (error) console.error('Hindi speech could not play.', error);
    if (voiceUnavailableNoticeShown) return;
    voiceUnavailableNoticeShown = true;
    app.notify('इस ब्राउज़र में हिंदी आवाज़ उपलब्ध नहीं है।', true);
  };

  app.playGameActionBeep = () => app.playAlertTone?.();
  app.announceHindiStatus = message => {
    if (!speech || !SpeechUtterance || typeof speech.speak !== 'function') {
      reportVoiceUnavailable();
      return false;
    }

    const availableVoices = getSpeechVoices();
    if (availableVoices.length) voices = availableVoices;

    const hindiVoices = voices.filter(voice => /^hi(?:-|_|$)/i.test(voice.lang));
    const preferredVoice = hindiVoices.find(voice =>
      /female|woman|swara|kalpana|priya|sangeeta|lekha|heera|veena|aarti/i.test(voice.name)
    ) || hindiVoices[0];
    const utterance = new SpeechUtterance(message);
    utterance.lang = 'hi-IN';
    utterance.rate = 0.9;
    utterance.pitch = 1.12;
    utterance.volume = 1;
    if (preferredVoice) utterance.voice = preferredVoice;

    try {
      speech.cancel?.();
      speech.speak(utterance);
      return true;
    } catch (error) {
      reportVoiceUnavailable(error);
      return false;
    }
  };
  app.announceCancelOutcome = result => {
    const message = result?.match?.status === 'PENDING_CANCELLATION'
      ? 'गेम कैंसल करने की रिक्वेस्ट एडमिन को भेज दी गई है। मंज़ूरी का इंतज़ार करें।'
      : 'गेम कैंसल हो गया है। एंट्री का पैसा वापस कर दिया गया है।';
    app.announceHindiStatus(message);
  };
})();
