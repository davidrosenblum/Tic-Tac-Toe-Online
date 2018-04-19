"use strict";

let fs = require("fs");

const DEFAULT_SETTINGS = {
    http: {
        port: 8080
    },
    ws: {
        port: 6615
    }
};

let Settings = class Settings{
    constructor(json){
        json = (!json) ? {} : json;
        
        this.http = {
            port: (!json.http || typeof json.http.port !== "number") ? DEFAULT_SETTINGS.http.port : json.http.port
        };

        this.ws = {
            port: (!json.ws || typeof json.ws.port !== "number") ? DEFAULT_SETTINGS.ws.port : json.ws.port
        };
    }

    static read(callback){
        fs.readFile("settings.json", (err, data) => {
            if(err){
                callback(err, new Settings());
            }
            else{
                try{
                    callback(null, new Settings(JSON.parse(data)));
                }
                catch(err){
                    callback(err, new Settings());
                }
            }
        });
    }

    static writeDefault(callback){
        fs.writeFile("settings.json", JSON.stringify(DEFAULT_SETTINGS, null, 4), callback);
    }
};

module.exports = Settings;