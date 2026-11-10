# Vitrina demo video (Remotion)

Everything is code: Remotion composition, Playwright + CDP recorder, voice and timing tooling. Based on `RECETA-VIDEO-DEMO.md`.

```bash
npm install
npm run studio                    # live preview
npm run render                    # out/raw.mp4
npm run finish                    # loudnorm -14 LUFS, 720p copy, duration check
npm run thumb                     # out/thumb.png
```

## State right now

- Script, theme, kinetic captions, `cue()` timing, tilted browser frames with camera, PAID stamp, drawn diagram, end card: done.
- Footage: recorded from `/demo` (landing, store, playground, orders) into `public/footage/` (git-ignored).
- **Timing is estimated** (`src/data/take.json` has `"estimated": true`). It re-flows by itself once the real voice exists.
- No voice and no music yet. `src/data/audio.json` flags `voice` and `music`.

## Pipeline

1. **Record** (app running with `pnpm dev` at the repo root):
   `npm run record` for all takes, or `npm run record -- playground orders` for some. One take = one clip.
2. **Voice**: `ELEVENLABS_API_KEY=… ELEVENLABS_VOICE_ID=… npm run voice` writes `public/audio/voice.mp3` (one continuous take). Set `"voice": true` in `src/data/audio.json`.
3. **Timings**: `npm run transcribe` (faster-whisper via uv) rewrites `src/data/take.json` with real word times.
4. **Music**: drop a licensed track at `public/audio/music.mp3`, set `"music": true`. It ducks under the voice. Credit it in the video description.
5. Re-record the takes if the cues moved a lot, tune camera keyframes in `src/shots.ts`, render and finish.

## Demo routes

The `/demo` routes are a scripted replay of the app, used to record the video without network calls.
