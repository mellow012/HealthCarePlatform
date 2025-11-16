import { NextRequest, NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebase/admin';
import { cookies } from 'next/headers';
// Removed unused 'Type' import

// --- API Key & Model Configuration ---
// IMPORTANT: For server-side Next.js APIs, the variable MUST NOT have the NEXT_PUBLIC_ prefix.
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent';
const API_KEY = process.env.GEMINI_API_KEY!;
const MAX_RETRIES = 3;

// Helper to verify session cookie
async function verifySession(token: string | undefined) {
    if (!token) return null;
    try {
        return await adminAuth.verifySessionCookie(token, true);
    } catch (error) {
        console.error('Session verification failed:', error);
        return null;
    }
}

export async function POST(req: NextRequest) {
    // Check for API Key immediately
    if (!API_KEY) {
        const keyError = 'API Key Missing: GEMINI_API_KEY environment variable is not set on the server.';
        console.error(keyError);
        return NextResponse.json({ error: keyError }, { status: 500 });
    }
    
    try {
        const token = (await cookies()).get('session')?.value;
        if (!token) {
            console.log('No session token for AI diagnosis');
            return NextResponse.json({ error: 'Unauthorized - No session' }, { status: 401 });
        }

        const decodedToken = await verifySession(token);
        if (!decodedToken) {
            console.log('Session verification failed for AI diagnosis');
            return NextResponse.json({ error: 'Unauthorized - Invalid session' }, { status: 401 });
        }

        // Verify role
        const userDoc = await adminDb.collection('users').doc(decodedToken.uid).get();
        if (!userDoc.exists || userDoc.data()?.role !== 'patient') {
            return NextResponse.json({ error: 'Forbidden - Patient access only' }, { status: 403 });
        }

        const { symptoms, age, gender, additionalInfo } = await req.json();

        if (!symptoms || symptoms.length === 0) {
            return NextResponse.json(
                { error: 'Please provide at least one symptom' },
                { status: 400 }
            );
        }

        // Create diagnosis session
        const sessionId = `diag_${decodedToken.uid}_${Date.now()}`;

        // Get AI analysis using Gemini API
        const aiResponse = await analyzeSymptoms(symptoms, age, gender, additionalInfo);

        const sessionData = {
            id: sessionId,
            patientId: decodedToken.uid,
            symptoms,
            age,
            gender,
            additionalInfo,
            possibleConditions: aiResponse.conditions,
            recommendations: aiResponse.recommendations,
            urgencyLevel: aiResponse.urgencyLevel,
            status: 'completed',
            createdAt: new Date(),
            completedAt: new Date(),
        };

        await adminDb.collection('diagnosisSessions').doc(sessionId).set(sessionData);

        // Audit log
        await adminDb.collection('auditLogs').add({
            userId: decodedToken.uid,
            action: 'AI_DIAGNOSIS_COMPLETED',
            resourceType: 'diagnosisSession',
            resourceId: sessionId,
            metadata: { symptomCount: symptoms.length },
            timestamp: new Date(),
        });

        return NextResponse.json({
            success: true,
            data: {
                sessionId,
                ...aiResponse,
            },
        });
    } catch (error: any) {
        console.error('Error in AI diagnosis:', error);
        // Ensure the error message is descriptive, especially for API key issues
        const errorMessage = error.message.includes('API Key Error') 
            ? error.message 
            : 'Failed to process diagnosis. Check server logs.';
            
        return NextResponse.json(
            { error: errorMessage },
            { status: 500 }
        );
    }
}

// Utility to handle API calls with exponential backoff (retry logic)
async function fetchWithRetry(url: string, options: RequestInit) {
    for (let i = 0; i < MAX_RETRIES; i++) {
        try {
            const response = await fetch(url, options);

            if (response.ok) {
                return response;
            }

            // If 403 (Forbidden), we stop retrying immediately.
            if (response.status === 403) {
                 throw new Error(`API Key Error (Status 403): The GEMINI_API_KEY is invalid or missing or rate limited. Please check your .env.local file.`);
            }
            
            // Otherwise, throw an error to trigger retry logic
            throw new Error(`API call failed with status: ${response.status}`);
            
        } catch (error) {
            // Note: Retries should not be logged as errors in production, but helpful for debugging
            console.error(`API Attempt ${i + 1} failed:`, error);
            if (i === MAX_RETRIES - 1) {
                throw new Error(`Gemini API call failed after multiple retries.`);
            }
            // Exponential backoff
            const delay = Math.pow(2, i) * 1000;
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
    // Should be unreachable due to the throw in the loop
    throw new Error("Maximum retries reached without successful API call.");
}

// AI Analysis using Gemini API with Structured Output
async function analyzeSymptoms(
    symptoms: { name: string, severity?: string, duration?: string }[],
    age: number,
    gender: string,
    additionalInfo?: string
) {
    const symptomsList = symptoms.map(s => 
        `- ${s.name}${s.severity ? ` (${s.severity})` : ''}${s.duration ? ` for ${s.duration}` : ''}`
    ).join('\n');

    const systemPrompt = `You are a medical AI assistant helping to provide preliminary health information. Your sole purpose is to analyze the provided symptoms and return a precise JSON object matching the requested schema. DO NOT include any text outside the JSON object.

    Patient Information:
    - Age: ${age}
    - Gender: ${gender}
    ${additionalInfo ? `- Additional info: ${additionalInfo}` : ''}
    
    Reported Symptoms:
    ${symptomsList}
    
    Instructions:
    1. Provide 2-4 possible conditions ordered by probability (highest first).
    2. Be conservative with the urgency assessment.
    3. Always recommend consulting a healthcare professional.
    4. Set IMPORTANT DISCLAIMER: This is NOT a medical diagnosis in the description field.`;


    const diagnosisSchema = {
        type: "OBJECT",
        properties: {
            conditions: {
                type: "ARRAY",
                description: "A list of possible medical conditions.",
                items: {
                    type: "OBJECT",
                    properties: {
                        name: { type: "STRING", description: "The technical name of the condition." },
                        commonName: { type: "STRING", description: "The common name for the condition." },
                        probability: { type: "NUMBER", description: "Estimated probability (0-100)." },
                        description: { type: "STRING", description: "Brief description and IMPORTANT DISCLAIMER." },
                        treatmentAdvice: { type: "ARRAY", items: { type: "STRING" }, description: "List of initial self-care steps or medical advice." },
                        whenToSeeDoctor: { type: "STRING", description: "Specific guidance on when to seek medical attention." },
                        isSeriousCondition: { type: "BOOLEAN", description: "True if the condition is considered serious or high-risk." },
                    },
                    required: ["name", "commonName", "probability", "description", "treatmentAdvice", "whenToSeeDoctor", "isSeriousCondition"],
                }
            },
            recommendations: {
                type: "ARRAY",
                items: { type: "STRING" },
                description: "General recommendations for the patient (e.g., consult doctor, rest)."
            },
            urgencyLevel: {
                type: "STRING",
                description: "Assessment of urgency: low, medium, high, or emergency.",
                enum: ["low", "medium", "high", "emergency"]
            }
        },
        required: ["conditions", "recommendations", "urgencyLevel"]
    };
    
    const requestPayload = {
        contents: [{ parts: [{ text: symptomsList }] }],
        systemInstruction: {
            parts: [{ text: systemPrompt }]
        },
        generationConfig: {
            responseMimeType: "application/json",
            responseSchema: diagnosisSchema,
        },
    };

    // FIX APPLIED HERE: Changed from &key= to ?key=
    const requestUrl = `${GEMINI_API_URL}?key=${API_KEY}`;

    try {
        const response = await fetchWithRetry(requestUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestPayload)
        });

        const result = await response.json();
        
        // The structured output is in the first part of the candidate content
        const jsonText = result.candidates?.[0]?.content?.parts?.[0]?.text;
        
        if (!jsonText) {
            console.error("Gemini API Response Error:", result);
            throw new Error('Gemini API did not return valid JSON content.');
        }

        // Parse the guaranteed JSON
        const aiAnalysis = JSON.parse(jsonText);
        return aiAnalysis;

    } catch (error) {
        console.error('AI analysis error:', error);
        // Re-throw the error to be caught by the main POST function's catch block
        throw error;
    }
}