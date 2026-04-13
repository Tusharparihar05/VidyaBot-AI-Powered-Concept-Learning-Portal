export type Page = 'dashboard' | 'knowledge' | 'analytics' | 'settings';

export interface KnowledgeFolder {
  id: string;
  title: string;
  subject: string;
  itemCount: number;
  color: string;
  lastAccessed: string;
  icon: string;
}

export interface StudySession {
  date: string;
  minutes: number;
  topics: number;
}

export interface PipelineStage {
  id: string;
  label: string;
  icon: string;
  status: 'idle' | 'processing' | 'complete';
}
