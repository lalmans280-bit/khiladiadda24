const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function createFeedbackHarness(userId = 'player-1') {
  const spoken = [];
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
      speak: utterance => spoken.push(utterance.text)
    },
    SpeechSynthesisUtterance: SpeechUtterance
  };
  const source = fs.readFileSync(require.resolve('../public/player-game-feedback.js'), 'utf8');
  vm.runInNewContext(source, { window, console });
  return { app, spoken };
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
