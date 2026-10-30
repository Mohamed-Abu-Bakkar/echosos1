'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import * as api from '@/lib/api';
import { bleEventBus } from '@/lib/ble-events';
import { Capacitor } from '@capacitor/core';
import {
  ArrowLeft,
  RotateCw,
  Cpu,
  Radio,
  CheckCircle2,
  Info,
  Signal,
  Bluetooth,
  Sparkles,
  Loader2,
} from 'lucide-react';
import { EchoLogo } from '@/components/ui/echo-logo';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

interface BeaconScreenProps {
  onNavigate?: (screen: string) => void;
}

export function BeaconScreen({ onNavigate }: BeaconScreenProps) {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [isScanning, setIsScanning] = useState(false);
  const [pairedDevice, setPairedDevice] = useState('');
  const [macAddress, setMacAddress] = useState('');
  const [batteryPercent, setBatteryPercent] = useState<number | null>(null);
  const [beaconStatus, setBeaconStatus] = useState<string | null>(null);
  const [devices, setDevices] = useState<{ name: string; mac: string; signal: string; available: boolean }[]>([]);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) router.push('/login');
  }, [loading, user, router]);

  useEffect(() => {
    api
      .getBeacon()
      .then((data) => {
        if (data.success && data.beacon) {
          setPairedDevice(data.beacon.device_name || '');
          setMacAddress(data.beacon.mac_address || '');
          setBatteryPercent(
            typeof data.beacon.battery_percent === 'number' ? data.beacon.battery_percent : null
          );
          setBeaconStatus(data.beacon.status || null);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      const unsubscribe = bleEventBus.subscribe((devices) => {
        const filtered = devices.filter((d: any) => {
          const name = d.rawName || d.name || '';
          return /echo|beacon|sos|esp|EchoSOS-r/i.test(name);
        });
        if (filtered.length > 0) {
          setDevices(filtered);
        }
      });
      return unsubscribe;
    }
  }, []);

  const handleScan = async () => {
    setIsScanning(true);
    setStatusMessage('Scanning 2.4GHz BLE spectrum for EchoSOS hardware...');
    try {
      const data = await api.scanBeacon();
      if (data.success && data.devices) {
        setDevices(data.devices);
        setStatusMessage(`Scan complete: Found ${data.scannedCount} nearby devices.`);
      } else {
        setStatusMessage(data.message || 'Bluetooth unavailable — no nearby devices found.');
      }
    } catch (err) {
      setStatusMessage('BLE scan completed.');
    } finally {
      setIsScanning(false);
      setTimeout(() => setStatusMessage(null), 4000);
    }
  };

  const handleRegister = async (name: string, mac: string) => {
    try {
      const data = await api.pairBeacon({ deviceName: name, macAddress: mac });
      if (data.success) {
        setPairedDevice(name);
        setMacAddress(mac);
        setBeaconStatus('CONNECTED');
        setStatusMessage(`Successfully paired and registered ${name}!`);
      } else {
        setStatusMessage(data.message || 'Pairing failed.');
      }
    } catch (err) {
      setStatusMessage('Pairing failed.');
    } finally {
      setTimeout(() => setStatusMessage(null), 4000);
    }
  };

  return (
    <div className="flex flex-col flex-1 w-full bg-[#F4F8FF] px-4 py-4 overflow-y-auto no-scrollbar space-y-4 pb-16">
      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center space-x-2">
          {onNavigate ? (
            <button
              onClick={() => onNavigate('home')}
              className="p-1.5 rounded-full bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          ) : (
            <Link
              href="/"
              className="p-1.5 rounded-full bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
          )}
          <EchoLogo size="sm" inline={true} />
        </div>
        <span className="text-[11px] font-bold text-slate-400 bg-white px-2.5 py-1 rounded-full border border-slate-200/60">
          BLE 5.2
        </span>
      </div>

      <div>
        <h1 className="text-xl font-black text-[#0B3C85] tracking-tight">
          Register / Pair Beacon
        </h1>
        <p className="text-xs text-slate-500 mt-1 leading-relaxed">
          Scan for nearby EchoSOS beacons and register your device for emergency alerts.
        </p>
      </div>

      {statusMessage && (
        <div className="p-2.5 rounded-xl bg-blue-50 border border-blue-200 text-xs font-semibold text-[#0B3C85] flex items-center justify-between animate-in fade-in duration-300">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
            <span>{statusMessage}</span>
          </div>
        </div>
      )}

      <div className="bg-gradient-to-br from-blue-50/90 to-blue-100/50 border border-blue-200/80 rounded-2xl p-4 shadow-sm relative overflow-hidden">
        <div className="flex items-center justify-between relative z-10">
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#0B3C85]/80">
              Your Beacon
            </span>
            <h3 className="text-base font-black text-[#0F172A] flex items-center gap-2">
              <span>{macAddress ? `${pairedDevice || 'Beacon'} • BLE` : 'No beacon paired'}</span>
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              {macAddress
                ? `MAC: ${macAddress} • ${batteryPercent !== null ? `${batteryPercent}% Battery` : 'Battery unknown'}`
                : 'Scan for your ESP32-S3 beacon below to register it'}
            </p>
          </div>

          <div className="flex flex-col items-end space-y-2">
            {beaconStatus === 'CONNECTED' ? (
              <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-300/60 text-emerald-700 text-[11px] font-bold">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Connected</span>
              </div>
            ) : beaconStatus === 'READY_TO_PAIR' ? (
              <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-blue-50 border border-blue-300/60 text-blue-700 text-[11px] font-bold">
                <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                <span>Ready to Pair</span>
              </div>
            ) : beaconStatus === 'DISCONNECTED' ? (
              <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-amber-50 border border-amber-300/60 text-amber-700 text-[11px] font-bold">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                <span>Disconnected</span>
              </div>
            ) : (
              <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-slate-50 border border-slate-300/60 text-slate-600 text-[11px] font-bold">
                <span className="w-2 h-2 rounded-full bg-slate-400" />
                <span>Not paired</span>
              </div>
            )}
          </div>
        </div>

        <div className="relative mt-4 pt-2 pb-1 flex items-center justify-center">
          <div className="relative flex items-center justify-center">
            <div className="absolute w-24 h-24 rounded-full border border-blue-300/60 animate-ping opacity-40" />
            <div className="w-20 h-20 rounded-full border-2 border-blue-400/40 bg-white/70 flex items-center justify-center shadow-xs">
              <div className="w-12 h-12 rounded-xl bg-[#0B3C85] text-white flex items-center justify-center shadow-md">
                <Cpu className="w-6 h-6 animate-pulse" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <Button
        onClick={handleScan}
        disabled={isScanning}
        className="w-full bg-[#0B3C85] hover:bg-[#082E66] text-white flex items-center justify-center gap-2 font-bold shadow-md shadow-[#0B3C85]/20"
      >
        <Radio className={`w-4 h-4 ${isScanning ? 'animate-spin' : ''}`} />
        <span>{isScanning ? 'Scanning for Beacons...' : 'Scan for Nearby Devices'}</span>
      </Button>

      <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <h3 className="text-xs font-bold text-[#0F172A] tracking-wide">
            Nearby Devices
          </h3>
          <button
            onClick={handleScan}
            disabled={isScanning}
            className="p-1 rounded-full hover:bg-slate-100 text-slate-500 transition-colors"
            title="Refresh devices"
          >
            <RotateCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <div className="space-y-2.5">
          {devices.map((device, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-2.5 rounded-xl bg-[#F4F8FF] border border-slate-100 hover:border-blue-200 transition-colors"
            >
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-xl bg-[#0B3C85]/10 flex items-center justify-center text-[#0B3C85]">
                  <Bluetooth className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-[#0F172A]">
                      {device.name}
                    </span>
                    {device.available && (
                      <span className="text-[9px] bg-emerald-50 text-emerald-700 px-1 rounded font-bold">
                        Strong
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono">
                    <span>{device.mac}</span>
                    <span>•</span>
                    <span className="text-slate-600 font-medium font-sans">
                      {device.signal}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                {device.available ? (
                  <Button
                    size="sm"
                    onClick={() => handleRegister(device.name, device.mac)}
                    className="h-8 px-3 text-xs bg-[#0B3C85] hover:bg-[#082E66] text-white font-bold"
                  >
                    Register
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled
                    className="h-8 px-3 text-xs bg-slate-100 text-slate-400 font-medium cursor-not-allowed"
                  >
                    Not Available
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-blue-50/70 border border-blue-200/60 rounded-2xl p-3.5 space-y-2">
        <div className="flex items-center space-x-2 text-[#0B3C85]">
          <Info className="w-4 h-4" />
          <h4 className="text-xs font-bold">How to register your beacon?</h4>
        </div>
        <ol className="text-[11px] text-slate-600 space-y-1.5 pl-4 list-decimal leading-relaxed">
          <li>Hold down the red tactile button on your ESP32-S3 for 3 seconds until the blue LED blinks.</li>
          <li>Keep your smartphone within 2 meters of the device with Bluetooth enabled.</li>
          <li>Tap <strong>Scan for Nearby Devices</strong> above, select your device, and hit <strong>Register</strong>.</li>
        </ol>
      </div>
    </div>
  );
}

export default function BeaconPage() {
  return <BeaconScreen />;
}
