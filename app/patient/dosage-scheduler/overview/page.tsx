'use client';

import React, { useState, useEffect } from 'react';
import { 
  Clock, Calendar, CheckCircle, XCircle, AlertTriangle, TrendingUp,
  Pill, Bell, Activity, BarChart3, Loader2, ChevronRight, Award
} from 'lucide-react';

interface DoseSchedule {
  id: string;
  medicationName: string;
  dosage: string;
  time: string;
  status: 'pending' | 'taken' | 'missed' | 'skipped';
  timestamp?: string;
}

interface MedicationStats {
  totalMedications: number;
  todayDoses: number;
  takenToday: number;
  missedToday: number;
  adherenceRate: number;
  streak: number;
}

export default function SchedulerOverviewPage() {
  const [loading, setLoading] = useState(true);
  const [todaySchedule, setTodaySchedule] = useState<DoseSchedule[]>([]);
  const [upcomingDoses, setUpcomingDoses] = useState<DoseSchedule[]>([]);
  const [stats, setStats] = useState<MedicationStats>({
    totalMedications: 0,
    todayDoses: 0,
    takenToday: 0,
    missedToday: 0,
    adherenceRate: 0,
    streak: 0,
  });
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [marking, setMarking] = useState<string | null>(null);

  useEffect(() => {
    fetchOverviewData();
  }, [selectedDate]);

  const fetchOverviewData = async () => {
    setLoading(true);
    try {
      // Fetch today's schedule
      const scheduleRes = await fetch('/api/patient/scheduler/today');
      const scheduleJson = await scheduleRes.json();
      
      if (scheduleJson.success) {
        setTodaySchedule(scheduleJson.data.schedule || []);
        setUpcomingDoses(scheduleJson.data.upcoming || []);
        setStats(scheduleJson.data.stats || stats);
      }
    } catch (error) {
      console.error('Failed to load overview:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsTaken = async (doseId: string) => {
    setMarking(doseId);
    try {
      const res = await fetch('/api/dosage-scheduler/mark-taken', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ doseId, status: 'taken', timestamp: new Date() }),
      });

      if (res.ok) {
        fetchOverviewData(); // Refresh
      }
    } catch (error) {
      console.error('Failed to mark dose:', error);
    } finally {
      setMarking(null);
    }
  };

  const markAsSkipped = async (doseId: string) => {
    setMarking(doseId);
    try {
      const res = await fetch('/api/patient/scheduler/mark', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ doseId, status: 'skipped' }),
      });

      if (res.ok) {
        fetchOverviewData();
      }
    } catch (error) {
      console.error('Failed to skip dose:', error);
    } finally {
      setMarking(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
      pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: <Clock className="w-3 h-3" /> },
      taken: { bg: 'bg-green-100', text: 'text-green-800', icon: <CheckCircle className="w-3 h-3" /> },
      missed: { bg: 'bg-red-100', text: 'text-red-800', icon: <XCircle className="w-3 h-3" /> },
      skipped: { bg: 'bg-gray-100', text: 'text-gray-800', icon: <XCircle className="w-3 h-3" /> },
    };
    const badge = badges[status] || badges.pending;
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 ${badge.bg} ${badge.text} text-xs font-medium rounded-full`}>
        {badge.icon}
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const getCurrentTime = () => {
    return new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Medication Overview</h1>
            <p className="text-gray-600 mt-1">Track your medication schedule and adherence</p>
          </div>
          <button
            onClick={() => window.location.href = '/patient/dosage-scheduler'}
            className="px-5 py-2 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition flex items-center gap-2"
          >
            Manage Medications
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Pill className="w-6 h-6 text-blue-600" />
              </div>
              <TrendingUp className="w-5 h-5 text-green-500" />
            </div>
            <p className="text-sm text-gray-600">Total Medications</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">{stats.totalMedications}</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-green-100 rounded-lg">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
            </div>
            <p className="text-sm text-gray-600">Taken Today</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">
              {stats.takenToday}/{stats.todayDoses}
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-purple-100 rounded-lg">
                <Activity className="w-6 h-6 text-purple-600" />
              </div>
            </div>
            <p className="text-sm text-gray-600">Adherence Rate</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">{stats.adherenceRate}%</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-yellow-100 rounded-lg">
                <Award className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
            <p className="text-sm text-gray-600">Current Streak</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">{stats.streak} days</p>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Today's Schedule */}
          <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                    <Calendar className="w-6 h-6 text-blue-600" />
                    Today's Schedule
                  </h2>
                  <p className="text-sm text-gray-600 mt-1">
                    {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                  </p>
                </div>
                <div className="text-sm text-gray-500">
                  Current time: <span className="font-medium text-gray-900">{getCurrentTime()}</span>
                </div>
              </div>
            </div>

            <div className="p-6">
              {todaySchedule.length === 0 ? (
                <div className="text-center py-12">
                  <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-800">All Done for Today!</h3>
                  <p className="text-gray-600 mt-2">You've completed all your medications for today.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {todaySchedule.map((dose) => (
                    <div 
                      key={dose.id} 
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200 hover:shadow-md transition"
                    >
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-blue-100 rounded-lg">
                          <Clock className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-bold text-gray-900 text-lg">{dose.medicationName}</p>
                          <p className="text-sm text-gray-600">{dose.dosage} • {dose.time}</p>
                          {dose.status === 'taken' && dose.timestamp && (
                            <p className="text-xs text-green-600 mt-1">
                              ✓ Taken at {new Date(dose.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        {getStatusBadge(dose.status)}
                        {dose.status === 'pending' && (
                          <div className="flex gap-2">
                            <button
                              onClick={() => markAsTaken(dose.id)}
                              disabled={marking === dose.id}
                              className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition disabled:opacity-50 flex items-center gap-1"
                            >
                              {marking === dose.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <CheckCircle className="w-4 h-4" />
                              )}
                              Mark Taken
                            </button>
                            <button
                              onClick={() => markAsSkipped(dose.id)}
                              disabled={marking === dose.id}
                              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-300 transition"
                            >
                              Skip
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            
            {/* Upcoming Doses */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <Bell className="w-5 h-5 text-purple-600" />
                  Upcoming Doses
                </h3>
              </div>
              <div className="p-6">
                {upcomingDoses.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">No upcoming doses</p>
                ) : (
                  <div className="space-y-3">
                    {upcomingDoses.slice(0, 5).map((dose) => (
                      <div key={dose.id} className="flex items-center justify-between p-3 bg-purple-50 rounded-lg border border-purple-100">
                        <div>
                          <p className="font-medium text-gray-900 text-sm">{dose.medicationName}</p>
                          <p className="text-xs text-gray-600">{dose.time}</p>
                        </div>
                        <Clock className="w-4 h-4 text-purple-600" />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Missed Doses Alert */}
            {stats.missedToday > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-6">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0" />
                  <div>
                    <h4 className="font-bold text-red-900">Missed Doses</h4>
                    <p className="text-sm text-red-700 mt-1">
                      You have {stats.missedToday} missed dose{stats.missedToday > 1 ? 's' : ''} today.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Quick Actions */}
            <div className="bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl p-6 text-white">
              <h3 className="font-bold text-lg mb-4">Quick Actions</h3>
              <div className="space-y-2">
                <button 
                  onClick={() => window.location.href = '/patient/dosage-scheduler'}
                  className="w-full text-left p-3 bg-white/10 hover:bg-white/20 rounded-lg transition"
                >
                  <p className="font-medium">View All Medications</p>
                  <p className="text-xs opacity-80">Manage your medication list</p>
                </button>
                <button 
                  onClick={() => window.location.href = '/patient/ehealth-passport'}
                  className="w-full text-left p-3 bg-white/10 hover:bg-white/20 rounded-lg transition"
                >
                  <p className="font-medium">Import Prescriptions</p>
                  <p className="text-xs opacity-80">From your E-Health Passport</p>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* History Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-green-600" />
            7-Day Adherence Overview
          </h2>
          <div className="grid grid-cols-7 gap-2">
            {Array.from({ length: 7 }, (_, i) => {
              const date = new Date();
              date.setDate(date.getDate() - (6 - i));
              const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
              const adherence = Math.floor(Math.random() * 30) + 70; // Mock data
              
              return (
                <div key={i} className="text-center">
                  <p className="text-xs text-gray-600 mb-2">{dayName}</p>
                  <div className="bg-gray-100 rounded-lg h-32 flex flex-col justify-end overflow-hidden">
                    <div 
                      className={`${adherence >= 90 ? 'bg-green-500' : adherence >= 70 ? 'bg-yellow-500' : 'bg-red-500'} transition-all`}
                      style={{ height: `${adherence}%` }}
                    ></div>
                  </div>
                  <p className="text-xs font-medium text-gray-900 mt-2">{adherence}%</p>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}