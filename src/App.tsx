import React, { useState, useEffect, useRef } from 'react';
import { Timer, Flame, RefreshCcw, Play, Pause, Bell, Egg, Info, CheckCircle2, Volume2 } from 'lucide-react';

interface EggType {
  id: string;
  name: string;
  description: string;
  time: number;
  color: string;
  borderColor: string;
  textColor: string;
  yolkColor: string;
}

const EGG_TYPES: EggType[] = [
  {
    id: 'soft-2',
    name: 'ไข่ลวก (2 นาที)',
    description: 'ไข่ขาวเริ่มสุกเป็นวุ้น ไข่แดงเป็นน้ำ',
    time: 2,
    color: 'bg-yellow-50',
    borderColor: 'border-yellow-300',
    textColor: 'text-yellow-700',
    yolkColor: 'bg-yellow-300'
  },
  {
    id: 'creamy-4',
    name: 'ยางมะตูม (4 นาที)',
    description: 'ไข่ขาวสุกพอประมาณ ไข่แดงเยิ้ม',
    time: 4,
    color: 'bg-orange-50',
    borderColor: 'border-orange-300',
    textColor: 'text-orange-700',
    yolkColor: 'bg-orange-400'
  },
  {
    id: 'medium-6',
    name: 'เกือบสุก (6 นาที)',
    description: 'ไข่ขาวสุก ไข่แดงสีส้มเริ่มเซ็ตตัว',
    time: 6,
    color: 'bg-orange-100',
    borderColor: 'border-orange-400',
    textColor: 'text-orange-800',
    yolkColor: 'bg-orange-500'
  },
  {
    id: 'hard-8',
    name: 'สุกพอดี (8 นาที)',
    description: 'ไข่ขาวสุกเต็มที่ ไข่แดงสุกสีส้มสวย',
    time: 8,
    color: 'bg-amber-100',
    borderColor: 'border-amber-500',
    textColor: 'text-amber-900',
    yolkColor: 'bg-amber-600'
  },
  {
    id: 'very-hard-10',
    name: 'สุกมาก (10 นาที)',
    description: 'สุกเต็มใบทั้งขาวและแดง ไข่แดงร่วน',
    time: 10,
    color: 'bg-stone-100',
    borderColor: 'border-stone-400',
    textColor: 'text-stone-800',
    yolkColor: 'bg-stone-500'
  }
];

// --- Audio Helper ---
const playAlarm = () => {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const t = ctx.currentTime;

    // Play a pleasant "Ding-Dong" sequence
    const playNote = (freq: number, startTime: number, duration: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);
      
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.2, startTime + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
      
      osc.start(startTime);
      osc.stop(startTime + duration);
    };

    playNote(660, t, 1.0);      // Ding (E5)
    playNote(523.25, t + 0.4, 1.5); // Dong (C5)
    
    // Repeat once
    playNote(660, t + 2.0, 1.0);
    playNote(523.25, t + 2.4, 1.5);

  } catch (e) {
    console.error("Audio play failed", e);
  }
};

// --- Notification Helper ---
const requestNotificationPermission = () => {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }
};

const sendNotification = (title: string, body: string) => {
  if ('Notification' in window && Notification.permission === 'granted') {
    try {
      new Notification(title, { 
        body, 
        icon: 'https://cdn-icons-png.flaticon.com/512/2933/2933245.png', // Generic egg icon URL
        requireInteraction: true
      });
    } catch (e) {
      console.error("Notification failed", e);
    }
  }
};

// --- Bubbles Component ---
const BoilingBubbles = ({ color }: { color: string }) => {
  // Generate random bubbles
  const bubbles = Array.from({ length: 12 }).map((_, i) => ({
    id: i,
    left: `${Math.random() * 100}%`,
    size: `${Math.random() * 15 + 5}px`,
    delay: `${Math.random() * 2}s`,
    duration: `${Math.random() * 3 + 2}s`
  }));

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0 rounded-[2.5rem]">
      {bubbles.map((b) => (
        <div
          key={b.id}
          className={`absolute bottom-0 rounded-full ${color} opacity-40`}
          style={{
            left: b.left,
            width: b.size,
            height: b.size,
            animation: `rise ${b.duration} infinite ease-in`,
            animationDelay: b.delay,
          }}
        />
      ))}
    </div>
  );
};

