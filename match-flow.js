(() => {
	const matchDetails = document.getElementById('matchDetails');
	if (!matchDetails) return;
	let sharedAudioContext;
	function getAudioContext() {
		const AudioCtor = window.AudioContext || window.webkitAudioContext;
		if (!AudioCtor) return null;
		if (!sharedAudioContext || sharedAudioContext.state === 'closed') sharedAudioContext = new AudioCtor();
		return sharedAudioContext;
	}
	function unlockAudioContext() {
		try {
			const audioContext = getAudioContext();
			if (audioContext?.state === 'suspended') audioContext.resume().catch(() => {});
		} catch {}
	}
	document.addEventListener('pointerdown', unlockAudioContext, { once: true });
	document.addEventListener('keydown', unlockAudioContext, { once: true });
	function playShortAlertTone() {
		const audioContext = getAudioContext();
		if (!audioContext) return;
		try {
			const startTone = () => {
				const oscillator = audioContext.createOscillator();
				const gainNode = audioContext.createGain();
				oscillator.type = 'triangle';
				oscillator.connect(gainNode);
				gainNode.connect(audioContext.destination);
				const startAt = audioContext.currentTime;
				oscillator.frequency.setValueAtTime(880, startAt);
				gainNode.gain.setValueAtTime(0.14, startAt);
				gainNode.gain.setValueAtTime(0.0001, startAt + 0.13);
				oscillator.frequency.setValueAtTime(880, startAt + 0.23);
				gainNode.gain.setValueAtTime(0.14, startAt + 0.23);
				oscillator.frequency.exponentialRampToValueAtTime(660, startAt + 0.34);
				gainNode.gain.exponentialRampToValueAtTime(0.0001, startAt + 0.4);
				oscillator.start(startAt);
				oscillator.stop(startAt + 0.42);
			};
			if (audioContext.state === 'running') startTone();
			else audioContext.resume().then(startTone).catch(() => {});
		} catch {}
	}
	if (window.matchApp) window.matchApp.playAlertTone = playShortAlertTone;
	if (!document.getElementById('resultUploadStyles')) {
		const style = document.createElement('style');
		style.id = 'resultUploadStyles';
		style.textContent = '#resultForm{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}#resultForm>.muted,#resultForm>button[type="submit"]{grid-column:1/-1}#resultForm>.field{min-width:0;margin:0}#resultForm .win-proof-column{grid-column:1/-1;display:grid;grid-template-columns:minmax(0,1fr) minmax(240px,300px);gap:8px;padding:14px;border:1px dashed #607767;border-radius:8px;background:#101920}#resultForm .win-proof-column[hidden]{display:none}#resultForm .win-proof-column>label,#resultShotHelp,#resultShotFileName,.result-proof-preview{grid-column:1/-1}#resultForm .win-proof-column input[type="file"]{grid-column:1;grid-row:2;min-width:0;width:100%;max-width:100%}#resultForm .result-proof-actions{grid-column:2;grid-row:2;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;align-self:center}#resultForm .result-proof-actions .btn{width:100%;min-width:0;min-height:46px;padding:8px 10px;font-size:14px;line-height:1.25;white-space:normal}#resultForm .result-proof-actions .btn[hidden]{display:none}.result-proof-preview{display:block;max-width:100%;max-height:360px;object-fit:contain;border:1px solid #40524f;border-radius:6px;background:#101920}.result-proof-preview[hidden]{display:none}@media(max-width:600px){#resultForm{grid-template-columns:minmax(0,1fr)}#resultForm .win-proof-column{grid-template-columns:minmax(0,1fr)}#resultForm .win-proof-column input[type="file"],#resultForm .result-proof-actions{grid-column:1;grid-row:auto}#resultForm .result-proof-actions{grid-template-columns:repeat(2,minmax(0,1fr))}}';
		document.head.append(style);
	}

	function setupResultForm(form) {
		if (form.dataset.resultOptionsReady) return;

		const winner = form.querySelector('#winner');
		const screenshot = form.querySelector('#resultShot');
		if (!winner || !screenshot) return;
		const resultIntro = form.previousElementSibling;
		if (resultIntro?.classList.contains('muted')) resultIntro.remove();
		winner.required = false;
		const currentUserId = String(window.matchApp?.getUser?.()?.id || window.matchApp?.getUser?.()?._id || '');
		const winOption = [...winner.options].find(option => String(option.value) === currentUserId) || [...winner.options][0];
		const lossOption = [...winner.options].find(option => String(option.value) !== currentUserId) || [...winner.options][1] || winOption;
		if (!winOption || !lossOption) return;
		winOption.dataset.result = 'WIN';
		lossOption.dataset.result = 'LOSS';
		winner.value = winOption.value;
		winner.closest('.field').hidden = true;
		screenshot.required = true;
		form.addEventListener('submit', () => { winner.value = winOption.value; }, true);

		const screenshotField = screenshot.closest('.field');
		screenshotField.classList.add('win-proof-column');
		const screenshotLabel = screenshotField.querySelector('label');
		screenshotLabel.textContent = 'Win screenshot file (both players)';
		const lossButton = document.createElement('button');
		lossButton.type = 'button';
		lossButton.className = 'btn danger small loss-report-button';
		lossButton.textContent = 'I Lost - LOSS';
		const resultActions = document.createElement('div');
		resultActions.className = 'result-proof-actions';
		screenshot.after(resultActions);
		resultActions.append(lossButton);

		const screenshotHint = document.createElement('p');
		screenshotHint.className = 'muted';
		screenshotHint.id = 'resultShotHelp';
		screenshotHint.textContent = 'Dono players apne match ka screenshot upload karein. WIN report ke liye required hai. JPG, PNG ya WebP; maximum 5 MB.';
		screenshotField.append(screenshotHint);
		screenshot.setAttribute('aria-describedby', screenshotHint.id);
		const selectedFile = document.createElement('p');
		selectedFile.className = 'muted';
		selectedFile.setAttribute('aria-live', 'polite');
		selectedFile.textContent = 'Abhi koi file select nahi hai.';
		screenshotField.append(selectedFile);
		const screenshotPreview = document.createElement('img');
		screenshotPreview.className = 'result-proof-preview';
		screenshotPreview.alt = 'Selected win screenshot preview';
		screenshotPreview.hidden = true;
		screenshotField.append(screenshotPreview);
		const reviewButton = form.querySelector('button[type="submit"]');
		if (reviewButton) {
			reviewButton.classList.add('result-review-button');
			reviewButton.textContent = 'Result review';
			resultActions.prepend(reviewButton);
		}
		let previewUrl = '';
		screenshot.addEventListener('change', () => {
			const file = screenshot.files[0];
			selectedFile.textContent = file?.name || 'Abhi koi file select nahi hai.';
			if (previewUrl) URL.revokeObjectURL(previewUrl);
			if (!file) {
				screenshotPreview.removeAttribute('src');
				screenshotPreview.hidden = true;
				previewUrl = '';
				return;
			}
			previewUrl = URL.createObjectURL(file);
			screenshotPreview.src = previewUrl;
			screenshotPreview.hidden = false;
		});

		const reasonField = document.createElement('div');
		reasonField.className = 'field';
		reasonField.hidden = true;
		reasonField.innerHTML = '<label for="resultReason">Loss reason</label><textarea id="resultReason" name="resultReason" maxlength="300" rows="3" placeholder="Loss ka reason likhein"></textarea>';
		screenshotField.after(reasonField);
		lossButton.addEventListener('click', async () => {
			const app = window.matchApp;
			const matchId = new URLSearchParams(location.search).get('matchId');
			if (!app || !lossOption || !matchId) return;
			winner.value = lossOption.value;
			winner.dataset.pendingResult = 'LOSS';
			screenshot.required = false;
			screenshot.value = '';
			reasonField.querySelector('textarea').value = 'Player reported LOSS';
			winner.dispatchEvent(new Event('change', { bubbles: true }));
			lossButton.disabled = true;
			lossButton.textContent = 'LOSS report bheji ja rahi hai...';
			try {
				const body = new FormData(form);
				body.set('matchId', matchId);
				const result = await app.api('/api/matches/submit-result', { method: 'POST', body });
				app.notify(result.message);
				const notice = document.createElement('p');
				notice.className = result.match?.status === 'COMPLETED' ? 'notice' : 'notice warning';
				notice.textContent = result.match?.status === 'COMPLETED'
					? 'Aapka LOSS confirm ho gaya. Opponent WIN hua aur payout automatic ho gaya.'
					: result.match?.status === 'PENDING_RESULT'
						? 'Dono players ke result match nahi hue. Admin decision ka wait karein.'
						: 'Aapka LOSS report submit ho gaya. Opponent ka payout automatically update hoga.';
				form.replaceWith(notice);
				await app.refresh();
			} catch (error) {
				app.notify(error.message || 'LOSS report submit nahi hui.', true);
				lossButton.disabled = false;
				lossButton.textContent = 'I Lost - LOSS report bhejein';
			}
		});
		const resultHint = document.createElement('p');
		resultHint.className = 'muted';
		resultHint.textContent = 'Room code lock ho gaya hai. Game ke baad Result review karein ya I Lost chunein.';
		form.prepend(resultHint);

		const updateFields = () => {
			screenshotField.hidden = false;
			screenshot.required = true;
			reasonField.hidden = true;
			reasonField.querySelector('textarea').required = false;
		};
		form.dataset.resultOptionsReady = 'true';
		updateFields();
		const matchId = new URLSearchParams(location.search).get('matchId');
		const currentUser = window.matchApp?.getUser?.() || {};
		const matchUserId = String(currentUser.id || currentUser._id || '');
		if (matchId && matchUserId) {
			window.matchApp.api(`/api/matches/${encodeURIComponent(matchId)}`).then(match => {
				if (!form.isConnected) return;
				const creatorId = String(match.creator?._id || match.creator || '');
				const ownResult = creatorId === matchUserId ? match.creatorResult : match.joinerResult;
				if (!ownResult) return;
				const notice = document.createElement('p');
				notice.className = ownResult === 'LOSS' ? 'notice warning' : 'notice';
				notice.textContent = `Aapka ${ownResult} report submit ho chuka hai. Dusre player ki report aur admin approval ke baad winner ka wallet automatic update hoga.`;
				form.replaceWith(notice);
			}).catch(() => {});
		}
	}

	function setupForms() {
		matchDetails.querySelectorAll('#resultForm').forEach(setupResultForm);
		const cancelReasonSelect = matchDetails.querySelector('#cancelForm #reason');
		if (cancelReasonSelect && !cancelReasonSelect.dataset.roomCodeReasonConfigured) {
			cancelReasonSelect.dataset.roomCodeReasonConfigured = 'true';
			const reasonField = cancelReasonSelect.closest('.field');
			const roomCodeShared = Boolean(matchDetails.querySelector('#roomCodeText'));
			if (reasonField) reasonField.hidden = !roomCodeShared;
			cancelReasonSelect.required = roomCodeShared;
			if (roomCodeShared) {
				const placeholder = document.createElement('option');
				placeholder.value = '';
				placeholder.textContent = 'Cancel reason select karein';
				placeholder.disabled = true;
				placeholder.selected = true;
				cancelReasonSelect.prepend(placeholder);
			}
		}
		const roomForm = matchDetails.querySelector('#roomForm');
		if (roomForm && !roomForm.dataset.startSetupAdded) {
			roomForm.dataset.startSetupAdded = 'true';
			roomForm.hidden = true;
			const matchId = new URLSearchParams(location.search).get('matchId');
			const app = window.matchApp;
			const setupHint = document.createElement('p');
			setupHint.className = 'muted';
			setupHint.textContent = 'Room code ka 2-minute timer shuru karne ke liye START dabayein.';
			const setupButton = document.createElement('button');
			setupButton.type = 'button';
			setupButton.className = 'btn green';
			setupButton.textContent = 'START';
			setupButton.setAttribute('aria-label', 'Start room code setup');
			roomForm.before(setupHint, setupButton);
			setupButton.addEventListener('click', async () => {
				playShortAlertTone();
				setupButton.disabled = true;
				try {
					const result = await app.api('/api/matches/start-setup', {
						method: 'POST',
						body: JSON.stringify({ matchId })
					});
					app.notify(result.message);
					setupHint.remove();
					setupButton.remove();
					roomForm.hidden = false;
				} catch (error) {
					app.notify(error.message || 'Room setup start nahi hui.', true);
					setupButton.disabled = false;
				}
			});
			playShortAlertTone();
			app.api(`/api/matches/${encodeURIComponent(matchId)}`).then(match => {
				if (!roomForm.isConnected) return;
				if (match.creatorStartedAt) {
					setupHint.remove();
					setupButton.remove();
					roomForm.hidden = false;
				}
			}).catch(error => {
				if (!roomForm.isConnected) return;
				setupHint.remove();
				setupButton.remove();
				roomForm.hidden = false;
				app.notify(error.message, true);
			});
		}
		const matchHeading = matchDetails.querySelector('h2');
		if (matchHeading?.textContent.includes('battle · RUNNING')) {
			const hasRoomCode = Boolean(matchDetails.querySelector('#roomCodeText'));
			matchHeading.textContent = matchHeading.textContent.replace('battle · RUNNING', hasRoomCode ? 'battle · ROOM CODE LOCKED' : 'battle · OPPONENT JOINED · ROOM CODE PENDING');
		}
		const autoStartNotice = [...matchDetails.querySelectorAll('.notice.warning')].find(notice => notice.textContent.includes('Opponent join karte hi match automatically start hoga'));
		if (autoStartNotice) autoStartNotice.textContent = 'Opponent join hone ke baad creator room code setup karke share karega. Code lock hone par dono players use copy karke Ludo King mein khelenge.';
		const heading = matchDetails.querySelector('h2');
		if (heading?.textContent.includes('PENDING_CANCELLATION') && !heading.dataset.cancelNotice) {
			const notice = document.createElement('p');
			notice.className = 'notice warning';
			notice.textContent = 'Cancel request admin review mein hai. Approval ke baad hi match cancel aur refund hoga.';
			heading.after(notice);
			heading.dataset.cancelNotice = 'true';
		}
		const roomWait = [...matchDetails.querySelectorAll('.muted')].find(text => text.textContent.trim() === 'Battle creator room code share karega.');
		if (roomWait) roomWait.textContent = 'Sirf creator START dabakar Ludo King room setup karega. Room code share hone tak wait karein.';
		const roomCode = matchDetails.querySelector('#roomCodeText');
		if (roomCode && !roomCode.dataset.lockNotice) {
			const lockNotice = document.createElement('span');
			lockNotice.className = 'status';
			lockNotice.textContent = 'LOCKED';
			roomCode.after(lockNotice);
			roomCode.dataset.lockNotice = 'true';
		}
		const copyRoom = matchDetails.querySelector('#copyRoom');
		if (copyRoom && matchHeading?.textContent.includes('Ludo King') && !matchDetails.querySelector('[data-open-ludo]')) {
			const openGame = document.createElement('a');
			openGame.className = 'btn secondary small';
			openGame.href = window.ludoKingOpenUrl?.() || 'intent://#Intent;package=com.ludo.king;end';
			openGame.textContent = 'Open Ludo King';
			openGame.dataset.openLudo = 'true';
			copyRoom.after(openGame);
		}
	}

	new MutationObserver(setupForms).observe(matchDetails, { childList: true, subtree: true });
	setupForms();
})();

