import React from 'react';

export function Slot({ children, ...props }: any) {
  return React.createElement('slot', props);
}
