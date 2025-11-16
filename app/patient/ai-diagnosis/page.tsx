'use client';

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import {
  Brain,
  Plus,
  X,
  AlertTriangle,
  CheckCircle,
  Clock,
  AlertCircle,
  ArrowRight,
  ChevronRight,
  Send,
  MessageSquare,
  Activity,
  User,
  Zap,
} from 'lucide-react';

// --- Type Definitions ---
const commonSymptoms = [
  { id: 's1', name: 'Fever', category: 'general' },
  { id: 's2', name: 'Headache', category: 'general' },
  { id: 's3', name: 'Cough', category: 'respiratory' },
  { id: 's4', name: 'Sore throat', category: 'respiratory' },
  { id: 's5', name: 'Fatigue', category: 'general' },
  { id: 's6', name: 'Nausea', category: 'digestive' },
  { id: 's7', name: 'Stomach pain', category: 'digestive' },
  { id: 's8', name: 'Back pain', category: 'pain' },
  { id: 's9', name: 'Dizziness', category: 'general' },
  { id: 's10', name: 'Shortness of breath', category: 'respiratory' },
];

interface SelectedSymptom {
  id: string;
  name: string;
  severity: 'mild' | 'moderate' | 'severe';
  duration: string;
}

interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

// --- Utility Components ---
interface AlertModalProps {
  message: string;
  type: 'error' | 'success';
  onClose: () => void;
}

const AlertModal: React.FC<AlertModalProps> = ({ message, type, onClose }) => {
  const Icon = type === 'error' ? AlertCircle : CheckCircle;
  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className={`bg-white rounded-xl shadow-2xl max-w-sm w-full p-6 border-t-4 ${type === 'error' ? 'border-red-500' : 'border-green-500'}`}>
        <div className="flex items-center space-x-3">
          <Icon className={`w-6 h-6 ${type === 'error' ? 'text-red-600' : 'text-green-600'}`} />
          <h3 className="text-lg font-semibold text-gray-900">{type === 'error' ? 'Operation Failed' : 'Success'}</h3>
        </div>
        <p className="mt-4 text-gray-700">{message}</p>
        <button
          onClick={onClose}
          className={`mt-6 w-full px-4 py-2 ${type === 'error' ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'} text-white rounded-lg font-medium transition`}
        >
          Close
        </button>
      </div>
    </div>
  );
};

// --- SelectedSymptoms Component ---
interface SelectedSymptomsProps {
  symptoms: SelectedSymptom[];
  onRemoveSymptom: (id: string) => void;
  onUpdateSymptom: (id: string, field: string, value: string) => void;
}

