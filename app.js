
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
    , excel = require("excel")
    , geocoder = require('geocoder')
    , io = require('socket.io')
    , mongo = require('mongodb')
    , Server = mongo.Server
    , Db = mongo.Db
    , mongoose = require("mongoose")
    , url = require('url')
    , csv = require('csv');

var assetManager = require('connect-assetmanager');
var assetHandler = require('connect-assetmanager-handlers');

var app = express();
var server = http.createServer(app);

var dbstring = (process.env.NODE_ENV === 'production') ? process.env.MONGOHQ_URL : "mongodb://localhost:27017/node-leaflet";

var mongoosedb = mongoose.connect(dbstring);
var ObjectId = mongoose.Types.ObjectId;
var Schema = mongoose.Schema;
var Addresses = new Schema({
    id: String,
    name: String,
    address: String,
    lat: Number,
    lng: Number,
    companyType: String,
    SNICode: String
});
var Address = mongoose.model('Address', Addresses);

io = io.listen(server);
io.set('log level', 2);

io.sockets.on('connection', function(socket) {
    socket.emit('connection');
    
    socket.on('getmarkers', function(options) {
        if (options) {
            if (options.companyType) {
                Address.find({companyType: options.companyType}, function(err, markers) {
                    socket.emit('receivemarkers', {markers: markers});
                });
            }
            if (options.SNICode) {
                Address.find({SNICode: options.SNICode}, function(err, markers) {
                    socket.emit('receivemarkers', {markers: markers});
                });
            }
        }
        else {
            Address.find({}, function(err, markers) {
                socket.emit('receivemarkers', {markers: markers});
            });
        }
    });
    
    socket.on('getCompanyTypes', function(data) {
        Address.distinct('companyType', {}, function(err, companyTypes) {
            companyTypes.sort();
            socket.emit('receiveCompanyTypes', {companyTypes: companyTypes});
        });
    });
    
    socket.on('getSNICodes', function(data) {
        Address.distinct('SNICode', {}, function(err, SNICodes) {
            SNICodes.sort();
            socket.emit('receiveSNICodes', {SNICodes: SNICodes});
        });
    });
});

var settings = {
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

function parseCSV(file) {
    var rows = new Array();
    var SNICodeIdx = 0;
    csv()
    .from.path(file, {delimiter: "\t"})
    /*.transform(function(data){
        data.unshift(data.pop());
        return data;
    })*/
    .on('record', function(data, index){
        if (index === 0) {
            for (idx in data) {
                var columnName = data[idx];
                if (columnName.indexOf('SNI') > -1) {
                    SNICodeIdx = idx;
                    break;
                }
            }
        }
        if (index > 0) {
            rows.push(data);
        }
    })
    .on('end', function(count){
        if (rows.length > 0) {
            waitAndGeocode(0, rows, SNICodeIdx);
        }
    })
    .on('error', function(error){
        console.error(error.message);
    });
}

function waitAndGeocode(idx, rows, SNICodeIdx) {
    var row = rows[idx];
    Address.find({"id": row[3]}, function(err, addresses) {
        if (!err && addresses.length === 0) {
            geocoder.geocode(row[1] + " Sweden", function(idx, row, SNICodeIdx) {
                return (function(err, data){
                    if (data.status === "OVER_QUERY_LIMIT") console.warn("OVER_QUERY_LIMIT");
                    if (err) console.warn(err.message);
                    if (!err && data.results.length > 0) {
                        var addr = {"lat": data.results[0].geometry.location.lat, 
                                        "lng": data.results[0].geometry.location.lng,
                                        "address": data.results[0].formatted_address,
                                        "name": row[0],
                                        "companyType": row[5],
                                        "SNICode": row[SNICodeIdx].substr(0, 5),
                                        "id": row[3],
                                        "_id": row[3]};
                        Address.collection.insert(addr, {safe:true},
                            function(err, objects) {
                                if (err) console.warn(err.message);
                                if (err && err.message.indexOf('E11000 ') !== -1) {
                                }
                            }
                        );
                    }
                });
            }(idx, row, SNICodeIdx));
        }
    });
    if (idx < rows.length - 1) {
        //wait beetween google geocoding API requests...
        setTimeout(function(){waitAndGeocode(idx + 1, rows, SNICodeIdx);}, 250);
    }
}

server.listen(app.get('port'), function(){
    console.log("Express server listening on port " + app.get('port'));
    console.log(process.env.NODE_ENV, process.env.NODE_ENV !== 'production');
});
