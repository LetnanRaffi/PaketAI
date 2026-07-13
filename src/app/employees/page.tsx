'use client';

import React, { useState, useEffect } from 'react';
import { Employee } from '@/lib/types';
import {
  Users, Plus, Search, Edit2, Trash2, Upload, X, Briefcase, Phone, AlertCircle,
} from 'lucide-react';
import { EmployeesSkeleton } from '@/app/components/Skeleton';

export default function EmployeesManagement() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const [showAddEditModal, setShowAddEditModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);

  const [fullName, setFullName] = useState('');
  const [department, setDepartment] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [formError, setFormError] = useState('');

  const [csvText, setCsvText] = useState('');
  const [importError, setImportError] = useState('');

  const fetchEmployees = async () => {
    try {
      const res = await fetch('/api/employees');
      if (res.ok) {
        const data = await res.json();
        setEmployees(data);
      }
    } catch (err) {
      console.error('Failed to fetch employees', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchEmployees(); }, []);

  if (loading) {
    return (
      <div className="flex flex-1 bg-surface min-h-[50vh]">
        <EmployeesSkeleton />
      </div>
    );
  }

  const openAddModal = () => {
    setEditingEmployee(null);
    setFullName(''); setDepartment(''); setPhoneNumber(''); setFormError('');
    setShowAddEditModal(true);
  };

  const openEditModal = (emp: Employee) => {
    setEditingEmployee(emp);
    setFullName(emp.full_name);
    setDepartment(emp.department || '');
    setPhoneNumber(emp.phone_number || '');
    setFormError('');
    setShowAddEditModal(true);
  };

  const handleSaveEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (!fullName.trim()) { setFormError('Nama lengkap wajib diisi.'); return; }
    setIsSubmitting(true);
    try {
      const payload = { full_name: fullName.trim(), department: department.trim() || null, phone_number: phoneNumber.trim() || null };
      const url = editingEmployee ? `/api/employees/${editingEmployee.id}` : '/api/employees';
      const method = editingEmployee ? 'PUT' : 'POST';
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal menyimpan karyawan');
      await fetchEmployees();
      setShowAddEditModal(false);
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Terjadi kesalahan');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteEmployee = async (id: string) => {
    if (confirm('Apakah Anda yakin ingin menghapus karyawan ini dari database?')) {
      try {
        const res = await fetch(`/api/employees/${id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('Failed to delete');
        await fetchEmployees();
      } catch {
        alert('Gagal menghapus karyawan');
      }
    }
  };

  const handleBulkImport = async (e: React.FormEvent) => {
    e.preventDefault();
    setImportError('');
    if (!csvText.trim()) { setImportError('Teks data CSV tidak boleh kosong.'); return; }
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/employees/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csvText }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal import massal');
      setCsvText(''); setShowImportModal(false);
      await fetchEmployees();
      alert(`Berhasil mengimpor ${data.count} data karyawan!`);
    } catch (err: unknown) {
      setImportError(err instanceof Error ? err.message : 'Terjadi kesalahan');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredEmployees = employees.filter((emp) => {
    const s = searchTerm.toLowerCase();
    return emp.full_name.toLowerCase().includes(s) || emp.department?.toLowerCase().includes(s) || emp.phone_number?.toLowerCase().includes(s);
  });

  return (
    <div className="flex flex-col space-y-5 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-on-surface font-display">Kelola Karyawan</h1>
          <p className="text-xs text-on-surface-muted font-medium">Database penerima paket pabrik</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowImportModal(true)} className="p-2.5 rounded-xl border border-outline-variant/30 bg-surface-elevated hover:bg-surface-hover text-on-surface-variant transition-colors" title="Import Massal CSV">
            <Upload className="h-4 w-4" />
          </button>
          <button onClick={openAddModal} className="flex items-center gap-1 rounded-xl bg-primary py-2.5 px-3.5 text-xs font-bold text-on-primary shadow-sm shadow-primary/20 hover:brightness-110 transition-colors font-display">
            <Plus className="h-4 w-4" />
            <span>Karyawan</span>
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
          <Search className="h-4 w-4 text-on-surface-muted" />
        </div>
        <input type="text" placeholder="Cari nama, departemen, atau nomor HP..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
          className="block w-full rounded-xl border border-outline-variant/40 bg-surface-highest py-2.5 pl-10 pr-4 text-sm text-on-surface placeholder-on-surface-muted/60 focus:border-primary transition-colors" />
      </div>

      {/* List */}
      {filteredEmployees.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-outline-variant/30 py-16 px-4 text-center">
          <Users className="h-10 w-10 text-on-surface-muted/40 mb-2" />
          <h3 className="text-sm font-bold text-on-surface">Karyawan Tidak Ditemukan</h3>
          <p className="text-xs text-on-surface-muted max-w-xs mt-1">Tambahkan karyawan baru atau unggah daftar CSV terlebih dahulu.</p>
        </div>
      ) : (
        <div className="space-y-3">
          <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-muted label-caps">
            Daftar Karyawan ({filteredEmployees.length})
          </span>
          <div className="divide-y divide-outline-variant/20 rounded-2xl border border-outline-variant/20 bg-surface-elevated overflow-hidden">
            {filteredEmployees.map((emp) => (
              <div key={emp.id} className="flex items-center justify-between p-4 hover:bg-surface-hover/20 transition-colors">
                <div className="min-w-0 space-y-1">
                  <h4 className="text-xs font-bold text-on-surface truncate">{emp.full_name}</h4>
                  <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-on-surface-muted font-medium">
                    <span className="flex items-center gap-1">
                      <Briefcase className="h-3 w-3 text-on-surface-muted/60" />
                      {emp.department || 'Tanpa Departemen'}
                    </span>
                    {emp.phone_number && (
                      <span className="flex items-center gap-1">
                        <Phone className="h-3 w-3 text-on-surface-muted/60" />
                        {emp.phone_number}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 bg-surface-highest p-1 rounded-lg border border-outline-variant/20">
                  <button onClick={() => openEditModal(emp)} className="p-1.5 rounded-md hover:bg-surface-hover text-on-surface-muted hover:text-primary transition-colors" title="Edit">
                    <Edit2 className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => handleDeleteEmployee(emp.id)} className="p-1.5 rounded-md hover:bg-surface-hover text-on-surface-muted hover:text-error transition-colors" title="Hapus">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showAddEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-surface-elevated p-5 border border-outline-variant/20 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-on-surface font-display">{editingEmployee ? 'Edit Data Karyawan' : 'Tambah Karyawan Baru'}</h3>
              <button onClick={() => setShowAddEditModal(false)} className="p-1 rounded-full bg-surface-highest hover:bg-surface-hover text-on-surface-muted transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleSaveEmployee} className="space-y-4">
              {formError && (
                <div className="rounded-lg bg-error-container/15 p-3 text-xs text-error flex items-start gap-2 border border-error/20">
                  <AlertCircle className="h-4 w-4 shrink-0" /><span>{formError}</span>
                </div>
              )}
              <div>
                <label className="block text-[10px] font-bold text-on-surface-muted uppercase tracking-wider label-caps">Nama Lengkap</label>
                <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Budi Santoso"
                  className="mt-1 block w-full rounded-lg border border-outline-variant/40 bg-surface-highest py-2 px-3 text-xs text-on-surface placeholder-on-surface-muted/60 focus:border-primary transition-colors" required />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-on-surface-muted uppercase tracking-wider label-caps">Departemen / Divisi</label>
                <input type="text" value={department} onChange={(e) => setDepartment(e.target.value)} placeholder="Produksi B"
                  className="mt-1 block w-full rounded-lg border border-outline-variant/40 bg-surface-highest py-2 px-3 text-xs text-on-surface placeholder-on-surface-muted/60 focus:border-primary transition-colors" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-on-surface-muted uppercase tracking-wider label-caps">No. WhatsApp</label>
                <input type="text" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} placeholder="08123456789"
                  className="mt-1 block w-full rounded-lg border border-outline-variant/40 bg-surface-highest py-2 px-3 text-xs text-on-surface placeholder-on-surface-muted/60 focus:border-primary transition-colors" />
              </div>
              <div className="pt-2 flex gap-3">
                <button type="button" onClick={() => setShowAddEditModal(false)}
                  className="flex-1 rounded-lg border border-outline-variant/30 bg-surface-elevated py-2 text-xs font-bold text-on-surface-variant hover:bg-surface-hover transition-colors">Batal</button>
                <button type="submit" disabled={isSubmitting}
                  className="flex-1 rounded-lg bg-primary py-2 text-xs font-bold text-on-primary shadow-sm hover:brightness-110 transition-colors disabled:opacity-50 font-display">
                  {isSubmitting ? 'Menyimpan...' : (editingEmployee ? 'Simpan Perubahan' : 'Tambah Karyawan')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CSV Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-surface-elevated p-5 border border-outline-variant/20 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-on-surface font-display">Import Karyawan Massal</h3>
              <button onClick={() => setShowImportModal(false)} className="p-1 rounded-full bg-surface-highest hover:bg-surface-hover text-on-surface-muted transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleBulkImport} className="space-y-4">
              {importError && (
                <div className="rounded-lg bg-error-container/15 p-3 text-xs text-error flex items-start gap-2 border border-error/20">
                  <AlertCircle className="h-4 w-4 shrink-0" /><span>{importError}</span>
                </div>
              )}
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-on-surface-muted uppercase tracking-wider label-caps">Format Data</label>
                <p className="text-[10px] text-on-surface-muted leading-relaxed bg-surface-highest p-2.5 rounded-lg border border-outline-variant/20">
                  Format: <code className="font-semibold text-on-surface-variant">Nama Lengkap, Departemen, Telepon</code>
                  <br />Minimal isi nama. Satu baris = satu karyawan.
                </p>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-on-surface-muted uppercase tracking-wider mb-1 label-caps">Paste Teks CSV</label>
                <textarea rows={6} value={csvText} onChange={(e) => setCsvText(e.target.value)}
                  placeholder="Budi Santoso, Produksi A, 0812999000&#10;Sari Dewi, HRD, 0812999001&#10;Andi Wijaya"
                  className="block w-full rounded-lg border border-outline-variant/40 bg-surface-highest py-2 px-3 text-xs text-on-surface font-mono placeholder-on-surface-muted/60 focus:border-primary transition-colors" required />
              </div>
              <div className="pt-2 flex gap-3">
                <button type="button" onClick={() => setShowImportModal(false)}
                  className="flex-1 rounded-lg border border-outline-variant/30 bg-surface-elevated py-2 text-xs font-bold text-on-surface-variant hover:bg-surface-hover transition-colors">Batal</button>
                <button type="submit" disabled={isSubmitting}
                  className="flex-1 rounded-lg bg-primary py-2 text-xs font-bold text-on-primary shadow-sm hover:brightness-110 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 font-display">
                  {isSubmitting ? 'Memproses...' : 'Impor Sekarang'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
