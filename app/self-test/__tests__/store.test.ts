import { describe, it, expect, beforeEach } from "vitest";
import { useAssessmentStore, defaultAssessmentState } from "../store/assessmentStore";
import type {
  AssessmentRecord,
  AssessmentQuestion,
  QuestionEvaluation,
  FeedbackReport,
  PhaseResult,
} from "../lib/types";

/* ─── Test Helpers ───────────────────────────────────────── */

const mockConceptualQuestion: AssessmentQuestion = {
  type: "conceptual",
  question: "What is a binary search tree?",
  expectedAnswer: "A tree where left < root < right",
};

const mockMCQQuestion: AssessmentQuestion = {
  type: "mcq",
  question: "What is O(1)?",
  options: ["Constant", "Linear", "Quadratic", "Logarithmic"],
  correctIndex: 0,
  explanation: "O(1) means constant time",
  distractorExplanations: [
    "Linear is O(n)",
    "Quadratic is O(n²)",
    "Logarithmic is O(log n)",
  ],
};

const mockEvaluation: QuestionEvaluation = {
  score: 8,
  feedback: "Good answer with clear explanation.",
  mistakes: [],
  keyInsights: ["Understanding of BST property"],
};

const mockPhaseResult: PhaseResult = {
  phaseType: "conceptual",
  questions: [mockConceptualQuestion],
  userAnswers: ["A tree data structure"],
  evaluations: [mockEvaluation],
  phaseScore: 8,
  difficulty: "medium",
};

const mockFeedbackReport: FeedbackReport = {
  overallConfidence: 4.0,
  phaseScores: {
    conceptual: 8,
    mcq: 7,
    applied: 6,
    "code-challenge": 7,
  },
  strengths: ["Good understanding of core concepts"],
  weaknesses: ["Needs more practice with edge cases"],
  studyRecommendations: [
    { recommendation: "Review tree traversals", targetSection: "notes" },
    { recommendation: "Practice more problems", targetSection: "patterns" },
  ],
  suggestedContentUpdates: [],
};

const mockRecord: AssessmentRecord = {
  id: "550e8400-e29b-41d4-a716-446655440000",
  topicId: "dsa/binary-search-tree",
  status: "in-progress",
  startedAt: "2024-01-01T00:00:00.000Z",
  experienceLevel: 10,
  phases: [mockPhaseResult],
  initialDifficulty: "medium",
};

/* ─── Tests ──────────────────────────────────────────────── */

