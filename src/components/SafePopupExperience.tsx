import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Pause, Play, ShieldAlert, Volume2, X } from 'lucide-react';

const LIBRARY_URL = 'https://sparklyfrog2060.github.io/PopUpLibrary';
const AD_COUNT = 33;
const AD_ROTATION_MS = 1_400;
const EXPERIENCE_DURATION_MS = 12_000;

interface SafePopupExperienceProps {
  onClose: () => void;
}

interface PopupCard {
  id: number;
  src: string;
  alt: string;
}

export const SafePopupExperience: React.FC<SafePopupExperienceProps> = ({ onClose }) => {
  const [activeAdIndex, setActiveAdIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [soundNeedsInteraction, setSoundNeedsInteraction] = useState(false);
  const alarmRef = useRef<HTMLAudioElement>(null);

  const popupCards = useMemo<PopupCard[]>(
    () =>
      Array.from({ length: AD_COUNT }, (_, index) => ({
        id: index + 1,
        src: `${LIBRARY_URL}/${index + 1}.png`,
        alt: `Reklama demonstracyjna ${index + 1}`,
      })),
    [],
  );

  useEffect(() => {
    const rotationTimer = window.setInterval(() => {
      setActiveAdIndex((current) => (current + 1) % popupCards.length);
    }, AD_ROTATION_MS);
    const endTimer = window.setTimeout(onClose, EXPERIENCE_DURATION_MS);

    return () => {
      window.clearInterval(rotationTimer);
      window.clearTimeout(endTimer);
    };
  }, [onClose, popupCards]);

  useEffect(() => {
    if (!alarmRef.current) return;

    if (isPaused) {
      alarmRef.current.pause();
      return;
    }

    alarmRef.current.currentTime = 0;
    alarmRef.current.play()
      .then(() => {
        setSoundEnabled(true);
      })
      .catch(() => {
        setSoundNeedsInteraction(true);
      });
  }, [isPaused]);

  const toggleSound = async () => {
    if (!alarmRef.current) return;

    if (soundEnabled) {
      alarmRef.current.pause();
      setSoundEnabled(false);
      return;
    }

    try {
      await alarmRef.current.play();
      setSoundEnabled(true);
      setSoundNeedsInteraction(false);
    } catch {
      setSoundNeedsInteraction(true);
    }
  };

  const activeAd = popupCards[activeAdIndex];

  return (
    <section
      className={`safe-experience fixed inset-0 z-50 overflow-hidden bg-zinc-950/80 p-4 sm:p-8 ${
        isPaused ? 'safe-experience-paused' : ''
      }`}
      aria-label="Bezpieczny pokaz multimedialny"
    >
      <div className="relative flex h-full flex-col bg-zinc-950/95 p-4 text-white shadow-2xl sm:p-8">
        <div className="relative z-20 flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold">
              <ShieldAlert className="h-4 w-4 text-amber-300" />
              Bezpieczny pokaz
            </div>
            <p className="mt-1 max-w-xl text-xs text-zinc-300">
              Reklamy zmieniają się pojedynczo, bez stroboskopu. Pokaz kończy się automatycznie po 12 sekundach.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-2 text-zinc-300 transition-colors hover:bg-white/10 hover:text-white"
            aria-label="Zamknij pokaz"
            title="Zamknij pokaz"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="relative mt-4 min-h-0 flex-1 overflow-hidden bg-zinc-950">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(245,158,11,0.12),transparent_55%)]" />

          <img
            key={activeAd.id}
            src={activeAd.src}
            alt={activeAd.alt}
            className="safe-popup-card"
          />

          <img
            src={`${LIBRARY_URL}/avast.jpg`}
            alt="Bezpieczna karta ostrzegawcza"
            className="safe-avast-card"
          />

          <div className="absolute inset-x-3 bottom-3 z-10 grid gap-3 rounded-lg border border-white/10 bg-zinc-900/90 p-3 backdrop-blur sm:grid-cols-[1fr_auto] sm:items-center">
            <div className="flex items-start gap-2 text-xs text-zinc-300">
              <Volume2 className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
              <span>
                Dźwięk uruchamia się automatycznie, jeśli pozwala na to przeglądarka. W przeciwnym razie użyj przycisku.
                {soundNeedsInteraction && ' Autoplay został zablokowany.'}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setIsPaused((paused) => !paused)}
                className="inline-flex items-center gap-1.5 rounded-md border border-white/20 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-white/10"
              >
                {isPaused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
                {isPaused ? 'Wznów' : 'Pauza'}
              </button>
              <button
                type="button"
                onClick={() => void toggleSound()}
                className="inline-flex items-center gap-1.5 rounded-md bg-amber-300 px-3 py-1.5 text-xs font-semibold text-zinc-950 transition-colors hover:bg-amber-200"
              >
                <Volume2 className="h-3.5 w-3.5" />
                {soundEnabled ? 'Wyłącz dźwięk' : 'Włącz alarm'}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="rounded-md bg-white px-3 py-1.5 text-xs font-semibold text-zinc-950 transition-colors hover:bg-zinc-200"
              >
                Zakończ
              </button>
            </div>
          </div>
        </div>

        <video
          className="pointer-events-none absolute h-px w-px opacity-0"
          src={`${LIBRARY_URL}/video1.mp4`}
          autoPlay
          muted
          loop
          playsInline
          aria-hidden="true"
        />
        <audio ref={alarmRef} src={`${LIBRARY_URL}/alarm.mp3`} preload="none" />
      </div>
    </section>
  );
};
