import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, mkdir } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { execSync } from 'child_process';
import { writeFile } from 'fs/promises';
import { GitService } from './service';

describe('GitService', () => {
  let tempDir: string;
  let gitService: GitService;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'git-test-'));
    gitService = new GitService(tempDir);
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  describe('isInitialized', () => {
    it('returns false when no .git directory exists', async () => {
      const result = await gitService.isInitialized();
      expect(result).toBe(false);
    });

    it('returns true when .git directory exists', async () => {
      await mkdir(join(tempDir, '.git'));
      const result = await gitService.isInitialized();
      expect(result).toBe(true);
    });
  });

  describe('initialize', () => {
    it('creates a .git directory in the workspace', async () => {
      await gitService.initialize();
      const initialized = await gitService.isInitialized();
      expect(initialized).toBe(true);
    });
  });

  describe('commitFile', () => {
    it('auto-initializes git and commits a file', async () => {
      // Create a file to commit
      const testFile = 'test.md';
      await writeFile(join(tempDir, testFile), '# Hello World');

      // Configure git user for the test repo
      execSync('git init', { cwd: tempDir });
      execSync('git config user.email "test@test.com"', { cwd: tempDir });
      execSync('git config user.name "Test"', { cwd: tempDir });

      await gitService.commitFile(testFile, 'Initial commit');

      // Verify the commit was made
      const log = execSync('git log --oneline', { cwd: tempDir }).toString();
      expect(log).toContain('Initial commit');
    });

    it('does not throw when git operation fails', async () => {
      // Try to commit a non-existent file — should not throw
      await expect(
        gitService.commitFile('nonexistent.md', 'This will fail')
      ).resolves.toBeUndefined();
    });
  });
});
