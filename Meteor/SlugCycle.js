if (Meteor.isClient) {
}

if (Meteor.isServer) {
  Meteor.startup(function () {
    Meteor.methods({
        send_SMS: function(number, message){
            HTTP.post("http://textbelt.com/text",{data:{
                number: number,
                message: message
            }});
        }
    });

  });
}
