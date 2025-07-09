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
var isGameOngoing = false;

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
    isGameOngoing = true;
    const set = generateRandomSet();
    const tasks = Object.keys(players).map(id =>
        playerLoop(id, set)
    );
    await Promise.all(tasks); // wait for all players to finish
    gameFinish();
}

async function playerLoop(id, questions) {
    const socket = await getSocketById(id);
    if (!socket) return;
    if (!players[id]) {
        console.log("Player (" + id + ") not found in the players array. Skipping.");
        return;
    }
    for (const question of questions) {
        players[id].question_answer = question.answer;
        await new Promise(resolve => {
            var finished = false;
            console.log(question.answer);
            socket.emit("new_question", question.text, question.answer.charAt(0), () => {
                if (!finished) {
                    finished = true;
                    //clearTimeout(timer);
                    resolve();
                }
            });
            /*const timer = setTimeout(() => {
                if (!finished) {
                    finished = true;
                    socket.emit("time_up");
                    resolve();
                }
            }, 2 * 60 * 1000);*/
        });
    }
    players[id].complete = true;
    socket.emit("questions_complete");
}

function gameFinish() {
    io.emit("game_over");
    for (const id in players) {
        delete players[id]
    }
    isGameOngoing = false;
}

io.on("connection", async (socket) => {
    console.log("New client connected: ", socket.id);
    socket.on("ping", (callback) => {
        callback();
    })
    socket.on("join_game", (name, callback) => {
        console.log("Join game requested from socket: " + socket.id + " with name: " + name);
        for (const id in players) {
            console.log(id, players[id].name, name);
            if (players[id].name == name) {
                console.log("Player (" + socket.id + ") tried joining with duplicate name \"" + name + "\"!");
                callback({ status: false, error: "Somebody already has the same name as you!" });
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
            complete: false
        };

        console.log(`Player added (${socket.id}) as \"${name}\"!`);
        callback({status: true})
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