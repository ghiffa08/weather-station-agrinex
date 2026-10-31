import React, { useState, useEffect } from 'react';
import { 
  Users, 
  UserPlus, 
  ShieldCheck, 
  Key, 
  Trash2, 
  Edit3, 
  RotateCcw, 
  Check, 
  AlertCircle,
  Eye,
  EyeOff,
  UserCheck,
  X
} from 'lucide-react';
import { Card } from '../neumorphic/Card';
import { AuthService, type ManagedUser } from '../../../core/services/AuthService';

interface UserManagementSectionProps {
  onNotice?: (msg: string) => void;
}

export const UserManagementSection: React.FC<UserManagementSectionProps> = ({ onNotice }) => {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [currentUserEmail, setCurrentUserEmail] = useState<string>('');
  
  // Inline Form State (NO MODAL)
  const [isFormOpen, setIsFormOpen] = useState<boolean>(false);
  const [editingUser, setEditingUser] = useState<ManagedUser | null>(null);
  const [formData, setFormData] = useState<{
    email: string;
    displayName: string;
    role: 'Administrator' | 'Agronomist' | 'Field Officer';
    password: string;
  }>({
    email: '',
    displayName: '',
    role: 'Field Officer',
    password: '',
  });
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Load registered users on mount
  const refreshUsers = () => {
    const list = AuthService.getRegisteredUsers();
    setUsers(list);
    const active = AuthService.getCurrentUser();
    if (active) setCurrentUserEmail(active.email.toLowerCase());
  };

  useEffect(() => {
    refreshUsers();
  }, []);

  const openAddForm = () => {
    setEditingUser(null);
    setFormData({
      email: '',
      displayName: '',
      role: 'Field Officer',
      password: '',
    });
    setErrorMsg(null);
    setShowPassword(false);
    setIsFormOpen(true);
  };

  const openEditForm = (user: ManagedUser) => {
    setEditingUser(user);
    setFormData({
      email: user.email,
      displayName: user.displayName,
      role: user.role,
      password: user.password || '',
    });
    setErrorMsg(null);
    setShowPassword(false);
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingUser(null);
    setErrorMsg(null);
  };

  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    try {
      if (!formData.email.trim()) {
        throw new Error('Alamat email wajib diisi.');
      }
      if (!formData.displayName.trim()) {
        throw new Error('Nama pengguna wajib diisi.');
      }
      if (!editingUser && (!formData.password || formData.password.length < 4)) {
        throw new Error('Kata sandi minimal 4 karakter.');
      }

      if (editingUser) {
        // Update user
        AuthService.updateRegisteredUser(editingUser.id, {
          displayName: formData.displayName.trim(),
          role: formData.role,
          ...(formData.password ? { password: formData.password } : {}),
        });
        setSuccessMsg(`Data akun "${formData.displayName.trim()}" berhasil diperbarui.`);
        onNotice?.(`Akun ${formData.email} diperbarui.`);
      } else {
        // Add new user
        AuthService.addRegisteredUser({
          email: formData.email.trim(),
          displayName: formData.displayName.trim(),
          role: formData.role,
          password: formData.password || 'agrinex123',
        });
        setSuccessMsg(`Akun "${formData.displayName.trim()}" berhasil ditambahkan.`);
        onNotice?.(`Akun ${formData.email} berhasil ditambahkan.`);
      }

      refreshUsers();
      closeForm();
      setTimeout(() => setSuccessMsg(null), 3500);
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal menyimpan akun.');
    }
  };

  const handleDeleteUser = (user: ManagedUser) => {
    if (user.isSeeder) {
      alert('Akun admin seeder bawaan tidak dapat dihapus.');
      return;
    }
    if (user.email.toLowerCase() === currentUserEmail) {
      alert('Tidak dapat menghapus akun yang sedang aktif digunakan.');
      return;
    }

    if (confirm(`Hapus akun "${user.displayName}" (${user.email})?`)) {
      try {
        AuthService.deleteRegisteredUser(user.id);
        refreshUsers();
        if (editingUser?.id === user.id) {
          closeForm();
        }
        setSuccessMsg(`Akun ${user.email} telah dihapus.`);
        onNotice?.(`Akun ${user.email} dihapus.`);
        setTimeout(() => setSuccessMsg(null), 3500);
      } catch (err: any) {
        alert(err.message || 'Gagal menghapus akun.');
      }
    }
  };

  const handleResetSeeder = () => {
    if (confirm('Pulihkan daftar pengguna ke akun bawaan seeder admin?')) {
      AuthService.resetUsersToDefault();
      refreshUsers();
      closeForm();
      setSuccessMsg('Daftar pengguna berhasil dipulihkan ke 1 akun seeder admin.');
      onNotice?.('Pengguna dipulihkan ke akun seeder admin.');
      setTimeout(() => setSuccessMsg(null), 3500);
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'Administrator':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-900 text-white flex items-center gap-1">
            <ShieldCheck size={11} className="text-emerald-400" />
            <span>Administrator</span>
          </span>
        );
      case 'Agronomist':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300/60 flex items-center gap-1">
            <span>Agronomist</span>
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 text-sky-800 border border-sky-300/60 flex items-center gap-1">
            <span>Petugas Lapang</span>
          </span>
        );
    }
  };

  return (
    <Card className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-300/40 pb-3">
        <div>
          <h2 className="text-sm font-bold text-gray-800 flex items-center gap-2">
            <Users size={16} className="text-sky-600" />
            <span>Kelola Pengguna Stasiun</span>
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Manajemen hak akses akun dan 1 akun seeder admin stasiun cuaca
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleResetSeeder}
            title="Pulihkan ke Akun Seeder Bawaan"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl neo-flat hover:neo-pressed text-xs font-bold text-gray-600 hover:text-gray-900 cursor-pointer transition active:scale-95"
          >
            <RotateCcw size={12} />
            <span className="hidden sm:inline">Pulihkan Seeder</span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (isFormOpen && !editingUser) {
                closeForm();
              } else {
                openAddForm();
              }
            }}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition shadow-sm active:scale-95 cursor-pointer ${
              isFormOpen && !editingUser
                ? 'neo-pressed text-gray-700 bg-[var(--color-neo-bg)]'
                : 'bg-gray-900 text-white hover:bg-gray-800'
            }`}
          >
            {isFormOpen && !editingUser ? (
              <>
                <X size={13} />
                <span>Tutup Form</span>
              </>
            ) : (
              <>
                <UserPlus size={13} />
                <span>Tambah Pengguna</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Success Notification Alert */}
      {successMsg && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-50 text-emerald-800 text-xs font-semibold border border-emerald-200 animate-fade-in">
          <Check size={14} className="text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Seeder Info Banner Card */}
      <div className="p-3.5 sm:p-4 rounded-2xl neo-pressed flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl neo-flat flex items-center justify-center text-gray-800 font-bold shrink-0">
            <ShieldCheck size={18} className="text-sky-700" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold text-gray-800">Akun Seeder Utama: admin@agrinex.id</h3>
              <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-sky-200/60 text-sky-900">
                Default Superuser
              </span>
            </div>
            <p className="text-[11px] text-gray-500 mt-0.5">
              Kredensial bawaan: <code className="px-1 py-0.5 rounded bg-gray-200/70 text-gray-800 font-mono text-[10px]">admin</code> / <code className="px-1 py-0.5 rounded bg-gray-200/70 text-gray-800 font-mono text-[10px]">agrinex2026</code>. Akun ini memiliki izin penuh mengonfigurasi stasiun.
            </p>
          </div>
        </div>
      </div>

      {/* INLINE FORM (NO MODAL) */}
      {isFormOpen && (
        <div className="p-4 sm:p-5 rounded-2xl neo-pressed space-y-4 animate-scale-up border border-gray-300/30">
          <div className="flex items-center justify-between border-b border-gray-300/40 pb-2">
            <div className="flex items-center gap-2">
              <UserCheck size={15} className="text-gray-800" />
              <h3 className="text-xs sm:text-sm font-bold text-gray-800">
                {editingUser ? `Edit Data: ${editingUser.displayName}` : 'Form Tambah Pengguna Baru'}
              </h3>
            </div>
            <button
              type="button"
              onClick={closeForm}
              className="w-6 h-6 rounded-lg neo-flat hover:neo-pressed text-gray-500 hover:text-gray-800 text-xs font-bold flex items-center justify-center cursor-pointer transition active:scale-95"
            >
              ✕
            </button>
          </div>

          {errorMsg && (
            <div className="flex items-center gap-1.5 p-2.5 rounded-xl bg-rose-50 text-rose-700 text-xs border border-rose-200">
              <AlertCircle size={13} className="shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSaveUser} className="space-y-3.5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Nama Lengkap */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-gray-700 block">
                  Nama Lengkap
                </label>
                <div className="neo-flat px-3 py-2 rounded-xl focus-within:ring-1 focus-within:ring-sky-500/40 transition">
                  <input
                    type="text"
                    required
                    value={formData.displayName}
                    onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                    placeholder="Contoh: Haikal Jibran Al-Ghiffarry"
                    className="w-full bg-transparent text-xs font-medium text-gray-800 focus:outline-none"
                  />
                </div>
              </div>

              {/* Email */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-gray-700 block">
                  Alamat Email
                </label>
                <div className={`neo-flat px-3 py-2 rounded-xl focus-within:ring-1 focus-within:ring-sky-500/40 transition ${
                  editingUser ? 'opacity-60 cursor-not-allowed' : ''
                }`}>
                  <input
                    type="email"
                    required
                    disabled={!!editingUser}
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="nama@agrinex.id"
                    className="w-full bg-transparent text-xs font-medium text-gray-800 focus:outline-none disabled:cursor-not-allowed"
                  />
                </div>
              </div>

              {/* Role Selection */}
              <div className="space-y-1 sm:col-span-1">
                <label className="text-[11px] font-bold text-gray-700 block">
                  Peran Akun (Role)
                </label>
                <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl neo-flat">
                  {(['Administrator', 'Agronomist', 'Field Officer'] as const).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setFormData({ ...formData, role: r })}
                      className={`py-1.5 px-1 rounded-lg text-[10px] font-bold transition cursor-pointer text-center ${
                        formData.role === r
                          ? 'neo-pressed text-sky-800 bg-[var(--color-neo-bg)] shadow-[var(--shadow-neo-sm)]'
                          : 'text-gray-500 hover:text-gray-800'
                      }`}
                    >
                      {r === 'Field Officer' ? 'Petugas' : r}
                    </button>
                  ))}
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1 sm:col-span-1">
                <label className="text-[11px] font-bold text-gray-700 block">
                  {editingUser ? 'Kata Sandi Baru (Kosongkan bila tidak diubah)' : 'Kata Sandi'}
                </label>
                <div className="neo-flat px-3 py-2 rounded-xl flex items-center gap-2 focus-within:ring-1 focus-within:ring-sky-500/40 transition">
                  <Key size={13} className="text-gray-400 shrink-0" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder={editingUser ? '••••••••' : 'Minimal 4 karakter'}
                    className="w-full bg-transparent text-xs font-medium text-gray-800 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-gray-400 hover:text-gray-600 cursor-pointer p-0.5"
                  >
                    {showPassword ? <EyeOff size={13} /> : <Eye size={13} />}
                  </button>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-300/40">
              <button
                type="button"
                onClick={closeForm}
                className="px-3.5 py-1.5 rounded-xl neo-flat hover:neo-pressed text-xs font-bold text-gray-600 cursor-pointer transition active:scale-95"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded-xl bg-gray-900 text-white text-xs font-bold hover:bg-gray-800 cursor-pointer transition shadow-sm active:scale-95"
              >
                {editingUser ? 'Simpan Perubahan' : 'Tambahkan Akun'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* User Table / List */}
      <div className="space-y-2.5">
        <div className="text-xs font-bold text-gray-700 flex items-center justify-between">
          <span>Daftar Pengguna Aktif ({users.length})</span>
          <span className="text-[10px] text-gray-400 font-normal">Sinkronisasi otomatis dengan otentikasi login</span>
        </div>

        <div className="space-y-2">
          {users.map((user) => {
            const isCurrent = user.email.toLowerCase() === currentUserEmail;
            const isBeingEdited = editingUser?.id === user.id;
            const initials = user.displayName
              .split(' ')
              .map(w => w[0])
              .slice(0, 2)
              .join('')
              .toUpperCase() || 'U';

            return (
              <div 
                key={user.id}
                className={`p-3 sm:p-3.5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition ${
                  isBeingEdited
                    ? 'neo-pressed ring-1 ring-sky-500/40'
                    : 'neo-flat hover:shadow-[var(--shadow-neo-flat-hover)]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl neo-pressed flex items-center justify-center text-xs font-bold text-gray-700 shrink-0">
                    {initials}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-gray-800">{user.displayName}</span>
                      {getRoleBadge(user.role)}
                      {user.isSeeder && (
                        <span className="px-2 py-0.5 rounded-md text-[9px] font-bold bg-amber-100 text-amber-800 border border-amber-300/50">
                          Seeder
                        </span>
                      )}
                      {isCurrent && (
                        <span className="px-2 py-0.5 rounded-md text-[9px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300/50 flex items-center gap-0.5">
                          <UserCheck size={10} />
                          <span>Anda (Aktif)</span>
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 text-[11px] text-gray-500">
                      <span>{user.email}</span>
                      <span>•</span>
                      <span>Dibuat: {new Date(user.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 self-end sm:self-auto">
                  <button
                    type="button"
                    onClick={() => {
                      if (isFormOpen && editingUser?.id === user.id) {
                        closeForm();
                      } else {
                        openEditForm(user);
                      }
                    }}
                    title={isBeingEdited ? 'Tutup Edit' : 'Edit Pengguna'}
                    className={`p-2 rounded-xl transition active:scale-95 cursor-pointer ${
                      isBeingEdited 
                        ? 'neo-pressed text-sky-800' 
                        : 'neo-flat hover:neo-pressed text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <Edit3 size={13} />
                  </button>

                  <button
                    type="button"
                    disabled={user.isSeeder || isCurrent}
                    onClick={() => handleDeleteUser(user)}
                    title={
                      user.isSeeder
                        ? 'Akun seeder tidak dapat dihapus'
                        : isCurrent
                          ? 'Akun sedang aktif digunakan'
                          : 'Hapus Pengguna'
                    }
                    className={`p-2 rounded-xl transition ${
                      user.isSeeder || isCurrent
                        ? 'opacity-30 cursor-not-allowed text-gray-400'
                        : 'neo-flat hover:neo-pressed text-rose-600 hover:text-rose-800 cursor-pointer active:scale-95'
                    }`}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
};
