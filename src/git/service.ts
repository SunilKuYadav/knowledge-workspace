import { access } from 'fs/promises';
import { join } from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { executeGitAdd, executeGitCommit } from './commit';

const execAsync = promisify(exec);

/**
 * GitService handles automatic git operations for the workspace.
 * All operations are wrapped in try-catch — git failures are logged
 * but never block file saves (Requirement 8.4).
 */
export class GitService {
  private workspacePath: string;

  constructor(workspacePath: string) {
    this.workspacePath = workspacePath;
  }

  /**
   * Checks if the workspace has an initialized .git directory.
   */
  async isInitialized(): Promise<boolean> {
    try {
      await access(join(this.workspacePath, '.git'));
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Initializes a new git repository in the workspace.
   * Runs `git init` in the workspace directory.
   */
  async initialize(): Promise<void> {
    try {
      await execAsync('git init', { cwd: this.workspacePath });
    } catch (error) {
      console.error('[GitService] Failed to initialize git repository:', error);
    }
  }

  /**
   * Stages and commits a file with the given message.
   *
   * Steps:
   * 1. Check if git is initialized; auto-init if not (Requirement 8.3)
   * 2. Run git add for the file
   * 3. Run git commit with the message
   *
   * All errors are caught and logged — never thrown (Requirement 8.4).
   */
  async commitFile(filePath: string, message: string): Promise<void> {
    try {
      const initialized = await this.isInitialized();
      if (!initialized) {
        await this.initialize();
      }

      await executeGitAdd(filePath, this.workspacePath);
      await executeGitCommit(message, this.workspacePath);
    } catch (error) {
      console.error(
        `[GitService] Failed to commit file "${filePath}":`,
        error
      );
    }
  }
}
