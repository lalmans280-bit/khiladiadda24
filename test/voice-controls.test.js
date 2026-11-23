const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function createVoiceHarness() {
  const elements = new Map();
  const status = {
    classList: { toggle() {} },
    textContent: ''
  };
  const button = () => {
    const listeners = new Map();
    return {
      disabled: false,
      listeners,
      addEventListener(type, listener) {
        listeners.set(type, listener);
      }
    };
  };
  const controlPanel = {
    addEventListener() {},
    querySelector: () => ({ textContent: '' })
  };
  const startButton = button();
  const stopButton = button();
  let submitted = 0;
  const input = { min: '50', max: '50000', step: '50', value: '50' };
  const form = { requestSubmit: () => { submitted += 1; } };
  const app = {
    api: async path => path === '/api/assistant/status'
      ? { enabled: false }
      : { intent: { action: 'create_battle', amount: 500 } },
    el: id => ({
      entryAmount: input,
      createForm: form
    })[id] || null,
    setView() {}
  };
  let recognition;
  class Recognition {
    constructor() {
      recognition = this;
    }

    start() {}
    stop() {}
  }
  elements.set('voiceControls', controlPanel);
  elements.set('voiceStart', startButton);
  elements.set('voiceStop', stopButton);
  elements.set('voiceStatus', status);
  const window = {
    matchApp: app,
    SpeechRecognition: Recognition,
    isSecureContext: true,
    setTimeout: () => 1,
    clearTimeout() {}
  };
  const document = {
    getElementById: id => elements.get(id) || null,
    querySelectorAll: () => []
  };

  vm.runInNewContext(
    fs.readFileSync(require.resolve('../public/voice-controls.js'), 'utf8'),
    { window, document, console }
  );
  return { startButton, status, window, get recognition() { return recognition; }, get submitted() { return submitted; } };
}

test('voice battle commands submit immediately without a confirmation step', async () => {
  const html = fs.readFileSync(require.resolve('../public/index.html'), 'utf8');
  assert.doesNotMatch(html, /id="voiceConfirm"|id="voiceCancel"/);
  const harness = createVoiceHarness();
  harness.startButton.listeners.get('click')();
  harness.recognition.onresult({
    results: [{ isFinal: true, 0: { transcript: '500 rupees ki battle lagao' } }]
  });
  await new Promise(resolve => setImmediate(resolve));

  assert.equal(harness.submitted, 1);
  assert.match(harness.status.textContent, /शुरू किया जा रहा है/);
  assert.doesNotMatch(harness.status.textContent, /पुष्टि/);
});
