require('dotenv').config();
const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const path = require('path');
const os = require('os');
const fs = require('fs');
const crypto = require('crypto');
const multer = require('multer');
const QRCode = require('qrcode');
const axios = require('axios');
const jwt = require('jsonwebtoken');
const { Server } = require('socket.io');
const { pipeline } = require('stream/promises');

// Models
const User = require('./models/user');
const Otp = require('./models/otp-model');
const Match = require('./models/match');
const Deposit = require('./models/deposit');
const Withdraw = require('./models/withdraw');
const Kyc = require('./models/kyc');
const SiteSettings = require('./models/site-settings');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });
const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(32).toString('hex');
const uploadDirectory = path.join(__dirname, 'uploads');
const uploadBucketName = 'appUploads';

const memoryStore = {
  users: new Map(),
  otps: new Map(),
  userById: new Map()
};

let siteAnnouncementText = 'Welcome to khiladiadda24.com';
const defaultSupportContacts = { supportNumber: '79557295', whatsappNumber: '79557295' };

const ADMIN_PHONES = new Set(['7828189494', '917828189494', '07828189494']);
const PRIMARY_ADMIN_PHONE = '7828189494';
const RANDOM_PROFILE_IMAGES = ['1.png', '2.png', '3.png', '4.png', '5.png'];
const LEGACY_DEFAULT_PROFILE_IMAGES = new Set(['avatar-1.jpeg', 'avatar-2.jpeg', 'avatar-3.jpeg']);

function isTestLoginEnabled() {
  return /^(1|true|yes|on)$/i.test(String(process.env.ALLOW_TEST_LOGIN || '').trim());
}

function getConfiguredTestLoginPhone() {
  return normalizePhone(process.env.TEST_LOGIN_PHONE || '7828189494');
}

function getConfiguredTestLoginOtp() {
  return String(process.env.TEST_LOGIN_OTP || '1234').trim();
}

function normalizePhone(phone) {
  const digits = String(phone || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.length === 12 && digits.startsWith('91')) return digits.slice(2);
  if (digits.length === 11 && digits.startsWith('0')) return digits.slice(1);
  return digits;
}

function getPhoneVariants(phone) {
  const cleaned = normalizePhone(phone);
  if (!cleaned) return [];
  const variants = new Set([cleaned]);
  if (cleaned.length === 10) {
    variants.add(`0${cleaned}`);
    variants.add(`91${cleaned}`);
  }
  return [...variants];
}

function isAdminPhone(phone) {
  const cleaned = normalizePhone(phone);
  if (!cleaned) return false;
  return ADMIN_PHONES.has(cleaned)
    || ADMIN_PHONES.has(`0${cleaned}`)
    || ADMIN_PHONES.has(`91${cleaned}`);
}

async function isAdminUserByPhone(phone) {
  const user = await findUserByPhone(phone);
  if (!user) return false;
  return Boolean(user.isPrimaryAdmin || user.isAdmin) || isAdminPhone(user.phone || phone);
}

async function findUserById(userId) {
  const id = String(userId || '');
  if (!id) return null;
  if (mongoose.connection.readyState === 1) {
    return User.findById(id);
  }
  return memoryStore.userById.get(id) || null;
}

async function findUserByReferralCode(referralCode) {
  const code = String(referralCode || '').trim().toUpperCase();
  if (!code) return null;
  if (mongoose.connection.readyState === 1) {
    return User.findOne({ referralCode: code });
  }
  for (const user of memoryStore.users.values()) {
    if (String(user.referralCode || '').toUpperCase() === code) return user;
  }
  return null;
}

async function requireAdmin(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) return res.status(401).json({ error: 'Admin login required' });

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    if (payload.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    const user = payload.userId ? await findUserById(payload.userId) : null;
    const isAdmin = Boolean(user && (user.isPrimaryAdmin || user.isAdmin)) || isAdminPhone(payload.phone || '');
    if (!isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    req.admin = payload;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Admin session expired' });
  }
}

async function requireUser(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) return res.status(401).json({ error: 'Player login required' });
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    if (payload.role !== 'user' || !payload.userId) return res.status(403).json({ error: 'Player access required' });
    if (!mongoose.Types.ObjectId.isValid(String(payload.userId))) {
      const isValidFallbackId = typeof payload.userId === 'string' && payload.userId.startsWith('local_');
      if (!isValidFallbackId) {
        return res.status(401).json({ error: 'आपका लॉगिन सत्र अमान्य है। कृपया दोबारा लॉगिन करें।' });
      }
    }
    const user = await findUserById(payload.userId);
    if (!user) return res.status(401).json({ error: 'Player account nahi mila' });
    if (user.isBlocked) return res.status(403).json({ error: 'Aapka player account admin ne block kiya hai.' });
    req.auth = payload;
    req.user = user;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Player session expired' });
  }
}

const CANCEL_REASONS = new Set([
  'OPPONENT_NOT_JOINED',
  'ROOM_CODE_NOT_SHARED',
  'OPPONENT_NOT_RESPONDING',
  'WRONG_ROOM_CODE',
  'TECHNICAL_ISSUE',
  'OTHER'
]);
const ACTIVE_MATCH_STATUSES = ['OPEN', 'RUNNING', 'PENDING_RESULT', 'PENDING_CANCELLATION'];

function matchRoomCodeDeadline(match) {
  if (match.roomCodeDeadline) return new Date(match.roomCodeDeadline).getTime();
  const joinedAt = match.joinedAt || match.updatedAt || match.createdAt;
  return new Date(joinedAt).getTime() + 2 * 60 * 1000;
}

function isMatchPlayer(match, userId) {
  return [match.creator, match.joiner].some(player => {
    const playerId = player && typeof player === 'object' ? player._id || player.id : player;
    return playerId && String(playerId) === String(userId);
  });
}

async function reserveActiveBet(userId) {
  const activeBets = await Match.countDocuments({
    status: { $in: ACTIVE_MATCH_STATUSES },
    $or: [{ creator: userId }, { joiner: userId }]
  });
  await User.updateOne(
    { _id: userId, activeBetCount: { $exists: false } },
    { $set: { activeBetCount: activeBets } }
  );
  const reserved = await User.findOneAndUpdate(
    { _id: userId, activeBetCount: { $lt: 2 } },
    { $inc: { activeBetCount: 1 } },
    { new: true }
  );
  return Boolean(reserved);
}

async function releaseActiveBet(userId, session) {
  if (!userId) return;
  await User.updateOne(
    { _id: userId, activeBetCount: { $gt: 0 } },
    { $inc: { activeBetCount: -1 } },
    session ? { session } : {}
  );
}

async function releaseMatchBetSlots(match, session) {
  const playerIds = [...new Set([match.creator, match.joiner].filter(Boolean).map(String))];
  if (session) {
    for (const userId of playerIds) await releaseActiveBet(userId, session);
    return;
  }
  await Promise.all(playerIds.map(userId => releaseActiveBet(userId, session)));
}

async function ensureWinningsBalance(userId) {
  let user = await User.findById(userId).select('walletBalance winningsBalance');
  if (!user) return null;
  if (Number.isFinite(user.winningsBalance)) return user;

  const [matches, withdrawals] = await Promise.all([
    Match.find({ $or: [{ creator: userId }, { joiner: userId }] })
      .select('amount status creator joiner winner createdAt joinedAt updatedAt cancelledAt creatorWinningsUsed joinerWinningsUsed')
      .lean(),
    Withdraw.find({ userId }).select('amount status createdAt updatedAt').lean()
  ]);
  const events = [];
  const spendContributions = new Map();
  const addEvent = (at, type, amount, key = '') => {
    const time = new Date(at || 0).getTime();
    events.push({ time: Number.isFinite(time) ? time : 0, type, amount: Number(amount) || 0, key });
  };

  for (const match of matches) {
    const id = String(match._id);
    const isCreator = String(match.creator) === String(userId);
    const entryKey = `${id}:${isCreator ? 'creator' : 'joiner'}`;
    const entryAt = isCreator ? match.createdAt : match.joinedAt || match.createdAt;
    addEvent(entryAt, 'spend', match.amount, entryKey);
    if (match.status === 'COMPLETED' && String(match.winner) === String(userId)) {
      addEvent(match.updatedAt, 'credit', Number(match.amount) * 1.9);
    }
    if (match.status === 'CANCELLED') addEvent(match.cancelledAt || match.updatedAt, 'refund', 0, entryKey);
  }

  for (const withdrawal of withdrawals) {
    addEvent(withdrawal.createdAt, 'spend', withdrawal.amount, `withdrawal:${withdrawal._id}`);
    if (withdrawal.status === 'REJECTED') addEvent(withdrawal.updatedAt, 'refund', 0, `withdrawal:${withdrawal._id}`);
  }

  const eventOrder = { spend: 0, credit: 1, refund: 2 };
  events.sort((left, right) => left.time - right.time || eventOrder[left.type] - eventOrder[right.type]);
  let winningsBalance = 0;
  for (const event of events) {
    if (event.type === 'credit') {
      winningsBalance += event.amount;
    } else if (event.type === 'spend') {
      const used = Math.min(winningsBalance, event.amount);
      winningsBalance -= used;
      spendContributions.set(event.key, used);
    } else {
      winningsBalance += spendContributions.get(event.key) || 0;
    }
  }

  const migratedBalance = Math.min(Math.max(0, Number(user.walletBalance) || 0), Math.max(0, winningsBalance));
  await Promise.all(matches.map(match => {
    const isCreator = String(match.creator) === String(userId);
    const field = isCreator ? 'creatorWinningsUsed' : 'joinerWinningsUsed';
    if (match[field] !== undefined) return null;
    const key = `${match._id}:${isCreator ? 'creator' : 'joiner'}`;
    return Match.updateOne({ _id: match._id, [field]: { $exists: false } }, { $set: { [field]: spendContributions.get(key) || 0 } });
  }));

  const initialized = await User.findOneAndUpdate(
    { _id: userId, winningsBalance: { $exists: false } },
    { $set: { winningsBalance: migratedBalance } },
    { new: true }
  ).select('walletBalance winningsBalance');
  return initialized || User.findById(userId).select('walletBalance winningsBalance');
}

async function debitWalletForEntry(userId, amount) {
  const user = await ensureWinningsBalance(userId);
  if (!user) return null;
  const winningsUsed = Math.min(Number(user.winningsBalance) || 0, amount);
  const updated = await User.findOneAndUpdate(
    { _id: userId, walletBalance: { $gte: amount }, winningsBalance: { $gte: winningsUsed } },
    { $inc: { walletBalance: -amount, winningsBalance: -winningsUsed } },
    { new: true }
  );
  return updated ? { user: updated, winningsUsed } : null;
}

async function refundWalletEntry(userId, amount, winningsUsed = 0, session) {
  return User.findByIdAndUpdate(
    userId,
    { $inc: { walletBalance: amount, winningsBalance: winningsUsed } },
    { new: true, ...(session ? { session } : {}) }
  );
}

function generateRandomName() {
  const prefixes = ['Raja', 'Apex', 'Lucky', 'Quick', 'Shadow', 'Royal', 'Blaze', 'Cricket', 'Silver', 'King', 'Storm', 'Titan', 'Gold', 'Flash', 'Power'];
  const suffixes = ['Warrior', 'Player', 'Gamer', 'Pro', 'Ace', 'Hero', 'Lord', 'King', 'Knight', 'Blitz', 'Club', 'Rush', 'Wave'];
  const randPrefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const randSuffix = suffixes[Math.floor(Math.random() * suffixes.length)];
  const randNum = Math.floor(Math.random() * 90 + 10);
  return `${randPrefix}${randSuffix}${randNum}`;
}

function generateRandomProfileImage() {
  return RANDOM_PROFILE_IMAGES[Math.floor(Math.random() * RANDOM_PROFILE_IMAGES.length)];
}

function needsDefaultProfileImage(profileImage) {
  return !profileImage || LEGACY_DEFAULT_PROFILE_IMAGES.has(profileImage);
}

// Ensure uploads folder exists
if (!fs.existsSync(uploadDirectory)) {
  fs.mkdirSync(uploadDirectory, { recursive: true });
}

