import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Heart, Zap, Signal, Target, Activity, Shield, AlertTriangle, CreditCard, CheckCircle2, LogIn, Trophy, Settings, Menu, X } from 'lucide-react';
import { AppState, Player, Tile, TileType, LogEntry, Enemy, LevelConfig, TouchInput, GameSettings, SignalFragment, Coordinates } from './types';
import { INITIAL_PLAYER_HEALTH, SIGNAL_FRAGMENTS, HAZARD_DAMAGE, REVIVE_COIN_CONFIG, CONTINUOUS_MODE, LEVEL_SCALES, DUAL_HUNTER_MODE, ENEMY_BEHAVIOR } from './constants';
import { generateLevel } from './services/generator';
import { audio } from './services/audio';
import { authService } from './services/auth';
import { paymentService } from './services/payment';
import GameGrid from './components/GameGrid';
import Terminal from './components/Terminal';
import GoogleLoginButton from './components/GoogleLoginButton';
import PaymentModal from './components/PaymentModal';

const SAVE_KEY = 'last_signal_prod_v1_0';
const MOBILE_CHECK_LANDSCAPE = () => window.innerWidth > window.innerHeight;

interface LayerProps {
  isActive: boolean;
  children: React.ReactNode;
  className?: string;
}

const Layer: React.FC<LayerProps> = ({ isActive, children, className = '' }) => (
  <div className={`layer fixed inset-0 ${isActive ? 'z-50 pointer-events-auto' : 'z-0 pointer-events-none opacity-0'} transition-opacity ${className}`}>
    {children}
  </div>
);

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.AUTH);
  const [level, setLevel] = useState(1);
  const [levelData, setLevelData] = useState<LevelConfig | null>(null);
  const [enemies, setEnemies] = useState<Enemy[]>([]);
  const [isInvincible, setIsInvincible] = useState(false);
  const [currentFragment, setCurrentFragment] = useState<SignalFragment | null>(null);
  const [isMobile, setIsMobile] = useState(MOBILE_CHECK_LANDSCAPE());
  const [gameSettings, setGameSettings] = useState<GameSettings>({
    masterVolume: 0.7,
    musicVolume: 0.6,
    sfxVolume: 0.8,
    hapticFeedback: true,
    screenDimensions: { width: window.innerWidth, height: window.innerHeight },
    isLandscape: MOBILE_CHECK_LANDSCAPE()
  });

  const [player, setPlayer] = useState<Player>({
    x: 1, y: 1, health: INITIAL_PLAYER_HEALTH, maxHealth: INITIAL_PLAYER_HEALTH,
    energy: 100, maxEnergy: 100, fragmentsCollected: 0, bits: 0, 
    signalCoins: REVIVE_COIN_CONFIG.initialFreeCoins,
    reputation: 'NEUTRAL', 
    upgrades: { health: 0, energy: 0, scan: 0, emp: 0, regen: 0, kinetic: 0 },
    totalScore: 0, artifacts: { omega: 0, void: 0, nexus: 0, beacon: 0 }, 
    highScore: 0, currentLevel: 1, totalCoinsSpent: 0, totalRevives: 0
  });

  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [lastMoveTime, setLastMoveTime] = useState(Date.now());
  const [touchInput, setTouchInput] = useState<TouchInput>({ dpadX: 0, dpadY: 0, actionButtonPressed: false, specialAbilityPressed: false });
  const [showSettings, setShowSettings] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  const enemyTickRef = useRef<number | null>(null);
  const drainTickRef = useRef<number | null>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  // Authentication & Persistence
  useEffect(() => {
    // Initialize payment service
    paymentService.init();

    // Check for existing auth session
    const user = authService.init();
    if (user) {
      setPlayer(prev => ({ 
        ...prev, 
        email: user.email, 
        googleId: user.googleId 
      }));
      setAppState(AppState.MENU);
      addLog("SESSION_RESTORED", "success");
    }

    // Load game save
    const saved = localStorage.getItem(SAVE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setPlayer(prev => ({ ...prev, ...parsed.player }));
        setLevel(parsed.level || 1);
      } catch (e) { console.error("Save file corrupted, starting fresh"); }
    }

    // Check for payment success/cancel in URL
    const urlParams = new URLSearchParams(window.location.search);
    const paymentStatus = urlParams.get('payment');
    if (paymentStatus === 'success') {
      addLog("PAYMENT_SUCCESS", "success");
      // Clean URL
      window.history.replaceState({}, '', window.location.pathname);
    } else if (paymentStatus === 'cancel') {
      addLog("PAYMENT_CANCELLED", "warning");
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  useEffect(() => {
    if (appState !== AppState.AUTH) {
      localStorage.setItem(SAVE_KEY, JSON.stringify({ player, level }));
    }
  }, [player, level, appState]);

  // Responsive design
  useEffect(() => {
    const handleResize = () => {
      const isLand = MOBILE_CHECK_LANDSCAPE();
      setIsMobile(true);
      setGameSettings(prev => ({
        ...prev,
        screenDimensions: { width: window.innerWidth, height: window.innerHeight },
        isLandscape: isLand
      }));
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const addLog = useCallback((message: string, type: LogEntry['type'] = 'info') => {
    setLogs(prev => [...prev.slice(-12), { id: Date.now(), message, type, timestamp: Date.now() }]);
  }, []);

  const startLevel = (lvl: number) => {
    const config = generateLevel(lvl);
    setLevelData(config);
    setEnemies(config.enemies);
    setPlayer(prev => ({ 
      ...prev, x: 1, y: 1, fragmentsCollected: 0, 
      energy: prev.maxEnergy, currentLevel: lvl 
    }));
    setLogs([]);
    addLog(`INFILTRATING_SECTOR_${lvl}`, 'system');
    if (lvl >= CONTINUOUS_MODE.startLevel) {
      addLog(`ENEMIES_MOVING_CONTINUOUSLY`, 'warning');
    }
    setAppState(AppState.PLAYING);
    setLastMoveTime(Date.now());
    audio.setMusicState('EXPLORE');
  };

  const handleGoogleLogin = async (credential: string) => {
    const result = await authService.handleGoogleLogin(credential);
    
    if (result.success && result.user) {
      setPlayer(prev => ({ 
        ...prev, 
        email: result.user!.email, 
        googleId: result.user!.googleId 
      }));
      setAppState(AppState.MENU);
      audio.setMusicState('MENU');
      addLog("GOOGLE_AUTH_SUCCESS", "success");
    } else {
      addLog(`AUTH_FAILED: ${result.error}`, "danger");
    }
  };

  const handleGoogleLoginError = (error: string) => {
    addLog(`AUTH_ERROR: ${error}`, "danger");
    console.error('Google login error:', error);
  };

  const handlePaymentSuccess = (coins: number, transactionId: string) => {
    setPlayer(p => ({ 
      ...p, 
      signalCoins: p.signalCoins + coins, 
      totalCoinsSpent: p.totalCoinsSpent + (coins === 100 ? 0.99 : coins === 500 ? 3.99 : 6.99)
    }));
    addLog(`COINS_PURCHASED: +${coins}`, "success");
    audio.playCollect();
  };

  // Advanced Enemy AI with continuous movement & dual coordination
  const moveEnemies = useCallback(() => {
    if (!levelData || appState !== AppState.PLAYING) return;
    
    setEnemies(prev => {
      const activeHunters = prev.filter(e => e.isHunting);
      const detectionRange = level >= 40 ? ENEMY_BEHAVIOR.detectionRangeLevel40Plus : 
                            (level >= 30 ? ENEMY_BEHAVIOR.detectionRangeLevel30Plus :
                            (level >= 15 ? ENEMY_BEHAVIOR.detectionRangeLevel15Plus : ENEMY_BEHAVIOR.detectionRangeBase));
      
      return prev.map(enemy => {
        if (enemy.stunnedTurns > 0) return { ...enemy, stunnedTurns: enemy.stunnedTurns - 1 };
        
        const dist = Math.abs(player.x - enemy.x) + Math.abs(player.y - enemy.y);
        
        // PHANTOM BEHAVIOR: Teleportation
        if (enemy.type === 'phantom') {
          const cooldown = enemy.teleportCooldown || 0;
          
          if (cooldown > 0) {
            // Cooldown active, move normally
            enemy.teleportCooldown = cooldown - 1;
          } else if (dist < detectionRange && dist > 3) {
            // Teleport closer to player
            const teleportRange = ENEMY_BEHAVIOR.phantom.teleportRange;
            const possibleTeleports: Coordinates[] = [];
            
            for (let dx = -teleportRange; dx <= teleportRange; dx++) {
              for (let dy = -teleportRange; dy <= teleportRange; dy++) {
                const newX = player.x + dx;
                const newY = player.y + dy;
                const newDist = Math.abs(dx) + Math.abs(dy);
                
                if (newDist > 2 && newDist < 6) { // Teleport to 3-5 tiles away
                  const tile = levelData.tiles.find(t => t.x === newX && t.y === newY);
                  if (tile && tile.type !== TileType.WALL) {
                    possibleTeleports.push({ x: newX, y: newY });
                  }
                }
              }
            }
            
            if (possibleTeleports.length > 0) {
              const teleportPos = possibleTeleports[Math.floor(Math.random() * possibleTeleports.length)];
              audio.playHack(); // Teleport sound
              return { 
                ...enemy, 
                x: teleportPos.x, 
                y: teleportPos.y, 
                isHunting: true,
                teleportCooldown: ENEMY_BEHAVIOR.phantom.teleportCooldown 
              };
            }
          }
        }
        
        // SENTINEL BEHAVIOR: Immobile but long-range detection
        if (enemy.type === 'sentinel') {
          const sentinelRange = enemy.detectionRadius || ENEMY_BEHAVIOR.sentinel.detectionRadius;
          if (dist < sentinelRange) {
            // Alert nearby enemies
            prev.forEach(e => {
              if (e.id !== enemy.id && Math.abs(e.x - enemy.x) + Math.abs(e.y - enemy.y) < 10) {
                e.isHunting = true;
              }
            });
            return { ...enemy, isHunting: true, targetPlayer: true };
          }
          return enemy; // Sentinels don't move
        }
        
        // SWARM BEHAVIOR: Move as a group
        if (enemy.type === 'swarm') {
          if (enemy.swarmLeader) {
            // Follow the leader
            const leader = prev.find(e => e.id === enemy.swarmLeader);
            if (leader) {
              const leaderDist = Math.abs(enemy.x - leader.x) + Math.abs(enemy.y - leader.y);
              if (leaderDist > ENEMY_BEHAVIOR.swarm.cohesionRange) {
                // Move towards leader
                const possible = [
                  { x: enemy.x + 1, y: enemy.y }, { x: enemy.x - 1, y: enemy.y },
                  { x: enemy.x, y: enemy.y + 1 }, { x: enemy.x, y: enemy.y - 1 }
                ].filter(m => {
                  const t = levelData.tiles.find(tile => tile.x === m.x && tile.y === m.y);
                  return t && t.type !== TileType.WALL;
                });
                
                if (possible.length > 0) {
                  const best = possible.reduce((best, curr) => {
                    const dBest = Math.abs(leader.x - best.x) + Math.abs(leader.y - best.y);
                    const dCurr = Math.abs(leader.x - curr.x) + Math.abs(leader.y - curr.y);
                    return dCurr < dBest ? curr : best;
                  });
                  return { ...enemy, x: best.x, y: best.y, isHunting: leader.isHunting };
                }
              }
              return { ...enemy, isHunting: leader.isHunting };
            }
          } else if (enemy.swarmMembers) {
            // This is a leader, hunt player if detected
            if (dist < detectionRange) {
              return { ...enemy, isHunting: true, targetPlayer: true };
            }
          }
        }
        
        // STANDARD BEHAVIOR (for all enemy types)
        const hasCoordinatedAlly = activeHunters.some(h => 
          h.coordinatedWith === enemy.id || enemy.coordinatedWith === h.id
        );
        const coordinateFactor = hasCoordinatedAlly || (
          activeHunters.length > 1 && 
          Math.abs(activeHunters[0].x - enemy.x) + Math.abs(activeHunters[0].y - enemy.y) < DUAL_HUNTER_MODE.coordinationRange
        );
        
        const shouldHunt = enemy.isHunting || dist < detectionRange || coordinateFactor;
        
        if (shouldHunt) {
          if (dist === 1) {
            if (!isInvincible) {
              const dmg = 15 + Math.floor(level / 2) + (enemy.type === 'hunter' ? 5 : 0);
              setPlayer(p => ({ ...p, health: Math.max(0, p.health - dmg) }));
              audio.playDamage();
              addLog("HULL_BREACH", "danger");
            }
            return { ...enemy, isHunting: true, targetPlayer: true };
          }

          const possible = [
            { x: enemy.x + 1, y: enemy.y }, { x: enemy.x - 1, y: enemy.y },
            { x: enemy.x, y: enemy.y + 1 }, { x: enemy.x, y: enemy.y - 1 }
          ].filter(m => {
            const t = levelData.tiles.find(tile => tile.x === m.x && tile.y === m.y);
            return t && t.type !== TileType.WALL;
          });

          if (possible.length > 0) {
            const best = possible.reduce((best, curr) => {
              const dBest = Math.abs(player.x - best.x) + Math.abs(player.y - best.y);
              const dCurr = Math.abs(player.x - curr.x) + Math.abs(player.y - curr.y);
              return dCurr < dBest ? curr : best;
            });
            return { ...enemy, x: best.x, y: best.y, isHunting: true, targetPlayer: true };
          }
        }
        return enemy;
      });
    });
  }, [player.x, player.y, levelData, level, appState, isInvincible, addLog]);

  // Enemy continuous movement (from level 5+)
  useEffect(() => {
    if (appState === AppState.PLAYING && level >= CONTINUOUS_MODE.startLevel) {
      const interval = ENEMY_BEHAVIOR.moveIntervalReduce(level);
      enemyTickRef.current = window.setInterval(moveEnemies, interval);
    }
    return () => { if (enemyTickRef.current) clearInterval(enemyTickRef.current); };
  }, [appState, level, moveEnemies]);

  // Energy drain mechanic (from level 5+)
  useEffect(() => {
    if (appState === AppState.PLAYING && level >= CONTINUOUS_MODE.startLevel) {
      drainTickRef.current = window.setInterval(() => {
        const timeSinceMove = Date.now() - lastMoveTime;
        if (timeSinceMove > CONTINUOUS_MODE.initialStandStillGracePeriod) {
          setPlayer(p => {
            if (p.energy > 0) {
              return { ...p, energy: Math.max(0, p.energy - Math.round(CONTINUOUS_MODE.initialStandStillGracePeriod / 1000 * 1.5)) };
            }
            // Energy fully drained, start losing health
            return { ...p, health: Math.max(0, p.health - 3) };
          });
          audio.playDamage();
        }
      }, CONTINUOUS_MODE.energyDrainInterval);
    }
    return () => { if (drainTickRef.current) clearInterval(drainTickRef.current); };
  }, [appState, level, lastMoveTime]);

  const handleRevive = () => {
    if (player.signalCoins >= 1) {
      setPlayer(p => ({ 
        ...p, 
        signalCoins: p.signalCoins - 1, 
        health: p.maxHealth, 
        energy: p.maxEnergy,
        totalRevives: p.totalRevives + 1
      }));
      setIsInvincible(true);
      setTimeout(() => setIsInvincible(false), 5000);
      setAppState(AppState.PLAYING);
      addLog("SIGNAL_RESTORATION_COMPLETE", "success");
      audio.setMusicState('EXPLORE');
    }
  };

  const handleMove = (dx: number, dy: number) => {
    if (appState !== AppState.PLAYING || !levelData || currentFragment) return;
    const nx = player.x + dx, ny = player.y + dy;
    const target = levelData.tiles.find(t => t.x === nx && t.y === ny);
    if (!target || target.type === TileType.WALL) return;

    setLastMoveTime(Date.now());
    audio.playMove();

    setPlayer(prev => {
      let nh = prev.health, ne = prev.energy, nf = prev.fragmentsCollected, nb = prev.bits, nc = prev.signalCoins;
      const na = { ...prev.artifacts };

      // Tile Mechanics
      if (target.type === TileType.SIGNAL) { 
        nf++; nb += 250; audio.playCollect(); 
        const frag = SIGNAL_FRAGMENTS[Math.floor(Math.random() * SIGNAL_FRAGMENTS.length)];
        setCurrentFragment(frag);
        addLog(`SIGNAL_DECODED`, 'success'); 
      }
      if (target.type === TileType.BATTERY) { 
        ne = Math.min(prev.maxEnergy, ne + 60); 
        addLog("ENERGY_RESTORED", "info"); 
        audio.playHack(); 
      }
      if (target.type === TileType.OMEGA_CORE) { 
        na.omega++; prev.maxEnergy += 30; ne = prev.maxEnergy; 
        addLog("OMEGA_UNLOCKED: +30_MAX_ENERGY", "success"); 
        audio.playCollect(); 
      }
      if (target.type === TileType.VOID_SHIELD) { 
        na.void++; prev.maxHealth += 30; nh = prev.maxHealth; 
        addLog("VOID_SHIELD: +30_MAX_HEALTH", "success"); 
        audio.playCollect(); 
      }
      if (target.type === TileType.ARTIFACT_NEXUS) { 
        na.nexus++; ne = prev.maxEnergy; nh = prev.maxHealth;
        addLog("NEXUS_ARTIFACT_ACQUIRED", "success"); 
        audio.playCollect(); 
      }
      if (target.type === TileType.COIN_CACHE) { 
        nc += 1; 
        addLog("COIN_FOUND: +1", "success"); 
        audio.playCollect(); 
      }
      if (target.type === TileType.HAZARD) { 
        nh = Math.max(0, nh - HAZARD_DAMAGE); 
        addLog("HAZARD_DAMAGE", "danger"); 
        audio.playDamage(); 
      }
      if (target.type === TileType.EXIT && nf >= levelData.signalCount) { 
        setAppState(AppState.LEVEL_COMPLETE); 
        audio.setMusicState('MENU'); 
        addLog(`SECTOR_${level}_COMPLETE`, 'success');
      }

      const newScore = prev.totalScore + (nf > prev.fragmentsCollected ? 500 : 0) + nb;
      return { 
        ...prev, x: nx, y: ny, health: nh, energy: Math.max(0, ne - 1), 
        fragmentsCollected: nf, bits: nb, signalCoins: nc, artifacts: na,
        totalScore: newScore,
        highScore: Math.max(newScore, prev.highScore)
      };
    });

    if (level < CONTINUOUS_MODE.startLevel) moveEnemies();
  };

  // Touch controls for mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    if (appState !== AppState.PLAYING) return;
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStartRef.current || appState !== AppState.PLAYING) return;
    const touch = e.touches[0];
    const dx = touch.clientX - touchStartRef.current.x;
    const dy = touch.clientY - touchStartRef.current.y;
    const threshold = 20;

    if (Math.abs(dx) > threshold || Math.abs(dy) > threshold) {
      if (Math.abs(dx) > Math.abs(dy)) {
        handleMove(dx > 0 ? 1 : -1, 0);
      } else {
        handleMove(0, dy > 0 ? 1 : -1);
      }
      touchStartRef.current = { x: touch.clientX, y: touch.clientY };
    }
  };

  useEffect(() => {
    if (player.health <= 0 && appState === AppState.PLAYING) {
      setAppState(AppState.REVIVE_PROMPT);
      audio.setMusicState('GAMEOVER');
    }
  }, [player.health, appState]);

  useEffect(() => {
    const hk = (e: KeyboardEvent) => {
      if (appState !== AppState.PLAYING) return;
      const keys: any = { 
        w: [0,-1], s: [0,1], a: [-1,0], d: [1,0], 
        ArrowUp: [0,-1], ArrowDown: [0,1], ArrowLeft: [-1,0], ArrowRight: [1,0] 
      };
      if (keys[e.key]) { e.preventDefault(); handleMove(keys[e.key][0], keys[e.key][1]); }
    };
    window.addEventListener('keydown', hk);
    return () => window.removeEventListener('keydown', hk);
  }, [appState, player, levelData, currentFragment]);

  return (
    <div className="min-h-screen bg-black text-white font-mono overflow-hidden" onTouchStart={handleTouchStart} onTouchMove={handleTouchMove}>
      
      {/* AUTH LAYER */}
      <Layer isActive={appState === AppState.AUTH} className="bg-[#050505] flex items-center justify-center p-4">
        <div className="max-w-md w-full p-12 border-2 border-cyan-500 bg-zinc-950 rounded-2xl text-center space-y-8">
          <div className="relative inline-block">
            <Signal size={100} className="text-cyan-500 mx-auto animate-pulse" />
          </div>
          <div className="space-y-3">
            <h1 className="text-5xl font-black text-cyan-400 tracking-tight uppercase">LAST SIGNAL</h1>
            <p className="text-xs text-zinc-500 tracking-widest">ROGUE SECTOR EDITION</p>
          </div>
          <div className="space-y-3 text-sm text-zinc-400">
            <p>🎮 Desktop: WASD or Arrows</p>
            <p>📱 Mobile: Drag to move</p>
            <p>🎯 Collect signals. Escape. Survive.</p>
          </div>
          <GoogleLoginButton 
            onSuccess={handleGoogleLogin}
            onError={handleGoogleLoginError}
          />
          <div className="text-xs text-zinc-700">v1.0 PRODUCTION BUILD</div>
        </div>
      </Layer>

      {/* PAYMENT LAYER - Now using PaymentModal component */}
      <PaymentModal 
        isOpen={appState === AppState.PAYMENT_CHECKOUT}
        onClose={() => setAppState(AppState.MENU)}
        onSuccess={handlePaymentSuccess}
      />

      {/* MAIN GAME UI */}
      {appState !== AppState.AUTH && appState !== AppState.PAYMENT_CHECKOUT && (
        <div className="flex h-screen w-screen overflow-hidden">
          
          {/* DASHBOARD LAYER - Left sidebar on desktop, top bar on mobile */}
          <div className={`layer-dashboard ${isMobile && gameSettings.isLandscape ? 'absolute top-0 left-0 right-0 h-16 bg-black/95 border-b border-zinc-800 p-2 flex gap-4 items-center overflow-x-auto' : 'w-72 border-r border-zinc-800 bg-zinc-950 p-6 flex flex-col gap-6'}`}>
            {/* Player Info Card */}
            <div className={`flex items-center gap-3 ${isMobile && gameSettings.isLandscape ? 'flex-1 min-w-max' : 'w-full'} p-3 border border-cyan-500/30 bg-cyan-500/5 rounded-lg`}>
              <Target size={24} className="text-cyan-500 flex-shrink-0" />
              <div className={isMobile && gameSettings.isLandscape ? 'hidden' : 'block'}>
                <div className="text-xs font-bold text-zinc-600">OPERATOR</div>
                <div className="text-sm font-bold text-cyan-400 truncate">{player.email?.split('@')[0] || 'ANON'}</div>
              </div>
              <div className={isMobile && gameSettings.isLandscape ? 'hidden' : 'block'}>
                <span className="inline-block w-2 h-2 bg-green-500 rounded-full mr-2"></span>
              </div>
            </div>

            {/* Stats */}
            <div className={`space-y-2 ${isMobile && gameSettings.isLandscape ? 'flex gap-2 flex-1' : ''}`}>
              <DashboardStat label="HP" value={player.health} max={player.maxHealth} color="#ef4444" short={isMobile && gameSettings.isLandscape} />
              <DashboardStat label="EN" value={player.energy} max={player.maxEnergy} color="#06b6d4" short={isMobile && gameSettings.isLandscape} />
            </div>

            {/* Resources */}
            <div className={`grid ${isMobile && gameSettings.isLandscape ? 'grid-cols-4' : 'grid-cols-2'} gap-2`}>
              <StatBox icon="💰" value={player.signalCoins} label="COINS" />
              <StatBox icon="🛡️" value={player.artifacts.void + player.artifacts.omega} label="ARTIFACTS" />
              <StatBox icon="📊" value={Math.floor(player.totalScore / 100)} label="SCORE" />
              <StatBox icon="🏆" value={player.currentLevel} label="LEVEL" />
            </div>

            {/* Terminal (only on desktop) */}
            {!gameSettings.isLandscape && currentFragment && (
              <div className="flex-1 min-h-0 flex items-end">
                <Terminal fragment={currentFragment} onClose={() => setCurrentFragment(null)} />
              </div>
            )}

            {/* Logs */}
            {!gameSettings.isLandscape && (
              <div className="flex-1 flex flex-col border border-zinc-800 bg-black/40 rounded-lg p-3 overflow-hidden">
                <div className="text-xs font-bold text-zinc-600 mb-2 flex items-center gap-2">
                  <Activity size={14} /> LOGS
                </div>
                <div className="flex-1 overflow-y-auto text-[10px] font-mono space-y-1">
                  {logs.slice(-8).map(l => (
                    <div key={l.id} className={`${l.type === 'danger' ? 'text-red-500' : l.type === 'success' ? 'text-green-500' : 'text-zinc-500'}`}>
                      [{new Date(l.timestamp).getSeconds()}s] {l.message}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className={`space-y-2 ${isMobile && gameSettings.isLandscape ? 'hidden' : ''}`}>
              <button 
                onClick={() => setAppState(AppState.PAYMENT_CHECKOUT)}
                className="w-full bg-amber-600 hover:bg-amber-500 text-white px-4 py-3 rounded-lg font-bold text-sm transition-all"
              >
                <CreditCard size={16} className="inline mr-2" /> BUY COINS
              </button>
              <button 
                onClick={() => setShowSettings(!showSettings)}
                className="w-full bg-zinc-800 hover:bg-zinc-700 text-white px-4 py-2 rounded-lg font-bold text-sm transition-all"
              >
                <Settings size={16} className="inline mr-2" /> SETTINGS
              </button>
            </div>
          </div>

          {/* MAIN GAME LAYER */}
          <main className="layer-game flex-1 relative flex flex-col items-center justify-center bg-[#010101] overflow-auto">
            {appState === AppState.MENU && (
              <div className="text-center space-y-12 py-20 px-8 max-w-4xl">
                <div className="space-y-4">
                  <p className="text-xs font-bold text-cyan-500 tracking-widest">SECTOR {level}</p>
                  <h1 className="text-6xl md:text-8xl font-black text-white tracking-tighter">{level === 100 ? 'FINAL NEXUS' : `SECTOR_${level}`}</h1>
                  <p className="text-sm text-zinc-400 max-w-2xl mx-auto">
                    {level <= 5 && "Enemies are stationary. Escape is your only goal."}
                    {level > 5 && level < 35 && "Enemies hunt continuously. Keep moving or lose energy."}
                    {level >= 35 && level < 40 && "Dual hunters coordinate. They move differently."}
                    {level >= 40 && "EXTREME DIFFICULTY. Only geniuses proceed."}
                  </p>
                </div>
                <button 
                  onClick={() => startLevel(level)}
                  className="inline-block bg-cyan-600 hover:bg-cyan-500 text-white px-12 py-6 rounded-lg font-black text-xl transition-all hover:scale-105"
                >
                  START INFILTRATION
                </button>
              </div>
            )}

            {appState === AppState.PLAYING && levelData && (
              <div className="w-full h-full flex flex-col items-center justify-center p-4 md:p-8">
                <div className={`mb-4 flex ${isMobile && gameSettings.isLandscape ? 'text-xs gap-2' : 'text-sm gap-8'} font-bold text-zinc-300`}>
                  <span className="text-red-500">🎯 DEPTH: {level}</span>
                  <span className="text-orange-500">👾 ENEMIES: {enemies.length}</span>
                  <span className="text-green-500">📡 SIGNALS: {levelData.signalCount - player.fragmentsCollected}/{levelData.signalCount}</span>
                </div>
                
                <div className="grid-frame">
                  <GameGrid 
                    tiles={levelData.tiles} player={player} enemies={enemies} 
                    width={levelData.width} height={levelData.height} 
                    exitUnlocked={player.fragmentsCollected >= levelData.signalCount} 
                    scanActive={false} empActive={false} trails={{}} 
                  />
                </div>
              </div>
            )}

            {appState === AppState.LEVEL_COMPLETE && (
              <div className="text-center space-y-8">
                <div className="space-y-3">
                  <h2 className="text-7xl font-black text-green-500">✓ CLEAR</h2>
                  <p className="text-zinc-400 font-bold">Sector {level} Complete</p>
                </div>
                <button 
                  onClick={() => { setLevel(l => l + 1); startLevel(level + 1); }}
                  className="bg-green-600 hover:bg-green-500 text-white px-8 py-4 rounded-lg font-bold text-lg transition-all hover:scale-105"
                >
                  NEXT SECTOR →
                </button>
              </div>
            )}

            {appState === AppState.REVIVE_PROMPT && (
              <div className="text-center space-y-8 p-8 max-w-md bg-zinc-900/95 border-2 border-red-600 rounded-xl">
                <h2 className="text-4xl font-black text-red-500">⚠ SIGNAL LOST</h2>
                <div className="space-y-2 text-sm text-zinc-400">
                  <p>You were defeated at Sector {level}</p>
                  <p>Restore neural link with a Signal Coin</p>
                </div>
                <div className="space-y-2">
                  <button 
                    onClick={handleRevive}
                    disabled={player.signalCoins < 1}
                    className={`w-full py-4 rounded-lg font-bold text-white transition-all ${player.signalCoins > 0 ? 'bg-red-600 hover:bg-red-500 cursor-pointer' : 'bg-zinc-700 opacity-50 cursor-not-allowed'}`}
                  >
                    REVIVE [1 COIN] {player.signalCoins > 0 ? `✓` : '✗'}
                  </button>
                  <button 
                    onClick={() => setAppState(AppState.PAYMENT_CHECKOUT)}
                    className="w-full bg-amber-600 hover:bg-amber-500 text-white py-2 rounded-lg font-bold text-sm transition-all"
                  >
                    BUY COINS
                  </button>
                  <button 
                    onClick={() => { setLevel(1); setAppState(AppState.MENU); }}
                    className="w-full bg-zinc-800 hover:bg-zinc-700 text-white py-2 rounded-lg font-bold text-sm transition-all"
                  >
                    RETURN TO MENU
                  </button>
                </div>
              </div>
            )}
          </main>
        </div>
      )}

      <style>{`
        .grid-frame {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(40px, 1fr));
          gap: 1px;
          background: black;
          padding: 1px;
          border: 2px solid #06b6d4;
          border-radius: 8px;
          max-width: 90vw;
          max-height: 85vh;
          aspect-ratio: auto;
        }

        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
};

const DashboardStat = ({ label, value, max, color, short }: any) => {
  const percent = Math.min(100, (value / max) * 100);
  return (
    <div className={short ? 'flex-1 min-w-max' : 'w-full'}>
      <div className={`flex ${short ? 'justify-between text-xs' : 'justify-between text-sm'} font-bold mb-1`}>
        <span className="text-zinc-600">{label}</span>
        <span style={{ color }} className="font-black">{Math.round(percent)}%</span>
      </div>
      <div className="h-3 bg-black border border-zinc-800 rounded-sm overflow-hidden">
        <div className="h-full transition-all duration-500" style={{ width: `${percent}%`, backgroundColor: color, boxShadow: `0 0 10px ${color}66` }}></div>
      </div>
    </div>
  );
};

const StatBox = ({ icon, value, label }: any) => (
  <div className="bg-zinc-900/60 border border-zinc-800 rounded-lg p-2 text-center">
    <div className="text-xl">{icon}</div>
    <div className="text-sm font-bold text-cyan-400">{value}</div>
    <div className="text-[10px] text-zinc-600">{label}</div>
  </div>
);

export default App;
