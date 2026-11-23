const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function createFeedbackHarness() {
  const spoken = [];
  const listeners = {};
  const app = { notify() {} };
  const voices = [
    { lang: 'hi-IN', name: 'Hindi Male' },
    { lang: 'hi-IN', name: 'Hindi Female' }
  ];
  const translations = new Map([
    ['A custom option', 'कस्टम विकल्प'],
    ['Ludo Classic', 'लूडो क्लासिक']
  ]);
  class SpeechUtterance {
    constructor(text) {
      this.text = text;
    }
  }
  const window = {
    matchApp: app,
    speechSynthesis: {
      getVoices: () => voices,
      addEventListener() {},
      cancel() {},
      speak: utterance => spoken.push(utterance)
    },
    SpeechSynthesisUtterance: SpeechUtterance,
    siteI18n: {
      translate: (text, language) => language === 'hi' ? translations.get(text) || text : text
    }
  };
  const document = {
    addEventListener: (type, listener) => {
      listeners[type] = listener;
    }
  };
  const source = fs.readFileSync(require.resolve('../public/player-game-feedback.js'), 'utf8');
  vm.runInNewContext(source, { window, document, console });
  return { app, spoken, listeners };
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

test('clicked player navigation is announced in Hindi using a preferred female voice', () => {
  const { spoken, listeners } = createFeedbackHarness();

  listeners.click({ target: createControl({ dataset: { view: 'wallet' }, text: 'Wallet' }) });

  assert.match(spoken[0].text, /वॉलेट/);
  assert.equal(spoken[0].lang, 'hi-IN');
  assert.equal(spoken[0].voice.name, 'Hindi Female');
  assert.equal(spoken[0].pitch, 1.18);
});

test('language selection still announces in Hindi voice', () => {
  const { spoken, listeners } = createFeedbackHarness();

  listeners.click({ target: createControl({ dataset: { langToggle: 'en' }, text: 'EN' }) });

  assert.match(spoken[0].text, /अंग्रेज़ी भाषा/);
  assert.equal(spoken[0].lang, 'hi-IN');
});

test('generic and select options use the Hindi translation when available', () => {
  const { spoken, listeners } = createFeedbackHarness();

  listeners.click({ target: createControl({ text: 'A custom option' }) });
  listeners.change({
    target: createControl({
      selectedOptions: [{ textContent: 'Ludo Classic' }]
    })
  });

  assert.match(spoken[0].text, /कस्टम विकल्प/);
  assert.match(spoken[1].text, /लूडो क्लासिक/);
});

test('form actions announce relevant Hindi guidance', () => {
  const { spoken, listeners } = createFeedbackHarness();

  listeners.click({ target: createControl({ text: 'Submit', formId: 'withdrawForm' }) });

  assert.match(spoken[0].text, /निकासी/);
  assert.match(spoken[0].text, /KYC मंज़ूर/);
});

test('disabled options do not announce', () => {
  const { spoken, listeners } = createFeedbackHarness();

  listeners.click({ target: createControl({ dataset: { view: 'wallet' }, disabled: true }) });

  assert.equal(spoken.length, 0);
});
