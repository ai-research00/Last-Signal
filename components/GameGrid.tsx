
import React from 'react';
import { Player, Tile, TileType, Enemy } from '../types';
import { Radio, Skull, DoorOpen, Lock, Bot, Zap, Shield, AlertTriangle, Crosshair } from 'lucide-react';

interface GameGridProps {
  tiles: Tile[];
  player: Player;
  enemies: Enemy[];
  width: number;
  height: number;
  exitUnlocked: boolean;
  scanActive: boolean;
  empActive: boolean;
  trails: Record<string, any>;
}

const GameGrid: React.FC<GameGridProps> = ({ tiles, player, enemies, width, height, exitUnlocked }) => {
  return (
    <div 
      className="relative bg-black shadow-2xl overflow-hidden"
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${width}, 1fr)`,
        gridTemplateRows: `repeat(${height}, 1fr)`,
        width: '100%',
        aspectRatio: `${width}/${height}`,
        maxWidth: '95vw',
        maxHeight: '85vh',
        gap: '1px',
        backgroundColor: '#000',
        border: '2px solid #06b6d4'
      }}
      role="grid"
    >
      {tiles.map((tile) => {
        const dist = Math.sqrt(Math.pow(tile.x - player.x, 2) + Math.pow(tile.y - player.y, 2));
        const isVisible = dist < (5 + player.upgrades.scan * 2);
        const isDiscovered = tile.revealed || isVisible;
        const isPlayer = tile.x === player.x && tile.y === player.y;
        const enemy = enemies.find(e => e.x === tile.x && e.y === tile.y);
        
        if (!isDiscovered) return <div key={tile.id} className="bg-black/90 border-0"></div>;

        let content = null;
        let bgClass = 'bg-zinc-900';
        let borderColor = 'border-zinc-800';

        if (isPlayer) {
          content = (
            <div className="relative flex items-center justify-center w-full h-full animate-pulse">
              <div className="w-2 h-2 bg-cyan-400 rounded-full shadow-[0_0_12px_#22d3ee]"></div>
            </div>
          );
          bgClass = 'bg-cyan-500/20';
          borderColor = 'border-cyan-400/40';
        } else if (enemy && isVisible) {
          const isHunting = enemy.isHunting;
          const isTwin = enemy.coordinatedWith;
          const isSwarmLeader = enemy.swarmMembers && enemy.swarmMembers.length > 0;
          
          content = (
            <div className="flex items-center justify-center w-full h-full">
              {enemy.type === 'hunter' ? (
                <div className="text-lg font-black text-red-600">◆</div>
              ) : enemy.type === 'stalker' ? (
                <div className="text-lg font-black text-orange-500">●</div>
              ) : enemy.type === 'phantom' ? (
                <div className="text-lg font-black text-purple-500 animate-pulse">◇</div>
              ) : enemy.type === 'sentinel' ? (
                <div className="text-lg font-black text-blue-500">▲</div>
              ) : enemy.type === 'swarm' ? (
                <div className={`text-sm font-black ${isSwarmLeader ? 'text-green-500' : 'text-green-400'}`}>
                  {isSwarmLeader ? '◉' : '○'}
                </div>
              ) : (
                <div className="text-lg font-black text-yellow-600">○</div>
              )}
            </div>
          );
          
          // Different background colors for different enemy types
          if (enemy.type === 'phantom') {
            bgClass = 'bg-purple-900/40';
            borderColor = isHunting ? 'border-purple-500/80' : 'border-purple-700/40';
          } else if (enemy.type === 'sentinel') {
            bgClass = 'bg-blue-900/40';
            borderColor = 'border-blue-600/60';
          } else if (enemy.type === 'swarm') {
            bgClass = isSwarmLeader ? 'bg-green-900/50' : 'bg-green-900/30';
            borderColor = isHunting ? 'border-green-500/70' : 'border-green-700/40';
          } else {
            bgClass = isHunting ? (isTwin ? 'bg-red-600/40' : 'bg-red-500/30') : 'bg-orange-900/20';
            borderColor = isHunting ? 'border-red-500/60' : 'border-orange-700/40';
          }
        } else {
          switch (tile.type) {
            case TileType.WALL:
              bgClass = 'bg-zinc-950';
              borderColor = 'border-zinc-900';
              content = <div className="w-full h-full bg-gradient-to-br from-zinc-800 to-black"></div>;
              break;
            case TileType.SIGNAL:
              bgClass = 'bg-emerald-900/40';
              borderColor = 'border-emerald-600/60';
              content = <Radio size={12} className="text-emerald-400 animate-pulse" />;
              break;
            case TileType.OMEGA_CORE:
              bgClass = 'bg-emerald-800/50';
              borderColor = 'border-emerald-500/70';
              content = <Zap size={14} className="text-emerald-400 animate-bounce" />;
              break;
            case TileType.VOID_SHIELD:
              bgClass = 'bg-violet-900/40';
              borderColor = 'border-violet-600/60';
              content = <Shield size={12} className="text-violet-400" />;
              break;
            case TileType.ARTIFACT_NEXUS:
              bgClass = 'bg-purple-900/60';
              borderColor = 'border-purple-500/80';
              content = <Crosshair size={14} className="text-purple-300 animate-spin" />;
              break;
            case TileType.BATTERY:
              bgClass = 'bg-cyan-900/30';
              borderColor = 'border-cyan-600/50';
              content = <Zap size={10} className="text-cyan-400" />;
              break;
            case TileType.EXIT:
              bgClass = exitUnlocked ? 'bg-green-800/50' : 'bg-zinc-900';
              borderColor = exitUnlocked ? 'border-green-600/70' : 'border-zinc-800';
              content = exitUnlocked ? <DoorOpen size={14} className="text-green-400 animate-pulse" /> : <Lock size={12} className="text-zinc-600" />;
              break;
            case TileType.HAZARD:
              bgClass = 'bg-yellow-900/40';
              borderColor = 'border-yellow-700/60';
              content = <AlertTriangle size={10} className="text-yellow-600" />;
              break;
            case TileType.COIN_CACHE:
              bgClass = 'bg-amber-900/50';
              borderColor = 'border-amber-600/70';
              content = <span className="text-sm font-black text-amber-400">$</span>;
              break;
            default:
              break;
          }
        }

        return (
          <div 
            key={tile.id} 
            className={`relative flex items-center justify-center border transition-all duration-200 ${bgClass} ${borderColor}`}
            style={{
              minHeight: '100%',
              minWidth: '100%'
            }}
          >
            {content}
          </div>
        );
      })}
    </div>
  );
};

export default GameGrid;

