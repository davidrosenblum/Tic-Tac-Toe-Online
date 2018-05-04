let wss = require("nodejs-websocket"),
    GameRoom = require("./js/GameRoom.js"),
    Settings = require("./js/Settings.js");

const VERSION = "1.0.0";

const OP_CODE = {
    PIN: "pin",
    GET_PINS: "get-pins",
    CHALLENGE: "challenge",
    CHALLENGE_INV: "challenge-inv",
    CHALLENGE_ERR: "challenge-err",
    CHALLENGE_SENT: "challenge-sent",
    CHALLENGE_RESPONSE: "challenge-response",
    GAME_START: "game-start",
    GAME_OVER: "game-over",
    GAME_ERR: "game-err",
    GAME_TAKE_TURN_ME: "game-take-turn-me",
    GAME_TAKE_TURN_OTHER: "game-take-turn-other",
    GAME_SUBMIT_TURN: "game-submit-turn",
    GAME_UPDATE: "game-update"
};

let pins = {},
    pinChars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890".split("");

let server = wss.createServer(conn => {
    conn.id = generatePIN();
    pins[conn.id] = conn;

    conn.on("text", data => handleSocketData(conn, data));

    conn.on("error", err => {
        //
    });

    conn.on("close", evt => {
        delete pins[conn.id];
    
        if(conn.room){
            //conn.challengedBy.challenges = null;
            conn.room.stopError(`${conn.id} disconnected.`);
        }

        console.log(`Client ${conn.id} disconnected.`);
    });

    send(conn, OP_CODE.PIN, {pin: conn.id});

    console.log(`Client ${conn.id} connected`);
});
server.on("listening", evt => console.log(`Websocket server listening on port ${server.socket.address().port}.\n`));
server.on("error", err => console.log(err.message));

let handleSocketData = function(conn, message){
    let opCode, data;
    try{
        // attempt parse and extraction 
        let json = JSON.parse(message);
        opCode = json.opCode || -1;
        data = json.data || {};
    }
    catch(err){
        // json parse error
        return;
    }

    if(opCode === OP_CODE.CHALLENGE){
        challenge(conn, data.targetPin || "{Null Target}"); 
    }
    else if(opCode === OP_CODE.CHALLENGE_RESPONSE){
        respondToChallenge(conn, data.response || false);
    }
    else if(opCode === OP_CODE.GAME_SUBMIT_TURN){
        conn.room.update(conn, data);
    }
    else if(opCode === OP_CODE.GET_PINS){
        send(conn, OP_CODE.GET_PINS, {pins: getPINs(conn.id)});
    }
};

let getPINs = function(ignorePin){
    var pinsFound = [];
    for(let pin in pins){
        if(pin === ignorePin){
            continue;
        }
        pinsFound.push(pin);
    }
    return pinsFound;
};

let challenge = function(client, targetPin){  
    if(client.id === targetPin){
        send(client, OP_CODE.CHALLENGE_ERR, {message: "You cannot challenge yourself."});
        return;
    }

    if(client.challenges){
        send(client, OP_CODE.CHALLENGE_ERR, {message: "You are awaiting a challenge response."});
        return;
    }

    let target = pins[targetPin];
    if(!target){
        send(client, OP_CODE.CHALLENGE_ERR, {message: `Unable to find opponent ${targetPin}.`});
    }
    else if(target && target.room){
        send(client, OP_CODE.CHALLENGE_ERR, {message: `${targetPin} is in a game already.`});
    }
    else if(target && target.challengedBy){
        send(client, OP_CODE.CHALLENGE_ERR, {message: `${targetPin} is considering another challenge.`});
    }
    else{
        client.challenges = target;
        target.challengedBy = client;

        send(client, OP_CODE.CHALLENGE_SENT, {message: `Challenge invite sent.`});
        send(target, OP_CODE.CHALLENGE_INV, {challengerPin: client.id, message: `${client.id} has challenged you.`});
    }
};

let respondToChallenge = function(conn, response){
    // conn = responding client 
    if(response === false){
        send(conn.challengedBy, OP_CODE.CHALLENGE_ERR, {message: `Challenge declined.`});
        conn.challengedBy.challenges = null;
        conn.challengedBy = null;
    }
    else{
        startGameInstance(conn.challengedBy, conn, send);
    }
};

let startGameInstance = function(player1, player2){
    let room = new GameRoom(player1, player2, send, OP_CODE);
    player1.room = room;
    player2.room = room;
};

let generatePIN = function(){
    let pin = "";
    for(let i = 0; i < 8; i++){
        pin += pinChars[Math.trunc(Math.random() * pinChars.length)]
    }

    if(pin in pins){
        return generatePIN();
    }
    return pin;
};

let send = function(conn, opCode, data){
    let message = {
        opCode: opCode,
        data: (typeof data === "object") ? data : {message: data}
    }
    conn.send(JSON.stringify(message));
};

let init = function(){
    console.log("Loading settings...");
    Settings.read((err, settings) => {
        if(err && err.errno === -4058){
            console.log("Writing default file.");
            Settings.writeDefault();
        }
        else if(err){
            console.log(err.message);
            process.exit();
        }

        console.log("Settings loaded.\n");

        let port = process.env.PORT || settings.ws.port;
        server.listen(port);        
    });
};

console.log(`Tic-Tac-Toe WebSocket Game Server`);
console.log(`v${VERSION} (David Rosenblum)\n`);
init();