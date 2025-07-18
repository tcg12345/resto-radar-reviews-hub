import { DollarSign } from 'lucide-react';

interface PriceRangeProps {
  priceRange?: number;
  onPriceChange?: (price: number) => void;
  readonly?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function PriceRange({ 
  priceRange, 
  onPriceChange, 
  readonly = false, 
  size = 'md' 
}: PriceRangeProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6'
  };

  const displayPrice = priceRange || 0;

  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4].map((level) => {
        const isFilled = level <= displayPrice;
        
        return (
          <button
            key={level}
            type="button"
            disabled={readonly}
            onClick={() => !readonly && onPriceChange?.(level)}
            className={`transition-all duration-150 ${
              readonly ? 'cursor-default' : 'cursor-pointer hover:scale-110'
            }`}
          >
            <DollarSign
              className={`${sizeClasses[size]} transition-colors duration-150 stroke-2 ${
                isFilled
                  ? 'fill-green-500 text-green-600'
                  : 'fill-gray-200 text-gray-400 hover:fill-green-300 hover:text-green-500'
              }`}
            />
          </button>
        );
      })}
    </div>
  );
}