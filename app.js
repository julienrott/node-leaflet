
/**
 * Module dependencies.
 */

var express = require('express')
    , routes = require('./routes')
    , user = require('./routes/user')
    , http = require('http')
    , path = require('path')
    , fs = require('fs')
    , util = require('util')
    , uuid = require('node-uuid')
    //, xlsx = require('xlsx-2.0.0');
    , excel = require("excel")
    , geocoder = require('geocoder')
    , io = require('socket.io')
    , mongo = require('mongodb')
    , Server = mongo.Server
    , Db = mongo.Db
    , mongoose = require("mongoose")
    , url = require('url')
    , csv = require('csv');

eval(fs.readFileSync('jszip.js') + '');
eval(fs.readFileSync('jszip-load.js') + '');
eval(fs.readFileSync('jszip-deflate.js') + '');
eval(fs.readFileSync('jszip-inflate.js') + '');
eval(fs.readFileSync('xlsx-2.0.0.js') + '');

var assetManager = require('connect-assetmanager');
var assetHandler = require('connect-assetmanager-handlers');

var app = express();
var server = http.createServer(app);
var sock;

var dbstring = (process.env.NODE_ENV === 'production') ? process.env.MONGOHQ_URL : "mongodb://localhost:27017/node-leaflet";
console.log(dbstring);
var dbhost = (process.env.NODE_ENV === 'production') ? dbstring.auth + '@' + dbstring.hostname : 'localhost';
var dbport = (process.env.NODE_ENV === 'production') ? dbstring.port : 27017;

//var dbserver = new Server(dbhost, dbport, {auto_reconnect: true});
//var dbserver = new Server("mongodb://localhost:27017", 27017, {auto_reconnect: true});
//var db = new Db('node-leaflet', dbserver, {safe: true});

/*db.open(function(err, db) {
  if(!err) {
    console.log("We are connected");
  }
  else {
    console.log(err);
  }
});*/

var mongoosedb = mongoose.connect(dbstring);
var ObjectId = mongoose.Types.ObjectId;
var Schema = mongoose.Schema;
var Addresses = new Schema({
    id: String,
    name: String,
    address: String,
    lat: Number,
    lng: Number
});
var Address = mongoose.model('Address', Addresses);

io = io.listen(server);
io.set('log level', 2);

io.sockets.on('connection', function(socket) {
    sock = socket;
    
    socket.emit('connection');
    
    socket.on('getmarkers', function(data) {
        /*var collection = new mongo.Collection(db, 'addresses');
        collection.find({}, {}).toArray(function(err, markers) {
            //console.dir(markers);
            console.log(markers.length);
            socket.emit('receivemarkers', {markers: markers});
        });*/
        
        Address.find({}, function(err, markers) {
            //console.log(markers.length);
            socket.emit('receivemarkers', {markers: markers});
        });
    });
});

var settings = {
    //uploadpath: __dirname + '/uploads/',
    uploadpath: '/tmp/',
    tmpuploadpath: '/tmp/'
};

app.configure(function(){
    app.set('port', process.env.PORT || 3000);
    app.set('views', __dirname + '/views');
    app.set('view engine', 'jade');
    app.use(express.favicon());
    app.use(express.logger('dev'));
    app.use(express.bodyParser());
    app.use(express.methodOverride());
    app.use(app.router);
    app.use(express.static(path.join(__dirname, 'public')));
});

app.configure('development', function(){
    app.use(express.errorHandler());
});

app.get('/', routes.index);
app.get('/users', user.list);

var assetManagerGroups = {
    'js': {
        'route': /\/javascripts\/app.min.js/
        , 'path': './public/javascripts/'
        , 'dataType': 'javascript'
        , 'files': [
            'jquery-1.7.1.min.js',
            'leaflet-providers-0.0.1.js',
            'fileuploader.js',
            'leaflet.markercluster.js',
            'app.js'
        ]
        , debug: (process.env.NODE_ENV !== 'production')
    }, 'css': {
        'route': /\/stylesheets\/style.min.css/
        , 'path': './public/stylesheets/'
        , 'dataType': 'css'
        , 'files': [
            'style.css'
        ]
        , 'preManipulate': {
            // Regexp to match user-agents including MSIE.
            'MSIE': [
                assetHandler.yuiCssOptimize
                , assetHandler.fixVendorPrefixes
                , assetHandler.fixGradients
                , assetHandler.stripDataUrlsPrefix
            ],
            // Matches all (regex start line)
            '^': [
                assetHandler.yuiCssOptimize
                , assetHandler.fixVendorPrefixes
                , assetHandler.fixGradients
                , assetHandler.replaceImageRefToBase64(__dirname + '/public')
            ]
        }
        , debug: (process.env.NODE_ENV !== 'production')
    }
};

