var express = require('express');
var bodyParser = require('body-parser');
var request = require('request');
var app = express();
var fs = require('fs');
var readline = require('readline');
var google = require('googleapis');
var googleAuth = require('google-auth-library');

app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());
app.listen((process.env.PORT || 3000));

// Server frontpage
app.get('/', function (req, res) {
    res.send('This is DBot Server');
});

// Facebook Webhook
app.get('/webhook', function (req, res) {
    if (req.query['hub.verify_token'] === 'testbot_verify_token') {
        res.send(req.query['hub.challenge']);
    } else {
        res.send('Invalid verify token');
    }
});
// handler receiving messages
app.post('/webhook', function (req, res) {
    var events = req.body.entry[0].messaging;
    for (i = 0; i < events.length; i++) {
        var event = events[i];
        if (event.message && event.message.text) {
          if (!kittenMessage(event.sender.id, event.message.text)) {
            if (event.message.text === 'Dbot') {
              sendMessage(event.sender.id,{text:"yes"});
            }
            else if (event.message.text === 'Turn off lights') {
              sendMessage(event.sender.id,{text:"Turning off lights"});
            }
            else if (event.message.text === 'Turn on lights') {
              sendMessage(event.sender.id,{text:"Turning on lights"});
            }
            else if (event.message.text === 'What does my week look like'){
              var SCOPES = ['https://www.googleapis.com/auth/calendar.readonly'];
              var TOKEN_DIR = (process.env.HOME || process.env.HOMEPATH ||
                  process.env.USERPROFILE) + '/.credentials/';
              var TOKEN_PATH = TOKEN_DIR + 'calendar-nodejs-quickstart.json';

              // Load client secrets from a local file.
              fs.readFile('client_secret.json', function processClientSecrets(err, content) {
                if (err) {
                  console.log('Error loading client secret file: ' + err);
                  return;
                }
                // Authorize a client with the loaded credentials, then call the
                // Google Calendar API.
                authorize(JSON.parse(content), listEvents);
              });

              /**
               * Create an OAuth2 client with the given credentials, and then execute the
               * given callback function.
               *
               * @param {Object} credentials The authorization client credentials.
               * @param {function} callback The callback to call with the authorized client.
               */
              function authorize(credentials, callback) {
                var clientSecret = credentials.installed.client_secret;
                var clientId = credentials.installed.client_id;
                var redirectUrl = credentials.installed.redirect_uris[0];
                var auth = new googleAuth();
                var oauth2Client = new auth.OAuth2(clientId, clientSecret, redirectUrl);

                // Check if we have previously stored a token.
                fs.readFile(TOKEN_PATH, function(err, token) {
                  if (err) {
                    getNewToken(oauth2Client, callback);
                  } else {
                    oauth2Client.credentials = JSON.parse(token);
                    callback(oauth2Client);
                  }
                });
              }

              /**
               * Get and store new token after prompting for user authorization, and then
               * execute the given callback with the authorized OAuth2 client.
               *
               * @param {google.auth.OAuth2} oauth2Client The OAuth2 client to get token for.
               * @param {getEventsCallback} callback The callback to call with the authorized
               *     client.
               */
               function getNewToken(oauth2Client, callback) {
               //   var authUrl = oauth2Client.generateAuthUrl({
               //     access_type: 'offline',
               //     scope: SCOPES
               //   });
               //   console.log('Authorize this app by visiting this url: ', authUrl);
               //   var rl = readline.createInterface({
               //     input: process.stdin,
               //     output: process.stdout
               //   });
               //   rl.question('Enter the code from that page here: ', function(code) {
               //     rl.close();
                   oauth2Client.getToken('4/Fmhni_8hMMoS3CFu-Qj96ShtwUHSgEXtM15Rph0lY4U', function(err, token) {
                     // console.log(code);
                     if (err) {
                       console.log('Error while trying to retrieve access token', err);
                       return;
                     }
                     oauth2Client.credentials = '4/Fmhni_8hMMoS3CFu-Qj96ShtwUHSgEXtM15Rph0lY4U';
                     storeToken('4/Fmhni_8hMMoS3CFu-Qj96ShtwUHSgEXtM15Rph0lY4U');
                     callback(oauth2Client);
                   });
               //   });
               }


              /**
               * Store token to disk be used in later program executions.
               *
               * @param {Object} token The token to store to disk.
               */
              function storeToken(token) {
                try {
                  fs.mkdirSync(TOKEN_DIR);
                } catch (err) {
                  if (err.code != 'EEXIST') {
                    throw err;
                  }
                }
                fs.writeFile(TOKEN_PATH, JSON.stringify(token));
                console.log('Token stored to ' + TOKEN_PATH);
              }

              /**
               * Lists the next 10 events on the user's primary calendar.
               *
               * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
               */
              function listEvents(auth) {
                var calendar = google.calendar('v3');
                calendar.events.list({
                  auth: auth,
                  calendarId: 'primary',
                  timeMin: (new Date()).toISOString(),
                  maxResults: 10,
                  singleEvents: true,
                  orderBy: 'startTime'
                }, function(err, response) {
                  if (err) {
                    console.log('The API returned an error: ' + err);
                    return;
                  }
                  var events = response.items;
                  if (events.length == 0) {
                    console.log('No upcoming events found.');
                  } else {
                    console.log('Upcoming events:');
                    for (var i = 0; i < events.length; i++) {
                      var event = events[i];
                      var start = event.start.dateTime || event.start.date;
                      console.log('%s - %s', start, event.summary);
                      sendMessage(event.sender.id, {text: [start, event.summary]});
                    }
                  }
                });
              }
            }
            else{
            sendMessage(event.sender.id, {text: "Echo: " + event.message.text});
          }
          }
        } else if (event.postback) {
          console.log("Postback received: " + JSON.stringify(event.postback));
        }
    }
    res.sendStatus(200);
});

// generic function sending messages
function sendMessage(recipientId, message) {
    request({
        url: 'https://graph.facebook.com/v2.6/me/messages',
        qs: {access_token: process.env.PAGE_ACCESS_TOKEN},
        method: 'POST',
        json: {
            recipient: {id: recipientId},
            message: message,
        }
    }, function(error, response, body) {
        if (error) {
            console.log('Error sending message: ', error);
        } else if (response.body.error) {
            console.log('Error: ', response.body.error);
        }
    });
};

// send rich message with kitten
function kittenMessage(recipientId, text) {

    text = text || "";
    var values = text.split(' ');

    if (values.length === 3 && values[0] === 'kitten') {
        if (Number(values[1]) > 0 && Number(values[2]) > 0) {

            var imageUrl = "https://placekitten.com/" + Number(values[1]) + "/" + Number(values[2]);

            message = {
                "attachment": {
                    "type": "template",
                    "payload": {
                        "template_type": "generic",
                        "elements": [{
                            "title": "Kitten",
                            "subtitle": "Cute kitten picture",
                            "image_url": imageUrl ,
                            "buttons": [{
                                "type": "web_url",
                                "url": imageUrl,
                                "title": "Show kitten"
                                }, {
                                "type": "postback",
                                "title": "I like this",
                                "payload": "User " + recipientId + " likes kitten " + imageUrl,
                            }]
                        }]
                    }
                }
            };

            sendMessage(recipientId, message);

            return true;
        }
    }

    return false;

};
