/*
 * Copyright (c) 2025 solarcosmic.
 * This project is licensed under the MIT license.
 * To view the license, see <https://opensource.org/licenses/MIT>.
 */
const socket = io();
console.log("Attempting to connect...");
socket.on("connect", () => {
    console.log("Connected! Socket id: " + socket.id);
    ping();
    socket.emit("server_stats", (version) => {
        document.getElementById("credits").textContent = "WordGuessr server " + version;
    })
});
socket.on("connect_error", err => {
    console.error("Socket failed to connect: " + err);
})
window.onload = () => {
    const loader = document.getElementById("loader");
    setTimeout(() => {
        loader.classList.add("hidden");
        refreshPing();
    }, 1000);
}

const joinForm = document.getElementById("join_game_form");
var joinedGame = false;
var isInMatch = false;

function clearErr() {
    const err = document.getElementById("join_error");
    err.textContent = "";
    err.style.display = "none";
}

joinForm.addEventListener("submit", async function(event) {
    event.preventDefault();

    const playerName = document.getElementById("codename");
    const nameValue = playerName.value;

    console.log("Form submitting: " + nameValue);
    joinGame(nameValue);
});

function joinGame(nameValue) {
    clearErr();
    socket.timeout(5000).emit("join_game", nameValue, (err, response) => {
        if (err) {
            doError("\"" + err + "\". The server may be down?");
        } else {
            if (response.status == true) {
                joinedGame = true;
                const waiting_lobby = document.getElementById("waiting-lobby");
                const game_over = document.getElementById("game-over");
                waiting_lobby.style.display = "block";
                game_over.style.display = "none";
            } else {
                doError(response.error);
            }
            return;
        }
    })
}

socket.off("fill_entry_complete").on("fill_entry_complete", () => {
    if (curQuestionCallback) {
        curQuestionCallback(true);
    }
});

let curQuestionCallback = null;

function doError(err) {
    const join_err_object = document.getElementById("join_error");
    join_err_object.textContent = "Uh oh! " + err;
    join_err_object.style.display = "block";
}

socket.on("join_error", (err) => { // here if needed
    doError(err);
});

socket.on("lobby_update", (players) => {
    const lobby_players = document.getElementById("lobby-players");
    const waiting_lobby = document.getElementById("waiting-lobby");
    const game_over = document.getElementById("game-over");
    lobby_players.innerHTML = "";
    if (isInMatch) return;
    for (const player of players) {
        const playerDiv = document.createElement("div");
        playerDiv.classList.add("lobby-player");
        playerDiv.textContent = player["name"];
        lobby_players.appendChild(playerDiv);
        if (player["id"] == socket.id) {
            playerDiv.textContent += " (You!)";
            const leave_btn = document.createElement("button");
            leave_btn.setAttribute("id", "leave-btn");
            const leave_img = document.createElement("img");
            leave_img.src = "/assets/right-from-bracket-solid.svg";
            leave_img.alt = "Leave";
            leave_img.classList.add("svg-img-button");
            leave_btn.appendChild(leave_img);
            leave_btn.addEventListener("click", () => {
                socket.emit("leave_lobby");
                joinForm.style.display = "block";
                waiting_lobby.style.display = "none";
                clearErr();
            });
            if (player["ready"] == false) {
                const ready_btn = document.createElement("button");
                ready_btn.setAttribute("id", "ready-btn");
                const ready_img = document.createElement("img");
                ready_img.src = "/assets/fist-raised-solid.svg";
                ready_img.alt = "Ready Up";
                ready_img.classList.add("svg-img-button");
                ready_btn.appendChild(ready_img);
                ready_btn.addEventListener("click", () => {
                    socket.emit("ready");
                });
                playerDiv.appendChild(ready_btn);
            }
            playerDiv.appendChild(leave_btn);
            joinForm.style.display = "none";
            if (!isInMatch) {
                waiting_lobby.style.display = "block";
                game_over.style.display = "none";
            }
        }
        if (player["ready"] == true) {
            playerDiv.textContent += " (Ready)";
        }
    }
});

