import { useState } from 'react';
import { motion } from 'framer-motion';
import { Search, Sparkles, ArrowRight } from 'lucide-react';

interface SearchHeroProps {
  onSearch: (query: string) => void;
  isProcessing: boolean;
}

const suggestions = [
  'Explain Quantum Entanglement',
  'How does DNA replication work?',
  'Solve a binary search tree problem',
  'Newton\'s laws of motion with examples',
];

export default function SearchHero({ onSearch, isProcessing }: SearchHeroProps) {
  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);

  const handleSubmit = () => {
    if (query.trim()) {
      onSearch(query.trim());
    }
  };

  return (
    <div className="text-center space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <h1 className="text-2xl font-bold text-gray-900">What would you like to learn today?</h1>
        <p className="text-gray-500 text-sm mt-1">VidyaBot will generate structured notes, animations, and a virtual teacher for your topic.</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="relative max-w-2xl mx-auto"
      >
        <div className={`relative flex items-center bg-white rounded-2xl border-2 transition-all duration-300 shadow-sm ${
          isFocused ? 'border-emerald-400 shadow-lg shadow-emerald-100' : 'border-gray-200 hover:border-gray-300'
        }`}>
          {isFocused && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute inset-0 rounded-2xl bg-emerald-400/5 pointer-events-none"
            />
          )}
          <Search size={18} className="ml-4 text-gray-400 shrink-0" />
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            placeholder="e.g. 'Explain Quantum Entanglement'"
            className="flex-1 py-4 px-3 bg-transparent outline-none text-sm text-gray-800 placeholder-gray-400"
          />
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={handleSubmit}
            disabled={isProcessing || !query.trim()}
            className="m-1.5 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 disabled:bg-gray-200 disabled:text-gray-400 text-white rounded-xl text-sm font-semibold flex items-center gap-2 transition-colors shadow-sm shadow-emerald-200"
          >
            {isProcessing ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Processing
              </>
            ) : (
              <>
                <Sparkles size={14} />
                Generate
              </>
            )}
          </motion.button>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="flex flex-wrap justify-center gap-2"
      >
        {suggestions.map((s, i) => (
          <button
            key={i}
            onClick={() => { setQuery(s); }}
            className="flex items-center gap-1.5 text-xs text-gray-500 bg-white border border-gray-200 hover:border-emerald-300 hover:text-emerald-600 hover:bg-emerald-50 px-3 py-1.5 rounded-full transition-all duration-200"
          >
            <ArrowRight size={10} />
            {s}
          </button>
        ))}
      </motion.div>
    </div>
  );
}
