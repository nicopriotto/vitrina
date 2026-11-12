# Vitrina demo video (Remotion)

Everything is code: Remotion composition, Playwright + CDP recorder, voice and timing tooling. Based on `RECETA-VIDEO-DEMO.md`.

```bash
npm install
npm run studio                    # live preview
npm run render                    # out/raw.mp4
npm run finish                    # loudnorm -14 LUFS, 720p copy, duration check
npm run thumb                     # out/thumb.png
```

## State

- Done: `out/vitrina-demo.mp4` (2:41).
- Footage recorded from `/demo` (landing, store, playground, orders) into `public/footage/` (git-ignored).
- Voice from ElevenLabs, timed with real word times in `src/data/take.json`.
- Music is original, synthesized by `tools/music/synth.py`. `src/data/audio.json` points at both files.

## Pipeline

1. **Record** (app running with `pnpm dev` at the repo root):
   `npm run record` for all takes, or `npm run record -- playground orders` for some. One take = one clip.
2. **Voice**: `ELEVENLABS_API_KEY=… ELEVENLABS_VOICE_ID=… npm run voice` writes `public/audio/voice.mp3` (one continuous take). Set `"voice": true` in `src/data/audio.json`.
3. **Timings**: `npm run transcribe` (faster-whisper via uv) rewrites `src/data/take.json` with real word times.
4. **Music**: `tools/music/synth.py` writes `public/audio/music.wav` (original, no third-party audio). It ducks under the voice.
5. Re-record the takes if the cues moved a lot, tune camera keyframes in `src/shots.ts`, render and finish.

## Demo routes

The `/demo` routes are a scripted replay of the app, used to record the video without network calls.
