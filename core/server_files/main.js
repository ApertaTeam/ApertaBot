var socket = io();
var text;
var games = new Array();

function arrayToMap(arr){
    var map = new Map();
    arr.forEach(function(elem){
        map.set(elem[0], elem[1]);
    });
    return map;
}

socket.on('textData', function(data){
    text = arrayToMap(data);
    text.forEach(function(value, key, map){
        if(key.startsWith('game')){
            games.push(value);
        }
    });
});

function updateText(tid, text){
    socket.emit('updateText', { textid: tid, updated: text });
}

function bodyUpdate(){

}