import { useRouter } from "next/navigation";
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
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
  Loader2 
} from 'lucide-react';
import { EchoLogo } from '@/components/ui/echo-logo';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth-context';
import * as api from '@/lib/api';

interface BeaconScreenProps {
  onNavigate?: (screen: string) => void;
}

export function BeaconScreen({ onNavigate }: BeaconScreenProps) {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [isScanning, setIsScanning] = useState(false);

  // Route guard: require an active session
  useEffect(() => {
    if (!loading && !user) router.push('/login');
  }, [loading, user, router]);
  const [pairedDevice, setPairedDevice] = useState('ESP32-S3');
  const [macAddress, setMacAddress] = useState('C7:3A:5B:12:4E:9F');
  const [batteryPercent, setBatteryPercent] = useState(88);
  const [devices, setDevices] = useState<{ name: string; mac: string; signal: string; available: boolean }[]>([]);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    // Fetch live beacon configuration
    api
      .getBeacon()
      .then((data) => {
        if (data.success && data.beacon) {
          setPairedDevice(data.beacon.device_name || 'ESP32-S3');
          setMacAddress(data.beacon.mac_address || 'C7:3A:5B:12:4E:9F');
          setBatteryPercent(data.beacon.battery_percent || 88);
        }
      })
      .catch(() => {});
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
        setStatusMessage('Bluetooth unavailable — no nearby devices found.');
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
      {/* Header */}
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

      {/* Title Block */}
      <div>
        <h1 className="text-xl font-black text-[#0B3C85] tracking-tight">
          Register / Pair Beacon
        </h1>
        <p className="text-xs text-slate-500 mt-1 leading-relaxed">
          Scan for nearby EchoSOS beacons and register your device for emergency alerts.
        </p>
      </div>

      {/* Status Feedback Toast/Banner */}
      {statusMessage && (
        <div className="p-2.5 rounded-xl bg-blue-50 border border-blue-200 text-xs font-semibold text-[#0B3C85] flex items-center justify-between animate-in fade-in duration-300">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
            <span>{statusMessage}</span>
          </div>
        </div>
      )}

      {/* Active Device Card */}
      <div className="bg-gradient-to-br from-blue-50/90 to-blue-100/50 border border-blue-200/80 rounded-2xl p-4 shadow-sm relative overflow-hidden">
        <div className="flex items-center justify-between relative z-10">
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#0B3C85]/80">
              Your Beacon
            </span>
            <h3 className="text-base font-black text-[#0F172A] flex items-center gap-2">
              <span>{pairedDevice} • BLE</span>
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              MAC: {macAddress} • {batteryPercent}% Battery
            </p>
          </div>

          <div className="flex flex-col items-end space-y-2">
            <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-300/60 text-emerald-700 text-[11px] font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Ready to Pair</span>
            </div>
          </div>
        </div>

        {/* Hardware Radar Rings Visual */}
        <div className="relative mt-4 pt-2 pb-1 flex items-center justify-center">
          <div className="relative flex items-center justify-center">
            {/* Radar Wave 1 */}
            <div className="absolute w-24 h-24 rounded-full border border-blue-300/60 animate-ping opacity-40" />
            {/* Radar Wave 2 */}
            <div className="w-20 h-20 rounded-full border-2 border-blue-400/40 bg-white/70 flex items-center justify-center shadow-xs">
              {/* Inner Chip */}
              <div className="w-12 h-12 rounded-xl bg-[#0B3C85] text-white flex items-center justify-center shadow-md">
                <Cpu className="w-6 h-6 animate-pulse" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Scan Action: Full-width Primary Navy Button */}
      <Button
        onClick={handleScan}
        disabled={isScanning}
        className="w-full bg-[#0B3C85] hover:bg-[#082E66] text-white flex items-center justify-center gap-2 font-bold shadow-md shadow-[#0B3C85]/20"
      >
        <Radio className={`w-4 h-4 ${isScanning ? 'animate-spin' : ''}`} />
        <span>{isScanning ? 'Scanning for Beacons...' : 'Scan for Nearby Devices'}</span>
      </Button>

      {/* Nearby Devices List */}
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

      {/* Guide Card: How to register your beacon? */}
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
