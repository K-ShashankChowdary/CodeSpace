import React from 'react';
// eslint-disable-next-line no-unused-vars
import { motion } from 'framer-motion';
import { PlusCircle, Link2, PlayCircle } from 'lucide-react';

const steps = [
  {
    num: '01',
    Icon: PlusCircle,
    title: 'Create a Session',
    desc: 'Log in, pick your problems from the bank, and generate a secure interview room in one click.',
  },
  {
    num: '02',
    Icon: Link2,
    title: 'Share the Link',
    desc: 'Send the invite URL to your candidate. They join instantly — no account, no installs.',
  },
  {
    num: '03',
    Icon: PlayCircle,
    title: 'Code Together',
    desc: "See every keystroke in real-time. Run code, switch problems, and close the room when you're done.",
  },
];

const HowItWorksSection = () => {
  return (
    <section className="py-28 px-6 relative z-10 overflow-hidden">
      {/* Background accent */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 w-[900px] h-[400px] bg-cyan-900/10 rounded-full blur-[100px]" />
      </div>
      <div className="absolute left-1/2 -translate-x-1/2 top-0 w-[600px] h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent" />

      <div className="max-w-6xl mx-auto relative z-10">
        {/* Heading */}
        <div className="text-center mb-20">
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-xs uppercase tracking-widest text-cyan-500 font-semibold mb-4"
          >
            How It Works
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.05 }}
            className="text-4xl md:text-5xl font-extrabold tracking-tighter"
          >
            Up and running in{' '}
            <span className="text-gradient">three steps.</span>
          </motion.h2>
        </div>

        {/* Steps */}
        <div className="relative grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Connector line */}
          <div className="hidden md:block absolute top-14 left-[16.66%] right-[16.66%] h-[1px] bg-gradient-to-r from-transparent via-cyan-500/25 to-transparent" />

          {steps.map((step, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: idx * 0.15 }}
              className="flex flex-col items-center text-center gap-6 group"
            >
              {/* Number circle */}
              <div className="relative">
                <div className="w-28 h-28 rounded-full bg-[#030303] border border-white/[0.08] flex flex-col items-center justify-center gap-1 z-10 relative shadow-[0_0_40px_rgba(6,182,212,0.1)] group-hover:shadow-[0_0_50px_rgba(6,182,212,0.2)] transition-shadow duration-500">
                  <step.Icon size={24} className="text-cyan-400 mb-1" />
                  <span className="text-xs font-black text-transparent bg-clip-text bg-gradient-to-b from-cyan-300 to-cyan-700 tracking-widest">
                    {step.num}
                  </span>
                </div>
                {/* Ring pulse */}
                <div className="absolute inset-0 rounded-full border border-cyan-500/20 animate-ping opacity-0 group-hover:opacity-100 scale-110 transition-opacity" />
              </div>

              <div>
                <h3 className="text-xl font-bold text-white mb-2">{step.title}</h3>
                <p className="text-zinc-400 leading-relaxed text-sm max-w-xs mx-auto">{step.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorksSection;
