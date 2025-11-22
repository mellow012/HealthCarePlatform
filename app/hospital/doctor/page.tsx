// app/hospital/doctor/page.tsx
'use client';

import { useEffect, useState } from 'react';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import {
  Users, FileText, Clock, Calendar, Stethoscope, Pill, 
  CheckCircle, AlertCircle, X, Activity, TrendingUp,
  ChevronRight, Droplets, Loader2, Plus, Trash2
} from 'lucide-react';

interface PatientVisit {
  id: string;
  patientId: string;
  checkInTime: string;
  purpose: string;
  department: string;
  patient: {
    id: string;
    email: string;
    profile: {
      firstName: string;
      lastName: string;
      phone?: string;
      dateOfBirth?: string;
      bloodType?: string;
    };
  };
}

const getWaitTime = (checkInTime: string) => {
  const mins = Math.floor((Date.now() - new Date(checkInTime).getTime()) / 60000);
  if (mins < 60) return `${mins}m`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
};

const getAge = (dob?: string) => {
  if (!dob) return null;
  const today = new Date();
  const birth = new Date(dob);
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
};

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
};

export default function DoctorDashboard() {
  const { userData } = useAuth();
  const [patients, setPatients] = useState<PatientVisit[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVisit, setSelectedVisit] = useState<PatientVisit | null>(null);
  const [notification, setNotification] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [stats, setStats] = useState({ completed: 0, todayTotal: 0 });

  const fetchPatients = async () => {
    try {
      const res = await fetch('/api/doctor/patients');
      const json = await res.json();
      if (json.success) {
        setPatients(json.data || []);
      }
    } catch (err: any) {
      console.error('Failed to fetch patients:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/doctor/stats');
      const json = await res.json();
      if (json.success) {
        setStats(json.data);
      }
    } catch (err) {
      // Stats are optional, don't show error
    }
  };

  useEffect(() => {
    fetchPatients();
    fetchStats();
    const interval = setInterval(fetchPatients, 30000);
    return () => clearInterval(interval);
  }, []);

  const showNotification = (msg: string, type: 'success' | 'error') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const todayDate = new Date().toLocaleDateString('en-US', { 
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
  });

  return (
    <ProtectedRoute allowedRoles={['doctor']}>
      <div className="min-h-screen bg-slate-50">
        {/* Header */}
        <header className="bg-white border-b border-slate-200">
          <div className="max-w-7xl mx-auto px-6 py-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                  <Stethoscope className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-slate-900">
                    {getGreeting()}, Dr. {userData?.profile?.firstName}
                  </h1>
                  <p className="text-slate-500 flex items-center gap-2 mt-0.5">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-blue-50 text-blue-700 text-sm font-medium rounded-full">
                      <Activity className="w-3.5 h-3.5" />
                      {userData?.department || 'General Medicine'}
                    </span>
                    <span className="text-slate-300">•</span>
                    <span>{todayDate}</span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-6 py-8">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
            <div className="bg-white rounded-2xl p-5 border border-slate-200 hover:shadow-lg hover:shadow-slate-200/50 transition-shadow">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500">In Queue</p>
                  <p className="text-3xl font-bold text-slate-900 mt-1">{patients.length}</p>
                  <p className="text-xs text-slate-400 mt-1">patients waiting</p>
                </div>
                <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center">
                  <Users className="w-6 h-6 text-amber-600" />
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-2xl p-5 border border-slate-200 hover:shadow-lg hover:shadow-slate-200/50 transition-shadow">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500">Today's Appointments</p>
                  <p className="text-3xl font-bold text-slate-900 mt-1">{stats.todayTotal || patients.length}</p>
                  <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" /> {stats.completed} completed
                  </p>
                </div>
                <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-2xl p-5 border border-slate-200 hover:shadow-lg hover:shadow-slate-200/50 transition-shadow">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500">Avg. Wait Time</p>
                  <p className="text-3xl font-bold text-slate-900 mt-1">
                    {patients.length > 0 
                      ? getWaitTime(patients[Math.floor(patients.length / 2)]?.checkInTime || new Date().toISOString())
                      : '0m'}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">current queue</p>
                </div>
                <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center">
                  <Clock className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-2xl p-5 border border-slate-200 hover:shadow-lg hover:shadow-slate-200/50 transition-shadow">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500">Completed</p>
                  <p className="text-3xl font-bold text-slate-900 mt-1">{stats.completed}</p>
                  <p className="text-xs text-slate-400 mt-1">today</p>
                </div>
                <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Patient Queue */}
            <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">Patient Queue</h2>
                  <p className="text-sm text-slate-500 mt-0.5">
                    {patients.length} patients waiting in {userData?.department || 'your department'}
                  </p>
                </div>
              </div>

              {loading ? (
                <div className="p-12 text-center">
                  <Loader2 className="w-10 h-10 animate-spin text-blue-600 mx-auto" />
                  <p className="text-slate-500 mt-3">Loading queue...</p>
                </div>
              ) : patients.length === 0 ? (
                <div className="p-12 text-center">
                  <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Users className="w-8 h-8 text-slate-400" />
                  </div>
                  <p className="text-lg font-medium text-slate-700">No patients waiting</p>
                  <p className="text-slate-500 mt-1">New patients will appear here when they check in</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {patients.map((visit, idx) => (
                    <div
                      key={visit.id}
                      className="p-5 hover:bg-slate-50 transition cursor-pointer group"
                      onClick={() => setSelectedVisit(visit)}
                    >
                      <div className="flex items-center gap-4">
                        {/* Queue Position */}
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-lg ${
                          idx === 0 ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {idx + 1}
                        </div>
                        
                        {/* Patient Avatar */}
                        <div className="w-12 h-12 bg-gradient-to-br from-slate-100 to-slate-200 rounded-full flex items-center justify-center">
                          <span className="text-lg font-semibold text-slate-600">
                            {visit.patient.profile.firstName?.[0]}{visit.patient.profile.lastName?.[0]}
                          </span>
                        </div>
                        
                        {/* Patient Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-slate-900">
                              {visit.patient.profile.firstName} {visit.patient.profile.lastName}
                            </h3>
                            {visit.patient.profile.bloodType && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-50 text-red-700 text-xs font-medium rounded-full">
                                <Droplets className="w-3 h-3" />
                                {visit.patient.profile.bloodType}
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-slate-600 mt-0.5 truncate">{visit.purpose}</p>
                          <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5" />
                              {format(new Date(visit.checkInTime), 'HH:mm')}
                            </span>
                            <span className="text-slate-300">•</span>
                            <span className="text-amber-600 font-medium">
                              Waiting {getWaitTime(visit.checkInTime)}
                            </span>
                            {getAge(visit.patient.profile.dateOfBirth) && (
                              <>
                                <span className="text-slate-300">•</span>
                                <span>{getAge(visit.patient.profile.dateOfBirth)} yrs</span>
                              </>
                            )}
                          </div>
                        </div>
                        
                        {/* Action Button */}
                        <button 
                          className={`px-5 py-2.5 rounded-xl font-medium transition flex items-center gap-2 ${
                            idx === 0
                              ? 'bg-green-600 text-white hover:bg-green-700 shadow-sm'
                              : 'bg-slate-100 text-slate-700 hover:bg-blue-600 hover:text-white'
                          }`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedVisit(visit);
                          }}
                        >
                          {idx === 0 ? 'Start Now' : 'Consult'}
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Quick Actions */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5">
                <h3 className="font-semibold text-slate-900 mb-4">Quick Actions</h3>
                <div className="space-y-2">
                  <a href="/hospital/doctor/history" className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition">
                    <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                      <FileText className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">View History</p>
                      <p className="text-xs text-slate-500">Past consultations</p>
                    </div>
                  </a>
                  <a href="/hospital/doctor/prescriptions" className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition">
                    <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center">
                      <Pill className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">Prescriptions</p>
                      <p className="text-xs text-slate-500">Manage medications</p>
                    </div>
                  </a>
                  <a href="/hospital/doctor/appointments" className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition">
                    <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
                      <Calendar className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">Appointments</p>
                      <p className="text-xs text-slate-500">Upcoming schedule</p>
                    </div>
                  </a>
                  <a href="/hospital/doctor/reports/create" className="...">
                  <FileText className="w-5 h-5 text-indigo-600" />
                  Create Report
                  </a>
                </div>
              </div>

              {/* Department Card */}
              <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-5 text-white">
                <div className="flex items-center gap-2 mb-4">
                  <Activity className="w-5 h-5 text-blue-200" />
                  <h3 className="font-semibold">{userData?.department || 'Department'} Today</h3>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-3xl font-bold">{patients.length + stats.completed}</p>
                    <p className="text-sm text-blue-200">Total visits</p>
                  </div>
                  <div>
                    <p className="text-3xl font-bold">{stats.completed}</p>
                    <p className="text-sm text-blue-200">Completed</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>

        {/* Consultation Modal */}
        {selectedVisit && (
          <ConsultationModal
            visit={selectedVisit}
            onClose={() => setSelectedVisit(null)}
            onSuccess={() => {
              showNotification('Diagnosis saved & published to patient passport!', 'success');
              fetchPatients();
              fetchStats();
            }}
            showNotification={showNotification}
          />
        )}

        {/* Toast */}
        {notification && (
          <div className={`fixed bottom-6 right-6 ${
            notification.type === 'success' ? 'bg-green-600' : 'bg-red-600'
          } text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 z-50`}>
            {notification.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
            <span className="font-medium">{notification.msg}</span>
            <button onClick={() => setNotification(null)} className="ml-2 hover:bg-white/20 rounded p-1">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}

// Import the ConsultationModal from the component file or include it here
import ConsultationModal from '@/components/doctor/ConsultationModal';