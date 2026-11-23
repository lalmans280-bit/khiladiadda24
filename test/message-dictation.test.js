const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function createDictationHarness(initialText = '') {
  const listeners = new Map();
  const events = [];
  const button = {
    disabled: false,
    addEventListener: (type, listener) => listeners.set(type, listener),
    setAttribute(name, value) { this[name] = value; }
  };
  const input = {
    value: initialText,
    maxLength: 1000,
    selectionStart: initialText.length,
    selectionEnd: initialText.length,
    setRangeText(text, start, end) {
      this.value = `${this.value.slice(0, start)}${text}${this.value.slice(end)}`;
      this.selectionStart = start + text.length;
      this.selectionEnd = this.selectionStart;
    },
    dispatchEvent: event => events.push(event.type),
    focus() {}
  };
  const status = {
    classList: { toggle() {} },
    textContent: ''
  };
  const elements = new Map([
    ['dictationButton', button],
    ['message', input],
    ['dictationStatus', status]
  ]);
  let recognition;
  class Recognition {
    constructor() {
      recognition = this;
    }

    start() {}
    stop() {}
  }
  const window = {
    SpeechRecognition: Recognition,
    isSecureContext: true,
    setTimeout: () => 1,
    clearTimeout() {}
  };
  const document = { getElementById: id => elements.get(id) || null };
  const Event = class {
    constructor(type) {
      this.type = type;
    }
  };

  vm.runInNewContext(
    fs.readFileSync(require.resolve('../public/message-dictation.js'), 'utf8'),
    { window, document, Event }
  );
  return {
    button,
    input,
    status,
    events,
    recognition: () => recognition,
    click: () => listeners.get('click')()
  };
}

test('dictation appends final speech chunks into the message field without sending', () => {
  const harness = createDictationHarness('Hello');
  harness.click();
  const recognition = harness.recognition();
  recognition.onresult({
    resultIndex: 0,
    results: [
      { isFinal: true, 0: { transcript: 'namaste' } },
      { isFinal: false, 0: { transcript: 'draft words' } }
    ]
  });
  recognition.onresult({
    resultIndex: 0,
    results: [{ isFinal: true, 0: { transcript: 'my problem' } }]
  });

  assert.equal(harness.input.value, 'Hello namaste my problem');
  assert.deepEqual(harness.events, ['input', 'input']);
  assert.match(harness.status.textContent, /Message बटन दबाएँ/);
  assert.equal(harness.button['aria-pressed'], 'true');
});

test('chat and support pages provide a separate voice-typing button', () => {
  for (const page of ['chat.html', 'support.html']) {
    const html = fs.readFileSync(require.resolve(`../public/${page}`), 'utf8');
    assert.match(html, /id="dictationButton"[^>]*type="button"/);
    assert.match(html, /id="dictationStatus"[^>]*aria-live="polite"/);
    assert.match(html, /message-dictation\.js/);
  }
});
