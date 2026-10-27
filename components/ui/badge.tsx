import * as React from 'react';
import { cn } from '@/lib/utils';
import { Slot } from '@/components/ui/slot';

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    React.ComponentPropsWithoutRef<typeof Slot> {
  variant?: 'default' | 'secondary' | 'destructive' | 'outline';
  size?: 'default' | 'sm' | 'lg';
}

const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  function Badge({ className, variant, size, ...props }: BadgeProps) {
    return (
      <Slot
        className={cn(
          'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold',
          variant === 'default' &&
            'border-transparent bg-[#0B3C85] text-white',
          variant === 'secondary' &&
            'border-transparent bg-[#E52E3D] text-white',
          variant === 'destructive' &&
            'border-transparent bg-red-50 text-red-600',
          variant === 'outline' &&
            'border-input bg-transparent',
          size === 'sm' && 'px-1.5 py-0.5 text-xs',
          size === 'lg' && 'px-2.5 py-0.5 text-xs',
          className
        )}
        {...props}
      />
    );
  }
);
Badge.displayName = 'Badge';

export { Badge };
