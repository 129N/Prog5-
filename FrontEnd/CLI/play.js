// backEnd/game-cli/play.js
import {saveRooms, getRoom, updateRoom, loadRooms } from "./room.js";

const CATS = ["WHEN", "WHERE", "WHO", "WHAT"];

// input 
function ask(rl, q) { return new Promise(res => rl.question(q, ans => res(ans.trim()))); }

//polling function to syncronise 2 tabs
export async function waitFor(conditionFn, checkInterval = 1000){
  return new Promise(resolve =>{
    const t = setInterval(async () =>{
      const ok = await conditionFn();
      if(ok){
        clearInterval(t);
        resolve();
      }
    }, checkInterval);
  });
}


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

export async function runGame(room, rl, userName, roomCode) {
  const players = [...room.players];
  const maxRounds = room.maxRounds ?? 3;
  const scores = Object.fromEntries(players.map(p => [p, 0]));
  const history = [];

  console.log("\n🎮 Starting game!");
  for (let r = 1; r <= maxRounds; r++) {
if (userName === room.host) {
  room.currentRound = r;
  updateRoom(roomCode, room);
}else {
  console.log(`⌛ Waiting for host to start round ${r}...`);
  await waitFor(() => {
    const updated = getRoom(roomCode);
    return updated.currentRound === r;
  });
}
    console.log(`\n=== 🌀 ROUND ${r} / ${maxRounds} ===`);
    const assignments = rotateAssignments(players, r - 1);
    const submissions = {};
    room.submissions = {}; // the submission has been added to room object.

    updateRoom(roomCode, room);

    console.log("🔐 Assignments (hidden from other players in real game, shown here for CLI clarity):");
    console.table(assignments);

    // Submissions
    for (const cat of CATS) {
      const author = assignments[cat];

      if(author === userName){
        const text = await ask(rl, `✏️  ${author}, enter your ${cat}: `);
        if (!text) { console.log("⚠️ Empty, try again."); return r--; }
        submissions[cat] = text;

        // save to Json
        room.submissions = room.submissions || {};
        room.submissions[cat] = { author, text };
        updateRoom(roomCode, room);
      }else{
        // need to wait until the other user finishes
        console.log(`⌛ Waiting for ${author} to submit ${cat}...`);
        await waitFor(() =>{
          const updated = getRoom(roomCode);
          return updated?.submissions?.[cat];
        });

        const updated = getRoom(roomCode);
        submissions[cat] = updated.submissions[cat].text;
      }
    }

    const sentence = makeSentence(submissions);
    console.log(`\n🧩 Sentence:\n“${sentence}”`);

    // Voting
    console.log("\n🗳️ Voting phase (no self-vote):");

 // Always reload fresh room object 
    let roomNow = getRoom(roomCode);

    //ensure votes object exists only once //if the it doesn't exist yet, create an empty object for it.
    if (!roomNow.votes) {
      roomNow.votes = {};
      updateRoom(roomCode, roomNow);
    }

    // --- Each user votes only for themselves ---
    roomNow = getRoom(roomCode);
    if(!roomNow.votes[userName]){
      let input;
      while(true){
        input = (await ask(rl, `Vote (WHEN/WHERE/WHO/WHAT), ${userName}: `)).toUpperCase();
        if (!CATS.includes(input)) { console.log("❌ Invalid category. Try again."); continue; }
        if (assignments[input] === userName) {console.log("❌ You cannot vote for your own part. Try again"); continue;}
        break;
      }

      console.log(`🗳️ Vote recorded: ${userName} → ${input}`);
      // Save user vote
      roomNow = getRoom(roomCode);
      roomNow.votes[userName] = input;
      updateRoom(roomCode, roomNow);
    }

// 2.wait until all users have finished the voting.
  
  console.log("⌛Waiting for all users to finish voting...");
  await waitFor(() => {
    const updated = getRoom(roomCode);
    return updated.votes && Object.keys(updated.votes).length === players.length;
  });
    console.log("✅ All users finished voting!");
    
    // --- Load final vote set ---s
    const finalVotes = getRoom(roomCode).votes || {};

    // Tally
    const tally = { WHEN: 0, WHERE: 0, WHO: 0, WHAT: 0 };
    for (const cat of Object.values(finalVotes)) tally[cat] = (tally[cat] || 0) + 1;

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

    // clean up stored polling data.
// After scoring, after showing round summary:
if (userName === room.host) {
  await waitFor(() => {
    const updated = getRoom(roomCode);
    return updated.roundFinished === r;
  });

  const clean = getRoom(roomCode);
  delete clean.submissions;
  delete clean.votes;
  updateRoom(roomCode, clean);
} else {
  // player marks that they reached round summary
  const mark = getRoom(roomCode);
  mark.roundFinished = r;
  updateRoom(roomCode, mark);
}


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
