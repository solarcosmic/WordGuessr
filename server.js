/*
 * Copyright (c) 2025 solarcosmic.
 * This project is licensed under the MIT license.
 * To view the license, see <https://opensource.org/licenses/MIT>.
*/
const express = require("express");
const path = require("path");
const http = require("http");
const { Server } = require("socket.io");
const fs = require("fs");
const {version} = require("./package.json");
const yaml = require("js-yaml");

var settings = null;
try {
    const doc = yaml.load(fs.readFileSync("./settings.yml", "utf-8"));
    settings = doc;
} catch (e) {
    console.log(e);
}

const app = express();
const server = http.createServer(app);
const port = settings?.port ?? process.env.PORT ?? 8080;
const io = new Server(server);

app.use(express.static(path.join(__dirname, "public")));
app.get("/", (req, res) => {
    res.sendFile(__dirname + "/public/index.html");
})

console.log("Welcome to WordGuessr server v1.0.0!");

const raw = fs.readFileSync("formatted.jsonl", "utf-8");
const paragraphs = raw.split("\n").filter(Boolean).map(line => JSON.parse(line));

console.log("Loaded " + paragraphs.length + " quotes (m-ric/english_historical_quotes).");

server.listen(port, () => {
    console.log("=!=");
    console.log("WordGuessr is now running on port " + port + "!");
    console.log(`To access the server, you can use the Server IP:${port} or 127.0.0.1:${port} if running on the same machine.`)
    console.log("This can be changed in settings.yml.");
    console.log("=!=");
    console.log("Waiting for connections and logs.");
})

var players = {}
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
            const start = Date.now();
            socket.emit("new_question", question.text, question.answer.charAt(0), question.answer.length, question.author, () => {
                if (!finished) {
                    finished = true;
                    const duration = Date.now() - start;
                    players[id].correct_count += 1;
                    players[id].total_time += duration;
                    players[id].question_times.push(duration);
                    resolve();
                }
            })
        });
    }
    players[id].complete = true;
    socket.emit("questions_complete");
}

function gameFinish() {
    const leaderboard = Object.values(players).map(player => ({
        name: player.name,
        correct: player.correct_count,
        avg_time: player.correct_count > 0 ? Math.round(player.total_time / player.correct_count) : 0,
        total_time: player.total_time,
        score: player.correct_count
    }));
    leaderboard.sort((a, b) => b.score - a.score);
    console.log("Game has ended!", leaderboard);
    io.emit("game_over", leaderboard);
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
    socket.on("server_stats", (callback) => {
        callback("v" + version || "(unknown version)");
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
            complete: false,
            correct_count: 0,
            total_time: 0,
            question_times: []
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