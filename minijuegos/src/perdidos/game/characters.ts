export type MemberId =
  | 'chan'
  | 'minho'
  | 'changbin'
  | 'hyunjin'
  | 'jisung'
  | 'felix'
  | 'seungmin'
  | 'jeongin';

export interface MemberProfile {
  id: MemberId;
  name: string;
  alias: string;
  role: string;
  portrait: string;
  hairColor: string;
  hairHighlight: string;
  suitColor: string;
  accentColor: string;
  specialName: string;
  specialDesc: string;
  passiveName: string;
  passiveDesc: string;
  shout: string;
  // Normalized stats 1..5 for UI bars
  stats: {
    speed: number;
    power: number;
    endurance: number;
    utility: number;
  };
  // Gameplay tuning modifiers
  maxHp: number;
  moveSpeed: number;
  pressureRateMult: number;
  pressureDamageMult: number;
  attackCooldown: number;
  attackRange: number;
  bossDamageMult: number;
  pearlScoreMult: number;
  pearlChargeMult: number;
  magnetRadius: number;
  currentResist: number;
}

export const KEY_VISUAL_IMAGE = '/assets/aistudio/suiatsu_skz_dtf_d2ed75a3.png';

export const MEMBERS: MemberProfile[] = [
  {
    id: 'chan',
    name: 'Chan',
    alias: 'Líder Abisal',
    role: 'Escudo y Control',
    portrait: '/assets/aistudio/Bangchan_1cbb37ab.jpg',
    hairColor: '#b8e838',
    hairHighlight: '#e2ff8a',
    suitColor: '#111622',
    accentColor: '#a3e635',
    specialName: 'Pulso de Liderazgo',
    specialDesc: 'Activa un escudo sónico que frena la presión del agua, bloquea daño y atrae burbujas cercanas.',
    passiveName: 'Resistencia del Líder',
    passiveDesc: 'La presión del agua sube un 25% más lento en todo momento.',
    shout: '¡PULSO DE LIDERAZGO!',
    stats: { speed: 3, power: 4, endurance: 5, utility: 5 },
    maxHp: 110,
    moveSpeed: 315,
    pressureRateMult: 0.75,
    pressureDamageMult: 1.0,
    attackCooldown: 0.28,
    attackRange: 88,
    bossDamageMult: 1.0,
    pearlScoreMult: 1.0,
    pearlChargeMult: 1.0,
    magnetRadius: 95,
    currentResist: 0.85,
  },
  {
    id: 'minho',
    name: 'Minho',
    alias: 'Sombra Felina',
    role: 'Asalto Veloz',
    portrait: '/assets/aistudio/LeeKnow_25f566fb.jpg',
    hairColor: '#d97736',
    hairHighlight: '#fdba74',
    suitColor: '#101521',
    accentColor: '#fb923c',
    specialName: 'Paso Sombra Felino',
    specialDesc: 'Dash ultrarrápido con invulnerabilidad temporal que atraviesa corrientes, rocas y corta enemigos.',
    passiveName: 'Reflejos Felinos',
    passiveDesc: 'Ataques cuerpo a cuerpo un 35% más rápidos y con mayor alcance de corte.',
    shout: '¡PASO SOMBRA FELINO!',
    stats: { speed: 5, power: 4, endurance: 3, utility: 4 },
    maxHp: 100,
    moveSpeed: 335,
    pressureRateMult: 1.0,
    pressureDamageMult: 1.0,
    attackCooldown: 0.18,
    attackRange: 106,
    bossDamageMult: 1.05,
    pearlScoreMult: 1.0,
    pearlChargeMult: 1.0,
    magnetRadius: 90,
    currentResist: 0.9,
  },
  {
    id: 'changbin',
    name: 'Changbin',
    alias: 'Martillo Tectónico',
    role: 'Tanque Destructor',
    portrait: '/assets/aistudio/Changbin_97aecbda.jpg',
    hairColor: '#3d2b24',
    hairHighlight: '#785a4c',
    suitColor: '#141926',
    accentColor: '#f43f5e',
    specialName: 'Impacto Sísmico',
    specialDesc: 'Onda expansiva pesada que destruye rocas submarinas, barreras y rompe escudos enemigos al instante.',
    passiveName: 'Cuerpo de Acero',
    passiveDesc: 'Mayor vida máxima (145 HP) y gran resistencia al empuje de corrientes marinas.',
    shout: '¡IMPACTO SÍSMICO!',
    stats: { speed: 3, power: 5, endurance: 5, utility: 3 },
    maxHp: 145,
    moveSpeed: 298,
    pressureRateMult: 0.95,
    pressureDamageMult: 0.85,
    attackCooldown: 0.3,
    attackRange: 96,
    bossDamageMult: 1.15,
    pearlScoreMult: 1.0,
    pearlChargeMult: 1.0,
    magnetRadius: 90,
    currentResist: 0.45,
  },
  {
    id: 'hyunjin',
    name: 'Hyunjin',
    alias: 'Destello Abisal',
    role: 'Agilidad y Control',
    portrait: '/assets/aistudio/Hyunjin_dd7a5b7a.jpg',
    hairColor: '#1d1a26',
    hairHighlight: '#5b5370',
    suitColor: '#0f1320',
    accentColor: '#c084fc',
    specialName: 'Mirada Deslumbrante',
    specialDesc: 'Destello hipnótico que congela en el sitio a las criaturas cercanas y otorga un impulso veloz.',
    passiveName: 'Corriente Elegante',
    passiveDesc: 'Velocidad superior de nado (+22%) y maniobra ágil para esquivar peligros.',
    shout: '¡MIRADA DESLUMBRANTE!',
    stats: { speed: 5, power: 3, endurance: 3, utility: 5 },
    maxHp: 100,
    moveSpeed: 378,
    pressureRateMult: 1.0,
    pressureDamageMult: 1.0,
    attackCooldown: 0.25,
    attackRange: 92,
    bossDamageMult: 1.0,
    pearlScoreMult: 1.0,
    pearlChargeMult: 1.05,
    magnetRadius: 100,
    currentResist: 0.75,
  },
  {
    id: 'jisung',
    name: 'Jisung',
    alias: 'Pulso Rítmico',
    role: 'Artillero Combo',
    portrait: '/assets/aistudio/Han_6afe9ba0.jpg',
    hairColor: '#161b26',
    hairHighlight: '#475569',
    suitColor: '#111827',
    accentColor: '#38bdf8',
    specialName: 'Ráfaga Rítmica',
    specialDesc: 'Dispara proyectiles de energía multidireccionales al ritmo de la música mientras nada.',
    passiveName: 'Multiplicador Estelar',
    passiveDesc: 'Duplica los puntos por perlas y recarga un 50% más rápido el poder especial.',
    shout: '¡RÁFAGA RÍTMICA!',
    stats: { speed: 4, power: 4, endurance: 3, utility: 5 },
    maxHp: 100,
    moveSpeed: 330,
    pressureRateMult: 1.0,
    pressureDamageMult: 1.0,
    attackCooldown: 0.24,
    attackRange: 90,
    bossDamageMult: 1.05,
    pearlScoreMult: 2.0,
    pearlChargeMult: 1.5,
    magnetRadius: 105,
    currentResist: 0.9,
  },
  {
    id: 'felix',
    name: 'Felix',
    alias: 'Voz del Abismo',
    role: 'Manipulador Temporal',
    portrait: '/assets/aistudio/Felix_f1e5bcbe.jpg',
    hairColor: '#e2e8f0',
    hairHighlight: '#ffffff',
    suitColor: '#18101c',
    accentColor: '#818cf8',
    specialName: 'Gravedad Abisal',
    specialDesc: 'Onda grave de baja frecuencia que detiene el temporizador 7s, frena enemigos y empuja peligros.',
    passiveName: 'Atracción Profunda',
    passiveDesc: 'Enorme radio magnético para atraer automáticamente burbujas y perlas luminosas.',
    shout: '¡GRAVEDAD ABISAL!',
    stats: { speed: 4, power: 4, endurance: 4, utility: 5 },
    maxHp: 105,
    moveSpeed: 325,
    pressureRateMult: 0.95,
    pressureDamageMult: 1.0,
    attackCooldown: 0.26,
    attackRange: 92,
    bossDamageMult: 1.05,
    pearlScoreMult: 1.0,
    pearlChargeMult: 1.15,
    magnetRadius: 230,
    currentResist: 0.85,
  },
  {
    id: 'seungmin',
    name: 'Seungmin',
    alias: 'Mira Cristalina',
    role: 'Cazador de Jefes',
    portrait: '/assets/aistudio/Seungmin_99bcbab9.jpg',
    hairColor: '#151d2b',
    hairHighlight: '#3b4d6b',
    suitColor: '#0e1726',
    accentColor: '#22d3ee',
    specialName: 'Onda Cristalina',
    specialDesc: 'Disparos teledirigidos de largo alcance que buscan al compañero atrapado más cercano o al punto débil del jefe.',
    passiveName: 'Precisión Letal',
    passiveDesc: 'Inflige +45% de daño adicional contra el Jefe Final y las esferas oscuras.',
    shout: '¡ONDA CRISTALINA!',
    stats: { speed: 4, power: 5, endurance: 3, utility: 4 },
    maxHp: 100,
    moveSpeed: 325,
    pressureRateMult: 1.0,
    pressureDamageMult: 1.0,
    attackCooldown: 0.25,
    attackRange: 96,
    bossDamageMult: 1.45,
    pearlScoreMult: 1.0,
    pearlChargeMult: 1.1,
    magnetRadius: 95,
    currentResist: 0.9,
  },
  {
    id: 'jeongin',
    name: 'Jeongin',
    alias: 'Zorro de Hielo',
    role: 'Rastreador Táctico',
    portrait: '/assets/aistudio/i.n._ee3a3b9d.jpg',
    hairColor: '#a7e8d8',
    hairHighlight: '#e6fff9',
    suitColor: '#101824',
    accentColor: '#2dd4bf',
    specialName: 'Instinto de Zorro',
    specialDesc: 'Revela en toda la pantalla la ubicación exacta de los compañeros atrapados y crea un escudo protector.',
    passiveName: 'Calma en el Abismo',
    passiveDesc: 'Sufre un 40% menos de daño por presión extrema del agua.',
    shout: '¡INSTINTO DE ZORRO!',
    stats: { speed: 4, power: 3, endurance: 4, utility: 5 },
    maxHp: 110,
    moveSpeed: 335,
    pressureRateMult: 0.9,
    pressureDamageMult: 0.6,
    attackCooldown: 0.25,
    attackRange: 90,
    bossDamageMult: 1.0,
    pearlScoreMult: 1.0,
    pearlChargeMult: 1.1,
    magnetRadius: 110,
    currentResist: 0.85,
  },
];

export function getMemberById(id: MemberId): MemberProfile {
  return MEMBERS.find((m) => m.id === id) ?? MEMBERS[0];
}
