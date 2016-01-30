if (Meteor.isClient) {
}

if (Meteor.isServer) {
  Meteor.startup(function () {
    Meteor.methods({
        send_SMS: function(number, message){
            console.log("posting SMS message");
            HTTP.post("http://textbelt.com/text",{data:{
                number: number,
                message: message
            }}, function(error, response){
                if (error){
                    console.error(error);
                } else {
                    console.log(response);
                }
            });
        }
    });

  });
}
