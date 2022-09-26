# Requirements Document

## Introduction

Knowledge Workspace is an offline-first, file-driven personal knowledge management system for technical interview preparation. It runs as a local Next.js application that indexes and renders workspace files stored as Markdown and JSON. The workspace directory IS the product — the web application serves as a rich interface for browsing, editing, searching, and reviewing content. The system integrates local AI via Ollama for content generation, implements spaced repetition for revision scheduling, and auto-commits changes via Git.

## Glossary

- **Knowledge_Workspace**: The root directory containing all topics, problems, notes, flashcards, revision data, and templates as Markdown and JSON files
- **App**: The Next.js application running locally that provides the user interface and server-side file operations
- **Filesystem_Layer**: The server-side module responsible for reading and writing files in the Knowledge_Workspace using Node.js fs APIs via Next.js API routes and server actions
- **Search_Index**: An in-memory full-text search index (FlexSearch or MiniSearch) built at application startup from workspace file contents
- **AI_Service**: The module that communicates with the Ollama HTTP API at localhost:11434 to generate AI-powered content
- **Ollama**: A locally-running large language model server accessible at localhost:11434
- **Revision_Scheduler**: The spaced repetition engine that tracks confidence levels, computes next review dates, and maintains revision history
- **Git_Service**: The module that performs automatic git add and git commit operations on the Knowledge_Workspace after file saves
- **Topic**: A self-contained folder within the workspace representing a study subject, containing topic.json metadata, overview.md, notes.md, patterns.md, mistakes.md, flashcards.json, and revision.json
- **Problem**: A folder representing a coding problem, containing problem.json metadata, notes.md, solution files, and revision.json
- **Repository_Interface**: An abstract interface for data access operations, implemented by FileRepository for local file access
- **Dashboard**: The main landing view showing overview of topics, problems, revision schedule, and statistics
- **Markdown_Editor**: The built-in rich Markdown editor with live preview and formatting toolbar

## Requirements

### Requirement 1: Workspace File Reading

**User Story:** As a user, I want the app to read my workspace files so that I can browse topics, problems, and notes through a web interface.

#### Acceptance Criteria

1. WHEN the App starts, THE Filesystem_Layer SHALL read the Knowledge_Workspace directory structure and parse all topic.json and problem.json metadata files
2. WHEN a user navigates to a Topic, THE Filesystem_Layer SHALL read and return the topic.json, overview.md, notes.md, patterns.md, and mistakes.md files from that Topic folder
3. WHEN a user navigates to a Problem, THE Filesystem_Layer SHALL read and return the problem.json, notes.md, and solution files from that Problem folder
4. IF a requested file does not exist in the Knowledge_Workspace, THEN THE Filesystem_Layer SHALL return an empty content response without throwing an error

### Requirement 2: Workspace File Writing

**User Story:** As a user, I want to create and edit topics, problems, and notes so that I can build my knowledge base over time.

#### Acceptance Criteria

1. WHEN a user saves a Topic, THE Filesystem_Layer SHALL write the updated content to the corresponding Markdown and JSON files in the Topic folder
2. WHEN a user saves a Problem, THE Filesystem_Layer SHALL write the updated content to the corresponding Markdown and JSON files in the Problem folder
3. WHEN a user creates a new Topic, THE Filesystem_Layer SHALL create the Topic folder with topic.json, overview.md, notes.md, patterns.md, and mistakes.md files using default templates
4. WHEN a user creates a new Problem, THE Filesystem_Layer SHALL create the Problem folder with problem.json, notes.md, and an empty solution file
5. IF a write operation fails due to a filesystem error, THEN THE Filesystem_Layer SHALL return an error message describing the failure

### Requirement 3: Workspace Directory Structure

**User Story:** As a user, I want my workspace organized into predictable directories so that I can navigate files directly or through the app.

#### Acceptance Criteria

1. THE Filesystem_Layer SHALL organize notes into subdirectories: dsa/, system-design/, database/, networking/, os/, and oop/ within the notes/ directory
2. THE Filesystem_Layer SHALL organize problems into subdirectories: leetcode/, codeforces/, and gfg/ within the problems/ directory
3. THE Filesystem_Layer SHALL maintain templates/, revision/, flashcards/, and assets/ directories at the workspace root
4. WHEN a user creates content in a category that has no existing directory, THE Filesystem_Layer SHALL create the required directory before writing the file

