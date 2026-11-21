import { getAgentById } from "./agentRegistry.js";
import {
  ResourceLockManager,
  type LockMode,
} from "./execution/resourceLockManager.js";

export type TaskStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed"
  | "blocked";

export interface AgentTask {
  id: string;
  agentId: string;
  capability: string;
  description: string;
  dependencies: string[];
  resources: string[];
  lockMode: LockMode;
  status: TaskStatus;
  error?: string;
}

export class TaskCoordinator {
  private tasks = new Map<string, AgentTask>();
  private locks = new ResourceLockManager();
  private releases = new Map<string, () => void>();

  addTask(
    task: Omit<AgentTask, "status" | "error">,
  ): AgentTask {
    if (this.tasks.has(task.id)) {
      throw new Error(`Task already exists: ${task.id}`);
    }

    const agent = getAgentById(task.agentId);

    if (!agent) {
      throw new Error(`Unknown agent: ${task.agentId}`);
    }

    if (!agent.capabilities.includes(task.capability)) {
      throw new Error(
        `${agent.name} does not support ${task.capability}.`,
      );
    }

    if (!task.id.trim() || !task.description.trim()) {
      throw new Error("Task ID and description are required.");
    }

    if (task.dependencies.includes(task.id)) {
      throw new Error("A task cannot depend on itself.");
    }

    const created: AgentTask = {
      ...task,
      dependencies: [...new Set(task.dependencies)],
      resources: [...new Set(task.resources)],
      status: "pending",
    };

    this.tasks.set(created.id, created);
    return { ...created };
  }

  getReadyTasks(): AgentTask[] {
    return [...this.tasks.values()]
      .filter((task) => {
        if (task.status !== "pending") return false;

        return task.dependencies.every(
          (id) => this.tasks.get(id)?.status === "completed",
        );
      })
      .map((task) => ({ ...task }));
  }

  claimTask(taskId: string): AgentTask {
    const task = this.tasks.get(taskId);

    if (!task) {
      throw new Error(`Unknown task: ${taskId}`);
    }

    if (task.status !== "pending") {
      throw new Error(`Task is not pending: ${taskId}`);
    }

    const dependenciesReady = task.dependencies.every(
      (id) => this.tasks.get(id)?.status === "completed",
    );

    if (!dependenciesReady) {
      throw new Error(`Task dependencies are not complete: ${taskId}`);
    }

    const release = this.locks.tryAcquire(
      `${task.agentId}:${task.id}`,
      task.resources,
      task.lockMode,
    );

    if (!release) {
      throw new Error(`Required resources are locked for task: ${taskId}`);
    }

    task.status = "running";
    this.releases.set(taskId, release);

    return { ...task };
  }

  completeTask(taskId: string): AgentTask {
    const task = this.getRunningTask(taskId);
    task.status = "completed";
    this.releaseTask(taskId);
    return { ...task };
  }

  failTask(taskId: string, error: string): AgentTask {
    const task = this.getRunningTask(taskId);
    task.status = "failed";
    task.error = error;
    this.releaseTask(taskId);
    return { ...task };
  }

  getTasks(): AgentTask[] {
    return [...this.tasks.values()].map((task) => ({ ...task }));
  }

  getActiveLocks() {
    return this.locks.getActiveLocks();
  }

  private getRunningTask(taskId: string): AgentTask {
    const task = this.tasks.get(taskId);

    if (!task || task.status !== "running") {
      throw new Error(`Task is not running: ${taskId}`);
    }

    return task;
  }

  private releaseTask(taskId: string): void {
    const release = this.releases.get(taskId);

    if (release) {
      release();
      this.releases.delete(taskId);
    }
  }
}
