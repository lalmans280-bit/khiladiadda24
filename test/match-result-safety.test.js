const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('a single player report never credits an automatic winner payout', () => {
  const server = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8');
  const submitStart = server.indexOf("app.post('/api/matches/submit-result'");
  const submitEnd = server.indexOf("res.json({", submitStart);
  const submitHandler = server.slice(submitStart, submitEnd);

  assert.doesNotMatch(submitHandler, /creatorReportedLoss\s*!==\s*joinerReportedLoss/);
  assert.doesNotMatch(submitHandler, /\$inc:\s*\{\s*walletBalance:\s*winAmount/);
  assert.match(submitHandler, /\{\s*\$set:\s*\{\s*status:\s*'PENDING_RESULT',\s*winner:\s*null\s*\}\s*\}/);
});
