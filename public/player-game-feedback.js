(() => {
  const app = window.matchApp;
  if (!app) {
    console.error('Game feedback could not initialize: matchApp is unavailable.');
    return;
  }

  const speech = window.speechSynthesis;
  const SpeechUtterance = window.SpeechSynthesisUtterance;
  const getSpeechVoices = () => typeof speech?.getVoices === 'function' ? speech.getVoices() : [];
  const femaleHindiVoicePattern = /female|woman|swara|kalpana|priya|sangeeta|lekha|heera|veena|aarti|ananya/i;
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
  app.announceBattleEntryAmount = amount => {
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) return false;
    return app.announceHindiStatus(
      `आप ₹${value.toLocaleString('en-IN')} की एंट्री राशि वाला बैटल बना रहे हैं। कम से कम पचास रुपये और पचास रुपये के गुणक में राशि रखें।`
    );
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
    const preferredVoice = hindiVoices.find(voice => femaleHindiVoicePattern.test(voice.name)) || hindiVoices[0];
    const utterance = new SpeechUtterance(message);
    utterance.lang = 'hi-IN';
    utterance.rate = 0.9;
    utterance.pitch = 1.18;
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
  const viewAnnouncements = {
    home: 'होम स्क्रीन खुल रही है। यहाँ नया बैटल बनाएं और खुले बैटल देखें।',
    games: 'गेम स्क्रीन खुल रही है। यहाँ उपलब्ध गेम और बैटल चुनें।',
    wallet: 'वॉलेट खुल रहा है। यहाँ बैलेंस, जमा और निकासी की जानकारी है।',
    profile: 'प्रोफ़ाइल खुल रही है। यहाँ खिलाड़ी और खाते की जानकारी देखें।',
    history: 'इतिहास खुल रहा है। यहाँ गेम और वॉलेट की पिछली गतिविधियाँ देखें।',
    match: 'बैटल की जानकारी खुल रही है। यहाँ मैच और अगला कदम देखें।',
    battles: 'खुले बैटल की सूची खुल रही है।'
  };
  const gameAnnouncements = {
    LUDO: 'लूडो क्लासिक चुना गया है।',
    POPULAR_LUDO: 'पॉपुलर लूडो चुना गया है।',
    LUDO_RACE: 'लूडो रेस चुना गया है। पहली गोटी घर पहुँचाने वाला खिलाड़ी जीतता है।',
    SNAKE: 'स्नेक बैटल चुना गया है।'
  };
  const formAnnouncements = {
    createForm: 'बैटल बनाने से पहले एंट्री राशि चुनें। न्यूनतम राशि पचास रुपये है।',
    qrForm: 'वॉलेट में जमा अनुरोध के लिए राशि भरें। भुगतान के बाद UTR और स्क्रीनशॉट जमा करें। न्यूनतम जमा पचास रुपये है।',
    depositForm: 'जमा की पुष्टि के लिए UTR नंबर और भुगतान का स्क्रीनशॉट भेजें।',
    withdrawForm: 'निकासी के लिए राशि और UPI ID भरें। न्यूनतम पाँच सौ रुपये हैं और KYC मंज़ूर होना ज़रूरी है।',
    kycForm: 'आधार की जानकारी और कार्ड की तस्वीर KYC जाँच के लिए भेजें। OTP या PIN साझा न करें।',
    profileForm: 'अपनी प्रोफ़ाइल में खिलाड़ी का नाम और तस्वीर सेव करें।',
    roomForm: 'Ludo King में रूम बनाकर उसका कोड यहाँ साझा करें।',
    resultForm: 'विजेता चुनें और नतीजे का स्क्रीनशॉट एडमिन समीक्षा के लिए भेजें।',
    cancelForm: 'बैटल रद्द करने का कारण चुनें। रिफंड की मंज़ूरी एडमिन देगा।'
  };
  const getPlayerOptionAnnouncement = control => {
    const data = control.dataset || {};
    if (data.langToggle) {
      return data.langToggle === 'en'
        ? 'अंग्रेज़ी भाषा दिखाई जाएगी, लेकिन विकल्पों की जानकारी हिंदी आवाज़ में बताई जाएगी।'
        : 'हिंदी भाषा चुनी गई है। विकल्पों की जानकारी हिंदी आवाज़ में बताई जाएगी।';
    }
    if (viewAnnouncements[data.view]) return viewAnnouncements[data.view];
    if (gameAnnouncements[data.gameOption]) return gameAnnouncements[data.gameOption];
    if (data.menuAction === 'referral') return 'रेफ़रल विकल्प खुल रहा है। अपना रेफ़रल आईडी साझा करके दोस्तों को आमंत्रित करें।';
    if (data.menuAction === 'notifications') return 'सूचनाएँ खुल रही हैं। यहाँ नई जानकारी देखें।';
    if (data.join !== undefined) return 'आप इस बैटल में शामिल होने का विकल्प चुन रहे हैं। एंट्री राशि और इनाम जाँच लें।';
    if (data.demoPlay !== undefined) return 'यह नमूना बैटल है। इसमें शामिल नहीं हो सकते।';
    if (data.cancelMatch !== undefined || data.demoCancel !== undefined) return 'बैटल रद्द करने का विकल्प चुना गया है। आगे बढ़ने से पहले कारण जाँच लें।';
    if (control.classList?.contains('brand')) return viewAnnouncements.home;
    if (control.id === 'menuToggle') return 'मेन्यू का विकल्प चुना गया है। यहाँ होम, गेम, वॉलेट, प्रोफ़ाइल और सहायता के विकल्प हैं।';
    if (control.id === 'refreshOpen') return 'खुले बैटल की सूची ताज़ा की जा रही है।';
    if (control.id === 'gameRefreshOpen') return 'इस गेम के खुले बैटल ताज़ा किए जा रहे हैं।';
    if (control.id === 'refreshHistory') return 'गेम और वॉलेट का इतिहास ताज़ा किया जा रहा है।';
    if (control.id === 'backToGames') return 'गेम सूची पर वापस जा रहे हैं। यहाँ उपलब्ध गेम और बैटल चुनें।';
    if (control.id === 'copyReferral') return 'अपनी रेफ़रल ID कॉपी करके दोस्तों के साथ साझा करें।';
    if (control.id === 'copyRoom') return 'रूम कोड कॉपी करके Ludo King में जुड़ें।';
    if (control.id === 'logout' || control.id === 'logoutProfile') return 'लॉग आउट का विकल्प चुना गया है।';

    const form = control.closest?.('form');
    if (formAnnouncements[form?.id]) return formAnnouncements[form.id];

    const selectedOption = control.selectedOptions?.[0];
    const associatedLabel = control.labels?.[0];
    const rawLabel = selectedOption?.textContent
      || associatedLabel?.textContent
      || control.getAttribute?.('aria-label')
      || control.getAttribute?.('title')
      || control.innerText
      || control.textContent
      || control.value
      || '';
    const label = String(rawLabel).replace(/\s+/g, ' ').trim();
    if (!label) return 'यह विकल्प चुना गया है।';
    const hindiLabel = window.siteI18n?.translate?.(label, 'hi') || label;
    return /[\u0900-\u097F]/.test(hindiLabel)
      ? `आपने ${hindiLabel} विकल्प चुना है।`
      : 'यह विकल्प चुना गया है।';
  };
  app.announcePlayerOption = control => {
    if (!control) return false;
    return app.announceHindiStatus(getPlayerOptionAnnouncement(control));
  };
  if (typeof document !== 'undefined') {
    document.addEventListener('click', event => {
      const control = event.target?.closest?.('button,a,[role="button"],summary');
      if (!control || control.disabled || control.getAttribute?.('aria-disabled') === 'true') return;
      app.announcePlayerOption(control);
    });
    document.addEventListener('change', event => {
      const control = event.target?.closest?.('select,input[type="checkbox"],input[type="radio"],input[type="file"]');
      if (!control || control.disabled) return;
      app.announcePlayerOption(control);
    });
  }
  app.announceCancelOutcome = result => {
    const message = result?.match?.status === 'PENDING_CANCELLATION'
      ? 'गेम कैंसल करने की रिक्वेस्ट एडमिन को भेज दी गई है। मंज़ूरी का इंतज़ार करें।'
      : 'गेम कैंसल हो गया है। एंट्री का पैसा वापस कर दिया गया है।';
    app.announceHindiStatus(message);
  };
})();
