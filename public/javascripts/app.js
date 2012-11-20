var markersLayer;

var socket = io.connect();

socket.on("connection", function(data) {
    socket.emit('getmarkers');
    socket.emit('getCompanyTypes');
        socket.emit('getSNICodes');
});

socket.on("receivemarkers", function(data) {
    if (markersLayer) {
        markersLayer.clearLayers();
        map.removeLayer(markersLayer);
    }
    markersLayer = new L.MarkerClusterGroup();

    var markers = data.markers;
    for (idx in markers) {
        var marker = markers[idx];
        var ml = new L.Marker(new L.LatLng(marker.lat, marker.lng));
        ml.bindPopup(marker.name + "<br/>" + marker.address);
        markersLayer.addLayer(ml);
    }
    map.addLayer(markersLayer);
});

socket.on("receiveCompanyTypes", function(data) {
    $('#companyTypesSelect').find('option').remove().end();
    var companyTypesSelect = $('#companyTypesSelect')[0];
    companyTypesSelect.add(new Option('No company type selected', 0));
    for (idx in data.companyTypes) {
        var companyType = data.companyTypes[idx];
        companyTypesSelect.add(new Option(companyType, companyType));
    }
});

socket.on("receiveSNICodes", function(data) {
    $('#SNICodesSelect').find('option').remove().end();
    var SNICodesSelect = $('#SNICodesSelect')[0];
    SNICodesSelect.add(new Option('No SNI Code selected', 0));
    for (idx in data.SNICodes) {
        var SNICode = data.SNICodes[idx];
        SNICodesSelect.add(new Option(SNICode, SNICode));
    }
});

var map = new L.Map('map', {
    center: new L.LatLng(57.6, 8.4),
    zoom: 5,
    attributionControl: true
});

var defaultLayer = new L.TileLayer.Stamen.Toner;
map.addLayer(defaultLayer);

var baseLayers = {
    "Stamen Toner": defaultLayer,
    "MapQuest OSM": new L.TileLayer.MapQuestOpen.OSM,
    "OpenStreetMap Default": new L.TileLayer.OpenStreetMap.Mapnik,
};
map.addControl(new L.Control.Layers(baseLayers,'',{collapsed: false}));

var uploader = new qq.FileUploader({
    // pass the dom node (ex. $(selector)[0] for jQuery users)
    element: document.getElementById('file-uploader'),
    // path to server-side upload script
    action: '/upload'
});

$(function() {
    $("#btn").click(function() {
        socket.emit('getmarkers');
        socket.emit('getCompanyTypes');
        socket.emit('getSNICodes');
    });
    
    $("#companyTypesSelect").change(function() {
        $("#SNICodesSelect")[0].selectedIndex = 0;
        if ($(this)[0].selectedIndex === 0) {
            socket.emit('getmarkers');
        }
        else {
            socket.emit('getmarkers', {companyType: $("#companyTypesSelect option:selected")[0].value});
        }
    });
    
    $("#SNICodesSelect").change(function() {
        $("#companyTypesSelect")[0].selectedIndex = 0;
        if ($(this)[0].selectedIndex === 0) {
            socket.emit('getmarkers');
        }
        else {
            socket.emit('getmarkers', {SNICode: $("#SNICodesSelect option:selected")[0].value});
        }
    });
});

