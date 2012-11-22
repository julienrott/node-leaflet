var markersLayer;

var socket = io.connect();

socket.on("connection", function(data) {
    socket.emit('getmarkers');
    socket.emit('getCompanyTypes');
    socket.emit('getSNICodes1');
    //socket.emit('getPostcodes');
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
        var name = "<h3>" + marker.name + "</h3>";
        var address = "<p><b>Address : </b>" + marker.address + "</p>";
        var branchMain = (marker.branchMain) ? "<p><b>Branch (Main) : </b>" + marker.branchMain + "</p>" : "";
        var branchSub1 = (marker.branchSub1) ? "<p><b>Branch (Sub) : </b>" + marker.branchSub1 + "</p>" : "";
        var branchSub2 = (marker.branchSub2) ? "<p><b>Branch (Sub) : </b>" + marker.branchSub2 + "</p>" : "";
        
        ml.bindPopup(name +
                     address +
                     branchMain +
                     branchSub1 +
                     branchSub2);
        markersLayer.addLayer(ml);
    }
    map.addLayer(markersLayer);
});

socket.on("receiveCompanyTypes", function(data) {
    $('#companyTypesSelect').find('option').remove().end();
    var companyTypesSelect = $('#companyTypesSelect')[0];
    companyTypesSelect.add(new Option('Company type', 0));
    for (idx in data.companyTypes) {
        var companyType = data.companyTypes[idx];
        companyTypesSelect.add(new Option(companyType, companyType));
    }
});

socket.on("receiveSNICodes1", function(data) {
    $('#SNICodes1Select').find('option').remove().end();
    var SNICodes1Select = $('#SNICodes1Select')[0];
    SNICodes1Select.add(new Option('SNI Code 1', 0));
    for (idx in data.SNICodes1) {
        var SNICode = data.SNICodes1[idx];
        SNICodes1Select.add(new Option(SNICode, SNICode));
    }
});

socket.on("receiveSNICodes2", function(data) {
    $('#SNICodes2Select').find('option').remove().end();
    var SNICodes2Select = $('#SNICodes2Select')[0];
    SNICodes2Select.add(new Option('SNI Code 2', 0));
    for (idx in data.SNICodes2) {
        var SNICode = data.SNICodes2[idx];
        SNICodes2Select.add(new Option(SNICode, SNICode));
    }
});

socket.on("receiveSNICodes3", function(data) {
    $('#SNICodes3Select').find('option').remove().end();
    var SNICodes3Select = $('#SNICodes3Select')[0];
    SNICodes3Select.add(new Option('SNI Code 3', 0));
    for (idx in data.SNICodes3) {
        var SNICode = data.SNICodes3[idx];
        SNICodes3Select.add(new Option(SNICode, SNICode));
    }
});

socket.on("receiveSNICodes4", function(data) {
    $('#SNICodes4Select').find('option').remove().end();
    var SNICodes4Select = $('#SNICodes4Select')[0];
    SNICodes4Select.add(new Option('SNI Code 4', 0));
    for (idx in data.SNICodes4) {
        var SNICode = data.SNICodes4[idx];
        SNICodes4Select.add(new Option(SNICode, SNICode));
    }
});

socket.on("receiveSNICodes5", function(data) {
    $('#SNICodes5Select').find('option').remove().end();
    var SNICodes5Select = $('#SNICodes5Select')[0];
    SNICodes5Select.add(new Option('SNI Code 5', 0));
    for (idx in data.SNICodes5) {
        var SNICode = data.SNICodes5[idx];
        SNICodes5Select.add(new Option(SNICode, SNICode));
    }
});

