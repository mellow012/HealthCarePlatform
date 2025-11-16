import { useState, useEffect, useRef } from 'react';
import { Send, X, Zap, User } from 'lucide-react';
import { ChatMessage } from '@/types/diagnosis'; // Assume types in local or shared

interface ChatViewProps {
  onSwitchToQuick: () => void;
  onResultsReady: (results: any) => void;
}

export default function ChatView({ onSwitchToQuick, onResultsReady }: ChatViewProps) {
  const [chatSessionId, setChatSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<HTMLInputElement>(null);

  // Scroll to bottom
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // FIXED: Re-focus input after re-render
  useEffect(() => {
    if (chatInputRef.current && !chatLoading) {
      chatInputRef.current.focus();
    }
  }, [chatLoading, inputMessage]);

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

  const getIconForRole = (role: 'user' | 'model') => {
    return role === 'user'
        ? <User className="w-5 h-5 text-gray-500" />
        : <Zap className="w-5 h-5 text-blue-500" />;
  };

  return (
    <div className="flex flex-col h-[70vh] bg-white rounded-xl shadow-lg">
      
      {/* Chat Messages */}
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
      {/* Chat Input - FIXED: Ref to maintain focus */}
      <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-200">
        <div className="flex items-center space-x-3">
          <input
            ref={chatInputRef} // FIXED: Ref for focus persistence
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)} // FIXED: Direct onChange, no re-render traps
            disabled={chatLoading}
            placeholder="Ask a health question (e.g., 'What is severe fatigue?')"
            className="flex-1 px-4 py-3 border border-gray-300 rounded-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50"
            onKeyPress={(e) => e.key === 'Enter' && !chatLoading && handleSendMessage(e as any)} // FIXED: Enter submit without blur
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
}