
import { createInterface } from "readline";
import path from "path";
import fs from "fs";
//from lobbyroom
import { lobbyMenu } from "./room.js";

const rl = createInterface({
    input: process.stdin,
    output : process.stdout,
});

// store the names on the same load space.
const FILE = path.resolve("./users.json");
function loadUsers (){
    if(!fs.existsSync(FILE)) return[];
    try { return JSON.parse(fs.readFileSync(FILE, "utf-8")); }
    catch { return []; }
}
function saveUsers(list) {
  fs.writeFileSync(FILE, JSON.stringify(list, null, 2));
}
const Names = loadUsers();

export const bar = "-----------------------------------------";

// what are those resolve, Promise?
function ask(question){
    return new Promise(resolve => rl.question(question, ans => resolve(ans.trim()) ));
}

//why would I need to add question parameter here?
async function main() {
    console.log("🎮 Welcome to the Funny Sentence Game CLI!");
    console.log(bar);
    console.log("Do you already have an account?");
    
    const answer = await ask("(y/n):");

    if(answer.toLowerCase() === "y" || answer === "Y"){
        console.log("🟢 Proceeding to login...");
        await loginFlow();
    }else if (answer.toLowerCase() === "n") {
    console.log("🆕 Proceeding to registration...");
    await registerFlow();
    } else{
        console.log("⚠️ Invalid input. Please type 'y' or 'n'.");
        return main();
    }
}


async function loginFlow() {
    console.log(bar);
    console.log("🎮 Login Area");
    console.log(bar);


    console.log(`Regsitered lists\n [${Names}]`);
    const userName = await ask(`Type your username that you registered:`);
    if(!userName){
        console.log("Invalid username!!");
        return main();
    }

    if(!Names.includes(userName)){
        console.log("⚠️ This username is not registered yet.");
        const retry = await ask("Do you want to register now? (y/n): ");
        if (retry.toLowerCase() === "y") {
        return registerFlow();
        } else {
        return main();
        }
    }

    console.log(`📝 Registered successfully as ${userName}`);
    await nextStep(userName);
}

async function registerFlow() {
    console.log("-----------------------------------------");
    console.log("🎮 Registration Area");
    console.log("-----------------------------------------");
        // type user name, but create the array list here and check the duplication.
    const userName = await ask("Choose a username to register: ");
    if(!userName){
        console.log("⚠️ Username already taken! Please choose another.");
        return main();
    }
    if (Names.includes(userName)){
    console.log(`${userName} is already taken! Please choose another`);
    return registerFlow();
    }

    //Register and save name 
    Names.push(userName);
    saveUsers(Names);
    console.log(`📝 Registered successfully as ${userName}`);
    await nextStep(userName);
}


async function nextStep(userName) {
    console.log(`\nWelcome, ${userName}!`);
    console.log("What do you want to do next?");
    console.log("1. Start a new game");
    console.log("2. Join an existing game");
    console.log("3. Exit");

    const choice = await ask("Enter your choice (1-3): ");

     switch (choice) {
    case "1":
      console.log("🚀 Going to Lobby room");
      await lobbyMenu(userName, rl);
      break;
    case "2":
      console.log("🔗 Other");
      await lobbyMenu(userName, rl);
      break;
    case "3":
      console.log("👋 Exiting. See you next time!");
      rl.close();
      return;
    default:
      console.log("⚠️ Invalid choice. Try again.");
      await nextStep(userName);
  }

  rl.close();
}

main();