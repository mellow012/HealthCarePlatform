// app/patient/visits/current/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Building2, Clock, AlertCircle, UserCheck } from 'lucide-react';
import { onSnapshot, collection, query, where, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';

export default function CurrentVisitCard() {
  const { userData } = useAuth();
  const [visit, setVisit] = useState<any>(null);

  useEffect(() => {
    if (!userData?.uid) return;

    const q = query(
      collection(db, 'visits'),
      where('patientId', '==', userData.uid),
      where('status', 'in', ['waiting', 'with_doctor']),
      orderBy('checkInTime', 'desc'),
      limit(1)
    );

    const unsubscribe = onSnapshot(q, (snap) => {
      if (snap.empty) {
        setVisit(null);
      } else {
        setVisit({ id: snap.docs[0].id, ...snap.docs[0].data() });
      }
    });

    return unsubscribe;
  }, [userData?.uid]);

  if (!visit) return null;

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-blue-600 mb-8">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-bold text-gray-900">Current Visit</h3>
        <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
          {visit.status === 'waiting' ? 'Waiting' : 'With Doctor'}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex items-center gap-3">
          <Building2 className="w-5 h-5 text-gray-500" />
          <div>
            <p className="text-sm text-gray-600">Department</p>
            <p className="font-semibold">{visit.department}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-gray-500" />
          <div>
            <p className="text-sm text-gray-600">Reason</p>
            <p className="font-semibold">{visit.purpose}</p>
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2 text-sm text-gray-600">
        <Clock className="w-4 h-4" />
        Checked in at {new Date(visit.checkInTime.toDate()).toLocaleTimeString()}
      </div>
    </div>
  );
}