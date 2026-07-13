'use client';

import React, { useState, useEffect } from 'react';
import { Employee } from '@/lib/types';
import {
  Users,
  Plus,
  Search,
  Edit2,
  Trash2,
  Upload,
  X,
  Briefcase,
  Phone,
  AlertCircle,
} from 'lucide-react';

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

  useEffect(() => {
    fetchEmployees();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center bg-white min-h-[50vh]">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  const openAddModal = () => {
    setEditingEmployee(null);
    setFullName('');
    setDepartment('');
    setPhoneNumber('');
    setFormError('');
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

    if (!fullName.trim()) {
      setFormError('Nama lengkap wajib diisi.');
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        full_name: fullName.trim(),
        department: department.trim() || null,
        phone_number: phoneNumber.trim() || null,
      };

      const url = editingEmployee ? `/api/employees/${editingEmployee.id}` : '/api/employees';
      const method = editingEmployee ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Gagal menyimpan karyawan');
      }

      await fetchEmployees();
      setShowAddEditModal(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Terjadi kesalahan';
      setFormError(msg);
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

    if (!csvText.trim()) {
      setImportError('Teks data CSV tidak boleh kosong.');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch('/api/employees/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csvText }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Gagal import massal');
      }

      setCsvText('');
      setShowImportModal(false);
      await fetchEmployees();
      alert(`Berhasil mengimpor ${data.count} data karyawan!`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Terjadi kesalahan';
      setImportError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredEmployees = employees.filter((emp) => {
    const s = searchTerm.toLowerCase();
    return (
      emp.full_name.toLowerCase().includes(s) ||
      emp.department?.toLowerCase().includes(s) ||
      emp.phone_number?.toLowerCase().includes(s)
    );
  });

  return (
    <div className="flex flex-col space-y-5 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Kelola Karyawan</h1>
          <p className="text-xs text-slate-500 font-medium font-sans">Database penerima paket pabrik</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowImportModal(true)}
            className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-colors shadow-xs"
            title="Import Massal CSV"
          >
            <Upload className="h-4 w-4" />
          </button>
          <button
            onClick={openAddModal}
            className="flex items-center gap-1 rounded-xl bg-indigo-600 py-2.5 px-3.5 text-xs font-bold text-white shadow-sm shadow-indigo-600/10 hover:bg-indigo-500 transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>Karyawan</span>
          </button>
        </div>
      </div>

      {/* Search Input */}
      <div className="relative">
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
          <Search className="h-4 w-4 text-slate-400" />
        </div>
        <input
          type="text"
          placeholder="Cari nama, departemen, atau nomor HP..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="block w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 pl-10 pr-4 text-sm text-slate-900 focus:border-indigo-600 focus:bg-white focus:ring-0 transition-colors"
        />
      </div>

      {/* List Container */}
      {filteredEmployees.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 py-16 px-4 text-center bg-slate-50/50">
          <Users className="h-10 w-10 text-slate-300 mb-2" />
          <h3 className="text-sm font-bold text-slate-800">Karyawan Tidak Ditemukan</h3>
          <p className="text-xs text-slate-400 max-w-xs mt-1">
            Tambahkan karyawan baru atau unggah daftar CSV terlebih dahulu.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Daftar Karyawan ({filteredEmployees.length})
          </span>

          <div className="divide-y divide-slate-100 rounded-2xl border border-slate-100 bg-white overflow-hidden shadow-xs">
            {filteredEmployees.map((emp) => (
              <div
                key={emp.id}
                className="flex items-center justify-between p-4 hover:bg-slate-50/20 transition-colors"
              >
                <div className="min-w-0 space-y-1">
                  <h4 className="text-xs font-bold text-slate-900 truncate">
                    {emp.full_name}
                  </h4>

                  <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-slate-400 font-medium">
                    <span className="flex items-center gap-1">
                      <Briefcase className="h-3 w-3 text-slate-300" />
                      {emp.department || 'Tanpa Departemen'}
                    </span>
                    {emp.phone_number && (
                      <span className="flex items-center gap-1">
                        <Phone className="h-3 w-3 text-slate-300" />
                        {emp.phone_number}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-lg border border-slate-100">
                  <button
                    onClick={() => openEditModal(emp)}
                    className="p-1.5 rounded-md hover:bg-white text-slate-500 hover:text-indigo-600 transition-colors shadow-none hover:shadow-xs"
                    title="Edit Karyawan"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => handleDeleteEmployee(emp.id)}
                    className="p-1.5 rounded-md hover:bg-white text-slate-500 hover:text-red-600 transition-colors shadow-none hover:shadow-xs"
                    title="Hapus Karyawan"
                  >
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 border border-slate-100 shadow-xl space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">
                {editingEmployee ? 'Edit Data Karyawan' : 'Tambah Karyawan Baru'}
              </h3>
              <button
                onClick={() => setShowAddEditModal(false)}
                className="p-1 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEmployee} className="space-y-4">
              {formError && (
                <div className="rounded-lg bg-red-50 p-3 text-xs text-red-600 flex items-start gap-2 border border-red-100">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Nama Lengkap</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Budi Santoso"
                  className="mt-1 block w-full rounded-lg border border-slate-200 py-2 px-3 text-xs text-slate-900 focus:border-indigo-600 transition-colors"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Departemen / Divisi</label>
                <input
                  type="text"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  placeholder="Produksi B"
                  className="mt-1 block w-full rounded-lg border border-slate-200 py-2 px-3 text-xs text-slate-900 focus:border-indigo-600 transition-colors"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">No. WhatsApp</label>
                <input
                  type="text"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="08123456789"
                  className="mt-1 block w-full rounded-lg border border-slate-200 py-2 px-3 text-xs text-slate-900 focus:border-indigo-600 transition-colors"
                />
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddEditModal(false)}
                  className="flex-1 rounded-lg border border-slate-200 bg-white py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 rounded-lg bg-indigo-600 py-2 text-xs font-bold text-white shadow-sm hover:bg-indigo-500 transition-colors"
                >
                  {isSubmitting ? 'Menyimpan...' : (editingEmployee ? 'Simpan Perubahan' : 'Tambah Karyawan')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CSV Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 border border-slate-100 shadow-xl space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">Import Karyawan Massal</h3>
              <button
                onClick={() => setShowImportModal(false)}
                className="p-1 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleBulkImport} className="space-y-4">
              {importError && (
                <div className="rounded-lg bg-red-50 p-3 text-xs text-red-600 flex items-start gap-2 border border-red-100">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{importError}</span>
                </div>
              )}

              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Format Data</label>
                <p className="text-[10px] text-slate-500 leading-relaxed bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                  Format: <code className="font-semibold text-slate-700">Nama Lengkap, Departemen, Telepon</code>
                  <br />
                  Minimal isi nama. Satu baris = satu karyawan.
                </p>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Paste Teks CSV</label>
                <textarea
                  rows={6}
                  value={csvText}
                  onChange={(e) => setCsvText(e.target.value)}
                  placeholder="Budi Santoso, Produksi A, 0812999000&#10;Sari Dewi, HRD, 0812999001&#10;Andi Wijaya"
                  className="block w-full rounded-lg border border-slate-200 py-2 px-3 text-xs text-slate-900 font-mono focus:border-indigo-600 focus:ring-0 transition-colors"
                  required
                />
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowImportModal(false)}
                  className="flex-1 rounded-lg border border-slate-200 bg-white py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 rounded-lg bg-indigo-600 py-2 text-xs font-bold text-white shadow-sm hover:bg-indigo-500 transition-colors flex items-center justify-center gap-2"
                >
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
