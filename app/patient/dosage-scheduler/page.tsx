// ==============================================
// 1. Dosage Scheduler Main Page
// app/patient/dosage-scheduler/page.tsx
// ==============================================

'use client';

import { useEffect, useState } from 'react';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { 
  Pill, 
  Calendar, 
  Clock,
  CheckCircle,
  XCircle,
  Bell,
  Plus,
  AlertCircle,
  BarChart3
} from 'lucide-react';
import Link from 'next/link';

interface Medication {
  id: string;
  name: string;
  dosage: string;
  timings: string[];
  startDate: string;
  endDate: string;
  totalDoses: number;
  remainingDoses: number;
  reminderEnabled: boolean;
  status: string;
}

interface TodaySchedule {
  id: string;
  scheduledDateTime: string;
  status: string;
  takenAt?: string;
  medication: {
    name: string;
    dosage: string;
    instructions?: string;
  };
}

export default function DosageSchedulerPage() {
  const [medications, setMedications] = useState<Medication[]>([]);
  const [todaySchedule, setTodaySchedule] = useState<TodaySchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'today' | 'medications'>('today');

  useEffect(() => {
    fetchData();
    // Refresh every minute to update timing
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      const [todayRes, medsRes] = await Promise.all([
        fetch('/api/dosage-scheduler/today'),
        fetch('/api/dosage-scheduler/medications?status=active'),
      ]);

      const todayData = await todayRes.json();
      const medsData = await medsRes.json();

      if (todayData.success) setTodaySchedule(todayData.data);
      if (medsData.success) setMedications(medsData.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkTaken = async (scheduleId: string) => {
    try {
      const response = await fetch('/api/dosage-scheduler/mark-taken', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scheduleId }),
      });

      if (response.ok) {
        fetchData(); // Refresh data
      }
    } catch (error) {
      console.error('Error marking dose:', error);
    }
  };

  const getTimeStatus = (scheduledTime: string) => {
    const scheduled = new Date(scheduledTime);
    const now = new Date();
    const diffMinutes = Math.floor((scheduled.getTime() - now.getTime()) / 60000);

    if (diffMinutes < -30) return { text: 'Overdue', color: 'text-red-600', bg: 'bg-red-50' };
    if (diffMinutes < 0) return { text: 'Due now', color: 'text-orange-600', bg: 'bg-orange-50' };
    if (diffMinutes < 30) return { text: `In ${diffMinutes}min`, color: 'text-yellow-600', bg: 'bg-yellow-50' };
    return { text: `In ${Math.floor(diffMinutes / 60)}h`, color: 'text-blue-600', bg: 'bg-blue-50' };
  };

  const pendingCount = todaySchedule.filter(s => s.status === 'pending').length;
  const takenCount = todaySchedule.filter(s => s.status === 'taken').length;

  return (
    <ProtectedRoute allowedRoles={['patient']}>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white py-8 px-4">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                <Pill className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-3xl font-bold">Dosage Scheduler</h1>
                <p className="text-purple-100">Track and manage your medications</p>
              </div>
            </div>
            <div className="flex items-center gap-6 text-sm">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                <span>{takenCount} taken today</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <span>{pendingCount} pending</span>
              </div>
              <div className="flex items-center gap-2">
                <Pill className="w-4 h-4" />
                <span>{medications.length} active medications</span>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex gap-6">
              <button
                onClick={() => setActiveTab('today')}
                className={`flex items-center gap-2 px-4 py-4 border-b-2 transition-colors ${
                  activeTab === 'today'
                    ? 'border-purple-600 text-purple-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                <Calendar className="w-4 h-4" />
                Today's Schedule
              </button>
              <button
                onClick={() => setActiveTab('medications')}
                className={`flex items-center gap-2 px-4 py-4 border-b-2 transition-colors ${
                  activeTab === 'medications'
                    ? 'border-purple-600 text-purple-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                <Pill className="w-4 h-4" />
                My Medications
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-7xl mx-auto px-4 py-8">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
            </div>
          ) : (
            <>
              {activeTab === 'today' && (
                <div>
                  {todaySchedule.length === 0 ? (
                    <div className="text-center py-12 bg-white rounded-lg shadow">
                      <Calendar className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                      <p className="text-lg font-medium text-gray-900">No doses scheduled for today</p>
                      <p className="text-sm text-gray-600">Your schedule will appear here</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {todaySchedule.map((schedule) => {
                        const timeStatus = schedule.status === 'pending' 
                          ? getTimeStatus(schedule.scheduledDateTime)
                          : null;

                        return (
                          <div
                            key={schedule.id}
                            className={`bg-white rounded-lg shadow p-6 border-l-4 ${
                              schedule.status === 'taken' 
                                ? 'border-green-500' 
                                : schedule.status === 'missed'
                                ? 'border-red-500'
                                : 'border-purple-500'
                            }`}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex items-start gap-4 flex-1">
                                <div className={`p-3 rounded-lg ${
                                  schedule.status === 'taken'
                                    ? 'bg-green-100'
                                    : schedule.status === 'missed'
                                    ? 'bg-red-100'
                                    : 'bg-purple-100'
                                }`}>
                                  <Pill className={`w-6 h-6 ${
                                    schedule.status === 'taken'
                                      ? 'text-green-600'
                                      : schedule.status === 'missed'
                                      ? 'text-red-600'
                                      : 'text-purple-600'
                                  }`} />
                                </div>
                                <div className="flex-1">
                                  <h3 className="text-lg font-semibold text-gray-900">
                                    {schedule.medication.name}
                                  </h3>
                                  <p className="text-sm text-gray-600">{schedule.medication.dosage}</p>
                                  {schedule.medication.instructions && (
                                    <p className="text-xs text-gray-500 mt-1">
                                      {schedule.medication.instructions}
                                    </p>
                                  )}
                                  <div className="flex items-center gap-4 mt-3">
                                    <div className="flex items-center gap-1 text-sm text-gray-600">
                                      <Clock className="w-4 h-4" />
                                      {new Date(schedule.scheduledDateTime).toLocaleTimeString([], {
                                        hour: '2-digit',
                                        minute: '2-digit',
                                      })}
                                    </div>
                                    {timeStatus && (
                                      <span className={`text-xs px-2 py-1 rounded-full ${timeStatus.bg} ${timeStatus.color} font-medium`}>
                                        {timeStatus.text}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>

                              <div>
                                {schedule.status === 'pending' ? (
                                  <button
                                    onClick={() => handleMarkTaken(schedule.id)}
                                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                                  >
                                    <CheckCircle className="w-4 h-4" />
                                    Mark Taken
                                  </button>
                                ) : schedule.status === 'taken' ? (
                                  <div className="text-right">
                                    <span className="text-sm font-medium text-green-600 flex items-center gap-1">
                                      <CheckCircle className="w-4 h-4" />
                                      Taken
                                    </span>
                                    {schedule.takenAt && (
                                      <p className="text-xs text-gray-500 mt-1">
                                        at {new Date(schedule.takenAt).toLocaleTimeString()}
                                      </p>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-sm font-medium text-red-600 flex items-center gap-1">
                                    <XCircle className="w-4 h-4" />
                                    Missed
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'medications' && (
                <div>
                  <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-blue-900">
                          Import medications from your medical records
                        </p>
                        <p className="text-xs text-blue-700 mt-1">
                          Visit your E-Health Passport to import prescribed medications
                        </p>
                        <Link
                          href="/patient/ehealth-passport"
                          className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 font-medium mt-2"
                        >
                          Go to E-Health Passport →
                        </Link>
                      </div>
                    </div>
                  </div>

                  {medications.length === 0 ? (
                    <div className="text-center py-12 bg-white rounded-lg shadow">
                      <Pill className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                      <p className="text-lg font-medium text-gray-900">No active medications</p>
                      <p className="text-sm text-gray-600 mb-4">Import from your medical records</p>
                    </div>
                  ) : (
                    <div className="grid md:grid-cols-2 gap-6">
                      {medications.map((med) => {
                        const progress = ((med.totalDoses - med.remainingDoses) / med.totalDoses) * 100;
                        const daysLeft = Math.ceil((new Date(med.endDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));

                        return (
                          <div key={med.id} className="bg-white rounded-lg shadow p-6">
                            <div className="flex items-start justify-between mb-4">
                              <div className="flex items-start gap-3">
                                <div className="p-2 bg-purple-100 rounded-lg">
                                  <Pill className="w-5 h-5 text-purple-600" />
                                </div>
                                <div>
                                  <h3 className="font-semibold text-gray-900">{med.name}</h3>
                                  <p className="text-sm text-gray-600">{med.dosage}</p>
                                </div>
                              </div>
                              {med.reminderEnabled && (
                                <Bell className="w-5 h-5 text-purple-600" />
                              )}
                            </div>

                            <div className="space-y-3">
                              <div>
                                <div className="flex justify-between text-sm mb-1">
                                  <span className="text-gray-600">Progress</span>
                                  <span className="font-medium">{Math.round(progress)}%</span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                  <div
                                    className="bg-purple-600 h-2 rounded-full transition-all"
                                    style={{ width: `${progress}%` }}
                                  ></div>
                                </div>
                              </div>

                              <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                  <p className="text-gray-500">Doses Left</p>
                                  <p className="font-semibold">{med.remainingDoses} / {med.totalDoses}</p>
                                </div>
                                <div>
                                  <p className="text-gray-500">Days Left</p>
                                  <p className="font-semibold">{daysLeft} days</p>
                                </div>
                              </div>

                              <div>
                                <p className="text-xs text-gray-500 mb-1">Daily Schedule</p>
                                <div className="flex flex-wrap gap-2">
                                  {med.timings.map((time, idx) => (
                                    <span
                                      key={idx}
                                      className="text-xs px-2 py-1 bg-purple-50 text-purple-700 rounded-full font-medium"
                                    >
                                      {time}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}