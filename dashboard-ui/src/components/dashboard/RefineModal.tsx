import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, ArrowRight, Wand2, Loader2 } from 'lucide-react';
import { refineQuestion } from '../../services/api';

interface RefineModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (enhanced: string) => void;
  onUseOriginal: () => void;
  rawPrompt: string;
}

export default function RefineModal({ isOpen, onClose, onConfirm, onUseOriginal, rawPrompt }: RefineModalProps) {
  const [refinedPrompt, setRefinedPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && rawPrompt) {
      setLoading(true);
      setError('');
      setRefinedPrompt('');
      refineQuestion(rawPrompt)
        .then((res) => {
          setRefinedPrompt(res.refinedPrompt);
        })
        .catch(() => {
          setError('Could not refine prompt. You can still use the original.');
        })
        .finally(() => setLoading(false));
    }
  }, [isOpen, rawPrompt]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="bg-gradient-to-r from-emerald-500 to-teal-500 px-6 py-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-white/20 rounded-xl flex items-center justify-center">
                  <Wand2 size={16} className="text-white" />
                </div>
                <div>
                  <h2 className="text-white font-bold text-base">AI Prompt Refinement</h2>
                  <p className="text-emerald-100 text-xs">
                    {loading ? 'Enhancing your query...' : 'Your query has been enhanced for better results'}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 bg-white/20 hover:bg-white/30 rounded-xl flex items-center justify-center text-white transition-colors"
              >
                <X size={15} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="space-y-2">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Before - Raw Prompt</span>
                <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4">
                  <p className="text-sm text-gray-500 italic">"{rawPrompt}"</p>
                </div>
              </div>

              <div className="flex items-center justify-center">
                <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-100 rounded-full px-4 py-1.5">
                  <Sparkles size={12} className="text-emerald-500" />
                  <span className="text-xs font-semibold text-emerald-600">AI Enhanced</span>
                  <ArrowRight size={12} className="text-emerald-500" />
                </div>
              </div>

              <div className="space-y-2">
                <span className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">After - Enhanced Prompt</span>
                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 min-h-[80px]">
                  {loading ? (
                    <div className="flex items-center gap-2 text-emerald-600">
                      <Loader2 size={14} className="animate-spin" />
                      <p className="text-sm">Refining your prompt with AI...</p>
                    </div>
                  ) : error ? (
                    <p className="text-sm text-red-500">{error}</p>
                  ) : (
                    <p className="text-sm text-gray-700 leading-relaxed">{refinedPrompt}</p>
                  )}
                </div>
              </div>
            </div>

            <div className="px-6 pb-6 flex gap-3">
              <button
                onClick={onUseOriginal}
                className="flex-1 py-3 rounded-2xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Use Original
              </button>
              <button
                onClick={() => onConfirm(refinedPrompt || rawPrompt)}
                disabled={loading}
                className="flex-1 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-300 text-white text-sm font-semibold transition-colors flex items-center justify-center gap-2 shadow-md shadow-emerald-200"
              >
                <Wand2 size={15} />
                {loading ? 'Refining...' : 'Use Enhanced Prompt'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
