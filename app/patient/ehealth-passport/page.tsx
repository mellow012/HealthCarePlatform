'use client';

import React, { useEffect, useState } from 'react';
import { ShieldCheck, Activity, FileText, Calendar, Pill, Plus,Clock, CheckCircle, Loader2 } from 'lucide-react';

interface PassportData {
  personalInfo: any;
  diagnoses: Array<{ condition: string; date: string; diagnosedBy: string }>;
  prescriptions: Array<{
    medication: string;
    dosage: string;
    frequency: string;
    duration: string;
    prescribedDate: string;
    prescribedBy: string;
  }>;
}

export default function EHealthPassportPage() {
  const [passport, setPassport] = useState<PassportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState<string | null>(null); // Track which item is being imported

  useEffect(() => {
    const fetchPassport = async () => {
      try {
        const res = await fetch('/api/patient/ehealth-passport');
        const json = await res.json();
        if (json.success) {
          setPassport(json.data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchPassport();
  }, []);

  const handleImportToScheduler = async (medication: any, index: number) => {
    setImporting(`${medication.medication}-${index}`);
    try {
      const res = await fetch('/api/patient/scheduler/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          // Send as an array because the API expects multiple items
          medications: [{
            medication: medication.medication,
            dosage: medication.dosage,
            frequency: medication.frequency,
            duration: medication.duration,
            notes: `Prescribed by ${medication.prescribedBy} on ${new Date(medication.prescribedDate).toLocaleDateString()}`
          }],
          sourceRecordId: 'passport-import' 
        })
      });

      if (res.ok) {
        alert(`Successfully added ${medication.medication} to your schedule!`);
      } else {
        throw new Error('Failed to import');
      }
    } catch (e) {
      alert('Error importing medication.');
    } finally {
      setImporting(null);
    }
  };

  if (loading) return <div className="flex justify-center p-20"><Loader2 className="animate-spin w-8 h-8 text-blue-600" /></div>;
  if (!passport) return <div className="p-10 text-center">Passport not found. Check in at a hospital to activate it.</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-6 font-sans">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* Header Card */}
        <div className="bg-gradient-to-r from-blue-700 to-indigo-800 rounded-2xl p-8 text-white shadow-xl">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-white/20 rounded-full backdrop-blur-sm">
              <ShieldCheck className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">E-Health Passport</h1>
              <p className="text-blue-100">Universal Health Record</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6 pt-6 border-t border-white/20">
             <div>
                <p className="text-xs text-blue-200 uppercase tracking-wider">Patient Name</p>
                <p className="font-semibold text-lg">{passport.personalInfo?.firstName} {passport.personalInfo?.lastName}</p>
             </div>
             <div>
                <p className="text-xs text-blue-200 uppercase tracking-wider">Blood Type</p>
                <p className="font-semibold text-lg">{passport.personalInfo?.bloodType || 'N/A'}</p>
             </div>
             <div>
                <p className="text-xs text-blue-200 uppercase tracking-wider">Total Records</p>
                <p className="font-semibold text-lg">{(passport.diagnoses?.length || 0) + (passport.prescriptions?.length || 0)} Entries</p>
             </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Diagnoses Section */}
          <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
            <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Activity className="w-5 h-5 text-red-500" /> Medical Conditions
            </h2>
            <div className="space-y-4">
              {passport.diagnoses?.length > 0 ? (
                passport.diagnoses.map((dx, i) => (
                  <div key={i} className="p-4 bg-red-50 rounded-lg border border-red-100">
                    <p className="font-bold text-gray-900 text-lg">{dx.condition}</p>
                    <p className="text-sm text-gray-600 mt-1 flex items-center gap-2">
                      <Calendar className="w-3 h-3" /> {new Date(dx.date).toLocaleDateString()} 
                      <span className="w-1 h-1 bg-gray-400 rounded-full"></span>
                      {dx.diagnosedBy}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 italic">No active conditions recorded.</p>
              )}
            </div>
          </div>

          {/* Prescriptions Section */}
          <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
            <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Pill className="w-5 h-5 text-blue-500" /> Active Prescriptions
            </h2>
            <div className="space-y-4">
              {passport.prescriptions?.length > 0 ? (
                passport.prescriptions.map((rx, i) => (
                  <div key={i} className="p-4 bg-blue-50 rounded-lg border border-blue-100 transition hover:shadow-md">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-bold text-blue-900 text-lg">{rx.medication}</p>
                        <p className="text-sm text-blue-700 font-medium mt-1">{rx.dosage} • {rx.frequency}</p>
                        <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {rx.duration} duration
                        </p>
                      </div>
                      <button
                        onClick={() => handleImportToScheduler(rx, i)}
                        disabled={importing === `${rx.medication}-${i}`}
                        className="flex items-center gap-1 text-xs bg-white border border-blue-200 text-blue-600 px-3 py-2 rounded-md hover:bg-blue-50 transition shadow-sm disabled:opacity-50"
                      >
                        {importing === `${rx.medication}-${i}` ? (
                           <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                           <Plus className="w-3 h-3" />
                        )}
                        Add to Schedule
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 italic">No prescriptions recorded.</p>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}