// Multer Storage Configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDirectory),
  filename: (req, file, cb) => {
    const extension = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' }[file.mimetype];
    cb(null, `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${extension}`);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => cb(null, ['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype))
});

function getUploadBucket() {
  if (mongoose.connection.readyState !== 1 || !mongoose.connection.db) {
    throw new Error('MongoDB must be connected before uploaded files can be stored.');
  }
  return new mongoose.mongo.GridFSBucket(mongoose.connection.db, { bucketName: uploadBucketName });
}

async function deleteStoredUpload(filename) {
  const safeFilename = path.basename(filename);
  if (mongoose.connection.readyState !== 1 || !mongoose.connection.db) return;
  const files = mongoose.connection.db.collection(`${uploadBucketName}.files`);
  const storedFile = await files.findOne({ filename: safeFilename }, { projection: { _id: 1 } });
  if (storedFile) await getUploadBucket().delete(storedFile._id);
}

function getUploadFilename(filePath) {
  return path.basename(String(filePath || '').replace(/\\/g, '/'));
}

async function deleteReviewedScreenshotFiles(filePaths) {
  const filenames = [...new Set(filePaths.map(getUploadFilename).filter(Boolean))];
  for (const filename of filenames) {
    await deleteStoredUpload(filename);
  }
}

async function scheduleScreenshotCleanupAfterReview(filename) {
  const reviewedAt = new Date(Date.now() + 2 * 60 * 1000);
  const storedPath = `uploads/${filename}`;
  const localPath = path.join(uploadDirectory, filename);
  await Deposit.updateMany(
    {
      screenshot: storedPath,
      $or: [{ screenshotDeleteAt: { $exists: false } }, { screenshotDeleteAt: null }]
    },
    { $set: { screenshotDeleteAt: reviewedAt } }
  );
  await Match.updateMany(
    {
      $and: [
        { $or: [
          { creatorProofScreenshot: { $in: [storedPath, localPath] } },
          { joinerProofScreenshot: { $in: [storedPath, localPath] } },
          { proofScreenshot: { $in: [storedPath, localPath] } }
        ] },
        { $or: [
          { proofScreenshotsDeleteAt: { $exists: false } },
          { proofScreenshotsDeleteAt: null }
        ] }
      ]
    },
    { $set: { proofScreenshotsDeleteAt: reviewedAt } }
  );
}

async function cleanupReviewedScreenshots() {
  if (mongoose.connection.readyState !== 1 || !mongoose.connection.db) return;

  const now = new Date();
  const expiredDeposits = await Deposit.find({
    screenshotDeleteAt: { $lte: now },
    screenshot: { $nin: ['', null] }
  });
  for (const deposit of expiredDeposits) {
    try {
      await deleteReviewedScreenshotFiles([deposit.screenshot]);
      deposit.screenshot = '';
      deposit.screenshotDeleteAt = undefined;
      await deposit.save();
    } catch (error) {
      console.error(`Could not remove reviewed deposit screenshot ${deposit._id}:`, error);
    }
  }

  const expiredMatches = await Match.find({
    proofScreenshotsDeleteAt: { $lte: now },
    $or: [
      { creatorProofScreenshot: { $nin: ['', null] } },
      { joinerProofScreenshot: { $nin: ['', null] } },
      { proofScreenshot: { $nin: ['', null] } }
    ]
  });
  for (const match of expiredMatches) {
    try {
      await deleteReviewedScreenshotFiles([
        match.creatorProofScreenshot,
        match.joinerProofScreenshot,
        match.proofScreenshot
      ]);
      match.creatorProofScreenshot = '';
      match.joinerProofScreenshot = '';
      match.proofScreenshot = '';
      match.proofScreenshotsDeleteAt = undefined;
      await match.save();
    } catch (error) {
      console.error(`Could not remove reviewed match screenshots ${match._id}:`, error);
    }
  }
}

async function cleanupTemporaryUpload(file) {
  if (!file?.path) return;
  await fs.promises.unlink(file.path).catch(error => {
    if (error.code !== 'ENOENT') console.error('Could not remove temporary upload:', error);
  });
}

function persistUploads(multerMiddleware) {
  return (req, res, next) => {
    multerMiddleware(req, res, uploadError => {
      if (uploadError) return next(uploadError);
      const files = req.file ? [req.file] : Object.values(req.files || {}).flat();
      if (!files.length) return next();

      (async () => {
        const bucket = getUploadBucket();
        for (const file of files) {
          await pipeline(
            fs.createReadStream(file.path),
            bucket.openUploadStream(file.filename, { metadata: { contentType: file.mimetype } })
          );
        }
      })().then(() => {
        const cleanup = () => {
          void Promise.all(files.map(cleanupTemporaryUpload));
        };
        res.once('finish', cleanup);
        res.once('close', cleanup);
        next();
      }).catch(async error => {
        await Promise.all(files.map(async file => {
          await cleanupTemporaryUpload(file);
          try {
            await deleteStoredUpload(file.filename);
          } catch (cleanupError) {
            console.error('Could not remove an incomplete uploaded file:', cleanupError);
          }
        }));
        console.error('Could not persist uploaded files in MongoDB:', error);
        if (!res.headersSent) {
          res.status(503).json({ error: 'File storage is unavailable. Please try again later.' });
        }
      });
    });
  };
}

async function sendUploadedFile(filename, res, cacheControl = 'private, no-store') {
  const safeFilename = path.basename(filename);
  if (mongoose.connection.readyState === 1 && mongoose.connection.db) {
    const storedFile = await mongoose.connection.db
      .collection(`${uploadBucketName}.files`)
      .findOne({ filename: safeFilename }, { projection: { _id: 1, metadata: 1 } });
    if (storedFile) {
      if (storedFile.metadata?.contentType) res.type(storedFile.metadata.contentType);
      res.set('Cache-Control', cacheControl);
      const download = getUploadBucket().openDownloadStream(storedFile._id);
      download.on('error', error => {
        console.error('Could not read uploaded file from MongoDB:', error);
        if (res.headersSent) res.destroy(error);
        else res.status(500).end();
      });
      download.pipe(res);
      return true;
    }
  }

  const localFile = path.join(uploadDirectory, safeFilename);
  if (!fs.existsSync(localFile)) return false;
  res.set('Cache-Control', cacheControl);
  res.sendFile(localFile);
  return true;
}

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

app.get('/healthz', (req, res) => {
  res.sendStatus(200);
});

function brandingImageUrl(settings, key, fallback) {
  const storedPath = settings?.[key];
  if (!storedPath) return fallback;
  const asset = {
    brandLogoPath: 'logo',
    appIcon192Path: 'app-icon-192',
    appIcon512Path: 'app-icon-512',
    homeBannerPath: 'home-banner',
    ludoBannerPath: 'ludo-banner',
    snakeBannerPath: 'snake-banner',
    supportBannerPath: 'support-banner'
  }[key];
  return `/api/site-branding/image/${asset}?v=${encodeURIComponent(storedPath)}`;
}

function siteBrandingPayload(settings) {
  return {
    brandLogoUrl: brandingImageUrl(settings, 'brandLogoPath', '/logo.png'),
    appIcon192Url: brandingImageUrl(settings, 'appIcon192Path', '/app-icon-192.png'),
    appIcon512Url: brandingImageUrl(settings, 'appIcon512Path', '/app-icon-512.png'),
    homeBannerUrl: brandingImageUrl(settings, 'homeBannerPath', '/banner-ludo-snake.png'),
    ludoBannerUrl: brandingImageUrl(settings, 'ludoBannerPath', '/ludo-classic.png'),
    snakeBannerUrl: brandingImageUrl(settings, 'snakeBannerPath', '/snake-battles-banner.png'),
    supportBannerUrl: brandingImageUrl(settings, 'supportBannerPath', '/whatsapp-support.png')
  };
}

function defaultSiteManifest() {
  return {
    name: 'KhiladiAdda24',
    short_name: 'KhiladiAdda24',
    description: 'Ludo & Snake real-money battle platform',
    id: '/index.html',
    start_url: '/index.html',
    scope: '/',
    display: 'standalone',
    display_override: ['window-controls-overlay', 'standalone'],
    background_color: '#101713',
    theme_color: '#101713',
    orientation: 'portrait',
    icons: [
      { src: '/app-icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/app-icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' }
    ]
  };
}

async function readSiteBranding() {
  if (mongoose.connection.readyState !== 1) return null;
  return SiteSettings.findById('support-contact').select('brandLogoPath appIcon192Path appIcon512Path homeBannerPath ludoBannerPath snakeBannerPath supportBannerPath').lean();
}

app.get('/api/site-branding', async (req, res) => {
  try {
    res.set('Cache-Control', 'no-cache');
    res.json(siteBrandingPayload(await readSiteBranding()));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/admin/branding', requireAdmin, async (req, res) => {
  if (mongoose.connection.readyState !== 1) return res.status(503).json({ error: mongoUnavailableMessage() });
  try {
    res.json(siteBrandingPayload(await readSiteBranding()));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/site-branding/image/:asset', async (req, res) => {
  const imageSettings = {
    logo: ['brandLogoPath', '/logo.png'],
    'app-icon-192': ['appIcon192Path', '/app-icon-192.png'],
    'app-icon-512': ['appIcon512Path', '/app-icon-512.png'],
    'home-banner': ['homeBannerPath', '/banner-ludo-snake.png'],
    'ludo-banner': ['ludoBannerPath', '/ludo-classic.png'],
    'snake-banner': ['snakeBannerPath', '/snake-battles-banner.png'],
    'support-banner': ['supportBannerPath', '/whatsapp-support.png']
  }[req.params.asset];
  if (!imageSettings) return res.status(404).end();
  try {
    const settings = await readSiteBranding();
    const storedPath = settings?.[imageSettings[0]];
    const fallback = imageSettings[1];
    if (!storedPath) return res.redirect(fallback);
    const sent = await sendUploadedFile(storedPath, res, 'public, max-age=31536000, immutable');
    if (!sent) res.redirect(fallback);
  } catch (err) {
    console.error('Could not serve site branding image:', err);
    res.status(500).end();
  }
});

app.get('/api/site-manifest', async (req, res) => {
  try {
    const settings = await readSiteBranding();
    const manifest = {
      ...defaultSiteManifest(),
      icons: [
        {
          src: brandingImageUrl(settings, 'appIcon192Path', '/app-icon-192.png'),
          sizes: '192x192',
          type: 'image/png',
          purpose: 'any'
        },
        {
          src: brandingImageUrl(settings, 'appIcon512Path', '/app-icon-512.png'),
          sizes: '512x512',
          type: 'image/png',
          purpose: 'any maskable'
        }
      ]
    };
    res.set('Content-Type', 'application/manifest+json');
    res.set('Cache-Control', 'no-cache');
    res.json(manifest);
  } catch (err) {
    res.set('Content-Type', 'application/manifest+json');
    res.set('Cache-Control', 'no-cache');
    res.json(defaultSiteManifest());
  }
});

app.post('/api/admin/branding', requireAdmin, (req, res, next) => {
  if (mongoose.connection.readyState !== 1) return res.status(503).json({ error: mongoUnavailableMessage() });
  next();
}, persistUploads(upload.fields([
  { name: 'brandLogo', maxCount: 1 },
  { name: 'appIcon192', maxCount: 1 },
  { name: 'appIcon512', maxCount: 1 },
  { name: 'homeBanner', maxCount: 1 },
  { name: 'ludoBanner', maxCount: 1 },
  { name: 'snakeBanner', maxCount: 1 },
  { name: 'supportBanner', maxCount: 1 }
])), async (req, res) => {
  const files = req.files || {};
  const selectedFiles = Object.values(files).flat();
  if (!selectedFiles.length) return res.status(400).json({ error: 'Kam se kam ek PNG image select karein.' });
  const pngSignature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  for (const [fieldName, fieldFiles] of Object.entries(files)) {
    for (const file of fieldFiles) {
      const header = await fs.promises.readFile(file.path).then(buffer => buffer.subarray(0, 24));
      const expectedSize = { appIcon192: 192, appIcon512: 512 }[fieldName];
      const invalidPng = file.mimetype !== 'image/png' || !header.subarray(0, 8).equals(pngSignature);
      const invalidDimensions = expectedSize && (header.length < 24 || header.readUInt32BE(16) !== expectedSize || header.readUInt32BE(20) !== expectedSize);
      if (invalidPng || invalidDimensions) {
        await Promise.all(selectedFiles.map(async item => {
          await cleanupTemporaryUpload(item);
          try {
            await deleteStoredUpload(item.filename);
          } catch (error) {
            console.error('Could not remove an invalid branding image:', error);
          }
        }));
        const message = invalidDimensions ? `App icon ${expectedSize}x${expectedSize}px PNG hona chahiye.` : 'Sirf valid PNG images upload karein.';
        return res.status(400).json({ error: message });
      }
    }
  }
  const updates = {};
  if (files.brandLogo?.[0]) updates.brandLogoPath = files.brandLogo[0].filename;
  if (files.appIcon192?.[0]) updates.appIcon192Path = files.appIcon192[0].filename;
  if (files.appIcon512?.[0]) updates.appIcon512Path = files.appIcon512[0].filename;
  if (files.homeBanner?.[0]) updates.homeBannerPath = files.homeBanner[0].filename;
  if (files.ludoBanner?.[0]) updates.ludoBannerPath = files.ludoBanner[0].filename;
  if (files.snakeBanner?.[0]) updates.snakeBannerPath = files.snakeBanner[0].filename;
  if (files.supportBanner?.[0]) updates.supportBannerPath = files.supportBanner[0].filename;
  try {
    const settings = await SiteSettings.findByIdAndUpdate(
      'support-contact',
      { $set: updates },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
    ).select('brandLogoPath appIcon192Path appIcon512Path homeBannerPath ludoBannerPath snakeBannerPath supportBannerPath').lean();
    res.json({ message: 'Logo aur app icons save ho gaye.', ...siteBrandingPayload(settings) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/site-announcement', (req, res) => {
  res.json({ text: siteAnnouncementText.trim() || 'Welcome to khiladiadda24.com' });
});

app.get('/api/admin/site-announcement', requireAdmin, async (req, res) => {
  res.json({ text: siteAnnouncementText.trim() || 'Welcome to khiladiadda24.com' });
});

app.post('/api/admin/site-announcement', requireAdmin, async (req, res) => {
  const nextText = String(req.body?.text || '').trim();
  const safeText = nextText || 'Welcome to khiladiadda24.com';
  const normalizedText = safeText.length > 120 ? safeText.slice(0, 120).trim() : safeText;
  siteAnnouncementText = normalizedText;
  res.json({ message: 'Notification line update ho gaya.', text: siteAnnouncementText });
});

function normalizeIndianMobileNumber(value) {
  const digits = String(value || '').replace(/\D/g, '');
  const mobile = digits.length === 12 && digits.startsWith('91') ? digits.slice(2) : digits;
  return /^[6-9]\d{9}$/.test(mobile) ? mobile : null;
}

app.get('/api/site-support', async (req, res) => {
  try {
    const settings = mongoose.connection.readyState === 1
      ? await SiteSettings.findById('support-contact').lean()
      : null;
    res.json({ ...defaultSupportContacts, ...(settings || {}) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/admin/site-support', requireAdmin, async (req, res) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({ error: mongoUnavailableMessage() });
  }
  try {
    const settings = await SiteSettings.findById('support-contact').lean();
    res.json({ ...defaultSupportContacts, ...(settings || {}) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/site-support', requireAdmin, async (req, res) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({ error: mongoUnavailableMessage() });
  }
  const supportNumber = normalizeIndianMobileNumber(req.body?.supportNumber);
  const whatsappNumber = normalizeIndianMobileNumber(req.body?.whatsappNumber);
  if (!supportNumber || !whatsappNumber) {
    return res.status(400).json({ error: 'Dono fields mein valid 10-digit Indian mobile number dalein.' });
  }
  try {
    const settings = await SiteSettings.findByIdAndUpdate(
      'support-contact',
      { $set: { supportNumber, whatsappNumber } },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
    ).lean();
    res.json({ message: 'Support aur WhatsApp numbers save ho gaye.', supportNumber: settings.supportNumber, whatsappNumber: settings.whatsappNumber });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/admin/deposit-upi', requireAdmin, async (req, res) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({ error: mongoUnavailableMessage() });
  }
  try {
    const settings = await SiteSettings.findById('support-contact').select('depositUpiId').lean();
    res.json({ depositUpiId: settings?.depositUpiId || process.env.ADMIN_UPI_ID || '' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/deposit-upi', requireAdmin, async (req, res) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({ error: mongoUnavailableMessage() });
  }
  const depositUpiId = String(req.body?.depositUpiId || '').trim();
  if (!/^[a-zA-Z0-9._-]{2,100}@[a-zA-Z0-9.-]{2,100}$/.test(depositUpiId)) {
    return res.status(400).json({ error: 'Valid UPI ID dalein, jaise name@bank.' });
  }
  try {
    await SiteSettings.findByIdAndUpdate(
      'support-contact',
      { $set: { depositUpiId } },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
    );
    res.json({ message: 'Deposit UPI ID save ho gaya.', depositUpiId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/admin/sms-api-key', requireAdmin, async (req, res) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({ error: mongoUnavailableMessage() });
  }
  try {
    const settings = await SiteSettings.findById('support-contact').select('smsApiKey').lean();
    res.json({ configured: Boolean(settings?.smsApiKey || process.env.API_KING_API_KEY) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/sms-api-key', requireAdmin, async (req, res) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({ error: mongoUnavailableMessage() });
  }
  const smsApiKey = String(req.body?.smsApiKey || '').trim();
  if (smsApiKey.length < 8 || smsApiKey.length > 512 || /\s/.test(smsApiKey)) {
    return res.status(400).json({ error: 'Valid API King SMS API key enter karein.' });
  }
  try {
    await SiteSettings.findByIdAndUpdate(
      'support-contact',
      { $set: { smsApiKey } },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
    );
    res.json({ message: 'SMS API key save ho gayi.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/player-copy', async (req, res) => {
  try {
    const settings = mongoose.connection.readyState === 1
      ? await SiteSettings.findById('support-contact').select('playerCopy').lean()
      : null;
    res.json({ entries: settings?.playerCopy || [] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/admin/player-copy', requireAdmin, async (req, res) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({ error: mongoUnavailableMessage() });
  }
  try {
    const settings = await SiteSettings.findById('support-contact').select('playerCopy').lean();
    res.json({ entries: settings?.playerCopy || [] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/player-copy', requireAdmin, async (req, res) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({ error: mongoUnavailableMessage() });
  }
  const entries = req.body?.entries;
  if (!Array.isArray(entries) || entries.length > 100) {
    return res.status(400).json({ error: 'Player text ki maximum 100 entries save kar sakte hain.' });
  }

  const normalizedEntries = [];
  const seenLines = new Set();
  for (const entry of entries) {
    const from = String(entry?.from || '').trim();
    const to = String(entry?.to ?? '');
    if (!from || from.length > 400 || to.length > 500 || seenLines.has(from)) {
      return res.status(400).json({ error: 'Har original line unique aur 400 characters se chhoti honi chahiye.' });
    }
    seenLines.add(from);
    normalizedEntries.push({ from, to });
  }

  try {
    const settings = await SiteSettings.findByIdAndUpdate(
      'support-contact',
      { $set: { playerCopy: normalizedEntries } },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
    ).select('playerCopy').lean();
    res.json({ message: 'Player text settings save ho gayi.', entries: settings.playerCopy || [] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Database Connection
const hasMongoUri = !!process.env.MONGODB_URI && process.env.MONGODB_URI.startsWith('mongodb');
const mongoConnectionUri = hasMongoUri ? new URL(process.env.MONGODB_URI) : null;
if (mongoConnectionUri && process.env.MONGODB_HOST) mongoConnectionUri.hostname = process.env.MONGODB_HOST;
if (mongoConnectionUri && process.env.MONGODB_USERNAME) mongoConnectionUri.username = process.env.MONGODB_USERNAME;
if (mongoConnectionUri && process.env.MONGODB_PASSWORD) mongoConnectionUri.password = process.env.MONGODB_PASSWORD;
let mongoRetryTimer = null;
let mongoConnectionError = '';

function mongoUnavailableMessage() {
  if (/bad auth|authentication failed/i.test(mongoConnectionError)) {
    return 'MongoDB username/password match nahi karte. Atlas DB user ka password .env ke MONGODB_PASSWORD mein set karke server restart karein.';
  }
  return 'MongoDB Atlas connect nahi hai. Server ka public IP Atlas Network Access mein allow karke dobara try karein.';
}

async function connectMongo() {
  try {
    await mongoose.connect(mongoConnectionUri.toString());
    mongoConnectionError = '';
    console.log('MongoDB Connected Successfully');
    await ensurePrimaryAdminUser();
  } catch (err) {
    mongoConnectionError = err.message;
    console.error('MongoDB Error:', err.message);
    if (!mongoRetryTimer) {
      mongoRetryTimer = setTimeout(() => {
        mongoRetryTimer = null;
        connectMongo();
      }, 15000);
      mongoRetryTimer.unref();
    }
  }
}

if (hasMongoUri) {
  connectMongo();
} else {
  console.log('MongoDB URI not configured. Using in-memory auth fallback.');
}

async function findUserByPhone(phone) {
  const cleanedPhone = normalizePhone(phone);
  if (!cleanedPhone) return null;

  if (mongoose.connection.readyState === 1) {
    const variants = getPhoneVariants(cleanedPhone);
    const candidates = await User.find({ phone: { $in: variants } }).sort({ isPrimaryAdmin: -1, isAdmin: -1, createdAt: 1 }).lean();
    if (!candidates.length) return null;

    const preferred = candidates.find(candidate => candidate.isPrimaryAdmin || candidate.isAdmin) || candidates[0];
    const preferredId = String(preferred._id);
    const stablePhone = normalizePhone(preferred.phone);
    if (stablePhone !== cleanedPhone) {
      await User.updateOne({ _id: preferredId }, { $set: { phone: cleanedPhone } });
    }

    const duplicateIds = candidates
      .filter(candidate => String(candidate._id) !== preferredId)
      .map(candidate => candidate._id);

    if (duplicateIds.length) {
      const primaryCandidate = await User.findById(preferredId);
      if (primaryCandidate) {
        const mergeFlags = candidates
          .filter(candidate => String(candidate._id) !== preferredId)
          .reduce((acc, candidate) => {
            acc.isAdmin = acc.isAdmin || Boolean(candidate.isAdmin);
            acc.isPrimaryAdmin = acc.isPrimaryAdmin || Boolean(candidate.isPrimaryAdmin);
            acc.isBlocked = acc.isBlocked || Boolean(candidate.isBlocked);
            if (!acc.username && candidate.username) acc.username = candidate.username;
            if (!acc.profileImage && candidate.profileImage) acc.profileImage = candidate.profileImage;
            if (!acc.referralCode && candidate.referralCode) acc.referralCode = candidate.referralCode;
            return acc;
          }, { isAdmin: Boolean(preferred.isAdmin), isPrimaryAdmin: Boolean(preferred.isPrimaryAdmin), isBlocked: Boolean(preferred.isBlocked), username: preferred.username, profileImage: preferred.profileImage, referralCode: preferred.referralCode });

        primaryCandidate.isAdmin = primaryCandidate.isAdmin || mergeFlags.isAdmin;
        primaryCandidate.isPrimaryAdmin = primaryCandidate.isPrimaryAdmin || mergeFlags.isPrimaryAdmin;
        primaryCandidate.isBlocked = primaryCandidate.isBlocked || mergeFlags.isBlocked;
        if (!primaryCandidate.username && mergeFlags.username) primaryCandidate.username = mergeFlags.username;
        if (!primaryCandidate.profileImage && mergeFlags.profileImage) primaryCandidate.profileImage = mergeFlags.profileImage;
        if (!primaryCandidate.referralCode && mergeFlags.referralCode) primaryCandidate.referralCode = mergeFlags.referralCode;
        if (normalizePhone(primaryCandidate.phone) !== cleanedPhone) primaryCandidate.phone = cleanedPhone;
        await primaryCandidate.save();
      }
      await User.deleteMany({ _id: { $in: duplicateIds, $ne: preferredId } });
    }

    const normalizedUser = await User.findById(preferredId);
    if (normalizedUser && normalizePhone(normalizedUser.phone) !== cleanedPhone) {
      normalizedUser.phone = cleanedPhone;
      await normalizedUser.save();
    }
    return normalizedUser;
  }

  return memoryStore.users.get(cleanedPhone)
    || memoryStore.users.get(`0${cleanedPhone}`)
    || memoryStore.users.get(`91${cleanedPhone}`)
    || null;
}

async function generateReferralCode() {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const code = crypto.randomBytes(4).toString('hex').toUpperCase();
    if (mongoose.connection.readyState !== 1 || !(await User.exists({ referralCode: code }))) return code;
  }
  throw new Error('Referral ID generate nahi ho saka');
}

async function ensureReferralCode(user) {
  if (mongoose.connection.readyState === 1 && !user.referralCode) {
    user.referralCode = await generateReferralCode();
    await user.save();
  }
  return user;
}

async function ensurePrimaryAdminUser() {
  if (mongoose.connection.readyState !== 1) return null;

  let adminUser = await User.findOne({ phone: normalizePhone(PRIMARY_ADMIN_PHONE) }).select('_id phone isAdmin isPrimaryAdmin walletBalance winningsBalance');
  if (!adminUser) {
    adminUser = await User.create({
      phone: normalizePhone(PRIMARY_ADMIN_PHONE),
      username: 'Primary Admin',
      walletBalance: 0,
      winningsBalance: 0,
      isAdmin: true,
      isPrimaryAdmin: true,
      referralCode: await generateReferralCode(),
      referralBonusCredited: true
    });
    return adminUser;
  }

  if (!adminUser.isAdmin || !adminUser.isPrimaryAdmin) {
    adminUser.isAdmin = true;
    adminUser.isPrimaryAdmin = true;
    await adminUser.save();
  }

  return adminUser;
}

async function createUserRecord(phone, username, referralCode = '') {
  const cleanedPhone = normalizePhone(phone);
  const welcomeBonus = isAdminPhone(cleanedPhone) ? 0 : 20;
  const referredBy = referralCode ? await findUserByReferralCode(referralCode) : null;
  if (isAdminPhone(cleanedPhone)) {
    const adminUser = mongoose.connection.readyState === 1
      ? await User.create({
          phone: cleanedPhone,
          username: username || `Admin_${cleanedPhone.slice(-4)}`,
          walletBalance: 0,
          winningsBalance: 0,
          isAdmin: true,
          isPrimaryAdmin: cleanedPhone === PRIMARY_ADMIN_PHONE || cleanedPhone === `91${PRIMARY_ADMIN_PHONE}` || cleanedPhone === `0${PRIMARY_ADMIN_PHONE}`,
          referralCode: await generateReferralCode(),
          referredBy: referredBy?._id || null
        })
      : {
          _id: `local_admin_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          phone: cleanedPhone,
          username: username || `Admin_${cleanedPhone.slice(-4)}`,
          walletBalance: 0,
          winningsBalance: 0,
          isAdmin: true,
          isPrimaryAdmin: cleanedPhone === PRIMARY_ADMIN_PHONE || cleanedPhone === `91${PRIMARY_ADMIN_PHONE}` || cleanedPhone === `0${PRIMARY_ADMIN_PHONE}`,
          referralCode: await generateReferralCode(),
          referredBy: referredBy?._id || null,
          role: 'admin'
        };
    if (mongoose.connection.readyState !== 1) {
      memoryStore.users.set(cleanedPhone, adminUser);
      memoryStore.userById.set(String(adminUser._id), adminUser);
    }
    return adminUser;
  }
  if (referralCode && !referredBy) throw new Error('Referral ID valid nahi hai');
  const newReferralCode = await generateReferralCode();
  const profileImage = generateRandomProfileImage();
  if (mongoose.connection.readyState === 1) {
    return User.create({
      phone: cleanedPhone,
      username: username || generateRandomName(),
      profileImage,
      walletBalance: welcomeBonus,
      winningsBalance: 0,
      referralCode: newReferralCode,
      referredBy: referredBy?._id || null,
      referralBonusCredited: !referredBy
    });
  }

  const localUser = {
    _id: `local_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    phone: cleanedPhone,
    username: username || generateRandomName(),
    profileImage,
    walletBalance: welcomeBonus,
    winningsBalance: 0,
    referralCode: newReferralCode,
    referredBy: referredBy?._id || null,
    referralBonusCredited: !referredBy,
    role: 'user',
    isBlocked: false,
    isAdmin: false,
    isPrimaryAdmin: false,
    activeBetCount: 0
  };
  memoryStore.users.set(cleanedPhone, localUser);
  memoryStore.userById.set(String(localUser._id), localUser);
  return localUser;
}

async function creditReferralBonus(referredUser) {
  if (!referredUser?.referredBy || referredUser.referralBonusCredited) return null;
  const session = await mongoose.startSession();
  let referrer = null;
  try {
    await session.withTransaction(async () => {
      const pendingReferral = await User.findOne({
        _id: referredUser._id,
        referredBy: { $ne: null },
        referralBonusCredited: { $ne: true }
      }).session(session);
      if (!pendingReferral) return;

      referrer = await User.findByIdAndUpdate(
        pendingReferral.referredBy,
        { $inc: { walletBalance: 10 } },
        { new: true, session }
      );
      if (!referrer) throw new Error('Referral dene wala player nahi mila');
      pendingReferral.referralBonusCredited = true;
      await pendingReferral.save({ session });
    });
  } finally {
    await session.endSession();
  }
  return referrer;
}

async function saveOtpRecord(phone, otp, signup = {}) {
  const cleanedPhone = normalizePhone(phone);
  if (mongoose.connection.readyState === 1) {
    await Otp.deleteMany({ phone: cleanedPhone });
    await Otp.create({ phone: cleanedPhone, otp, username: signup.username || '', referralCode: signup.referralCode || '' });
    return;
  }
  memoryStore.otps.set(cleanedPhone, { otp, username: signup.username || '', referralCode: signup.referralCode || '', expiresAt: Date.now() + 5 * 60 * 1000 });
}

async function deleteOtpRecord(phone) {
  const cleanedPhone = normalizePhone(phone);
  if (mongoose.connection.readyState === 1) {
    await Otp.deleteMany({ phone: cleanedPhone });
    return;
  }
  memoryStore.otps.delete(cleanedPhone);
}

async function getOtpRecord(phone, otp) {
  const cleanedPhone = normalizePhone(phone);
  if (mongoose.connection.readyState === 1) {
    return Otp.findOne({ phone: cleanedPhone, otp });
  }

  const cached = memoryStore.otps.get(cleanedPhone);
  if (!cached) return null;
  if (cached.otp !== otp || Date.now() > cached.expiresAt) {
    memoryStore.otps.delete(cleanedPhone);
    return null;
  }
  memoryStore.otps.delete(cleanedPhone);
  return { phone: cleanedPhone, otp, username: cached.username || '', referralCode: cached.referralCode || '' };
}

// Helper: API King OTP SMS Gateway
async function sendSMS(phone, otp) {
  let apiKey = String(process.env.API_KING_API_KEY || '').trim();
  if (mongoose.connection.readyState === 1) {
    try {
      const settings = await SiteSettings.findById('support-contact').select('smsApiKey').lean();
      apiKey = String(apiKey || settings?.smsApiKey || '').trim();
    } catch (err) {
      console.error('SMS settings lookup failed:', err.code || err.name || 'UNKNOWN');
    }
  }
  if (!apiKey) return { sent: false, reason: 'MISSING_OR_PLACEHOLDER_KEY' };

  try {
    const response = await axios.post('https://api.api-king.com/api/v1/otp/send', {
      number: phone,
      otp,
      route: 'sms'
    }, {
      headers: {
        Authorization: apiKey,
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      timeout: 30000
    });
    return { sent: response.status >= 200 && response.status < 300 };
  } catch (err) {
    const status = Number(err.response?.status);
    console.error('API King SMS Gateway Error:', status || err.code || err.message);
    const detail = String(err.response?.data?.message || err.response?.data?.error || '')
      .replace(/\s+/g, ' ')
      .trim()
      .split(apiKey).join('[redacted]')
      .split(String(otp)).join('[redacted]')
      .slice(0, 180);
    if ([401, 403].includes(status) || /invalid api key|unauthorized|invalid token/i.test(detail)) {
      return { sent: false, reason: 'INVALID_KEY' };
    }
    if (status === 404) return { sent: false, reason: 'ENDPOINT_NOT_FOUND' };
    if (['ETIMEDOUT', 'ECONNABORTED'].includes(err.code)) return { sent: false, reason: 'TIMEOUT' };
    return { sent: false, reason: 'SEND_FAILED', detail, status };
  }
}

// ================= AUTH ROUTES ================= //

app.post('/api/auth/send-otp', async (req, res) => {
  const phone = normalizePhone(req.body.phone);
  const referralCode = String(req.body.referralCode || '').trim().toUpperCase();
  const loginMode = req.body.loginMode === 'admin' ? 'admin' : 'player';
  if (!/^[6-9]\d{9}$/.test(phone)) {
    return res.status(400).json({ error: 'Valid 10 digit number dalein' });
  }
  if (loginMode === 'admin') {
    const adminUser = await findUserByPhone(phone);
    const isAllowedAdmin = isAdminPhone(phone) || Boolean(adminUser && (adminUser.isPrimaryAdmin || adminUser.isAdmin));
    if (!isAllowedAdmin) {
      return res.status(403).json({ error: 'Admin login ke liye allowlisted mobile number zaroori hai.' });
    }
  }
  if (referralCode && !/^[A-Z0-9]{8}$/.test(referralCode)) {
    return res.status(400).json({ error: 'Referral ID 8 characters ki honi chahiye' });
  }

  const testLoginPhone = getConfiguredTestLoginPhone();
  const testLoginOtp = getConfiguredTestLoginOtp();
  const otp = isTestLoginEnabled() && phone === testLoginPhone ? testLoginOtp : Math.floor(100000 + Math.random() * 900000).toString();

  try {
    const existingUser = await findUserByPhone(phone);
    const referralExists = referralCode ? await findUserByReferralCode(referralCode) : null;
    if (!existingUser && referralCode && !referralExists) {
      return res.status(400).json({ error: 'Referral ID nahi mili. Code dobara check karein.' });
    }
    await saveOtpRecord(phone, otp, { referralCode: existingUser ? '' : referralCode });

    if (isTestLoginEnabled() && phone === testLoginPhone) {
      return res.json({ message: `Test login enabled. Use OTP ${testLoginOtp}` });
    }
    if (mongoose.connection.readyState !== 1) {
      return res.json({ message: `OTP ready locally. Use OTP ${otp}` });
    }

    const smsResult = await sendSMS(phone, otp);

    if (!smsResult.sent) {
      try {
        await deleteOtpRecord(phone);
      } catch (cleanupError) {
        console.error('OTP record cleanup failed:', cleanupError.code || cleanupError.name || 'UNKNOWN');
      }
      const error = smsResult.reason === 'INVALID_KEY'
        ? 'API King ne configured API key reject ki. .env me API_KING_API_KEY check karke server restart karein.'
        : smsResult.reason === 'MISSING_OR_PLACEHOLDER_KEY'
          ? 'SMS API key configured nahi hai. .env me API_KING_API_KEY set karke server restart karein.'
          : smsResult.reason === 'ENDPOINT_NOT_FOUND'
            ? 'API King OTP endpoint nahi mila. Provider se sahi endpoint confirm karein.'
            : smsResult.reason === 'TIMEOUT'
              ? 'API King response nahi de raha. Kuch der baad dobara OTP try karein.'
              : smsResult.detail
                ? `API King: ${smsResult.detail}`
                : `API King request fail hui (HTTP ${smsResult.status || 'unknown'}). Account balance, API access, aur mobile number check karein.`;
      return res.status(503).json({ error });
    }

    res.json({ message: 'OTP send ho chuka hai' });
  } catch (err) {
    console.error('OTP send route failed:', err.stack || err.code || err.name || 'UNKNOWN');
    res.status(500).json({ error: 'OTP request server/database me fail hui. Server logs me exact error code check karein.' });
  }
});

app.post('/api/auth/verify-otp', async (req, res) => {
  const { phone, otp } = req.body;
  const cleanedPhone = normalizePhone(phone);
  const loginMode = req.body.loginMode === 'admin' ? 'admin' : 'player';

  if (!cleanedPhone || !otp) {
    return res.status(400).json({ error: 'Phone aur OTP dono required hain' });
  }
  if (loginMode === 'admin') {
    const adminUser = await findUserByPhone(cleanedPhone);
    const isAllowedAdmin = isAdminPhone(cleanedPhone) || Boolean(adminUser && (adminUser.isPrimaryAdmin || adminUser.isAdmin));
    if (!isAllowedAdmin) {
      return res.status(403).json({ error: 'Admin login ke liye allowlisted mobile number zaroori hai.' });
    }
  }

  try {
    const testLoginPhone = getConfiguredTestLoginPhone();
    const testLoginOtp = getConfiguredTestLoginOtp();
    let record = await getOtpRecord(cleanedPhone, otp);
    if (!record && isTestLoginEnabled() && cleanedPhone === testLoginPhone && String(otp) === testLoginOtp) {
      record = { phone: cleanedPhone, otp: testLoginOtp, referralCode: String(req.body.referralCode || '').trim().toUpperCase() || '' };
    }
    if (!record) {
      return res.status(400).json({ error: 'Galat ya expired OTP!' });
    }

    let user = await findUserByPhone(cleanedPhone);
    const isNewUser = !user;
    if (!user) {
      const referralCode = String(record.referralCode || '').trim().toUpperCase();
      const existingReferral = referralCode ? await findUserByReferralCode(referralCode) : null;
      if (referralCode && !existingReferral) {
        return res.status(400).json({ error: 'Referral ID ab valid nahi hai. OTP dobara request karein.' });
      }
      user = await createUserRecord(cleanedPhone, loginMode === 'admin' ? '' : generateRandomName(), referralCode);
    }

    if (loginMode === 'admin' && isAdminPhone(cleanedPhone) && !(user.isPrimaryAdmin || user.isAdmin)) {
      user.isAdmin = true;
      user.isPrimaryAdmin = cleanedPhone === PRIMARY_ADMIN_PHONE || cleanedPhone === `91${PRIMARY_ADMIN_PHONE}` || cleanedPhone === `0${PRIMARY_ADMIN_PHONE}`;
      if (mongoose.connection.readyState === 1) {
        await user.save();
      } else {
        memoryStore.users.set(cleanedPhone, user);
        memoryStore.userById.set(String(user._id), user);
      }
    }
    if (!isAdminPhone(cleanedPhone) && user.isBlocked) {
      return res.status(403).json({ error: 'Aapka player account admin ne block kiya hai.' });
    }
    if (mongoose.connection.readyState === 1 && !user.isAdmin && !user.isPrimaryAdmin && needsDefaultProfileImage(user.profileImage)) {
      user.profileImage = generateRandomProfileImage();
      await user.save();
    }
    if (mongoose.connection.readyState !== 1 && !user.isAdmin && !user.isPrimaryAdmin && needsDefaultProfileImage(user.profileImage)) {
      user.profileImage = generateRandomProfileImage();
    }
    let referralReferrer = null;
    if (!isAdminPhone(cleanedPhone) && !user.isAdmin && !user.isPrimaryAdmin && user.referredBy && !user.referralBonusCredited) {
      referralReferrer = await creditReferralBonus(user);
      if (referralReferrer) {
        io.emit('wallet_updated', {
          userId: String(referralReferrer._id),
          walletBalance: referralReferrer.walletBalance,
          amountAdded: 10,
          reason: 'Referral signup bonus'
        });
      }
    }
    if (mongoose.connection.readyState === 1) {
      user = await ensureReferralCode(user);
    } else if (!user.referralCode) {
      user.referralCode = await generateReferralCode();
      memoryStore.users.set(cleanedPhone, user);
      memoryStore.userById.set(String(user._id), user);
    }

    const isAdmin = isAdminPhone(cleanedPhone) || Boolean(user.isPrimaryAdmin || user.isAdmin);
    const token = jwt.sign(
      { userId: user._id, phone: user.phone, role: isAdmin ? 'admin' : 'user' },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: isAdmin ? 'Admin Login Successful' : isNewUser ? `Welcome! ₹20 bonus coins credited.${referralReferrer ? ' Referrer ko ₹10 bonus mila.' : ''}` : 'Login Successful',
      token,
      user: {
        id: user._id,
        username: user.username,
        phone: user.phone,
        profileImage: user.profileImage || '',
        walletBalance: user.walletBalance,
        referralCode: user.referralCode,
        welcomeBonus: isNewUser && !isAdminPhone(cleanedPhone) ? 20 : 0,
        role: isAdmin ? 'admin' : 'user'
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/user/:id', async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).json({ error: 'खिलाड़ी की पहचान अमान्य है।' });
  }
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User nahi mila' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/profile/me', requireUser, async (req, res) => {
  try {
    const user = await ensureReferralCode(req.user);
    res.json({ user: {
      _id: user._id,
      username: user.username,
      phone: user.phone,
      walletBalance: user.walletBalance,
      profileImage: user.profileImage,
      referralCode: user.referralCode
    } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/profile/update', requireUser, persistUploads(upload.single('profileImage')), async (req, res) => {
  const username = String(req.body.username || '').trim();
  if (username.length < 2 || username.length > 40) {
    return res.status(400).json({ error: 'Naam 2 se 40 characters ke beech hona chahiye' });
  }
  try {
    const updates = { username };
    if (req.file) updates.profileImage = `uploads/${req.file.filename}`;
    const user = await User.findByIdAndUpdate(req.auth.userId, updates, { new: true, runValidators: true })
      .select('username phone walletBalance profileImage referralCode');
    if (!user) return res.status(404).json({ error: 'Player nahi mila' });
    res.json({ message: 'Profile update ho gaya', user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/profile/image/:filename', async (req, res) => {
  const filename = path.basename(req.params.filename);
  try {
    const user = await User.findOne({ profileImage: `uploads/${filename}` }).select('_id');
    if (!user || !(await sendUploadedFile(filename, res))) return res.status(404).end();
  } catch (err) {
    console.error('Could not serve profile image:', err);
    res.status(500).end();
  }
});

app.get('/api/admin/uploads/:filename', requireAdmin, async (req, res) => {
  const filename = path.basename(req.params.filename);
  try {
    await scheduleScreenshotCleanupAfterReview(filename);
    if (!(await sendUploadedFile(filename, res))) return res.status(404).json({ error: 'File nahi mili' });
  } catch (err) {
    console.error('Could not serve uploaded admin file:', err);
    res.status(500).json({ error: 'File nahi khul saki' });
  }
});

// ================= MATCH & TOURNAMENT ROUTES ================= //

app.post('/api/matches/create', requireUser, async (req, res) => {
  const { amount, gameType } = req.body;
  const userId = req.auth.userId;
  const entryAmount = Number(amount);

  if (!Number.isInteger(entryAmount) || entryAmount < 100 || entryAmount > 50000 || (entryAmount - 100) % 50 !== 0) {
    return res.status(400).json({ error: 'Battle entry ₹100 se ₹50,000 tak ₹50 ke steps mein honi chahiye' });
  }
  if (!['LUDO', 'POPULAR_LUDO', 'SNAKE', 'LUDO_RACE'].includes(String(gameType || 'LUDO').toUpperCase())) {
    return res.status(400).json({ error: 'Ludo, Popular Ludo, Ludo Race ya Snake game select karein' });
  }

  let reservationHeld = false;
  try {
    reservationHeld = await reserveActiveBet(userId);
    if (!reservationHeld) {
      return res.status(400).json({ error: 'Ek player ek time par maximum 2 active bets rakh sakta hai' });
    }

    const debit = await debitWalletForEntry(userId, entryAmount);
    if (!debit) {
      await releaseActiveBet(userId);
      reservationHeld = false;
      return res.status(400).json({ error: 'Balance kam hai. Pehle wallet recharge karein.' });
    }

    let match;
    try {
      match = await Match.create({ creator: userId, amount: entryAmount, creatorWinningsUsed: debit.winningsUsed, gameType: (gameType || 'LUDO').toUpperCase() });
      reservationHeld = false;
    } catch (err) {
      await refundWalletEntry(userId, entryAmount, debit.winningsUsed);
      await releaseActiveBet(userId);
      reservationHeld = false;
      throw err;
    }

    io.emit('match_created', match);
    res.json({ message: 'Challenge created', match });
  } catch (err) {
    if (reservationHeld) await releaseActiveBet(userId);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/matches/open', async (req, res) => {
  const gameType = String(req.query.gameType || 'ALL').toUpperCase();
  if (!['ALL', 'LUDO', 'POPULAR_LUDO', 'SNAKE', 'LUDO_RACE'].includes(gameType)) {
    return res.status(400).json({ error: 'Game type LUDO, POPULAR_LUDO, LUDO_RACE, SNAKE ya ALL hona chahiye' });
  }
  try {
    const query = { status: 'OPEN' };
    if (gameType !== 'ALL') query.gameType = gameType;
    const matches = await Match.find(query).populate('creator', 'username profileImage').sort({ updatedAt: -1 });
    res.json(matches);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/matches/mine', requireUser, async (req, res) => {
  try {
    const matchQuery = { $or: [{ creator: req.auth.userId }, { joiner: req.auth.userId }] };
    if (req.query.history !== '1') matchQuery.status = { $in: ['OPEN', 'RUNNING', 'PENDING_RESULT'] };
    const matches = await Match.find(matchQuery)
      .populate('creator', 'username phone profileImage')
      .populate('joiner', 'username phone profileImage')
      .sort({ updatedAt: -1 });
    res.json({ matches });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/matches/running', requireUser, async (req, res) => {
  try {
    const gameType = String(req.query.gameType || 'ALL').toUpperCase();
    if (!['ALL', 'LUDO', 'POPULAR_LUDO', 'SNAKE', 'LUDO_RACE'].includes(gameType)) {
      return res.status(400).json({ error: 'Game type LUDO, POPULAR_LUDO, LUDO_RACE, SNAKE ya ALL hona chahiye' });
    }
    const requestedLimit = Number.parseInt(req.query.limit, 10);
    const limit = Number.isInteger(requestedLimit) ? Math.max(1, Math.min(requestedLimit, 20)) : 20;
    const query = { status: 'RUNNING', joiner: { $ne: null } };
    if (gameType !== 'ALL') query.gameType = gameType;
    const fields = '_id gameType creator joiner amount roomCode joinedAt roomCodeDeadline roomCodeSharedAt creatorStartedAt creatorConfirmedAt joinerConfirmedAt gameStartedAt status updatedAt';
    const keepIds = [...new Set(String(req.query.keep || '').split(',').filter(mongoose.Types.ObjectId.isValid))]
      .slice(0, limit)
      .map(id => new mongoose.Types.ObjectId(id));

    const ownMatches = await Match.find({
      ...query,
      $or: [{ creator: req.auth.userId }, { joiner: req.auth.userId }]
    }).select(fields).sort({ updatedAt: -1 }).limit(limit);
    const ownIds = ownMatches.map(match => String(match._id));
    const slotsAfterOwn = Math.max(0, limit - ownMatches.length);
    const referredPlayerIds = await User.find({ referredBy: req.auth.userId }).distinct('_id');
    let referredMatches = [];
    if (slotsAfterOwn && referredPlayerIds.length) {
      referredMatches = await Match.find({
        ...query,
        _id: { $nin: ownMatches.map(match => match._id) },
        $or: [{ creator: { $in: referredPlayerIds } }, { joiner: { $in: referredPlayerIds } }]
      }).select(fields).sort({ updatedAt: -1 }).limit(slotsAfterOwn);
    }

    const referredIds = referredMatches.map(match => String(match._id));
    const slotsAfterReferrals = Math.max(0, limit - ownMatches.length - referredMatches.length);
    const keptMatches = slotsAfterReferrals && keepIds.length
      ? await Match.find({ ...query, _id: { $in: keepIds, $nin: [...ownMatches.map(match => match._id), ...referredMatches.map(match => match._id)] } })
        .select(fields).sort({ updatedAt: -1 }).limit(slotsAfterReferrals)
      : [];
    const excludedIds = [...ownIds, ...referredIds, ...keptMatches.map(match => String(match._id))]
      .map(id => new mongoose.Types.ObjectId(id));
    const remaining = Math.max(0, limit - ownMatches.length - referredMatches.length - keptMatches.length);
    const sampledMatches = remaining
      ? await Match.aggregate([
        { $match: { ...query, ...(excludedIds.length ? { _id: { $nin: excludedIds } } : {}) } },
        { $sample: { size: remaining } },
        { $project: {
          _id: 1, gameType: 1, creator: 1, joiner: 1, amount: 1, roomCode: 1,
          joinedAt: 1, roomCodeDeadline: 1, roomCodeSharedAt: 1,
          creatorStartedAt: 1, creatorConfirmedAt: 1, joinerConfirmedAt: 1,
          gameStartedAt: 1, status: 1, updatedAt: 1
        } }
      ])
      : [];

    const sampledWithPlayers = sampledMatches.length
      ? await Match.populate(sampledMatches, [
        { path: 'creator', select: 'username' },
        { path: 'joiner', select: 'username' }
      ])
      : [];
    const matches = [...ownMatches, ...referredMatches, ...keptMatches, ...sampledWithPlayers].slice(0, limit);
    const populatedMatches = await Match.populate(matches, [
      { path: 'creator', select: 'username profileImage' },
      { path: 'joiner', select: 'username profileImage' }
    ]);
    res.json(populatedMatches.map(match => {
      const visibleMatch = typeof match.toObject === 'function' ? match.toObject() : { ...match };
      const viewerIsParticipant = isMatchPlayer(match, req.auth.userId);
      const creatorId = match.creator && typeof match.creator === 'object' ? match.creator._id || match.creator.id : match.creator;
      if (!viewerIsParticipant) {
        delete visibleMatch.roomCode;
        delete visibleMatch.roomCodeDeadline;
        delete visibleMatch.roomCodeSharedAt;
        delete visibleMatch.creatorStartedAt;
        delete visibleMatch.creatorConfirmedAt;
        delete visibleMatch.joinerConfirmedAt;
        delete visibleMatch.gameStartedAt;
      }
      return {
        ...visibleMatch,
        viewerIsParticipant,
        viewerIsCreator: viewerIsParticipant && String(creatorId) === String(req.auth.userId)
      };
    }));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/leaderboard/monthly', async (req, res) => {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const prizePool = 50000;
  const prizeDistribution = [15000, 10000, 7500, 5000, 3500, 2500, 2000, 1500, 1000, 1000];

  try {
    const matches = await Match.find({
      status: 'COMPLETED',
      createdAt: { $gte: monthStart, $lt: nextMonth }
    }).populate('creator', 'username phone').populate('joiner', 'username phone').populate('winner', 'username phone').lean();

    const players = new Map();
    matches.forEach(match => {
      [match.creator, match.joiner].filter(Boolean).forEach(player => {
        const id = String(player._id);
        const current = players.get(id) || { userId: id, username: player.username, gamesPlayed: 0, wins: 0 };
        current.gamesPlayed += 1;
        if (match.winner && String(match.winner._id) === id) current.wins += 1;
        players.set(id, current);
      });
    });

    const rankings = [...players.values()]
      .sort((a, b) => b.gamesPlayed - a.gamesPlayed || b.wins - a.wins || a.username.localeCompare(b.username))
      .map((player, index) => ({ ...player, rank: index + 1, estimatedPrize: prizeDistribution[index] || 0 }));
    res.json({ month: monthStart.toLocaleString('en-IN', { month: 'long', year: 'numeric' }), prizePool, estimatedTopPrize: prizeDistribution[0], rankings });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const ludoRaceTrack = [
  [6, 1], [6, 2], [6, 3], [6, 4], [6, 5], [5, 6], [4, 6], [3, 6], [2, 6], [1, 6], [0, 6],
  [0, 7], [0, 8], [1, 8], [2, 8], [3, 8], [4, 8], [5, 8], [6, 9], [6, 10], [6, 11], [6, 12],
  [6, 13], [6, 14], [7, 14], [8, 14], [8, 13], [8, 12], [8, 11], [8, 10], [8, 9], [9, 8],
  [10, 8], [11, 8], [12, 8], [13, 8], [14, 8], [14, 7], [14, 6], [13, 6], [12, 6], [11, 6],
  [10, 6], [9, 6], [8, 5], [8, 4], [8, 3], [8, 2], [8, 1], [8, 0], [7, 0], [6, 0]
];
const ludoRaceHomePaths = {
  creator: [[7, 1], [7, 2], [7, 3], [7, 4], [7, 5], [7, 6]],
  joiner: [[8, 13], [8, 12], [8, 11], [8, 10], [8, 9], [8, 8]]
};
const ludoRaceSafeTrackIndexes = new Set([0, 8, 13, 21, 26, 34, 39, 47]);

function ludoRaceSide(match, userId) {
  return String(match.creator) === String(userId) ? 'creator' : 'joiner';
}

function ludoRacePosition(side, progress) {
  if (progress < 0) return null;
  if (progress <= 51) return (side === 'creator' ? progress : (progress + 26) % 52);
  return ludoRaceHomePaths[side][progress - 52] || null;
}

function ludoRaceLegalTokens(tokens, diceValue) {
  return tokens
    .map((progress, index) => ({ progress, index }))
    .filter(({ progress }) => progress === -1 ? diceValue === 6 : progress + diceValue <= 57)
    .map(({ index }) => index);
}

app.post('/api/matches/ludo-race/roll', requireUser, async (req, res) => {
  const { matchId } = req.body;
  try {
    const match = await Match.findById(matchId);
    if (!match || match.gameType !== 'LUDO_RACE' || match.status !== 'RUNNING' || !match.ludoRace) {
      return res.status(400).json({ error: 'Ludo Race match active nahi hai' });
    }
    const userId = String(req.auth.userId);
    if (!isMatchPlayer(match, userId)) return res.status(403).json({ error: 'Sirf match ke players dice roll kar sakte hain' });
    const state = match.ludoRace;
    if (state.winnerId) return res.status(400).json({ error: 'Ludo Race ka winner tay ho chuka hai' });
    if (String(state.currentTurn) !== userId) return res.status(400).json({ error: 'Abhi opponent ki turn hai' });
    if (state.diceValue !== null && state.diceValue !== undefined) return res.status(400).json({ error: 'Pehle dice ka token move karein' });

    const diceValue = crypto.randomInt(1, 7);
    const side = ludoRaceSide(match, userId);
    const legalTokenIndexes = ludoRaceLegalTokens(state.tokens[side], diceValue);
    const noLegalMove = legalTokenIndexes.length === 0;
    const nextState = {
      ...state,
      version: Number(state.version || 0) + 1,
      lastDice: diceValue,
      lastRollUserId: userId,
      lastAction: noLegalMove ? `${diceValue} aaya; koi legal move nahi` : `${diceValue} aaya`,
      diceValue: noLegalMove ? null : diceValue,
      legalTokenIndexes: noLegalMove ? [] : legalTokenIndexes,
      currentTurn: noLegalMove && diceValue !== 6
        ? String(state.currentTurn) === String(match.creator) ? String(match.joiner) : String(match.creator)
        : userId
    };
    const update = { ludoRace: nextState };
    if (!match.gameStartedAt) update.gameStartedAt = new Date();
    const updated = await Match.findOneAndUpdate(
      { _id: matchId, status: 'RUNNING', 'ludoRace.version': Number(state.version || 0), 'ludoRace.currentTurn': userId, 'ludoRace.diceValue': null, 'ludoRace.winnerId': null },
      { $set: update },
      { new: true }
    );
    if (!updated) return res.status(409).json({ error: 'Game state update ho gaya. Refresh karke dobara try karein.' });
    io.to(String(matchId)).emit('match_updated', updated);
    res.json({ message: noLegalMove ? `${diceValue} aaya; move nahi tha, ab opponent ki turn hai.` : `${diceValue} aaya. Apni goti select karein.`, match: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/matches/ludo-race/move', requireUser, async (req, res) => {
  const { matchId } = req.body;
  const tokenIndex = Number(req.body.tokenIndex);
  if (!Number.isInteger(tokenIndex) || tokenIndex < 0 || tokenIndex > 3) {
    return res.status(400).json({ error: 'Sahi goti select karein' });
  }
  try {
    const match = await Match.findById(matchId);
    if (!match || match.gameType !== 'LUDO_RACE' || match.status !== 'RUNNING' || !match.ludoRace) {
      return res.status(400).json({ error: 'Ludo Race match active nahi hai' });
    }
    const userId = String(req.auth.userId);
    if (!isMatchPlayer(match, userId)) return res.status(403).json({ error: 'Sirf match ke players goti chala sakte hain' });
    const state = match.ludoRace;
    if (state.winnerId) return res.status(400).json({ error: 'Ludo Race ka winner tay ho chuka hai' });
    if (String(state.currentTurn) !== userId) return res.status(400).json({ error: 'Abhi opponent ki turn hai' });
    if (!Array.isArray(state.legalTokenIndexes) || !state.legalTokenIndexes.includes(tokenIndex)) {
      return res.status(400).json({ error: 'Is goti ki abhi legal move nahi hai' });
    }

    const side = ludoRaceSide(match, userId);
    const opponentSide = side === 'creator' ? 'joiner' : 'creator';
    const diceValue = Number(state.diceValue);
    const tokens = { creator: [...state.tokens.creator], joiner: [...state.tokens.joiner] };
    const oldProgress = tokens[side][tokenIndex];
    const newProgress = oldProgress === -1 ? 0 : oldProgress + diceValue;
    tokens[side][tokenIndex] = newProgress;
    let captured = false;

    if (newProgress <= 51) {
      const trackIndex = ludoRacePosition(side, newProgress);
      if (!ludoRaceSafeTrackIndexes.has(trackIndex)) {
        tokens[opponentSide] = tokens[opponentSide].map(progress => {
          if (progress >= 0 && progress <= 51 && ludoRacePosition(opponentSide, progress) === trackIndex) {
            captured = true;
            return -1;
          }
          return progress;
        });
      }
    }

    const won = newProgress === 57;
    const nextState = {
      ...state,
      version: Number(state.version || 0) + 1,
      tokens,
      diceValue: null,
      legalTokenIndexes: [],
      winnerId: won ? userId : null,
      currentTurn: won || diceValue === 6 ? userId : String(match.creator) === userId ? String(match.joiner) : String(match.creator),
      lastAction: won ? 'Ek goti ghar pahunchi — winner!' : captured ? 'Opponent ki goti capture hui' : 'Goti chal di'
    };
    const update = { ludoRace: nextState };
    if (!match.gameStartedAt) update.gameStartedAt = new Date();
    const updated = await Match.findOneAndUpdate(
      { _id: matchId, status: 'RUNNING', 'ludoRace.version': Number(state.version || 0), 'ludoRace.currentTurn': userId, 'ludoRace.diceValue': diceValue, 'ludoRace.winnerId': null },
      { $set: update },
      { new: true }
    );
    if (!updated) return res.status(409).json({ error: 'Game state update ho gaya. Refresh karke dobara try karein.' });
    io.to(String(matchId)).emit('match_updated', updated);
    res.json({ message: won ? 'Aapki ek goti ghar pahunch gayi — aap winner hain! Screenshot upload karke result bhejein.' : captured ? 'Opponent ki goti capture hui.' : 'Goti chal di.', match: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/matches/:matchId', requireUser, async (req, res) => {
  try {
    const match = await Match.findById(req.params.matchId)
      .populate('creator', 'username phone')
      .populate('joiner', 'username phone')
      .populate('winner', 'username phone');
    if (!match) return res.status(404).json({ error: 'Match nahi mila' });
    if (!isMatchPlayer(match, req.auth.userId)) return res.status(403).json({ error: 'Sirf match ke players details dekh sakte hain' });
    res.json(match);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/matches/join', requireUser, async (req, res) => {
  const { matchId } = req.body;
  const userId = req.auth.userId;

  let reservationHeld = false;
  try {
    const match = await Match.findById(matchId);
    if (!match || match.status !== 'OPEN') {
      return res.status(400).json({ error: 'Match expire ho chuka hai' });
    }

    if (match.creator.toString() === userId) {
      return res.status(400).json({ error: 'Aap apna khud ka match join nahi kar sakte' });
    }

    reservationHeld = await reserveActiveBet(userId);
    if (!reservationHeld) {
      return res.status(400).json({ error: 'Ek player ek time par maximum 2 active bets rakh sakta hai' });
    }

    const debit = await debitWalletForEntry(userId, match.amount);
    if (!debit) {
      await releaseActiveBet(userId);
      reservationHeld = false;
      return res.status(400).json({ error: 'Balance insufficient hai' });
    }

    const isLudoRace = match.gameType === 'LUDO_RACE';
    const joinedAt = new Date();
    const claimedMatch = await Match.findOneAndUpdate(
      { _id: matchId, status: 'OPEN', joiner: null },
      { $set: {
        joiner: userId,
        status: 'RUNNING',
        joinedAt,
        ...(isLudoRace ? {
          gameStartedAt: null,
          ludoRace: {
            version: 0,
            currentTurn: String(match.creator),
            diceValue: null,
            legalTokenIndexes: [],
            tokens: { creator: [-1, -1, -1, -1], joiner: [-1, -1, -1, -1] },
            winnerId: null,
            lastDice: null,
            lastRollUserId: null,
            lastAction: 'Creator ki turn'
          }
        } : { roomCodeDeadline: new Date(Date.now() + 2 * 60 * 1000) }),
        joinerWinningsUsed: debit.winningsUsed
      } },
      { new: true }
    );
    if (!claimedMatch) {
      await refundWalletEntry(userId, match.amount, debit.winningsUsed);
      await releaseActiveBet(userId);
      reservationHeld = false;
      return res.status(400).json({ error: 'Match kisi aur player ne join kar liya' });
    }
    reservationHeld = false;

    const populatedMatch = await Match.findById(matchId)
      .populate('creator', 'username phone')
      .populate('joiner', 'username phone');
    io.to(matchId).emit('match_updated', populatedMatch);
    res.json({ message: isLudoRace ? 'Opponent join ho gaya. Ludo Race creator ki turn se shuru hai.' : 'Opponent join ho gaya. Ab creator room code setup karke share karega.', match: populatedMatch });
  } catch (err) {
    if (reservationHeld) await releaseActiveBet(userId);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/matches/set-room-code', requireUser, async (req, res) => {
  const { matchId, roomCode } = req.body;
  const userId = req.auth.userId;
  try {
    const match = await Match.findById(matchId);
    if (!match || match.status !== 'RUNNING') {
      return res.status(400).json({ error: 'Invalid match' });
    }

    if (!isMatchPlayer(match, userId)) {
      return res.status(403).json({ error: 'Sirf match ke A ya B player room code share kar sakte hain' });
    }

    if (String(match.creator) !== String(userId)) {
      return res.status(403).json({ error: 'Room code sirf battle banane wala player share karega' });
    }

    if (!match.creatorStartedAt) {
      return res.status(400).json({ error: 'Pehle START dabakar room setup shuru karein' });
    }

    if (match.roomCode) {
      return res.status(400).json({ error: 'Room code already locked hai. Is match me code change nahi ho sakta.' });
    }
    if (Date.now() > matchRoomCodeDeadline(match)) {
      return res.status(400).json({ error: 'Room code ki 2 minute ki limit khatam ho gayi. Match cancel karke refund lein.' });
    }

    const classicRoomCode = String(roomCode || '').trim();
    if (!['LUDO', 'POPULAR_LUDO', 'SNAKE'].includes(match.gameType) || !/^\d{4,8}$/.test(classicRoomCode)) {
      return res.status(400).json({ error: 'Selected game ka 4-8 digit room code dalein' });
    }

    const lockedMatch = await Match.findOneAndUpdate(
      { _id: matchId, status: 'RUNNING', creator: userId, roomCode: { $in: ['', null] } },
      { $set: { roomCode: classicRoomCode, roomCodeSharedBy: userId, roomCodeSharedAt: new Date() } },
      { new: true }
    );
    if (!lockedMatch) {
      return res.status(400).json({ error: 'Room code already lock ho gaya hai. Is match me code change nahi ho sakta.' });
    }

    const populatedMatch = await Match.findById(matchId)
      .populate('creator', 'username phone')
      .populate('joiner', 'username phone');
    io.to(matchId).emit('match_updated', populatedMatch);
    res.json({ message: 'Room code share hote hi lock ho gaya. Dono players code copy karke Ludo King mein kheliye.', match: populatedMatch });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/matches/start-setup', requireUser, async (req, res) => {
  const { matchId } = req.body;
  const userId = req.auth.userId;
  try {
    const match = await Match.findById(matchId);
    if (!match || match.status !== 'RUNNING' || match.roomCode) {
      return res.status(400).json({ error: 'Room setup start nahi ho sakta' });
    }
    if (String(match.creator) !== String(userId)) {
      return res.status(403).json({ error: 'START sirf challenge creator kar sakta hai' });
    }
    let startedNow = false;
    if (!match.creatorStartedAt) {
      const startedAt = new Date();
      match.creatorStartedAt = startedAt;
      match.roomCodeDeadline = new Date(startedAt.getTime() + 2 * 60 * 1000);
      await match.save();
      startedNow = true;
    }
    io.to(String(matchId)).emit('match_updated', match);
    if (startedNow && match.joiner) {
      const startToneEvent = { matchId: String(match._id), startedBy: String(match.creator) };
      io.to(`player:${String(match.creator)}`).emit('match_start_tone', startToneEvent);
      io.to(`player:${String(match.joiner)}`).emit('match_start_tone', startToneEvent);
    }
    res.json({ message: 'Room code setup shuru ho gaya. Ludo King room banakar code share karein.', match });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/matches/confirm-ready', requireUser, async (req, res) => {
  const { matchId } = req.body;
  const userId = req.auth.userId;
  try {
    const match = await Match.findById(matchId);
    if (!match || match.status !== 'RUNNING' || !isMatchPlayer(match, userId)) {
      return res.status(400).json({ error: 'Active battle nahi mili' });
    }
    if (!match.roomCode) return res.status(400).json({ error: 'Pehle room code ka wait karein' });
    if (match.gameStartedAt) return res.json({ message: 'Game already start ho chuka hai', match });

    const confirmationField = String(match.creator) === String(userId) ? 'creatorConfirmedAt' : 'joinerConfirmedAt';
    const confirmed = await Match.findOneAndUpdate(
      { _id: matchId, status: 'RUNNING', gameStartedAt: null },
      { $set: { [confirmationField]: new Date() } },
      { new: true }
    );
    if (!confirmed) return res.status(400).json({ error: 'Battle start nahi ho sakti' });

    io.to(String(matchId)).emit('match_updated', confirmed);
    res.json({
      message: confirmed.creatorConfirmedAt && confirmed.joinerConfirmedAt
        ? 'Dono players ready hain. Creator START GAME dabaye.'
        : 'Aap ready hain. Dusre player ka wait karein.',
      match: confirmed
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/matches/start-game', requireUser, async (req, res) => {
  const { matchId } = req.body;
  const userId = req.auth.userId;
  try {
    const match = await Match.findById(matchId);
    if (!match || match.status !== 'RUNNING') {
      return res.status(400).json({ error: 'Active battle nahi mili' });
    }
    if (String(match.creator) !== String(userId)) {
      return res.status(403).json({ error: 'Game sirf challenge creator start kar sakta hai' });
    }
    if (!match.roomCode || !match.creatorConfirmedAt || !match.joinerConfirmedAt) {
      return res.status(400).json({ error: 'Dono players room join karke ready confirm karein' });
    }
    if (match.gameStartedAt) {
      return res.json({ message: 'Game pehle hi start ho chuka hai', match });
    }

    const started = await Match.findOneAndUpdate(
      { _id: matchId, status: 'RUNNING', gameStartedAt: null, creatorConfirmedAt: { $ne: null }, joinerConfirmedAt: { $ne: null } },
      { $set: { gameStartedAt: new Date() } },
      { new: true }
    );
    if (!started) return res.status(409).json({ error: 'Game start nahi ho saka. Battle refresh karke dobara dekhein.' });
    io.to(String(matchId)).emit('match_updated', started);
    res.json({ message: 'Creator ne game start kar diya', match: started });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/matches/submit-result', requireUser, persistUploads(upload.single('screenshot')), async (req, res) => {
  const { matchId, winnerId } = req.body;
  const resultReason = String(req.body.resultReason || '').trim();
  const userId = req.auth.userId;
  const participants = await Match.findById(matchId).select('creator joiner');
  if (participants) {
    await Promise.all([participants.creator, participants.joiner].filter(Boolean).map(ensureWinningsBalance));
  }
  const session = await mongoose.startSession();
  let finalMatch;
  let creditedWinner;
  let creditedAdmin;
  let winAmount = 0;
  let adminCommission = 0;
  try {
    await session.withTransaction(async () => {
      finalMatch = null;
      const match = await Match.findOne({ _id: matchId, status: 'RUNNING' }).session(session);
      if (!match) {
        const error = new Error('Match running stage me nahi hai');
        error.statusCode = 400;
        throw error;
      }

      if (!isMatchPlayer(match, userId) || !isMatchPlayer(match, winnerId)) {
        const error = new Error('Sirf A ya B player result submit kar sakta hai');
        error.statusCode = 403;
        throw error;
      }

      if (match.gameType === 'LUDO_RACE') {
        const verifiedWinnerId = String(match.ludoRace?.winnerId || '');
        if (!verifiedWinnerId || verifiedWinnerId !== String(userId) || String(winnerId) !== verifiedWinnerId) {
          const error = new Error('Ludo Race me sirf game se verified winner result submit kar sakta hai');
          error.statusCode = 403;
          throw error;
        }
        if (!req.file) {
          const error = new Error('Winner ka screenshot upload karna zaroori hai');
          error.statusCode = 400;
          throw error;
        }

        const isCreator = String(match.creator) === String(userId);
        const updatedRaceMatch = await Match.findOneAndUpdate(
          { _id: matchId, status: 'RUNNING', 'ludoRace.winnerId': verifiedWinnerId, resultSubmittedBy: { $exists: false } },
          { $set: {
            creatorResult: isCreator ? 'WIN' : 'LOSS',
            joinerResult: isCreator ? 'LOSS' : 'WIN',
            creatorResultReason: '',
            joinerResultReason: '',
            creatorProofScreenshot: isCreator ? req.file.path : '',
            joinerProofScreenshot: isCreator ? '' : req.file.path,
            resultSubmittedBy: userId,
            proofScreenshot: `uploads/${req.file.filename}`,
            winner: verifiedWinnerId,
            status: 'PENDING_RESULT',
            gameStartedAt: match.gameStartedAt || new Date()
          } },
          { new: true, session }
        );
        if (!updatedRaceMatch) {
          const error = new Error('Ludo Race result pehle submit ho chuka hai ya match update ho gaya');
          error.statusCode = 409;
          throw error;
        }
        finalMatch = updatedRaceMatch;
        return;
      }

      if (!match.roomCode) {
        const error = new Error('Pehle room code receive karke Ludo King me game kheliye');
        error.statusCode = 400;
        throw error;
      }

      const isWinReport = String(winnerId) === String(userId);
      if (isWinReport && !req.file) {
        const error = new Error('Win screenshot upload karna zaroori hai');
        error.statusCode = 400;
        throw error;
      }
      if (!isWinReport) {
        if (String(winnerId) === String(userId)) {
          const error = new Error('Loss report me aap apne aapko winner nahi bana sakte');
          error.statusCode = 400;
          throw error;
        }
        if (!resultReason) {
          const error = new Error('LOSS report ke liye reason select karein');
          error.statusCode = 400;
          throw error;
        }
      }

      const isCreator = String(match.creator) === String(userId);
      const resultField = isCreator ? 'creatorResult' : 'joinerResult';
      const reasonField = isCreator ? 'creatorResultReason' : 'joinerResultReason';
      const proofField = isCreator ? 'creatorProofScreenshot' : 'joinerProofScreenshot';
      const updated = await Match.findOneAndUpdate(
        { _id: matchId, status: 'RUNNING', [resultField]: { $exists: false } },
        { $set: {
          [resultField]: isWinReport ? 'WIN' : 'LOSS',
          [reasonField]: isWinReport ? '' : resultReason.slice(0, 300),
          [proofField]: req.file?.path || '',
          resultSubmittedBy: userId,
          proofScreenshot: req.file ? `uploads/${req.file.filename}` : '',
          gameStartedAt: match.gameStartedAt || new Date()
        } },
        { new: true, session }
      );
      if (!updated) {
        const error = new Error('Aap apna result pehle hi submit kar chuke hain ya match update ho chuka hai');
        error.statusCode = 400;
        throw error;
      }

      finalMatch = updated;
      const creatorReportedLoss = updated.creatorResult === 'LOSS';
      const joinerReportedLoss = updated.joinerResult === 'LOSS';
      if (creatorReportedLoss !== joinerReportedLoss) {
        const winnerId = creatorReportedLoss ? updated.joiner : updated.creator;
        const totalPool = updated.amount * 2;
        winAmount = totalPool * 0.95;
        adminCommission = totalPool * 0.05;
        creditedWinner = await User.findOneAndUpdate(
          { _id: winnerId },
          { $inc: { walletBalance: winAmount, winningsBalance: winAmount } },
          { new: true, session }
        );
        if (!creditedWinner) {
          const error = new Error('Winner user nahi mila');
          error.statusCode = 400;
          throw error;
        }

        const primaryAdmin = await ensurePrimaryAdminUser();
        if (primaryAdmin) {
          creditedAdmin = await User.findOneAndUpdate(
            { _id: primaryAdmin._id },
            { $inc: { walletBalance: adminCommission } },
            { new: true, session }
          );
        }

        updated.winner = winnerId;
        updated.status = 'COMPLETED';
        await updated.save({ session });
        await releaseMatchBetSlots(updated, session);
        finalMatch = updated;
        return;
      }

      if (!updated.creatorResult || !updated.joinerResult) return;

      const creatorWinner = updated.creatorResult === 'WIN' ? updated.creator : updated.joiner;
      const joinerWinner = updated.joinerResult === 'WIN' ? updated.joiner : updated.creator;
      const agreedWinner = String(creatorWinner) === String(joinerWinner) ? creatorWinner : null;
      const pendingMatch = await Match.findOneAndUpdate(
        { _id: matchId, status: 'RUNNING', creatorResult: updated.creatorResult, joinerResult: updated.joinerResult },
        { $set: { winner: agreedWinner, status: 'PENDING_RESULT' } },
        { new: true, session }
      );
      if (!pendingMatch) {
        const error = new Error('Match result update nahi ho saka. Refresh karke dobara try karein.');
        error.statusCode = 409;
        throw error;
      }
      finalMatch = pendingMatch;
    });

    if (creditedWinner) {
      io.emit('wallet_updated', {
        userId: String(creditedWinner._id),
        walletBalance: creditedWinner.walletBalance,
        amountAdded: winAmount
      });
    }
    if (creditedAdmin) {
      io.emit('wallet_updated', {
        userId: String(creditedAdmin._id),
        walletBalance: creditedAdmin.walletBalance,
        amountAdded: adminCommission
      });
    }
    if (finalMatch.status === 'COMPLETED') {
      finalMatch = await Match.findById(matchId)
        .populate('creator', 'username phone')
        .populate('joiner', 'username phone')
        .populate('winner', 'username phone');
    }
    io.to(String(matchId)).emit('match_updated', finalMatch);

    const isAdminVisibleCommission = Boolean(req.admin || req.auth?.role === 'admin');
    const publicMessage = finalMatch.status === 'COMPLETED'
      ? 'LOSS confirm ho gaya. Winner ko payout credit ho gaya.'
      : finalMatch.status === 'PENDING_RESULT'
        ? finalMatch.gameType === 'LUDO_RACE'
          ? 'Ludo Race screenshot aur verified result admin review ke liye bhej diya gaya.'
          : 'Reports match nahi karte. Admin review ke liye bhej diye gaye.'
        : 'Aapka result submit ho gaya. Dusre player ke result ka wait karein.';
    const adminMessage = finalMatch.status === 'COMPLETED'
      ? `LOSS confirm ho gaya. Winner ko ₹${winAmount} payout aur admin ko ₹${adminCommission} commission credit ho gaya.`
      : finalMatch.status === 'PENDING_RESULT'
        ? finalMatch.gameType === 'LUDO_RACE'
          ? 'Ludo Race ka verified result admin review ke liye bhej diya gaya.'
          : 'Reports match nahi karte. Admin review ke liye bhej diye gaye hain.'
        : 'Aapka result submit ho gaya. Dusre player ke result ka wait karein.';

    res.json({
      message: isAdminVisibleCommission ? adminMessage : publicMessage,
      winAmount,
      ...(isAdminVisibleCommission ? { commission: adminCommission } : {}),
      match: finalMatch
    });
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message });
  } finally {
    await session.endSession();
  }
});

app.post('/api/matches/cancel', requireUser, async (req, res) => {
  const { matchId, reason } = req.body;
  let cancelReason = reason;
  const userId = req.auth.userId;
  try {
    const match = await Match.findById(matchId);
    if (!match || !['OPEN', 'RUNNING'].includes(match.status)) {
      return res.status(400).json({ error: 'Is match ko ab cancel nahi kiya ja sakta' });
    }

    if (!isMatchPlayer(match, userId)) {
      return res.status(403).json({ error: 'Sirf A ya B player match cancel kar sakta hai' });
    }

    if (match.status === 'OPEN' && match.creator.toString() !== String(userId)) {
      return res.status(403).json({ error: 'Opponent join hone se pehle sirf A player cancel kar sakta hai' });
    }
    if (match.status === 'RUNNING' && match.gameType === 'LUDO_RACE' && Number(match.ludoRace?.version || 0) > 0) {
      return res.status(400).json({ error: 'Ludo Race ki pehli dice roll ke baad battle cancel nahi ki ja sakti' });
    }
    if (match.status === 'OPEN') cancelReason = 'OPPONENT_NOT_JOINED';
    if (match.status === 'RUNNING' && !match.roomCode) cancelReason = 'ROOM_CODE_NOT_SHARED';

    if (!CANCEL_REASONS.has(cancelReason)) {
      return res.status(400).json({ error: 'Cancel karne ka valid reason select karein' });
    }
    if (cancelReason === 'ROOM_CODE_NOT_SHARED' && match.roomCode) {
      return res.status(400).json({ error: 'Room code share ho chuka hai. Koi aur cancel reason select karein.' });
    }

    if (match.status === 'RUNNING' && match.roomCode) {
      const request = await Match.findOneAndUpdate(
        { _id: matchId, status: 'RUNNING', roomCode: { $nin: ['', null] } },
        { $set: {
          status: 'PENDING_CANCELLATION',
          cancelRequestReason: cancelReason,
          cancelRequestedBy: userId,
          cancelRequestedAt: new Date(),
          cancelRequestedFromStatus: 'RUNNING'
        } },
        { new: true }
      );
      if (!request) return res.status(409).json({ error: 'Match update ho gaya. Refresh karke dobara dekhein.' });

      io.to(String(matchId)).emit('match_updated', request);
      return res.json({ message: 'Room code share ho chuka hai. Cancel reason admin ko bhej di; approval ke baad match cancel aur dono players ko refund hoga.', match: request });
    }

    await Promise.all([match.creator, match.joiner].filter(Boolean).map(ensureWinningsBalance));
    const session = await mongoose.startSession();
    let cancelledMatch;
    const refundedPlayers = [];
    try {
      await session.withTransaction(async () => {
        const currentMatch = await Match.findOne({ _id: matchId, status: match.status }).session(session);
        if (!currentMatch || currentMatch.roomCode) {
          const error = new Error('Room code share ho chuka hai ya match update ho gaya. Admin review ka wait karein.');
          error.statusCode = 409;
          throw error;
        }
        if (currentMatch.status === 'RUNNING' && currentMatch.gameType === 'LUDO_RACE' && Number(currentMatch.ludoRace?.version || 0) > 0) {
          const error = new Error('Ludo Race ki pehli dice roll ke baad battle cancel nahi ki ja sakti');
          error.statusCode = 400;
          throw error;
        }

        currentMatch.status = 'CANCELLED';
        currentMatch.cancelReason = cancelReason;
        currentMatch.cancelledBy = userId;
        currentMatch.cancelledAt = new Date();
        await currentMatch.save({ session });

        const playerRefunds = [
          [currentMatch.creator, currentMatch.creatorWinningsUsed],
          [currentMatch.joiner, currentMatch.joinerWinningsUsed]
        ].filter(([playerId]) => Boolean(playerId));
        for (const [playerId, winningsUsed] of playerRefunds) {
          const player = await refundWalletEntry(playerId, currentMatch.amount, Number(winningsUsed) || 0, session);
          if (player) refundedPlayers.push(player);
        }
        await releaseMatchBetSlots(currentMatch, session);
        cancelledMatch = currentMatch;
      });
    } catch (err) {
      return res.status(err.statusCode || 500).json({ error: err.message });
    } finally {
      await session.endSession();
    }

    for (const player of refundedPlayers) {
      io.emit('wallet_updated', { userId: String(player._id), walletBalance: player.walletBalance, amountAdded: cancelledMatch.amount });
    }
    io.to(String(matchId)).emit('match_updated', cancelledMatch);
    res.json({ message: 'Battle cancel ho gayi aur eligible players ki entry refund ho gayi.', match: cancelledMatch });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ================= WALLET & PAYMENT ROUTES ================= //

app.get('/api/wallet/generate-qr', requireUser, async (req, res) => {
  const { amount } = req.query;
  const depositAmount = Number(amount);
  if (!Number.isInteger(depositAmount) || depositAmount < 100 || depositAmount > 1000000) {
    return res.status(400).json({ error: 'Minimum deposit ₹100 hai' });
  }
  try {
    const settings = mongoose.connection.readyState === 1
      ? await SiteSettings.findById('support-contact').select('depositUpiId').lean()
      : null;
    const adminUPI = String(settings?.depositUpiId || process.env.ADMIN_UPI_ID || '').trim();
    if (!adminUPI) return res.status(503).json({ error: 'Admin UPI ID configure nahi hai' });
    const payeeName = 'KhiladiAdda24.com';
    const upiUrl = `upi://pay?${new URLSearchParams({ pa: adminUPI, pn: payeeName, am: String(depositAmount), cu: 'INR' })}`;
    const qrImage = await QRCode.toDataURL(upiUrl);
    res.json({ qrImage, upiUrl });
  } catch (err) {
    res.status(500).json({ error: 'QR generate fail hua' });
  }
});

app.post('/api/wallet/submit-deposit', requireUser, persistUploads(upload.single('screenshot')), async (req, res) => {
  const { amount, utrNumber } = req.body;
  const userId = req.auth.userId;
  const depositAmount = Number(amount);
  if (!Number.isInteger(depositAmount) || depositAmount < 100 || depositAmount > 1000000) {
    return res.status(400).json({ error: 'Minimum deposit ₹100 hai' });
  }

  if (!utrNumber || !/^[a-zA-Z0-9]{12,22}$/.test(utrNumber.trim())) {
    return res.status(400).json({ error: 'Valid UTR / reference number dalein' });
  }
  if (!req.file) {
    return res.status(400).json({ error: 'Payment screenshot upload karna zaroori hai' });
  }

  try {
    const deposit = await Deposit.create({
      userId,
      amount: depositAmount,
      utrNumber: utrNumber.trim(),
      screenshot: `uploads/${req.file.filename}`
    });
    res.json({ message: 'Deposit request bhej di gayi hai. Admin review karega.', deposit });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ error: 'Ye UTR pehle se submit kiya ja chuka hai!' });
    }
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/kyc/me', requireUser, async (req, res) => {
  try {
    const kyc = await Kyc.findOne({ userId: req.auth.userId }).sort({ createdAt: -1 }).lean();
    res.json({ status: kyc ? kyc.status : 'NOT_SUBMITTED', submittedAt: kyc?.submittedAt || null, rejectionReason: kyc?.rejectionReason || '' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/kyc/:userId', requireUser, async (req, res) => {
  if (String(req.params.userId) !== String(req.auth.userId)) return res.status(403).json({ error: 'KYC status sirf account owner dekh sakta hai' });
  try {
    const kyc = await Kyc.findOne({ userId: req.params.userId }).sort({ createdAt: -1 }).lean();
    res.json({
      status: kyc ? kyc.status : 'NOT_SUBMITTED',
      submittedAt: kyc ? kyc.submittedAt : null,
      reviewedAt: kyc ? kyc.reviewedAt : null,
      rejectionReason: kyc ? kyc.rejectionReason : ''
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/kyc/submit', requireUser, persistUploads(upload.single('aadhaarImage')), async (req, res) => {
  const userId = req.auth.userId;
  const aadhaarNumber = String(req.body.aadhaarNumber || '').replace(/\s/g, '');
  if (!userId || !/^\d{12}$/.test(aadhaarNumber)) {
    return res.status(400).json({ error: 'Valid 12 digit Aadhaar number dalein' });
  }
  if (!req.file) {
    return res.status(400).json({ error: 'Aadhaar card image upload karna zaroori hai' });
  }

  try {
    const existing = await Kyc.findOne({ userId }).sort({ createdAt: -1 });
    if (existing && existing.status === 'APPROVED') {
      return res.status(400).json({ error: 'Aapka KYC pehle se verified hai' });
    }

    const kycData = {
      userId,
      aadhaarNumber,
      aadhaarImage: `uploads/${req.file.filename}`,
      status: 'PENDING',
      rejectionReason: '',
      submittedAt: new Date(),
      reviewedAt: null
    };
    const kyc = existing ? await Kyc.findByIdAndUpdate(existing._id, kycData, { new: true }) : await Kyc.create(kycData);
    res.json({ message: 'KYC submit ho gaya. Admin 30 minutes ke andar verify karega.', status: kyc.status });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/wallet/withdraw', requireUser, persistUploads(upload.single('payoutQr')), async (req, res) => {
  const { amount, accountHolderName, accountNumber, ifscCode, upiId } = req.body;
  const userId = req.auth.userId;
  const withdrawAmount = Number(amount);
  const payoutMethod = String(req.body.payoutMethod || '').toUpperCase();
  const bankAccountNumber = String(accountNumber || '').trim();
  const holderName = String(accountHolderName || '').trim();
  const bankIfsc = String(ifscCode || '').trim().toUpperCase();
  const payoutUpiId = String(upiId || '').trim();
  const payoutQr = req.file ? `uploads/${req.file.filename}` : '';
  if (!Number.isInteger(withdrawAmount) || withdrawAmount < 500 || withdrawAmount % 100 !== 0) {
    return res.status(400).json({ error: 'Withdrawal ₹500 se shuru hoti hai aur ₹100 ke steps me request karein' });
  }
  if (!['BANK', 'UPI', 'QR'].includes(payoutMethod)) {
    return res.status(400).json({ error: 'Bank account, UPI ID ya UPI QR method select karein' });
  }
  if (payoutMethod === 'BANK') {
    if (!/^[\p{L}][\p{L} .'-]{1,79}$/u.test(holderName)) {
      return res.status(400).json({ error: 'Valid account holder name dalein' });
    }
    if (!/^\d{9,18}$/.test(bankAccountNumber)) {
      return res.status(400).json({ error: 'Valid 9-18 digit bank account number dalein' });
    }
    if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(bankIfsc)) {
      return res.status(400).json({ error: 'Valid 11 character IFSC code dalein' });
    }
  }
  if (payoutMethod === 'UPI' && !/^[a-zA-Z0-9._-]{2,100}@[a-zA-Z0-9.-]{2,100}$/.test(payoutUpiId)) {
    return res.status(400).json({ error: 'Valid UPI ID dalein' });
  }
  if (payoutMethod === 'QR' && !payoutQr) {
    return res.status(400).json({ error: 'UPI QR image upload karein' });
  }

  try {
    const verifiedKyc = await Kyc.findOne({ userId, status: 'APPROVED' });
    if (!verifiedKyc) {
      return res.status(403).json({ error: 'Withdraw se pehle Aadhaar KYC verification zaroori hai' });
    }

    const currentUser = await ensureWinningsBalance(userId);
    if (!currentUser) return res.status(404).json({ error: 'Player nahi mila' });
    if (Number(currentUser.walletBalance) < withdrawAmount) {
      return res.status(400).json({ error: 'Wallet me itne paise nahi hain' });
    }
    if (Number(currentUser.winningsBalance) < withdrawAmount) {
      return res.status(400).json({ error: `Sirf game winnings withdraw ho sakti hain. Available winnings: ₹${Number(currentUser.winningsBalance || 0).toLocaleString('en-IN')}` });
    }

    const user = await User.findOneAndUpdate(
      { _id: userId, walletBalance: { $gte: withdrawAmount }, winningsBalance: { $gte: withdrawAmount } },
      { $inc: { walletBalance: -withdrawAmount, winningsBalance: -withdrawAmount } },
      { new: true }
    );
    if (!user) return res.status(400).json({ error: 'Withdrawable winnings balance badal gaya hai. Refresh karke dobara try karein.' });

    let request;
    try {
      request = await Withdraw.create({ userId, amount: withdrawAmount, payoutMethod, accountNumber: bankAccountNumber, accountHolderName: holderName, ifscCode: bankIfsc, upiId: payoutUpiId, payoutQr });
    } catch (err) {
      await refundWalletEntry(userId, withdrawAmount, withdrawAmount);
      throw err;
    }
    res.json({ message: 'Withdraw request lag gayi hai', request });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/wallet/history', requireUser, async (req, res) => {
  try {
    const userId = req.auth.userId;
    const [deposits, withdrawals, matches] = await Promise.all([
      Deposit.find({ userId }).select('amount status createdAt updatedAt').lean(),
      Withdraw.find({ userId }).select('amount status createdAt updatedAt').lean(),
      Match.find({ $or: [{ creator: userId }, { joiner: userId }] })
        .select('gameType amount status creator joiner winner creatorResult joinerResult createdAt updatedAt')
        .lean()
    ]);
    const history = [
      ...deposits.map(item => ({
        id: String(item._id), type: 'DEPOSIT', amount: item.amount, status: item.status,
        at: item.updatedAt || item.createdAt
      })),
      ...withdrawals.map(item => ({
        id: String(item._id), type: 'WITHDRAWAL', amount: item.amount, status: item.status,
        at: item.updatedAt || item.createdAt
      })),
      ...matches.map(item => {
        const isCreator = String(item.creator) === String(userId);
        const reportedResult = isCreator ? item.creatorResult : item.joinerResult;
        const result = item.winner
          ? String(item.winner) === String(userId) ? 'WIN' : 'LOSS'
          : reportedResult || '';
        return {
          id: String(item._id), type: 'GAME', gameType: item.gameType, amount: item.amount,
          status: item.status, result, at: item.updatedAt || item.createdAt
        };
      })
    ].sort((left, right) => new Date(right.at).getTime() - new Date(left.at).getTime());
    res.json({ history });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/wallet/summary', requireUser, async (req, res) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.auth.userId);
    const user = await ensureWinningsBalance(userId);
    const [depositTotals, withdrawalTotals, winningsTotals] = await Promise.all([
      Deposit.aggregate([
        { $match: { userId, status: 'APPROVED' } },
        { $group: { _id: null, totalAmount: { $sum: '$amount' } } }
      ]),
      Withdraw.aggregate([
        { $match: { userId, status: { $in: ['PAID', 'PENDING'] } } },
        { $group: { _id: '$status', totalAmount: { $sum: '$amount' } } }
      ]),
      Match.aggregate([
        { $match: { winner: userId, status: 'COMPLETED' } },
        { $group: { _id: null, totalWinnings: { $sum: { $multiply: ['$amount', 1.9] } } } }
      ])
    ]);
    const withdrawalsByStatus = Object.fromEntries(withdrawalTotals.map(item => [item._id, item.totalAmount]));
    res.json({
      totalDeposits: depositTotals[0]?.totalAmount || 0,
      paidWithdrawals: withdrawalsByStatus.PAID || 0,
      pendingWithdrawals: withdrawalsByStatus.PENDING || 0,
      totalWinnings: winningsTotals[0]?.totalWinnings || 0,
      availableWinnings: Number(user?.winningsBalance) || 0
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ================= ADMIN ROUTES ================= //

app.get('/api/admin/pending-all', requireAdmin, async (req, res) => {
  try {
    const [deposits, depositTotals, withdrawalTotals, playerWalletTotals] = await Promise.all([
      Deposit.find({ status: 'PENDING' }).populate('userId', 'username phone'),
      Deposit.aggregate([
        { $match: { status: 'APPROVED' } },
        { $group: { _id: null, totalAmount: { $sum: '$amount' } } }
      ]),
      Withdraw.aggregate([
        { $match: { status: { $in: ['PAID', 'PENDING'] } } },
        { $group: { _id: '$status', totalAmount: { $sum: '$amount' } } }
      ]),
      User.aggregate([
        { $match: { isAdmin: { $ne: true }, isPrimaryAdmin: { $ne: true } } },
        { $group: { _id: null, totalBalance: { $sum: '$walletBalance' } } }
      ])
    ]);
    const matches = await Match.find({ status: 'PENDING_RESULT' })
      .populate('creator', 'username phone')
      .populate('joiner', 'username phone')
      .populate('winner', 'username phone')
      .populate('resultSubmittedBy', 'username phone')
      .populate('roomCodeSharedBy', 'username phone');
    const cancellationRequests = await Match.find({ status: 'PENDING_CANCELLATION' })
      .populate('creator', 'username phone')
      .populate('joiner', 'username phone')
      .populate('cancelRequestedBy', 'username phone')
      .sort({ cancelRequestedAt: 1 });
    const withdrawals = await Withdraw.find({ status: 'PENDING' }).populate('userId', 'username phone');
    const kycs = await Kyc.find({ status: 'PENDING' }).populate('userId', 'username phone').sort({ submittedAt: 1 });
    const runningMatches = await Match.find({ status: { $in: ['OPEN', 'RUNNING', 'PENDING_RESULT'] } })
      .populate('creator', 'username phone')
      .populate('joiner', 'username phone')
      .sort({ createdAt: -1 });
    const withdrawalsByStatus = Object.fromEntries(withdrawalTotals.map(item => [item._id, item.totalAmount]));
    const financeSummary = {
      totalDeposits: depositTotals[0]?.totalAmount || 0,
      paidWithdrawals: withdrawalsByStatus.PAID || 0,
      pendingWithdrawals: withdrawalsByStatus.PENDING || 0,
      playerWalletBalance: playerWalletTotals[0]?.totalBalance || 0
    };
    res.json({ deposits, matches, cancellationRequests, withdrawals, kycs, runningMatches, financeSummary });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/approve-deposit', requireAdmin, async (req, res) => {
  const { depositId } = req.body;
  try {
    const deposit = await Deposit.findById(depositId);
    if (!deposit || deposit.status !== 'PENDING') {
      return res.status(400).json({ error: 'Invalid request' });
    }

    const user = await User.findById(deposit.userId);
    user.walletBalance += deposit.amount;
    await user.save();

    deposit.status = 'APPROVED';
    if (deposit.screenshot && !deposit.screenshotDeleteAt) deposit.screenshotDeleteAt = new Date(Date.now() + 2 * 60 * 1000);
    await deposit.save();

    io.emit('wallet_updated', {
      userId: String(user._id),
      walletBalance: user.walletBalance,
      amountAdded: deposit.amount
    });

    res.json({ message: 'Deposit Approved! Balance Added.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/cancel-deposit', requireAdmin, async (req, res) => {
  const { depositId, rejectionReason } = req.body;
  try {
    const deposit = await Deposit.findById(depositId);
    if (!deposit || deposit.status !== 'PENDING') {
      return res.status(400).json({ error: 'Pending deposit request not found' });
    }

    deposit.status = 'REJECTED';
    deposit.rejectionReason = String(rejectionReason || '').trim() || 'Deposit request admin ne cancel kiya.';
    if (deposit.screenshot && !deposit.screenshotDeleteAt) deposit.screenshotDeleteAt = new Date(Date.now() + 2 * 60 * 1000);
    await deposit.save();

    res.json({ message: 'Deposit request cancel/reject ho gaya.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/admin/kyc/:kycId', requireAdmin, persistUploads(upload.single('aadhaarImage')), async (req, res) => {
  const kycId = String(req.params.kycId || '');
  const aadhaarNumber = String(req.body.aadhaarNumber || '').replace(/\s/g, '');
  if (!mongoose.Types.ObjectId.isValid(kycId)) {
    return res.status(400).json({ error: 'Valid KYC select karein' });
  }
  if (!/^\d{12}$/.test(aadhaarNumber)) {
    return res.status(400).json({ error: 'Valid 12 digit Aadhaar number dalein' });
  }

  try {
    const kyc = await Kyc.findOne({ _id: kycId, status: 'PENDING' });
    if (!kyc) return res.status(404).json({ error: 'Pending KYC nahi mili' });

    kyc.aadhaarNumber = aadhaarNumber;
    if (req.file) kyc.aadhaarImage = `uploads/${req.file.filename}`;
    await kyc.save();
    res.json({ message: 'KYC details update ho gayi' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/kyc-status', requireAdmin, async (req, res) => {
  const { kycId, status, rejectionReason } = req.body;
  if (!['APPROVED', 'REJECTED'].includes(status)) {
    return res.status(400).json({ error: 'Valid KYC status select karein' });
  }

  try {
    const kyc = await Kyc.findById(kycId);
    if (!kyc || kyc.status !== 'PENDING') {
      return res.status(400).json({ error: 'KYC pending nahi hai' });
    }

    kyc.status = status;
    kyc.rejectionReason = status === 'REJECTED' ? String(rejectionReason || 'Image ya Aadhaar details verify nahi hui') : '';
    kyc.reviewedAt = new Date();
    await kyc.save();
    res.json({ message: status === 'APPROVED' ? 'KYC approve ho gaya' : 'KYC reject ho gaya' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/approve-match', requireAdmin, async (req, res) => {
  const { matchId, winnerId } = req.body;
  try {
    const match = await Match.findById(matchId);
    if (!match || !['RUNNING', 'PENDING_RESULT'].includes(match.status)) {
      return res.status(400).json({ error: 'Match running ya pending result me nahi hai' });
    }

    if (winnerId && ![match.creator, match.joiner].some(playerId => String(playerId) === String(winnerId))) {
      return res.status(400).json({ error: 'Selected winner is not a player in this match' });
    }
    if (winnerId) {
      match.winner = winnerId;
    }
    if (!match.winner) {
      return res.status(400).json({ error: 'Reports match nahi karte. Payout se pehle winner select karein.' });
    }

    await ensureWinningsBalance(match.winner);

    const totalPool = match.amount * 2;
    const adminCommission = totalPool * 0.05;
    const winAmount = totalPool * 0.95;

    const [winner, adminUser] = await Promise.all([
      User.findById(match.winner),
      ensurePrimaryAdminUser()
    ]);

    if (!winner) {
      return res.status(400).json({ error: 'Winner user nahi mila' });
    }

    winner.walletBalance += winAmount;
    winner.winningsBalance = (Number(winner.winningsBalance) || 0) + winAmount;
    await winner.save();
    io.emit('wallet_updated', {
      userId: String(winner._id),
      walletBalance: winner.walletBalance,
      amountAdded: winAmount
    });

    if (adminUser) {
      const adminDoc = await User.findById(adminUser._id);
      adminDoc.walletBalance = (Number(adminDoc.walletBalance) || 0) + adminCommission;
      await adminDoc.save();
      io.emit('wallet_updated', {
        userId: String(adminDoc._id),
        walletBalance: adminDoc.walletBalance,
        amountAdded: adminCommission
      });
    }

    match.status = 'COMPLETED';
    if ((match.creatorProofScreenshot || match.joinerProofScreenshot || match.proofScreenshot) && !match.proofScreenshotsDeleteAt) {
      match.proofScreenshotsDeleteAt = new Date(Date.now() + 2 * 60 * 1000);
    }
    await match.save();
    await releaseMatchBetSlots(match);
    const completedMatch = await Match.findById(match._id)
      .populate('creator', 'username phone')
      .populate('joiner', 'username phone')
      .populate('winner', 'username phone');
    io.to(String(match._id)).emit('match_updated', completedMatch);

    res.json({ message: 'Winner ko 95% payout aur admin ko 5% commission credit ho chuka hai!', winAmount, commission: adminCommission, match: completedMatch });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/cancel-match', requireAdmin, async (req, res) => {
  const { matchId } = req.body;
  try {
    const match = await Match.findById(matchId);
    if (!match || !['OPEN', 'RUNNING', 'PENDING_RESULT'].includes(match.status)) {
      return res.status(400).json({ error: 'Game OPEN/RUNNING/PENDING_RESULT me hi cancel ho sakta hai' });
    }

    const playerIds = [match.creator, match.joiner].filter(Boolean);
    await Promise.all(playerIds.map(ensureWinningsBalance));
    const currentMatch = await Match.findById(matchId);
    if (!currentMatch || !['OPEN', 'RUNNING', 'PENDING_RESULT'].includes(currentMatch.status)) {
      return res.status(400).json({ error: 'Game already resolve ho gaya hai' });
    }
    const playerRefunds = [
      [currentMatch.creator, currentMatch.creatorWinningsUsed],
      [currentMatch.joiner, currentMatch.joinerWinningsUsed]
    ].filter(([playerId]) => Boolean(playerId));
    await Promise.all(playerRefunds.map(([playerId, winningsUsed]) =>
      refundWalletEntry(playerId, currentMatch.amount, Number(winningsUsed) || 0)
    ));

    currentMatch.status = 'CANCELLED';
    currentMatch.cancelReason = 'ADMIN_CANCELLED';
    currentMatch.cancelledAt = new Date();
    if ((currentMatch.creatorProofScreenshot || currentMatch.joinerProofScreenshot || currentMatch.proofScreenshot) && !currentMatch.proofScreenshotsDeleteAt) {
      currentMatch.proofScreenshotsDeleteAt = new Date(Date.now() + 2 * 60 * 1000);
    }
    await currentMatch.save();
    await releaseMatchBetSlots(currentMatch);

    io.to(String(currentMatch._id)).emit('match_updated', currentMatch);
    res.json({ message: 'Game cancel ho gaya aur players ko refund kar diya gaya' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/review-cancel-request', requireAdmin, async (req, res) => {
  const { matchId } = req.body;
  const decision = String(req.body.decision || '').toUpperCase();
  if (!['APPROVE', 'REJECT'].includes(decision)) {
    return res.status(400).json({ error: 'Approve ya reject select karein' });
  }

  const pendingForMigration = await Match.findOne({ _id: matchId, status: 'PENDING_CANCELLATION' }).select('creator joiner');
  if (pendingForMigration) {
    await Promise.all([pendingForMigration.creator, pendingForMigration.joiner].filter(Boolean).map(ensureWinningsBalance));
  }
  const session = await mongoose.startSession();
  let reviewedMatch;
  const refundedPlayers = [];
  try {
    await session.withTransaction(async () => {
      refundedPlayers.length = 0;
      const match = await Match.findOne({ _id: matchId, status: 'PENDING_CANCELLATION' }).session(session);
      if (!match) {
        const error = new Error('Pending cancel request nahi mili');
        error.statusCode = 404;
        throw error;
      }

      if (decision === 'APPROVE') {
        const playerIds = [match.creator, match.joiner].filter(Boolean);
        match.status = 'CANCELLED';
        match.cancelReason = match.cancelRequestReason;
        match.cancelledBy = req.admin.userId;
        match.cancelledAt = new Date();
        await match.save({ session });
        for (const playerId of playerIds) {
          const isCreator = String(match.creator) === String(playerId);
          const winningsUsed = isCreator ? match.creatorWinningsUsed : match.joinerWinningsUsed;
          const player = await refundWalletEntry(playerId, match.amount, Number(winningsUsed) || 0, session);
          if (player) refundedPlayers.push(player);
        }
        await releaseMatchBetSlots(match, session);
      } else {
        if (!['OPEN', 'RUNNING'].includes(match.cancelRequestedFromStatus)) {
          const error = new Error('Cancel request ki original match state valid nahi hai');
          error.statusCode = 400;
          throw error;
        }
        match.status = match.cancelRequestedFromStatus;
        match.cancelRequestReason = '';
        match.cancelRequestedBy = undefined;
        match.cancelRequestedAt = undefined;
        match.cancelRequestedFromStatus = undefined;
        await match.save({ session });
      }
      reviewedMatch = match;
    });

    refundedPlayers.forEach(player => io.emit('wallet_updated', {
      userId: String(player._id),
      walletBalance: player.walletBalance,
      amountAdded: reviewedMatch.amount,
      reason: 'Admin approved game cancellation refund'
    }));
    io.to(String(reviewedMatch._id)).emit('match_updated', reviewedMatch);
    res.json({ message: decision === 'APPROVE' ? 'Cancel approved. Match cancel aur players ko refund kar diya.' : 'Cancel request reject kar di. Match active hai.', match: reviewedMatch });
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message });
  } finally {
    await session.endSession();
  }
});

app.get('/api/admin/users', requireAdmin, async (req, res) => {
  try {
    const users = await User.find({}, 'username phone walletBalance createdAt isBlocked isAdmin isPrimaryAdmin').sort({ createdAt: -1 }).lean();
    res.json({ users });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/player-session', requireAdmin, async (req, res) => {
  try {
    const user = await findUserById(req.admin.userId);
    if (!user) return res.status(404).json({ error: 'Admin player account nahi mila' });
    if (!user.isPrimaryAdmin || normalizePhone(user.phone) !== PRIMARY_ADMIN_PHONE) {
      return res.status(403).json({ error: 'Player site access sirf primary admin ke liye available hai.' });
    }

    const token = jwt.sign(
      { userId: user._id, phone: user.phone, role: 'user' },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    res.json({
      token,
      user: {
        _id: user._id,
        id: user._id,
        username: user.username,
        phone: user.phone,
        profileImage: user.profileImage || '',
        walletBalance: user.walletBalance,
        referralCode: user.referralCode || '',
        role: 'user'
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/admin/users/:userId/history', requireAdmin, async (req, res) => {
  const { userId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return res.status(400).json({ error: 'Valid player ID required hai' });
  }

  try {
    const [user, deposits, withdrawals, matches] = await Promise.all([
      User.findById(userId, 'username phone walletBalance createdAt isBlocked isAdmin isPrimaryAdmin').lean(),
      Deposit.find({ userId }).select('amount status createdAt updatedAt').sort({ createdAt: -1 }).lean(),
      Withdraw.find({ userId }).select('amount status payoutMethod accountHolderName accountNumber ifscCode upiId createdAt updatedAt').sort({ createdAt: -1 }).lean(),
      Match.find({ $or: [{ creator: userId }, { joiner: userId }] })
        .select('gameType amount status createdAt joinedAt gameStartedAt creator joiner winner creatorResult joinerResult')
        .populate('creator', 'username')
        .populate('joiner', 'username')
        .populate('winner', 'username')
        .sort({ createdAt: -1 })
        .lean()
    ]);
    if (!user) return res.status(404).json({ error: 'Player nahi mila' });
    res.json({ user, deposits, withdrawals, matches });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/users/:userId/admin', requireAdmin, async (req, res) => {
  const { userId } = req.params;
  const { isAdmin } = req.body;
  if (!mongoose.Types.ObjectId.isValid(userId) || typeof isAdmin !== 'boolean') {
    return res.status(400).json({ error: 'Valid user aur admin status required hai' });
  }

  try {
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'User nahi mila' });
    if (user.isPrimaryAdmin) {
      return res.status(400).json({ error: 'Primary admin ko remove nahi kiya ja sakta' });
    }
    if (isAdmin) {
      user.isAdmin = true;
      user.isPrimaryAdmin = false;
    } else {
      user.isAdmin = false;
      user.isPrimaryAdmin = false;
    }
    await user.save();
    res.json({ message: isAdmin ? 'User ko admin bana diya gaya' : 'User se admin access remove kar diya gaya', isAdmin: user.isAdmin });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/users/:userId/block', requireAdmin, async (req, res) => {
  const { userId } = req.params;
  const { blocked } = req.body;
  if (!mongoose.Types.ObjectId.isValid(userId) || typeof blocked !== 'boolean') {
    return res.status(400).json({ error: 'Valid player aur block status required hai' });
  }

  try {
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'Player nahi mila' });
    if (isAdminPhone(user.phone)) return res.status(400).json({ error: 'Admin account ko block nahi kar sakte' });
    user.isBlocked = blocked;
    await user.save();
    res.json({ message: blocked ? 'Player block kar diya' : 'Player unblock kar diya', isBlocked: user.isBlocked });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/users/:userId/edit', requireAdmin, async (req, res) => {
  const { userId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return res.status(400).json({ error: 'Valid player ID required hai' });
  }

  const username = String(req.body.username || '').trim();
  const phone = normalizePhone(String(req.body.phone || ''));
  const walletBalance = Number(req.body.walletBalance);
  const nextIsBlocked = typeof req.body.isBlocked === 'boolean' ? req.body.isBlocked : undefined;
  const nextIsAdmin = typeof req.body.isAdmin === 'boolean' ? req.body.isAdmin : undefined;

  if (username.length < 2 || username.length > 40) {
    return res.status(400).json({ error: 'Username 2 se 40 characters ke beech hona chahiye' });
  }
  if (!/^[0-9]{10}$/.test(phone)) {
    return res.status(400).json({ error: '10 digit mobile number valid hona chahiye' });
  }
  if (!Number.isFinite(walletBalance)) {
    return res.status(400).json({ error: 'Wallet balance valid number hona chahiye' });
  }

  try {
    const existingUser = await User.findById(userId);
    if (!existingUser) return res.status(404).json({ error: 'Player nahi mila' });

    const duplicatePhone = await User.findOne({ phone, _id: { $ne: userId } }).select('_id');
    if (duplicatePhone) {
      return res.status(409).json({ error: 'Ye phone number kisi aur player ke account se already linked hai' });
    }

    if (existingUser.isPrimaryAdmin && nextIsAdmin === false) {
      return res.status(400).json({ error: 'Primary admin ke admin status ko remove nahi kiya ja sakta' });
    }
    if (nextIsBlocked !== undefined) {
      if (isAdminPhone(existingUser.phone)) {
        return res.status(400).json({ error: 'Admin account ko block nahi kar sakte' });
      }
      existingUser.isBlocked = nextIsBlocked;
    }
    if (nextIsAdmin !== undefined) {
      if (existingUser.isPrimaryAdmin) {
        return res.status(400).json({ error: 'Primary admin ko role change nahi kiya ja sakta' });
      }
      existingUser.isAdmin = nextIsAdmin;
      if (nextIsAdmin) existingUser.isPrimaryAdmin = false;
    }

    existingUser.username = username;
    existingUser.phone = phone;
    existingUser.walletBalance = Number(walletBalance);

    await existingUser.save();
    res.json({ message: 'Player profile update ho gaya', user: existingUser });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/wallet-adjust', requireAdmin, async (req, res) => {
  const { userId, amount, reason } = req.body;
  const adjustment = Number(amount);
  if (!userId || !Number.isFinite(adjustment) || adjustment === 0) {
    return res.status(400).json({ error: 'User aur non-zero amount required hai' });
  }

  try {
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'Player nahi mila' });
    if (user.walletBalance + adjustment < 0) {
      return res.status(400).json({ error: 'Wallet balance zero se kam nahi ho sakta' });
    }

    user.walletBalance += adjustment;
    await user.save();
    io.emit('wallet_updated', {
      userId: String(user._id),
      walletBalance: user.walletBalance,
      amountAdded: adjustment,
      reason: reason || 'Admin wallet update'
    });
    res.json({ message: 'Wallet update ho gaya', walletBalance: user.walletBalance });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/bonus', requireAdmin, async (req, res) => {
  const { userId, amount, reason } = req.body;
  const bonus = Number(amount);
  if (!userId || !Number.isFinite(bonus) || bonus <= 0) {
    return res.status(400).json({ error: 'Player aur positive bonus amount required hai' });
  }

  try {
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'Player nahi mila' });
    user.walletBalance += bonus;
    await user.save();
    io.emit('wallet_updated', {
      userId: String(user._id),
      walletBalance: user.walletBalance,
      amountAdded: bonus,
      reason: reason || 'Admin bonus'
    });
    res.json({ message: 'Bonus wallet me add ho gaya', walletBalance: user.walletBalance });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/admin/game-history', requireAdmin, async (req, res) => {
  try {
    const matches = await Match.find({})
      .populate('creator', 'username phone')
      .populate('joiner', 'username phone')
      .populate('winner', 'username phone')
      .populate('roomCodeSharedBy', 'username phone')
      .populate('cancelledBy', 'username phone')
      .sort({ createdAt: -1 })
      .limit(500)
      .lean();
    res.json({ matches });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/withdrawal-status', requireAdmin, async (req, res) => {
  const { withdrawalId, status } = req.body;
  if (!['PAID', 'REJECTED'].includes(status)) {
    return res.status(400).json({ error: 'Valid withdrawal status select karein' });
  }

  try {
    const withdrawal = await Withdraw.findById(withdrawalId);
    if (!withdrawal || withdrawal.status !== 'PENDING') {
      return res.status(400).json({ error: 'Withdrawal pending nahi hai' });
    }

    if (status === 'REJECTED') await ensureWinningsBalance(withdrawal.userId);
    withdrawal.status = status;
    await withdrawal.save();
    if (status === 'REJECTED') {
      const user = await User.findById(withdrawal.userId);
      if (user) {
        user.walletBalance += withdrawal.amount;
        user.winningsBalance = (Number(user.winningsBalance) || 0) + withdrawal.amount;
        await user.save();
        io.emit('wallet_updated', {
          userId: String(user._id),
          walletBalance: user.walletBalance,
          amountAdded: withdrawal.amount,
          reason: 'Withdrawal rejected, amount refunded'
        });
      }
    }
    res.json({ message: status === 'PAID' ? 'Withdrawal paid mark ho gaya' : 'Withdrawal reject aur refund ho gaya' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Real-time Sockets
io.on('connection', (socket) => {
  socket.on('register_player', async ({ token } = {}) => {
    try {
      const payload = jwt.verify(String(token || ''), JWT_SECRET);
      if (payload.role !== 'user' || !mongoose.Types.ObjectId.isValid(String(payload.userId || ''))) return;
      const user = await User.findById(payload.userId).select('isBlocked');
      if (user && !user.isBlocked) socket.join(`player:${String(user._id)}`);
    } catch {
      socket.disconnect(true);
    }
  });
  socket.on('join_match_room', async ({ matchId, token } = {}) => {
    try {
      if (!mongoose.Types.ObjectId.isValid(String(matchId || ''))) return;
      const payload = jwt.verify(String(token || ''), JWT_SECRET);
      if (payload.role !== 'user' || !mongoose.Types.ObjectId.isValid(String(payload.userId || ''))) return;
      const isPlayer = await Match.exists({
        _id: matchId,
        $or: [{ creator: payload.userId }, { joiner: payload.userId }]
      });
      if (isPlayer) socket.join(String(matchId));
    } catch {
      socket.disconnect(true);
    }
  });
});

const PORT = process.env.PORT || 5000;
const screenshotCleanupInterval = setInterval(() => {
  cleanupReviewedScreenshots().catch(error => {
    console.error('Could not process reviewed screenshot cleanup:', error);
  });
}, 5000);
screenshotCleanupInterval.unref();

const lanAddress = Object.values(os.networkInterfaces())
  .flatMap(addresses => addresses || [])
  .find(address => address.family === 'IPv4' && !address.internal)?.address;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://localhost:${PORT}`);
  if (lanAddress) console.log(`Mobile on same Wi-Fi: http://${lanAddress}:${PORT}`);
});
