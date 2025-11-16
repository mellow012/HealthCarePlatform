
export interface Medication {
  id: string;
  patientId: string;
  name: string;
  dosage: string; // e.g., "500mg", "10ml"
  frequency: 'once_daily' | 'twice_daily' | 'three_times_daily' | 'four_times_daily' | 'every_x_hours' | 'as_needed';
  frequencyDetails?: number; // For "every_x_hours", stores the hour interval
  timings: string[]; // e.g., ["08:00", "14:00", "20:00"]
  startDate: Date;
  endDate: Date;
  duration: number; // in days
  prescribedBy: string; // Doctor/Hospital
  purpose: string;
  instructions?: string; // Special instructions (e.g., "Take with food")
  sideEffects?: string[];
  
  // Schedule info
  totalDoses: number;
  remainingDoses: number;
  
  // Reminder settings
  reminderEnabled: boolean;
  reminderMinutesBefore: number; // e.g., 15 minutes before
  
  // Import info
  importedFrom?: string; // Medical record ID
  importedAt?: Date;
  
  // Status
  status: 'active' | 'completed' | 'paused' | 'cancelled';
  
  createdAt: Date;
  updatedAt: Date;
}

export interface DosageSchedule {
  id: string;
  medicationId: string;
  patientId: string;
  scheduledDateTime: Date;
  status: 'pending' | 'taken' | 'missed' | 'skipped';
  takenAt?: Date;
  notes?: string;
  reminderSent: boolean;
  createdAt: Date;
}

export interface MedicationFromRecord {
  recordId: string;
  hospitalName: string;
  prescribedDate: Date;
  medications: {
    name: string;
    dosage: string;
    frequency: string;
    duration: string;
    purpose?: string;
  }[];
}
