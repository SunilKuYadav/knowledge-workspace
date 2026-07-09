import { notFound } from "next/navigation";
import { topicService } from "@/src/services/container";
import { SelfTestModule } from "./SelfTestModule";

interface PageProps {
  searchParams: Promise<{ topicId?: string }>;
}

export default async function SelfTestPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const topicId = params.topicId;

  if (!topicId) {
    notFound();
  }

  const topic = await topicService.getTopicById(topicId);

  if (!topic) {
    notFound();
  }

  const artifacts = await topicService.getArtifacts(topicId);

  return <SelfTestModule topicId={topicId} topic={topic} artifacts={artifacts} />;
}
