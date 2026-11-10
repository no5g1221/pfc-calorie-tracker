import React, { useEffect, useRef, useState } from 'react';

interface GoalCelebrationProps {
  isVisible: boolean;
  onComplete: () => void;
}

export const GoalCelebration: React.FC<GoalCelebrationProps> = ({
  isVisible,
  onComplete,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isFadingOut, setIsFadingOut] = useState(false);

  useEffect(() => {
    if (!isVisible) {
      setIsFadingOut(false);
      return;
    }

    setIsFadingOut(false);

    // 動画の再生速度を1.25倍速に設定して再生開始
    const video = videoRef.current;
    if (video) {
      video.currentTime = 0;
      video.playbackRate = 1.25;
      video.play().catch(() => {
        // 自動再生ブロック時のフォールバック無視
      });
    }

    // 1.8秒（1800ms）でフェードアウト開始
    const fadeTimer = setTimeout(() => {
      setIsFadingOut(true);
    }, 1800);

    // 2.3秒（2300ms）で完全に非表示（アンマウント）
    const unmountTimer = setTimeout(() => {
      onComplete();
    }, 2300);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(unmountTimer);
    };
  }, [isVisible, onComplete]);

  if (!isVisible) return null;

  return (
    <div
      className={`fixed inset-0 pointer-events-none flex items-center justify-center z-50 transition-opacity duration-500 ease-out ${
        isFadingOut ? 'opacity-0' : 'opacity-100'
      }`}
    >
      <video
        ref={videoRef}
        src="/celebration.mp4"
        autoPlay
        muted
        playsInline
        onLoadedMetadata={(e) => {
          e.currentTarget.playbackRate = 1.25;
        }}
        className="w-80 h-80 object-contain mix-blend-screen"
      />
    </div>
  );
};
