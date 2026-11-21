export type LockMode = "read" | "write";

export interface ResourceLock {
  resource: string;
  owner: string;
  mode: LockMode;
}

export class ResourceLockManager {
  private locks = new Map<string, Map<string, LockMode>>();

  tryAcquire(
    owner: string,
    resources: string[],
    mode: LockMode,
  ): (() => void) | null {
    if (!owner.trim() || resources.length === 0) {
      throw new Error("An owner and at least one resource are required.");
    }

    const uniqueResources = [...new Set(resources)].sort();

    for (const resource of uniqueResources) {
      if (!resource.trim()) {
        throw new Error("Resource identifiers cannot be empty.");
      }

      const owners = this.locks.get(resource);

      if (!owners) continue;

      for (const [existingOwner, existingMode] of owners) {
        if (existingOwner === owner) continue;

        if (mode === "write" || existingMode === "write") {
          return null;
        }
      }
    }

    for (const resource of uniqueResources) {
      let owners = this.locks.get(resource);

      if (!owners) {
        owners = new Map();
        this.locks.set(resource, owners);
      }

      owners.set(owner, mode);
    }

    let released = false;

    return () => {
      if (released) return;
      released = true;

      for (const resource of uniqueResources) {
        const owners = this.locks.get(resource);
        if (!owners) continue;

        owners.delete(owner);

        if (owners.size === 0) {
          this.locks.delete(resource);
        }
      }
    };
  }

  getActiveLocks(): ResourceLock[] {
    const result: ResourceLock[] = [];

    for (const [resource, owners] of this.locks) {
      for (const [owner, mode] of owners) {
        result.push({ resource, owner, mode });
      }
    }

    return result;
  }

  releaseAll(owner: string): void {
    for (const [resource, owners] of this.locks) {
      owners.delete(owner);

      if (owners.size === 0) {
        this.locks.delete(resource);
      }
    }
  }
}
