const test = require('node:test');
const assert = require('node:assert/strict');
const {
  isSensitiveAssistantText,
  normalizeAIIntent
} = require('../lib/ai-assistant');

test('allows only a unique visible button label for AI click intents', () => {
  const visibleControls = ['KYC review submit', 'Refresh'];
  assert.equal(normalizeAIIntent({
    action: 'click_control',
    controlLabel: 'kyc   review submit'
  }, visibleControls).controlLabel, 'KYC review submit');

  assert.equal(normalizeAIIntent({
    action: 'click_control',
    controlLabel: 'Hidden admin action'
  }, visibleControls).action, 'unknown');
  assert.equal(normalizeAIIntent({
    action: 'click_control',
    controlLabel: 'Refresh'
  }, ['Refresh', ' Refresh ']).action, 'unknown');
});

test('rejects invalid AI amounts and unsupported game types', () => {
  const intent = normalizeAIIntent({
    action: 'create_battle',
    amount: -500,
    gameType: 'LUDO'
  });
  assert.equal(intent.action, 'create_battle');
  assert.equal(intent.amount, 0);
  assert.equal(intent.gameType, 'LUDO');
  assert.equal(normalizeAIIntent({
    action: 'create_battle',
    amount: 500,
    gameType: 'UNSUPPORTED_GAME'
  }).action, 'unknown');
});

test('accepts only a well-formed room code and bounded player name', () => {
  assert.equal(normalizeAIIntent({
    action: 'room_code',
    roomCode: '12345'
  }).roomCode, '12345');
  assert.equal(normalizeAIIntent({
    action: 'room_code',
    roomCode: '123'
  }).action, 'unknown');
  assert.equal(normalizeAIIntent({
    action: 'profile_name',
    name: 'A'.repeat(41)
  }).action, 'unknown');
  assert.equal(isSensitiveAssistantText('Share room code 12345'), true);
});

test('blocks credentials and identifying numbers from AI interpretation', () => {
  assert.equal(isSensitiveAssistantText('Please read my OTP 123456'), true);
  assert.equal(isSensitiveAssistantText('My UPI ID is player@bank'), true);
  assert.equal(isSensitiveAssistantText('Create a battle for 500 rupees'), false);
});
