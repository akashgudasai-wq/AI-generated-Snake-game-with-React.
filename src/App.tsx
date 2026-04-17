import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, SkipForward, SkipBack, Volume2, Gamepad2, Music, RefreshCw, Trophy } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// --- Constants ---
const GRID_SIZE = 20;
const INITIAL_SPEED = 150;
const SPEED_INCREMENT = 2;

const TRACKS = [
  {
    title: "CyberPulse x7",
    artist: "Aether AI",
    url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
    color: "var(--color-neon-green)"
  },
  {
    title: "Neon Horizon",
    artist: "Synth Mind",
    url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3",
    color: "var(--color-neon-pink)"
  },
  {
    title: "Glitch Vector",
    artist: "Neural Drift",
    url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3",
    color: "var(--color-neon-cyan)"
  }
];

// --- Types ---
type Point = { x: number; y: number };
type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';

export default function App() {
  // --- Game State ---
  const [snake, setSnake] = useState<Point[]>([{ x: 10, y: 10 }]);
  const [food, setFood] = useState<Point>({ x: 5, y: 5 });
  const [direction, setDirection] = useState<Direction>('RIGHT');
  const [isGameOver, setIsGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [gameStarted, setGameStarted] = useState(false);
  const [speed, setSpeed] = useState(INITIAL_SPEED);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameLoopRef = useRef<number | null>(null);

  // --- Music State ---
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [progress, setProgress] = useState(0);

  const currentTrack = TRACKS[currentTrackIndex];

  // --- Game Logic ---
  const generateFood = useCallback((currentSnake: Point[]) => {
    let newFood: Point;
    while (true) {
      newFood = {
        x: Math.floor(Math.random() * GRID_SIZE),
        y: Math.floor(Math.random() * GRID_SIZE),
      };
      if (!currentSnake.some(segment => segment.x === newFood.x && segment.y === newFood.y)) {
        break;
      }
    }
    return newFood;
  }, []);

  const resetGame = () => {
    setSnake([{ x: 10, y: 10 }]);
    setFood({ x: 5, y: 5 });
    setDirection('RIGHT');
    setIsGameOver(false);
    setScore(0);
    setSpeed(INITIAL_SPEED);
    setGameStarted(true);
  };

  const moveSnake = useCallback(() => {
    if (isGameOver || !gameStarted) return;

    setSnake(prevSnake => {
      const head = { ...prevSnake[0] };
      
      switch (direction) {
        case 'UP': head.y -= 1; break;
        case 'DOWN': head.y += 1; break;
        case 'LEFT': head.x -= 1; break;
        case 'RIGHT': head.x += 1; break;
      }

      // Check collisions (walls)
      if (head.x < 0 || head.x >= GRID_SIZE || head.y < 0 || head.y >= GRID_SIZE) {
        setIsGameOver(true);
        setGameStarted(false);
        return prevSnake;
      }

      // Check collisions (self)
      if (prevSnake.some(segment => segment.x === head.x && segment.y === head.y)) {
        setIsGameOver(true);
        setGameStarted(false);
        return prevSnake;
      }

      const newSnake = [head, ...prevSnake];

      // Check food
      if (head.x === food.x && head.y === food.y) {
        setScore(s => s + 10);
        setSpeed(prev => Math.max(80, prev - SPEED_INCREMENT));
        setFood(generateFood(newSnake));
      } else {
        newSnake.pop();
      }

      return newSnake;
    });
  }, [direction, food, generateFood, isGameOver, gameStarted]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowUp': if (direction !== 'DOWN') setDirection('UP'); break;
        case 'ArrowDown': if (direction !== 'UP') setDirection('DOWN'); break;
        case 'ArrowLeft': if (direction !== 'RIGHT') setDirection('LEFT'); break;
        case 'ArrowRight': if (direction !== 'LEFT') setDirection('RIGHT'); break;
        case ' ': if (!gameStarted) resetGame(); break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [direction, gameStarted]);

  useEffect(() => {
    if (gameStarted && !isGameOver) {
      const intervalId = window.setInterval(moveSnake, speed);
      return () => clearInterval(intervalId);
    }
  }, [moveSnake, speed, gameStarted, isGameOver]);

  useEffect(() => {
    if (score > highScore) setHighScore(score);
  }, [score, highScore]);

  // --- Rendering Game ---
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const cellSize = canvas.width / GRID_SIZE;

    // Clear background
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw Static/Noise background in canvas occasionally
    if (Math.random() > 0.95) {
      for (let i = 0; i < 100; i++) {
        ctx.fillStyle = Math.random() > 0.5 ? '#00ffff' : '#ff00ff';
        ctx.fillRect(Math.random() * canvas.width, Math.random() * canvas.height, 2, 2);
      }
    }

    // Grid
    ctx.strokeStyle = 'rgba(0, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= GRID_SIZE; i++) {
      ctx.beginPath();
      ctx.moveTo(i * cellSize, 0); ctx.lineTo(i * cellSize, canvas.height); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i * cellSize); ctx.lineTo(canvas.width, i * cellSize); ctx.stroke();
    }

    // Draw snake
    snake.forEach((segment, index) => {
      ctx.fillStyle = index === 0 ? '#00ffff' : '#ff00ff';
      if (isGameOver) ctx.fillStyle = '#444';
      
      const x = segment.x * cellSize;
      const y = segment.y * cellSize;
      
      // Boxy, no rounding for retro feel
      ctx.fillRect(x + 1, y + 1, cellSize - 2, cellSize - 2);
      
      // Glitch tail
      if (index === snake.length - 1 && Math.random() > 0.8) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(x + Math.random()*10, y + Math.random()*10, 4, 4);
      }
    });

    // Draw food
    ctx.fillStyle = '#ffffff';
    const fx = food.x * cellSize + 2;
    const fy = food.y * cellSize + 2;
    ctx.fillRect(fx, fy, cellSize - 4, cellSize - 4);
    
    // Food glitch frame
    if (Math.random() > 0.7) {
      ctx.strokeStyle = '#00ffff';
      ctx.strokeRect(fx - 2, fy - 2, cellSize, cellSize);
    }

  }, [snake, food, isGameOver]);

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play().catch(e => console.error("SIGNAL INTERRUPTED:", e));
      }
      setIsPlaying(!isPlaying);
    }
  };

  const skipTrack = (dir: 'next' | 'prev') => {
    let nextIndex = currentTrackIndex + (dir === 'next' ? 1 : -1);
    if (nextIndex >= TRACKS.length) nextIndex = 0;
    if (nextIndex < 0) nextIndex = TRACKS.length - 1;
    setCurrentTrackIndex(nextIndex);
    setIsPlaying(true);
  };

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.src = TRACKS[currentTrackIndex].url;
      if (isPlaying) {
        audioRef.current.play().catch(() => setIsPlaying(false));
      }
    }
  }, [currentTrackIndex]);

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      const p = (audioRef.current.currentTime / audioRef.current.duration) * 100;
      setProgress(p || 0);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-glitch-black text-glitch-cyan font-pixel overflow-hidden relative selection:bg-glitch-magenta selection:text-black">
      <div className="noise-overlay" />
      <div className="scanline" />

      {/* Top Protocol Header */}
      <header className="h-[60px] px-8 flex items-center justify-between border-b-4 border-glitch-cyan bg-black z-20">
        <div className="text-3xl font-bold tracking-tighter uppercase glitch-text" data-text="NEURAL_SNAKE.EXE">
          NEURAL_SNAKE.EXE
        </div>
        
        <div className="flex gap-12">
          <div className="text-right">
            <p className="text-[10px] text-glitch-magenta uppercase tracking-widest opacity-70">RECORD_MAX</p>
            <p className="text-2xl text-glitch-magenta leading-none">
              {highScore.toString().padStart(5, '0')}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-glitch-cyan uppercase tracking-widest opacity-70">DATA_NODE_COUNT</p>
            <p className="text-2xl text-glitch-cyan leading-none">
              {score.toString().padStart(5, '0')}
            </p>
          </div>
        </div>
      </header>

      {/* System Interface */}
      <main className="flex-1 grid grid-cols-[300px_1fr] overflow-hidden">
        {/* Terminal Sidebar */}
        <aside className="border-r-4 border-glitch-cyan p-6 flex flex-col gap-8 bg-black/40 backdrop-blur-sm overflow-y-auto custom-scrollbar">
          <div>
            <h3 className="text-lg font-bold text-glitch-magenta uppercase mb-4 tracking-widest">SIGNAL_CHANNELS</h3>
            <div className="space-y-4">
              {TRACKS.map((track, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setCurrentTrackIndex(idx);
                    setIsPlaying(true);
                  }}
                  className={`w-full group text-left px-4 py-3 border-2 transition-all relative overflow-hidden ${
                    currentTrackIndex === idx 
                      ? 'bg-glitch-cyan text-black border-glitch-white' 
                      : 'bg-transparent border-glitch-cyan/30 hover:border-glitch-cyan hover:bg-glitch-cyan/10'
                  }`}
                >
                  <div className="relative z-10">
                    <h4 className="text-sm font-bold truncate leading-none mb-1">{track.title}</h4>
                    <p className="text-[10px] opacity-70 truncate">{track.artist}</p>
                  </div>
                  {currentTrackIndex === idx && (
                    <div className="absolute inset-0 bg-white/20 animate-pulse" />
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-auto p-4 border-2 border-glitch-magenta/30 bg-glitch-magenta/5">
            <h3 className="text-sm font-bold text-glitch-magenta uppercase mb-2 tracking-widest">USER_PROTOCOL</h3>
            <p className="text-xs leading-none space-y-1 opacity-80">
              <div>[W/S/A/D] : DIR_CALIBRATION</div>
              <div className="mt-1">[SPACE] : PROTOCOL_START</div>
              <div className="mt-1">[ESC] : TERMINATE_SESSION</div>
            </p>
          </div>
        </aside>

        {/* Tactical Viewport */}
        <section className="flex items-center justify-center relative overflow-hidden">
          <div className="absolute inset-0 opacity-10 pointer-events-none">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] border border-glitch-cyan/20 rounded-full animate-ping" />
          </div>

          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="relative p-2 border-4 border-glitch-cyan shadow-[10px_10px_0_var(--color-glitch-magenta)]"
          >
            <canvas 
              ref={canvasRef}
              width={480}
              height={480}
              className="max-w-full h-auto block"
            />

            <AnimatePresence>
              {(!gameStarted || isGameOver) && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 z-20 border-2 border-glitch-white/20"
                >
                  <div className="text-center">
                    {isGameOver ? (
                      <div className="animate-bounce">
                        <h1 className="text-6xl font-black text-glitch-magenta glitch-text mb-2" data-text="CORE_COLLAPSE">CORE_COLLAPSE</h1>
                        <p className="text-xl text-glitch-white mb-8">SYSTEM_HAULT: {score} UNITS_RECOVERED</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <h1 className="text-6xl font-black text-glitch-cyan glitch-text" data-text="SNAKE_OS_v4.0">SNAKE_OS_v4.0</h1>
                        <p className="text-sm tracking-[0.5em] text-glitch-magenta animate-pulse uppercase">awaiting user authorization...</p>
                      </div>
                    )}
                    
                    <button 
                      onClick={resetGame}
                      className="mt-8 px-12 py-4 bg-glitch-cyan text-black font-black uppercase text-xl border-glitch shadow-[5px_5px_0_var(--color-glitch-white)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all"
                    >
                      {isGameOver ? 'RE_INITIALIZE' : 'EXECUTE_BOOT'}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </section>
      </main>

      {/* Lower Frequency Control Bar */}
      <footer className="h-[100px] border-t-4 border-glitch-cyan grid grid-cols-[300px_1fr_300px] items-center px-8 bg-black z-20">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-glitch-magenta flex items-center justify-center text-black text-3xl font-bold border-2 border-glitch-white">
            {isPlaying ? '█' : '▒'}
          </div>
          <div className="overflow-hidden">
            <h4 className="text-lg font-bold truncate leading-none mb-1 text-glitch-cyan uppercase tracking-tighter">{currentTrack.title}</h4>
            <p className="text-xs text-glitch-magenta truncate opacity-80 uppercase tracking-widest">SOURCE: {currentTrack.artist}</p>
          </div>
        </div>

        <div className="flex flex-col items-center gap-2">
          <div className="flex items-center gap-12">
            <button onClick={() => skipTrack('prev')} className="text-glitch-cyan hover:text-glitch-magenta transition-colors">
              <span className="text-2xl">[[</span>
            </button>
            <button 
              onClick={togglePlay}
              className="w-14 h-14 border-4 border-glitch-cyan bg-transparent text-glitch-cyan hover:bg-glitch-cyan hover:text-black transition-all flex items-center justify-center"
            >
              {isPlaying ? <Pause fill="currentColor" size={24} /> : <Play fill="currentColor" size={24} className="ml-1" />}
            </button>
            <button onClick={() => skipTrack('next')} className="text-glitch-cyan hover:text-glitch-magenta transition-colors">
              <span className="text-2xl">]]</span>
            </button>
          </div>
          
          <div className="w-[500px] h-3 bg-glitch-magenta/20 border border-glitch-cyan/30 relative">
            <motion.div 
              className="h-full bg-glitch-cyan"
              animate={{ width: `${progress}%` }}
              transition={{ type: 'tween', ease: 'linear' }}
            />
            <div className="absolute inset-0 bg-transparent pointer-events-none shadow-[inset_0_0_10px_rgba(0,255,255,0.5)]" />
          </div>
        </div>

        <div className="flex items-end justify-end gap-1 h-[40px] border-2 border-glitch-cyan/10 p-2">
          {[...Array(16)].map((_, i) => (
            <motion.div
              key={i}
              className="w-[4px] bg-glitch-magenta opacity-80"
              animate={isPlaying ? {
                height: [10, 30, 15, 40, 5, 20][(i + Math.floor(Date.now()/200)) % 6]
              } : { height: 2 }}
              transition={{ duration: 0.2, repeat: Infinity, ease: 'linear' }}
            />
          ))}
        </div>
      </footer>

      <audio 
        ref={audioRef}
        onTimeUpdate={handleTimeUpdate}
        onEnded={() => skipTrack('next')}
      />

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: var(--color-glitch-cyan); }
      `}</style>
    </div>
  );
}
