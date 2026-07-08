import type { ConversationMessage } from "../../lib/types";

export interface FollowUpPanelProps {
  messages: ConversationMessage[];
  onSendResponse: (response: string) => void;
  onEndDiscussion: () => void;
  isLoading: boolean;
}
