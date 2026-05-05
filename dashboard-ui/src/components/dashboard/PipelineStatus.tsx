import { motion } from 'framer-motion';
import { FileText, Video, User, Check, Loader2, AlertCircle } from 'lucide-react';
import type { PipelineStatus as PipelineStatusType } from '../../hooks/useQuestion';

interface PipelineStatusProps {
  pipelines: {
    text: PipelineStatusType;
    animation: PipelineStatusType;
    video: PipelineStatusType;
  };
}

const stages = [
  { key: 'text' as const, icon: FileText, label: 'Structured Text', sublabel: 'Notes & Charts' },
  { key: 'animation' as const, icon: Video, label: 'Explainer Animation', sublabel: 'Slides & Video' },
  { key: 'video' as const, icon: User, label: 'Virtual Teacher', sublabel: 'AI Avatar' },
];

export default function PipelineStatus({ pipelines }: PipelineStatusProps) {
  return (
    <div className="flex items-center justify-center gap-2 sm:gap-4">
      {stages.map((stage, index) => {
        const Icon = stage.icon;
        const status = pipelines[stage.key];
        const isDone = status === 'done';
        const isActive = status === 'processing' || status === 'pending';
        const isFailed = status === 'failed';

        return (
          <motion.div
            key={stage.key}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="flex items-center gap-2"
          >
            <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition-all duration-500 ${
              isDone
                ? 'bg-emerald-50 border-emerald-200 text-emerald-600'
                : isFailed
                ? 'bg-red-50 border-red-200 text-red-500'
                : isActive
                ? 'bg-amber-50 border-amber-200 text-amber-600'
                : 'bg-gray-50 border-gray-200 text-gray-400'
            }`}>
              <div className="w-6 h-6 rounded-lg flex items-center justify-center">
                {isDone ? (
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
                    <Check size={14} className="text-emerald-500" />
                  </motion.div>
                ) : isFailed ? (
                  <AlertCircle size={14} className="text-red-500" />
                ) : isActive ? (
                  <Loader2 size={14} className="animate-spin text-amber-500" />
                ) : (
                  <Icon size={14} />
                )}
              </div>
              <div className="hidden sm:block">
                <p className="text-xs font-semibold leading-none">{stage.label}</p>
                <p className={`text-[10px] mt-0.5 ${status === 'idle' ? 'text-gray-400' : ''}`}>
                  {isFailed ? 'Failed' : stage.sublabel}
                </p>
              </div>
            </div>

            {index < stages.length - 1 && (
              <div className={`w-6 h-px transition-colors duration-500 ${
                isDone ? 'bg-emerald-300' : 'bg-gray-200'
              }`} />
            )}
          </motion.div>
        );
      })}
    </div>
  );
}
