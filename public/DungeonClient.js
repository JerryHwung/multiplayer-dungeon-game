/*
 * These three variables hold information about the dungeon, received from the server
 * via the "dungeon data" message. Until the first message is received, they are
 * initialised to empty objects.
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
 * - dungeonStart
 * -- x, the row at which players should start in the dungeon
 * -- y, the column at which players should start in the dungeon
 *
 * - dungeonEnd
 * -- x, the row where the goal space of the dungeon is located
 * -- y, the column where the goal space of the dungeon  is located
 */
let dungeon = {};
let dungeonStart = {};
let dungeonEnd = {};

// Declare player object and array to store player information
let player = {};
let players = {};
let sessionid = null;

// Variable used to store time used for previous maze
let timeUsed = 0;

// Check client is using mobile or not
let mobileUser = false;
// Reference to this post (https://stackoverflow.com/questions/3514784/what-is-the-best-way-to-detect-a-mobile-device-in-jquery)
if( /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ) {
    mobileUser =  true;
}
// load a spritesheet (dungeon_tiles.png) which holds the tiles
// we will use to draw the dungeon
// Art by MrBeast. Commissioned by OpenGameArt.org (http://opengameart.org)
const tilesImage = new Image();
tilesImage.src = "dungeon_tiles.png";
// Art by isaiah658. This sprite sheet can be found in (https://openclipart.org/detail/248259/retro-character-sprite-sheet)
const playersImage = new Image();
playersImage.src = "solis.png";
// This PNG can be found in (http://pixelartmaker.com/art/bd8164e9ee9afdf)
const controlsImage = new Image();
controlsImage.src = "arrow_keys.png";
// Coin image used for representing other player, art by kotnaszynce in (https://opengameart.org/content/coin-2)
const rivalsImage = new Image();
rivalsImage.src = "souls.png";
/*
 * Establish a connection to our server
 * We will need to reuse the 'socket' variable to both send messages
 * and receive them, by way of adding event handlers for the various
 * messages we expect to receive
 *
 * Replace localhost with a specific URL or IP address if testing
 * across multiple computers
 *
 * See Real-Time Servers III: socket.io and Messaging for help understanding how
 * we set up and use socket.io
 */

// Side Note: Use this when planning to use other device to connect
// const socket = io.connect("http://[your IP here]:8081");
// Else...
const socket = io.connect("http://localhost:8081");

// Send a "request" to retrieve players data.
socket.emit("new player");
/*
 * This is the event handler for the 'dungeon data' message
 * When a 'dungeon data' message is received from the server, this block of code executes
 * 
 * The server is sending us either initial information about a dungeon, or,
 * updated information about a dungeon, and so we want to replace our existing
 * dungeon variables with the new information.
 *
 * We know the specification of the information we receive (from the documentation
 * and design of the server), and use this to help write this handler.
 */
socket.on("dungeon data", function (data) {
    dungeon = data.dungeon;
    dungeonStart = data.startingPoint;
    dungeonEnd = data.endingPoint;
});
// After receiving players data, update the players object in client side
socket.on("players data", function (data) {
    players = data;
});
// Store the client's session id(socket.id) when connected
socket.on('connect', function() {
    sessionid = socket.id;
    control.id = socket.id;
    $("#session").append( "<b>Your session id is: </b>" + socket.id + "<br>");
});

// Store the scores and print them in the scoreboard
socket.on("scores", function(data){
    for(var i=0; i<data.length; i++){
        $("table").append("<tr><td>"+data[i].id+"</td><td>"+data[i].timeused+"</td></tr>");
    }
});
// New score update
socket.on("new score",function(data){
   $("table").append("<tr><td>"+data.player+"</td><td>"+data.timeused+"</td></tr>");
   timeUsed = data.timeused;
});
/*
 * The identifySpaceType function takes an x, y coordinate within the dungeon and identifies
 * which type of tile needs to be drawn, based on which directions it is possible
 * to move to from this space. For example, a tile from which a player can move up
 * or right from needs to have walls on the bottom and left.
 *
 * Once a tile type has been identified, the necessary details to draw this
 * tile are returned from this method. Those details specifically are:
 * - tilesetX: the x coordinate, in pixels, within the spritesheet (dungeon_tiles.png) of the top left of the tile
 * - tilesetY: the y coordinate, in pixels, within the spritesheet (dungeon_tiles.png) of the top left of the tile
 * - tilesizeX: the width of the tile
 * - tilesizeY: the height of the tile
 */
