import React, { useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { GoogleGenAI, Modality } from "@google/genai";
import { 
  BookOpen, 
  Play, 
  ArrowRight, 
  Music, 
  Mic, 
  Volume2, 
  CheckCircle, 
  Star, 
  Globe, 
  ChevronLeft,
  Sparkles,
  Award,
  MicOff
} from 'lucide-react';

// Precise Curriculum Data from provided images
const CURRICULUM = {
  units: [
    {
      id: 1,
      title: "Welcome to My School",
      vocabulary: ["Hello!", "Goodbye!", "play", "friends", "bag", "shake hands", "teacher", "board", "desk", "chair", "book", "pencil"],
      phonics: [
        { letter: "Tt", words: ["tomato", "table", "tree"] },
        { letter: "Ii", words: ["ink", "insect", "ill"] }
      ],
      languageInUse: "What's your name? My name is.... I'm ..... We are friends. Stand up. Sit down. Open your book.",
      lifeSkills: "Using simple greetings. Following classroom instructions. Describing objects and actions. Expressing oneself and making friends.",
    },
    {
      id: 2,
      title: "The Garden of Colors and Shapes",
      vocabulary: ["grass", "flower", "tree", "sky", "bird", "butterfly", "circle", "square", "triangle", "rectangle", "green", "blue", "red", "yellow"],
      phonics: [
        { letter: "Ss", words: ["sun", "star", "snake"] },
        { letter: "Aa", words: ["ant", "axe", "apple"] }
      ],
      languageInUse: "I can see.... What's this? This is a...... The grass is green. The sky is blue. The sun is yellow. The flower is red. The butterfly is flying.",
      lifeSkills: "Paying attention to surroundings. Asking and answering questions. Identifying colors and shapes.",
    },
    {
      id: 3,
      title: "I Love My Family",
      vocabulary: ["parents", "father", "mother", "sister", "brother", "grandmother", "grandfather", "Numbers 1 to 5"],
      phonics: [
        { letter: "Nn", words: ["nose", "neck", "net"] },
        { letter: "Pp", words: ["pencil", "pizza", "panda"] },
        { letter: "Hh", words: ["hat", "hair", "horse"] },
        { letter: "Dd", words: ["door", "dog", "drum"] }
      ],
      languageInUse: "Who's this? This is my.... How many....? There are 4 ....... I have 1 brother. I have 2 sisters. There is 1 butterfly. There are 3 birds. I see 5 trees.",
      lifeSkills: "Introducing family members. Asking and answering questions. Identifying numbers and their values. Counting objects and using numbers in sentences.",
    },
    {
      id: 4,
      title: "My Body and My Senses",
      vocabulary: ["head", "eyes", "ears", "nose", "mouth", "tongue", "arm(s)", "hand(s)", "leg(s)", "foot/feet", "toe(s)", "see", "hear", "smell", "taste", "touch"],
      phonics: [
        { letter: "Rr", words: ["red", "rabbit", "rocket"] },
        { letter: "Ee", words: ["egg", "elephant", "elbow"] },
        { letter: "Cc", words: ["cat", "cake", "cup"] },
        { letter: "Kk", words: ["kite", "king", "kitchen"] }
      ],
      languageInUse: "I have 1 nose. I have 1 mouth. I have 2 eyes. I have 2 ears. I can see with my eyes. I can hear with my ears. I can taste with my tongue. I can smell with my nose. I can touch with my hands.",
      lifeSkills: "Identifying and counting body parts. Self-awareness. Identifying and describing senses. Understanding body functions.",
    },
    {
      id: 5,
      title: "On the Farm",
      vocabulary: ["farm", "cow", "horse", "duck", "chicken", "milk", "cheese", "meat", "eggs", "big", "small", "Numbers 6 to 10"],
      phonics: [
        { letter: "Mm", words: ["moon", "milk", "monkey"] },
        { letter: "Gg", words: ["goat", "girl", "grapes"] },
        { letter: "Oo", words: ["octopus", "on", "ostrich"] },
        { letter: "Ff", words: ["fish", "fan", "frog"] }
      ],
      languageInUse: "The cow gives us milk, cheese and meat. The chicken gives us eggs. The cow is big. The horse is big. The duck is small. The chicken is small. How many horses can you see? I can see .... horses. Count the ducks. There are .... ducks.",
      lifeSkills: "Identifying and describing farm animals. Understanding food origins. Comparing and differentiating sizes. Identifying numbers and their values. Counting objects and using numbers in sentences.",
    },
    {
      id: 6,
      title: "Animals Around Me",
      vocabulary: ["pets", "cat", "dog", "turtle", "bird", "jungle", "lion", "tiger", "elephant", "monkey", "giraffe", "snake"],
      phonics: [
        { letter: "Bb", words: ["boy", "ball", "banana"] },
        { letter: "Ll", words: ["lamp", "leaf", "lion"] },
        { letter: "Uu", words: ["under", "up", "umbrella"] },
        { letter: "Jj", words: ["jar", "jam", "jacket"] }
      ],
      languageInUse: "Where is the...... In, on, under. The cat is under the chair. The dog is on the sofa. The bird is in the cage. The lion has 4 legs. The tiger has 4 legs. The monkey has 2 legs.",
      lifeSkills: "Identifying and describing jungle animals. Identifying domestic animals (pets). Grouping animals based on features. Introducing prepositions. Understanding position and direction.",
    }
  ]
};

const STEPS = [
  "Warm Up",
  "Vocabulary",
  "Pronunciation",
  "Phonics",
  "Song/Chant",
  "Activity",
  "Revision"
];

const TEACHING_MODES = {
  ARABIC: 'arabic',
  ENGLISH: 'english'
};

// --- Helper Functions for Audio PCM Encoding/Decoding ---
function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

function encode(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
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

function createBlob(data: Float32Array): any {
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

const App = () => {
  const [currentView, setCurrentView] = useState<'splash' | 'setup' | 'lesson'>('splash');
  const [selectedMode, setSelectedMode] = useState<string>(TEACHING_MODES.ARABIC);
  const [selectedUnit, setSelectedUnit] = useState<number>(1);
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [lessonContent, setLessonContent] = useState<string>('');
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [isMicActive, setIsMicActive] = useState(false);
  
  // Audio Refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const liveSessionRef = useRef<any>(null);
  const micStreamRef = useRef<MediaStream | null>(null);

  const stopAllAudio = () => {
    sourcesRef.current.forEach(source => {
      try { source.stop(); } catch(e) {}
    });
    sourcesRef.current.clear();
    nextStartTimeRef.current = 0;
  };

  const playTTS = async (text: string) => {
    try {
      setIsAudioPlaying(true);
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      }
      await audioContextRef.current.resume();
      
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: `You are a friendly Grade 1 teacher. Say this clearly and kindly: ${text}` }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: 'Kore' },
            },
          },
        },
      });

      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (base64Audio) {
        const audioData = decode(base64Audio);
        const buffer = await decodeAudioData(audioData, audioContextRef.current, 24000, 1);
        const source = audioContextRef.current.createBufferSource();
        source.buffer = buffer;
        source.connect(audioContextRef.current.destination);
        source.onended = () => setIsAudioPlaying(false);
        source.start();
        sourcesRef.current.add(source);
      } else {
        setIsAudioPlaying(false);
      }
    } catch (error) {
      console.error("TTS Error:", error);
      setIsAudioPlaying(false);
    }
  };

  const getSystemInstruction = () => {
    const unitData = CURRICULUM.units.find(u => u.id === selectedUnit);
    const phonicsInfo = unitData?.phonics.map(p => `Letter ${p.letter}: ${p.words.join(', ')}`).join('; ');
    
    // STRICT MODE ISOLATION
    const isArabicMode = selectedMode === TEACHING_MODES.ARABIC;

    const baseInstruction = `
      You are a Smart Virtual Teacher for Grade 1 children in Egypt.
      Curriculum: Connect 1 (Ministry of Education, Term 1).
      Current Unit: "${unitData?.title}".
      Vocabulary: ${unitData?.vocabulary.join(', ')}.
      Phonics: ${phonicsInfo}.
      Language Goal: ${unitData?.languageInUse}.
      Target Age: 6-7 years old.
      Strictly follow the Ministry of Education Grade 1 curriculum.
    `;

    const modeInstruction = isArabicMode ? `
      LANGUAGE MODE: ARABIC/BILINGUAL.
      - You are a kind Egyptian teacher named "Miss [choose name]".
      - Speak in warm, encouraging Egyptian Arabic (عامية مصرية).
      - Use Arabic to explain English words.
      - Translate every English instruction to Arabic.
      - Praise the child in Arabic: "شاطر جداً"، "ممتاز يا بطل"، "برافو عليكي".
      - NEVER speak English only. ALWAYS provide Arabic support.
    ` : `
      LANGUAGE MODE: ENGLISH ONLY IMMERSION.
      - You are a native English teacher who does NOT speak Arabic.
      - Talk only in simple, clear, slow English.
      - Use simple words and sounds.
      - NEVER USE ARABIC WORDS OR CHARACTERS in this mode.
      - If the child doesn't understand, repeat slowly or use emojis to explain.
      - Praise the child in English: "Very good!", "Amazing job!", "You are a star!".
    `;

    return baseInstruction + modeInstruction + `\nUse lots of emojis like 🍎, 🌟, 🎒, 👏. Keep sentences very short.`;
  };

  const startLiveConversation = async () => {
    if (isMicActive) {
      stopLiveConversation();
      return;
    }

    try {
      setIsMicActive(true);
      stopAllAudio();

      const aiInstance = new GoogleGenAI({ apiKey: process.env.API_KEY });

      // Ensure Output Context
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      }
      await audioContextRef.current.resume();

      // Setup Input Context
      const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({sampleRate: 16000});
      inputAudioContextRef.current = inputCtx;
      await inputCtx.resume();

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = stream;

      const sessionPromise = aiInstance.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        callbacks: {
          onopen: () => {
            console.log("Teacher is listening...");
            const source = inputCtx.createMediaStreamSource(stream);
            const scriptProcessor = inputCtx.createScriptProcessor(4096, 1, 1);
            
            scriptProcessor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const pcmBlob = createBlob(inputData);
              sessionPromise.then(session => {
                if (session) session.sendRealtimeInput({ media: pcmBlob });
              }).catch(() => {});
            };
            
            source.connect(scriptProcessor);
            scriptProcessor.connect(inputCtx.destination);
          },
          onmessage: async (message) => {
            const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (base64Audio && audioContextRef.current) {
              const audioBuffer = await decodeAudioData(decode(base64Audio), audioContextRef.current, 24000, 1);
              const source = audioContextRef.current.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(audioContextRef.current.destination);
              
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, audioContextRef.current.currentTime);
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += audioBuffer.duration;
              
              sourcesRef.current.add(source);
              source.onended = () => sourcesRef.current.delete(source);
            }

            if (message.serverContent?.interrupted) {
              stopAllAudio();
            }
          },
          onclose: () => {
            setIsMicActive(false);
          },
          onerror: (e) => {
            console.error("Live session error:", e);
            setIsMicActive(false);
          }
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } },
          },
          systemInstruction: getSystemInstruction(),
        }
      });

      liveSessionRef.current = await sessionPromise;
    } catch (err) {
      console.error("Failed to start mic:", err);
      setIsMicActive(false);
      alert("Please allow microphone access to talk to the teacher! 🎙️");
    }
  };

  const stopLiveConversation = () => {
    if (liveSessionRef.current) {
      try { liveSessionRef.current.close(); } catch(e) {}
      liveSessionRef.current = null;
    }
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach(track => track.stop());
      micStreamRef.current = null;
    }
    if (inputAudioContextRef.current) {
      try { inputAudioContextRef.current.close(); } catch(e) {}
      inputAudioContextRef.current = null;
    }
    setIsMicActive(false);
    stopAllAudio();
  };

  const generateLessonStep = async (stepIndex: number) => {
    setIsGenerating(true);
    setLessonContent(''); // CLEAR OLD CONTENT IMMEDIATELY
    const unitData = CURRICULUM.units.find(u => u.id === selectedUnit);
    const stepName = STEPS[stepIndex];
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [{ role: 'user', parts: [{ text: `Let's do the "${stepName}" part of Unit ${selectedUnit}.` }] }],
        config: {
          systemInstruction: getSystemInstruction() + `\nCurrent focus: ${stepName}. Follow the language rules strictly.`,
          temperature: 0.7,
        }
      });

      const text = response.text || "Try again! 🐝";
      setLessonContent(text);
      playTTS(text.replace(/[\uE000-\uF8FF]|\uD83C[\uDF00-\uDFFF]|\uD83D[\uDC00-\uDDFF]/g, '')); 
    } catch (error) {
      console.error("GenAI Error:", error);
      setLessonContent(selectedMode === TEACHING_MODES.ARABIC ? "أوه لا! حاول مرة تانية يا بطل! 🐝" : "Oops! Let's try again! 🐝");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleNextStep = () => {
    if (currentStep < STEPS.length - 1) {
      const next = currentStep + 1;
      setCurrentStep(next);
      generateLessonStep(next);
    } else {
      setCurrentView('setup');
      setCurrentStep(0);
    }
  };

  const startLesson = () => {
    setCurrentView('lesson');
    setCurrentStep(0);
    generateLessonStep(0);
  };

  if (currentView === 'splash') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gradient-to-b from-sky-100 to-white text-center">
        <div className="relative mb-8">
          <div className="w-48 h-48 bg-yellow-300 rounded-full flex items-center justify-center bounce shadow-xl border-8 border-white">
            <span className="text-8xl">👩‍🏫</span>
          </div>
          <div className="absolute -top-4 -right-4 w-16 h-16 bg-pink-400 rounded-full flex items-center justify-center animate-pulse">
            <Star className="text-white fill-current" />
          </div>
        </div>
        <h1 className="text-4xl font-bold text-sky-600 mb-2 varela">Primary 1 English</h1>
        <p className="text-2xl font-bold text-sky-400 mb-6 varela">تيرم - 1</p>
        
        <div className="flex flex-col gap-1 mb-10">
          <p className="text-xl text-slate-600 text-rtl font-bold">معلمة اللغة الإنجليزية الذكية</p>
          <p className="text-lg text-sky-500 text-rtl font-bold">للصف الأول الابتدائي</p>
        </div>
        
        <button 
          onClick={() => setCurrentView('setup')}
          className="bg-yellow-400 hover:bg-yellow-500 text-yellow-900 font-bold py-4 px-10 rounded-full text-xl shadow-lg transition-all flex items-center gap-3 transform active:scale-95"
        >
          Let's Learn! <ArrowRight size={24} />
        </button>
      </div>
    );
  }

  if (currentView === 'setup') {
    return (
      <div className="min-h-screen p-6 max-w-md mx-auto">
        <header className="flex items-center gap-4 mb-8">
          <button onClick={() => setCurrentView('splash')} className="p-2 bg-white rounded-full shadow-md text-sky-600">
            <ChevronLeft size={24} />
          </button>
          <h2 className="text-2xl font-bold text-sky-700 varela">Choose Lesson</h2>
        </header>

        <section className="mb-8">
          <label className="block text-sm font-bold text-slate-500 mb-3 uppercase tracking-wider">Teaching Style</label>
          <div className="grid grid-cols-2 gap-4">
            <button 
              onClick={() => { setSelectedMode(TEACHING_MODES.ARABIC); setLessonContent(''); }}
              className={`p-4 rounded-2xl flex flex-col items-center gap-2 border-4 transition-all ${selectedMode === TEACHING_MODES.ARABIC ? 'border-sky-400 bg-sky-50 shadow-inner' : 'border-white bg-white opacity-70'}`}
            >
              <div className="w-12 h-12 bg-sky-100 rounded-full flex items-center justify-center text-sky-600">
                <Globe size={24} />
              </div>
              <span className="font-bold">العربية</span>
              <span className="text-xs text-slate-400">Arabic Teacher</span>
            </button>
            <button 
              onClick={() => { setSelectedMode(TEACHING_MODES.ENGLISH); setLessonContent(''); }}
              className={`p-4 rounded-2xl flex flex-col items-center gap-2 border-4 transition-all ${selectedMode === TEACHING_MODES.ENGLISH ? 'border-pink-400 bg-pink-50 shadow-inner' : 'border-white bg-white opacity-70'}`}
            >
              <div className="w-12 h-12 bg-pink-100 rounded-full flex items-center justify-center text-pink-600">
                <Sparkles size={24} />
              </div>
              <span className="font-bold">English</span>
              <span className="text-xs text-slate-400">Native Teacher</span>
            </button>
          </div>
        </section>

        <section className="mb-8">
          <label className="block text-sm font-bold text-slate-500 mb-3 uppercase tracking-wider">Select Unit</label>
          <div className="space-y-3">
            {CURRICULUM.units.map((unit) => (
              <button 
                key={unit.id}
                onClick={() => setSelectedUnit(unit.id)}
                className={`w-full p-4 rounded-2xl flex items-center gap-4 text-left border-4 transition-all ${selectedUnit === unit.id ? 'border-yellow-400 bg-yellow-50 scale-[1.02]' : 'border-white bg-white'}`}
              >
                <div className="w-10 h-10 bg-yellow-200 rounded-lg flex items-center justify-center font-bold text-yellow-700">
                  {unit.id}
                </div>
                <div>
                  <h3 className="font-bold text-slate-700">{unit.title}</h3>
                  <p className="text-xs text-slate-400 truncate max-w-[200px]">{unit.vocabulary.slice(0, 3).join(', ')}...</p>
                </div>
                {selectedUnit === unit.id && <CheckCircle className="ml-auto text-yellow-500" size={20} />}
              </button>
            ))}
          </div>
        </section>

        <button 
          onClick={startLesson}
          className="w-full bg-sky-500 hover:bg-sky-600 text-white font-bold py-5 rounded-2xl text-xl shadow-lg transition-all flex justify-center items-center gap-3 mt-4"
        >
          Start Unit {selectedUnit} <Play fill="currentColor" size={20} />
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <div className="p-4 bg-white shadow-sm flex items-center justify-between sticky top-0 z-10">
        <button onClick={() => { stopLiveConversation(); setCurrentView('setup'); }} className="p-2 text-slate-400">
          <ChevronLeft size={24} />
        </button>
        <div className="flex flex-col items-center">
          <h3 className="font-bold text-sky-700">Unit {selectedUnit}</h3>
          <div className="flex gap-1 mt-1">
            {STEPS.map((_, idx) => (
              <div 
                key={idx} 
                className={`h-1.5 w-4 rounded-full transition-all ${idx === currentStep ? 'bg-sky-500 w-8' : idx < currentStep ? 'bg-sky-200' : 'bg-slate-100'}`} 
              />
            ))}
          </div>
        </div>
        <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center text-yellow-600 font-bold border border-yellow-200">
          {currentStep + 1}
        </div>
      </div>

      <main className="flex-1 p-6 overflow-y-auto flex flex-col pb-32">
        <div className="flex items-end gap-3 mb-6 mt-4">
          <div className={`w-12 h-12 ${selectedMode === TEACHING_MODES.ARABIC ? 'bg-sky-400' : 'bg-pink-400'} rounded-full flex-shrink-0 flex items-center justify-center text-2xl border-2 border-white shadow-md`}>
            {selectedMode === TEACHING_MODES.ARABIC ? '👩‍🏫' : '👩🏼‍🏫'}
          </div>
          <div className="teacher-bubble text-slate-700 text-lg leading-relaxed max-w-[85%]">
            {isGenerating && (
              <div className="flex gap-1 py-2">
                <div className="w-2 h-2 bg-sky-300 rounded-full animate-bounce" style={{animationDelay: '0ms'}}></div>
                <div className="w-2 h-2 bg-sky-300 rounded-full animate-bounce" style={{animationDelay: '150ms'}}></div>
                <div className="w-2 h-2 bg-sky-300 rounded-full animate-bounce" style={{animationDelay: '300ms'}}></div>
              </div>
            )}
            {!isGenerating && (
              <div className="whitespace-pre-wrap">
                {isMicActive ? (selectedMode === TEACHING_MODES.ARABIC ? "أنا أسمعك يا شاطر.. اتفضل قول!" : "I am listening! Go ahead!") : (lessonContent || "...")}
              </div>
            )}
          </div>
        </div>

        {/* Dynamic Visual Aids based on step */}
        {!isGenerating && !isMicActive && currentStep === 1 && (
          <div className="grid grid-cols-2 gap-4 mt-4 animate-in fade-in slide-in-from-bottom-4">
            {CURRICULUM.units.find(u => u.id === selectedUnit)?.vocabulary.slice(0, 8).map(word => (
              <div key={word} className="bg-white p-4 rounded-2xl shadow-sm text-center border-2 border-slate-100">
                <div className="text-4xl mb-2">
                  {word.toLowerCase().includes('hello') ? '👋' : word.toLowerCase().includes('bag') ? '🎒' : word.toLowerCase().includes('book') ? '📖' : word.toLowerCase().includes('flower') ? '🌸' : word.toLowerCase().includes('sun') ? '☀️' : '✏️'}
                </div>
                <p className="font-bold text-sky-600">{word}</p>
              </div>
            ))}
          </div>
        )}

        {isMicActive && (
          <div className="flex flex-col items-center mt-8">
            <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center border-4 border-red-500 shadow-lg shadow-red-200 animate-pulse">
              <Mic className="text-red-600" size={40} />
            </div>
            <p className="mt-4 text-red-600 font-bold varela">
              {selectedMode === TEACHING_MODES.ARABIC ? "المعلمة تسمعك الآن..." : "Teacher is listening..."}
            </p>
          </div>
        )}
      </main>

      <footer className="fixed bottom-0 left-0 right-0 p-6 bg-white border-t border-slate-100 flex items-center justify-center gap-4">
        <button 
          onClick={() => playTTS(lessonContent.replace(/[\uE000-\uF8FF]|\uD83C[\uDF00-\uDFFF]|\uD83D[\uDC00-\uDDFF]/g, ''))}
          disabled={isAudioPlaying || isGenerating || isMicActive || !lessonContent}
          className={`p-4 rounded-full shadow-md transition-all ${isAudioPlaying || isMicActive || !lessonContent ? 'bg-slate-100 text-slate-400' : 'bg-pink-100 text-pink-500 active:scale-90'}`}
        >
          <Volume2 size={32} />
        </button>

        <button 
          onClick={handleNextStep}
          disabled={isGenerating || isMicActive}
          className={`flex-1 py-4 rounded-3xl font-bold text-xl shadow-lg transition-all flex items-center justify-center gap-2 ${isGenerating || isMicActive ? 'bg-slate-200 text-slate-400' : 'bg-sky-500 text-white active:scale-95'}`}
        >
          {currentStep === STEPS.length - 1 ? "Finish Unit!" : "Next Part"} <ArrowRight size={24} />
        </button>

        <button 
          onClick={startLiveConversation}
          title={isMicActive ? "Stop Talking" : "Talk to Teacher"}
          className={`p-4 rounded-full shadow-md transition-all border-4 ${isMicActive ? 'bg-red-600 text-white border-red-300 scale-110' : 'bg-yellow-100 text-yellow-600 border-yellow-50 active:scale-90'}`}
        >
          {isMicActive ? <MicOff size={32} /> : <Mic size={32} />}
        </button>
      </footer>
    </div>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(<App />);