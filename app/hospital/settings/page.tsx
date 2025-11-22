// app/hospital/settings/page.tsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  ShieldCheck,
  Building2,
  Users,
  Settings,
  Loader2,
  Plus,
  Edit2,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import AddStaffModal from '@/components/hospital/AddStaffModal';

interface HospitalRole {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  status: 'active' | 'inactive';
}

interface Department {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'inactive';
}

interface Staff {
  uid: string;
  email: string;
  profile: { firstName?: string; lastName?: string };
  role: string;
  department?: string; // department ID
  status: 'active' | 'inactive';
  setupComplete: boolean;
  createdAt: any;
}

export default function HospitalSettingsPage() {
  const { userData } = useAuth();

  const [activeTab, setActiveTab] = useState<'general' | 'roles' | 'staff' | 'departments'>('staff');

  // Data
  const [roles, setRoles] = useState<HospitalRole[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showDeptModal, setShowDeptModal] = useState(false);

  const [editingRole, setEditingRole] = useState<Partial<HospitalRole> | null>(null);
  const [editingDept, setEditingDept] = useState<Partial<Department> | null>(null);

  // Fetchers
  const fetchRoles = useCallback(async () => {
    setLoading(true);
    const res = await fetch('/api/hospital/roles');
    const json = await res.json();
    if (json.success) setRoles(json.data || []);
    setLoading(false);
  }, []);

  const fetchDepartments = useCallback(async () => {
    setLoading(true);
    const res = await fetch('/api/hospital/departments');
    const json = await res.json();
    if (json.success) setDepartments(json.data || []);
    setLoading(false);
  }, []);

  const fetchStaff = useCallback(async () => {
    setLoading(true);
    const res = await fetch('/api/hospital/staff');
    const json = await res.json();
    if (json.success) setStaff(json.data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (activeTab === 'roles') fetchRoles();
    if (activeTab === 'departments') fetchDepartments();
    if (activeTab === 'staff') fetchStaff();
  }, [activeTab, fetchRoles, fetchDepartments, fetchStaff]);

  // Save Handlers
  const saveRole = async () => {
    if (!editingRole?.name?.trim()) return;
    const url = editingRole.id ? `/api/hospital/roles/${editingRole.id}` : '/api/hospital/roles';
    const method = editingRole.id ? 'PUT' : 'POST';
    await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editingRole),
    });
    setShowRoleModal(false);
    setEditingRole(null);
    fetchRoles();
  };

  const saveDepartment = async () => {
    if (!editingDept?.name?.trim()) return;
    const url = editingDept.id ? `/api/hospital/departments/${editingDept.id}` : '/api/hospital/departments';
    const method = editingDept.id ? 'PUT' : 'POST';
    await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editingDept),
    });
    setShowDeptModal(false);
    setEditingDept(null);
    fetchDepartments();
  };

  const toggleStatus = async (type: 'roles' | 'departments' | 'staff', id: string, current: 'active' | 'inactive') => {
    const endpoint = type === 'staff' ? 'staff' : type;
    await fetch(`/api/hospital/${endpoint}/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: current === 'active' ? 'inactive' : 'active' }),
    });
    if (type === 'roles') fetchRoles();
    if (type === 'departments') fetchDepartments();
    if (type === 'staff') fetchStaff();
  };

  const getDepartmentName = (deptId?: string) =>
    departments.find(d => d.id === deptId)?.name || '—';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
              <Settings className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Hospital Settings</h1>
              <p className="text-gray-600">Manage roles, staff, departments and preferences</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* Tabs */}
          <div className="border-b border-gray-200">
            <div className="flex space-x-8 px-6">
              {[
                { id: 'general', label: 'General', icon: Building2 },
                { id: 'roles', label: 'Roles & Permissions', icon: ShieldCheck },
                { id: 'staff', label: 'Staff', icon: Users },
                { id: 'departments', label: 'Departments', icon: Settings },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`py-5 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <tab.icon className="w-5 h-5" />
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="p-8">
            {/* ROLES TAB */}
            {activeTab === 'roles' && (
              <div className="space-y-8">
                <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-bold text-gray-900">Staff Roles</h2>
                  <button
                    onClick={() => {
                      setEditingRole({ name: '', description: '', permissions: [], status: 'active' });
                      setShowRoleModal(true);
                    }}
                    className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 shadow-md transition"
                  >
                    <Plus className="w-5 h-5" />
                    Add Role
                  </button>
                </div>

                {loading ? (
                  <div className="flex justify-center py-20">
                    <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
                  </div>
                ) : roles.length === 0 ? (
                  <div className="text-center py-20 bg-gray-50 rounded-2xl">
                    <ShieldCheck className="w-20 h-20 mx-auto mb-4 text-gray-300" />
                    <p className="text-xl font-semibold text-gray-700">No roles created yet</p>
                  </div>
                ) : (
                  <div className="rounded-2xl border overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase">Name</th>
                          <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase">Description</th>
                          <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase">Status</th>
                          <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {roles.map(role => (
                          <tr key={role.id} className="hover:bg-gray-50 transition">
                            <td className="px-6 py-4 font-medium text-gray-900">{role.name}</td>
                            <td className="px-6 py-4 text-sm text-gray-600">{role.description || '—'}</td>
                            <td className="px-6 py-4">
                              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                                role.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-700'
                              }`}>
                                {role.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 space-x-4">
                              <button
                                onClick={() => {
                                  setEditingRole(role);
                                  setShowRoleModal(true);
                                }}
                                className="text-blue-600 hover:underline font-medium"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => toggleStatus('roles', role.id, role.status)}
                                className={`font-medium ${role.status === 'active' ? 'text-red-600 hover:text-red-800' : 'text-green-600 hover:text-green-800'}`}
                              >
                                {role.status === 'active' ? 'Deactivate' : 'Activate'}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* DEPARTMENTS TAB */}
            {activeTab === 'departments' && (
              <div className="space-y-8">
                <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-bold text-gray-900">Departments</h2>
                  <button
                    onClick={() => {
                      setEditingDept({ name: '', description: '', status: 'active' });
                      setShowDeptModal(true);
                    }}
                    className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 shadow-md transition"
                  >
                    <Plus className="w-5 h-5" />
                    Add Department
                  </button>
                </div>

                {loading ? (
                  <div className="flex justify-center py-20">
                    <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
                  </div>
                ) : departments.length === 0 ? (
                  <div className="text-center py-20 bg-gray-50 rounded-2xl">
                    <Building2 className="w-20 h-20 mx-auto mb-4 text-gray-300" />
                    <p className="text-xl font-semibold text-gray-700">No departments added</p>
                  </div>
                ) : (
                  <div className="rounded-2xl border overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase">Name</th>
                          <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase">Description</th>
                          <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase">Status</th>
                          <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {departments.map(dept => (
                          <tr key={dept.id} className="hover:bg-gray-50 transition">
                            <td className="px-6 py-4 font-medium text-gray-900">{dept.name}</td>
                            <td className="px-6 py-4 text-sm text-gray-600">{dept.description || '—'}</td>
                            <td className="px-6 py-4">
                              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                                dept.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-700'
                              }`}>
                                {dept.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 space-x-4">
                              <button
                                onClick={() => {
                                  setEditingDept(dept);
                                  setShowDeptModal(true);
                                }}
                                className="text-blue-600 hover:underline font-medium"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => toggleStatus('departments', dept.id, dept.status)}
                                className={`font-medium ${dept.status === 'active' ? 'text-red-600 hover:text-red-800' : 'text-green-600 hover:text-green-800'}`}
                              >
                                {dept.status === 'active' ? 'Deactivate' : 'Activate'}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* STAFF TAB */}
            {activeTab === 'staff' && (
              <div className="space-y-8">
                <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-bold text-gray-900">Staff Management</h2>
                  <button
                    onClick={() => setShowStaffModal(true)}
                    className="flex items-center gap-3 px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 shadow-md transition"
                  >
                    <Plus className="w-5 h-5" />
                    Add Staff Member
                  </button>
                </div>

                {loading ? (
                  <div className="flex justify-center py-20">
                    <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
                  </div>
                ) : staff.length === 0 ? (
                  <div className="text-center py-20 bg-gray-50 rounded-2xl">
                    <Users className="w-20 h-20 mx-auto mb-4 text-gray-300" />
                    <p className="text-xl font-semibold text-gray-700">No staff added yet</p>
                    <p className="text-gray-500 mt-2">Click "Add Staff Member" to send invitations</p>
                  </div>
                ) : (
                  <div className="rounded-2xl border overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase">Name</th>
                          <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase">Email</th>
                          <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase">Role</th>
                          <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase">Department</th>
                          <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase">Status</th>
                          <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {staff.map(s => (
                          <tr key={s.uid} className="hover:bg-gray-50 transition">
                            <td className="px-6 py-4 font-medium text-gray-900">
                              {s.profile?.firstName || '—'} {s.profile?.lastName || ''}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-600">{s.email}</td>
                            <td className="px-6 py-4">{s.role || '—'}</td>
                            <td className="px-6 py-4 text-sm">{getDepartmentName(s.department)}</td>
                            <td className="px-6 py-4">
                              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                                s.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-700'
                              }`}>
                                {s.status}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <button
                                onClick={() => toggleStatus('staff', s.uid, s.status)}
                                className={`font-medium ${s.status === 'active' ? 'text-red-600 hover:text-red-800' : 'text-green-600 hover:text-green-800'}`}
                              >
                                {s.status === 'active' ? 'Deactivate' : 'Activate'}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* GENERAL TAB */}
            {activeTab === 'general' && (
              <div className="py-20 text-center">
                <div className="bg-gray-50 rounded-2xl p-12">
                  <Settings className="w-20 h-20 mx-auto mb-4 text-gray-400" />
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">General Settings</h2>
                  <p className="text-gray-600">Hospital profile, branding, notifications — coming soon!</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Role Modal */}
      <Dialog open={showRoleModal} onOpenChange={setShowRoleModal}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingRole?.id ? 'Edit Role' : 'Create New Role'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-5 py-4">
            <input
              placeholder="Role Name"
              value={editingRole?.name || ''}
              onChange={(e) => setEditingRole({ ...editingRole, name: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <textarea
              placeholder="Description (optional)"
              value={editingRole?.description || ''}
              onChange={(e) => setEditingRole({ ...editingRole, description: e.target.value })}
              rows={3}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <DialogFooter className="gap-3">
            <button onClick={() => setShowRoleModal(false)} className="px-6 py-3 border rounded-lg hover:bg-gray-50">
              Cancel
            </button>
            <button onClick={saveRole} className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              Save Role
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Department Modal */}
      <Dialog open={showDeptModal} onOpenChange={setShowDeptModal}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingDept?.id ? 'Edit Department' : 'Create New Department'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-5 py-4">
            <input
              placeholder="Department Name"
              value={editingDept?.name || ''}
              onChange={(e) => setEditingDept({ ...editingDept, name: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <textarea
              placeholder="Description (optional)"
              value={editingDept?.description || ''}
              onChange={(e) => setEditingDept({ ...editingDept, description: e.target.value })}
              rows={3}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <DialogFooter className="gap-3">
            <button onClick={() => setShowDeptModal(false)} className="px-6 py-3 border rounded-lg hover:bg-gray-50">
              Cancel
            </button>
            <button onClick={saveDepartment} className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              Save Department
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Staff Invite Modal */}
      {showStaffModal && (
        <AddStaffModal
          onClose={() => setShowStaffModal(false)}
          onSuccess={() => {
            setShowStaffModal(false);
            fetchStaff();
          }}
        />
      )}
    </div>
  );
}