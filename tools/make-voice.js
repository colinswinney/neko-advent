#!/usr/bin/env node
/* Makes one audio file per spoken line using a macOS voice, fully offline.
 *
 *   node tools/make-voice.js                    # best installed voice
 *   node tools/make-voice.js --voice "Zoe (Premium)"
 *   node tools/make-voice.js --list             # show English voices
 *   node tools/make-voice.js --force            # remake every file (e.g. after changing voice)
 *
 * Nicer voices: System Settings → Accessibility → Spoken Content → System voice → Manage Voices…
 * → English → download "Ava (Premium)" or "Zoe (Premium)", then re-run with --force.
 */
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { allLines } = require('../shared/days.js');

// How the voice should SAY tricky words (spelling only changes the audio, not the screen).
// Tweak these and re-run with --force if anything sounds off.
const PRONOUNCE = {
  Neko: 'Neeko',
  Sinterklaas: 'Sinter-klaass',
  Ozosnel: 'Oh-zo-snell',
  Pepernoten: 'Payper-noaten',
  dobok: 'doe-bok',
  'Hi-yah': 'Hee-yah',
  Hana: 'Hah-nah',
  Dul: 'Dool',
  Daseot: 'Dah-sut',
  Yeoseot: 'Yuh-sut',
  Ilgop: 'Eel-gop',
  Rumi: 'Roo-mee',
  'K-pop': 'K pop',
};
const PREFERRED = ['Ava (Premium)', 'Zoe (Premium)', 'Evan (Premium)', 'Ava (Enhanced)', 'Zoe (Enhanced)', 'Samantha (Enhanced)', 'Allison (Enhanced)', 'Samantha'];
const RATE = 170; // words per minute — a little slower for a 6-year-old

const args = process.argv.slice(2);
const flag = (f) => args.includes(f);
const opt = (f) => { const i = args.indexOf(f); return i >= 0 ? args[i + 1] : null; };

const installed = execFileSync('say', ['-v', '?']).toString().split('\n')
  .map((l) => l.match(/^(.+?)\s{2,}(\w\w_\w\w)/)).filter(Boolean)
  .map((m) => ({ name: m[1].trim(), lang: m[2] })).filter((v) => v.lang.startsWith('en_'));

if (flag('--list')) { installed.forEach((v) => console.log(v.lang, ' ', v.name)); process.exit(0); }

const has = (name) => installed.some((v) => v.name === name || v.name.startsWith(name + ' ('));
const voice = opt('--voice') || PREFERRED.find(has) || 'Samantha';
console.log('Voice:', voice);

const outDir = path.join(__dirname, '..', 'audio');
fs.mkdirSync(outDir, { recursive: true });
const tmp = path.join(require('os').tmpdir(), 'neko-voice.aiff');

const fileFor = (text) => {
  const slug = text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);
  const hash = crypto.createHash('md5').update(voice + '|' + text).digest('hex').slice(0, 6);
  return `${slug}-${hash}.m4a`;
};
const spoken = (text) => {
  let t = text.replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{200D}]/gu, '').replace(/\s+/g, ' ').trim();
  for (const [w, say] of Object.entries(PRONOUNCE)) t = t.replace(new RegExp(`\\b${w.replace('-', '\\-')}\\b`, 'gi'), say);
  return t.replace(/GOLDEN/g, 'golden').replace(/FREEZE/g, 'freeze');
};

const manifest = {};
let made = 0;
for (const line of allLines()) {
  const file = fileFor(line);
  manifest[line] = file;
  const dest = path.join(outDir, file);
  if (fs.existsSync(dest) && !flag('--force')) continue;
  execFileSync('say', ['-v', voice, '-r', String(RATE), '-o', tmp, spoken(line)]);
  execFileSync('afconvert', ['-f', 'm4af', '-d', 'aac', tmp, dest]);
  made++;
  process.stdout.write('.');
}

// tidy up files from older runs that are no longer used
const keep = new Set(Object.values(manifest));
for (const f of fs.readdirSync(outDir)) if (f.endsWith('.m4a') && !keep.has(f)) fs.unlinkSync(path.join(outDir, f));

fs.writeFileSync(path.join(outDir, 'manifest.js'),
  `/* made by tools/make-voice.js — voice: ${voice} */\nwindow.ADVENT_AUDIO = ${JSON.stringify(manifest, null, 1)};\n`);
console.log(`\nDone: ${made} new, ${Object.keys(manifest).length} lines total → audio/`);
