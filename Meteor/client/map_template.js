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
        //Stores event streams we can connect to the toolbar.
        self.streams = {};
        var waypoint_cursor = Waypoints.find();
        self.streams = {
            waypoint_added: Bacon.fromBinder(function(sink){
                waypoint_cursor.observe({
                    added: sink
                });
            }),
            waypoint_changed : Bacon.fromBinder(function(sink){
                waypoint_cursor.observe({
                    changed: sink
                });
            }),
            waypoint_deleted : Bacon.fromBinder(function(sink){
                waypoint_cursor.observe({
                    removed: function(n, o){
                        sink({newDocument:n, oldDocument: o});
                    }
                });
            })
        };
        self.streams.waypoint_added.onValue(function(document) {
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
        });
        self.streams.waypoint_changed.onValue(function(args){
            //Update the marker if its position is changed from the database side.
            markers[args.newDocument._id].setPosition({ 
                lat: args.newDocument.lat, 
                lng: args.newDocument.lng
            });
        });
        self.streams.waypoint_deleted.onValue(function(oldDocument) {
            //Remove the marker from the map now that we're done with it.
            markers[oldDocument._id].setMap(null);
            google.maps.event.clearInstanceListeners(
              markers[oldDocument._id]);
            delete markers[oldDocument._id];
        });

        //This lets us add waypoints to the map just by clicking on it.
        self.streams.map_clicked = Bacon.fromBinder(function(sink){
            google.maps.event.addListener(map.instance, 'click', sink);
        });
        self.streams.map_clicked.onValue(function(event) {
            Waypoints.insert({ lat: event.latLng.lat(), lng: event.latLng.lng() });
        });
        
        //Handles the marker used for the user's current location.
        var user_marker;
        self.streams.user_location = Bacon.fromBinder(function(sink){
            self.autorun(function(){
                sink(Geolocation.latLng());
            });
        }).toProperty();
        
        //Marker only updates if user's position changes.
        self.streams.user_marker = self.streams.user_location.skipDuplicates(function(prev,next){
            return !!prev && (prev.lat == next.lat && prev.lng == next.lng);
        }).scan(undefined, function(marker, latLng){
            if (!!latLng){
                if (!marker){
                    var map_pos = new google.maps.LatLng(latLng.lat, latLng.lng);
                    return new google.maps.Marker({
                      position: map_pos,
                      title:"Current Location",
                      map: map.instance
                    });
                } else {
                    marker.setPosition(latLng);
                }
            }
            return marker;
        }).onValue(function(marker){
            if (marker){
                map.instance.setCenter(marker.position);
                map.instance.setZoom(12);
            }
        });
    });
});