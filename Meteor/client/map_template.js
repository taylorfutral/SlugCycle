Meteor.startup(function () {
  console.log("loading map");
  GoogleMaps.load({key: "AIzaSyBcb6I-kviQrKAqUadr05nQoCW7dOTZb2k"});
}); 

Template.map.helpers({  
  mapOptions: function() {
    if (GoogleMaps.loaded()) {
      return {
        center: new google.maps.LatLng(36.9719, -122.0264),
        zoom: 12
      };
    }
  }
});

Template.map.onCreated(function() {
    console.log("map template creation");
  var self = this;
    //Callback activates when the map is loaded.
    GoogleMaps.ready('map', function(map) {
        //Stores the visible waypoints on the map.
        var markers = {};

        //Set up our waypoint collection to add markers to the map
        Waypoints.find().observe({  
            added: function(document) {
                var marker = new google.maps.Marker({
                    draggable: true,
                    position: new google.maps.LatLng(document.lat, document.lng),
                    map: map.instance,
                    id: document._id
                });
            //This listener allows us to drag the waypoint around and update position.
            google.maps.event.addListener(marker, 'dragend', function(event) {
              Waypoints.update(marker.id, { $set: { lat: event.latLng.lat(), lng: event.latLng.lng() }});
            });

            markers[document._id] = marker;
          },
          //Update the marker if its position is changed from the database side.
          changed: function(newDocument, oldDocument) {
            markers[newDocument._id].setPosition({ lat: newDocument.lat, lng: newDocument.lng });
          },
          //Remove the marker if it's been deleted
          removed: function(oldDocument) {
            markers[oldDocument._id].setMap(null);

            google.maps.event.clearInstanceListeners(
              markers[oldDocument._id]);

            delete markers[oldDocument._id];
          }
        });

        //This lets us add waypoints to the map just by clicking on it.
        google.maps.event.addListener(map.instance, 'click', function(event) {
            Waypoints.insert({ lat: event.latLng.lat(), lng: event.latLng.lng() });
        });
        
        //Handles the marker used for the user's current location.
        var user_location;
        self.autorun(function() {
          var latLng = Geolocation.latLng();
          console.log(latLng);
          if (! latLng)
            return;
          if (! user_location) {
            user_location = new google.maps.Marker({
              position: new google.maps.LatLng(latLng.lat, latLng.lng),
              title:"Current Location",
              map: map.instance
            });
            map.instance.setCenter(user_location.getPosition());
            map.instance.setZoom(MAP_ZOOM);
          }
          else {
            user_location.setPosition(latLng);
          }
        });
      });
});