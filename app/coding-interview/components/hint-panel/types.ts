export interface HintPanelProps {
  onRequestHint: (level: number) => void;
  onShowSolution?: () => void;
  isLoading?: boolean;
}
