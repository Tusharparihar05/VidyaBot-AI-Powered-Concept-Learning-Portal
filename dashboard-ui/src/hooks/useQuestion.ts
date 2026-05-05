import { useReducer, useCallback } from 'react';
import { submitQuestion, type QuestionResponse } from '../services/api';

export type PipelineStatus = 'idle' | 'pending' | 'processing' | 'done' | 'failed';

export interface QuestionState {
  phase: 'idle' | 'generating' | 'done' | 'error';
  rawQuestion: string;
  refinedPrompt: string;
  sessionId: string | null;
  cached: boolean;
  explanation: string;
  keyPoints: string[];
  chartData: QuestionResponse['chartData'];
  animationScript: QuestionResponse['animationScript'];
  videoScript: string;
  subjectTag: string;
  difficultyLevel: string;
  pipelines: {
    text: PipelineStatus;
    animation: PipelineStatus;
    video: PipelineStatus;
  };
  animationUrl: string | null;
  videoUrl: string | null;
  error: string | null;
}

type Action =
  | { type: 'START_GENERATE'; question: string }
  | { type: 'GENERATE_DONE'; payload: QuestionResponse }
  | { type: 'GENERATE_ERROR'; error: string }
  | { type: 'PIPELINE_UPDATE'; pipeline: 'animation' | 'video'; status: PipelineStatus; url?: string }
  | { type: 'RESET' };

const initialState: QuestionState = {
  phase: 'idle',
  rawQuestion: '',
  refinedPrompt: '',
  sessionId: null,
  cached: false,
  explanation: '',
  keyPoints: [],
  chartData: null,
  animationScript: [],
  videoScript: '',
  subjectTag: '',
  difficultyLevel: '',
  pipelines: { text: 'idle', animation: 'idle', video: 'idle' },
  animationUrl: null,
  videoUrl: null,
  error: null,
};

function reducer(state: QuestionState, action: Action): QuestionState {
  switch (action.type) {
    case 'START_GENERATE':
      return {
        ...initialState,
        phase: 'generating',
        rawQuestion: action.question,
        pipelines: { text: 'processing', animation: 'pending', video: 'pending' },
      };
    case 'GENERATE_DONE':
      return {
        ...state,
        phase: 'done',
        sessionId: action.payload.sessionId,
        cached: action.payload.cached,
        refinedPrompt: action.payload.refinedPrompt,
        explanation: action.payload.explanation,
        keyPoints: action.payload.keyPoints,
        chartData: action.payload.chartData,
        animationScript: action.payload.animationScript,
        videoScript: action.payload.videoScript,
        subjectTag: action.payload.subjectTag,
        difficultyLevel: action.payload.difficultyLevel,
        animationUrl: action.payload.animationUrl,
        videoUrl: action.payload.avatarVideoUrl,
        pipelines: {
          text: 'done',
          animation: action.payload.animationScript?.length > 0 ? 'processing' : 'idle',
          video: action.payload.videoScript ? 'processing' : 'idle',
        },
        error: null,
      };
    case 'GENERATE_ERROR':
      return {
        ...state,
        phase: 'error',
        error: action.error,
        pipelines: { text: 'failed', animation: 'failed', video: 'failed' },
      };
    case 'PIPELINE_UPDATE':
      return {
        ...state,
        pipelines: { ...state.pipelines, [action.pipeline]: action.status },
        ...(action.pipeline === 'animation' && action.url ? { animationUrl: action.url } : {}),
        ...(action.pipeline === 'video' && action.url ? { videoUrl: action.url } : {}),
      };
    case 'RESET':
      return initialState;
    default:
      return state;
  }
}

export function useQuestion() {
  const [state, dispatch] = useReducer(reducer, initialState);

  const askQuestion = useCallback(async (question: string) => {
    dispatch({ type: 'START_GENERATE', question });

    try {
      const result = await submitQuestion(question);
      dispatch({ type: 'GENERATE_DONE', payload: result });

      if (result.sessionId) {
        startSSEPolling(result.sessionId, dispatch);
      }
    } catch (err: unknown) {
      let message = 'Something went wrong';
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosErr = err as { response?: { data?: { error?: string; message?: string }; status?: number } };
        message = axiosErr.response?.data?.error
          || axiosErr.response?.data?.message
          || `Request failed (status ${axiosErr.response?.status})`;
      } else if (err instanceof Error) {
        message = err.message;
      }
      dispatch({ type: 'GENERATE_ERROR', error: message });
    }
  }, []);

  const reset = useCallback(() => dispatch({ type: 'RESET' }), []);

  return { state, askQuestion, reset };
}

function startSSEPolling(sessionId: string, dispatch: React.Dispatch<Action>) {
  const API = import.meta.env.VITE_API_URL || 'http://localhost:8000';

  const poll = async () => {
    try {
      const raw = localStorage.getItem('vidyabot-auth');
      if (!raw) return;
      const { token } = JSON.parse(raw);

      const res = await fetch(`${API}/api/status/${sessionId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();

      if (data.animation === 'done' && data.animationUrl) {
        dispatch({ type: 'PIPELINE_UPDATE', pipeline: 'animation', status: 'done', url: data.animationUrl });
      } else if (data.animation === 'failed') {
        dispatch({ type: 'PIPELINE_UPDATE', pipeline: 'animation', status: 'failed' });
      }

      if (data.video === 'done' && data.videoUrl) {
        dispatch({ type: 'PIPELINE_UPDATE', pipeline: 'video', status: 'done', url: data.videoUrl });
      } else if (data.video === 'failed') {
        dispatch({ type: 'PIPELINE_UPDATE', pipeline: 'video', status: 'failed' });
      }

      const allDone = ['done', 'failed', 'idle'].includes(data.animation) &&
                       ['done', 'failed', 'idle'].includes(data.video);
      if (!allDone) {
        setTimeout(poll, 10000);
      }
    } catch {
      // Ignore polling errors
    }
  };

  setTimeout(poll, 5000);
}
