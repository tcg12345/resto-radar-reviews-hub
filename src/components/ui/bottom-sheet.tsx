import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';

interface BottomSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
  className?: string;
}

export function BottomSheet({ open, onOpenChange, children, className }: BottomSheetProps) {
  const [translateY, setTranslateY] = useState(0);
  const startYRef = useRef<number | null>(null);
  const draggingRef = useRef(false);
  const scrollYRef = useRef(0);

  // Prevent background scrolling when open
  useEffect(() => {
    if (open) {
      const scrollY = window.scrollY;
      scrollYRef.current = scrollY;
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
      document.body.style.overflow = 'hidden';
      
      return () => {
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.width = '';
        document.body.style.overflow = '';
        window.scrollTo(0, scrollY);
      };
    }
  }, [open]);

  if (!open) return null;

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    startYRef.current = e.touches[0].clientY;
    draggingRef.current = true;
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!draggingRef.current || startYRef.current === null) return;
    const currentY = e.touches[0].clientY;
    const delta = Math.max(0, currentY - startYRef.current);
    setTranslateY(delta);
  };

  const handleTouchEnd = () => {
    draggingRef.current = false;
    const threshold = 50; // px to close (match filter dialogs)
    if (translateY > threshold) {
      setTranslateY(0);
      onOpenChange(false);
    } else {
      // snap back
      setTranslateY(0);
    }
  };

  const modalContent = (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/60"
        style={{ zIndex: 999999 }}
        onClick={() => onOpenChange(false)}
      />
      
      {/* Bottom Sheet */}
      <div 
        className={cn(
          "fixed bottom-0 left-0 right-0 bg-background border-t rounded-t-3xl shadow-xl relative",
          "animate-in slide-in-from-bottom duration-300",
          "max-h-[95vh] flex flex-col overflow-hidden",
          className
        )}
        style={{ 
          zIndex: 1000000,
          transform: `translateY(${translateY}px)`,
          transition: draggingRef.current ? 'none' : 'transform 200ms ease-out'
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Drag Handle */}
        <div 
          className="flex justify-center py-4 cursor-grab active:cursor-grabbing select-none"
          onClick={() => onOpenChange(false)}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          aria-label="Close"
          role="button"
        >
          <div className="w-12 h-1.5 bg-muted-foreground/30 rounded-full" />
        </div>
        
        <button
          type="button"
          onClick={() => onOpenChange(false)}
          className="absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground hover:bg-muted/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </div>
    </>
  );

  // Render modal at document root to escape any stacking contexts
  return createPortal(modalContent, document.body);
}

interface BottomSheetHeaderProps {
  children: React.ReactNode;
  className?: string;
}

export function BottomSheetHeader({ children, className }: BottomSheetHeaderProps) {
  return (
    <div className={cn("px-4 pb-4 border-b bg-background rounded-t-3xl", className)}>
      {children}
    </div>
  );
}

interface BottomSheetContentProps {
  children: React.ReactNode;
  className?: string;
}

export function BottomSheetContent({ children, className }: BottomSheetContentProps) {
  return (
    <div className={cn("flex-1 overflow-y-auto px-4 py-4", className)}>
      {children}
    </div>
  );
}

interface BottomSheetFooterProps {
  children: React.ReactNode;
  className?: string;
}

export function BottomSheetFooter({ children, className }: BottomSheetFooterProps) {
  return (
    <div className={cn("px-4 py-4 border-t bg-background", className)}>
      {children}
    </div>
  );
}
