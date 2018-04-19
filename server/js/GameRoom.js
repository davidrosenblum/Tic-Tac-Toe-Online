"use strict";

const P1 = "x",
    P2 = "o";

let GameRoom = class GameRoom{
    constructor(p1, p2, send, opCodes){
        this.player1 = p1;
        this.player2 = p2;

        this.send = send;
        this.opCodes = opCodes;
        
        this.send(this.player1, this.opCodes.GAME_START, {mark: P1});
        this.send(this.player2, this.opCodes.GAME_START, {mark: P2});

        this.currTurn = 1;
        this.takeTurn();

        this.gameMatrix = [
            [0, 0, 0],
            [0, 0, 0],
            [0, 0, 0]
        ];
    }

    checkVictoryConditions(){
        
    }

    end(message){
        this.send(this.player1, this.opCodes.GAME_OVER, message);
        this.send(this.player2, this.opCodes.GAME_OVER, message);   
        
        this.unroom();
    }

    stopError(message){
        this.send(this.player1, this.opCodes.GAME_ERR, message);
        this.send(this.player2, this.opCodes.GAME_ERR, message);  
        
        this.unroom();
    }

    unroom(){
        this.player1.room = null;
        this.player2.room = null;
    }

    update(conn, data){
        let update = {
            x: data.x,
            y: data.y,
            mark: (conn === this.player1) ? P1 : P2
        };

        this.send(this.player1, this.opCodes.GAME_UPDATE, update);
        this.send(this.player2, this.opCodes.GAME_UPDATE, update);

        this.currTurn = (this.currTurn === 1) ? 2 : 1;
        this.takeTurn();
    }

    takeTurn(){
        if(this.currTurn === 1){
            this.send(this.player1, this.opCodes.GAME_TAKE_TURN_ME, "Make your move.");
            this.send(this.player2, this.opCodes.GAME_TAKE_TURN_OTHER, "Awaiting other player.");
        }
        else{
            this.send(this.player1, this.opCodes.GAME_TAKE_TURN_OTHER, "Awaiting other player.");
            this.send(this.player2, this.opCodes.GAME_TAKE_TURN_ME, "Make your move.");
        }
    }    
};

module.exports = GameRoom;