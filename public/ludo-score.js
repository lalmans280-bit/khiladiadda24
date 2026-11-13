(() => {
  const track = [
    [6, 1], [6, 2], [6, 3], [6, 4], [6, 5], [5, 6], [4, 6], [3, 6], [2, 6], [1, 6], [0, 6],
    [0, 7], [0, 8], [1, 8], [2, 8], [3, 8], [4, 8], [5, 8], [6, 9], [6, 10], [6, 11], [6, 12],
    [6, 13], [6, 14], [7, 14], [8, 14], [8, 13], [8, 12], [8, 11], [8, 10], [8, 9], [9, 8],
    [10, 8], [11, 8], [12, 8], [13, 8], [14, 8], [14, 7], [14, 6], [13, 6], [12, 6], [11, 6],
    [10, 6], [9, 6], [8, 5], [8, 4], [8, 3], [8, 2], [8, 1], [8, 0], [7, 0], [6, 0]
  ];
  const colors = {
    red: { startIndex: 0, homePath: [[7, 1], [7, 2], [7, 3], [7, 4], [7, 5]], finish: [7, 7], baseSlots: [[1, 1], [1, 4], [4, 1], [4, 4]], yard: [0, 5, 0, 5], name: 'Lal', symbol: '🔴' },
    green: { startIndex: 26, homePath: [[8, 13], [8, 12], [8, 11], [8, 10], [8, 9]], finish: [7, 7], baseSlots: [[10, 10], [10, 13], [13, 10], [13, 13]], yard: [9, 14, 9, 14], name: 'Hara', symbol: '🟢' },
    yellow: { startIndex: 13, homePath: [[1, 7], [2, 7], [3, 7], [4, 7], [5, 7]], finish: [7, 7], baseSlots: [[1, 10], [1, 13], [4, 10], [4, 13]], yard: [0, 5, 9, 14], name: 'Peela', symbol: '🟡' },
    blue: { startIndex: 39, homePath: [[13, 7], [12, 7], [11, 7], [10, 7], [9, 7]], finish: [7, 7], baseSlots: [[10, 1], [10, 4], [13, 1], [13, 4]], yard: [9, 14, 0, 5], name: 'Neela', symbol: '🔵' }
  };
  const safeTrack = new Set([0, 8, 13, 21, 26, 34, 39, 47]);
  let activeMatchId = '';
  let activeSignature = '';
  let latestMatch;
  let busy = false;

  const style = document.createElement('style');
  style.textContent = `
    .ludo-score-panel{margin-top:14px;border:1px solid #3d6046;background:linear-gradient(145deg,#203126,#17231b)}
    .ludo-score-head{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap}
    .ludo-score-head h3{margin:0}
    .ludo-score-players{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:12px 0}
    .ludo-score-player{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:8px;min-width:0;padding:9px 11px;border:1px solid #405247;border-radius:10px;background:linear-gradient(135deg,#24382a,#1b2a20)}
    .ludo-score-player-main{display:flex;align-items:center;gap:8px;min-width:0}
    .ludo-score-avatar,.ludo-score-avatar-fallback{display:grid;place-items:center;width:40px;height:40px;flex:none;border:2px solid #d5c16b;border-radius:50%;object-fit:cover;color:#fff;background:#304336;font-size:16px;font-weight:900}
    .ludo-score-player-copy{min-width:0}
    .ludo-score-player-copy strong{display:block;overflow-wrap:anywhere}
    .ludo-score-player-copy small{color:var(--muted)}
    .ludo-score-player small{color:var(--muted)}
    .ludo-score-player.creator{border-color:#e16a5d}.ludo-score-player.joiner{border-color:#4bc174}
    .ludo-score-player.red{border-color:#e16a5d}.ludo-score-player.green{border-color:#4bc174}
    .ludo-score-player.yellow{border-color:#d4b333}.ludo-score-player.blue{border-color:#5a82c7}
    .ludo-score-turn-control{display:flex;align-items:center;gap:7px}
    .ludo-score-turn-control .ludo-score-dice-box{padding:5px 7px;gap:3px}
    .ludo-score-turn-control .ludo-score-die{width:42px;height:42px;min-width:42px;padding:5px;border-radius:11px}
    .ludo-score-turn-control .ludo-score-die-pip{width:7px;height:7px}
    .ludo-score-turn-control .ludo-score-roll{min-height:36px;padding:6px 9px}
    .ludo-score-status{margin:8px 0;padding:10px 12px;border:1px solid #405b46;border-radius:10px;background:#1d2d21}
    .ludo-score-timer{display:inline-grid;place-items:center;min-width:52px;padding:5px 8px;border:1px solid #d7b14e;border-radius:7px;color:#f4d36c;font-weight:800;font-variant-numeric:tabular-nums}
    .ludo-score-timer.urgent{color:#ff8c78;border-color:#ff8c78}
    .ludo-score-actions{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin:10px 0}
    .ludo-score-dice-box{display:grid;justify-items:center;gap:7px;padding:9px 12px;border:1px solid #7d6130;border-radius:14px;background:linear-gradient(145deg,#3b3020,#29271e)}
    .ludo-score-dice-label{color:#f4d36c;font-size:10px;font-weight:900;letter-spacing:1.2px}
    .ludo-score-die{display:grid;grid-template-columns:repeat(3,1fr);grid-template-rows:repeat(3,1fr);place-items:center;gap:2px;width:58px;height:58px;min-width:58px;padding:8px;border:2px solid #f4c252;border-radius:15px;background:linear-gradient(145deg,#fffef5,#ffe8a5 70%,#ffd36c);box-shadow:0 5px 0 #9a661d,0 9px 18px #0006,inset 0 0 0 2px #fff9;transform:rotate(-4deg);animation:ludo-die-pop .28s ease-out}
    .ludo-score-die-pip{width:9px;height:9px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#f77668,#bd302d 72%);box-shadow:0 1px 2px #64201c}
    .ludo-score-die-empty{grid-column:1/-1;grid-row:1/-1;display:grid;place-items:center;color:#8f6722;font-size:30px;font-weight:900}
    .ludo-score-roll{border:1px solid #ffd16a!important;background:linear-gradient(135deg,#ffd84f,#ff9838)!important;color:#38230b!important;font-weight:900!important;box-shadow:0 4px 0 #9e571d,0 8px 16px #0004}
    .ludo-score-roll:not(:disabled):hover{filter:brightness(1.08);transform:translateY(-1px)}
    .ludo-score-roll:disabled{opacity:.55;box-shadow:none}
    .ludo-score-rule-pill{display:inline-flex;align-items:center;gap:5px;padding:7px 10px;border:1px solid #927432;border-radius:999px;background:#352d1d;color:#ffe08a;font-size:12px;font-weight:800}
    .ludo-score-board{display:grid;grid-template-columns:repeat(15,minmax(0,1fr));width:min(100%,560px);aspect-ratio:1;margin:14px auto;border:3px solid #f0c34f;border-radius:12px;overflow:hidden;background:#fff;box-shadow:0 8px 24px #0006}
    .score-cell{position:relative;display:flex;align-items:center;justify-content:center;min-width:0;min-height:0;border:1px solid #dce5de;background:#f8faf8}
    .score-cell-track{background:#fff}.score-cell-safe::after{content:'★';position:absolute;color:#b89637;font-size:clamp(6px,1.8vw,15px);pointer-events:none}
    .score-cell-yard-red{background:linear-gradient(135deg,#ffded8,#ffc6bf)}.score-cell-yard-green{background:linear-gradient(135deg,#def7e4,#c0ebce)}
    .score-cell-yard-yellow{background:linear-gradient(135deg,#fff3c4,#f5e29b)}.score-cell-yard-blue{background:linear-gradient(135deg,#dce8ff,#bdcff4)}
    .score-cell-start-red,.score-cell-home-red{background:#f27569}.score-cell-start-green,.score-cell-home-green{background:#58bd75}
    .score-cell-start-yellow,.score-cell-home-yellow{background:#f0d45b}.score-cell-start-blue,.score-cell-home-blue{background:#6f96da}
    .score-cell-base-red,.score-cell-base-green,.score-cell-base-yellow,.score-cell-base-blue{margin:3px;border:2px solid #fff;border-radius:50%;background:#fff}
    .score-cell-base-red{box-shadow:inset 0 0 0 2px #c94f46}.score-cell-base-green{box-shadow:inset 0 0 0 2px #32834e}
    .score-cell-base-yellow{box-shadow:inset 0 0 0 2px #b79412}.score-cell-base-blue{box-shadow:inset 0 0 0 2px #416ba8}
    .score-cell-center{background:conic-gradient(#c95950 0deg 90deg,#e3c24b 90deg 180deg,#499565 180deg 270deg,#4d76b2 270deg)}
    .score-token-stack{position:relative;z-index:1;display:flex;align-items:center;justify-content:center;flex-wrap:wrap;gap:1px;max-width:100%}
    .score-token{display:grid;place-items:center;width:clamp(11px,3.3vw,24px);height:clamp(11px,3.3vw,24px);padding:0;border:2px solid #fff;border-radius:50%;box-shadow:0 1px 3px #0007;color:#fff;font-size:clamp(7px,1.5vw,11px);font-weight:800}
    .score-token.creator,.score-token.red{background:#c94f46}.score-token.joiner,.score-token.green{background:#32834e}
    .score-token.yellow{background:#b79412}.score-token.blue{background:#416ba8}
    .score-token.selectable{outline:2px solid #f0c85b;cursor:pointer;animation:score-pulse 1.1s infinite alternate}
    .score-token:disabled{cursor:default;opacity:1}
    .ludo-score-proof{max-width:560px;margin:12px auto 0}
    .ludo-score-proof input{width:100%}
    @keyframes ludo-die-pop{from{transform:rotate(-12deg) scale(.8)}to{transform:rotate(-4deg) scale(1)}}
    @keyframes score-pulse{to{transform:scale(1.13)}}
    @media(max-width:520px){.ludo-score-board{border-width:2px}.ludo-score-players{grid-template-columns:1fr}.ludo-score-player{padding:7px;font-size:13px}.ludo-score-die{width:52px;height:52px;min-width:52px}.ludo-score-rule-pill{font-size:11px}}
  `;
  document.head.append(style);

  function idOf(user) {
    return String(user?._id || user?.id || user || '');
  }

  function avatarMarkup(user, app) {
    const username = String(app.nameOf(user) || 'Player');
    const initial = username.trim().charAt(0).toUpperCase() || '?';
    const profileImage = String(user?.profileImage || '').trim();
    const imageUrl = profileImage.startsWith('uploads/')
      ? `/api/profile/image/${encodeURIComponent(profileImage.slice('uploads/'.length))}`
      : profileImage
        ? `/${profileImage.split('/').map(encodeURIComponent).join('/')}`
        : '';
    return imageUrl
      ? `<img class="ludo-score-avatar" src="${app.esc(imageUrl)}" alt="${app.esc(username)} profile picture" data-score-avatar data-initial="${app.esc(initial)}">`
      : `<span class="ludo-score-avatar-fallback" aria-hidden="true">${app.esc(initial)}</span>`;
  }

  function positionFor(color, progress, tokenIndex) {
    const config = colors[color] || colors.red;
    if (progress < 0) return [config.baseSlots[tokenIndex]];
    if (progress <= 51) {
      const trackIndex = (config.startIndex + progress) % 52;
      return [track[trackIndex]];
    }
    if (progress <= 56) return [config.homePath[progress - 52]];
    return [config.finish];
  }

  function diceMarkup(value) {
    const face = Number(value);
    const pipsByFace = {
      1: [4],
      2: [0, 8],
      3: [0, 4, 8],
      4: [0, 2, 6, 8],
      5: [0, 2, 4, 6, 8],
      6: [0, 2, 3, 5, 6, 8]
    };
    const pips = pipsByFace[face];
    const faceContents = pips
      ? Array.from({ length: 9 }, (_, index) => pips.includes(index) ? '<span class="ludo-score-die-pip"></span>' : '<span></span>').join('')
      : '<span class="ludo-score-die-empty">?</span>';
    return `<span class="ludo-score-die" role="img" aria-label="${pips ? `Dice showing ${face}` : 'Dice not rolled'}">${faceContents}</span>`;
  }

  function timestampedScreenshot(file) {
    return createImageBitmap(file).then(image => new Promise((resolve, reject) => {
      try {
        const scale = Math.min(1, 1600 / Math.max(image.width, image.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(image.width * scale));
        canvas.height = Math.max(1, Math.round(image.height * scale));
        const context = canvas.getContext('2d');
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        image.close();
        const footerHeight = Math.max(48, Math.round(canvas.width * 0.055));
        context.fillStyle = '#101713';
        context.fillRect(0, canvas.height - footerHeight, canvas.width, footerHeight);
        context.fillStyle = '#f4f6ed';
        context.font = `bold ${Math.max(14, Math.round(canvas.width * 0.025))}px Arial`;
        const timestamp = new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'medium', timeZone: 'Asia/Kolkata' }).format(new Date());
        context.fillText(`KhiladiAdda24 Ludo Score · ${timestamp} IST`, 12, canvas.height - Math.round(footerHeight * 0.36));
        canvas.toBlob(blob => {
          if (!blob || blob.size > 5 * 1024 * 1024) return reject(new Error('Screenshot 5 MB se chhota nahi ban saka.'));
          resolve(new File([blob], `khiladiadda24-ludo-score-${Date.now()}.jpg`, { type: 'image/jpeg' }));
        }, 'image/jpeg', 0.82);
      } catch (error) {
        reject(error);
      }
    }));
  }

  function makeMarkup(match, app) {
    const state = match.ludoScore?.tokens ? match.ludoScore : (['OPEN', 'CANCELLED'].includes(match.status) ? {
      tokens: { creator: [-1, -1, -1, -1], joiner: [-1, -1, -1, -1] },
      scores: { creator: 0, joiner: 0 },
      colors: match.ludoScore?.colors || {},
      currentTurn: idOf(match.creator),
      legalTokenIndexes: [],
      diceValue: null
    } : null);
    if (!state?.tokens) return `<h2>🏆 KhiladiAdda24 Ludo Score</h2><p class="notice error">Ludo Score game state available nahi hai. Support se sampark karein.</p>`;
    const myId = idOf(app.getPlayer() || app.getUser());
    const creatorId = idOf(match.creator);
    const joinerId = idOf(match.joiner);
    const joinerName = match.joiner ? app.nameOf(match.joiner) : 'Pratidvandvi';
    const mySide = creatorId === myId ? 'creator' : 'joiner';
    const playerColors = {
      creator: colors[state.colors?.creator] ? state.colors.creator : 'red',
      joiner: colors[state.colors?.joiner] ? state.colors.joiner : 'green'
    };
    const ownTurn = match.status === 'RUNNING' && String(state.currentTurn) === myId && !state.winnerId;
    const turnSide = String(state.currentTurn) === creatorId ? 'creator' : 'joiner';
    const legalTokens = ownTurn && Array.isArray(state.legalTokenIndexes) ? state.legalTokenIndexes : [];
    const winner = state.winnerId ? String(state.winnerId) : '';
    const winnerName = winner ? app.nameOf(winner === creatorId ? match.creator : match.joiner) : '';
    const ownTurnName = String(state.currentTurn) === creatorId ? app.nameOf(match.creator) : joinerName;
    const cells = Array.from({ length: 225 }, (_, index) => {
      const row = Math.floor(index / 15);
      const col = index % 15;
      const classes = ['score-cell'];
      const trackIndex = track.findIndex(([trackRow, trackCol]) => trackRow === row && trackCol === col);
      if (trackIndex >= 0) {
        classes.push('score-cell-track');
        if (safeTrack.has(trackIndex)) classes.push('score-cell-safe');
      }
      for (const color of Object.keys(colors)) {
        const config = colors[color];
        const [yardRowStart, yardRowEnd, yardColStart, yardColEnd] = config.yard;
        if (row >= yardRowStart && row <= yardRowEnd && col >= yardColStart && col <= yardColEnd) classes.push(`score-cell-yard-${color}`);
        if (trackIndex === config.startIndex) classes.push(`score-cell-start-${color}`);
        if (config.homePath.some(([homeRow, homeCol]) => homeRow === row && homeCol === col)) classes.push(`score-cell-home-${color}`);
        if (config.baseSlots.some(([baseRow, baseCol]) => baseRow === row && baseCol === col)) classes.push(`score-cell-base-${color}`, 'score-cell-base-inner');
      }
      if (row === 7 && col === 7) classes.push('score-cell-center');
      const tokensHere = [];
      for (const side of ['creator', 'joiner']) {
        (state.tokens[side] || []).forEach((progress, tokenIndex) => {
          const color = playerColors[side];
          if (!positionFor(color, progress, tokenIndex).some(([tokenRow, tokenCol]) => tokenRow === row && tokenCol === col)) return;
          const canMove = side === mySide && ownTurn && legalTokens.includes(tokenIndex);
          const label = `${colors[color].name} token ${tokenIndex + 1}`;
          const locked = progress === -1 && !canMove;
          tokensHere.push(`<button type="button" class="score-token ${color}${canMove ? ' selectable' : ''}" data-score-token="${tokenIndex}" aria-label="${label}${canMove ? ', select to move' : locked ? ', ghar mein band; 6 chahiye' : ''}"${locked ? ' title="Ghar se kholne ke liye 6 chahiye"' : ''} ${canMove ? '' : 'disabled'}>${tokenIndex + 1}</button>`);
        });
      }
      return `<div class="${classes.join(' ')}" style="grid-row:${row + 1};grid-column:${col + 1}">${tokensHere.length ? `<div class="score-token-stack">${tokensHere.join('')}</div>` : ''}</div>`;
    }).join('');
    const creatorScore = Number(state.scores?.creator ?? state.tokens.creator.filter(value => value === 57).length * 250);
    const joinerScore = Number(state.scores?.joiner ?? state.tokens.joiner.filter(value => value === 57).length * 250);
    const dieValue = state.diceValue || state.lastDice || '–';
    const playerCard = (side, user) => {
      const color = playerColors[side];
      const playerScore = side === 'creator' ? creatorScore : joinerScore;
      const homeCount = (state.tokens[side] || []).filter(value => value === 57).length;
      const turnControl = match.status === 'RUNNING' && side === turnSide
        ? `<div class="ludo-score-turn-control"><div class="ludo-score-dice-box"><span class="ludo-score-dice-label">DICE</span>${diceMarkup(dieValue)}</div><button type="button" class="btn ludo-score-roll" id="ludoScoreRoll" ${!ownTurn || state.diceValue || busy ? 'disabled' : ''}>Roll</button></div>`
        : '';
      return `<div class="ludo-score-player ${color}">
        <div class="ludo-score-player-main">${avatarMarkup(user, app)}<div class="ludo-score-player-copy">
          <strong>${app.esc(app.nameOf(user))}</strong>
          <small>${colors[color].symbol} ${colors[color].name} · ${playerScore}/1000 points · ${homeCount}/4 ghar</small>
        </div></div>${turnControl}
      </div>`;
    };
    const statusText = match.status === 'OPEN'
      ? 'Pratidvandvi ka intezar hai — join karte hi yahin game shuru hoga.'
      : match.status === 'CANCELLED'
        ? 'Yeh battle cancel ho chuki hai.'
      : winner
      ? `🏆 ${app.esc(winnerName)} winner hain — charon gotiyan ghar pahunch gayi.`
      : ownTurn
        ? state.diceValue ? `${state.diceValue} aaya — apni goti chunein.` : 'Aapki turn hai — ghar ki goti 6 aane par hi khulegi.'
        : `${app.esc(ownTurnName)} ki turn hai. Board live update hota rahega.`;
    const resultMarkup = match.status === 'PENDING_RESULT'
      ? `<p class="notice warning">Screenshot admin review ke liye bhej diya gaya hai.${match.resultSubmittedAt ? `<br><small>Submitted: ${app.esc(new Date(match.resultSubmittedAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }))} IST</small>` : ''}</p>`
      : match.status === 'COMPLETED'
        ? `<p class="notice">Game complete${match.winner ? ` — winner: ${app.esc(app.nameOf(match.winner))}` : ''}.${state.payoutAmount ? ` ₹${Number(state.payoutAmount).toLocaleString('en-IN')} winner ke wallet me automatically credit hue.` : ''}</p>`
        : winner === myId
          ? '<form class="ludo-score-proof" id="ludoScoreProof"><p class="muted">Apni win ka screenshot admin review ke liye upload karein.</p><div class="field"><label for="ludoScoreScreenshot">Win screenshot</label><input id="ludoScoreScreenshot" type="file" accept="image/jpeg,image/png,image/webp" required></div><div class="ludo-score-actions"><button class="btn secondary small" id="shareLudoScoreProof" type="button" disabled>WhatsApp par screenshot bhejein</button><button class="btn green" type="submit">Win screenshot bhejein</button></div></form>'
          : winner
            ? '<p class="notice warning">Winner screenshot bhejkar result admin review mein dalega.</p>'
            : '';
    const cancelMarkup = match.status === 'RUNNING' && Number(state.rollCount || 0) === 0
      ? '<form id="ludoScoreCancel" class="ludo-score-actions"><button class="btn danger small" type="submit">Pehli dice roll se pehle cancel/refund</button></form>'
      : '';
    return `<h2>🏆 KhiladiAdda24 Ludo Score • ${app.esc(match.status)}</h2>
      <div class="grid"><div class="stat"><small>Entry</small><strong>₹${Number(match.amount).toLocaleString('en-IN')}</strong></div>
      <div class="stat"><small>Creator</small><strong>${app.esc(app.nameOf(match.creator))}</strong></div>
      <div class="stat"><small>Opponent</small><strong>${app.esc(joinerName)}</strong></div></div>
      <div class="panel ludo-score-panel">
        <div class="ludo-score-head"><h3>Ludo board • 4 rang • 4 gotiyan = jeet</h3><span class="muted">57 khane · 6 par hi goti khulegi</span>${match.status === 'RUNNING' && !winner ? '<span id="ludoScoreTimer" class="ludo-score-timer" aria-live="polite">20s</span>' : ''}</div>
        <div class="ludo-score-players">
          ${playerCard('creator', match.creator)}
          ${playerCard('joiner', match.joiner || { username: joinerName })}
        </div>
        <p class="muted">Ghar ki goti sirf 6 aane par khulegi; ghar pahunchne ke liye exact roll chahiye, extra number par move nahi hoga. Dice roll aur goti move 20 second mein karein; timeout par 100 points minus. Lagatar teesra 6 aane par turn opponent ko milegi.</p>
        <div class="ludo-score-status" aria-live="polite">${statusText}${state.lastAction ? `<br><small>${app.esc(state.lastAction)}</small>` : ''}</div>
        <div class="ludo-score-actions"><span class="ludo-score-rule-pill">🔒 6 par hi goti khulegi</span><span class="muted">${match.status === 'OPEN' ? 'Opponent ke join karne par dice unlock hoga' : ownTurn ? 'Apni turn' : 'Opponent ki turn'}</span></div>
        <div class="ludo-score-board" role="grid" aria-label="KhiladiAdda24 Ludo Score board">${cells}</div>
        ${resultMarkup}${cancelMarkup}
      </div>`;
  }

  async function render(match, matchId) {
    const app = window.matchApp;
    if (!app) throw new Error('Game interface load nahi hua. Page refresh karein.');
    if (window.__ludoScorePollTimer) clearInterval(window.__ludoScorePollTimer);
    if (window.__ludoScoreCountdownTimer) clearInterval(window.__ludoScoreCountdownTimer);
    activeMatchId = String(matchId);
    activeSignature = '';
    latestMatch = match;

    const renderState = currentMatch => {
      if (activeMatchId !== String(matchId)) return;
      latestMatch = currentMatch;
      const signature = `${currentMatch.status}:${currentMatch.ludoScore?.version}:${currentMatch.ludoScore?.winnerId || ''}:${currentMatch.proofScreenshot || ''}:${currentMatch.resultSubmittedAt || ''}:${currentMatch.ludoScore?.colors?.creator || ''}:${currentMatch.ludoScore?.colors?.joiner || ''}:${currentMatch.creator?.profileImage || ''}:${currentMatch.joiner?.profileImage || ''}`;
      if (signature === activeSignature) return;
      activeSignature = signature;
      app.el('matchDetails').innerHTML = makeMarkup(currentMatch, app);
      app.setView('match');
      document.querySelectorAll('[data-score-avatar]').forEach(image => image.addEventListener('error', () => {
        const fallback = document.createElement('span');
        fallback.className = 'ludo-score-avatar-fallback';
        fallback.setAttribute('aria-hidden', 'true');
        fallback.textContent = image.dataset.initial || '?';
        image.replaceWith(fallback);
      }, { once: true }));
      const rollButton = document.getElementById('ludoScoreRoll');
      if (rollButton) rollButton.addEventListener('click', async () => {
        busy = true;
        rollButton.disabled = true;
        try {
          const result = await app.api('/api/matches/ludo-score/roll', { method: 'POST', body: JSON.stringify({ matchId }) });
          app.notify(result.message);
          renderState(result.match);
        } catch (error) {
          app.notify(error.message, true);
          rollButton.disabled = false;
        } finally {
          busy = false;
        }
      });
      document.querySelectorAll('[data-score-token]').forEach(button => button.addEventListener('click', async () => {
        busy = true;
        button.disabled = true;
        try {
          const result = await app.api('/api/matches/ludo-score/move', { method: 'POST', body: JSON.stringify({ matchId, tokenIndex: Number(button.dataset.scoreToken) }) });
          app.notify(result.message);
          renderState(result.match);
        } catch (error) {
          app.notify(error.message, true);
          button.disabled = false;
        } finally {
          busy = false;
        }
      }));
      const proofForm = document.getElementById('ludoScoreProof');
      const screenshotInput = proofForm?.querySelector('#ludoScoreScreenshot');
      const shareButton = proofForm?.querySelector('#shareLudoScoreProof');
      let proofFile;
      let adminNumber = '';
      if (shareButton) {
        app.api('/api/site-support').then(contacts => {
          adminNumber = String(contacts.whatsappNumber || '').replace(/\D/g, '');
          if (adminNumber.length === 10) adminNumber = `91${adminNumber}`;
          if (!/^91[6-9]\d{9}$/.test(adminNumber)) adminNumber = '';
        }).catch(() => {});
        screenshotInput.addEventListener('change', async () => {
          proofFile = null;
          shareButton.disabled = true;
          if (!screenshotInput.files[0]) return;
          try {
            proofFile = await timestampedScreenshot(screenshotInput.files[0]);
            shareButton.disabled = false;
          } catch (error) {
            app.notify(error.message || 'Screenshot taiyaar nahi hua.', true);
          }
        });
        shareButton.addEventListener('click', async () => {
          if (!proofFile) return app.notify('Screenshot taiyaar hone ka wait karein.', true);
          const timestamp = new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'medium', timeZone: 'Asia/Kolkata' }).format(new Date());
          const text = `KhiladiAdda24 Ludo Score · Winner ${app.nameOf(app.getPlayer() || app.getUser())} · 1000/1000 · ${timestamp} IST${adminNumber ? ` · Admin WhatsApp +${adminNumber}` : ''}`;
          try {
            if (navigator.share && navigator.canShare?.({ files: [proofFile] })) {
              await navigator.share({ title: 'KhiladiAdda24 Ludo Score', text, files: [proofFile] });
              return;
            }
            const objectUrl = URL.createObjectURL(proofFile);
            const download = document.createElement('a');
            download.href = objectUrl;
            download.download = proofFile.name;
            download.click();
            setTimeout(() => URL.revokeObjectURL(objectUrl), 30000);
            window.open(adminNumber ? `https://wa.me/${adminNumber}?text=${encodeURIComponent(text)}` : `https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer');
            app.notify('Screenshot download hua. WhatsApp chat mein ise attach karke bhejein.');
          } catch (error) {
            if (error.name !== 'AbortError') app.notify(error.message || 'Screenshot share nahi ho saka.', true);
          }
        });
      }
      if (proofForm) proofForm.addEventListener('submit', async event => {
        event.preventDefault();
        const button = proofForm.querySelector('button[type="submit"]');
        button.disabled = true;
        try {
          if (!proofFile) proofFile = await timestampedScreenshot(screenshotInput.files[0]);
          const body = new FormData();
          body.set('matchId', matchId);
          body.set('winnerId', String(currentMatch.ludoScore.winnerId));
          body.set('screenshot', proofFile);
          const result = await app.api('/api/matches/submit-result', { method: 'POST', body });
          app.notify(result.message);
          renderState(result.match);
          await app.refresh();
        } catch (error) {
          app.notify(error.message || 'Screenshot upload nahi ho saka.', true);
          button.disabled = false;
        }
      });
      const cancelForm = document.getElementById('ludoScoreCancel');
      if (cancelForm) cancelForm.addEventListener('submit', async event => {
        event.preventDefault();
        if (!confirm('Abhi tak dice roll nahi hui. Battle cancel karke entry refund karein?')) return;
        const button = cancelForm.querySelector('button');
        button.disabled = true;
        try {
          const result = await app.api('/api/matches/cancel', { method: 'POST', body: JSON.stringify({ matchId }) });
          app.notify(result.message);
          await app.refresh();
          renderState(await app.api(`/api/matches/${encodeURIComponent(matchId)}`));
        } catch (error) {
          app.notify(error.message, true);
          button.disabled = false;
        }
      });
    };

    renderState(match);
    const updateCountdown = () => {
      const timer = document.getElementById('ludoScoreTimer');
      if (!timer) return;
      const deadline = new Date(latestMatch?.ludoScore?.turnDeadlineAt || 0).getTime();
      const remaining = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      timer.textContent = `${remaining}s`;
      timer.classList.toggle('urgent', remaining <= 5);
    };
    updateCountdown();
    window.__ludoScoreCountdownTimer = setInterval(updateCountdown, 250);
    window.__ludoScorePollTimer = setInterval(async () => {
      if (activeMatchId !== String(matchId)) return;
      try {
        const updated = await app.api(`/api/matches/${encodeURIComponent(matchId)}`);
        renderState(updated);
        if (['COMPLETED', 'CANCELLED', 'PENDING_CANCELLATION'].includes(updated.status)) {
          clearInterval(window.__ludoScorePollTimer);
          clearInterval(window.__ludoScoreCountdownTimer);
          window.__ludoScorePollTimer = null;
          window.__ludoScoreCountdownTimer = null;
        }
      } catch (error) {
        app.notify(`Ludo Score update nahi mil raha: ${error.message}`, true);
      }
    }, 1000);
  }

  window.renderLudoScoreMatch = render;
})();
