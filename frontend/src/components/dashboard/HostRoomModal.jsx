import React from "react";
import { Users, X, Search, Plus, Trash2 } from "lucide-react";
import Button from "../ui/Button";
import Input from "../ui/Input";

export default function HostRoomModal({
  isModalOpen,
  setIsModalOpen,
  modalSearch,
  setModalSearch,
  modalFilteredProblems,
  selectedProblems,
  toggleProblemSelection,
  handleCreateRoom,
  isCreatingRoom,
  setIsCustomModalOpen,
  handleDeleteCustomProblem
}) {
  if (!isModalOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-2xl flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-300">
      <div className="bg-[#0a0a0a] border border-white/5 rounded-[2rem] w-full max-w-4xl h-[85vh] flex flex-col shadow-[0_0_100px_rgba(0,0,0,0.8)] overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-8 duration-500">
        {/* Modal Header */}
        <div className="px-10 py-8 border-b border-white/5 flex justify-between items-center bg-linear-to-b from-white/[0.02] to-transparent">
          <div>
            <h2 className="text-2xl font-black text-white tracking-tighter flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                <Users className="w-5 h-5 text-blue-400" />
              </div>
              Create Interview Session
            </h2>
            <p className="text-[10px] text-zinc-500 mt-2 uppercase tracking-[0.2em] font-black flex items-center gap-2">
              <span className="w-1 h-1 rounded-full bg-blue-500 animate-pulse" />
              Select problems to assign
            </p>
          </div>
          <button 
            onClick={() => setIsModalOpen(false)} 
            className="text-zinc-500 hover:text-white w-12 h-12 flex items-center justify-center rounded-2xl hover:bg-white/5 transition-all active:scale-90"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* Search Area */}
        <div className="px-10 py-6 border-b border-white/5 bg-white/[0.01]">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600 group-focus-within:text-blue-500 transition-colors" />
            <Input 
              placeholder="Filter by title..." 
              value={modalSearch} 
              onChange={(e) => setModalSearch(e.target.value)} 
              className="pl-11 py-5 bg-zinc-900/10 border-white/5 focus:border-blue-500/30 text-xs rounded-2xl"
            />
          </div>
        </div>
        
        {/* Problem Selection Grid */}
        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-[#050505]">
            {modalFilteredProblems.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center opacity-30 italic">
                <Search className="w-10 h-10 mb-4" />
                <p className="text-sm font-bold uppercase tracking-widest ">No problems found</p>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <div 
                  onClick={() => setIsCustomModalOpen(true)} 
                  className="p-4 rounded-2xl cursor-pointer transition-all duration-300 relative overflow-hidden flex items-center gap-4 border bg-[#0a0a0a] border-white/5 hover:border-white/10 hover:bg-white/[0.02] group"
                >
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center border bg-zinc-900 border-zinc-800">
                    <Plus className="w-5 h-5 text-zinc-400 group-hover:text-white" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-black tracking-tight text-zinc-200 group-hover:text-white">Create Custom Problem</h3>
                    <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-0.5">Draft your own question and hidden test cases</div>
                  </div>
                </div>
                {modalFilteredProblems.map(p => (
                  <div 
                    key={p._id} 
                    onClick={() => toggleProblemSelection(p._id)} 
                    className={`p-4 rounded-2xl cursor-pointer transition-all duration-300 relative overflow-hidden flex items-center justify-between border group
                    ${selectedProblems.includes(p._id) 
                        ? 'bg-blue-500/10 border-blue-500/40 shadow-[0_0_20px_rgba(59,130,246,0.1)]' 
                        : 'bg-[#0a0a0a] border-white/5 hover:border-white/10 hover:bg-white/[0.02]'
                    }`}
                  >
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center border transition-colors ${
                        selectedProblems.includes(p._id) ? "bg-blue-500 border-blue-400" : "bg-zinc-900 border-zinc-800"
                      }`}>
                        {selectedProblems.includes(p._id) ? (
                          <span className="text-white font-bold text-sm">
                            {selectedProblems.indexOf(p._id) + 1}
                          </span>
                        ) : null}
                      </div>
                      <div className="min-w-0">
                        <h3 className={`text-sm font-black tracking-tight truncate ${selectedProblems.includes(p._id) ? "text-blue-400" : "text-zinc-200"}`}>
                          {p.title}
                        </h3>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className={`text-[7px] font-black uppercase tracking-widest ${
                            p.difficulty === "Easy" ? "text-green-500" : 
                            p.difficulty === "Medium" ? "text-yellow-500" : 
                            "text-red-500"
                          }`}>
                            {p.difficulty || "Standard"}
                          </span>
                        </div>
                      </div>
                    </div>
                    {p.isCustom && (
                      <button
                        onClick={(e) => handleDeleteCustomProblem(p._id, e)}
                        className="p-2 rounded-lg text-red-500/50 hover:text-red-500 hover:bg-red-500/10 transition-colors z-10"
                        title="Delete custom problem"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
        </div> 
        
        {/* Modal Footer */}
        <div className="px-10 py-8 border-t border-white/5 bg-linear-to-t from-white/[0.02] to-transparent flex justify-between items-center">
            <div className="flex items-center gap-6">
                <div className="flex flex-col">
                  <div className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Selection</div>
                  <div className="flex items-center gap-2 mt-1">
                    {selectedProblems.length > 0 ? (
                      <span className="text-xl font-black text-blue-400 animate-in slide-in-from-bottom-2 duration-300">
                        {selectedProblems.length} <span className="text-xs uppercase tracking-widest text-zinc-400 ml-1">Problems Selected</span>
                      </span>
                    ) : (
                      <span className="text-sm font-bold text-zinc-700 italic">No selection</span>
                    )}
                  </div>
                </div>
            </div>
            <div className="flex gap-4">
              <Button variant="ghost" onClick={() => setIsModalOpen(false)}>Maybe Later</Button>
              <Button 
                variant="primary" 
                onClick={handleCreateRoom} 
                disabled={selectedProblems.length === 0 || isCreatingRoom}
                className="h-14 px-10 rounded-2xl shadow-[0_20px_40px_rgba(59,130,246,0.2)]"
              >
                {isCreatingRoom ? "Initializing Room..." : "Launch Interview Room"}
              </Button>
            </div>
        </div>
      </div>
    </div>
  );
}
