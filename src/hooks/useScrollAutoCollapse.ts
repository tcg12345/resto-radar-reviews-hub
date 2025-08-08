import { useEffect, useRef } from 'react';

interface UseScrollAutoCollapseProps {
  isOpen: boolean;
  onClose: () => void;
  threshold?: number; // How much of the element should be out of view before collapsing (0-1)
}

export function useScrollAutoCollapse({ 
  isOpen, 
  onClose, 
  threshold = 0.5 
}: UseScrollAutoCollapseProps) {
  const elementRef = useRef<HTMLDivElement>(null);
  const hasCollapsedRef = useRef(false);

  useEffect(() => {
    if (!isOpen) {
      hasCollapsedRef.current = false;
      return;
    }

    const element = elementRef.current;
    if (!element) return;

    const handleScroll = () => {
      if (!isOpen || hasCollapsedRef.current) return;

      const rect = element.getBoundingClientRect();
      const windowHeight = window.innerHeight;
      const elementHeight = rect.height;

      // Calculate how much of the element is visible
      const visibleTop = Math.max(0, rect.top);
      const visibleBottom = Math.min(windowHeight, rect.bottom);
      const visibleHeight = Math.max(0, visibleBottom - visibleTop);
      const visibilityRatio = visibleHeight / elementHeight;

      // If less than threshold is visible, collapse the dropdown
      if (visibilityRatio < threshold) {
        hasCollapsedRef.current = true;
        onClose();
      }
    };

    // Add scroll listener to window and any scrollable parents
    const addScrollListeners = () => {
      window.addEventListener('scroll', handleScroll, { passive: true });
      
      // Also listen to scroll events on scrollable parents
      let parent = element.parentElement;
      while (parent) {
        const style = window.getComputedStyle(parent);
        if (style.overflow === 'auto' || style.overflow === 'scroll' || 
            style.overflowY === 'auto' || style.overflowY === 'scroll') {
          parent.addEventListener('scroll', handleScroll, { passive: true });
        }
        parent = parent.parentElement;
      }
    };

    const removeScrollListeners = () => {
      window.removeEventListener('scroll', handleScroll);
      
      // Remove listeners from scrollable parents
      let parent = element.parentElement;
      while (parent) {
        const style = window.getComputedStyle(parent);
        if (style.overflow === 'auto' || style.overflow === 'scroll' || 
            style.overflowY === 'auto' || style.overflowY === 'scroll') {
          parent.removeEventListener('scroll', handleScroll);
        }
        parent = parent.parentElement;
      }
    };

    addScrollListeners();

    return () => {
      removeScrollListeners();
    };
  }, [isOpen, onClose, threshold]);

  return elementRef;
}