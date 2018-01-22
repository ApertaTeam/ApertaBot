'use strict';

const logger = require('./logger.js');
const fs = require('fs');
let http = undefined;
let sio = undefined;

let server;

let config;
let text = new Map();
let gameCount = 0;

// Randomize the internal session ID, which should likely invalidate previous ones
let currentAuthUser = Math.floor(Math.random() * 100000000000);

function arrayToMap(arr){
    var map = new Map();
    arr.forEach(elem => {
        map.set(elem[0], elem[1]);
    });
    return map;
}

function sendText(file, mime, status, response){
    var path = `${require('app-root-path')}/core/server_files/${file}`;
    var stat = fs.statSync(path);
    response.writeHead(status, {
        'Content-Type': `text/${mime}; charset=utf-8`,
        'Content-Length': stat.size
    });
    fs.createReadStream(path).pipe(response);
}

function sendTextPath(path, mime, status, response){
    var stat = fs.statSync(path);
    response.writeHead(status, {
        'Content-Type': `text/${mime}; charset=utf-8`,
        'Content-Length': stat.size
    });
    fs.createReadStream(path).pipe(response);
}

function sendFileMisc(file, mime, status, response){
    var path = `${require('app-root-path')}/core/server_files/${file}`;
    var stat = fs.statSync(path);
    response.writeHead(status, {
        'Content-Type': `${mime}; charset=utf-8`,
        'Content-Length': stat.size
    });
    fs.createReadStream(path).pipe(response);
}

function hasAuthenticated(request){
    if(config.server.password == null)
        return true;
    var cookies = require('cookie').parse(request.headers.cookie || '');
    if(!cookies.token)
        return false;
    if(cookies.token.length != 64)
        return false;
    if(cookies.token === require('crypto').createHash('sha256').update(config.server.password + currentAuthUser.toString() + config.server.salt).digest('hex'))
        return true;
    return false;
}

function handleHTTPRequest(request, response){
    switch(request.url){
        case "/":
            if(!hasAuthenticated(request)){
                response.writeHead(303, { 'Location': '/auth' });
                response.end();
                break;
            }
            sendText("main.html", "html", 200, response);
            break;
        case "/style.css":
            if(!hasAuthenticated(request)){
                response.writeHead(303, { 'Location': '/auth' });
                response.end();
                break;
            }
            sendText("style.css", "css", 200, response);
            break;
        case "/socket.io.js":
            if(!hasAuthenticated(request)){
                response.writeHead(303, { 'Location': '/auth' });
                response.end();
                break;
            }
            sendTextPath(`${require('app-root-path')}/node_modules/socket.io-client/dist/socket.io.js`, "javascript", 200, response);
            break;
        case "/main.js":
            if(!hasAuthenticated(request)){
                response.writeHead(303, { 'Location': '/auth' });
                response.end();
                break;
            }
            sendText("main.js", "javascript", 200, response);
            break;
        case "/font/Dreamt.eot":
            if(!hasAuthenticated(request)){
                response.writeHead(303, { 'Location': '/auth' });
                response.end();
                break;
            }
            sendFileMisc("font/Dreamt.eot", "application/vnd.ms-fontobject", 200, response);
            break;
        case "/font/Dreamt.woff":
            if(!hasAuthenticated(request)){
                response.writeHead(303, { 'Location': '/auth' });
                response.end();
                break;
            }
            sendFileMisc("font/Dreamt.woff", "application/font-woff", 200, response);
            break;
        case "/font/Dreamt.ttf":
            if(!hasAuthenticated(request)){
                response.writeHead(303, { 'Location': '/auth' });
                response.end();
                break;
            }
            sendFileMisc("font/Dreamt.ttf", "application/font-sfnt", 200, response);
            break;
        case "/external/bootstrap.css":
            if(!hasAuthenticated(request)){
                response.writeHead(303, { 'Location': '/auth' });
                response.end();
                break;
            }
            sendText("external/bootstrap.css", "css", 200, response);
            break;
        case "/auth":
            if(hasAuthenticated(request)){
                response.writeHead(303, { 'Location': '/' });
                response.end();
                break;
            }
            sendText("auth.html", "html", 200, response);
            break;
        default:
            if(request.url.startsWith("/authl?pass=")){
                if(config.server.password != null){
                    let pass = request.url.replace("/authl?pass=", "");
                    if(pass === config.server.password){
                        currentAuthUser++;
                        response.writeHead(303, {
                            'Set-Cookie': `token=${require('crypto').createHash('sha256').update(pass + currentAuthUser.toString() + config.server.salt).digest('hex')}`,
                            'Location': '/'
                        });
                        response.end();
                        logger.logInfo("User authenticated to control panel.");
                    } else {
                        response.writeHead(401, {});
                        response.end("Failed to authenticate.");
                        logger.logWarn("User attempted and failed to authenticate to control panel.");
                    }
                } else {
                    response.writeHead(303, {
                        'Location': '/'
                    });
                    response.end();
                }
            } else {
                sendText("404.html", "html", 404, response);
            }
            break;
    }
}

module.exports = {
    gameCount: gameCount,
    initialize: () => {
        logger.logInfo("Initializing interact module...");

        // Load config
        config = require("../config.json");

        // Configure text
        config.text.games.forEach((game, index) => {
            text.set(`game${index}`, game);
        });
        gameCount = config.text.games.length;

        // Start HTTP server, as well as socket.io
        if(config.server.enabled){
            http = require('http');
            server = http.createServer(handleHTTPRequest);
            sio = require('socket.io')(server);
            server.listen(config.server.port, err => {
                if (err) throw err;
                logger.logInfo(`Server listening on port ${config.server.port}.`);
            });

            sio.on('connection', socket => {
                if(!hasAuthenticated(socket.handshake)){ // Meant for another object, but works just fine
                    socket.disconnect(true);
                    return;
                }
                socket.emit('textData', Array.from(text));
                socket.on('updateText', data => {

                });
            });
        }
    },
    get_text: key => {
        return text.get(key);
    }
};