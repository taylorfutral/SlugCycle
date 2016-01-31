default_behavior = {
    map_clicked: function(event){
        Session.set("map.current_marker", "");
    },
	marker_clicked: function(marker, event){
		Session.set("map.current_marker", marker.id);
	},
	marker_release: function(marker, event){
		Waypoints.update(marker.id, { $set: 
			{ lat: event.latLng.lat(), lng: event.latLng.lng() }
		});
	}
};

tools = {
    add_marker: { text: "Add Marker", 
        map_clicked: function(event) {
            var id = Waypoints.insert(
                { 
                  lat: event.latLng.lat(), 
                  lng: event.latLng.lng(),
                  radius: 0.5, //miles
                  lifetime: 20.0, //minutes
                  message: "Something is happening near you!"
                }
            );
            Session.set("map.current_marker", id);
        }
    },
    remove_marker: { text: "Remove Marker",
        marker_click: function(marker, event){
            Waypoints.remove(marker.id);
        }
    }
}

Template.toolbar.helpers({
    tool_buttons: _.map(_.omit(_.keys(tools), "default_behavior"), function(key){
        return {
            key: key,
            text: tools[key].text
        };
    })
});

Template.tool.events({
    "click": function(event, template){
        Session.set('map.current_tool', this.key);
    }
});