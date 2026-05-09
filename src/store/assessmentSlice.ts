import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Answer } from '../services/scoring';

interface AssessmentState {
  currentAnswers: Record<string, number>;
  latestScore: {
    anxiety: number;
    depression: number;
    answers: Answer[];
  } | null;
}

const initialState: AssessmentState = {
  currentAnswers: {},
  latestScore: null,
};

export const assessmentSlice = createSlice({
  name: 'assessments',
  initialState,
  reducers: {
    answerQuestion: (
      state,
      action: PayloadAction<{ questionId: string; score: number }>
    ) => {
      state.currentAnswers[action.payload.questionId] = action.payload.score;
    },
    clearAnswers: (state) => {
      state.currentAnswers = {};
    },
    setLatestScore: (
      state,
      action: PayloadAction<{ anxiety: number; depression: number; answers: Answer[] }>
    ) => {
      state.latestScore = action.payload;
    },
  },
});

export const { answerQuestion, clearAnswers, setLatestScore } = assessmentSlice.actions;
export default assessmentSlice.reducer;