function identifySpaceType(x, y) {

    let returnObject = {
        spaceType: "",
        tilesetX: 0,
        tilesetY: 0,
        tilesizeX: 16,
        tilesizeY: 16
    };

    let canMoveUp = false;
    let canMoveLeft = false;
    let canMoveRight = false;
    let canMoveDown = false;

    // check for out of bounds (i.e. this move would move the player off the edge,
    // which also saves us from checking out of bounds of the array) and, if not
    // out of bounds, check if the space can be moved to (i.e. contains a corridor/room)
    if (x - 1 >= 0 && dungeon.maze[y][x - 1] > 0) {
        canMoveLeft = true;
    }
    if (x + 1 < dungeon.w && dungeon.maze[y][x + 1] > 0) {
        canMoveRight = true;
    }
    if (y - 1 >= 0 && dungeon.maze[y - 1][x] > 0) {
        canMoveUp = true;
    }
    if (y + 1 < dungeon.h && dungeon.maze[y + 1][x] > 0) {
        canMoveDown = true;
    }

    if (canMoveUp && canMoveRight && canMoveDown && canMoveLeft) {
        returnObject.spaceType = "all_exits";
        returnObject.tilesetX = 16;
        returnObject.tilesetY = 16;
    }
    else if (canMoveUp && canMoveRight && canMoveDown) {
        returnObject.spaceType = "left_wall";
        returnObject.tilesetX = 0;
        returnObject.tilesetY = 16;
    }
    else if (canMoveRight && canMoveDown && canMoveLeft) {
        returnObject.spaceType = "up_wall";
        returnObject.tilesetX = 16;
        returnObject.tilesetY = 0;
    }
    else if (canMoveDown && canMoveLeft && canMoveUp) {
        returnObject.spaceType = "right_wall";
        returnObject.tilesetX = 32;
        returnObject.tilesetY = 16;
    }
    else if (canMoveLeft && canMoveUp && canMoveRight) {
        returnObject.spaceType = "down_wall";
        returnObject.tilesetX = 16;
        returnObject.tilesetY = 32;
    }
    else if (canMoveUp && canMoveDown) {
        returnObject.spaceType = "vertical_corridor";
        returnObject.tilesetX = 144;
        returnObject.tilesetY = 16;
    }
    else if (canMoveLeft && canMoveRight) {
        returnObject.spaceType = "horizontal_corridor";
        returnObject.tilesetX = 112;
        returnObject.tilesetY = 32;
    }
    else if (canMoveUp && canMoveLeft) {
        returnObject.spaceType = "bottom_right";
        returnObject.tilesetX = 32;
        returnObject.tilesetY = 32;
    }
    else if (canMoveUp && canMoveRight) {
        returnObject.spaceType = "bottom_left";
        returnObject.tilesetX = 0;
        returnObject.tilesetY = 32;
    }
    else if (canMoveDown && canMoveLeft) {
        returnObject.spaceType = "top_right";
        returnObject.tilesetX = 32;
        returnObject.tilesetY = 0;
    }
    else if (canMoveDown && canMoveRight) {
        returnObject.spaceType = "top_left";
        returnObject.tilesetX = 0;
        returnObject.tilesetY = 0;
    }
    return returnObject;
}

/*
 * Once our page is fully loaded and ready, we call startAnimating
 * to kick off our animation loop.
 * We pass in a value - our fps - to control the speed of our animation.
 */
