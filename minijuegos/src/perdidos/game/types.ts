import type { MemberId } from './characters';

export type GameScreenState =
  | 'TITLE_MENU'
  | 'CHAR_SELECT'
  | 'INTRO_QUAKE'
  | 'PLAYING'
  | 'PAUSED'
  | 'ENDING_ASCENT'
  | 'VICTORY_FREEZE'
  | 'VICTORY'
  | 'GAME_OVER';

export type GameAct = 'INTRO' | 'EXPLORE' | 'BOSS_INTRO' | 'BOSS' | 'ENDING';

export type RankGrade = 'S' | 'A' | 'B' | 'C';

export interface CutInEvent {
  id: number;
  memberId: MemberId;
  title: string;
  subtitle: string;
  accentColor: string;
  kind: 'SPECIAL' | 'RESCUE' | 'BOSS';
}

export interface ScoreBreakdown {
  baseCombatScore: number;
  rescuedCount: number;
  rescuedPoints: number;
  allRescuedBonus: number;
  pearlsCollected: number;
  pearlPoints: number;
  maxCombo: number;
  epicCombosCount: number;
  comboPoints: number;
  timeRemainingSeconds: number;
  timePoints: number;
  bossDefeated: boolean;
  bossBonus: number;
  totalScore: number;
  rank: RankGrade;
  rankTitle: string;
  rankMessage: string;
  nextRank: RankGrade | null;
  pointsToNextRank: number;
}

export interface HudSnapshot {
  screen: GameScreenState;
  act: GameAct;
  selectedMemberId: MemberId;
  hp: number;
  maxHp: number;
  pressure: number; // 0..100
  timeLeft: number; // seconds
  timeFrozen: boolean;
  specialCharge: number; // 0..100
  specialActiveTimer: number;
  shieldHits: number;
  pearls: number;
  score: number;
  combo: number;
  maxCombo: number;
  epicCombos: number;
  beatPulse: number; // 0..1 visual beat sync pulse
  rescuedIds: MemberId[];
  trappedIds: MemberId[];
  bossActive: boolean;
  bossHp: number;
  bossMaxHp: number;
  bossName: string;
  introCaption: string;
  endingTime: number;
  gameOverReason: string;
  scoreBreakdown: ScoreBreakdown | null;
}

export const RANK_THRESHOLDS: Record<RankGrade, number> = {
  S: 14000,
  A: 10000,
  B: 6200,
  C: 0,
};

export function calculateFinalScoreAndRank(params: {
  baseCombatScore: number;
  rescuedCount: number;
  pearlsCollected: number;
  pearlScoreMult: number;
  maxCombo: number;
  epicCombosCount: number;
  timeRemainingSeconds: number;
  bossDefeated: boolean;
}): ScoreBreakdown {
  const rescuedPoints = params.rescuedCount * 650;
  const allRescuedBonus = params.rescuedCount >= 7 ? 1500 : 0;
  const pearlPoints = Math.round(params.pearlsCollected * 120 * params.pearlScoreMult);
  const comboPoints = params.maxCombo * 90 + params.epicCombosCount * 400;
  const timeSec = Math.max(0, Math.ceil(params.timeRemainingSeconds));
  const timePoints = timeSec * 45;
  const bossBonus = params.bossDefeated ? 2800 : 0;

  const totalScore =
    Math.round(params.baseCombatScore) +
    rescuedPoints +
    allRescuedBonus +
    pearlPoints +
    comboPoints +
    timePoints +
    bossBonus;

  let rank: RankGrade = 'C';
  let rankTitle = 'Superviviente del Abismo';
  let rankMessage = '¡Sigue practicando los combos al ritmo y junta más perlas para escalar de rango!';
  let nextRank: RankGrade | null = 'B';
  let pointsToNextRank = Math.max(0, RANK_THRESHOLDS.B - totalScore);

  if (totalScore >= RANK_THRESHOLDS.S && params.bossDefeated) {
    rank = 'S';
    rankTitle = 'Leyenda de Suiatsu';
    rankMessage = '¡Ejecución digna de opening anime! Dominaste la presión abisal y reuniste a Los Perdidos con maestría.';
    nextRank = null;
    pointsToNextRank = 0;
  } else if (totalScore >= RANK_THRESHOLDS.A) {
    rank = 'A';
    rankTitle = 'Maestro de la Corriente';
    rankMessage = params.bossDefeated
      ? '¡Gran desempeño! Encadena más combos épicos y guarda tiempo extra para alcanzar el Rango S.'
      : '¡Puntaje impresionante! Derrota al Núcleo del Terremoto para desbloquear el Rango S.';
    nextRank = 'S';
    pointsToNextRank = Math.max(0, RANK_THRESHOLDS.S - totalScore);
  } else if (totalScore >= RANK_THRESHOLDS.B) {
    rank = 'B';
    rankTitle = 'Buceador Intrépido';
    rankMessage = '¡Buen ritmo! Recolecta burbujas de oxígeno y perlas luminosas para llegar al Rango A.';
    nextRank = 'A';
    pointsToNextRank = Math.max(0, RANK_THRESHOLDS.A - totalScore);
  }

  return {
    baseCombatScore: Math.round(params.baseCombatScore),
    rescuedCount: params.rescuedCount,
    rescuedPoints,
    allRescuedBonus,
    pearlsCollected: params.pearlsCollected,
    pearlPoints,
    maxCombo: params.maxCombo,
    epicCombosCount: params.epicCombosCount,
    comboPoints,
    timeRemainingSeconds: timeSec,
    timePoints,
    bossDefeated: params.bossDefeated,
    bossBonus,
    totalScore,
    rank,
    rankTitle,
    rankMessage,
    nextRank,
    pointsToNextRank,
  };
}

export interface BestRecord {
  bestScore: number;
  bestRank: RankGrade;
  bestMember: MemberId;
}

const STORAGE_KEY = 'los_perdidos_suiatsu_record_v1';

export function loadBestRecord(): BestRecord | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as BestRecord;
    if (typeof parsed.bestScore === 'number' && parsed.bestRank) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

export function saveBestRecord(score: number, rank: RankGrade, memberId: MemberId): BestRecord {
  const existing = loadBestRecord();
  const rankOrder: Record<RankGrade, number> = { S: 4, A: 3, B: 2, C: 1 };
  const isBetter =
    !existing ||
    score > existing.bestScore ||
    (score === existing.bestScore && rankOrder[rank] > rankOrder[existing.bestRank]);

  const next: BestRecord = isBetter
    ? { bestScore: score, bestRank: rank, bestMember: memberId }
    : existing;

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Ignore storage quota errors
  }
  return next;
}
