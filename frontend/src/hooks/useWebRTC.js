import { useState, useEffect, useRef, useCallback } from "react";
import { socket } from "../utils/socket";

const STUN_SERVERS = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

export const useWebRTC = (isInterviewer) => {
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [error, setError] = useState(null);

  const peerConnection = useRef(null);
  const localStreamRef = useRef(null);

  useEffect(() => {
    let isCancelled = false; // Guard against unmount race condition

    const setupMedia = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        
        // If component unmounted while waiting for permissions, stop tracks immediately
        if (isCancelled) {
          stream.getTracks().forEach(track => track.stop());
          return;
        }

        setLocalStream(stream);
        localStreamRef.current = stream;
        
        // Initialize Peer Connection
        peerConnection.current = new RTCPeerConnection(STUN_SERVERS);
        
        // Add local tracks to peer connection
        stream.getTracks().forEach((track) => {
          peerConnection.current.addTrack(track, stream);
        });

        // Listen for remote tracks
        peerConnection.current.ontrack = (event) => {
          setRemoteStream(event.streams[0]);
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
        setError("Camera/Microphone access denied. Please allow permissions in your browser.");
      }
    };

    setupMedia();

    // Handle incoming WebRTC signals
    const handleSignal = async (data) => {
      if (!peerConnection.current) return;

      try {
        const signalingState = peerConnection.current.signalingState;

        if (data.type === "offer" && !isInterviewer) {
          if (signalingState !== "stable") return; // Prevent InvalidStateError
          
          await peerConnection.current.setRemoteDescription(new RTCSessionDescription(data.offer));
          const answer = await peerConnection.current.createAnswer();
          await peerConnection.current.setLocalDescription(answer);
          socket.emit("webrtc-signal", { type: "answer", answer });
          
        } else if (data.type === "answer" && isInterviewer) {
          if (signalingState !== "have-local-offer") return; // Prevent InvalidStateError
          
          await peerConnection.current.setRemoteDescription(new RTCSessionDescription(data.answer));
          
        } else if (data.type === "peer-joined" && isInterviewer) {
          // A peer joined after us, re-send the offer
          const offer = await peerConnection.current.createOffer();
          await peerConnection.current.setLocalDescription(offer);
          socket.emit("webrtc-signal", { type: "offer", offer });
          
        } else if (data.type === "ice-candidate") {
          // Make sure we have a remote description before adding ice candidates
          if (data.candidate && peerConnection.current.remoteDescription) {
            await peerConnection.current.addIceCandidate(new RTCIceCandidate(data.candidate));
          }
        }
      } catch (err) {
        console.error("WebRTC Signaling Error:", err);
      }
    };

    socket.on("webrtc-signal", handleSignal);

    return () => {
      isCancelled = true;
      socket.off("webrtc-signal", handleSignal);
      
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => {
          track.stop();
          track.enabled = false;
        });
      }
      
      if (peerConnection.current) {
        peerConnection.current.close();
        peerConnection.current = null;
      }
    };
  }, [isInterviewer]);

  const toggleMute = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsMuted(prev => !prev);
    }
  }, []);

  const toggleVideo = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsVideoOff(prev => !prev);
    }
  }, []);

  return {
    localStream,
    remoteStream,
    isMuted,
    isVideoOff,
    toggleMute,
    toggleVideo,
    error
  };
};
