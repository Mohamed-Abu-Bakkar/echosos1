type Listener = (devices: any[]) => void;

class BLEEventBus {
  private listeners: Set<Listener> = new Set();
  private devices: Map<string, any> = new Map();

  emit(device: any) {
    this.devices.set(device.mac, device);
    const list = Array.from(this.devices.values());
    this.listeners.forEach((l) => l(list));
  }

  subscribe(listener: Listener) {
    this.listeners.add(listener);
    listener(Array.from(this.devices.values()));
    return () => {
      this.listeners.delete(listener);
    };
  }

  clear() {
    this.devices.clear();
    this.listeners.forEach((l) => l([]));
  }
}

export const bleEventBus = new BLEEventBus();
