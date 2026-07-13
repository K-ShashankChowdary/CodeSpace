import React from 'react';
// eslint-disable-next-line no-unused-vars
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

const CTASection = () => {
  return (
    <section className="py-28 px-6 relative z-10">
      <div className="absolute left-1/2 -translate-x-1/2 top-0 w-[600px] h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent" />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="max-w-4xl mx-auto relative"
      >
        {/* Glow background */}
        <div className="absolute -inset-px rounded-3xl bg-gradient-to-r from-cyan-500/20 via-blue-600/20 to-purple-600/20 blur-2xl pointer-events-none" />

        <div className="relative rounded-3xl bg-gradient-to-br from-white/[0.05] to-white/[0.01] border border-white/[0.08] px-8 py-16 text-center overflow-hidden">
          {/* Inner shimmer */}
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent" />

          <p className="text-xs uppercase tracking-widest text-cyan-500 font-semibold mb-5">
            Ready to Interview Smarter?
          </p>
          <h2 className="text-4xl md:text-5xl font-extrabold tracking-tighter mb-5">
            Run your next technical screen
            <br />
            <span className="text-gradient">in under a minute.</span>
          </h2>
          <p className="text-zinc-400 text-lg mb-10 max-w-xl mx-auto leading-relaxed">
            Free to use, no card required. Create your account and start your first session right now.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              to="/auth?mode=signup"
              className="group inline-flex items-center justify-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white px-8 py-4 rounded-xl font-semibold text-base hover:from-cyan-400 hover:to-blue-500 transition-all shadow-[0_0_35px_rgba(6,182,212,0.4)] hover:shadow-[0_0_50px_rgba(6,182,212,0.6)]"
            >
              Create Free Account
              <ArrowRight size={18} className="group-hover:translate-x-0.5 transition-transform" />
            </Link>
            <a
              href="https://github.com/K-ShashankChowdary/CodeSpace"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-2 bg-white/[0.04] border border-white/[0.1] text-white px-8 py-4 rounded-xl font-semibold text-base hover:bg-white/[0.08] transition-all"
            >
              Star on GitHub ★
            </a>
          </div>
        </div>
      </motion.div>
    </section>
  );
};

export default CTASection;
