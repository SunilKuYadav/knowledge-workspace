# Requirements Document

## Introduction

The Adaptive Self-Test feature transforms the existing simple 3-question self-test into a comprehensive, multi-phase adaptive assessment system. The assessment validates real understanding of topics through progressive difficulty levels, ties directly to topic progress/status management, uses AI for interactive modular assessment sessions, persists all assessment data in the knowledge-workspace filesystem (alongside the topic folder), manages runtime session flow via Zustand, and provides detailed feedback that can drive topic content updates. The self-test is always scoped to the current topic (its content, category, tags) and the user's configured experience level (5/10/15 YOE).

## Glossary

- **Assessment_Engine**: The client-side system responsible for orchestrating multi-phase adaptive assessment sessions, managing session state, and coordinating AI interactions.
- **Session_Store**: The Zustand store that manages runtime session state (current phase, navigation, loading states, in-progress answers). The Session_Store reads initial data from and writes completed data back to the workspace filesystem. It does NOT use localStorage for persistence.
- **Assessment_Repository**: The server-side file-based repository responsible for reading and writing assessment data (assessment-history.json) within the topic's workspace folder (notes/{category}/{slug}/assessment-history.json).
- **Assessment_Record**: A single completed self-test record containing session date, questions with user answers, AI expected answers, per-question feedback, per-phase scores, overall Confidence_Score, and identified weak areas. Multiple Assessment_Records can exist per topic.
- **Phase**: A distinct stage within an assessment session. Phases progress in order: Conceptual → Multiple Choice → Applied/Code Challenge → Final Evaluation.
- **Confidence_Score**: A numeric value from 1.0 to 5.0 (in 0.5 increments) computed from assessment performance, used to determine topic completion eligibility.
- **Topic_Status**: The progression state of a topic: "not-started", "in-progress", or "completed".
- **Assessment_Phase_Type**: One of "conceptual", "mcq", "applied", or "code-challenge", representing the question category within a phase.
- **Feedback_Report**: A structured AI-generated summary produced at the end of an assessment session containing scores, strengths, weaknesses, and improvement suggestions.
- **Content_Update_Context**: The combination of current topic content and feedback report data passed to the AI for generating content improvements.
- **Experience_Level**: The user's configured years of experience (5, 10, or 15 YOE) stored in prompt-config.json, used to calibrate question difficulty and depth.

## Requirements

### Requirement 1: Manual Topic Status Transition to In-Progress

**User Story:** As a user, I want to manually mark a topic as "in-progress" via a button, so that I can indicate I have started studying a topic without needing to complete an assessment.

#### Acceptance Criteria

1. WHEN the user clicks the "Mark In-Progress" button on a topic with status "not-started", THE System SHALL update the topic status to "in-progress" via TopicService.updateTopic() and disable the button until the request completes to prevent duplicate submissions
2. WHILE a topic has status "in-progress" or "completed", THE System SHALL hide the "Mark In-Progress" button from the topic detail page
3. WHEN the topic status update succeeds, THE System SHALL display the updated status badge reflecting "in-progress" without requiring a page reload
4. IF the topic status update fails, THEN THE System SHALL re-enable the "Mark In-Progress" button, retain the current "not-started" status display, and show an error message indicating the status could not be updated

### Requirement 2: Topic Completion Gate via Assessment Confidence

**User Story:** As a user, I want topic completion to require achieving a confidence score of at least 4.5/5 through the adaptive assessment, so that "completed" status reflects verified understanding.

#### Acceptance Criteria

1. WHEN an assessment session produces a Confidence_Score of 4.5 or higher, THE Assessment_Engine SHALL display a "Mark as Completed" button within the session summary, allowing the user to confirm topic completion
2. WHEN the user clicks the "Mark as Completed" button after achieving Confidence_Score >= 4.5, THE Assessment_Engine SHALL update the topic status to "completed" via TopicService.updateTopic(), persist a RevisionEntry with the confidence value rounded to the nearest integer (1-5) to the revision system, and display the updated topic status without requiring page reload
3. WHILE a topic has status "not-started", THE Assessment_Engine SHALL disable the assessment start action and display a message indicating the topic must be marked as "in-progress" before an assessment can be started
4. IF an assessment session produces a Confidence_Score below 4.5, THEN THE Assessment_Engine SHALL display the numeric score, a per-phase score breakdown, and a list of up to 5 specific areas for improvement, while retaining the topic status as "in-progress"
5. IF the TopicService.updateTopic() call or the revision system write fails when the user confirms completion, THEN THE Assessment_Engine SHALL display an error message indicating the status update failed, retain the current topic status unchanged, and allow the user to retry the action

