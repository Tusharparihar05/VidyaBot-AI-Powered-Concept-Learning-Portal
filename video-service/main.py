from fastapi import FastAPI, BackgroundTasks, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field
from openai import OpenAI
import os, re, subprocess, sys, traceback, tempfile

from moviepy_stitch import stitch_video

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
# { chatId: { status, progress, error, error_code } }
jobs: dict[str, dict] = {}

class VideoRequest(BaseModel):
    chatId: str
    question: str
    explanation_text: str = ""
    video_script: str = ""
    key_points: list[str] = Field(default_factory=list)

# ── Helpers ───────────────────────────────────────────────────────────────────

def set_job(chatId: str, status: str, progress: int = 0, error: str = "", error_code: str = ""):
    jobs[chatId] = {"status": status, "progress": progress, "error": error, "error_code": error_code}


MAX_VOICEOVER_WORDS = 280  # ~1.5–2.0 min at ~130–160 wpm
MIN_VOICE_SCRIPT_CHARS = 72


def _clean_key_points(points: list[str]) -> list[str]:
    out: list[str] = []
    for p in points or []:
        t = str(p).strip()
        if t and t not in ("—", "-", "–"):
            out.append(t)
    return out[:8]


def strip_markdown_for_speech(s: str) -> str:
    """Light cleanup so edge-tts does not read markdown/LaTeX decorations."""
    t = " ".join(str(s).split())
    t = re.sub(r"\*\*([^*]+)\*\*", r"\1", t)
    t = re.sub(r"\*([^*]+)\*", r"\1", t)
    t = re.sub(r"`([^`]+)`", r"\1", t)
    t = re.sub(r"#{1,6}\s+", "", t)
    t = re.sub(r"\$\$?[^$]*\$+\$?", " ", t)
    t = re.sub(r"\\(?:frac|times|cdot|rightarrow|to|pm|sqrt)\b", " ", t, flags=re.I)
    t = re.sub(r"\\[a-zA-Z]+\*?", " ", t)
    return " ".join(t.split()).strip()


def excerpt_first_words(text: str, max_words: int = MAX_VOICEOVER_WORDS) -> str:
    text = strip_markdown_for_speech(text)
    text = " ".join(text.split())
    words = text.split()
    if len(words) <= max_words:
        return text
    cut = words[:max_words]
    return " ".join(cut).rstrip(",;:") + "."


def resolve_voiceover_narration(req: VideoRequest) -> str:
    """
    Prefer the short teacher video_script (~1–2 min). Never read the full essay by default.
    """
    q = (req.question or "").strip()
    script = strip_markdown_for_speech(req.video_script or "")
    if len(script) >= MIN_VOICE_SCRIPT_CHARS:
        return excerpt_first_words(script, MAX_VOICEOVER_WORDS)

    pts = _clean_key_points(req.key_points)
    if pts:
        summary = f"{q} " if q else ""
        summary += "Here is a concise overview. " + ". ".join(pts[:5])
        if summary[-1] not in ".!?":
            summary += "."
        return excerpt_first_words(summary, MAX_VOICEOVER_WORDS)

    body = (req.explanation_text or "").strip()
    if body:
        return excerpt_first_words(body, MAX_VOICEOVER_WORDS)

    return (q or "This lesson covers your question.").replace('"', "'")[:400]


def build_manim_context(req: VideoRequest) -> str:
    """Short context for Manim — aligned with summary, not the whole answer."""
    script = strip_markdown_for_speech(req.video_script or "")
    if len(script) >= 40:
        q = (req.question or "")[:500]
        return f"{q}\n\n{script[:1600]}"

    pts = _clean_key_points(req.key_points)
    if pts:
        return f"{(req.question or '')[:500]}\nKey ideas: " + " | ".join(pts)[:1400]

    return (req.explanation_text or "")[:1600]


def _clip_user_text(text: str, max_len: int = 280) -> str:
    t = " ".join(str(text).split())
    if len(t) <= max_len:
        return t
    return t[: max_len - 1].rstrip() + "…"


def user_message_for_ai_failure(exc: BaseException) -> str:
    return _clip_user_text(f"The AI service could not generate the animation script ({exc})", 260)


