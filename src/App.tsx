/**
 * Grand Theft Pawn: Los Caissas
 * 3D Open World Action Mobile Game (GTA V x Chess)
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { ChessCityBuilder } from './game/ChessCityBuilder';
import { VehicleSystem, ActiveVehicle } from './game/VehicleController';
import { PlayerController } from './game/PlayerController';
import { AIPoliceAndCivilianSystem } from './game/AIPoliceAndCivilians';
import { MissionManager, ActiveMissionState } from './game/MissionSystem';
import { GTAHUD, triggerHaptic } from './components/GTAHUD';
import { PWAInstallButton } from './components/PWAInstallButton';
import { ChessPowerId, PlayerStats } from './types/game';
import { soundFX } from './audio/SoundFx';

export default function App() {
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Analog Joystick & Mobile Touch Controls State
  const joystickRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const forceSprintRef = useRef<boolean>(false);
  const forceHandbrakeRef = useRef<boolean>(false);
  const [invertAnalog, setInvertAnalog] = useState<boolean>(true);

  // Game Engine State
  const [stats, setStats] = useState<PlayerStats>({
    health: 100,
    maxHealth: 100,
    armor: 100,
    maxArmor: 100,
    stamina: 100,
    maxStamina: 100,
    specialAbility: 100,
    maxSpecial: 100,
    cash: 8500,
    elo: 1400,
    wantedLevel: 0,
    wantedTimer: 0,
    isPursued: false,
    promotion: 'pawn',
    kills: 0,
    stuntsCompleted: 0,
  });

  const [selectedPower, setSelectedPower] = useState<ChessPowerId>('fist');
  const [cooldowns, setCooldowns] = useState<Record<ChessPowerId, number>>({
    fist: 0,
    en_passant: 0,
    bishop_ray: 0,
    knight_leap: 0,
    rook_ram: 0,
    queen_gambit: 0,
  });

  const [activeMission, setActiveMission] = useState<ActiveMissionState | null>(null);
  const [activeVehicle, setActiveVehicle] = useState<ActiveVehicle | null>(null);
  const [currentDistrict, setCurrentDistrict] = useState<string>('Grand Caissa Plaza (Square E4)');
  const [playerPos, setPlayerPos] = useState<{ x: number; z: number }>({ x: 0, z: 32 });
  const [playerYaw, setPlayerYaw] = useState<number>(0);
  const [policePositions, setPolicePositions] = useState<{ x: number; z: number }[]>([]);
  const [isCheckmated, setIsCheckmated] = useState<boolean>(false);
  const [missionReward, setMissionReward] = useState<{ cash: number; elo: number; title: string } | null>(null);
  const [isGameStarted, setIsGameStarted] = useState<boolean>(false);

  // References to engine instances
  const engineRef = useRef<{
    renderer: THREE.WebGLRenderer;
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    cityBuilder: ChessCityBuilder;
    vehicleSystem: VehicleSystem;
    playerController: PlayerController;
    aiSystem: AIPoliceAndCivilianSystem;
    missionManager: MissionManager;
    keys: Record<string, boolean>;
    mouseDelta: { x: number; y: number };
    isMouseDown: boolean;
    isRightMouseDown: boolean;
    recentKeys: string[];
  } | null>(null);

  // Initialize Three.js Game World
  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;

    // 1. Scene, Camera, Renderer
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.2, 1000);
    camera.position.set(0, 4, 38);

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    // 2. Build 3D Chess Metropolis (Los Caissas)
    const cityBuilder = new ChessCityBuilder(scene);
    cityBuilder.buildCity();

    // 3. Vehicle System
    const vehicleSystem = new VehicleSystem(scene, cityBuilder.colliders);

    cityBuilder.vehicleSpawns.forEach(sp => {
      vehicleSystem.spawnVehicle(sp.type as any, sp.position, sp.rotationY);
    });

    vehicleSystem.spawnVehicle('queen_hypercar', new THREE.Vector3(12, 0.8, 30), Math.PI / 2);
    vehicleSystem.spawnVehicle('knight_chopper', new THREE.Vector3(-12, 0.8, 30), -Math.PI / 2);

    // 4. Player Character Controller
    const playerController = new PlayerController(camera, cityBuilder.colliders);
    playerController.mesh.position.set(0, 0, 32);
    scene.add(playerController.mesh);

    // 5. AI Police and Civilians System
    const aiSystem = new AIPoliceAndCivilianSystem(scene, vehicleSystem, cityBuilder.roadNodes);
    aiSystem.initCrowd(22);

    // 6. Mission Manager
    const missionManager = new MissionManager();

    // Input state
    const keys: Record<string, boolean> = {};
    const mouseDelta = { x: 0, y: 0 };
    let isMouseDown = false;
    let isRightMouseDown = false;
    const recentKeys: string[] = [];

    // Mobile touch camera rotation variables
    let touchLookId: number | null = null;
    let lastTouchLookPos = { x: 0, y: 0 };
    let initialPinchDist: number | null = null;

    engineRef.current = {
      renderer,
      scene,
      camera,
      cityBuilder,
      vehicleSystem,
      playerController,
      aiSystem,
      missionManager,
      keys,
      mouseDelta,
      isMouseDown,
      isRightMouseDown,
      recentKeys,
    };

    // --- Window Resize ---
    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    // --- Keyboard Event Listeners ---
    const handleKeyDown = (e: KeyboardEvent) => {
      keys[e.code] = true;

      recentKeys.push(e.key.toUpperCase());
      if (recentKeys.length > 12) recentKeys.shift();
      const codeBuffer = recentKeys.join('');

      if (codeBuffer.includes('HESOYAM')) {
        handleApplyCheat('HESOYAM');
        recentKeys.length = 0;
      } else if (codeBuffer.includes('LAWYERUP')) {
        handleApplyCheat('LAWYERUP');
        recentKeys.length = 0;
      }

      if (e.code === 'KeyF' || e.code === 'Enter') {
        if (vehicleSystem.currentVehicle) {
          const exitPos = vehicleSystem.exitVehicle();
          playerController.mesh.position.copy(exitPos);
          setActiveVehicle(null);
        } else {
          const nearest = vehicleSystem.getNearestVehicle(playerController.mesh.position, 6.0);
          if (nearest) {
            vehicleSystem.enterVehicle(nearest);
            setActiveVehicle(nearest);
            soundFX.playClick();
          }
        }
      }

      if (e.code === 'KeyE' && vehicleSystem.currentVehicle) {
        soundFX.playCarHorn();
      }

      const powerKeys: Record<string, ChessPowerId> = {
        Digit1: 'fist',
        Digit2: 'en_passant',
        Digit3: 'bishop_ray',
        Digit4: 'knight_leap',
        Digit5: 'rook_ram',
        Digit6: 'queen_gambit',
      };
      if (powerKeys[e.code]) {
        setSelectedPower(powerKeys[e.code]);
        soundFX.playClick();
      }

      if (e.code === 'KeyQ') {
        executeActivePower();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keys[e.code] = false;
    };

    // --- Mouse Look & Pointer Lock ---
    const handleMouseMove = (e: MouseEvent) => {
      if (document.pointerLockElement === container || isMouseDown) {
        mouseDelta.x += e.movementX;
        mouseDelta.y += e.movementY;
      }
    };

    const handleMouseDown = (e: MouseEvent) => {
      if (e.button === 0) {
        isMouseDown = true;
        const target = e.target as HTMLElement;
        if (target === renderer.domElement) {
          executeActivePower();
        }
      } else if (e.button === 2) {
        isRightMouseDown = true;
        playerController.isAiming = true;
      }
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (e.button === 0) isMouseDown = false;
      if (e.button === 2) {
        isRightMouseDown = false;
        playerController.isAiming = false;
      }
    };

    // --- Mobile Touch Camera Pan & Pinch Zoom (Right thumb controls camera!) ---
    const handleTouchStart = (e: TouchEvent) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        // If touch starts on right 65% of screen and not on action buttons
        if (touch.clientX > window.innerWidth * 0.35 && touchLookId === null) {
          const target = e.target as HTMLElement;
          if (!target.closest('button') && !target.closest('input')) {
            touchLookId = touch.identifier;
            lastTouchLookPos = { x: touch.clientX, y: touch.clientY };
          }
        }
      }

      if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        initialPinchDist = Math.sqrt(dx * dx + dy * dy);
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (touchLookId !== null) {
        for (let i = 0; i < e.changedTouches.length; i++) {
          const touch = e.changedTouches[i];
          if (touch.identifier === touchLookId) {
            const dx = touch.clientX - lastTouchLookPos.x;
            const dy = touch.clientY - lastTouchLookPos.y;
            mouseDelta.x += dx * 1.5;
            mouseDelta.y += dy * 1.5;
            lastTouchLookPos = { x: touch.clientX, y: touch.clientY };
            break;
          }
        }
      }

      if (e.touches.length === 2 && initialPinchDist !== null) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const currentDist = Math.sqrt(dx * dx + dy * dy);
        const zoomDelta = (initialPinchDist - currentDist) * 0.02;
        playerController.camDistance = Math.max(3.0, Math.min(12.0, playerController.camDistance + zoomDelta));
        initialPinchDist = currentDist;
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === touchLookId) {
          touchLookId = null;
          break;
        }
      }
      if (e.touches.length < 2) {
        initialPinchDist = null;
      }
    };

    const handleContextMenu = (e: MouseEvent) => e.preventDefault();

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('touchend', handleTouchEnd, { passive: true });
    window.addEventListener('contextmenu', handleContextMenu);

    // --- Main Game Animation Loop ---
    let animationFrameId: number;
    let lastTime = performance.now();

    const animate = (currentTime: number) => {
      animationFrameId = requestAnimationFrame(animate);

      const delta = Math.min((currentTime - lastTime) / 1000, 0.1);
      lastTime = currentTime;

      const inVehicle = !!vehicleSystem.currentVehicle;
      const vPos = vehicleSystem.currentVehicle?.mesh.position;

      // 1. Update Player
      playerController.update(
        delta,
        keys,
        mouseDelta,
        inVehicle,
        vPos,
        joystickRef.current,
        forceSprintRef.current
      );

      // Reset mouse delta after applying
      mouseDelta.x = 0;
      mouseDelta.y = 0;

      // 2. Update Vehicle System
      vehicleSystem.update(
        delta,
        keys,
        playerController.mesh.position,
        joystickRef.current,
        forceHandbrakeRef.current
      );

      // 3. Update AI Police and Civilians
      const currentPos = inVehicle && vPos ? vPos : playerController.mesh.position;
      aiSystem.update(delta, currentPos, playerController.stats, amount => {
        playerController.takeDamage(amount);
        triggerHaptic(40);
      });

      // 4. Update Mission System
      const missionResult = missionManager.update(delta, { x: currentPos.x, z: currentPos.z });
      if (missionResult.completed && missionResult.reward) {
        playerController.stats.cash += missionResult.reward.cash;
        playerController.stats.elo += missionResult.reward.elo;
        setMissionReward(missionResult.reward);
        triggerHaptic([60, 40, 60]);
        setTimeout(() => setMissionReward(null), 4500);
      }

      // 5. Check Health / Checkmated Death State
      if (playerController.stats.health <= 0 && !isCheckmated) {
        handlePlayerDefeated();
      }

      // 6. Update UI State throttled (every ~6 frames)
      if (Math.random() < 0.2) {
        setStats({ ...playerController.stats });
        setCooldowns({ ...playerController.powerCooldowns });
        setPlayerPos({ x: currentPos.x, z: currentPos.z });
        setPlayerYaw(playerController.camYaw);
        setActiveMission(missionManager.activeMission ? { ...missionManager.activeMission } : null);

        setPolicePositions(aiSystem.policeUnits.map(p => ({ x: p.mesh.position.x, z: p.mesh.position.z })));

        const squareSize = 64;
        const fileIdx = Math.max(0, Math.min(7, Math.floor((currentPos.x + 4 * squareSize) / squareSize)));
        const rankIdx = Math.max(1, Math.min(8, Math.floor((currentPos.z + 4 * squareSize) / squareSize) + 1));
        const letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
        const sq = cityBuilder.squares.find(s => s.file === letters[fileIdx] && s.rank === rankIdx);
        if (sq) {
          setCurrentDistrict(sq.districtName);
        }
      }

      // Render Scene
      renderer.render(scene, camera);
    };

    animationFrameId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('contextmenu', handleContextMenu);
      soundFX.stopAll();
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  // --- Analog Joystick Move Handler (Supports Inverted Controls) ---
  const handleJoystickMove = useCallback((vector: { x: number; y: number }) => {
    if (invertAnalog) {
      joystickRef.current = { x: -vector.x, y: -vector.y };
    } else {
      joystickRef.current = vector;
    }
  }, [invertAnalog]);

  const handleToggleInvertAnalog = useCallback(() => {
    setInvertAnalog(prev => !prev);
    triggerHaptic(30);
  }, []);

  // --- Dedicated Punch Button Action ---
  const handlePunch = useCallback(() => {
    if (!engineRef.current) return;
    const { playerController, aiSystem } = engineRef.current;

    const success = playerController.punch();
    if (success) {
      const hits = aiSystem.checkPlayerAttackOnNPCs(playerController.mesh.position, 4.5, 35);
      if (hits > 0) {
        playerController.triggerCrime(1);
        triggerHaptic(50);
      }
    }
  }, []);

  // --- Attack / Power Action Execution ---
  const executeActivePower = useCallback(() => {
    if (!engineRef.current) return;
    const { playerController, aiSystem } = engineRef.current;

    const success = playerController.executePower(selectedPower);
    if (success) {
      const range = selectedPower === 'en_passant' ? 18 : selectedPower === 'bishop_ray' ? 24 : 4.5;
      const hits = aiSystem.checkPlayerAttackOnNPCs(playerController.mesh.position, range, 50);

      if (hits > 0) {
        playerController.triggerCrime(1);
        triggerHaptic(60);
      }
    }
  }, [selectedPower]);

  // --- Vehicle Enter / Exit Handler ---
  const handleToggleVehicle = useCallback(() => {
    if (!engineRef.current) return;
    const { playerController, vehicleSystem } = engineRef.current;

    if (vehicleSystem.currentVehicle) {
      const exitPos = vehicleSystem.exitVehicle();
      playerController.mesh.position.copy(exitPos);
      setActiveVehicle(null);
    } else {
      const nearest = vehicleSystem.getNearestVehicle(playerController.mesh.position, 6.0);
      if (nearest) {
        vehicleSystem.enterVehicle(nearest);
        setActiveVehicle(nearest);
        soundFX.playClick();
      }
    }
  }, []);

  // --- Jump / Drift Handler ---
  const handleJump = useCallback(() => {
    if (!engineRef.current) return;
    const { playerController, vehicleSystem } = engineRef.current;

    if (vehicleSystem.currentVehicle) {
      forceHandbrakeRef.current = true;
      soundFX.playTireSkid();
      setTimeout(() => {
        forceHandbrakeRef.current = false;
      }, 400);
    } else {
      playerController.jump();
    }
  }, []);

  // --- Touch Sprint Toggle Handler ---
  const handleToggleSprint = useCallback((sprinting: boolean) => {
    forceSprintRef.current = sprinting;
  }, []);

  // --- Car Horn Handler ---
  const handleHonkHorn = useCallback(() => {
    soundFX.playCarHorn();
  }, []);

  // --- Player Death / Checkmated Handler ---
  const handlePlayerDefeated = () => {
    setIsCheckmated(true);
    soundFX.playCheckmatedSound();
    triggerHaptic([100, 50, 100, 50, 150]);

    setTimeout(() => {
      if (!engineRef.current) return;
      const { playerController, vehicleSystem } = engineRef.current;

      if (vehicleSystem.currentVehicle) {
        vehicleSystem.exitVehicle();
        setActiveVehicle(null);
      }

      playerController.mesh.position.set(0, 0.5, 32);
      playerController.stats.health = 100;
      playerController.stats.armor = 50;
      playerController.stats.wantedLevel = 0;
      playerController.stats.wantedTimer = 0;
      playerController.stats.isPursued = false;
      soundFX.setSirenState(false);

      setIsCheckmated(false);
    }, 3200);
  };

  // --- Cheat Code Execution ---
  const handleApplyCheat = (code: string) => {
    if (!engineRef.current) return;
    const { playerController, vehicleSystem } = engineRef.current;

    switch (code) {
      case 'HESOYAM':
        playerController.stats.health = 100;
        playerController.stats.armor = 100;
        playerController.stats.cash += 250000;
        break;

      case 'LAWYERUP':
        playerController.stats.wantedLevel = 0;
        playerController.stats.wantedTimer = 0;
        playerController.stats.isPursued = false;
        soundFX.setSirenState(false);
        break;

      case 'FUGITIVE':
        playerController.stats.wantedLevel = 5;
        playerController.stats.wantedTimer = 60;
        playerController.stats.isPursued = true;
        soundFX.setSirenState(true);
        break;

      case 'TURBO':
        const forward = new THREE.Vector3(0, 0, 8).applyAxisAngle(new THREE.Vector3(0, 1, 0), playerController.mesh.rotation.y);
        const spawnPos = playerController.mesh.position.clone().add(forward).setY(1.0);
        vehicleSystem.spawnVehicle('queen_hypercar', spawnPos, playerController.mesh.rotation.y);
        break;

      case 'CHECKMATE':
        playerController.stats.elo = 3000;
        playerController.updatePromotion('queen');
        break;
    }

    setStats({ ...playerController.stats });
  };

  const handlePromote = (piece: 'knight' | 'bishop' | 'rook' | 'queen') => {
    if (!engineRef.current) return;
    const { playerController } = engineRef.current;
    playerController.updatePromotion(piece);
    setStats({ ...playerController.stats });
  };

  const handleSummonVehicle = (model: string) => {
    if (!engineRef.current) return;
    const { playerController, vehicleSystem } = engineRef.current;
    const forward = new THREE.Vector3(0, 0, 7).applyAxisAngle(new THREE.Vector3(0, 1, 0), playerController.mesh.rotation.y);
    const spawnPos = playerController.mesh.position.clone().add(forward).setY(1.0);
    const veh = vehicleSystem.spawnVehicle(model as any, spawnPos, playerController.mesh.rotation.y);
    vehicleSystem.enterVehicle(veh);
    setActiveVehicle(veh);
  };

  const handleStartMission = (id: string) => {
    if (!engineRef.current) return;
    const state = engineRef.current.missionManager.startMission(id);
    setActiveMission(state ? { ...state } : null);
  };

  const handleStartTaxi = () => {
    if (!engineRef.current) return;
    const state = engineRef.current.missionManager.startTaxiJob();
    setActiveMission({ ...state });
  };

  const handleStartGame = () => {
    setIsGameStarted(true);
    soundFX.playClick();
    triggerHaptic(40);
    soundFX.switchRadioStation(1);

    // Request fullscreen on mobile
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      document.documentElement.requestFullscreen?.().catch(() => {});
    }

    if (containerRef.current) {
      containerRef.current.requestPointerLock?.();
    }
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-black select-none touch-none">
      {/* 3D WebGL Canvas Viewport */}
      <div ref={containerRef} className="w-full h-full cursor-crosshair touch-none" />

      {/* --- GTA V TITLE SPLASH / ONBOARDING SCREEN --- */}
      {!isGameStarted && (
        <div className="absolute inset-0 bg-neutral-950/95 backdrop-blur-md flex flex-col items-center justify-center p-5 z-50 animate-fade-in text-center overflow-y-auto">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] uppercase tracking-widest text-amber-400 font-extrabold bg-amber-500/10 border border-amber-500/30 px-3 py-1 rounded-full">
              📱 MOBILE EDITION · GTA 5 × CHESS
            </span>
            <PWAInstallButton />
          </div>

          <h1 className="text-4xl sm:text-6xl md:text-8xl font-black tracking-tight text-white uppercase drop-shadow-[0_4px_16px_rgba(234,179,8,0.5)]">
            GRAND THEFT <span className="text-amber-400">PAWN</span>
          </h1>

          <div className="text-sm sm:text-base md:text-xl font-bold tracking-widest text-slate-300 uppercase mt-0.5">
            VICE SQUARE · LOS CAISSAS MOBILE
          </div>

          <p className="max-w-lg text-slate-400 text-xs sm:text-sm mt-3 leading-relaxed">
            Mainkan game open-world catur 3D langsung di layar HP kamu. Geser jempol kiri untuk analog berjalan/menyetir,
            swipe jempol kanan untuk putar kamera & mengarahkan pandangan, serta tombol PUNCH (👊) untuk bertarung!
          </p>

          {/* Mobile Touch Controls Guide */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 my-4 max-w-xl w-full text-left bg-black/70 p-3.5 rounded-xl border border-white/10 text-[11px]">
            <div>
              <span className="font-bold text-amber-400">🕹️ ANALOG KIRI</span>
              <div className="text-slate-400">Jalan & Belok Mobil</div>
            </div>
            <div>
              <span className="font-bold text-amber-400">👆 SWIPE KANAN</span>
              <div className="text-slate-400">Putar Kamera / Aim</div>
            </div>
            <div>
              <span className="font-bold text-amber-400">👊 TOMBOL PUNCH</span>
              <div className="text-slate-400">Pukul Musuh / Warga</div>
            </div>
            <div>
              <span className="font-bold text-amber-400">🚗 TOMBOL DRIVE</span>
              <div className="text-slate-400">Bajak & Turun Mobil</div>
            </div>
            <div>
              <span className="font-bold text-amber-400">⚡ TOMBOL SKILL</span>
              <div className="text-slate-400">Kekuatan Catur</div>
            </div>
            <div>
              <span className="font-bold text-amber-400">⬆️ TOMBOL JUMP</span>
              <div className="text-slate-400">Lompat / Handbrake</div>
            </div>
            <div>
              <span className="font-bold text-amber-400">📱 TOMBOL iPAWN</span>
              <div className="text-slate-400">Misi, Valet & Cheat</div>
            </div>
            <div>
              <span className="font-bold text-amber-400">⛶ LAYAR PENUH</span>
              <div className="text-slate-400">Mode HP Fullscreen</div>
            </div>
          </div>

          {/* Mobile Start Button */}
          <button
            onClick={handleStartGame}
            className="w-full max-w-sm py-4 bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 active:scale-95 text-black font-black text-base sm:text-lg tracking-widest uppercase rounded-2xl cursor-pointer shadow-[0_0_30px_rgba(245,158,11,0.6)] transition-all"
          >
            MULAI GAME HP 🎮
          </button>
        </div>
      )}

      {/* --- GTA V HUD & TOUCH CONTROLS OVERLAY --- */}
      {isGameStarted && (
        <GTAHUD
          stats={stats}
          selectedPower={selectedPower}
          cooldowns={cooldowns}
          activeMission={activeMission}
          activeVehicle={activeVehicle}
          currentDistrict={currentDistrict}
          playerPos={playerPos}
          playerYaw={playerYaw}
          policePositions={policePositions}
          isCheckmated={isCheckmated}
          missionPassedReward={missionReward}
          onSelectPower={powerId => setSelectedPower(powerId)}
          onStartMission={handleStartMission}
          onStartTaxi={handleStartTaxi}
          onPromote={handlePromote}
          onApplyCheat={handleApplyCheat}
          onSummonVehicle={handleSummonVehicle}
          onClearHeat={() => handleApplyCheat('LAWYERUP')}
          onJoystickMove={handleJoystickMove}
          onPunch={handlePunch}
          onExecutePower={executeActivePower}
          onToggleVehicle={handleToggleVehicle}
          onJump={handleJump}
          onToggleSprint={handleToggleSprint}
          onHonkHorn={handleHonkHorn}
          invertAnalog={invertAnalog}
          onToggleInvertAnalog={handleToggleInvertAnalog}
        />
      )}
    </div>
  );
}
