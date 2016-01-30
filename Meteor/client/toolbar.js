tools = {
    add_marker: { text: "Add Marker", 
        map_clicked: function(event) {
            Waypoints.insert({ lat: event.latLng.lat(), lng: event.latLng.lng() });
        }
    },
    remove_marker: { text: "Remove Marker" }
}

Template.toolbar.helpers({
    tools: _.map(_.keys(tools), function(key){
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