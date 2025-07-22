import { useColorTheme } from '@/hooks/useColorTheme';

interface GrubbyLogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  className?: string;
}

export function GrubbyLogo({ size = 'md', showText = true, className = '' }: GrubbyLogoProps) {
  const { currentTheme } = useColorTheme();
  
  const getLogoSrc = () => {
    switch (currentTheme) {
      case 'forest-green':
        return '/lovable-uploads/ae2b0f9b-0084-4b18-97d0-fcf000255bd3.png';
      default:
        return '/lovable-uploads/42e9db1d-cc84-4c54-9adb-50dc08b98369.png';
    }
  };

  const dimensions = {
    sm: { container: 'h-8 w-8', text: 'text-lg' },
    md: { container: 'h-10 w-10', text: 'text-xl' },
    lg: { container: 'h-12 w-12', text: 'text-2xl' }
  };

  const { container, text } = dimensions[size];

  return (
    <div className={`flex items-center space-x-2 justify-start -ml-[35px] ${className}`}>
      <img 
        src={getLogoSrc()} 
        alt="Grubby Logo" 
        className={`${container} object-contain`}
      />
      {showText && (
        <span className={`${text} font-bold tracking-tight -ml-0.5`}>Grubby</span>
      )}
    </div>
  );
}