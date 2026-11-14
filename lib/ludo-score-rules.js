(() => {
  const track = [
    [6, 1], [6, 2], [6, 3], [6, 4], [6, 5], [5, 6], [4, 6], [3, 6], [2, 6], [1, 6], [0, 6],
    [0, 7], [0, 8], [1, 8], [2, 8], [3, 8], [4, 8], [5, 8], [6, 9], [6, 10], [6, 11], [6, 12],
    [6, 13], [6, 14], [7, 14], [8, 14], [8, 13], [8, 12], [8, 11], [8, 10], [8, 9], [9, 8],
    [10, 8], [11, 8], [12, 8], [13, 8], [14, 8], [14, 7], [14, 6], [13, 6], [12, 6], [11, 6],
    [10, 6], [9, 6], [8, 5], [8, 4], [8, 3], [8, 2], [8, 1], [8, 0], [7, 0], [6, 0]
  ];
  const directionArrows = {
    '0,1': '→', '0,-1': '←', '-1,0': '↑', '1,0': '↓',
    '-1,1': '↗', '1,1': '↘', '1,-1': '↙', '-1,-1': '↖'
  };
  const turnDirections = new Map();
  track.forEach((point, index) => {
    const previous = track[(index + track.length - 1) % track.length];
    const next = track[(index + 1) % track.length];
    const incoming = `${Math.sign(point[0] - previous[0])},${Math.sign(point[1] - previous[1])}`;
    const outgoing = `${Math.sign(next[0] - point[0])},${Math.sign(next[1] - point[1])}`;
    if (incoming !== outgoing || index === 0 || index === 26) turnDirections.set(index, directionArrows[outgoing]);
  });
  const homeEntryMarkers = new Map([
    [51, { side: 'creator', arrow: directionArrows['1,1'], label: 'Red home lane entry' }],
    [25, { side: 'joiner', arrow: directionArrows['0,-1'], label: 'Green home lane entry' }]
  ]);
  const homePaths = {
    creator: [[7, 1], [7, 2], [7, 3], [7, 4], [7, 5]],
    joiner: [[8, 13], [8, 12], [8, 11], [8, 10], [8, 9]]
  };
  const finishPosition = [7, 7];
  const centerConnectors = {
    creator: { position: [7, 6], arrow: '→', label: 'Red lane to shared center' },
    joiner: { position: [8, 8], arrow: '↖', label: 'Green lane to shared center' }
  };
  const baseSlots = {
    creator: [[1, 1], [1, 4], [4, 1], [4, 4]],
    joiner: [[10, 10], [10, 13], [13, 10], [13, 13]]
  };
  const safeTrack = new Set([0, 8, 13, 21, 26, 34, 39, 47]);
  const scoreMaximum = 1400;
  const scoreForTokens = tokens => tokens.reduce(
    (score, progress) => score + (progress >= 52 ? 100 : 0) + (progress === 57 ? 250 : 0),
    0
  );
  let activeMatchId = '';
  let activeSignature = '';
  let latestMatch;
  let busy = false;

  const style = document.createElement('style');
  style.textContent = `
    body.ludo-score-page{min-height:100dvh;background:#092d65}
    body.ludo-score-page .topbar,body.ludo-score-page .bottom{display:none!important}
    body.ludo-score-page .shell.content{width:100%;max-width:none;margin:0;padding:0}
    body.ludo-score-page #view-match{margin:0;padding:0}
    body.ludo-score-page #view-match>.panel{margin:0;padding:0;border:0;border-radius:0;background:transparent}
    body.ludo-score-page #view-match .panel>[data-view="battles"]{display:none}
    body.ludo-score-page #matchDetails{min-height:100dvh}
    body.ludo-score-page .ludo-score-screen{display:flex;min-height:100dvh;flex-direction:column;align-items:center;justify-content:space-between;overflow:hidden;padding:0 0 env(safe-area-inset-bottom);background:repeating-linear-gradient(135deg,#0d3975 0 18px,#10427f 18px 36px)}
    body.ludo-score-page .ludo-score-board{width:min(100vw,68vh,680px);margin:0;border:4px solid #f8fafc;border-radius:0;background:#fff;box-shadow:0 8px 24px #001c4d99}
    .ludo-score-board{display:grid;grid-template-columns:repeat(15,minmax(0,1fr));aspect-ratio:1;overflow:hidden}
    .ludo-score-status{width:100%;min-height:34px;padding:7px 10px;color:#fff;background:#082855b8;font-size:12px;font-weight:700;text-align:center}
    .ludo-score-status small{color:#e4edff}
    .ludo-score-timer{display:inline-grid;place-items:center;min-width:36px;margin-bottom:3px;padding:2px 6px;border:1px solid #fff8;border-radius:999px;color:#fff;font-size:12px;font-weight:900;font-variant-numeric:tabular-nums}
    .ludo-score-timer.urgent{color:#ffe27b;border-color:#ffe27b}
    .ludo-score-players{display:grid;width:min(100%,520px);grid-template-columns:minmax(0,1fr) 76px minmax(0,1fr);align-items:end;gap:6px;margin:0;padding:4px 10px 12px}
    .ludo-score-player{display:grid;min-width:0;justify-items:center;gap:5px}
    .ludo-score-avatar{display:grid;width:48px;height:48px;place-items:center;overflow:hidden;border:3px solid #fff;border-radius:50%;color:#fff;font-size:19px;font-weight:900;box-shadow:0 2px 8px #001a45a6}
    .ludo-score-avatar img{width:100%;height:100%;object-fit:cover}
    .ludo-score-player-info{width:100%;min-height:44px;padding:5px 4px;border:1px solid #ffffff8a;border-radius:8px;color:#fff;text-align:center;box-shadow:0 3px 8px #001a4566}
    .ludo-score-player.creator .ludo-score-avatar{background:#db3543}
    .ludo-score-player.creator .ludo-score-player-info{background:linear-gradient(135deg,#0d4c91,#082e68)}
    .ludo-score-player.joiner .ludo-score-avatar{background:#168d56}
    .ludo-score-player.joiner .ludo-score-player-info{background:linear-gradient(135deg,#16834f,#075f45)}
    .ludo-score-player strong{display:block;overflow:hidden;font-size:12px;text-overflow:ellipsis;white-space:nowrap}
    .ludo-score-player small{display:block;color:#dbeafe;font-size:10px;line-height:1.25}
    .ludo-score-player small.ludo-score-wallet{color:#fff;font-weight:800}
    .ludo-score-controls{display:grid;min-width:0;justify-items:center;align-content:end;gap:4px;padding-bottom:19px}
    .ludo-score-roll{display:grid;width:70px;height:70px;min-width:0;place-items:center;padding:0;border:0!important;border-radius:50%;background:transparent!important;box-shadow:none!important}
    .ludo-score-roll:disabled{opacity:1}
    .ludo-score-ready-die{display:grid;width:64px;height:64px;place-items:center;border:2px solid #fff;border-radius:16px;background:linear-gradient(145deg,#fff1a7,#ffbe37);box-shadow:0 5px 0 #9a661d,0 9px 18px #0006;font-size:48px;line-height:1;transform:rotate(-8deg);animation:ludo-die-pop .28s ease-out}
    .ludo-score-cancel{position:fixed;top:8px;right:8px;z-index:3;margin:0}
    .ludo-score-cancel button{width:28px;min-height:28px;padding:0;border:1px solid #ffffff99;border-radius:50%;color:#fff;background:#082855cc;font-size:18px;line-height:1}
    .ludo-score-die{display:grid;grid-template-columns:repeat(3,1fr);grid-template-rows:repeat(3,1fr);place-items:center;gap:2px;width:62px;height:62px;min-width:62px;padding:8px;border:2px solid #fff;border-radius:15px;background:linear-gradient(145deg,#fffef5,#ffe8a5 70%,#ffd36c);box-shadow:0 5px 0 #9a661d,0 9px 18px #0006,inset 0 0 0 2px #fff9;transform:rotate(-8deg);animation:ludo-die-pop .28s ease-out}
    .ludo-score-die-pip{width:9px;height:9px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#f77668,#bd302d 72%);box-shadow:0 1px 2px #64201c}
    .ludo-score-die-empty{grid-column:1/-1;grid-row:1/-1;display:grid;place-items:center;color:#8f6722;font-size:30px;font-weight:900}
    .score-cell{position:relative;display:flex;align-items:center;justify-content:center;min-width:0;min-height:0;background:transparent}
    .score-cell-track{border:1px solid #dce5de;background:#fff}    .score-cell-safe::after{content:'★';position:absolute;color:#b89637;font-size:clamp(10px,2.5vw,19px);font-weight:900;pointer-events:none}
    .score-cell-yard-red{background:#e93b45}.score-cell-yard-green{background:#139653}
    .score-cell-yard-inner-red,.score-cell-yard-inner-green{border-color:transparent;background:#fff}
    .score-cell-start-creator,.score-cell-home-creator{background:#f27569}
    .score-cell-start-joiner,.score-cell-home-joiner{background:#58bd75}
    .score-cell-base{margin:3px;border:2px solid #fff;border-radius:50%;background:#fff}
    .score-cell-base-red{box-shadow:inset 0 0 0 2px #c94f46}.score-cell-base-green{box-shadow:inset 0 0 0 2px #32834e}
    .score-cell-center{background:conic-gradient(#c95950 0deg 180deg,#499565 180deg 360deg)}
    .score-cell-center.score-cell-token-position{background:conic-gradient(#c95950 0deg 180deg,#499565 180deg 360deg)}
    .score-cell-center-home{position:absolute;top:0;left:0;z-index:2;font-size:clamp(8px,2vw,13px);line-height:1;pointer-events:none}
    .score-cell-home{border:1px solid #fff}
    .score-cell-home-creator,.score-cell-home-creator.score-cell-token-position{background:#e9574f}
    .score-cell-home-joiner,.score-cell-home-joiner.score-cell-token-position{background:#16a765}
    .score-cell-finish-creator,.score-cell-finish-creator.score-cell-token-position{background:#f27569}
    .score-cell-finish-joiner,.score-cell-finish-joiner.score-cell-token-position{background:#58bd75}
    .score-cell-token-position{border-color:transparent;background:transparent}
    .score-cell-token-position::after{display:none}
    .score-cell-direction{position:absolute;top:0;right:0;z-index:2;display:grid;width:clamp(9px,2.4vw,16px);height:clamp(9px,2.4vw,16px);place-items:center;border-radius:50%;color:#67420c;background:#fff;font-size:clamp(7px,1.8vw,11px);font-weight:900;line-height:1;pointer-events:none}
    .score-cell-home-entry.creator{border:1px solid #c94f46;color:#c94f46}
    .score-cell-home-entry.joiner{border:1px solid #32834e;color:#32834e}
    .score-cell-center-connector.creator{border:1px solid #fff;color:#fff;background:#e9574f}
    .score-cell-center-connector.joiner{border:1px solid #fff;color:#fff;background:#16a765}
    .score-cell-center-connector-creator{background:#e9574f}
    .score-cell-center-connector-joiner{background:#16a765}
    .score-cell-home-direction.creator{top:50%;right:0;left:auto;width:clamp(9px,2.4vw,16px);height:clamp(9px,2.4vw,16px);color:#c94f46;background:#fff;transform:translateY(-50%)}
    .score-cell-home-direction.joiner{top:50%;right:auto;left:0;width:clamp(9px,2.4vw,16px);height:clamp(9px,2.4vw,16px);color:#32834e;background:#fff;transform:translateY(-50%)}
    .score-cell-home-step{position:absolute;bottom:0;z-index:2;display:grid;min-width:9px;height:9px;place-items:center;border-radius:4px;color:#233247;background:#fff;font-size:7px;font-weight:900;line-height:1;pointer-events:none}
    .score-cell-home-step.creator{left:0}
    .score-cell-home-step.joiner{right:0}
    .score-cell-finish-marker{position:absolute;top:0;z-index:2;font-size:clamp(8px,2vw,13px);line-height:1;pointer-events:none}
    .score-cell-finish-marker.creator{left:0}
    .score-cell-finish-marker.joiner{right:0}
    .score-token-stack{position:relative;z-index:1;display:flex;align-items:center;justify-content:center;flex-wrap:wrap;gap:1px;max-width:100%}
    .score-token{display:grid;place-items:center;width:clamp(11px,3.3vw,24px);height:clamp(11px,3.3vw,24px);padding:0;border:2px solid #fff;border-radius:50%;box-shadow:0 1px 3px #0007;color:#fff;font-size:clamp(7px,1.5vw,11px);font-weight:800}
    .score-token.creator{background:#c94f46}.score-token.joiner{background:#32834e}
    .score-token.selectable{outline:2px solid #f0c85b;cursor:pointer;animation:score-pulse 1.1s infinite alternate}
    .score-token:disabled{cursor:default;opacity:1}
    .ludo-score-proof{max-width:560px;margin:12px auto 0}
    .ludo-score-proof input{width:100%}
    @keyframes ludo-die-pop{from{transform:rotate(-12deg) scale(.8)}to{transform:rotate(-8deg) scale(1)}}
    @keyframes score-pulse{to{transform:scale(1.13)}}
    @media(max-width:520px){body.ludo-score-page .ludo-score-board{width:min(100vw,64vh);border-width:3px}.ludo-score-players{grid-template-columns:minmax(0,1fr) 64px minmax(0,1fr);gap:3px;padding-right:6px;padding-left:6px}.ludo-score-avatar{width:42px;height:42px}.ludo-score-player-info{min-height:40px}.ludo-score-controls{padding-bottom:17px}.ludo-score-roll{width:62px;height:62px}.ludo-score-die{width:54px;height:54px;min-width:54px}.ludo-score-status{font-size:11px}}
    @media(max-height:520px){.ludo-score-players{padding-bottom:4px}.ludo-score-avatar{width:36px;height:36px}.ludo-score-controls{padding-bottom:4px}}
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
    if (progress === 57) return [finishPosition];
    return [homePaths[side][progress - 52]];
  }

  window.updateLudoScoreWalletBalance = balance => {
    const amount = Number(balance);
    const wallet = document.getElementById('ludoScoreWalletBalance');
    if (wallet && Number.isFinite(amount)) wallet.textContent = `Wallet ₹${amount.toLocaleString('en-IN')}`;
  };

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
    if (!pips) return '<span class="ludo-score-ready-die" role="img" aria-label="Dice ready to roll">🎲</span>';
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
    const state = match.ludoScore || (['OPEN', 'CANCELLED'].includes(match.status) ? {
      tokens: { creator: [-1, -1, -1, -1], joiner: [-1, -1, -1, -1] },
      scores: { creator: 0, joiner: 0 },
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
    const ownTurn = match.status === 'RUNNING' && String(state.currentTurn) === myId && !state.winnerId;
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
      if (row < 6 && col < 6) {
        classes.push('score-cell-yard-red');
        if (row > 0 && row < 5 && col > 0 && col < 5) classes.push('score-cell-yard-inner-red');
      }
      if (row > 8 && col > 8) {
        classes.push('score-cell-yard-green');
        if (row > 9 && row < 14 && col > 9 && col < 14) classes.push('score-cell-yard-inner-green');
      }
      for (const side of ['creator', 'joiner']) {
        if (trackIndex === (side === 'creator' ? 0 : 26)) classes.push(`score-cell-start-${side}`);
        const color = side === 'creator' ? 'red' : 'green';
        if (baseSlots[side].some(([baseRow, baseCol]) => baseRow === row && baseCol === col)) classes.push('score-cell-base', `score-cell-base-${color}`);
      }
      const onCreatorHomePath = homePaths.creator.some(([homeRow, homeCol]) => homeRow === row && homeCol === col);
      const onJoinerHomePath = homePaths.joiner.some(([homeRow, homeCol]) => homeRow === row && homeCol === col);
      if (onCreatorHomePath) classes.push('score-cell-home', 'score-cell-home-creator');
      if (onJoinerHomePath) classes.push('score-cell-home', 'score-cell-home-joiner');
      const onCenter = row === finishPosition[0] && col === finishPosition[1];
      if (onCenter) classes.push('score-cell-center');
      const centerConnectorSide = ['creator', 'joiner'].find(side => {
        const [connectorRow, connectorCol] = centerConnectors[side].position;
        return row === connectorRow && col === connectorCol;
      });
      if (centerConnectorSide) classes.push(`score-cell-center-connector`, `score-cell-center-connector-${centerConnectorSide}`);
      const direction = turnDirections.get(trackIndex);
      const directionMarkup = onCreatorHomePath
        ? '<span class="score-cell-direction score-cell-home-direction creator" aria-hidden="true">→</span>'
        : onJoinerHomePath
          ? '<span class="score-cell-direction score-cell-home-direction joiner" aria-hidden="true">←</span>'
          : centerConnectorSide
            ? `<span class="score-cell-direction score-cell-center-connector ${centerConnectorSide}" aria-label="${centerConnectors[centerConnectorSide].label}" title="${centerConnectors[centerConnectorSide].label}">${centerConnectors[centerConnectorSide].arrow}</span>`
          : homeEntryMarkers.has(trackIndex)
            ? `<span class="score-cell-direction score-cell-home-entry ${homeEntryMarkers.get(trackIndex).side}" aria-label="${homeEntryMarkers.get(trackIndex).label}" title="${homeEntryMarkers.get(trackIndex).label}">${homeEntryMarkers.get(trackIndex).arrow}</span>`
            : direction ? `<span class="score-cell-direction" aria-hidden="true">${direction}</span>` : '';
      const creatorHomeStep = homePaths.creator.findIndex(([homeRow, homeCol]) => homeRow === row && homeCol === col);
      const joinerHomeStep = homePaths.joiner.findIndex(([homeRow, homeCol]) => homeRow === row && homeCol === col);
      const homeStepMarkup = creatorHomeStep >= 0
        ? `<span class="score-cell-home-step creator" aria-label="Red home step ${creatorHomeStep + 1}">${creatorHomeStep + 1}</span>`
        : joinerHomeStep >= 0
          ? `<span class="score-cell-home-step joiner" aria-label="Green home step ${joinerHomeStep + 1}">${joinerHomeStep + 1}</span>`
          : '';
      const finishMarkup = onCenter ? '<span class="score-cell-center-home" aria-label="Shared center home">🏠</span>' : '';
      const tokensHere = [];
      for (const side of ['creator', 'joiner']) {
        (state.tokens[side] || []).forEach((progress, tokenIndex) => {
          if (!positionFor(side, progress, tokenIndex).some(([tokenRow, tokenCol]) => tokenRow === row && tokenCol === col)) return;
          const canMove = side === mySide && ownTurn && legalTokens.includes(tokenIndex);
          const label = `${side === 'creator' ? 'Red' : 'Green'} token ${tokenIndex + 1}`;
          const locked = progress === -1 && !canMove;
          tokensHere.push(`<button type="button" class="score-token ${side}${canMove ? ' selectable' : ''}" data-score-token="${tokenIndex}" aria-label="${label}${canMove ? ', select to move' : locked ? ', ghar mein band; 6 chahiye' : ''}"${locked ? ' title="Ghar se kholne ke liye 6 chahiye"' : ''} ${canMove ? '' : 'disabled'}>${tokenIndex + 1}</button>`);
        });
      }
      if (tokensHere.length) classes.push('score-cell-token-position');
      return `<div class="${classes.join(' ')}" style="grid-row:${row + 1};grid-column:${col + 1}">${directionMarkup}${homeStepMarkup}${finishMarkup}${tokensHere.length ? `<div class="score-token-stack">${tokensHere.join('')}</div>` : ''}</div>`;
    }).join('');
    const creatorScore = Number(state.scores?.creator ?? scoreForTokens(state.tokens.creator));
    const joinerScore = Number(state.scores?.joiner ?? scoreForTokens(state.tokens.joiner));
    const dieValue = state.diceValue || state.lastDice || '–';
    const statusText = match.status === 'OPEN'
      ? 'Pratidvandvi ka intezar hai — join karte hi yahin game shuru hoga.'
      : match.status === 'CANCELLED'
        ? 'Yeh battle cancel ho chuki hai.'
      : winner
      ? `🏆 ${app.esc(winnerName)} winner hain — charon gotiyan ghar pahunch gayi.`
      : ownTurn
        ? state.diceValue ? `${state.diceValue} aaya — apni goti chunein.` : 'Aapki baari.'
        : `${app.esc(ownTurnName)} ki turn hai. Board live update hota rahega.`;
    const playerCard = (user, side, score, homeCount, isCurrentUser) => {
      const name = String(app.nameOf(user) || 'Player');
      const profileImage = String(user?.profileImage || '').trim();
      const imageUrl = profileImage.startsWith('uploads/')
        ? `/api/profile/image/${encodeURIComponent(profileImage.slice('uploads/'.length))}`
        : profileImage ? `/${profileImage.split('/').map(encodeURIComponent).join('/')}` : '';
      const avatar = imageUrl
        ? `<img src="${app.esc(imageUrl)}" alt="${app.esc(name)}">`
        : app.esc(name.trim().charAt(0).toUpperCase() || '?');
      const currentPlayer = app.getPlayer() || app.getUser();
      const rawBalance = isCurrentUser ? currentPlayer?.walletBalance ?? user?.walletBalance : undefined;
      const balance = Number(rawBalance);
      const walletMarkup = isCurrentUser
        ? `<small id="ludoScoreWalletBalance" class="ludo-score-wallet">Wallet ${Number.isFinite(balance) ? `₹${balance.toLocaleString('en-IN')}` : '₹--'}</small>`
        : '';
      return `<div class="ludo-score-player ${side}"><span class="ludo-score-avatar">${avatar}</span><div class="ludo-score-player-info"><strong>${app.esc(name)}</strong><small>${score}/${scoreMaximum} · ${homeCount}/4 ghar</small>${walletMarkup}</div></div>`;
    };
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
      ? '<form id="ludoScoreCancel" class="ludo-score-cancel"><button type="submit" aria-label="Battle cancel karein" title="Battle cancel karein">×</button></form>'
      : '';
    return `<div class="ludo-score-screen">
      <div class="ludo-score-board" role="grid" aria-label="KhiladiAdda24 Ludo Score board">${cells}</div>
      <div class="ludo-score-status" aria-live="polite">${statusText}${state.lastAction ? `<br><small>${app.esc(state.lastAction)}</small>` : ''}</div>
      <div class="ludo-score-players">
        ${playerCard(match.creator, 'creator', creatorScore, state.tokens.creator.filter(value => value === 57).length, mySide === 'creator')}
        <div class="ludo-score-controls">${match.status === 'RUNNING' && !winner ? '<span id="ludoScoreTimer" class="ludo-score-timer" aria-live="polite">20s</span>' : ''}<button type="button" class="btn ludo-score-roll" id="ludoScoreRoll" aria-label="Dice roll karein" ${!ownTurn || state.diceValue || busy ? 'disabled' : ''}>${diceMarkup(dieValue)}</button></div>
        ${playerCard(match.joiner || { username: joinerName }, 'joiner', joinerScore, state.tokens.joiner.filter(value => value === 57).length, mySide === 'joiner')}
      </div>
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
      const signature = `${currentMatch.status}:${currentMatch.ludoScore?.version}:${currentMatch.ludoScore?.winnerId || ''}:${currentMatch.proofScreenshot || ''}:${currentMatch.resultSubmittedAt || ''}`;
      if (signature === activeSignature) return;
      activeSignature = signature;
      app.el('matchDetails').innerHTML = makeMarkup(currentMatch, app);
      app.setView('match');
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
          if (result.match.status === 'COMPLETED') await app.refresh();
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
          const text = `KhiladiAdda24 Ludo Score · Winner ${app.nameOf(app.getPlayer() || app.getUser())} · ${scoreMaximum}/${scoreMaximum} · ${timestamp} IST${adminNumber ? ` · Admin WhatsApp +${adminNumber}` : ''}`;
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
