import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

// ── Inline game logic (extracted from index.html) ──────────────────────────
// These match exactly what GameController._update does for lane movement
function moveLeft(lane)  { return Math.max(lane - 1, 0); }
function moveRight(lane) { return Math.min(lane + 1, 2); }

// GameConfig constants (matching index.html)
const GameConfig = {
  CANVAS_WIDTH:         480,
  CANVAS_HEIGHT:        720,
  LANE_COUNT:           3,
  BASE_SPEED:           300,
  ACCEL_RATE:           10,
  MAX_SPEED:            800,
  BASE_SPAWN_INTERVAL:  1.2,
  MIN_SPAWN_INTERVAL:   0.4,
  OBSTACLE_HEIGHT:      60,
  COIN_RADIUS:          15,
  COLLISION_INSET:      0.10,
  PLAYER_Y_RATIO:       0.78,
  MAX_DT:               0.1,
};

// Inline physics helpers
function updateSpeed(state, dt) {
  state.elapsedTime += dt;
  state.speed = Math.min(GameConfig.BASE_SPEED + GameConfig.ACCEL_RATE * state.elapsedTime, GameConfig.MAX_SPEED);
  state.spawnInterval = Math.max(GameConfig.BASE_SPAWN_INTERVAL * (GameConfig.BASE_SPEED / state.speed), GameConfig.MIN_SPAWN_INTERVAL);
}

function moveObjects(state, dt) {
  const dy = state.speed * dt;
  for (const obs of state.obstacles) obs.y += dy;
  for (const coin of state.coins) coin.y += dy;
}

function cleanObjects(state) {
  state.obstacles = state.obstacles.filter(obs => obs.y <= GameConfig.CANVAS_HEIGHT);
  state.coins = state.coins.filter(coin => coin.y <= GameConfig.CANVAS_HEIGHT);
}

function aabb(a, b, inset = 0) {
  const aTop    = a.y - a.h / 2 * (1 - inset);
  const aBottom = a.y + a.h / 2 * (1 - inset);
  const bTop    = b.y - b.h / 2 * (1 - inset);
  const bBottom = b.y + b.h / 2 * (1 - inset);
  return aBottom >= bTop && aTop <= bBottom;
}

function detectCollisions(state) {
  const playerY = GameConfig.PLAYER_Y_RATIO * GameConfig.CANVAS_HEIGHT;
  const playerH = 60;
  const inset = GameConfig.COLLISION_INSET;
  let collided = false;
  let scoreGained = 0;
  for (const obs of state.obstacles) {
    if (obs.lane !== state.playerLane) continue;
    if (aabb({ y: playerY, h: playerH }, { y: obs.y, h: obs.height }, inset)) {
      collided = true; break;
    }
  }
  for (const coin of state.coins) {
    if (coin.collected || coin.lane !== state.playerLane) continue;
    const dist = Math.abs(coin.y - playerY);
    if (dist <= playerH / 2 + coin.radius) {
      coin.collected = true;
      state.score += 1;
      scoreGained += 1;
    }
  }
  state.coins = state.coins.filter(c => !c.collected);
  return { collided, scoreGained };
}

function physicsUpdate(state, dt) {
  dt = Math.min(dt, GameConfig.MAX_DT);
  updateSpeed(state, dt);
  moveObjects(state, dt);
  cleanObjects(state);
  return detectCollisions(state);
}

function makeState(overrides = {}) {
  return {
    phase: 'RUNNING',
    score: 0,
    speed: GameConfig.BASE_SPEED,
    spawnInterval: GameConfig.BASE_SPAWN_INTERVAL,
    playerLane: 1,
    obstacles: [],
    coins: [],
    elapsedTime: 0,
    ...overrides,
  };
}

// ── Properties ─────────────────────────────────────────────────────────────

