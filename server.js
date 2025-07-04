const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const port = process.env.PORT || 8080;
const io = new Server(server);

app.get("/", (req, res) => {
    res.sendFile(__dirname + "/public/index.html");
})

server.listen(port, () => {
    console.log("Server Port: " + port);
})

var players = {}

io.on("connection", (socket) => {
    console.log("New client connected: ", socket.id);
    socket.on("join_game", (name) => {
        console.log("Join game requested from socket: " + socket.id + " with name: " + name);
        players[socket.id] = {
            id: socket.id,
            name: name,
            ready: false,
            score: 0
        };

        console.log(`Player added (${socket.id}) as \"${name}\"!`);
    });
})