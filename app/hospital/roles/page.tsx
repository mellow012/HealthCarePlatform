'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { Users, Plus, Edit2, Trash2, Loader2, AlertCircle, ToggleRight, ToggleLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import { Modal, ModalContent, ModalFooter } from '@/components/ui/Modal'; // Your shadcn modal

interface HospitalRole {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  status: 'active' | 'inactive';
  createdAt: string;
}

export default function HospitalRolesPage() {
  const { userData } = useAuth();
  const hospitalId = userData?.hospitalId;

  const [roles, setRoles] = useState<HospitalRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [currentRole, setCurrentRole] = useState<Partial<HospitalRole>>({});

  useEffect(() => {
    if (hospitalId) fetchRoles();
  }, [hospitalId]);

  const fetchRoles = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/hospital/roles?hospitalId=${hospitalId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load roles');
      setRoles(data.data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const saveRole = async () => {
    try {
      const method = currentRole.id ? 'PUT' : 'POST';
      const url = currentRole.id ? `/api/hospital/roles/${currentRole.id}` : '/api/hospital/roles';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hospitalId, ...currentRole }),
      });
      if (!res.ok) throw new Error('Failed to save role');
      toast.success('Role saved');
      setShowModal(false);
      setCurrentRole({});
      fetchRoles();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const toggleRoleStatus = async (id: string, current: 'active' | 'inactive') => {
    try {
      const res = await fetch(`/api/hospital/roles/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hospitalId, status: current === 'active' ? 'inactive' : 'active' }),
      });
      if (!res.ok) throw new Error('Failed to update status');
      toast.success('Status updated');
      fetchRoles();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const deleteRole = async (id: string) => {
    if (!confirm('Are you sure? This will deactivate assigned staff.')) return;
    try {
      const res = await fetch(`/api/hospital/roles/${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hospitalId }),
      });
      if (!res.ok) throw new Error('Failed to delete role');
      toast.success('Role deleted');
      fetchRoles();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <ProtectedRoute allowedRoles={['hospital_admin']}>
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow-sm">
          <div className="max-w-6xl mx-auto px-4 py-6">
            <h1 className="text-2xl font-bold text-gray-900">Hospital Roles</h1>
          </div>
        </header>

        <main className="max-w-6xl mx-auto px-4 py-8">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
              <div className="text-sm text-red-800">{error}</div>
            </div>
          )}

          <div className="flex justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Manage Roles</h2>
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Role
            </button>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          ) : roles.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-16 h-16 mx-auto text-gray-300 mb-4" />
              <p className="text-lg font-medium text-gray-900">No roles found</p>
              <p className="text-sm text-gray-600">Add a role to get started</p>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Permissions</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {roles.map(role => (
                    <tr key={role.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 font-medium">{role.name}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{role.description}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {role.permissions.join(', ') || 'No permissions'}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            role.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {role.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 space-x-2">
                        <button onClick={() => { setCurrentRole(role); setShowModal(true); }} className="text-blue-600 hover:text-blue-800">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => toggleRoleStatus(role.id, role.status)} className="text-gray-600 hover:text-orange-600">
                          {role.status === 'active' ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
                        </button>
                        <button onClick={() => deleteRole(role.id)} className="text-red-600 hover:text-red-800">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Role Editor Modal */}
          <Modal open={showModal} onOpenChange={() => setShowModal(false)}>
            <ModalContent>
              <div className="space-y-4">
                <label className="block text-sm font-medium text-gray-700">Role Name</label>
                <input
                  value={currentRole.name || ''}
                  onChange={(e) => setCurrentRole({ ...currentRole, name: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <textarea
                  value={currentRole.description || ''}
                  onChange={(e) => setCurrentRole({ ...currentRole, description: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  rows={3}
                />
                <label className="block text-sm font-medium text-gray-700">Permissions</label>
                <select
                  multiple
                  value={currentRole.permissions || []}
                  onChange={(e) => setCurrentRole({ ...currentRole, permissions: Array.from(e.target.selectedOptions, opt => opt.value) })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="view_patients">View Patients</option>
                  <option value="edit_records">Edit Records</option>
                  <option value="manage_staff">Manage Staff</option>
                  <option value="view_analytics">View Analytics</option>
                  {/* Add permissions from your list */}
                </select>
              </div>
              <ModalFooter>
                <button onClick={() => setShowModal(false)} className="px-4 py-2 border rounded-lg hover:bg-gray-100">
                  Cancel
                </button>
                <button onClick={saveRole} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                  Save
                </button>
              </ModalFooter>
            </ModalContent>
          </Modal>
        </main>
      </div>
    </ProtectedRoute>
  );
}