# Introduction
This is a ChatRoom built upon Azure Function and Azure SignalR Serverless, Azure blob storage is used to persistent data.

Check the [Live Demo](https://serverless-ws-chat-demo.azurewebsites.net/?code=LJ0EgrwWYSkm5MXGAe2AvPKVRGTaYpqQ/pxzJaFpVvyCY4j53s055Q==)

## Run the Chat sample locally

### Prerequisites
The following are required to run the Chat sample locally
* [Visual Studio Code](https://code.visualstudio.com/) as the Function's IDE
* [Azure Functions Core Tools v3](https://github.com/Azure/azure-functions-core-tools#installing) that provide a local development experience for creating, developing, testing, running, and debugging Azure Functions
* [Azure Functions Extension](https://marketplace.visualstudio.com/items?itemName=ms-azuretools.vscode-azurefunctions) inside Visual Studio Code
* [ngrok](https://ngrok.com/) to expose local port to public

### Configure application settings
When running and debugging the Azure Functions runtime locally, application settings are read from **local.settings.json**. Inside `local.settings.json`, replace the value of `AzureSignalRConnectionString` with the value from your ConnectionString of the Azure SignalR. Later on, you can upload these settings to remote when you try to deploy Function App to Azure using **Azure Functions: Upload local settings** command inside VS Code command palette.

### Run the Function locally
Open current folder in VS Code, it contains a Function App host config `host.json` so that with when press F5, the Azure Function extension detects the config and starts to run. Next step is to expose this local port so that Azure SignalR is able to reach it. [ngrok](https://ngrok.com/) helps us to achieve this.

Inside the `ngrok` folder, type:
```
ngrok http 7071
```

From now on, **ngrok** forwards every request to `http://(id).ngrok.io` to `http://localhost:7071`. 

### Set the Upstreams for the Service
Now it is time to config the Upstream URL pattern inside Azure SignalR Service.

With this Private Preview version, we provide an [Upstream Manage Page](https://ws-manage.azurewebsites.net/api/manage) for you to set and get the Upstream settings of the Service. Please note that this is a **temp** workaround before the Upstream settings are available in the Azure portal.

Put the following into the **Set Upstream** text area to set the Upstream settings for the service for the hub `chat`, remember to replace `(id)` with your `ngrok` host. In this way, you can set different Upstreams for different hubs. You can also define different Upstream patterns depends on different events by setting `eventPattern`, or depends on different categories by setting `categoryPattern`. Please check [Upstream spec](../../specs/runtime-websocket-serverless.md#upstream) for details.

```json
{
    "templates": [
        {
            "hubPattern": "advanced_chat_demo",
            "categoryPattern": "*",
            "eventPattern": "*",
            "urlTemplate": "http://(id).ngrok.io/api/{event}"
        }
    ]
}
```

There are 3 kind of pattern syntax supported. Take the `eventPattern` for example:
1. `"*"`, it to matches any event name
2. Combine multiple events with `,`, for example `"connect,disconnect"`, it matches event "connect" and "disconnect"
3. The single event name, for example, "connect", it matches "connect".

You can define multiple template items in order. With every incoming request, the first matching one takes effect.

### Run the chat
Now visit `http://localhost:7071` and you are ready to chat locally.

## Go through the demo code
 There are 5 Functions defined in this Function App.
1. [The Function hosting the Chat's static webpage](./client), there is also a proxy defined in [proxies.json](./proxies.json) to visit the page easily.
2. [The Function providing the service's endpoint](./endpoint) for client to connect to.
3. [The Function to be invoked when connection connects ](./connect)
4. [The Function to be invoked with every WebSocket frame ](./message)
5. [The Function to be invoked when connection disconnects ](./disconnect)

### The Function hosting the Chat's static webpage
The Chat's webpage is quite simple, a static webpage is enough. It is based on pure html and the [Vue.js](https://cn.vuejs.org/index.html) JavaScript framework. Inside [index.html](./client/index.html), the client first requests the WebSocket endpoint from `endpoint` Function, and then connects to the endpoint. You can auth the client inside `endpoint` Function, you can also allow anonymous login and delay the auth check until connection invokes `connect` Function, as current demo does in [connect Function](./connect/index.js).

### The Fucntion to be invoked when connection connects

You may've been noticed that no auth info is needed when connecting to Azure SignalR Serverless WebSocket. When the client connects anonymously, you can auth the client when it connects and when [connect Function](./connect/index.js) is invoked. You tell the service the authed info by setting the `x-asrs-user-id` response header.

Besides auth or reject the incoming request, another feature the `connect` stage offers is to select the **subprotocol** for the WebSocket connection. The **subprotocol** of the incoming request is set inside the header `Sec-WebSocket-Protocol`. As defined in the WebSocket spec, the header can be set multiple times, and the Function should be responsible for setting the response `Sec-WebSocket-Protocol` header of one selected protocol.

### The Fucntion to be invoked with every single WebSocket frame
If the `connect` event returns success code, Azure SignalR Service will establish the real WebSocket connection with client. After that, every WebSocket frame triggers the [message Function](./message/index.js).

The Upstream URL pattern has 3 supported parameters, `{event}`, `{hub}`, `{category}`. These 3 parameters will be evaluated and replace dynamically for a single client request. For example, when a request `/ws/client/hubs/chat` comes in, with a configured Upstream URL pattern `http://localhost:7071/api/{event}`, when the client connects, it will first POST to this URL: `http://localhost:7071/api/connect`.

|Event  | {event} | {category} |
|-----------| -------------| ----------------|
|Connect | `connect` | `connections` |
|Message | `message` | `messages` |
|Disconnect | `disconnect` | `connections` |

### Ask the Service to do things for you
The Service provides [REST APIs](../../specs/ws.swagger.json) to manipulate connected WebSocket connections.
For now, we provide a simple *preview* version of npm library [azure-websockets](https://github.com/vicancy/azure-websockets.git) to use:

1. Install
```
npm install https://github.com/vicancy/azure-websockets.git
```

2. Usage
```js
// read connection string from env "AzureSignalRConnectionString", read hub name from env "HubName"
const client = require('azure-websockets').default(context);

// pass in upir connection string and hub name
const anotherClient = require('azure-websockets').client('{YourConnString}', '{YourHubName}', context);

// get event (req is the client request)
const event = client.event(req.headers);
// get connectionId
const connectionId = event.connectionId;
// read the value of client query "name"
const user = event.query.name

const message = '{Your message}';
const group = '{Your group}';

// broadcast 
await client.broadcast(message);

// send message to a connection
await client.sendToConnection(connectionId, message);
// add connectionId to group
await client.addConnectionToGroup(group, connectionId);
// remove connectionId from group
await client.removeConnectionFromGroup(group, connectionId);
// close a connection
await client.closeConnection(connectionId, 'close reason');

// send message to user
await client.sendToUser(user, message);

// add user to group
await client.addToGroup(group, user);
// remove user from group
await client.removeFromGroup(group, user);

// check if user exists
const userExists = await client.userExists(user);
// check if group exists
const groupExists = await client.groupExists(group);
// check if connection exists
const connectionExists = await client.connectionExists(connectionId);

```