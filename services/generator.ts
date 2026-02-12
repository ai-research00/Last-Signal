
import { Tile, TileType, LevelConfig, Enemy } from '../types';
import { LEVEL_SCALES, DUAL_HUNTER_MODE, ENEMY_BEHAVIOR } from '../constants';

const isReachable = (tiles: Tile[], width: number, height: number, startX: number, startY: number, targetX: number, targetY: number): boolean => {
    const visited = new Set<string>();
    const stack: {x: number, y: number}[] = [{x: startX, y: startY}];
    const targetId = `${targetX}-${targetY}`;
    
    while (stack.length > 0) {
        const current = stack.pop()!;
        const id = `${current.x}-${current.y}`;
        if (id === targetId) return true;
        if (visited.has(id)) continue;
        visited.add(id);
        
        const neighbors = [
            {x: current.x, y: current.y - 1}, {x: current.x, y: current.y + 1}, 
            {x: current.x - 1, y: current.y}, {x: current.x + 1, y: current.y}
        ];
        
        for (const n of neighbors) {
            if (n.x < 0 || n.x >= width || n.y < 0 || n.y >= height) continue;
            const t = tiles.find(tile => tile.x === n.x && tile.y === n.y);
            if (t && t.type !== TileType.WALL) stack.push(n);
        }
    }
    return false;
};

