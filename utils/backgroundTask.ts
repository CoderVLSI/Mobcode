/**
 * Background Task Manager
 * Keeps agent tasks running even when app goes to background or user switches tabs
 */

import { AppState, AppStateStatus } from 'react-native';
import { AgentStep } from './autonomousAgent';

export interface BackgroundTask {
  id: string;
  type: 'agent_execution' | 'file_operation';
  status: 'running' | 'paused' | 'completed' | 'failed';
  progress: number;
  totalSteps: number;
  currentStep: string;
  startTime: number;
  data?: any;
  agentSteps?: AgentStep[]; // Persist agent steps for resuming UI
}

class BackgroundTaskManager {
  private currentTask: BackgroundTask | null = null;
  private taskStateCallbacks: Set<(task: BackgroundTask) => void> = new Set();
  private appState: AppStateStatus = 'active';
  private appStateSubscription: any = null;

  constructor() {
    // Listen to app state changes
    this.appStateSubscription = AppState.addEventListener('change', this.handleAppStateChange);
  }

  private handleAppStateChange = (nextAppState: AppStateStatus) => {
    this.appState = nextAppState;

    if (nextAppState === 'background' || nextAppState === 'inactive') {
      console.log('[BackgroundTask] App going to background, task:', this.currentTask?.id);
      // Task continues - JS execution pauses but state is preserved
      this.notifyTaskUpdate();
    } else if (nextAppState === 'active') {
      console.log('[BackgroundTask] App coming to foreground, task:', this.currentTask?.id);
      // App is active again, task should resume
      this.notifyTaskUpdate();
    }
  };

  /**
   * Start a new background task
   */
  startTask(task: Omit<BackgroundTask, 'startTime' | 'progress'>): BackgroundTask {
    const newTask: BackgroundTask = {
      ...task,
      startTime: Date.now(),
      progress: 0,
    };

    this.currentTask = newTask;
    console.log('[BackgroundTask] Task started:', newTask.id);
    this.notifyTaskUpdate();

    return newTask;
  }

  /**
   * Update the current task
   */
  updateTask(updates: Partial<BackgroundTask>): void {
    if (this.currentTask) {
      this.currentTask = { ...this.currentTask, ...updates };
      console.log('[BackgroundTask] Task updated:', this.currentTask.id, updates);
      this.notifyTaskUpdate();
    }
  }

  /**
   * Complete the current task
   */
  completeTask(result?: any): void {
    if (this.currentTask) {
      this.currentTask.status = 'completed';
      this.currentTask.progress = 100;
      console.log('[BackgroundTask] Task completed:', this.currentTask.id);
      this.notifyTaskUpdate();

      // Clear task after a delay
      setTimeout(() => {
        this.currentTask = null;
        this.notifyTaskUpdate();
      }, 5000);
    }
  }

  /**
   * Fail the current task
   */
  failTask(error?: string): void {
    if (this.currentTask) {
      this.currentTask.status = 'failed';
      console.log('[BackgroundTask] Task failed:', this.currentTask.id, error);
      this.notifyTaskUpdate();
    }
  }

  /**
   * Get the current task
   */
  getCurrentTask(): BackgroundTask | null {
    return this.currentTask;
  }

  /**
   * Check if a task is currently running
   */
  isTaskRunning(): boolean {
    return this.currentTask !== null && this.currentTask.status === 'running';
  }

  /**
   * Subscribe to task updates
   */
  onTaskUpdate(callback: (task: BackgroundTask) => void): () => void {
    this.taskStateCallbacks.add(callback);
    return () => {
      this.taskStateCallbacks.delete(callback);
    };
  }

  private notifyTaskUpdate(): void {
    if (this.currentTask) {
      this.taskStateCallbacks.forEach(callback => callback(this.currentTask!));
    }
  }

  /**
   * Clean up
   */
  destroy(): void {
    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
    }
  }
}

// Singleton instance
export const backgroundTaskManager = new BackgroundTaskManager();