def user_message_for_manim_failure(stderr: str | None, stdout: str | None) -> tuple[str, str]:
    """Map Manim stderr/stdout to a short UI string and machine-readable error_code."""
    err = (stderr or "").strip()
    out = (stdout or "").strip()
    combined = f"{err}\n{out}".strip()
    lower = combined.lower()

    if not combined:
        return "Animation rendering failed (Manim produced no output).", "manim_render"

    # Top-level `manim --help` (wrong CLI / no `render` subcommand)
    if "usage: manim [options] command" in lower or "usage: manim [options] command [args]..." in lower:
        return (
            "Video renderer misconfigured: the server must invoke Manim with the render subcommand. "
            "Restart the video service after updating.",
            "manim_cli",
        )

    if "no module named 'manim'" in lower or "no module named manim" in lower:
        return (
            "Manim is not installed in the Python environment used by the video service (port 8001).",
            "manim_missing",
        )

    # Mixture of subcommand blurbs usually means CLI printed help instead of rendering
    if (
        len(combined) > 600
        and "subcommand" in lower
        and "checkhealth" in lower
        and "plugins" in lower
    ):
        return (
            "Manim did not run a render job (it printed help text instead). Check video-service logs and Manim version.",
            "manim_cli",
        )

    if ("latex" in lower or "mathtex" in lower or "dvipng" in lower) and (
        "error" in lower or "failed" in lower or "not found" in lower
    ):
        return _clip_user_text(
            "A LaTeX-dependent object was still used (e.g. MathTex). Retry generation, or install BasicTeX/MacTeX if you add LaTeX-based scenes.",
            300,
        ), "manim_latex"

    if "traceback" in lower:
        tail_lines = [ln.strip() for ln in combined.splitlines() if ln.strip()]
        for ln in reversed(tail_lines[-40:]):
            if any(k in ln for k in ("Error", "Exception", "SyntaxError", "TypeError", "ValueError", "AttributeError")):
                return _clip_user_text(ln, 280), "manim_render"
        return (
            "Manim crashed while rendering. See the video service terminal for the full traceback.",
            "manim_render",
        )

    # Last resort: first line of stderr, clipped (never dump full help)
    first_line = err.splitlines()[0] if err else out.splitlines()[0] if out else "Unknown error"
    return _clip_user_text(first_line, 280), "manim_render"

def get_manim_output_path(chatId: str) -> str:
    # Manim -ql outputs to media/videos/<filename>/480p15/<ClassName>.mp4
    return os.path.join(TEMP_DIR, "media", "videos", f"temp_scene_{chatId}", "480p15", "GeneratedScene.mp4")

def cleanup(chatId: str):
    for f in [os.path.join(TEMP_DIR, f"temp_scene_{chatId}.py"), os.path.join(TEMP_DIR, f"temp_audio_{chatId}.mp3")]:
        try:
            os.remove(f)
        except FileNotFoundError:
            pass


def cairo_safe_manim_code(manim_code: str) -> str:
    """MathTex/Tex call LaTeX on the host. Swap to Text() so Cairo renders without TeX."""
    code = manim_code
    code = code.replace("SingleLineMathTex(", "Text(")
    code = code.replace("MathTex(", "Text(")
    code = code.replace("MathTex (", "Text(")
    code = re.sub(r"(?<![A-Za-z])Tex\s*\(", "Text(", code)
    return code


# ── Generate Manim script via NVIDIA NIM ──────────────────────────────────────

