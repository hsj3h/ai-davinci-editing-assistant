
import json
import sys
import DaVinciResolveScript as dvr


def get_resolve():
    resolve = dvr.scriptapp("Resolve")

    if not resolve:
        raise ConnectionError("Cannot connect to DaVinci Resolve.")

    return resolve


def find_timeline_clip(timeline, unique_id):
    for track_type in ("video", "audio"):
        track_count = timeline.GetTrackCount(track_type)

        for track_index in range(1, track_count + 1):
            items = timeline.GetItemListInTrack(
                track_type, track_index
            ) or []

            for item in items:
                if item.GetUniqueId() == unique_id:
                    return {
                        "item": item,
                        "track_type": track_type,
                        "track_index": track_index,
                    }

    return None


def inspect_clip(command):
    unique_id = command.get("unique_id")

    if not isinstance(unique_id, str) or not unique_id.strip():
        raise ValueError("A valid clip unique_id is required.")

    resolve = get_resolve()
    project = resolve.GetProjectManager().GetCurrentProject()

    if not project:
        raise RuntimeError("No active DaVinci Resolve project.")

    timeline = project.GetCurrentTimeline()

    if not timeline:
        raise RuntimeError("No active timeline.")

    result = find_timeline_clip(timeline, unique_id)

    if not result:
        raise LookupError("Clip not found in the active timeline.")

    item = result["item"]

    return {
        "success": True,
        "operation": "inspect_clip",
        "clip": {
            "unique_id": item.GetUniqueId(),
            "name": item.GetName(),
            "properties": item.GetProperties() or {},
            "type": item.GetType(),
            "track_type": result["track_type"],
            "track_index": result["track_index"],
            "start_frame": item.GetStart(),
            "end_frame": item.GetEnd(),
            "duration_frames": item.GetDuration(),
        },
        "executed": False,
    }


def stabilize_clip(command):
    unique_id = command.get("unique_id")

    if not isinstance(unique_id, str) or not unique_id.strip():
        raise ValueError("A valid clip unique_id is required.")

    resolve = get_resolve()
    project = resolve.GetProjectManager().GetCurrentProject()

    if not project:
        raise RuntimeError("No active project.")

    timeline = project.GetCurrentTimeline()

    if not timeline:
        raise RuntimeError("No active timeline.")

    result = find_timeline_clip(timeline, unique_id)

    if not result:
        raise LookupError("Clip not found.")

    if result["track_type"] != "video":
        raise ValueError("Stabilization is only supported for video clips.")

    success = result["item"].Stabilize()

    return {
        "success": bool(success),
        "operation": "stabilize_clip",
        "clip_name": result["item"].GetName(),
        "unique_id": unique_id,
        "executed": bool(success),
        "message": (
            "Stabilization completed."
            if success
            else "Resolve could not stabilize this clip."
        )
    }
def execute_command(command):
    operation = command.get("operation")

    if operation == "inspect_clip":
        return inspect_clip(command)

    if operation == "inspect_properties":
        result = inspect_clip(command)
        properties = result["clip"]["properties"]

        return {
            "success": True,
            "operation": "inspect_properties",
            "clip_name": result["clip"]["name"],
            "unique_id": result["clip"]["unique_id"],
            "properties": properties,
            "executed": False,
        }

    if operation == "stabilize_clip":
        return stabilize_clip(command)

    raise ValueError(f"Unsupported operation: {operation}")



if __name__ == "__main__":
    try:
        command = json.load(sys.stdin)
        result = execute_command(command)
        print(json.dumps(result, default=str))

    except Exception as error:
        print(json.dumps({
            "success": False,
            "error": str(error),
            "executed": False,
        }))
        sys.exit(1)
