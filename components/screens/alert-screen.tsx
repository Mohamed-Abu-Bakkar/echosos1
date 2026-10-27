'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  AlertTriangle, 
  MapPin, 
  ExternalLink, 
  Phone, 
  XCircle, 
  CheckCircle2, 
  Clock, 
  Radio, 
  ShieldAlert,
  ArrowLeft,
  Loader2 
} from 'lucide-react';
import { EchoLogo } from '@/components/ui/echo-logo';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { EmergencyContact } from '@/lib/types';
import { BackgroundBLEScanner } from '@/lib/ble-background-scanner';
import * as api from '@/lib/api';

interface AlertScreenProps {
  onNavigate?: (screen: string) => void;
  onCancelAlert?: () => void;
}

export function AlertScreen({ onNavigate, onCancelAlert }: AlertScreenProps) {
  const router = useRouter();
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [telemetry, setTelemetry] = useState({
    beaconId: '',
    eventId: '',
    detectedAt: '',
    signalDbm: '',
    latitude: null as number | null,
    longitude: null as number | null,
  });

  useEffect(() => {
    // Load live telemetry from backend
    api
      .getAlert()
      .then((data) => {
        if (data.success && data.alertState) {
          const a = data.alertState;
          setTelemetry({
            beaconId: a.beacon_id || '',
            eventId: a.event_id || '',
            detectedAt: a.detected_at || '',
            signalDbm: a.signal_dbm || '',
            latitude: typeof a.latitude === 'number' ? a.latitude : null,
            longitude: typeof a.longitude === 'number' ? a.longitude : null,
          });
        }
      })
      .catch(() => {});

    // Load contacts from backend
    api
      .getContacts()
      .then((data) => {
        if (data.success && data.contacts) {
          setContacts(data.contacts);
        }
      })
      .catch(() => {});
  }, []);

  const handleCancel = async () => {
    if (confirm('Are you sure you want to cancel the emergency alert? A false alert notification will be sent to your contacts.')) {
      setIsCancelling(true);
      setCancelError(null);
      try {
        let bleVerified = false;
        let bleDeviceId: string | undefined;

        // Best-effort GATT check: connect and confirm the event ID on the beacon
        // before the backend cancel. Skipped on web / when no device is found.
        if (telemetry.eventId) {
          try {
            const scanner = new BackgroundBLEScanner();
            if (await scanner.isAvailable()) {
              await scanner.requestPermissions();
              const emergency = scanner.getEmergencyBeacon();
              if (emergency?.id) {
                bleDeviceId = emergency.id;
                const verification = await scanner.verifyEventForCancel(
                  emergency.id,
                  telemetry.eventId
                );
                if (verification.reachable && !verification.verified) {
                  setCancelError(verification.message);
                  return;
                }
                bleVerified = verification.verified;
              }
            }
          } catch {
            // GATT optional — fall through to backend cancel with known event id
          }
        }

        const data = await api.cancelAlert({
          eventId: telemetry.eventId || undefined,
          beaconId: telemetry.beaconId,
          bleVerified,
        });
        if (!data.success) {
          setCancelError(data.message || 'Failed to cancel alert.');
          return;
        }
      } catch (err) {
        console.error('Cancel alert error:', err);
        setCancelError('Failed to cancel alert.');
        return;
      } finally {
        setIsCancelling(false);
      }

      if (onCancelAlert) {
        onCancelAlert();
      } else if (onNavigate) {
        onNavigate('home');
      } else {
        router.push('/');
      }
    }
  };

  return (
    <div className="flex flex-col flex-1 min-h-screen w-full bg-[#F4F8FF] overflow-y-auto no-scrollbar pb-10">
      {/* Emergency Banner (Top): Solid Vibrant Red Header */}
      <div className="bg-[#E52E3D] text-white px-5 pt-4 pb-6 rounded-b-[32px] shadow-lg relative overflow-hidden select-none shrink-0">
        {/* Subtle background emergency pulse waves */}
        <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full bg-white/10 animate-ping opacity-25 pointer-events-none" />
        
        {/* Top bar inside red section */}
        <div className="flex items-center justify-between pb-4">
          <div className="flex items-center space-x-2">
            {onNavigate ? (
              <button
                onClick={() => onNavigate('home')}
                className="p-1 rounded-full bg-white/20 text-white hover:bg-white/30 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            ) : (
              <Link
                href="/"
                className="p-1 rounded-full bg-white/20 text-white hover:bg-white/30 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
              </Link>
            )}
            <div className="bg-white px-2 py-0.5 rounded-full">
              <EchoLogo size="sm" inline={true} />
            </div>
          </div>
          <div className="flex items-center space-x-1.5 px-3 py-1 rounded-full bg-white/20 border border-white/30 text-white text-[11px] font-bold animate-pulse">
            <span className="w-2 h-2 rounded-full bg-white" />
            <span>Emergency Alert</span>
          </div>
        </div>

        {/* Big Alert Icon & Heading */}
        <div className="flex flex-col items-center text-center mt-2 space-y-2">
          <div className="w-16 h-16 rounded-full bg-white text-[#E52E3D] flex items-center justify-center shadow-lg animate-bounce">
            <AlertTriangle className="w-8 h-8 stroke-[2.5]" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white drop-shadow-sm">
            SOS Detected!
          </h1>
          <p className="text-xs text-white/90 max-w-xs leading-relaxed font-medium">
            An emergency signal has been received from your beacon. Help is on the way.
          </p>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="p-4 space-y-3.5 -mt-3 relative z-10">
        {/* Beacon Telemetry Card (4 Columns) */}
        <div className="bg-white rounded-2xl p-3.5 border border-slate-100 shadow-sm grid grid-cols-4 divide-x divide-slate-100 text-center">
          <div className="px-1.5">
            <span className="text-[10px] uppercase font-semibold text-slate-400 block tracking-wider">
              Beacon ID
            </span>
            <span className="text-[11px] font-black text-[#0F172A] block mt-1 truncate" title={telemetry.beaconId}>
              {telemetry.beaconId}
            </span>
          </div>
          <div className="px-1.5">
            <span className="text-[10px] uppercase font-semibold text-slate-400 block tracking-wider">
              Event ID
            </span>
            <span className="text-[11px] font-black text-[#E52E3D] block mt-1 font-mono" title={telemetry.eventId || undefined}>
              {telemetry.eventId || '—'}
            </span>
          </div>
          <div className="px-1.5">
            <span className="text-[10px] uppercase font-semibold text-slate-400 block tracking-wider">
              Detected
            </span>
            <span className="text-[11px] font-black text-[#0B3C85] block mt-1">
              {telemetry.detectedAt}
            </span>
          </div>
          <div className="px-1.5">
            <span className="text-[10px] uppercase font-semibold text-slate-400 block tracking-wider">
              Signal
            </span>
            <span className="text-[11px] font-black text-emerald-600 block mt-1 truncate">
              {telemetry.signalDbm}
            </span>
          </div>
        </div>

        {/* Live Location Card */}
        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="p-1.5 rounded-lg bg-red-50 text-[#E52E3D]">
                <MapPin className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-[#0F172A]">Live Location</h3>
                <span className="text-[11px] font-mono font-medium text-slate-500">
                  {telemetry.latitude !== null ? `${telemetry.latitude.toFixed(4)}° N` : '—'}{' '}
                  {telemetry.longitude !== null ? `${telemetry.longitude.toFixed(4)}° E` : '—'}
                </span>
              </div>
            </div>
            <a
              href={`https://maps.google.com/?q=${telemetry.latitude !== null ? telemetry.latitude : ''},${telemetry.longitude !== null ? telemetry.longitude : ''}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[11px] font-bold text-[#0B3C85] hover:underline bg-blue-50 px-2 py-1 rounded-lg"
            >
              <span>Open in Maps</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          {/* Map View Preview Box with Pulsing Radius */}
          <div className="relative w-full h-32 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center">
            {/* Map Background Grid Simulation */}
            <div className="absolute inset-0 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:16px_16px] opacity-70" />
            
            {/* Roads Simulation */}
            <div className="absolute w-full h-1.5 bg-slate-300 top-1/2 -translate-y-1/2" />
            <div className="absolute h-full w-1.5 bg-slate-300 left-1/3" />
            <div className="absolute h-full w-1 bg-amber-200 left-2/3 rotate-12" />

            {/* Pulsing Radius around pin */}
            <div className="absolute w-20 h-20 rounded-full bg-[#E52E3D]/20 animate-ping" />
            <div className="absolute w-12 h-12 rounded-full bg-[#E52E3D]/30 animate-pulse" />

            {/* Red Pin Marker */}
            <div className="relative z-10 flex flex-col items-center">
              <div className="w-6 h-6 rounded-full bg-[#E52E3D] text-white flex items-center justify-center shadow-lg border-2 border-white">
                <MapPin className="w-3.5 h-3.5" />
              </div>
              <div className="mt-1 px-2 py-0.5 bg-slate-900/90 text-white rounded text-[9px] font-bold shadow-md whitespace-nowrap">
                Emergency Location
              </div>
            </div>
          </div>
        </div>

        {/* Contact Dispatch Card */}
        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold text-[#0F172A]">
                Emergency Contacts
              </h3>
              <p className="text-[11px] text-slate-400 font-medium">
                Alerts sent to {contacts.length} contacts
              </p>
            </div>
            <div className="flex items-center space-x-1 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-bold">
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              <span>Message Sent</span>
            </div>
          </div>

          {/* Contact Pills */}
          <div className="grid grid-cols-3 gap-2">
            {contacts.slice(0, 3).map((contact) => (
              <div
                key={contact.id}
                className="flex flex-col items-center text-center p-2 rounded-xl bg-[#F4F8FF] border border-blue-100/80 relative"
              >
                <div className="relative">
                  <Avatar className="w-9 h-9">
                    <AvatarFallback className="bg-[#0B3C85] text-white text-[10px] font-bold">
                      {contact.initials || 'EC'}
                    </AvatarFallback>
                  </Avatar>
                  <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-500 text-white flex items-center justify-center border-2 border-white">
                    <CheckCircle2 className="w-2.5 h-2.5" />
                  </span>
                </div>
                <span className="text-[11px] font-bold text-[#0F172A] mt-1.5 truncate w-full">
                  {contact.relationship}
                </span>
                <span className="text-[9px] text-slate-400 font-medium">
                  Delivered
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Actions */}
        <div className="pt-2 space-y-2.5 pb-2">
          {/* Solid Red Button: Call Emergency Services */}
          <Button
            asChild
            className="w-full bg-[#E52E3D] hover:bg-[#c41c2a] text-white flex items-center justify-center gap-2 font-bold shadow-lg shadow-[#E52E3D]/30"
          >
            <a href="tel:112">
              <Phone className="w-4 h-4 fill-white" />
              <span>Call Emergency Services (112)</span>
            </a>
          </Button>

          {/* Outlined Button: Cancel Alert with backend logic */}
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            disabled={isCancelling}
            className="w-full border-2 border-slate-300 text-slate-700 bg-white hover:bg-slate-50 flex items-center justify-center gap-2 font-bold"
          >
            {isCancelling ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-slate-500" />
                <span>Verifying event &amp; cancelling...</span>
              </>
            ) : (
              <>
                <XCircle className="w-4 h-4 text-slate-500" />
                <span>Cancel Alert</span>
              </>
            )}
          </Button>

          {cancelError && (
            <p className="text-[11px] text-center text-red-600 leading-tight font-semibold">
              {cancelError}
            </p>
          )}

          {/* Warning text */}
          <p className="text-[11px] text-center text-slate-400 leading-tight">
            Only cancel if it is a false alert. This will notify your contacts and is bound to event{' '}
            <span className="font-mono font-semibold">{telemetry.eventId || '—'}</span>.
          </p>
        </div>
      </div>
    </div>
  );
}
