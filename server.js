const express = require("express");
const path = require("path");
const http = require("http");
const { Server } = require("socket.io");
const fs = require("fs");

const app = express();
const server = http.createServer(app);
const port = process.env.PORT || 8080;
const io = new Server(server);

app.use(express.static(path.join(__dirname, "public")));
app.get("/", (req, res) => {
    res.sendFile(__dirname + "/public/index.html");
})

console.log("Welcome to WordGuessr server v1.0.0!");

const raw = fs.readFileSync("formatted.jsonl", "utf-8");
const paragraphs = raw.split("\n").filter(Boolean).map(line => JSON.parse(line));

console.log("Loaded " + paragraphs.length + " quotes.");

server.listen(port, () => {
    console.log("Server Port: " + port);
})

var players = {}

var currentRound = 0;
const maxRounds = 16;
let currentQuestion = null;

function randomSentence() {
    return paragraphs[Math.floor(Math.random() * paragraphs.length)];
}

async function getSocketById(socketId) {
    const sockets = await io.in(socketId).fetchSockets();
    if (sockets.length > 0) {
        return sockets[0];
    } else {
        return null;
    }
}

function generateRandomSet() {
    return Array.from({ length: 16 }, () => randomSentence());
}

async function beginGame() {
    const set = generateRandomSet();
    for (const id of Object.keys(players)) {
        const socket = await getSocketById(id);
        if (!socket) continue;

        for (const question of set) {
            players[id].question_answer = question.answer;
            await new Promise(resolve => {
                socket.emit("new_question", question, () => {
                    resolve();
                })
            })
        }
    }
}

io.on("connection", async (socket) => {
    console.log("New client connected: ", socket.id);
    socket.on("join_game", (name) => {
        console.log("Join game requested from socket: " + socket.id + " with name: " + name);
        for (const id in players) {
            console.log(id, players[id].name, name);
            if (players[id].name == name) {
                console.log("Player (" + socket.id + ") tried joining with duplicate name \"" + name + "\"!");
                socket.emit("join_error", "Somebody already has the same name as you!");
                return;
            }
        }
        players[socket.id] = {
            id: socket.id,
            name: name,
            ready: false,
            score: 0,
            question_answer: "",
            last_question_complete: false,
        };

        console.log(`Player added (${socket.id}) as \"${name}\"!`);
        io.emit("lobby_update", Object.values(players));
    });
    socket.on("disconnect", () => {
        delete players[socket.id];
        console.log("Client disconnected and removed from player list: " + socket.id);
        io.emit("lobby_update", Object.values(players));
    });
    socket.on("leave_lobby", () => {
        delete players[socket.id];
        console.log("Player left lobby: " + socket.id);
        io.emit("lobby_update", Object.values(players));
    });
    socket.on("ready", () => {
        players[socket.id].ready = true;
        console.log("Player ready up: " + socket.id);
        io.emit("lobby_update", Object.values(players));
        var count = 0;
        var limit = Object.keys(players).length;
        for (const player in players) {
            if (players[player].ready == true) count += 1;
        }
        if (count == limit) {
            io.emit("start_game");
            beginGame();
        }
    });
    socket.on("enter_fill_entry", (text) => {
        const answer = players[socket.id].question_answer;
        if (text.toLowerCase() == answer.toLowerCase()) {
            players[socket.id].last_question_complete = true;
            socket.emit("fill_entry_complete");
        }
    });
})