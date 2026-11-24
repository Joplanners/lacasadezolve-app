import { audioEngine } from './audio';
import { getMemberById, MEMBERS, type MemberId, type MemberProfile } from './characters';
import {
  calculateFinalScoreAndRank,
  type CutInEvent,
  type GameAct,
  type GameScreenState,
  type HudSnapshot,
} from './types';

interface Vec2 {
  x: number;
  y: number;
}

interface PlayerState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  facingX: number;
  facingY: number;
  angle: number;
  radius: number;
  hp: number;
  maxHp: number;
  pressure: number; // 0..100
  specialCharge: number; // 0..100
  attackCooldown: number;
  invulnTimer: number;
  dashTimer: number;
  dashVx: number;
  dashVy: number;
  pressureFreezeTimer: number; // Chan special
  timeFreezeTimer: number; // Felix special
  speedBoostTimer: number; // Hyunjin special
  foxSenseTimer: number; // Jeongin special
  shieldHits: number; // Chan / Jeongin shield
  squashX: number;
  squashY: number;
  hitFlash: number;
  swimPhase: number;
}

interface TeammateFollower {
  member: MemberProfile;
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  swimPhase: number;
  attackFlash: number;
}

interface TrappedSphere {
  member: MemberProfile;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  radius: number;
  pulsePhase: number;
  hitFlash: number;
  rescued: boolean;
}

type EnemyKind = 'JELLY' | 'SHADOW';

interface Enemy {
  id: number;
  kind: EnemyKind;
  x: number;
  y: number;
  vx: number;
  vy: number;
  hp: number;
  maxHp: number;
  radius: number;
  phase: number;
  state: 'IDLE' | 'WINDUP' | 'ACTION';
  stateTimer: number;
  targetX: number;
  targetY: number;
  frozenTimer: number; // Hyunjin special
  slowTimer: number; // Felix special
  hitFlash: number;
  shockRadius: number;
}

interface FallingRock {
  id: number;
  x: number;
  y: number;
  vy: number;
  radius: number;
  rotation: number;
  rotSpeed: number;
  hp: number;
  warningTimer: number; // >0 means telegraphing before falling
  spawnY: number;
  vertices: number[];
}

interface CurrentStream {
  x: number;
  y: number;
  w: number;
  h: number;
  dirX: number;
  dirY: number;
  strength: number;
  phase: number;
}

interface Collectible {
  id: number;
  kind: 'BUBBLE' | 'PEARL';
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  phase: number;
  collected: boolean;
}

interface Projectile {
  id: number;
  fromPlayer: boolean;
  kind: 'SLASH_WAVE' | 'RHYTHM_ORB' | 'CRYSTAL_HOMING' | 'TEAM_BOLT' | 'BOSS_ORB';
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  damage: number;
  color: string;
  life: number;
  maxLife: number;
  homing?: boolean;
  pierce?: boolean;
}

interface ShockRing {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  speed: number;
  color: string;
  fromBoss: boolean;
  gapAngle: number;
  gapHalfWidth: number;
  thickness: number;
  hitPlayer?: boolean;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  outline: boolean;
  life: number;
  maxLife: number;
  shape: 'CIRCLE' | 'SHARD' | 'DROPLET' | 'STAR' | 'RING';
  rotation: number;
  rotSpeed: number;
}

interface MangaSlash {
  x: number;
  y: number;
  angle: number;
  radius: number;
  color: string;
  life: number;
  maxLife: number;
  onBeat: boolean;
}

interface FloatingText {
  x: number;
  y: number;
  vy: number;
  text: string;
  color: string;
  scale: number;
  life: number;
  maxLife: number;
}

interface BossState {
  active: boolean;
  x: number;
  y: number;
  homeX: number;
  homeY: number;
  hp: number;
  maxHp: number;
  radius: number;
  angle: number;
  hitFlash: number;
  phase: number;
  attackPattern: 'IDLE' | 'PRESSURE_WAVES' | 'ROCK_RAIN' | 'BEAM_WINDUP' | 'BEAM_FIRE';
  patternTimer: number;
  beamAngle: number;
  beamSweepDir: number;
  waveCount: number;
  rockTimer: number;
  frozenTimer: number;
  slowTimer: number;
}

interface IntroDebris {
  x: number;
  y: number;
  vx: number;
  vy: number;
  w: number;
  h: number;
  rot: number;
  vrot: number;
}

const WORLD_W = 2800;
const WORLD_H = 1900;
const INITIAL_TIME = 165; // ~2m45s like an intense anime OP / Suiatsu track
const BOSS_ARENA = { x: 820, y: 860, w: 1160, h: 860 };

export interface EngineCallbacks {
  onHudUpdate: (snapshot: HudSnapshot) => void;
  onCutIn: (event: CutInEvent) => void;
  onScreenChange: (screen: GameScreenState) => void;
}

