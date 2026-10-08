import React, { useEffect, useRef, useState } from 'react';
import { PlayerStats, ChessPowerId, RadioStation } from '../types/game';
import { CHESS_POWERS } from '../game/PlayerController';
import { soundFX } from '../audio/SoundFx';
import { ActiveMissionState } from '../game/MissionSystem';
import { ActiveVehicle } from '../game/VehicleController';
import { VirtualJoystick } from './VirtualJoystick';
import { TouchActionButtons } from './TouchActionButtons';
import { PWAInstallButton } from './PWAInstallButton';

export const RADIO_STATIONS: RadioStation[] = [
  { id: 'off', name: 'Radio Off', genre: 'Muted', frequency: '--', trackName: 'Engine Sounds', artist: 'Los Caissas', bpm: 0 },
  { id: 'westcoast', name: 'West Coast Pawn FM', genre: 'G-Funk / Hip-Hop', frequency: '92.3 FM', trackName: 'Gin & Juice Gambit', artist: 'Snoop Pawn', bpm: 95 },
  { id: 'classical', name: 'Classical Gambit', genre: 'Baroque / Harpsichord', frequency: '98.7 FM', trackName: 'Nocturne in E4 Minor', artist: 'Frederic Caissa', bpm: 85 },
  { id: 'techno', name: 'Deep Blue Techno', genre: 'Dark Acid / Club', frequency: '104.5 FM', trackName: 'Kasparov Overdrive', artist: 'Stockfish 16', bpm: 132 },
  { id: 'lofi', name: 'Radio Los Caissas', genre: 'Lofi Boom-Bap', frequency: '108.0 FM', trackName: 'Coffee & Checkmates', artist: 'Downtown Pawn', bpm: 82 },
];

export const triggerHaptic = (pattern: number | number[] = 25) => {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate(pattern);
    } catch {
      // ignore
    }
  }
};

interface GTAHUDProps {
  stats: PlayerStats;
  selectedPower: ChessPowerId;
  cooldowns: Record<ChessPowerId, number>;
  activeMission: ActiveMissionState | null;
  activeVehicle: ActiveVehicle | null;
  currentDistrict: string;
  playerPos: { x: number; z: number };
  playerYaw: number;
  policePositions: { x: number; z: number }[];
  isCheckmated: boolean;
  missionPassedReward: { cash: number; elo: number; title: string } | null;
  onSelectPower: (id: ChessPowerId) => void;
  onStartMission: (id: string) => void;
  onStartTaxi: () => void;
  onPromote: (piece: 'knight' | 'bishop' | 'rook' | 'queen') => void;
  onApplyCheat: (code: string) => void;
  onSummonVehicle: (model: string) => void;
  onClearHeat: () => void;
  onJoystickMove: (vector: { x: number; y: number }) => void;
  onPunch: () => void;
  onExecutePower: () => void;
  onToggleVehicle: () => void;
  onJump: () => void;
  onToggleSprint: (sprinting: boolean) => void;
  onHonkHorn: () => void;
  invertAnalog: boolean;
  onToggleInvertAnalog: () => void;
}

