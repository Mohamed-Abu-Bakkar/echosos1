import { useRouter } from "next/navigation";
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  ArrowLeft, 
  MoreVertical, 
  Plus, 
  Pencil, 
  Trash2, 
  Camera, 
  Info, 
  Check, 
  X,
  Phone,
  User,
  ShieldAlert,
  Loader2 
} from 'lucide-react';
import { EchoLogo } from '@/components/ui/echo-logo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Switch } from '@/components/ui/switch';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { EmergencyContact } from '@/lib/types';
import * as api from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

interface ContactsScreenProps {
  onNavigate?: (screen: string) => void;
}

export function ContactsScreen({ onNavigate }: ContactsScreenProps) {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);

  // Route guard: require an active session
  useEffect(() => {
    if (!loading && !user) router.push('/login');
  }, [loading, user, router]);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  // Form State
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newRelationship, setNewRelationship] = useState('Mother');
  const [isPrimary, setIsPrimary] = useState(false);

  const relationships = ['Mother', 'Father', 'Brother', 'Sister', 'Spouse', 'Friend', 'Doctor', 'Emergency Services'];

  const fetchContacts = async () => {
    try {
      const data = await api.getContacts();
      if (data.success && data.contacts) {
        setContacts(data.contacts);
      }
    } catch (err) {
      console.error('Failed to load contacts:', err);
    }
  };

  useEffect(() => {
    fetchContacts();
  }, []);

  const handleOpenAddSheet = () => {
    setEditingId(null);
    setNewName('');
    setNewPhone('');
    setNewRelationship('Mother');
    setIsPrimary(false);
    setIsSheetOpen(true);
  };

  const handleOpenEditSheet = (contact: EmergencyContact) => {
    setEditingId(contact.id);
    setNewName(contact.name);
    setNewPhone(contact.phone);
    setNewRelationship(contact.relationship);
    setIsPrimary(contact.is_primary);
    setIsSheetOpen(true);
  };

  const handleSaveContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newPhone) return;
    setIsSaving(true);

    try {
      if (editingId) {
        // Edit existing contact
        const data = await api.updateContact(String(editingId), {
          name: newName,
          phone: newPhone,
          relationship: newRelationship,
          is_primary: isPrimary,
        });
        if (data.success) {
          await fetchContacts();
        }
      } else {
        // Add new contact
        const data = await api.createContact({
          name: newName,
          phone: newPhone,
          relationship: newRelationship,
          is_primary: isPrimary,
        });
        if (data.success) {
          await fetchContacts();
        }
      }
      setIsSheetOpen(false);
    } catch (err) {
      console.error('Save contact error:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteContact = async (id: number) => {
    if (confirm('Are you sure you want to remove this emergency contact?')) {
      try {
        const res = await api.deleteContact(String(id));
        if (res.success) {
          setContacts((prev) => prev.filter((c) => c.id !== id));
        }
      } catch (err) {
        console.error('Delete contact error:', err);
      }
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

        {/* 3-Dot Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="p-1.5 rounded-full bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors">
              <MoreVertical className="w-4 h-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleOpenAddSheet}>
              + Add New Contact
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                const blob = new Blob([JSON.stringify(contacts, null, 2)], {
                  type: 'application/json',
                });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'echosos-contacts.json';
                a.click();
                URL.revokeObjectURL(url);
              }}
            >
              Export Contacts
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Header Text Block */}
      <div>
        <h1 className="text-xl font-black text-[#0B3C85] tracking-tight">
          Emergency Contacts
        </h1>
        <p className="text-xs text-slate-500 mt-1 leading-relaxed">
          Add trusted people who will be notified when an SOS alert is triggered.
        </p>
      </div>

      {/* Primary Blue Button: + Add New Contact */}
      <Button
        onClick={handleOpenAddSheet}
        className="w-full bg-[#0B3C85] hover:bg-[#082E66] text-white flex items-center justify-center gap-2 font-bold shadow-md shadow-[#0B3C85]/20"
      >
        <Plus className="w-4 h-4 stroke-[2.5]" />
        <span>Add New Contact</span>
      </Button>

      {/* Contact Cards List */}
      <div className="space-y-3">
        {contacts.map((contact) => (
          <div
            key={contact.id}
            className="bg-white rounded-2xl p-3.5 border border-slate-100 shadow-sm flex items-center justify-between hover:border-blue-200 transition-all"
          >
            <div className="flex items-center space-x-3 min-w-0">
              <div className="relative shrink-0">
                <Avatar className="w-11 h-11 ring-2 ring-blue-50">
                  <AvatarFallback className="bg-[#0B3C85] text-white font-bold text-xs">
                    {contact.initials || 'EC'}
                  </AvatarFallback>
                </Avatar>
                {contact.is_primary && (
                  <span className="absolute -top-1 -left-1 w-3.5 h-3.5 rounded-full bg-[#E52E3D] border-2 border-white" />
                )}
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs font-bold text-[#0F172A] truncate">
                    {contact.name}
                  </span>
                  {contact.is_primary && (
                    <span className="text-[9px] bg-red-50 text-[#E52E3D] px-1.5 py-0.2 rounded-full font-bold border border-red-200">
                      Primary
                    </span>
                  )}
                </div>
                <span className="text-[11px] font-semibold text-slate-500 block mt-0.5">
                  {contact.relationship}
                </span>
                <span className="text-[11px] text-slate-400 font-mono block">
                  {contact.phone}
                </span>
              </div>
            </div>

            {/* Action Buttons: Edit & Delete */}
            <div className="flex items-center space-x-1 shrink-0 ml-2">
              <button
                onClick={() => handleOpenEditSheet(contact)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-[#0B3C85] hover:bg-blue-50 transition-colors"
                title="Edit Contact"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => handleDeleteContact(contact.id)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-[#E52E3D] hover:bg-red-50 transition-colors"
                title="Delete Contact"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Bottom Notice: Blue Info Card */}
      <div className="bg-blue-50/80 border border-blue-200/60 rounded-2xl p-3.5 flex items-start space-x-3">
        <Info className="w-4 h-4 text-[#0B3C85] shrink-0 mt-0.5" />
        <p className="text-[11px] text-slate-600 leading-relaxed">
          <strong>Important:</strong> Please ensure your emergency contacts are aware they are added. In case of an emergency, live GPS coordinates and automated distress calls will be routed immediately.
        </p>
      </div>

      {/* Add / Edit Contact Drawer / Sheet (Shadcn UI Sheet Component) */}
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent side="bottom" className="p-0 overflow-hidden">
          {/* Dark Navy Header Bar */}
          <div className="bg-[#0B3C85] text-white p-4 flex items-center justify-between">
            <div>
              <SheetTitle>
                {editingId ? 'Edit Emergency Contact' : 'Add Emergency Contact'}
              </SheetTitle>
              <SheetDescription>
                {editingId
                  ? 'Update contact number or relationship.'
                  : 'Fill in details to register a trusted contact.'}
              </SheetDescription>
            </div>
            <button
              onClick={() => setIsSheetOpen(false)}
              className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Form Body */}
          <form onSubmit={handleSaveContact} className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
            {/* Photo Input: Circular Avatar Upload Placeholder */}
            <div className="flex flex-col items-center justify-center py-2">
              <div className="relative group cursor-pointer">
                <div className="w-20 h-20 rounded-full bg-slate-100 border-2 border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-400 group-hover:border-[#0B3C85] group-hover:text-[#0B3C85] transition-colors">
                  <Camera className="w-6 h-6 mb-1" />
                  <span className="text-[9px] font-bold">Add Photo</span>
                </div>
              </div>
              <span className="text-[11px] text-slate-400 mt-2 font-medium">
                Tap to choose a photo
              </span>
            </div>

            {/* Inputs: Name * */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-[#0F172A]">
                Name <span className="text-red-500">*</span>
              </label>
              <Input
                type="text"
                placeholder="Full Name (e.g. Maya Sharma)"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                required
              />
            </div>

            {/* Inputs: Phone Number * */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-[#0F172A]">
                Phone Number <span className="text-red-500">*</span>
              </label>
              <Input
                type="tel"
                placeholder="+91 98765 00000"
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                required
              />
            </div>

            {/* Relationship Select */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-[#0F172A]">
                Relationship
              </label>
              <select
                value={newRelationship}
                onChange={(e) => setNewRelationship(e.target.value)}
                className="w-full h-12 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#0B3C85]"
              >
                {relationships.map((rel) => (
                  <option key={rel} value={rel}>
                    {rel}
                  </option>
                ))}
              </select>
            </div>

            {/* Switch: Set as Primary Contact */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
              <div>
                <span className="text-xs font-bold text-[#0F172A] block">
                  Set as Primary Contact
                </span>
                <span className="text-[10px] text-slate-500 block">
                  Will be phoned first during distress
                </span>
              </div>
              <Switch checked={isPrimary} onCheckedChange={setIsPrimary} />
            </div>

            {/* Action: Solid Navy Save Contact Button */}
            <div className="pt-2">
              <Button
                type="submit"
                disabled={isSaving}
                className="w-full bg-[#0B3C85] hover:bg-[#082E66] text-white font-bold"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-1" />
                    <span>Saving Contact...</span>
                  </>
                ) : (
                  <span>{editingId ? 'Update Contact' : 'Save Contact'}</span>
                )}
              </Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  );
}
