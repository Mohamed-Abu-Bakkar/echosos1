import React from 'react';
import { cn } from '@/lib/utils';

interface EchoLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showSubtitle?: boolean;
  inline?: boolean;
}

export function EchoLogo({
  className,
  size = 'md',
  showSubtitle = false,
  inline = false,
}: EchoLogoProps) {
  const iconSizes = {
    sm: 'w-7 h-7',
    md: 'w-9 h-9',
    lg: 'w-14 h-14',
    xl: 'w-20 h-20',
  };

  const textSizes = {
    sm: 'text-base',
    md: 'text-xl',
    lg: 'text-3xl',
    xl: 'text-4xl',
  };

  return (
    <div
      className={cn(
        'flex items-center gap-2.5',
        inline ? 'flex-row' : 'flex-col justify-center text-center',
        className
      )}
    >
      {/* Navy Shield with Stylized Profile & Red Signal Waves */}
      <div className={cn('relative shrink-0 flex items-center justify-center', iconSizes[size])}>
        <svg
          viewBox="0 0 100 100"
          className="w-full h-full drop-shadow-md"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Shield Base */}
          <path
            d="M50 8L16 23V48C16 71 31 90 50 96C69 90 84 71 84 48V23L50 8Z"
            fill="#0B3C85"
          />
          {/* Inner Shield Accent */}
          <path
            d="M50 14L22 27V48C22 67 34 83 50 88C66 83 78 67 78 48V27L50 14Z"
            fill="#0F4BA3"
          />

          {/* Stylized Face Silhouette / Protective Head Form */}
          <path
            d="M44 32C47.866 32 51 35.134 51 39C51 42.866 47.866 46 44 46C40.134 46 37 42.866 37 39C37 35.134 40.134 32 44 32Z"
            fill="white"
          />
          <path
            d="M44 48C37.5 48 32 53.5 32 60V64H56V60C56 53.5 50.5 48 44 48Z"
            fill="white"
          />

          {/* Red Signal Waves emanating from the beacon / profile */}
          {/* Inner Wave */}
          <path
            d="M58 35C61.5 39.5 61.5 46.5 58 51"
            stroke="#E52E3D"
            strokeWidth="3.5"
            strokeLinecap="round"
          />
          {/* Middle Wave */}
          <path
            d="M64 29C69.5 35.5 69.5 49.5 64 56"
            stroke="#E52E3D"
            strokeWidth="3.5"
            strokeLinecap="round"
          />
          {/* Outer Wave */}
          <path
            d="M70 23C77.5 31.5 77.5 55 70 62"
            stroke="#E52E3D"
            strokeWidth="3.5"
            strokeLinecap="round"
          />
        </svg>
      </div>

      <div className={cn(inline ? 'text-left' : 'text-center')}>
        <div className={cn('font-black tracking-tight flex items-center leading-none', textSizes[size], !inline && 'justify-center')}>
          <span className="text-[#0B3C85]">Echo</span>
          <span className="text-[#E52E3D]">SOS</span>
        </div>
        {showSubtitle && (
          <p className="text-xs text-slate-500 mt-1 font-medium tracking-wide">
            Your safety, connected.
          </p>
        )}
      </div>
    </div>
  );
}
