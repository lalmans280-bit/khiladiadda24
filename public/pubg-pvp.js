const crypto = require('crypto');

const MAP_WIDTH = 2400;
const MAP_HEIGHT = 1800;
const TICK_MS = 50;
const MAX_MATCH_SECONDS = 210;

function isFiniteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

class PubgPvpService {
  constructor(io, authenticate) {
    this.io = io;
    this.authenticate = authenticate;
    this.waiting = [];
    this.queuedUsers = new Map();
    this.userSockets = new Map();
    this.matches = new Map();
    this.socketMatches = new Map();
    this.tick = setInterval(() => this.update(), TICK_MS);
    this.tick.unref();
  }

  attach(socket) {
    socket.on('pubg:queue', (payload, acknowledge) => {
      void this.queue(socket, acknowledge);
    });
    socket.on('pubg:input', input => this.acceptInput(socket, input));
    socket.on('pubg:leave', acknowledge => {
      this.leave(socket);
      if (typeof acknowledge === 'function') acknowledge({ ok: true });
    });
    socket.on('disconnect', () => this.leave(socket));
  }

  async queue(socket, acknowledge) {
    const reply = typeof acknowledge === 'function' ? acknowledge : () => {};
    try {
      const user = await this.authenticate(String(socket.handshake.auth?.token || ''));
      if (!user || user.blocked) {
        reply({ ok: false, error: 'Player login required.' });
        return;
      }

      const activeSocketId = this.userSockets.get(user.id);
      if (activeSocketId && activeSocketId !== socket.id) {
        reply({ ok: false, error: 'This player account is already in a PUBG match.' });
        return;
      }
      if (this.socketMatches.has(socket.id)) {
        reply({ ok: false, error: 'You are already in a match.' });
        return;
      }
      if (this.queuedUsers.has(user.id)) {
        reply({ ok: false, error: 'This player is already waiting for an opponent.' });
        return;
      }

      socket.data.pubgPlayer = {
        id: user.id,
        name: String(user.name || 'Player').slice(0, 40)
      };
      this.userSockets.set(user.id, socket.id);

      let opponent;
      while (this.waiting.length && !opponent) {
        const candidate = this.waiting.shift();
        if (candidate.connected && candidate.data.pubgPlayer && !this.socketMatches.has(candidate.id)) {
          opponent = candidate;
        }
      }

      if (!opponent) {
        this.waiting.push(socket);
        this.queuedUsers.set(user.id, socket.id);
        reply({ ok: true, status: 'queued' });
        socket.emit('pubg:queued');
        return;
      }

      this.queuedUsers.delete(opponent.data.pubgPlayer.id);
      this.startMatch(opponent, socket);
      reply({ ok: true, status: 'matched' });
    } catch (error) {
      console.error('PUBG PvP matchmaking failed:', error);
      reply({ ok: false, error: 'Could not join matchmaking. Please try again.' });
    }
  }

  createObstacles() {
    const obstacles = [];
    let seed = crypto.randomBytes(4).readUInt32LE(0);
    const random = () => {
      seed = (1664525 * seed + 1013904223) >>> 0;
      return seed / 0x100000000;
    };
    for (let attempt = 0; attempt < 160 && obstacles.length < 65; attempt += 1) {
      const building = random() < 0.32;
      const width = 72 + random() * 64;
      const height = 60 + random() * 54;
      const obstacle = building
        ? { type: 'building', x: 55 + random() * (MAP_WIDTH - width - 110), y: 55 + random() * (MAP_HEIGHT - height - 110), width, height }
        : { type: 'tree', x: 35 + random() * (MAP_WIDTH - 70), y: 35 + random() * (MAP_HEIGHT - 70), radius: 17 + random() * 12 };
      const centerX = obstacle.x + (obstacle.width || 0) / 2;
      const centerY = obstacle.y + (obstacle.height || 0) / 2;
      if (Math.hypot(centerX - MAP_WIDTH / 2, centerY - MAP_HEIGHT / 2) < 190) continue;
      const overlaps = obstacles.some(other => {
        const otherX = other.x + (other.width || 0) / 2;
        const otherY = other.y + (other.height || 0) / 2;
        return Math.hypot(centerX - otherX, centerY - otherY) < 95;
      });
      if (!overlaps) obstacles.push(obstacle);
    }
    return obstacles;
  }

