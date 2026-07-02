import React, { useEffect, useState, useRef } from "react";
import { socket } from "../utils/socket";

// Helper to generate a consistent vibrant color based on a username
const getColorFromName = (name) => {
  if (!name) return "#3b82f6"; // default blue
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const colors = [
    "#ef4444", "#f97316", "#f59e0b", "#84cc16", "#10b981", 
    "#06b6d4", "#3b82f6", "#6366f1", "#8b5cf6", "#d946ef", "#f43f5e"
  ];
  return colors[Math.abs(hash) % colors.length];
};

export default function MultiplayerCursors({ activeRoomCode, currentUser }) {
  const [cursors, setCursors] = useState({});
  const lastUpdateRef = useRef(0);

  useEffect(() => {
    if (!activeRoomCode || !currentUser) return;

    const handleMouseMove = (e) => {
      const now = Date.now();
      // Throttle to ~50ms (20 FPS)
      if (now - lastUpdateRef.current > 50) {
        lastUpdateRef.current = now;
        
        // Convert clientX/Y to percentages to handle different screen sizes somewhat gracefully
        const xPct = (e.clientX / window.innerWidth) * 100;
        const yPct = (e.clientY / window.innerHeight) * 100;
        
        if (socket.connected) {
          socket.emit("sync-cursor", {
            roomCode: activeRoomCode,
            username: currentUser.username || currentUser.name,
            x: xPct,
            y: yPct
          });
        }
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [activeRoomCode, currentUser]);

  useEffect(() => {
    if (!activeRoomCode) return;

    const handleSyncCursor = (data) => {
      const { username, x, y } = data;
      setCursors((prev) => ({
        ...prev,
        [username]: { x, y, lastSeen: Date.now() }
      }));
    };

    // Cleanup old cursors (e.g., if someone leaves or minimizes)
    const cleanupInterval = setInterval(() => {
      const now = Date.now();
      setCursors((prev) => {
        const next = { ...prev };
        let changed = false;
        for (const [user, data] of Object.entries(next)) {
          // Remove cursor if not moved in 3 seconds
          if (now - data.lastSeen > 3000) {
            delete next[user];
            changed = true;
          }
        }
        return changed ? next : prev;
      });
    }, 1000);

    socket.on("sync-cursor", handleSyncCursor);
    return () => {
      socket.off("sync-cursor", handleSyncCursor);
      clearInterval(cleanupInterval);
    };
  }, [activeRoomCode]);

  return (
    <div className="pointer-events-none fixed inset-0 z-[100] overflow-hidden">
      {Object.entries(cursors).map(([username, pos]) => {
        const color = getColorFromName(username);
        return (
          <div
            key={username}
            className="absolute top-0 left-0 transition-all duration-75 ease-linear flex flex-col items-start drop-shadow-2xl"
            style={{
              transform: `translate(${pos.x}vw, ${pos.y}vh)`,
              filter: `drop-shadow(0 0 8px ${color}80)`
            }}
          >
            {/* Custom SVG Cursor with Inner Glow */}
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill={color}
              stroke="white"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="relative -top-[12px] -left-[12px]"
              style={{ filter: `drop-shadow(0 0 10px ${color})` }}
            >
              <path d="M4 4l16 5.333L12 12l-2.667 8L4 4z" />
            </svg>
            
            {/* Username Pill */}
            <div
              className="px-3 py-1 rounded-full text-[11px] font-black tracking-widest text-white whitespace-nowrap mt-1 ml-4 backdrop-blur-md border border-white/20 uppercase shadow-lg"
              style={{ 
                backgroundColor: `${color}E6`, // 90% opacity
                boxShadow: `0 4px 15px ${color}66`,
                textShadow: "0 1px 2px rgba(0,0,0,0.5)"
              }}
            >
              {username}
            </div>
          </div>
        );
      })}
    </div>
  );
}
