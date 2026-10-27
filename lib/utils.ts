export { Slot } from '@/components/ui/slot';

export function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}
