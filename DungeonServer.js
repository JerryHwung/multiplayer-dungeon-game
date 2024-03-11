// See Real-Time Servers II: File Servers for understanding 
// how we set up and use express
const express = require("express");
const app = express();
const server = require("http").Server(app);
const io = require("socket.io")(server);
const mysql = require("mysql");

// We will use the dungeongenerator module to generate random dungeons
// Details at: https://www.npmjs.com/package/dungeongenerator
// Source at: https://github.com/nerox8664/dungeongenerator
const DungeonGenerator = require("dungeongenerator");

// We are going to serve our static pages from the public directory
// See Real-Time Servers II: File Servers for understanding
// how we set up and use express
app.use(express.static("public"));

/*  These variables store information about the dungeon that we will later
 *  send to clients. In particular:
 *  - the dungeonStart variable will store the x and y coordinates of the start point of the dungeon
 *  - the dungeonEnd variable will store the x and y coordinates of the end point of the dungeon
 *  - the dungeonOptions object contains four variables, which describe the default state of the dungeon:
 *  - - dungeon_width: the width of the dungeon (size in the x dimension)
 *  - - dungeon_height: the height of the dungeon (size in the y dimension)
 *  - - number_of_rooms: the approximate number of rooms to generate
 *  - - average_room_size: roughly how big the rooms will be (in terms of both height and width)
 *  - this object is passed to the dungeon constructor in the generateDungeon function
 */
let dungeon = {};
let dungeonStart = {};
let dungeonEnd = {};
const dungeonOptions = {
    dungeon_width: 20,
    dungeon_height: 20,
    number_of_rooms: 7,
    average_room_size: 8
};

// Create objects to store players' information
/*
* the players object stores all players coordinates based on their socket.id
* the player object stores a certain player's coordinates
* the timer object stores the starting time when the player join a new dungeon
*/
let players = {};
let player = {};
let timer = {};
let scores = [];
// Added mysql in this game to store game details
// Declare object to store the information needed to actually connect to the database
let connection = mysql.createConnection({
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: ''
});
// Establish a connection
connection.connect();

// Use the newly created database
connection.query("USE dungeonGame;", function(error, result, fields) {
    if (error) {
        console.log("Error setting database: " + error.code);
    }
    else if (result) {
        console.log("Database successfully set.");
    }
});
/*
 * The getDungeonData function packages up important information about a dungeon
 * into an object and prepares it for sending in a message. 
 *
 * The members of the returned object are as follows:
 *
 * - dungeon, an object, containing the following variables:
 * -- maze: a 2D array of integers, with the following numbers:
 * --- 0: wall
 * --- 1: corridor
 * --- 2+: numbered rooms, with 2 being the first room generated, 3 being the next, etc.
 * -- h: the height of the dungeon (y dimension)
 * -- w: the width of the dungeon (x dimension)
 * -- rooms: an array of objects describing the rooms in the dungeon, each object contains:
 * --- id: the integer representing this room in the dungeon (e.g. 2 for the first room)
 * --- h: the height of the room (y dimension)
 * --- w: the width of the room (x dimension)
 * --- x: the x coordinate of the top-left corner of the room
 * --- y: the y coordinate of the top-left corner of the room
 * --- cx: the x coordinate of the centre of the room
 * --- cy: the y coordinate of the centre of the room
 * -- roomSize: the average size of the rooms (as used when generating the dungeon)
 * -- _lastRoomId: the id of the next room to be generated (so _lastRoomId-1 is the last room in the dungeon)
 *
 * - startingPoint
 * -- x: the column at which players should start in the dungeon
 * -- y: the row at which players should start in the dungeon
 *
 * - endingPoint
 * -- x: the column where the goal space of the dungeon is located
 * -- y: the row where the goal space of the dungeon is located
 *
 */
function getDungeonData() {
    return {
        dungeon,
        startingPoint: dungeonStart,
        endingPoint: dungeonEnd
    };
}

/*
 * This is our event handler for a connection.
 * That is to say, any code written here executes when a client makes a connection to the server
 * (i.e. when the page is loaded)
 * 
 * See Real-Time Servers III: socket.io and Messaging for help understanding how
 * we set up and use socket.io
 */