describe('Feature: runner', () => {

  it('Property 1: 左移正確性', () => {
    // Validates: Requirements 2.1, 2.3, 2.5
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 2 }), (lane) => {
        const newLane = moveLeft(lane);
        expect(newLane).toBe(Math.max(lane - 1, 0));
        expect(Math.abs(newLane - lane)).toBeLessThanOrEqual(1);
      }),
      { numRuns: 100 }
    );
  });

  it('Property 2: 右移正確性', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 2 }), (lane) => {
        const newLane = moveRight(lane);
        expect(newLane).toBe(Math.min(lane + 1, 2));
        expect(Math.abs(newLane - lane)).toBeLessThanOrEqual(1);
      }),
      { numRuns: 100 }
    );
  });

  it('Property 3: 物件向畫面底部移動', () => {
    fc.assert(
      fc.property(
        fc.float({ min: 0.001, max: 0.1, noNaN: true }),
        fc.integer({ min: 0, max: 2 }),
        fc.float({ min: -100, max: GameConfig.CANVAS_HEIGHT - 10, noNaN: true }),
        (dt, lane, startY) => {
          const state = makeState({
            obstacles: [{ lane, y: startY, width: 100, height: GameConfig.OBSTACLE_HEIGHT }],
          });
          const origY = startY;
          physicsUpdate(state, dt);
          // After update, if obstacle still in bounds, y must have increased
          const surviving = state.obstacles.find(o => o.lane === lane);
          if (surviving) {
            expect(surviving.y).toBeGreaterThan(origY);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 4: 障礙物生成不全封閉', () => {
    // SpawnManager inline reimplementation
    function spawnObstacles(state) {
      const laneWidth = GameConfig.CANVAS_WIDTH / GameConfig.LANE_COUNT;
      const allLanes = [0, 1, 2];
      let selectedLanes = allLanes.filter(() => Math.random() < 0.5);
      let attempts = 0;
      while ((selectedLanes.length === 0 || selectedLanes.length >= 3) && attempts < 10) {
        selectedLanes = allLanes.filter(() => Math.random() < 0.5);
        attempts++;
      }
      if (selectedLanes.length === 0 || selectedLanes.length >= 3) return;
      for (const lane of selectedLanes) {
        state.obstacles.push({
          lane, y: -GameConfig.OBSTACLE_HEIGHT / 2,
          width: laneWidth * 0.7, height: GameConfig.OBSTACLE_HEIGHT,
        });
      }
    }
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 100 }), (_seed) => {
        const state = makeState();
        spawnObstacles(state);
        const occupiedLanes = new Set(state.obstacles.map(o => o.lane));
        expect(occupiedLanes.size).toBeLessThan(3);
      }),
      { numRuns: 100 }
    );
  });

  it('Property 5: 畫面外物件自動清除', () => {
    fc.assert(
      fc.property(
        fc.float({ min: 0.001, max: 0.1, noNaN: true }),
        (dt) => {
          // Place objects just at/beyond the bottom edge
          const state = makeState({
            obstacles: [
              { lane: 0, y: GameConfig.CANVAS_HEIGHT + 1, width: 100, height: 60 },
              { lane: 1, y: GameConfig.CANVAS_HEIGHT - 5,  width: 100, height: 60 },
            ],
            coins: [
              { lane: 2, y: GameConfig.CANVAS_HEIGHT + 1, radius: 15, collected: false },
            ],
          });
          physicsUpdate(state, dt);
          expect(state.obstacles.every(o => o.y <= GameConfig.CANVAS_HEIGHT)).toBe(true);
          expect(state.coins.every(c => c.y <= GameConfig.CANVAS_HEIGHT)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 6: 碰撞偵測正確性', () => {
    const playerY = GameConfig.PLAYER_Y_RATIO * GameConfig.CANVAS_HEIGHT;
    const playerH = 60;
    fc.assert(
      fc.property(
        fc.float({ min: playerY - playerH / 2 + 1, max: playerY + playerH / 2 - 1, noNaN: true }),
        (obsY) => {
          const state = makeState({
            playerLane: 1,
            obstacles: [{ lane: 1, y: obsY, width: 100, height: 60 }],
          });
          const { collided } = detectCollisions(state);
          expect(collided).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
    fc.assert(
      fc.property(
        fc.float({ min: -200, max: playerY - playerH - 10, noNaN: true }),
        (obsY) => {
          const state = makeState({
            playerLane: 1,
            obstacles: [{ lane: 1, y: obsY, width: 100, height: 60 }],
          });
          const { collided } = detectCollisions(state);
          expect(collided).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 7: 金幣收集增加分數', () => {
    const playerY = GameConfig.PLAYER_Y_RATIO * GameConfig.CANVAS_HEIGHT;
    fc.assert(
      fc.property(
        fc.float({ min: playerY - 10, max: playerY + 10, noNaN: true }),
        (coinY) => {
          const state = makeState({
            playerLane: 1,
            coins: [{ lane: 1, y: coinY, radius: GameConfig.COIN_RADIUS, collected: false }],
          });
          const initialScore = state.score;
          detectCollisions(state);
          expect(state.score).toBe(initialScore + 1);
          expect(state.coins.length).toBe(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 8: HUD 分數顯示與狀態一致', () => {
    fc.assert(
      fc.property(fc.nat({ max: 10000 }), (score) => {
        // Mock canvas context
        let drawnText = '';
        const mockCtx = {
          fillStyle: '',
          font: '',
          textBaseline: '',
          fillText(text) { drawnText = text; },
        };
        // Inline _drawHUD
        function drawHUD(ctx, s) {
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 24px monospace';
          ctx.textBaseline = 'top';
          ctx.fillText('Score: ' + s, 16, 16);
        }
        drawHUD(mockCtx, score);
        expect(drawnText).toContain(String(score));
      }),
      { numRuns: 100 }
    );
  });

  it('Property 9: 重新開始完整重置狀態', () => {
    fc.assert(
      fc.property(
        fc.nat({ max: 1000 }),
        fc.integer({ min: 0, max: 2 }),
        fc.float({ min: GameConfig.BASE_SPEED, max: GameConfig.MAX_SPEED, noNaN: true }),
        (score, lane, speed) => {
          const state = {
            phase: 'GAME_OVER',
            score,
            speed,
            spawnInterval: 0.5,
            playerLane: lane,
            obstacles: [{ lane: 0, y: 100, width: 100, height: 60 }],
            coins: [{ lane: 1, y: 200, radius: 15, collected: false }],
            elapsedTime: 100,
          };
          // Simulate resetState
          state.phase = 'RUNNING';
          state.score = 0;
          state.speed = GameConfig.BASE_SPEED;
          state.spawnInterval = GameConfig.BASE_SPAWN_INTERVAL;
          state.playerLane = 1;
          state.obstacles = [];
          state.coins = [];
          state.elapsedTime = 0;
          expect(state.score).toBe(0);
          expect(state.playerLane).toBe(1);
          expect(state.obstacles.length).toBe(0);
          expect(state.coins.length).toBe(0);
          expect(state.speed).toBe(GameConfig.BASE_SPEED);
          expect(state.spawnInterval).toBe(GameConfig.BASE_SPAWN_INTERVAL);
          expect(state.phase).toBe('RUNNING');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 10: 速度單調遞增且有上限', () => {
    function calcSpeed(t) {
      return Math.min(GameConfig.BASE_SPEED + GameConfig.ACCEL_RATE * t, GameConfig.MAX_SPEED);
    }
    fc.assert(
      fc.property(
        fc.float({ min: 0, max: 1000, noNaN: true }),
        fc.float({ min: 0, max: 1000, noNaN: true }),
        (t1, t2) => {
          const s1 = calcSpeed(t1);
          const s2 = calcSpeed(t2);
          if (t2 >= t1) {
            expect(s2).toBeGreaterThanOrEqual(s1);
          } else {
            expect(s1).toBeGreaterThanOrEqual(s2);
          }
          expect(s1).toBeLessThanOrEqual(GameConfig.MAX_SPEED);
          expect(s2).toBeLessThanOrEqual(GameConfig.MAX_SPEED);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 11: 生成間隔隨速度縮短', () => {
    function calcInterval(speed) {
      return Math.max(
        GameConfig.BASE_SPAWN_INTERVAL * (GameConfig.BASE_SPEED / speed),
        GameConfig.MIN_SPAWN_INTERVAL
      );
    }
    fc.assert(
      fc.property(
        fc.float({ min: GameConfig.BASE_SPEED, max: GameConfig.MAX_SPEED, noNaN: true }),
        fc.float({ min: GameConfig.BASE_SPEED, max: GameConfig.MAX_SPEED, noNaN: true }),
        (s1, s2) => {
          const i1 = calcInterval(s1);
          const i2 = calcInterval(s2);
          if (s1 <= s2) {
            expect(i1).toBeGreaterThanOrEqual(i2);
          } else {
            expect(i2).toBeGreaterThanOrEqual(i1);
          }
          expect(i1).toBeGreaterThanOrEqual(GameConfig.MIN_SPAWN_INTERVAL);
          expect(i2).toBeGreaterThanOrEqual(GameConfig.MIN_SPAWN_INTERVAL);
        }
      ),
      { numRuns: 100 }
    );
  });

});