function showQuestion(question, first_letter, characters, author, callback) {
    const game_screen = document.getElementById("game-screen");
    game_screen.style.display = "block";
    const fill_words = document.getElementById("fill-words");
    fill_words.style.display = "block";
    const questionElement = document.getElementById("question");
    const hint = document.getElementById("hint");
    const hint2 = document.getElementById("hint2");
    const author_id = document.getElementById("author");
    questionElement.textContent = question;
    hint.textContent = "Starts with the letter " + first_letter.toUpperCase() + "...";
    hint2.textContent = "The word has " + characters + " letters.";
    author_id.textContent = "⎯ " + author;
    const completed = document.getElementById("completed");
    const fill_box = document.getElementById("fill-word-box");
    fill_box.value = "";
    fill_box.focus();
    fill_box.addEventListener("input", (e) => {
        socket.emit("enter_fill_entry", fill_box.value);
    })
    curQuestionCallback = callback;
}

socket.on("start_game", (data) => {
    const waiting_lobby = document.getElementById("waiting-lobby");
    waiting_lobby.style.display = "none";
    if (data?.limit) startCountdown(data.limit);
    socket.off("new_question")
    socket.on("new_question", (q, first_letter, characters, author, ack) => {
        if (!isInMatch) isInMatch = true;
        const question = showQuestion(q, first_letter, characters, author, (correct) => {
            if (correct) ack();
        });
    });
})

socket.on("game_over", (leaderboard) => {
    if (!isInMatch) isInMatch = false;
    if (!joinedGame) return;
    const questions_complete = document.getElementById("questions-complete");
    const game_over = document.getElementById("game-over");
    const leader_cont = document.getElementById("leaderboard");
    leader_cont.innerHTML = "";
    leaderboard.forEach((player, index) => {
        const entry = document.createElement("div");
        entry.classList.add("leaderboard-item");
        entry.innerHTML = `
            <strong>${index + 1}.</strong> ${player.name}
            - Score: ${player.score}
            Correct: ${player.correct},
            Avg Time: ${player.avg_time}ms
            `;
        leader_cont.appendChild(entry);
    })
    questions_complete.style.display = "none";
    game_over.style.display = "block";
});

socket.on("questions_complete", () => {
    const game_screen = document.getElementById("game-screen");
    game_screen.style.display = "none";
    const questions_complete_box = document.getElementById("questions-complete");
    questions_complete_box.style.display = "block";
    confetti();
})

document.getElementById("game-over").addEventListener("click", () => {
    socket.emit("leave_lobby");
    joinedGame = false;
    isInMatch = false;
    const playerName = document.getElementById("codename");
    const nameValue = playerName.value;

    clearErr();
    console.log("Form submitting: " + nameValue);
    joinGame(nameValue);
})

function ping() {
    const start = Date.now();
    socket.emit("ping", () => {
        const duration = Date.now() - start;
        const ping_status = document.getElementById("ping-status")
        ping_status.textContent = "Ping: " + duration + " ms";
        document.getElementById("ping").style.display = "block";
        document.getElementById("signal-svg").classList.remove(...document.getElementById("signal-svg").classList);
        if (duration >= 1 && duration < 60) {
            ping_status.style.color = "#00c70a";
            document.getElementById("signal-svg").classList.add("signal-good");
        } else if (duration >= 60 && duration < 100) {
            ping_status.style.color = "#c7a900";
            document.getElementById("signal-svg").classList.add("signal-warn");
        } else if (duration >= 100) {
            ping_status.style.color = "#c70000";
            document.getElementById("signal-svg").classList.add("signal-danger");
        }
    })
}

function refreshPing() {
    ping();
    setTimeout(refreshPing, 5000);
}

function startCountdown(ms) {
    const countdownThing = document.getElementById("countdown");
    countdownThing.style.display = "block";
    var timeLeft = ms / 1000;
    countdownThing.textContent = formatTime(timeLeft);
    const interval = setInterval(() => {
        timeLeft -= 1;
        if (timeLeft <= 0) {
            clearInterval(interval);
            countdownThing.textContent = "Time's up!";
            const game_screen = document.getElementById("game-screen");
            game_screen.style.display = "none";
        } else {
            countdownThing.textContent = formatTime(timeLeft);
        }
    }, 1000);
}

function formatTime(sec) {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s<10?"0":""}${s}`; // idk what this actually is
}