### Requirement 3: Multi-Phase Assessment Structure

**User Story:** As a user, I want the assessment to have multiple progressive phases with different question types, so that the experience simulates a real exam or interview.

#### Acceptance Criteria

1. THE Assessment_Engine SHALL structure each assessment session into exactly four phases in order: Conceptual (open-ended questions), MCQ (multiple choice questions), Applied (scenario-based problems), and Code Challenge (algorithm/implementation tasks)
2. WHEN the user has submitted answers to all questions in a phase, THE Assessment_Engine SHALL compute a phase score as the average of individual question scores scaled to 0-10 (rounded to one decimal place) and advance the user to the next phase
3. THE Assessment_Engine SHALL generate exactly 2-3 questions per phase, for a total of 8-12 questions per session, with each question generated via a single AI API call scoped to that phase
4. WHEN generating questions for a phase, THE Assessment_Engine SHALL include the topic's current confidence rating (1-5), the user's configured experience level (5/10/15 YOE from prompt-config.json), the topic category, and topic tags to determine difficulty where confidence 1-2 maps to easy, 3 maps to medium, and 4-5 maps to hard, then adjust by experience level (15 YOE shifts one level harder, 5 YOE shifts one level easier, clamped to easy/hard bounds)
5. IF the user scores below 3/10 on the Conceptual phase, THEN THE Assessment_Engine SHALL display an early-exit prompt offering to end the session with a list of 2-5 specific study recommendations derived from the failed questions
6. IF the user declines the early-exit prompt after scoring below 3/10 on the Conceptual phase, THEN THE Assessment_Engine SHALL proceed to the MCQ phase with difficulty reduced by one level from the baseline

### Requirement 4: AI-Powered Question Generation

**User Story:** As a user, I want questions to be AI-generated and contextually relevant to my topic content, so that the assessment validates my actual understanding of what I have studied.

#### Acceptance Criteria

1. WHEN generating questions for a phase, THE Assessment_Engine SHALL send a modular AI request containing the topic title, category, tags, current phase type, the user's configured experience level (from prompt-config.json), and topic content (notes, overview, and patterns artifacts) truncated to a maximum of 12,000 characters if the combined content exceeds that limit
2. THE Assessment_Engine SHALL make one focused AI API call per phase (not one call for the entire session), keeping each request scoped to generating questions for a single phase type
3. WHEN generating MCQ questions, THE Assessment_Engine SHALL produce exactly 4 options per question with exactly one correct answer, and SHALL validate the AI response against a Zod schema requiring a question string, an options array of exactly 4 strings, a correctIndex integer (0-3), and an explanation string
4. WHEN generating Code Challenge questions, THE Assessment_Engine SHALL include a problem statement, expected input/output format, and 1-3 example test cases each containing input, expected output, and an explanation
5. IF the AI API call for a phase fails or returns an invalid response that does not conform to the expected Zod schema, THEN THE Assessment_Engine SHALL retry the request once, and if the retry also fails, display an error message indicating question generation failed and offer the user the option to retry manually or skip the current phase
6. IF the topic has no notes, overview, or patterns content available, THEN THE Assessment_Engine SHALL generate questions based on the topic title, category, and tags alone, and indicate to the user that adding study content would improve question relevance

### Requirement 5: Session State Management and Workspace Persistence

**User Story:** As a user, I want my assessment data persisted in the workspace filesystem so that completed tests are permanently stored alongside my topic, and I want my in-progress session recoverable if I accidentally refresh the page.

#### Acceptance Criteria

1. THE Session_Store SHALL manage only runtime session state in memory via Zustand: current phase, current answers being typed, navigation between phases, loading states, and evaluation results for the active session. The Session_Store SHALL NOT use localStorage as a persistence layer.
2. WHEN a new assessment session starts, THE Assessment_Engine SHALL create an initial checkpoint record in the workspace filesystem at notes/{category}/{slug}/assessment-history.json containing session ID, start timestamp, topic ID, experience level, and status "in-progress", via a server action
3. WHEN the user completes each phase within a session, THE Assessment_Engine SHALL update the in-progress checkpoint in assessment-history.json with the phase questions, user answers, AI expected answers, per-question feedback, and phase score via a server action
4. WHEN the user returns to a topic that has an in-progress assessment record (status "in-progress") in assessment-history.json, THE Assessment_Engine SHALL offer to resume from the last saved checkpoint phase or start a new session
5. WHEN a session completes (final evaluation phase reached), THE Assessment_Engine SHALL update the assessment record status from "in-progress" to "completed" in assessment-history.json, storing the full Feedback_Report, overall Confidence_Score, and completion timestamp
6. IF a write to assessment-history.json fails, THEN THE Assessment_Engine SHALL continue operating with in-memory state in the Session_Store, display a warning indicating data could not be saved, and retry the write on the next phase completion
7. THE Assessment_Engine SHALL store at most one in-progress session per topic in assessment-history.json; starting a new session for a topic that already has an in-progress record SHALL prompt the user to either resume the existing session or discard it and start fresh

