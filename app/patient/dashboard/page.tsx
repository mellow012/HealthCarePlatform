'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import EmergencyServicesCard from '@/components/emergency/EmergencyServiceCard';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { 
  Calendar, 
  Hospital, 
  Clock, 
  UserCheck, 
  MapPin, 
  AlertCircle,
  CheckCircle,
  ChevronRight,
  Loader2,
  Shield,
  ArrowRight,
  Brain,
  Pill
} from 'lucide-react';
import CurrentVisitCard from '../visits/current/page';

interface Visit {
  id: string;
  hospitalId: string;
  checkInTime: string;
  checkOutTime: string | null;
  status: 'checked_in' | 'checked_out';
  purpose: string;
  department: string;
  hospital: {
    name: string;
    address: object;
  };
}
interface StatCardProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  value: number | string;
  color: 'blue' | 'green' | 'yellow';
}

interface PassportStatus {
  isActive: boolean;
  activatedAt?: string;
  consent: {
    dataSharing: boolean;
    emergencyAccess: boolean;
  };
}

export default function PatientDashboard() {
  const { userData } = useAuth();
  const router = useRouter();
  const [visits, setVisits] = useState<Visit[]>([]);
  const [passport, setPassport] = useState<PassportStatus | null>(null);
  const [availableHospitals, setAvailableHospitals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchData();
  }, [searchQuery]);

 const fetchData = async () => {
  setLoading(true);
  setError('');
  try {
    // Fetch visits
    const visitsRes = await fetch('/api/patient/visits');
    const visitsData = await visitsRes.json();
    if (!visitsRes.ok) throw new Error(visitsData.error || 'Failed to fetch visits');
    setVisits(visitsData.data || []);

    // FETCH PASSPORT WITH isActive FLAG
    const passportRes = await fetch('/api/patient/ehealth-passport');
    const passportData = await passportRes.json();

    if (passportRes.ok && passportData.success) {
      setPassport({
        isActive: passportData.data.isActive || false,
        activatedAt: passportData.data.activatedAt,
        consent: { dataSharing: true, emergencyAccess: true },
      });
    } else {
      setPassport(null);
    }

    // Fetch hospitals
    const hospitalsRes = await fetch(`/api/hospital?search=${encodeURIComponent(searchQuery)}`);
    const hospitalsData = await hospitalsRes.json();
    if (!hospitalsRes.ok) throw new Error(hospitalsData.error || 'Failed to fetch hospitals');
    setAvailableHospitals(hospitalsData.data || []);
  } catch (err: any) {
    setError(err.message);
  } finally {
    setLoading(false);
  }
};

  const getStatusIcon = (status: string) => {
    return status === 'checked_in' ? (
      <div className="inline-flex items-center px-2 py-1 rounded-full bg-yellow-100 text-yellow-800 text-xs font-medium">
        <Clock className="w-3 h-3 mr-1" />
        Checked In
      </div>
    ) : (
      <div className="inline-flex items-center px-2 py-1 rounded-full bg-green-100 text-green-800 text-xs font-medium">
        <CheckCircle className="w-3 h-3 mr-1" />
        Checked Out
      </div>
    );
  };

  const formatDateTime = (isoString: string) => {
    return new Date(isoString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const uniqueHospitals = Array.from(new Set(visits.map(v => v.hospitalId))).map(id => 
    visits.find(v => v.hospitalId === id)?.hospital
  ).filter(Boolean);

  if (loading) {
    return (
      <ProtectedRoute allowedRoles={['patient']}>
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
            <p className="text-gray-600">Loading your dashboard...</p>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute allowedRoles={['patient']}>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white shadow-sm">
          <div className="max-w-6xl mx-auto px-4 py-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Welcome Back, {userData?.profile?.firstName}</h1>
                <p className="text-gray-600 mt-1">Your health journey at a glance</p>
              </div>
              <button
                onClick={() => router.push('/auth/profile')}
                className="self-start sm:self-end px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <UserCheck className="w-4 h-4" />
                Manage Profile
              </button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-6xl mx-auto px-4 py-8">
          {/* Error Alert */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-red-800">{error}</div>
            </div>
          )}

          {/* Stats Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <StatCard 
              icon={Calendar} 
              title="Total Visits" 
              value={visits.length} 
              color="blue" 
            />
            <StatCard 
              icon={Hospital} 
              title="Hospitals Visited" 
              value={uniqueHospitals.length} 
              color="green" 
            />
            <StatCard 
              icon={Clock} 
              title="Active Check-ins" 
              value={visits.filter(v => v.status === 'checked_in').length} 
              color="yellow" 
            />
          </div>

          {/* Feature Cards Row - E-Health Passport, AI Diagnosis, Dosage Scheduler */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {/* E-Health Passport Card */}
            <div 
              className="bg-white rounded-xl shadow p-6 hover:shadow-lg transition-shadow cursor-pointer" 
              onClick={() => router.push('/patient/ehealth-passport')}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">E-Health Passport</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {passport?.isActive ? 'Active' : 'Inactive'}
                  </p>
                </div>
                <div className="p-3 rounded-full bg-blue-100">
                  <Shield className="w-6 h-6 text-blue-600" />
                </div>
              </div>
              <div className="mt-4 flex items-center text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors">
                View Details <ArrowRight className="w-4 h-4 ml-1" />
              </div>
            </div>

            {/* AI Diagnosis Card */}
            <div 
              className="bg-white rounded-xl shadow p-6 hover:shadow-lg transition-shadow cursor-pointer" 
              onClick={() => router.push('/patient/ai-diagnosis')}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">AI Diagnosis</p>
                  <p className="text-2xl font-bold text-gray-900">Symptom Checker</p>
                </div>
                <div className="p-3 rounded-full bg-blue-100">
                  <Brain className="w-6 h-6 text-blue-600" />
                </div>
              </div>
              <div className="mt-4 flex items-center text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors">
                Start Check <ArrowRight className="w-4 h-4 ml-1" />
              </div>
            </div>

            {/* Dosage Scheduler Card */}
            <div 
              className="bg-white rounded-xl shadow p-6 hover:shadow-lg transition-shadow cursor-pointer" 
              onClick={() => router.push('/patient/dosage-scheduler/overview')}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">Dosage Scheduler</p>
                  <p className="text-2xl font-bold text-gray-900">Med Reminders</p>
                </div>
                <div className="p-3 rounded-full bg-blue-100">
                  <Pill className="w-6 h-6 text-blue-600" />
                </div>
              </div>
              <div className="mt-4 flex items-center text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors">
                Manage Meds <ArrowRight className="w-4 h-4 ml-1" />
              </div>
            </div>
            <EmergencyServicesCard />
          </div>

          {/* Hospitals You've Visited */}
          {uniqueHospitals.length > 0 && (
            <div className="bg-white rounded-xl shadow-lg mb-8 overflow-hidden">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">Hospitals You've Visited</h2>
                <p className="text-sm text-gray-600 mt-1">Quick access to your care providers</p>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {uniqueHospitals.map((hospital) => (
                    <div key={hospital.id || hospital?.name} className="bg-gray-50 p-4 rounded-lg hover:bg-gray-100 transition-colors">
                      <div className="flex items-center gap-3 mb-2">
                        <Hospital className="w-5 h-5 text-blue-600" />
                        <h4 className="font-semibold text-gray-900">{hospital?.name}</h4>
                      </div>
                      <p className="text-sm text-gray-600">
                        {Object.values(hospital?.address || {}).join(', ') || 'Address not listed'}
                      </p>
                      <button
                        onClick={() => router.push(`/hospital/${hospital.id}`)}
                        className="mt-3 w-full bg-blue-600 text-white py-1 px-3 rounded text-xs font-medium hover:bg-blue-700 transition-colors"
                      >
                        View Records
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <CurrentVisitCard />

          {/* Recent Visits */}
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Recent Visits</h2>
              <p className="text-sm text-gray-600 mt-1">Your medical visits and check-in history</p>
            </div>

            {visits.length === 0 ? (
              <div className="p-12 text-center text-gray-500">
                <Calendar className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-medium mb-2">No visits yet</h3>
                <p className="text-sm">Your visit history will appear here once you check in at a hospital.</p>
                <button
                  onClick={() => router.push('/find-hospital')}
                  className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                >
                  Find a Hospital
                </button>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {visits.map((visit) => (
                  <div key={visit.id} className="p-6 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        {/* Hospital */}
                        <div className="flex items-center gap-3 mb-3">
                          <Hospital className="w-5 h-5 text-blue-600" />
                          <div>
                            <h4 className="font-semibold text-gray-900">{visit.hospital.name}</h4>
                            <p className="text-sm text-gray-600">
                              {Object.values(visit.hospital.address || {}).join(', ') || 'Address not available'}
                            </p>
                          </div>
                        </div>

                        {/* Status */}
                        <div className="mb-3">{getStatusIcon(visit.status)}</div>

                        {/* Details */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 text-gray-600">
                              <Calendar className="w-4 h-4" />
                              <span>Check-in:</span>
                              <span className="font-medium text-gray-900">{formatDateTime(visit.checkInTime)}</span>
                            </div>
                            {visit.checkOutTime && (
                              <div className="flex items-center gap-2 text-gray-600">
                                <Clock className="w-4 h-4" />
                                <span>Check-out:</span>
                                <span className="font-medium text-gray-900">{formatDateTime(visit.checkOutTime)}</span>
                              </div>
                            )}
                          </div>
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 text-gray-600">
                              <span>Department:</span>
                              <span className="font-medium text-gray-900">{visit.department}</span>
                            </div>
                            <div className="flex items-center gap-2 text-gray-600">
                              <span>Purpose:</span>
                              <span className="font-medium text-gray-900">{visit.purpose}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Action */}
                      <div className="flex flex-col items-end gap-2 ml-4">
                        <button
                          onClick={() => router.push(`/visit/${visit.id}`)}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
                        >
                          View Details <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Available Hospitals Search */}
            <div className="p-6 border-t border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Find Nearby Hospitals</h3>
              <div className="flex gap-2 mb-4">
                <input
                  type="text"
                  placeholder="Search hospitals by name or location..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={fetchData}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Search
                </button>
              </div>
              {availableHospitals.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No hospitals found. Try a different search.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {availableHospitals.map((hospital) => (
                    <div key={hospital.id} className="bg-gray-50 p-4 rounded-lg hover:bg-gray-100 transition-colors">
                      <h4 className="font-semibold text-gray-900 mb-2">{hospital.name}</h4>
                      <p className="text-sm text-gray-600 mb-3">{Object.values(hospital.address || {}).join(', ')}</p>
                      <button
                        onClick={() => router.push(`/hospital/${hospital.id}/checkin`)}
                        className="w-full bg-green-600 text-white py-2 px-4 rounded text-sm font-medium hover:bg-green-700 transition-colors"
                      >
                        Check In
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}

// StatCard (same as before)
const StatCard = ({ icon: Icon, title, value, color }: StatCardProps) => {
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    yellow: 'bg-yellow-100 text-yellow-600',
  } as const;

  return (
    <div className="bg-white rounded-xl shadow p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
        </div>
        <div className={`p-4 rounded-full ${colorClasses[color]}`}>
          <Icon className="w-10 h-10" />
        </div>
      </div>
    </div>
  );
};