  startMatch(firstSocket, secondSocket) {
    const id = crypto.randomUUID();
    const obstacles = this.createObstacles();
    const [firstSpawn, secondSpawn] = this.findSpawnPoints(obstacles);
    const match = {
      id,
      startedAt: Date.now(),
      elapsed: 0,
      zoneRadius: 1080,
      obstacles,
      bullets: [],
      finished: false,
      players: [
        this.createPlayer(firstSocket, firstSpawn.x, firstSpawn.y),
        this.createPlayer(secondSocket, secondSpawn.x, secondSpawn.y)
      ]
    };
    this.matches.set(id, match);
    for (const player of match.players) {
      this.socketMatches.set(player.socketId, id);
      player.socket.join(`pubg:${id}`);
      player.socket.emit('pubg:matched', {
        matchId: id,
        selfId: player.id,
        mapWidth: MAP_WIDTH,
        mapHeight: MAP_HEIGHT,
        obstacles: match.obstacles,
        players: this.publicPlayers(match)
      });
    }
  }

  findSpawnPoints(obstacles) {
    const centerX = MAP_WIDTH / 2;
    const centerY = MAP_HEIGHT / 2;
    for (const distance of [230, 270, 320, 380, 440]) {
      for (let step = 0; step < 16; step += 1) {
        const angle = (Math.PI * 2 * step) / 16;
        const first = {
          x: centerX + Math.cos(angle) * distance,
          y: centerY + Math.sin(angle) * distance
        };
        const second = {
          x: centerX - Math.cos(angle) * distance,
          y: centerY - Math.sin(angle) * distance
        };
        if (!this.collides(first.x, first.y, 15, obstacles) && !this.collides(second.x, second.y, 15, obstacles)) return [first, second];
      }
    }
    throw new Error('No safe player spawn points found for the generated map.');
  }

  createPlayer(socket, x, y) {
    const profile = socket.data.pubgPlayer;
    return {
      id: profile.id,
      name: profile.name,
      socketId: socket.id,
      socket,
      x,
      y,
      radius: 15,
      health: 100,
      angle: 0,
      moveX: 0,
      moveY: 0,
      aimAngle: 0,
      firing: false,
      lastInputAt: 0,
      shotCooldown: 0
    };
  }

  publicPlayers(match) {
    return match.players.map(player => ({
      id: player.id,
      name: player.name,
      x: player.x,
      y: player.y,
      health: Math.max(0, player.health),
      angle: player.angle,
      radius: player.radius
    }));
  }

  acceptInput(socket, input) {
    const matchId = this.socketMatches.get(socket.id);
    const match = this.matches.get(matchId);
    if (!match || match.finished || !input || typeof input !== 'object') return;
    const player = match.players.find(candidate => candidate.socketId === socket.id);
    if (!player || player.health <= 0) return;

    const now = Date.now();
    if (now - player.lastInputAt < 25) return;
    player.lastInputAt = now;
    if (!isFiniteNumber(input.moveX) || !isFiniteNumber(input.moveY) || !isFiniteNumber(input.aimAngle)) return;
    player.moveX = Math.max(-1, Math.min(1, input.moveX));
    player.moveY = Math.max(-1, Math.min(1, input.moveY));
    const magnitude = Math.hypot(player.moveX, player.moveY);
    if (magnitude > 1) {
      player.moveX /= magnitude;
      player.moveY /= magnitude;
    }
    player.aimAngle = Math.atan2(Math.sin(input.aimAngle), Math.cos(input.aimAngle));
    player.firing = input.fire === true;
  }

  collides(x, y, radius, obstacles) {
    if (x - radius < 0 || y - radius < 0 || x + radius > MAP_WIDTH || y + radius > MAP_HEIGHT) return true;
    return obstacles.some(obstacle => {
      if (obstacle.type === 'building') {
        const closestX = Math.max(obstacle.x, Math.min(x, obstacle.x + obstacle.width));
        const closestY = Math.max(obstacle.y, Math.min(y, obstacle.y + obstacle.height));
        return Math.hypot(x - closestX, y - closestY) < radius;
      }
      return Math.hypot(x - obstacle.x, y - obstacle.y) < radius + obstacle.radius * 0.72;
    });
  }

  move(player, dx, dy, match) {
    const nextX = Math.max(player.radius, Math.min(MAP_WIDTH - player.radius, player.x + dx));
    if (!this.collides(nextX, player.y, player.radius, match.obstacles)) player.x = nextX;
    const nextY = Math.max(player.radius, Math.min(MAP_HEIGHT - player.radius, player.y + dy));
    if (!this.collides(player.x, nextY, player.radius, match.obstacles)) player.y = nextY;
  }

  canSee(start, end, obstacles) {
    const distance = Math.hypot(end.x - start.x, end.y - start.y);
    const steps = Math.ceil(distance / 20);
    for (let index = 1; index < steps; index += 1) {
      const progress = index / steps;
      if (this.collides(start.x + (end.x - start.x) * progress, start.y + (end.y - start.y) * progress, 2, obstacles)) return false;
    }
    return true;
  }

