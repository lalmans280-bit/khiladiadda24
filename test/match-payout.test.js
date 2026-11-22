const test = require('node:test');
const assert = require('node:assert/strict');
const { calculateMatchPayout } = require('../lib/match-payout');

test('pays the winner 97% and credits 3% commission from the pool', () => {
  assert.deepEqual(calculateMatchPayout(100), {
    winAmount: 97,
    adminCommission: 3
  });
  assert.deepEqual(calculateMatchPayout(250), {
    winAmount: 242.5,
    adminCommission: 7.5
  });
});
