// app/hospital/staff/setup/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { Loader2, User, Phone, CheckCircle } from 'lucide-react';

export default function StaffSetupPage() {
  const { user, userData } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState({ firstName: '', lastName: '', phone: '' });
  const [loading, setLoading] = useState(false);

// ← REPLACE THE handleSubmit FUNCTION ONLY
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!user) return;

  setLoading(true);
  try {
    await updateDoc(doc(db, 'users', user.uid), {
      'profile.firstName': form.firstName.trim(),
      'profile.lastName': form.lastName.trim(),
      'profile.phone': form.phone.trim() || null,
      setupComplete: true,
    });

    // This triggers ProtectedRoute to redirect correctly
    window.location.href = '/hospital';
    // OR: router.replace(getRoleBasedRedirect(userData?.role || '', true));
  } catch (err) {
    console.error(err);
    alert('Setup failed. Please try again.');
  } finally {
    setLoading(false);
  }
};

  const roleTitle = userData?.role === 'doctor' ? 'Doctor' : 'Receptionist';

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl p-10">
        <div className="text-center mb-10">
          <div className="w-24 h-24 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <User className="w-14 h-14 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900">Welcome!</h1>
          <p className="text-2xl text-blue-600 font-semibold mt-2">{roleTitle}</p>
          <p className="text-gray-600 mt-4">Complete your profile to begin</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <input required placeholder="First Name" value={form.firstName}
              onChange={e => setForm({ ...form, firstName: e.target.value })}
              className="px-5 py-4 border rounded-xl text-lg focus:ring-4 focus:ring-blue-200 focus:border-blue-500" />
            <input required placeholder="Last Name" value={form.lastName}
              onChange={e => setForm({ ...form, lastName: e.target.value })}
              className="px-5 py-4 border rounded-xl text-lg focus:ring-4 focus:ring-blue-200 focus:border-blue-500" />
          </div>

          <div className="relative">
            <Phone className="absolute left-4 top-5 w-5 h-5 text-gray-400" />
            <input type="tel" placeholder="Phone (optional)" value={form.phone}
              onChange={e => setForm({ ...form, phone: e.target.value })}
              className="w-full pl-12 pr-5 py-4 border rounded-xl text-lg focus:ring-4 focus:ring-blue-200" />
          </div>

          <button
            type="submit"
            disabled={loading || !form.firstName.trim() || !form.lastName.trim()}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-5 rounded-xl font-bold text-xl hover:from-blue-700 hover:to-indigo-700 disabled:opacity-60 transition flex items-center justify-center gap-3"
          >
            {loading ? (
              <>Setting up... <Loader2 className="w-7 h-7 animate-spin" /></>
            ) : (
              <>Continue to Dashboard <CheckCircle className="w-7 h-7" /></>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}