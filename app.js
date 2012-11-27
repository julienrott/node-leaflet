
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
    description: String,
    branchMain: String,
    branchSub1: String,
    branchSub2: String,
    SNICode1: String,
    SNICode2: String,
    SNICode3: String,
    SNICode4: String,
    SNICode5: String
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
                return;
            }
            
            if (options.unlinkedSNICodes) {
                var orOptions = new Array();
                
                if(options.SNICode1 && options.SNICode1 != null) {
                    orOptions.push({SNICode1: options.SNICode1});
                }
                
                if(options.SNICode2 && options.SNICode2 != null) {
                    orOptions.push({SNICode2: options.SNICode2});
                }
                
                if(options.SNICode3 && options.SNICode3 != null) {
                    orOptions.push({SNICode3: options.SNICode3});
                }
                
                if(options.SNICode4 && options.SNICode4 != null) {
                    orOptions.push({SNICode4: options.SNICode4});
                }
                
                if(options.SNICode5 && options.SNICode5 != null) {
                    orOptions.push({SNICode5: options.SNICode5});
                }
                
                Address.find({$or: orOptions}, function(err, markers) {
                    socket.emit('receivemarkers', {markers: markers});
                });
                
                return;
            }
            else {
                if (options.SNICode5) {
                    Address.find({SNICode1: options.SNICode1, 
                                  SNICode2: options.SNICode2, 
                                  SNICode3: options.SNICode3, 
                                  SNICode4: options.SNICode4, 
                                  SNICode5: options.SNICode5}, function(err, markers) {
                        socket.emit('receivemarkers', {markers: markers});
                    });
                    return;
                }
                if (options.SNICode4) {
                    Address.find({SNICode1: options.SNICode1, 
                                  SNICode2: options.SNICode2, 
                                  SNICode3: options.SNICode3, 
                                  SNICode4: options.SNICode4}, function(err, markers) {
                        socket.emit('receivemarkers', {markers: markers});
                        Address.distinct('SNICode5', {SNICode1: options.SNICode1,
                                                      SNICode2: options.SNICode2,
                                                      SNICode3: options.SNICode3,
                                                      SNICode4: options.SNICode4}, function(err, SNICodes5) {
                            socket.emit('receiveSNICodes5', {SNICodes5: SNICodes5});
                        });
                    });
                    return;
                }
                if (options.SNICode3) {
                    Address.find({SNICode1: options.SNICode1, 
                                  SNICode2: options.SNICode2, 
                                  SNICode3: options.SNICode3}, function(err, markers) {
                        socket.emit('receivemarkers', {markers: markers});
                        Address.distinct('SNICode4', {SNICode1: options.SNICode1,
                                                      SNICode2: options.SNICode2,
                                                      SNICode3: options.SNICode3}, function(err, SNICodes4) {
                            socket.emit('receiveSNICodes4', {SNICodes4: SNICodes4});
                        });
                    });
                    return;
                }
                if (options.SNICode2) {
                    Address.find({SNICode1: options.SNICode1, 
                                  SNICode2: options.SNICode2}, function(err, markers) {
                        socket.emit('receivemarkers', {markers: markers});
                        Address.distinct('SNICode3', {SNICode1: options.SNICode1,
                                                      SNICode2: options.SNICode2}, function(err, SNICodes3) {
                            socket.emit('receiveSNICodes3', {SNICodes3: SNICodes3});
                        });
                    });
                    return;
                }
                if (options.SNICode1) {
                    Address.find({SNICode1: options.SNICode1}, function(err, markers) {
                        socket.emit('receivemarkers', {markers: markers});
                        Address.distinct('SNICode2', {SNICode1: options.SNICode1}, function(err, SNICodes2) {
                            socket.emit('receiveSNICodes2', {SNICodes2: SNICodes2});
                        });
                    });
                    return;
                }
            }
        }
        else {
            Address.find({}, function(err, markers) {
                socket.emit('receivemarkers', {markers: markers});
            });
            return;
        }
    });
    
    socket.on('getCompanyTypes', function(data) {
        Address.distinct('companyType', {}, function(err, companyTypes) {
            companyTypes.sort();
            socket.emit('receiveCompanyTypes', {companyTypes: companyTypes});
        });
    });
    
    socket.on('getUnlinkedSNICodes', function(data) {
        Address.distinct('SNICode2', {}, function(err, SNICodes2) {
            SNICodes2.sort();
            Address.distinct('SNICode3', {}, function(err, SNICodes3) {
                SNICodes3.sort();
                Address.distinct('SNICode4', {}, function(err, SNICodes4) {
                    SNICodes4.sort();
                    Address.distinct('SNICode5', {}, function(err, SNICodes5) {
                        SNICodes5.sort();
                        socket.emit('receiveUnlinkedSNICodes', {SNICodes2: SNICodes2,
                                                                SNICodes3: SNICodes3,
                                                                SNICodes4: SNICodes4,
                                                                SNICodes5: SNICodes5});
                    });
                });
            });
        });
    });
    
    socket.on('getSNICodes1', function(data) {
        Address.distinct('SNICode1', {}, function(err, SNICodes1) {
            SNICodes1.sort();
            socket.emit('receiveSNICodes1', {SNICodes1: SNICodes1});
        });
    });
    
    socket.on('getPostcodes', function(data) {
        Address.distinct('postcode', {}, function(err, postcodes) {
            var postcode = postcodes[0];
            console.log(postcode);
            /*geocoder.geocode(postcode + " Sweden", function() {
                return (function(err, data) {
                    if (data.status === "OVER_QUERY_LIMIT") console.warn("OVER_QUERY_LIMIT");
                    if (err) console.warn(err.message);
                    if (!err && data.results.length > 0) {
                        console.log(JSON.stringify(data));
                    }
                });
            }());*/
            cloudmateGeocode(socket);
        });
    });
});