### Requirement 6: Interactive Answer Submission and Evaluation

**User Story:** As a user, I want each answer evaluated immediately with detailed feedback, so that I learn from mistakes during the assessment rather than only at the end.

#### Acceptance Criteria

1. WHEN the user submits an answer to a Conceptual or Applied question, THE Assessment_Engine SHALL send the question text, user response, topic title, topic category, and relevant notes content to the AI for evaluation in a single focused API call with a 30-second timeout
2. WHEN the user selects an MCQ answer, THE Assessment_Engine SHALL evaluate correctness locally by comparing against the known correct answer and within 500 milliseconds reveal whether the selection is correct, display the correct answer explanation, and display why each distractor is wrong (using explanations provided at question generation time)
3. WHEN evaluating a Code Challenge response, THE Assessment_Engine SHALL send the code, problem statement, and expected input/output to the AI and assess correctness, time/space complexity analysis, code quality, and edge case handling in a single focused API call with a 30-second timeout
4. WHEN the AI returns an evaluation for any question type, THE Assessment_Engine SHALL display a score (integer 0-10), feedback text (maximum 500 characters), a list of up to 5 mistakes, and up to 3 key insights
5. IF the AI evaluation API call fails or times out, THEN THE Assessment_Engine SHALL display an error message indicating evaluation is unavailable, allow the user to retry the evaluation, and preserve the user's submitted answer

### Requirement 7: Final Assessment Feedback Report

**User Story:** As a user, I want a detailed feedback report at the end of each assessment session, so that I understand my strengths, weaknesses, and know exactly what to improve.

#### Acceptance Criteria

1. WHEN all phases are completed, THE Assessment_Engine SHALL generate a Feedback_Report via a dedicated AI API call containing: overall Confidence_Score, per-phase scores (0-10), a list of 1-5 identified strengths, a list of 1-5 identified weaknesses, 2-5 study recommendations each referencing a topic content section, and suggested content updates
2. THE Assessment_Engine SHALL compute the Confidence_Score as a weighted average of normalized phase scores: Conceptual phase (20%), MCQ phase (20%), Applied phase (30%), Code Challenge phase (30%), where each phase score (0-10) is mapped to the 1.0-5.0 scale using the formula: (phase_score / 10) × 4 + 1, and the final result is rounded to the nearest 0.5 increment
3. THE Feedback_Report SHALL identify a phase as a weak area when its score is below 5/10, and map each weak area to one or more topic content sections (overview, notes, patterns, mistakes) that should be reviewed or updated
4. WHEN displaying the Feedback_Report, THE Assessment_Engine SHALL present per-phase scores using progress bars and a pass/fail badge per phase, where a score of 5/10 or above is "pass" and below 5/10 is "fail"
5. IF the AI API call for Feedback_Report generation fails, THEN THE Assessment_Engine SHALL display the deterministic scores (overall Confidence_Score and per-phase scores) with an error message indicating that detailed AI feedback is unavailable, and offer a retry option

### Requirement 8: AI-Assisted Content Update from Feedback

**User Story:** As a user, I want to update my topic notes, overview, or other modules using AI assistance informed by assessment feedback, so that my study material improves based on identified gaps.

#### Acceptance Criteria

1. WHEN the Feedback_Report identifies content gaps, THE Assessment_Engine SHALL display an "Update Content" button next to each identified weak area that is mapped to a specific artifact file (overview, notes, patterns, or mistakes)
2. WHEN the user clicks an "Update Content" button, THE Assessment_Engine SHALL display a loading indicator and send the Content_Update_Context (the full content of the targeted artifact file, the Feedback_Report scores and weaknesses for that area, and the specific identified gap description) to the AI via a single API call
3. WHEN the AI returns updated content, THE Assessment_Engine SHALL display a diff-style preview showing additions and modifications alongside the original content, with options to confirm or discard the update
4. WHEN the user confirms the content update, THE Assessment_Engine SHALL save the updated content via TopicRepository.saveContent() passing the topic ID and target artifact file, then trigger a git commit via GitService
5. IF the AI content generation request fails or returns no content, THEN THE Assessment_Engine SHALL display an error message indicating the update could not be generated and allow the user to retry
6. WHEN the user discards the content update from the preview, THE Assessment_Engine SHALL close the preview and retain the original artifact content unchanged

