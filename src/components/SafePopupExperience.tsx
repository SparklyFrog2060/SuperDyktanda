import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Pause, Play, ShieldAlert, Volume2, X } from 'lucide-react';

const LIBRARY_URL = 'https://sparklyfrog2060.github.io/PopUpLibrary';
const AD_COUNT = 33;
const VISIBLE_ADS = 10;

interface SafePopupExperienceProps {
  onClose: () => void;
}

interface PopupCard {
  id: number;
  src: string;
  alt: string;
}

export const SafePopupExperience: React.FC<SafePopupExperienceProps> = ({ onClose }) => {
  const [activeAdIds, setActiveAdIds] = useState<number[]>(
    () => Array.from({ length: VISIBLE_ADS }, (_, index) => index),
  );
  const [nextAdId, setNextAdId] = useState(VISIBLE_ADS);
  const [isPaused, setIsPaused] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [soundNeedsInteraction, setSoundNeedsInteraction] = useState(false);
  const [wideAds, setWideAds] = useState<Record<number, boolean>>({});
  const [layoutOffset, setLayoutOffset] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);

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
    const audio = audioRef.current;
    if (!audio) return;

    audio.currentTime = 0;
    audio.play()
      .then(() => setSoundEnabled(true))
      .catch(() => setSoundNeedsInteraction(true));
  }, []);

  useEffect(() => {
    if (!isPaused) return;
    audioRef.current?.pause();
  }, [isPaused]);

  const toggleSound = async () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (soundEnabled) {
      audio.pause();
      setSoundEnabled(false);
      return;
    }

    try {
      await audio.play();
      setSoundEnabled(true);
      setSoundNeedsInteraction(false);
    } catch {
      setSoundNeedsInteraction(true);
    }
  };

  const closeAd = (slotIndex: number) => {
    setActiveAdIds((current) => {
      if (nextAdId >= AD_COUNT) {
        return current.filter((_, index) => index !== slotIndex);
      }

      return current.map((adId, index) => (index === slotIndex ? nextAdId : adId));
    });
    setNextAdId((current) => Math.min(current + 1, AD_COUNT));
    setLayoutOffset((current) => (current + 1) % VISIBLE_ADS);
  };

  return (
    <section
      className={`safe-experience fixed inset-0 z-50 pointer-events-none ${
        isPaused ? 'safe-experience-paused' : ''
      }`}
      aria-label="Bezpieczny pokaz reklam"
    >
      <div className="safe-experience-controls pointer-events-auto">
        <div className="flex items-center gap-2 text-xs text-zinc-700">
          <ShieldAlert className="h-4 w-4 text-amber-600" />
          <span>
            10 spokojnych reklam. Zmienią się dopiero po zamknięciu.
            {soundNeedsInteraction && ' Kliknij „Włącz dźwięk”, aby uruchomić avast.mp3.'}
          </span>
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setIsPaused((paused) => !paused)}
            className="inline-flex items-center gap-1.5 rounded-md border border-zinc-300 bg-white/95 px-2.5 py-1.5 text-xs font-medium text-zinc-800 shadow-sm"
          >
            {isPaused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
            {isPaused ? 'Wznów' : 'Pauza'}
          </button>
          <button
            type="button"
            onClick={() => void toggleSound()}
            className="inline-flex items-center gap-1.5 rounded-md bg-amber-300 px-2.5 py-1.5 text-xs font-semibold text-zinc-950 shadow-sm"
          >
            <Volume2 className="h-3.5 w-3.5" />
            {soundEnabled ? 'Wyłącz dźwięk' : 'Włącz dźwięk'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-1.5 rounded-md bg-zinc-900 px-2.5 py-1.5 text-xs font-semibold text-white shadow-sm"
          >
            <X className="h-3.5 w-3.5" />
            Zamknij wszystko
          </button>
        </div>
      </div>

      {activeAdIds.map((adId, slotIndex) => {
        const card = popupCards[adId];
        if (!card) return null;

        return (
          <article
            key={`${slotIndex}-${card.id}`}
            className={`safe-ad-card safe-ad-card-${(slotIndex + layoutOffset) % VISIBLE_ADS} ${
              wideAds[card.id] ? 'safe-ad-card-wide' : ''
            } pointer-events-auto`}
          >
            <img
              src={card.src}
              alt={card.alt}
              onLoad={(event) => {
                const image = event.currentTarget;
                setWideAds((current) => ({
                  ...current,
                  [card.id]: image.naturalWidth / image.naturalHeight >= 1.7,
                }));
              }}
            />
            <button
              type="button"
              onClick={() => closeAd(slotIndex)}
              className="safe-ad-close"
              aria-label={`Zamknij reklamę ${card.id}`}
              title="Zamknij reklamę"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </article>
        );
      })}

      <img
        src={`${LIBRARY_URL}/avast.jpg`}
        alt="Avast"
        className="safe-avast-card pointer-events-none"
      />

      <video
        className="safe-background-video pointer-events-none"
        src={`${LIBRARY_URL}/video1.mp4`}
        autoPlay
        muted
        loop
        playsInline
        aria-hidden="true"
      />
      <audio
        ref={audioRef}
        src={`${LIBRARY_URL}/avast.mp3`}
        preload="auto"
        loop
      />
    </section>
  );
};
