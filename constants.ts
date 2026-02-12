
import { SignalFragment } from './types';

// Grid Configuration - Optimized for mobile landscape (20:9 ratio typical)
export const GRID_WIDTH = 28;  // More width for landscape
export const GRID_HEIGHT = 14; // Less height for landscape

// Game Balance Constants
export const INITIAL_PLAYER_HEALTH = 120;
export const HAZARD_DAMAGE = 25;
export const ENERGY_DRAIN_RATE = 1.5; // Per game tick when standing still (level 5+)
export const HEALTH_DRAIN_RATE = 3; // Per game tick when energy is 0

// Progression - EXTREME difficulty for levels 40-100
export const LEVEL_SCALES = {
  gridWidth: (level: number) => Math.min(28 + (level > 40 ? Math.floor(level * 0.7) : Math.floor(level / 3)), 80),
  gridHeight: (level: number) => Math.min(14 + (level > 40 ? Math.floor(level * 0.5) : Math.floor(level / 4)), 45),
  enemyCount: (level: number) => Math.min(3 + Math.floor(level * 1.5), 90),
  wallDensity: (level: number) => level >= 40 ? 0.52 : (0.24 + Math.min(level, 39) / 160),
  signalRequired: (level: number) => Math.min(3 + Math.floor(level / 4), 16)
};

// Enemy Movement Rules
export const ENEMY_BEHAVIOR = {
  detectionRangeBase: 8,
  detectionRangeLevel15Plus: 15,
  detectionRangeLevel30Plus: 30,
  detectionRangeLevel40Plus: 45,
  moveIntervalBase: 1100, // ms
  moveIntervalReduce: (level: number) => Math.max(200, 1100 - (level * 15)),
  
  // New enemy type behaviors
  phantom: {
    teleportCooldown: 5, // turns between teleports
    teleportRange: 10, // max distance to teleport
    startLevel: 20 // appears from level 20+
  },
  sentinel: {
    detectionRadius: 25, // very long range
    immobile: true, // doesn't move
    startLevel: 25 // appears from level 25+
  },
  swarm: {
    groupSize: 3, // 3-5 enemies per swarm
    cohesionRange: 5, // stay within this distance of leader
    startLevel: 30 // appears from level 30+
  }
};

// Continuous Movement & Energy Rules (from Level 5+)
export const CONTINUOUS_MODE = {
  startLevel: 5,
  initialStandStillGracePeriod: 1800, // ms before energy drain starts
  energyDrainInterval: 500 // ms between drain ticks
};

// Dual Hunter Rules (from Level 35+)
export const DUAL_HUNTER_MODE = {
  startLevel: 35,
  coordinationRange: 12,
  targetConvergenceBonus: 1.3 // Movement speed multiplier when coordinating
};

// Mobile Input Thresholds
export const TOUCH_CONFIG = {
  dpadSize: 100, // pixels
  buttonSize: 80,
  deadzone: 0.3, // 30% deadzone
  hapticFeedbackEnabled: true
};

// Monetization
export const REVIVE_COIN_CONFIG = {
  initialFreeCoins: 5,
  purchasePriceUSD: 0.99,
  coinsPurchased: 100,
  hardToObtainMultiplier: 3 // Coins are harder to find; make coin drops 3x rarer
};

// Artifacts System - Allows infinite play with proper understanding
export const ARTIFACTS = {
  omega: { name: 'OMEGA_SYNTHESIS', maxHealth: 30, energyBoost: 0 },
  void: { name: 'VOID_SHIELD', maxHealth: 30, energyBoost: 0 },
  nexus: { name: 'NEXUS_CORE', maxHealth: 0, energyBoost: 40, ability: 'PHASE_SHIFT' },
  beacon: { name: 'BEACON_RESONANCE', maxHealth: 0, energyBoost: 0, ability: 'AUTO_REVIVE' }
};

// Production Display Strings
export const SIGNAL_FRAGMENTS: SignalFragment[] = [
  { id: 1, text: "KINETIC SUBROUTINES DETECTED. AUTHORIZE STRIKE CAPABILITY.", type: "text" },
  { id: 2, text: "THE DRONES EVOLVE WITH EACH PASSING SECTOR.", type: "text" },
  { id: 3, text: "SECTOR ANALYSIS COMPLETE. RESOURCES FLOW LIKE SIGNAL WAVES.", type: "text" },
  { id: 4, text: "TARGETING PARAMETERS UPDATED. SURVIVAL IS EVOLUTION.", type: "glitch", fake: false },
  { id: 5, text: "THE STATIC WHISPERS ANCIENT BINARY TRUTHS.", type: "text" },
  { id: 6, text: "COLLECT FRAGMENTS TO TRANSCEND HUMAN LIMITATION.", type: "text" },
  { id: 7, text: "ARTIFACTS UNLOCK THE PATH TO ETERNAL GAMEPLAY.", type: "text" },
  { id: 8, text: "COORDINATE YOUR MOVEMENT. STILLNESS BRINGS DEATH.", type: "text" },
  { id: 9, text: "BEACONS WILL RESTORE YOU. PRESERVE THEM WISELY.", type: "text" },
  { id: 10, text: "IN THE HIGHEST DEPTHS, ONLY MASTERS SURVIVE.", type: "text" }
];

export const UPGRADE_COSTS = {
  health: 30,
  energy: 25,
  scan: 40,
  emp: 50,
  regen: 60,
  kinetic: 80
};
