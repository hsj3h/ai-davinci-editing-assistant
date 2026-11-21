
import { randomUUID } from "node:crypto";
import { db } from "../database/database.js";
import type { EditingPlan } from "./planner/editingPlanner.js";
import {
  createSupervisedPlan,
  type SupervisedPlan,
} from "./supervisorOrchestrator.js";

export interface RegisteredPlan {
  id: string;
  createdAt: string;
  project: string;
  timeline: string;
  plan: EditingPlan;
  supervised: SupervisedPlan;
}

interface PlanRow {
  id: string;
  created_at: string;
  project: string;
  timeline: string;
  plan_json: string;
}

export class PlanRegistry {
  register(
    project: string,
    timeline: string,
    plan: EditingPlan,
    supervised: SupervisedPlan,
  ): RegisteredPlan {
    if (!project.trim() || !timeline.trim()) {
      throw new Error("Project and timeline are required.");
    }

    const registered: RegisteredPlan = {
      id: randomUUID(),
      createdAt: new Date().toISOString(),
      project,
      timeline,
      plan,
      supervised,
    };

    const savePlan = db.transaction(() => {
      db.prepare(`
        INSERT INTO plans (
          id, created_at, project, timeline,
          summary, status, plan_json
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        registered.id,
        registered.createdAt,
        project,
        timeline,
        plan.summary,
        plan.status,
        JSON.stringify(plan),
      );

      const saveTask = db.prepare(`
        INSERT INTO agent_tasks (
          id, plan_id, agent_id, capability,
          description, status, task_json
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);

      for (const task of supervised.tasks) {
        saveTask.run(
          task.id,
          registered.id,
          task.agentId,
          task.capability,
          task.description,
          task.status,
          JSON.stringify(task),
        );
      }
    });

    savePlan();

    return registered;
  }

  private restore(row: PlanRow): RegisteredPlan {
    const plan = JSON.parse(row.plan_json) as EditingPlan;
    const supervised = createSupervisedPlan(plan);

    return {
      id: row.id,
      createdAt: row.created_at,
      project: row.project,
      timeline: row.timeline,
      plan,
      supervised,
    };
  }

  get(planId: string): RegisteredPlan | undefined {
    const row = db.prepare(`
      SELECT id, created_at, project, timeline, plan_json
      FROM plans
      WHERE id = ?
    `).get(planId) as PlanRow | undefined;

    return row ? this.restore(row) : undefined;
  }

  getAll(): RegisteredPlan[] {
    const rows = db.prepare(`
      SELECT id, created_at, project, timeline, plan_json
      FROM plans
      ORDER BY created_at DESC
    `).all() as PlanRow[];

    return rows.map((row) => this.restore(row));
  }

  delete(planId: string): boolean {
    const result = db.prepare(`
      DELETE FROM plans WHERE id = ?
    `).run(planId);

    return result.changes > 0;
  }

  get size(): number {
    const result = db.prepare(`
      SELECT COUNT(*) AS total FROM plans
    `).get() as { total: number };

    return result.total;
  }
}