const App = () => {
  const [selectedEgg, setSelectedEgg] = useState<EggType>(EGG_TYPES[1]);
  const [timeLeft, setTimeLeft] = useState(EGG_TYPES[1].time * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const startTimer = () => {
    if (timeLeft > 0) {
      setIsRunning(true);
      setIsFinished(false);
      
      // Request permissions
      requestNotificationPermission();
      
      // Request wake lock if supported
      if ('wakeLock' in navigator) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (navigator as any).wakeLock.request('screen').catch(() => {});
      }
    }
  };

  const pauseTimer = () => setIsRunning(false);

  const resetTimer = () => {
    setIsRunning(false);
    setIsFinished(false);
    setTimeLeft(selectedEgg.time * 60);
  };

  const handleEggSelect = (egg: EggType) => {
    setSelectedEgg(egg);
    setIsRunning(false);
    setIsFinished(false);
    setTimeLeft(egg.time * 60);
  };

  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && isRunning) {
      setIsRunning(false);
      setIsFinished(true);
      
      // 1. Play Sound
      playAlarm();
      
      // 2. Vibrate
      if (navigator.vibrate) navigator.vibrate([500, 200, 500, 200, 1000]);
      
      // 3. Send Notification
      sendNotification(
        "ต้มไข่เสร็จแล้วจ้า! 🥚", 
        `ไข่ระดับ ${selectedEgg.name} ของพี่มี่พร้อมทานแล้ว รีบเอาไปแช่น้ำเย็นเลย!`
      );

      if (timerRef.current) clearInterval(timerRef.current);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRunning, timeLeft, selectedEgg.name]);

  const totalSeconds = selectedEgg.time * 60;
  const progress = ((totalSeconds - timeLeft) / totalSeconds) * 100;

  return (
    <div className="min-h-screen bg-stone-50 text-slate-900 font-sans flex flex-col items-center safe-top safe-bottom">
      <header className="w-full max-w-md text-center py-6 px-4">
        <h1 className="text-2xl sm:text-3xl font-bold text-orange-600 flex flex-col items-center justify-center gap-1">
          <div className="flex items-center gap-2">
            <Timer className="w-6 h-6 sm:w-8 sm:h-8" />
            <span>Egg Timer</span>
          </div>
          <span className="text-lg sm:text-xl text-orange-500 font-medium flex items-center gap-1 animate-pulse">
            ของพี่มี่คนสวย 🧡
          </span>
        </h1>
        <p className="text-slate-400 text-xs sm:text-sm mt-1">ต้มไข่ให้เป๊ะ สวยเหมือนคนต้ม</p>
      </header>

      <main className="w-full max-w-md px-4 pb-12 flex-grow overflow-y-auto">
        <div className="bg-white rounded-[2.5rem] shadow-2xl shadow-stone-200 overflow-hidden border border-stone-100 transition-all duration-300 relative">
          
          {/* Timer Display Section */}
          <div className={`p-6 sm:p-10 flex flex-col items-center transition-colors duration-500 ${selectedEgg.color} relative overflow-hidden`}>
            
            {/* Feature 2: Boiling Bubbles Animation */}
            {isRunning && <BoilingBubbles color={selectedEgg.yolkColor.replace('bg-', 'bg-')} />}

            <div className="relative w-48 h-48 sm:w-56 sm:h-56 flex items-center justify-center z-10">
              <svg className="absolute w-full h-full -rotate-90">
                <circle cx="50%" cy="50%" r="45%" fill="transparent" stroke="white" strokeWidth="6" className="opacity-30" />
                <circle
                  cx="50%"
                  cy="50%"
                  r="45%"
                  fill="transparent"
                  stroke="currentColor"
                  strokeWidth="8"
                  strokeDasharray="283%"
                  strokeDashoffset={`${283 - (283 * progress) / 100}%`}
                  className={`${selectedEgg.textColor} transition-all duration-1000 ease-linear`}
                  strokeLinecap="round"
                />
              </svg>
              
              <div className="flex flex-col items-center z-10">
                  <div className={`w-20 h-24 sm:w-24 sm:h-28 rounded-full border-4 border-white bg-white relative shadow-lg flex items-center justify-center transition-transform ${isRunning ? 'scale-110' : 'scale-100'}`}>
                      <div className={`absolute bottom-3 w-12 h-12 sm:w-14 sm:h-14 rounded-full blur-md opacity-70 ${selectedEgg.yolkColor}`}></div>
                      <Egg className={`w-12 h-12 sm:w-16 sm:h-16 ${selectedEgg.textColor} opacity-20`} />
                  </div>
                  <div className="text-4xl sm:text-5xl font-mono font-black mt-3 tabular-nums drop-shadow-sm">
                      {formatTime(timeLeft)}
                  </div>
              </div>
            </div>

            <div className="mt-8 flex gap-4 w-full justify-center z-10">
              {!isRunning ? (
                <button 
                  onClick={startTimer}
                  disabled={isFinished}
                  className="flex-1 max-w-[160px] flex items-center justify-center gap-2 bg-slate-900 text-white py-4 rounded-2xl font-bold shadow-xl active:scale-90 transition-all disabled:opacity-50 touch-manipulation cursor-pointer"
                >
                  <Play className="w-5 h-5 fill-current" />
                  เริ่มต้ม
                </button>
              ) : (
                <button 
                  onClick={pauseTimer}
                  className="flex-1 max-w-[160px] flex items-center justify-center gap-2 bg-white text-slate-900 py-4 rounded-2xl font-bold shadow-md active:scale-90 transition-all border border-slate-100 touch-manipulation cursor-pointer"
                >
                  <Pause className="w-5 h-5 fill-current" />
                  พักก่อน
                </button>
              )}
              <button 
                onClick={resetTimer}
                className="w-14 h-14 sm:w-16 sm:h-16 flex items-center justify-center bg-white text-slate-500 rounded-2xl shadow-md border border-slate-100 active:rotate-180 transition-transform duration-500 touch-manipulation cursor-pointer"
              >
                <RefreshCcw className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Selection Area */}
          <div className="p-5 sm:p-6 bg-white relative z-10">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 text-slate-400 text-[10px] sm:text-xs font-bold uppercase tracking-widest">
                <Flame className="w-4 h-4" />
                เลือกระดับความสุก
                </div>
                {/* Sound Indicator */}
                <div className="flex items-center gap-1 text-orange-400 text-[10px] bg-orange-50 px-2 py-1 rounded-full">
                    <Volume2 className="w-3 h-3" />
                    <span>เปิดเสียง</span>
                </div>
            </div>
            
            <div className="grid grid-cols-1 gap-2.5">
              {EGG_TYPES.map((egg) => (
                <button
                  key={egg.id}
                  onClick={() => handleEggSelect(egg)}
                  className={`w-full p-4 rounded-2xl text-left border-2 flex items-center justify-between transition-all active:scale-[0.98] touch-manipulation cursor-pointer ${
                    selectedEgg.id === egg.id 
                      ? `${egg.borderColor} ${egg.color} shadow-inner border-2` 
                      : 'border-stone-50 hover:bg-stone-50'
                  }`}
                >
                  <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${egg.yolkColor} bg-opacity-20 shrink-0`}>
                          <div className={`w-4 h-4 rounded-full ${egg.yolkColor} shadow-sm`}></div>
                      </div>
                      <div>
                          <div className="font-bold text-sm sm:text-base text-slate-800">{egg.name}</div>
                          <div className="text-[11px] sm:text-xs text-slate-500 leading-tight">{egg.description}</div>
                      </div>
                  </div>
                  {selectedEgg.id === egg.id && (
                    <div className={`${selectedEgg.textColor} bg-white p-1 rounded-full shadow-sm`}>
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Tip Box */}
        <div className="mt-6 p-4 bg-orange-50 rounded-2xl border border-orange-100 flex gap-3 animate-pulse">
          <Info className="w-5 h-5 text-orange-500 shrink-0" />
          <p className="text-[11px] sm:text-xs text-orange-800 leading-relaxed">
            <strong>พี่มี่รู้ไหม:</strong> เมื่อนาฬิกาดัง ให้รีบตักไข่แช่น้ำแข็งทันที ไข่จะปอกง่ายและสีสวยเป๊ะที่สุดครับ 🧡
          </p>
        </div>
      </main>

      {/* Mobile-Friendly Full-Screen Completion Modal */}
      {isFinished && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-6 z-50 animate-in fade-in duration-300">
          <div className="bg-white rounded-[3rem] p-8 max-w-xs w-full text-center shadow-2xl animate-in zoom-in-95 duration-300 border-4 border-orange-400">
            <div className="w-24 h-24 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce shadow-inner">
              <Bell className="w-12 h-12" />
            </div>
            <h2 className="text-2xl font-black text-slate-900 mb-2">ต้มเสร็จแล้ว!</h2>
            <p className="text-slate-500 text-sm mb-8 leading-relaxed">
              ไข่ระดับ <span className="font-bold text-orange-600 underline decoration-2 underline-offset-4">{selectedEgg.name}</span><br/>ของพี่มี่คนสวยพร้อมทานแล้วครับ 🧡
            </p>
            <button 
              onClick={resetTimer} 
              className="w-full bg-orange-500 text-white py-4 rounded-2xl font-bold text-lg shadow-lg shadow-orange-200 active:scale-95 transition-all touch-manipulation cursor-pointer"
            >
              รับทราบค่ะ!
            </button>
          </div>
        </div>
      )}

      <footer className="w-full text-center py-6 text-slate-300 text-[10px] font-medium tracking-widest uppercase">
        &copy; 2024 Egg Timer ของพี่มี่คนสวย
      </footer>
    </div>
  );
};

export default App;

