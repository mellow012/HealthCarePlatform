// app/hospital/receptionist/page.tsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import CheckInModal from '@/components/hospital/CheckInModal';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import {
  Users, UserCheck, Clock, Search, UserPlus,
  Loader2, AlertCircle, CheckCircle, X
} from 'lucide-react';

interface Visit {
  id: string;
  patientId: string;
  checkInTime: string;
  reason: string;
  queueNumber?: number | null;
  patient: { name: string; email: string };
}

export default function ReceptionistDashboard() {
  const { userData } = useAuth();
  const [activeVisits, setActiveVisits] = useState<Visit[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [showCheckInModal, setShowCheckInModal] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const fetchActiveVisits = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/visits/active');
      const data = await res.json();
      if (data.success) setActiveVisits(data.data || []);
    } catch (err) {
      setNotification({ message: 'Failed to load visits', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchActiveVisits();
    const interval = setInterval(fetchActiveVisits, 30000);
    return () => clearInterval(interval);
  }, [fetchActiveVisits]);

  const handleCheckOut = async (visitId: string) => {
    if (!confirm('Check out this patient?')) return;
    try {
      const res = await fetch(`/api/visits/${visitId}/checkout`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setNotification({ message: 'Patient checked out', type: 'success' });
        fetchActiveVisits();
      }
    } catch {
      setNotification({ message: 'Checkout failed', type: 'error' });
    }
  };

  const filteredVisits = activeVisits.filter(v =>
    v.patient.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    v.patient.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    v.reason.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <ProtectedRoute allowedRoles={['receptionist']}>
      <div className="space-y-6">
        {/* Welcome Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Reception</h1>
          <p className="text-gray-600 mt-1">
            Welcome back, {userData?.profile?.firstName || 'Receptionist'}
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-xl shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active Patients</p>
                <p className="text-3xl font-bold text-gray-900">{activeVisits.length}</p>
              </div>
              <Users className="w-10 h-10 text-blue-600 opacity-20" />
            </div>
          </div>
          <div className="bg-white rounded-xl shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">In Queue</p>
                <p className="text-3xl font-bold text-gray-900">{activeVisits.length}</p>
              </div>
              <Clock className="w-10 h-10 text-yellow-600 opacity-20" />
            </div>
          </div>
        </div>

        {/* Actions + Search */}
        <div className="bg-white rounded-xl shadow p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search patients..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              onClick={() => setShowCheckInModal(true)}
              className="px-6 py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 flex items-center gap-3"
            >
              <UserPlus className="w-5 h-5" />
              Check-in Patient
            </button>
          </div>
        </div>

        {/* Active Patients Table */}
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <div className="p-6 border-b">
            <h2 className="text-xl font-semibold">Active Patients</h2>
          </div>
          {loading ? (
            <div className="p-12 text-center"><Loader2 className="w-10 h-10 animate-spin mx-auto" /></div>
          ) : filteredVisits.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <Users className="w-20 h-20 mx-auto mb-4 opacity-30" />
              <p>No active patients</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Patient</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reason</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Queue</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredVisits.map(visit => (
                    <tr key={visit.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="font-medium">{visit.patient.name}</div>
                        <div className="text-sm text-gray-500">{visit.patient.email}</div>
                      </td>
                      <td className="px-6 py-4 text-sm">{visit.reason}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {new Date(visit.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="px-6 py-4">
                        {visit.queueNumber ? <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-bold">#{visit.queueNumber}</span> : '—'}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button onClick={() => handleCheckOut(visit.id)} className="text-red-600 hover:text-red-800 font-medium text-sm">
                          Check Out
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {showCheckInModal && (
        <CheckInModal
          onClose={() => setShowCheckInModal(false)}
          onSuccess={() => {
            setNotification({ message: 'Patient checked in!', type: 'success' });
            fetchActiveVisits();
          }}
        />
      )}

      {notification && (
        <div className={`fixed bottom-6 right-6 ${notification.type === 'success' ? 'bg-green-600' : 'bg-red-600'} text-white px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 z-50`}>
          {notification.type === 'success' ? <CheckCircle /> : <AlertCircle />}
          <span>{notification.message}</span>
          <button onClick={() => setNotification(null)} className="ml-4"><X className="w-5 h-5" /></button>
        </div>
      )}
    </ProtectedRoute>
  );
}