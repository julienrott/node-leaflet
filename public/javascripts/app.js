//var map = L.map('map').setView([51.505, -0.09], 13);
var markersLayer;

var socket = io.connect();

socket.on("connection", function(data) {
    socket.emit('getmarkers');
});

socket.on("receivemarkers", function(data) {
    if (markersLayer) {
        markersLayer.clearLayers();
        map.removeLayer(markersLayer);
    }
    markersLayer = new L.MarkerClusterGroup();

    var markers = data.markers;
    //var markerstab = new Array();
    for (idx in markers) {
        var marker = markers[idx];
        //markerstab.push(new L.Marker(new L.LatLng(marker.lat, marker.lng)));
        var ml = new L.Marker(new L.LatLng(marker.lat, marker.lng));
        ml.bindPopup(marker.name + "<br/>" + marker.address);
        markersLayer.addLayer(ml);
    }
    map.addLayer(markersLayer);
    //markersLayer.addLayer(markerstab);
    //map.fitBounds(markersLayer.getBounds());
});

var map = new L.Map('map', {
    center: new L.LatLng(57.6, 8.4),
    zoom: 5,
    attributionControl: true
});

//var defaultLayer = new L.TileLayer.OpenStreetMap.Mapnik;
var defaultLayer = new L.TileLayer.Stamen.Toner;
map.addLayer(defaultLayer);

var baseLayers = {
    "Stamen Toner": defaultLayer,
    "MapQuest OSM": new L.TileLayer.MapQuestOpen.OSM,
    "OpenStreetMap Default": new L.TileLayer.OpenStreetMap.Mapnik,
};
map.addControl(new L.Control.Layers(baseLayers,'',{collapsed: false}));

//var markersLayer = new L.MarkerClusterGroup();
//map.addLayer(markersLayer);

var uploader = new qq.FileUploader({
    // pass the dom node (ex. $(selector)[0] for jQuery users)
    element: document.getElementById('file-uploader'),
    // path to server-side upload script
    action: '/upload'
});

$(function() {
    $("#btn").click(function() {
        /*var markers = new L.MarkerClusterGroup();
        markers.addLayer(new L.Marker(new L.LatLng(57.6, 8.4)));
        map.addLayer(markers);*/
        socket.emit('getmarkers');
    });
});

/*var baseLayers = {
    "OpenStreetMap Default": defaultLayer,
    "OpenStreetMap German Style": new L.TileLayer.OpenStreetMap.DE,
    "OpenStreetMap Black and White": new L.TileLayer.OpenStreetMap.BlackAndWhite,
    "Thunderforest OpenCycleMap": new L.TileLayer.Thunderforest.OpenCycleMap,
    "Thunderforest Transport": new L.TileLayer.Thunderforest.Transport,
    "Thunderforest Landscape": new L.TileLayer.Thunderforest.Landscape,
    "MapQuest OSM": new L.TileLayer.MapQuestOpen.OSM,
    "MapQuest Aerial": new L.TileLayer.MapQuestOpen.Aerial,
    "MapBox Simple": new L.TileLayer.MapBox.Simple,
    "MapBox Streets": new L.TileLayer.MapBox.Streets,
    "MapBox Light": new L.TileLayer.MapBox.Light,
    "MapBox Lacquer": new L.TileLayer.MapBox.Lacquer,
    "MapBox Warden": new L.TileLayer.MapBox.Warden,
    "Stamen Toner": new L.TileLayer.Stamen.Toner,
    "Stamen Terrain": new L.TileLayer.Stamen.Terrain,
    "Stamen Watercolor": new L.TileLayer.Stamen.Watercolor,
    "Esri WorldStreetMap": new L.TileLayer.Esri.WorldStreetMap,
    "Esri DeLorme": new L.TileLayer.Esri.DeLorme,
    "Esri WorldTopoMap": new L.TileLayer.Esri.WorldTopoMap,
    "Esri WorldImagery": new L.TileLayer.Esri.WorldImagery,
    "Esri OceanBasemap": new L.TileLayer.Esri.OceanBasemap,
    "Esri NatGeoWorldMap": new L.TileLayer.Esri.NatGeoWorldMap
};
map.addControl(new L.Control.Layers(baseLayers,'',{collapsed: false}));*/