describe("Assessment Store", () => {
  beforeEach(() => {
    useAssessmentStore.getState().reset();
  });

  describe("Initial State", () => {
    it("should have idle status with all nulls/empty by default", () => {
      const state = useAssessmentStore.getState();
      expect(state.sessionId).toBeNull();
      expect(state.topicId).toBeNull();
      expect(state.status).toBe("idle");
      expect(state.currentPhaseIndex).toBe(0);
      expect(state.currentPhaseType).toBeNull();
      expect(state.currentDifficulty).toBe("medium");
      expect(state.currentQuestions).toEqual([]);
      expect(state.currentQuestionIndex).toBe(0);
      expect(state.currentAnswer).toBe("");
      expect(state.currentEvaluation).toBeNull();
      expect(state.isEvaluating).toBe(false);
      expect(state.phaseResults).toEqual([]);
      expect(state.feedbackReport).toBeNull();
      expect(state.confidenceScore).toBeNull();
      expect(state.isGenerating).toBe(false);
      expect(state.error).toBeNull();
    });
  });

  describe("startSession", () => {
    it("should transition to starting with correct fields", () => {
      useAssessmentStore.getState().startSession("dsa/trees", "hard");
      const state = useAssessmentStore.getState();

      expect(state.status).toBe("starting");
      expect(state.topicId).toBe("dsa/trees");
      expect(state.currentDifficulty).toBe("hard");
      expect(state.currentPhaseIndex).toBe(0);
      expect(state.currentPhaseType).toBe("conceptual");
      expect(state.sessionId).toBeTruthy();
      expect(state.phaseResults).toEqual([]);
      expect(state.error).toBeNull();
    });

    it("should generate a unique sessionId", () => {
      useAssessmentStore.getState().startSession("dsa/trees", "easy");
      const id1 = useAssessmentStore.getState().sessionId;

      useAssessmentStore.getState().reset();
      useAssessmentStore.getState().startSession("dsa/trees", "easy");
      const id2 = useAssessmentStore.getState().sessionId;

      expect(id1).not.toBe(id2);
    });
  });

  describe("resumeSession", () => {
    it("should restore state from a record with completed phases", () => {
      useAssessmentStore.getState().resumeSession(mockRecord);
      const state = useAssessmentStore.getState();

      expect(state.sessionId).toBe("550e8400-e29b-41d4-a716-446655440000");
      expect(state.topicId).toBe("dsa/binary-search-tree");
      expect(state.status).toBe("in-phase");
      expect(state.currentPhaseIndex).toBe(1); // 1 phase completed
      expect(state.currentPhaseType).toBe("mcq"); // next phase
      expect(state.currentDifficulty).toBe("medium"); // from last phase
      expect(state.phaseResults).toHaveLength(1);
      expect(state.phaseResults[0]).toEqual(mockPhaseResult);
    });

    it("should use initialDifficulty when no phases are completed", () => {
      const emptyRecord: AssessmentRecord = {
        ...mockRecord,
        phases: [],
        initialDifficulty: "easy",
      };
      useAssessmentStore.getState().resumeSession(emptyRecord);
      const state = useAssessmentStore.getState();

      expect(state.currentPhaseIndex).toBe(0);
      expect(state.currentPhaseType).toBe("conceptual");
      expect(state.currentDifficulty).toBe("easy");
    });

    it("should set currentPhaseType to null when all phases are done", () => {
      const completedRecord: AssessmentRecord = {
        ...mockRecord,
        phases: [
          { ...mockPhaseResult, phaseType: "conceptual" },
          { ...mockPhaseResult, phaseType: "mcq" },
          { ...mockPhaseResult, phaseType: "applied" },
          { ...mockPhaseResult, phaseType: "code-challenge" },
        ],
      };
      useAssessmentStore.getState().resumeSession(completedRecord);
      const state = useAssessmentStore.getState();

      expect(state.currentPhaseIndex).toBe(4);
      expect(state.currentPhaseType).toBeNull();
    });
  });

  describe("setQuestions", () => {
    it("should set questions and reset index to 0", () => {
      const questions: AssessmentQuestion[] = [
        mockConceptualQuestion,
        mockMCQQuestion,
      ];

      useAssessmentStore.getState().startSession("dsa/trees", "medium");
      useAssessmentStore.getState().setQuestions(questions);
      const state = useAssessmentStore.getState();

      expect(state.currentQuestions).toEqual(questions);
      expect(state.currentQuestionIndex).toBe(0);
      expect(state.status).toBe("in-phase");
    });
  });

  describe("Question Navigation", () => {
    beforeEach(() => {
      useAssessmentStore.getState().startSession("dsa/trees", "medium");
      useAssessmentStore.getState().setQuestions([
        mockConceptualQuestion,
        mockMCQQuestion,
      ]);
    });

    it("setAnswer should update currentAnswer", () => {
      useAssessmentStore.getState().setAnswer("My answer");
      expect(useAssessmentStore.getState().currentAnswer).toBe("My answer");
    });

    it("submitEvaluation should set evaluation and status to evaluating", () => {
      useAssessmentStore.getState().submitEvaluation(mockEvaluation);
      const state = useAssessmentStore.getState();

      expect(state.currentEvaluation).toEqual(mockEvaluation);
      expect(state.isEvaluating).toBe(false);
      expect(state.status).toBe("evaluating");
    });

    it("nextQuestion should increment index and clear answer/evaluation", () => {
      useAssessmentStore.getState().setAnswer("My answer");
      useAssessmentStore.getState().submitEvaluation(mockEvaluation);
      useAssessmentStore.getState().nextQuestion();
      const state = useAssessmentStore.getState();

      expect(state.currentQuestionIndex).toBe(1);
      expect(state.currentAnswer).toBe("");
      expect(state.currentEvaluation).toBeNull();
      expect(state.status).toBe("in-phase");
    });
  });

  describe("Phase Completion and Advancement", () => {
    beforeEach(() => {
      useAssessmentStore.getState().startSession("dsa/trees", "medium");
      useAssessmentStore.getState().setQuestions([mockConceptualQuestion]);
    });

    it("completePhase should transition to phase-summary", () => {
      useAssessmentStore.getState().completePhase(7.5);
      expect(useAssessmentStore.getState().status).toBe("phase-summary");
    });

    it("advanceToNextPhase should increment phase and set new difficulty", () => {
      useAssessmentStore.getState().completePhase(8);
      useAssessmentStore.getState().advanceToNextPhase("hard");
      const state = useAssessmentStore.getState();

      expect(state.currentPhaseIndex).toBe(1);
      expect(state.currentPhaseType).toBe("mcq");
      expect(state.currentDifficulty).toBe("hard");
      expect(state.currentQuestions).toEqual([]);
      expect(state.currentQuestionIndex).toBe(0);
      expect(state.currentAnswer).toBe("");
      expect(state.currentEvaluation).toBeNull();
      expect(state.status).toBe("starting");
    });

    it("should not advance past phase index 3", () => {
      // Advance through all phases
      useAssessmentStore.getState().advanceToNextPhase("medium"); // -> index 1 (mcq)
      useAssessmentStore.getState().advanceToNextPhase("medium"); // -> index 2 (applied)
      useAssessmentStore.getState().advanceToNextPhase("medium"); // -> index 3 (code-challenge)
      useAssessmentStore.getState().advanceToNextPhase("medium"); // -> index 4 (past end)

      const state = useAssessmentStore.getState();
      expect(state.currentPhaseIndex).toBe(4);
      expect(state.currentPhaseType).toBeNull();
    });
  });

  describe("setFeedbackReport", () => {
    it("should set report, confidence, and transition to summary", () => {
      useAssessmentStore.getState().startSession("dsa/trees", "medium");
      useAssessmentStore.getState().setFeedbackReport(mockFeedbackReport, 4.0);
      const state = useAssessmentStore.getState();

      expect(state.feedbackReport).toEqual(mockFeedbackReport);
      expect(state.confidenceScore).toBe(4.0);
      expect(state.status).toBe("summary");
    });
  });

  describe("setError", () => {
    it("should set error and transition to error status", () => {
      useAssessmentStore.getState().startSession("dsa/trees", "medium");
      useAssessmentStore.getState().setError("Something went wrong");
      const state = useAssessmentStore.getState();

      expect(state.status).toBe("error");
      expect(state.error).toBe("Something went wrong");
    });

    it("should clear error when null is passed", () => {
      useAssessmentStore.getState().setError("Something went wrong");
      useAssessmentStore.getState().setError(null);
      const state = useAssessmentStore.getState();

      expect(state.error).toBeNull();
    });
  });

  describe("setGenerating", () => {
    it("should set isGenerating flag", () => {
      useAssessmentStore.getState().setGenerating(true);
      expect(useAssessmentStore.getState().isGenerating).toBe(true);

      useAssessmentStore.getState().setGenerating(false);
      expect(useAssessmentStore.getState().isGenerating).toBe(false);
    });
  });

  describe("reset", () => {
    it("should return all state to initial defaults", () => {
      // Set up a complex state
      useAssessmentStore.getState().startSession("dsa/trees", "hard");
      useAssessmentStore.getState().setQuestions([mockConceptualQuestion]);
      useAssessmentStore.getState().setAnswer("some answer");
      useAssessmentStore.getState().submitEvaluation(mockEvaluation);
      useAssessmentStore.getState().setGenerating(true);

      // Reset
      useAssessmentStore.getState().reset();
      const state = useAssessmentStore.getState();

      expect(state.sessionId).toBeNull();
      expect(state.topicId).toBeNull();
      expect(state.status).toBe("idle");
      expect(state.currentPhaseIndex).toBe(0);
      expect(state.currentPhaseType).toBeNull();
      expect(state.currentDifficulty).toBe("medium");
      expect(state.currentQuestions).toEqual([]);
      expect(state.currentQuestionIndex).toBe(0);
      expect(state.currentAnswer).toBe("");
      expect(state.currentEvaluation).toBeNull();
      expect(state.isEvaluating).toBe(false);
      expect(state.phaseResults).toEqual([]);
      expect(state.feedbackReport).toBeNull();
      expect(state.confidenceScore).toBeNull();
      expect(state.isGenerating).toBe(false);
      expect(state.error).toBeNull();
    });
  });
});
