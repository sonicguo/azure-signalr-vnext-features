const connString = require('./settings.json').AzureSignalRConnectionString;
const client = require('azure-websockets').client(connString);
const express = require('express');

const app = express();

// serve requests for "simplechat"
app.post(`/simplechat/connect`, function (req, res) {
  // simple auth to read user info from query
  var event = client.event(req.headers);
  var user = event.query.user;
  console.log(`User ${user}(${event.connectionId}) connected, auth the user.`);
  // set back the user id for the connection
  res.header("x-asrs-user-id", user);
  res.send('');
});

app.post(`/simplechat/message`, async function (req, res) {
  var event = client.event(req.headers);
  console.log(`User ${event.userId}(${event.connectionId}) sending message.`);
  // broadcast through Azure SignalR
  try {
    await client.broadcast(req.body);
    res.send('');
  } catch (err) {
    // report err back to client
    res.status(520).send({ type: 'error', content: err.message });
    console.err(`Error broadcasting: ${err.message}`);
  }
});

app.post(`/simplechat/disconnect`, function (req, res) {
  var event = client.event(req.headers);
  console.log(`User ${event.userId}(${event.connectionId}) disconnected.`);
  res.send('');
});

var server = app.listen(8088, function () {
  var host = server.address().address;
  var port = server.address().port;
  console.log("Serving http://%s:%s", host, port);
});