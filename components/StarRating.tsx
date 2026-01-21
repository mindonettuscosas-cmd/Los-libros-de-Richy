
import React from 'react';
import { Star } from 'lucide-react';

interface StarRatingProps {
  rating: number;
  max?: number;
  onRatingChange?: (rating: number) => void;
  interactive?: boolean;
  size?: number;
}

export const StarRating: React.FC<StarRatingProps> = ({ 
  rating, 
  max = 5, 
  onRatingChange, 
  interactive = false,
  size = 18
}) => {
  const handleClick = (starValue: number) => {
    if (!interactive) return;
    // Si haces clic en la estrella que ya representa el valor actual, se pone a 0 (ninguna)
    if (rating === starValue) {
      onRatingChange?.(0);
    } else {
      onRatingChange?.(starValue);
    }
  };

  return (
    <div className="flex gap-0.5">
      {[...Array(max)].map((_, i) => {
        const starValue = i + 1;
        const isActive = starValue <= rating;
        return (
          <Star
            key={i}
            size={size}
            strokeWidth={isActive ? 0 : 1.5}
            className={`${
              isActive 
                ? 'fill-yellow-400 text-yellow-400' 
                : 'text-gray-600'
            } ${interactive ? 'cursor-pointer hover:scale-110 transition-transform active:scale-90' : ''}`}
            onClick={() => handleClick(starValue)}
          />
        );
      })}
      {rating === 0 && !interactive && <span className="text-[8px] font-bold text-slate-600 ml-1 uppercase">Sin nota</span>}
    </div>
  );
};
