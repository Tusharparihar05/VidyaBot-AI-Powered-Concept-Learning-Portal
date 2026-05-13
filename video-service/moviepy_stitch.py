"""Mux Manim MP4 with TTS audio. Supports MoviePy 1.x (moviepy.editor) and 2.x (no editor)."""

from __future__ import annotations


def _safe_close(clip) -> None:
    if clip is None:
        return
    try:
        close = getattr(clip, "close", None)
        if callable(close):
            close()
    except Exception:
        pass


def stitch_video(
    manim_mp4: str,
    final_mp4: str,
    *,
    audio_mp3: str | None = None,
    fps: int = 15,
) -> None:
    has_audio = bool(audio_mp3)

    try:
        from moviepy.editor import AudioFileClip, VideoFileClip
        import moviepy.video.fx.all as vfx
    except ImportError:
        from moviepy import AudioFileClip, VideoFileClip
        from moviepy.video.fx import Loop

        video_clip = VideoFileClip(manim_mp4)
        if has_audio:
            audio_clip = AudioFileClip(audio_mp3)
            if audio_clip.duration > video_clip.duration:
                video_clip = video_clip.with_effects([Loop(duration=audio_clip.duration)])
            final_clip = video_clip.with_audio(audio_clip)
        else:
            final_clip = video_clip
        final_clip.write_videofile(
            final_mp4,
            codec="libx264",
            fps=fps,
            logger=None,
            audio=has_audio,
            audio_codec="aac" if has_audio else None,
        )
        _safe_close(final_clip)
        _safe_close(video_clip)
        if has_audio:
            _safe_close(audio_clip)
        return

    video_clip = VideoFileClip(manim_mp4)
    if has_audio:
        audio_clip = AudioFileClip(audio_mp3)
        if audio_clip.duration > video_clip.duration:
            video_clip = video_clip.fx(vfx.loop, duration=audio_clip.duration)
        final_clip = video_clip.set_audio(audio_clip)
    else:
        final_clip = video_clip

    final_clip.write_videofile(
        final_mp4,
        codec="libx264",
        audio_codec="aac" if has_audio else None,
        fps=fps,
        logger=None,
    )
    _safe_close(final_clip)
    _safe_close(video_clip)
    if has_audio:
        _safe_close(audio_clip)