export const GTAHUD: React.FC<GTAHUDProps> = ({
  stats,
  selectedPower,
  cooldowns,
  activeMission,
  activeVehicle,
  currentDistrict,
  playerPos,
  playerYaw,
  policePositions,
  isCheckmated,
  missionPassedReward,
  onSelectPower,
  onStartMission,
  onStartTaxi,
  onPromote,
  onApplyCheat,
  onSummonVehicle,
  onClearHeat,
  onJoystickMove,
  onPunch,
  onExecutePower,
  onToggleVehicle,
  onJump,
  onToggleSprint,
  onHonkHorn,
  invertAnalog,
  onToggleInvertAnalog,
}) => {
  const radarCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // UI Modals & Settings
  const [showPowerWheel, setShowPowerWheel] = useState(false);
  const [showPhone, setShowPhone] = useState(false);
  const [phoneApp, setPhoneApp] = useState<'home' | 'missions' | 'promotion' | 'garage' | 'cheats'>('home');
  const [radioIndex, setRadioIndex] = useState(1);
  const [showRadioHUD, setShowRadioHUD] = useState(false);
  const [cheatInput, setCheatInput] = useState('');
  const [cheatMessage, setCheatMessage] = useState<string | null>(null);
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [showTouchControls, setShowTouchControls] = useState(true);
  const [isPortrait, setIsPortrait] = useState(false);

  // Detect orientation for mobile tips
  useEffect(() => {
    const checkOrientation = () => {
      setIsPortrait(window.innerHeight > window.innerWidth);
    };
    checkOrientation();
    window.addEventListener('resize', checkOrientation);
    return () => window.removeEventListener('resize', checkOrientation);
  }, []);

  // Key listeners for HUD (TAB for Power Wheel, P for Phone, R for Radio)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Tab') {
        e.preventDefault();
        setShowPowerWheel(prev => !prev);
      } else if (e.code === 'KeyP') {
        setShowPhone(prev => !prev);
        soundFX.playClick();
      } else if (e.code === 'KeyR' && activeVehicle) {
        setRadioIndex(prev => {
          const next = (prev + 1) % RADIO_STATIONS.length;
          soundFX.switchRadioStation(next);
          setShowRadioHUD(true);
          setTimeout(() => setShowRadioHUD(false), 3000);
          return next;
        });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeVehicle]);

  // Render GTA Minimap / Radar Canvas
  useEffect(() => {
    const canvas = radarCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const scale = 0.55;

    ctx.fillStyle = '#09090b';
    ctx.fillRect(0, 0, width, height);

    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(playerYaw);

    const squareSize = 64;
    for (let r = 1; r <= 8; r++) {
      for (let f = 0; f < 8; f++) {
        const sqX = (f - 3.5) * squareSize;
        const sqZ = (r - 4.5) * squareSize;

        const relX = (sqX - playerPos.x) * scale;
        const relZ = (sqZ - playerPos.z) * scale;
        const size = (squareSize - 12) * scale;

        const isDark = (f + r) % 2 === 0;
        ctx.fillStyle = isDark ? '#18181b' : '#27272a';
        ctx.fillRect(relX - size / 2, relZ - size / 2, size, size);

        ctx.strokeStyle = '#3f3f46';
        ctx.lineWidth = 1;
        ctx.strokeRect(relX - size / 2, relZ - size / 2, size, size);
      }
    }

    for (let i = -4; i <= 4; i++) {
      const lineCoord = i * squareSize;
      const relNS = (lineCoord - playerPos.x) * scale;
      const relEW = (lineCoord - playerPos.z) * scale;

      ctx.fillStyle = '#1c1917';
      ctx.fillRect(relNS - 3, -250 * scale, 6, 500 * scale);
      ctx.fillRect(-250 * scale, relEW - 3, 500 * scale, 6);
    }

    if (activeMission && activeMission.mission.targetPos) {
      const mRelX = (activeMission.mission.targetPos.x - playerPos.x) * scale;
      const mRelZ = (activeMission.mission.targetPos.z - playerPos.z) * scale;

      ctx.fillStyle = '#facc15';
      ctx.beginPath();
      ctx.arc(mRelX, mRelZ, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    policePositions.forEach(pol => {
      const pRelX = (pol.x - playerPos.x) * scale;
      const pRelZ = (pol.z - playerPos.z) * scale;
      const isRed = Math.floor(Date.now() / 250) % 2 === 0;

      ctx.fillStyle = isRed ? '#ef4444' : '#3b82f6';
      ctx.beginPath();
      ctx.arc(pRelX, pRelZ, 5, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.restore();

    ctx.fillStyle = activeVehicle ? '#38bdf8' : '#22c55e';
    ctx.beginPath();
    ctx.moveTo(centerX, centerY - 8);
    ctx.lineTo(centerX + 5, centerY + 6);
    ctx.lineTo(centerX, centerY + 3);
    ctx.lineTo(centerX - 5, centerY + 6);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    const northAngle = playerYaw;
    const nx = centerX + Math.sin(northAngle) * (centerX - 12);
    const ny = centerY - Math.cos(northAngle) * (centerY - 12);
    ctx.fillStyle = '#ef4444';
    ctx.font = 'bold 9px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('N', nx, ny);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.lineWidth = 2;
    ctx.strokeRect(2, 2, width - 4, height - 4);
  }, [playerPos, playerYaw, policePositions, activeMission, activeVehicle]);

  const handleApplyCheatCode = (code: string) => {
    soundFX.playClick();
    triggerHaptic(40);
    onApplyCheat(code.toUpperCase());
    setCheatMessage(`CHEAT ACTIVATED: ${code.toUpperCase()}`);
    setCheatInput('');
    setTimeout(() => setCheatMessage(null), 3000);
  };

  const handleToggleSound = () => {
    const muted = soundFX.toggleMute();
    setIsAudioMuted(muted);
  };

  const toggleFullscreen = () => {
    soundFX.playClick();
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  };

  return (
    <div className="absolute inset-0 pointer-events-none select-none overflow-hidden font-sans">
      {/* --- MOBILE PORTRAIT ORIENTATION NOTICE --- */}
      {isPortrait && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-amber-500/95 text-black font-extrabold text-[11px] rounded-full shadow-2xl z-50 pointer-events-auto flex items-center gap-1.5 animate-pulse">
          <span>🔄</span>
          <span>Putar HP ke Landscape untuk kontrol game terbaik!</span>
        </div>
      )}

      {/* --- TOP-RIGHT GTA V HUD: WANTED STARS, CASH, ELO, MOBILE BUTTONS --- */}
      <div className="absolute top-3 right-4 flex flex-col items-end gap-1.5 pointer-events-auto z-30">
        {/* Top Control Bar: Install PWA, Fullscreen, Mute, Phone */}
        <div className="flex items-center gap-1.5 mb-0.5 flex-wrap justify-end">
          <PWAInstallButton />
          <button
            onClick={toggleFullscreen}
            className="px-2 py-1 text-[11px] font-semibold bg-neutral-900/80 hover:bg-neutral-800 border border-white/20 text-slate-200 rounded cursor-pointer backdrop-blur-md transition-colors"
            title="Toggle Fullscreen"
          >
            ⛶ Layar Penuh
          </button>
          <button
            onClick={() => {
              triggerHaptic(25);
              onToggleInvertAnalog();
            }}
            className={`px-2 py-1 text-[11px] font-semibold border rounded cursor-pointer backdrop-blur-md transition-colors ${
              invertAnalog
                ? 'bg-amber-500 text-black border-amber-300 font-bold shadow-md'
                : 'bg-neutral-900/80 text-slate-200 border-white/20 hover:bg-neutral-800'
            }`}
            title="Balik Arah Analog Joystick"
          >
            🔄 Analog: {invertAnalog ? 'Dibalik' : 'Normal'}
          </button>
          <button
            onClick={handleToggleSound}
            className="px-2 py-1 text-[11px] font-semibold bg-black/60 hover:bg-black/90 border border-white/20 text-white rounded cursor-pointer backdrop-blur-md transition-colors"
          >
            {isAudioMuted ? '🔇' : '🔊'}
          </button>
          <button
            onClick={() => {
              triggerHaptic(20);
              setShowPhone(p => !p);
            }}
            className="px-2.5 py-1 text-[11px] font-bold bg-emerald-600/90 hover:bg-emerald-600 text-white rounded cursor-pointer backdrop-blur-md transition-colors shadow-md"
          >
            📱 iPawn
          </button>
        </div>

        {/* Wanted Level 5 Stars */}
        <div className="flex items-center gap-1 px-2.5 py-0.5 bg-black/70 backdrop-blur-md border border-white/10 rounded">
          {[1, 2, 3, 4, 5].map(star => {
            const hasStar = stats.wantedLevel >= star;
            const isFlashing = stats.wantedLevel > 0 && stats.wantedTimer > 0;
            return (
              <span
                key={star}
                className={`text-base transition-transform ${
                  hasStar
                    ? isFlashing
                      ? 'text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.8)] scale-110 animate-pulse'
                      : 'text-yellow-400'
                    : 'text-neutral-700'
                }`}
              >
                ★
              </span>
            );
          })}
        </div>

        {/* Cash Counter */}
        <div className="text-right">
          <div className="text-2xl md:text-3xl font-extrabold tracking-tight text-emerald-400 drop-shadow-[2px_2px_0px_#052e16] font-mono leading-none">
            ${stats.cash.toLocaleString()}
          </div>
          <div className="text-[10px] font-bold text-slate-300 tracking-wider mt-0.5">
            {stats.elo} ELO <span className="text-emerald-400">·</span> {stats.promotion.toUpperCase()}
          </div>
        </div>

        {/* Active Weapon / Ability Pill */}
        <div className="flex items-center gap-2 px-2.5 py-1.5 bg-black/75 backdrop-blur-md border border-white/20 rounded-lg shadow-xl">
          <div className="text-xl">{CHESS_POWERS[selectedPower].icon}</div>
          <div className="text-left">
            <div className="text-[10px] font-bold text-white uppercase tracking-wider">
              {CHESS_POWERS[selectedPower].name}
            </div>
            <div className="text-[9px] text-slate-400">
              {cooldowns[selectedPower] > 0 ? `${cooldowns[selectedPower].toFixed(1)}s` : 'READY [👊/SKILL]'}
            </div>
          </div>
        </div>
      </div>

      {/* --- TOP-CENTER NOTIFICATIONS & CHEAT POPUP --- */}
      {cheatMessage && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 px-5 py-1.5 bg-emerald-500/90 text-black font-extrabold text-xs tracking-widest rounded uppercase shadow-2xl backdrop-blur-md border border-white animate-bounce z-40">
          {cheatMessage}
        </div>
      )}

      {/* --- IN-CAR RADIO STATION HUD BANNER --- */}
      {showRadioHUD && activeVehicle && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 px-5 py-2.5 bg-black/85 backdrop-blur-lg border border-amber-500/50 rounded-xl text-center shadow-2xl animate-fade-in pointer-events-auto z-30">
          <div className="text-[10px] text-amber-400 font-mono tracking-widest uppercase">
            📻 {RADIO_STATIONS[radioIndex].frequency} · {RADIO_STATIONS[radioIndex].genre}
          </div>
          <div className="text-base font-black text-white tracking-wide">
            {RADIO_STATIONS[radioIndex].name}
          </div>
          <div className="text-[10px] text-slate-300">
            {RADIO_STATIONS[radioIndex].artist} - "{RADIO_STATIONS[radioIndex].trackName}"
          </div>
        </div>
      )}

      {/* --- SPEEDOMETER (WHEN DRIVING) --- */}
      {activeVehicle && (
        <div className="absolute bottom-28 right-4 flex flex-col items-end pointer-events-auto bg-black/75 backdrop-blur-md p-3 rounded-xl border border-white/10 shadow-2xl z-20">
          <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
            {activeVehicle.data.name}
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-black font-mono text-cyan-400">
              {Math.round(Math.abs(activeVehicle.speed) * 3.6)}
            </span>
            <span className="text-[10px] font-bold text-slate-400">KM/H</span>
          </div>
        </div>
      )}

      {/* --- BOTTOM-LEFT: MINIMAP & VIRTUAL ANALOG JOYSTICK --- */}
      <div className="absolute bottom-4 left-4 flex items-end gap-3 pointer-events-auto z-20">
        {/* Virtual Analog Joystick */}
        {showTouchControls && (
          <div className="flex flex-col items-center gap-1">
            <VirtualJoystick onMove={onJoystickMove} size={118} />
          </div>
        )}

        {/* Compact GTA Radar / Minimap & Status Bars */}
        <div className="flex flex-col gap-0.5">
          <div className="text-[9px] font-black tracking-widest text-slate-200 uppercase bg-black/80 backdrop-blur-md px-2 py-0.5 rounded w-fit border border-white/10 shadow-lg truncate max-w-[160px]">
            📍 {currentDistrict}
          </div>

          <div className="relative w-38 h-32 bg-black border-2 border-white/30 rounded-lg overflow-hidden shadow-2xl">
            <canvas
              ref={radarCanvasRef}
              width={152}
              height={128}
              className="w-full h-full block"
            />
          </div>

          <div className="w-38 flex flex-col gap-0.5 bg-black/90 p-1 rounded-b-lg border-x-2 border-b-2 border-white/20">
            {/* Health Bar */}
            <div className="flex items-center gap-1">
              <span className="text-[8px] font-bold text-slate-300 w-4">HP</span>
              <div className="flex-1 h-1.5 bg-neutral-800 rounded-sm overflow-hidden">
                <div
                  className="h-full bg-emerald-500 transition-all duration-150"
                  style={{ width: `${(stats.health / stats.maxHealth) * 100}%` }}
                />
              </div>
              <span className="text-[8px] font-mono text-emerald-400">{Math.ceil(stats.health)}</span>
            </div>

            {/* Armor Bar */}
            <div className="flex items-center gap-1">
              <span className="text-[8px] font-bold text-slate-300 w-4">AR</span>
              <div className="flex-1 h-1.5 bg-neutral-800 rounded-sm overflow-hidden">
                <div
                  className="h-full bg-sky-500 transition-all duration-150"
                  style={{ width: `${(stats.armor / stats.maxArmor) * 100}%` }}
                />
              </div>
              <span className="text-[8px] font-mono text-sky-400">{Math.ceil(stats.armor)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* --- BOTTOM-RIGHT: TOUCH ACTION BUTTONS (PUNCH, SKILL, DRIVE, JUMP, SPRINT) --- */}
      {showTouchControls && (
        <div className="absolute bottom-4 right-4 z-20">
          <TouchActionButtons
            onPunch={() => {
              triggerHaptic(30);
              onPunch();
            }}
            onExecutePower={() => {
              triggerHaptic(40);
              onExecutePower();
            }}
            onToggleVehicle={() => {
              triggerHaptic(25);
              onToggleVehicle();
            }}
            onJump={() => {
              triggerHaptic(20);
              onJump();
            }}
            onToggleSprint={s => {
              triggerHaptic(20);
              onToggleSprint(s);
            }}
            onHonkHorn={() => {
              triggerHaptic([30, 20, 30]);
              onHonkHorn();
            }}
            isInVehicle={!!activeVehicle}
            selectedPower={selectedPower}
            powerCooldown={cooldowns[selectedPower]}
          />
        </div>
      )}

      {/* Camera Look Hint for Mobile Users */}
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[9px] text-white/40 pointer-events-none font-mono">
        Swipe kanan untuk putar kamera · Analog kiri untuk jalan
      </div>

      {/* --- BOTTOM-CENTER MISSION BRIEFING / SUBTITLES --- */}
      {activeMission && (
        <div className="absolute bottom-7 left-1/2 -translate-x-1/2 max-w-sm w-full px-3.5 py-2 bg-black/85 backdrop-blur-md border border-amber-500/40 rounded-xl text-center shadow-2xl z-10 pointer-events-auto">
          <div className="text-[9px] font-bold tracking-widest text-amber-400 uppercase">
            MISI: {activeMission.mission.title}
          </div>
          <div className="text-[11px] font-semibold text-white mt-0.5">
            {activeMission.progressText}
          </div>
          {activeMission.timeRemaining !== undefined && (
            <div className="text-[9px] font-mono font-bold text-red-400 mt-0.5">
              SISA WAKTU: {Math.ceil(activeMission.timeRemaining)}s
            </div>
          )}
        </div>
      )}

      {/* --- GTA V WEAPON & CHESS POWER SELECTOR WHEEL (PRESS TAB) --- */}
      {showPowerWheel && (
        <div className="absolute inset-0 bg-black/75 backdrop-blur-md flex items-center justify-center pointer-events-auto z-40 p-4">
          <div className="relative w-80 h-80 rounded-full border-2 border-white/20 bg-neutral-900/90 shadow-2xl flex items-center justify-center">
            <div className="text-center z-10 p-3">
              <div className="text-2xl mb-0.5">{CHESS_POWERS[selectedPower].icon}</div>
              <div className="text-xs font-black text-white uppercase">{CHESS_POWERS[selectedPower].name}</div>
              <div className="text-[10px] text-slate-400 max-w-[180px] mt-0.5">{CHESS_POWERS[selectedPower].description}</div>
              <button
                onClick={() => setShowPowerWheel(false)}
                className="mt-2.5 px-3 py-1 bg-white/10 hover:bg-white/20 text-[10px] font-bold text-white rounded cursor-pointer"
              >
                Tutup Wheel
              </button>
            </div>

            {(Object.keys(CHESS_POWERS) as ChessPowerId[]).map((powerKey, idx) => {
              const count = 6;
              const angle = (idx / count) * Math.PI * 2 - Math.PI / 2;
              const radius = 115;
              const x = Math.cos(angle) * radius;
              const y = Math.sin(angle) * radius;
              const isSelected = selectedPower === powerKey;
              const power = CHESS_POWERS[powerKey];

              return (
                <button
                  key={powerKey}
                  onClick={() => {
                    onSelectPower(powerKey);
                    soundFX.playClick();
                    triggerHaptic(20);
                    setShowPowerWheel(false);
                  }}
                  className={`absolute -translate-x-1/2 -translate-y-1/2 w-14 h-14 rounded-2xl flex flex-col items-center justify-center border-2 transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-amber-500 text-black border-white scale-110 shadow-lg'
                      : 'bg-black/80 text-white border-white/20 hover:border-amber-400'
                  }`}
                  style={{ left: `calc(50% + ${x}px)`, top: `calc(50% + ${y}px)` }}
                >
                  <span className="text-lg leading-none">{power.icon}</span>
                  <span className="text-[8px] font-bold uppercase truncate max-w-[44px]">{power.name.split(' ')[0]}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* --- GTA V iPAWN SMARTPHONE (MOBILE POPUP) --- */}
      {showPhone && (
        <div className="absolute inset-y-4 right-4 max-w-sm w-full bg-slate-950 border-4 border-slate-700 rounded-[32px] shadow-2xl p-3.5 flex flex-col pointer-events-auto z-40 backdrop-blur-xl">
          <div className="w-20 h-3.5 bg-slate-800 rounded-full mx-auto mb-1.5 flex items-center justify-center">
            <div className="w-2 h-2 rounded-full bg-slate-900 mr-2" />
            <div className="w-6 h-1 rounded-full bg-slate-900" />
          </div>

          <div className="flex justify-between items-center text-[10px] font-semibold text-slate-400 px-2 mb-2">
            <span>9:41 AM</span>
            <span>Los Caissas 5G · 100%</span>
          </div>

          <div className="flex-1 bg-slate-900/90 rounded-2xl p-3 overflow-y-auto border border-white/10 flex flex-col">
            {phoneApp === 'home' && (
              <div className="flex-1 flex flex-col justify-between">
                <div className="text-center my-2">
                  <div className="text-lg font-black text-white tracking-wider">iPawn Mobile</div>
                  <div className="text-xs text-emerald-400 font-mono">${stats.cash.toLocaleString()}</div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => {
                      setPhoneApp('missions');
                      soundFX.playClick();
                      triggerHaptic(20);
                    }}
                    className="p-2.5 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 rounded-xl text-left cursor-pointer transition-colors"
                  >
                    <div className="text-xl mb-0.5">🎯</div>
                    <div className="text-xs font-bold text-white">Heists & Misi</div>
                    <div className="text-[9px] text-slate-400">Kontrak cerita</div>
                  </button>

                  <button
                    onClick={() => {
                      triggerHaptic(25);
                      onStartTaxi();
                      setShowPhone(false);
                    }}
                    className="p-2.5 bg-yellow-500/20 hover:bg-yellow-500/30 border border-yellow-500/40 rounded-xl text-left cursor-pointer transition-colors"
                  >
                    <div className="text-xl mb-0.5">🚕</div>
                    <div className="text-xs font-bold text-white">Pawn Taxi</div>
                    <div className="text-[9px] text-slate-400">Cari uang</div>
                  </button>

                  <button
                    onClick={() => {
                      setPhoneApp('promotion');
                      soundFX.playClick();
                      triggerHaptic(20);
                    }}
                    className="p-2.5 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/40 rounded-xl text-left cursor-pointer transition-colors"
                  >
                    <div className="text-xl mb-0.5">👑</div>
                    <div className="text-xs font-bold text-white">Promosi Bidak</div>
                    <div className="text-[9px] text-slate-400">Upgrade karakter</div>
                  </button>

                  <button
                    onClick={() => {
                      setPhoneApp('garage');
                      soundFX.playClick();
                      triggerHaptic(20);
                    }}
                    className="p-2.5 bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 rounded-xl text-left cursor-pointer transition-colors"
                  >
                    <div className="text-xl mb-0.5">🏎️</div>
                    <div className="text-xs font-bold text-white">Garasi Valet</div>
                    <div className="text-[9px] text-slate-400">Panggil mobil</div>
                  </button>

                  <button
                    onClick={() => {
                      setPhoneApp('cheats');
                      soundFX.playClick();
                      triggerHaptic(20);
                    }}
                    className="col-span-2 p-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 rounded-xl text-center cursor-pointer transition-colors"
                  >
                    <span className="text-xs font-bold text-red-400">⚡ Cheat Console</span>
                  </button>
                </div>

                <div className="mt-2 text-[9px] text-center text-slate-500">
                  iPawn OS v5.0 · Los Caissas
                </div>
              </div>
            )}

            {phoneApp === 'missions' && (
              <div className="flex-1 flex flex-col gap-2">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-bold text-white uppercase">Story Missions</span>
                  <button onClick={() => setPhoneApp('home')} className="text-[11px] text-amber-400 font-semibold cursor-pointer">Kembali</button>
                </div>

                <div className="flex flex-col gap-2 flex-1 overflow-y-auto">
                  {[
                    { id: 'mis_sicilian', title: 'The Sicilian Hijack', client: 'Big Smoke Pawn', reward: '$8,000' },
                    { id: 'mis_castling', title: 'Castling the Vault', client: 'Lester Bishop', reward: '$18,000' },
                    { id: 'mis_velocity', title: 'En Passant Velocity', client: 'Franklin Knight', reward: '$14,000' },
                    { id: 'mis_checkmate', title: 'Grandmaster Checkmate', client: 'The White Queen', reward: '$50,000' },
                  ].map(m => (
                    <div key={m.id} className="p-2.5 bg-slate-800/80 rounded-lg border border-white/10 flex justify-between items-center">
                      <div>
                        <div className="text-xs font-bold text-white">{m.title}</div>
                        <div className="text-[9px] text-slate-400">{m.client} · {m.reward}</div>
                      </div>
                      <button
                        onClick={() => {
                          triggerHaptic(30);
                          onStartMission(m.id);
                          setShowPhone(false);
                        }}
                        className="px-2.5 py-1 text-[10px] font-bold bg-amber-500 hover:bg-amber-400 text-black rounded cursor-pointer"
                      >
                        Mulai
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {phoneApp === 'promotion' && (
              <div className="flex-1 flex flex-col gap-2">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-bold text-white uppercase">Promosi Bidak</span>
                  <button onClick={() => setPhoneApp('home')} className="text-[11px] text-amber-400 font-semibold cursor-pointer">Kembali</button>
                </div>

                {[
                  { piece: 'knight' as const, name: 'Knight Cavalier', cost: 10000, icon: '🐴', desc: 'Lompatan tinggi & lincah' },
                  { piece: 'bishop' as const, name: 'Bishop Preacher', cost: 15000, icon: '✨', desc: 'Bonus damage diagonal beam' },
                  { piece: 'rook' as const, name: 'Rook Enforcer', cost: 25000, icon: '🏰', desc: '+100 max armor besi' },
                  { piece: 'queen' as const, name: 'The Queen Monarch', cost: 60000, icon: '👑', desc: 'Kekuatan skakmat tertinggi' },
                ].map(p => (
                  <div key={p.piece} className="p-2 bg-slate-800/80 rounded-lg border border-white/10 flex justify-between items-center">
                    <div>
                      <div className="text-xs font-bold text-white">{p.icon} {p.name}</div>
                      <div className="text-[9px] text-slate-400">${p.cost.toLocaleString()} · {p.desc}</div>
                    </div>
                    <button
                      disabled={stats.cash < p.cost || stats.promotion === p.piece}
                      onClick={() => {
                        triggerHaptic(40);
                        onPromote(p.piece);
                        soundFX.playCashSound();
                        setShowPhone(false);
                      }}
                      className={`px-2 py-1 text-[9px] font-bold rounded cursor-pointer ${
                        stats.promotion === p.piece
                          ? 'bg-emerald-600 text-white'
                          : stats.cash >= p.cost
                          ? 'bg-amber-500 hover:bg-amber-400 text-black'
                          : 'bg-slate-700 text-slate-500 cursor-not-allowed'
                      }`}
                    >
                      {stats.promotion === p.piece ? 'Aktif' : 'Beli'}
                    </button>
                  </div>
                ))}
              </div>
            )}

            {phoneApp === 'garage' && (
              <div className="flex-1 flex flex-col gap-2">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-bold text-white uppercase">Valet Kendaraan</span>
                  <button onClick={() => setPhoneApp('home')} className="text-[11px] text-amber-400 font-semibold cursor-pointer">Kembali</button>
                </div>

                {[
                  { model: 'queen_hypercar', name: 'Queen Regal V12', icon: '🏎️', speed: '240 MPH' },
                  { model: 'knight_chopper', name: 'Knight Chopper Bike', icon: '🏍️', speed: '180 MPH' },
                  { model: 'bishop_gt', name: 'Bishop GT Muscle', icon: '🚗', speed: '200 MPH' },
                  { model: 'rook_apc', name: 'Rook Armored APC', icon: '🚙', speed: '140 MPH' },
                ].map(v => (
                  <div key={v.model} className="p-2 bg-slate-800/80 rounded-lg border border-white/10 flex justify-between items-center">
                    <div>
                      <div className="text-xs font-bold text-white">{v.icon} {v.name}</div>
                      <div className="text-[9px] text-cyan-400">{v.speed}</div>
                    </div>
                    <button
                      onClick={() => {
                        triggerHaptic(30);
                        onSummonVehicle(v.model);
                        soundFX.playClick();
                        setShowPhone(false);
                      }}
                      className="px-2 py-1 text-[10px] font-bold bg-cyan-500 hover:bg-cyan-400 text-black rounded cursor-pointer"
                    >
                      Panggil
                    </button>
                  </div>
                ))}
              </div>
            )}

            {phoneApp === 'cheats' && (
              <div className="flex-1 flex flex-col gap-1.5">
                <div className="flex justify-between items-center mb-0.5">
                  <span className="text-xs font-bold text-red-400 uppercase">Cheat Codes</span>
                  <button onClick={() => setPhoneApp('home')} className="text-[11px] text-amber-400 font-semibold cursor-pointer">Kembali</button>
                </div>

                <div className="flex gap-1.5 mb-1">
                  <input
                    type="text"
                    placeholder="Ketik cheat (HESOYAM)..."
                    value={cheatInput}
                    onChange={e => setCheatInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') handleApplyCheatCode(cheatInput);
                    }}
                    className="flex-1 px-2 py-1 text-xs bg-slate-800 text-white rounded border border-white/20 uppercase font-mono"
                  />
                  <button
                    onClick={() => handleApplyCheatCode(cheatInput)}
                    className="px-2.5 py-1 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded cursor-pointer"
                  >
                    Kirim
                  </button>
                </div>

                <div className="flex flex-col gap-1 overflow-y-auto">
                  {[
                    { code: 'HESOYAM', desc: 'Darah Penuh, Armor Penuh, +$250.000' },
                    { code: 'LAWYERUP', desc: 'Hilangkan semua bintang buronan polisi' },
                    { code: 'FUGITIVE', desc: 'Langsung 5 Bintang Buronan' },
                    { code: 'TURBO', desc: 'Spawn Hypercar Queen tercepat' },
                    { code: 'CHECKMATE', desc: 'Maksimumkan ELO Catur ke 3000' },
                  ].map(c => (
                    <button
                      key={c.code}
                      onClick={() => handleApplyCheatCode(c.code)}
                      className="p-1.5 bg-slate-800/80 hover:bg-slate-700/80 rounded border border-white/10 text-left cursor-pointer"
                    >
                      <div className="text-[11px] font-bold text-yellow-400 font-mono">{c.code}</div>
                      <div className="text-[9px] text-slate-300">{c.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <button
            onClick={() => {
              if (phoneApp !== 'home') setPhoneApp('home');
              else setShowPhone(false);
              soundFX.playClick();
              triggerHaptic(20);
            }}
            className="w-24 h-1.5 bg-slate-400 hover:bg-white rounded-full mx-auto mt-2 cursor-pointer transition-colors"
          />
        </div>
      )}

      {/* --- GTA V "MISSION PASSED" SPLASH BANNER --- */}
      {missionPassedReward && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center pointer-events-auto z-50 animate-fade-in p-4">
          <div className="text-4xl md:text-7xl font-black text-amber-400 tracking-widest drop-shadow-[0_4px_12px_rgba(245,158,11,0.8)] uppercase mb-2 text-center">
            MISI BERHASIL
          </div>
          <div className="text-lg md:text-2xl font-bold text-white tracking-wide uppercase mb-5 text-center">
            {missionPassedReward.title}
          </div>

          <div className="flex gap-6 bg-black/80 px-6 py-3.5 rounded-2xl border border-white/20 shadow-2xl">
            <div className="text-center">
              <div className="text-[10px] text-slate-400 uppercase font-bold">Hadiah Uang</div>
              <div className="text-2xl md:text-3xl font-black text-emerald-400 font-mono">
                +${missionPassedReward.cash.toLocaleString()}
              </div>
            </div>
            <div className="w-[1px] bg-white/20" />
            <div className="text-center">
              <div className="text-[10px] text-slate-400 uppercase font-bold">Respek / Elo</div>
              <div className="text-2xl md:text-3xl font-black text-amber-400 font-mono">
                +{missionPassedReward.elo} ELO
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- GTA V "CHECKMATED / WASTED" OVERLAY --- */}
      {isCheckmated && (
        <div className="absolute inset-0 bg-red-950/80 backdrop-grayscale flex flex-col items-center justify-center z-50 animate-pulse p-4">
          <div className="text-6xl md:text-9xl font-black text-red-600 tracking-widest drop-shadow-[0_0_24px_rgba(239,68,68,0.9)] uppercase text-center">
            CHECKMATED
          </div>
          <div className="text-sm md:text-lg font-bold text-slate-200 mt-3 tracking-widest uppercase text-center">
            Respawn kembali di Central Plaza...
          </div>
        </div>
      )}
    </div>
  );
};
