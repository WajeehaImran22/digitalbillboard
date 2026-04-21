'use client';

import { useState, useEffect } from 'react';
import { Loader2, MonitorOff, Wifi, AlertCircle } from 'lucide-react';

export default function BillboardPage() {
  const [activeAds, setActiveAds] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastSync, setLastSync] = useState<string>('');

  const fetchSignal = async () => {
    try {
      const res = await fetch(`https://wajeehaaa-digitalbillboard.hf.space/videos/billboard/active`);
      if (!res.ok) throw new Error("SIGNAL_INTERRUPTED");
      const data = await res.json();
      setActiveAds(data);
      setLastSync(new Date().toLocaleTimeString());
    } catch (err) {
      console.error("Critical: Billboard Signal Lost");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSignal();
    const interval = setInterval(fetchSignal, 30000);
    return () => clearInterval(interval);
  }, []);

  if (isLoading) {
    return (
      <div className="h-screen w-screen bg-black flex flex-col items-center justify-center text-white font-mono">
        <Loader2 className="w-12 h-12 animate-spin mb-6 opacity-20" />
        <p className="text-[10px] uppercase tracking-[0.4em]">Initializing_Axiom_Display_Node...</p>
      </div>
    );
  }

  if (activeAds.length === 0) {
    return (
      <div className="h-screen w-screen bg-black flex flex-col items-center justify-center text-white font-mono">
        <MonitorOff className="w-16 h-16 mb-8 opacity-10" />
        <div className="space-y-2 text-center">
          <p className="text-[12px] uppercase tracking-[0.8em] text-zinc-500">No_Active_Transmissions</p>
          <p className="text-[8px] uppercase tracking-[0.2em] text-zinc-800 italic">Sync_Time: {lastSync}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen bg-black overflow-hidden relative">
      
      <div className="grid grid-cols-2 grid-rows-2 h-full w-full gap-1 p-1 bg-zinc-900">
        {activeAds.slice(0, 4).map((slot, index) => {
          let gridClasses = "relative bg-black overflow-hidden border border-white/5";
          
          if (slot.tier === 'premium') gridClasses += " col-span-2 row-span-2";
          else if (slot.tier === 'standard') gridClasses += " col-span-2 row-span-1";
          else gridClasses += " col-span-1 row-span-1";

          // --- SMART TYPE DETECTION ---
          const sourceUrl = slot.media_url || slot.ads?.url;
          const definedType = slot.media_type || slot.ads?.media_type;
          
          // If type is missing, check the file extension in the URL
          const isVideo = definedType === 'video' || 
                          sourceUrl?.toLowerCase().endsWith('.mp4') || 
                          sourceUrl?.toLowerCase().endsWith('.webm');

          return (
            <div key={slot.id} className={gridClasses}>
              {sourceUrl ? (
                <>
                  {isVideo ? (
                    <video 
                      src={sourceUrl} 
                      autoPlay 
                      loop 
                      muted 
                      playsInline
                      className="w-full h-full object-cover"
                      onCanPlay={(e) => (e.currentTarget as HTMLVideoElement).play()}
                    />
                  ) : (
                    <img 
                      src={sourceUrl} 
                      className="w-full h-full object-cover" 
                      alt="Transmission"
                    />
                  )}
                </>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-950 text-red-900 font-mono p-10 text-center">
                  <AlertCircle className="w-8 h-8 mb-4 opacity-50" />
                  <p className="text-[10px] uppercase tracking-[0.3em]">Signal_Missing</p>
                </div>
              )}

              {/* TECHNICAL OVERLAYS */}
              <div className="absolute top-4 left-4 flex gap-2">
                <div className="bg-black/60 backdrop-blur-md border border-white/10 px-2 py-1 text-[8px] text-white font-mono uppercase tracking-widest">
                  CHANNEL_{index + 1} // {slot.tier}
                </div>
              </div>

              <div className="absolute bottom-4 right-4 text-[7px] text-white/20 font-mono uppercase tracking-tighter text-right leading-relaxed">
                T_EXP: {new Date(slot.expires_at).toLocaleTimeString()}<br/>
                STATUS: BROADCASTING
              </div>
            </div>
          );
        })}
      </div>

      {/* HUD OVERLAY */}
      <div className="absolute top-0 left-0 w-full p-6 pointer-events-none flex justify-between items-start z-50">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center">
            <div className="w-3 h-3 bg-black rounded-full animate-pulse"></div>
          </div>
          <div className="text-white">
            <p className="text-[10px] font-black uppercase tracking-[0.4em]">Axiom_Billboard_Network</p>
            <p className="text-[8px] font-mono opacity-40 uppercase tracking-widest">Node_Alpha_77 // Broadcast_Active</p>
          </div>
        </div>
        
        <div className="flex flex-col items-end gap-1">
          <div className="flex items-center gap-2 bg-black/40 backdrop-blur-xl border border-white/10 px-3 py-1.5 rounded-full">
            <Wifi className="w-3 h-3 text-green-500" />
            <span className="text-[8px] font-black text-white uppercase tracking-widest">Link_Established</span>
          </div>
          <p className="text-[7px] font-mono text-white/30 uppercase mr-2 pt-2">Pulse_Sync: {lastSync}</p>
        </div>
      </div>

    </div>
  );
}