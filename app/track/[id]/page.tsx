'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { 
  AlertTriangle, 
  MapPin, 
  Phone, 
  ExternalLink, 
  ShieldCheck, 
  Clock, 
  Radio, 
  ArrowLeft,
  Share2,
  CheckCircle2
} from 'lucide-react';
import { EchoLogo } from '@/components/ui/echo-logo';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

export default function EmergencyTrackPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const [alertData, setAlertData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/alert')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setAlertData(data.alertState);
        }
      })
      .finally(() => setLoading(false));
  }, [resolvedParams]);

  const latitude = alertData?.latitude || 10.8247;
  const longitude = alertData?.longitude || 78.6956;
  const detectedAt = alertData?.detectedAt || '10:24 AM';

  return (
    <div className="w-full flex-1 flex justify-center items-start">
      <div className="w-full max-w-md min-h-screen bg-[#F4F8FF] flex flex-col relative sm:shadow-xl sm:border sm:border-slate-200/80 sm:rounded-2xl overflow-hidden pb-10">
        {/* Urgent Header */}
        <div className="bg-[#E52E3D] text-white p-5 rounded-b-3xl shadow-lg relative">
          <div className="flex items-center justify-between pb-3">
            <Link
              href="/"
              className="p-1 rounded-full bg-white/20 text-white hover:bg-white/30 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div className="bg-white px-2 py-0.5 rounded-full">
              <EchoLogo size="sm" inline={true} />
            </div>
            <span className="text-[10px] font-bold bg-white/20 px-2 py-0.5 rounded-full uppercase tracking-wider animate-pulse">
              LIVE DISPATCH
            </span>
          </div>

          <div className="text-center mt-2 space-y-1">
            <div className="w-12 h-12 rounded-full bg-white text-[#E52E3D] mx-auto flex items-center justify-center shadow-md animate-bounce mb-2">
              <AlertTriangle className="w-6 h-6 stroke-[2.5]" />
            </div>
            <h1 className="text-xl font-black">Emergency Distress Active</h1>
            <p className="text-xs text-white/90">
              Live broadcast from Nithish&apos;s ESP32-S3 Safety Beacon (Alert #{resolvedParams.id})
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 space-y-3.5 -mt-2 relative z-10">
          {/* Victim Contact Card */}
          <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Avatar className="w-12 h-12 ring-2 ring-red-100">
                <AvatarFallback className="bg-[#0B3C85] text-white font-bold">
                  NK
                </AvatarFallback>
              </Avatar>
              <div>
                <h3 className="text-sm font-black text-[#0F172A]">Nithish</h3>
                <span className="text-xs text-slate-500 font-mono">+91 98765 43210</span>
                <span className="text-[10px] bg-red-50 text-[#E52E3D] px-1.5 py-0.2 rounded font-bold block mt-0.5 w-fit">
                  Distress Broadcasted
                </span>
              </div>
            </div>

            <Button asChild size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-9">
              <a href="tel:+919876543210">
                <Phone className="w-3.5 h-3.5 mr-1 fill-white" />
                Call
              </a>
            </Button>
          </div>

          {/* Map & Coordinates */}
          <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="p-1.5 rounded-lg bg-red-50 text-[#E52E3D]">
                  <MapPin className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[#0F172A]">GPS Location</h4>
                  <p className="text-[11px] font-mono text-slate-500">
                    {latitude}° N, {longitude}° E
                  </p>
                </div>
              </div>

              <a
                href={`https://maps.google.com/?q=${latitude},${longitude}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[11px] font-bold text-[#0B3C85] bg-blue-50 px-2.5 py-1 rounded-lg hover:underline"
              >
                <span>Navigate</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            {/* Radar Simulation */}
            <div className="relative w-full h-40 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center">
              <div className="absolute inset-0 bg-[radial-gradient(#94a3b8_1px,transparent_1px)] [background-size:16px_16px] opacity-60" />
              <div className="absolute w-24 h-24 rounded-full bg-[#E52E3D]/20 animate-ping" />
              <div className="absolute w-14 h-14 rounded-full bg-[#E52E3D]/30 animate-pulse" />
              <div className="relative z-10 flex flex-col items-center">
                <div className="w-8 h-8 rounded-full bg-[#E52E3D] text-white flex items-center justify-center shadow-xl border-2 border-white">
                  <MapPin className="w-4 h-4" />
                </div>
                <div className="mt-1 px-2.5 py-0.5 bg-slate-900 text-white rounded-full text-[10px] font-bold shadow-md">
                  Active SOS Pin
                </div>
              </div>
            </div>
          </div>

          {/* Emergency Hotline Buttons */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <Button asChild className="bg-[#E52E3D] hover:bg-[#c41c2a] text-white font-bold h-12 shadow-md">
              <a href="tel:112">
                <Phone className="w-4 h-4 mr-1.5 fill-white" />
                Police (112)
              </a>
            </Button>
            <Button asChild variant="outline" className="border-2 border-[#0B3C85] text-[#0B3C85] bg-white font-bold h-12">
              <a href="tel:108">
                <Phone className="w-4 h-4 mr-1.5" />
                Ambulance (108)
              </a>
            </Button>
          </div>

          <p className="text-[11px] text-center text-slate-400 mt-2">
            Dispatched via EchoSOS High-Speed Hardware Mesh. Telemetry updated every 5 seconds.
          </p>
        </div>
      </div>
    </div>
  );
}
