'use client';

import { useState, useEffect, useCallback } from 'react';
import { UserPlus, Trash2, Ban, AlertCircle, Check } from 'lucide-react';
import type { Lang, Role } from '@/lib/types';
import { ta } from '@/i18n/admin';
import {
  listUsers,
  createUser,
  setUserRole,
  disableUser,
  deleteUser,
} from '@/lib/admin';

interface UsersPanelProps {
  lang: Lang;
  accessToken: string;
}

type Status = 'idle' | 'loading' | 'error';

const ROLES: Role[] = ['user', 'business', 'admin'];

/** Server action returns at least these fields; extras are tolerated. */
interface UserRow {
  id: string;
  email: string | null;
  role: Role;
  disabled?: boolean;
}

export function UsersPanel({ lang, accessToken }: UsersPanelProps) {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [status, setStatus] = useState<Status>('loading');

  const load = useCallback(async () => {
    setStatus('loading');
    try {
      const rows = await listUsers(accessToken);
      setUsers((rows ?? []) as UserRow[]);
      setStatus('idle');
    } catch {
      setStatus('error');
    }
  }, [accessToken]);

  useEffect(() => {
    load();
  }, [load]);

  if (status === 'loading') {
    return (
      <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm">
        <div className="h-32 flex items-center justify-center text-stone-600">
          {ta.loading[lang]}
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm">
        <div role="alert" className="flex flex-col items-center gap-3 text-center">
          <AlertCircle size={32} className="text-red-500" aria-hidden="true" />
          <p className="text-stone-700">{ta.error[lang]}</p>
          <button
            onClick={load}
            className="h-11 px-4 bg-stone-100 hover:bg-stone-200 text-stone-900 font-medium rounded-lg cursor-pointer focus:outline-none focus-visible:ring-2 ring-teal-600 active:scale-[0.98] transition-all motion-safe:duration-150"
          >
            {ta.retry[lang]}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <CreateUserForm lang={lang} accessToken={accessToken} onCreated={load} />

      <h2 className="text-sm font-semibold text-stone-700 px-1">
        {ta.users_title[lang]}
      </h2>

      {users.length === 0 ? (
        <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm text-center text-stone-600">
          {ta.no_users[lang]}
        </div>
      ) : (
        <ul className="space-y-3">
          {users.map((u) => (
            <UserCard
              key={u.id}
              user={u}
              lang={lang}
              accessToken={accessToken}
              onChanged={load}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

interface CreateUserFormProps {
  lang: Lang;
  accessToken: string;
  onCreated: () => void;
}

type FormState = 'idle' | 'working' | 'created' | 'error';

function CreateUserForm({ lang, accessToken, onCreated }: CreateUserFormProps) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role>('user');
  const [formState, setFormState] = useState<FormState>('idle');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormState('working');
    try {
      await createUser(accessToken, email.trim(), password, role);
      setFormState('created');
      setEmail('');
      setPassword('');
      setRole('user');
      onCreated();
      setTimeout(() => setFormState('idle'), 2500);
    } catch {
      setFormState('error');
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full h-11 px-4 bg-teal-700 hover:bg-emerald-800 text-white font-medium rounded-lg flex items-center justify-center gap-2 cursor-pointer focus:outline-none focus-visible:ring-2 ring-teal-600 active:scale-[0.98] transition-all motion-safe:duration-150"
      >
        <UserPlus size={20} />
        {ta.create_user[lang]}
      </button>
    );
  }

  const working = formState === 'working';

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white rounded-2xl border border-stone-200 p-5 shadow-sm space-y-3"
    >
      <h3 className="font-semibold text-stone-900">{ta.create_user[lang]}</h3>
      <div>
        <label
          htmlFor="new-email"
          className="block text-sm font-medium text-stone-900 mb-1"
        >
          {ta.email[lang]}
        </label>
        <input
          id="new-email"
          type="email"
          autoComplete="off"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full h-11 px-3 border border-stone-300 rounded-lg focus:outline-none focus-visible:ring-2 ring-teal-600 transition-shadow motion-safe:duration-150"
        />
      </div>
      <div>
        <label
          htmlFor="new-password"
          className="block text-sm font-medium text-stone-900 mb-1"
        >
          {ta.password[lang]}
        </label>
        <input
          id="new-password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full h-11 px-3 border border-stone-300 rounded-lg focus:outline-none focus-visible:ring-2 ring-teal-600 transition-shadow motion-safe:duration-150"
        />
      </div>
      <div>
        <label
          htmlFor="new-role"
          className="block text-sm font-medium text-stone-900 mb-1"
        >
          {ta.role[lang]}
        </label>
        <select
          id="new-role"
          value={role}
          onChange={(e) => setRole(e.target.value as Role)}
          className="w-full h-11 px-3 border border-stone-300 rounded-lg bg-white focus:outline-none focus-visible:ring-2 ring-teal-600 transition-shadow motion-safe:duration-150"
        >
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </div>

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={working}
          className="flex-1 h-11 px-4 bg-teal-700 hover:bg-emerald-800 text-white font-medium rounded-lg flex items-center justify-center gap-2 cursor-pointer focus:outline-none focus-visible:ring-2 ring-teal-600 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-all motion-safe:duration-150"
        >
          <UserPlus size={18} />
          {working ? ta.saving[lang] : ta.create_user[lang]}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="h-11 px-4 bg-stone-100 hover:bg-stone-200 text-stone-900 font-medium rounded-lg cursor-pointer focus:outline-none focus-visible:ring-2 ring-teal-600 active:scale-[0.98] transition-all motion-safe:duration-150"
        >
          {ta.cancel[lang]}
        </button>
      </div>

      {formState === 'created' && (
        <p aria-live="polite" className="text-sm text-green-600 flex items-center gap-1.5">
          <Check size={16} />
          {ta.user_created[lang]}
        </p>
      )}
      {formState === 'error' && (
        <p role="alert" className="text-sm text-red-600">
          {ta.error[lang]}
        </p>
      )}
    </form>
  );
}

interface UserCardProps {
  user: UserRow;
  lang: Lang;
  accessToken: string;
  onChanged: () => void;
}

type CardState = 'idle' | 'working' | 'confirmingDelete' | 'error';

function UserCard({ user, lang, accessToken, onChanged }: UserCardProps) {
  const [cardState, setCardState] = useState<CardState>('idle');
  const [role, setRole] = useState<Role>(user.role);
  const [confirmText, setConfirmText] = useState('');

  // Keep the local select in sync if the parent reloads with a new role.
  useEffect(() => {
    setRole(user.role);
  }, [user.role]);

  async function handleRoleChange(next: Role) {
    const prev = role;
    setRole(next);
    setCardState('working');
    try {
      await setUserRole(accessToken, user.id, next);
      setCardState('idle');
      onChanged();
    } catch {
      setRole(prev);
      setCardState('error');
    }
  }

  async function handleDisable() {
    setCardState('working');
    try {
      await disableUser(accessToken, user.id);
      setCardState('idle');
      onChanged();
    } catch {
      setCardState('error');
    }
  }

  async function handleDelete() {
    setCardState('working');
    try {
      await deleteUser(accessToken, user.id);
      onChanged();
    } catch {
      setCardState('error');
    }
  }

  const working = cardState === 'working';
  const confirmWord = user.email || user.id;
  const deleteEnabled = confirmText.trim() === confirmWord;

  return (
    <li className="bg-white rounded-2xl border border-stone-200 p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <p className="font-medium text-stone-900 truncate">
            {user.email || user.id}
          </p>
          {user.disabled && (
            <span className="inline-flex items-center gap-1 text-xs text-amber-700 mt-1">
              <Ban size={12} aria-hidden="true" />
              {ta.disable_user[lang]}
            </span>
          )}
        </div>
      </div>

      <div className="mb-3">
        <label
          htmlFor={`role-${user.id}`}
          className="block text-sm font-medium text-stone-900 mb-1"
        >
          {ta.role[lang]}
        </label>
        <select
          id={`role-${user.id}`}
          value={role}
          disabled={working}
          onChange={(e) => handleRoleChange(e.target.value as Role)}
          className="w-full h-11 px-3 border border-stone-300 rounded-lg bg-white focus:outline-none focus-visible:ring-2 ring-teal-600 disabled:opacity-50 transition-shadow motion-safe:duration-150"
        >
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </div>

      {cardState === 'confirmingDelete' ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 space-y-3">
          <p className="text-sm text-red-700">{ta.confirm_delete[lang]}</p>
          <label
            htmlFor={`confirm-${user.id}`}
            className="block text-xs text-stone-600"
          >
            {lang === 'ar'
              ? `اكتب "${confirmWord}" للتأكيد`
              : lang === 'es'
                ? `Escribe "${confirmWord}" para confirmar`
                : `Type "${confirmWord}" to confirm`}
          </label>
          <input
            id={`confirm-${user.id}`}
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            autoComplete="off"
            className="w-full h-11 px-3 border border-stone-300 rounded-lg focus:outline-none focus-visible:ring-2 ring-red-600 transition-shadow motion-safe:duration-150"
          />
          <div className="flex gap-2">
            <button
              onClick={handleDelete}
              disabled={!deleteEnabled || working}
              className="flex-1 h-11 px-4 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg flex items-center justify-center gap-2 cursor-pointer focus:outline-none focus-visible:ring-2 ring-red-600 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-all motion-safe:duration-150"
            >
              <Trash2 size={18} />
              {working ? ta.saving[lang] : ta.delete_user[lang]}
            </button>
            <button
              onClick={() => {
                setCardState('idle');
                setConfirmText('');
              }}
              className="h-11 px-4 bg-white border border-stone-300 hover:bg-stone-100 text-stone-800 font-medium rounded-lg cursor-pointer focus:outline-none focus-visible:ring-2 ring-teal-600 active:scale-[0.98] transition-all motion-safe:duration-150"
            >
              {ta.cancel[lang]}
            </button>
          </div>
        </div>
      ) : (
        <div className="flex gap-2">
          <button
            onClick={handleDisable}
            disabled={working || user.disabled}
            className="flex-1 h-11 px-4 bg-stone-100 hover:bg-stone-200 text-stone-900 font-medium rounded-lg flex items-center justify-center gap-2 cursor-pointer focus:outline-none focus-visible:ring-2 ring-teal-600 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-all motion-safe:duration-150"
          >
            <Ban size={18} />
            {ta.disable_user[lang]}
          </button>
          <button
            onClick={() => setCardState('confirmingDelete')}
            disabled={working}
            className="flex-1 h-11 px-4 bg-white border border-red-300 hover:bg-red-50 text-red-700 font-medium rounded-lg flex items-center justify-center gap-2 cursor-pointer focus:outline-none focus-visible:ring-2 ring-red-600 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-all motion-safe:duration-150"
          >
            <Trash2 size={18} />
            {ta.delete_user[lang]}
          </button>
        </div>
      )}

      {cardState === 'error' && (
        <p role="alert" className="mt-3 text-sm text-red-600">
          {ta.error[lang]}
        </p>
      )}
    </li>
  );
}
