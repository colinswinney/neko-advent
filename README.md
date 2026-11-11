# Neko's Advent

Open `index.html` in a browser. To try every day before December, add `?preview` to the URL. It isn't saved.

- **Themes:** use the 🏠 🧜‍♀️ 🎤 buttons in the bottom-left. Progress and stickers are shared between themes.
- **Grown-up mode:** tap the big title 5 times quickly, or press `Shift+P`. From there you can set a pretend date, unlock all doors, write a note for any day, or reset.
- **Voice:** the spoken lines are audio files in `audio/`, made offline with a Mac voice.
  - After you change any text in `shared/days.js`, run `node tools/make-voice.js`.
  - To use a better voice, download one first: System Settings → Accessibility → Spoken Content → System voice → Manage Voices → English → "Ava (Premium)" or "Zoe (Premium)". Then run `node tools/make-voice.js --force`.
  - Run `node tools/make-voice.js --list` to see the voices on this Mac.
  - To fix how a word sounds, edit the `PRONOUNCE` list at the top of `tools/make-voice.js`. "Neko" is spelled "Neeko" there. Then re-run with `--force`.
- **Toy Box:** every finished day unlocks a 3D toy. Open it with the 🎠 button in the bottom-right, by tapping a sticker shelf, or with "Put it in my toy box!" after a game.
  - She can swipe to spin the merry-go-round and tap a toy to bring it up close.
  - Each tap makes the toy do a trick and talk. Swiping turns the toy around.
  - The toy models are in `shared/toys.js`, one `BUILD[n]` per day. They're built from simple shapes, so there are no image files.
  - The 3D library is saved in `vendor/three.min.js`, so it works offline.
