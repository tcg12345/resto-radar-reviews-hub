interface GrubbyLogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  className?: string;
}

export function GrubbyLogo({ size = 'md', showText = true, className = '' }: GrubbyLogoProps) {
  const dimensions = {
    sm: { container: 'h-8 w-8', text: 'text-lg' },
    md: { container: 'h-10 w-10', text: 'text-xl' },
    lg: { container: 'h-12 w-12', text: 'text-2xl' }
  };

  const { container, text } = dimensions[size];

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <img 
        src="/lovable-uploads/d3e2619d-3039-47d4-ae30-f20881868a4f.png" 
        alt="Grubby Logo" 
        className={`${container} object-contain`}
      />
      {showText && (
        <span className={`${text} font-bold tracking-tight`}>Grubby</span>
      )}
    </div>
  );
}