import { useEffect } from 'react';

let lockCount = 0;
let originalBodyOverflow = '';
let originalBodyTouchAction = '';
let originalHtmlOverflow = '';
let originalHtmlTouchAction = '';

/**
 * Custom hook to lock body & html scroll when a modal or drawer is open.
 * Supports nesting: closing an inner modal will not release scroll if an outer modal is still open.
 * Enforces `overflow: hidden; touch-action: none;` on root container / body.
 *
 * @param {boolean} isOpen
 */
export function useScrollLock(isOpen) {
  useEffect(() => {
    if (!isOpen) return;

    if (typeof document !== 'undefined') {
      if (lockCount === 0) {
        originalBodyOverflow = document.body.style.overflow;
        originalBodyTouchAction = document.body.style.touchAction;
        originalHtmlOverflow = document.documentElement.style.overflow;
        originalHtmlTouchAction = document.documentElement.style.touchAction;

        document.body.style.overflow = 'hidden';
        document.body.style.touchAction = 'none';
        document.documentElement.style.overflow = 'hidden';
        document.documentElement.style.touchAction = 'none';
        document.body.classList.add('modal-open-scroll-locked');
        document.documentElement.classList.add('modal-open-scroll-locked');
      }
      lockCount++;
    }

    return () => {
      if (typeof document !== 'undefined') {
        lockCount = Math.max(0, lockCount - 1);
        if (lockCount === 0) {
          document.body.style.overflow = originalBodyOverflow;
          document.body.style.touchAction = originalBodyTouchAction;
          document.documentElement.style.overflow = originalHtmlOverflow;
          document.documentElement.style.touchAction = originalHtmlTouchAction;
          document.body.classList.remove('modal-open-scroll-locked');
          document.documentElement.classList.remove('modal-open-scroll-locked');
        }
      }
    };
  }, [isOpen]);
}
