
import { GoogleGenAI, Type, Modality, GenerateContentResponse } from "@google/genai";

const API_KEY = process.env.API_KEY || "";

// --- HELPER: RETRY LOGIC ---
const withRetry = async <T>(operation: () => Promise<T>, retries = 3, delay = 1000): Promise<T> => {
    try {
        return await operation();
    } catch (error: any) {
        // Check for rate limit (429) or service unavailable (503)
        const isRetryable = error?.status === 429 || error?.status === 503 || (error?.message && error.message.includes('429'));
        
        if (retries > 0 && isRetryable) {
            console.warn(`Gemini API rate limited/busy. Retrying in ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            return withRetry(operation, retries - 1, delay * 2);
        }
        throw error;
    }
};

// --- HELPER: CONVERT RAW PCM TO WAV DATA URI ---
function writeString(view: DataView, offset: number, string: string) {
    for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
    }
}

function pcmToWavDataUri(pcmData: Uint8Array, sampleRate: number = 24000): Promise<string> {
    const numChannels = 1;
    const byteRate = sampleRate * numChannels * 2;
    const blockAlign = numChannels * 2;
    const bitsPerSample = 16;
    
    const buffer = new ArrayBuffer(44 + pcmData.length);
    const view = new DataView(buffer);

    // RIFF chunk descriptor
    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + pcmData.length, true);
    writeString(view, 8, 'WAVE');

    // fmt sub-chunk
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true); // PCM format
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitsPerSample, true);

    // data sub-chunk
    writeString(view, 36, 'data');
    view.setUint32(40, pcmData.length, true);

    // Write PCM data
    new Uint8Array(buffer, 44).set(pcmData);

    return new Promise((resolve) => {
        const blob = new Blob([buffer], { type: 'audio/wav' });
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
    });
}

// --- ENCYCLOPEDIA BOT ---

export const askMusicEncyclopedia = async (userQuery: string, history: {role: string, parts: {text: string}[]}[] = []) => {
  const ai = new GoogleGenAI({ apiKey: API_KEY });
  
  // Construct chat history for context
  const chat = ai.chats.create({
      model: 'gemini-3-flash-preview',
      config: {
          systemInstruction: `You are the "Shadaj Music Encyclopedia", a highly knowledgeable, polite, and scholarly assistant specialized ONLY in Indian Classical Music (Hindustani and Carnatic). 
          
          Rules:
          1. Answer questions about Raags, Taals, History, Instruments, and Theory concisely.
          2. If a user asks about non-music topics, politely steer them back to music.
          3. Use clear formatting.
          4. Keep answers under 150 words unless asked for detail.`,
      },
      history: history
  });

  const response: GenerateContentResponse = await withRetry(() => chat.sendMessage({ message: userQuery }));
  return response.text;
};

// --- BASIC TEXT GENERATION ---

export const getGeminiResponse = async (prompt: string) => {
  const ai = new GoogleGenAI({ apiKey: API_KEY });
  const response: GenerateContentResponse = await withRetry(() => ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: prompt,
    config: {
        systemInstruction: "You are an expert Indian Classical Music Guru named Sangeet AI. Help students with Raag theory, history, and practice tips. Be encouraging and knowledgeable.",
    }
  }));
  return response.text;
};

export const generateCreativePost = async (topic: string) => {
  const ai = new GoogleGenAI({ apiKey: API_KEY });
  const response: GenerateContentResponse = await withRetry(() => ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Write a short, engaging social media post (max 200 characters) about "${topic}" in the context of Indian Classical Music. Include 2 relevant hashtags.`,
    config: {
      temperature: 0.9,
    }
  }));
  return response.text;
};

// --- MULTIMEDIA GENERATION (AUDIO & EMOJI ONLY) ---

