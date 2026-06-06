'use client';

import { useState, useEffect } from 'react';
import { Search, Check } from 'lucide-react';
import type { Lang } from '@/lib/types';
import { ta } from '@/i18n/admin';
import { supabase } from '@/lib/supabase';

interface Location {
  id: string;
  name_en: string;
  name_ar: string | null;
  name_es: string | null;
  address: string;
  phone: string | null;
  hours_en: string | null;
  hours_ar: string | null;
  hours_es: string | null;
  halal_status: 'verified' | 'community-listed' | 'unverified';
  verified_by: string | null;
  verified_at: string | null;
  type: string;
  city_id: string;
}

interface LocationsAdminProps {
  lang: Lang;
  userId: string;
}

export function LocationsAdmin({ lang, userId }: LocationsAdminProps) {
  const [locations, setLocations] = useState<Location[]>([]);
  const [filteredLocations, setFilteredLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadLocations();
  }, []);

  useEffect(() => {
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      setFilteredLocations(
        locations.filter(
          (loc) =>
            loc.name_en.toLowerCase().includes(term) ||
            loc.name_ar?.toLowerCase().includes(term) ||
            loc.name_es?.toLowerCase().includes(term) ||
            loc.address.toLowerCase().includes(term)
        )
      );
    } else {
      setFilteredLocations(locations);
    }
  }, [searchTerm, locations]);

  async function loadLocations() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('locations')
        .select('*')
        .order('name_en');
      if (error) throw error;
      setLocations(data ?? []);
      setFilteredLocations(data ?? []);
    } catch (err) {
      console.error('Failed to load locations:', err);
    } finally {
      setLoading(false);
    }
  }

  async function updateLocation(id: string, updates: Partial<Location>) {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('locations')
        .update(updates)
        .eq('id', id);
      if (error) throw error;

      // Update local state
      setLocations((prev) =>
        prev.map((loc) => (loc.id === id ? { ...loc, ...updates } : loc))
      );
      setEditingId(null);
    } catch (err) {
      console.error('Failed to update location:', err);
      alert(ta.saveError[lang]);
    } finally {
      setSaving(false);
    }
  }

  async function markAsVerified(id: string) {
    await updateLocation(id, {
      halal_status: 'verified',
      verified_by: userId,
      verified_at: new Date().toISOString(),
    });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-stone-600">{ta.loading[lang]}</div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-stone-900 mb-4">{ta.locationsTitle[lang]}</h2>
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={20} />
          <input
            type="text"
            placeholder={ta.search[lang]}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-stone-200 rounded focus:outline-none focus-visible:ring-2 ring-teal-600 text-stone-900"
          />
        </div>
      </div>

      <div className="space-y-4">
        {filteredLocations.map((loc) => (
          <div key={loc.id} className="bg-white rounded-lg p-4 border border-stone-200">
            {editingId === loc.id ? (
              <LocationEditForm
                location={loc}
                lang={lang}
                saving={saving}
                onSave={(updates) => updateLocation(loc.id, updates)}
                onCancel={() => setEditingId(null)}
              />
            ) : (
              <LocationView
                location={loc}
                lang={lang}
                onEdit={() => setEditingId(loc.id)}
                onMarkVerified={() => markAsVerified(loc.id)}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function LocationView({
  location,
  lang,
  onEdit,
  onMarkVerified,
}: {
  location: Location;
  lang: Lang;
  onEdit: () => void;
  onMarkVerified: () => void;
}) {
  const statusColors = {
    verified: 'bg-emerald-100 text-emerald-800',
    'community-listed': 'bg-amber-100 text-amber-800',
    unverified: 'bg-stone-100 text-stone-600',
  };

  const statusLabel = {
    verified: ta.verified[lang],
    'community-listed': ta.communityListed[lang],
    unverified: ta.unverified[lang],
  };

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-stone-900">{location.name_en}</h3>
          <p className="text-sm text-stone-600">{location.address}</p>
          {location.phone && <p className="text-sm text-stone-600">{location.phone}</p>}
        </div>
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColors[location.halal_status]}`}>
          {statusLabel[location.halal_status]}
        </span>
      </div>

      {location.verified_by && (
        <div className="text-sm text-stone-600">
          <p>
            {ta.verifiedBy[lang]}: {location.verified_by}
          </p>
          {location.verified_at && (
            <p>
              {ta.verifiedAt[lang]}: {new Date(location.verified_at).toLocaleDateString()}
            </p>
          )}
        </div>
      )}

      <div className="flex gap-2 pt-2">
        <button
          onClick={onEdit}
          className="px-4 py-2 text-sm bg-teal-700 text-white rounded hover:bg-emerald-800 focus:outline-none focus-visible:ring-2 ring-teal-600 transition-colors motion-safe:duration-150 cursor-pointer"
        >
          {ta.save[lang]}
        </button>
        {location.halal_status !== 'verified' && (
          <button
            onClick={onMarkVerified}
            className="px-4 py-2 text-sm bg-emerald-700 text-white rounded hover:bg-emerald-800 focus:outline-none focus-visible:ring-2 ring-teal-600 transition-colors motion-safe:duration-150 cursor-pointer flex items-center gap-2"
          >
            <Check size={16} />
            {ta.markAsVerified[lang]}
          </button>
        )}
      </div>
    </div>
  );
}

function LocationEditForm({
  location,
  lang,
  saving,
  onSave,
  onCancel,
}: {
  location: Location;
  lang: Lang;
  saving: boolean;
  onSave: (updates: Partial<Location>) => void;
  onCancel: () => void;
}) {
  const [formData, setFormData] = useState({
    name_en: location.name_en,
    name_ar: location.name_ar ?? '',
    name_es: location.name_es ?? '',
    address: location.address,
    phone: location.phone ?? '',
    hours_en: location.hours_en ?? '',
    hours_ar: location.hours_ar ?? '',
    hours_es: location.hours_es ?? '',
    halal_status: location.halal_status,
    verified_by: location.verified_by ?? '',
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSave({
      name_en: formData.name_en,
      name_ar: formData.name_ar || null,
      name_es: formData.name_es || null,
      address: formData.address,
      phone: formData.phone || null,
      hours_en: formData.hours_en || null,
      hours_ar: formData.hours_ar || null,
      hours_es: formData.hours_es || null,
      halal_status: formData.halal_status,
      verified_by: formData.verified_by || null,
      verified_at: formData.halal_status === 'verified' ? new Date().toISOString() : null,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-stone-900 mb-1">{ta.nameEn[lang]}</label>
          <input
            type="text"
            value={formData.name_en}
            onChange={(e) => setFormData({ ...formData, name_en: e.target.value })}
            className="w-full px-3 py-2 border border-stone-200 rounded focus:outline-none focus-visible:ring-2 ring-teal-600 text-stone-900"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-stone-900 mb-1">{ta.nameAr[lang]}</label>
          <input
            type="text"
            value={formData.name_ar}
            onChange={(e) => setFormData({ ...formData, name_ar: e.target.value })}
            className="w-full px-3 py-2 border border-stone-200 rounded focus:outline-none focus-visible:ring-2 ring-teal-600 text-stone-900"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-stone-900 mb-1">{ta.nameEs[lang]}</label>
          <input
            type="text"
            value={formData.name_es}
            onChange={(e) => setFormData({ ...formData, name_es: e.target.value })}
            className="w-full px-3 py-2 border border-stone-200 rounded focus:outline-none focus-visible:ring-2 ring-teal-600 text-stone-900"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-stone-900 mb-1">{ta.address[lang]}</label>
        <input
          type="text"
          value={formData.address}
          onChange={(e) => setFormData({ ...formData, address: e.target.value })}
          className="w-full px-3 py-2 border border-stone-200 rounded focus:outline-none focus-visible:ring-2 ring-teal-600 text-stone-900"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-stone-900 mb-1">{ta.phone[lang]}</label>
        <input
          type="text"
          value={formData.phone}
          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          className="w-full px-3 py-2 border border-stone-200 rounded focus:outline-none focus-visible:ring-2 ring-teal-600 text-stone-900"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-stone-900 mb-1">{ta.hours[lang]} (EN)</label>
          <input
            type="text"
            value={formData.hours_en}
            onChange={(e) => setFormData({ ...formData, hours_en: e.target.value })}
            className="w-full px-3 py-2 border border-stone-200 rounded focus:outline-none focus-visible:ring-2 ring-teal-600 text-stone-900"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-stone-900 mb-1">{ta.hours[lang]} (AR)</label>
          <input
            type="text"
            value={formData.hours_ar}
            onChange={(e) => setFormData({ ...formData, hours_ar: e.target.value })}
            className="w-full px-3 py-2 border border-stone-200 rounded focus:outline-none focus-visible:ring-2 ring-teal-600 text-stone-900"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-stone-900 mb-1">{ta.hours[lang]} (ES)</label>
          <input
            type="text"
            value={formData.hours_es}
            onChange={(e) => setFormData({ ...formData, hours_es: e.target.value })}
            className="w-full px-3 py-2 border border-stone-200 rounded focus:outline-none focus-visible:ring-2 ring-teal-600 text-stone-900"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-stone-900 mb-1">{ta.halalStatus[lang]}</label>
        <select
          value={formData.halal_status}
          onChange={(e) => setFormData({ ...formData, halal_status: e.target.value as Location['halal_status'] })}
          className="w-full px-3 py-2 border border-stone-200 rounded focus:outline-none focus-visible:ring-2 ring-teal-600 text-stone-900 cursor-pointer"
        >
          <option value="verified">{ta.verified[lang]}</option>
          <option value="community-listed">{ta.communityListed[lang]}</option>
          <option value="unverified">{ta.unverified[lang]}</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-stone-900 mb-1">{ta.verifiedBy[lang]}</label>
        <input
          type="text"
          value={formData.verified_by}
          onChange={(e) => setFormData({ ...formData, verified_by: e.target.value })}
          className="w-full px-3 py-2 border border-stone-200 rounded focus:outline-none focus-visible:ring-2 ring-teal-600 text-stone-900"
        />
      </div>

      <div className="flex gap-2 pt-2">
        <button
          type="submit"
          disabled={saving}
          className="px-4 py-2 text-sm bg-teal-700 text-white rounded hover:bg-emerald-800 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 ring-teal-600 transition-colors motion-safe:duration-150 cursor-pointer"
        >
          {saving ? ta.saving[lang] : ta.save[lang]}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="px-4 py-2 text-sm bg-stone-200 text-stone-900 rounded hover:bg-stone-300 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 ring-teal-600 transition-colors motion-safe:duration-150 cursor-pointer"
        >
          {ta.cancel[lang]}
        </button>
      </div>
    </form>
  );
}
