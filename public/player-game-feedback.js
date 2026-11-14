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
  app.announceWalletRecharge = amount => {
    const rechargeAmount = Math.max(50, Math.ceil(Number(amount) || 50));
    app.announceHindiStatus(`वॉलेट में पैसे कम हैं। कृपया ₹${rechargeAmount} रिचार्ज करें, फिर गेम में शामिल हों।`);
  };
  app.announceWalletAmount = (type, amount) => {
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) return false;
    const formattedAmount = value.toLocaleString('en-IN');
    const message = type === 'deposit'
      ? `आप जमा करने के लिए ₹${formattedAmount} भर रहे हैं। न्यूनतम जमा राशि पचास रुपये है।`
      : type === 'withdrawal'
        ? `आप निकासी के लिए ₹${formattedAmount} भर रहे हैं। कम से कम पाँच सौ रुपये और सौ रुपये के चरणों में राशि रखें।`
        : '';
    return message ? app.announceHindiStatus(message) : false;
  };
  app.announceWinScreenshotPrompt = () => {
    app.announceHindiStatus('गेम जीतने के बाद जीत का स्क्रीनशॉट अपलोड करके Result review भेजें। हारने पर I Lost चुनें।');
  };
  app.announceResultReport = match => {
    if (!match) return;
    const user = app.getPlayer?.() || app.getUser?.() || {};
    const userId = String(user._id || user.id || '');
    const creatorId = String(match.creator?._id || match.creator || '');
    const ownResult = creatorId === userId ? match.creatorResult : match.joinerResult;
    let message = 'आपकी रिपोर्ट जमा हो गई है। दूसरे खिलाड़ी की रिपोर्ट का इंतज़ार करें।';
    if (match.status === 'COMPLETED') {
      const winnerId = String(match.winner?._id || match.winner || '');
      message = winnerId === userId
        ? 'आपकी जीत की रिपोर्ट मंज़ूर हो गई है और इनाम वॉलेट में जमा हो गया है।'
        : 'रिज़ल्ट की पुष्टि हो गई है। दूसरा खिलाड़ी विजेता है।';
    } else if (match.status === 'PENDING_RESULT') {
      message = match.winner
        ? 'रिज़ल्ट और स्क्रीनशॉट एडमिन समीक्षा के लिए भेज दिए गए हैं। मंज़ूरी का इंतज़ार करें।'
        : 'दोनों खिलाड़ियों की रिपोर्ट में अंतर है। एडमिन समीक्षा का इंतज़ार करें।';
    } else if (ownResult === 'WIN') {
      message = 'आपकी जीत की रिपोर्ट और स्क्रीनशॉट जमा हो गया है। दूसरे खिलाड़ी की रिपोर्ट का इंतज़ार करें।';
    } else if (ownResult === 'LOSS') {
      message = 'आपकी हार की रिपोर्ट जमा हो गई है। दूसरे खिलाड़ी की रिपोर्ट का इंतज़ार करें।';
    }
    app.announceHindiStatus(message);
  };
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
