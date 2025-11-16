export interface EHealthPassport {
  patientId: string;
  isActive: boolean; // Activated on first check-in
  activatedAt: Date | null;
  activatedBy: string | null; // Hospital ID that activated it
  
  // Personal Information
  personalInfo: {
    firstName: string;
    lastName: string;
    dateOfBirth: Date | null;
    gender: string;
    bloodType: string;
    phone: string;
    email: string;
    nationalId?: string;
    photo?: string;
  };
  
  // Addresses
  addresses: {
    primary: Address;
    secondary?: Address;
  };
  
  // Emergency Contacts
  emergencyContacts: EmergencyContact[];
  
  // Medical History
  medicalHistory: {
    allergies: Allergy[];
    chronicConditions: ChronicCondition[];
    surgeries: Surgery[];
    familyHistory: FamilyHistory[];
    immunizations: Immunization[];
    currentMedications: Medication[];
  };
  
  // Hospital Visits
  visitHistory: {
    totalVisits: number;
    hospitals: string[]; // Hospital IDs
    lastVisit: Date | null;
  };
  
  // Consent & Privacy
  consent: {
    dataSharing: boolean;
    researchParticipation: boolean;
    emergencyAccess: boolean;
  };
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
  version: number;
}

interface Address {
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  type: 'home' | 'work' | 'other';
}

interface EmergencyContact {
  id: string;
  name: string;
  relationship: string;
  phone: string;
  alternatePhone?: string;
  email?: string;
  address?: string;
  isPrimary: boolean;
}

interface Allergy {
  id: string;
  allergen: string;
  reaction: string;
  severity: 'mild' | 'moderate' | 'severe' | 'life-threatening';
  diagnosedDate: Date | null;
  notes?: string;
}

interface ChronicCondition {
  id: string;
  condition: string;
  diagnosedDate: Date | null;
  status: 'active' | 'controlled' | 'in-remission';
  notes?: string;
}

interface Surgery {
  id: string;
  procedure: string;
  date: Date;
  hospital: string;
  surgeon?: string;
  notes?: string;
}

interface FamilyHistory {
  id: string;
  relation: string;
  condition: string;
  ageOfOnset?: number;
  notes?: string;
}

interface Immunization {
  id: string;
  vaccine: string;
  date: Date;
  nextDueDate?: Date;
  administeredBy: string;
  batchNumber?: string;
}

interface Medication {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
  startDate: Date;
  endDate?: Date;
  prescribedBy: string;
  purpose?: string;
  sideEffects?: string[];
}