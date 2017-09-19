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
    title: 'Nobu Next door',
    location: {
        lat: 40.7195264,
        lng: -74.0089934
    }
}, {
    title: '82 Elizabeth St',
    location: {
        lat: 40.7180628,
        lng: -73.9961237
    }
}];


var MapModel = function () {
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
    this.makeMarkerIcon = function (markerColor) {
        var markerImage = new google.maps.MarkerImage('http://chart.googleapis.com/chart?chst=d_map_spin&chld=1.15|0|' + markerColor + '|40|_|%E2%80%A2', new google.maps.Size(21, 34), new google.maps.Point(0, 0), new google.maps.Point(10, 34), new google.maps.Size(21, 34));
        return markerImage;
    };
    //Variables
    this.largeInfowindow = new google.maps.InfoWindow();
    this.defaultIcon = self.makeMarkerIcon('0091ff');
    this.highlightedIcon = self.makeMarkerIcon('FFFF24');

    this.populateInfoWindow = function (marker, infowindow, RelatedNewsConent) {
        // Check to make sure the infowindow is not already opened on this marker.
        if (infowindow.marker != marker) {
            // Clear the infowindow content to give the streetview time to load.
            infowindow.setContent('');
            infowindow.marker = marker;
            // Make sure the marker property is cleared if the infowindow is closed.
            infowindow.addListener('closeclick', function () {
                infowindow.marker = null;
            });
            var streetViewService = new google.maps.StreetViewService();
            var radius = 50;

            var getStreetView = function (data, status) {
                if (status == google.maps.StreetViewStatus.OK) {
                    var nearStreetViewLocation = data.location.latLng;
                    var heading = google.maps.geometry.spherical.computeHeading(nearStreetViewLocation, marker.position);
                    infowindow.setContent('<div>' + marker.title + '</div><div id="pano"></div>' + RelatedNewsConent);
                    var panoramaOptions = {
                        position: nearStreetViewLocation,
                        pov: {
                            heading: heading,
                            pitch: 30
                        }
                    };
                    var panorama = new google.maps.StreetViewPanorama(document.getElementById('pano'), panoramaOptions);
                } else {
                    infowindow.setContent('<div>' + marker.title + '</div>' + '<div>No Street View Found</div>' + RelatedNewsConent);
                }
            };

            // Use streetview service to get the closest streetview image within
            // 50 meters of the markers position
            streetViewService.getPanoramaByLocation(marker.position, radius, getStreetView);
            // Open the infowindow on the correct marker.
            infowindow.open(map, marker);
        }
    };

};

var LocationModel = function (data, gMapModel) {
    var self = this;
    this.title = ko.observable(data.title);
    this.visible = ko.observable(true);

    this.marker = new google.maps.Marker({
        position: {
            lat: data.location.lat,
            lng: data.location.lng
        },
        title: data.title,
        animation: google.maps.Animation.DROP,
        icon: gMapModel.defaultIcon

    });

    this.showPopup = function () {
        //Retrieve only when user click 
        //to avoid 429 error
        var nytApiKey = "0feec1ae73ed4ee1af960120e282a895";
        var nytApiUrl = "https://api.nytimes.com/svc/search/v2/articlesearch.json?sort=newest&api-key=" + nytApiKey + "&q=" + self.title();
        $.getJSON(nytApiUrl, function (data) {
            var articles = data.response.docs;
            var content = "";
            var articleLimit = 2;
            
            articles.forEach(function (article) {
                if (articleLimit > 0) {                    
                    content += '<li class="article"><a href="' + article.web_url + '">' + article.headline.main + '</a></li>';
                }
                articleLimit--;
            });
            gMapModel.populateInfoWindow(self.marker, gMapModel.largeInfowindow, "<h3>Related news from NYTimes</h3>" + content);
        }).error(function () {
            var content = "New York Times Articles Could Not Be Loaded";
            gMapModel.populateInfoWindow(self.marker, gMapModel.largeInfowindow, content);
        });

    };

    // Create an onclick event to open the large infowindow at each marker.
    this.marker.addListener('click', function () {
        self.showPopup();
    });


    // Two event listeners - one for mouseover, one for mouseout,
    // to change the colors back and forth.
    this.marker.addListener('mouseover', function () {
        this.setIcon(gMapModel.highlightedIcon);
    });
    this.marker.addListener('mouseout', function () {
        this.setIcon(gMapModel.defaultIcon);
    });

    this.showMarker = ko.computed(function () {
        if (this.visible() === true) {
            self.marker.setMap(gMapModel.map);
        } else {
            self.marker.setMap(null);
        }
        return true;
    }, this);


};

var ViewModel = function () {
    var self = this;
    this.mapModel = new MapModel();
    this.hideMenu = ko.observable(false);
    this.searchKeyword = ko.observable("");
    //this.mapModel = new MapModel();
    this.locationList = ko.observableArray([]);
    this.defaultBounds = null;
    var index = 1;
    initLocations.forEach(function (location) {
        self.locationList.push(new LocationModel(location, self.mapModel, this.mapNewsContent));
    });
    this.toggleMenu = function () {
        this.hideMenu(!this.hideMenu());
    };
    this.filteredList = ko.computed(function () {
        var keyword = self.searchKeyword().toLowerCase();
        if (keyword.trim() === "") {
            self.locationList().forEach(function (locationItem) {
                locationItem.visible(true);
            });
            return self.locationList();
        } else {
            return ko.utils.arrayFilter(self.locationList(), function (locationItem) {
                var locationTitle = locationItem.title().toLowerCase();
                var result = (locationTitle.search(keyword) >= 0);
                locationItem.visible(result);
                return result;
            });
        }
    }, self);

    //Location Lists Functions
    this.changeLocation = function () {
        this.showPopup();
    };
    // This function will loop through the markers array and display them all.
    this.showListings = function () {
        self.locationList().forEach(function (locationItem) {
            locationItem.visible(true);
        });
    };
    this.hideMarkers = function () {
        //Hide markers list
        self.locationList().forEach(function (locationItem) {
            locationItem.visible(false);
        });

        //Zoom out to default position
        if (self.defaultBounds !== null) {
            self.mapModel.map.fitBounds(self.defaultBounds);
        }
    };
    //show markers by default
    this.showListings();
};

function initMap() {
    ko.applyBindings(new ViewModel());
}

function googleAPIErrorHandling() {
    alert("Google Maps has failed to load. Please check your internet connection and try again.");
}