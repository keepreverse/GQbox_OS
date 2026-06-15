import { useState, useCallback, useMemo, useEffect } from 'react';
import { Plus, Edit3, Trash2, Check, X, Eye, EyeOff, Users, Shield, User as UserIcon } from 'lucide-react';
import { useToast } from '@hooks/useToast';
import { Toast } from '@components/ui/Toast';
import { useLanguage } from '@context/LanguageContext';
import { useAuth } from '@context/AuthContext';
import { useDataSourceVersion } from '@api/dataSourceContext';
import { ResponsiveTable } from '@components/ui/ResponsiveTable';
import type { Column } from '@app-types/table';
import type { User, UserRole } from '@app-types';
import Modal from '@components/ui/Modal';
import ConfirmModal from '@components/ui/ConfirmModal';

const EDIT_INPUT_CLS =
  'w-full text-xs bg-bg-elevated border border-border-default rounded px-2 py-1 text-text-primary';

function useIsNarrow(): boolean {
  const [isNarrow, setIsNarrow] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia('(max-width: 639px)').matches : false
  );
  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const mql = window.matchMedia('(max-width: 639px)');
    const handle = (e: MediaQueryListEvent) => setIsNarrow(e.matches);
    mql.addEventListener('change', handle);
    return () => mql.removeEventListener('change', handle);
  }, []);
  return isNarrow;
}

interface UserFormData {
  displayName: string;
  login: string;
  password: string;
  role: UserRole;
}

interface UserFormProps {
  initial?: UserFormData;
  requirePassword?: boolean;
  onSubmit: (data: UserFormData) => Promise<boolean>;
  onCancel: () => void;
}

function UserForm({ initial, requirePassword = false, onSubmit, onCancel }: UserFormProps) {
  const { t } = useLanguage();
  const [displayName, setDisplayName] = useState(initial?.displayName ?? '');
  const [login, setLogin] = useState(initial?.login ?? '');
  const [password, setPassword] = useState(initial?.password ?? '');
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<UserRole>(initial?.role ?? 'user');
  const [saving, setSaving] = useState(false);

  const canSave = !!(displayName && login && (!requirePassword || password)) && !saving;

  const handleSubmit = useCallback(async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      const ok = await onSubmit({ displayName, login, password, role });
      if (ok) {
        setDisplayName('');
        setLogin('');
        setPassword('');
        setRole('user');
      }
    } finally {
      setSaving(false);
    }
  }, [canSave, displayName, login, password, role, onSubmit]);

  return (
    <div className="space-y-3">
      <div>
        <label className="text-xs text-text-tertiary mb-1 block">{t('users.col.display_name')}</label>
        <input
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder={t('users.form.display_name_placeholder')}
          className="w-full text-text-primary h-11"
        />
      </div>
      <div>
        <label className="text-xs text-text-tertiary mb-1 block">{t('users.col.login')}</label>
        <input
          type="text"
          value={login}
          onChange={(e) => setLogin(e.target.value)}
          placeholder={t('users.form.login_placeholder')}
          className="w-full text-text-primary h-11"
        />
      </div>
      <div>
        <label className="text-xs text-text-tertiary mb-1 block">{t('users.col.password')}</label>
        <div className="relative">
          <input
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={requirePassword ? t('users.form.password_placeholder') : t('users.password_unchanged')}
            className="w-full text-text-primary h-11 pr-12"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-primary"
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>
      <div>
        <label className="text-xs text-text-tertiary mb-1 block">{t('users.col.role')}</label>
        <select
          value={role}
          onChange={(e) => setRole(e.target.value as UserRole)}
          className="w-full text-text-primary h-11 bg-bg-elevated border border-border-default rounded px-2"
        >
          <option value="user">{t('users.role_user')}</option>
          <option value="admin">{t('users.role_admin')}</option>
        </select>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-3 py-1.5 rounded-lg text-xs sm:text-sm text-text-secondary hover:bg-bg-hover hover:text-text-primary transition-colors cursor-pointer"
        >
          {t('common.cancel')}
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!canSave}
          className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-accent/25 text-white text-xs sm:text-sm hover:bg-accent/35 transition-[colors,opacity,transform,box-shadow] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer font-medium border border-accent/40"
        >
          <Check className="w-3.5 h-3.5" /> {t('users.save')}
        </button>
      </div>
    </div>
  );
}

