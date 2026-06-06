'use client';

import { useState, useEffect } from 'react';
import { UserPlus, Mail, Trash2, Shield } from 'lucide-react';
import type { Lang } from '@/lib/types';
import { ta } from '@/i18n/admin';
import { supabase } from '@/lib/supabase';

// Server action imports - these will be provided by sibling agent
// If types don't resolve, we define minimal local types
type User = {
  id: string;
  email: string;
  role: 'user' | 'business' | 'admin';
  disabled?: boolean;
  created_at?: string;
};

// Import server actions - sibling agent is creating these
let listUsers: () => Promise<User[]>;
let createUser: (email: string, password: string, role: string) => Promise<void>;
let setUserDisabled: (userId: string, disabled: boolean) => Promise<void>;
let deleteUser: (userId: string) => Promise<void>;
let setUserRole: (userId: string, role: string) => Promise<void>;

// Try to import, but handle gracefully if not yet available
try {
  const adminActions = require('@/lib/admin/actions');
  listUsers = adminActions.listUsers;
  createUser = adminActions.createUser;
  setUserDisabled = adminActions.setUserDisabled;
  deleteUser = adminActions.deleteUser;
  setUserRole = adminActions.setUserRole;
} catch {
  // Fallback stubs - these will show helpful errors if called before lib/admin is ready
  listUsers = async () => {
    console.error('Admin actions not yet available');
    return [];
  };
  createUser = async () => {
    throw new Error('Admin actions not yet available');
  };
  setUserDisabled = async () => {
    throw new Error('Admin actions not yet available');
  };
  deleteUser = async () => {
    throw new Error('Admin actions not yet available');
  };
  setUserRole = async () => {
    throw new Error('Admin actions not yet available');
  };
}

interface UsersAdminProps {
  lang: Lang;
}

