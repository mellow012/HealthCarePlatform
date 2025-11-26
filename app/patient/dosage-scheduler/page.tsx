'use client';
import { useRouter } from 'next/navigation';
import React, { useState, useEffect } from 'react';
import { Clock, Calendar, Trash2, CheckCircle, AlertCircle, Plus, Loader2, Pill, Stethoscope, XCircle } from 'lucide-react';

interface ScheduleItem {
  id: string;
  medicationName: string;
  dosage: string;
  frequency: string;
  timesPerDay?: number;
  specificTimes?: string[];
  timing?: string;
  duration?: {
    value: number;
    unit: string;
  };
  instructions: string;
  source: string;
  isActive: boolean;
  createdAt?: string;
}

export default function DosageSchedulerPage() {
  const router = useRouter();
  const [schedules, setSchedules] = useState<ScheduleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [adding, setAdding] = useState(false);
  const [notification, setNotification] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  // Form state for manual entry
  const [newMed, setNewMed] = useState({
    medicationName: '',
    dosage: '',
    frequency: 'once_daily',
    timing: '',
    duration: '7',
    durationUnit: 'days',
    instructions: '',
  });


  const fetchSchedules = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/patient/scheduler');
      const json = await res.json();
      if (json.success) {
        setSchedules(json.data);
      }
    } catch (error) {
      console.error('Failed to load schedules', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchedules();
  }, []);

  const showNotification = (msg: string, type: 'success' | 'error') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const handleAddManual = async () => {
    if (!newMed.medicationName.trim()) {
      showNotification('Medication name is required', 'error');
      return;
    }

    setAdding(true);
    try {
      const res = await fetch('/api/patient/scheduler', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newMed),
      });

      const json = await res.json();
      
      if (res.ok && json.success) {
        showNotification('Medication added successfully!', 'success');
        setShowAddModal(false);
        setNewMed({
          medicationName: '',
          dosage: '',
          frequency: 'once_daily',
          timing: '',
          duration: '7',
          durationUnit: 'days',
          instructions: '',
        });
        fetchSchedules(); // Refresh list
      } else {
        throw new Error(json.error || 'Failed to add medication');
      }
    } catch (error: any) {
      showNotification(error.message || 'Failed to add medication', 'error');
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (scheduleId: string) => {
    if (!confirm('Remove this medication from your schedule?')) return;
    
    setDeleting(scheduleId);
    try {
      const res = await fetch(`/api/patient/scheduler?id=${scheduleId}`, {
        method: 'DELETE',
      });
      
      if (res.ok) {
        setSchedules(schedules.filter(s => s.id !== scheduleId));
        alert('Medication removed from schedule');
      } else {
        throw new Error('Failed to delete');
      }
    } catch (error) {
      console.error('Delete error:', error);
      alert('Failed to remove medication');
    } finally {
      setDeleting(null);
    }
  };

  const getFrequencyLabel = (frequency: string) => {
    const labels: Record<string, string> = {
      'once_daily': 'Once daily',
      'twice_daily': 'Twice daily',
      'three_times_daily': '3x daily',
      'four_times_daily': '4x daily',
      'every_12_hours': 'Every 12h',
      'every_8_hours': 'Every 8h',
      'every_6_hours': 'Every 6h',
      'as_needed': 'As needed',
    };
    return labels[frequency] || frequency.replace('_', ' ');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Medication Scheduler</h1>
              <p className="text-sm text-gray-600 mt-1">Manage and track your medications</p>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={() => window.location.href = '/patient/ehealth-passport'}
                className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition text-sm"
              >
                <Pill className="w-4 h-4" /> Import
              </button>
              <button 
                onClick={() => setShowAddModal(true)}
                className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-indigo-700 transition text-sm"
              >
                <Plus className="w-4 h-4" /> Add Manual
              </button>
            </div>
          </div>
          
          {/* Navigation Tabs */}
          <div className="flex gap-1">
            <button
              onClick={() => window.location.href = '/patient/dosage-scheduler/overview'}
              className="px-4 py-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition font-medium text-sm"
            >
              Overview
            </button>
            <button
              className="px-4 py-2 text-blue-600 bg-blue-50 rounded-lg font-medium text-sm"
            >
              My Medications
            </button>
            <button
              onClick={() => window.location.href = '/patient/dosage-scheduler/history'}
              className="px-4 py-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition font-medium text-sm"
            >
              History
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-6 py-8">

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
          </div>
        ) : schedules.length === 0 ? (
          <div className="bg-white p-12 text-center rounded-2xl shadow-sm border border-gray-100">
            <div className="w-20 h-20 bg-gradient-to-br from-indigo-100 to-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Pill className="w-10 h-10 text-indigo-600" />
            </div>
            <h3 className="text-2xl font-bold text-gray-800 mb-3">No Medications Yet</h3>
            <p className="text-gray-600 max-w-md mx-auto mb-8">
              Start tracking your medications by importing prescriptions from your E-Health Passport or adding them manually.
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => window.location.href = '/patient/ehealth-passport'}
                className="px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition flex items-center gap-2"
              >
                <Pill className="w-5 h-5" />
                Import from Passport
              </button>
              <button
                onClick={() => setShowAddModal(true)}
                className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition flex items-center gap-2"
              >
                <Plus className="w-5 h-5" />
                Add Manually
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <Pill className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
                <p className="text-3xl font-bold text-gray-900">{schedules.length}</p>
                <p className="text-sm text-gray-600 mt-1">Total Medications</p>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-3 bg-green-100 rounded-lg">
                    <Stethoscope className="w-6 h-6 text-green-600" />
                  </div>
                </div>
                <p className="text-3xl font-bold text-gray-900">
                  {schedules.filter(s => s.source === 'doctor_prescription').length}
                </p>
                <p className="text-sm text-gray-600 mt-1">Doctor Prescribed</p>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-3 bg-purple-100 rounded-lg">
                    <Clock className="w-6 h-6 text-purple-600" />
                  </div>
                </div>
                <p className="text-3xl font-bold text-gray-900">
                  {schedules.reduce((sum, s) => sum + (s.timesPerDay || 1), 0)}
                </p>
                <p className="text-sm text-gray-600 mt-1">Daily Doses</p>
              </div>
            </div>

            {/* Medications List */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-lg font-bold text-gray-900">All Medications</h2>
                <p className="text-sm text-gray-600 mt-1">{schedules.length} active medication{schedules.length !== 1 ? 's' : ''}</p>
              </div>
              
              <div className="divide-y divide-gray-100">
                {schedules.map(item => (
                  <div 
                    key={item.id} 
                    className="p-6 hover:bg-gray-50 transition group"
                  >
                    <div className="flex justify-between items-start gap-6">
                      <div className="flex items-start gap-4 flex-1">
                        {/* Icon */}
                        <div className={`p-3 rounded-xl ${
                          item.source === 'doctor_prescription' 
                            ? 'bg-blue-50 text-blue-600' 
                            : 'bg-purple-50 text-purple-600'
                        }`}>
                          {item.source === 'doctor_prescription' ? (
                            <Stethoscope className="w-6 h-6" />
                          ) : (
                            <Pill className="w-6 h-6" />
                          )}
                        </div>
                        
                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h3 className="text-lg font-bold text-gray-900">{item.medicationName}</h3>
                              <p className="text-sm text-gray-600 mt-1">
                                {item.dosage} • {getFrequencyLabel(item.frequency)}
                              </p>
                            </div>
                            
                            {/* Source badge */}
                            <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium shrink-0 ${
                              item.source === 'doctor_prescription'
                                ? 'bg-blue-100 text-blue-700'
                                : 'bg-purple-100 text-purple-700'
                            }`}>
                              <CheckCircle className="w-3 h-3" />
                              {item.source === 'doctor_prescription' ? 'Doctor' : 'Manual'}
                            </span>
                          </div>
                          
                          {/* Times */}
                          {item.specificTimes && item.specificTimes.length > 0 && (
                            <div className="flex items-center gap-2 mt-3 flex-wrap">
                              <Clock className="w-4 h-4 text-gray-400" />
                              {item.specificTimes.map((time, idx) => (
                                <span key={idx} className="px-3 py-1 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg">
                                  {time}
                                </span>
                              ))}
                            </div>
                          )}
                          
                          {/* Additional Details */}
                          <div className="flex items-center gap-4 mt-3 text-sm text-gray-500">
                            {item.duration && (
                              <span className="flex items-center gap-1">
                                <Calendar className="w-4 h-4" />
                                {item.duration.value} {item.duration.unit}
                              </span>
                            )}
                            {item.timing && (
                              <span className="capitalize">{item.timing.replace('_', ' ')}</span>
                            )}
                          </div>
                          
                          {/* Instructions */}
                          {item.instructions && (
                            <p className="text-sm text-gray-600 mt-3 italic bg-gray-50 p-3 rounded-lg">
                              "{item.instructions}"
                            </p>
                          )}
                        </div>
                      </div>
                      
                      {/* Delete Button */}
                      <button
                        onClick={() => handleDelete(item.id)}
                        disabled={deleting === item.id}
                        className="text-gray-400 hover:text-red-600 p-2 rounded-lg hover:bg-red-50 transition opacity-0 group-hover:opacity-100 disabled:opacity-50 shrink-0"
                        title="Remove from schedule"
                      >
                        {deleting === item.id ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                          <Trash2 className="w-5 h-5" />
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Add Manual Entry Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Add Medication Manually</h2>
              <button 
                onClick={() => setShowAddModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Medication Name *
                </label>
                <input
                  type="text"
                  value={newMed.medicationName}
                  onChange={(e) => setNewMed({ ...newMed, medicationName: e.target.value })}
                  placeholder="e.g., Aspirin"
                  className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Dosage
                </label>
                <input
                  type="text"
                  value={newMed.dosage}
                  onChange={(e) => setNewMed({ ...newMed, dosage: e.target.value })}
                  placeholder="e.g., 100mg"
                  className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Frequency
                  </label>
                  <select
                    value={newMed.frequency}
                    onChange={(e) => setNewMed({ ...newMed, frequency: e.target.value })}
                    className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white"
                  >
                    <option value="once_daily">Once daily</option>
                    <option value="twice_daily">Twice daily</option>
                    <option value="three_times_daily">3x daily</option>
                    <option value="four_times_daily">4x daily</option>
                    <option value="as_needed">As needed</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Timing
                  </label>
                  <select
                    value={newMed.timing}
                    onChange={(e) => setNewMed({ ...newMed, timing: e.target.value })}
                    className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white"
                  >
                    <option value="">Select...</option>
                    <option value="before_meals">Before meals</option>
                    <option value="after_meals">After meals</option>
                    <option value="with_meals">With meals</option>
                    <option value="bedtime">At bedtime</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Duration
                  </label>
                  <input
                    type="number"
                    value={newMed.duration}
                    onChange={(e) => setNewMed({ ...newMed, duration: e.target.value })}
                    min="1"
                    className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Unit
                  </label>
                  <select
                    value={newMed.durationUnit}
                    onChange={(e) => setNewMed({ ...newMed, durationUnit: e.target.value })}
                    className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white"
                  >
                    <option value="days">Days</option>
                    <option value="weeks">Weeks</option>
                    <option value="months">Months</option>
                    <option value="ongoing">Ongoing</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Instructions
                </label>
                <textarea
                  value={newMed.instructions}
                  onChange={(e) => setNewMed({ ...newMed, instructions: e.target.value })}
                  placeholder="Additional instructions..."
                  rows={3}
                  className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowAddModal(false)}
                className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleAddManual}
                disabled={adding}
                className="flex-1 px-4 py-3 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {adding ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Adding...
                  </>
                ) : (
                  <>
                    <Plus className="w-5 h-5" />
                    Add Medication
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notification Toast */}
      {notification && (
        <div className={`fixed bottom-6 right-6 ${notification.type === 'success' ? 'bg-green-600' : 'bg-red-600'} text-white px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 z-50 max-w-md`}>
          {notification.type === 'success' ? <CheckCircle className="w-6 h-6" /> : <AlertCircle className="w-6 h-6" />}
          <span className="font-medium flex-1">{notification.msg}</span>
          <button 
            onClick={() => setNotification(null)} 
            className="hover:bg-white/20 rounded p-1"
          >
            <XCircle className="w-5 h-5" />
          </button>
        </div>
      )}
    </div>
  );
}