export default function UserManager() {
  const { t } = useLanguage();
  const { user: currentUser } = useAuth();
  const currentUserId = currentUser?.id ?? null;
  const isCurrentUser = useCallback((u: User) => u.id === currentUserId, [currentUserId]);

  const { ds, version } = useDataSourceVersion('users');
  const users = useMemo(() => ds.users.list, [ds, version]);
  const { toasts, showToast, dismiss } = useToast();
  const isNarrow = useIsNarrow();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<UserFormData>({
    displayName: '',
    login: '',
    password: '',
    role: 'user',
  });
  const [showAddModal, setShowAddModal] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showPasswordIds, setShowPasswordIds] = useState<Set<string>>(new Set());

  const editingUser = useMemo(
    () => users.find((u) => u.id === editingId) ?? null,
    [editingId, users]
  );

  const startEditing = useCallback((user: User) => {
    if (isCurrentUser(user)) {
      showToast(t('users.cannot_edit_self'), 'error');
      return;
    }
    setEditingId(user.id);
    setEditValues({
      displayName: user.displayName,
      login: user.login,
      password: '',
      role: user.role,
    });
    setShowPasswordIds(new Set());
  }, [isCurrentUser, showToast, t]);

  const togglePasswordVisibility = useCallback((id: string) => {
    setShowPasswordIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);



  const handleCancelEdit = useCallback(() => {
    setEditingId(null);
    setShowPasswordIds(new Set());
  }, []);

  const handleSaveEdit = useCallback(
    async (data: UserFormData) => {
      if (!editingUser) return false;
      if (isCurrentUser(editingUser)) {
        showToast(t('users.cannot_edit_self'), 'error');
        return false;
      }
      const { displayName, login, password, role } = data;
      if (!displayName || !login) {
        showToast(t('users.fill_required'), 'error');
        return false;
      }
      const patch: Parameters<typeof ds.users.update>[1] = {
        displayName,
        login,
        role,
      };
      if (password.trim()) patch.password = password.trim();

      try {
        await ds.users.update(editingUser.id, patch);
        showToast(t('users.save_success').replace('{name}', displayName));
        setEditingId(null);
        setShowPasswordIds(new Set());
        return true;
      } catch (err: any) {
        showToast(err?.message || t('users.toast_update_error'), 'error');
        return false;
      }
    },
    [editingUser, isCurrentUser, ds, showToast, t]
  );

  const handleAdd = useCallback(
    async (data: UserFormData) => {
      try {
        await ds.users.create({
          displayName: data.displayName,
          login: data.login,
          password: data.password,
          role: data.role,
        });
        showToast(t('users.toast_added').replace('{name}', data.displayName));
        setShowAddModal(false);
        return true;
      } catch (err: any) {
        showToast(err?.message || t('users.toast_duplicate'), 'error');
        return false;
      }
    },
    [ds, showToast, t]
  );

  const handleDelete = useCallback(async () => {
    if (!deletingId) return;
    try {
      await ds.users.remove(deletingId);
      showToast(t('users.toast_deleted'));
    } catch (err: any) {
      showToast(err?.message || t('users.toast_delete_error'), 'error');
    } finally {
      setDeletingId(null);
    }
  }, [deletingId, ds, showToast, t]);

  const deletingUser = useMemo(
    () => users.find((u) => u.id === deletingId) ?? null,
    [deletingId, users]
  );

  const displayNameCell = useCallback(
    (row: User) => {
      if (editingId === row.id && !isCurrentUser(row)) {
        return (
          <input
            value={editValues.displayName}
            autoFocus
            onChange={(e) => setEditValues((v) => ({ ...v, displayName: e.target.value }))}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSaveEdit(editValues);
              else if (e.key === 'Escape') handleCancelEdit();
            }}
            className={EDIT_INPUT_CLS}
            placeholder={t('users.col.display_name')}
          />
        );
      }
      return (
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-sm truncate block">{row.displayName}</span>
          {isCurrentUser(row) && (
            <span className="shrink-0 text-[10px] px-1.5 py-0.5 rounded bg-accent/10 text-accent border border-accent/30">
              {t('users.current_user')}
            </span>
          )}
        </div>
      );
    },
    [editingId, isCurrentUser, editValues.displayName, handleSaveEdit, handleCancelEdit, t]
  );

  const loginCell = useCallback(
    (row: User) => {
      if (editingId === row.id && !isCurrentUser(row)) {
        return (
          <input
            value={editValues.login}
            onChange={(e) => setEditValues((v) => ({ ...v, login: e.target.value }))}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSaveEdit(editValues);
              else if (e.key === 'Escape') handleCancelEdit();
            }}
            className={`${EDIT_INPUT_CLS} font-mono`}
            placeholder={t('users.col.login')}
          />
        );
      }
      return <span className="text-xs font-mono text-text-secondary truncate block">{row.login}</span>;
    },
    [editingId, isCurrentUser, editValues.login, handleSaveEdit, handleCancelEdit, t]
  );

  const passwordCell = useCallback(
    (row: User) => {
      if (editingId === row.id && !isCurrentUser(row)) {
        const show = showPasswordIds.has(row.id);
        return (
          <div className="relative">
            <input
              type={show ? 'text' : 'password'}
              value={editValues.password}
              onChange={(e) => setEditValues((v) => ({ ...v, password: e.target.value }))}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveEdit(editValues);
                else if (e.key === 'Escape') handleCancelEdit();
              }}
              placeholder={t('users.password_unchanged')}
              className={EDIT_INPUT_CLS}
            />
            <button
              type="button"
              onClick={() => togglePasswordVisibility(row.id)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-primary"
            >
              {show ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>
          </div>
        );
      }
      return (
        <button
          type="button"
          onClick={() => startEditing(row)}
          disabled={isCurrentUser(row)}
          className="flex items-center gap-1.5 text-text-tertiary hover:text-text-primary disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <span className="text-xs tracking-widest">••••••</span>
        </button>
      );
    },
    [editingId, isCurrentUser, editValues.password, showPasswordIds, startEditing, togglePasswordVisibility, handleSaveEdit, handleCancelEdit, t]
  );

  const roleCell = useCallback(
    (row: User) => {
      if (editingId === row.id && !isCurrentUser(row)) {
        return (
          <select
            value={editValues.role}
            onChange={(e) => setEditValues((v) => ({ ...v, role: e.target.value as UserRole }))}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSaveEdit(editValues);
              else if (e.key === 'Escape') handleCancelEdit();
            }}
            className={`${EDIT_INPUT_CLS} bg-bg-elevated`}
          >
            <option value="user">{t('users.role_user')}</option>
            <option value="admin">{t('users.role_admin')}</option>
          </select>
        );
      }
      const isAdmin = row.role === 'admin';
      return (
        <span
          className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border ${
            isAdmin
              ? 'bg-accent/10 text-accent border-accent/30'
              : 'bg-bg-elevated text-text-tertiary border-border-subtle'
          }`}
        >
          {isAdmin ? <Shield className="w-3 h-3" /> : <UserIcon className="w-3 h-3" />}
          {isAdmin ? t('users.role_admin') : t('users.role_user')}
        </span>
      );
    },
    [editingId, isCurrentUser, editValues.role, handleSaveEdit, handleCancelEdit, t]
  );

  const actionsCell = useCallback(
    (row: User) => {
      const isEditing = editingId === row.id;
      if (isEditing && !isCurrentUser(row)) {
        return (
          <div className="flex items-center justify-end gap-1">
            <button
              onClick={() => handleSaveEdit(editValues)}
              className="p-1 rounded hover:bg-success/10 hover:text-success text-text-tertiary cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleCancelEdit}
              className="p-1 rounded hover:bg-danger/10 hover:text-danger text-text-tertiary cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      }
      if (isCurrentUser(row)) {
        return (
          <div className="flex items-center justify-end">
            <span className="text-[10px] text-text-tertiary italic">{t('users.current_user')}</span>
          </div>
        );
      }
      return (
        <div className="flex items-center justify-end gap-1">
          <button
            onClick={() => startEditing(row)}
            className="p-1 rounded hover:bg-bg-hover hover:text-text-primary text-text-tertiary cursor-pointer"
          >
            <Edit3 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setDeletingId(row.id)}
            className="p-1 rounded hover:bg-danger/10 hover:text-danger text-text-tertiary cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      );
    },
    [editingId, isCurrentUser, handleSaveEdit, handleCancelEdit, startEditing, t]
  );

  const columns: Column<User>[] = useMemo(
    () => [
      { key: 'displayName', header: t('users.col.display_name'), width: 24, cell: displayNameCell },
      { key: 'login', header: t('users.col.login'), width: 24, cell: loginCell },
      { key: 'password', header: t('users.col.password'), width: 18, cell: passwordCell },
      { key: 'role', header: t('users.col.role'), width: 18, cell: roleCell },
      { key: 'actions', header: t('users.col.actions'), width: 16, align: 'right', cell: actionsCell },
    ],
    [t, displayNameCell, loginCell, passwordCell, roleCell, actionsCell]
  );

  const table = useMemo(
    () => (
      <ResponsiveTable
        columns={columns}
        rows={users}
        rowKey={(r) => r.id}
        minWidth={560}
        rowClassName={(r) => (r.id === editingId ? 'bg-bg-tertiary' : 'table-row-hover')}
      />
    ),
    [columns, users]
  );

  const cards = useMemo(
    () => (
      <div className="space-y-2">
        {users.map((user) => {
          const isEditing = editingId === user.id;
          const current = isCurrentUser(user);
          return (
            <div
              key={user.id}
              className={`glass rounded-xl p-3 flex flex-col gap-2 animate-card-in ${
                isEditing ? 'bg-bg-tertiary' : ''
              }`}
            >
              {isEditing && !current ? (
                <>
                  <input
                    value={editValues.displayName}
                    autoFocus
                    onChange={(e) => setEditValues((v) => ({ ...v, displayName: e.target.value }))}
                    className={EDIT_INPUT_CLS}
                    placeholder={t('users.col.display_name')}
                  />
                  <input
                    value={editValues.login}
                    onChange={(e) => setEditValues((v) => ({ ...v, login: e.target.value }))}
                    className={`${EDIT_INPUT_CLS} font-mono`}
                    placeholder={t('users.col.login')}
                  />
                  <div className="relative">
                    <input
                      type={showPasswordIds.has(user.id) ? 'text' : 'password'}
                      value={editValues.password}
                      onChange={(e) => setEditValues((v) => ({ ...v, password: e.target.value }))}
                      placeholder={t('users.password_unchanged')}
                      className={EDIT_INPUT_CLS}
                    />
                    <button
                      type="button"
                      onClick={() => togglePasswordVisibility(user.id)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-primary"
                    >
                      {showPasswordIds.has(user.id) ? (
                        <EyeOff className="w-3.5 h-3.5" />
                      ) : (
                        <Eye className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                  <select
                    value={editValues.role}
                    onChange={(e) => setEditValues((v) => ({ ...v, role: e.target.value as UserRole }))}
                    className={`${EDIT_INPUT_CLS} bg-bg-elevated`}
                  >
                    <option value="user">{t('users.role_user')}</option>
                    <option value="admin">{t('users.role_admin')}</option>
                  </select>
                  <div className="flex items-center justify-end gap-1 mt-1">
                    <button
                      onClick={() => handleSaveEdit(editValues)}
                      className="p-2 rounded hover:bg-success/10 hover:text-success text-text-tertiary cursor-pointer"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      className="p-2 rounded hover:bg-danger/10 hover:text-danger text-text-tertiary cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-text-primary truncate">{user.displayName}</p>
                        {current && (
                          <span className="shrink-0 text-[10px] px-1.5 py-0.5 rounded bg-accent/10 text-accent border border-accent/30">
                            {t('users.current_user')}
                          </span>
                        )}
                      </div>
                      <p className="text-xs font-mono text-text-secondary truncate">{user.login}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-[10px] text-text-tertiary tracking-widest">••••••</span>
                        <span
                          className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border ${
                            user.role === 'admin'
                              ? 'bg-accent/10 text-accent border-accent/30'
                              : 'bg-bg-elevated text-text-tertiary border-border-subtle'
                          }`}
                        >
                          {user.role === 'admin' ? (
                            <Shield className="w-3 h-3" />
                          ) : (
                            <UserIcon className="w-3 h-3" />
                          )}
                          {user.role === 'admin' ? t('users.role_admin') : t('users.role_user')}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {current ? (
                        <span className="text-[10px] text-text-tertiary italic">{t('users.current_user')}</span>
                      ) : (
                        <>
                          <button
                            onClick={() => startEditing(user)}
                            className="p-2 rounded hover:bg-bg-hover hover:text-text-primary text-text-tertiary cursor-pointer"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeletingId(user.id)}
                            className="p-2 rounded hover:bg-danger/10 hover:text-danger text-text-tertiary cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    ),
    [users, editingId, isCurrentUser, editValues, showPasswordIds, startEditing, handleSaveEdit, handleCancelEdit, togglePasswordVisibility, t]
  );

  return (
    <div className="space-y-6">
      <Toast toasts={toasts} onDismiss={dismiss} />

      <div className="flex items-start sm:items-end justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="text-xl sm:text-2xl font-semibold text-gradient">{t('users.title')}</h2>
          <p className="text-xs sm:text-sm text-text-secondary mt-0.5 sm:mt-1">{t('users.subtitle')}</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 h-11 sm:h-10 rounded-lg bg-accent/25 text-white text-xs sm:text-sm hover:bg-accent/35 transition-[colors,opacity,transform,box-shadow] cursor-pointer font-medium border border-accent/40 flex-shrink-0"
        >
          <Plus className="w-4 h-4" /> {t('users.add')}
        </button>
      </div>

      <div className="hidden sm:block">
        <div className="glass rounded-xl overflow-hidden">{table}</div>
      </div>
      <div className="sm:hidden">{cards}</div>

      <Modal
        variant={isNarrow ? 'bottom-sheet' : 'centered'}
        width="md"
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        title={t('users.add_title')}
        icon={<Users className="w-4 h-4 text-accent flex-shrink-0" />}
        ariaLabel={t('users.add_title')}
      >
        <UserForm requirePassword onSubmit={handleAdd} onCancel={() => setShowAddModal(false)} />
      </Modal>

      <ConfirmModal
        open={deletingId !== null}
        variant="danger"
        title={t('users.delete_title')}
        description={
          deletingUser
            ? t('users.delete_desc').replace('{name}', deletingUser.displayName)
            : t('users.delete_desc_generic')
        }
        onCancel={() => setDeletingId(null)}
        onConfirm={handleDelete}
      />
    </div>
  );
}