### Requirement 4: Full-Text Search

**User Story:** As a user, I want to search across all my notes, problems, and topics so that I can quickly find relevant content.

#### Acceptance Criteria

1. WHEN the App starts, THE Search_Index SHALL build an in-memory index from all Markdown file content, titles, tags, code snippets, patterns, and company names in the Knowledge_Workspace
2. WHEN a user submits a search query, THE Search_Index SHALL return matching results ranked by relevance within 200ms for workspaces containing up to 10,000 files
3. WHEN a file is saved in the Knowledge_Workspace, THE Search_Index SHALL update its index entry for that file without rebuilding the entire index
4. THE Search_Index SHALL support filtering results by content type: topics, problems, notes, and flashcards

### Requirement 5: AI Content Generation

**User Story:** As a user, I want AI-generated summaries, quizzes, flashcards, and interview prep so that I can study more effectively.

#### Acceptance Criteria

1. WHEN a user requests a summary for a Topic, THE AI_Service SHALL send the Topic content to Ollama and store the generated summary as a Markdown file in the Topic folder
2. WHEN a user requests quiz generation, THE AI_Service SHALL send the relevant content to Ollama and store the generated quiz as a JSON file in the Topic folder
3. WHEN a user requests flashcard generation, THE AI_Service SHALL send the relevant content to Ollama and store the generated flashcards in the flashcards.json file
4. WHEN a user requests interview preparation for a Problem, THE AI_Service SHALL send the Problem content to Ollama and return suggested follow-up questions and hints
5. WHEN a user requests similar problems, THE AI_Service SHALL send the Problem metadata to Ollama and return a list of related problems based on patterns and difficulty

### Requirement 6: AI Graceful Degradation

**User Story:** As a user, I want the app to remain fully functional even when Ollama is not running so that AI features do not block my workflow.

#### Acceptance Criteria

1. WHEN the App starts, THE AI_Service SHALL check connectivity to Ollama at localhost:11434 and report the connection status
2. IF Ollama is not reachable at localhost:11434, THEN THE AI_Service SHALL disable AI features and display a notification indicating that AI features are unavailable
3. WHILE Ollama is unreachable, THE App SHALL allow all non-AI features to function without degradation, including file reading, writing, editing, searching, and revision tracking
4. WHEN Ollama becomes reachable after being unavailable, THE AI_Service SHALL re-enable AI features without requiring an application restart

### Requirement 7: Spaced Repetition Scheduling

**User Story:** As a user, I want a spaced repetition system to schedule reviews so that I retain knowledge over time.

#### Acceptance Criteria

1. WHEN a user completes a review session, THE Revision_Scheduler SHALL update the confidence level (1-5 scale), lastReviewed date, and compute the nextReview date based on the spaced repetition algorithm
2. THE Revision_Scheduler SHALL store revision history as entries in the revision.json file within the corresponding Topic or Problem folder
3. WHEN the App starts, THE Revision_Scheduler SHALL compute a list of items due for review based on the current date and each item's nextReview date
4. THE Revision_Scheduler SHALL increase the interval between reviews as the confidence level increases and decrease the interval when the confidence level drops
5. WHEN a user views the revision schedule, THE Revision_Scheduler SHALL display items grouped by overdue, due today, and upcoming categories

### Requirement 8: Git Auto-Commit

**User Story:** As a user, I want every save to be automatically committed to Git so that I have a complete history of my learning progress without manual version control.

#### Acceptance Criteria

1. WHEN a file is saved in the Knowledge_Workspace, THE Git_Service SHALL execute a git add operation for the modified file followed by a git commit
2. THE Git_Service SHALL generate a descriptive commit message that includes the action performed and the file path (e.g., "Update notes for topic: Binary Trees")
3. IF the Knowledge_Workspace is not a Git repository, THEN THE Git_Service SHALL initialize a new Git repository with git init before the first commit
4. IF a git operation fails, THEN THE Git_Service SHALL log the error and allow the file save to complete without blocking the user

### Requirement 9: Dashboard View

