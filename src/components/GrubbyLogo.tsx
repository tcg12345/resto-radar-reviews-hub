import { Utensils, Star } from 'lucide-react';

interface GrubbyLogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  className?: string;
}

export function GrubbyLogo({ size = 'md', showText = true, className = '' }: GrubbyLogoProps) {
  const dimensions = {
    sm: { container: 'h-8 w-8', fork: 'h-4 w-4', star: 'h-3 w-3', text: 'text-lg' },
    md: { container: 'h-10 w-10', fork: 'h-5 w-5', star: 'h-4 w-4', text: 'text-xl' },
    lg: { container: 'h-12 w-12', fork: 'h-6 w-6', star: 'h-5 w-5', text: 'text-2xl' }
  };

  const { container, fork, star, text } = dimensions[size];

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <div className={`${container} bg-gradient-to-br from-red-500 to-red-600 rounded-2xl flex items-center justify-center relative shadow-lg`}>
        <Utensils className={`${fork} text-white`} />
        <Star className={`${star} text-white absolute top-1 right-1 fill-white`} />
      </div>
      {showText && (
        <span className={`${text} font-bold tracking-tight`}>Grubby</span>
      )}
    </div>
  );
}