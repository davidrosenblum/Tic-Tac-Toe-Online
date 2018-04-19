/*
    HTML5 Tic-Tac-Toe 
    David Rosenblum,  2018 

    *** Requires WebSockets! *** 

    Connects the web socket game server, required for online play
*/

(function(){
    // connection fields
    var pin = -1,                            // PIN number (unique way to ID this client)
        socket = null;                       // websocket 

    // options data
    var queryStrings = {};                  // query strings used for custom settings

    // element cache fields
    var connectContainer = null,            // displayed when connecting to server
        pinContainer = null,                // displayed when connected (awaits offline or online)
        teamSelectContainer = null,         // displayed when offline mode starts, pick 'X' or 'O'
        gameContainer = null,               // displays the game (canvas!)
        disconnectContainer = null,         // displays the disconnection error message
        resetGameBtn = null,                // reset button
        modalContainer = null,              // holds the popup modal
        modalBody = null;                   // modal text body t
        modalCloseBtn = null;               // the modal 'close' button
        modalDeclineBtn = null;             // the modal 'decline' button
        modalAcceptBtn = null;              // the modal 'accept' button
        modalBlack = null,                  // the dark background underneath the modal
        gameText = null;                    // text message displayed from the server during online game mode
        
    // game fields
    var canvas = document.createElement("canvas"),
        ctx = canvas.getContext("2d"),
        gameMatrix = [],
        gameSpacesLeft = 0;

    // game fields
    var myTurn = false,                 // locks the clicking event 
        mark = null,                    // 'x' or 'o' for player
        cpuMark = null,                 // 'x' or 'o' for cpu (only used offline)
        multiplayerMode = false;        // offline or online? 

    // hitbox class, a box that can perform collision detection, used for canvas clicking 
    var Hitbox = function(x, y, width, height){
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.mark = null;
    };
    Hitbox.prototype.getBottom = function(){
        return this.y + this.height;
    };
    Hitbox.prototype.getRight = function(){
        return this.x + this.width;
    };
    Hitbox.prototype.collisionTest = function(target){
        if(target instanceof Hitbox){
            if(this.x < target.getRight() && target.x < this.getRight()){
                if(this.y < target.getBottom() && target.y < this.getBottom()){
                    return true;
                }
            }
            return false;
        }
        throw new Error("Not a hitbox!");
    };

    // ajax request
    var ajax = function(url, options, callback){
        options = (!options) ? {} : options;

        var method = (typeof options.method === "string") ? options.method : "GET",
            headers = (typeof options.headers === "object" && options.headers) ? options.headers : {};

        var xhr = new XMLHttpRequest();

        xhr.onload = function(){
            if(typeof callback === "function"){
                callback(xhr);
            }
        };

        xhr.open(method, url, true);
        for(var h in headers){
            xhr.setRequestHeader(h, headers[h]);
        }
        xhr.send(options.data);
    };

    // initializes the game into multiplayer mode
    var initGame = function(givenMark){
        showGame();

        resetGameBtn.style.display = "none";

        mark = givenMark;
        multiplayerMode = true;

        document.querySelector("#canvas-container").appendChild(canvas);
        resetGameMatrix();
        render();

        hideModal();
    };

    // initializes the game into single player mode
    var initGameOffline = function(chosenMark){
        initGame(chosenMark);

        cpuMark = (mark === "x") ? "o" : "x";
        myTurn = true;
        multiplayerMode = false;

        displayGameMessage("You are " + mark + " and CPU is " + cpuMark + ".");
    };

    // builds the game board matrix (or resets it)
    var resetGameMatrix = function(){
        var size = canvas.width / 3;

        for(var y = 0; y < 3; y++){
            if(!gameMatrix[y]){
                gameMatrix[y] = [];
            }

            for(var x = 0; x < 3; x++){
                if(gameMatrix[y][x]){
                    gameMatrix[y][x] = new Hitbox(x*size, y*size, size, size);
                }
                else{
                    gameMatrix[y].push(new Hitbox(x*size, y*size, size, size));
                }
            }
        }

        gameSpacesLeft = 9;
    }

    // updates the game boards data from the server
    var updateGame = function(data){
        if(data.message){
            displayGameMessage(data.message);
        }

        gameMatrix[data.y][data.x].mark = data.mark;
        render();
    };

    // updates the game display by redrawing it
    var render = function(){
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        for(var y = 0; y < gameMatrix.length; y++){
            for(var x = 0; x < gameMatrix[y].length; x++){
                var box = gameMatrix[y][x];

                if(box.mark){
                    ctx.fillStyle = "red";
                    ctx.font = "24px arial";
                    ctx.fillText(box.mark, box.x+(box.width/2), box.y+(box.height/2), box.width);
                }

                
                ctx.strokeStyle = "white";
                ctx.strokeRect(box.x, box.y, box.width, box.height);
            }
        }
    };

    // when the canvas is clicked... attempt to take a turn
    var onCanvasClick = function(evt){
        if(!myTurn){
            return;
        }

        var hitbox = new Hitbox(evt.offsetX, evt.offsetY, 3, 3);

        for(var y = 0; y < gameMatrix.length; y++){
            for(var x = 0; x < gameMatrix[y].length; x++){
                var currBox = gameMatrix[y][x];

                if(hitbox.collisionTest(currBox) && !currBox.mark){
                    myTurn = false;

                    currBox.mark = mark;
                    gameSpacesLeft--;

                    render();

                    if(multiplayerMode){
                        send("game-submit-turn", {x: x, y: y});
                    }
                    else{
                        takeCPUTurn();
                    }

                    return;
                }
            }
        }
    };

    // takes the CPU turn instantly (randomly picks a box)
    var takeCPUTurn = function(){
        myTurn = false;

        var value = checkVictoryConditions();
        if(value !== null){
            modal(value);
            resetGameBtn.style.display = "inline";
            return;
        }

        while(true){
            var x = Math.round(Math.random() * 2),
                y = Math.round(Math.random() * 2);

            var box = gameMatrix[y][x];
            if(!box.mark){
                box.mark = cpuMark;
                gameSpacesLeft--;

                render();

                break;
            }
        }

        value = checkVictoryConditions()
        if(value !== null){
            modal(value);
            resetGameBtn.style.display = "inline";
            return;
        }

        myTurn = true;
    };

    // checks victory conditions, only invoked for offline mode
    var checkVictoryConditions = function(){
        var gm = gameMatrix;
        
        var result = null, y = 0, x = 0;
        while(y < 3 && !result){
            result = checkRow(y);
            y++;
        }

        while(x < 3 && !result){
            result = checkCol(x);
            x++;
        }

        if(result){
            return (result === mark) ? "You win!" : "You lose!";
        }

        if(gameMatrix[1][1].mark){
            if(gameMatrix[1][1].mark === gameMatrix[0][0].mark && gameMatrix[1][1].mark === gameMatrix[2][2].mark){
                return (gameMatrix[1][1].mark === mark) ? "You win!" : "You lose!";
            }
            if(gameMatrix[1][1].mark === gameMatrix[0][2].mark && gameMatrix[1][1].mark === gameMatrix[2][0].mark){
                return (gameMatrix[1][1].mark === mark) ? "You win!" : "You lose!";
            }
        }


        if(gameSpacesLeft === 0){
            return "Its a tie!";
        }

        return null;
    };

    // determines if all blocks in a row have the same mark
    var checkRow = function(y){
        if(gameMatrix[y][0].mark){
            if(gameMatrix[y][0].mark === gameMatrix[y][1].mark && gameMatrix[y][1].mark === gameMatrix[y][2].mark){
                return gameMatrix[y][0].mark;
            }
        }
        return null;
    };

    // determines if all blocks in a row have the same mark
    var checkCol = function(x){
        if(gameMatrix[0][x].mark){
            if(gameMatrix[0][x].mark === gameMatrix[1][x].mark && gameMatrix[1][x].mark === gameMatrix[2][x].mark){
                return gameMatrix[0][x].mark;
            }
        }
        return null;
    };

    // shows the connecting message (also awaits PIN)
    var showConnecting = function(){
        connectContainer.style.display = "block";
        pinContainer.style.display = "none";
        teamSelectContainer.style.display = "none";
        gameContainer.style.display = "none";
        disconnectContainer.style.display = "none";
    };

    // shows the client's PIN after connection has been established
    var showPin = function(pinFromServer){
        connectContainer.style.display = "none";
        pinContainer.style.display = "block";
        teamSelectContainer.style.display = "none";
        gameContainer.style.display = "none";
        disconnectContainer.style.display = "none";

        pin = pinFromServer;
        document.querySelector("#my-pin").innerHTML = pin;
    };

    // shows the team selection container for offline mode
    var showTeamSelect = function(){
        connectContainer.style.display = "none";
        pinContainer.style.display = "none";
        teamSelectContainer.style.display = "block";
        gameContainer.style.display = "none";
        disconnectContainer.style.display = "none";
    };

    // shows the disconnect message container
    var showDisconnect = function(){
        connectContainer.style.display = "none";
        pinContainer.style.display = "none";
        teamSelectContainer.style.display = "none";
        gameContainer.style.display = "none";
        disconnectContainer.style.display = "block";
    };

    // shows the game container (canvas, etc)
    var showGame = function(){
        connectContainer.style.display = "none";
        pinContainer.style.display = "none";
        teamSelectContainer.style.display = "none";
        gameContainer.style.display = "block";
        disconnectContainer.style.display = "none";
    };

    // displays a non-instrusive message during gameplay
    var displayGameMessage = function(message){
        gameText.innerHTML = message;
    };

    // processes data received from the server
    var handleSocketData = function(evt){
        if(queryStrings["log_packets"] === "true"){
            console.log(evt.data)
        }

        var opCode, data;
        try{
            var json = JSON.parse(evt.data);

            opCode = (typeof json.opCode === "string") ? json.opCode : "bad-op-code";
            data = (typeof json.data === "object") ? json.data : {};
        }
        catch(err){
            return;
        }

        opCode = (typeof json.opCode === "string") ? json.opCode : -1;
        data = (typeof json.data === "object") ? json.data : {};

        if(opCode === "pin"){
            showPin(data.pin);
        }
        else if(opCode === "challenge-inv"){
            modalInvite(data.message);
        }
        else if(opCode === "challenge-err"){
            modal(data.message);
        }
        else if(opCode === "challenge-sent"){
            modal(data.message)
        }
        else if(opCode === "challenge-response"){
            modal(data.message);
        }
        else if(opCode === "game-start"){
            initGame(data.mark);
        }
        else if(opCode === "game-take-turn-me"){
            displayGameMessage(data.message);
            myTurn = true;
        }
        else if(opCode === "game-take-turn-other"){
            displayGameMessage(data.message);
            myTurn = false;
        }
        else if(opCode === "game-update"){
            updateGame(data);
        }
        else if(opCode === "game-err"){
            showPin(pin);
            modal(data.message || "Error occurred.");
        }
        else if(opCode === "game-over"){
            showPin(pin);
            modal(data.message || "Game over.");
        }
    };

    // sends a challenge request to the server using the given opponent PIN 
    var requestChallenge = function(){
        var targetPin = document.querySelector("#target-pin").value;
        if(!targetPin || targetPin.length < 1){
            modal("Please enter a PIN.")
        }
        else{
            send("challenge", {targetPin: targetPin});
        }
    };
    
    // instantiates and connects the websocket applying required listener functions 
    var connect = function(){
        ajax(window.location.protocol + "//" + window.location.host + "/wsport", null, function(xhr){
            if(xhr.status !== 200){
                throw new Error("AJAX request failed to reach server.");
            }

            var protocol = (window.location.protocol === "http:") ? "ws:" : "wss:";

            socket = new WebSocket(protocol + window.location.hostname + ":" + xhr.response);

            socket.onopen = function(){
                console.log("Connected!");
            };

            socket.onerror = function(err){
                //console.log(err);
                showDisconnect();
            }
            
            socket.onclose = function(err){
                //console.log(err);
                showDisconnect();
            };

            socket.onmessage = handleSocketData;
        });
    };

    // safely sends a message to the server
    var send = function(opCode, data){
        if(socket && socket.readyState === 1){
            var message = {
                opCode: opCode,
                data: data
            };
            socket.send(JSON.stringify(message));
        }
    };

    // shows the modal with a custom message with 'close' button only
    // overrides any existing modal
    var modal = function(message){
        hideModal();
        modalBody.innerHTML = message;
        modalContainer.style.display = "block";
        modalBlack.style.display = "block";

        modalDeclineBtn.style.display = "none";
        modalAcceptBtn.style.display = "none";
        modalCloseBtn.style.display = "inline";
    };

    // shows the modal with a custom message with 'accept' and 'decline' buttons
    // overrides any existin modal
    var modalInvite = function(message){
        modal(message);
        modalDeclineBtn.style.display = "inline";
        modalAcceptBtn.style.display = "inline";
        modalCloseBtn.style.display = "none";
    }

    // hides the modal
    var hideModal = function(){
        modalContainer.style.display = "none";
        modalBlack.style.display = "none";
    };

    // parses query string data
    var parseQueryStrings = function(){
        var qs = {};

        var split = window.location.href.split("?");
        if(split.length < 2){
            return {};
        }

        split = split[1].split("&");

        for(var i = 0; i < split.length; i++){
            var pair = split[i];
            var pairSplit = pair.split("=");

            var param = pairSplit[0];
            var val = (pairSplit.length > 1) ? pairSplit[1] : null;

            qs[param] = val;
        }

        return qs;
    };

    // initialization called when the document loads
    var init = function(){
        // query strings
        queryStrings = parseQueryStrings();

        // cache container elements
        connectContainer = document.querySelector("#connecting-container");
        pinContainer = document.querySelector("#pin-container");
        teamSelectContainer = document.querySelector("#team-select-container");
        gameContainer = document.querySelector("#game-container");
        disconnectContainer = document.querySelector("#disconnect-container");

        // cache modal elements
        modalContainer = document.querySelector("#modal-container");
        modalBody = document.querySelector("#modal-body");
        modalCloseBtn = document.querySelector("#modal-close-btn");
        modalDeclineBtn = document.querySelector("#modal-decline-btn");
        modalAcceptBtn = document.querySelector("#modal-accept-btn");
        modalBlack = document.querySelector("#modal-black");

        // cache misc elements
        resetGameBtn = document.querySelector("#reset-game-btn");
        gameText = document.querySelector("#game-text");

        // button listeners
        modalCloseBtn.onclick = hideModal;
        document.querySelector("#challenge-btn").onclick = requestChallenge;
        document.querySelector("#offline-btn").onclick = showTeamSelect;
        document.querySelector("#select-team-x").onclick = () => initGameOffline("x");
        document.querySelector("#select-team-o").onclick = () => initGameOffline("o");
        document.querySelector("#offline-btn-fallback").onclick = showTeamSelect;
        modalDeclineBtn.onclick = function(){
            hideModal();
            send("challenge-response", {response: false});
        };
        modalAcceptBtn.onclick = function(){
            hideModal();
            send("challenge-response", {response: true});
        };
        resetGameBtn.onclick = function(){
            initGameOffline(mark);
        };

        // canvas setup
        canvas.width = 450;
        canvas.height = 450;
        canvas.style.backgroundColor = "black"
        canvas.onclick = onCanvasClick;

        // check browser dependencies 
        if(typeof window.WebSocket === "undefined"){
            modal("Your browser does not seem to support WebSockets.");
        }
        else{
            // connect the websocket 
            showConnecting();
            connect();
        }
    };
    window.addEventListener("load", init);
})()