import json
import DaVinciResolveScript as dvr


def get_clip_data(item, track_type, track_index, track_name):
    return {
        "name": item.GetName(),
        "unique_id": item.GetUniqueId(),
        "type": item.GetType(),
        "track_type": track_type,
        "track_index": track_index,
        "track_name": track_name,
        "start_frame": item.GetStart(),
        "end_frame": item.GetEnd(),
        "duration_frames": item.GetDuration(),
        "source_start_frame": item.GetSourceStartFrame(),
        "source_end_frame": item.GetSourceEndFrame(),
    }


def get_timeline_data(project):
    timeline = project.GetCurrentTimeline()

    if not timeline:
        return None

    settings = timeline.GetSettings() or {}
    tracks = []

    for track_type in ("video", "audio"):
        track_count = timeline.GetTrackCount(track_type)

        for track_index in range(1, track_count + 1):
            track_name = timeline.GetTrackName(track_type, track_index)
            items = timeline.GetItemListInTrack(track_type, track_index) or []

            clips = []

            for item in items:
                clips.append(
                    get_clip_data(
                        item,
                        track_type,
                        track_index,
                        track_name
                    )
                )

            tracks.append({
                "type": track_type,
                "index": track_index,
                "name": track_name,
                "clip_count": len(clips),
                "clips": clips
            })

    return {
        "name": timeline.GetName(),
        "frame_rate": settings.get("timelineFrameRate"),
        "start_frame": timeline.GetStartFrame(),
        "end_frame": timeline.GetEndFrame(),
        "tracks": tracks
    }


def get_status():
    resolve = dvr.scriptapp("Resolve")

    if not resolve:
        raise ConnectionError("Cannot connect to DaVinci Resolve")

    project = resolve.GetProjectManager().GetCurrentProject()

    if not project:
        return {
            "connected": True,
            "version": resolve.GetVersion(),
            "project": None,
            "timeline": None
        }

    return {
        "connected": True,
        "version": resolve.GetVersion(),
        "project": project.GetName(),
        "timeline": get_timeline_data(project)
    }


if __name__ == "__main__":
    try:
        print(json.dumps(get_status(), default=str))
    except Exception as error:
        print(json.dumps({"error": str(error)}))
        raise