io.on("connection", function (socket) {

    // Print an acknowledge to the server's console to confirm a player has connected
    console.log("A player has connected - sending dungeon data...");
    // Show player ID
    console.log("Player session ID = "+socket.id);
    /*
     * Here we send all information about a dungeon to the client that has just connected
     * For full details about the data being sent, check the getDungeonData method
     * This message triggers the socket.on("dungeon data"... event handler in the client
     */
    socket.emit("dungeon data", getDungeonData());

    // Send the starting coordinates to the new player when a new player joined in
    socket.on("new player", function(){
        players[socket.id] = {
            x: dungeonStart.x,
            y: dungeonStart.y
        };
        // Timer record the start time of the specific player when player join the game
        timer[socket.id] = {
            start: Date.now()
        }
        ;

        // Update both current player and new player with the new coordinates in players
        io.emit("players data", players);
        // Retrieve all score and send to client
        connection.query("SELECT * FROM scores", function(error,result,fields){
            if(error) {console.log(err);}
            for(let i=0; i<result.length; i++){
                scores[i] = {
                    id: result[i].player,
                    timeused: result[i].timeused
                };
            }
            socket.emit("scores",scores);
        });
    });
    // Update player's coordinate when they triggered the controls(keyboard, mouse or touch)
    socket.on("control",function(data){
        // Use the id as key to update the player coordinates
        player = players[data.id];
        // Check for out of bounds with a function
        let result = detectBound(player.x,player.y);

        if(data.goLeft && result.canMoveLeft){
            player.x -=1;
        }
        if(data.goRight && result.canMoveRight){
            player.x +=1;
        }
        if(data.goUp && result.canMoveUp){
            player.y -=1;
        }
        if(data.goDown && result.canMoveDown){
            player.y +=1;
        }
        // Generate a new dungeon when a player reached the goal
        // and also calculate the time used before resetting the start time
        if(player.x == dungeonEnd.x && player.y == dungeonEnd.y){
            console.log("Someone reached the goal!!");
            // Create a variable to store the time used in second
            let timeUsed = (Date.now()- timer[data.id].start)/1000;
            // Only record the winner's time used
            let winner = {
                player: data.id,
                timeused: timeUsed
            };
            console.log("Time used is "+timeUsed);
            io.emit("new score", winner);
            // Insert data into the table
            connection.query("INSERT INTO scores SET ?", winner, function(err) {
                if(err) console.log(err)
            });
            console.log("Generating new dungeon...");
            // Generate new dungeon
            generateDungeon();
            console.log("Sending dungeon data to all players...");
            // Send to all client
            io.emit("dungeon data", getDungeonData());
            console.log("Resetting all players to starting point...");
            // Respawn players to starting point
            for(var id in players) {
                players[id].x = dungeonStart.x;
                players[id].y = dungeonStart.y;
                timer[id].start = Date.now();
            }
        }
        // Update all players with the new coordinates in players
        io.emit("players data", players);
    });
});

/*
 * This method locates a specific room, based on a given index, and retrieves the
 * centre point, and returns this as an object with an x and y variable.
 * For example, this method given the integer 2, would return an object
 * with an x and y indicating the centre point of the room with an id of 2.
 */
function getCenterPositionOfSpecificRoom(roomIndex) {
    let position = {
        x: 0,
        y: 0
    };

    for (let i = 0; i < dungeon.rooms.length; i++) {
        let room = dungeon.rooms[i];
        if (room.id === roomIndex) {
            position.x = room.cx;
            position.y = room.cy;
            return position;
        }
    }
    return position;
}

/*
 * The generateDungeon function uses the dungeongenerator module to create a random dungeon,
 * which is stored in the 'dungeon' variable.
 *
 * Additionally, we find a start point (this is always the centre point of the first generated room)
 * and an end point is located (this is always the centre point of the last generated room).
 */
function generateDungeon() {
    dungeon = new DungeonGenerator(
        dungeonOptions.dungeon_height,
        dungeonOptions.dungeon_width,
        dungeonOptions.number_of_rooms,
        dungeonOptions.average_room_size
    );
    console.log(dungeon);
    dungeonStart = getCenterPositionOfSpecificRoom(2);
    dungeonEnd = getCenterPositionOfSpecificRoom(dungeon._lastRoomId - 1);
}
/*
* The detectBound function uses the coordinates of the player (based on id) to detect
* any walls(black space) around them. The if statement is a part of the identifySpaceType
* function in DungeonClient.
*
* The x and y represent the current coordinate of the player in the dungeon.
* */
function detectBound(x,y) {

    let result = {
        canMoveUp: false,
        canMoveDown: false,
        canMoveLeft: false,
        canMoveRight: false
    };

    if (x - 1 >= 0 && dungeon.maze[y][x - 1] > 0) {
        result.canMoveLeft = true;
    }
    if (x + 1 < dungeon.w && dungeon.maze[y][x + 1] > 0) {
        result.canMoveRight = true;
    }
    if (y - 1 >= 0 && dungeon.maze[y - 1][x] > 0) {
        result.canMoveUp = true;
    }
    if (y + 1 < dungeon.h && dungeon.maze[y + 1][x] > 0) {
        result.canMoveDown = true;
    }

    return result;
}
/*
 * Start the server, listening on port 8081.
 * Once the server has started, output confirmation to the server's console.
 * After initial startup, generate a dungeon, ready for the first time a client connects.
 *
 */
server.listen(8081, function () {
    console.log("Dungeon server has started - connect to http://localhost:8081");
    generateDungeon();
    console.log("Initial dungeon generated!");
});