import React from 'react';
import { Terminal, Github } from 'lucide-react';
import { Link } from 'react-router-dom';

const Footer = () => {
  return (
    <footer className="border-t border-white/[0.06] bg-[#030303] relative z-10">
      <div className="max-w-7xl mx-auto px-6 py-10 flex flex-col md:flex-row items-center justify-between gap-4">

        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center">
            <Terminal size={14} className="text-white" />
          </div>
          <span className="text-base font-bold text-white tracking-tight">CodeSpace</span>
        </div>

        <p className="text-zinc-600 text-sm">
          Open-source technical interview platform — {new Date().getFullYear()}
        </p>

        <div className="flex items-center gap-5">
          <a
            href="https://github.com/K-ShashankChowdary/CodeSpace"
            target="_blank"
            rel="noreferrer"
            className="text-zinc-500 hover:text-white transition-colors"
            aria-label="GitHub"
          >
            <Github size={18} />
          </a>
          <Link
            to="/auth"
            className="text-sm font-medium text-cyan-400 hover:text-cyan-300 transition-colors"
          >
            Sign In →
          </Link>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
