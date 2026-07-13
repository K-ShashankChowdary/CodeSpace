import React from 'react';
// eslint-disable-next-line no-unused-vars
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowRight, Code2, Play, Users, Zap } from 'lucide-react';

/* ─── Product Screenshot Mockup ───────────────────────────── */
const IDEMockup = () => (
  <div className="rounded-2xl overflow-hidden shadow-[0_40px_100px_rgba(0,0,0,0.8),0_0_0_1px_rgba(255,255,255,0.07)]">

    {/* Browser Chrome */}
    <div className="bg-[#1c1c1e] px-4 py-3 flex items-center gap-3 border-b border-white/[0.06]">
      <div className="flex gap-2">
        <span className="w-3 h-3 rounded-full bg-[#ff5f57]" />
        <span className="w-3 h-3 rounded-full bg-[#febc2e]" />
        <span className="w-3 h-3 rounded-full bg-[#28c840]" />
      </div>
      <div className="flex-1 max-w-sm mx-auto bg-[#2c2c2e] rounded-md px-3 py-1 text-center text-[11px] text-zinc-500 font-mono">
        codespace.app/problem/coin-change
      </div>
    </div>

    {/* App Shell */}
    <div className="bg-[#0f1117] flex flex-col">

      {/* App Top Bar */}
      <div className="flex items-center gap-3 px-5 py-3 bg-[#151720] border-b border-white/[0.06]">
        <div className="flex items-center gap-1.5 text-zinc-500 bg-white/[0.04] rounded-lg px-3 py-1.5 text-[12px]">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
          <span>Dashboard</span>
        </div>

        <div className="flex items-center gap-2.5">
          <span className="text-white font-bold text-[14px]">Coin Change</span>
          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-yellow-400/15 text-yellow-300 border border-yellow-400/20">MEDIUM</span>
          <span className="text-[11px] font-mono text-zinc-600 bg-white/[0.03] px-2 py-0.5 rounded border border-white/[0.05]">SESSION: 4C988B</span>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <div className="flex items-center gap-2 text-[12px] bg-white/[0.04] rounded-lg px-3 py-1.5 border border-white/[0.06]">
            <span className="text-zinc-500 text-[10px] uppercase tracking-wider">Status</span>
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
            <span className="text-cyan-400 font-bold">QUEUED</span>
          </div>
          <div className="text-[12px] bg-white/[0.04] rounded-lg px-3 py-1.5 text-zinc-300 border border-white/[0.06]">Copy Link</div>
          <div className="text-[12px] bg-rose-500 rounded-lg px-3 py-1.5 text-white font-bold">End Interview</div>
        </div>
      </div>

      {/* Split Layout */}
      <div className="flex h-[380px]">

        {/* LEFT — Problem Panel */}
        <div className="w-[38%] border-r border-white/[0.06] flex flex-col">
          <div className="flex border-b border-white/[0.06]">
            <button className="px-5 py-2.5 text-[12px] font-bold text-white border-b-2 border-cyan-400 tracking-wider">DESCRIPTION</button>
            <button className="px-5 py-2.5 text-[12px] text-zinc-600 tracking-wider">SUBMISSIONS</button>
          </div>

          <div className="p-5 flex flex-col gap-4 flex-1 overflow-hidden">
            <p className="text-zinc-300 text-[12px] leading-relaxed">
              You are given an integer array{' '}
              <code className="text-cyan-400 bg-cyan-400/10 px-1 rounded font-mono">`coins`</code>{' '}
              representing coins of different denominations and an integer{' '}
              <code className="text-cyan-400 bg-cyan-400/10 px-1 rounded font-mono">`amount`</code>{' '}
              representing a total amount of money.
            </p>
            <p className="text-zinc-400 text-[12px] leading-relaxed">
              Return the fewest number of coins to make up that amount. If impossible, return{' '}
              <code className="text-cyan-400 bg-cyan-400/10 px-1 rounded font-mono">`-1`</code>.
            </p>

            <div>
              <p className="text-[10px] uppercase tracking-widest text-zinc-600 mb-2">Constraints</p>
              <div className="flex gap-2 flex-wrap">
                <span className="px-2.5 py-1 rounded-md bg-white/[0.03] border border-white/[0.06] text-zinc-400 text-[11px]">Time: 2500 ms</span>
                <span className="px-2.5 py-1 rounded-md bg-white/[0.03] border border-white/[0.06] text-zinc-400 text-[11px]">Memory: 256 MB</span>
              </div>
            </div>

            <div>
              <p className="text-[10px] uppercase tracking-widest text-zinc-600 mb-2">Examples · Case 1</p>
              <div className="rounded-lg bg-black/30 border border-white/[0.05] p-3 font-mono text-[12px] leading-6">
                <div><span className="text-zinc-500">Input: </span><span className="text-zinc-300">3 1 2 5 11</span></div>
                <div><span className="text-zinc-500">Output:</span><span className="text-zinc-300"> 3</span></div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT — Editor + Console */}
        <div className="flex-1 flex flex-col">
          <div className="flex items-center justify-between px-5 py-2.5 border-b border-white/[0.06] bg-[#151720]">
            <span className="text-[11px] font-mono text-zinc-500 tracking-widest">MAIN.CPP</span>
            <div className="flex items-center gap-3">
              <span className="text-[12px] text-zinc-600">Reset</span>
              <div className="flex items-center gap-1.5 bg-white/[0.05] border border-white/[0.08] rounded-lg px-3 py-1 text-zinc-300 text-[12px] font-semibold">
                C++
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9"/></svg>
              </div>
            </div>
          </div>

          {/* Monaco Editor */}
          <div className="flex flex-1 bg-[#1a1d27] font-mono text-[13px] min-h-0">
            <div className="px-4 py-4 text-right text-zinc-600 border-r border-white/[0.04] leading-[1.9] select-none w-12 shrink-0">
              {[1,2,3,4,5,6,7].map(n => <div key={n}>{n}</div>)}
            </div>
            <div className="py-4 px-6 leading-[1.9] overflow-hidden flex-1">
              <div><span className="text-[#c586c0]">#include</span> <span className="text-[#ce9178]">&lt;bits/stdc++.h&gt;</span></div>
              <div><span className="text-[#c586c0]">using namespace</span> <span className="text-[#4ec9b0]"> std</span><span className="text-[#d4d4d4]">;</span></div>
              <div>&nbsp;</div>
              <div>
                <span className="text-[#569cd6]">int</span>
                {/* Live "You" cursor label inline */}
                <span className="relative inline-block mx-1">
                  <span className="absolute -top-5 left-0 bg-cyan-500 text-white text-[9px] px-1.5 py-0.5 rounded whitespace-nowrap font-sans font-semibold shadow-lg z-10">You</span>
                  <span className="inline-block w-[2px] h-[15px] bg-cyan-400 animate-pulse align-middle" />
                </span>
                <span className="text-[#dcdcaa]">main</span><span className="text-[#d4d4d4]">{'() {'}</span>
              </div>
              <div className="pl-6"><span className="text-[#6a9955]">{'// Write your code here'}</span></div>
              <div className="pl-6"><span className="text-[#c586c0]">return</span> <span className="text-[#b5cea8]"> 0</span><span className="text-[#d4d4d4]">;</span></div>
              <div><span className="text-[#d4d4d4]">{'}'}</span></div>
            </div>
          </div>

          {/* Console */}
          <div className="border-t border-white/[0.06] bg-[#0f1117]">
            <div className="px-5 py-2 border-b border-white/[0.05]">
              <span className="text-[10px] uppercase tracking-widest text-zinc-600 font-semibold">Console Output</span>
            </div>
            <div className="p-4 bg-[#0a0c12]">
              <div className="flex items-center gap-2 mb-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#ff5f57]" />
                <span className="w-2.5 h-2.5 rounded-full bg-[#febc2e]" />
                <span className="w-2.5 h-2.5 rounded-full bg-[#28c840]" />
                <span className="ml-1 text-[10px] uppercase tracking-widest text-zinc-600">Execution Terminal</span>
              </div>
              <div className="font-mono text-[11px] leading-[1.8]">
                <div className="text-emerald-400">09:16:23 &gt; Initiating connection to execution engine...</div>
                <div className="text-emerald-400">09:16:23 &gt; Uploading source code payload to backend server...</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Action Bar */}
      <div className="flex justify-end items-center gap-3 px-5 py-3.5 bg-[#151720] border-t border-white/[0.06]">
        <button className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#0d2d36] border border-cyan-400/30 text-cyan-300 text-[13px] font-semibold">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
          Running
        </button>
        <button className="flex items-center gap-2 px-7 py-2.5 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 text-white text-[13px] font-bold shadow-[0_0_24px_rgba(20,184,166,0.4)]">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="22 2 11 13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
          Submit
        </button>
      </div>
    </div>
  </div>
);

