export interface User {
  uid: string;
  email: string;
  role: 'super_admin' | 'hospital_admin' | 'patient';
  hospitalId?: string;
  profile?: {
    firstName?: string;
    lastName?: string;
    phone?: string;
  };
  setupComplete?: boolean;
  createdAt: Date;
}

export interface Hospital {
  id: string;
  name: string;
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  adminId: string;
  phone: string;
  email: string;
  website?: string;
  departments: string[];
  isActive: boolean;
  createdAt: Date;
}

export interface Patient {
  userId: string;
  personalInfo: {
    firstName: string;
    lastName: string;
    dateOfBirth: Date;
    gender: string;
    phone: string;
    address: {
      street: string;
      city: string;
      state: string;
      zipCode: string;
    };
  };
  emergencyContact: {
    name: string;
    relationship: string;
    phone: string;
  };
  medicalHistory: {
    bloodType?: string;
    allergies?: string[];
    chronicConditions?: string[];
    currentMedications?: string[];
  };
  createdAt: Date;
}

export interface Visit {
  id: string;
  patientId: string;
  hospitalId: string;
  checkInTime: Date;
  checkOutTime: Date | null;
  status: 'checked_in' | 'checked_out';
  purpose: string;
  department: string;
  metadata: {
    checkInBy: string;
    checkInMethod: string;
    checkOutBy?: string;
  };
}

export interface MedicalRecord {
  id: string;
  patientId: string;
  hospitalId: string;
  visitId: string;
  recordType: string;
  diagnosis: string;
  prescriptions: Array<{
    medication: string;
    dosage: string;
    frequency: string;
    duration: string;
  }>;
  attachments: string[];
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}