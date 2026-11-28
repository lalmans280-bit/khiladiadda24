(() => {
  const app = window.matchApp;
  if (!app) return;
  const { api, el, notify, refresh } = app;
  const announceEnteredAmount = (input, type) => {
    let timer;
    input.addEventListener('input', () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        const amount = Number(input.value);
        if (input.value.trim() && Number.isFinite(amount) && amount > 0) {
          app.announceWalletAmount?.(type, amount);
        }
      }, 900);
    });
  };
  const form = el('withdrawForm');
  if (!form) return;

  function addField(name, labelText, options = {}) {
    const wrapper = document.createElement('div');
    wrapper.className = 'field';
    const label = document.createElement('label');
    label.htmlFor = name;
    label.textContent = labelText;
    const input = document.createElement('input');
    input.id = name;
    input.name = name;
    input.type = options.type || 'text';
    input.required = true;
    input.autocomplete = options.autocomplete || 'off';
    input.maxLength = options.maxLength || 80;
    if (options.inputMode) input.inputMode = options.inputMode;
    if (options.pattern) input.pattern = options.pattern;
    if (options.placeholder) input.placeholder = options.placeholder;
    wrapper.append(label, input);
    return wrapper;
  }

  const amountField = form.querySelector('[name="amount"]')?.closest('.field');
  const upiField = form.querySelector('[name="upiId"]')?.closest('.field');
  if (!amountField || !upiField) return;
  const winningsNote = document.createElement('p');
  winningsNote.id = 'withdrawableWinnings';
  winningsNote.className = 'muted';
  form.before(winningsNote);
  const refreshWinningsNote = () => api('/api/wallet/summary').then(data => {
    winningsNote.textContent = `Withdrawable game winnings: ₹${Number(data.availableWinnings || 0).toLocaleString('en-IN')}. Deposits and bonuses cannot be withdrawn.`;
  }).catch(() => {
    winningsNote.textContent = 'Only game winnings are withdrawable.';
  });
  refreshWinningsNote();
  document.querySelectorAll('[data-view="wallet"]').forEach(button => button.addEventListener('click', refreshWinningsNote));
  const withdrawalAmount = form.elements.amount;
  withdrawalAmount.min = '500';
  withdrawalAmount.step = '100';
  announceEnteredAmount(withdrawalAmount, 'withdrawal');
  const payoutMethodField = document.createElement('div');
  payoutMethodField.className = 'field';
  const payoutMethodLabel = document.createElement('label');
  payoutMethodLabel.htmlFor = 'payoutMethod';
  payoutMethodLabel.textContent = 'Withdrawal method';
  const payoutMethodSelect = document.createElement('select');
  payoutMethodSelect.id = 'payoutMethod';
  payoutMethodSelect.name = 'payoutMethod';
  payoutMethodSelect.required = true;
  [['BANK', 'Bank account'], ['UPI', 'UPI ID'], ['QR', 'UPI QR']].forEach(([value, label]) => {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = label;
    payoutMethodSelect.append(option);
  });
  payoutMethodField.append(payoutMethodLabel, payoutMethodSelect);
  amountField.after(payoutMethodField);

  const accountHolderField = addField('accountHolderName', 'Account holder name', { autocomplete: 'name', maxLength: 80 });
  const accountNumberField = addField('accountNumber', 'Bank account number', { inputMode: 'numeric', maxLength: 18, pattern: '[0-9]{9,18}' });
  const ifscField = addField('ifscCode', 'Bank IFSC code', { maxLength: 11, pattern: '[A-Za-z]{4}0[A-Za-z0-9]{6}', placeholder: 'ABCD0123456' });
  form.insertBefore(accountHolderField, upiField);
  form.insertBefore(accountNumberField, upiField);
  form.insertBefore(ifscField, upiField);

  const upiInput = form.elements.upiId;
  const qrField = document.createElement('div');
  qrField.className = 'field';
  const qrLabel = document.createElement('label');
  qrLabel.htmlFor = 'payoutQr';
  qrLabel.textContent = 'UPI QR image';
  const qrInput = document.createElement('input');
  qrInput.id = 'payoutQr';
  qrInput.name = 'payoutQr';
  qrInput.type = 'file';
  qrInput.accept = 'image/jpeg,image/png,image/webp';
  const qrHelp = document.createElement('small');
  qrHelp.className = 'muted';
  qrHelp.textContent = 'JPG, PNG ya WebP; maximum 5 MB.';
  qrField.append(qrLabel, qrInput, qrHelp);
  upiField.after(qrField);

  const updatePayoutFields = () => {
    const method = payoutMethodSelect.value;
    [
      [accountHolderField, method === 'BANK'],
      [accountNumberField, method === 'BANK'],
      [ifscField, method === 'BANK'],
      [upiField, method === 'UPI'],
      [qrField, method === 'QR']
    ].forEach(([field, active]) => {
      const input = field.querySelector('input');
      field.hidden = !active;
      input.required = active;
      input.disabled = !active;
    });
  };
  payoutMethodSelect.addEventListener('change', updatePayoutFields);
  updatePayoutFields();

  const description = form.closest('.panel')?.querySelector('p.muted');
  if (description) description.textContent = '₹500 minimum; ₹100 ke steps mein (₹500, ₹600, ₹700...). Withdraw ke liye approved KYC zaroori hai.';
  const battleDescription = document.querySelector('#view-battles .panel p.muted');
  if (battleDescription) battleDescription.textContent = 'Minimum entry ₹50 aur wallet balance mein poori entry honi chahiye. Ludo Classic Ludo King app mein khelein; host room code share karega.';

  document.addEventListener('click', event => {
    const joinButton = event.target.closest('[data-join]');
    if (joinButton) {
      app.playAlertTone?.();
      const amountText = joinButton.closest('.match')?.querySelector('.amount')?.textContent || '';
      window.pendingEntryAmount = Number(amountText.replace(/[^0-9]/g, '')) || 50;
    }
  }, true);
  document.addEventListener('submit', event => {
    if (event.target.id === 'createForm') window.pendingEntryAmount = Number(el('entryAmount').value) || 50;
  }, true);

  form.addEventListener('submit', async event => {
    event.preventDefault();
    event.stopImmediatePropagation();
    if (!form.reportValidity()) return;
    const amount = Number(form.elements.amount.value);
    if (!Number.isInteger(amount) || amount < 500 || amount % 100 !== 0) {
      notify('Withdrawal ₹500 se shuru hoti hai aur ₹100 ke steps mein request karein.', true);
      return;
    }

    try {
      const payoutMethod = payoutMethodSelect.value;
      let body;
      if (payoutMethod === 'BANK') {
        body = {
          amount,
          payoutMethod,
          accountHolderName: form.elements.accountHolderName.value.trim(),
          accountNumber: form.elements.accountNumber.value.trim(),
          ifscCode: form.elements.ifscCode.value.trim().toUpperCase()
        };
      } else if (payoutMethod === 'UPI') {
        body = { amount, payoutMethod, upiId: upiInput.value.trim() };
      } else {
        body = new FormData();
        body.set('amount', String(amount));
        body.set('payoutMethod', payoutMethod);
        body.set('payoutQr', qrInput.files[0]);
      }
      const result = await api('/api/wallet/withdraw', {
        method: 'POST',
        body
      });
      form.reset();
      updatePayoutFields();
      notify(result.message);
      await refresh();
    } catch (error) {
      notify(error.message || 'Withdrawal request submit nahi hui.', true);
    }
  }, true);

  const qrForm = el('qrForm');
  const qrArea = el('qrArea');
  const amountInput = el('depositAmount');
  if (!qrForm || !qrArea || !amountInput) return;
  announceEnteredAmount(amountInput, 'deposit');
  const entryAmountInput = el('entryAmount');
  let lastAnnouncedEntryAmount = '';
  let entryAmountVoiceTimer;
  const announceCurrentEntryAmount = () => {
    if (!entryAmountInput?.value.trim() || !entryAmountInput.validity.valid) return;
    const amount = Number(entryAmountInput.value);
    if (!Number.isFinite(amount) || amount <= 0 || String(amount) === lastAnnouncedEntryAmount) return;
    if (app.announceBattleEntryAmount?.(amount)) lastAnnouncedEntryAmount = String(amount);
  };
  if (entryAmountInput) {
    entryAmountInput.addEventListener('input', () => {
      window.clearTimeout(entryAmountVoiceTimer);
      entryAmountVoiceTimer = window.setTimeout(announceCurrentEntryAmount, 450);
    });
    entryAmountInput.addEventListener('change', () => {
      window.clearTimeout(entryAmountVoiceTimer);
      announceCurrentEntryAmount();
    });
    document.addEventListener('submit', event => {
      if (event.target.id === 'createForm') announceCurrentEntryAmount();
    }, true);
  }

  const qrButton = qrForm.querySelector('button[type="submit"]');
  if (qrButton) qrButton.textContent = 'Deposit form kholein';
  qrForm.addEventListener('submit', event => {
    event.preventDefault();
    event.stopImmediatePropagation();
    const amount = Number(amountInput.value);
    if (!Number.isInteger(amount) || amount < Number(amountInput.min)) {
      notify(`Deposit minimum ₹${amountInput.min} hai.`, true);
      return;
    }

    qrArea.replaceChildren();
    delete qrArea.dataset.upiUrl;
    const depositForm = el('depositForm');
    depositForm.hidden = false;
    depositForm.dataset.amount = String(amount);
    notify('Deposit request form ready hai.');
  }, true);
})();
