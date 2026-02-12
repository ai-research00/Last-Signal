
export enum AppState {
  AUTH = 'AUTH',
  MENU = 'MENU',
  PLAYING = 'PLAYING',
  LEVEL_COMPLETE = 'LEVEL_COMPLETE',
  GAMEOVER = 'GAMEOVER',
  REVIVE_PROMPT = 'REVIVE_PROMPT',
  SHOP = 'SHOP',
  PAYMENT_CHECKOUT = 'PAYMENT_CHECKOUT',
  SETTINGS = 'SETTINGS',
  STATS = 'STATS'
}

export enum TileType {
  FLOOR = 'FLOOR',
  WALL = 'WALL',
  SIGNAL = 'SIGNAL', 
  HAZARD = 'HAZARD', 
  EXIT = 'EXIT',
  BATTERY = 'BATTERY', 
  TERMINAL = 'TERMINAL',
  VOLATILE = 'VOLATILE', 
  ION_CLOUD = 'ION_CLOUD',
  OMEGA_CORE = 'OMEGA_CORE', 
  VOID_SHIELD = 'VOID_SHIELD',
  COIN_CACHE = 'COIN_CACHE',
  ARTIFACT_NEXUS = 'ARTIFACT_NEXUS'
}

export interface Coordinates {
  x: number;
  y: number;
}

export interface Tile extends Coordinates {
  type: TileType;
  revealed: boolean;
  id: string;
}

export interface Enemy extends Coordinates {
  id: string;
  type: 'drone' | 'stalker' | 'hunter' | 'phantom' | 'sentinel' | 'swarm';
  health: number;
  stunnedTurns: number;
  isHunting?: boolean;
  homePos: Coordinates;
  awareness: number;
  targetPlayer?: boolean;
  coordinatedWith?: string; // ID of coordinated enemy
  teleportCooldown?: number; // For phantom
  detectionRadius?: number; // For sentinel
  swarmLeader?: string; // For swarm members
  swarmMembers?: string[]; // For swarm leader
}

export interface UpgradeLevels {
  health: number;
  energy: number;
  scan: number;
  emp: number;
  regen: number;
  kinetic: number; 
}

export interface PlayerArtifact {
  type: 'omega' | 'void' | 'nexus' | 'beacon';
  level: number;
  unlocked: boolean;
  description: string;
}

export interface Player extends Coordinates {
  health: number;
  maxHealth: number;
  energy: number;
  maxEnergy: number;
  fragmentsCollected: number;
  bits: number; 
  signalCoins: number;
  reputation: string;
  upgrades: UpgradeLevels;
  totalScore: number;
  email?: string;
  googleId?: string;
  artifacts: {
    omega: number;
    void: number;
    nexus: number;
    beacon: number;
  };
  highScore: number;
  currentLevel: number;
  lastLoginTime?: number;
  totalCoinsSpent: number;
  totalRevives: number;
}

export interface LogEntry {
  id: number;
  message: string;
  type: 'info' | 'danger' | 'success' | 'system' | 'warning';
  timestamp: number;
}

export interface SignalFragment {
  id: number;
  text: string;
  type: 'text' | 'glitch';
  fake?: boolean;
}

export interface LevelConfig {
    tiles: Tile[];
    enemies: Enemy[];
    signalCount: number;
    width: number;
    height: number;
    difficulty: number;
    enemyComplexity: 'simple' | 'intermediate' | 'complex' | 'chaotic';
}

export interface TouchInput {
  dpadX: number; // -1, 0, 1
  dpadY: number; // -1, 0, 1
  actionButtonPressed: boolean;
  specialAbilityPressed: boolean;
}

export interface GameSettings {
  masterVolume: number;
  musicVolume: number;
  sfxVolume: number;
  hapticFeedback: boolean;
  screenDimensions: { width: number; height: number };
  isLandscape: boolean;
}

