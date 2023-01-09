// tohle vsechno musis mit naimportovany (do console: npm install http nebo npm install sqlite3 a podobne, nektery uz muzou bejt preinstalled)
var http = require('http');
var sqlite3 = require('sqlite3').verbose();
const url = require('url');
var static = require("node-static");

// Database
// create and connect
var db = new sqlite3.Database('database.db', (err) => {
  if (err) {
    console.error(err.message);
  }
  console.log('Connected to the database.');
});

// create table
db.run(`CREATE TABLE IF NOT EXISTS data (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		boardid INTEGER,
		timestamp INTEGER,
		temp REAL,
		hum REAL,
		bmp REAL,
		uv REAL,
		lux REAL
	);
	`);

// http server

// static file
var file = new(static.Server)('index.html');

// create new http server
var server = http.createServer(function (req, res) {
	// try {} catch {} - kdyby se neco pokazilo, tak to nevypne server, ale nastane to, co je v catch, je to chyceni erroru
	try {
		// pokud url obsahuje /insertData
		if(req.url.indexOf("/insertData") !== -1) {
			// get data from url.. priklad: /insertData?temp=5, tenhle radek dokaze ziskat pomoci data["temp"] tu hodnotu 5
			var data = url.parse(req.url, true).query;
			
			if(data.pass !== "4xnA8kvLbgb2beGk") return;
			
			// vkladani do db
			db.run(`
				INSERT INTO data (timestamp, boardid, temp, hum, bmp, uv, lux) VALUES(
					${Date.now()},
					${data["boardid"]},
					${data["temp"]},
					${data["hum"]},
					${data["bmp"]},
					${data["uv"]},
					${data["lux"]}
				);
				`);
			// vypise na strance {"status":true}
			res.write("{\"status\":true}");
			// ukonceni response
			res.end();
		} else if(req.url.indexOf("/getData") !== -1) {
			var data = url.parse(req.url, true).query;

			var ts = data["ts"];
			var board = data["board"];

			// zacatek json array (json pole)
			var output = "[";

			// ziskani dat z db (vetsich nez timestamp ktery zadavas pri posilani pozadavaku, je to tu proto, abys zbytecne si nenechaval vypsat celou db)
			db.all("SELECT * FROM data WHERE timestamp > " + ts + (board != null ? " AND boardid = " + board : ""), [], (err, rows) => {
				// pokud error
				if (err) {
					res.write("[]");
					res.end();
					return console.error(err.message);
				}

				// projde vsechny radky z db
				for(row of rows) {
					// ziska id, timestamp a temp z radku
					var id = row.id;
					var boardId = row.boardid;
				 	var timestamp = row.timestamp;
				 	var temp = row.temp;
				 	var hum = row.hum;
				 	var bmp = row.bmp;
				 	var uv = row.uv;
				 	var lux = row.lux;
				  
				  	// prida do promenny output json objekt, priklad: {"id":1, "timestamp":123123132, "temp":5},
				  	output += '{"id":' + id + ', "timestamp":' + timestamp + ', "boardId":' + boardId + ', "temp":' + temp + ', "hum":' + hum + ', "bmp":' + bmp + ', "uv":' + uv + ', "lux":' + lux + '},';
			  	}

			  	// v cyklu nahore pridavam do output na konec carku, tu musime odebrat (substring) a pak pridam ] na ukonceni arraye (pole)
				output = output.substring(0, output.length - 1) + "]";
				if(output.length == 1) {
					output = "[]";
				}

				// vypises a rdy
				res.writeHead(200, {
					'Access-Control-Allow-Origin' : '*',
				});
				res.end(output);
			});
		} else {
			// static file = index.html
			file.serve(req, res);
		}
	} catch(e) {
		console.log(e);
		res.write("err");
		res.end();
	}
});

// port na kterym to bezi (http://localhost:5000 po spusteni)
server.listen(5000);

console.log("Server is running...");
