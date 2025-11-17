'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { 
  Settings, 
  Users, 
  Building, 
  Plus, 
  Edit2, 
  Trash2, 
  Loader2,
  AlertCircle 
} from 'lucide-react';
import Modal from '@/components/ui/Modal'; // Your shadcn modal
import toast from 'react-hot-toast';

interface HospitalRole {
  id: string;
  name: string;
  permissions: string[]; // e.g., ['view_patients', 'edit_records']
  description: string;
  status: 'active' | 'inactive';
}

interface Department {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'inactive';
}

interface HospitalSetting {
  key: string;
  value: string;
  type: 'text' | 'number' | 'boolean';
  description: string;
}

export default function HospitalManagementPage() {
  const { userData } = useAuth();
  const hospitalId = userData?.hospitalId; // From custom claims

  const [activeTab, setActiveTab] = useState<'roles' | 'departments' | 'settings'>('roles');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Data for each tab
  const [roles, setRoles] = useState<HospitalRole[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [settings, setSettings] = useState<HospitalSetting[]>([]);

  // Forms
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({ name: '', description: '' });
  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: '', description: '', permissions: [] });

  useEffect(() => {
    if (hospitalId) fetchTabData(activeTab);
  }, [activeTab, hospitalId]);

  const fetchTabData = async (tab: string) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/hospital/${tab}?hospitalId=${hospitalId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load data');
      
      switch (tab) {
        case 'roles': setRoles(data.data); break;
        case 'departments': setDepartments(data.data); break;
        case 'settings': setSettings(data.data); break;
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const createItem = async (type: string, body: any) => {
    try {
      const res = await fetch(`/api/hospital/${type}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hospitalId, ...body }),
      });
      if (res.ok) {
        toast.success(`${type} added`);
        setShowAdd(false);
        fetchTabData(type);
      } else toast.error('Failed to create');
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const updateItem = async (type: string, id: string, body: any) => {
    try {
      const res = await fetch(`/api/hospital/${type}/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hospitalId, ...body }),
      });
      if (res.ok) {
        toast.success('Updated');
        setEditId(null);
        fetchTabData(type);
      } else toast.error('Failed to update');
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const toggleStatus = async (type: string, id: string, current: 'active' | 'inactive') => {
    try {
      const res = await fetch(`/api/hospital/${type}/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hospitalId, status: current === 'active' ? 'inactive' : 'active' }),
      });
      if (res.ok) {
        toast.success('Status updated');
        fetchTabData(type);
      } else toast.error('Failed to toggle');
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const TabButton = ({ tab, label, icon: Icon }: { tab: string; label: string; icon: any }) => (
    <button
      onClick={() => setActiveTab(tab as any)}
      className={`flex items-center gap-2 px-6 py-4 transition-colors ${
        activeTab === tab
          ? 'border-b-2 border-blue-600 text-blue-600'
          : 'text-gray-600 hover:text-gray-900'
      }`}
    >
      <Icon className="w-5 h-5" />
      {label}
    </button>
  );

  return (
    <ProtectedRoute allowedRoles={['hospital_admin']}>
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow-sm">
          <div className="max-w-6xl mx-auto px-4 py-6">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold text-gray-900">Hospital Management</h1>
              <nav className="flex gap-1">
                <TabButton tab="roles" label="Roles" icon={Users} />
                <TabButton tab="departments" label="Departments" icon={Building} />
                <TabButton tab="settings" label="Settings" icon={Settings} />
              </nav>
            </div>
          </div>
        </header>

        <main className="max-w-6xl mx-auto px-4 py-8">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
              <div className="text-sm text-red-800">{error}</div>
            </div>
          )}

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="p-6 border-b">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-semibold text-gray-900 capitalize">{activeTab}</h2>
                  <button
                    onClick={() => setShowAdd(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    <Plus className="w-4 h-4" />
                    Add {activeTab}
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Description
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {(activeTab === 'roles' ? roles : activeTab === 'departments' ? departments : settings).map(item => (
                      <tr key={item.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 font-medium">{item.name}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{item.description}</td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              item.status === 'active'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {item.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 space-x-2">
                          <button onClick={() => { setEditId(item.id); setEditForm({ name: item.name, description: item.description, permissions: item.permissions || [] }); }} className="text-gray-500 hover:text-blue-600">
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button onClick={() => toggleStatus(activeTab, item.id, item.status)} className="text-gray-500 hover:text-orange-600">
                            {item.status === 'active' ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Add/Edit Modal */}
          <Modal open={showAdd || !!editId} onClose={() => { setShowAdd(false); setEditId(null); }}>
            <div className="space-y-4">
              <input
                placeholder={activeTab === 'settings' ? 'Setting Key' : 'Name'}
                value={editId ? editForm.name : addForm.name}
                onChange={e => editId ? setEditForm({ ...editForm, name: e.target.value }) : setAddForm({ ...addForm, name: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg"
              />
              <textarea
                placeholder="Description"
                value={editId ? editForm.description : addForm.description}
                onChange={e => editId ? setEditForm({ ...editForm, description: e.target.value }) : setAddForm({ ...addForm, description: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg"
                rows={3}
              />
              {activeTab === 'roles' && (
                <select
                  multiple
                  value={editForm.permissions || []}
                  onChange={e => setEditForm({ ...editForm, permissions: Array.from(e.target.selectedOptions, option => option.value) })}
                  className="w-full px-4 py-2 border rounded-lg"
                >
                  <option value="view_patients">View Patients</option>
                  <option value="edit_records">Edit Records</option>
                  <option value="manage_staff">Manage Staff</option>
                  {/* Add more permissions */}
                </select>
              )}
              <div className="flex justify-end gap-2">
                <button onClick={() => { setShowAdd(false); setEditId(null); }} className="px-4 py-2 border rounded-lg hover:bg-gray-100">
                  Cancel
                </button>
                <button onClick={() => editId ? updateItem(activeTab, editId, editForm) : createItem(activeTab, addForm)} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                  {editId ? 'Update' : 'Create'}
                </button>
              </div>
            </div>
          </Modal>
        </main>
      </div>
    </ProtectedRoute>
  );
}