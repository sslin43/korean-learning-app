import { useEffect, useRef, useState } from 'react';
import type { MouseEvent } from 'react';

interface FavoriteHeartButtonProps {
  isFavorite: boolean;
  label: string;
  size?: 'sm' | 'md';
  className?: string;
  onToggle: () => void;
}

export function FavoriteHeartButton({
  isFavorite,
  label,
  size = 'md',
  className = '',
  onToggle,
}: FavoriteHeartButtonProps) {
  const [isPopping, setIsPopping] = useState<boolean>(false);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
      }
    };
  }, []);

  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();

    if (!isFavorite) {
      setIsPopping(true);
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
      }
      timerRef.current = window.setTimeout(() => {
        setIsPopping(false);
        timerRef.current = null;
      }, 420);
    } else {
      setIsPopping(false);
    }

    onToggle();
  };

  return (
    <button
      type="button"
      className={`fav-heart-btn fav-heart-btn--${size} ${
        isFavorite ? 'is-favorited' : ''
      } ${isPopping ? 'is-popping' : ''} ${className}`.trim()}
      aria-pressed={isFavorite}
      aria-label={isFavorite ? `取消收藏「${label}」` : `收藏「${label}」`}
      title={isFavorite ? '已收藏，點擊可取消' : '加入我的收藏'}
      onClick={handleClick}
    >
      <span className="fav-heart-btn__icon" aria-hidden="true">
        {isFavorite ? '♥' : '♡'}
      </span>
    </button>
  );
}
