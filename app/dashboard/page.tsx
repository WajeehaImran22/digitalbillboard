'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { adAPI, mediaAPI, profileAPI, videoAPI, syncTokenFromUrl, logout } from '@/lib/api';
import { 
  Zap, 
  Play, 
  Image as ImageIcon, 
  Upload, 
  History, 
  Monitor, 
  LogOut, 
  Maximize,
  Settings 
} from 'lucide-react';

export default function Dashboard() {
  const router = useRouter();
  const [prompt, setPrompt] = useState('');
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<'image' | 'video' | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [statusText, setStatusText] = useState('');
  const [userName, setUserName] = useState('');
  const [history, setHistory] = useState<any[]>([]);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  
  // State to handle errors gracefully without alerts
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    // 1. THE TOKEN CATCHER
    // Use the centralized sync function from api.ts to grab the token from the Google redirect
    syncTokenFromUrl();

    // 2. Now that the token is safely stored, load the session data
    loadInitialData();
  }, [router]);

  const loadInitialData = async () => {
    try {
      const user = await profileAPI.getMe();
      setUserName(user.full_name || 'OPERATOR_01');
      
      const adHistory = await profileAPI.getHistory();
      setHistory(adHistory);
      
      setIsCheckingAuth(false);
    } catch (err) {
      // If unauthorized (or token missing/invalid), redirect to login
      router.push('/auth');
    }
  };

  const generateMedia = async (type: 'image' | 'video') => {
    setErrorMessage(null); 
    if (!prompt) return setErrorMessage('Input Required: Please enter an ad description.');
    
    setIsLoading(true);
    setMediaUrl(null);
    setMediaType(type);
    setStatusText('INITIALIZING_LLM_ENHANCEMENT...');

    try {
      if (type === 'image') {
        const adData = await adAPI.enhanceImagePrompt(prompt);
        if (adData.status === 'rejected') throw new Error(adData.message);
        
        setStatusText('GENERATING_STILL_FRAME...');
        const blob = await mediaAPI.generateImage({
          prompt: adData.enhanced_prompt,
          time_of_day: adData.time_of_day,
          weather_condition: adData.weather_condition
        });
        setMediaUrl(URL.createObjectURL(blob));
      } else {
        const adData = await adAPI.enhanceVideoPrompt(prompt);
        if (adData.status === 'rejected') throw new Error(adData.message);
        
        setStatusText('STITCHING_VEO_SEQUENCE...');
        const videoData = await mediaAPI.generateVideoSequence({
          prompts: adData.enhanced_prompts,
          time_of_day: adData.time_of_day,
          weather_condition: adData.weather_condition
        });
        setMediaUrl(videoData.video_url);
      }
      
      const updatedHistory = await profileAPI.getHistory();
      setHistory(updatedHistory);
      
    } catch (error: any) {
      setErrorMessage(error.message || "An unexpected error occurred during generation.");
      setMediaType(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMessage(null);
    setIsLoading(true);
    setStatusText('EXECUTING_VISION_GUARD_MODERATION...');
    
    try {
      const res = await videoAPI.upload(file);
      if (res.status === 'approved') {
        setMediaUrl(res.url);
        setMediaType('video');
        const updatedHistory = await profileAPI.getHistory();
        setHistory(updatedHistory);
      } else {
        setErrorMessage(`UPLOAD REJECTED: ${res.message}`);
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Upload failed due to a system error.");
    } finally {
      setIsLoading(false);
      e.target.value = ''; // Reset input
    }
  };

  const handleLogout = () => {
    logout();
    router.push('/auth');
  };

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center text-white font-mono text-center">
        <div className="w-16 h-1 bg-white animate-pulse mb-6"></div>
        <p className="text-[10px] tracking-[0.4em] uppercase opacity-50">Syncing_Neural_Interface...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-black font-sans selection:bg-black selection:text-white">
      
      {/* HEADER: Technical Navigation */}
      <nav className="border-b border-black p-6 flex justify-between items-center bg-white/80 backdrop-blur-md sticky top-0 z-40">
        <div className="flex items-center gap-4">
          <div className="w-8 h-8 bg-black rounded-full flex items-center justify-center">
            <div className="w-2 h-2 bg-white rounded-full"></div>
          </div>
          <span className="text-xs font-black uppercase tracking-[0.3em]">{userName} // TERMINAL_SESSION</span>
        </div>
        <div className="flex items-center gap-6">
          <Link href="/profile" className="text-[10px] font-bold text-zinc-400 hover:text-black transition uppercase tracking-widest flex items-center gap-2">
            <Settings className="w-4 h-4" /> Config
          </Link>
          <Link href="/billboard" target="_blank" className="text-[10px] font-bold border border-black px-4 py-2 hover:bg-black hover:text-white transition uppercase tracking-widest">Open Billboard</Link>
          <button onClick={handleLogout} className="text-zinc-400 hover:text-black transition"><LogOut className="w-5 h-5" /></button>
        </div>
      </nav>

      <main className="max-w-[1600px] mx-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        
        {/* LEFT: COMMAND INPUT */}
        <div className="lg:col-span-4 flex flex-col">
          <div className="bg-black text-white p-8 rounded-[2rem] shadow-2xl flex flex-col h-full">
            <div className="flex items-center justify-between mb-8 opacity-40">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 fill-current" />
                <span className="text-[10px] font-mono uppercase tracking-[0.2em]">Prompt_Entry_Module</span>
              </div>
            </div>

            {errorMessage && (
              <div className="mb-6 p-4 border border-red-500/50 bg-red-500/10 rounded-xl relative overflow-hidden group">
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-500"></div>
                <p className="text-red-400 text-[10px] font-mono uppercase tracking-widest leading-relaxed ml-2">
                  [SYSTEM_NOTICE]: {errorMessage}
                </p>
              </div>
            )}
            
            <textarea 
              placeholder="Input ad description..." 
              value={prompt} onChange={e => setPrompt(e.target.value)}
              className="w-full bg-transparent border-b border-zinc-800 p-0 pb-6 h-40 mb-10 resize-none focus:border-white outline-none text-2xl font-bold placeholder:text-zinc-800 transition-colors rounded-none"
              disabled={isLoading}
            />
            
            <div className="grid grid-cols-1 gap-3 mt-auto">
              <button onClick={() => generateMedia('image')} disabled={isLoading} className="flex items-center justify-between border border-white p-5 hover:bg-white hover:text-black transition uppercase font-black text-xs tracking-[0.2em] group disabled:opacity-50 disabled:cursor-not-allowed">
                Generate Image <ImageIcon className="w-4 h-4" />
              </button>
              <button onClick={() => generateMedia('video')} disabled={isLoading} className="flex items-center justify-between border border-white p-5 hover:bg-white hover:text-black transition uppercase font-black text-xs tracking-[0.2em] group disabled:opacity-50 disabled:cursor-not-allowed">
                Generate Video <Play className="w-4 h-4" />
              </button>
              
              <div className="relative py-4">
                 <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-zinc-800"></div></div>
                 <div className="relative flex justify-center text-[9px] uppercase tracking-[0.3em] text-zinc-600"><span className="px-3 bg-black">EXT_INPUT_INTERFACE</span></div>
              </div>

              <label className={`flex items-center justify-between border border-zinc-700 p-5 uppercase font-black text-xs tracking-[0.2em] group transition ${isLoading ? 'opacity-50 cursor-not-allowed' : 'hover:border-white cursor-pointer'}`}>
                <span className="group-hover:translate-x-1 transition-transform">Upload Video</span>
                <Upload className="w-4 h-4" />
                <input type="file" className="hidden" accept="video/*" onChange={handleFileUpload} disabled={isLoading} />
              </label>
            </div>
          </div>
        </div>

        {/* RIGHT: LIVE MONITOR */}
        <div className="lg:col-span-8 flex flex-col bg-zinc-100 rounded-[2rem] border border-black/5 p-8 relative overflow-hidden h-full">
          <div className="flex justify-between items-center mb-8">
            <div className="flex items-center gap-3">
              <div className={`w-2.5 h-2.5 rounded-full shadow-[0_0_10px_rgba(0,0,0,0.2)] ${errorMessage ? 'bg-red-500 animate-pulse' : 'bg-black animate-pulse'}`}></div>
              <h2 className="text-xs font-black uppercase tracking-[0.2em]">Live_Signal_Monitor</h2>
            </div>
            {mediaUrl && <button className="text-zinc-400 hover:text-black transition"><Maximize className="w-4 h-4" /></button>}
          </div>

          <div className="flex-grow bg-black rounded-[1.5rem] overflow-hidden shadow-2xl flex items-center justify-center relative min-h-[500px]">
            {isLoading ? (
              <div className="text-center text-white font-mono space-y-6">
                <div className="w-24 h-0.5 bg-zinc-900 mx-auto relative overflow-hidden">
                  <div className="absolute inset-0 bg-white translate-x-[-100%] animate-[shimmer_2s_infinite]"></div>
                </div>
                <p className="text-[10px] uppercase tracking-[0.4em] opacity-70">{statusText}</p>
              </div>
            ) : mediaUrl ? (
              mediaType === 'image' ? (
                <img src={mediaUrl} className="w-full h-full object-contain" />
              ) : (
                <video src={mediaUrl} controls autoPlay loop className="w-full h-full object-contain" />
              )
            ) : (
              <div className="text-center opacity-10">
                <Monitor className="w-16 h-16 text-white mx-auto mb-6" />
                <p className="text-[10px] text-white font-mono uppercase tracking-[0.5em]">System_Idle // Waiting_for_Command</p>
              </div>
            )}
          </div>
        </div>

        {/* BOTTOM: HISTORICAL ARCHIVE */}
        <div className="lg:col-span-12 pt-16">
          <div className="flex items-center gap-6 mb-12">
            <div className="p-3 bg-black rounded-full">
               <History className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-3xl font-black uppercase tracking-tighter">System_Archive</h2>
            <div className="h-px bg-zinc-200 flex-grow"></div>
          </div>

          {history.length === 0 ? (
            <div className="py-20 text-center border-2 border-dashed border-zinc-200 rounded-[2rem]">
              <p className="text-zinc-400 font-mono text-[10px] uppercase tracking-widest">No_History_Found_In_Node</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px bg-black border border-black shadow-2xl">
              {history.map((ad) => (
                <div key={ad.id} className="bg-white p-6 group hover:bg-zinc-50 transition-all flex flex-col">
                  <div className="aspect-video bg-black mb-6 relative overflow-hidden rounded-lg">
                    {ad.media_type === 'video' ? (
                      <video 
                        src={ad.url} 
                        muted 
                        className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700" 
                        onMouseOver={e => e.currentTarget.play()} 
                        onMouseOut={e => {e.currentTarget.pause(); e.currentTarget.currentTime = 0;}} 
                      />
                    ) : (
                      <img src={ad.url} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700" />
                    )}
                    <div className="absolute top-3 right-3 flex gap-1.5">
                      <div className="bg-black/80 backdrop-blur-md text-white text-[8px] px-2.5 py-1.5 uppercase font-black tracking-widest">{ad.time_of_day}</div>
                      <div className="bg-white/80 backdrop-blur-md text-black text-[8px] px-2.5 py-1.5 uppercase font-black tracking-widest border border-black">{ad.weather_condition}</div>
                    </div>
                  </div>
                  <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-tight line-clamp-2 mb-4 leading-relaxed group-hover:text-black transition-colors italic">
                    "{ad.prompt}"
                  </p>
                  <div className="mt-auto flex justify-between items-center pt-6 border-t border-zinc-100">
                    <span className="text-[9px] font-mono text-zinc-400 uppercase">{new Date(ad.created_at).toLocaleDateString()}</span>
                    
                    <div className="flex gap-4">
                      <a href={ad.url} target="_blank" className="text-[10px] font-black uppercase text-zinc-400 hover:text-black transition-colors">Download</a>
                      <Link href={`/schedule/${ad.id}`} className="text-[10px] font-black uppercase text-blue-600 hover:text-black transition-colors">
                        Deploy &rarr;
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </main>

      <footer className="p-20 text-center border-t border-zinc-100 mt-20">
        <div className="max-w-xs mx-auto h-px bg-zinc-200 mb-8"></div>
        <p className="text-[10px] font-black text-zinc-300 uppercase tracking-[0.6em]">System_Active // Operator_Authenticated // 2026</p>
      </footer>
    </div>
  );
}