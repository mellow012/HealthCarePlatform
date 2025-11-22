'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Search, Plus, Loader2, User, Calendar, Phone, Mail, X } from 'lucide-react';

interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  lastVisit: string | null;
}

const PatientCreationModal = ({ onClose, onSave }: any) => {
  const [formData, setFormData] = useState({
    firstName: '', lastName: '', email: '', phone: '', dateOfBirth: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = await onSave(formData);
    if (result === true) onClose();
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-gray-900">Add New Patient</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <input placeholder="First Name" name="firstName" required onChange={(e) => setFormData({ ...formData, firstName: e.target.value })} className="px-4 py-3 border rounded-lg" />
            <input placeholder="Last Name" name="lastName" required onChange={(e) => setFormData({ ...formData, lastName: e.target.value })} className="px-4 py-3 border rounded-lg" />
          </div>
          <input type="email" placeholder="Email" name="email" required onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="w-full px-4 py-3 border rounded-lg" />
          <input type="tel" placeholder="Phone (Optional)" name="phone" onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="w-full px-4 py-3 border rounded-lg" />
          <input type="date" name="dateOfBirth" required onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })} className="w-full px-4 py-3 border rounded-lg" />
          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} className="flex-1 py-3 border rounded-lg font-medium hover:bg-gray-50">Cancel</button>
            <button type="submit" className="flex-1 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 shadow-md">Add Patient</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default function HospitalPatientsPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);

  const fetchPatients = useCallback(async () => {
    setLoading(true);
    const res = await fetch('/api/doctor/patients');
    const json = await res.json();
    setPatients(json.success ? json.data : []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchPatients(); }, [fetchPatients]);

  const filtered = useMemo(() => {
    if (!searchTerm) return patients;
    const term = searchTerm.toLowerCase();
    return patients.filter(p =>
      `${p.firstName} ${p.lastName}`.toLowerCase().includes(term) ||
      p.email.toLowerCase().includes(term)
    );
  }, [patients, searchTerm]);

  const handleSave = async (data: any) => {
    const res = await fetch('/api/hospital/patients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      fetchPatients();
      return true;
    }
    return 'Failed to add patient';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
                <User className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Patient Management</h1>
                <p className="text-gray-600">View and manage all registered patients</p>
              </div>
            </div>
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 px-5 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 shadow-md transition"
            >
              <Plus className="w-5 h-5" />
              Add Patient
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search patients..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 transition"
            />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          {loading ? (
            <div className="p-16 text-center"><Loader2 className="w-12 h-12 animate-spin mx-auto text-blue-600" /></div>
          ) : filtered.length === 0 ? (
            <div className="p-16 text-center text-gray-500">
              <User className="w-20 h-20 mx-auto mb-4 text-gray-300" />
              <p className="text-xl font-semibold">No patients found</p>
            </div>
          ) : (
            <table className="min-w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Patient</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Contact</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">DOB</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Last Visit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filtered.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-5">
                      <div className="font-semibold text-gray-900">{p.firstName} {p.lastName}</div>
                      <div className="text-sm text-gray-500">ID: {p.id.slice(0, 8)}...</div>
                    </td>
                    <td className="px-6 py-5 text-sm">
                      <div className="flex items-center gap-2"><Mail className="w-4 h-4" /> {p.email}</div>
                      {p.phone && <div className="flex items-center gap-2 mt-1"><Phone className="w-4 h-4" /> {p.phone}</div>}
                    </td>
                    <td className="px-6 py-5 text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        {new Date(p.dateOfBirth).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-5 text-sm font-medium text-gray-600">
                      {p.lastVisit ? new Date(p.lastVisit).toLocaleDateString() : 'Never'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {showModal && <PatientCreationModal onClose={() => setShowModal(false)} onSave={handleSave} />}
    </div>
  );
}