export interface CodingInterviewButtonProps {
  source: "problem" | "topic" | "revision" | "practice" | "interview";
  id?: string;
  title?: string;
  category?: string;
  tags?: string[];
  concepts?: string[];
  difficulty?: "easy" | "medium" | "hard";
  variant?: "button" | "card";
}
