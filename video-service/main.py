from fastapi import FastAPI, BackgroundTasks, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel
from openai import OpenAI
import os, subprocess, re, traceback, tempfile

app = FastAPI()

# ── Setup Temp Directory ───────────────────────────────────────────────────────
TEMP_DIR = os.path.join(tempfile.gettempdir(), "vidyabot_videos")
os.makedirs(TEMP_DIR, exist_ok=True)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Load API keys ──────────────────────────────────────────────────────────────
# Load .env from parent directory
from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

NVIDIA_API_KEY = os.environ.get("NVIDIA_API_KEY", "")
NVIDIA_MODEL = os.environ.get("NVIDIA_MODEL", "nvidia/llama-3.3-nemotron-super-49b-v1")

if not NVIDIA_API_KEY:
    print("⚠️  WARNING: NVIDIA_API_KEY not found in .env — video generation will fail!")

# NVIDIA NIM uses an OpenAI-compatible API
nvidia_client = OpenAI(
    base_url="https://integrate.api.nvidia.com/v1",
    api_key=NVIDIA_API_KEY,
)

# ── In-memory job tracker ──────────────────────────────────────────────────────
# { chatId: { status: 'queued'|'rendering'|'audio'|'stitching'|'ready'|'failed', progress: 0-100, error: str } }
jobs: dict[str, dict] = {}

class VideoRequest(BaseModel):
    chatId: str
    question: str
    explanation_text: str

# ── Helpers ───────────────────────────────────────────────────────────────────

def set_job(chatId: str, status: str, progress: int = 0, error: str = ""):
    jobs[chatId] = {"status": status, "progress": progress, "error": error}

def get_manim_output_path(chatId: str) -> str:
    # Manim -ql outputs to media/videos/<filename>/480p15/<ClassName>.mp4
    return os.path.join(TEMP_DIR, "media", "videos", f"temp_scene_{chatId}", "480p15", "GeneratedScene.mp4")

def cleanup(chatId: str):
    for f in [os.path.join(TEMP_DIR, f"temp_scene_{chatId}.py"), os.path.join(TEMP_DIR, f"temp_audio_{chatId}.mp3")]:
        try:
            os.remove(f)
        except FileNotFoundError:
            pass

# ── Generate Manim script via NVIDIA NIM ──────────────────────────────────────

def generate_manim_script(question: str, explanation_text: str, chatId: str) -> str:
    """Call NVIDIA NIM (OpenAI-compatible) to generate a Manim script."""
    prompt = f"""You are an expert Manim educator and animator. Write a Manim Community (v0.18+) Python script that creates a
visually stunning, step-by-step animated explanation of the following topic:

TOPIC: {question}

CONTEXT (use this to guide the explanation):
{explanation_text[:600]}

STRICT REQUIREMENTS:
1. The class MUST be named exactly `GeneratedScene` and inherit from `Scene`.
2. Start with a beautiful animated title using gradient colors.
3. Break the explanation into 4-6 clearly numbered steps.
4. Each step MUST:
   - Show a step label using Text() with a distinct color
   - Animate relevant math formulas using MathTex (use LaTeX)
   - Use Write(), FadeIn(), Create(), Transform(), ReplacementTransform(), GrowFromCenter() for smooth animations
   - Use VGroup to organize and arrange elements neatly
   - End with self.wait(1) before transitioning
5. Use FadeOut() or self.play(*[FadeOut(mob) for mob in self.mobjects]) to clear between steps.
6. Use vibrant colors: BLUE, GREEN, YELLOW, RED, ORANGE, PURPLE, TEAL, GOLD, PINK (Manim constants).
7. Do NOT use any geometric shapes (Circle, Triangle, Square, Rectangle, SurroundingRectangle).
8. Do NOT use any lines or arrows (Arrow, CurvedArrow, Line, NumberLine, Axes).
9. ONLY use `Text`, `MathTex`, and `VGroup`.
10. For layout, ONLY use `VGroup(item1, item2).arrange(DOWN)`. Do NOT use `.next_to()`, `.shift()`, `.to_edge()`, or `.get_right()`.
11. Add a conclusion step that summarizes key points.
12. Keep total animation between 60-120 seconds. Use self.wait(1) to self.wait(2) between parts.
13. Use ONLY standard Manim imports: `from manim import *` and `import numpy as np`
14. Do NOT use voice-over, narration, VideoMobject, or any external libraries.
15. Do NOT use deprecated Manim features.
16. Make sure ALL LaTeX in MathTex is VALID. Avoid special chars that break LaTeX.
17. CRITICAL: The `Text` class does NOT take a `size` argument. If you need to change text size, use `font_size` (e.g., `Text("Hello", font_size=24)`).
18. CRITICAL: Do NOT use `GRADIENT_COLORS` or `color_gradient`. Use ONLY standard solid colors like BLUE, RED, YELLOW, TEAL.
19. Ensure elements do not go off-screen. Scale them down using `.scale(0.8)` if necessary.

Output ONLY raw Python code. No markdown fences, no explanations, no comments outside the code.
Start directly with `class GeneratedScene(Scene):` — do NOT include import statements."""

    print(f"[{chatId}] Requesting Manim script from NVIDIA NIM ({NVIDIA_MODEL})...")

    response = nvidia_client.chat.completions.create(
        model=NVIDIA_MODEL,
        messages=[
            {"role": "system", "content": "You are an expert Manim animation programmer. Output ONLY valid Python code for Manim Community Edition. No markdown, no explanations."},
            {"role": "user", "content": prompt},
        ],
        temperature=0.4,
        max_tokens=4000,
    )

    raw = response.choices[0].message.content.strip()

    # Strip markdown fences if model added them
    raw = re.sub(r'^```[\w]*\n?', '', raw, flags=re.MULTILINE)
    raw = re.sub(r'\n?```$', '', raw, flags=re.MULTILINE).strip()

    # Remove any import lines the model may have included (we'll add our own)
    lines = raw.split('\n')
    filtered = []
    for line in lines:
        if line.strip().startswith('from manim import') or line.strip().startswith('import numpy'):
            continue
        filtered.append(line)
    raw = '\n'.join(filtered)

    return raw

