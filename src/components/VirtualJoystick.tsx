import React, { useRef, useState, useCallback, useEffect } from 'react';

interface VirtualJoystickProps {
  onMove: (vector: { x: number; y: number }) => void;
  size?: number;
}

export const VirtualJoystick: React.FC<VirtualJoystickProps> = ({ onMove, size = 120 }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [knobPos, setKnobPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isActive, setIsActive] = useState(false);
  const touchIdRef = useRef<number | null>(null);

  const radius = size / 2;
  const maxDistance = radius - 15;

  const handlePointerDown = (clientX: number, clientY: number, id: number | null) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const dx = clientX - centerX;
    const dy = clientY - centerY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    touchIdRef.current = id;
    setIsActive(true);

    const clampedDist = Math.min(dist, maxDistance);
    const angle = Math.atan2(dy, dx);
    const nx = Math.cos(angle) * clampedDist;
    const ny = Math.sin(angle) * clampedDist;

    setKnobPos({ x: nx, y: ny });
    onMove({ x: nx / maxDistance, y: ny / maxDistance });
  };

  const handlePointerMove = useCallback(
    (clientX: number, clientY: number) => {
      if (!isActive || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      const dx = clientX - centerX;
      const dy = clientY - centerY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      const clampedDist = Math.min(dist, maxDistance);
      const angle = Math.atan2(dy, dx);
      const nx = Math.cos(angle) * clampedDist;
      const ny = Math.sin(angle) * clampedDist;

      setKnobPos({ x: nx, y: ny });
      onMove({ x: nx / maxDistance, y: ny / maxDistance });
    },
    [isActive, maxDistance, onMove]
  );

  const handlePointerUp = useCallback(() => {
    setIsActive(false);
    touchIdRef.current = null;
    setKnobPos({ x: 0, y: 0 });
    onMove({ x: 0, y: 0 });
  }, [onMove]);

  // Touch event handlers
  const onTouchStart = (e: React.TouchEvent) => {
    e.preventDefault();
    if (touchIdRef.current === null && e.changedTouches.length > 0) {
      const touch = e.changedTouches[0];
      handlePointerDown(touch.clientX, touch.clientY, touch.identifier);
    }
  };

  const onTouchMove = (e: React.TouchEvent) => {
    e.preventDefault();
    if (touchIdRef.current !== null) {
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === touchIdRef.current) {
          handlePointerMove(e.changedTouches[i].clientX, e.changedTouches[i].clientY);
          break;
        }
      }
    }
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    e.preventDefault();
    if (touchIdRef.current !== null) {
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === touchIdRef.current) {
          handlePointerUp();
          break;
        }
      }
    }
  };

  // Mouse event handlers for desktop testing
  const onMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    handlePointerDown(e.clientX, e.clientY, null);
  };

  useEffect(() => {
    const onWindowMouseMove = (e: MouseEvent) => {
      if (isActive && touchIdRef.current === null) {
        handlePointerMove(e.clientX, e.clientY);
      }
    };

    const onWindowMouseUp = () => {
      if (isActive && touchIdRef.current === null) {
        handlePointerUp();
      }
    };

    if (isActive) {
      window.addEventListener('mousemove', onWindowMouseMove);
      window.addEventListener('mouseup', onWindowMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', onWindowMouseMove);
      window.removeEventListener('mouseup', onWindowMouseUp);
    };
  }, [isActive, handlePointerMove, handlePointerUp]);

  return (
    <div
      ref={containerRef}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onTouchCancel={onTouchEnd}
      onMouseDown={onMouseDown}
      className="relative rounded-full border-2 border-white/30 bg-black/60 backdrop-blur-md shadow-2xl flex items-center justify-center select-none touch-none cursor-pointer transition-colors"
      style={{
        width: `${size}px`,
        height: `${size}px`,
      }}
    >
      {/* Direction Crosshairs */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-40">
        <div className="w-full h-[1px] bg-white/40" />
        <div className="absolute h-full w-[1px] bg-white/40" />
      </div>

      {/* Direction indicator icons */}
      <span className="absolute top-1 text-[10px] text-white/50 font-bold select-none pointer-events-none">▲</span>
      <span className="absolute bottom-1 text-[10px] text-white/50 font-bold select-none pointer-events-none">▼</span>
      <span className="absolute left-1.5 text-[10px] text-white/50 font-bold select-none pointer-events-none">◄</span>
      <span className="absolute right-1.5 text-[10px] text-white/50 font-bold select-none pointer-events-none">►</span>

      {/* Joystick Center Thumbstick Knob */}
      <div
        className={`absolute rounded-full border border-white/60 shadow-lg pointer-events-none transition-transform duration-75 flex items-center justify-center ${
          isActive
            ? 'bg-amber-500 text-black scale-105 shadow-[0_0_15px_rgba(245,158,11,0.8)]'
            : 'bg-white/30 text-white'
        }`}
        style={{
          width: `${size * 0.44}px`,
          height: `${size * 0.44}px`,
          transform: `translate(${knobPos.x}px, ${knobPos.y}px)`,
        }}
      >
        <div className="w-3 h-3 rounded-full bg-white/80" />
      </div>
    </div>
  );
};
