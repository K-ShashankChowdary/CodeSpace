import React from "react";
// eslint-disable-next-line no-unused-vars
import { motion } from "framer-motion";
import Button from "../ui/Button";
import CountdownButton from "../ui/CountdownButton";

export default function IDEActionModals({
  showResetModal,
  setShowResetModal,
  performCodeReset,
  showEndModal,
  setShowEndModal,
  handleCloseRoom,
  showLeaveModal,
  setShowLeaveModal,
  handleLeaveRoom
}) {
  return (
    <>
      {showResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-[#0a0a0a] border border-zinc-800 p-6 rounded-2xl shadow-2xl max-w-sm w-full mx-4 relative overflow-hidden">
            <h3 className="text-lg font-black text-white mb-2">Reset Code?</h3>
            <p className="text-sm text-zinc-400 mb-6 leading-relaxed">Are you sure you want to reset your code to the default boilerplate? This action cannot be undone.</p>
            <div className="flex items-center gap-3 justify-end">
              <Button variant="ghost" onClick={() => setShowResetModal(false)}>Cancel</Button>
              <Button onClick={() => { setShowResetModal(false); performCodeReset(); }} className="bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20">Yes, Reset Code</Button>
            </div>
          </motion.div>
        </div>
      )}

      {showEndModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-[#0a0a0a] border border-zinc-800 p-6 rounded-2xl shadow-2xl max-w-sm w-full mx-4 relative overflow-hidden">
            <h3 className="text-lg font-black text-white mb-2">End Interview?</h3>
            <p className="text-sm text-zinc-400 mb-6 leading-relaxed">Are you sure you want to end this interview? This will permanently close the session.</p>
            <div className="flex items-center gap-3 justify-end">
              <Button variant="ghost" onClick={() => setShowEndModal(false)}>Cancel</Button>
              <CountdownButton duration={3} onComplete={() => { setShowEndModal(false); handleCloseRoom(); }}>Yes, End Interview</CountdownButton>
            </div>
          </motion.div>
        </div>
      )}

      {showLeaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-[#0a0a0a] border border-zinc-800 p-6 rounded-2xl shadow-2xl max-w-sm w-full mx-4 relative overflow-hidden">
            <h3 className="text-lg font-black text-white mb-2">Exit Interview?</h3>
            <p className="text-sm text-zinc-400 mb-6 leading-relaxed">Are you sure you want to leave the interview?</p>
            <div className="flex items-center gap-3 justify-end">
              <Button variant="ghost" onClick={() => setShowLeaveModal(false)}>Cancel</Button>
              <CountdownButton duration={3} onComplete={() => { setShowLeaveModal(false); handleLeaveRoom(); }}>Yes, Exit Interview</CountdownButton>
            </div>
          </motion.div>
        </div>
      )}
    </>
  );
}
