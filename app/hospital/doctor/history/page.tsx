// app/hospital/doctor/history/page.tsx
'use client';

import { useEffect, useState } from 'react';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { format } from 'date-fns';
import {
  FileText,
  Search,
  Loader2,
  User,
  Calendar,
  ChevronDown,
  ChevronUp,
  Pill,
} from 'lucide-react';

interface DiagnosisRecord {
  id: string;
  patientId: string;
  diagnosis: string;
  recommendations: string;
  medicationCount: number;
  department: string;
  createdAt: string;
  patient: {
    id: string;
    name: string;
    email: string;
  };
  prescriptions?: Array<{
    id: string;
    medication: { name: string; strength: string };
    dosage: { frequency: string };
  }>;
}

export default function DoctorHistoryPage() {
  const [records, setRecords] = useState<DiagnosisRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/doctor/history');
      const json = await res.json();

      if (json.success) {
        setRecords(json.data || []);
      }
    } catch (err) {
      console.error('Error fetching history:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredRecords = records.filter((record) => {
    if (!search) return true;
    return (
      record.diagnosis.toLowerCase().includes(search.toLowerCase()) ||
      record.patient.name.toLowerCase().includes(search.toLowerCase())
    );
  });

  return (
    <ProtectedRoute allowedRoles={['doctor']}>
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <FileText className="w-8 h-8 text-blue-600" />
            Consultation History
          </h1>
          <p className="text-gray-600 mt-1">View past diagnoses and consultations</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow p-4">
            <p className="text-sm text-gray-600">Total Consultations</p>
            <p className="text-2xl font-bold text-gray-900">{records.length}</p>
          </div>
          <div className="bg-white rounded-xl shadow p-4">
            <p className="text-sm text-gray-600">This Month</p>
            <p className="text-2xl font-bold text-blue-600">
              {records.filter((r) => {
                const created = new Date(r.createdAt);
                const now = new Date();
                return created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear();
              }).length}
            </p>
          </div>
          <div className="bg-white rounded-xl shadow p-4">
            <p className="text-sm text-gray-600">Unique Patients</p>
            <p className="text-2xl font-bold text-green-600">
              {new Set(records.map((r) => r.patientId)).size}
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="bg-white rounded-xl shadow p-4 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by diagnosis or patient name..."
              className="w-full pl-10 pr-4 py-2 border rounded-lg"
            />
          </div>
        </div>

        {/* Records List */}
        <div className="bg-white rounded-xl shadow overflow-hidden">
          {loading ? (
            <div className="p-12 text-center">
              <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
              <p className="text-gray-600">Loading history...</p>
            </div>
          ) : filteredRecords.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <FileText className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium">No records found</p>
              <p className="text-sm mt-1">Your consultation history will appear here</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {filteredRecords.map((record) => (
                <div key={record.id} className="hover:bg-gray-50 transition">
                  <div
                    className="p-6 cursor-pointer"
                    onClick={() => setExpandedId(expandedId === record.id ? null : record.id)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center shrink-0">
                          <User className="w-6 h-6 text-green-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">{record.patient.name}</h3>
                          <p className="text-sm text-gray-600 mt-1 line-clamp-2">{record.diagnosis}</p>
                          <div className="flex items-center gap-4 mt-2">
                            <span className="flex items-center gap-1 text-sm text-gray-500">
                              <Calendar className="w-4 h-4" />
                              {format(new Date(record.createdAt), 'MMM d, yyyy • HH:mm')}
                            </span>
                            {record.medicationCount > 0 && (
                              <span className="flex items-center gap-1 text-sm text-blue-600">
                                <Pill className="w-4 h-4" />
                                {record.medicationCount} medication(s)
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <button className="p-2 text-gray-400">
                        {expandedId === record.id ? (
                          <ChevronUp className="w-5 h-5" />
                        ) : (
                          <ChevronDown className="w-5 h-5" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {expandedId === record.id && (
                    <div className="px-6 pb-6 pt-0">
                      <div className="ml-16 p-4 bg-gray-50 rounded-xl space-y-4">
                        <div>
                          <h4 className="text-sm font-semibold text-gray-700">Full Diagnosis</h4>
                          <p className="text-gray-600 mt-1">{record.diagnosis}</p>
                        </div>
                        {record.recommendations && (
                          <div>
                            <h4 className="text-sm font-semibold text-gray-700">Recommendations</h4>
                            <p className="text-gray-600 mt-1">{record.recommendations}</p>
                          </div>
                        )}
                        {record.prescriptions && record.prescriptions.length > 0 && (
                          <div>
                            <h4 className="text-sm font-semibold text-gray-700">Prescriptions</h4>
                            <ul className="mt-2 space-y-1">
                              {record.prescriptions.map((rx) => (
                                <li key={rx.id} className="text-sm text-gray-600 flex items-center gap-2">
                                  <Pill className="w-4 h-4 text-blue-500" />
                                  {rx.medication.name} {rx.medication.strength}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}