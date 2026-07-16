import React, { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { socket } from "../../utils/socket";
import { Mic, MicOff, Video, VideoOff, X, Maximize, Minimize } from "lucide-react";

const STUN_SERVERS = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

function DraggableVideoPanel({ onClose, isInterviewer }) {
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  const peerConnection = useRef(null);
  const localStreamRef = useRef(null);

  useEffect(() => {
    // 1. Setup Media Stream
    const setupMedia = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        setLocalStream(stream);
        localStreamRef.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
        
        // 2. Initialize Peer Connection
        peerConnection.current = new RTCPeerConnection(STUN_SERVERS);
        
        // Add local tracks to peer connection
        stream.getTracks().forEach((track) => {
          peerConnection.current.addTrack(track, stream);
        });

        // Listen for remote tracks
        peerConnection.current.ontrack = (event) => {
          setRemoteStream(event.streams[0]);
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = event.streams[0];
          }
        };

        // Send ICE candidates to peer
        peerConnection.current.onicecandidate = (event) => {
          if (event.candidate) {
            socket.emit("webrtc-signal", { type: "ice-candidate", candidate: event.candidate });
          }
        };

        // If I am the interviewer, I initiate the call (send Offer)
        if (isInterviewer) {
          const offer = await peerConnection.current.createOffer();
          await peerConnection.current.setLocalDescription(offer);
          socket.emit("webrtc-signal", { type: "offer", offer });
        }
        
        socket.emit("webrtc-signal", { type: "peer-joined" });
      } catch (err) {
        console.error("Failed to access media devices", err);
      }
    };

    setupMedia();

    // 3. Handle incoming WebRTC signals
    const handleSignal = async (data) => {
      if (!peerConnection.current) return;

      try {
        if (data.type === "offer" && !isInterviewer) {
          // Candidate receives offer, sends answer
          await peerConnection.current.setRemoteDescription(new RTCSessionDescription(data.offer));
          const answer = await peerConnection.current.createAnswer();
          await peerConnection.current.setLocalDescription(answer);
          socket.emit("webrtc-signal", { type: "answer", answer });
        } else if (data.type === "answer" && isInterviewer) {
          // Interviewer receives answer
          await peerConnection.current.setRemoteDescription(new RTCSessionDescription(data.answer));
        } else if (data.type === "peer-joined" && isInterviewer) {
          // A peer joined after us, re-send the offer
          const offer = await peerConnection.current.createOffer();
          await peerConnection.current.setLocalDescription(offer);
          socket.emit("webrtc-signal", { type: "offer", offer });
        } else if (data.type === "ice-candidate") {
          // Both receive ICE candidates
          await peerConnection.current.addIceCandidate(new RTCIceCandidate(data.candidate));
        }
      } catch (err) {
        console.error("WebRTC Signaling Error:", err);
      }
    };

    socket.on("webrtc-signal", handleSignal);

    return () => {
      socket.off("webrtc-signal", handleSignal);
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
      }
      if (peerConnection.current) {
        peerConnection.current.close();
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isInterviewer]);

  const toggleMute = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsMuted(!isMuted);
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      localStream.getVideoTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsVideoOff(!isVideoOff);
    }
  };

  return (
    <motion.div
      drag={!isFullscreen}
      dragConstraints={{ left: -1000, right: 0, top: -100, bottom: 600 }}
      dragMomentum={false}
      animate={isFullscreen ? { x: 0, y: 0 } : undefined}
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
          <button onClick={() => setIsFullscreen(!isFullscreen)} className="text-zinc-400 hover:text-white transition">
            {isFullscreen ? <Minimize size={14} /> : <Maximize size={14} />}
          </button>
          <button onClick={onClose} className="text-zinc-400 hover:text-white transition">
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Video Grid */}
      <div className="flex flex-col p-2 gap-2 bg-black flex-1 min-h-[160px]">
        {/* Remote Video Container */}
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
          <div className="absolute bottom-3 right-3 w-24 h-32 shadow-xl border-2 border-zinc-800 rounded-lg overflow-hidden bg-black z-10 shrink-0">
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover transform -scale-x-100" 
            />
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-zinc-900/50 p-3 flex justify-center gap-4 border-t border-zinc-800">
        <button
          onClick={toggleMute}
          className={`p-3 rounded-full transition ${isMuted ? "bg-red-500/20 text-red-500 hover:bg-red-500/30" : "bg-white/10 text-white hover:bg-white/20"}`}
        >
          {isMuted ? <MicOff size={18} /> : <Mic size={18} />}
        </button>
        <button
          onClick={toggleVideo}
          className={`p-3 rounded-full transition ${isVideoOff ? "bg-red-500/20 text-red-500 hover:bg-red-500/30" : "bg-white/10 text-white hover:bg-white/20"}`}
        >
          {isVideoOff ? <VideoOff size={18} /> : <Video size={18} />}
        </button>
      </div>
    </motion.div>
  );
}

export default DraggableVideoPanel;
