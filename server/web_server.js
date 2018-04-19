// import modules
let express = require("express"),
    Settings = require("./js/Settings.js");

// create http server
let server = express().use(express.static(`${__dirname}/public_html`));

// store settings data
let settings = null;

// send homepage
server.route("/").get((req, res) => {
    res.sendFile("index.html");
});

// send websocket port data (from settings file)
server.route("/wsport").get((req, res) => {
    res.writeHead(200);
    res.end(settings.ws.port + "");
});

// send websocket port 
server.route("/wsport").get((req, res) => {
    res.writeHead(200);
    res.end(settings.http.port + "");
});

// loads settings and starts the server
let init = function(){
    console.log("Loading settings...");
    Settings.read((err, set) => {
        if(err && err.errno === -4058){
            console.log("Writing default file.");
            Settings.writeDefault();
        }
        else if(err){
            console.log(err.message);
            process.exit();
        }

        console.log("Settings loaded.\n");
        settings = set;

        let port = process.env.PORT || settings.http.port;
        server.listen(port, err => {
            if(err){
                console.log(err.message);
                process.exit();
            }

            console.log(`Web server listening on port ${port}.`);
        });
    });
};

console.log("Tic-Tac-Toe Web Server");
console.log("(David Rosenblum)\n")
init();