# ── Core generation pipeline ──────────────────────────────────────────────────

def generate_manim_video(req: VideoRequest):
    chatId = req.chatId
    print(f"\n{'='*60}\n[{chatId}] Starting video generation pipeline\n{'='*60}")
    set_job(chatId, "queued", 5)

    # ── Step 1: Generate Manim script via NVIDIA NIM ──────────────────────────
    set_job(chatId, "rendering", 10)
    try:
        manim_code = generate_manim_script(req.question, req.explanation_text, chatId)
    except Exception as e:
        print(f"[{chatId}] NVIDIA NIM error: {e}")
        traceback.print_exc()
        set_job(chatId, "failed", 0, f"AI API error: {e}")
        return

    # Ensure the class exists in generated code
    if "class GeneratedScene" not in manim_code:
        print(f"[{chatId}] Generated code missing GeneratedScene class. Attempting fix...")
        manim_code = f"class GeneratedScene(Scene):\n    def construct(self):\n        title = Text(\"{req.question[:50]}\", color=BLUE).scale(0.8)\n        self.play(Write(title))\n        self.wait(2)\n        self.play(FadeOut(title))\n"

    full_code = "from manim import *\nimport numpy as np\n\n" + manim_code

    script_path = os.path.join(TEMP_DIR, f"temp_scene_{chatId}.py")
    with open(script_path, "w", encoding="utf-8") as f:
        f.write(full_code)
    print(f"[{chatId}] Manim script saved to {script_path}")
    print(f"[{chatId}] --- Generated Script Preview ---")
    preview_lines = full_code.split('\n')[:30]
    for line in preview_lines:
        print(f"  {line}")
    if len(full_code.split('\n')) > 30:
        print(f"  ... ({len(full_code.split(chr(10)))} total lines)")
    print(f"[{chatId}] --- End Preview ---")
    set_job(chatId, "rendering", 25)

    # ── Step 2: Render with Manim low quality (-ql = 480p15, fastest) ──────────
    print(f"[{chatId}] Running Manim renderer (-ql)...")
    try:
        result = subprocess.run(
            ["manim", "-ql", "--disable_caching", "--media_dir", os.path.join(TEMP_DIR, "media"), script_path, "GeneratedScene"],
            shell=True,
            capture_output=True,
            text=True,
            timeout=300,   # 5 min hard cap
        )
    except subprocess.TimeoutExpired:
        print(f"[{chatId}] Manim rendering timed out after 5 minutes")
        set_job(chatId, "failed", 0, "Rendering timed out after 5 minutes")
        cleanup(chatId)
        return

    if result.returncode != 0:
        stderr_tail = result.stderr[-2000:] if result.stderr else "No stderr"
        print(f"[{chatId}] Manim FAILED:\n{stderr_tail}")
        set_job(chatId, "failed", 0, f"Manim render error: {result.stderr[-500:]}")
        cleanup(chatId)
        return

    manim_output = get_manim_output_path(chatId)
    if not os.path.exists(manim_output):
        # Try to find the output file in case Manim put it somewhere else
        print(f"[{chatId}] Expected path not found: {manim_output}")
        print(f"[{chatId}] Manim stdout: {result.stdout[-1000:]}")
        # Search for any GeneratedScene.mp4
        for root, dirs, files in os.walk(os.path.join(TEMP_DIR, "media")):
            for file in files:
                if file == "GeneratedScene.mp4":
                    manim_output = os.path.join(root, file)
                    print(f"[{chatId}] Found video at: {manim_output}")
                    break
        if not os.path.exists(manim_output):
            set_job(chatId, "failed", 0, "Rendered file not found")
            cleanup(chatId)
            return

    print(f"[{chatId}] Manim render complete: {manim_output}")
    set_job(chatId, "audio", 60)

    # ── Step 3: Generate voiceover (edge-tts) ──────────────────────────────────
    print(f"[{chatId}] Generating voiceover with edge-tts...")
    # Use the explanation_text for narration (actual content, not teacher script)
    clean_text = req.explanation_text.replace("\n", " ").replace("\"", "'").strip()
    # Limit to ~800 words so audio doesn't massively outlast the video
    words = clean_text.split()
    if len(words) > 800:
        clean_text = " ".join(words[:800]) + "."

    audio_path = os.path.join(TEMP_DIR, f"temp_audio_{chatId}.mp3")
    try:
        audio_result = subprocess.run(
            ["edge-tts", "--voice", "en-US-ChristopherNeural", "--text", clean_text, "--write-media", audio_path],
            shell=True,
            capture_output=True,
            text=True,
            timeout=60,
        )
        has_audio = audio_result.returncode == 0 and os.path.exists(audio_path)
    except Exception as e:
        print(f"[{chatId}] edge-tts exception: {e}")
        has_audio = False

    if not has_audio:
        print(f"[{chatId}] edge-tts failed or unavailable — proceeding without audio")

    set_job(chatId, "stitching", 80)

    # ── Step 4: Combine with MoviePy (or just copy if no audio) ───────────────
    print(f"[{chatId}] Stitching video and audio...")
    final_output = os.path.join(TEMP_DIR, f"final_video_{chatId}.mp4")

    try:
        from moviepy.editor import VideoFileClip, AudioFileClip, CompositeAudioClip
        import moviepy.video.fx.all as vfx

        video_clip = VideoFileClip(manim_output)

        if has_audio:
            audio_clip = AudioFileClip(audio_path)
            if audio_clip.duration > video_clip.duration:
                video_clip = video_clip.fx(vfx.loop, duration=audio_clip.duration)
            final_clip = video_clip.set_audio(audio_clip)
        else:
            final_clip = video_clip

        final_clip.write_videofile(
            final_output,
            codec="libx264",
            audio_codec="aac" if has_audio else None,
            fps=15,
            logger=None,
        )
        print(f"[{chatId}] ✅ Video ready: {final_output}")
        set_job(chatId, "ready", 100)

    except Exception as e:
        print(f"[{chatId}] MoviePy error: {e}")
        traceback.print_exc()
        # Fallback: just rename the Manim output (no audio)
        import shutil
        shutil.copy(manim_output, final_output)
        print(f"[{chatId}] ✅ Video ready (no audio): {final_output}")
        set_job(chatId, "ready", 100)

    cleanup(chatId)
    print(f"[{chatId}] Pipeline complete.\n{'='*60}\n")


