import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Terminal } from 'lucide-react';
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from 'framer-motion';

const Navbar = () => {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 px-5 pt-4">
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className={`max-w-7xl mx-auto rounded-2xl flex items-center justify-between px-5 py-3 transition-all duration-300 ${
          scrolled
            ? 'bg-[#0a0a0a]/80 backdrop-blur-xl border border-white/[0.06] shadow-[0_4px_32px_rgba(0,0,0,0.5)]'
            : 'bg-transparent border border-transparent'
        }`}
      >
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center shadow-[0_0_20px_rgba(6,182,212,0.4)] group-hover:shadow-[0_0_28px_rgba(6,182,212,0.6)] transition-all duration-300">
            <Terminal size={16} className="text-white" />
          </div>
          <span className="text-[1.05rem] font-bold tracking-tight text-white group-hover:text-cyan-400 transition-colors duration-200">
            CodeSpace
          </span>
        </Link>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <Link
            to="/auth"
            className="text-sm font-medium text-zinc-400 hover:text-white transition-colors px-3 py-1.5"
          >
            Log in
          </Link>
          <Link
            to="/auth?mode=signup"
            className="text-sm font-semibold bg-white text-black px-4 py-2 rounded-lg hover:bg-zinc-100 transition-colors shadow-sm"
          >
            Get Started →
          </Link>
        </div>
      </motion.div>
    </nav>
  );
};

export default Navbar;
