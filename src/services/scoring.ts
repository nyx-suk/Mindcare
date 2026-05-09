export interface Scores {
  anxiety: number;
  depression: number;
}

export interface Question {
  id: string;
  text: string;
  category: 'anxiety' | 'depression';
  options: { label: string; value: number }[];
}

export interface Answer {
  questionId: string;
  value: number;
}

/**
 * Computes the scores from raw answers.
 */
export const computeScores = (answers: Answer[], questions: Question[]): Scores => {
  const scores: Scores = { anxiety: 0, depression: 0 };
  const answersMap = answers.reduce((acc, ans) => {
    acc[ans.questionId] = ans.value;
    return acc;
  }, {} as Record<string, number>);

  questions.forEach(q => {
    if (answersMap[q.id] !== undefined) {
      scores[q.category] += answersMap[q.id];
    }
  });

  return scores;
};

/**
 * Returns the severity label based on score and category.
 */
export const getSeverityLabel = (score: number, category: "depression" | "anxiety"): string => {
  if (category === "depression") {
    if (score <= 4) return "Minimal";
    if (score <= 9) return "Mild";
    if (score <= 14) return "Moderate";
    if (score <= 19) return "Moderately Severe";
    return "Severe";
  } else { // anxiety
    if (score <= 4) return "Minimal";
    if (score <= 9) return "Mild";
    if (score <= 14) return "Moderate";
    return "Severe";
  }
};

/**
 * Checks if the scores indicate high risk.
 * Triggers if: PHQ-9 depression score >= 20 OR answer to PHQ-9 question 9 >= 1.
 */
export const checkHighRisk = (scores: Scores, answers: Answer[]): boolean => {
  // Condition 1: PHQ-9 total >= 20
  if (scores.depression >= 20) {
    return true;
  }
  // Condition 2: Suicidal ideation (PHQ-9 question 9) >= 1
  const suicidalAnswer = answers.find(ans => ans.questionId === 'phq9');
  if (suicidalAnswer && suicidalAnswer.value >= 1) {
    return true;
  }
  return false;
};

/**
 * Returns a short personalized recommendation string based on severity.
 */
export const getCategoryMessage = (score: number, category: "depression" | "anxiety"): string => {
  const severity = getSeverityLabel(score, category);
  switch (severity) {
    case "Minimal":
      return "You're doing well! Keep maintaining your positive habits.";
    case "Mild":
      return "Consider light self-care activities like exercise or journaling.";
    case "Moderate":
      return "Seek support from friends, family, or a professional counselor.";
    case "Moderately Severe":
      return "Professional help is recommended. Consider therapy or medication.";
    case "Severe":
      return "Immediate professional intervention is crucial. Contact a mental health specialist.";
    default:
      return "Monitor your mental health and seek help if needed.";
  }
};