# ── API Routes ─────────────────────────────────────────────────────────────────

@app.post("/api/generate-math-video")
async def trigger_video(req: VideoRequest, background_tasks: BackgroundTasks):
    """Kick off video generation in the background. Returns immediately."""
    if jobs.get(req.chatId, {}).get("status") in ("queued", "rendering", "audio", "stitching"):
        return {"message": "Already processing", "chatId": req.chatId}
    # Delete stale final video so we can regenerate
    stale = os.path.join(TEMP_DIR, f"final_video_{req.chatId}.mp4")
    if os.path.exists(stale):
        os.remove(stale)
    set_job(req.chatId, "queued", 2)
    background_tasks.add_task(generate_manim_video, req)
    return {"message": "Video generation started", "chatId": req.chatId}

@app.get("/api/video/status/{chatId}")
async def video_status(chatId: str):
    """Returns { status, progress, error }"""
    job = jobs.get(chatId)
    if job:
        return job
    # If a final video already exists from a previous run
    if os.path.exists(os.path.join(TEMP_DIR, f"final_video_{chatId}.mp4")):
        return {"status": "ready", "progress": 100, "error": ""}
    return {"status": "none", "progress": 0, "error": ""}

@app.get("/api/video/{chatId}")
async def get_video(chatId: str):
    file_path = os.path.join(TEMP_DIR, f"final_video_{chatId}.mp4")
    if os.path.exists(file_path):
        return FileResponse(
            file_path,
            media_type="video/mp4",
            headers={"Accept-Ranges": "bytes"},   # enables browser seeking
        )
    raise HTTPException(status_code=404, detail="Video not found or not yet ready")

# Trigger reload
