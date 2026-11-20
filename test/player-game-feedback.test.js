const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function createFeedbackHarness(userId = 'player-1') {
  const spoken = [];
  const utterances = [];
  const documentListeners = {};
  const app = {
    getPlayer: () => ({ _id: userId }),
    notify: () => {}
  };
  class SpeechUtterance {
    constructor(text) {
      this.text = text;
    }
  }
  const window = {
    matchApp: app,
    speechSynthesis: {
      getVoices: () => [{ lang: 'hi-IN', name: 'Hindi Female' }],
      addEventListener: () => {},
      cancel: () => {},
      speak: utterance => {
        spoken.push(utterance.text);
        utterances.push(utterance);
      }
    },
    SpeechSynthesisUtterance: SpeechUtterance,
    siteI18n: {
      translate: (text, language) => {
        if (language !== 'hi') return text;
        return {
          'A custom option': 'कस्टम विकल्प',
          'Ludo Classic': 'लूडो क्लासिक'
        }[text] || text;
      }
    }
  };
  const document = {
    addEventListener: (type, listener) => {
      documentListeners[type] = listener;
    }
  };
  const source = fs.readFileSync(require.resolve('../public/player-game-feedback.js'), 'utf8');
  vm.runInNewContext(source, { window, document, console });
  return { app, spoken, utterances, documentListeners };
}

function createControl({ id = '', dataset = {}, text = '', disabled = false, selectedOptions, formId } = {}) {
  const form = formId ? { id: formId } : null;
  return {
    id,
    dataset,
    textContent: text,
    innerText: text,
    disabled,
    selectedOptions,
    classList: { contains: () => false },
    getAttribute: () => null,
    closest(selector) { return selector === 'form' && form ? form : this; }
  };
}

test('announces the missing wallet recharge amount', () => {
  const { app, spoken } = createFeedbackHarness();

  app.announceWalletRecharge(150);

  assert.match(spoken[0], /₹150/);
  assert.match(spoken[0], /रिचार्ज/);
});

test('announces the entered deposit amount and minimum', () => {
  const { app, spoken } = createFeedbackHarness();

  app.announceWalletAmount('deposit', 1500);

  assert.match(spoken[0], /₹1,500/);
  assert.match(spoken[0], /पचास रुपये/);
});

test('announces the entered withdrawal amount and limits', () => {
  const { app, spoken } = createFeedbackHarness();

  app.announceWalletAmount('withdrawal', 700);

  assert.match(spoken[0], /₹700/);
  assert.match(spoken[0], /पाँच सौ रुपये/);
  assert.match(spoken[0], /सौ रुपये/);
});

test('announces the battle entry amount and minimum increments', () => {
  const { app, spoken } = createFeedbackHarness();

  app.announceBattleEntryAmount(250);

  assert.match(spoken[0], /₹250/);
  assert.match(spoken[0], /एंट्री राशि वाला बैटल/);
  assert.match(spoken[0], /पचास रुपये के गुणक/);
});

test('announces the win screenshot submission instructions', () => {
  const { app, spoken } = createFeedbackHarness();

  app.announceWinScreenshotPrompt();

  assert.match(spoken[0], /स्क्रीनशॉट/);
  assert.match(spoken[0], /Result review/);
});

test('announces that a confirmed win has been credited', () => {
  const { app, spoken } = createFeedbackHarness();

  app.announceResultReport({
    creator: 'player-1',
    joiner: 'player-2',
    winner: 'player-1',
    status: 'COMPLETED'
  });

  assert.match(spoken[0], /इनाम वॉलेट में जमा/);
});

test('clicked navigation is announced in Hindi using a female Hindi voice', () => {
  const { utterances, documentListeners } = createFeedbackHarness();

  documentListeners.click({
    target: createControl({ dataset: { view: 'wallet' }, text: 'Wallet' })
  });

  assert.match(utterances[0].text, /वॉलेट/);
  assert.equal(utterances[0].lang, 'hi-IN');
  assert.equal(utterances[0].voice.name, 'Hindi Female');
  assert.equal(utterances[0].pitch, 1.18);
});

test('English UI selection is still explained in Hindi', () => {
  const { spoken, documentListeners } = createFeedbackHarness();

  documentListeners.click({
    target: createControl({ dataset: { langToggle: 'en' }, text: 'EN' })
  });

  assert.match(spoken[0], /अंग्रेज़ी भाषा/);
});

test('generic and select options use Hindi guidance', () => {
  const { spoken, documentListeners } = createFeedbackHarness();

  documentListeners.click({ target: createControl({ text: 'A custom option' }) });
  documentListeners.change({
    target: createControl({ selectedOptions: [{ textContent: 'Ludo Classic' }] })
  });

  assert.match(spoken[0], /कस्टम विकल्प/);
  assert.match(spoken[1], /लूडो क्लासिक/);
});

test('form actions announce relevant Hindi instructions', () => {
  const { spoken, documentListeners } = createFeedbackHarness();

  documentListeners.click({
    target: createControl({ text: 'Submit', formId: 'withdrawForm' })
  });

  assert.match(spoken[0], /निकासी/);
  assert.match(spoken[0], /KYC मंज़ूर/);
});

test('disabled options do not announce', () => {
  const { spoken, documentListeners } = createFeedbackHarness();

  documentListeners.click({
    target: createControl({ dataset: { view: 'wallet' }, disabled: true })
  });

  assert.equal(spoken.length, 0);
});
