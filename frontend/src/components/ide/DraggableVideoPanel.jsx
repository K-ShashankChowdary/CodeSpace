import React, { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Mic, MicOff, Video, VideoOff, X, Maximize, Minimize } from "lucide-react";
import { useWebRTC } from "../../hooks/useWebRTC";

function DraggableVideoPanel({ onClose, isInterviewer }) {
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const {
    localStream,
    remoteStream,
    isMuted,
    isVideoOff,
    toggleMute,
    toggleVideo,
    error
  } = useWebRTC(isInterviewer);

  // Attach streams to video elements
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  const panelRef = useRef(null);
  useEffect(() => {
    if (isFullscreen && panelRef.current) {
      panelRef.current.style.width = "";
      panelRef.current.style.height = "";
    }
  }, [isFullscreen]);

  return (
    <motion.div
      layout
      ref={panelRef}
      drag={!isFullscreen}
      dragConstraints={{ left: -1000, right: 0, top: -100, bottom: 600 }}
      dragMomentum={false}
      initial={{ opacity: 0, scale: 0.8, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0, x: 0 }}
      exit={{ opacity: 0, scale: 0.8, y: 20 }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
      className={`z-[100] bg-[#0a0a0a] border border-zinc-800 flex flex-col ${
        isFullscreen
          ? "fixed !inset-0 !w-full !h-full !max-w-none !max-h-none rounded-none"
          : "absolute top-20 right-8 w-80 rounded-2xl shadow-2xl overflow-hidden resize"
      }`}
      style={!isFullscreen ? { minWidth: "280px", minHeight: "250px" } : {}}
    >
      {/* Header */}
      <div className={`bg-zinc-900/50 px-4 py-3 flex justify-between items-center border-b border-zinc-800 ${!isFullscreen ? "cursor-move" : ""}`}>
        <span className="text-xs font-bold text-white tracking-wide">Live Interview</span>
        <div className="flex items-center gap-3">
          <button onClick={() => setIsFullscreen(!isFullscreen)} className="text-zinc-400 hover:text-white transition hover:scale-110 active:scale-95">
            {isFullscreen ? <Minimize size={14} /> : <Maximize size={14} />}
          </button>
          <button onClick={onClose} className="text-zinc-400 hover:text-red-400 transition hover:scale-110 active:scale-95">
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Video Grid */}
      <div className="flex flex-col p-2 gap-2 bg-black flex-1 min-h-[160px] relative">
        {error ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center z-20 bg-zinc-900/90 rounded-xl border border-zinc-800">
            <VideoOff size={32} className="text-red-500 mb-3" />
            <span className="text-sm text-zinc-300 font-medium">{error}</span>
          </div>
        ) : (
          <div className="relative w-full flex-1 min-h-0 bg-zinc-900 rounded-xl overflow-hidden border border-zinc-800">
            {!remoteStream && (
              <div className="absolute inset-0 flex items-center justify-center text-xs text-zinc-500 font-medium">
                Waiting for peer...
              </div>
            )}
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="w-full h-full object-contain"
            />

            {/* Local Video (Self) */}
            <motion.div 
              layout
              className="absolute bottom-3 right-3 w-24 h-32 shadow-xl border-2 border-zinc-800 rounded-lg overflow-hidden bg-black z-10 shrink-0"
            >
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover transform -scale-x-100" 
              />
            </motion.div>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="bg-zinc-900/50 p-3 flex justify-center gap-4 border-t border-zinc-800">
        <button
          onClick={toggleMute}
          disabled={!!error}
          className={`p-3 rounded-full transition transform hover:scale-110 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${
            isMuted ? "bg-red-500/20 text-red-500 hover:bg-red-500/30" : "bg-white/10 text-white hover:bg-white/20"
          }`}
        >
          {isMuted ? <MicOff size={18} /> : <Mic size={18} />}
        </button>
        <button
          onClick={toggleVideo}
          disabled={!!error}
          className={`p-3 rounded-full transition transform hover:scale-110 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${
            isVideoOff ? "bg-red-500/20 text-red-500 hover:bg-red-500/30" : "bg-white/10 text-white hover:bg-white/20"
          }`}
        >
          {isVideoOff ? <VideoOff size={18} /> : <Video size={18} />}
        </button>
      </div>
    </motion.div>
  );
}

export default DraggableVideoPanel;