def generate_manim_script(question: str, context_summary: str, chatId: str) -> str:
    """Call NVIDIA NIM (OpenAI-compatible) to generate a Manim script."""
    ctx = (context_summary or "")[:1600]
    prompt = f"""You are an expert Manim Community v0.18 animator creating a beautiful, step-by-step educational math animation.

TOPIC: {question}
CONTEXT (short summary / lesson beats — NOT the full textbook answer): {ctx}

NO LATEX: This video renderer has NO TeX/LaTeX installed. You MUST NOT use MathTex, Tex, SingleLineMathTex, or any LaTeX. Use Text() for every formula and label. Prefer readable Unicode: π × ÷ ± ≤ ≥ ≠ √ ² ³ ⁰¹⁴⁵⁶⁷⁸⁹, words like "sum", "sqrt", or plain fractions like "a / b".

ALLOWED OBJECTS (use ONLY these):
  Text("text", font_size=32, color=BLUE)
  SurroundingRectangle(obj, color=YELLOW, buff=0.2)
  NumberPlane()
  Axes(x_range=[-5,5,1], y_range=[-4,4,1], axis_config={{"color": BLUE}})
  Circle(radius=1, color=RED, fill_opacity=0.3)
  Rectangle(height=2, width=3, color=BLUE, stroke_width=2)
  Line(start=LEFT, end=RIGHT, color=GREEN)
  Arrow(start=LEFT*2, end=RIGHT*2, color=ORANGE, buff=0.1)
  Dot(color=YELLOW)
  Brace(obj, direction=DOWN)
  VGroup(a, b).arrange(DOWN, buff=0.3)

ALLOWED METHODS: .scale(n) .shift(v) .to_edge(UP/DOWN/LEFT/RIGHT) .next_to(obj,dir,buff=n) .move_to(point) .set_color(color) .arrange(dir,buff=n) .add_background_rectangle(color=BLUE,opacity=0.3,buff=0.2) ax.c2p(x, y) (NEVER use ax.get_point)

ALLOWED ANIMATIONS: Write(obj) Create(obj) FadeIn(obj) FadeOut(obj) GrowArrow(arrow) GrowFromCenter(obj) self.wait(n) self.play(*[FadeOut(m) for m in self.mobjects])

FORMULA EXAMPLES (Text only): Text("E = mc²", font_size=40) | Text("x² + bx + c = 0", font_size=36) | Text("balance = height(left) − height(right)", font_size=32)

STRUCTURE — write EXACTLY this pattern (6 sections, each section fades out before next):

class GeneratedScene(Scene):
    def construct(self):
        # ── Section 1: Colorful Title ──
        title = Text("TOPIC TITLE", font_size=44, color=BLUE_D)
        sub = Text("Brief description", font_size=26, color=GRAY)
        sub.next_to(title, DOWN, buff=0.3)
        self.play(Write(title), FadeIn(sub))
        self.wait(1.5)
        self.play(*[FadeOut(m) for m in self.mobjects])

        # ── Section 2: Key Formula in Highlighted Box ──
        formula = Text("KEY FORMULA IN PLAIN TEXT / UNICODE", font_size=40, color=WHITE)
        box = SurroundingRectangle(formula, color=YELLOW, buff=0.25)
        lbl = Text("Key Formula", font_size=22, color=YELLOW)
        lbl.next_to(box, UP, buff=0.15)
        self.play(Write(formula), Create(box), Write(lbl))
        self.wait(2)
        self.play(*[FadeOut(m) for m in self.mobjects])

        # ── Section 3: Step-by-Step Solution ──
        s1 = Text("Step 1: ...", font_size=30, color=GREEN).to_edge(UP)
        e1 = Text("step 1 expression", font_size=34)
        self.play(Write(s1))
        self.play(Write(e1))
        self.wait(1)
        s2 = Text("Step 2: ...", font_size=30, color=ORANGE)
        s2.next_to(e1, DOWN, buff=0.5)
        e2 = Text("step 2 expression", font_size=34)
        e2.next_to(s2, DOWN, buff=0.3)
        self.play(Write(s2), Write(e2))
        self.wait(1.5)
        self.play(*[FadeOut(m) for m in self.mobjects])

        # ── Section 4: Visual / Graph ──
        # (Use Axes + parametric curve OR geometric shape relevant to topic)
        # Example with Axes:
        ax = Axes(x_range=[-3,3,1], y_range=[-2,5,1], axis_config={{"color": BLUE_D}})
        ax.scale(0.7)
        curve_lbl = Text("Graph", font_size=24, color=TEAL).to_edge(UP)
        self.play(Create(ax), Write(curve_lbl))
        self.wait(2)
        self.play(*[FadeOut(m) for m in self.mobjects])

        # ── Section 5: Final Answer Highlighted ──
        ans = Text("FINAL ANSWER", font_size=46, color=GREEN_D)
        ans_box = SurroundingRectangle(ans, color=GREEN, buff=0.3)
        check = Text("Solution", font_size=30, color=GREEN)
        check.next_to(ans_box, UP, buff=0.2)
        self.play(GrowFromCenter(ans), Create(ans_box), Write(check))
        self.wait(2)
        self.play(*[FadeOut(m) for m in self.mobjects])

        # ── Section 6: Key Takeaways ──
        pts = VGroup(
            Text("Key point 1", font_size=26, color=WHITE),
            Text("Key point 2", font_size=26, color=WHITE),
            Text("Key point 3", font_size=26, color=WHITE),
        ).arrange(DOWN, buff=0.35)
        header = Text("Key Takeaways", font_size=32, color=BLUE_D)
        header.next_to(pts, UP, buff=0.4)
        self.play(Write(header), FadeIn(pts))
        self.wait(2)

RULES:
- Replace ALL CAPS placeholders with content specific to: {question}
- Every formula MUST be inside a SurroundingRectangle where the template shows it
- Each section MUST end with self.play(*[FadeOut(m) for m in self.mobjects]) (except last)
- To get coordinates on Axes, use ax.c2p(x, y). NEVER use ax.get_point()
- If topic has no graph relevance, replace Section 4 with a geometric shape or numeric example
- The final video targets roughly 90–120 seconds of spoken overview. Keep on-screen steps concise; use self.wait(2.5)–self.wait(4) between major beats so pacing matches a ~1–2 minute voiceover.
- The visuals MUST follow the CONTEXT summary (title → core idea → one example → takeaway), not every detail of a long written answer.
- EVERY section MUST be unique and cover different concepts. DO NOT repeat the exact same text or formula.
- The visual sequence MUST align with the CONTEXT teaching beats.
- Max 90 lines total
- NEVER output MathTex, Tex, or LaTeX commands
- Output ONLY the class definition — NO imports, NO markdown, NO extra text"""

    print(f"[{chatId}] Requesting Manim script from NVIDIA NIM ({NVIDIA_MODEL})...")

    response = nvidia_client.chat.completions.create(
        model=NVIDIA_MODEL,
        messages=[
            {"role": "system", "content": "You are an expert Manim animation programmer. The runtime has NO LaTeX: never use MathTex or Tex, only Text() for math. Output ONLY valid Python for Manim Community Edition. No markdown, no explanations."},
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

    return cairo_safe_manim_code(raw)

# ── Core generation pipeline ──────────────────────────────────────────────────

def generate_manim_video(req: VideoRequest):
    chatId = req.chatId
    print(f"\n{'='*60}\n[{chatId}] Starting video generation pipeline\n{'='*60}")
    set_job(chatId, "queued", 5)

    # ── Step 1: Generate Manim script via NVIDIA NIM ──────────────────────────
    set_job(chatId, "rendering", 10)
    try:
        manim_ctx = build_manim_context(req)
        manim_code = generate_manim_script(req.question, manim_ctx, chatId)
    except Exception as e:
        print(f"[{chatId}] NVIDIA NIM error: {e}")
        traceback.print_exc()
        set_job(chatId, "failed", 0, user_message_for_ai_failure(e), "ai_provider")
        return

    # Ensure the class exists in generated code
    if "class GeneratedScene" not in manim_code:
        print(f"[{chatId}] Generated code missing GeneratedScene class. Attempting fix...")
        manim_code = f"class GeneratedScene(Scene):\n    def construct(self):\n        title = Text(\"{req.question[:50]}\", color=BLUE).scale(0.8)\n        self.play(Write(title))\n        self.wait(2)\n        self.play(FadeOut(title))\n"

    manim_code = cairo_safe_manim_code(manim_code)

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
        manim_cmd = [
            sys.executable,
            "-m",
            "manim",
            "render",
            "-ql",
            "--disable_caching",
            "--media_dir",
            os.path.join(TEMP_DIR, "media"),
            script_path,
            "GeneratedScene",
        ]
        result = subprocess.run(
            manim_cmd,
            capture_output=True,
            text=True,
            timeout=300,   # 5 min hard cap
        )
    except subprocess.TimeoutExpired:
        print(f"[{chatId}] Manim rendering timed out after 5 minutes")
        set_job(
            chatId,
            "failed",
            0,
            "Rendering took too long and was stopped (5 minute limit). Try again or simplify the topic.",
            "timeout",
        )
        cleanup(chatId)
        return

    if result.returncode != 0:
        err_blob = (result.stderr or "") + ("\n" + result.stdout if result.stdout else "")
        print(f"[{chatId}] Manim FAILED (exit {result.returncode}). Full output:\n{err_blob[-8000:]}")
        msg, code = user_message_for_manim_failure(result.stderr, result.stdout)
        set_job(chatId, "failed", 0, msg, code)
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
            set_job(
                chatId,
                "failed",
                0,
                "The animation rendered but the output file could not be found. Check disk space and video-service logs.",
                "output_missing",
            )
            cleanup(chatId)
            return

    print(f"[{chatId}] Manim render complete: {manim_output}")
    set_job(chatId, "audio", 60)

    # ── Step 3: Generate voiceover (edge-tts) ──────────────────────────────────
    print(f"[{chatId}] Generating voiceover with edge-tts...")
    clean_text = resolve_voiceover_narration(req).replace("\n", " ").replace('"', "'").strip()
    if not clean_text:
        clean_text = (req.question or "This lesson.").replace("\n", " ").replace('"', "'").strip()[:2000]

    audio_path = os.path.join(TEMP_DIR, f"temp_audio_{chatId}.mp3")
    audio_result = None
    try:
        audio_result = subprocess.run(
            [
                sys.executable,
                "-m",
                "edge_tts",
                "--voice",
                "en-IN-NeerjaNeural",
                "--text",
                clean_text,
                "--write-media",
                audio_path,
            ],
            capture_output=True,
            text=True,
            timeout=300,
        )
        has_audio = audio_result.returncode == 0 and os.path.isfile(audio_path)
    except subprocess.TimeoutExpired:
        print(f"[{chatId}] edge-tts timed out after 300s — proceeding without audio")
        has_audio = False
    except Exception as e:
        print(f"[{chatId}] edge-tts exception: {e}")
        has_audio = False

    if not has_audio:
        hint = ""
        if audio_result is not None:
            blob = ((audio_result.stderr or "") + "\n" + (audio_result.stdout or "")).strip()
            if blob:
                hint = f"\n[{chatId}] edge-tts output (last 2000 chars):\n{blob[-2000:]}"
        print(f"[{chatId}] edge-tts failed or unavailable — proceeding without audio{hint}")

    set_job(chatId, "stitching", 80)

    # ── Step 4: Combine with MoviePy (or just copy if no audio) ───────────────
    print(f"[{chatId}] Stitching video and audio...")
    final_output = os.path.join(TEMP_DIR, f"final_video_{chatId}.mp4")

    try:
        stitch_video(
            manim_output,
            final_output,
            audio_mp3=audio_path if has_audio else None,
            fps=15,
        )
        print(f"[{chatId}] ✅ Video ready: {final_output}" + ("" if has_audio else " (silent: TTS missing or failed)"))
        set_job(chatId, "ready", 100)

    except Exception as e:
        print(f"[{chatId}] MoviePy mux error: {e}")
        traceback.print_exc()
        import shutil

        shutil.copy(manim_output, final_output)
        print(f"[{chatId}] ✅ Video ready (mux failed; used silent Manim export): {final_output}")
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
    """Returns { status, progress, error, error_code }"""
    job = jobs.get(chatId)
    if job:
        return {
            "status": job.get("status", "none"),
            "progress": job.get("progress", 0),
            "error": job.get("error", ""),
            "error_code": job.get("error_code", ""),
        }
    if os.path.exists(os.path.join(TEMP_DIR, f"final_video_{chatId}.mp4")):
        return {"status": "ready", "progress": 100, "error": "", "error_code": ""}
    return {"status": "none", "progress": 0, "error": "", "error_code": ""}

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
