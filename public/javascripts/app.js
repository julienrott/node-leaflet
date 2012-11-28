var markersLayer;

var socket = io.connect();

socket.on("connection", function(data) {
    $('#loadingspan').show();
    socket.emit('getmarkers');
    socket.emit('getCompanyTypes');
    socket.emit('getBranches');
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
    $('#loadingspan').hide();
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

socket.on("receiveBranches", function(data) {
    if (data.branchMain) emptyAndFillBranchSelect('Main', data.branchMain);
    if (data.branchSub1) emptyAndFillBranchSelect('Sub1', data.branchSub1);
    if (data.branchSub2) emptyAndFillBranchSelect('Sub2', data.branchSub2);
});

socket.on('receiveUnlinkedSNICodes', function(data) {
    emptyAndFillSNISelect(2, data.SNICodes2);
    emptyAndFillSNISelect(3, data.SNICodes3);
    emptyAndFillSNISelect(4, data.SNICodes4);
    emptyAndFillSNISelect(5, data.SNICodes5);
});

socket.on("receiveSNICodes1", function(data) {
    emptyAndFillSNISelect(1, data.SNICodes1);
});

socket.on("receiveSNICodes2", function(data) {
    emptyAndFillSNISelect(2, data.SNICodes2);
});

socket.on("receiveSNICodes3", function(data) {
    emptyAndFillSNISelect(3, data.SNICodes3);
});

socket.on("receiveSNICodes4", function(data) {
    emptyAndFillSNISelect(4, data.SNICodes4);
});

socket.on("receiveSNICodes5", function(data) {
    emptyAndFillSNISelect(5, data.SNICodes5);
});

socket.on("receivePostcodes", function(data) {
    console.log(data);
    //L.geoJson(data).addTo(map);
});

function emptyAndFillSNISelect(idx, SNICodes) {
    var selectID = '#SNICodes' + idx +'Select';
    $(selectID).find('option').remove().end();
    var SNICodesSelect = $(selectID)[0];
    SNICodesSelect.add(new Option('SNI Code ' + idx, 0));
    for (idx in SNICodes) {
        var SNICode = SNICodes[idx];
        if (SNICode) SNICodesSelect.add(new Option(SNICode, SNICode));
    }
}

function emptyAndFillBranchSelect(idx, branches) {
    var selectID = '#branch' + idx +'Select';
    $(selectID).find('option').remove().end();
    var select = $(selectID)[0];
    select.add(new Option('Branch ' + idx, 0));
    for (idx in branches) {
        var branche = branches[idx];
        if (branche) select.add(new Option(branche, branche));
    }
}

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

function getUnlinkedSNICodesMarkers() {
    socket.emit(
            'getmarkers', 
            {
                unlinkedSNICodes: true,
                SNICode1: $("#SNICodes1Select")[0].selectedIndex > 0 ? $("#SNICodes1Select option:selected")[0].value : null,
                SNICode2: $("#SNICodes2Select")[0].selectedIndex > 0 ? $("#SNICodes2Select option:selected")[0].value : null,
                SNICode3: $("#SNICodes3Select")[0].selectedIndex > 0 ? $("#SNICodes3Select option:selected")[0].value : null,
                SNICode4: $("#SNICodes4Select")[0].selectedIndex > 0 ? $("#SNICodes4Select option:selected")[0].value : null,
                SNICode5: $("#SNICodes5Select")[0].selectedIndex > 0 ? $("#SNICodes5Select option:selected")[0].value : null
            }
    );
}

function getBranchesMarkers() {
    var cb = $("#branchesLinkedCB");
    socket.emit(
            'getmarkers', 
            {
                branches: true,
                branchesLinked: cb.is(':checked'),
                branchMain: $("#branchMainSelect")[0].selectedIndex > 0 ? $("#branchMainSelect option:selected")[0].value : null,
                branchSub1: $("#branchSub1Select")[0].selectedIndex > 0 ? $("#branchSub1Select option:selected")[0].value : null,
                branchSub2: $("#branchSub2Select")[0].selectedIndex > 0 ? $("#branchSub2Select option:selected")[0].value : null
            }
    );
}

$(function() {
    $("#btn").click(function() {
        $('#loadingspan').show();
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
        $('#loadingspan').show();
        $("#branchMainSelect")[0].selectedIndex = 0;
        $("#branchSub1Select")[0].selectedIndex = 0;
        $("#branchSub2Select")[0].selectedIndex = 0;
        $("#SNICodesLinkedCB")[0].checked = true;
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
    
    $("#branchesLinkedCB").change(function() {
        $("#companyTypesSelect")[0].selectedIndex = 0;
        $("#SNICodesLinkedCB")[0].checked = true;
        $("#SNICodes1Select")[0].selectedIndex = 0;
        $('#SNICodes2Select').find('option').remove().end();
        $('#SNICodes3Select').find('option').remove().end();
        $('#SNICodes4Select').find('option').remove().end();
        $('#SNICodes5Select').find('option').remove().end();
        $("#branchMainSelect")[0].selectedIndex = 0;
        $("#branchSub1Select").find('option').remove().end();
        $("#branchSub2Select").find('option').remove().end();
        
        var cb = $(this);
        if(cb.is(':checked')) {
            $('#loadingspan').show();
            socket.emit('getmarkers');
        }
        else {
            socket.emit('getBranches');
        }
    });
    
    $("#branchMainSelect").change(function() {
        $('#loadingspan').show();
        $("#companyTypesSelect")[0].selectedIndex = 0;
        $("#SNICodesLinkedCB")[0].checked = true;
        $("#SNICodes1Select")[0].selectedIndex = 0;
        $('#SNICodes2Select').find('option').remove().end();
        $('#SNICodes3Select').find('option').remove().end();
        $('#SNICodes4Select').find('option').remove().end();
        $('#SNICodes5Select').find('option').remove().end();
        
        var cb = $("#branchesLinkedCB");
        if (cb.is(':checked')) {
            $('#branchSub1Select').find('option').remove().end();
            $('#branchSub2Select').find('option').remove().end();
        }
        
        getBranchesMarkers();
    });
    
    $("#branchSub1Select").change(function() {
        $('#loadingspan').show();
        $("#companyTypesSelect")[0].selectedIndex = 0;
        $("#SNICodesLinkedCB")[0].checked = true;
        $("#SNICodes1Select")[0].selectedIndex = 0;
        $('#SNICodes2Select').find('option').remove().end();
        $('#SNICodes3Select').find('option').remove().end();
        $('#SNICodes4Select').find('option').remove().end();
        $('#SNICodes5Select').find('option').remove().end();
        
        var cb = $("#branchesLinkedCB");
        if (cb.is(':checked')) {
            $('#branchSub2Select').find('option').remove().end();
        }
        
        getBranchesMarkers();
    });
    
    $("#branchSub2Select").change(function() {
        $('#loadingspan').show();
        $("#companyTypesSelect")[0].selectedIndex = 0;
        $("#SNICodesLinkedCB")[0].checked = true;
        $("#SNICodes1Select")[0].selectedIndex = 0;
        $('#SNICodes2Select').find('option').remove().end();
        $('#SNICodes3Select').find('option').remove().end();
        $('#SNICodes4Select').find('option').remove().end();
        $('#SNICodes5Select').find('option').remove().end();
        
        getBranchesMarkers();
    });
    
    $("#SNICodesLinkedCB").change(function() {
        var cb = $(this);
        if(cb.is(':checked')) {
            $('#loadingspan').show();
            $("#companyTypesSelect")[0].selectedIndex = 0;
            $("#SNICodes1Select")[0].selectedIndex = 0;
            $('#SNICodes2Select').find('option').remove().end();
            $('#SNICodes3Select').find('option').remove().end();
            $('#SNICodes4Select').find('option').remove().end();
            $('#SNICodes5Select').find('option').remove().end();
            socket.emit('getmarkers');
        }
        else {
            socket.emit('getUnlinkedSNICodes');
        }
    });
    
    $("#SNICodes1Select").change(function() {
        $('#loadingspan').show();
        $("#companyTypesSelect")[0].selectedIndex = 0;
        $("#branchMainSelect")[0].selectedIndex = 0;
        $("#branchSub1Select")[0].selectedIndex = 0;
        $("#branchSub2Select")[0].selectedIndex = 0;
        var cb = $("#SNICodesLinkedCB");
        if (cb.is(':checked')) {
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
        }
        else {
            getUnlinkedSNICodesMarkers();
        }
    });
    
    $("#SNICodes2Select").change(function() {
        $('#loadingspan').show();
        $("#companyTypesSelect")[0].selectedIndex = 0;
        $("#branchMainSelect")[0].selectedIndex = 0;
        $("#branchSub1Select")[0].selectedIndex = 0;
        $("#branchSub2Select")[0].selectedIndex = 0;
        var cb = $("#SNICodesLinkedCB");
        if (cb.is(':checked')) {
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
        }
        else {
            getUnlinkedSNICodesMarkers();
        }
    });
    
    $("#SNICodes3Select").change(function() {
        $('#loadingspan').show();
        $("#companyTypesSelect")[0].selectedIndex = 0;
        $("#branchMainSelect")[0].selectedIndex = 0;
        $("#branchSub1Select")[0].selectedIndex = 0;
        $("#branchSub2Select")[0].selectedIndex = 0;
        var cb = $("#SNICodesLinkedCB");
        if (cb.is(':checked')) {
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
        }
        else {
            getUnlinkedSNICodesMarkers();
        }
    });
    
    $("#SNICodes4Select").change(function() {
        $('#loadingspan').show();
        $("#companyTypesSelect")[0].selectedIndex = 0;
        $("#branchMainSelect")[0].selectedIndex = 0;
        $("#branchSub1Select")[0].selectedIndex = 0;
        $("#branchSub2Select")[0].selectedIndex = 0;
        var cb = $("#SNICodesLinkedCB");
        if (cb.is(':checked')) {
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
        }
        else {
            getUnlinkedSNICodesMarkers();
        }
    });
    
    $("#SNICodes5Select").change(function() {
        $('#loadingspan').show();
        $("#companyTypesSelect")[0].selectedIndex = 0;
        $("#branchMainSelect")[0].selectedIndex = 0;
        $("#branchSub1Select")[0].selectedIndex = 0;
        $("#branchSub2Select")[0].selectedIndex = 0;
        var cb = $("#SNICodesLinkedCB");
        if (cb.is(':checked')) {
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
        }
        else {
            getUnlinkedSNICodesMarkers();
        }
    });
});

