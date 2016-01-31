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
        var waypoint_cursor = Waypoints.find();
        var buses = {
            marker_click: new Bacon.Bus(),
            marker_drag: new Bacon.Bus(),
            marker_release: new Bacon.Bus()
        };
        //Stores event streams we can connect to the toolbar.
        self.streams = {
            waypoint_added: Bacon.fromBinder(function(sink){
                waypoint_cursor.observe({
                    added: sink
                });
            }),
            waypoint_changed : Bacon.fromBinder(function(sink){
                waypoint_cursor.observe({
                    changed: function(next,prev){
						sink({oldDocument:prev, newDocument:next});
					}
                });
            }),
            waypoint_deleted : Bacon.fromBinder(function(sink){
                waypoint_cursor.observe({
                    removed: function(o){
                        sink(o);
                    }
                });
            }),
            marker_click: buses.marker_click.toEventStream(),
            marker_drag: buses.marker_drag.toEventStream(),
            marker_release: buses.marker_release.toEventStream()
        };
        
        self.streams.waypoint_added.onValue(function(document) {
            var marker = new google.maps.Marker({
                draggable: true,
                position: new google.maps.LatLng(document.lat, document.lng),
                title: document.message,
                map: map.instance,
                id: document._id
            });
            google.maps.event.addListener(marker, 'click', function(event) {
                buses.marker_click.push({ marker: marker, event: event});
            });
            google.maps.event.addListener(marker, 'drag', function(event) {
                buses.marker_drag.push({ marker: marker, event: event});
            });
            google.maps.event.addListener(marker, 'dragend', function(event) {
                buses.marker_release.push({ marker: marker, event: event});
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
			if (oldDocument){
				markers[oldDocument._id].setMap(null);
				google.maps.event.clearInstanceListeners(
				  markers[oldDocument._id]);
				delete markers[oldDocument._id];
			}
        });

        self.streams.map_clicked = Bacon.fromBinder(function(sink){
            google.maps.event.addListener(map.instance, 'click', sink);
        });
        
        //Handles the marker used for the user's current location.
        self.streams.user_location = Bacon.fromBinder(function(sink){
            self.autorun(function(){
                sink(Geolocation.latLng());
            });
        }).toProperty();
        
        //Holds the tool currently in use.
        self.streams.current_tool = Bacon.fromBinder(function(sink){
            Deps.autorun(function () {
              sink(Session.get('map.current_tool'));
            });
        }).map(function(key){
            return tools[key];
        }).filter(function(tool){
            return !!tool;
        }).toProperty(undefined);
        
        //Link up the current tool with the map events.
        // Map Clicked
        self.streams.current_tool.sampledBy(self.streams.map_clicked, function(tool, event){
            return {
                event: event,
                tool: tool
            };
        }).onValue(function(args){
            if (!_.isUndefined(args.tool) && _.isFunction(args.tool.map_clicked)){
                args.tool.map_clicked(args.event);
            } else if (args.event){
				default_behavior.map_clicked(args.event);
			}
        });
        
        // Marker Clicked
        self.streams.current_tool.sampledBy(self.streams.marker_click, function(tool, marker_args){
            return {
                tool: tool,
                event: marker_args.event,
                marker: marker_args.marker
            };
        }).onValue(function(args){
			if (args.marker){
				if (!_.isUndefined(args.tool) && _.isFunction(args.tool.marker_click)){
					args.tool.marker_click(args.marker, args.event);
				} else if (args.event){
					default_behavior.marker_clicked(args.marker, args.event);
				}
			}
        });
		
		// Marker Released
        self.streams.current_tool.sampledBy(self.streams.marker_release, function(tool, marker_args){
            return {
                tool: tool,
                event: marker_args.event,
                marker: marker_args.marker
            };
        }).onValue(function(args){
			if (args.marker){
				if (!_.isUndefined(args.tool) && _.isFunction(args.tool.marker_release)){
					args.tool.marker_release(args.marker, args.event);
				} else if (args.event){
					default_behavior.marker_release(args.marker, args.event);
				}
			}
        });
		
        //Marker only updates if user's position changes.
        self.streams.user_location_changes = self.streams.user_location.skipDuplicates(function(prev,next){
            return !!prev && (prev.lat == next.lat && prev.lng == next.lng);
        });
		
        self.streams.user_marker = self.streams.user_location_changes.scan(undefined, function(marker, latLng)          {
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
                //This will be replaced with a form letting the user specify a phone number.
                map.instance.setCenter(marker.position);
                map.instance.setZoom(12);
            }
        });

		self.streams.waypoint_recent = self.streams.waypoint_added.merge(
			self.streams.waypoint_changed.map(function(args){
				return args.newDocument;
			})
		).log("Recent Waypoint:");
        self.streams.waypoint_recent.combine(self.streams.user_location_changes,function(waypoint, user_location){
            var waypoint_location = {lat: waypoint.lat, lng: waypoint.lng};
            return waypoint_location;
        }).onValue(function(distance){
            console.log("sending SMS from client:"+distance);
            Meteor.call("send_SMS", "9253213959", distance.toString());            
        });
        //Meteor.call("send_SMS", "8313255847", marker.position.toString());
    });
});