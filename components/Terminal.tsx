
import React, { useEffect, useState } from 'react';
import { SignalFragment } from '../types';
import { X } from 'lucide-react';

interface TerminalProps {
  fragment: SignalFragment | null;
  onClose: () => void;
}

const Terminal: React.FC<TerminalProps> = ({ fragment, onClose }) => {
  const [displayedText, setDisplayedText] = useState('');
  const [progress, setProgress] = useState(0);
  
  useEffect(() => {
    if (!fragment) return;
    let i = 0;
    setDisplayedText('');
    setProgress(0);
    const text = fragment.text;
    
    const interval = window.setInterval(() => {
      setDisplayedText(text.substring(0, i + 1));
      setProgress(Math.round(((i + 1) / text.length) * 100));
      i++;
      if (i === text.length) window.clearInterval(interval);
    }, 50);

    return () => window.clearInterval(interval);
  }, [fragment]);

  if (!fragment) return null;

  return (
    <div className="w-full max-w-xs bg-zinc-950 border border-cyan-500 rounded-lg shadow-2xl">
      <div className="bg-cyan-500/10 p-3 flex justify-between items-center border-b border-cyan-500/30">
        <div className="flex items-center gap-2 text-cyan-500">
          <span className="text-[8px] font-bold tracking-widest uppercase">SIGNAL DECODED {progress}%</span>
        </div>
        <button onClick={onClose} className="text-cyan-500/60 hover:text-cyan-400 transition-colors">
          <X size={16} />
        </button>
      </div>

      <div className="p-4 space-y-3">
        <div className="flex gap-2">
          <span className="text-cyan-600 font-bold text-sm">&gt;&gt;</span>
          <p className="text-xs text-cyan-400 font-mono tracking-tight leading-relaxed">
            {displayedText}
          </p>
        </div>
        
        <div className="flex justify-between items-center text-[7px] text-cyan-600/60 uppercase tracking-widest">
          <span>ID_{fragment.id}</span>
          <span>SYNCED</span>
        </div>
      </div>
      
      <div className="w-full h-1 bg-zinc-900">
        <div className="h-full bg-cyan-500 transition-all duration-500" style={{ width: `${progress}%` }}></div>
      </div>
    </div>
  );
};

export default Terminal;

