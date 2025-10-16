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

    socket.io('disconnect', ()=> {
        console.log(`❌ Client disconnected: ${socket.id}`);  
    });
});


let users = [];

//Register or login 
app.post('/login', (req, res) => {

    const {username} = req.body;
    if(!username) {
        return res.status(400).json({ error: 'Username is required' });
    }

//Generate userId
    const userId = uuidv4();
    const user = {id: userId, username};
    users.push(user);

  console.log(`🧍‍♂️ New user logged in: ${username} (${userId})`);
    res.json({success : true, user });
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

