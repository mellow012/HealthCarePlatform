// components/hospital/AddStaffModal.tsx
'use client';

import { useState, useEffect } from 'react';
import { X, Loader2, CheckCircle, AlertCircle } from 'lucide-react';

export default function AddStaffModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [formData, setFormData] = useState({
    email: '',
    role: '',
    departmentId: '',
  });

  const [roles, setRoles] = useState<{ id: string; name: string }[]>([]);
  const [departments, setDepartments] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [rolesRes, deptRes] = await Promise.all([
          fetch('/api/hospital/roles'),
          fetch('/api/hospital/departments'),
        ]);

        const rolesData = await rolesRes.json();
        const deptData = await deptRes.json();

        if (rolesData.success) setRoles(rolesData.data.filter((r: any) => r.status === 'active'));
        if (deptData.success) setDepartments(deptData.data.filter((d: any) => d.status === 'active'));
      } catch (err) {
        setError('Failed to load roles or departments');
      } finally {
        setFetching(false);
      }
    };

    loadData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.email || !formData.role) {
      setError('Email and role are required');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/hospital/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email.trim().toLowerCase(),
          role: formData.role,           // ← this must be role.name (e.g. "Doctor")
          department: formData.departmentId || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send invite');

      setSuccess(true);
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1500);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Invite Staff Member</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 transition"
            disabled={loading}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {success && (
          <div className="mb-5 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
            <CheckCircle className="w-6 h-6 text-green-600" />
            <p className="font-medium text-green-800">
              Invitation sent to <strong>{formData.email}</strong>
            </p>
          </div>
        )}

        {error && (
          <div className="mb-5 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
            <p className="text-sm font-medium text-red-800">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Email Address <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              required
              placeholder="dr.smith@hospital.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={loading || fetching}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Role <span className="text-red-500">*</span>
            </label>
            {fetching ? (
              <div className="px-4 py-3 bg-gray-50 rounded-lg text-gray-500">Loading roles...</div>
            ) : roles.length === 0 ? (
              <div className="px-4 py-3 bg-orange-50 border border-orange-200 rounded-lg text-orange-800 text-sm">
                No active roles found. Create one in Settings → Roles first.
              </div>
            ) : (
              <select
                required
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500"
                disabled={loading}
              >
                <option value="">Select a role</option>
                {roles.map((role) => (
                  <option key={role.id} value={role.name}>
                    {role.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Department <span className="text-gray-400">(optional)</span>
            </label>
            {fetching ? (
              <div className="px-4 py-3 bg-gray-50 rounded-lg text-gray-500">Loading departments...</div>
            ) : departments.length === 0 ? (
              <div className="px-4 py-3 text-gray-600">No departments yet</div>
            ) : (
              <select
                value={formData.departmentId}
                onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500"
              >
                <option value="">No department</option>
                {departments.map((dept) => (
                  <option key={dept.id} value={dept.id}>
                    {dept.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-5 py-3 border border-gray-300 rounded-lg font-medium hover:bg-gray-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || fetching || roles.length === 0}
              className="flex-1 px-5 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition shadow-md"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Sending...
                </>
              ) : (
                'Send Invitation'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}