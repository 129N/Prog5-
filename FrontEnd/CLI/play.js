// backEnd/game-cli/play.js

const CATS = ["WHEN", "WHERE", "WHO", "WHAT"];

function ask(rl, q) { return new Promise(res => rl.question(q, ans => res(ans.trim()))); }

function rotateAssignments(players, roundIndex) {
  // Returns map { WHEN: name, WHERE: name, WHO: name, WHAT: name }
  // If players < 4, wraps so some players get multiple categories.
  const pick = i => players[(i + roundIndex) % players.length];
  return {
    WHEN: pick(0),
    WHERE: pick(1),
    WHO:  pick(2),
    WHAT: pick(3),
  };
}

function makeSentence(sub) {
  return `${sub.WHEN}, ${sub.WHERE}, ${sub.WHO}, ${sub.WHAT}.`;
}

export async function runGame(room, rl) {
  const players = [...room.players];
  const maxRounds = room.maxRounds ?? 3;
  const scores = Object.fromEntries(players.map(p => [p, 0]));
  const history = [];

  console.log("\n🎮 Starting game!");
  for (let r = 1; r <= maxRounds; r++) {
    console.log(`\n=== 🌀 ROUND ${r} / ${maxRounds} ===`);
    const assignments = rotateAssignments(players, r - 1);
    const submissions = {};

    console.log("🔐 Assignments (hidden from other players in real game, shown here for CLI clarity):");
    console.table(assignments);

    // Submissions
    for (const cat of CATS) {
      const author = assignments[cat];
      const text = await ask(rl, `✏️  ${author}, enter your ${cat}: `);
      if (!text) { console.log("⚠️ Empty, try again."); return r--; }
      submissions[cat] = text;
    }

    const sentence = makeSentence(submissions);
    console.log(`\n🧩 Sentence:\n“${sentence}”`);

    // Voting
    console.log("\n🗳️ Voting phase (no self-vote):");
    const votes = {}; // voterName -> category
    for (const voter of players) {
      let cat = (await ask(rl, `Vote (WHEN/WHERE/WHO/WHAT), ${voter}: `)).toUpperCase();
      if (!CATS.includes(cat)) { console.log("❌ Invalid category. Try again."); voter--; continue; }
      if (assignments[cat] === voter) {
        console.log("❌ You cannot vote for your own part. Vote skipped.");
        continue;
      }
      votes[voter] = cat;
    }

    // Tally
    const tally = { WHEN: 0, WHERE: 0, WHO: 0, WHAT: 0 };
    for (const cat of Object.values(votes)) tally[cat]++;

    console.log("\n📊 Vote tally:");
    console.table(tally);

    // Scoring (1 point per vote to the author of that category)
    const pointsPerCategory = { WHEN: 0, WHERE: 0, WHO: 0, WHAT: 0 };
    for (const cat of CATS) {
      const author = assignments[cat];
      const pts = tally[cat] || 0;
      pointsPerCategory[cat] = pts;
      scores[author] += pts;
    }

    // Round summary
    console.log("\n🏆 Scores (cumulative):");
    console.table(scores);

    history.push({ round: r, sentence, pointsPerCategory });
  }

  // Game end
  console.log("\n🏁 Game over!");
  const max = Math.max(...Object.values(scores));
  const winners = Object.entries(scores)
    .filter(([_, pts]) => pts === max)
    .map(([name]) => name);

  console.log(`🥇 Winner(s): ${winners.join(", ")} with ${max} point(s)\n`);
  console.log("🗂️ Round history:");
  history.forEach(h => {
    console.log(`- Round ${h.round}: "${h.sentence}" | WHEN +${h.pointsPerCategory.WHEN}, WHERE +${h.pointsPerCategory.WHERE}, WHO +${h.pointsPerCategory.WHO}, WHAT +${h.pointsPerCategory.WHAT}`);
  });
}
