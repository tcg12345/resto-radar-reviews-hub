import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';

interface BottomSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
  className?: string;
}

export function BottomSheet({ open, onOpenChange, children, className }: BottomSheetProps) {
  // Prevent background scrolling when open
  useEffect(() => {
    if (open) {
      const scrollY = window.scrollY;
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
          "fixed bottom-0 left-0 right-0 bg-background border-t rounded-t-xl",
          "animate-in slide-in-from-bottom duration-300",
          "max-h-[90vh] flex flex-col",
          className
        )}
        style={{ zIndex: 1000000 }}
      >
        {/* Drag Handle */}
        <div 
          className="flex justify-center py-3 cursor-pointer"
          onClick={() => onOpenChange(false)}
        >
          <div className="w-8 h-1 bg-muted-foreground/30 rounded-full"></div>
        </div>
        
        {children}
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
    <div className={cn("px-4 pb-4 border-b bg-background", className)}>
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