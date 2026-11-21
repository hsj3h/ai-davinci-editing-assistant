import 'dotenv/config';
import { createServer } from 'node:http';
import type { IncomingMessage } from 'node:http';
import { getResolveStatus } from '../resolve/resolveService.js';
import { generateEditingPlan } from '../agents/planner/editingPlanner.js';
import type { ModelSelection } from '../agents/modelManager.js';
import type { ControlMode } from '../config/controlMode.js';
import { createSupervisedPlan } from "../agents/supervisorOrchestrator.js";
import { PlanRegistry } from '../agents/planRegistry.js';

import {
  createExecutionSession,
  type ExecutionSession,
} from '../agents/execution/executionManager.js';

import { executeEditingAction } from '../agents/execution/actionExecutor.js';

import type { EditingAction } from '../agents/planner/editingPlanner.js';

const PORT = Number(process.env.PORT ?? 8765);

let activeSession: ExecutionSession | null = null;
const planRegistry = new PlanRegistry();

async function readRequestBody(req: IncomingMessage): Promise<unknown> {
  let body = '';

  for await (const chunk of req) {
    body += chunk.toString();

    if (body.length > 1024 * 1024) {
      throw new Error('Request body is too large.');
    }
  }

  return JSON.parse(body);
}

const server = createServer(async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  if (req.method === 'POST' && req.url === '/execution/stop') {
  if (!activeSession) {
    res.writeHead(400);
    res.end(JSON.stringify({
      success: false,
      error: 'No active execution session.',
    }));
    return;
  }

  activeSession.emergencyStop();

  res.writeHead(200);
  res.end(JSON.stringify({
    success: true,
    stopped: true,
    message: 'Emergency Stop activated. No further actions are allowed.',
  }));

  return;
}
if (req.method === 'POST' && req.url === '/execution/execute') {
  try {
    if (!activeSession) {
      throw new Error('Start an execution session first.');
    }

    if (activeSession.isStopped()) {
      throw new Error('Execution stopped by Emergency Stop.');
    }

    const body = await readRequestBody(req);

    if (typeof body !== 'object' || body === null) {
      throw new Error('Invalid request body.');
    }

    const input = body as Record<string, unknown>;
    const rawAction = input.action;

    if (
      typeof rawAction !== 'object' ||
      rawAction === null ||
      Array.isArray(rawAction)
    ) {
      throw new Error('A valid editing action is required.');
    }

    const action = rawAction as EditingAction;

    if (
      typeof action.id !== 'string' ||
      typeof action.type !== 'string' ||
      !Array.isArray(action.clip_targets)
    ) {
      throw new Error('Invalid editing action structure.');
    }

    let approval;

    if (
      typeof input.approval === 'object' &&
      input.approval !== null
    ) {
      const rawApproval = input.approval as Record<string, unknown>;

      if (
        typeof rawApproval.actionId === 'string' &&
        typeof rawApproval.approved === 'boolean'
      ) {
        approval = {
          actionId: rawApproval.actionId,
          approved: rawApproval.approved,
        };
      }
    }

    const result = await executeEditingAction(
      action,
      activeSession,
      approval,
    );

    res.writeHead(200);
    res.end(JSON.stringify({
      success: true,
      result,
    }));
  } catch (error) {
    res.writeHead(400);
    res.end(JSON.stringify({
      success: false,
      error: error instanceof Error
        ? error.message
        : 'Action execution failed.',
    }));
  }

  return;
} if (req.method === 'GET' && req.url === '/plans') {
  const plans = planRegistry.getAll().map((registeredPlan) => ({
    planId: registeredPlan.id,
    createdAt: registeredPlan.createdAt,
    project: registeredPlan.project,
    timeline: registeredPlan.timeline,
    summary: registeredPlan.plan.summary,
    status: registeredPlan.plan.status,
    totalTasks: registeredPlan.supervised.tasks.length,
  }));

  res.writeHead(200);
  res.end(JSON.stringify({
    success: true,
    totalPlans: plans.length,
    plans,
  }));

  return;
}
  if (req.method === 'GET' && req.url?.startsWith('/plans/')) {
  const planId = req.url.slice('/plans/'.length).split('?')[0];
  const registeredPlan = planRegistry.get(planId);

  if (!registeredPlan) {
    res.writeHead(404);
    res.end(JSON.stringify({
      success: false,
      error: 'Plan not found.',
    }));
    return;
  }

  res.writeHead(200);
  res.end(JSON.stringify({
    success: true,
    planId: registeredPlan.id,
    createdAt: registeredPlan.createdAt,
    project: registeredPlan.project,
    timeline: registeredPlan.timeline,
    plan: registeredPlan.plan,
    supervisor: {
      summary: registeredPlan.supervised.summary,
      totalTasks: registeredPlan.supervised.tasks.length,
      tasks: registeredPlan.supervised.tasks,
      readyTasks: registeredPlan.supervised.readyTasks,
    },
  }));

  return;
}

  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200);
    res.end(JSON.stringify({
      status: 'online',
      service: 'AI Integrated Editing Assistant',
      editingEnabled: false
    }));
    return;
  }
  if (req.method === 'POST' && req.url === '/execution/start') {
  try {
    const body = await readRequestBody(req);

    if (typeof body !== 'object' || body === null) {
      throw new Error('Invalid request body.');
    }

    const input = body as Record<string, unknown>;

    if (input.mode !== 'manual' && input.mode !== 'fast') {
      throw new Error('Select manual or fast execution mode.');
    }

    const controlMode = input.controlMode ?? 'api';

    if (controlMode !== 'api' && controlMode !== 'gui') {
      throw new Error('Select API Mode or GUI Mode.');
    }

    activeSession = createExecutionSession(
      input.mode,
      controlMode as ControlMode,
    );

    res.writeHead(200);
    res.end(JSON.stringify({
      success: true,
      mode: activeSession.mode,
      message: `Execution session started in ${activeSession.mode} mode.`,
    }));
  } catch (error) {
    res.writeHead(400);
    res.end(JSON.stringify({
      error: error instanceof Error
        ? error.message
        : 'Could not start execution session.',
    }));
  }
  return;
}

  if (req.method === 'GET' && req.url === '/resolve/status') {
    try {
      const status = await getResolveStatus();
      res.writeHead(200);
      res.end(JSON.stringify(status));
    } catch (error) {
      res.writeHead(503);
      res.end(JSON.stringify({
        connected: false,
        error: error instanceof Error
          ? error.message
          : 'Resolve connection failed'
      }));
    }
    return;
  }


