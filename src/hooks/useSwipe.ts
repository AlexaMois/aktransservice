import { useRef, TouchEvent } from 'react';

interface SwipeOptions {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  minSwipeDistance?: number;
  disabled?: boolean;
}

export function useSwipe({ onSwipeLeft, onSwipeRight, minSwipeDistance = 50, disabled = false }: SwipeOptions) {
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);

  const onTouchStart = (e: TouchEvent) => {
    if (disabled) return;
    touchEndX.current = null;
    touchStartX.current = e.targetTouches[0].clientX;
  };

  const onTouchMove = (e: TouchEvent) => {
    if (disabled) return;
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const onTouchEnd = () => {
    if (disabled) return;
    if (!touchStartX.current || !touchEndX.current) return;
    
    const distance = touchStartX.current - touchEndX.current;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe && onSwipeLeft) {
      onSwipeLeft();
    }
    
    if (isRightSwipe && onSwipeRight) {
      onSwipeRight();
    }

    // Reset
    touchStartX.current = null;
    touchEndX.current = null;
  };

  return {
    onTouchStart,
    onTouchMove,
    onTouchEnd,
  };
}
