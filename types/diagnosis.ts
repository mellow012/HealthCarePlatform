
export interface Symptom {
  id: string;
  name: string;
  commonName: string;
  category: 'physical' | 'mental' | 'behavioral';
  severity?: 'mild' | 'moderate' | 'severe';
  duration?: string;
  notes?: string;
}

export interface DiagnosisSession {
  id: string;
  patientId: string;
  symptoms: Symptom[];
  age: number;
  gender: string;
  
  // AI Response
  possibleConditions: PossibleCondition[];
  recommendations: string[];
  urgencyLevel: 'low' | 'medium' | 'high' | 'emergency';
  
  // Metadata
  status: 'in_progress' | 'completed' | 'consulted';
  createdAt: Date;
  completedAt?: Date;
  
  // Follow-up
  consultedDoctorId?: string;
  finalDiagnosis?: string;
  prescription?: string;
}

export interface PossibleCondition {
  name: string;
  commonName: string;
  probability: number; // 0-100
  description: string;
  treatmentAdvice: string[];
  whenToSeeDoctor: string;
  isSeriousCondition: boolean;
}
// ==============================================
// Chat Message Type for Chatbot Mode
// ==============================================
export interface ChatMessage {
  role: 'user' | 'model'; // 'model' for AI responses
  text: string;
  timestamp?: Date; // Optional for display
  id?: string; // Optional for keying
}

// ==============================================
// Selected Symptom (extends Symptom for UI)
export interface SelectedSymptom extends Symptom {
  severity: 'mild' | 'moderate' | 'severe';
  duration: string;
}