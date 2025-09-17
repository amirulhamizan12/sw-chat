import MainGeneration from "@/components/chatInterface";
import { ErrorBoundary } from "../../components/errorBoundary";

export default function ChatPage() {
  return (
    <ErrorBoundary>
      <MainGeneration />
    </ErrorBoundary>
  );
}