function cloudmateGeocode(socket) {
    //http://geocoding.cloudmade.com/ec1cb2ec4f494d99a78fca87f80d1935/geocoding/v2/find.geojs?query=postcode:417%2058;country:sweden&return_geometry=true
    var cloudmateapikey = "ec1cb2ec4f494d99a78fca87f80d1935";
    var host = "geocoding.cloudmade.com";
    //var path = "/" + cloudmateapikey + "/geocoding/v2/find.geojs?results=1&return_geometry=true&query=" + encodeURIComponent("postcode:417 58;country:sweden");
    var path = "/" + cloudmateapikey + "/geocoding/v2/find.geojs?results=1&return_geometry=true&query=" + encodeURIComponent("411 20 Gothenburg, Västra Götaland County, Sweden");
    var options = {
        host: host,
        path: path
    }

    http.get(options, function(res) {
        //res.setEncoding('utf8');
        var geocoderes = '';
        res.on('data', function (data) {
            geocoderes += data;
        });
        res.on('end', function() {
            try {
                var result = JSON.parse(geocoderes);
                //var lat = result.features[0].centroid.coordinates[0];
                //var lng = result.features[0].centroid.coordinates[1];
                console.log('geocoderes : ', geocoderes);
                if (result.features.length > 0) {
                    var feature = result.features[0];
                    feature.type = "Feature";
                    socket.emit('receivePostcodes', feature);
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
    var columns = {};
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
                if (/description/i.test(columnName)) {
                    columns.description = idx;
                    continue;
                }
                if (/branch\s+\(main\)/i.test(columnName)
                        || /branch\s+\(master\)/i.test(columnName)) {
                    columns.branchMain = idx;
                    continue;
                }
                if (/branch\s+\(sub\)/i.test(columnName)) {
                    if (!columns.branchSub1) {
                        columns.branchSub1 = idx;
                        continue;
                    }
                    if (!columns.branchSub2) {
                        columns.branchSub2 = idx;
                        continue;
                    }
                }
                if (/sni\s+[A-z]+\s+\#*1/i.test(columnName)) {
                    columns.SNICode1 = idx;
                    continue;
                }
                if (/sni\s+[A-z]+\s+\#*2/i.test(columnName)) {
                    columns.SNICode2 = idx;
                    continue;
                }
                if (/sni\s+[A-z]+\s+\#*3/i.test(columnName)) {
                    columns.SNICode3 = idx;
                    continue;
                }
                if (/sni\s+[A-z]+\s+\#*4/i.test(columnName)) {
                    columns.SNICode4 = idx;
                    continue;
                }
                if (/sni\s+[A-z]+\s+\#*5/i.test(columnName)) {
                    columns.SNICode5 = idx;
                    continue;
                }
            }
        }
        if (index > 0) {
            rows.push(data);
        }
    })
    .on('end', function(count){
        if (rows.length > 0) {
            waitAndGeocode(0, rows, columns);
        }
    })
    .on('error', function(error){
        console.error(error.message);
    });
}

function waitAndGeocode(idx, rows, columns) {
    var row = rows[idx];
    Address.find({"id": row[3]}, function(err, addresses) {
        if (!err && addresses.length === 0) {
            geocoder.geocode(row[1] + " Sweden", function(idx, row, columns) {
                return (function(err, data) {
                    if (data.status === "OVER_QUERY_LIMIT") console.warn("OVER_QUERY_LIMIT");
                    if (err) console.warn(err.message);
                    if (!err && data.results.length > 0) {
                        var addr = {"lat": data.results[0].geometry.location.lat, 
                                    "lng": data.results[0].geometry.location.lng,
                                    "address": data.results[0].formatted_address,
                                    "postcode": row[2],
                                    "name": row[0],
                                    "companyType": row[5],
                                    "description": row[columns.description],
                                    "branchMain": (columns.branchMain) ? row[columns.branchMain] : null,
                                    "branchSub1": (columns.branchSub1) ? row[columns.branchSub1] : null,
                                    "branchSub2": (columns.branchSub2) ? row[columns.branchSub2] : null,
                                    "SNICode1": (columns.SNICode1) ? row[columns.SNICode1].substr(0, 5) : null,
                                    "SNICode2": (columns.SNICode2) ? row[columns.SNICode2].substr(0, 5) : null,
                                    "SNICode3": (columns.SNICode3) ? row[columns.SNICode3].substr(0, 5) : null,
                                    "SNICode4": (columns.SNICode4) ? row[columns.SNICode4].substr(0, 5) : null,
                                    "SNICode5": (columns.SNICode5) ? row[columns.SNICode5].substr(0, 5) : null,
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
            }(idx, row, columns));
        }
    });
    if (idx < rows.length - 1) {
        //wait beetween google geocoding API requests...
        setTimeout(function(){waitAndGeocode(idx + 1, rows, columns);}, 250);
    }
}

server.listen(app.get('port'), function(){
    console.log("Express server listening on port " + app.get('port'));
    console.log(process.env.NODE_ENV, process.env.NODE_ENV !== 'production');
    console.log(/branch\s+\(main\)/i.test("Branch (Main)"));
    console.log(/branch\s+\(main\)/i.test("Branch (main)"));
    console.log(/branch\s+\(sub\)/i.test("Branch (sub)"));
    console.log(/branch\s+\(sub\)/i.test("Branch (Sub)"));
    console.log(/sni\s+[A-z]+\s+\#*1/i.test("SNI code 1"));
    console.log(/sni\s+[A-z]+\s+\#*1/i.test("SNI code #1"));
});
