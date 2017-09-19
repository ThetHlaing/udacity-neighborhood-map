//var map;
// These are the real estate listings that will be shown to the user.
var initLocations = [{
    title: 'Park Ave Penthouse',
    location: {
        lat: 40.7713024,
        lng: -73.9632393
    }
}, {
    title: 'Chelsea Loft',
    location: {
        lat: 40.7444883,
        lng: -73.9949465
    }
}, {
    title: 'Union Square Open Floor Plan',
    location: {
        lat: 40.7347062,
        lng: -73.9895759
    }
}, {
    title: 'East Village Hip Studio',
    location: {
        lat: 40.7281777,
        lng: -73.984377
    }
}, {
    title: 'TriBeCa Artsy Bachelor Pad',
    location: {
        lat: 40.7195264,
        lng: -74.0089934
    }
}, {
    title: 'Chinatown Homey Space',
    location: {
        lat: 40.7180628,
        lng: -73.9961237
    }
}];
var LocationModel = function(data) {
    this.title = ko.observable(data.title);
    this.lat = ko.observable(data.location.lat);
    this.lng = ko.observable(data.location.lng);
    this.visible = ko.observable(true);
};
var MapModel = function() {
    var self = this;
    // Constructor creates a new map - only center and zoom are required.
    this.map = new google.maps.Map(document.getElementById('map'), {
        center: {
            lat: 40.7413549,
            lng: -73.9980244
        },
        zoom: 13, // styles: self.styles,
        mapTypeControl: false
    });
    this.makeMarkerIcon = function(markerColor) {
        var markerImage = new google.maps.MarkerImage('http://chart.googleapis.com/chart?chst=d_map_spin&chld=1.15|0|' + markerColor + '|40|_|%E2%80%A2', new google.maps.Size(21, 34), new google.maps.Point(0, 0), new google.maps.Point(10, 34), new google.maps.Size(21, 34));
        return markerImage;
    };
    //Variables
    this.markers = [];
    this.largeInfowindow = new google.maps.InfoWindow();
    this.defaultIcon = self.makeMarkerIcon('0091ff');
    this.highlightedIcon = self.makeMarkerIcon('FFFF24');
};
var ViewModel = function() {
    var self = this;
    this.hideMenu = ko.observable(false);
    this.searchKeyword = ko.observable("");
    this.mapModel = new MapModel();
    this.locationList = ko.observableArray([]);
    this.defaultBounds = null;
    initLocations.forEach(function(location) {
        self.locationList.push(new LocationModel(location));
    });
    this.toggleMenu = function() {
        this.hideMenu(!this.hideMenu());
    };
    this.filteredList = ko.computed(function() {
        var keyword = self.searchKeyword().toLowerCase();
        if (keyword.trim() === "") {
            return self.locationList();
        } else {
            return ko.utils.arrayFilter(self.locationList(), function(locationItem) {
                var locationTitle = locationItem.title().toLowerCase();
                var result = (locationTitle.search(keyword) >= 0);
                locationItem.visible(result);
                return result;
            });
        }
    }, self);
    // This function takes in a COLOR, and then creates a new marker
    // icon of that color. The icon will be 21 px wide by 34 high, have an origin
    // of 0, 0 and be anchored at 10, 34).
    this.createMarker = function(Location, index) {
        // Get the position from the location array.                        
        var title = Location.title();
        var currentLat = Location.lat();
        var currentLng = Location.lng();
        // Create a marker per location, and put into markers array.
        var marker = new google.maps.Marker({
            position: {
                lat: currentLat,
                lng: currentLng
            },
            title: title,
            animation: google.maps.Animation.DROP,
            icon: self.mapModel.defaultIcon,
            id: index
        });
        // Create an onclick event to open the large infowindow at each marker.
        marker.addListener('click', function() {
            self.populateInfoWindow(this, self.mapModel.largeInfowindow);
        });
        // Two event listeners - one for mouseover, one for mouseout,
        // to change the colors back and forth.
        marker.addListener('mouseover', function() {
            this.setIcon(self.mapModel.highlightedIcon);
        });
        marker.addListener('mouseout', function() {
            this.setIcon(self.mapModel.defaultIcon);
        });
        return marker;
    };
    //Varriables
    this.currentMarker = this.createMarker(new LocationModel(initLocations[0]), 0);
    //Location Lists Functions
    this.changeLocation = function() {
        self.hideMarkers();
        self.currentMarker = self.createMarker(this);
        self.currentMarker.setMap(self.mapModel.map);
        var bounds = new google.maps.LatLngBounds();
        bounds.extend(self.currentMarker.position);
        self.mapModel.map.fitBounds(bounds);
    };
    // This function will loop through the markers array and display them all.
    this.showListings = function() {
        self.hideMarkers();
        self.generateMarkers();
        var bounds = new google.maps.LatLngBounds();
        // Extend the boundaries of the map for each marker and display the marker        
        for (var i = 0; i < this.mapModel.markers.length; i++) {
            this.mapModel.markers[i].setMap(self.mapModel.map);
            bounds.extend(this.mapModel.markers[i].position);
        }
        self.defaultBounds = bounds;
        self.mapModel.map.fitBounds(bounds);
    };
    this.hideMarkers = function() {
        //Hide markers list
        for (var i = 0; i < this.mapModel.markers.length; i++) {
            this.mapModel.markers[i].setMap(null);
        }
        //Hide currentMarker
        self.currentMarker.setMap(null);
        //Zoom out to default position
        if (self.defaultBounds !== null) {
            self.mapModel.map.fitBounds(self.defaultBounds);
        }
    };
    this.generateMarkers = function() {
        // The following group uses the location array to create an array of markers on initialize.    
        self.mapModel.markers = [];
        for (var i = 0; i < self.locationList().length; i++) {
            var marker = self.createMarker(self.locationList()[i], i);
            // Push the marker to our array of markers.
            self.mapModel.markers.push(marker);
        }
    };
    // This function populates the infowindow when the marker is clicked. We'll only allow
    // one infowindow which will open at the marker that is clicked, and populate based
    // on that markers position.
    this.populateInfoWindow = function(marker, infowindow) {
        // Check to make sure the infowindow is not already opened on this marker.
        if (infowindow.marker != marker) {
            // Clear the infowindow content to give the streetview time to load.
            infowindow.setContent('');
            infowindow.marker = marker;
            // Make sure the marker property is cleared if the infowindow is closed.
            infowindow.addListener('closeclick', function() {
                infowindow.marker = null;
            });
            var streetViewService = new google.maps.StreetViewService();
            var radius = 50;

            // Use streetview service to get the closest streetview image within
            // 50 meters of the markers position
            streetViewService.getPanoramaByLocation(marker.position, radius, self.getStreetView);
            // Open the infowindow on the correct marker.
            infowindow.open(map, marker);
        }
    };

    // In case the status is OK, which means the pano was found, compute the
    // position of the streetview image, then calculate the heading, then get a
    // panorama from that and set the options
    this.getStreetView = function(data, status) {
        if (status == google.maps.StreetViewStatus.OK) {
            var nearStreetViewLocation = data.location.latLng;
            var heading = google.maps.geometry.spherical.computeHeading(nearStreetViewLocation, marker.position);
            infowindow.setContent('<div>' + marker.title + '</div><div id="pano"></div>');
            var panoramaOptions = {
                position: nearStreetViewLocation,
                pov: {
                    heading: heading,
                    pitch: 30
                }
            };
            var panorama = new google.maps.StreetViewPanorama(document.getElementById('pano'), panoramaOptions);
        } else {
            infowindow.setContent('<div>' + marker.title + '</div>' + '<div>No Street View Found</div>');
        }
    }

    //show markers by default
    this.showListings();
};

function initMap() {
    ko.applyBindings(new ViewModel());
}