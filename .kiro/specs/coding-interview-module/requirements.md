# Requirements Document

## Introduction

The Universal AI Coding Interview Module is a reusable, self-contained component that simulates a realistic senior-engineer-led coding interview experience. It can be embedded anywhere in the existing Knowledge Workspace Next.js application (Problem Detail, Topic Detail, Self Test, Revision Session, Practice Mode, Interview Mode, etc.) and accepts configuration props to adapt its behavior to different contexts. The module covers the full interview lifecycle: AI-generated problem presentation, timed coding phase, code execution, AI evaluation, interactive follow-up discussion, progressive hints, scoring, and session summary.

## Glossary

- **Interview_Module**: The top-level reusable React component that orchestrates the entire coding interview experience and accepts configuration props for embedding in various application contexts.
- **Code_Editor**: The integrated JavaScript/TypeScript editor component with syntax highlighting, auto-indentation, line numbers, and formatting capabilities.
- **Execution_Engine**: The service responsible for running user-submitted JavaScript/TypeScript code in a sandboxed environment and returning output, errors, and performance metrics.
- **Problem_Generator**: The AI service that creates realistic coding interview problems with full metadata including title, difficulty, constraints, test cases, and expected complexities.
- **Evaluation_Engine**: The AI service that analyzes submitted code and provides senior-interviewer-style feedback on correctness, algorithm choice, complexity, and code quality.
- **Interview_Conductor**: The AI service that conducts interactive follow-up questioning after code submission, adapting questions based on the user's responses.
- **Hint_System**: The progressive hint delivery mechanism that provides four escalating levels of guidance without revealing full solutions unless explicitly requested.
- **Interview_Timer**: The countdown/elapsed timer component that tracks interview duration with pause, resume, and auto-end capabilities.
- **Scoring_Engine**: The service that calculates and formats a comprehensive interview performance report across multiple evaluation dimensions.
- **Session_Store**: The Zustand-based state management store that maintains interview context, code state, timing data, submissions, and conversation history.
- **Test_Case_Panel**: The UI component that displays test case inputs, expected outputs, and actual execution results.
- **Session_Summary**: The post-interview report containing strengths, weaknesses, improvement areas, and recommendations.

## Requirements

### Requirement 1: Reusable Module Configuration

**User Story:** As a developer, I want to embed the coding interview module in any page of the application with different configurations, so that I can provide context-appropriate interview experiences across Problems, Topics, Revision, and other views.

#### Acceptance Criteria

1. THE Interview_Module SHALL accept a `source` prop identifying the embedding context (problem, topic, self-test, revision, practice, interview).
2. THE Interview_Module SHALL accept a `context` prop containing relevant metadata from the embedding page, where each source type defines its required fields: problem source requires `id`, `title`, `category`, and `tags`; topic source requires `id`, `title`, and `concepts`; revision source requires `sessionId` and `topicIds`.
3. THE Interview_Module SHALL accept a `language` prop specifying the programming language for the session (javascript or typescript).
4. THE Interview_Module SHALL accept an optional `difficulty` prop to constrain generated problem difficulty (easy, medium, hard).
5. THE Interview_Module SHALL accept an optional `duration` prop specifying the interview time limit in minutes, accepting values between 1 and 180 minutes inclusive.
6. THE Interview_Module SHALL render as a self-contained component without requiring external layout dependencies from the host page.
7. WHEN the Interview_Module is mounted without a `context` prop, THE Interview_Module SHALL generate a random problem matching the category associated with the specified `source`.
8. IF the Interview_Module receives an invalid `source` value or a `context` prop missing required fields for the specified source type, THEN THE Interview_Module SHALL display an error indication and not initiate the interview session.

### Requirement 2: Integrated Code Editor

**User Story:** As a user, I want a full-featured code editor within the interview module, so that I can write, edit, and format code comfortably during the interview.

#### Acceptance Criteria