// Variables for controls
let control = {
    id: "",
    goLeft: false,
    goRight: false,
    goUp: false,
    goDown: false
};
// Let players contorl their character when the page finished loading
$(document).ready(function () {
    // event handler for keydown
    // Side note: When holding the key down player accelerate very fast unfair to other controls
    $("body").keydown(function(e){
        // pressed down
        if (e.which==40){
            // Change sprite to face down
            playerRender.direction = 0;
            control.goDown = true;
        }
        // pressed up
        if (e.which==38){
            // Change sprite to face up
            playerRender.direction = 200;
            control.goUp = true;
        }
        // pressed left
        if (e.which==37){
            // Change sprite to face left
            playerRender.direction = 400;
            control.goLeft = true;
        }
        // pressed right
        if (e.which==39){
            // Change sprite to face right
            playerRender.direction = 600;
            control.goRight = true;
        }

        // Send the control boolean and sessionid to server
        socket.emit("control", control);
    });
    // event handler for keyup
    $("body").keyup(function(e){
        // down released
        if (e.which==40){
            control.goDown = false;
        }
        // up released
        if (e.which==38){
            control.goUp = false;
        }
        // left released
        if (e.which==37){
            control.goLeft = false;
        }
        // right released
        if (e.which==39){
            control.goRight = false;
        }
        // Stop animation
        playerRender.shift = 0;
        // Update control in server
        socket.emit("control", control);
    });
    /* Mouse control starts here
     * Side note: Need to constantly click the mouse to move
     */
    // event handler for mouse control
    if(!mobileUser) {
        $("body").mousedown(function (e) {
            // pressed up
            if (e.pageX >= 80 && e.pageX <= 120 && e.pageY >= 360 && e.pageY <= 400) {
                playerRender.direction = 200;
                control.goUp = true;
            }
            // pressed left
            if (e.pageX >= 30 && e.pageX <= 70 && e.pageY >= 408 && e.pageY <= 450) {
                playerRender.direction = 400;
                control.goLeft = true;
            }
            // pressed right
            if (e.pageX >= 125 && e.pageX <= 170 && e.pageY >= 410 && e.pageY <= 450) {
                playerRender.direction = 600;
                control.goRight = true;
            }
            // pressed down
            if (e.pageX >= 80 && e.pageX <= 120 && e.pageY >= 455 && e.pageY <= 500) {
                playerRender.direction = 0;
                control.goDown = true;
            }
            socket.emit("control", control);
        });
        $("body").mouseup(function (e) {
            control.goUp = false;
            control.goDown = false;
            control.goRight = false;
            control.goLeft = false;
            socket.emit("control", control);
        });
        // Players are not allowed to move the mouse while controlling the character
        // This is to prevent characters still moving when the mouse is not in the control pad
        $("body").mousemove(function (e) {
            control.goUp = false;
            control.goDown = false;
            control.goRight = false;
            control.goLeft = false;
            socket.emit("control", control);
        });
    } else {
        /*Touch Control starts here*/
        // When there is a touch event happened in the canvas
        let myCanvas = document.getElementById("myCanvas");
        let mc = new Hammer(myCanvas);
        mc.on("tap", function (e) {
            if (e.center.x >= 80 && e.center.x <= 120 && e.center.y >= 360 && e.center.y <= 400) {
                playerRender.direction = 200;
                control.goUp = true;
            }
            if (e.center.x >= 30 && e.center.x <= 70 && e.center.y >= 408 && e.center.y <= 450) {
                playerRender.direction = 400;
                control.goLeft = true;
            }
            if (e.center.x >= 125 && e.center.x <= 170 && e.center.y >= 410 && e.center.y <= 450) {
                playerRender.direction = 600;
                control.goRight = true;
            }
            if (e.center.x >= 80 && e.center.x <= 120 && e.center.y >= 455 && e.center.y <= 500) {
                playerRender.direction = 0;
                control.goDown = true;
            }
            socket.emit("control", control);
        });
    }
    // Draw everything on canvas
    startAnimating(7);
});

let fpsInterval;
let then;

/*
 * The startAnimating function kicks off our animation (see Games on the Web I - HTML5 Graphics and Animations).
 */
function startAnimating(fps) {
    fpsInterval = 1000 / fps;
    then = Date.now();
    animate();
}
// This object contains variables for animation
let playerRender = {
    shift: 0,
    direction: 0,
    frameWidth: 140,
    frameHeight: 200,
    totalFrames: 4,
    currentFrame: 1
};

/*
 * The animate function is called repeatedly using requestAnimationFrame (see Games on the Web I - HTML5 Graphics and Animations).
 */
