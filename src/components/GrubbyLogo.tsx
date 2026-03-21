interface GrubbyLogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  className?: string;
}

export function GrubbyLogo({ size = 'md', showText = true, className = '' }: GrubbyLogoProps) {
  const dimensions = {
    sm: { text: 'text-xl' },
    md: { text: 'text-2xl' },
    lg: { text: 'text-3xl' }
  };

  const { text } = dimensions[size];

  return (
    <div className={`flex items-center justify-start ${className}`}>
      <span className={`${text} font-headline font-bold italic text-foreground tracking-tight`}>
        Grubby
      </span>
    </div>
  );
}
