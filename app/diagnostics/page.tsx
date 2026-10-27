'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Bluetooth,
  MapPin,
  BatteryLow,
} from 'lucide-react';
import {
  ArrowLeft,
  Loader2,
  AlertTriangle,
} from 'lucide-react';
import { EchoLogo } from '@/components/ui/echo-logo';
import * as api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export function DiagnosticsScreen() {
  const [results, setResults] = useState<{ name: string; status: 'pending' | 'pass' | 'fail'; detail: string }[]>([]);
  const [isTesting, setIsTesting] = useState(false);

  useEffect(() => {
    setResults([
      { name: 'BLE Scanner', status: 'pending', detail: 'Not tested' },
      { name: 'Backend Connectivity', status: 'pending', detail: 'Not tested' },
      { name: 'GPS Location', status: 'pending', detail: 'Not tested' },
    ]);
  }, []);

  const runTests = async () => {
    setIsTesting(true);

    try {
      const { BackgroundBLEScanner } = await import('@/lib/ble-background-scanner');
      const scanner = new BackgroundBLEScanner();
      await scanner.requestPermissions();
      const available = await scanner.isAvailable();
      setResults((prev) =>
        prev.map((r) =>
          r.name === 'BLE Scanner'
            ? { ...r, status: available ? 'pass' : 'fail', detail: available ? 'BLE available' : 'BLE unavailable' }
            : r
        )
      );
    } catch (err) {
      setResults((prev) =>
        prev.map((r) =>
          r.name === 'BLE Scanner'
            ? { ...r, status: 'fail', detail: 'BLE error' }
            : r
        )
      );
    }

    try {
      const data = await api.getMe();
      setResults((prev) =>
        prev.map((r) =>
          r.name === 'Backend Connectivity'
            ? {
                ...r,
                status: data.authenticated ? 'pass' : 'fail',
                detail: data.authenticated ? 'Connected to Convex' : 'Not authenticated',
              }
            : r
        )
      );
    } catch {
      setResults((prev) =>
        prev.map((r) =>
          r.name === 'Backend Connectivity'
            ? { ...r, status: 'fail', detail: 'Connection failed' }
            : r
        )
      );
    }

    try {
      if (typeof navigator !== 'undefined' && navigator.geolocation) {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000 });
        });
        setResults((prev) =>
          prev.map((r) =>
            r.name === 'GPS Location'
              ? {
                  ...r,
                  status: 'pass',
                  detail: `Lat ${pos.coords.latitude.toFixed(4)}, Lng ${pos.coords.longitude.toFixed(4)}`,
                }
              : r
          )
        );
      } else {
        setResults((prev) =>
          prev.map((r) =>
            r.name === 'GPS Location' ? { ...r, status: 'fail', detail: 'GPS not available' } : r
          )
        );
      }
    } catch {
      setResults((prev) =>
        prev.map((r) =>
          r.name === 'GPS Location' ? { ...r, status: 'fail', detail: 'GPS error' } : r
        )
      );
    }

    setIsTesting(false);
  };

  return (
    <div className="flex flex-col flex-1 w-full bg-[#F4F8FF] px-4 py-4 overflow-y-auto no-scrollbar pb-16">
      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => window.history.back()}
            className="p-1.5 rounded-full bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <EchoLogo size="sm" inline={true} />
        </div>
      </div>

      <div>
        <h1 className="text-xl font-black text-[#0B3C85] tracking-tight">
          Diagnostics & Test Mode
        </h1>
        <p className="text-xs text-slate-500 mt-1 leading-relaxed">
          Test BLE scanning, backend connectivity, and GPS without triggering a real SOS.
        </p>
      </div>

      <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm space-y-3">
        <div className="flex items-center justify-between py-1">
          <div className="flex items-center space-x-2">
            <Bluetooth className="w-4 h-4 text-[#0B3C85]" />
            <div>
              <h4 className="text-xs font-bold text-[#0F172A]">BLE Scanner</h4>
              <p className="text-[10px] text-slate-500 font-medium">
                Scan for EchoSOS beacons without triggering SOS
              </p>
            </div>
          </div>
          <Badge className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
            results.find((r) => r.name === 'BLE Scanner')?.status === 'pass'
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              : results.find((r) => r.name === 'BLE Scanner')?.status === 'fail'
                ? 'bg-red-50 text-red-600 border border-red-200'
                : 'bg-slate-50 text-slate-500 border border-slate-200'
          }`}>
            {results.find((r) => r.name === 'BLE Scanner')?.status === 'pass'
              ? 'PASS'
              : results.find((r) => r.name === 'BLE Scanner')?.status === 'fail'
                ? 'FAIL'
                : 'PENDING'}
          </Badge>
        </div>
        <p className="text-[10px] text-slate-400 font-medium">
          {results.find((r) => r.name === 'BLE Scanner')?.detail || 'Tap Test to scan'}
        </p>
      </div>

      <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm space-y-3">
        <div className="flex items-center justify-between py-1">
          <div className="flex items-center space-x-2">
            <MapPin className="w-4 h-4 text-[#0B3C85]" />
            <div>
              <h4 className="text-xs font-bold text-[#0F172A]">Backend Connectivity</h4>
              <p className="text-[10px] text-slate-500 font-medium">
                Test connection to Convex backend
              </p>
            </div>
          </div>
          <Badge className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
            results.find((r) => r.name === 'Backend Connectivity')?.status === 'pass'
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              : results.find((r) => r.name === 'Backend Connectivity')?.status === 'fail'
                ? 'bg-red-50 text-red-600 border border-red-200'
                : 'bg-slate-50 text-slate-500 border border-slate-200'
          }`}>
            {results.find((r) => r.name === 'Backend Connectivity')?.status === 'pass'
              ? 'PASS'
              : results.find((r) => r.name === 'Backend Connectivity')?.status === 'fail'
                ? 'FAIL'
                : 'PENDING'}
          </Badge>
        </div>
        <p className="text-[10px] text-slate-400 font-medium">
          {results.find((r) => r.name === 'Backend Connectivity')?.detail || 'Tap Test to connect'}
        </p>
      </div>

      <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm space-y-3">
        <div className="flex items-center justify-between py-1">
          <div className="flex items-center space-x-2">
            <BatteryLow className="w-4 h-4 text-[#0B3C85]" />
            <div>
              <h4 className="text-xs font-bold text-[#0F172A]">GPS Location</h4>
              <p className="text-[10px] text-slate-500 font-medium">
                Test GPS location access
              </p>
            </div>
          </div>
          <Badge className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
            results.find((r) => r.name === 'GPS Location')?.status === 'pass'
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              : results.find((r) => r.name === 'GPS Location')?.status === 'fail'
                ? 'bg-red-50 text-red-600 border border-red-200'
                : 'bg-slate-50 text-slate-500 border border-slate-200'
          }`}>
            {results.find((r) => r.name === 'GPS Location')?.status === 'pass'
              ? 'PASS'
              : results.find((r) => r.name === 'GPS Location')?.status === 'fail'
                ? 'FAIL'
                : 'PENDING'}
          </Badge>
        </div>
        <p className="text-[10px] text-slate-400 font-medium">
          {results.find((r) => r.name === 'GPS Location')?.detail || 'Tap Test to get location'}
        </p>
      </div>

      <Button
        type="button"
        className="w-full bg-[#0B3C85] hover:bg-[#082E66] text-white font-bold py-2.5 rounded-xl shadow-md shadow-[#0B3C85]/20"
        onClick={runTests}
        disabled={isTesting}
      >
        {isTesting ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin text-white" />
            <span>Running Tests...</span>
          </>
        ) : (
          <>
            <AlertTriangle className="w-4 h-4" />
            <span>Run Diagnostics</span>
          </>
        )}
      </Button>
    </div>
  );
}