function animate() {
    requestAnimationFrame(animate);

    let now = Date.now();
    let elapsed = now - then;

    if (elapsed > fpsInterval) {
        then = now - (elapsed % fpsInterval);
        // Acquire both a canvas (using jQuery) and its associated context
        let canvas = $("canvas").get(0);
        let context = canvas.getContext("2d");

        // Calculate the width and height of each cell in our dungeon
        // by diving the pixel width/height of the canvas by the number of
        // cells in the dungeon
        let cellWidth = canvas.width / dungeon.w;
        let cellHeight = canvas.height / dungeon.h;

        // Clear the drawing area each animation cycle
        context.clearRect(0, 0, canvas.width, canvas.height);

        /* We check each one of our tiles within the dungeon using a nested for loop
         * which runs from 0 to the width of the dungeon in the x dimension
         * and from 0 to the height of the dungeon in the y dimension
         *
         * For each space in the dungeon, we check whether it is a space that can be
         * moved into (i.e. it isn't a 0 in the 2D array), and if so, we use the identifySpaceType
         * method to check which tile needs to be drawn.
         *
         * This returns an object containing the information required to draw a subset of the
         * tilesImage as appropriate for that tile.
         * See: https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/drawImage
         * to remind yourself how the drawImage method works.
         */
        for (let x = 0; x < dungeon.w; x++) {
            for (let y = 0; y < dungeon.h; y++) {
                if (dungeon.maze[y][x] > 0) {
                    let tileInformation = identifySpaceType(x, y);
                    context.drawImage(tilesImage,
                        tileInformation.tilesetX,
                        tileInformation.tilesetY,
                        tileInformation.tilesizeX,
                        tileInformation.tilesizeY,
                        x * cellWidth,
                        y * cellHeight,
                        cellWidth,
                        cellHeight);
                } else {
                    context.fillStyle = "black";
                    context.fillRect(
                        x * cellWidth,
                        y * cellHeight,
                        cellWidth,
                        cellHeight
                    );
                }
            }
        }

        // The start point is calculated by multiplying the cell location (dungeonStart.x, dungeonStart.y)
        // by the cellWidth and cellHeight respectively
        // Refer to: Games on the Web I - HTML5 Graphics and Animations, Lab Exercise 2
        context.drawImage(tilesImage,
            16, 80, 16, 16,
            dungeonStart.x * cellWidth,
            dungeonStart.y * cellHeight,
            cellWidth,
            cellHeight);

        // The goal is calculated by multiplying the cell location (dungeonEnd.x, dungeonEnd.y)
        // by the cellWidth and cellHeight respectively
        // Refer to: Games on the Web I - HTML5 Graphics and Animations, Lab Exercise 2
        context.drawImage(tilesImage,
            224, 80, 16, 16,
            dungeonEnd.x * cellWidth,
            dungeonEnd.y * cellHeight,
            cellWidth,
            cellHeight);
        // Using loop to animate character
        if(control.goDown==true || control.goUp==true || control.goLeft==true || control.goRight==true){
            playerRender.shift += playerRender.frameWidth-6.5;
        }
        if(playerRender.currentFrame === playerRender.totalFrames){
            playerRender.shift = 0;
            playerRender.currentFrame = 0;
        }
        playerRender.currentFrame++;
        // Draw a simple control pad
        context.drawImage(controlsImage, 20, canvas.height-150,140,140);

        // Show the time used to complete the previous maze
        context.font = "15px Comic Sans MS";
        context.fillStyle = "white";
        context.fillText("Previous maze's time record: "+timeUsed+" s", 20, 20);

        /*
         * A for loop is used to draw out all players according their coordinate and id
         * Other players will be draw as a coin to differentiate where the client is located
         */
        for(var id in players){
            player = players[id];
            if(id != sessionid){
               context.drawImage(rivalsImage,
                   20,
                   20,
                   40,
                   40,
                   player.x * cellWidth,
                   player.y * cellHeight,
                   cellWidth*1.5,
                   cellHeight*1.5);
            } else {
                context.drawImage(playersImage,
                    playerRender.shift,
                    playerRender.direction,
                    playerRender.frameWidth,
                    playerRender.frameHeight,
                    player.x * cellWidth,
                    player.y * cellHeight,
                    cellWidth,
                    cellHeight);
            }
        }

    }
}