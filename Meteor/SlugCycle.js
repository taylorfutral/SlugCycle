if (Meteor.isClient) {
  Meteor.startup(function () {
    GoogleMaps.load();
  }); 

Template.map.onCreated(function() {
    console.log("map creation");
  var self = this;
    //Callback activates when the map is loaded.
    GoogleMaps.ready('map', function(map) {
        console.log("map ready");
        var marker;
        self.autorun(function() {
          var latLng = Geolocation.latLng();
          if (! latLng)
            return;

          if (! marker) {
            marker = new google.maps.Marker({
              position: new google.maps.LatLng(latLng.lat, latLng.lng),
              map: map.instance
            });
            map.instance.setCenter(marker.getPosition());
            map.instance.setZoom(MAP_ZOOM);
          }
          else {
            marker.setPosition(latLng);
          }
        });
      });
});
}

if (Meteor.isServer) {
  Meteor.startup(function () {
    // code to run on server at startup
  });
}
