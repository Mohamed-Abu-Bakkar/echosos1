'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Plus,
  MoreVertical,
  Edit3,
  Trash2,
  Camera,
  Info,
  Check,
  X,
  Phone,
  User,
  ShieldAlert,
  Loader2,
  Pencil,
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

interface ContactsScreenProps {
  onNavigate?: (screen: string) => void;
}

export function ContactsScreen({ onNavigate }: ContactsScreenProps) {
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newRelationship, setNewRelationship] = useState('Mother');
  const [isPrimary, setIsPrimary] = useState(false);

  const relationships = [
    'Mother',
    'Father',
    'Brother',
    'Sister',
    'Spouse',
    'Friend',
    'Doctor',
    'Emergency Services',
  ];

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
    setSaveError(null);
    setIsSheetOpen(true);
  };

  const handleOpenEditSheet = (contact: EmergencyContact) => {
    setEditingId(contact.id);
    setNewName(contact.name);
    setNewPhone(contact.phone);
    setNewRelationship(contact.relationship);
    setIsPrimary(contact.is_primary);
    setSaveError(null);
    setIsSheetOpen(true);
  };

  const handleSaveContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newPhone) return;
    setIsSaving(true);
    setSaveError(null);

    try {
      const data = editingId
        ? await api.updateContact(String(editingId), {
            name: newName,
            phone: newPhone,
            relationship: newRelationship,
            is_primary: isPrimary,
          })
        : await api.createContact({
            name: newName,
            phone: newPhone,
            relationship: newRelationship,
            is_primary: isPrimary,
          });

      if (!data.success) {
        setSaveError(data.message || 'Could not save the contact. Try again.');
        return;
      }

      await fetchContacts();
      setIsSheetOpen(false);
    } catch (err) {
      console.error('Save contact error:', err);
      setSaveError('Could not save the contact. Check your connection and try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteContact = async (id: string) => {
    if (confirm('Are you sure you want to remove this emergency contact?')) {
      try {
        const res = await api.deleteContact(id);
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

        <div className="flex items-center space-x-2">
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
      </div>

      <div>
        <h1 className="text-xl font-black text-[#0B3C85] tracking-tight">
          Emergency Contacts
        </h1>
      </div>

      <div className="space-y-2.5">
        {contacts.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 border border-slate-100 shadow-sm flex flex-col items-center justify-center text-center">
            <div className="w-12 h-12 rounded-full bg-blue-50 text-[#0B3C85] flex items-center justify-center mb-3">
              <User className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-black text-[#0F172A]">
              No contacts yet
            </h3>
            <p className="text-xs text-slate-500">
              No contacts configured yet. Add your emergency contacts.
            </p>
            <Button onClick={handleOpenAddSheet} className="mt-3">
              Add Contact
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {contacts.map((contact) => (
              <div key={contact.id} className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Avatar className="w-9 h-9">
                    <AvatarFallback className="bg-[#0B3C85] text-white text-[10px] font-bold">
                      {contact.initials || 'EC'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h4 className="text-sm font-black text-[#0F172A]">
                      {contact.name}
                    </h4>
                    <span className="text-[11px] text-slate-500 font-mono block mt-0.5">
                      {contact.phone}
                    </span>
                  </div>
                  <div className="mt-2">
                    <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">
                      {contact.relationship}
                    </span>
                    {contact.is_primary && (
                      <span className="text-[10px] bg-emerald-50 text-emerald-700 px-1.5 py-0.2 rounded font-bold block mt-0.5 w-fit">
                        Primary
                      </span>
                    )}
                  </div>
                </div>
                <div className="mt-2 flex flex-col">
                  <Button
                    size="sm"
                    onClick={() => handleOpenEditSheet(contact)}
                    className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                    aria-label="Edit contact"
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDeleteContact(contact.id)}
                    className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 hover:text-red-600 transition-colors border-0"
                    aria-label="Delete contact"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>{editingId ? 'Edit Contact' : 'Add Contact'}</SheetTitle>
            <SheetDescription>
              Add or edit an emergency contact.
            </SheetDescription>
          </SheetHeader>
          <form onSubmit={handleSaveContact} className="space-y-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Name
                </label>
                <Input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Full Name (e.g. Maya Sharma)"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Phone
                </label>
                <Input
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  placeholder="+91 98765 00000"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Relationship
                </label>
                <select
                  value={newRelationship}
                  onChange={(e) => setNewRelationship(e.target.value)}
                  className="w-full border border-slate-200 rounded-md px-2 py-1 text-xs bg-white"
                >
                  {relationships.map((rel) => (
                    <option key={rel} value={rel}>
                      {rel}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={isPrimary}
                  onChange={(e) => setIsPrimary(e.target.checked)}
                  className="w-4 h-4 rounded border border-slate-300 text-[#0B3C85] focus:ring-[#0B3C85] focus:ring-2"
                />
                <label className="text-xs font-medium text-slate-700">
                  Primary contact
                </label>
              </div>
            </div>

            {saveError && (
              <p className="text-[11px] text-center text-red-600 leading-tight font-semibold">
                {saveError}
              </p>
            )}
            <Button type="submit" className="w-full" disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save Contact'}
            </Button>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  );
}

export default function ContactsPage() {
  return <ContactsScreen />;
}
