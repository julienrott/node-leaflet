
/**
 * Module dependencies.
 */

var express = require('express')
  , routes = require('./routes')
  , user = require('./routes/user')
  , http = require('http')
  , path = require('path');

var assetManager = require('connect-assetmanager');
var assetHandler = require('connect-assetmanager-handlers');

var app = express();

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
            'leaflet-providers-0.0.1.js',
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

http.createServer(app).listen(app.get('port'), function(){
  console.log("Express server listening on port " + app.get('port'));
});