var assetsManagerMiddleware = assetManager(assetManagerGroups);
app.use('/'
    , assetsManagerMiddleware
    //, Connect.static(__dirname + '/public')
);

// Route that takes the post upload request and sends the server response
app.post('/upload', function(req, res) {
    uploadFile(req, settings.uploadpath, function(data) {
        if(data.success)
            res.send(JSON.stringify(data), {'Content-Type': 'text/plain'}, 200);
        else
            res.send(JSON.stringify(data), {'Content-Type': 'text/plain'}, 404);
    });
});

// Mainfunction to recieve and process the file upload data asynchronously
var uploadFile = function(req, targetdir, callback) {

    // Moves the uploaded file from temp directory to it's destination
    // and calls the callback with the JSON-data that could be returned.
    var moveToDestination = function(sourcefile, targetfile) {
        moveFile(sourcefile, targetfile, function(err) {
            if(!err) {
                callback({success: true});
                //parseXLS(targetfile);
                parseCSV(targetfile);
            }
            else {
                callback({success: false, error: err});
            }
        });
    };

    // Direct async xhr stream data upload, yeah baby.
    if(req.xhr) {
        var fname = req.header('x-file-name');

        // Be sure you can write to '/tmp/'
        var tmpfile = '/tmp/'+uuid.v1();

        // Open a temporary writestream
        var ws = fs.createWriteStream(tmpfile);
        ws.on('error', function(err) {
            console.log("uploadFile() - req.xhr - could not open writestream.");
            callback({success: false, error: "Sorry, could not open writestream."});
        });
        ws.on('close', function(err) {
            moveToDestination(tmpfile, targetdir+fname);
        });

        // Writing filedata into writestream
        req.on('data', function(data) {
            ws.write(data);
        });
        req.on('end', function() {
            ws.end();
        });
    }

    // Old form-based upload
    else {
        moveToDestination(req.files.qqfile.path, targetdir+req.files.qqfile.name);
    }
};

// Moves a file asynchronously over partition borders
var moveFile = function(source, dest, callback) {
    var is = fs.createReadStream(source)

    is.on('error', function(err) {
        console.log('moveFile() - Could not open readstream.');
        callback('Sorry, could not open readstream.')
    });
    is.on('end', function() {
        fs.unlinkSync(source);
        callback();
    });
    
    var os = fs.createWriteStream(dest);
    os.on('error', function(err) {
        console.log('moveFile() - Could not open writestream.');
        callback('Sorry, could not open writestream.');
    });
    
    is.pipe(os);
};

var markers;

function addToArray(address, sendToClient) {
    markers.push({"lat": address.geometry.location.lat, 
                "lng": address.geometry.location.lng,
                "address": address.formatted_address});
    if (sendToClient) {
        sock.emit('receivemarkers', {markers: markers});
    }
}

function parseXLS(file) {
    excel(file, function(xlsdata) {
        console.log(xlsdata.length);
        var rows = new Array();
        for (idx in xlsdata) {
            var row = xlsdata[idx];
            rows.push(row);
        }
        waitAndGeocode(0, rows);
    });
    //xlsx(file);
}

function parseCSV(file) {
    //console.log("start parsing csv file : " + file);
    var rows = new Array();
    csv()
    .from.path(file, {delimiter: "\t"})
    /*.transform(function(data){
        data.unshift(data.pop());
        return data;
    })*/
    .on('record', function(data,index){
        //console.log('#'+index+' '+ data);
        if (index > 0) {
            rows.push(data);
            //mapQuestGeocode(data);
            //cloudmateGeocode(data);
        }
        //console.log('rows', rows.length);
    })
    .on('end', function(count){
        //console.log("end parsing csv, nb rows to geocode : ", rows.length);
        if (rows.length > 0) waitAndGeocode(0, rows);
    })
    .on('error', function(error){
        console.error(error.message);
    });
}

