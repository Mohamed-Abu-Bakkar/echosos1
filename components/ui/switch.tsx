'use client';

import React, { useState } from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SwitchProps {
  className?: string;
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
}

const Switch = React.forwardRef<HTMLInputElement, SwitchProps>(
  ({ className, checked, onCheckedChange, ...props }, ref) => (
    <div className={cn('relative inline-block w-6 h-3', className)}>
      <input
        ref={ref}
        type="checkbox"
        role="switch"
        checked={checked}
        onChange={(e) => onCheckedChange?.(e.target.checked)}
        className="peer h-4 w-4 shrink-0 rounded border border-slate-300 text-[#0B3C85] focus:outline-none data-[state=checked]:bg-[#0B3C85] data-[state=checked]:border-[#0B3C85]"
        {...props}
      />
      <span className="sr-only">{checked ? 'On' : 'Off'}</span>
      <span className="relative inline-block w-6 h-3 rounded-full bg-slate-300 peer-checked:bg-[#0B3C85]">
        <span className="inline-block h-3 w-3 rounded-full bg-white shadow-sm translate-x-0 peer-checked:translate-x-3 transition-all"></span>
      </span>
    </div>
  )
);
Switch.displayName = 'Switch';

export { Switch };
