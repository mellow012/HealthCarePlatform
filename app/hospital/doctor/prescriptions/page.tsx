// app/hospital/doctor/prescriptions/page.tsx
'use client';

import { useEffect, useState } from 'react';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import {
  Pill,
  Search,
  Filter,
  Loader2,
  User,
  Calendar,
  Clock,
  CheckCircle,
  AlertCircle,
  XCircle,
  Plus
} from 'lucide-react';

interface Prescription {
  id: string;
  medication: {
    name: string;
    form: string;
    strength: string;
  };
  dosage: {
    quantity: number;
    unit: string;
    frequency: string;
    timesPerDay: number;
  };
  duration: {
    value: number;
    unit: string;
    startDate: string;
    endDate: string | null;
  };
  status: string;
  instructions: string;
  patient: {
    id: string;
    name: string;
    email: string;
  };
  createdAt: string;
}

export default function DoctorPrescriptionsPage() {
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');
  const [search, setSearch] = useState('');
  const router = useRouter();

  useEffect(() => {
    fetchPrescriptions();
  }, []);

  const fetchPrescriptions = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/doctor/prescriptions');
      const json = await res.json();

      if (json.success) {
        setPrescriptions(json.data || []);
      }
    } catch (err) {
      console.error('Error fetching prescriptions:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredPrescriptions = prescriptions.filter((rx) => {
    const matchesFilter = filter === 'all' || rx.status === filter;
    const matchesSearch =
      !search ||
      rx.medication.name.toLowerCase().includes(search.toLowerCase()) ||
      rx.patient.name.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
      active: { bg: 'bg-green-100', text: 'text-green-800', icon: <CheckCircle className="w-3 h-3" /> },
      completed: { bg: 'bg-gray-100', text: 'text-gray-800', icon: <CheckCircle className="w-3 h-3" /> },
      cancelled: { bg: 'bg-red-100', text: 'text-red-800', icon: <XCircle className="w-3 h-3" /> },
      on_hold: { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: <AlertCircle className="w-3 h-3" /> },
    };
    const badge = badges[status] || badges.active;
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 ${badge.bg} ${badge.text} text-xs font-semibold rounded-full capitalize`}>
        {badge.icon}
        {status}
      </span>
    );
  };

  const getFrequencyLabel = (frequency: string) => {
    const labels: Record<string, string> = {
      once_daily: 'Once daily',
      twice_daily: 'Twice daily',
      three_times_daily: '3x daily',
      four_times_daily: '4x daily',
      every_12_hours: 'Every 12h',
      every_8_hours: 'Every 8h',
      every_6_hours: 'Every 6h',
      as_needed: 'As needed',
    };
    return labels[frequency] || frequency;
  };

  return (
    <ProtectedRoute allowedRoles={['doctor']}>
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Pill className="w-8 h-8 text-blue-600" />
            My Prescriptions
          </h1>
          <p className="text-gray-600 mt-1">View all prescriptions you've written</p>
          <button 
           onClick={() => router.push('/hospital/doctor/prescriptions/create')}
           className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg">
            <Plus className="w-5 h-5" /> New Prescription
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow p-4">
            <p className="text-sm text-gray-600">Total</p>
            <p className="text-2xl font-bold text-gray-900">{prescriptions.length}</p>
          </div>
          <div className="bg-white rounded-xl shadow p-4">
            <p className="text-sm text-gray-600">Active</p>
            <p className="text-2xl font-bold text-green-600">
              {prescriptions.filter((r) => r.status === 'active').length}
            </p>
          </div>
          <div className="bg-white rounded-xl shadow p-4">
            <p className="text-sm text-gray-600">Completed</p>
            <p className="text-2xl font-bold text-gray-600">
              {prescriptions.filter((r) => r.status === 'completed').length}
            </p>
          </div>
          <div className="bg-white rounded-xl shadow p-4">
            <p className="text-sm text-gray-600">This Week</p>
            <p className="text-2xl font-bold text-blue-600">
              {prescriptions.filter((r) => {
                const created = new Date(r.createdAt);
                const weekAgo = new Date();
                weekAgo.setDate(weekAgo.getDate() - 7);
                return created >= weekAgo;
              }).length}
            </p>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="bg-white rounded-xl shadow p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by medication or patient..."
                className="w-full pl-10 pr-4 py-2 border rounded-lg"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-gray-400" />
              {(['all', 'active', 'completed'] as const).map((status) => (
                <button
                  key={status}
                  onClick={() => setFilter(status)}
                  className={`px-4 py-2 rounded-lg font-medium capitalize transition ${
                    filter === status
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Prescriptions List */}
        <div className="bg-white rounded-xl shadow overflow-hidden">
          {loading ? (
            <div className="p-12 text-center">
              <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
              <p className="text-gray-600">Loading prescriptions...</p>
            </div>
          ) : filteredPrescriptions.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <Pill className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium">No prescriptions found</p>
              <p className="text-sm mt-1">
                {search ? 'Try a different search term' : 'Prescriptions you write will appear here'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {filteredPrescriptions.map((rx) => (
                <div key={rx.id} className="p-6 hover:bg-gray-50 transition">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center shrink-0">
                        <Pill className="w-6 h-6 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900 text-lg">
                          {rx.medication.name}
                          {rx.medication.strength && (
                            <span className="text-gray-500 font-normal ml-2">
                              {rx.medication.strength}
                            </span>
                          )}
                        </h3>
                        <p className="text-sm text-gray-600 mt-1">
                          {rx.dosage.quantity} {rx.dosage.unit} • {getFrequencyLabel(rx.dosage.frequency)} •{' '}
                          {rx.duration.unit === 'ongoing'
                            ? 'Ongoing'
                            : `${rx.duration.value} ${rx.duration.unit}`}
                        </p>
                        {rx.instructions && (
                          <p className="text-sm text-gray-500 mt-1 italic">"{rx.instructions}"</p>
                        )}

                        {/* Patient Info */}
                        <div className="flex items-center gap-4 mt-3">
                          <span className="flex items-center gap-1 text-sm text-gray-600">
                            <User className="w-4 h-4" />
                            {rx.patient.name}
                          </span>
                          <span className="flex items-center gap-1 text-sm text-gray-500">
                            <Calendar className="w-4 h-4" />
                            {format(new Date(rx.createdAt), 'MMM d, yyyy')}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-2">
                      {getStatusBadge(rx.status)}
                      {rx.duration.endDate && (
                        <span className="text-xs text-gray-500">
                          Ends: {format(new Date(rx.duration.endDate), 'MMM d')}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}