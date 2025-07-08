const socket = io();
    console.log("Attempting to connect...");
    socket.on("connect", () => {
        console.log("Connected! Socket id: " + socket.id);
    });
    socket.on("connect_error", err => {
        console.error("Socket failed to connect: " + err);
    })

    const joinForm = document.getElementById("join_game_form");
    var joinedGame = false;
    var isInMatch = false;

    joinForm.addEventListener("submit", function(event) {
        event.preventDefault();

        const playerName = document.getElementById("codename");
        const nameValue = playerName.value;

        console.log("Form submitting: " + nameValue);
        socket.emit("join_game", nameValue);
    });

    socket.off("fill_entry_complete").on("fill_entry_complete", () => {
        if (curQuestionCallback) {
            curQuestionCallback(true);
        }
    });

    let curQuestionCallback = null;

    socket.on("join_error", (err) => {
        const join_err_object = document.getElementById("join_error");
        join_err_object.textContent = "Uh oh! " + err;
        join_err_object.style.display = "block";
    });

    socket.on("game_join_self", () => {
        isInMatch = false;
    })

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

    function showQuestion(question, first_letter, callback) {
        const game_screen = document.getElementById("game-screen");
        game_screen.style.display = "block";
        const fill_words = document.getElementById("fill-words");
        fill_words.style.display = "block";
        const questionElement = document.getElementById("question");
        const hint = document.getElementById("hint");
        questionElement.textContent = question;
        hint.textContent = "Hint: Starts with the letter " + first_letter.toUpperCase() + "...";
        const completed = document.getElementById("completed");
        const fill_box = document.getElementById("fill-word-box");
        fill_box.value = "";
        fill_box.focus();
        fill_box.addEventListener("input", (e) => {
            const val = fill_box.value.trim().toLowerCase();
            if (val === questionAnswer.toLowerCase()) {
                if (curQuestionCallback) {
                    curQuestionCallback(true);
                }
                socket.emit("enter_fill_entry", val);
            }
        });
        curQuestionCallback = callback;
    }

    socket.on("start_game", () => {
        const waiting_lobby = document.getElementById("waiting-lobby");
        waiting_lobby.style.display = "none";
        socket.off("new_question")
        socket.on("new_question", (q, answer, ack) => {
            questionAnswer = answer;
            const question = showQuestion(q, answer.charAt(0), (correct) => {
                if (correct) ack();
            });
        });
    })

    socket.on("game_over", () => {
        const questions_complete = document.getElementById("questions-complete");
        questions_complete.style.display = "none";
        const game_over = document.getElementById("game-over");
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
        const playerName = document.getElementById("codename");
        const nameValue = playerName.value;

        console.log("Form submitting: " + nameValue);
        socket.emit("join_game", nameValue);
    })