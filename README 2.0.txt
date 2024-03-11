This readme assumes that you have already installed Node.js on your computer.  Node.js is available for
Windows, Mac and Linux, and can be downloaded at the following website: https://nodejs.org/en/
It is recommended that you install the LTS (currently v8.11.3).

Node is already pre-installed on the university machines in the John Dalton building.

For help setting up, running and using Node, check Real-time Servers I: Working with Node.js.

**************************************************************************************************

This code is a modified version of the skeleton code provided, hence the dungeon might looks similar to other classmates.

I have added a few PNG in the public folder:

- solis.png      -> The sprite that represents client in this game.
- arrow_keys.png -> This image is used as a controller for touch and mouse control.
- souls.png      -> The sprite that represents other players in this game.

Please make sure to install the required Node.js modules by opening a command line/PowerShell (or a Terminal on a Mac) and running the following command:
	npm install

Before runnning the code, please also turn on xampp control panel and start Apache and MySQL to allow the database to work else the whole game wouldn't work.
Please be sure to run create_table.js after turning on xampp to create a database and table for this game.
You can then run your server with the following command:
	node DungeonServer.js
		OR
	npm start
  
Open a browser and visit your client (turning your browser tab into a client) at:
	http://localhost:8081

If you want to test this code with devices please change a part of code in dungeonClient.js:
	const socket = io.connect("http://localhost:8081");
				TO
	const socket = io.connect("http://(your IP):8081");

Upon starting the game, you will see your unique session id on the very top, a dungeon maze below it and a scoreboard beside the dungeon.
Players will appear on the starting point everytime a new dungeon is generated.

To control your character please use the arrow keys on your keyboard or by simply clicking on the arrow keys on the canvas.
Side notes regarding controls:
- Keyboard control is a bit wonky
- Constant clicking is needed to move the character for the mouse control
- Constant tapping is needed to move the character for touch control

How To Play:

This game is very straightforward, just move your character to the stair like goal then proceed to play another dungeon with other players. 
GLHF :)

