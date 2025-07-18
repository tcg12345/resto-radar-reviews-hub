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
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5'
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
              className={`${sizeClasses[size]} transition-colors duration-150 ${
                isFilled
                  ? 'fill-green-500 text-green-500'
                  : 'fill-gray-200 text-gray-300 hover:fill-green-300 hover:text-green-400'
              }`}
            />
          </button>
        );
      })}
    </div>
  );
}