export const generateLevel = (level: number): LevelConfig => {
    // Advanced Grid Scaling with EXTREME difficulty for 40-100
    const width = LEVEL_SCALES.gridWidth(level);
    const height = LEVEL_SCALES.gridHeight(level);
    const wallChance = LEVEL_SCALES.wallDensity(level);
    const enemyCount = LEVEL_SCALES.enemyCount(level);
    const requiredSignals = LEVEL_SCALES.signalRequired(level);
    
    let tiles: Tile[] = [];
    let enemies: Enemy[] = [];
    let validLevel = false;
    let attempts = 0;
    const maxAttempts = 5;

    while (!validLevel && attempts < maxAttempts) {
        attempts++;
        tiles = [];
        enemies = [];
        
        // Professional Cluster-Based Maze Generation
        // Levels 40+ use extremely dense clustering for maze complexity
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const isEdge = x === 0 || x === width - 1 || y === 0 || y === height - 1;
                const seed = Math.random();
                
                tiles.push({
                    x, y, 
                    type: isEdge || seed < wallChance ? TileType.WALL : TileType.FLOOR,
                    revealed: false, id: `${x}-${y}`
                });
            }
        }

        // Ensure start is clear
        const startTile = tiles.find(t => t.x === 1 && t.y === 1)!;
        startTile.type = TileType.FLOOR;
        
        // Place exit far from start
        const exitX = width - 2;
        const exitY = Math.floor(Math.random() * (height - 4)) + 2;
        const exitTile = tiles.find(t => t.x === exitX && t.y === exitY);
        if (exitTile) exitTile.type = TileType.EXIT;

        if (exitTile && isReachable(tiles, width, height, 1, 1, exitTile.x, exitTile.y)) {
            // Signal Placement
            let sCount = 0;
            let attempts_sig = 0;
            while (sCount < requiredSignals && attempts_sig < 2000) {
                attempts_sig++;
                const t = tiles[Math.floor(Math.random() * tiles.length)];
                if (t.type === TileType.FLOOR && t.x > 8 && isReachable(tiles, width, height, 1, 1, t.x, t.y)) {
                    t.type = TileType.SIGNAL;
                    sCount++;
                }
            }

            // High-Value Drops with Rarity Scaling
            tiles.forEach(t => {
                if (t.type === TileType.FLOOR) {
                    const roll = Math.random();
                    // Coins are extremely rare (hard to obtain)
                    if (roll < 0.0005 * (1 + level/50)) t.type = TileType.COIN_CACHE;
                    else if (roll < 0.006) t.type = TileType.OMEGA_CORE;
                    else if (roll < 0.012) t.type = TileType.VOID_SHIELD;
                    else if (roll < 0.04) t.type = TileType.BATTERY;
                    else if (roll < 0.12 + (level/100)) t.type = TileType.HAZARD;
                    // Artifact nexus - ultra rare, only in high levels
                    else if (level > 50 && roll < 0.0008) t.type = TileType.ARTIFACT_NEXUS;
                }
            });

            // Enemy Density Scaling - EXTREME for levels 40+
            for (let i = 0; i < enemyCount; i++) {
                const t = tiles[Math.floor(Math.random() * tiles.length)];
                if (t.type === TileType.FLOOR && t.x > 10) {
                    const difficulty = level > 40 ? 'chaotic' : (level > 35 ? 'complex' : (level > 15 ? 'intermediate' : 'simple'));
                    
                    // Determine enemy type based on level
                    let enemyType: 'drone' | 'stalker' | 'hunter' | 'phantom' | 'sentinel' | 'swarm' = 'drone';
                    const roll = Math.random();
                    
                    if (level >= 40) {
                        // High level: mix of all types
                        if (roll < 0.2) enemyType = 'phantom';
                        else if (roll < 0.4) enemyType = 'sentinel';
                        else if (roll < 0.6) enemyType = 'swarm';
                        else enemyType = 'hunter';
                    } else if (level >= 30) {
                        // Swarm introduction
                        if (roll < 0.3) enemyType = 'swarm';
                        else if (roll < 0.5) enemyType = 'phantom';
                        else if (roll < 0.7) enemyType = 'sentinel';
                        else enemyType = 'hunter';
                    } else if (level >= 25) {
                        // Sentinel introduction
                        if (roll < 0.3) enemyType = 'sentinel';
                        else if (roll < 0.6) enemyType = 'phantom';
                        else enemyType = 'hunter';
                    } else if (level >= 20) {
                        // Phantom introduction
                        if (roll < 0.4) enemyType = 'phantom';
                        else if (roll < 0.7) enemyType = 'stalker';
                        else enemyType = 'hunter';
                    } else if (level > 15) {
                        enemyType = roll < 0.5 ? 'stalker' : 'hunter';
                    } else {
                        enemyType = 'drone';
                    }
                    
                    const enemy: Enemy = {
                        id: `e-${level}-${i}`, 
                        x: t.x, y: t.y, 
                        homePos: { x: t.x, y: t.y },
                        type: enemyType, 
                        health: 120 + (level * 8), 
                        stunnedTurns: 0, 
                        awareness: level / 100,
                        isHunting: false,
                        targetPlayer: false
                    };

                    // Special properties for new enemy types
                    if (enemyType === 'phantom') {
                        enemy.teleportCooldown = 0; // Ready to teleport
                    } else if (enemyType === 'sentinel') {
                        enemy.detectionRadius = ENEMY_BEHAVIOR.sentinel.detectionRadius;
                    } else if (enemyType === 'swarm') {
                        // Create swarm group
                        if (i % 3 === 0) {
                            // This is a swarm leader
                            enemy.swarmMembers = [];
                        } else {
                            // This is a swarm member, find nearest leader
                            const leaders = enemies.filter(e => e.type === 'swarm' && e.swarmMembers);
                            if (leaders.length > 0) {
                                const leader = leaders[leaders.length - 1];
                                enemy.swarmLeader = leader.id;
                                leader.swarmMembers!.push(enemy.id);
                            }
                        }
                    }

                    // Pair enemies for coordination at level 35+
                    if (level >= DUAL_HUNTER_MODE.startLevel && i > 0 && Math.random() < 0.4) {
                        enemy.coordinatedWith = `e-${level}-${i - 1}`;
                    }

                    enemies.push(enemy);
                }
            }
            validLevel = true;
        }
    }

    const complexity = level > 50 ? 'chaotic' : (level > 35 ? 'complex' : (level > 15 ? 'intermediate' : 'simple'));
    
    return { 
        tiles, 
        enemies, 
        signalCount: requiredSignals, 
        width, 
        height,
        difficulty: level,
        enemyComplexity: complexity as 'simple' | 'intermediate' | 'complex' | 'chaotic'
    };
};
