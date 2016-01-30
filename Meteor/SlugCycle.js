if (Meteor.isClient) {
  Meteor.startup(function () {
    GoogleMaps.load();
  }); 

Template.map.helpers({  
  mapOptions: function() {
    if (GoogleMaps.loaded()) {
      return {
        center: new google.maps.LatLng(-37.8136, 144.9631),
        zoom: 8
      };
    }
  }
});
}

if (Meteor.isServer) {
  Meteor.startup(function () {
    // code to run on server at startup
  });
}
