/* Neko's Advent — all the words and day content in one place.
   Used by the page AND by tools/make-voice.js (which turns every spoken line into an audio file).
   After editing any text here, re-run:  node tools/make-voice.js */
(function (g) {
  const DAYS = [
    { icon: '⭐', title: 'Hooray, Neko!', say: 'Hi Neko! The Christmas countdown starts today! Pop eight stars to begin!', type: 'pop', cfg: { emoji: ['⭐', '🌟', '✨'], count: 8, bg: 'linear-gradient(#2b1b5e,#5b3fa8)' }, sticker: '🌟' },
    { icon: '🧜‍♀️', title: 'Mermaid Bubbles', say: 'The mermaids are blowing bubbles! Pop ten bubbles!', type: 'pop', cfg: { emoji: ['🫧', '🫧', '🐚', '🐠'], count: 10, bg: 'linear-gradient(#7fdcff,#2a7fd4)' }, sticker: '🧜‍♀️' },
    { icon: '🦄', title: 'Unicorn Match', say: 'Find the matching pairs! Tap two cards to flip them over.', type: 'match', cfg: { pairs: ['🦄', '🌈', '⭐'], back: '✨' }, sticker: '🦄' },
    { icon: '🥋', title: 'Taekwondo Time!', say: 'Put on your dobok! Kick the board five times to break it. Count in Korean with me!', type: 'kick', cfg: { taps: 5 }, sticker: '🥋' },
    { icon: '👞', title: 'Pakjesavond!', say: "It's Sinterklaas evening! Tap your shoe three times to see what Sinterklaas left!", type: 'shoe', cfg: { item: '👞', treats: ['🍫', '🍬', '🎁', '🍊', '🍪', '💌'], reveal: 'Sinterklaas came! Ozosnel ate your carrot, and Sinterklaas left you treats!' }, sticker: '🐴' },
    { icon: '🍪', title: 'Happy Sinterklaas Day!', say: 'Pepernoten are falling from the sky! Catch twelve!', type: 'pop', cfg: { emoji: ['🍪', '🍪', '🍫'], count: 12, bg: 'linear-gradient(#ffe7c2,#ffb86b)' }, sticker: '🍫' },
    { icon: '💃', title: 'Dance Freeze!', say: 'Dance like a superstar! But when the music stops, FREEZE!', type: 'dance', cfg: { dancer: '💃', moves: ['Wiggle your hips!', 'Spin around!', 'Jump jump jump!', 'Wave your arms up high!', 'Twirl like a ballerina!'] }, sticker: '💃' },
    { icon: '🐶', title: 'Pup Team Go!', say: 'If you were a rescue pup, what would your job be?', type: 'choose', cfg: { q: 'If you were a rescue pup, what would your job be?', options: [
      { e: '🚒', label: 'Fire pup', say: 'Fire pup to the rescue! Whoosh goes the water hose!' },
      { e: '🚓', label: 'Police pup', say: 'Police pup on the case! Keeping everyone safe!' },
      { e: '🚁', label: 'Sky pup', say: 'Sky pup is flying high! I can see the whole town!' },
      { e: '🌊', label: 'Water pup', say: 'Water pup! Splash! Saving the sea turtles!' }] }, sticker: '🐾' },
    { icon: '💖', title: 'Pink Pop Party', say: 'Pop the pink and black hearts, K-pop style!', type: 'pop', cfg: { emoji: ['💖', '💗', '🩷', '🖤'], count: 10, bg: 'linear-gradient(#1a1a1a,#ff4fa3)' }, sticker: '💖' },
    { icon: '🎈', title: 'Keepy Uppy!', say: "Don't let the balloon touch the floor! Tap it to keep it up!", type: 'keepy', cfg: { item: '🎈', goal: 8 }, sticker: '🎈' },
    { icon: '🐱', title: 'Kitty Dollhouse', say: 'Which room should the kitties play in today?', type: 'choose', cfg: { q: 'Which room should the kitties play in today?', options: [
      { e: '🧁', label: 'Kitchen', say: "Let's bake sparkly cat cupcakes! Meow!" },
      { e: '🛁', label: 'Bathroom', say: 'Splish splash, bubble bath time!' },
      { e: '🎨', label: 'Craft room', say: "Let's make glitter art! Sparkle sparkle!" },
      { e: '🌸', label: 'Fairy garden', say: "Let's plant a magic fairy flower!" }] }, sticker: '🐱' },
    { icon: '🎤', title: 'Shake It Like Shakira!', say: 'Dance party! Dance like Shakira, and freeze when the music stops!', type: 'dance', cfg: { dancer: '🪇', moves: ['Shake your hips!', 'Hands up high!', 'Stomp stomp stomp!', 'Shimmy your shoulders!', 'Spin and wave!'] }, sticker: '🪇' },
    { icon: '🥇', title: 'Super Kick!', say: 'This board is extra tough! Kick it six times!', type: 'kick', cfg: { taps: 6 }, sticker: '🥇' },
    { icon: '❄️', title: 'Snow Day!', say: "It's snowing! Catch twelve snowflakes!", type: 'pop', cfg: { emoji: ['❄️', '❄️', '☃️'], count: 12, bg: 'linear-gradient(#cfe9ff,#7fb4ea)' }, sticker: '☃️' },
    { icon: '🌈', title: 'Unicorn Makeover', say: "What color should the unicorn's mane be?", type: 'choose', cfg: { q: "What color should the unicorn's mane be?", options: [
      { e: '🌈', label: 'Rainbow', say: 'A rainbow mane! So magical!' },
      { e: '💜', label: 'Purple', say: 'Purple and sparkly! Beautiful!' },
      { e: '💗', label: 'Pink', say: 'Pink, pink, pink! Gorgeous!' },
      { e: '💙', label: 'Blue', say: 'Ocean blue, like a mermaid tail!' }] }, sticker: '🌈' },
    { icon: '🐚', title: 'Mermaid Memory', say: 'Help the mermaid find the matching pairs!', type: 'match', cfg: { pairs: ['🧜‍♀️', '🐚', '🐠', '🐙'], back: '🫧' }, sticker: '🐚' },
    { icon: '⚡', title: 'Golden Dance Party', say: "Sing it loud, you're golden! Dance like a demon hunter, and freeze when the music stops!", type: 'dance', cfg: { dancer: '🎤', moves: ["Sing it loud, you're GOLDEN!", 'Point to the sky like Rumi!', 'Hunter kick!', 'Spin with sparkles!', 'Jump like a superstar!'] }, sticker: '🎤' },
    { icon: '🎄', title: 'Deck the Tree', say: 'Catch the shiny ornaments for the Christmas tree!', type: 'pop', cfg: { emoji: ['🔴', '🟡', '🟢', '🔵', '⭐'], count: 12, bg: 'linear-gradient(#0f5132,#1f8a4c)' }, sticker: '🎄' },
    { icon: '⛄', title: 'Build a Snowman', say: "Let's build a snowman with Waddles! Tap the snow to add each piece!", type: 'build', cfg: { steps: [
      { part: 'base', say: 'A big snowball!' },
      { part: 'middle', say: 'A middle snowball!' },
      { part: 'head', say: 'A little head!' },
      { part: 'face', say: 'Two eyes and a carrot nose!' },
      { part: 'hat', say: 'A fancy hat!' },
      { part: 'scarf', say: 'A cozy scarf!' },
      { part: 'arms', say: 'Stick arms! Hello, snowman!' }] }, sticker: '🐧' },
    { icon: '🧊', title: 'Ice Block Chop!', say: 'Hi-yah! Kick the ice block seven times!', type: 'kick', cfg: { taps: 7, ice: true }, sticker: '❄️' },
    { icon: '🎠', title: 'Unicorn Keepy Uppy', say: 'Keep the unicorn up in the air! Ten taps!', type: 'keepy', cfg: { item: '🦄', goal: 10 }, sticker: '🎠' },
    { icon: '🦌', title: 'Reindeer Snacks', say: "What should we leave for Santa's reindeer?", type: 'choose', cfg: { q: "What should we leave for Santa's reindeer?", options: [
      { e: '🥕', label: 'Carrots', say: 'Crunch crunch! The reindeer love carrots!' },
      { e: '🍎', label: 'Apples', say: 'Yummy apples for flying power!' },
      { e: '✨', label: 'Magic oats', say: 'Sprinkle sprinkle! Magic oats help them fly!' },
      { e: '🥬', label: 'Lettuce', say: 'Munch munch! The reindeer say thank you!' }] }, sticker: '🦌' },
    { icon: '🧝', title: 'Elf Dance Party', say: 'The elves are having a dance party! Freeze when the music stops!', type: 'dance', cfg: { dancer: '🧝', moves: ['Dance like an elf!', 'Jingle your bells!', 'Reindeer hop!', 'Wrap yourself like a present!', 'Wiggle your elf ears!'] }, sticker: '🧝' },
    { icon: '🧦', title: 'Christmas Eve!', say: 'Santa is coming tonight! Tap the stocking three times!', type: 'shoe', cfg: { item: '🧦', treats: ['🍭', '⭐', '🍫', '🎀', '🍬', '🔔'], reveal: 'Santa left a little treat early! Sleep tight, Neko!' }, sticker: '🎅' },
    { icon: '🎁', title: 'Merry Christmas, Neko!', say: 'Merry Christmas, Neko! Open all five presents!', type: 'gifts', cfg: { items: ['🦄', '🧜‍♀️', '🐶', '🎤', '🥋'] }, sticker: '🎁' },
  ].map((d, i) => Object.assign(d, { d: i + 1 }));

  // The 3D toy each day unlocks (models live in shared/toys.js, keyed by day number).
  const TOYS = [
    ['Twinkle the star', "Hi! I'm Twinkle the star! I light up the sky!"],
    ['Marina the mermaid', "Hi Neko! I'm Marina the mermaid! Splish splash!"],
    ['Sparkle the unicorn', "I'm Sparkle the unicorn! Let's fly over the rainbow!"],
    ['Kicky the taekwondo kid', "Hi-yah! I'm Kicky! Let's practice our kicks!"],
    ['Ozosnel', "Neigh! I'm Ozosnel, Sinterklaas's horse! Thank you for the carrot!"],
    ['Chocolate letter N', "I'm a chocolate letter N, for Neko! Yum yum!"],
    ['Twirl the dancer', "I'm Twirl! Let's dance and spin around!"],
    ['Pip the rescue pup', "Woof woof! I'm Pip the rescue pup! Ready for action!"],
    ['Lovey the heart', "I'm Lovey! I love you, Neko!"],
    ['Bobby the balloon', "I'm Bobby the balloon! Wheee, I can float!"],
    ['Mittens the kitty', "Meow! I'm Mittens! Want to play in the dollhouse?"],
    ['Party maracas', "Shake shake shake! We're the party maracas!"],
    ['Gold medal', "You're a champion, Neko! Gold medal!"],
    ['Flurry the snowman', "Brrr! I'm Flurry the snowman! I love snow days!"],
    ['Rainbow', "I'm a rainbow! Red, orange, yellow, green, blue, and purple!"],
    ['Pearl the shell', "I'm Pearl! I live at the bottom of the sea!"],
    ['Golden microphone', "I'm the golden microphone! Sing it loud!"],
    ['Christmas tree', "I'm the Christmas tree! Look at my shiny ornaments!"],
    ['Waddles the penguin', "Waddle waddle! I'm Waddles the penguin!"],
    ['Crystal the snowflake', "I'm Crystal the snowflake! No two snowflakes are the same!"],
    ['Carousel pony', "I'm the carousel pony! Round and round we go!"],
    ['Rudy the reindeer', "I'm Rudy the reindeer! Thanks for the yummy snacks!"],
    ['Jingle the elf', "Jingle jingle! I'm Jingle the elf! I help make the toys!"],
    ['Santa', 'Ho ho ho! Merry Christmas, Neko!'],
    ['The big present', "Surprise! I'm the big present! Merry Christmas!"],
  ];
  DAYS.forEach((d, i) => { d.toy = { name: TOYS[i][0], line: TOYS[i][1] }; });

  // Fixed lines the engine says (must match exactly what advent.js asks for).
  const PHRASES = {
    match: 'You found a match!',
    korean: [['하나', 'Hana!'], ['둘', 'Dul!'], ['셋', 'Set!'], ['넷', 'Net!'], ['다섯', 'Daseot!'], ['여섯', 'Yeoseot!'], ['일곱', 'Ilgop!']],
    broke: 'Hi-yah! You broke it!',
    freeze: 'Freeze!',
    newSticker: 'Yay! You got a new sticker!',
    newStickerNote: 'Yay! You got a new sticker! And there is a special note for you!',
    again: 'Great job!',
    againNote: 'Great job! And there is a special note for you!',
    notYet: (n) => (n === 1 ? 'Not yet! Just 1 more sleep!' : `Not yet! ${n} more sleeps!`),
    notYetMax: 60,
    toyLocked: (d) => `Open door ${d} to find me!`,
    toyBoxHello: 'Welcome to your toy box! Spin the merry-go-round!',
    tricks: ['Wheee!', 'Ta-da!', 'Again! Again!'],
  };

  // Every line that needs an audio file.
  function allLines() {
    const out = new Set();
    for (const d of DAYS) {
      out.add(d.say);
      const c = d.cfg || {};
      if (c.a) out.add(c.a);
      out.add(d.toy.line);
      out.add(PHRASES.toyLocked(d.d));
      if (c.reveal) out.add(c.reveal);
      (c.moves || []).forEach((m) => out.add(m));
      (c.options || []).forEach((o) => out.add(o.say));
      (c.steps || []).forEach((o) => out.add(o.say));
    }
    PHRASES.korean.forEach(([, r]) => out.add(r));
    ['match', 'broke', 'freeze', 'newSticker', 'newStickerNote', 'again', 'againNote'].forEach((k) => out.add(PHRASES[k]));
    for (let n = 1; n <= PHRASES.notYetMax; n++) out.add(PHRASES.notYet(n));
    out.add(PHRASES.toyBoxHello); PHRASES.tricks.forEach((t) => out.add(t));
    return [...out];
  }

  g.ADVENT_DAYS = DAYS;
  g.ADVENT_PHRASES = PHRASES;
  if (typeof module !== 'undefined') module.exports = { DAYS, PHRASES, allLines };
})(typeof window !== 'undefined' ? window : globalThis);
