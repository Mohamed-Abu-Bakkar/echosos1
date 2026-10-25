import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-[#0B3C85] text-white',
        secondary: 'border-transparent bg-slate-100 text-slate-900',
        destructive: 'border-transparent bg-red-100 text-[#E52E3D]',
        emergency: 'border-transparent bg-[#E52E3D] text-white',
        outline: 'border border-slate-200 text-slate-800',
        success: 'border-transparent bg-emerald-50 text-emerald-700 border border-emerald-200/50',
        warning: 'border-transparent bg-amber-50 text-amber-700 border border-amber-200/50',
        info: 'border-transparent bg-blue-50 text-[#0B3C85] border border-blue-200/50',
        purple: 'border-transparent bg-purple-50 text-purple-700 border border-purple-200/50',
        cyan: 'border-transparent bg-cyan-50 text-cyan-700 border border-cyan-200/50',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
