import test from "node:test";
import assert from "node:assert/strict";
import { ResourceLockManager } from "../src/agents/execution/resourceLockManager.js";

test("allows multiple agents to read the same resource", () => {
  const manager = new ResourceLockManager();

  const first = manager.tryAcquire("agent-1", ["timeline"], "read");
  const second = manager.tryAcquire("agent-2", ["timeline"], "read");

  assert.ok(first);
  assert.ok(second);

  first();
  second();
});

test("prevents two agents from writing to the same clip", () => {
  const manager = new ResourceLockManager();

  const first = manager.tryAcquire("agent-1", ["clip-123"], "write");
  const second = manager.tryAcquire("agent-2", ["clip-123"], "write");

  assert.ok(first);
  assert.equal(second, null);

  first();
});

test("prevents reading while another agent is writing", () => {
  const manager = new ResourceLockManager();

  const writer = manager.tryAcquire("editor", ["clip-123"], "write");
  const reader = manager.tryAcquire("analyzer", ["clip-123"], "read");

  assert.ok(writer);
  assert.equal(reader, null);

  writer();
});

test("releases locks so another agent can acquire them", () => {
  const manager = new ResourceLockManager();

  const first = manager.tryAcquire("agent-1", ["clip-123"], "write");
  assert.ok(first);

  first();

  const second = manager.tryAcquire("agent-2", ["clip-123"], "write");
  assert.ok(second);

  second();
});

test("releases all locks owned by an agent", () => {
  const manager = new ResourceLockManager();

  const first = manager.tryAcquire("agent-1", ["clip-1", "clip-2"], "write");
  assert.ok(first);

  manager.releaseAll("agent-1");

  assert.equal(manager.getActiveLocks().length, 0);

  const second = manager.tryAcquire("agent-2", ["clip-1"], "write");
  assert.ok(second);

  second();
});
