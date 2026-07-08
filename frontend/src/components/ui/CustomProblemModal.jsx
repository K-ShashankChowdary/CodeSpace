import React, { useState } from 'react';
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Trash2, Download } from 'lucide-react';
import Button from './Button';
import Toast from './Toast';
import api from '../../services/api';

const CustomProblemModal = ({ isOpen, onClose, onSubmit }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [difficulty, setDifficulty] = useState('Medium');
  const [testCases, setTestCases] = useState([{ input: '', output: '', isHidden: false }]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [leetcodeUrl, setLeetcodeUrl] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (message, type = "info") => {
    setToast({ message, type });
  };

  const handleLeetCodeImport = async () => {
    if (!leetcodeUrl) return;
    setIsImporting(true);
    try {
      const response = await api.post('/problems/leetcode', { url: leetcodeUrl });
      if (response.data && response.data.success) {
        const p = response.data.data;
        setTitle(p.title);
        setDescription(p.description);
        setDifficulty(p.difficulty);
        if (p.testCases && p.testCases.length > 0) {
          setTestCases(p.testCases.map(tc => ({ ...tc, isHidden: false })));
        }
        showToast("Problem imported successfully!", "success");
      }
    } catch (error) {
      console.error('Failed to import from LeetCode', error);
      showToast(error?.response?.data?.message || 'Failed to import from LeetCode', 'error');
    } finally {
      setIsImporting(false);
    }
  };

  const handleAddTestCase = () => {
    setTestCases([...testCases, { input: '', output: '', isHidden: false }]);
  };

  const handleRemoveTestCase = (index) => {
    if (testCases.length > 1) {
      setTestCases(testCases.filter((_, i) => i !== index));
    }
  };

  const handleTestCaseChange = (index, field, value) => {
    const newTestCases = [...testCases];
    newTestCases[index][field] = value;
    setTestCases(newTestCases);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title || !description || testCases.some(tc => !tc.input || !tc.output)) return;
    
    setIsSubmitting(true);
    await onSubmit({
      title,
      description,
      difficulty,
      testCases
    });
    setIsSubmitting(false);
    
    // Reset state
    setTitle('');
    setDescription('');
    setDifficulty('Medium');
    setTestCases([{ input: '', output: '', isHidden: false }]);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-2xl max-h-[90vh] bg-zinc-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
          >
            <div className="flex items-center justify-between p-6 border-b border-white/10 shrink-0">
              <h2 className="text-xl font-black text-white tracking-tight">Create Custom Problem</h2>
              <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-lg text-zinc-400 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
              <form id="custom-problem-form" onSubmit={handleSubmit} className="space-y-6">
                {/* LeetCode Import Section */}
                <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 space-y-3">
                  <label className="block text-xs font-bold text-blue-400 uppercase tracking-wider">Import from LeetCode</label>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      value={leetcodeUrl}
                      onChange={(e) => setLeetcodeUrl(e.target.value)}
                      className="flex-1 bg-black/40 border border-white/10 rounded-lg px-4 py-2 text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500/50 text-sm"
                      placeholder="https://leetcode.com/problems/two-sum/"
                    />
                    <Button type="button" variant="secondary" onClick={handleLeetCodeImport} disabled={isImporting || !leetcodeUrl}>
                      {isImporting ? "Importing..." : <><Download className="w-4 h-4 mr-2" /> Import</>}
                    </Button>
                  </div>
                  <p className="text-[10px] text-blue-400/70">
                    Instantly fills the Title, Difficulty, Description, and Test Case Inputs. 
                    <br />(Outputs will be auto-filled if they can be extracted from the description).
                  </p>
                  <div className="mt-2 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg flex items-start gap-3">
                    <span className="text-yellow-400 text-sm leading-none">⚠️</span>
                    <p className="text-[10px] text-yellow-400/90 leading-relaxed">
                      <strong className="text-yellow-400">DISCLAIMER:</strong> LeetCode does not expose hidden test cases. Only the public examples will be imported. You must add any hidden test cases manually using the button below.
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Title</label>
                    <input
                      type="text"
                      required
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-zinc-600 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all"
                      placeholder="e.g. Two Sum"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Difficulty</label>
                    <select
                      value={difficulty}
                      onChange={(e) => setDifficulty(e.target.value)}
                      className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500/50 transition-all"
                    >
                      <option value="Easy">Easy</option>
                      <option value="Medium">Medium</option>
                      <option value="Hard">Hard</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Description</label>
                    <textarea
                      required
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={4}
                      className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-zinc-600 focus:outline-none focus:border-blue-500/50 transition-all font-mono text-sm"
                      placeholder="Problem description and constraints..."
                    />
                  </div>
                </div>

                <div className="space-y-4 pt-4 border-t border-white/10">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider">Test Cases</label>
                    <Button type="button" variant="ghost" size="sm" onClick={handleAddTestCase} className="text-blue-400 hover:text-blue-300">
                      <Plus className="w-4 h-4 mr-1" /> Add Case
                    </Button>
                  </div>
                  
                  <div className="space-y-4">
                    {testCases.map((tc, index) => (
                      <div key={index} className="p-4 rounded-xl bg-black/40 border border-white/5 space-y-3 relative group">
                        {testCases.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveTestCase(index)}
                            className="absolute top-3 right-3 p-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                        <div className="grid grid-cols-2 gap-4 pr-8">
                          <div>
                            <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">Input</label>
                            <textarea
                              required
                              value={tc.input}
                              onChange={(e) => handleTestCaseChange(index, 'input', e.target.value)}
                              rows={2}
                              className="w-full bg-zinc-900 border border-white/10 rounded-lg px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-blue-500/50"
                              placeholder="Input data"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">Expected Output</label>
                            <textarea
                              required
                              value={tc.output}
                              onChange={(e) => handleTestCaseChange(index, 'output', e.target.value)}
                              rows={2}
                              className="w-full bg-zinc-900 border border-white/10 rounded-lg px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-blue-500/50"
                              placeholder="Expected output"
                            />
                          </div>
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          <input
                            type="checkbox"
                            id={`hidden-${index}`}
                            checked={tc.isHidden}
                            onChange={(e) => handleTestCaseChange(index, 'isHidden', e.target.checked)}
                            className="w-4 h-4 rounded bg-zinc-900 border-zinc-700 text-blue-500 focus:ring-blue-500/50"
                          />
                          <label htmlFor={`hidden-${index}`} className="text-xs text-zinc-400 cursor-pointer">
                            Hidden Test Case (only runs on Submit)
                          </label>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </form>
            </div>

            <div className="p-6 border-t border-white/10 shrink-0 flex justify-end gap-3 bg-zinc-900/50">
              <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" form="custom-problem-form" disabled={isSubmitting}>
                {isSubmitting ? "Creating..." : "Create Problem"}
              </Button>
            </div>

            {toast && (
              <div style={{ zIndex: 101, position: 'relative' }}>
                <Toast
                  message={toast.message}
                  type={toast.type}
                  onClose={() => setToast(null)}
                />
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default CustomProblemModal;
