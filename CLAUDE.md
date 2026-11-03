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

## The team (subagents in `.claude/agents/`)
Use them in this order. Give each one the inputs its file asks for; it starts with no context.
- `growth-analyst`: reads insights and returns the rules for the next reel.
- `topic-scout`: scores topics for shares and researches the pick with two sources per claim.
- `hook-writer`: writes the script, with a hook that works on frame 0.
- `art-director`: an independent review of the preview sheet, and again of the final frames.
- `fact-checker`: an independent check of every on-screen claim and of the caption, before posting.

## One reel, end to end
1. **Data and topic.** Run `growth-analyst`, then `topic-scout`. A number with only one source never goes on screen.
2. **Script.** Run `hook-writer`. Put one line per cue in `engine/scripts/<name>.txt`, about 35–50 words in total (15–22 s). The first line is the hook question, and the last line mirrors it.
   - **Frame 0 shows the whole hook question**, big and already moving. It is not built word by word.
   - Something surprising happens in the first second.
3. **Voice.** Run `cd /home/claude/engine3d && python3 vo.py <name>`. It writes `<name>_voice.wav` and `<name>_timing.json` with word onsets.
4. **Page.** Copy `aw.html` (x-ray mechanism format) or `nf.html` (one-element-many-jobs format) to `<name>.html` and rebuild the scene.
   - Beats come from word onsets (`wordT`).
   - Each page exposes `setTimeline`, `renderAt`, `shotTimes`, `getEvents` and `getBeats`.
   - The signature ending is in `hit.js`.
5. **Preview.** Run `python3 preview.py <name>.html <name>_timing.json t1,t2,... sheet.jpg` (include t=0.0). Then run `art-director` on the sheet and fix what it finds. Run `fact-checker` on the script, supers and caption.
6. **Finish.** Run `mkdir -p engine/deliver`, then `bash finish.sh <name>`. It renders, mixes the music and SFX, masters to −14 LUFS, runs the motion audit, and writes `deliver/howitticks_<name>_ig.mp4`.
7. **Publish.** Copy the `_ig.mp4` to `reels/<name>.mp4` and push it. Then post it to @howitticks.tv from the built-in browser of the Claude desktop app.
   - This needs Matan's computer linked to the session.
   - @howitticks.tv is the only account permitted.
8. **Log.** Add the reel to `content-log.md` in the Project. After 24 hours, add its metrics.

## Hard rules
- Use no logos, no real people's photos, and no film stills.
- Turn on Instagram's AI label, because the narration is a synthetic voice.
- SFX must be clean and tonal, with no noise or hiss.
- Every reel goes out as a Trial Reel once the account qualifies (about 200 followers).