export class SuiatsuGameEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private callbacks: EngineCallbacks;

  private rafId: number | null = null;
  private lastTimestamp = 0;
  private hudSyncAccum = 0;
  private nextId = 1;
  private cutInSeq = 1;

  private screen: GameScreenState = 'TITLE_MENU';
  private act: GameAct = 'INTRO';
  private selectedMember: MemberProfile = MEMBERS[0];

  private width = 1280;
  private height = 720;
  private camX = WORLD_W / 2;
  private camY = WORLD_H / 2;
  private shakeMag = 0;
  private hitstopTimer = 0;
  private flashAlpha = 0;
  private flashColor = '#ffffff';
  private elapsed = 0;

  // Input state: separated held vs edge-triggered with input buffer + virtual joystick
  private heldKeys = new Set<string>();
  private virtualMoveX = 0;
  private virtualMoveY = 0;
  private attackBuffer = 0;
  private specialBuffer = 0;

  // Story timers
  private introTimer = 0;
  private introCaption = '';
  private introDebris: IntroDebris[] = [];
  private introQuakeSoundPlayed = false;
  private bossIntroTimer = 0;
  private endingTimer = 0;
  private endingDroplets: Array<{ x: number; y: number; r: number; speed: number; shimmer: number }> = [];

  // Gameplay counters
  private timeLeft = INITIAL_TIME;
  private pearls = 0;
  private combatScore = 0;
  private combo = 0;
  private comboTimer = 0;
  private maxCombo = 0;
  private epicCombos = 0;
  private lastEpicMilestone = 0;
  private gameOverReason = '';

  // Entities
  private player: PlayerState;
  private followers: TeammateFollower[] = [];
  private spheres: TrappedSphere[] = [];
  private enemies: Enemy[] = [];
  private rocks: FallingRock[] = [];
  private currents: CurrentStream[] = [];
  private collectibles: Collectible[] = [];
  private projectiles: Projectile[] = [];
  private shockRings: ShockRing[] = [];
  private particles: Particle[] = [];
  private slashes: MangaSlash[] = [];
  private floatingTexts: FloatingText[] = [];
  private boss: BossState;

  // Timers for dynamic spawns
  private rockSpawnTimer = 3.5;
  private bubbleSpawnTimer = 2.0;
  private enemyRespawnTimer = 6.0;
  private jisungBurstTimer = 0;
  private jisungBurstLeft = 0;

  // Preloaded portrait images for trapped spheres & effects
  private portraitImages = new Map<MemberId, HTMLImageElement>();

  // Ambient title bubbles
  private bgBubbles: Array<{ x: number; y: number; r: number; vy: number; phase: number }> = [];
  private kelpStalks: Array<{ x: number; y: number; h: number; sway: number; color: string }> = [];
  private ruins: Array<{ x: number; y: number; w: number; h: number; tilt: number }> = [];

  constructor(canvas: HTMLCanvasElement, callbacks: EngineCallbacks) {
    this.canvas = canvas;
    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('Canvas 2D context unavailable');
    }
    this.ctx = context;
    this.callbacks = callbacks;

    this.player = this.createInitialPlayer(MEMBERS[0]);
    this.boss = this.createInitialBoss();

    this.preloadPortraits();
    this.initScenery();
    this.handleResize();
    this.bindEvents();
  }

  private preloadPortraits(): void {
    for (const m of MEMBERS) {
      const img = new Image();
      img.src = m.portrait;
      this.portraitImages.set(m.id, img);
    }
  }

  private initScenery(): void {
    this.bgBubbles = [];
    for (let i = 0; i < 65; i++) {
      this.bgBubbles.push({
        x: Math.random() * WORLD_W,
        y: Math.random() * WORLD_H,
        r: 4 + Math.random() * 14,
        vy: 18 + Math.random() * 38,
        phase: Math.random() * Math.PI * 2,
      });
    }

    this.kelpStalks = [];
    for (let i = 0; i < 42; i++) {
      this.kelpStalks.push({
        x: 80 + (i / 42) * (WORLD_W - 160) + (Math.random() - 0.5) * 60,
        y: WORLD_H - 30 - Math.random() * 140,
        h: 120 + Math.random() * 210,
        sway: Math.random() * Math.PI * 2,
        color: i % 2 === 0 ? '#0b3b49' : '#0f4c5c',
      });
    }

    this.ruins = [
      { x: 320, y: 1620, w: 110, h: 310, tilt: -0.09 },
      { x: 640, y: 1580, w: 90, h: 360, tilt: 0.06 },
      { x: 1180, y: 1670, w: 140, h: 250, tilt: -0.04 },
      { x: 1680, y: 1640, w: 125, h: 290, tilt: 0.08 },
      { x: 2150, y: 1560, w: 105, h: 370, tilt: -0.07 },
      { x: 2490, y: 1610, w: 130, h: 320, tilt: 0.05 },
    ];
  }

  private createInitialPlayer(member: MemberProfile): PlayerState {
    return {
      x: WORLD_W / 2,
      y: 340,
      vx: 0,
      vy: 0,
      facingX: 1,
      facingY: 0,
      angle: 0,
      radius: 24,
      hp: member.maxHp,
      maxHp: member.maxHp,
      pressure: 8,
      specialCharge: 45, // Start nearly half-charged so players feel their power quickly!
      attackCooldown: 0,
      invulnTimer: 0,
      dashTimer: 0,
      dashVx: 0,
      dashVy: 0,
      pressureFreezeTimer: 0,
      timeFreezeTimer: 0,
      speedBoostTimer: 0,
      foxSenseTimer: 0,
      shieldHits: 0,
      squashX: 1,
      squashY: 1,
      hitFlash: 0,
      swimPhase: 0,
    };
  }

  private createInitialBoss(): BossState {
    return {
      active: false,
      x: BOSS_ARENA.x + BOSS_ARENA.w / 2,
      y: BOSS_ARENA.y + BOSS_ARENA.h / 2 - 40,
      homeX: BOSS_ARENA.x + BOSS_ARENA.w / 2,
      homeY: BOSS_ARENA.y + BOSS_ARENA.h / 2 - 40,
      hp: 1600,
      maxHp: 1600,
      radius: 82,
      angle: 0,
      hitFlash: 0,
      phase: 1,
      attackPattern: 'IDLE',
      patternTimer: 1.4,
      beamAngle: 0,
      beamSweepDir: 1,
      waveCount: 0,
      rockTimer: 0,
      frozenTimer: 0,
      slowTimer: 0,
    };
  }

  private handleResize = (): void => {
    const parent = this.canvas.parentElement;
    const w = parent ? parent.clientWidth : window.innerWidth;
    const h = parent ? parent.clientHeight : window.innerHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.width = Math.max(320, w);
    this.height = Math.max(240, h);
    this.canvas.width = Math.floor(this.width * dpr);
    this.canvas.height = Math.floor(this.height * dpr);
    this.canvas.style.width = `${this.width}px`;
    this.canvas.style.height = `${this.height}px`;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };

  private handleKeyDown = (e: KeyboardEvent): void => {
    const code = e.code;
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(code)) {
      e.preventDefault();
    }

    if (code === 'Escape') {
      if (this.screen === 'PLAYING') {
        this.setPaused(true);
      } else if (this.screen === 'PAUSED') {
        this.setPaused(false);
      }
      return;
    }

    if (this.screen === 'INTRO_QUAKE' && (code === 'Space' || code === 'Enter')) {
      this.finishIntroToExplore();
      return;
    }

    if (this.screen === 'PLAYING') {
      audioEngine.unlock();
      if (!this.heldKeys.has(code)) {
        if (code === 'Space' || code === 'KeyJ') {
          this.attackBuffer = 0.16;
        }
        if (code === 'ShiftLeft' || code === 'ShiftRight' || code === 'KeyE' || code === 'KeyK') {
          this.specialBuffer = 0.18;
        }
      }
    }

    this.heldKeys.add(code);
  };

  private handleKeyUp = (e: KeyboardEvent): void => {
    this.heldKeys.delete(e.code);
  };

  private handleBlur = (): void => {
    this.heldKeys.clear();
    this.virtualMoveX = 0;
    this.virtualMoveY = 0;
  };

  private bindEvents(): void {
    window.addEventListener('resize', this.handleResize);
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    window.addEventListener('blur', this.handleBlur);
  }

  public destroy(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    window.removeEventListener('resize', this.handleResize);
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    window.removeEventListener('blur', this.handleBlur);
    audioEngine.setMusicMode('OFF');
  }

  public startLoop(): void {
    if (this.rafId !== null) return;
    this.lastTimestamp = performance.now();
    const tick = (now: number) => {
      const rawDt = (now - this.lastTimestamp) / 1000;
      this.lastTimestamp = now;
      const dt = Math.min(Math.max(rawDt, 0), 0.05);
      try {
        this.update(dt);
        this.render();
      } catch (err) {
        console.error('Suiatsu loop error:', err);
      }
      this.rafId = requestAnimationFrame(tick);
    };
    this.rafId = requestAnimationFrame(tick);
  }

  public setScreenMode(screen: GameScreenState): void {
    this.screen = screen;
    if (screen === 'TITLE_MENU' || screen === 'CHAR_SELECT') {
      audioEngine.setMusicMode('TITLE');
    }
    this.callbacks.onScreenChange(screen);
    this.pushHudSnapshot();
  }

  public setPaused(paused: boolean): void {
    if (paused && this.screen === 'PLAYING') {
      this.screen = 'PAUSED';
      this.heldKeys.clear();
      this.virtualMoveX = 0;
      this.virtualMoveY = 0;
      this.callbacks.onScreenChange('PAUSED');
      this.pushHudSnapshot();
    } else if (!paused && this.screen === 'PAUSED') {
      this.screen = 'PLAYING';
      this.callbacks.onScreenChange('PLAYING');
      this.pushHudSnapshot();
    }
  }

  public setVirtualMove(dx: number, dy: number): void {
    this.virtualMoveX = Math.max(-1, Math.min(1, dx));
    this.virtualMoveY = Math.max(-1, Math.min(1, dy));
  }

  public showVictoryScorecard(): void {
    if (this.screen === 'VICTORY_FREEZE') {
      this.screen = 'VICTORY';
      this.callbacks.onScreenChange('VICTORY');
      this.pushHudSnapshot();
    }
  }

  public showVictoryFreeze(): void {
    if (this.screen === 'VICTORY') {
      this.screen = 'VICTORY_FREEZE';
      this.callbacks.onScreenChange('VICTORY_FREEZE');
      this.pushHudSnapshot();
    }
  }

  public triggerTouchAction(action: 'ATTACK' | 'SPECIAL'): void {
    if (this.screen === 'INTRO_QUAKE') {
      this.finishIntroToExplore();
      return;
    }
    if (this.screen !== 'PLAYING') return;
    audioEngine.unlock();
    if (action === 'ATTACK') this.attackBuffer = 0.16;
    if (action === 'SPECIAL') this.specialBuffer = 0.18;
  }

  public startNewGame(memberId: MemberId): void {
    audioEngine.unlock();
    this.selectedMember = getMemberById(memberId);
    this.player = this.createInitialPlayer(this.selectedMember);
    this.boss = this.createInitialBoss();

    this.followers = [];
    this.projectiles = [];
    this.shockRings = [];
    this.particles = [];
    this.slashes = [];
    this.floatingTexts = [];
    this.rocks = [];
    this.enemies = [];
    this.collectibles = [];
    this.heldKeys.clear();
    this.virtualMoveX = 0;
    this.virtualMoveY = 0;

    this.timeLeft = INITIAL_TIME;
    this.pearls = 0;
    this.combatScore = 0;
    this.combo = 0;
    this.comboTimer = 0;
    this.maxCombo = 0;
    this.epicCombos = 0;
    this.lastEpicMilestone = 0;
    this.gameOverReason = '';
    this.shakeMag = 0;
    this.hitstopTimer = 0;
    this.flashAlpha = 0;
    this.jisungBurstLeft = 0;
    this.jisungBurstTimer = 0;

    this.populateWorld();

    // Begin Act 1: Coastal Earthquake Intro!
    this.screen = 'INTRO_QUAKE';
    this.act = 'INTRO';
    this.introTimer = 0;
    this.introQuakeSoundPlayed = false;
    this.introCaption = 'Muelle Costero — Los Perdidos antes de la ruptura...';
    this.introDebris = [];
    for (let i = 0; i < 24; i++) {
      this.introDebris.push({
        x: (i / 24) * 1400,
        y: 0,
        vx: (Math.random() - 0.5) * 260,
        vy: -140 - Math.random() * 240,
        w: 22 + Math.random() * 34,
        h: 10 + Math.random() * 14,
        rot: Math.random() * Math.PI,
        vrot: (Math.random() - 0.5) * 8,
      });
    }

    audioEngine.setMusicMode('EXPLORE');
    this.callbacks.onScreenChange('INTRO_QUAKE');
    this.pushHudSnapshot();
  }

  public skipIntro(): void {
    if (this.screen === 'INTRO_QUAKE') {
      this.finishIntroToExplore();
    }
  }

  private finishIntroToExplore(): void {
    this.screen = 'PLAYING';
    this.act = 'EXPLORE';
    this.camX = this.player.x;
    this.camY = this.player.y;
    this.flashAlpha = 0.7;
    this.flashColor = '#38bdf8';
    this.shakeMag = 10;
    this.callbacks.onScreenChange('PLAYING');
    this.pushHudSnapshot();
  }

  private populateWorld(): void {
    // 7 other members trapped in dark spheres across distinct underwater zones
    const others = MEMBERS.filter((m) => m.id !== this.selectedMember.id);
    const sphereCoords: Vec2[] = [
      { x: 640, y: 480 },
      { x: 2180, y: 460 },
      { x: 430, y: 1120 },
      { x: 2380, y: 1100 },
      { x: 760, y: 1620 },
      { x: 2040, y: 1620 },
      { x: 1400, y: 1520 },
    ];

    this.spheres = others.map((member, idx) => ({
      member,
      x: sphereCoords[idx].x,
      y: sphereCoords[idx].y,
      hp: 75,
      maxHp: 75,
      radius: 42,
      pulsePhase: idx * 0.9,
      hitFlash: 0,
      rescued: false,
    }));

    // Active underwater current streams
    this.currents = [
      { x: 820, y: 520, w: 460, h: 110, dirX: 1, dirY: 0.12, strength: 215, phase: 0 },
      { x: 1520, y: 760, w: 520, h: 115, dirX: -1, dirY: 0.15, strength: 225, phase: 1.5 },
      { x: 520, y: 1220, w: 480, h: 110, dirX: 0.9, dirY: -0.25, strength: 210, phase: 2.3 },
      { x: 1840, y: 1320, w: 480, h: 110, dirX: -0.92, dirY: -0.2, strength: 220, phase: 3.1 },
      { x: 1120, y: 1080, w: 120, h: 340, dirX: 0.1, dirY: 1, strength: 195, phase: 0.8 },
    ];

    // Enemies: Electric Jellyfish & Shadow Creatures
    const jellySpots: Vec2[] = [
      { x: 880, y: 420 },
      { x: 1920, y: 450 },
      { x: 560, y: 920 },
      { x: 2220, y: 920 },
      { x: 1040, y: 1340 },
      { x: 1760, y: 1340 },
      { x: 1400, y: 940 },
      { x: 1400, y: 1680 },
    ];
    for (const pt of jellySpots) {
      this.spawnEnemy('JELLY', pt.x, pt.y);
    }

    const shadowSpots: Vec2[] = [
      { x: 510, y: 650 },
      { x: 2280, y: 680 },
      { x: 880, y: 1540 },
      { x: 1920, y: 1540 },
      { x: 1240, y: 740 },
      { x: 1600, y: 1200 },
    ];
    for (const pt of shadowSpots) {
      this.spawnEnemy('SHADOW', pt.x, pt.y);
    }

    // Oxygen Bubbles (22 spread across depths)
    for (let i = 0; i < 22; i++) {
      this.collectibles.push({
        id: this.nextId++,
        kind: 'BUBBLE',
        x: 240 + Math.random() * (WORLD_W - 480),
        y: 260 + Math.random() * (WORLD_H - 460),
        vx: 0,
        vy: -14 - Math.random() * 14,
        radius: 19,
        phase: Math.random() * Math.PI * 2,
        collected: false,
      });
    }

    // Luminous Pearls (44 placed in scenic arcs & near objectives)
    for (let i = 0; i < 44; i++) {
      this.collectibles.push({
        id: this.nextId++,
        kind: 'PEARL',
        x: 220 + Math.random() * (WORLD_W - 440),
        y: 240 + Math.random() * (WORLD_H - 420),
        vx: 0,
        vy: 0,
        radius: 13,
        phase: Math.random() * Math.PI * 2,
        collected: false,
      });
    }
  }

  private spawnEnemy(kind: EnemyKind, x: number, y: number): void {
    this.enemies.push({
      id: this.nextId++,
      kind,
      x,
      y,
      vx: 0,
      vy: 0,
      hp: kind === 'JELLY' ? 54 : 68,
      maxHp: kind === 'JELLY' ? 54 : 68,
      radius: kind === 'JELLY' ? 27 : 26,
      phase: Math.random() * Math.PI * 2,
      state: 'IDLE',
      stateTimer: 1.2 + Math.random() * 1.4,
      targetX: x,
      targetY: y,
      frozenTimer: 0,
      slowTimer: 0,
      hitFlash: 0,
      shockRadius: 0,
    });
  }

  private update(dt: number): void {
    this.elapsed += dt;

    if (this.flashAlpha > 0) {
      this.flashAlpha = Math.max(0, this.flashAlpha - dt * 1.9);
    }
    if (this.shakeMag > 0) {
      this.shakeMag = Math.max(0, this.shakeMag - dt * 32);
    }

    // Animate ambient bubbles always
    for (const b of this.bgBubbles) {
      b.y -= b.vy * dt;
      b.x += Math.sin(this.elapsed * 1.6 + b.phase) * 12 * dt;
      if (b.y < -30) {
        b.y = WORLD_H + 30;
        b.x = Math.random() * WORLD_W;
      }
    }

    if (this.screen === 'TITLE_MENU' || this.screen === 'CHAR_SELECT') {
      return;
    }

    if (
      this.screen === 'PAUSED' ||
      this.screen === 'VICTORY_FREEZE' ||
      this.screen === 'VICTORY' ||
      this.screen === 'GAME_OVER'
    ) {
      return;
    }

    if (this.screen === 'INTRO_QUAKE') {
      this.updateIntro(dt);
      this.hudSyncAccum += dt;
      if (this.hudSyncAccum >= 0.08) {
        this.hudSyncAccum = 0;
        this.pushHudSnapshot();
      }
      return;
    }

    if (this.screen === 'ENDING_ASCENT') {
      this.updateEndingAscent(dt);
      this.hudSyncAccum += dt;
      if (this.hudSyncAccum >= 0.05) {
        this.hudSyncAccum = 0;
        this.pushHudSnapshot();
      }
      return;
    }

    // Hitstop pause for punchy anime impact feel
    if (this.hitstopTimer > 0) {
      this.hitstopTimer -= dt;
      this.updateParticles(dt * 0.25);
      return;
    }

    if (this.act === 'BOSS_INTRO') {
      this.updateBossIntro(dt);
      this.hudSyncAccum += dt;
      if (this.hudSyncAccum >= 0.06) {
        this.hudSyncAccum = 0;
        this.pushHudSnapshot();
      }
      return;
    }

    // Active Gameplay (EXPLORE or BOSS)
    this.updateGameplay(dt);

    this.hudSyncAccum += dt;
    if (this.hudSyncAccum >= 0.06) {
      this.hudSyncAccum = 0;
      this.pushHudSnapshot();
    }
  }

  private updateIntro(dt: number): void {
    this.introTimer += dt;
    if (this.introTimer < 1.5) {
      this.introCaption = 'Muelle Costero — Los 8 integrantes de Los Perdidos frente al océano cálido...';
    } else if (this.introTimer < 3.2) {
      if (!this.introQuakeSoundPlayed) {
        this.introQuakeSoundPlayed = true;
        audioEngine.playQuake();
      }
      this.shakeMag = 14;
      this.introCaption = '¡UN TERREMOTO SUBMARINO AGRIETA EL MUELLE Y OSCURECE EL CIELO!';
    } else if (this.introTimer < 5.6) {
      this.shakeMag = 10;
      this.introCaption = '¡Las corrientes abisales separan al equipo! Rescata a los 7 integrantes...';
      for (const d of this.introDebris) {
        d.x += d.vx * dt;
        d.y += d.vy * dt;
        d.vy += 460 * dt;
        d.rot += d.vrot * dt;
      }
    } else {
      this.finishIntroToExplore();
    }
  }

  private updateBossIntro(dt: number): void {
    this.bossIntroTimer += dt;
    this.shakeMag = 9;
    // Gently pull camera toward boss center and keep clamped inside world
    this.camX += (this.boss.x - this.camX) * Math.min(1, dt * 4.5);
    this.camY += (this.boss.y - this.camY) * Math.min(1, dt * 4.5);
    const halfW = this.width / 2;
    const halfH = this.height / 2;
    this.camX = Math.max(halfW, Math.min(WORLD_W - halfW, this.camX));
    this.camY = Math.max(halfH, Math.min(WORLD_H - halfH, this.camY));

    // Pull player into lower arena safely
    const targetPx = this.boss.homeX;
    const targetPy = BOSS_ARENA.y + BOSS_ARENA.h - 150;
    this.player.x += (targetPx - this.player.x) * Math.min(1, dt * 3.5);
    this.player.y += (targetPy - this.player.y) * Math.min(1, dt * 3.5);
    this.updateFollowers(dt);
    this.updateParticles(dt);

    if (this.bossIntroTimer >= 2.2) {
      this.act = 'BOSS';
      this.boss.active = true;
      this.flashAlpha = 0.65;
      this.flashColor = '#ff2a55';
      this.pushHudSnapshot();
    }
  }

  private updateEndingAscent(dt: number): void {
    this.endingTimer += dt;
    this.updateParticles(dt * 0.55);

    for (const d of this.endingDroplets) {
      d.y -= d.speed * dt * (this.endingTimer < 3.8 ? 0.55 : 0.18);
      d.shimmer += dt * 5;
      if (d.y < -40) {
        d.y = this.height + 40;
      }
    }

    if (this.endingTimer >= 5.6) {
      audioEngine.playVictoryFlash();
      audioEngine.setMusicMode('VICTORY');
      this.screen = 'VICTORY_FREEZE';
      this.callbacks.onScreenChange('VICTORY_FREEZE');
      this.pushHudSnapshot();
    }
  }

  private updateGameplay(dt: number): void {
    const p = this.player;
    const m = this.selectedMember;

    // Timers
    if (this.attackBuffer > 0) this.attackBuffer -= dt;
    if (this.specialBuffer > 0) this.specialBuffer -= dt;
    if (p.attackCooldown > 0) p.attackCooldown -= dt;
    if (p.invulnTimer > 0) p.invulnTimer -= dt;
    if (p.dashTimer > 0) p.dashTimer -= dt;
    if (p.pressureFreezeTimer > 0) p.pressureFreezeTimer -= dt;
    if (p.timeFreezeTimer > 0) p.timeFreezeTimer -= dt;
    if (p.speedBoostTimer > 0) p.speedBoostTimer -= dt;
    if (p.foxSenseTimer > 0) p.foxSenseTimer -= dt;
    if (p.hitFlash > 0) p.hitFlash -= dt;

    p.squashX += (1 - p.squashX) * Math.min(1, dt * 12);
    p.squashY += (1 - p.squashY) * Math.min(1, dt * 12);

    // Combo decay
    if (this.combo > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) {
        this.combo = 0;
        this.lastEpicMilestone = 0;
      }
    }

    // Countdown timer (paused if Felix's Gravedad Abisal is active!)
    if (p.timeFreezeTimer <= 0) {
      this.timeLeft -= dt;
      if (this.timeLeft <= 0) {
        this.timeLeft = 0;
        this.triggerGameOver('Se agotó el tiempo en las profundidades del abismo.');
        return;
      }
    }

    // Water pressure rises based on depth (slower with Chan's passive, frozen with Chan's special)
    const depthRatio = Math.max(0.25, Math.min(1.4, p.y / (WORLD_H * 0.72)));
    if (p.pressureFreezeTimer <= 0) {
      const pressureGain = (2.7 + depthRatio * 2.1) * m.pressureRateMult;
      p.pressure = Math.min(100, p.pressure + pressureGain * dt);
    } else {
      // Chan's Pulso de Liderazgo gently eases pressure too
      p.pressure = Math.max(0, p.pressure - 6 * dt);
    }

    // Critical pressure slowly crushes HP (Jeongin passive mitigates 40%)
    if (p.pressure >= 99.5) {
      const dmg = 6.5 * m.pressureDamageMult * dt;
      p.hp -= dmg;
      if (p.hp <= 0) {
        p.hp = 0;
        this.triggerGameOver('La presión abisal de Suiatsu te venció.');
        return;
      }
    }

    // Passive slow special trickle so player is never soft-locked
    p.specialCharge = Math.min(100, p.specialCharge + 1.6 * dt);

    // Jisung follow-up rhythmic burst
    if (this.jisungBurstLeft > 0) {
      this.jisungBurstTimer -= dt;
      if (this.jisungBurstTimer <= 0) {
        this.fireJisungVolley(10);
        this.jisungBurstLeft -= 1;
        this.jisungBurstTimer = 0.45;
      }
    }

    // Movement input (Keyboard WASD/Arrows + Mobile Virtual Joystick)
    let ix = this.virtualMoveX;
    let iy = this.virtualMoveY;
    if (this.heldKeys.has('KeyA') || this.heldKeys.has('ArrowLeft')) ix -= 1;
    if (this.heldKeys.has('KeyD') || this.heldKeys.has('ArrowRight')) ix += 1;
    if (this.heldKeys.has('KeyW') || this.heldKeys.has('ArrowUp')) iy -= 1;
    if (this.heldKeys.has('KeyS') || this.heldKeys.has('ArrowDown')) iy += 1;

    const len = Math.hypot(ix, iy);
    if (len > 0.08) {
      const clampedMag = Math.min(1, len);
      ix = (ix / len) * clampedMag;
      iy = (iy / len) * clampedMag;
      p.facingX = ix / clampedMag;
      p.facingY = iy / clampedMag;
      p.angle = Math.atan2(p.facingY, p.facingX);
    } else {
      ix = 0;
      iy = 0;
    }

    const boostMult = p.speedBoostTimer > 0 ? 1.48 : 1.0;
    const speed = m.moveSpeed * boostMult;

    if (p.dashTimer > 0) {
      p.vx = p.dashVx;
      p.vy = p.dashVy;
      // Minho shadow dash afterimage & damage along path
      if (Math.random() < 0.75) {
        this.particles.push({
          x: p.x + (Math.random() - 0.5) * 14,
          y: p.y + (Math.random() - 0.5) * 14,
          vx: -p.vx * 0.15,
          vy: -p.vy * 0.15,
          size: 16,
          color: m.accentColor,
          outline: true,
          life: 0.24,
          maxLife: 0.24,
          shape: 'SHARD',
          rotation: p.angle,
          rotSpeed: 4,
        });
      }
      // Dash damages enemies & spheres directly
      this.checkDashHits();
    } else {
      const targetVx = ix * speed;
      const targetVy = iy * speed;
      const accel = 10.5;
      p.vx += (targetVx - p.vx) * Math.min(1, accel * dt);
      p.vy += (targetVy - p.vy) * Math.min(1, accel * dt);

      // Apply ocean currents (only in EXPLORE)
      if (this.act === 'EXPLORE') {
        for (const c of this.currents) {
          c.phase += dt * 3.2;
          if (p.x >= c.x && p.x <= c.x + c.w && p.y >= c.y && p.y <= c.y + c.h) {
            p.vx += c.dirX * c.strength * m.currentResist * dt * 2.2;
            p.vy += c.dirY * c.strength * m.currentResist * dt * 2.2;
          }
        }
      }
    }

    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.swimPhase += dt * (4 + Math.hypot(p.vx, p.vy) * 0.025);

    // Clamp to world or Boss Arena
    if (this.act === 'BOSS') {
      p.x = Math.max(BOSS_ARENA.x + p.radius, Math.min(BOSS_ARENA.x + BOSS_ARENA.w - p.radius, p.x));
      p.y = Math.max(BOSS_ARENA.y + p.radius, Math.min(BOSS_ARENA.y + BOSS_ARENA.h - p.radius, p.y));
    } else {
      p.x = Math.max(70, Math.min(WORLD_W - 70, p.x));
      p.y = Math.max(110, Math.min(WORLD_H - 90, p.y));
    }

    // Attack input
    if (this.attackBuffer > 0 && p.attackCooldown <= 0) {
      this.attackBuffer = 0;
      this.performBasicAttack();
    }

    // Special Power input
    if (this.specialBuffer > 0 && p.specialCharge >= 100) {
      this.specialBuffer = 0;
      this.activateSpecialPower();
    }

    // Update followers in dynamic anime formation
    this.updateFollowers(dt);

    // Update trapped spheres
    if (this.act === 'EXPLORE') {
      for (const s of this.spheres) {
        if (s.rescued) continue;
        s.pulsePhase += dt * 3.1;
        if (s.hitFlash > 0) s.hitFlash -= dt;
      }
    }

    // Spawn & update falling earthquake rocks
    this.updateRocks(dt);

    // Update enemies
    this.updateEnemies(dt);

    // Update collectibles (bubbles & pearls) + magnet attraction
    this.updateCollectibles(dt);

    // Update projectiles & shock rings
    this.updateProjectiles(dt);
    this.updateShockRings(dt);

    // Update Boss in Act 3
    if (this.act === 'BOSS' && this.boss.active) {
      this.updateBoss(dt);
    }

    // Update visual effects
    this.updateParticles(dt);
    this.updateSlashes(dt);
    this.updateFloatingTexts(dt);

    // Smooth camera follow
    const lookAheadX = p.vx * 0.16;
    const lookAheadY = p.vy * 0.16;
    let targetCamX = p.x + lookAheadX;
    let targetCamY = p.y + lookAheadY;

    if (this.act === 'BOSS') {
      // Frame both player and boss nicely
      targetCamX = p.x * 0.55 + this.boss.x * 0.45;
      targetCamY = p.y * 0.55 + this.boss.y * 0.45;
    }

    this.camX += (targetCamX - this.camX) * Math.min(1, dt * 6.5);
    this.camY += (targetCamY - this.camY) * Math.min(1, dt * 6.5);

    const halfW = this.width / 2;
    const halfH = this.height / 2;
    this.camX = Math.max(halfW, Math.min(WORLD_W - halfW, this.camX));
    this.camY = Math.max(halfH, Math.min(WORLD_H - halfH, this.camY));
  }

  private performBasicAttack(): void {
    const p = this.player;
    const m = this.selectedMember;
    const onBeat = audioEngine.isOnBeat();

    p.attackCooldown = m.attackCooldown;
    p.squashX = 1.28;
    p.squashY = 0.78;
    audioEngine.playAttack(onBeat);

    const teamBonus = 1 + this.followers.length * 0.14;
    const beatMult = onBeat ? 1.3 : 1.0;
    const baseDmg = 24 * teamBonus * beatMult;

    const slashX = p.x + Math.cos(p.angle) * (m.attackRange * 0.45);
    const slashY = p.y + Math.sin(p.angle) * (m.attackRange * 0.45);

    this.slashes.push({
      x: slashX,
      y: slashY,
      angle: p.angle,
      radius: m.attackRange,
      color: onBeat ? '#00f0ff' : m.accentColor,
      life: 0.2,
      maxLife: 0.2,
      onBeat,
    });

    // Forward water wave projectile for snappy range feel
    this.projectiles.push({
      id: this.nextId++,
      fromPlayer: true,
      kind: 'SLASH_WAVE',
      x: p.x + Math.cos(p.angle) * 28,
      y: p.y + Math.sin(p.angle) * 28,
      vx: Math.cos(p.angle) * 620,
      vy: Math.sin(p.angle) * 620,
      radius: 18,
      damage: baseDmg * 0.72,
      color: onBeat ? '#00f0ff' : m.accentColor,
      life: 0.36,
      maxLife: 0.36,
      pierce: true,
    });

    // Rescued teammates join in choreographed team attack!
    for (const f of this.followers) {
      f.attackFlash = 0.24;
      const targetAngle = this.act === 'BOSS' && this.boss.active
        ? Math.atan2(this.boss.y - f.y, this.boss.x - f.x)
        : p.angle;
      this.projectiles.push({
        id: this.nextId++,
        fromPlayer: true,
        kind: 'TEAM_BOLT',
        x: f.x,
        y: f.y,
        vx: Math.cos(targetAngle) * 560,
        vy: Math.sin(targetAngle) * 560,
        radius: 9,
        damage: 11 * beatMult,
        color: f.member.accentColor,
        life: 0.55,
        maxLife: 0.55,
      });
    }

    // Immediate melee arc hits
    let hitSomething = false;

    for (const e of [...this.enemies]) {
      const dist = Math.hypot(e.x - slashX, e.y - slashY);
      if (dist <= m.attackRange * 0.72 + e.radius) {
        this.damageEnemy(e, baseDmg, onBeat);
        hitSomething = true;
      }
    }

    for (const r of [...this.rocks]) {
      if (r.warningTimer > 0) continue;
      const dist = Math.hypot(r.x - slashX, r.y - slashY);
      if (dist <= m.attackRange * 0.72 + r.radius) {
        r.hp -= baseDmg * 1.4;
        hitSomething = true;
        if (r.hp <= 0) {
          this.shatterRock(r);
        }
      }
    }

    for (const s of this.spheres) {
      if (s.rescued) continue;
      const dist = Math.hypot(s.x - slashX, s.y - slashY);
      if (dist <= m.attackRange * 0.72 + s.radius) {
        this.damageSphere(s, baseDmg * m.bossDamageMult, onBeat);
        hitSomething = true;
        if (this.act === 'BOSS_INTRO') return;
      }
    }

    if (this.act === 'BOSS' && this.boss.active) {
      const dist = Math.hypot(this.boss.x - slashX, this.boss.y - slashY);
      if (dist <= m.attackRange * 0.75 + this.boss.radius) {
        this.damageBoss(baseDmg * m.bossDamageMult, onBeat);
        hitSomething = true;
        if (this.screen === 'ENDING_ASCENT') return;
      }
    }

    if (hitSomething && onBeat) {
      this.addFloatingText(p.x, p.y - 36, '¡EN RITMO!', '#00f0ff', 1.15);
    }
  }

  private activateSpecialPower(): void {
    const p = this.player;
    const m = this.selectedMember;
    p.specialCharge = 0;
    audioEngine.playSpecial();

    this.flashAlpha = 0.55;
    this.flashColor = m.accentColor;
    this.shakeMag = 14;
    this.hitstopTimer = 0.055;
    this.registerComboHit(2, true);

    this.callbacks.onCutIn({
      id: this.cutInSeq++,
      memberId: m.id,
      title: m.shout,
      subtitle: m.specialName,
      accentColor: m.accentColor,
      kind: 'SPECIAL',
    });

    this.spawnBurst(p.x, p.y, m.accentColor, 26, 'STAR');

    switch (m.id) {
      case 'chan': {
        // Pulso de Liderazgo: Sonic shield freezes pressure, blocks 2 hits, pulls bubbles
        p.pressureFreezeTimer = 6.5;
        p.shieldHits = Math.max(p.shieldHits, 2);
        this.shockRings.push({
          x: p.x,
          y: p.y,
          radius: 30,
          maxRadius: 340,
          speed: 620,
          color: m.accentColor,
          fromBoss: false,
          gapAngle: 0,
          gapHalfWidth: 0,
          thickness: 12,
        });
        for (const c of this.collectibles) {
          if (!c.collected && c.kind === 'BUBBLE' && Math.hypot(c.x - p.x, c.y - p.y) < 520) {
            c.vx = (p.x - c.x) * 3.4;
            c.vy = (p.y - c.y) * 3.4;
          }
        }
        this.addFloatingText(p.x, p.y - 44, '¡ESCUDO SÓNICO!', m.accentColor, 1.3);
        break;
      }
      case 'minho': {
        // Paso Sombra Felino: Ultra-fast invulnerable shadow dash cutting everything
        p.dashTimer = 0.52;
        p.invulnTimer = 1.6;
        p.dashVx = p.facingX * 920;
        p.dashVy = p.facingY * 920;
        this.addFloatingText(p.x, p.y - 44, '¡PASO SOMBRA!', m.accentColor, 1.3);
        break;
      }
      case 'changbin': {
        // Impacto Sísmico: Colossal shockwave shattering all nearby rocks, enemies, spheres, and boss armor
        const radius = 370;
        this.shockRings.push({
          x: p.x,
          y: p.y,
          radius: 26,
          maxRadius: radius,
          speed: 780,
          color: m.accentColor,
          fromBoss: false,
          gapAngle: 0,
          gapHalfWidth: 0,
          thickness: 18,
        });
        for (const r of [...this.rocks]) {
          if (Math.hypot(r.x - p.x, r.y - p.y) < radius + 80) {
            this.shatterRock(r);
          }
        }
        for (const e of [...this.enemies]) {
          if (Math.hypot(e.x - p.x, e.y - p.y) < radius) {
            this.damageEnemy(e, 110, true);
          }
        }
        for (const s of this.spheres) {
          if (!s.rescued && Math.hypot(s.x - p.x, s.y - p.y) < radius) {
            this.damageSphere(s, 85, true);
            if (this.act === 'BOSS_INTRO') break;
          }
        }
        if (this.act === 'BOSS' && this.boss.active && Math.hypot(this.boss.x - p.x, this.boss.y - p.y) < radius + this.boss.radius) {
          this.damageBoss(165 * m.bossDamageMult, true);
        }
        this.addFloatingText(p.x, p.y - 44, '¡IMPACTO SÍSMICO!', m.accentColor, 1.35);
        break;
      }
      case 'hyunjin': {
        // Mirada Deslumbrante: Hypnotic flash freezes creatures + agility speed surge
        const radius = 440;
        p.speedBoostTimer = 5.0;
        p.invulnTimer = Math.max(p.invulnTimer, 0.8);
        this.shockRings.push({
          x: p.x,
          y: p.y,
          radius: 20,
          maxRadius: radius,
          speed: 760,
          color: m.accentColor,
          fromBoss: false,
          gapAngle: 0,
          gapHalfWidth: 0,
          thickness: 14,
        });
        for (const e of [...this.enemies]) {
          if (Math.hypot(e.x - p.x, e.y - p.y) < radius) {
            e.frozenTimer = 4.8;
            this.damageEnemy(e, 34, true);
          }
        }
        if (this.act === 'BOSS' && this.boss.active) {
          this.boss.frozenTimer = 2.4;
          this.damageBoss(75, true);
        }
        this.addFloatingText(p.x, p.y - 44, '¡ENEMIGOS PARALIZADOS!', m.accentColor, 1.3);
        break;
      }
      case 'jisung': {
        // Ráfaga Rítmica: Multidirectional rhythmic volley + follow-up beat volley
        this.fireJisungVolley(12);
        this.jisungBurstLeft = 2;
        this.jisungBurstTimer = 0.42;
        this.addFloatingText(p.x, p.y - 44, '¡RÁFAGA RÍTMICA!', m.accentColor, 1.3);
        break;
      }
      case 'felix': {
        // Gravedad Abisal: Freezes level timer 7s, slows enemies, pushes hazards far away
        p.timeFreezeTimer = 7.0;
        const radius = 460;
        this.shockRings.push({
          x: p.x,
          y: p.y,
          radius: 25,
          maxRadius: radius,
          speed: 650,
          color: m.accentColor,
          fromBoss: false,
          gapAngle: 0,
          gapHalfWidth: 0,
          thickness: 16,
        });
        for (const e of [...this.enemies]) {
          const dx = e.x - p.x;
          const dy = e.y - p.y;
          const d = Math.hypot(dx, dy) || 1;
          if (d < radius) {
            e.vx = (dx / d) * 520;
            e.vy = (dy / d) * 520;
            e.slowTimer = 6.0;
            this.damageEnemy(e, 48, true);
          }
        }
        for (const r of [...this.rocks]) {
          if (Math.hypot(r.x - p.x, r.y - p.y) < radius) {
            this.shatterRock(r);
          }
        }
        if (this.act === 'BOSS' && this.boss.active) {
          this.boss.slowTimer = 5.5;
          this.damageBoss(110, true);
        }
        this.addFloatingText(p.x, p.y - 44, '¡TIEMPO DETENIDO 7s!', m.accentColor, 1.35);
        break;
      }
      case 'seungmin': {
        // Onda Cristalina: 5 long-range homing crystal beams seeking nearest trapped member or Boss weak point
        for (let i = 0; i < 5; i++) {
          const spread = (i - 2) * 0.34;
          const ang = p.angle + spread;
          this.projectiles.push({
            id: this.nextId++,
            fromPlayer: true,
            kind: 'CRYSTAL_HOMING',
            x: p.x + Math.cos(ang) * 26,
            y: p.y + Math.sin(ang) * 26,
            vx: Math.cos(ang) * 520,
            vy: Math.sin(ang) * 520,
            radius: 13,
            damage: 44 * m.bossDamageMult,
            color: m.accentColor,
            life: 2.8,
            maxLife: 2.8,
            homing: true,
          });
        }
        this.addFloatingText(p.x, p.y - 44, '¡OBJETIVO FIJADO!', m.accentColor, 1.3);
        break;
      }
      case 'jeongin': {
        // Instinto de Zorro: Reveals all trapped teammates across entire abyss + 2-hit protective shield
        p.foxSenseTimer = 11.0;
        p.shieldHits = Math.max(p.shieldHits, 2);
        p.pressure = Math.max(0, p.pressure - 28);
        this.shockRings.push({
          x: p.x,
          y: p.y,
          radius: 25,
          maxRadius: 380,
          speed: 700,
          color: m.accentColor,
          fromBoss: false,
          gapAngle: 0,
          gapHalfWidth: 0,
          thickness: 12,
        });
        for (const e of [...this.enemies]) {
          if (Math.hypot(e.x - p.x, e.y - p.y) < 320) {
            this.damageEnemy(e, 45, true);
          }
        }
        this.addFloatingText(p.x, p.y - 44, '¡RASTRO REVELADO + ESCUDO!', m.accentColor, 1.3);
        break;
      }
    }
  }

  private fireJisungVolley(count: number): void {
    const p = this.player;
    for (let i = 0; i < count; i++) {
      const ang = (i / count) * Math.PI * 2 + this.elapsed * 2;
      this.projectiles.push({
        id: this.nextId++,
        fromPlayer: true,
        kind: 'RHYTHM_ORB',
        x: p.x + Math.cos(ang) * 20,
        y: p.y + Math.sin(ang) * 20,
        vx: Math.cos(ang) * 540,
        vy: Math.sin(ang) * 540,
        radius: 11,
        damage: 30,
        color: '#38bdf8',
        life: 1.05,
        maxLife: 1.05,
      });
    }
  }

  private checkDashHits(): void {
    const p = this.player;
    for (const e of [...this.enemies]) {
      if (Math.hypot(e.x - p.x, e.y - p.y) < p.radius + e.radius + 14 && e.hitFlash <= 0) {
        this.damageEnemy(e, 55, true);
      }
    }
    for (const s of this.spheres) {
      if (!s.rescued && Math.hypot(s.x - p.x, s.y - p.y) < p.radius + s.radius + 10 && s.hitFlash <= 0) {
        this.damageSphere(s, 42, true);
        if (this.act === 'BOSS_INTRO') return;
      }
    }
    if (this.act === 'BOSS' && this.boss.active && this.boss.hitFlash <= 0) {
      if (Math.hypot(this.boss.x - p.x, this.boss.y - p.y) < p.radius + this.boss.radius + 12) {
        this.damageBoss(65, true);
      }
    }
  }

  private updateFollowers(dt: number): void {
    const p = this.player;
    const backAngle = p.angle + Math.PI;
    for (let i = 0; i < this.followers.length; i++) {
      const f = this.followers[i];
      const row = Math.floor(i / 2) + 1;
      const side = i % 2 === 0 ? -1 : 1;
      const spreadAngle = backAngle + side * (0.42 + row * 0.08);
      const dist = 54 + row * 38;
      const targetX = p.x + Math.cos(spreadAngle) * dist;
      const targetY = p.y + Math.sin(spreadAngle) * dist;

      f.vx += (targetX - f.x) * 8.5 * dt;
      f.vy += (targetY - f.y) * 8.5 * dt;
      f.vx *= 0.84;
      f.vy *= 0.84;
      f.x += f.vx * dt * 10;
      f.y += f.vy * dt * 10;
      f.angle = p.angle;
      f.swimPhase += dt * 7;
      if (f.attackFlash > 0) f.attackFlash -= dt;
    }
  }

  private updateRocks(dt: number): void {
    this.rockSpawnTimer -= dt;
    if (this.rockSpawnTimer <= 0 && this.act === 'EXPLORE') {
      this.rockSpawnTimer = 3.2 + Math.random() * 2.2;
      const rx = Math.max(140, Math.min(WORLD_W - 140, this.player.x + (Math.random() - 0.5) * 680));
      const ry = Math.max(90, this.camY - this.height / 2 - 40);
      this.spawnRock(rx, ry);
    }

    for (let i = this.rocks.length - 1; i >= 0; i--) {
      const r = this.rocks[i];
      if (r.warningTimer > 0) {
        r.warningTimer -= dt;
        continue;
      }
      r.y += r.vy * dt;
      r.vy = Math.min(540, r.vy + 210 * dt);
      r.rotation += r.rotSpeed * dt;

      // Hit player
      if (Math.hypot(r.x - this.player.x, r.y - this.player.y) < r.radius + this.player.radius - 4) {
        this.damagePlayer(14, r.x, r.y);
        this.shatterRock(r);
        continue;
      }

      if (r.y > WORLD_H + 100) {
        this.rocks.splice(i, 1);
      }
    }
  }

  private spawnRock(x: number, y: number): void {
    const verts: number[] = [];
    for (let i = 0; i < 7; i++) {
      verts.push(0.76 + Math.random() * 0.34);
    }
    this.rocks.push({
      id: this.nextId++,
      x,
      y,
      vy: 230 + Math.random() * 80,
      radius: 24 + Math.random() * 14,
      rotation: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 3.5,
      hp: 32,
      warningTimer: 0.78,
      spawnY: y,
      vertices: verts,
    });
  }

  private shatterRock(r: FallingRock): void {
    const idx = this.rocks.indexOf(r);
    if (idx !== -1) this.rocks.splice(idx, 1);
    audioEngine.playHit(true);
    this.shakeMag = Math.max(this.shakeMag, 6);
    this.spawnBurst(r.x, r.y, '#64748b', 12, 'SHARD');
    this.combatScore += 80;
    this.registerComboHit(1, false);
    // Drop a pearl 55% of the time
    if (Math.random() < 0.55) {
      this.collectibles.push({
        id: this.nextId++,
        kind: 'PEARL',
        x: r.x,
        y: r.y,
        vx: (Math.random() - 0.5) * 80,
        vy: -50,
        radius: 13,
        phase: 0,
        collected: false,
      });
    }
  }

  private updateEnemies(dt: number): void {
    if (this.act === 'EXPLORE') {
      this.enemyRespawnTimer -= dt;
      if (this.enemyRespawnTimer <= 0 && this.enemies.length < 13) {
        this.enemyRespawnTimer = 6.5;
        const angle = Math.random() * Math.PI * 2;
        const sx = Math.max(180, Math.min(WORLD_W - 180, this.player.x + Math.cos(angle) * 620));
        const sy = Math.max(180, Math.min(WORLD_H - 180, this.player.y + Math.sin(angle) * 480));
        this.spawnEnemy(Math.random() < 0.5 ? 'JELLY' : 'SHADOW', sx, sy);
      }
    }

    const p = this.player;

    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      if (e.hitFlash > 0) e.hitFlash -= dt;
      if (e.slowTimer > 0) e.slowTimer -= dt;

      if (e.frozenTimer > 0) {
        e.frozenTimer -= dt;
        e.vx *= 0.85;
        e.vy *= 0.85;
        e.x += e.vx * dt;
        e.y += e.vy * dt;
        continue;
      }

      const slowMult = e.slowTimer > 0 ? 0.4 : 1.0;
      e.phase += dt * 3.4 * slowMult;
      const distToPlayer = Math.hypot(p.x - e.x, p.y - e.y);

      if (e.kind === 'JELLY') {
        // Bobbing jellyfish with telegraphed electric discharge
        e.stateTimer -= dt * slowMult;
        if (e.state === 'IDLE') {
          e.vx += (Math.cos(e.phase * 0.7) * 55 - e.vx) * dt * 2;
          e.vy += (Math.sin(e.phase * 1.1) * 55 - e.vy) * dt * 2;
          if (distToPlayer < 240 && e.stateTimer <= 0) {
            e.state = 'WINDUP';
            e.stateTimer = 0.65;
          }
        } else if (e.state === 'WINDUP') {
          e.vx *= 0.9;
          e.vy *= 0.9;
          if (e.stateTimer <= 0) {
            e.state = 'ACTION';
            e.stateTimer = 0.42;
            e.shockRadius = 108;
            this.spawnBurst(e.x, e.y, '#c084fc', 10, 'STAR');
          }
        } else if (e.state === 'ACTION') {
          if (distToPlayer < e.shockRadius + p.radius * 0.6) {
            this.damagePlayer(12, e.x, e.y);
          }
          if (e.stateTimer <= 0) {
            e.state = 'IDLE';
            e.stateTimer = 2.0;
            e.shockRadius = 0;
          }
        }
      } else {
        // Shadow Creature: stalks and telegraphs crimson lunge
        e.stateTimer -= dt * slowMult;
        if (e.state === 'IDLE') {
          if (distToPlayer < 480) {
            const ang = Math.atan2(p.y - e.y, p.x - e.x);
            e.vx += (Math.cos(ang) * 145 * slowMult - e.vx) * dt * 3;
            e.vy += (Math.sin(ang) * 145 * slowMult - e.vy) * dt * 3;
            if (distToPlayer < 260 && e.stateTimer <= 0) {
              e.state = 'WINDUP';
              e.stateTimer = 0.55;
              e.targetX = p.x;
              e.targetY = p.y;
            }
          } else {
            e.vx += (Math.cos(e.phase * 0.5) * 70 - e.vx) * dt * 2;
            e.vy += (Math.sin(e.phase * 0.6) * 70 - e.vy) * dt * 2;
          }
        } else if (e.state === 'WINDUP') {
          e.vx *= 0.82;
          e.vy *= 0.82;
          if (e.stateTimer <= 0) {
            const ang = Math.atan2(e.targetY - e.y, e.targetX - e.x);
            e.vx = Math.cos(ang) * 430 * slowMult;
            e.vy = Math.sin(ang) * 430 * slowMult;
            e.state = 'ACTION';
            e.stateTimer = 0.55;
          }
        } else if (e.state === 'ACTION') {
          e.vx *= 0.96;
          e.vy *= 0.96;
          if (e.stateTimer <= 0) {
            e.state = 'IDLE';
            e.stateTimer = 1.6;
          }
        }
      }

      e.x = Math.max(80, Math.min(WORLD_W - 80, e.x + e.vx * dt));
      e.y = Math.max(120, Math.min(WORLD_H - 90, e.y + e.vy * dt));

      // Contact damage
      if (Math.hypot(e.x - p.x, e.y - p.y) < e.radius + p.radius - 4) {
        this.damagePlayer(11, e.x, e.y);
      }
    }
  }

  private updateCollectibles(dt: number): void {
    const p = this.player;
    const m = this.selectedMember;

    // Keep oxygen bubbles replenished during both exploration and Boss fight!
    this.bubbleSpawnTimer -= dt;
    if (this.bubbleSpawnTimer <= 0) {
      this.bubbleSpawnTimer = this.act === 'BOSS' ? 2.6 : 3.2;
      const activeBubbles = this.collectibles.filter((c) => !c.collected && c.kind === 'BUBBLE').length;
      if (activeBubbles < 24) {
        const bx = this.act === 'BOSS'
          ? BOSS_ARENA.x + 90 + Math.random() * (BOSS_ARENA.w - 180)
          : Math.max(160, Math.min(WORLD_W - 160, p.x + (Math.random() - 0.5) * 900));
        const by = this.act === 'BOSS'
          ? BOSS_ARENA.y + BOSS_ARENA.h - 40
          : Math.min(WORLD_H - 80, p.y + 340);
        this.collectibles.push({
          id: this.nextId++,
          kind: 'BUBBLE',
          x: bx,
          y: by,
          vx: 0,
          vy: -28 - Math.random() * 18,
          radius: 19,
          phase: Math.random() * Math.PI * 2,
          collected: false,
        });
      }
      if (this.act === 'BOSS') {
        const activePearls = this.collectibles.filter((c) => !c.collected && c.kind === 'PEARL').length;
        if (activePearls < 8) {
          this.collectibles.push({
            id: this.nextId++,
            kind: 'PEARL',
            x: BOSS_ARENA.x + 120 + Math.random() * (BOSS_ARENA.w - 240),
            y: BOSS_ARENA.y + 120 + Math.random() * (BOSS_ARENA.h - 240),
            vx: 0,
            vy: 0,
            radius: 13,
            phase: Math.random() * Math.PI * 2,
            collected: false,
          });
        }
      }
    }

    const magnet = m.magnetRadius + (p.pressureFreezeTimer > 0 ? 110 : 0);

    for (let i = this.collectibles.length - 1; i >= 0; i--) {
      const c = this.collectibles[i];
      if (c.collected) {
        this.collectibles.splice(i, 1);
        continue;
      }

      c.phase += dt * 3.2;
      if (c.kind === 'BUBBLE') {
        c.x += Math.sin(c.phase) * 18 * dt + c.vx * dt;
        c.y += c.vy * dt;
        c.vx *= 0.94;
        if (c.y < 110) {
          c.y = WORLD_H - 110;
        }
      } else {
        c.x += c.vx * dt;
        c.y += c.vy * dt;
        c.vx *= 0.92;
        c.vy *= 0.92;
      }

      const dx = p.x - c.x;
      const dy = p.y - c.y;
      const dist = Math.hypot(dx, dy) || 1;

      if (dist < magnet) {
        const pull = (1 - dist / magnet) * 520 + 180;
        c.x += (dx / dist) * pull * dt;
        c.y += (dy / dist) * pull * dt;
      }

      if (dist < p.radius + c.radius + 6) {
        c.collected = true;
        if (c.kind === 'BUBBLE') {
          audioEngine.playBubble();
          p.pressure = Math.max(0, p.pressure - 24);
          p.hp = Math.min(p.maxHp, p.hp + 5);
          this.timeLeft = Math.min(240, this.timeLeft + 4);
          this.spawnBurst(c.x, c.y, '#67e8f9', 8, 'DROPLET');
          this.addFloatingText(c.x, c.y - 14, '-24% PRESIÓN  +4s', '#67e8f9', 0.95);
        } else {
          audioEngine.playPearl();
          this.pearls += 1;
          p.specialCharge = Math.min(100, p.specialCharge + 14 * m.pearlChargeMult);
          const pts = Math.round(120 * m.pearlScoreMult);
          this.spawnBurst(c.x, c.y, '#f8fafc', 10, 'STAR');
          this.addFloatingText(c.x, c.y - 14, `+${pts} PERLA`, '#fef08a', 0.95);
        }
      }
    }
  }

  private updateProjectiles(dt: number): void {
    const p = this.player;
    const snapshot = [...this.projectiles];

    for (const pr of snapshot) {
      if (this.act === 'BOSS_INTRO' || this.screen !== 'PLAYING') {
        return;
      }

      pr.life -= dt;
      if (pr.life <= 0) {
        const idx = this.projectiles.indexOf(pr);
        if (idx !== -1) this.projectiles.splice(idx, 1);
        continue;
      }

      // Seungmin homing crystal lock onto Boss weak point or nearest trapped member sphere
      if (pr.homing && pr.fromPlayer) {
        let tx: number | null = null;
        let ty: number | null = null;
        if (this.act === 'BOSS' && this.boss.active) {
          tx = this.boss.x;
          ty = this.boss.y;
        } else {
          let bestDist = Infinity;
          for (const s of this.spheres) {
            if (s.rescued) continue;
            const d = Math.hypot(s.x - pr.x, s.y - pr.y);
            if (d < bestDist) {
              bestDist = d;
              tx = s.x;
              ty = s.y;
            }
          }
        }
        if (tx !== null && ty !== null) {
          const desiredAngle = Math.atan2(ty - pr.y, tx - pr.x);
          const curSpeed = Math.hypot(pr.vx, pr.vy) || 540;
          const desiredVx = Math.cos(desiredAngle) * curSpeed;
          const desiredVy = Math.sin(desiredAngle) * curSpeed;
          pr.vx += (desiredVx - pr.vx) * Math.min(1, dt * 6.5);
          pr.vy += (desiredVy - pr.vy) * Math.min(1, dt * 6.5);
        }
      }

      pr.x += pr.vx * dt;
      pr.y += pr.vy * dt;

      if (pr.fromPlayer) {
        let consumed = false;
        for (const e of [...this.enemies]) {
          if (Math.hypot(e.x - pr.x, e.y - pr.y) < e.radius + pr.radius) {
            this.damageEnemy(e, pr.damage, false);
            if (!pr.pierce) {
              consumed = true;
              break;
            }
          }
        }
        if (!consumed && this.act === 'EXPLORE') {
          for (const s of this.spheres) {
            if (!s.rescued && Math.hypot(s.x - pr.x, s.y - pr.y) < s.radius + pr.radius) {
              this.damageSphere(s, pr.damage * this.selectedMember.bossDamageMult, false);
              consumed = true;
              if (this.act !== 'EXPLORE') return;
              break;
            }
          }
        }
        if (!consumed && this.act === 'BOSS' && this.boss.active) {
          if (Math.hypot(this.boss.x - pr.x, this.boss.y - pr.y) < this.boss.radius + pr.radius) {
            this.damageBoss(pr.damage * this.selectedMember.bossDamageMult, false);
            consumed = true;
            if (this.screen !== 'PLAYING') return;
          }
        }
        if (!consumed) {
          for (const r of [...this.rocks]) {
            if (r.warningTimer <= 0 && Math.hypot(r.x - pr.x, r.y - pr.y) < r.radius + pr.radius) {
              r.hp -= pr.damage;
              if (r.hp <= 0) this.shatterRock(r);
              if (!pr.pierce) {
                consumed = true;
                break;
              }
            }
          }
        }
        if (consumed) {
          const idx = this.projectiles.indexOf(pr);
          if (idx !== -1) this.projectiles.splice(idx, 1);
        }
      } else {
        // Enemy / Boss projectile hitting player
        if (Math.hypot(p.x - pr.x, p.y - pr.y) < p.radius + pr.radius - 2) {
          this.damagePlayer(pr.damage, pr.x, pr.y);
          const idx = this.projectiles.indexOf(pr);
          if (idx !== -1) this.projectiles.splice(idx, 1);
        }
      }
    }
  }

  private updateShockRings(dt: number): void {
    const p = this.player;
    for (let i = this.shockRings.length - 1; i >= 0; i--) {
      const sr = this.shockRings[i];
      sr.radius += sr.speed * dt;

      if (sr.fromBoss && !sr.hitPlayer) {
        const dx = p.x - sr.x;
        const dy = p.y - sr.y;
        const dist = Math.hypot(dx, dy);
        if (Math.abs(dist - sr.radius) < sr.thickness * 0.7 + p.radius * 0.65) {
          const ang = Math.atan2(dy, dx);
          let diff = Math.abs(ang - sr.gapAngle);
          if (diff > Math.PI) diff = Math.PI * 2 - diff;
          if (diff > sr.gapHalfWidth) {
            sr.hitPlayer = true;
            this.damagePlayer(15, sr.x, sr.y);
            p.pressure = Math.min(100, p.pressure + 10);
          }
        }
      }

      if (sr.radius >= sr.maxRadius) {
        this.shockRings.splice(i, 1);
      }
    }
  }

  private updateBoss(dt: number): void {
    const b = this.boss;
    const p = this.player;

    if (b.hitFlash > 0) b.hitFlash -= dt;
    if (b.slowTimer > 0) b.slowTimer -= dt;

    if (b.frozenTimer > 0) {
      b.frozenTimer -= dt;
      return;
    }

    const speedMult = (b.slowTimer > 0 ? 0.45 : 1.0) * (b.hp < b.maxHp * 0.45 ? 1.25 : 1.0);
    b.angle += dt * 1.15 * speedMult;

    // Gentle menacing drift around trench center
    b.x = b.homeX + Math.cos(this.elapsed * 0.85) * 140;
    b.y = b.homeY + Math.sin(this.elapsed * 1.1) * 75;

    b.patternTimer -= dt * speedMult;

    if (b.attackPattern === 'IDLE') {
      if (b.patternTimer <= 0) {
        const roll = Math.random();
        if (roll < 0.42) {
          b.attackPattern = 'PRESSURE_WAVES';
          b.waveCount = 3;
          b.patternTimer = 0.25;
        } else if (roll < 0.72) {
          b.attackPattern = 'ROCK_RAIN';
          b.patternTimer = 2.6;
          b.rockTimer = 0.2;
          this.shakeMag = Math.max(this.shakeMag, 8);
        } else {
          b.attackPattern = 'BEAM_WINDUP';
          b.patternTimer = 0.95;
          b.beamAngle = Math.atan2(p.y - b.y, p.x - b.x) - 0.55;
          b.beamSweepDir = Math.random() < 0.5 ? 1 : -1;
          audioEngine.playBossWarning();
        }
      }
    } else if (b.attackPattern === 'PRESSURE_WAVES') {
      if (b.patternTimer <= 0) {
        const gapAngle = Math.atan2(p.y - b.y, p.x - b.x) + (Math.random() - 0.5) * 1.1;
        this.shockRings.push({
          x: b.x,
          y: b.y,
          radius: b.radius,
          maxRadius: 680,
          speed: 300 * speedMult,
          color: '#ff2a55',
          fromBoss: true,
          gapAngle,
          gapHalfWidth: 0.46,
          thickness: 16,
        });
        audioEngine.playQuake();
        this.shakeMag = Math.max(this.shakeMag, 7);
        b.waveCount -= 1;
        if (b.waveCount <= 0) {
          b.attackPattern = 'IDLE';
          b.patternTimer = 1.6;
        } else {
          b.patternTimer = 0.85;
        }
      }
    } else if (b.attackPattern === 'ROCK_RAIN') {
      b.rockTimer -= dt * speedMult;
      if (b.rockTimer <= 0) {
        b.rockTimer = 0.48;
        const rx = BOSS_ARENA.x + 80 + Math.random() * (BOSS_ARENA.w - 160);
        this.spawnRock(rx, BOSS_ARENA.y - 20);
      }
      if (b.patternTimer <= 0) {
        b.attackPattern = 'IDLE';
        b.patternTimer = 1.4;
      }
    } else if (b.attackPattern === 'BEAM_WINDUP') {
      if (b.patternTimer <= 0) {
        b.attackPattern = 'BEAM_FIRE';
        b.patternTimer = 1.35;
        audioEngine.playQuake();
        this.shakeMag = 11;
      }
    } else if (b.attackPattern === 'BEAM_FIRE') {
      b.beamAngle += b.beamSweepDir * 1.15 * dt * speedMult;
      // Check beam collision against player
      const dx = p.x - b.x;
      const dy = p.y - b.y;
      const dist = Math.hypot(dx, dy);
      if (dist > b.radius && dist < 680) {
        const ang = Math.atan2(dy, dx);
        let diff = Math.abs(ang - b.beamAngle);
        if (diff > Math.PI) diff = Math.PI * 2 - diff;
        if (diff < 0.095) {
          this.damagePlayer(16, b.x, b.y);
        }
      }
      if (b.patternTimer <= 0) {
        b.attackPattern = 'IDLE';
        b.patternTimer = 1.7;
      }
    }

    // Contact with boss core
    if (Math.hypot(p.x - b.x, p.y - b.y) < p.radius + b.radius - 6) {
      this.damagePlayer(14, b.x, b.y);
    }
  }

  private damageEnemy(e: Enemy, dmg: number, heavy: boolean): void {
    e.hp -= dmg;
    e.hitFlash = 0.14;
    audioEngine.playHit(heavy);
    this.spawnBurst(e.x, e.y, heavy ? '#00f0ff' : '#f43f5e', heavy ? 12 : 7, 'STAR');
    this.registerComboHit(1, heavy);
    this.combatScore += Math.round(dmg * 1.8);

    // Knockback
    const ang = Math.atan2(e.y - this.player.y, e.x - this.player.x);
    e.vx += Math.cos(ang) * 210;
    e.vy += Math.sin(ang) * 210;

    if (e.hp <= 0) {
      const idx = this.enemies.indexOf(e);
      if (idx !== -1) this.enemies.splice(idx, 1);
      this.hitstopTimer = 0.04;
      this.shakeMag = Math.max(this.shakeMag, 7);
      this.combatScore += 220;
      this.player.specialCharge = Math.min(100, this.player.specialCharge + 10 * this.selectedMember.pearlChargeMult);
      this.spawnBurst(e.x, e.y, e.kind === 'JELLY' ? '#c084fc' : '#ff2a55', 18, 'SHARD');
      // Drop 2 pearls
      for (let k = 0; k < 2; k++) {
        this.collectibles.push({
          id: this.nextId++,
          kind: 'PEARL',
          x: e.x + (Math.random() - 0.5) * 30,
          y: e.y + (Math.random() - 0.5) * 30,
          vx: (Math.random() - 0.5) * 140,
          vy: (Math.random() - 0.5) * 140,
          radius: 13,
          phase: 0,
          collected: false,
        });
      }
    }
  }

  private damageSphere(s: TrappedSphere, dmg: number, heavy: boolean): void {
    s.hp -= dmg;
    s.hitFlash = 0.16;
    audioEngine.playHit(heavy);
    this.spawnBurst(s.x, s.y, s.member.accentColor, 10, 'SHARD');
    this.registerComboHit(1, heavy);

    if (s.hp <= 0 && !s.rescued) {
      s.rescued = true;
      audioEngine.playRescue();
      this.hitstopTimer = 0.065;
      this.shakeMag = 12;
      this.flashAlpha = 0.45;
      this.flashColor = s.member.accentColor;
      this.spawnBurst(s.x, s.y, s.member.accentColor, 28, 'STAR');

      // Rescued member joins formation!
      this.followers.push({
        member: s.member,
        x: s.x,
        y: s.y,
        vx: 0,
        vy: 0,
        angle: this.player.angle,
        swimPhase: Math.random() * Math.PI * 2,
        attackFlash: 0,
      });

      // Reward: heal, lower pressure, add bonus time
      this.player.hp = Math.min(this.player.maxHp, this.player.hp + 15);
      this.player.pressure = Math.max(0, this.player.pressure - 25);
      this.timeLeft = Math.min(240, this.timeLeft + 6);

      this.addFloatingText(s.x, s.y - 38, `¡${s.member.name.toUpperCase()} RESCATADO!`, s.member.accentColor, 1.4);

      this.callbacks.onCutIn({
        id: this.cutInSeq++,
        memberId: s.member.id,
        title: `¡${s.member.name.toUpperCase()} SE UNE!`,
        subtitle: `Equipo: ${this.followers.length + 1}/8 · +Poder de Ataque`,
        accentColor: s.member.accentColor,
        kind: 'RESCUE',
      });

      // Check if all 7 rescued -> Trigger Act 3 Boss Fight!
      if (this.followers.length >= 7) {
        this.startBossAct();
      }
      this.pushHudSnapshot();
    }
  }

  private startBossAct(): void {
    this.act = 'BOSS_INTRO';
    this.bossIntroTimer = 0;
    this.enemies = [];
    this.rocks = [];
    this.shockRings = [];
    this.projectiles = [];
    this.player.vx = 0;
    this.player.vy = 0;
    this.player.dashTimer = 0;
    this.attackBuffer = 0;
    this.specialBuffer = 0;
    this.jisungBurstLeft = 0;
    this.boss = this.createInitialBoss();
    audioEngine.playBossWarning();
    audioEngine.setMusicMode('BOSS');

    this.callbacks.onCutIn({
      id: this.cutInSeq++,
      memberId: this.selectedMember.id,
      title: '¡EL NÚCLEO DEL TERREMOTO!',
      subtitle: 'Los 8 reunidos — ¡Derrota al Jefe Abisal!',
      accentColor: '#ff2a55',
      kind: 'BOSS',
    });
  }

  private damageBoss(dmg: number, heavy: boolean): void {
    const b = this.boss;
    if (!b.active) return;
    b.hp -= dmg;
    b.hitFlash = 0.12;
    audioEngine.playHit(heavy);
    this.spawnBurst(b.x + (Math.random() - 0.5) * 60, b.y + (Math.random() - 0.5) * 60, '#00f0ff', heavy ? 14 : 7, 'STAR');
    this.registerComboHit(1, heavy);
    this.combatScore += Math.round(dmg * 2.2);

    if (b.hp <= 0) {
      b.hp = 0;
      b.active = false;
      this.triggerEndingAscent();
    }
  }

  private triggerEndingAscent(): void {
    this.act = 'ENDING';
    this.screen = 'ENDING_ASCENT';
    this.endingTimer = 0;
    this.hitstopTimer = 0.09;
    this.shakeMag = 20;
    this.flashAlpha = 0.9;
    this.flashColor = '#00f0ff';
    audioEngine.playVictoryFlash();

    this.spawnBurst(this.boss.x, this.boss.y, '#00f0ff', 48, 'STAR');
    this.spawnBurst(this.boss.x, this.boss.y, '#ffffff', 32, 'DROPLET');

    this.endingDroplets = [];
    for (let i = 0; i < 70; i++) {
      this.endingDroplets.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        r: 4 + Math.random() * 11,
        speed: 90 + Math.random() * 180,
        shimmer: Math.random() * Math.PI * 2,
      });
    }

    this.callbacks.onScreenChange('ENDING_ASCENT');
    this.pushHudSnapshot();
  }

  private damagePlayer(dmg: number, sourceX: number, sourceY: number): void {
    const p = this.player;
    if (p.invulnTimer > 0 || p.dashTimer > 0) return;

    if (p.shieldHits > 0) {
      p.shieldHits -= 1;
      p.invulnTimer = 0.65;
      audioEngine.playHit(false);
      this.spawnBurst(p.x, p.y, '#22d3ee', 14, 'RING');
      this.addFloatingText(p.x, p.y - 34, '¡BLOQUEADO!', '#22d3ee', 1.15);
      return;
    }

    p.hp -= dmg;
    p.invulnTimer = 0.85;
    p.hitFlash = 0.22;
    this.combo = 0;
    this.lastEpicMilestone = 0;
    this.shakeMag = Math.max(this.shakeMag, 10);
    this.hitstopTimer = 0.04;
    audioEngine.playDamage();

    const ang = Math.atan2(p.y - sourceY, p.x - sourceX);
    p.vx = Math.cos(ang) * 300;
    p.vy = Math.sin(ang) * 300;
    this.spawnBurst(p.x, p.y, '#ff2a55', 14, 'SHARD');
    this.addFloatingText(p.x, p.y - 28, `-${Math.round(dmg)}`, '#ff2a55', 1.15);

    if (p.hp <= 0) {
      p.hp = 0;
      this.triggerGameOver('Tu equipo cayó ante los peligros del abismo.');
    }
  }

  private triggerGameOver(reason: string): void {
    this.gameOverReason = reason;
    this.screen = 'GAME_OVER';
    audioEngine.setMusicMode('TITLE');
    this.callbacks.onScreenChange('GAME_OVER');
    this.pushHudSnapshot();
  }

  private registerComboHit(amount: number, onBeat: boolean): void {
    const gain = onBeat ? amount + 1 : amount;
    this.combo += gain;
    this.comboTimer = 3.2;
    if (this.combo > this.maxCombo) {
      this.maxCombo = this.combo;
    }

    // Every 5 hits in a single chain counts as an "Epic Combo" surge!
    const milestone = Math.floor(this.combo / 5);
    if (milestone > this.lastEpicMilestone && this.combo >= 5) {
      this.lastEpicMilestone = milestone;
      this.epicCombos += 1;
      this.combatScore += 250;
      this.addFloatingText(this.player.x, this.player.y - 52, `¡COMBO ÉPICO x${this.combo}!`, '#fde047', 1.3);
      this.spawnBurst(this.player.x, this.player.y, '#fde047', 14, 'STAR');
    }
  }

  private spawnBurst(x: number, y: number, color: string, count: number, shape: Particle['shape']): void {
    for (let i = 0; i < count; i++) {
      const ang = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.5;
      const spd = 90 + Math.random() * 260;
      this.particles.push({
        x,
        y,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd,
        size: 5 + Math.random() * 9,
        color,
        outline: true,
        life: 0.35 + Math.random() * 0.35,
        maxLife: 0.7,
        shape,
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 10,
      });
    }
    if (this.particles.length > 260) {
      this.particles.splice(0, this.particles.length - 260);
    }
  }

  private addFloatingText(x: number, y: number, text: string, color: string, scale = 1): void {
    this.floatingTexts.push({
      x,
      y,
      vy: -58,
      text,
      color,
      scale,
      life: 0.95,
      maxLife: 0.95,
    });
  }

  private updateParticles(dt: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const pt = this.particles[i];
      pt.life -= dt;
      if (pt.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }
      pt.x += pt.vx * dt;
      pt.y += pt.vy * dt;
      pt.vx *= 0.94;
      pt.vy *= 0.94;
      pt.rotation += pt.rotSpeed * dt;
    }
  }

  private updateSlashes(dt: number): void {
    for (let i = this.slashes.length - 1; i >= 0; i--) {
      this.slashes[i].life -= dt;
      if (this.slashes[i].life <= 0) this.slashes.splice(i, 1);
    }
  }

  private updateFloatingTexts(dt: number): void {
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.life -= dt;
      ft.y += ft.vy * dt;
      ft.vy *= 0.94;
      if (ft.life <= 0) this.floatingTexts.splice(i, 1);
    }
  }

  private buildScoreBreakdown() {
    if (
      this.screen !== 'VICTORY_FREEZE' &&
      this.screen !== 'VICTORY' &&
      this.screen !== 'GAME_OVER'
    ) {
      return null;
    }
    return calculateFinalScoreAndRank({
      baseCombatScore: this.combatScore,
      rescuedCount: this.followers.length,
      pearlsCollected: this.pearls,
      pearlScoreMult: this.selectedMember.pearlScoreMult,
      maxCombo: this.maxCombo,
      epicCombosCount: this.epicCombos,
      timeRemainingSeconds: this.timeLeft,
      bossDefeated: this.screen === 'VICTORY_FREEZE' || this.screen === 'VICTORY',
    });
  }

  private pushHudSnapshot(): void {
    const beatPhase = audioEngine.getBeatPhase();
    const beatPulse = Math.max(0, 1 - Math.min(beatPhase, 1 - beatPhase) * 4.5);

    this.callbacks.onHudUpdate({
      screen: this.screen,
      act: this.act,
      selectedMemberId: this.selectedMember.id,
      hp: Math.ceil(this.player.hp),
      maxHp: this.player.maxHp,
      pressure: Math.round(this.player.pressure),
      timeLeft: this.timeLeft,
      timeFrozen: this.player.timeFreezeTimer > 0,
      specialCharge: Math.floor(this.player.specialCharge),
      specialActiveTimer: Math.max(
        this.player.pressureFreezeTimer,
        this.player.timeFreezeTimer,
        this.player.speedBoostTimer,
        this.player.foxSenseTimer
      ),
      shieldHits: this.player.shieldHits,
      pearls: this.pearls,
      score: Math.round(this.combatScore + this.pearls * 120 * this.selectedMember.pearlScoreMult + this.followers.length * 650),
      combo: this.combo,
      maxCombo: this.maxCombo,
      epicCombos: this.epicCombos,
      beatPulse,
      rescuedIds: this.followers.map((f) => f.member.id),
      trappedIds: this.spheres.filter((s) => !s.rescued).map((s) => s.member.id),
      bossActive: this.act === 'BOSS' || this.act === 'BOSS_INTRO',
      bossHp: Math.ceil(this.boss.hp),
      bossMaxHp: this.boss.maxHp,
      bossName: 'El Núcleo del Terremoto',
      introCaption: this.introCaption,
      endingTime: this.endingTimer,
      gameOverReason: this.gameOverReason,
      scoreBreakdown: this.buildScoreBreakdown(),
    });
  }

  // ==================== CEL-SHADED ANIME RENDERING ====================

  private render(): void {
    const ctx = this.ctx;
    ctx.save();

    if (this.screen === 'TITLE_MENU' || this.screen === 'CHAR_SELECT') {
      this.renderTitleBackdrop(ctx);
      ctx.restore();
      return;
    }

    if (this.screen === 'INTRO_QUAKE') {
      this.renderIntroQuake(ctx);
      ctx.restore();
      return;
    }

    if (
      this.screen === 'ENDING_ASCENT' ||
      this.screen === 'VICTORY_FREEZE' ||
      this.screen === 'VICTORY'
    ) {
      this.renderEndingAscent(ctx);
      ctx.restore();
      return;
    }

    // Apply decaying camera shake
    const sx = (Math.random() - 0.5) * this.shakeMag * 2;
    const sy = (Math.random() - 0.5) * this.shakeMag * 2;

    this.renderAbyssBackground(ctx);

    ctx.save();
    ctx.translate(Math.round(this.width / 2 - this.camX + sx), Math.round(this.height / 2 - this.camY + sy));

    // Parallax sunken ruins & kelp
    this.renderScenery(ctx);

    // Boss arena boundary ring in Act 3
    if (this.act === 'BOSS' || this.act === 'BOSS_INTRO') {
      this.renderBossArena(ctx);
    }

    // Ocean currents
    if (this.act === 'EXPLORE') {
      this.renderCurrents(ctx);
    }

    // Collectibles
    this.renderCollectibles(ctx);

    // Trapped teammate spheres
    if (this.act === 'EXPLORE') {
      this.renderSpheres(ctx);
    }

    // Enemies
    this.renderEnemies(ctx);

    // Boss
    if (this.act === 'BOSS' || this.act === 'BOSS_INTRO') {
      this.renderBoss(ctx);
    }

    // Falling earthquake rocks + warning telegraphs
    this.renderRocks(ctx);

    // Shock rings
    this.renderShockRings(ctx);

    // Followers + Player
    for (const f of this.followers) {
      this.renderSwimmer(ctx, f.x, f.y, f.angle, f.member, f.swimPhase, 0.84, 1, 1, f.attackFlash > 0, false);
    }
    this.renderPlayer(ctx);

    // Manga slashes & projectiles
    this.renderSlashes(ctx);
    this.renderProjectiles(ctx);
    this.renderParticles(ctx);
    this.renderFloatingTexts(ctx);

    ctx.restore();

    // Screen-space anime effects: speedlines when moving fast, directional radar pointers, pressure vignette
    this.renderScreenOverlays(ctx);

    ctx.restore();
  }

  private renderTitleBackdrop(ctx: CanvasRenderingContext2D): void {
    const w = this.width;
    const h = this.height;

    // Stepped cel-shaded ocean bands
    const bands = ['#0a2548', '#071a36', '#051126', '#030916'];
    const bandH = h / bands.length;
    bands.forEach((col, i) => {
      ctx.fillStyle = col;
      ctx.fillRect(0, i * bandH, w, bandH + 2);
    });

    // Diagonal anime light rays from upper right
    ctx.save();
    for (let i = 0; i < 6; i++) {
      const rx = w * (0.1 + i * 0.18) + Math.sin(this.elapsed * 0.5 + i) * 35;
      ctx.fillStyle = i % 2 === 0 ? 'rgba(0, 240, 255, 0.06)' : 'rgba(56, 189, 248, 0.04)';
      ctx.beginPath();
      ctx.moveTo(rx, 0);
      ctx.lineTo(rx + 120, 0);
      ctx.lineTo(rx - 140, h);
      ctx.lineTo(rx - 260, h);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();

    // Cel-shaded stylized rising wave curves at bottom
    ctx.save();
    ctx.fillStyle = '#072a4f';
    ctx.strokeStyle = '#050811';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(0, h);
    for (let x = 0; x <= w + 40; x += 40) {
      const wy = h - 75 + Math.sin(x * 0.012 + this.elapsed * 2.1) * 22;
      ctx.lineTo(x, wy);
    }
    ctx.lineTo(w, h);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Cyan crest highlight
    ctx.strokeStyle = '#00f0ff';
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (let x = 0; x <= w + 40; x += 40) {
      const wy = h - 75 + Math.sin(x * 0.012 + this.elapsed * 2.1) * 22;
      if (x === 0) ctx.moveTo(x, wy);
      else ctx.lineTo(x, wy);
    }
    ctx.stroke();
    ctx.restore();

    // Floating cel-shaded bubbles
    for (let i = 0; i < 28; i++) {
      const b = this.bgBubbles[i];
      const bx = ((b.x + this.elapsed * 14) % (w + 60)) - 30;
      const by = (b.y % (h + 60)) - 30;
      ctx.fillStyle = 'rgba(103, 232, 249, 0.22)';
      ctx.strokeStyle = '#050811';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(bx, by, b.r * 0.75, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#e0f2fe';
      ctx.beginPath();
      ctx.arc(bx - b.r * 0.24, by - b.r * 0.24, b.r * 0.22, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private renderIntroQuake(ctx: CanvasRenderingContext2D): void {
    const w = this.width;
    const h = this.height;
    const t = this.introTimer;
    const sx = (Math.random() - 0.5) * this.shakeMag * 2;
    const sy = (Math.random() - 0.5) * this.shakeMag * 2;

    ctx.save();
    ctx.translate(sx, sy);

    // Phase 1 (0..1.5s): Warm coastal sunset -> Phase 2 (1.5..3.2s): Darkening storm -> Phase 3 (3.2..5.8s): Abyssal plunge
    const stormMix = Math.max(0, Math.min(1, (t - 1.4) / 1.5));
    const plungeMix = Math.max(0, Math.min(1, (t - 3.3) / 1.8));

    if (plungeMix > 0.65) {
      // Deep underwater plunge visual
      ctx.fillStyle = '#041226';
      ctx.fillRect(-40, -40, w + 80, h + 80);
      // Violent radial manga speedlines downward
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.45)';
      ctx.lineWidth = 3;
      for (let i = 0; i < 36; i++) {
        const lx = ((i * 97) % w);
        const ly = ((this.elapsed * 950 + i * 110) % (h + 240)) - 120;
        ctx.beginPath();
        ctx.moveTo(lx, ly);
        ctx.lineTo(lx, ly + 110);
        ctx.stroke();
      }

      // Draw all 8 members being swept apart into the abyss!
      MEMBERS.forEach((m, idx) => {
        const spread = (t - 3.6) * 190;
        const ang = (idx / 8) * Math.PI * 2 + 0.4;
        const mx = w / 2 + Math.cos(ang) * (m.id === this.selectedMember.id ? 20 : spread);
        const my = h / 2 + Math.sin(ang) * (m.id === this.selectedMember.id ? 20 : spread * 0.72);
        this.renderSwimmer(ctx, mx, my, ang, m, this.elapsed * 9, 1.0, 1, 1, false, false);
        if (m.id !== this.selectedMember.id && t > 4.2) {
          ctx.strokeStyle = '#a855f7';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(mx, my, 34, 0, Math.PI * 2);
          ctx.stroke();
        }
      });
    } else {
      // Coastal sky stepped bands (shifts warm amber -> dark stormy crimson-navy)
      const skyTop = stormMix < 0.5 ? '#c2410c' : '#1e1b4b';
      const skyMid = stormMix < 0.5 ? '#f59e0b' : '#31103a';
      const skyLow = stormMix < 0.5 ? '#fde68a' : '#7f1d1d';

      ctx.fillStyle = skyTop;
      ctx.fillRect(-40, -40, w + 80, h * 0.25 + 40);
      ctx.fillStyle = skyMid;
      ctx.fillRect(-40, h * 0.25, w + 80, h * 0.2);
      ctx.fillStyle = skyLow;
      ctx.fillRect(-40, h * 0.45, w + 80, h * 0.14);

      // Coastal sun disc
      ctx.fillStyle = stormMix < 0.5 ? '#fffbeb' : '#ff2a55';
      ctx.strokeStyle = '#050811';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(w * 0.76, h * 0.36, 56, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Ocean horizon
      const seaY = h * 0.57;
      ctx.fillStyle = stormMix < 0.5 ? '#0e7490' : '#061a33';
      ctx.fillRect(-40, seaY, w + 80, h - seaY + 40);

      // Glowing underwater earthquake fissure opening in ocean!
      if (t > 1.7) {
        ctx.save();
        ctx.strokeStyle = '#00f0ff';
        ctx.lineWidth = 6 + (t - 1.7) * 8;
        ctx.beginPath();
        ctx.moveTo(w * 0.22, seaY + 25);
        ctx.lineTo(w * 0.44, seaY + 95);
        ctx.lineTo(w * 0.6, seaY + 55);
        ctx.lineTo(w * 0.82, seaY + 135);
        ctx.stroke();
        ctx.restore();
      }

      // Coastal Pier (cracks & sinks after t = 2.6s)
      const pierSink = t > 2.6 ? (t - 2.6) * 230 : 0;
      const pierY = h * 0.64 + pierSink;
      ctx.fillStyle = '#573b26';
      ctx.strokeStyle = '#050811';
      ctx.lineWidth = 4;
      ctx.fillRect(w * 0.08, pierY, w * 0.84, 34);
      ctx.strokeRect(w * 0.08, pierY, w * 0.84, 34);

      // Pier support pilings
      for (let i = 0; i < 6; i++) {
        const px = w * 0.14 + i * (w * 0.144);
        ctx.fillStyle = '#3b2516';
        ctx.fillRect(px, pierY + 34, 24, h - pierY + 40);
        ctx.strokeRect(px, pierY + 34, 24, h - pierY + 40);
      }

      // Jagged manga cracks across pier during quake
      if (t > 1.6) {
        ctx.strokeStyle = '#050811';
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(w * 0.48, pierY);
        ctx.lineTo(w * 0.51, pierY + 16);
        ctx.lineTo(w * 0.46, pierY + 34);
        ctx.moveTo(w * 0.32, pierY);
        ctx.lineTo(w * 0.35, pierY + 20);
        ctx.lineTo(w * 0.31, pierY + 34);
        ctx.stroke();
      }

      // All 8 Los Perdidos standing on the pier!
      MEMBERS.forEach((m, idx) => {
        const spacing = (w * 0.72) / 8;
        const mx = w * 0.16 + idx * spacing + spacing * 0.5;
        const fallOffset = t > 2.7 ? (t - 2.7) * (160 + (idx % 3) * 70) : 0;
        const my = pierY - 26 + fallOffset;
        this.renderStandingChibi(ctx, mx, my, m, t > 1.6);
      });

      // Flying wood debris during collapse
      if (t > 2.6) {
        ctx.fillStyle = '#573b26';
        ctx.strokeStyle = '#050811';
        ctx.lineWidth = 3;
        for (const d of this.introDebris) {
          ctx.save();
          ctx.translate(w * 0.1 + (d.x % (w * 0.8)), pierY + d.y);
          ctx.rotate(d.rot);
          ctx.fillRect(-d.w / 2, -d.h / 2, d.w, d.h);
          ctx.strokeRect(-d.w / 2, -d.h / 2, d.w, d.h);
          ctx.restore();
        }
      }
    }

    ctx.restore();
  }

  private renderStandingChibi(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    m: MemberProfile,
    shocked: boolean
  ): void {
    ctx.save();
    ctx.translate(x, y);

    // Body (black stylish outfit)
    ctx.fillStyle = m.suitColor;
    ctx.strokeStyle = '#050811';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(-13, -4, 26, 30, 6);
    ctx.fill();
    ctx.stroke();

    // Accent sash/stripe
    ctx.fillStyle = m.accentColor;
    ctx.fillRect(-10, 4, 20, 5);

    // Head
    ctx.fillStyle = '#fdd5c0';
    ctx.beginPath();
    ctx.arc(0, -16, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Hair cel-shaded cap
    ctx.fillStyle = m.hairColor;
    ctx.beginPath();
    ctx.arc(0, -19, 15.5, Math.PI * 0.92, Math.PI * 2.08);
    ctx.lineTo(13, -10);
    ctx.lineTo(6, -15);
    ctx.lineTo(0, -9);
    ctx.lineTo(-7, -15);
    ctx.lineTo(-13, -10);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Manga shock marks when earthquake hits
    if (shocked) {
      ctx.strokeStyle = '#ff2a55';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(-16, -34);
      ctx.lineTo(-22, -44);
      ctx.moveTo(0, -37);
      ctx.lineTo(0, -48);
      ctx.moveTo(16, -34);
      ctx.lineTo(22, -44);
      ctx.stroke();
    }

    ctx.restore();
  }

  private renderAbyssBackground(ctx: CanvasRenderingContext2D): void {
    const w = this.width;
    const h = this.height;
    const depthFactor = Math.min(1, this.camY / WORLD_H);

    // Hard cel-shaded stepped ocean depth zones
    const palette = this.act === 'BOSS' || this.act === 'BOSS_INTRO'
      ? ['#0d0821', '#09061a', '#050412', '#03020a']
      : depthFactor < 0.45
        ? ['#0b335c', '#082647', '#051a34', '#031022']
        : ['#071f3c', '#05152c', '#030d1d', '#020711'];

    const bandH = h / palette.length;
    for (let i = 0; i < palette.length; i++) {
      ctx.fillStyle = palette[i];
      ctx.fillRect(0, i * bandH, w, bandH + 2);
    }

    // Diagonal light beams near upper depths
    if (this.act === 'EXPLORE' && depthFactor < 0.65) {
      ctx.save();
      const alpha = (0.65 - depthFactor) * 0.11;
      ctx.fillStyle = `rgba(0, 240, 255, ${alpha.toFixed(3)})`;
      for (let i = 0; i < 5; i++) {
        const bx = ((i * 360 - this.camX * 0.25) % (w + 400) + (w + 400)) % (w + 400) - 180;
        ctx.beginPath();
        ctx.moveTo(bx, 0);
        ctx.lineTo(bx + 110, 0);
        ctx.lineTo(bx - 130, h);
        ctx.lineTo(bx - 240, h);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    }

    // Felix time-freeze indigo tint
    if (this.player.timeFreezeTimer > 0) {
      ctx.fillStyle = 'rgba(129, 140, 248, 0.14)';
      ctx.fillRect(0, 0, w, h);
    }
  }

  private renderScenery(ctx: CanvasRenderingContext2D): void {
    // World boundary walls (cel-shaded abyssal cliffs)
    ctx.strokeStyle = '#00f0ff';
    ctx.lineWidth = 4;
    ctx.strokeRect(46, 86, WORLD_W - 92, WORLD_H - 136);

    // Sunken ruins silhouettes with hard cel outlines
    for (const r of this.ruins) {
      ctx.save();
      ctx.translate(r.x, r.y);
      ctx.rotate(r.tilt);
      ctx.fillStyle = '#091b33';
      ctx.strokeStyle = '#030712';
      ctx.lineWidth = 4;
      ctx.fillRect(-r.w / 2, -r.h / 2, r.w, r.h);
      ctx.strokeRect(-r.w / 2, -r.h / 2, r.w, r.h);
      // Hard cel highlight edge
      ctx.fillStyle = '#123154';
      ctx.fillRect(-r.w / 2 + 4, -r.h / 2 + 4, 16, r.h - 8);
      ctx.restore();
    }

    // Glowing seismic floor fissure at bottom
    ctx.save();
    ctx.strokeStyle = this.act === 'BOSS' ? '#ff2a55' : '#00f0ff';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(220, WORLD_H - 72);
    for (let x = 220; x <= WORLD_W - 220; x += 140) {
      ctx.lineTo(x, WORLD_H - 72 + Math.sin(x * 0.02) * 18);
    }
    ctx.stroke();
    ctx.restore();

    // Swaying cel-shaded kelp
    for (const k of this.kelpStalks) {
      ctx.save();
      ctx.strokeStyle = '#040812';
      ctx.lineWidth = 14;
      ctx.lineCap = 'round';
      const swayX = Math.sin(this.elapsed * 1.8 + k.sway) * 26;
      ctx.beginPath();
      ctx.moveTo(k.x, k.y);
      ctx.quadraticCurveTo(k.x + swayX * 0.5, k.y - k.h * 0.5, k.x + swayX, k.y - k.h);
      ctx.stroke();

      ctx.strokeStyle = k.color;
      ctx.lineWidth = 8;
      ctx.stroke();
      ctx.restore();
    }

    // Background bubbles
    for (const b of this.bgBubbles) {
      ctx.fillStyle = 'rgba(103, 232, 249, 0.14)';
      ctx.strokeStyle = 'rgba(5, 8, 17, 0.65)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r * 0.65, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
  }

  private renderBossArena(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.fillStyle = 'rgba(255, 42, 85, 0.06)';
    ctx.fillRect(BOSS_ARENA.x, BOSS_ARENA.y, BOSS_ARENA.w, BOSS_ARENA.h);

    ctx.strokeStyle = '#ff2a55';
    ctx.lineWidth = 5;
    ctx.setLineDash([22, 12]);
    ctx.lineDashOffset = -this.elapsed * 45;
    ctx.strokeRect(BOSS_ARENA.x, BOSS_ARENA.y, BOSS_ARENA.w, BOSS_ARENA.h);
    ctx.restore();
  }

  private renderCurrents(ctx: CanvasRenderingContext2D): void {
    for (const c of this.currents) {
      ctx.save();
      ctx.fillStyle = 'rgba(0, 240, 255, 0.08)';
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.25)';
      ctx.lineWidth = 2;
      ctx.fillRect(c.x, c.y, c.w, c.h);
      ctx.strokeRect(c.x, c.y, c.w, c.h);

      // Animated cel-shaded current flow arrows/ribbons
      ctx.strokeStyle = 'rgba(165, 243, 252, 0.65)';
      ctx.lineWidth = 3;
      const count = 4;
      for (let i = 0; i < count; i++) {
        const frac = ((i / count) + (this.elapsed * 0.55)) % 1;
        const rx = c.x + (c.dirX >= 0 ? frac * c.w : (1 - frac) * c.w);
        const ry = c.y + ((i + 0.5) / count) * c.h;
        ctx.beginPath();
        ctx.moveTo(rx - c.dirX * 34, ry - c.dirY * 34);
        ctx.lineTo(rx + c.dirX * 34, ry + c.dirY * 34);
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  private renderCollectibles(ctx: CanvasRenderingContext2D): void {
    for (const c of this.collectibles) {
      if (c.collected) continue;
      ctx.save();
      ctx.translate(c.x, c.y);

      if (c.kind === 'BUBBLE') {
        const pulse = 1 + Math.sin(c.phase * 2) * 0.08;
        ctx.scale(pulse, 2 - pulse);
        ctx.fillStyle = '#38bdf8';
        ctx.strokeStyle = '#050811';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, 0, c.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Hard cel-shaded inner crescent
        ctx.fillStyle = '#a5f3fc';
        ctx.beginPath();
        ctx.arc(-4, -4, c.radius * 0.58, 0, Math.PI * 2);
        ctx.fill();

        // Specular glint
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(-7, -7, 4.5, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Luminous Pearl
        const bob = Math.sin(c.phase * 2.4) * 4;
        ctx.translate(0, bob);

        // Outer neon aura ring
        ctx.strokeStyle = 'rgba(254, 240, 138, 0.75)';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(0, 0, c.radius + 5 + Math.sin(c.phase * 4) * 2, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = '#f8fafc';
        ctx.strokeStyle = '#050811';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, 0, c.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Cel-shaded shadow crescent on pearl
        ctx.fillStyle = '#bae6fd';
        ctx.beginPath();
        ctx.arc(3, 3, c.radius * 0.65, 0.2, Math.PI * 1.15);
        ctx.fill();

        // Sharp white anime sparkle
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(-4, -4, 3.8, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }
  }

  private renderSpheres(ctx: CanvasRenderingContext2D): void {
    for (const s of this.spheres) {
      if (s.rescued) continue;
      ctx.save();
      ctx.translate(s.x, s.y);

      const pulse = 1 + Math.sin(s.pulsePhase) * 0.06;

      // Pulsing distress beacon ring
      ctx.strokeStyle = s.member.accentColor;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, s.radius + 14 + Math.sin(s.pulsePhase * 1.5) * 6, 0, Math.PI * 2);
      ctx.stroke();

      ctx.save();
      ctx.scale(pulse, pulse);

      // Clipped member anime portrait inside the dark prison sphere!
      const img = this.portraitImages.get(s.member.id);
      if (img && img.complete && img.naturalWidth > 0) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(0, 0, s.radius - 4, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(img, -s.radius, -s.radius - 6, s.radius * 2, s.radius * 2.4);
        ctx.fillStyle = s.hitFlash > 0 ? 'rgba(255,255,255,0.65)' : 'rgba(24, 10, 48, 0.42)';
        ctx.fillRect(-s.radius, -s.radius, s.radius * 2, s.radius * 2);
        ctx.restore();
      } else {
        ctx.fillStyle = '#1e1038';
        ctx.beginPath();
        ctx.arc(0, 0, s.radius, 0, Math.PI * 2);
        ctx.fill();
      }

      // Dark sphere cel shell + ink outline
      ctx.strokeStyle = '#050811';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(0, 0, s.radius, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = s.hitFlash > 0 ? '#ffffff' : '#a855f7';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, s.radius - 3, 0, Math.PI * 2);
      ctx.stroke();

      // Criss-cross shadow chains binding the sphere
      ctx.strokeStyle = '#050811';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(-s.radius * 0.72, -s.radius * 0.72);
      ctx.lineTo(s.radius * 0.72, s.radius * 0.72);
      ctx.moveTo(s.radius * 0.72, -s.radius * 0.72);
      ctx.lineTo(-s.radius * 0.72, s.radius * 0.72);
      ctx.stroke();

      ctx.restore();

      // Name plate & HP bar underneath
      ctx.font = '700 13px "Antonio", sans-serif';
      ctx.textAlign = 'center';
      ctx.lineWidth = 4;
      ctx.strokeStyle = '#050811';
      ctx.strokeText(s.member.name.toUpperCase(), 0, s.radius + 20);
      ctx.fillStyle = '#ffffff';
      ctx.fillText(s.member.name.toUpperCase(), 0, s.radius + 20);

      // Sphere HP bar
      const bw = 64;
      ctx.fillStyle = '#050811';
      ctx.fillRect(-bw / 2 - 2, s.radius + 25, bw + 4, 9);
      ctx.fillStyle = s.member.accentColor;
      ctx.fillRect(-bw / 2, s.radius + 27, bw * Math.max(0, s.hp / s.maxHp), 5);

      ctx.restore();
    }
  }

  private renderEnemies(ctx: CanvasRenderingContext2D): void {
    for (const e of this.enemies) {
      ctx.save();
      ctx.translate(e.x, e.y);

      if (e.kind === 'JELLY') {
        // Electric shock telegraph / active ring
        if (e.state === 'WINDUP') {
          ctx.strokeStyle = 'rgba(255, 42, 85, 0.85)';
          ctx.lineWidth = 3;
          ctx.setLineDash([8, 6]);
          ctx.beginPath();
          ctx.arc(0, 0, 108, 0, Math.PI * 2);
          ctx.stroke();
          ctx.setLineDash([]);
        } else if (e.state === 'ACTION') {
          ctx.fillStyle = 'rgba(192, 132, 252, 0.25)';
          ctx.strokeStyle = '#00f0ff';
          ctx.lineWidth = 5;
          ctx.beginPath();
          ctx.arc(0, 0, e.shockRadius, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        }

        // Tentacles
        ctx.strokeStyle = '#050811';
        ctx.lineWidth = 5;
        for (let t = -2; t <= 2; t++) {
          const tx = t * 8;
          const sway = Math.sin(e.phase * 2 + t) * 7;
          ctx.beginPath();
          ctx.moveTo(tx, 6);
          ctx.quadraticCurveTo(tx + sway, 22, tx - sway * 0.5, 34);
          ctx.stroke();
          ctx.strokeStyle = e.frozenTimer > 0 ? '#67e8f9' : '#c084fc';
          ctx.lineWidth = 2.5;
          ctx.stroke();
          ctx.strokeStyle = '#050811';
          ctx.lineWidth = 5;
        }

        // Cel-shaded Bell Dome
        ctx.fillStyle = e.hitFlash > 0 ? '#ffffff' : e.frozenTimer > 0 ? '#67e8f9' : '#9333ea';
        ctx.strokeStyle = '#050811';
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.arc(0, 2, e.radius, Math.PI, 0);
        ctx.lineTo(e.radius, 8);
        ctx.lineTo(-e.radius, 8);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Cel highlight band
        ctx.fillStyle = e.frozenTimer > 0 ? '#e0f2fe' : '#e879f9';
        ctx.beginPath();
        ctx.arc(-6, -7, e.radius * 0.42, Math.PI, 0);
        ctx.fill();
      } else {
        // Shadow Creature (ink-black abyssal manta/serpent with crimson manga eyes)
        const angle = Math.atan2(e.vy, e.vx || 1);
        ctx.rotate(angle);

        if (e.state === 'WINDUP') {
          // Sharp crimson anime glint telegraph
          ctx.strokeStyle = '#ff2a55';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(16, 0);
          ctx.lineTo(130, 0);
          ctx.stroke();
        }

        ctx.fillStyle = e.hitFlash > 0 ? '#ffffff' : e.frozenTimer > 0 ? '#38bdf8' : '#0b0f1e';
        ctx.strokeStyle = e.frozenTimer > 0 ? '#e0f2fe' : '#ff2a55';
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.moveTo(e.radius + 8, 0);
        ctx.lineTo(-4, -e.radius * 0.95);
        ctx.lineTo(-e.radius * 1.15, -6);
        ctx.lineTo(-e.radius * 0.7, 0);
        ctx.lineTo(-e.radius * 1.15, 6);
        ctx.lineTo(-4, e.radius * 0.95);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Glowing crimson eyes
        ctx.fillStyle = '#ff2a55';
        ctx.beginPath();
        ctx.arc(10, -7, 4, 0, Math.PI * 2);
        ctx.arc(10, 7, 4, 0, Math.PI * 2);
        ctx.fill();
      }

      // Ice crystal prism if frozen by Hyunjin
      if (e.frozenTimer > 0) {
        ctx.strokeStyle = '#e0f2fe';
        ctx.lineWidth = 3;
        ctx.strokeRect(-e.radius, -e.radius, e.radius * 2, e.radius * 2);
      }

      ctx.restore();
    }
  }

  private renderRocks(ctx: CanvasRenderingContext2D): void {
    for (const r of this.rocks) {
      if (r.warningTimer > 0) {
        // Clear anime red exclamation drop-line telegraph
        ctx.save();
        ctx.strokeStyle = 'rgba(255, 42, 85, 0.75)';
        ctx.lineWidth = 3;
        ctx.setLineDash([10, 8]);
        ctx.beginPath();
        ctx.moveTo(r.x, r.spawnY);
        ctx.lineTo(r.x, r.spawnY + 620);
        ctx.stroke();
        ctx.setLineDash([]);

        const badgeY = Math.max(this.camY - this.height / 2 + 64, r.spawnY + 30);
        ctx.fillStyle = '#ff2a55';
        ctx.strokeStyle = '#050811';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(r.x, badgeY, 16, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#ffffff';
        ctx.font = '700 18px "Antonio", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('!', r.x, badgeY + 6);
        ctx.restore();
        continue;
      }

      ctx.save();
      ctx.translate(r.x, r.y);
      ctx.rotate(r.rotation);
      ctx.fillStyle = '#334155';
      ctx.strokeStyle = '#050811';
      ctx.lineWidth = 4;
      ctx.beginPath();
      r.vertices.forEach((v, idx) => {
        const a = (idx / r.vertices.length) * Math.PI * 2;
        const px = Math.cos(a) * r.radius * v;
        const py = Math.sin(a) * r.radius * v;
        if (idx === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      });
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Cel-shaded rock facet
      ctx.fillStyle = '#64748b';
      ctx.beginPath();
      ctx.moveTo(-r.radius * 0.45, -r.radius * 0.45);
      ctx.lineTo(r.radius * 0.3, -r.radius * 0.5);
      ctx.lineTo(0, r.radius * 0.15);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  }

  private renderBoss(ctx: CanvasRenderingContext2D): void {
    const b = this.boss;
    ctx.save();
    ctx.translate(b.x, b.y);

    // Sweeping Abyssal Beam telegraph or active manga beam
    if (b.attackPattern === 'BEAM_WINDUP' || b.attackPattern === 'BEAM_FIRE') {
      ctx.save();
      ctx.rotate(b.beamAngle);
      if (b.attackPattern === 'BEAM_WINDUP') {
        ctx.strokeStyle = 'rgba(255, 42, 85, 0.9)';
        ctx.lineWidth = 4;
        ctx.setLineDash([14, 10]);
        ctx.beginPath();
        ctx.moveTo(b.radius, 0);
        ctx.lineTo(680, 0);
        ctx.stroke();
      } else {
        // Thick cel-shaded energy beam
        ctx.fillStyle = '#ff2a55';
        ctx.strokeStyle = '#050811';
        ctx.lineWidth = 4;
        ctx.fillRect(b.radius * 0.7, -26, 660, 52);
        ctx.strokeRect(b.radius * 0.7, -26, 660, 52);
        ctx.fillStyle = '#fff1f2';
        ctx.fillRect(b.radius * 0.7, -10, 660, 20);
      }
      ctx.restore();
    }

    // Outer rotating armored tectonic plates
    ctx.save();
    ctx.rotate(b.angle);
    for (let i = 0; i < 6; i++) {
      const ang = (i / 6) * Math.PI * 2;
      ctx.save();
      ctx.rotate(ang);
      ctx.fillStyle = b.hitFlash > 0 ? '#ffffff' : '#1e293b';
      ctx.strokeStyle = '#050811';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(b.radius - 16, -24);
      ctx.lineTo(b.radius + 18, -14);
      ctx.lineTo(b.radius + 18, 14);
      ctx.lineTo(b.radius - 16, 24);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Glowing seismic crack on plate
      ctx.fillStyle = '#ff2a55';
      ctx.fillRect(b.radius - 4, -4, 16, 8);
      ctx.restore();
    }
    ctx.restore();

    // Inner dark tectonic core
    ctx.fillStyle = b.hitFlash > 0 ? '#ffffff' : '#0f172a';
    ctx.strokeStyle = '#050811';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(0, 0, b.radius - 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Glowing Weak-Point Eye (pulsing crimson/cyan)
    const eyePulse = 24 + Math.sin(this.elapsed * 8) * 4;
    ctx.fillStyle = b.frozenTimer > 0 ? '#67e8f9' : '#ff2a55';
    ctx.strokeStyle = '#050811';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(0, 0, eyePulse, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#fef08a';
    ctx.beginPath();
    ctx.arc(0, 0, eyePulse * 0.45, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  private renderPlayer(ctx: CanvasRenderingContext2D): void {
    const p = this.player;
    const m = this.selectedMember;

    // Protective shield ring (Chan / Jeongin)
    if (p.shieldHits > 0 || p.pressureFreezeTimer > 0) {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.strokeStyle = m.accentColor;
      ctx.fillStyle = 'rgba(0, 240, 255, 0.14)';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(0, 0, p.radius + 15 + Math.sin(this.elapsed * 10) * 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }

    // Invulnerability blink
    if (p.invulnTimer > 0 && Math.floor(this.elapsed * 22) % 2 === 0 && p.dashTimer <= 0) {
      return;
    }

    this.renderSwimmer(
      ctx,
      p.x,
      p.y,
      p.angle,
      m,
      p.swimPhase,
      1.05,
      p.squashX,
      p.squashY,
      p.hitFlash > 0,
      true
    );
  }

  private renderSwimmer(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    angle: number,
    m: MemberProfile,
    swimPhase: number,
    scale: number,
    squashX: number,
    squashY: number,
    flash: boolean,
    isLeader: boolean
  ): void {
    ctx.save();
    ctx.translate(x, y);

    // Subtle leader cyan/accent anime ring underneath
    if (isLeader) {
      ctx.strokeStyle = m.accentColor;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(0, 0, 31, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.rotate(angle);
    ctx.scale(scale * squashX, scale * squashY);

    // Flowing cel-shaded water stream ribbon behind swimmer
    const kick = Math.sin(swimPhase) * 6;
    ctx.strokeStyle = m.accentColor;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(-20, -4);
    ctx.quadraticCurveTo(-36, kick, -48, -kick * 0.6);
    ctx.stroke();

    // Torso / sleek dark Suiatsu outfit
    ctx.fillStyle = flash ? '#ffffff' : m.suitColor;
    ctx.strokeStyle = '#050811';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.roundRect(-24, -11, 28, 22, 9);
    ctx.fill();
    ctx.stroke();

    // Accent collar / pearl-net stripe matching member
    ctx.fillStyle = m.accentColor;
    ctx.fillRect(-14, -9, 7, 18);

    // Head
    ctx.fillStyle = flash ? '#ffffff' : '#fdd5c0';
    ctx.beginPath();
    ctx.arc(10, 0, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Expressive cel-shaded hair silhouette in member's exact signature color
    ctx.fillStyle = flash ? '#ffffff' : m.hairColor;
    ctx.beginPath();
    ctx.arc(9, 0, 14.5, Math.PI * 0.58, Math.PI * 1.48);
    ctx.lineTo(22, -7);
    ctx.lineTo(15, -2);
    ctx.lineTo(21, 5);
    ctx.lineTo(11, 12);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Hard cel hair highlight
    if (!flash) {
      ctx.fillStyle = m.hairHighlight;
      ctx.beginPath();
      ctx.ellipse(5, -5, 5, 2.5, -0.3, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  private renderSlashes(ctx: CanvasRenderingContext2D): void {
    for (const s of this.slashes) {
      const alpha = s.life / s.maxLife;
      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.rotate(s.angle);
      ctx.globalAlpha = alpha;

      // Bold manga arc slash with black ink outline
      ctx.strokeStyle = '#050811';
      ctx.lineWidth = s.onBeat ? 22 : 16;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(-14, 0, s.radius * 0.56, -1.05, 1.05);
      ctx.stroke();

      ctx.strokeStyle = s.color;
      ctx.lineWidth = s.onBeat ? 14 : 10;
      ctx.beginPath();
      ctx.arc(-14, 0, s.radius * 0.56, -1.02, 1.02);
      ctx.stroke();

      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(-14, 0, s.radius * 0.56, -0.85, 0.85);
      ctx.stroke();

      ctx.restore();
    }
  }

  private renderProjectiles(ctx: CanvasRenderingContext2D): void {
    for (const pr of this.projectiles) {
      ctx.save();
      ctx.translate(pr.x, pr.y);
      const ang = Math.atan2(pr.vy, pr.vx);
      ctx.rotate(ang);

      ctx.fillStyle = pr.color;
      ctx.strokeStyle = '#050811';
      ctx.lineWidth = 3;

      if (pr.kind === 'SLASH_WAVE') {
        ctx.beginPath();
        ctx.arc(-6, 0, pr.radius, -1.1, 1.1);
        ctx.lineTo(-2, 0);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      } else if (pr.kind === 'CRYSTAL_HOMING') {
        // Sharp diamond crystal lance
        ctx.beginPath();
        ctx.moveTo(18, 0);
        ctx.lineTo(-4, -9);
        ctx.lineTo(-16, 0);
        ctx.lineTo(-4, 9);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.arc(0, 0, pr.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(2, -2, pr.radius * 0.35, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  private renderShockRings(ctx: CanvasRenderingContext2D): void {
    for (const sr of this.shockRings) {
      ctx.save();
      ctx.translate(sr.x, sr.y);
      const alpha = Math.max(0, 1 - sr.radius / sr.maxRadius);
      ctx.globalAlpha = Math.min(1, alpha + 0.25);

      const start = sr.fromBoss ? sr.gapAngle + sr.gapHalfWidth : 0;
      const end = sr.fromBoss ? sr.gapAngle + Math.PI * 2 - sr.gapHalfWidth : Math.PI * 2;

      ctx.strokeStyle = '#050811';
      ctx.lineWidth = sr.thickness + 6;
      ctx.beginPath();
      ctx.arc(0, 0, sr.radius, start, end);
      ctx.stroke();

      ctx.strokeStyle = sr.color;
      ctx.lineWidth = sr.thickness;
      ctx.beginPath();
      ctx.arc(0, 0, sr.radius, start, end);
      ctx.stroke();

      ctx.restore();
    }
  }

  private renderParticles(ctx: CanvasRenderingContext2D): void {
    for (const pt of this.particles) {
      const alpha = Math.max(0, pt.life / pt.maxLife);
      ctx.save();
      ctx.translate(pt.x, pt.y);
      ctx.rotate(pt.rotation);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = pt.color;
      ctx.strokeStyle = '#050811';
      ctx.lineWidth = 2;

      if (pt.shape === 'STAR') {
        ctx.beginPath();
        for (let i = 0; i < 8; i++) {
          const r = i % 2 === 0 ? pt.size : pt.size * 0.4;
          const a = (i / 8) * Math.PI * 2;
          if (i === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
          else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
        }
        ctx.closePath();
        ctx.fill();
        if (pt.outline) ctx.stroke();
      } else if (pt.shape === 'SHARD') {
        ctx.beginPath();
        ctx.moveTo(pt.size, 0);
        ctx.lineTo(-pt.size * 0.7, -pt.size * 0.6);
        ctx.lineTo(-pt.size * 0.5, pt.size * 0.7);
        ctx.closePath();
        ctx.fill();
        if (pt.outline) ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.arc(0, 0, pt.size * 0.65, 0, Math.PI * 2);
        ctx.fill();
        if (pt.outline) ctx.stroke();
      }
      ctx.restore();
    }
  }

  private renderFloatingTexts(ctx: CanvasRenderingContext2D): void {
    for (const ft of this.floatingTexts) {
      const alpha = Math.min(1, (ft.life / ft.maxLife) * 1.4);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.font = `700 ${Math.round(18 * ft.scale)}px "Antonio", sans-serif`;
      ctx.textAlign = 'center';
      ctx.lineWidth = 5;
      ctx.strokeStyle = '#050811';
      ctx.strokeText(ft.text, ft.x, ft.y);
      ctx.fillStyle = ft.color;
      ctx.fillText(ft.text, ft.x, ft.y);
      ctx.restore();
    }
  }

  private renderScreenOverlays(ctx: CanvasRenderingContext2D): void {
    const w = this.width;
    const h = this.height;
    const p = this.player;

    // 1. Anime Speedlines when dashing or moving at high speed
    const speed = Math.hypot(p.vx, p.vy);
    if (speed > 345 || p.dashTimer > 0) {
      ctx.save();
      const intensity = p.dashTimer > 0 ? 0.55 : Math.min(0.32, (speed - 345) / 300);
      ctx.strokeStyle = `rgba(0, 240, 255, ${intensity.toFixed(2)})`;
      ctx.lineWidth = 2.5;
      const cx = w / 2;
      const cy = h / 2;
      for (let i = 0; i < 24; i++) {
        const a = (i / 24) * Math.PI * 2 + this.elapsed * 0.6;
        const inner = Math.min(w, h) * 0.36;
        const outer = Math.max(w, h) * 0.72;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a) * inner, cy + Math.sin(a) * inner);
        ctx.lineTo(cx + Math.cos(a) * outer, cy + Math.sin(a) * outer);
        ctx.stroke();
      }
      ctx.restore();
    }

    // 2. Directional radar arrows to trapped teammates (always shows nearest; Jeongin Fox Instinct reveals ALL!)
    if (this.act === 'EXPLORE') {
      const remaining = this.spheres.filter((s) => !s.rescued);
      const targets = p.foxSenseTimer > 0
        ? remaining
        : remaining.sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y)).slice(0, 1);

      for (const s of targets) {
        const screenX = s.x - this.camX + w / 2;
        const screenY = s.y - this.camY + h / 2;
        if (screenX > 48 && screenX < w - 48 && screenY > 72 && screenY < h - 48) {
          continue; // Already visible on screen
        }
        const ang = Math.atan2(s.y - p.y, s.x - p.x);
        const padX = w / 2 - 58;
        const padY = h / 2 - 86;
        const ex = w / 2 + Math.cos(ang) * padX;
        const ey = h / 2 + Math.sin(ang) * padY;

        ctx.save();
        ctx.translate(ex, ey);
        ctx.rotate(ang);
        ctx.fillStyle = p.foxSenseTimer > 0 ? '#2dd4bf' : s.member.accentColor;
        ctx.strokeStyle = '#050811';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(16, 0);
        ctx.lineTo(-10, -10);
        ctx.lineTo(-5, 0);
        ctx.lineTo(-10, 10);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();

        // Compact distance label
        const distM = Math.round(Math.hypot(s.x - p.x, s.y - p.y) / 14);
        ctx.save();
        ctx.font = '700 12px "Antonio", sans-serif';
        ctx.textAlign = 'center';
        ctx.lineWidth = 3.5;
        ctx.strokeStyle = '#050811';
        const label = p.foxSenseTimer > 0 ? `${s.member.name.toUpperCase()} ${distM}m` : `${distM}m`;
        ctx.strokeText(label, ex, ey + 22);
        ctx.fillStyle = '#ffffff';
        ctx.fillText(label, ex, ey + 22);
        ctx.restore();
      }
    }

    // 3. High Water Pressure Crimson Edge Warning
    if (p.pressure > 74) {
      const pulse = 0.12 + ((p.pressure - 74) / 26) * 0.22 + Math.sin(this.elapsed * 9) * 0.06;
      ctx.save();
      ctx.strokeStyle = `rgba(255, 42, 85, ${Math.max(0, pulse).toFixed(2)})`;
      ctx.lineWidth = 26;
      ctx.strokeRect(0, 0, w, h);
      ctx.restore();
    }

    // 4. Impact / Special Flash
    if (this.flashAlpha > 0) {
      ctx.save();
      ctx.globalAlpha = this.flashAlpha;
      ctx.fillStyle = this.flashColor;
      ctx.fillRect(0, 0, w, h);
      ctx.restore();
    }
  }

  private renderEndingAscent(ctx: CanvasRenderingContext2D): void {
    const w = this.width;
    const h = this.height;
    const et = this.endingTimer;

    // Phase 1 (0.0s - 0.85s): High-contrast Sakuga Manga Impact Frames & Cyan Shatter!
    if (et < 0.85) {
      const invert = Math.floor(et * 18) % 2 === 0;
      ctx.fillStyle = invert ? '#050811' : '#f8fafc';
      ctx.fillRect(0, 0, w, h);

      // Explosive radial manga impact lines from center
      const cx = w / 2;
      const cy = h / 2;
      ctx.save();
      for (let i = 0; i < 42; i++) {
        const a = (i / 42) * Math.PI * 2 + et * 1.4;
        ctx.strokeStyle = i % 3 === 0 ? '#00f0ff' : invert ? '#ffffff' : '#050811';
        ctx.lineWidth = i % 2 === 0 ? 5 : 2.5;
        const inner = 30 + et * 140;
        const outer = Math.max(w, h) * 0.9;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a) * inner, cy + Math.sin(a) * inner);
        ctx.lineTo(cx + Math.cos(a) * outer, cy + Math.sin(a) * outer);
        ctx.stroke();
      }

      // Giant cyan-white shatter shockwave rings
      ctx.strokeStyle = '#00f0ff';
      ctx.lineWidth = 14;
      ctx.beginPath();
      ctx.arc(cx, cy, 40 + et * 640, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = invert ? '#ffffff' : '#050811';
      ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.arc(cx, cy, 18 + et * 420, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
      return;
    }

    // Phase 2 (0.85s - 5.6s): Slow-motion heroic ascent to sunlit surface!
    const t = Math.min(1, (et - 0.85) / 4.75);

    const bands = t < 0.45
      ? ['#0284c7', '#0369a1', '#075985', '#082f49']
      : t < 0.78
        ? ['#38bdf8', '#0ea5e9', '#0284c7', '#0369a1']
        : ['#f0f9ff', '#bae6fd', '#38bdf8', '#0284c7'];
    const bh = h / bands.length;
    bands.forEach((col, i) => {
      ctx.fillStyle = col;
      ctx.fillRect(0, i * bh, w, bh + 2);
    });

    // Radiant sunlit surface rays pouring downward
    ctx.save();
    for (let i = 0; i < 8; i++) {
      const rx = w * (0.08 + i * 0.13);
      ctx.fillStyle = i % 2 === 0 ? 'rgba(255, 255, 255, 0.18)' : 'rgba(0, 240, 255, 0.14)';
      ctx.beginPath();
      ctx.moveTo(rx - 45, 0);
      ctx.lineTo(rx + 65, 0);
      ctx.lineTo(rx + 180, h);
      ctx.lineTo(rx - 90, h);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();

    // Vertical anime opening speedlines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.lineWidth = 3;
    for (let i = 0; i < 36; i++) {
      const lx = (i / 36) * w;
      const ly = ((this.elapsed * 720 + i * 95) % (h + 220)) - 110;
      ctx.beginPath();
      ctx.moveTo(lx, ly);
      ctx.lineTo(lx, ly + 150);
      ctx.stroke();
    }

    // All 8 Los Perdidos propelling heroically upward in slow-motion V formation with colored water trails!
    MEMBERS.forEach((m, idx) => {
      const col = idx - 3.5;
      const mx = w / 2 + col * Math.min(96, w * 0.098);
      const baseY = h * 0.92 - t * h * 0.62 + Math.abs(col) * 28;

      // Glowing vertical anime stream behind each swimmer
      ctx.save();
      ctx.strokeStyle = m.accentColor;
      ctx.lineWidth = 8;
      ctx.globalAlpha = 0.6;
      ctx.beginPath();
      ctx.moveTo(mx, baseY + 18);
      ctx.lineTo(mx, h + 40);
      ctx.stroke();
      ctx.restore();

      this.renderSwimmer(ctx, mx, baseY, -Math.PI / 2, m, this.elapsed * 4.5, 1.18, 1, 1, false, false);
    });

    // Suspended glistening cel-shaded water droplets
    for (const d of this.endingDroplets) {
      ctx.fillStyle = 'rgba(224, 242, 254, 0.9)';
      ctx.strokeStyle = '#0284c7';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(d.x - d.r * 0.25, d.y - d.r * 0.25, d.r * 0.34, 0, Math.PI * 2);
      ctx.fill();
    }

    // Climactic white anime flash building right before Key Visual freeze-frame
    if (t > 0.84) {
      const whiteAlpha = Math.min(1, (t - 0.84) / 0.16);
      ctx.fillStyle = `rgba(255, 255, 255, ${whiteAlpha.toFixed(2)})`;
      ctx.fillRect(0, 0, w, h);
    }
  }
}