### Requirement 9: Assessment History with Multiple Test Records

**User Story:** As a user, I want to see all my past assessment records for each topic, preview any past test in detail, delete specific tests, and regenerate a new test based on weak areas from a previous test, so that I can track improvement and systematically address knowledge gaps.

#### Acceptance Criteria

1. WHEN an assessment session completes, THE Assessment_Repository SHALL append the completed Assessment_Record to the assessments array in notes/{category}/{slug}/assessment-history.json, retaining a maximum of 50 records (oldest removed first when the limit is exceeded), and trigger a git commit via GitService
2. WHEN displaying assessment history for a topic, THE Assessment_Engine SHALL read assessment-history.json from the workspace filesystem and show a chronological list of all completed Assessment_Records with session date, overall Confidence_Score, per-phase scores, and a trend indicator
3. WHEN the user selects a past Assessment_Record from the history list, THE Assessment_Engine SHALL display a detailed preview showing: each question with the user's submitted answer, the AI expected answer, the per-question score (0-10), and the per-question feedback text
4. WHEN the user requests deletion of a specific Assessment_Record, THE Assessment_Engine SHALL remove that record from assessment-history.json, trigger a git commit via GitService, and update the displayed history list without requiring a page reload
5. WHEN the user requests to regenerate a test from a past Assessment_Record, THE Assessment_Engine SHALL extract the weak areas (phases scored below 5/10) and incorrectly answered questions from that record, and start a new assessment session with questions targeted at those specific weak areas and topics
6. THE Assessment_Engine SHALL calculate the trend indicator from the last 3 or more completed sessions: "improving" if the average Confidence_Score of the latest 3 sessions exceeds the average of the preceding 3 sessions by at least 0.5, "declining" if it is lower by at least 0.5, and "stable" otherwise
7. IF fewer than 3 completed Assessment_Records exist for a topic, THEN THE Assessment_Engine SHALL display the history list without a trend indicator
8. WHEN an assessment session completes, THE Assessment_Engine SHALL create a RevisionEntry with the computed Confidence_Score as the confidence value, the session date as the date, and the note "assessment-session", then invoke addRevisionEntry to update the topic's spaced repetition schedule in revision.json
9. IF reading or writing assessment-history.json fails, THEN THE Assessment_Engine SHALL display an error message indicating history could not be loaded or saved, and offer a retry option
10. THE Assessment_Engine SHALL allow the user to start a completely new self-test for a topic regardless of existing history, generating fresh questions based on the current topic content, category, tags, and the user's configured experience level

### Requirement 10: Adaptive Difficulty Calibration

**User Story:** As a user, I want the assessment difficulty to adapt based on my performance within a session, so that the system accurately identifies my knowledge boundaries.

#### Acceptance Criteria

1. WHEN the user scores 8/10 or higher on a phase and the current difficulty is below hard, THE Assessment_Engine SHALL increase the difficulty of subsequent phase questions by one level (easy to medium, or medium to hard)
2. WHEN the user scores 4/10 or lower on a phase and the current difficulty is above easy, THE Assessment_Engine SHALL decrease the difficulty of subsequent phase questions by one level (hard to medium, or medium to easy)
3. WHEN the user scores between 5/10 and 7/10 (inclusive) on a phase, THE Assessment_Engine SHALL maintain the current difficulty level for subsequent phases
4. WHEN generating questions for any phase after the first, THE Assessment_Engine SHALL include the previous phase scores, the current adjusted difficulty level, and the questions that were answered incorrectly in the AI generation request
5. WHEN generating the first phase (Conceptual), THE Assessment_Engine SHALL derive the initial difficulty from the topic's existing confidence rating (confidence 1-2 maps to easy, confidence 3 maps to medium, confidence 4-5 maps to hard) combined with the user's configured experience level (from prompt-config.json)
6. IF the current difficulty is already at hard and the user scores 8/10 or higher, THEN THE Assessment_Engine SHALL maintain hard difficulty for subsequent phases
7. IF the current difficulty is already at easy and the user scores 4/10 or lower, THEN THE Assessment_Engine SHALL maintain easy difficulty for subsequent phases