1. THE Code_Editor SHALL provide syntax highlighting for JavaScript and TypeScript, visually distinguishing at minimum keywords, strings, comments, numeric literals, and type annotations.
2. WHEN the user presses Enter after an opening curly brace, square bracket, parenthesis, or block-level keyword (function, if, else, for, while, switch, class), THE Code_Editor SHALL insert a new line indented by the configured indentation width (default: 2 spaces).
3. WHEN the user types an opening character from the set { ( [ " ' `, THE Code_Editor SHALL automatically insert the corresponding closing character and place the cursor between the pair.
4. THE Code_Editor SHALL display line numbers in a gutter column to the left of the code content, starting at 1 and incrementing by 1 for each line.
5. WHEN the application theme changes between dark and light mode, THE Code_Editor SHALL automatically switch its color scheme to match the active application theme without requiring a page reload.
6. WHEN the user activates the copy-to-clipboard button, THE Code_Editor SHALL copy the entire editor text content to the system clipboard and display a confirmation indicator for at least 2 seconds.
7. WHEN the user activates the reset button, THE Code_Editor SHALL display a confirmation prompt before restoring the editor content to the initial boilerplate code provided for the current problem.
8. WHEN the user activates the format button and the code contains no syntax errors, THE Code_Editor SHALL auto-format the code applying consistent indentation (2 spaces per level), consistent semicolon usage, and consistent quote style throughout the document.
9. IF the user activates the format button and the code contains syntax errors that prevent formatting, THEN THE Code_Editor SHALL display an inline error indication identifying that formatting failed due to invalid syntax, and preserve the editor content unchanged.
10. THE Code_Editor SHALL provide a fullscreen toggle that expands the editor to fill the browser viewport.
11. WHEN the user activates fullscreen mode, THE Code_Editor SHALL display an exit-fullscreen control that is visible without scrolling and returns the editor to the embedded layout when activated.
12. THE Code_Editor SHALL have a minimum height of 300 pixels in embedded mode to ensure sufficient visible editing area.

### Requirement 3: Code Execution

**User Story:** As a user, I want to run my code against test cases within the interview module, so that I can verify correctness before submitting.

#### Acceptance Criteria

1. WHEN the user triggers code execution, THE Execution_Engine SHALL run the submitted JavaScript or TypeScript code in a sandboxed environment and display a loading indicator in the console output panel until execution completes or is terminated.
2. WHEN code execution completes successfully, THE Execution_Engine SHALL display all console.log output in the console output panel, truncating output that exceeds 10,000 characters with an indication that output was truncated.
3. WHEN code execution produces a runtime error, THE Execution_Engine SHALL display the error type, message, and stack trace in the console output panel.
4. IF the submitted code contains a syntax or compilation error, THEN THE Execution_Engine SHALL display an error message indicating the error type and location (line number) in the console output panel without executing the code against test cases.
5. WHEN code execution completes, THE Execution_Engine SHALL display the execution time in milliseconds and the approximate memory usage in megabytes (MB).
6. WHEN code execution completes, THE Execution_Engine SHALL run code against each test case independently and display pass/fail status per test case in the Test_Case_Panel, where a test case passes if the function's return value is deeply equal to the expected output.
7. IF code execution exceeds 5 seconds for a single test case, THEN THE Execution_Engine SHALL terminate the execution and display a timeout error for that test case.
8. WHEN code execution completes, THE Test_Case_Panel SHALL display input values, expected output, and actual output for each test case.

### Requirement 4: AI Problem Generation

**User Story:** As a user, I want the module to generate realistic coding interview problems, so that I can practice with questions that resemble real company interviews.

#### Acceptance Criteria

1. WHEN the Interview_Module initiates a session, THE Problem_Generator SHALL produce a problem containing: title, difficulty level, category, at least 2 tags, problem statement, constraints, input/output format, at least 2 sample inputs and outputs with explanations, and at least 2 edge cases.
2. THE Problem_Generator SHALL generate at least 5 hidden test cases that are used for evaluation but not displayed to the user during the coding phase.
3. THE Problem_Generator SHALL generate expected time complexity and space complexity for the optimal solution expressed in Big-O notation.
4. WHEN a `context` prop is provided, THE Problem_Generator SHALL generate a problem whose category or tags overlap with the topic, category, or concepts specified in the `context` prop.
5. WHEN a `difficulty` prop is provided, THE Problem_Generator SHALL constrain the generated problem to the specified difficulty level (easy, medium, or hard).
6. THE Problem_Generator SHALL include between 1 and 5 company relevance tags indicating which companies have asked questions in the same category and difficulty range.
7. THE Problem_Generator SHALL produce problems that have at least one valid solution in the specified programming language that can be implemented within the configured session duration.
8. IF the Problem_Generator fails to produce a valid problem within 30 seconds, THEN THE Interview_Module SHALL display an error message indicating generation failed and provide an option to retry.
9. IF the Problem_Generator receives both a `context` prop and a `difficulty` prop, THEN THE Problem_Generator SHALL satisfy both constraints, prioritizing the `difficulty` constraint if the context contains no problems at the specified difficulty level.

### Requirement 5: Coding Phase Environment

**User Story:** As a user, I want a distraction-free coding environment during the interview, so that I can focus on solving the problem within the time limit.

#### Acceptance Criteria

1. WHILE the interview is in the coding phase, THE Interview_Module SHALL display the problem description, constraints, and sample I/O in a resizable panel alongside the Code_Editor, where the panel width is adjustable between a minimum of 250 pixels and a maximum of 60% of the available viewport width.
2. WHILE the interview is in the coding phase, THE Interview_Module SHALL display the Interview_Timer showing elapsed and remaining time.
3. WHILE the interview is in the coding phase, THE Interview_Module SHALL provide a Run button that executes code against visible test cases without submitting.
4. WHILE the interview is in the coding phase, THE Interview_Module SHALL provide a Submit button that finalizes the solution for AI evaluation.
5. WHILE the interview is in the coding phase, THE Interview_Module SHALL allow the user to run code an unlimited number of times before submitting.
6. WHILE the interview is in the coding phase, THE Interview_Module SHALL display the console output panel showing results from the most recent code execution.
7. WHEN the user clicks Submit, THE Interview_Module SHALL display a confirmation prompt before transitioning from the coding phase to the evaluation phase.
8. WHILE code execution is in progress, THE Interview_Module SHALL disable the Run button and the Submit button until execution completes or times out.

### Requirement 6: AI Evaluation

**User Story:** As a user, I want detailed senior-engineer-level feedback on my submission, so that I can understand both what I did well and where I can improve.

#### Acceptance Criteria

1. WHEN the user submits code, THE Evaluation_Engine SHALL assess correctness by running the code against all test cases including hidden test cases, and display per-test-case pass/fail results.
2. WHEN evaluation completes, THE Evaluation_Engine SHALL provide feedback on algorithm choice indicating whether the solution's time complexity matches the Problem_Generator's expected optimal time complexity.
3. WHEN evaluation completes, THE Evaluation_Engine SHALL analyze and report the time complexity and space complexity of the submitted solution expressed in Big-O notation.
4. WHEN evaluation completes, THE Evaluation_Engine SHALL evaluate code quality including variable naming, readability, maintainability, and modularity, providing at least one specific positive observation and one specific improvement suggestion.
5. WHEN evaluation completes, THE Evaluation_Engine SHALL assess edge case handling and list any edge cases from the problem definition that the submitted code does not handle.
6. WHEN evaluation completes, THE Evaluation_Engine SHALL assess error handling and robustness of the solution.
7. THE Evaluation_Engine SHALL present feedback in a structured format with separate sections for each evaluation dimension: correctness, algorithm choice, complexity analysis, code quality, edge case handling, and error handling.
8. THE Evaluation_Engine SHALL provide specific, actionable improvement suggestions rather than generic pass/fail verdicts.
9. IF the Evaluation_Engine fails to produce a response within 30 seconds, THEN THE Interview_Module SHALL display an error indication and offer the user the option to retry evaluation or proceed to the follow-up phase with available data.

### Requirement 7: Interactive Follow-Up Interview

**User Story:** As a user, I want the AI to conduct a follow-up discussion after my submission, so that I can demonstrate deeper understanding and practice explaining my approach.

#### Acceptance Criteria

1. WHEN evaluation is complete, THE Interview_Conductor SHALL display an opening follow-up question related to the user's submitted solution within 5 seconds.
2. WHILE the follow-up discussion is active, THE Interview_Conductor SHALL ask questions about the user's approach choice, trade-offs considered, and optimization possibilities, asking between 3 and 8 questions per session unless the user ends the discussion earlier.
3. WHILE the follow-up discussion is active, THE Interview_Conductor SHALL reference specific details from the user's previous responses within the same session when formulating subsequent questions.
4. WHILE the follow-up discussion is active, THE Interview_Conductor SHALL select questions from the following topic areas: alternative approaches, time/space trade-offs, behavior with large inputs, memory considerations, iterative versus recursive solutions, and production considerations.
5. WHILE the follow-up discussion is active, THE Interview_Conductor SHALL reference the user's submitted code and evaluation results when formulating questions.
6. WHEN the user provides an incomplete or incorrect answer, THE Interview_Conductor SHALL provide a specific hint indicating which aspect of the answer needs reconsideration and ask a narrower follow-up question rather than immediately revealing the answer.
7. WHEN the user activates the end-discussion control, THE Interview_Conductor SHALL stop generating further questions and transition the session to the scoring and summary phase.
8. IF the Interview_Conductor fails to generate a follow-up question due to an AI service error, THEN THE Interview_Conductor SHALL display an error indication and offer the user the option to retry or proceed to the scoring and summary phase.
9. THE Interview_Conductor SHALL accept user responses up to 2000 characters in length per message.

### Requirement 8: Progressive Hints

**User Story:** As a user, I want access to progressive hints during the coding phase, so that I can get unstuck without having the full solution revealed immediately.

#### Acceptance Criteria

1. WHILE the interview is in the coding phase, THE Hint_System SHALL display a hint button indicating the current hint level (1 through 4) that the user can activate to request the next level of guidance.
2. WHEN the user requests the first hint, THE Hint_System SHALL provide a clarifying question or restatement that helps the user better understand the problem without referencing any specific algorithm or data structure.
3. WHEN the user requests the second hint, THE Hint_System SHALL name the correct algorithmic approach (e.g., "sliding window", "dynamic programming") without providing implementation details or pseudocode.
4. WHEN the user requests the third hint, THE Hint_System SHALL name the specific data structure to use (e.g., "hash map", "min-heap") and explain why it is appropriate for this problem.
5. WHEN the user requests the fourth hint, THE Hint_System SHALL provide high-level pseudocode of 5 to 15 lines outlining the solution steps without providing language-specific syntax.
6. THE Hint_System SHALL provide the full solution code only when the user explicitly requests it via a separate "Show Solution" control that becomes visible after all four hint levels have been consumed.
7. THE Hint_System SHALL track the number of hints used and report it to the Scoring_Engine, where each hint consumed reduces the overall score according to the scoring penalty rules.
8. WHEN a hint is displayed, THE Hint_System SHALL present all previously consumed hints in chronological order so the user can review earlier guidance.

### Requirement 9: Interview Timer

**User Story:** As a user, I want a visible timer during the interview, so that I can manage my time effectively.

#### Acceptance Criteria

1. WHEN an interview session starts, THE Interview_Timer SHALL begin counting from zero elapsed time and counting down from the configured duration.
2. THE Interview_Timer SHALL display both elapsed time and remaining time in MM:SS format, updating the display every 1 second.
3. WHILE the interview is in the coding phase, THE Interview_Timer SHALL provide a pause button that stops the countdown without ending the session.
4. WHEN the timer is paused, THE Interview_Timer SHALL provide a resume button that continues the countdown from where it was paused.
5. WHEN remaining time reaches zero, THE Interview_Timer SHALL automatically end the coding phase and trigger submission of the current code, regardless of whether the user has interacted with the editor.
6. IF no `duration` prop is provided, THEN THE Interview_Timer SHALL default to 45 minutes. IF a `duration` prop is provided, THEN THE Interview_Timer SHALL accept values between 1 and 180 minutes inclusive.
7. WHEN remaining time reaches 5 minutes, THE Interview_Timer SHALL change the remaining-time display to a warning color and persist this visual warning indicator until the session ends.

### Requirement 10: Scoring and Interview Report

**User Story:** As a user, I want a comprehensive score report after the interview, so that I can objectively assess my performance across multiple dimensions.

#### Acceptance Criteria

1. WHEN the interview session completes (either the user ends the follow-up discussion or the follow-up concludes naturally), THE Scoring_Engine SHALL generate a report containing an overall score on a 0-100 integer scale.
2. THE Scoring_Engine SHALL provide individual dimension scores on a 0-100 integer scale for: communication, coding ability, problem-solving approach, algorithm selection, complexity analysis accuracy, edge case coverage, and code quality.
3. THE Scoring_Engine SHALL provide a confidence level as a percentage (0-100%) indicating how reliable the assessment is, where higher values correspond to more interaction data observed (questions answered, code submitted, follow-up responses provided).
4. THE Scoring_Engine SHALL provide an interview readiness rating based on the overall score using the following thresholds: "not ready" (0-39), "needs practice" (40-59), "almost ready" (60-79), "ready" (80-100).
5. THE Scoring_Engine SHALL apply scoring penalties for hints used, excessive time taken relative to the configured duration, and number of execution attempts, where more hints used and more execution attempts each reduce the overall score.
6. THE Scoring_Engine SHALL present each dimension score with a justification of 1 to 3 sentences explaining the specific evidence from the session that determined that score.
7. IF the user did not participate in the follow-up discussion, THEN THE Scoring_Engine SHALL score the communication dimension based solely on code comments and variable naming, and SHALL indicate reduced confidence in the overall assessment.
8. IF the interview session ends with no code submitted (empty editor or only boilerplate code), THEN THE Scoring_Engine SHALL assign a score of 0 for coding ability, algorithm selection, and code quality dimensions, and SHALL indicate that the session was incomplete.

### Requirement 11: Session Summary and Recommendations

**User Story:** As a user, I want a summary of my session with actionable next steps, so that I can plan focused improvement.

#### Acceptance Criteria

1. WHEN the interview session completes, THE Session_Summary SHALL list between 1 and 5 demonstrated strengths observed during the session, each referencing a specific evaluation dimension or interaction from the session.
2. WHEN the interview session completes, THE Session_Summary SHALL list between 1 and 5 specific weaknesses observed during the session, each tied to a scored evaluation dimension where the user performed below expectations.
3. WHEN the interview session completes, THE Session_Summary SHALL identify each edge case defined in the problem that the user's solution did not handle, and for each missed edge case provide a one-sentence explanation of why it matters.
4. WHEN the interview session completes, THE Session_Summary SHALL suggest between 1 and 3 alternative or better solutions to the problem, each including the approach name, time complexity, and space complexity compared to the user's submitted solution.
5. WHEN the interview session completes, THE Session_Summary SHALL recommend between 2 and 5 specific concepts or topics to study, each directly related to a weakness or gap identified in the session.
6. WHEN the interview session completes, THE Session_Summary SHALL suggest between 2 and 5 similar problems for further practice, each including a problem title and the skill it targets.
7. WHEN the interview session completes, THE Session_Summary SHALL recommend between 1 and 3 next topics the user should focus on, each linked to a gap identified from the session's evaluation scores or follow-up discussion.
8. WHEN the interview session completes, THE Session_Summary SHALL provide an improvement plan containing between 3 and 7 action items, each with a priority label (high, medium, or low) assigned based on the severity of the corresponding weakness, ordered from highest to lowest priority.
9. IF the interview session completes but the Evaluation_Engine or Interview_Conductor data is unavailable, THEN THE Session_Summary SHALL display an error indication and present only the sections derivable from available session data.

### Requirement 12: State Management and Session Persistence

**User Story:** As a user, I want my interview progress to persist during the session, so that accidental navigation or refresh does not lose my work.

#### Acceptance Criteria

1. THE Session_Store SHALL maintain the current interview context including source, problem data, and configuration as a Zustand store.
2. THE Session_Store SHALL maintain the current editor code state and preserve undo history during the session.
3. THE Session_Store SHALL maintain elapsed time and timer state (running or paused) across component re-renders.
4. THE Session_Store SHALL maintain the last submitted code and evaluation results.
5. THE Session_Store SHALL maintain the full conversation history with the Interview_Conductor so the AI has complete context for generating adaptive follow-up questions.
6. THE Session_Store SHALL maintain improved submission data when the user revises their solution after feedback.
7. THE Session_Store SHALL persist session state to browser sessionStorage so that a page refresh restores the interview to its previous state, including code content, timer elapsed time, hints consumed, and conversation history.
8. WHEN the user explicitly ends an interview session or the session completes through the scoring phase, THE Session_Store SHALL clear all persisted state from sessionStorage.
9. IF persisted session state is older than 24 hours, THEN THE Session_Store SHALL discard the stale state and start a fresh session.
