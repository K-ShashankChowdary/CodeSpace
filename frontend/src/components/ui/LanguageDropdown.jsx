import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Check } from 'lucide-react';

const languages = [
  { id: 'cpp', name: 'C++' },
  { id: 'c', name: 'C' },
  { id: 'python', name: 'Python 3' },
  { id: 'java', name: 'Java' },
  { id: 'javascript', name: 'JavaScript' }
];

const LanguageDropdown = ({ language, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const activeLanguage = languages.find(l => l.id === language) || languages[0];

  return (
    <div className="relative" ref={dropdownRef}>
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900/80 hover:bg-zinc-800/80 border border-zinc-700/50 hover:border-zinc-600 rounded-lg text-sm font-black text-white tracking-tight transition-all outline-none min-w-[120px] justify-between group shadow-lg"
      >
        <span className="truncate">{activeLanguage.name}</span>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2, ease: "easeInOut" }}
        >
          <ChevronDown className="w-4 h-4 text-zinc-400 group-hover:text-zinc-300" />
        </motion.div>
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="absolute top-full right-0 mt-2 w-48 bg-zinc-900/95 backdrop-blur-xl border border-zinc-700/50 rounded-xl shadow-2xl overflow-hidden z-50"
          >
            <div className="max-h-60 overflow-y-auto custom-scrollbar p-1.5 flex flex-col gap-1">
              {languages.map((lang) => {
                const isActive = lang.id === language;
                
                return (
                  <motion.button
                    key={lang.id}
                    onClick={() => {
                      onChange(lang.id);
                      setIsOpen(false);
                    }}
                    className={`
                      w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-left text-sm font-bold transition-all
                      ${isActive 
                        ? 'bg-blue-500/10 text-blue-400' 
                        : 'text-zinc-300 hover:bg-zinc-800/50 hover:text-white'}
                    `}
                    whileHover={{ x: isActive ? 0 : 4 }}
                  >
                    <span>{lang.name}</span>
                    {isActive && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", stiffness: 300, damping: 20 }}
                      >
                        <Check className="w-4 h-4 text-blue-400" />
                      </motion.div>
                    )}
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default LanguageDropdown;
