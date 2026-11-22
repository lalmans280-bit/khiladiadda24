const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('locked room code offers joiners an admin-reviewed wrong-code request', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'public', 'index.html'), 'utf8');

  assert.match(
    html,
    /isJoiner&&!m\.gameStartedAt\?`<button[^`]*data-running-wrong-code="\$\{esc\(m\._id\)\}"[^`]*Galat code\? Admin se cancel request karein/
  );
  assert.match(
    html,
    /data-running-wrong-code[\s\S]*?\/api\/matches\/cancel[\s\S]*?reason:'WRONG_ROOM_CODE'/
  );
  assert.match(
    html,
    /confirm\('Room code galat hai\? Cancel request admin ko bheji jayegi\. Admin ke faisle tak match cancel ya refund nahi hoga\.'\)/
  );
});
