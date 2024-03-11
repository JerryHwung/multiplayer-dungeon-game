var mysql = require("mysql");

let connection = mysql.createConnection({
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: ''
});

// Establish a connection
connection.connect();

// Create a new database to store data from this game
connection.query("CREATE DATABASE IF NOT EXISTS dungeonGame;", function(error, result, fields) {
    if (error) {
        console.log("Error creating database: " + error.code);
    }
    else if (result) {
        console.log("Database created successfully.");
    }
});
// Use the newly created database
connection.query("USE dungeonGame;", function(error, result, fields) {
    if (error) {
        console.log("Error setting database: " + error.code);
    }
    else if (result) {
        console.log("Database successfully set.");
    }
});
// drop the table before creating
connection.query("DROP TABLE IF EXISTS scores", function(error, result, fields) {
    if (error) {
        // for a deployment app, we'd be more likely to use error.stack
        // which gives us a full stack trace
        console.log("Problem dropping scores table: " + error.code);
    }
    else if (result) {
        console.log("Scores table dropped successfully.");
    }
});
// Construct the query
let createScoreTableQuery = "CREATE TABLE scores(";
createScoreTableQuery += "player		VARCHAR (30)	,";
createScoreTableQuery += "timeused 	 FLOAT (6,3)		";
createScoreTableQuery += ")";

// Execute the query to create table
connection.query(createScoreTableQuery, function(error, result, fields){

    if (error) {
        console.log("Error creating scores table: " + error.code);
    }
    else if (result) {
        console.log("Scores table created successfully.");
    }
});
// close the connection cleanly, to ensure all of our queries have finished executing
connection.end(function(){
    console.log("Script has finished executing.");
});