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
        
        for(let opt in DEFAULT_SETTINGS){
            if(typeof json[opt] === typeof DEFAULT_SETTINGS[opt]){
                this[opt] = json[opt];
            }
            else{
                this[opt] = DEFAULT_SETTINGS[opt];
            }
        }
    }

    static read(callback){
        fs.readFile("settings.json", (err, data) => {
            if(err){
                callback(err, new Settings());
            }
            else{
                callback(null, new Settings(data));
            }
        });
    }

    static writeDefault(callback){
        fs.writeFile("settings.json", JSON.stringify(DEFAULT_SETTINGS, null, 4), callback);
    }
};

module.exports = Settings;