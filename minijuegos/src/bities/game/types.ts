/**
 * Core types for "Misión BITIES: Rumbo al Estadio"
 */

export type AvatarId = 'girl' | 'boy';

export type GamePhase =
  | 'SELECT'
  | 'INTRO'
  | 'SOCIAL_WAVE'
  | 'STREET_MARCH'
  | 'ROOM_CHECKLIST'
  | 'STADIUM_FINALE';

export interface PlayerProfile {
  name: string;
  avatar: AvatarId;
}

export type ChecklistItemId = 'lightstick' | 'tshirt' | 'powerbank' | 'bandana';

export interface ChecklistItemDef {
  id: ChecklistItemId;
  shortLabel: string;
  fullLabel: string;
  assetKey: AssetKey;
  emoji: string;
  accentColor: string;
  /** Normalized room coordinates (0..1) inside the playable floor area */
  x: number;
  y: number;
}

export type AssetKey =
  | 'avatar-girl'
  | 'avatar-boy'
  | 'bg-room'
  | 'bg-street'
  | 'bg-stadium'
  | 'item-lightstick'
  | 'item-tshirt'
  | 'item-powerbank'
  | 'item-bandana'
  | 'item-ticket'
  | 'npc-army'
  | 'obstacle-fake';

export interface GameStats {
  messagesSent: number;
  fansRecruited: number;
  itemsCollected: number;
}