export function UsersAdmin({ lang }: UsersAdminProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  async function loadUsers() {
    setLoading(true);
    try {
      const data = await listUsers();
      setUsers(data);
    } catch (err) {
      console.error('Failed to load users:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateUser(email: string, password: string, role: string) {
    try {
      await createUser(email, password, role);
      await loadUsers();
      setShowCreateForm(false);
    } catch (err) {
      console.error('Failed to create user:', err);
      alert(ta.errorOccurred[lang]);
    }
  }

  async function handleToggleDisabled(userId: string, currentlyDisabled: boolean) {
    try {
      await setUserDisabled(userId, !currentlyDisabled);
      await loadUsers();
    } catch (err) {
      console.error('Failed to update user:', err);
      alert(ta.errorOccurred[lang]);
    }
  }

  async function handleDeleteUser(userId: string, email: string) {
    const confirmation = prompt(ta.confirmDelete[lang]);
    if (confirmation !== email) {
      alert(ta.deleteConfirmMismatch[lang]);
      return;
    }

    try {
      await deleteUser(userId);
      await loadUsers();
    } catch (err) {
      console.error('Failed to delete user:', err);
      alert(ta.errorOccurred[lang]);
    }
  }

  async function handleChangeRole(userId: string, newRole: string) {
    try {
      await setUserRole(userId, newRole);
      await loadUsers();
    } catch (err) {
      console.error('Failed to change role:', err);
      alert(ta.errorOccurred[lang]);
    }
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
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-stone-900">{ta.usersTitle[lang]}</h2>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="px-4 py-2 text-sm bg-teal-700 text-white rounded hover:bg-emerald-800 focus:outline-none focus-visible:ring-2 ring-teal-600 transition-colors motion-safe:duration-150 cursor-pointer flex items-center gap-2"
        >
          <UserPlus size={16} />
          {ta.createUser[lang]}
        </button>
      </div>

      {showCreateForm && (
        <CreateUserForm
          lang={lang}
          onSubmit={handleCreateUser}
          onCancel={() => setShowCreateForm(false)}
        />
      )}

      <div className="space-y-4 mt-6">
        {users.map((user) => (
          <UserCard
            key={user.id}
            user={user}
            lang={lang}
            onToggleDisabled={() => handleToggleDisabled(user.id, user.disabled ?? false)}
            onDelete={() => handleDeleteUser(user.id, user.email)}
            onChangeRole={(newRole) => handleChangeRole(user.id, newRole)}
          />
        ))}
      </div>
    </div>
  );
}

function CreateUserForm({
  lang,
  onSubmit,
  onCancel,
}: {
  lang: Lang;
  onSubmit: (email: string, password: string, role: string) => Promise<void>;
  onCancel: () => void;
}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'user' | 'business' | 'admin'>('user');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await onSubmit(email, password, role);
      setEmail('');
      setPassword('');
      setRole('user');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-lg p-4 border border-stone-200 space-y-4">
      <div>
        <label className="block text-sm font-medium text-stone-900 mb-1">{ta.email[lang]}</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full px-3 py-2 border border-stone-200 rounded focus:outline-none focus-visible:ring-2 ring-teal-600 text-stone-900"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-stone-900 mb-1">{ta.newPassword[lang]}</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
          className="w-full px-3 py-2 border border-stone-200 rounded focus:outline-none focus-visible:ring-2 ring-teal-600 text-stone-900"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-stone-900 mb-1">{ta.role[lang]}</label>
        <select
          value={role}
          onChange={(e) => setRole(e.target.value as 'user' | 'business' | 'admin')}
          className="w-full px-3 py-2 border border-stone-200 rounded focus:outline-none focus-visible:ring-2 ring-teal-600 text-stone-900 cursor-pointer"
        >
          <option value="user">{ta.roleUser[lang]}</option>
          <option value="business">{ta.roleBusiness[lang]}</option>
          <option value="admin">{ta.roleAdmin[lang]}</option>
        </select>
      </div>

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 text-sm bg-teal-700 text-white rounded hover:bg-emerald-800 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 ring-teal-600 transition-colors motion-safe:duration-150 cursor-pointer"
        >
          {loading ? ta.creating[lang] : ta.createUser[lang]}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          className="px-4 py-2 text-sm bg-stone-200 text-stone-900 rounded hover:bg-stone-300 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 ring-teal-600 transition-colors motion-safe:duration-150 cursor-pointer"
        >
          {ta.cancel[lang]}
        </button>
      </div>
    </form>
  );
}

function UserCard({
  user,
  lang,
  onToggleDisabled,
  onDelete,
  onChangeRole,
}: {
  user: User;
  lang: Lang;
  onToggleDisabled: () => void;
  onDelete: () => void;
  onChangeRole: (role: string) => void;
}) {
  const roleColors = {
    user: 'bg-stone-100 text-stone-700',
    business: 'bg-teal-100 text-teal-800',
    admin: 'bg-amber-100 text-amber-800',
  };

  const roleLabels = {
    user: ta.roleUser[lang],
    business: ta.roleBusiness[lang],
    admin: ta.roleAdmin[lang],
  };

  return (
    <div className="bg-white rounded-lg p-4 border border-stone-200">
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <p className="font-medium text-stone-900">{user.email}</p>
            {user.disabled && (
              <span className="px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                {ta.disabled[lang]}
              </span>
            )}
          </div>
          <p className="text-sm text-stone-600">ID: {user.id}</p>
          {user.created_at && (
            <p className="text-xs text-stone-500 mt-1">
              {ta.createdAt[lang]}: {new Date(user.created_at).toLocaleDateString()}
            </p>
          )}
        </div>
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${roleColors[user.role]}`}>
          {roleLabels[user.role]}
        </span>
      </div>

      <div className="flex flex-wrap gap-2 pt-2 border-t border-stone-200">
        <select
          value={user.role}
          onChange={(e) => onChangeRole(e.target.value)}
          className="px-3 py-1.5 text-sm border border-stone-200 rounded focus:outline-none focus-visible:ring-2 ring-teal-600 text-stone-900 cursor-pointer"
        >
          <option value="user">{ta.roleUser[lang]}</option>
          <option value="business">{ta.roleBusiness[lang]}</option>
          <option value="admin">{ta.roleAdmin[lang]}</option>
        </select>

        <button
          onClick={onToggleDisabled}
          className="px-3 py-1.5 text-sm bg-amber-600 text-white rounded hover:bg-amber-700 focus:outline-none focus-visible:ring-2 ring-teal-600 transition-colors motion-safe:duration-150 cursor-pointer flex items-center gap-1"
        >
          <Shield size={14} />
          {user.disabled ? ta.enable[lang] : ta.disable[lang]}
        </button>

        <button
          onClick={onDelete}
          className="px-3 py-1.5 text-sm bg-red-600 text-white rounded hover:bg-red-700 focus:outline-none focus-visible:ring-2 ring-teal-600 transition-colors motion-safe:duration-150 cursor-pointer flex items-center gap-1"
        >
          <Trash2 size={14} />
          {ta.delete[lang]}
        </button>
      </div>
    </div>
  );
}
