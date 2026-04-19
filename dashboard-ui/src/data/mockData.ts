import { KnowledgeFolder, StudySession } from '../types';

export const knowledgeFolders: KnowledgeFolder[] = [
  { id: '1', title: 'BTech CSE', subject: 'Computer Science', itemCount: 24, color: 'mint', lastAccessed: '2h ago', icon: 'cpu' },
  { id: '2', title: 'Class 10 Physics', subject: 'Physics', itemCount: 17, color: 'blue', lastAccessed: '1d ago', icon: 'zap' },
  { id: '3', title: 'Mathematics', subject: 'Calculus & Algebra', itemCount: 31, color: 'amber', lastAccessed: '3h ago', icon: 'bar-chart-2' },
  { id: '4', title: 'Organic Chemistry', subject: 'Chemistry', itemCount: 12, color: 'rose', lastAccessed: '5d ago', icon: 'flask-conical' },
  { id: '5', title: 'World History', subject: 'Humanities', itemCount: 8, color: 'teal', lastAccessed: '1w ago', icon: 'globe' },
  { id: '6', title: 'English Literature', subject: 'Language Arts', itemCount: 15, color: 'slate', lastAccessed: '2d ago', icon: 'book-open' },
];

export const studySessions: StudySession[] = [
  { date: '2024-01-01', minutes: 45, topics: 3 },
  { date: '2024-01-02', minutes: 90, topics: 5 },
  { date: '2024-01-03', minutes: 30, topics: 2 },
  { date: '2024-01-04', minutes: 120, topics: 7 },
  { date: '2024-01-05', minutes: 60, topics: 4 },
  { date: '2024-01-06', minutes: 0, topics: 0 },
  { date: '2024-01-07', minutes: 75, topics: 5 },
];

export const recentTopics = [
  { id: '1', title: 'Quantum Entanglement', subject: 'Physics', time: '2h ago', credits: 3 },
  { id: '2', title: 'Binary Trees in DSA', subject: 'Computer Science', time: '1d ago', credits: 2 },
  { id: '3', title: 'Photosynthesis Process', subject: 'Biology', time: '3d ago', credits: 4 },
];

export const refineExamples = {
  raw: 'Explain quantum stuff and how particles do the weird thing',
  enhanced: 'Provide a comprehensive explanation of quantum entanglement, including: (1) the fundamental principles of superposition, (2) how entangled particles maintain correlated states across distances, (3) the EPR paradox and Bell\'s theorem, and (4) real-world applications in quantum computing and cryptography. Use analogies suitable for an undergraduate physics student.',
};