export const generateMusicEmoticon = async (action: string) => {
    const ai = new GoogleGenAI({ apiKey: API_KEY });
    const response: GenerateContentResponse = await withRetry(() => ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Generate a single or pair of emojis that best represent this Indian Music action: "${action}". 
        Examples: 
        "Pranaam" -> "🙏🏾🪷"
        "Sitar" -> "🪕✨"
        "Wah" -> "🙌🏽✨"
        Only return the emojis.`,
    }));
    return response.text?.trim();
};

export const generateSmartAudio = async (topic: string) => {
    const ai = new GoogleGenAI({ apiKey: API_KEY });
    
    // 1. Generate Script (Semantic Understanding)
    let scriptToSpeak = topic;
    try {
        const scriptResponse: GenerateContentResponse = await withRetry(() => ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `Write a short, natural, and engaging spoken script (max 2 sentences) based on this topic: "${topic}". It is for a social media audio post about Indian Classical Music. Plain text only, no markdown.`,
        }));
        if (scriptResponse.text) {
            scriptToSpeak = scriptResponse.text;
        }
    } catch (e) {
        console.warn("Script generation failed, falling back to raw prompt", e);
    }

    // 2. Generate Audio (TTS)
    try {
        const response: GenerateContentResponse = await withRetry(() => ai.models.generateContent({
            model: "gemini-2.5-flash-preview-tts",
            contents: { parts: [{ text: scriptToSpeak }] },
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                    voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Puck' } },
                },
            },
        }));
        const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (base64Audio) {
            const pcmBytes = decode(base64Audio);
            // Convert raw PCM to valid WAV file with header
            return await pcmToWavDataUri(pcmBytes, 24000);
        }
        return null;
    } catch (e) {
        console.error("Audio Gen Error", e);
        return null;
    }
};

// --- REAL-TIME TRANSLATION (TO ENGLISH) ---

export const translateText = async (text: string, sourceLanguage: string = '') => {
    if (!text || !text.trim()) return '';
    
    const ai = new GoogleGenAI({ apiKey: API_KEY });
    
    try {
        const response: GenerateContentResponse = await withRetry(() => ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            // Specific instruction to output only the translation
            contents: `Translate this ${sourceLanguage} text to English. Output ONLY the English translation. Do not include original text. Text: "${text}"`, 
            config: {
                temperature: 0.1,
            }
        }));
        
        let translated = response.text?.trim() || '';
        
        // Safety Net: INTELLIGENTLY CLEAN DEVANAGARI
        if (/[\u0900-\u097F]/.test(translated)) {
            translated = translated.replace(/[\u0900-\u097F]/g, '').trim();
        }

        if (!translated) return null;

        return translated;
        
    } catch (e) {
        console.error("Translate Error:", e);
        return null; 
    }
};

// --- PAYMENTS AI (GURU DAKSHINA STRATEGY) ---

export const parsePaymentIntent = async (userInput: string) => {
  const ai = new GoogleGenAI({ apiKey: API_KEY });
  
  const response: GenerateContentResponse = await withRetry(() => ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Analyze this payment request: "${userInput}".
    1. Extract the amount (number). If user says 'Rupees', 'Rs', or 'Points', treat it as the numeric amount.
    2. Extract the recipient name if present.
    3. Generate a short 'reason' or 'note' based on the context (e.g. "for October class" -> "October Classes").
    
    If no amount is found, return 0.
    If no reason found, default to "Guru Dakshina".`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          amount: { type: Type.NUMBER },
          reason: { type: Type.STRING },
          recipientName: { type: Type.STRING, description: "Name of person if mentioned, else empty" }
        }
      }
    }
  }));
  
  return JSON.parse(response.text || '{}');
};

export const generateInvoiceNote = async (amount: number, type: string, userRole: 'student' | 'guru') => {
  const ai = new GoogleGenAI({ apiKey: API_KEY });
  
  const prompt = userRole === 'guru' 
    ? `Write a "Dakshina Patra" (Invoice Note) from a Music Guru to a student for ${amount} points for ${type}. It should be dignified, mentioning the value of 'Vidya' (Knowledge) and 'Sadhana' (Practice). Max 20 words.`
    : `Write a humble "Dakshina Offering" note from a student to a Guru offering ${amount} points for ${type}. Use respectful terms like 'Pranam', 'Charan Sparsh', or 'Guru Dakshina'. Max 20 words.`;

  const response: GenerateContentResponse = await withRetry(() => ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: prompt,
    config: {
        temperature: 0.7
    }
  }));
  return response.text;
};

// --- AUDIO HELPERS (LIVE API) ---

export const decode = (base64: string) => {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
};

export const encode = (bytes: Uint8Array) => {
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
};

export async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const len = Math.floor(data.byteLength / 2);
  const dataInt16 = new Int16Array(data.buffer, data.byteOffset, len);
  
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

export function createPcmBlob(data: Float32Array): { data: string; mimeType: string } {
  const l = data.length;
  const int16 = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    int16[i] = data[i] * 32768;
  }
  return {
    data: encode(new Uint8Array(int16.buffer)),
    mimeType: 'audio/pcm;rate=16000',
  };
}
