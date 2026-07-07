import { getWorkspacePath } from "../lib/constants";
import { FileTopicRepository } from "@/filesystem/FileTopicRepository";
import { FileProblemRepository } from "@/filesystem/FileProblemRepository";
import { FileRevisionRepository } from "@/filesystem/FileRevisionRepository";
import { SearchIndex } from "@/search";
import { TopicService } from "./TopicService";
import { ProblemService } from "./ProblemService";
import { RevisionService } from "./RevisionService";
import { SearchService } from "./SearchService";

/**
 * Application container — wires concrete repository implementations
 * into application services. All instances are singletons.
 */

const workspacePath = getWorkspacePath();

// Repository instances
export const topicRepository = new FileTopicRepository(workspacePath);
export const problemRepository = new FileProblemRepository(workspacePath);
export const revisionRepository = new FileRevisionRepository(workspacePath);
export const searchIndex = new SearchIndex();

// Service instances with injected repositories
export const topicService = new TopicService(topicRepository);
export const problemService = new ProblemService(problemRepository);
export const revisionService = new RevisionService(revisionRepository);
export const searchService = new SearchService(searchIndex);