const SelectedSymptoms: React.FC<SelectedSymptomsProps> = ({ symptoms, onRemoveSymptom, onUpdateSymptom }) => (
  <div className="space-y-4">
    <h3 className="text-lg font-bold text-gray-800 border-b pb-2 mb-4">Your Selected Symptoms ({symptoms.length})</h3>
    {symptoms.map((symptom) => (
      <div key={symptom.id} className="p-4 bg-gray-50 border border-gray-200 rounded-xl shadow-sm grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
        <div className="md:col-span-1 flex items-center justify-between">
          <span className="font-semibold text-gray-900">{symptom.name}</span>
          <button onClick={() => onRemoveSymptom(symptom.id)} className="text-red-500 hover:text-red-700 transition">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="md:col-span-1">
          <label className="block text-xs font-medium text-gray-500 mb-1">Severity</label>
          <select
            value={symptom.severity}
            onChange={(e) => onUpdateSymptom(symptom.id, 'severity', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="mild">Mild</option>
            <option value="moderate">Moderate</option>
            <option value="severe">Severe</option>
          </select>
        </div>
        <div className="md:col-span-2">
          <label className="block text-xs font-medium text-gray-500 mb-1">Duration (e.g., 3 days, 1 week)</label>
          <input
            type="text"
            value={symptom.duration}
            onChange={(e) => onUpdateSymptom(symptom.id, 'duration', e.target.value)}
            placeholder="e.g., 3 days, 1 week"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>
    ))}
  </div>
);

// --- AdditionalInfoForm Component ---
interface AdditionalInfoFormProps {
  age: string;
  onAgeChange: (age: string) => void;
  gender: string;
  onGenderChange: (gender: string) => void;
  additionalInfo: string;
  onAdditionalChange: (info: string) => void;
}

const AdditionalInfoForm: React.FC<AdditionalInfoFormProps> = ({
  age, onAgeChange, gender, onGenderChange, additionalInfo, onAdditionalChange
}) => (
  <div className="space-y-6">
    <h3 className="text-xl font-bold text-gray-900 border-b pb-2">Patient Details</h3>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div>
        <label htmlFor="age" className="block text-sm font-medium text-gray-700 mb-2">
          Age (Years)
        </label>
        <input
          id="age"
          type="number"
          min="1"
          max="120"
          value={age}
          onChange={(e) => onAgeChange(e.target.value)}
          placeholder="e.g., 35"
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
        />
      </div>
      <div>
        <label htmlFor="gender" className="block text-sm font-medium text-gray-700 mb-2">
          Biological Sex/Gender
        </label>
        <select
          id="gender"
          value={gender}
          onChange={(e) => onGenderChange(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 bg-white"
        >
          <option value="">Select...</option>
          <option value="male">Male</option>
          <option value="female">Female</option>
          <option value="other">Other/Prefer not to say</option>
        </select>
      </div>
    </div>
    <div>
      <label htmlFor="additional-info" className="block text-sm font-medium text-gray-700 mb-2">
        Additional Context (Medications, existing conditions, recent travel)
      </label>
      <textarea
        id="additional-info"
        rows={4}
        value={additionalInfo}
        onChange={(e) => onAdditionalChange(e.target.value)}
        placeholder="E.g., I take daily blood pressure medication. I recently traveled abroad."
        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      />
    </div>
  </div>
);

// --- AnalysisResults Component ---
interface AnalysisResultsProps {
  results: any;
  getUrgencyColor: (level: string) => string;
  onNewCheck: () => void;
}

const AnalysisResults: React.FC<AnalysisResultsProps> = ({ results, getUrgencyColor, onNewCheck }) => {
  // Safe fallbacks for undefined values
  const urgencyLevel = results?.urgency_level || 'medium';
  const urgencyText = results?.urgency_text || 'Please consult a healthcare professional for proper evaluation.';
  const possibleConditions = results?.possible_conditions || [];
  const recommendations = results?.recommendations || [];

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 space-y-8">
      <div className="border-b pb-4">
        <h2 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <Activity className="w-8 h-8 text-blue-600" /> Preliminary Analysis
        </h2>
        <p className="text-gray-600 mt-1">Based on the symptoms you provided.</p>
      </div>

      {/* Urgency Box */}
      <div className={`p-5 rounded-xl border ${getUrgencyColor(urgencyLevel)}`}>
        <div className="flex items-center gap-3">
          <AlertTriangle className="w-6 h-6" />
          <h3 className="text-xl font-bold">Urgency Level: {urgencyLevel.toUpperCase()}</h3>
        </div>
        <p className="mt-2 font-medium">Recommendation: {urgencyText}</p>
        <p className="text-sm mt-3 border-t pt-3 border-current">
          <span className="font-semibold">Disclaimer:</span> This is NOT a substitute for professional medical advice. If your symptoms worsen, seek immediate medical care.
        </p>
      </div>

      {/* Possible Conditions */}
      {possibleConditions.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-xl font-bold text-gray-900">Possible Conditions</h3>
          {possibleConditions.map((condition: any, index: number) => (
            <div key={index} className="p-4 border border-gray-200 rounded-lg bg-gray-50">
              <div className="flex justify-between items-center mb-2">
                <h4 className="font-semibold text-lg text-blue-700">{condition.name || 'Unknown Condition'}</h4>
                <span className={`text-xs font-medium px-3 py-1 rounded-full ${
                  condition.confidence === 'high' 
                    ? 'bg-green-200 text-green-800' 
                    : condition.confidence === 'medium' 
                    ? 'bg-yellow-200 text-yellow-800' 
                    : 'bg-red-200 text-red-800'
                }`}>
                  Confidence: {condition.confidence ? condition.confidence.charAt(0).toUpperCase() + condition.confidence.slice(1) : 'Unknown'}
                </span>
              </div>
              <p className="text-gray-700 text-sm">{condition.summary || 'No summary available.'}</p>
            </div>
          ))}
        </div>
      )}

      {/* General Recommendations */}
      {recommendations.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-xl font-bold text-gray-900">General Recommendations</h3>
          <ul className="list-none space-y-2 pl-0">
            {recommendations.map((rec: string, index: number) => (
              <li key={index} className="flex items-start gap-3 text-gray-700">
                <ChevronRight className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <span>{rec}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Show message if no data available */}
      {possibleConditions.length === 0 && recommendations.length === 0 && (
        <div className="p-6 bg-gray-50 rounded-lg text-center">
          <p className="text-gray-600">Analysis complete. Please consult a healthcare professional for detailed evaluation.</p>
        </div>
      )}

      <div className="pt-4 border-t flex gap-4">
        <button
          onClick={onNewCheck}
          className="flex-1 px-6 py-3 border border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Start New Check
        </button>
        <button
          onClick={() => {
            alert("Switching to Chatbot mode to discuss the results further.");
          }}
          className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
        >
          Continue to Chat <MessageSquare className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

// --- Main Page Component ---
export default function AIDiagnosisPage() {
  const { userData } = useAuth();

  // View State Management
  const [mode, setMode] = useState<'diagnosis' | 'chat'>('diagnosis');

  // Diagnosis States
  const [step, setStep] = useState(1);
  const [selectedSymptoms, setSelectedSymptoms] = useState<SelectedSymptom[]>([]);
  const [customSymptom, setCustomSymptom] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('');
  const [additionalInfo, setAdditionalInfo] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [agreedToDisclaimer, setAgreedToDisclaimer] = useState(false);
  const [showAlert, setShowAlert] = useState<{ message: string; type: 'error' | 'success' } | null>(null);

  // Chat States
  const [chatSessionId, setChatSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<HTMLInputElement>(null);

  // Scroll to bottom of chat
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, mode]);

  // Re-focus input after re-render
  useEffect(() => {
    if (mode === 'chat' && chatInputRef.current && !chatLoading) {
      chatInputRef.current.focus();
    }
  }, [mode, chatLoading, inputMessage]);

  // --- Symptom Management Functions ---
  const addSymptom = (symptom: typeof commonSymptoms[0]) => {
    if (!selectedSymptoms.find(s => s.id === symptom.id)) {
      setSelectedSymptoms([...selectedSymptoms, {
        id: symptom.id,
        name: symptom.name,
        severity: 'moderate',
        duration: '1-2 days',
      }]);
    }
  };

  const addCustomSymptom = () => {
    if (customSymptom.trim()) {
      setSelectedSymptoms([...selectedSymptoms, {
        id: `custom_${Date.now()}`,
        name: customSymptom,
        severity: 'moderate',
        duration: '1-2 days',
      }]);
      setCustomSymptom('');
    }
  };

  const removeSymptom = (id: string) => {
    setSelectedSymptoms(selectedSymptoms.filter(s => s.id !== id));
  };

  const updateSymptom = (id: string, field: string, value: string) => {
    setSelectedSymptoms(selectedSymptoms.map(s =>
      s.id === id ? { ...s, [field]: value } : s
    ));
  };

  const handleAnalyze = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/ai-diagnosis/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symptoms: selectedSymptoms,
          age: parseInt(age) || 30,
          gender: gender || 'other',
          additionalInfo,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setResults(data.data);
        setStep(3);
      } else {
        setShowAlert({ message: data.error || 'Failed to analyze symptoms', type: 'error' });
      }
    } catch (error) {
      console.error('Error:', error);
      setShowAlert({ message: 'Failed to analyze symptoms', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // --- Chatbot Logic ---
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || chatLoading) return;

    const userMessage: ChatMessage = { role: 'user', text: inputMessage };
   
    setMessages((prev) => [...prev, userMessage]);
    setInputMessage('');
    setChatLoading(true);

    const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;
   
    const contextHistory = messages.slice(-5);
    const contents = contextHistory.map(msg => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.text }]
    }));
    contents.push({ role: 'user', parts: [{ text: userMessage.text }] });
    
    const systemPrompt = "You are a friendly, supportive AI assistant for a symptom checker app. Your role is to provide general, non-diagnostic health information, answer questions about common symptoms, and explain health concepts clearly. ALWAYS preface your response with a strong reminder: 'I am an AI and cannot provide medical advice. Always consult a healthcare professional for diagnosis or treatment.' If the user asks for a diagnosis, specific treatment plan, or urgent medical advice, politely reiterate this disclaimer and strongly recommend seeing a doctor or calling emergency services.";
    
    const payload = {
      contents: contents,
      tools: [{ "google_search": {} }],
      systemInstruction: {
        parts: [{ text: systemPrompt }]
      },
    };

    try {
      let response;
      let attempts = 0;
      const maxAttempts = 3;
      
      while (attempts < maxAttempts) {
        try {
          response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
          if (response.ok) break;
        } catch (error) {
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempts) * 1000));
        }
        attempts++;
      }
      
      if (!response || !response.ok) {
        throw new Error('API call failed after multiple retries.');
      }
      
      const result = await response.json();
      const generatedText = result.candidates?.[0]?.content?.parts?.[0]?.text || "Sorry, I couldn't process that request right now.";
     
      const modelMessage: ChatMessage = { role: 'model', text: generatedText };
      setMessages((prev) => [...prev, modelMessage]);
    } catch (error) {
      console.error('Chat API Error:', error);
      const errorMessage: ChatMessage = { role: 'model', text: "I'm having trouble connecting to the medical AI service. Please try again later." };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setChatLoading(false);
    }
  };

  // --- Rendering Utilities ---
  const getUrgencyColor = (level: string) => {
    switch (level) {
      case 'emergency': return 'bg-red-100 text-red-800 border-red-300';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      default: return 'bg-green-100 text-green-800 border-green-300';
    }
  };

  const getIconForRole = (role: 'user' | 'model') => {
    return role === 'user'
      ? <User className="w-5 h-5 text-gray-500" />
      : <Zap className="w-5 h-5 text-blue-500" />;
  };

  const ChatView = () => (
    <div className="flex flex-col h-[70vh] bg-white rounded-xl shadow-lg">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center py-10 text-gray-500 italic">
            Start a conversation! Ask about your symptoms or the diagnosis results.
          </div>
        )}
        {messages.map((msg, index) => (
          <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`flex items-start max-w-lg ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'} space-x-2 ${msg.role === 'user' ? 'space-x-reverse' : ''}`}>
              <div className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 flex-shrink-0">
                {getIconForRole(msg.role)}
              </div>
              <div className={`p-3 rounded-xl shadow-md text-sm whitespace-pre-wrap ${
                msg.role === 'user'
                  ? 'bg-blue-500 text-white rounded-br-none'
                  : 'bg-gray-100 text-gray-800 rounded-tl-none'
              }`}>
                {msg.text}
              </div>
            </div>
          </div>
        ))}
        {chatLoading && (
          <div className="flex justify-start">
            <div className="flex items-start max-w-lg space-x-2">
              <div className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 flex-shrink-0">
                <Zap className="w-5 h-5 text-blue-500" />
              </div>
              <div className="p-3 rounded-xl bg-gray-100 text-gray-500 rounded-tl-none">
                <div className="flex items-center space-x-2">
                  <div className="animate-pulse bg-gray-300 h-3 w-16 rounded"></div>
                  <div className="animate-pulse bg-gray-300 h-3 w-10 rounded"></div>
                </div>
              </div>
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>
      <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-200">
        <div className="flex items-center space-x-3">
          <input
            ref={chatInputRef}
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            disabled={chatLoading}
            placeholder="Ask a health question (e.g., 'What is severe fatigue?')"
            className="flex-1 px-4 py-3 border border-gray-300 rounded-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50"
          />
          <button
            type="submit"
            disabled={!inputMessage.trim() || chatLoading}
            className="p-3 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </form>
    </div>
  );

  // --- Diagnosis Views ---
  const DiagnosisView = useMemo(() => {
    if (step === 1) {
      return (
        <div className="space-y-6">
          <div className="bg-yellow-50 border-2 border-yellow-300 rounded-xl p-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-bold text-yellow-900 mb-2">Important Medical Disclaimer</h3>
                <div className="text-sm text-yellow-800 space-y-2">
                  <p>This AI symptom checker is for informational purposes only and does NOT provide medical diagnosis or treatment.</p>
                  <ul className="list-disc ml-5 space-y-1">
                    <li>Always consult a healthcare professional for medical advice</li>
                    <li>Call emergency services if you have a medical emergency</li>
                    <li>This tool cannot replace a doctor's examination</li>
                  </ul>
                </div>
                <label className="flex items-center gap-2 mt-4">
                  <input
                    type="checkbox"
                    checked={agreedToDisclaimer}
                    onChange={(e) => setAgreedToDisclaimer(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 border-gray-300 focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-yellow-900">
                    I understand and agree to continue
                  </span>
                </label>
              </div>
            </div>
          </div>
          {agreedToDisclaimer && (
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
                {commonSymptoms.map((symptom) => (
                  <button
                    key={symptom.id}
                    onClick={() => addSymptom(symptom)}
                    disabled={selectedSymptoms.some(s => s.id === symptom.id)}
                    className={`p-3 rounded-lg border-2 text-left transition-all ${
                      selectedSymptoms.some(s => s.id === symptom.id)
                        ? 'border-blue-600 bg-blue-50 text-blue-900'
                        : 'border-gray-200 hover:border-blue-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm">{symptom.name}</span>
                      {selectedSymptoms.some(s => s.id === symptom.id) && (
                        <CheckCircle className="w-4 h-4 text-blue-600" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Add other symptoms
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customSymptom}
                    onChange={(e) => setCustomSymptom(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addCustomSymptom()}
                    placeholder="Type symptom and press Enter"
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <button
                    onClick={addCustomSymptom}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Add
                  </button>
                </div>
              </div>
              {selectedSymptoms.length > 0 && (
                <SelectedSymptoms
                  symptoms={selectedSymptoms}
                  onRemoveSymptom={removeSymptom}
                  onUpdateSymptom={updateSymptom}
                />
              )}
              {selectedSymptoms.length > 0 && (
                <button
                  onClick={() => setStep(2)}
                  className="w-full mt-6 bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                >
                  Continue <ArrowRight className="w-5 h-5" />
                </button>
              )}
            </div>
          )}
        </div>
      );
    } else if (step === 2) {
      return (
        <div className="bg-white rounded-xl shadow-lg p-6">
          <AdditionalInfoForm 
            age={age}
            onAgeChange={setAge}
            gender={gender}
            onGenderChange={setGender}
            additionalInfo={additionalInfo}
            onAdditionalChange={setAdditionalInfo}
          />
          <div className="flex gap-3 mt-6">
            <button
              onClick={() => setStep(1)}
              className="flex-1 px-6 py-3 border border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Back
            </button>
            <button
              onClick={handleAnalyze}
              disabled={loading}
              className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 flex items-center justify-center gap-2 transition-colors"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Analyzing...
                </>
              ) : (
                <>
                  <Brain className="w-5 h-5" />
                  Analyze Symptoms
                </>
              )}
            </button>
          </div>
        </div>
      );
    } else if (step === 3 && results) {
      return (
        <AnalysisResults 
          results={results}
          getUrgencyColor={getUrgencyColor}
          onNewCheck={() => {
            setStep(1);
            setSelectedSymptoms([]);
            setResults(null);
            setAgreedToDisclaimer(false);
          }}
        />
      );
    }
    return null;
  }, [step, results, agreedToDisclaimer, selectedSymptoms, customSymptom, age, gender, additionalInfo, loading]);

  return (
    <ProtectedRoute allowedRoles={['patient']}>
      <div className="min-h-screen bg-gray-50">
        
        {/* Global Alert Modal */}
        {showAlert && (
          <AlertModal
            message={showAlert.message}
            type={showAlert.type}
            onClose={() => setShowAlert(null)}
          />
        )}

        {/* Header */}
        <header className="bg-white shadow-sm">
          <div className="max-w-4xl mx-auto px-4 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
                  <Brain className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    {mode === 'diagnosis' ? 'AI Symptom Checker' : 'AI Health Chat'}
                  </h1>
                  <p className="text-gray-600">
                    {mode === 'diagnosis' ? 'Get preliminary health insights' : 'Ask follow-up questions'}
                  </p>
                </div>
              </div>
              {/* Mode Toggle */}
              <div className="flex space-x-2 p-1 bg-gray-100 rounded-full">
                <button
                  onClick={() => setMode('diagnosis')}
                  className={`px-4 py-2 text-sm font-semibold rounded-full transition-colors flex items-center gap-2 ${
                    mode === 'diagnosis' ? 'bg-blue-600 text-white shadow' : 'text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <Activity className="w-5 h-5" /> Diagnosis
                </button>
                <button
                  onClick={() => setMode('chat')}
                  className={`px-4 py-2 text-sm font-semibold rounded-full transition-colors flex items-center gap-2 ${
                    mode === 'chat' ? 'bg-blue-600 text-white shadow' : 'text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <MessageSquare className="w-5 h-5" /> Chatbot
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="max-w-4xl mx-auto px-4 py-8">
          {mode === 'diagnosis' ? DiagnosisView : <ChatView />}
        </div>
      </div>
    </ProtectedRoute>
  );
}