const express = require('express');
const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');
const axios = require("axios");
const config = require('./settings.json');

const app = express();
const conn = config["AzureSignalRConnectionString"];
if (!conn){
  console.error("Please specify `AzureSignalRConnectionString` with your connection string in settings.json file!");
  return;
}
const parsed = parse(conn);
if (!parsed) {
  console.error(`Set valid connectiong string in settins.json: ${conn}`);
  return;
}

// serve default to return index.html
app.get('/', function (req, res) {
  const name = req.query.name;
  if (!name) {
    res.status(404).send("User name is not found in query 'name'");
    return;
  }

  fs.readFile(path.join(__dirname, 'index.html'), { encoding: 'utf8' }, function (err, data) {
    if (err) {
      res.sendStatus(404);
    } else {
      var rendered = data.replace(/%%%____URL____%%%/g, `${parsed.wshost}ws/client/?user=${name}`)
        .replace(/%%%___user___%%%/g, name);
      res.send(rendered);
    }
  });
});

// serve requests for "simplechat"
app.post(`/simplechat/connect`, function (req, res) {
  var user = new URLSearchParams(req.header("x-asrs-client-query")).get('user');
  console.log(`connect ${req.header("x-asrs-connection-id")} user ${user} connected.`);
  // set back the user id for the connection
  res.header("x-asrs-user-id", user);
  res.send(`User ${user}(${req.header("x-asrs-connection-id")}) connected.`);
});
app.post(`/simplechat/message`, function (req, res) {
  console.log(`User ${res.header("x-asrs-user-id")}(${req.header("x-asrs-connection-id")}) sending message.`);
  // broadcast through Azure SignalR
  req.setEncoding('utf8');
  var body = '';
  req.on('data', function(chunk) {
    body += chunk;
  });
  
  req.on('end', async function(){
    if (body){
      console.log("broadcasting " + body);
      await broadcast(body);
    }
  });
});
app.post(`/simplechat/disconnect`, function (req, res) {
  console.log(`User ${res.header("x-asrs-user-id")}(${req.header("x-asrs-connection-id")}) disconnected.`);
});

var server = app.listen(8088, function () {
  var host = server.address().address;
  var port = server.address().port;
  console.log("Serving http://%s:%s", host, port);
});

function broadcast(content) {
  var path = "ws/api/v1";
  var url = parsed.host + path;
  var token = getToken(path);
  return axios.post(url, content, {
    headers: {
        "Content-Type": "text/plain",
        "Authorization": token
    }
  });
}

function getToken(path) {
  return "Bearer " + jwt.sign({}, parsed.key, {
    audience: parsed.audience + path,
    expiresIn: "1h",
    algorithm: "HS256"
  });
}

function parse(conn) {
  const em = /Endpoint=(.*?);/g.exec(conn);
  if (!em) return null;
  const endpoint = em[1];
  const km = /AccessKey=(.*?);/g.exec(conn);
  if (!km) return null;
  const key = km[1];
  if (!endpoint || !key) return null;
  const pm = /Port=(.*?);/g.exec(conn);
  const port = pm == null ? '' : pm[1];
  var url = new URL(endpoint);
  url.port = port;
  const host = url.toString();
  url.port = '';
  const audience = url.toString();
  return {
    host: host,
    audience: audience,
    key: key,
    wshost: host.replace('https://', 'wss://').replace('http://', 'ws://')
  };
}