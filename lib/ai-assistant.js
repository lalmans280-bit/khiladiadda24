const ACTIONS = new Set([
  'navigate',
  'create_battle',
  'join_battle',
  'cancel_battle',
  'deposit',
  'withdraw',
  'select_game',
  'click_control',
  'select_option',
  'profile_name',
  'room_code',
  'stop_listening',
  'unknown'
]);

const VIEWS = new Set(['home', 'wallet', 'profile', 'history', 'support']);
const GAME_TYPES = new Set(['LUDO', 'POPULAR_LUDO', 'LUDO_RACE', 'SNAKE']);
const CANCEL_REASONS = new Set([
  'OPPONENT_NOT_JOINED',
  'ROOM_CODE_NOT_SHARED',
  'OPPONENT_NOT_RESPONDING',
  'WRONG_ROOM_CODE',
  'TECHNICAL_ISSUE',
  'OTHER'
]);

function isSensitiveAssistantText(value) {
  const text = String(value || '');
  return /\b(?:aadhaar|aadhar|otp|one[\s-]?time password|pin|password|passcode|cvv|upi\s*id|bank account|account number)\b/i.test(text)
    || /\b\d{10,12}\b/.test(text)
    || /\b[\w.+-]+@[\w.-]+\b/.test(text)
    || /(?:room code|रूम कोड).{0,30}\d{4,8}/i.test(text)
    || /आधार|ओटीपी|यूपीआई/.test(text);
}

function normalizeAIIntent(value, visibleControls = []) {
  const unknown = {
    action: 'unknown',
    view: '',
    amount: 0,
    gameType: '',
    controlLabel: '',
    optionLabel: '',
    name: '',
    roomCode: '',
    reason: ''
  };
  if (!value || typeof value !== 'object' || Array.isArray(value)) return unknown;

  const action = String(value.action || '');
  if (!ACTIONS.has(action)) return unknown;

  const amount = Number(value.amount);
  const requestedView = String(value.view || '');
  const intent = {
    ...unknown,
    action,
    view: requestedView === 'chat' ? 'support' : VIEWS.has(requestedView) ? requestedView : '',
    amount: Number.isSafeInteger(amount) && amount > 0 && amount <= 1000000 ? amount : 0,
    gameType: GAME_TYPES.has(String(value.gameType || '')) ? String(value.gameType) : '',
    optionLabel: String(value.optionLabel || '').trim().slice(0, 80),
    reason: CANCEL_REASONS.has(String(value.reason || '')) ? String(value.reason) : ''
  };

  if (action === 'navigate' && !intent.view) return unknown;
  if (action === 'select_game' && !intent.gameType) return unknown;
  if (action === 'create_battle' && value.gameType && !intent.gameType) return unknown;

  if (action === 'click_control') {
    const requestedLabel = String(value.controlLabel || '').trim().toLowerCase().replace(/\s+/g, ' ');
    const matches = visibleControls.filter(label => String(label).trim().toLowerCase().replace(/\s+/g, ' ') === requestedLabel);
    if (matches.length !== 1) return unknown;
    intent.controlLabel = String(matches[0]).trim().slice(0, 80);
  }

  if (action === 'profile_name') {
    const name = String(value.name || '').replace(/[\u0000-\u001f\u007f]/g, '').trim();
    if (name.length < 2 || name.length > 40) return unknown;
    intent.name = name;
  }

  if (action === 'room_code') {
    const roomCode = String(value.roomCode || '').trim();
    if (!/^\d{4,8}$/.test(roomCode)) return unknown;
    intent.roomCode = roomCode;
  }

  if (action === 'select_option' && !intent.optionLabel) return unknown;
  return intent;
}

module.exports = {
  isSensitiveAssistantText,
  normalizeAIIntent
};
