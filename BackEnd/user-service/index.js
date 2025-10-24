const express = require('express');
const http = require('http');
const {Server} = require('socket.io');
const cors = require('cors');
const { error } = require('console');
const { v4: uuidv4 } = require('uuid'); // generate user IDs

const app = express();
app.use(cors());
app.use(express.json());

//set up the port in this case 3001
const port = process.env.port || 3001;

// create HTTP + WebSocket serevr
const server = http.createServer(app);
const io = new Server(server, {
    cors:{origin: "*"}
});

io.on('connection', (socket)=> {
    console.log(`⚡ Client connected: ${socket.id}`);

    socket.on('disconnect', ()=> {
        console.log(`❌ Client disconnected: ${socket.id}`);  
    });
});


const users = [];

function generateToken(){
    return Math.random().toString(36).substring(2, 15);
}

//Register or login 
app.post('/login', (req, res) => {
//Generate userId[]
  const { username } = req.body;

  if (!username || username.trim() === "") {
    return res.status(400).json({ success: false, message: "Username is required" });
  }

    if(users[username]) {
        console.log(`♻️ Existing user logged in again: ${username}`);
        return res.json({success:true, user:users[username]});
    }

      // Otherwise create new user
  const user = {
    userId: uuidv4(),
    username,
    token: generateToken(),
  };

    users[username] = user;
  console.log(`🧍‍♂️ New user logged in: ${user.username} (${user.userId})`);
  console.log(`Token : ${user.token}`);
    return res.json({success : true, user });
});

//rendering zone 

app.get('/users', (req, res) => {
    res.json(users);
});

app.get('/users/:id', (req, res) => {
    const user = user.find(u => u.id === req.params.id);
    if(!user) return res.status(404).json({ error: 'User not found'});

    res.json(user);
});

app.get('/', (req, res) => {
    res.send(`User room is running on ${port}`);
});


server.listen(port, ()=> {
    console.log(`✅ Service started on http://localhost:${port}`);
});

