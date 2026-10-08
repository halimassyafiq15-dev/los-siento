import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { soundFX } from '../audio/SoundFx';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // If already running on mobile home screen as installed standalone app, hide button
  if (isInstalled) {
    return null;
  }

  // Android / Chromium mobile install flow
  if (isInstallable) {
    return (
      <button
        onClick={() => {
          soundFX.playClick();
          install();
        }}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-black bg-gradient-to-r from-amber-400 to-yellow-300 hover:from-amber-300 hover:to-yellow-200 rounded-lg shadow-lg cursor-pointer transition-transform active:scale-95"
      >
        <span>📲</span>
        <span>Install Game HP</span>
      </button>
    );
  }

  // iOS Safari flow (instructions for Add to Home Screen)
  if (isIOS) {
    return (
      <>
        <button
          onClick={() => {
            soundFX.playClick();
            setShowIOSGuide(true);
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-neutral-900/90 hover:bg-neutral-800 border border-white/20 rounded-lg shadow-lg cursor-pointer transition-transform active:scale-95"
        >
          <span>📲</span>
          <span>Install iOS</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 pointer-events-auto">
            <div className="w-full max-w-sm rounded-2xl bg-neutral-900 border border-white/20 p-6 shadow-2xl text-center">
              <div className="text-3xl mb-2">📲</div>
              <h3 className="text-lg font-bold text-white uppercase tracking-wide">
                Install Game di iPhone / iPad
              </h3>
              <p className="mt-3 text-sm text-slate-300 text-left leading-relaxed">
                1. Tap tombol <strong>Share</strong> (ikon kotak dengan panah ke atas) di menu bawah Safari.<br />
                2. Gulir ke bawah lalu tap <strong>Add to Home Screen</strong> (Tambahkan ke Layar Utama).<br />
                3. Buka game langsung dari layar HP tanpa browser!
              </p>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="mt-5 w-full rounded-xl bg-amber-500 py-2.5 text-sm font-bold text-black hover:bg-amber-400 cursor-pointer"
              >
                Tutup Panduan
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
