# How It Ticks — production repo

This repo holds the engine and the finished reels for the Instagram page @howitticks.tv. The page is English and has a global audience.

The rules live in the claude.ai Project "פרופיל אינסטגרם". Read these docs there before any work:
- `claude/video-playbook.md`: style and quality rules (mandatory).
- `claude/growth-plan.md`: the goal and the topic bank.
- `claude/content-log.md`: what was already made and published. Never repeat a topic.

## Fresh container
```
bash engine/setup.sh        # links /home/claude/engine3d, unpacks TTS, downloads Kokoro, starts :8765
```

## One reel, end to end
1. **Research.** Check the facts against two sources. A number with only one source never goes on screen.
2. **Script.** Put one line per cue in `engine/scripts/<name>.txt`, about 50–70 words in total. The first line is the hook question, and the last line mirrors it.
3. **Voice.** Run `cd /home/claude/engine3d && python3 vo.py <name>`. It writes `<name>_voice.wav` and `<name>_timing.json` with word onsets.
4. **Page.** Copy `aw.html` (x-ray mechanism format) or `nf.html` (one-element-many-jobs format) to `<name>.html` and rebuild the scene.
   - Beats come from word onsets (`wordT`).
   - Each page exposes `setTimeline`, `renderAt`, `shotTimes`, `getEvents` and `getBeats`.
   - The signature ending is in `hit.js`.
5. **Preview.** Run `python3 preview.py <name>.html <name>_timing.json t1,t2,... sheet.jpg`. Then do an art-direction pass and fix what it finds.
6. **Finish.** Run `bash finish.sh <name>`. It renders, mixes the music and SFX, masters to −14 LUFS, runs the motion audit, and writes `deliver/howitticks_<name>_ig.mp4`.
7. **Publish.** Copy the `_ig.mp4` to `reels/<name>.mp4` and push it. Then post it to @howitticks.tv from the built-in browser of the Claude desktop app.
   - This needs Matan's computer linked to the session.
   - @howitticks.tv is the only account permitted.
8. **Log.** Add the reel to `content-log.md` in the Project. After 24 hours, add its metrics.

## Hard rules
- Use no logos, no real people's photos, and no film stills.
- Turn on Instagram's AI label, because the narration is a synthetic voice.
- SFX must be clean and tonal, with no noise or hiss.
- Every reel goes out as a Trial Reel once the account qualifies (about 200 followers).
