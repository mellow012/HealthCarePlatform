// app/hospital/doctor/appointments/page.tsx
'use client';

import { useEffect, useState } from 'react';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import { format, addDays, startOfWeek } from 'date-fns';
import {
  Calendar,
  Clock,
  User,
  CheckCircle,
  XCircle,
  Loader2,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Play,
  Plus
} from 'lucide-react';
import { useRouter } from 'next/navigation';


interface Patient {
  id: string;
  email: string;
  profile: {
    firstName?: string;
    lastName?: string;
    phone?: string;
  };
}

interface Appointment {
  id: string;
  patientId: string;
  date: string;
  timeSlot: string;
  reason: string;
  status: 'scheduled' | 'checked_in' | 'in_progress' | 'completed' | 'cancelled' | 'no_show';
  department: string;
  patient: Patient;
}

type FilterStatus = 'all' | 'scheduled' | 'completed' | 'cancelled';

export default function DoctorAppointmentsPage() {
  const { userData } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterStatus>('all');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [updating, setUpdating] = useState<string | null>(null);
  const router = useRouter();
  useEffect(() => {
    fetchAppointments();
  }, [selectedDate]);

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const res = await fetch(`/api/doctor/appointments?date=${dateStr}`);
      const json = await res.json();
      
      if (json.success) {
        setAppointments(json.data || []);
      }
    } catch (error) {
      console.error('Error fetching appointments:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (appointmentId: string, newStatus: string) => {
    try {
      setUpdating(appointmentId);
      const res = await fetch(`/api/doctor/appointments/${appointmentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (res.ok) {
        fetchAppointments();
      }
    } catch (err) {
      console.error('Failed to update status:', err);
    } finally {
      setUpdating(null);
    }
  };

  const filteredAppointments = appointments.filter((apt) =>
    filter === 'all' ? true : apt.status === filter
  );

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { bg: string; text: string; icon: React.ReactNode; label: string }> = {
      scheduled: { bg: 'bg-blue-100', text: 'text-blue-800', icon: <Clock className="w-3 h-3" />, label: 'Scheduled' },
      checked_in: { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: <AlertCircle className="w-3 h-3" />, label: 'Checked In' },
      in_progress: { bg: 'bg-purple-100', text: 'text-purple-800', icon: <Play className="w-3 h-3" />, label: 'In Progress' },
      completed: { bg: 'bg-green-100', text: 'text-green-800', icon: <CheckCircle className="w-3 h-3" />, label: 'Completed' },
      cancelled: { bg: 'bg-red-100', text: 'text-red-800', icon: <XCircle className="w-3 h-3" />, label: 'Cancelled' },
      no_show: { bg: 'bg-gray-100', text: 'text-gray-800', icon: <XCircle className="w-3 h-3" />, label: 'No Show' },
    };

    const badge = badges[status] || badges.scheduled;
    return (
      <span className={`inline-flex items-center gap-1 px-3 py-1 ${badge.bg} ${badge.text} text-xs font-semibold rounded-full`}>
        {badge.icon}
        {badge.label}
      </span>
    );
  };

  // Week navigation
  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  return (
    <ProtectedRoute allowedRoles={['doctor']}>
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Calendar className="w-8 h-8 text-blue-600" />
            My Appointments
          </h1>
          <p className="text-gray-600 mt-1">
            Dr. {userData?.profile?.firstName} {userData?.profile?.lastName}
          </p>
          <button 
           onClick={() => router.push('/hospital/doctor/appointments/create')}
           className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg">
            <Plus className="w-5 h-5" /> New Appointment
          </button>
        </div>

        {/* Week Selector */}
        <div className="bg-white rounded-xl shadow p-4 mb-6">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => setSelectedDate(addDays(selectedDate, -7))}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h2 className="text-lg font-semibold">
              {format(weekStart, 'MMM d')} - {format(addDays(weekStart, 6), 'MMM d, yyyy')}
            </h2>
            <button
              onClick={() => setSelectedDate(addDays(selectedDate, 7))}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-2">
            {weekDays.map((day) => {
              const isSelected = format(day, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd');
              const isToday = format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');

              return (
                <button
                  key={day.toISOString()}
                  onClick={() => setSelectedDate(day)}
                  className={`p-3 rounded-lg text-center transition ${
                    isSelected
                      ? 'bg-blue-600 text-white'
                      : isToday
                      ? 'bg-blue-50 text-blue-700 border-2 border-blue-200'
                      : 'hover:bg-gray-100'
                  }`}
                >
                  <p className="text-xs font-medium">{format(day, 'EEE')}</p>
                  <p className="text-lg font-bold">{format(day, 'd')}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Total', value: appointments.length, color: 'gray' },
            { label: 'Scheduled', value: appointments.filter((a) => a.status === 'scheduled').length, color: 'blue' },
            { label: 'Completed', value: appointments.filter((a) => a.status === 'completed').length, color: 'green' },
            { label: 'Cancelled', value: appointments.filter((a) => a.status === 'cancelled').length, color: 'red' },
          ].map((stat) => (
            <div key={stat.label} className="bg-white rounded-xl shadow p-4">
              <p className="text-sm text-gray-600">{stat.label}</p>
              <p className={`text-2xl font-bold text-${stat.color}-600`}>{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow p-4 mb-6">
          <div className="flex flex-wrap items-center gap-2">
            {(['all', 'scheduled', 'completed', 'cancelled'] as FilterStatus[]).map((status) => (
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

        {/* Appointments List */}
        <div className="bg-white rounded-xl shadow overflow-hidden">
          {loading ? (
            <div className="p-12 text-center">
              <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
              <p className="text-gray-600">Loading appointments...</p>
            </div>
          ) : filteredAppointments.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <Calendar className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium">No appointments for {format(selectedDate, 'MMMM d, yyyy')}</p>
              <p className="text-sm mt-1">Select another date or check back later</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {filteredAppointments.map((appointment) => (
                <div key={appointment.id} className="p-6 hover:bg-gray-50 transition">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                        <User className="w-6 h-6 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900 text-lg">
                          {appointment.patient.profile.firstName} {appointment.patient.profile.lastName}
                        </h3>
                        <p className="text-sm text-gray-600">{appointment.patient.email}</p>
                        <div className="flex items-center gap-4 mt-1">
                          <span className="text-sm text-gray-500 flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {appointment.timeSlot}
                          </span>
                          <span className="text-sm text-gray-700">
                            {appointment.reason || 'General consultation'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {getStatusBadge(appointment.status)}

                      {appointment.status === 'scheduled' && (
                        <button
                          onClick={() => updateStatus(appointment.id, 'in_progress')}
                          disabled={updating === appointment.id}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition disabled:opacity-50"
                        >
                          {updating === appointment.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            'Start'
                          )}
                        </button>
                      )}

                      {appointment.status === 'checked_in' && (
                        <button
                          onClick={() => updateStatus(appointment.id, 'in_progress')}
                          disabled={updating === appointment.id}
                          className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition disabled:opacity-50"
                        >
                          Begin Consultation
                        </button>
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