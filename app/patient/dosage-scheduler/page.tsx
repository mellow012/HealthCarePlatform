'use client';

import React, { useState, useEffect } from 'react';
import { Clock, Calendar, Trash2, CheckCircle, AlertCircle, Plus, Loader2 } from 'lucide-react';

interface ScheduleItem {
  id: string;
  medicationName: string;
  dosage: string;
  frequency: string;
  instructions: string;
  source: string; // 'doctor_prescription' or 'manual'
  isActive: boolean;
}

export default function DosageSchedulerPage() {
  const [schedules, setSchedules] = useState<ScheduleItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSchedules = async () => {
    setLoading(true);
    try {
      // Assumes GET endpoint exists at /api/patient/scheduler (returns list of schedules)
      // If it doesn't exist yet, we can stub it or create it next.
      // For now, let's assume the data structure matches what we saved.
      const res = await fetch('/api/patient/scheduler'); 
      const json = await res.json();
      if (json.success) {
        setSchedules(json.data);
      }
    } catch (error) {
      console.error("Failed to load schedules", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchedules();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-6 font-sans">
      <div className="max-w-4xl mx-auto">
        <header className="flex justify-between items-center mb-8">
            <div>
                <h1 className="text-3xl font-bold text-gray-900">Dosage Scheduler</h1>
                <p className="text-gray-600">Manage your daily medication intake</p>
            </div>
            <button className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2 rounded-xl font-medium hover:bg-indigo-700 transition shadow-md">
                <Plus className="w-5 h-5" /> Add Manual Entry
            </button>
        </header>

        {loading ? (
            <div className="flex justify-center py-20">
                <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
            </div>
        ) : schedules.length === 0 ? (
            <div className="bg-white p-12 text-center rounded-2xl shadow-sm border border-gray-100">
                <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Clock className="w-8 h-8 text-indigo-400" />
                </div>
                <h3 className="text-xl font-semibold text-gray-800">No Schedules Yet</h3>
                <p className="text-gray-500 mt-2 max-w-md mx-auto">
                    You haven't added any medications yet. You can import them directly from your E-Health Passport or add them manually.
                </p>
            </div>
        ) : (
            <div className="grid gap-4">
                {schedules.map(item => (
                    <div key={item.id} className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition flex justify-between items-center group">
                        <div className="flex items-start gap-4">
                            <div className={`p-3 rounded-lg ${item.source === 'doctor_prescription' ? 'bg-blue-100 text-blue-600' : 'bg-purple-100 text-purple-600'}`}>
                                {item.source === 'doctor_prescription' ? <CheckCircle className="w-6 h-6" /> : <Calendar className="w-6 h-6" />}
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-gray-900">{item.medicationName}</h3>
                                <p className="text-sm font-medium text-gray-700">{item.dosage} • {item.frequency}</p>
                                {item.instructions && (
                                    <p className="text-xs text-gray-500 mt-1 italic">"{item.instructions}"</p>
                                )}
                            </div>
                        </div>
                        
                        <div className="flex items-center gap-4 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button className="text-red-400 hover:text-red-600 p-2 rounded-full hover:bg-red-50">
                                <Trash2 className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        )}
      </div>
    </div>
  );
}