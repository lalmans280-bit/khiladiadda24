(() => {
  const suits = ['♠', '♥', '♦', '♣'];
  const ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
  const rankValues = new Map(ranks.map((rank, index) => [rank, index + 1]));
  const players = [
    { name: 'You', hand: [], human: true },
    { name: 'Aarav', hand: [], human: false },
    { name: 'Nisha', hand: [], human: false },
    { name: 'Kabir', hand: [], human: false }
  ];
  const ui = {
    opponents: document.getElementById('opponents'),
    hand: document.getElementById('playerHand'),
    handCount: document.getElementById('handCount'),
    deck: document.getElementById('drawDeck'),
    discardPile: document.getElementById('discardPile'),
    phase: document.getElementById('turnMessage'),
    stockCount: document.getElementById('stockCount'),
    wildCard: document.getElementById('wildCard'),
    discardButton: document.getElementById('discardButton'),
    declareButton: document.getElementById('declareButton'),
    startButton: document.getElementById('startButton'),
    restartButton: document.getElementById('restartButton'),
    notice: document.getElementById('gameNotice'),
    resultDialog: document.getElementById('resultDialog'),
    resultTitle: document.getElementById('resultTitle'),
    resultText: document.getElementById('resultText'),
    resultButton: document.getElementById('resultButton')
  };

  let deck = [];
  let discard = [];
  let wildRank = 'A';
  let activePlayer = 0;
  let phase = 'ready';
  let selectedCardId = '';
  let drawnCardId = '';
  let noticeTimer;

  function createDeck() {
    const cards = [];
    for (let deckNumber = 0; deckNumber < 2; deckNumber += 1) {
      for (const suit of suits) {
        for (const rank of ranks) cards.push({ id: `${deckNumber}-${suit}-${rank}`, suit, rank, joker: false });
      }
      cards.push({ id: `${deckNumber}-JOKER`, suit: '', rank: 'JOKER', joker: true });
    }
    return cards;
  }

  function shuffle(cards) {
    for (let index = cards.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(Math.random() * (index + 1));
      [cards[index], cards[swapIndex]] = [cards[swapIndex], cards[index]];
    }
    return cards;
  }

  function isWild(card) {
    return card.joker || card.rank === wildRank;
  }

  function cardValue(card) {
    if (card.joker || card.rank === wildRank) return 0;
    const value = rankValues.get(card.rank);
    return value > 10 ? 10 : value;
  }

  function cardLabel(card) {
    return card.joker ? 'Joker' : `${card.rank}${card.suit}`;
  }

  function cardMarkup(card, options = {}) {
    const red = card.suit === '♥' || card.suit === '♦';
    const classes = ['playing-card', red ? 'red-suit' : 'black-suit'];
    if (options.selected) classes.push('selected');
    if (options.disabled) classes.push('unavailable');
    const face = card.joker ? '<span class="joker-face">★</span>' : `<span class="card-rank">${card.rank}</span><span class="card-suit">${card.suit}</span>`;
    if (options.button === false) return `<span class="${classes.join(' ')}" aria-label="${cardLabel(card)}">${face}</span>`;
    return `<button class="${classes.join(' ')}" type="button" data-card-id="${card.id}" aria-label="${cardLabel(card)}${options.selected ? ', selected' : ''}" aria-pressed="${Boolean(options.selected)}"${options.disabled ? ' disabled' : ''}>${face}</button>`;
  }

  function canMakeSequence(cards) {
    const length = cards.length;
    if (length < 3 || length > 13) return null;
    const wildCards = cards.filter(isWild);
    const naturalCards = cards.filter(card => !isWild(card));
    for (const suit of suits) {
      for (let start = 1; start <= 14 - length + 1; start += 1) {
        const window = Array.from({ length }, (_, index) => start + index);
        const naturalRanks = naturalCards.map(card => {
          if (card.suit !== suit) return null;
          const value = rankValues.get(card.rank);
          return value === 1 && window.includes(14) ? 14 : value;
        });
        if (naturalRanks.some(value => value === null || !window.includes(value))) continue;
        if (new Set(naturalRanks).size !== naturalRanks.length) continue;
        if (length - naturalCards.length <= wildCards.length) {
          return { sequence: true, pure: wildCards.length === 0 && naturalCards.length === length };
        }
      }
    }
    return null;
  }

  function canMakeSet(cards) {
    if (cards.length < 3 || cards.length > 4) return false;
    const naturalCards = cards.filter(card => !isWild(card));
    if (!naturalCards.length) return true;
    const rank = naturalCards[0].rank;
    if (naturalCards.some(card => card.rank !== rank)) return false;
    const naturalSuits = naturalCards.map(card => card.suit);
    return new Set(naturalSuits).size === naturalSuits.length;
  }

  function combinations(items, size, visit) {
    const selected = [];
    function walk(start) {
      if (selected.length === size) {
        visit(selected.slice());
        return;
      }
      for (let index = start; index <= items.length - (size - selected.length); index += 1) {
        selected.push(items[index]);
        walk(index + 1);
        selected.pop();
      }
    }
    walk(0);
  }

  function hasValidDeclaration(hand) {
    if (hand.length !== 13) return false;
    const melds = [];
    for (let size = 3; size <= hand.length; size += 1) {
      combinations(hand.map((card, index) => ({ card, index })), size, group => {
        const sequence = canMakeSequence(group.map(item => item.card));
        const set = size <= 4 && canMakeSet(group.map(item => item.card));
        if (!sequence && !set) return;
        let mask = 0;
        for (const item of group) mask |= 1 << item.index;
        melds.push({
          mask,
          sequence: Boolean(sequence),
          pure: Boolean(sequence?.pure)
        });
      });
    }

    const fullMask = (1 << hand.length) - 1;
    const memo = new Set();
    function solve(mask, sequences, hasPureSequence) {
      if (mask === fullMask) return sequences >= 2 && hasPureSequence;
      const key = `${mask}:${Math.min(sequences, 2)}:${Number(hasPureSequence)}`;
      if (memo.has(key)) return false;
      memo.add(key);
      let firstIndex = 0;
      while (mask & (1 << firstIndex)) firstIndex += 1;
      const firstBit = 1 << firstIndex;
      for (const meld of melds) {
        if (!(meld.mask & firstBit) || (meld.mask & mask)) continue;
        if (solve(mask | meld.mask, sequences + Number(meld.sequence), hasPureSequence || meld.pure)) return true;
      }
      return false;
    }
    return solve(0, 0, false);
  }

  function showNotice(message, error = false) {
    clearTimeout(noticeTimer);
    ui.notice.textContent = message;
    ui.notice.classList.toggle('error', error);
    ui.notice.hidden = false;
    noticeTimer = setTimeout(() => { ui.notice.hidden = true; }, 3200);
  }

  function renderOpponents() {
    ui.opponents.innerHTML = players.slice(1).map((player, index) => {
      const isTurn = activePlayer === index + 1;
      const state = phase !== 'ready' && phase !== 'finished' && isTurn ? 'Playing' : phase === 'finished' ? 'Round over' : 'Ready';
      return `<article class="opponent"><span class="opponent-avatar" aria-hidden="true">${player.name.charAt(0)}</span><span class="opponent-info"><strong>${player.name}</strong><small>${player.hand.length} cards · ${state}</small></span><span class="opponent-turn" aria-hidden="true">${isTurn ? '●' : ''}</span></article>`;
    }).join('');
  }

  function render() {
    renderOpponents();
    const user = players[0];
    const userTurn = activePlayer === 0 && ['draw', 'discard'].includes(phase);
    ui.handCount.textContent = `${user.hand.length || 13} cards`;
    ui.hand.innerHTML = user.hand
      .slice()
      .sort((left, right) => (left.suit || 'Z').localeCompare(right.suit || 'Z') || (rankValues.get(left.rank) || 0) - (rankValues.get(right.rank) || 0))
      .map(card => cardMarkup(card, { selected: selectedCardId === card.id, disabled: !userTurn || phase !== 'discard' || card.id === drawnCardId }))
      .join('');
    ui.deck.innerHTML = deck.length ? '<span class="deck-back" aria-hidden="true"><span>13</span></span>' : '<span class="empty-pile">No cards</span>';
    ui.discardPile.innerHTML = discard.length ? cardMarkup(discard[discard.length - 1], { button: false }) : '<span class="empty-pile">Empty</span>';
    ui.deck.disabled = !userTurn || phase !== 'draw' || deck.length === 0;
    ui.discardPile.classList.toggle('pickable', userTurn && phase === 'draw' && discard.length > 0);
    ui.stockCount.textContent = phase === 'ready' ? '106 cards' : `${deck.length} in deck`;
    ui.wildCard.textContent = phase === 'ready' ? '--' : `${wildRank} is wild`;
    ui.phase.textContent = phase === 'ready'
      ? 'Start a free practice round to deal your cards.'
      : phase === 'draw'
        ? userTurn ? 'Your turn: draw from the deck or pick the top discard.' : `${players[activePlayer].name} is playing...`
        : phase === 'discard'
          ? 'Choose a card to discard. The card you just drew cannot be discarded immediately.'
          : phase === 'finished' ? 'Round complete.' : 'Shuffling cards...';
    const canDeclare = phase === 'draw' && userTurn && user.hand.length === 13 && hasValidDeclaration(user.hand);
    ui.declareButton.disabled = !canDeclare;
    ui.discardButton.disabled = phase !== 'discard' || !selectedCardId;
    ui.startButton.hidden = phase !== 'ready';
    ui.restartButton.hidden = phase === 'ready';
  }

  function recycleDiscardPile() {
    if (discard.length < 2) return false;
    const topCard = discard.pop();
    deck = shuffle(discard);
    discard = [topCard];
    return deck.length > 0;
  }

  function drawForPlayer(playerIndex, fromDiscard = false) {
    const player = players[playerIndex];
    if (fromDiscard && discard.length) {
      player.hand.push(discard.pop());
    } else {
      if (!deck.length) recycleDiscardPile();
      const card = deck.pop();
      if (!card) return null;
      player.hand.push(card);
    }
    return player.hand[player.hand.length - 1];
  }

  function beginRound() {
    deck = shuffle(createDeck());
    for (const player of players) player.hand = deck.splice(0, 13);
    wildRank = ranks[Math.floor(Math.random() * ranks.length)];
    discard = [deck.pop()];
    activePlayer = 0;
    phase = 'draw';
    selectedCardId = '';
    drawnCardId = '';
    ui.resultDialog.hidden = true;
    ui.notice.hidden = true;
    render();
  }

  function finishRound(winnerIndex, reason) {
    phase = 'finished';
    const winner = players[winnerIndex];
    ui.resultTitle.textContent = winner.human ? 'You made a valid declaration!' : `${winner.name} wins this round`;
    ui.resultText.textContent = `${reason} This is a free practice game against bots. No entry fee, cash prize, or wallet changes.`;
    ui.resultDialog.hidden = false;
    render();
  }

  function finishUserTurn() {
    if (selectedCardId) {
      const cardIndex = players[0].hand.findIndex(card => card.id === selectedCardId);
      if (cardIndex < 0 || players[0].hand[cardIndex].id === drawnCardId) return;
      discard.push(players[0].hand.splice(cardIndex, 1)[0]);
    }
    if (players[0].hand.length !== 13) return;
    if (hasValidDeclaration(players[0].hand)) {
      finishRound(0, 'Your 13 cards form valid melds.');
      return;
    }
    phase = 'draw';
    activePlayer = 1;
    selectedCardId = '';
    drawnCardId = '';
    render();
    window.setTimeout(playBotTurn, 420);
  }

  function sequenceAffinity(card, hand) {
    if (isWild(card)) return 8;
    const value = rankValues.get(card.rank);
    return hand.reduce((score, other) => {
      if (other.id === card.id || isWild(other)) return score;
      if (other.rank === card.rank && other.suit !== card.suit) return score + 2.8;
      if (other.suit !== card.suit) return score;
      const otherValue = rankValues.get(other.rank);
      const distance = Math.abs(value - otherValue);
      const aceDistance = (value === 1 && otherValue === 13) || (value === 13 && otherValue === 1) ? 2 : distance;
      return score + (aceDistance === 1 ? 2.4 : aceDistance === 2 ? 1.1 : 0);
    }, 0);
  }

  function chooseBotDiscard(hand, drawnCard) {
    return hand
      .filter(card => card.id !== drawnCard.id)
      .map(card => ({ card, score: cardValue(card) - sequenceAffinity(card, hand) + Math.random() * 0.3 }))
      .sort((left, right) => right.score - left.score)[0]?.card;
  }

  function playBotTurn() {
    if (phase !== 'draw' || activePlayer === 0) return;
    const playerIndex = activePlayer;
    const player = players[playerIndex];
    const topDiscard = discard[discard.length - 1];
    const useDiscard = Boolean(topDiscard && (isWild(topDiscard) || sequenceAffinity(topDiscard, player.hand) >= 2.4));
    const drawnCard = drawForPlayer(playerIndex, useDiscard);
    if (!drawnCard) {
      finishRound(0, 'The deck ran out before any player could declare.');
      return;
    }
    const discardedCard = chooseBotDiscard(player.hand, drawnCard);
    if (discardedCard) {
      player.hand.splice(player.hand.findIndex(card => card.id === discardedCard.id), 1);
      discard.push(discardedCard);
    }
    if (hasValidDeclaration(player.hand)) {
      finishRound(playerIndex, `${player.name} arranged two sequences, including a pure sequence.`);
      return;
    }
    activePlayer = (playerIndex + 1) % players.length;
    render();
    if (activePlayer !== 0) window.setTimeout(playBotTurn, 380);
  }

  ui.startButton.addEventListener('click', beginRound);
  ui.restartButton.addEventListener('click', beginRound);
  ui.resultButton.addEventListener('click', beginRound);
  ui.deck.addEventListener('click', () => {
    if (activePlayer !== 0 || phase !== 'draw') return;
    const drawnCard = drawForPlayer(0);
    if (!drawnCard) return showNotice('No cards left. Pick the top discard instead.', true);
    drawnCardId = drawnCard.id;
    phase = 'discard';
    selectedCardId = '';
    render();
  });
  ui.discardPile.addEventListener('click', () => {
    if (activePlayer !== 0 || phase !== 'draw' || !discard.length) return;
    const drawnCard = drawForPlayer(0, true);
    if (!drawnCard) return;
    drawnCardId = drawnCard.id;
    phase = 'discard';
    selectedCardId = '';
    render();
  });
  ui.hand.addEventListener('click', event => {
    const card = event.target.closest('[data-card-id]');
    if (!card || phase !== 'discard' || activePlayer !== 0 || card.dataset.cardId === drawnCardId) return;
    selectedCardId = selectedCardId === card.dataset.cardId ? '' : card.dataset.cardId;
    render();
  });
  ui.discardButton.addEventListener('click', () => {
    if (!selectedCardId || phase !== 'discard') return;
    finishUserTurn();
  });
  ui.declareButton.addEventListener('click', () => {
    if (phase !== 'draw' || activePlayer !== 0) return;
    if (!hasValidDeclaration(players[0].hand)) {
      showNotice('Invalid hand. A valid declaration needs two sequences and at least one pure sequence.', true);
      return;
    }
    finishRound(0, 'Your 13 cards form valid melds.');
  });

  render();
})();
