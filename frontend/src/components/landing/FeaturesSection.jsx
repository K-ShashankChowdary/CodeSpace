import React from 'react';
// eslint-disable-next-line no-unused-vars
import { motion } from 'framer-motion';
import { Users, Cpu, Globe, Zap, Code, Shield, TerminalSquare, Lock } from 'lucide-react';

/* ─── Feature data ────────────────────────────────────────── */
const features = [
  {
    icon: Users,
    color: 'cyan',
    label: 'Real-time Collaboration',
    desc: 'Powered by Yjs CRDTs — both participants edit the same document simultaneously with zero conflicts.',
    size: 'large',   // spans 2 cols
  },
  {
    icon: Cpu,
    color: 'purple',
    label: 'Multi-Language Engine',
    desc: 'C, C++, Java, Python, and JavaScript run securely inside isolated Docker containers.',
    size: 'small',
  },
  {
    icon: Zap,
    color: 'yellow',
    label: 'Instant Execution',
    desc: 'Redis Pub/Sub workers deliver results in milliseconds — never keep candidates waiting.',
    size: 'small',
  },
  {
    icon: Code,
    color: 'blue',
    label: 'Custom Problem Bank',
    desc: 'Write your own problems with custom test cases — hidden ones only run on final submit.',
    size: 'small',
  },
  {
    icon: Globe,
    color: 'emerald',
    label: 'Interviewer Dashboard',
    desc: 'Manage sessions, navigate problems mid-interview, and watch live submissions.',
    size: 'small',
  },
  {
    icon: Shield,
    color: 'rose',
    label: 'Zero Friction Entry',
    desc: 'Candidates join via a single link — no account, no setup, no friction.',
    size: 'large',   // spans 2 cols
  },
];

/* ─── Color map ───────────────────────────────────────────── */
const colorMap = {
  cyan:    { icon: 'text-cyan-400',    bg: 'bg-cyan-400/10',    border: 'border-cyan-400/20',    glow: 'shadow-[0_0_25px_rgba(34,211,238,0.15)]' },
  purple:  { icon: 'text-purple-400',  bg: 'bg-purple-400/10',  border: 'border-purple-400/20',  glow: 'shadow-[0_0_25px_rgba(192,132,252,0.15)]' },
  yellow:  { icon: 'text-yellow-400',  bg: 'bg-yellow-400/10',  border: 'border-yellow-400/20',  glow: '' },
  blue:    { icon: 'text-blue-400',    bg: 'bg-blue-400/10',    border: 'border-blue-400/20',    glow: '' },
  emerald: { icon: 'text-emerald-400', bg: 'bg-emerald-400/10', border: 'border-emerald-400/20', glow: '' },
  rose:    { icon: 'text-rose-400',    bg: 'bg-rose-400/10',    border: 'border-rose-400/20',    glow: 'shadow-[0_0_25px_rgba(251,113,133,0.12)]' },
};

/* ─── Single card ─────────────────────────────────────────── */
const FeatureCard = ({ feature, idx }) => {
  const c = colorMap[feature.color];
  const Icon = feature.icon;
  const isLarge = feature.size === 'large';

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: idx * 0.07 }}
      className={`
        relative group rounded-2xl p-6 flex flex-col gap-4 cursor-default
        bg-gradient-to-br from-white/[0.03] to-transparent
        border border-white/[0.06] backdrop-blur-lg
        hover:border-white/[0.12] transition-all duration-300
        ${c.glow} hover:${c.glow}
        ${isLarge ? 'md:col-span-2' : ''}
      `}
    >
      {/* Icon bubble */}
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${c.bg} border ${c.border}`}>
        <Icon size={20} className={c.icon} />
      </div>

      <div>
        <h3 className="text-lg font-semibold text-white mb-1.5">{feature.label}</h3>
        <p className="text-zinc-400 leading-relaxed text-sm">{feature.desc}</p>
      </div>

      {/* Hover shine */}
      <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
        style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.03) 0%, transparent 60%)' }}
      />
    </motion.div>
  );
};

/* ─── Section ─────────────────────────────────────────────── */
const FeaturesSection = () => {
  return (
    <section className="py-28 px-6 relative z-10">
      {/* Section glow */}
      <div className="absolute left-1/2 -translate-x-1/2 top-0 w-[800px] h-[1px] bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent" />

      <div className="max-w-6xl mx-auto">
        {/* Heading */}
        <div className="text-center mb-16">
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-xs uppercase tracking-widest text-cyan-500 font-semibold mb-4"
          >
            Why CodeSpace
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.05 }}
            className="text-4xl md:text-5xl font-extrabold tracking-tighter mb-4"
          >
            Every tool your team needs<br />
            <span className="text-gradient">for technical screening.</span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-zinc-400 text-lg max-w-xl mx-auto"
          >
            Built from the ground up for speed, reliability, and a seamless experience for both sides of the interview.
          </motion.p>
        </div>

        {/* Bento grid: 2 rows × 4 cols */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {features.map((f, i) => (
            <FeatureCard key={i} feature={f} idx={i} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
