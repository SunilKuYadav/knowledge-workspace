import { useInterviewStore } from "../../store/interviewStore";

export function useHintPanel() {
  const hintsUsed = useInterviewStore((s) => s.hintsUsed);
  const hints = useInterviewStore((s) => s.hints);

  const allHintsConsumed = hintsUsed >= 4;
  const nextLevel = hintsUsed + 1;

  return {
    hintsUsed,
    hints,
    allHintsConsumed,
    nextLevel,
  };
}