function cloudmateGeocode(row) {
    var cloudmateapikey = "ec1cb2ec4f494d99a78fca87f80d1935";
    var host = "geocoding.cloudmade.com";
    var path = "/" + cloudmateapikey + "/geocoding/v2/find.js?results=1&query=" + encodeURIComponent(row[1]);
    
    var options = {
        host: host,
        path: path
    }

    var request = 'http://' + host + path;
    //console.log('request : ', request);

    http.get(options, function(res) {
        //res.setEncoding('utf8');
        var geocoderes = '';
        res.on('data', function (data) {
            geocoderes += data;
        });
        res.on('end', function() {
            try {
                var result = JSON.parse(geocoderes);
                var lat = result.features[0].centroid.coordinates[0];
                var lng = result.features[0].centroid.coordinates[1];
                //console.log('data : ', lat, lng);
                if (result.features.length > 0) {
                    var addr = {"lat": lat, 
                                    "lng": lng,
                                    "address": row[1],
                                    "name": row[0],
                                    "_id": row[3]};
                    Address.collection.insert(addr, {safe:true},
                        function(err, objects) {
                            //if (err) console.warn(err.message);
                            if (err && err.message.indexOf('E11000 ') !== -1) {
                            }
                        }
                    );
                }
            }
            catch (ex) {
                console.error(ex);
            }
        });
        res.on('error', function(err) {
            console.error(err);
        });
        res.on(500, function(err) {
            console.error(err);
        });
    });
}

function mapQuestGeocode(row) {
    var mapquestapikey = "Fmjtd%7Cluuan9uan5%2Caw%3Do5-96r256";
    var host = "www.mapquestapi.com";
    var path = "/geocoding/v1/address?key=" + mapquestapikey + "&location=" + encodeURIComponent(row[1]);
    
    var options = {
        host: host,
        path: path
    }

    var request = 'http://' + host + path;
    //console.log('request : ' + request);

    http.get(options, function(res) {
        //res.setEncoding('utf8');
        var geocoderes = '';
        res.on('data', function (data) {
            geocoderes += data;
        });
        res.on('end', function() {
            var res = JSON.parse(geocoderes);
            //console.log('data : ' + JSON.stringify(res.results[0].locations[0].latLng));
            if (res.results.length > 0 && res.results[0].locations.length > 0) {
                var addr = {"lat": res.results[0].locations[0].latLng.lat, 
                                "lng": res.results[0].locations[0].latLng.lng,
                                "address": row[1],
                                "name": row[0],
                                "_id": row[3]};
                Address.collection.insert(addr, {safe:true},
                    function(err, objects) {
                        //if (err) console.warn(err.message);
                        if (err && err.message.indexOf('E11000 ') !== -1) {
                        }
                    }
                );
            }
        });
    });
}

function waitAndGeocode(idx, rows) {
    var row = rows[idx];
    Address.find({"id": row[3]}, function(err, addresses) {
        if (!err && addresses.length === 0) {
            geocoder.geocode(row[1], function(idx, row) {
                return (function(err, data){
                    //console.log(err, data.status);
                    if (data.status === "OVER_QUERY_LIMIT") console.warn("OVER_QUERY_LIMIT");
                    if (err) console.warn(err.message);
                    if (!err && data.results.length > 0) {
                        var addr = {"lat": data.results[0].geometry.location.lat, 
                                        "lng": data.results[0].geometry.location.lng,
                                        "address": data.results[0].formatted_address,
                                        "name": row[0],
                                        "id": row[3],
                                        "_id": row[3]};
                        //var collection = new mongo.Collection(db, 'addresses');
                        //collection.insert(addr, {safe:true},
                        Address.collection.insert(addr, {safe:true},
                            function(err, objects) {
                                if (err) console.warn(err.message);
                                if (err && err.message.indexOf('E11000 ') !== -1) {
                                }
                            }
                        );
                    }
                });
            }(idx, row));
        }
    });
    if (idx < rows.length - 1) {
        setTimeout(function(){waitAndGeocode(idx + 1, rows);}, 250);
    }
    else {
        //console.log("end geocoding");
    }
}

server.listen(app.get('port'), function(){
    console.log("Express server listening on port " + app.get('port'));
    console.log(process.env.NODE_ENV, process.env.NODE_ENV !== 'production');
});
