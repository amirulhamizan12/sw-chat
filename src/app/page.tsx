import MainGeneration from "@/components/mainGenaration";
import { ErrorBoundary } from "@/components/ErrorBoundary";

export default function Home() {
  return (
    <ErrorBoundary>
      <MainGeneration />
    </ErrorBoundary>
  );
}
