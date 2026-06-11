import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StarRatingInputProps {
  value?: number;
  onChange: (value: number | undefined) => void;
}

const StarRatingInput = ({ value, onChange }: StarRatingInputProps) => {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(value === star ? undefined : star)}
          aria-label={`Rate ${star} star${star > 1 ? 's' : ''}`}
          className="p-0.5"
        >
          <Star
            className={cn(
              'h-6 w-6 transition-colors',
              value && star <= value ? 'text-yellow-400 fill-current' : 'text-gray-300'
            )}
          />
        </button>
      ))}
    </div>
  );
};

export default StarRatingInput;