**User Story:** As a user, I want a dashboard that summarizes my learning progress so that I can quickly see what to work on next.

#### Acceptance Criteria

1. WHEN a user opens the App, THE App SHALL display the Dashboard showing a summary of total topics, total problems, items due for review, and recent activity
2. THE Dashboard SHALL display a list of items due for revision today, sorted by priority (overdue items first)
3. THE Dashboard SHALL display statistics including problems solved by difficulty, topics by confidence level, and study streak information
4. WHEN a user clicks on a Topic or Problem from the Dashboard, THE App SHALL navigate to the detail view for that item

### Requirement 10: Topic Detail View

**User Story:** As a user, I want a comprehensive view of each topic so that I can study and manage all related content in one place.

#### Acceptance Criteria

1. WHEN a user navigates to a Topic, THE App SHALL display the topic metadata (title, difficulty, status, confidence, tags) and tabbed content sections for overview, notes, patterns, and mistakes
2. THE App SHALL display the Topic's flashcards, revision history, and associated problems within the Topic detail view
3. WHEN a user edits Topic content, THE App SHALL open the Markdown_Editor pre-loaded with the selected file content

### Requirement 11: Problem Detail View

**User Story:** As a user, I want a detailed view for each coding problem so that I can manage solutions, notes, and revision data.

#### Acceptance Criteria

1. WHEN a user navigates to a Problem, THE App SHALL display the problem metadata (title, platform, difficulty, companies, patterns, status, favorite flag) alongside the notes and solution files
2. THE App SHALL display the Problem's revision history and confidence trend within the Problem detail view
3. WHEN a user edits a solution file, THE App SHALL open the Markdown_Editor with syntax highlighting appropriate for the solution file language

### Requirement 12: Rich Markdown Editor

**User Story:** As a user, I want a built-in Markdown editor with live preview and formatting toolbar so that I can write and format notes efficiently.

#### Acceptance Criteria

1. WHEN a user opens a Markdown file for editing, THE Markdown_Editor SHALL display a formatting toolbar with controls for headings, bold, italic, code blocks, lists, links, and images
2. THE Markdown_Editor SHALL render a live preview of the Markdown content as the user types
3. WHEN a user saves content in the Markdown_Editor, THE App SHALL write the raw Markdown to the corresponding file in the Knowledge_Workspace
4. THE Markdown_Editor SHALL support syntax highlighting for code blocks in common programming languages (Python, Java, C++, JavaScript, TypeScript)

### Requirement 13: AI Sidebar

**User Story:** As a user, I want an AI sidebar panel so that I can generate content and get assistance while viewing topics or problems.

#### Acceptance Criteria

1. WHILE a user is viewing a Topic or Problem, THE App SHALL display an AI sidebar panel with actions for generating summaries, quizzes, flashcards, and explanations
2. WHEN a user triggers an AI action from the sidebar, THE App SHALL display a loading indicator and stream the AI-generated response into the sidebar panel
3. WHEN AI content generation completes, THE App SHALL offer the user an option to save the generated content to the appropriate file in the Knowledge_Workspace
4. WHILE Ollama is unreachable, THE App SHALL display the AI sidebar with all actions disabled and a message indicating AI is unavailable

### Requirement 14: Repository Interface Abstraction

**User Story:** As a developer, I want data access abstracted behind a repository interface so that the implementation can be swapped without changing application logic.

#### Acceptance Criteria

1. THE App SHALL define a Repository_Interface with methods for CRUD operations on Topics, Problems, Flashcards, and Revision data
2. THE App SHALL implement a FileRepository class that fulfills the Repository_Interface using the Filesystem_Layer for all data operations
3. THE App SHALL inject the Repository_Interface into application services so that no service directly depends on the FileRepository implementation

### Requirement 15: Revision Views

**User Story:** As a user, I want dedicated revision views so that I can conduct review sessions and track my progress.

#### Acceptance Criteria

1. WHEN a user starts a review session, THE App SHALL present items due for review one at a time with options to reveal answers and rate confidence
2. WHEN a user rates their confidence on a reviewed item, THE Revision_Scheduler SHALL update the revision.json and compute the next review date
3. THE App SHALL display a revision history view showing past review sessions, confidence trends over time, and upcoming scheduled reviews
