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

        this.gameSpacesLeft = 9;
    }

    checkVictoryConditions(){
        let result = this.checkRows();
        if(result < 1){
            result = this.checkCols();
        }
        if(result < 1){
            result = this.checkDiags();
        }

        if(result >= 1){
            return (result === 1) ? `${this.player1.id} wins!` : `${this.player2.id} wins!`;
        }

        console.log(result);

        if(this.gameSpacesLeft === 0){
            return "It's a tie!";
        }

        return null;
    }

    checkRows(){
        let result = -1, y = 0;
        while(result < 1 && y < 3){
            result = this.checkRow(y);
            y++;
        }
        return result;
    }

    checkRow(y){
        if(this.gameMatrix[y][0] === this.gameMatrix[y][1] && this.gameMatrix[y][1] === this.gameMatrix[y][2]){
            if(this.gameMatrix[y][0] > 0){
                return this.gameMatrix[y][0];
            }
        }
        return -1;
    }

    checkCols(){
        let result = -1, x = 0;
        while(result < 1 && x < 3){
            result = this.checkCol(x);
            x++;
        }
        return result;
    }

    checkCol(x){   
        if(this.gameMatrix[0][x] === this.gameMatrix[1][x] && this.gameMatrix[1][x] === this.gameMatrix[2][x]){
            if(this.gameMatrix[0][x] > 0){
                return this.gameMatrix[0][x];
            }
        }
        return -1;
    }

    checkDiags(){
        if(this.gameMatrix[0][0] === this.gameMatrix[1][1] && this.gameMatrix[1][1] === this.gameMatrix[2][2]){
            if(this.gameMatrix[0][0] !== 0){
                return this.gameMatrix[0][0];
            }
        }
        else if(this.gameMatrix[2][0] === this.gameMatrix[1][1] && this.gameMatrix[1][1] === this.gameMatrix[0][2]){
            if(this.gameMatrix[2][0] !== 0){
                return this.gameMatrix[2][0];
            }
        }
        return -1;
    }

    end(message){
        this.send(this.player1, this.opCodes.GAME_OVER, (message.indexOf(this.player1.id) > -1 ? "You win!" : message));
        this.send(this.player2, this.opCodes.GAME_OVER, (message.indexOf(this.player2.id) > -1 ? "You win!" : message));   
        
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

        this.player1.challengedBy = null;
        this.player1.challenges = null;

        this.player2.challengedBy = null;
        this.player2.challenges = null;
    }

    update(conn, data){
        let update = {
            x: data.x,
            y: data.y,
            mark: (conn === this.player1) ? P1 : P2
        };

        this.gameSpacesLeft--;
        this.gameMatrix[data.y][data.x] = (conn === this.player1) ? 1 : 2;

        this.send(this.player1, this.opCodes.GAME_UPDATE, update);
        this.send(this.player2, this.opCodes.GAME_UPDATE, update);

        this.currTurn = (this.currTurn === 1) ? 2 : 1;

        let result = this.checkVictoryConditions();
        if(!result){
            this.takeTurn();
        }
        else{
            this.end(result);
        }
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