if (req.method === 'POST' && req.url === '/ai/analyze-timeline') {
  try {
    const body = await readRequestBody(req);

    if (typeof body !== 'object' || body === null) {
      throw new Error('Invalid request body.');
    }

    const input = body as Record<string, unknown>;

    if (
      !['ollama', 'claude', 'openai'].includes(String(input.provider)) ||
      typeof input.model !== 'string' ||
      !input.model.trim() ||
      typeof input.instruction !== 'string' ||
      !input.instruction.trim()
    ) {
      throw new Error('Provide a valid provider, model and editing instruction.');
    }

    const selection: ModelSelection = {
      provider: input.provider as ModelSelection['provider'],
      model: input.model
    };

    const status = await getResolveStatus();

    if (!status.timeline) {
      throw new Error('No active DaVinci Resolve timeline found.');
    }

    // Generate the AI editing plan.
    const plan = await generateEditingPlan(
      selection,
      input.instruction,
      status.timeline
    );

    // Assign the plan's actions to specialist agents.
    const supervised = createSupervisedPlan(plan);
    const registeredPlan = planRegistry.register(
  status.project,
  status.timeline.name,
  plan,
  supervised,
);

    res.writeHead(200, {
      'Content-Type': 'application/json'
    });

    res.end(JSON.stringify({
  planId: registeredPlan.id,
  createdAt: registeredPlan.createdAt,
  project: status.project,
      timeline: status.timeline.name,
      plan,
      supervisor: {
        summary: supervised.summary,
        totalTasks: supervised.tasks.length,
        tasks: supervised.tasks,
        readyTasks: supervised.readyTasks
      }
    }));
  } catch (error) {
    res.writeHead(400, {
      'Content-Type': 'application/json'
    });

    res.end(JSON.stringify({
      error: error instanceof Error
        ? error.message
        : 'Timeline analysis failed'
    }));
  }

  return;
}


  res.writeHead(404);
  res.end(JSON.stringify({ error: 'Endpoint not found' }));
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`AI Editing Assistant running at http://127.0.0.1:${PORT}`);
});
