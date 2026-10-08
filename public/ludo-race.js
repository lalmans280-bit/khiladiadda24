(() => {
  const track = [
    [6, 1], [6, 2], [6, 3], [6, 4], [6, 5], [5, 6], [4, 6], [3, 6], [2, 6], [1, 6], [0, 6],
    [0, 7], [0, 8], [1, 8], [2, 8], [3, 8], [4, 8], [5, 8], [6, 9], [6, 10], [6, 11], [6, 12],
    [6, 13], [6, 14], [7, 14], [8, 14], [8, 13], [8, 12], [8, 11], [8, 10], [8, 9], [9, 8],
    [10, 8], [11, 8], [12, 8], [13, 8], [14, 8], [14, 7], [14, 6], [13, 6], [12, 6], [11, 6],
    [10, 6], [9, 6], [8, 5], [8, 4], [8, 3], [8, 2], [8, 1], [8, 0], [7, 0], [6, 0]
  ];
  const homePaths = {
    creator: [[7, 1], [7, 2], [7, 3], [7, 4], [7, 5], [7, 6]],
    joiner: [[8, 13], [8, 12], [8, 11], [8, 10], [8, 9], [8, 8]]
  };
  const baseSlots = {
    creator: [[1, 1], [1, 4], [4, 1], [4, 4]],
    joiner: [[10, 10], [10, 13], [13, 10], [13, 13]]
  };
  const safeTrack = new Set([0, 8, 13, 21, 26, 34, 39, 47]);
  let activeMatchId = '';
  let activeSignature = '';
  let busy = false;
  let pollErrorShown = false;

  const style = document.createElement('style');
  style.textContent = `
    .ludo-race-panel{margin-top:14px}
    .ludo-race-head{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap}
    .ludo-race-head h3{margin:0}
    .ludo-race-score{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:12px 0}
    .ludo-race-player{padding:9px 11px;border:1px solid #405247;border-radius:9px;background:#1d2d21}
    .ludo-race-player strong{display:block}
    .ludo-race-player small{color:var(--muted)}
    .ludo-race-player.creator{border-color:#c65c52}.ludo-race-player.joiner{border-color:#429064}
    .ludo-race-status{margin:8px 0;padding:10px 12px;border:1px solid #405b46;border-radius:9px;background:#1d2d21}
    .ludo-race-actions{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin:10px 0}
    .ludo-race-die{display:grid;place-items:center;min-width:46px;height:46px;border:1px solid #d7b14e;border-radius:10px;background:#f4d36c;color:#352800;font-size:26px;font-weight:800}
    .ludo-race-board{display:grid;grid-template-columns:repeat(15,minmax(0,1fr));width:min(100%,560px);aspect-ratio:1;margin:14px auto;border:3px solid #34483a;border-radius:9px;overflow:hidden;background:#fff}
    .race-cell{position:relative;display:flex;align-items:center;justify-content:center;min-width:0;min-height:0;border:1px solid #e1e7e2;background:#f8faf8}
    .race-cell-track{background:#fff}.race-cell-safe::after{content:'★';position:absolute;color:#b89637;font-size:clamp(6px,1.8vw,15px);pointer-events:none}
    .race-cell-start-creator,.race-cell-home-creator{background:#f4b7b1}
    .race-cell-start-joiner,.race-cell-home-joiner{background:#a9dbbb}
    .race-cell-base-creator{background:#f8d9d5}.race-cell-base-joiner{background:#d8f0df}
    .race-cell-center{background:conic-gradient(#c95950 0deg 90deg,#e3c24b 90deg 180deg,#499565 180deg 270deg,#4d76b2 270deg)}
    .race-cell-base-creator.race-cell-base-inner,.race-cell-base-joiner.race-cell-base-inner{box-shadow:inset 0 0 0 2px #fff}
    .race-token-stack{position:relative;z-index:1;display:flex;align-items:center;justify-content:center;flex-wrap:wrap;gap:1px;max-width:100%}
    .race-token{display:grid;place-items:center;width:clamp(11px,3.3vw,24px);height:clamp(11px,3.3vw,24px);padding:0;border:2px solid #fff;border-radius:50%;box-shadow:0 1px 3px #0007;color:#fff;font-size:clamp(7px,1.5vw,11px);font-weight:800}
    .race-token.creator{background:#c94f46}.race-token.joiner{background:#32834e}
    .race-token.selectable{outline:2px solid #f0c85b;cursor:pointer;animation:race-pulse 1.1s infinite alternate}
    .race-token:disabled{cursor:default;opacity:1}
    .ludo-race-proof{max-width:560px;margin:12px auto 0}
    .ludo-race-proof input{width:100%}
    @keyframes race-pulse{to{transform:scale(1.13)}}
    @media(max-width:520px){.ludo-race-board{border-width:2px}.ludo-race-player{padding:7px;font-size:13px}}
  `;
  document.head.append(style);

  function idOf(user) {
    return String(user?._id || user?.id || user || '');
  }

  function positionFor(side, progress, tokenIndex) {
    if (progress < 0) return [baseSlots[side][tokenIndex]];
    if (progress <= 51) {
      const trackIndex = side === 'creator' ? progress : (progress + 26) % 52;
      return [track[trackIndex]];
    }
    return [homePaths[side][progress - 52]];
  }

  function makeMarkup(match, matchId, app) {
    const state = match.ludoRace;
    if (!state || !state.tokens) {
      return `<h2>🏁 Ludo Race • ${app.esc(match.status)}</h2><p class="notice error">Ludo Race ki game state available nahi hai. Support se sampark karein.</p>`;
    }
    const myId = idOf(app.getPlayer() || app.getUser());
    const creatorId = idOf(match.creator);
    const joinerId = idOf(match.joiner);
    const mySide = creatorId === myId ? 'creator' : 'joiner';
    const ownTurn = String(state.currentTurn) === myId && !state.winnerId;
    const legalTokens = ownTurn && Array.isArray(state.legalTokenIndexes) ? state.legalTokenIndexes : [];
    const winner = state.winnerId ? String(state.winnerId) : '';
    const winnerName = winner ? app.nameOf(winner === creatorId ? match.creator : match.joiner) : '';
    const ownTurnName = String(state.currentTurn) === creatorId ? app.nameOf(match.creator) : app.nameOf(match.joiner);
    const boardCells = Array.from({ length: 15 * 15 }, (_, index) => {
      const row = Math.floor(index / 15);
      const col = index % 15;
      const cellClasses = ['race-cell'];
      const trackIndex = track.findIndex(([r, c]) => r === row && c === col);
      if (trackIndex >= 0) {
        cellClasses.push('race-cell-track');
        if (safeTrack.has(trackIndex)) cellClasses.push('race-cell-safe');
      }
      for (const side of ['creator', 'joiner']) {
        const startIndex = side === 'creator' ? 0 : 26;
        if (trackIndex === startIndex) cellClasses.push(`race-cell-start-${side}`);
        if (homePaths[side].some(([r, c]) => r === row && c === col)) cellClasses.push(`race-cell-home-${side}`);
        if (baseSlots[side].some(([r, c]) => r === row && c === col)) cellClasses.push(`race-cell-base-${side}`, 'race-cell-base-inner');
      }
      if (row >= 6 && row <= 8 && col >= 6 && col <= 8) cellClasses.push('race-cell-center');
      const tokensHere = [];
      for (const side of ['creator', 'joiner']) {
        (state.tokens[side] || []).forEach((progress, tokenIndex) => {
          if (positionFor(side, progress, tokenIndex).some(([r, c]) => r === row && c === col)) {
            const canMove = side === mySide && ownTurn && legalTokens.includes(tokenIndex);
            const description = `${side === 'creator' ? 'Red' : 'Green'} token ${tokenIndex + 1}`;
            tokensHere.push(`<button type="button" class="race-token ${side}${canMove ? ' selectable' : ''}" data-race-token="${tokenIndex}" aria-label="${description}${canMove ? ', select to move' : ''}" ${canMove ? '' : 'disabled'}>${tokenIndex + 1}</button>`);
          }
        });
      }
      return `<div class="${cellClasses.join(' ')}" style="grid-row:${row + 1};grid-column:${col + 1}">${tokensHere.length ? `<div class="race-token-stack">${tokensHere.join('')}</div>` : ''}</div>`;
    }).join('');
    const dieValue = state.diceValue || state.lastDice || '–';
    const stateMessage = winner
      ? `🏆 ${app.esc(winnerName)} winner hain — inki ek goti ghar pahunch gayi.`
      : ownTurn
        ? state.diceValue ? `${state.diceValue} aaya — chamakti goti chunein.` : 'Aapki turn hai — dice roll karein.'
        : `${app.esc(ownTurnName)} ki turn hai. Board live update hota rahega.`;
    const resultSection = match.status === 'PENDING_RESULT'
      ? '<p class="notice warning">Winner ka screenshot admin verification ke liye bhej diya gaya hai. Admin review ka wait karein.</p>'
      : match.status === 'COMPLETED'
        ? `<p class="notice">Match complete${match.winner ? ` — winner: ${app.esc(app.nameOf(match.winner))}` : ''}.</p>`
        : winner === myId
          ? `<form class="ludo-race-proof" id="ludoRaceProof"><p class="muted">Apni win ka screenshot upload karke result admin review ke liye bhejein.</p><div class="field"><label for="ludoRaceScreenshot">Win screenshot</label><input id="ludoRaceScreenshot" name="screenshot" type="file" accept="image/jpeg,image/png,image/webp" required></div><button class="btn green" type="submit">Win screenshot bhejein</button></form>`
          : winner
            ? '<p class="notice warning">Winner screenshot upload karke result admin review ke liye bhejega.</p>'
            : '';
    const cancelSection = match.status === 'RUNNING' && Number(state.version || 0) === 0
      ? '<form id="ludoRaceCancel" class="ludo-race-actions"><button class="btn danger small" type="submit">Pehli dice roll se pehle cancel/refund</button></form>'
      : '';
    return `<h2>🏁 Ludo Race • ${app.esc(match.status)}</h2>
      <div class="grid"><div class="stat"><small>Entry</small><strong>₹${Number(match.amount).toLocaleString('en-IN')}</strong></div>
      <div class="stat"><small>Creator</small><strong>${app.esc(app.nameOf(match.creator))}</strong></div>
      <div class="stat"><small>Opponent</small><strong>${app.esc(app.nameOf(match.joiner))}</strong></div></div>
      <div class="panel ludo-race-panel" id="ludoRacePanel">
        <div class="ludo-race-head"><h3>4 Gotiyan • Pehli Goti Ghar = Win</h3><span class="muted">Red: creator · Green: opponent</span></div>
        <div class="ludo-race-score">
          <div class="ludo-race-player creator"><strong>🔴 ${app.esc(app.nameOf(match.creator))}</strong><small>${(state.tokens.creator || []).filter(value => value === 57).length}/4 ghar pahunchi</small></div>
          <div class="ludo-race-player joiner"><strong>🟢 ${app.esc(app.nameOf(match.joiner))}</strong><small>${(state.tokens.joiner || []).filter(value => value === 57).length}/4 ghar pahunchi</small></div>
        </div>
        <div class="ludo-race-status" aria-live="polite">${stateMessage}${state.lastAction ? `<br><small>${app.esc(state.lastAction)}</small>` : ''}</div>
        <div class="ludo-race-actions"><span class="ludo-race-die" aria-label="Dice">${dieValue}</span><button type="button" class="btn" id="ludoRaceRoll" ${!ownTurn || state.diceValue || winner || busy ? 'disabled' : ''}>Dice roll</button><span class="muted">${ownTurn ? 'Apni turn' : 'Opponent ki turn'}</span></div>
        <div class="ludo-race-board" role="grid" aria-label="Ludo Race board">${boardCells}</div>
        ${resultSection}${cancelSection}
      </div>`;
  }

  async function render(match, matchId) {
    const app = window.matchApp;
    if (!app) throw new Error('Game interface load nahi hua. Page refresh karein.');
    if (window.__ludoRaceTimer) clearInterval(window.__ludoRaceTimer);
    activeMatchId = String(matchId);
    activeSignature = '';
    pollErrorShown = false;

    const renderState = currentMatch => {
      if (activeMatchId !== String(matchId)) return;
      const signature = `${currentMatch.status}:${currentMatch.ludoRace?.version}:${currentMatch.ludoRace?.winnerId || ''}:${currentMatch.proofScreenshot || ''}:${app.nameOf(currentMatch.creator)}:${app.nameOf(currentMatch.joiner)}`;
      if (signature === activeSignature) return;
      activeSignature = signature;
      app.el('matchDetails').innerHTML = makeMarkup(currentMatch, matchId, app);
      app.setView('match');
      const rollButton = document.getElementById('ludoRaceRoll');
      if (rollButton) rollButton.addEventListener('click', async () => {
        busy = true;
        rollButton.disabled = true;
        try {
          const result = await app.api('/api/matches/ludo-race/roll', { method: 'POST', body: JSON.stringify({ matchId }) });
          app.notify(result.message);
          renderState(result.match);
        } catch (error) {
          app.notify(error.message, true);
          rollButton.disabled = false;
        } finally {
          busy = false;
        }
      });
      document.querySelectorAll('[data-race-token]').forEach(button => button.addEventListener('click', async () => {
        busy = true;
        button.disabled = true;
        try {
          const result = await app.api('/api/matches/ludo-race/move', { method: 'POST', body: JSON.stringify({ matchId, tokenIndex: Number(button.dataset.raceToken) }) });
          app.notify(result.message);
          renderState(result.match);
        } catch (error) {
          app.notify(error.message, true);
          button.disabled = false;
        } finally {
          busy = false;
        }
      }));
      const proofForm = document.getElementById('ludoRaceProof');
      if (proofForm) proofForm.addEventListener('submit', async event => {
        event.preventDefault();
        const body = new FormData(proofForm);
        body.set('matchId', matchId);
        body.set('winnerId', String(currentMatch.ludoRace.winnerId));
        const submitButton = proofForm.querySelector('button[type="submit"]');
        submitButton.disabled = true;
        try {
          const result = await app.api('/api/matches/submit-result', { method: 'POST', body });
          app.notify(result.message);
          renderState(result.match);
          await app.refresh();
        } catch (error) {
          app.notify(error.message, true);
          submitButton.disabled = false;
        }
      });
      const cancelForm = document.getElementById('ludoRaceCancel');
      if (cancelForm) cancelForm.addEventListener('submit', async event => {
        event.preventDefault();
        if (!confirm('Abhi tak dice roll nahi hui. Battle cancel karke entry refund karein?')) return;
        const button = cancelForm.querySelector('button');
        button.disabled = true;
        try {
          const result = await app.api('/api/matches/cancel', { method: 'POST', body: JSON.stringify({ matchId }) });
          app.notify(result.message);
          await app.refresh();
          const updated = await app.api(`/api/matches/${encodeURIComponent(matchId)}`);
          renderState(updated);
        } catch (error) {
          app.notify(error.message, true);
          button.disabled = false;
        }
      });
    };

    renderState(match);
    window.__ludoRaceTimer = setInterval(async () => {
      if (activeMatchId !== String(matchId)) return;
      try {
        const updated = await app.api(`/api/matches/${encodeURIComponent(matchId)}`);
        renderState(updated);
        pollErrorShown = false;
        if (['COMPLETED', 'CANCELLED', 'PENDING_CANCELLATION'].includes(updated.status)) {
          clearInterval(window.__ludoRaceTimer);
          window.__ludoRaceTimer = null;
        }
      } catch (error) {
        if (!pollErrorShown) app.notify(`Ludo Race update nahi mil raha: ${error.message}`, true);
        pollErrorShown = true;
      }
    }, 1800);
  }

  window.renderLudoRaceMatch = render;
})();