const HeroSection = () => {
  return (
    <section className="relative flex flex-col items-center px-6 pt-32 pb-0 overflow-hidden">
      {/* Ambient glows */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[600px] bg-cyan-500/10 rounded-full blur-[140px]" />
        <div className="absolute top-[10%] right-[-5%] w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-[120px]" />
        <div className="absolute top-[10%] left-[-5%] w-[500px] h-[500px] bg-blue-700/10 rounded-full blur-[120px]" />
      </div>

      {/* Grid overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.02]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      {/* ── Centered Hero Text ──────────────────────────── */}
      <div className="relative z-10 max-w-4xl mx-auto text-center flex flex-col items-center">

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-xs font-medium text-cyan-400 mb-8 backdrop-blur-sm"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
          Free &amp; Open Source · Built for engineers
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.1 }}
          className="text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tighter leading-[1.05] mb-6"
        >
          The interview platform{' '}
          <span className="text-gradient">built for developers</span>{' '}
          — not for pricing pages.
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.2 }}
          className="text-zinc-400 text-xl leading-relaxed mb-10 max-w-2xl"
        >
          Real-time collaborative coding, multi-language execution, and zero
          friction for candidates — all in one platform.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.3 }}
          className="flex flex-col sm:flex-row gap-3 mb-12"
        >
          <Link
            to="/auth?mode=signup"
            className="group inline-flex items-center justify-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white px-8 py-4 rounded-xl font-semibold text-base hover:from-cyan-400 hover:to-blue-500 transition-all shadow-[0_0_30px_rgba(6,182,212,0.35)] hover:shadow-[0_0_44px_rgba(6,182,212,0.55)]"
          >
            Start for Free
            <ArrowRight size={18} className="group-hover:translate-x-0.5 transition-transform" />
          </Link>
          <a
            href="https://github.com/K-ShashankChowdary/CodeSpace"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center gap-2 bg-white/[0.04] border border-white/[0.08] text-white px-8 py-4 rounded-xl font-semibold text-base hover:bg-white/[0.08] transition-all"
          >
            <Code2 size={18} />
            View Source
          </a>
        </motion.div>

        {/* Social proof */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="flex flex-wrap justify-center items-center gap-x-8 gap-y-2 text-sm text-zinc-500 mb-16"
        >
          <div className="flex items-center gap-2">
            <Users size={14} className="text-cyan-500" />
            <span>No candidate account needed</span>
          </div>
          <div className="w-px h-4 bg-white/10 hidden sm:block" />
          <div className="flex items-center gap-2">
            <Zap size={14} className="text-yellow-400" />
            <span>Sub-second execution</span>
          </div>
          <div className="w-px h-4 bg-white/10 hidden sm:block" />
          <div className="flex items-center gap-2">
            <Play size={14} className="text-emerald-400" />
            <span>5 languages supported</span>
          </div>
        </motion.div>
      </div>

      {/* ── Floating Wide IDE Mockup ─────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 60 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.45, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 w-full max-w-6xl mx-auto"
        style={{ perspective: '2000px' }}
      >
        {/* Glow under the card */}
        <div className="absolute -inset-x-4 -top-8 bottom-0 bg-gradient-to-b from-cyan-500/10 via-blue-600/5 to-transparent rounded-3xl blur-3xl pointer-events-none" />

        {/* The mockup itself — slight upward tilt for floating feel */}
        <div style={{ transform: 'rotateX(4deg)', transformOrigin: 'bottom center' }}>
          <IDEMockup />
        </div>

        {/* Fade out the bottom to blend into next section */}
        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-[#030303] to-transparent pointer-events-none" />
      </motion.div>
    </section>
  );
};

export default HeroSection;
