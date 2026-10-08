import React, { useState } from 'react';
import { ChessPowerId } from '../types/game';
import { CHESS_POWERS } from '../game/PlayerController';

interface TouchActionButtonsProps {
  onPunch: () => void;
  onExecutePower: () => void;
  onToggleVehicle: () => void;
  onJump: () => void;
  onToggleSprint: (sprinting: boolean) => void;
  onHonkHorn: () => void;
  isInVehicle: boolean;
  selectedPower: ChessPowerId;
  powerCooldown: number;
}

export const TouchActionButtons: React.FC<TouchActionButtonsProps> = ({
  onPunch,
  onExecutePower,
  onToggleVehicle,
  onJump,
  onToggleSprint,
  onHonkHorn,
  isInVehicle,
  selectedPower,
  powerCooldown,
}) => {
  const [isSprinting, setIsSprinting] = useState(false);
  const power = CHESS_POWERS[selectedPower];

  const handleSprintClick = () => {
    const nextState = !isSprinting;
    setIsSprinting(nextState);
    onToggleSprint(nextState);
  };

  return (
    <div className="flex flex-col items-end gap-3 select-none touch-none pointer-events-auto">
      {/* Top row secondary action buttons */}
      <div className="flex items-center gap-2.5">
        {/* Car Enter/Exit Hijack Button */}
        <button
          onClick={onToggleVehicle}
          className="w-13 h-13 rounded-full bg-black/75 hover:bg-black/90 active:scale-95 border-2 border-cyan-400/80 shadow-xl flex flex-col items-center justify-center cursor-pointer transition-transform"
          title={isInVehicle ? 'Exit Vehicle' : 'Enter / Hijack Car'}
        >
          <span className="text-xl leading-none">{isInVehicle ? '🚪' : '🚗'}</span>
          <span className="text-[8px] font-black text-cyan-400 uppercase tracking-tighter mt-0.5">
            {isInVehicle ? 'EXIT' : 'DRIVE'}
          </span>
        </button>

        {/* Jump / Handbrake Drift Button */}
        <button
          onClick={onJump}
          className="w-13 h-13 rounded-full bg-black/75 hover:bg-black/90 active:scale-95 border-2 border-emerald-400/80 shadow-xl flex flex-col items-center justify-center cursor-pointer transition-transform"
          title={isInVehicle ? 'Handbrake Drift' : 'Jump'}
        >
          <span className="text-xl leading-none">{isInVehicle ? '🛑' : '⬆️'}</span>
          <span className="text-[8px] font-black text-emerald-400 uppercase tracking-tighter mt-0.5">
            {isInVehicle ? 'DRIFT' : 'JUMP'}
          </span>
        </button>

        {/* Sprint / Turbo Toggle Button */}
        <button
          onClick={handleSprintClick}
          className={`w-13 h-13 rounded-full border-2 shadow-xl flex flex-col items-center justify-center cursor-pointer transition-all ${
            isSprinting
              ? 'bg-amber-500 text-black border-white shadow-[0_0_15px_rgba(245,158,11,0.8)] scale-105'
              : 'bg-black/75 hover:bg-black/90 text-white border-amber-400/80'
          }`}
          title="Toggle Sprint"
        >
          <span className="text-xl leading-none">⚡</span>
          <span className={`text-[8px] font-black uppercase tracking-tighter mt-0.5 ${isSprinting ? 'text-black' : 'text-amber-400'}`}>
            RUN
          </span>
        </button>

        {/* In-Vehicle Horn Button */}
        {isInVehicle && (
          <button
            onClick={onHonkHorn}
            className="w-13 h-13 rounded-full bg-black/75 hover:bg-black/90 active:scale-95 border-2 border-yellow-400/80 shadow-xl flex flex-col items-center justify-center cursor-pointer transition-transform"
            title="Honk Horn"
          >
            <span className="text-xl leading-none">📢</span>
            <span className="text-[8px] font-black text-yellow-400 uppercase tracking-tighter mt-0.5">
              HORN
            </span>
          </button>
        )}
      </div>

      {/* Main Primary Action Buttons: PUNCH & CHESS POWER */}
      <div className="flex items-center gap-3">
        {/* Chess Power Button */}
        <button
          disabled={powerCooldown > 0}
          onClick={onExecutePower}
          className={`relative w-15 h-15 rounded-full border-2 shadow-2xl flex flex-col items-center justify-center cursor-pointer transition-all ${
            powerCooldown > 0
              ? 'bg-neutral-900/80 border-slate-600 opacity-60 cursor-not-allowed'
              : 'bg-black/80 hover:bg-black active:scale-90 border-purple-400/90 shadow-[0_0_15px_rgba(168,85,247,0.5)]'
          }`}
          title={power.name}
        >
          <span className="text-2xl leading-none">{power.icon}</span>
          <span className="text-[9px] font-black text-purple-300 uppercase tracking-tighter mt-0.5">
            {powerCooldown > 0 ? `${powerCooldown.toFixed(1)}s` : 'SKILL'}
          </span>
          {powerCooldown > 0 && (
            <div
              className="absolute inset-0 rounded-full bg-black/60 flex items-center justify-center text-xs font-mono font-bold text-white"
            >
              {Math.ceil(powerCooldown)}s
            </div>
          )}
        </button>

        {/* --- MAIN PUNCH BUTTON (👊) --- */}
        <button
          onClick={onPunch}
          className="group relative w-20 h-20 rounded-full bg-gradient-to-tr from-amber-600 via-orange-500 to-yellow-400 hover:from-amber-500 hover:to-yellow-300 active:scale-90 border-3 border-white shadow-[0_0_25px_rgba(245,158,11,0.7)] flex flex-col items-center justify-center cursor-pointer transition-all duration-75"
          title="Punch Attack [L-Click / Q]"
        >
          {/* Fist Icon */}
          <span className="text-3xl leading-none transform group-active:scale-125 transition-transform">
            👊
          </span>
          <span className="text-[10px] font-black text-black uppercase tracking-wider drop-shadow-sm mt-0.5 font-sans">
            PUNCH
          </span>

          {/* Glowing pulse ring */}
          <div className="absolute inset-0 rounded-full border-2 border-yellow-300 animate-ping opacity-25 pointer-events-none" />
        </button>
      </div>
    </div>
  );
};