  update() {
    const now = Date.now();
    for (const match of this.matches.values()) {
      if (match.finished) continue;
      const dt = Math.min(0.1, Math.max(0.01, (now - match.startedAt - match.elapsed * 1000) / 1000));
      match.elapsed += dt;
      const progress = Math.min(1, match.elapsed / MAX_MATCH_SECONDS);
      match.zoneRadius = Math.max(0, 1080 - progress * 1080);

      for (const player of match.players) {
        if (player.health <= 0) continue;
        const moveX = player.moveX;
        const moveY = player.moveY;
        this.move(player, moveX * 190 * dt, moveY * 190 * dt, match);
        player.angle = player.aimAngle;
        const distanceFromCenter = Math.hypot(player.x - MAP_WIDTH / 2, player.y - MAP_HEIGHT / 2);
        if (distanceFromCenter > match.zoneRadius) player.health -= 7 * dt;
        player.shotCooldown -= dt;
        if (player.firing && player.shotCooldown <= 0) {
          const target = match.players.find(other => other !== player && other.health > 0);
          if (target && this.canSee(player, target, match.obstacles)) {
            match.bullets.push({
              x: player.x + Math.cos(player.angle) * 21,
              y: player.y + Math.sin(player.angle) * 21,
              vx: Math.cos(player.angle) * 590,
              vy: Math.sin(player.angle) * 590,
              ownerId: player.id,
              life: 1.3
            });
          }
          player.shotCooldown = 0.28;
        }
      }

      for (let index = match.bullets.length - 1; index >= 0; index -= 1) {
        const bullet = match.bullets[index];
        bullet.x += bullet.vx * dt;
        bullet.y += bullet.vy * dt;
        bullet.life -= dt;
        if (bullet.life <= 0 || this.collides(bullet.x, bullet.y, 3, match.obstacles)) {
          match.bullets.splice(index, 1);
          continue;
        }
        const target = match.players.find(player => player.id !== bullet.ownerId && player.health > 0);
        if (target && Math.hypot(target.x - bullet.x, target.y - bullet.y) < target.radius + 4) {
          target.health = Math.max(0, target.health - 22);
          match.bullets.splice(index, 1);
        }
      }

      const alive = match.players.filter(player => player.health > 0);
      if (alive.length < 2) {
        this.finish(match, alive.length === 1 ? alive[0].id : null, alive.length === 1 ? 'elimination' : 'draw');
        continue;
      }
      if (match.elapsed >= MAX_MATCH_SECONDS) {
        const [first, second] = match.players;
        const winnerId = first.health === second.health ? null : first.health > second.health ? first.id : second.id;
        this.finish(match, winnerId, winnerId ? 'time-limit' : 'draw');
        continue;
      }
      this.io.to(`pubg:${match.id}`).emit('pubg:state', {
        elapsed: match.elapsed,
        zoneRadius: match.zoneRadius,
        players: this.publicPlayers(match),
        bullets: match.bullets.map(({ x, y, ownerId }) => ({ x, y, ownerId }))
      });
    }
  }

  finish(match, winnerId, reason) {
    if (match.finished) return;
    match.finished = true;
    this.io.to(`pubg:${match.id}`).emit('pubg:ended', {
      winnerId,
      reason,
      players: this.publicPlayers(match),
      cashEnabled: false
    });
    for (const player of match.players) {
      player.socket.leave(`pubg:${match.id}`);
      this.socketMatches.delete(player.socketId);
      if (this.userSockets.get(player.id) === player.socketId) this.userSockets.delete(player.id);
    }
    setTimeout(() => this.deleteMatch(match), 30_000).unref();
  }

  leave(socket) {
    const user = socket.data.pubgPlayer;
    if (user && this.userSockets.get(user.id) === socket.id) this.userSockets.delete(user.id);
    if (user && this.queuedUsers.get(user.id) === socket.id) this.queuedUsers.delete(user.id);
    this.waiting = this.waiting.filter(candidate => candidate.id !== socket.id);
    const matchId = this.socketMatches.get(socket.id);
    const match = this.matches.get(matchId);
    if (match && !match.finished) this.finish(match, null, 'disconnect');
    if (match) {
      socket.leave(`pubg:${match.id}`);
      this.socketMatches.delete(socket.id);
      if (match.finished && match.players.every(player => !this.socketMatches.has(player.socketId))) this.deleteMatch(match);
    }
    delete socket.data.pubgPlayer;
  }

  deleteMatch(match) {
    if (this.matches.get(match.id) !== match) return;
    for (const player of match.players) {
      this.socketMatches.delete(player.socketId);
      if (this.userSockets.get(player.id) === player.socketId) this.userSockets.delete(player.id);
    }
    this.matches.delete(match.id);
  }

  close() {
    clearInterval(this.tick);
    for (const match of this.matches.values()) this.finish(match, null, 'server-shutdown');
  }
}

module.exports = PubgPvpService;