socket.on("receivePostcodes", function(data) {
    console.log(data);
    //L.geoJson(data).addTo(map);
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
        socket.emit('getSNICodes1');
        $('#SNICodes2Select').find('option').remove().end();
        $('#SNICodes3Select').find('option').remove().end();
        $('#SNICodes4Select').find('option').remove().end();
        $('#SNICodes5Select').find('option').remove().end();
        //socket.emit('getPostcodes');
    });
    
    $("#companyTypesSelect").change(function() {
        $("#SNICodes1Select")[0].selectedIndex = 0;
        $('#SNICodes2Select').find('option').remove().end();
        $('#SNICodes3Select').find('option').remove().end();
        $('#SNICodes4Select').find('option').remove().end();
        $('#SNICodes5Select').find('option').remove().end();
        if ($(this)[0].selectedIndex === 0) {
            socket.emit('getmarkers');
        }
        else {
            socket.emit('getmarkers', {companyType: $("#companyTypesSelect option:selected")[0].value});
        }
    });
    
    $("#SNICodes1Select").change(function() {
        $("#companyTypesSelect")[0].selectedIndex = 0;
        $('#SNICodes2Select').find('option').remove().end();
        $('#SNICodes3Select').find('option').remove().end();
        $('#SNICodes4Select').find('option').remove().end();
        $('#SNICodes5Select').find('option').remove().end();
        if ($(this)[0].selectedIndex === 0) {
            socket.emit('getmarkers');
        }
        else {
            socket.emit('getmarkers', {SNICode1: $("#SNICodes1Select option:selected")[0].value});
        }
    });
    
    $("#SNICodes2Select").change(function() {
        $('#SNICodes3Select').find('option').remove().end();
        $('#SNICodes4Select').find('option').remove().end();
        $('#SNICodes5Select').find('option').remove().end();
        if ($(this)[0].selectedIndex === 0) {
            socket.emit('getmarkers', {SNICode1: $("#SNICodes1Select option:selected")[0].value});
        }
        else {
            socket.emit('getmarkers', 
                {SNICode1: $("#SNICodes1Select option:selected")[0].value,
                SNICode2: $("#SNICodes2Select option:selected")[0].value
            });
        }
    });
    
    $("#SNICodes3Select").change(function() {
        $('#SNICodes4Select').find('option').remove().end();
        $('#SNICodes5Select').find('option').remove().end();
        if ($(this)[0].selectedIndex === 0) {
            socket.emit('getmarkers', {SNICode1: $("#SNICodes1Select option:selected")[0].value,
                                        SNICode2: $("#SNICodes2Select option:selected")[0].value});
        }
        else {
            socket.emit('getmarkers', 
                {SNICode1: $("#SNICodes1Select option:selected")[0].value,
                SNICode2: $("#SNICodes2Select option:selected")[0].value,
                SNICode3: $("#SNICodes3Select option:selected")[0].value
            });
        }
    });
    
    $("#SNICodes4Select").change(function() {
        $('#SNICodes5Select').find('option').remove().end();
        if ($(this)[0].selectedIndex === 0) {
            socket.emit('getmarkers', {SNICode1: $("#SNICodes1Select option:selected")[0].value,
                                        SNICode2: $("#SNICodes2Select option:selected")[0].value,
                                        SNICode3: $("#SNICodes3Select option:selected")[0].value});
        }
        else {
            socket.emit('getmarkers', 
                {SNICode1: $("#SNICodes1Select option:selected")[0].value,
                SNICode2: $("#SNICodes2Select option:selected")[0].value,
                SNICode3: $("#SNICodes3Select option:selected")[0].value,
                SNICode4: $("#SNICodes4Select option:selected")[0].value
            });
        }
    });
    
    $("#SNICodes5Select").change(function() {
        if ($(this)[0].selectedIndex === 0) {
            socket.emit('getmarkers', {SNICode1: $("#SNICodes1Select option:selected")[0].value,
                                        SNICode2: $("#SNICodes2Select option:selected")[0].value,
                                        SNICode3: $("#SNICodes3Select option:selected")[0].value,
                                        SNICode4: $("#SNICodes4Select option:selected")[0].value});
        }
        else {
            socket.emit('getmarkers', 
                {SNICode1: $("#SNICodes1Select option:selected")[0].value,
                SNICode2: $("#SNICodes2Select option:selected")[0].value,
                SNICode3: $("#SNICodes3Select option:selected")[0].value,
                SNICode4: $("#SNICodes4Select option:selected")[0].value,
                SNICode5: $("#SNICodes5Select option:selected")[0].value
            });
        }
    });
});

