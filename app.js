
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
    , Db = mongo.Db;

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

var dbstring = process.env.MONGOHQ_URL;
console.log(dbstring);
var dbhost = (process.env.NODE_ENV === 'production') ? dbstring.hostname : 'localhost';
var dbport = (process.env.NODE_ENV === 'production') ? dbstring.port : 27017;

var dbserver = new Server(dbhost, dbport, {auto_reconnect: true});
var db = new Db('node-leaflet', dbserver, {safe: true});

db.open(function(err, db) {
  if(!err) {
    console.log("We are connected");
  }
});

io = io.listen(server);
io.set('log level', 2);

io.sockets.on('connection', function(socket) {
    sock = socket;
    socket.on('getmarkers', function(data) {
        //console.log(data);
        /*var markers = new Array();
        markers.push({"lat": "57.6", "lng": "8.4"});
        markers.push({"lat": "57.4", "lng": "8.4"});
        socket.emit('receivemarkers', {markers: markers});*/
        /*var markers = db.addresses.find({});
        socket.emit('receivemarkers', {markers: markers});*/
        var collection = new mongo.Collection(db, 'addresses');
        collection.find({}, {}).toArray(function(err, markers) {
            //console.dir(markers);
            console.log(markers.length);
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
                parseXLS(targetfile);
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
            /*geocoder.geocode(row[1], function(idx, row) {
                return(function(err, data) {
                    if (err) console.warn(err.message);
                    if (!err && data.results.length > 0) {
                        console.log(idx);
                        var addr = {"lat": data.results[0].geometry.location.lat, 
                                        "lng": data.results[0].geometry.location.lng,
                                        "address": data.results[0].formatted_address,
                                        "name": row[0],
                                        "_id": row[3]};
                        var collection = new mongo.Collection(db, 'addresses');
                        collection.insert(addr, {safe:true},
                            function(err, objects) {
                                if (err) console.warn(err.message);
                                if (err && err.message.indexOf('E11000 ') !== -1) {
                                }
                            }
                        );
                    }
                });
            }(idx, row));*/
        }
        /*console.log("---------------------------------------------");
        console.log(rows.length);
        console.log("=============================================");
        for (idx in rows) {
            var row = rows[idx];
            geocoder.geocode(row[1], function(idx, row) {
                return (function(err, data){
                    if (err) console.warn(err.message);
                    if (!err && data.results.length > 0) {
                        console.log(idx);
                        var addr = {"lat": data.results[0].geometry.location.lat, 
                                        "lng": data.results[0].geometry.location.lng,
                                        "address": data.results[0].formatted_address,
                                        "name": row[0],
                                        "_id": row[3]};
                        var collection = new mongo.Collection(db, 'addresses');
                        collection.insert(addr, {safe:true},
                            function(err, objects) {
                                if (err) console.warn(err.message);
                                if (err && err.message.indexOf('E11000 ') !== -1) {
                                }
                            }
                        );
                    }
                });
            }(idx, row));
        }*/
        waitAndGeocode(0, rows);
    });
    //xlsx(file);
}

function waitAndGeocode(idx, rows) {
    //console.log(rows.length, idx);
    var row = rows[idx];
    geocoder.geocode(row[1], function(idx, row) {
        return (function(err, data){
            if (err) console.warn(err.message);
            if (!err && data.results.length > 0) {
                var addr = {"lat": data.results[0].geometry.location.lat, 
                                "lng": data.results[0].geometry.location.lng,
                                "address": data.results[0].formatted_address,
                                "name": row[0],
                                "_id": row[3]};
                var collection = new mongo.Collection(db, 'addresses');
                collection.insert(addr, {safe:true},
                    function(err, objects) {
                        //if (err) console.warn(err.message);
                        if (err && err.message.indexOf('E11000 ') !== -1) {
                        }
                    }
                );
            }
        });
    }(idx, row));
    if (idx < rows.length - 1) {
        setTimeout(function(){waitAndGeocode(idx + 1, rows);}, 250);
    }
}

function callSaveInDB(callback) {
    callback.apply(arguments);
}

function saveInDB(err, data) {
    console.log(err, data);
    if (data.results.length > 0) {
        var address = {"lat": data.results[0].geometry.location.lat, 
                        "lng": data.results[0].geometry.location.lng,
                        "address": data.results[0].formatted_address};
        var collection = new mongo.Collection(db, 'addresses');
        /*collection.insert(address, {safe:true},
            function(err, objects) {
                if (err) console.warn(err.message);
                if (err && err.message.indexOf('E11000 ') !== -1) {
                    console.log("already exists : " + objects);
                }
            }
        );*/
    }
}

server.listen(app.get('port'), function(){
    console.log("Express server listening on port " + app.get('port'));
    console.log(process.env.NODE_ENV - process.env.NODE_ENV !== 'production');
});
