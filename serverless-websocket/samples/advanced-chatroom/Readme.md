# Introduction
This is a ChatRoom built upon Azure Function and Azure SignalR Serverless, Azure blob storage is used to persistent data.

Check the [Live Demo](https://serverless-ws-chat.azurewebsites.net/api/home?code=msSB2Zn5P1VSRITEjQpFotgAuPLWDnvqvT0zcV/hP3uEgBUnMrygfQ==&name=testuser1)

## Run the Chat sample locally

### Prerequisites
The following are required to run the Chat sample locally
* [Visual Studio Code](https://code.visualstudio.com/) as the Function's IDE
* [Azure Functions Extension](https://marketplace.visualstudio.com/items?itemName=ms-azuretools.vscode-azurefunctions) inside Visual Studio Code
* [ngrok](https://ngrok.com/) to expose local port to public

### Configure application settings
When running and debugging the Azure Functions runtime locally, application settings are read from **local.settings.json**. Inside `local.settings.json`, replace the value of `AzureSignalREndpoint` and `AzureSignalRAccessKey` with the value from your ConnectionString of the Azure SignalR, the value of `Endpoint=` and `AccessKey=` respectively. Later on, you can upload these settings to remote when you try to deploy Function App to Azure using **Azure Functions: Upload local settings** command inside VS Code command palette

### Run the Function locally
Open current folder in VS Code, it contains a Function App host config `host.json` so that with when press F5, the Azure Function extension detects the config and starts to run both `home` and `messages` Http Functions. The `home` Function `http://localhost:7071/api/home` is which to return the hosted web app, and the `messages` Function `http://localhost:7071/api/messages` is the Upstream we expect the Azure SignalR will invoke on every event. So next step is to expose this local port so that Azure SignalR is able to reach it. [ngrok](https://ngrok.com/) helps us to achieve this.

Inside the `ngrok` folder, type:
```
ngrok http 7071
```

From now on, **ngrok** forwards every request to `http://(id).ngrok.io` to `http://localhost:7071`. 

### Set the Upstreams for the Service
Now it is time to config the Upstream URL pattern inside Azure SignalR Service.

With this Private Preview version, we provide a REST API endpoint for you to set and get the Upstream settings of the Service. Please note that, later on, this endpoint will be **removed** when we support setting the Upstream from portal and Azure CLI.

We provide a simple web app https://ws-manage.azurewebsites.net/api/manage deployed for you to easily get and set the current Upstream settings of the service.

Put following into the Set Upstream text area to set the Upstream settings for the service for the hub `chat`. In this way, you can set different Upstreams for different hubs. You can also define different Upstream patterns depends on different events by setting `eventPattern`, or depends on different categories by setting `categoryPattern`. Please check [Upstream spec](../../specs/runtime-websocket-serverless.md#upstream) for detail
```json
{
    "templates": [
        {
            "hubPattern": "chat",
            "categoryPattern": "*",
            "eventPattern": "*",
            "urlTemplate": "http://(id).ngrok.io/api/messages?event={event}"
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
Now visit `http://localhost:7071/api/home?name=yourname` and you are ready to chat locally.


## Go through the demo code
There are two Functions inside this repo:
1. [The Function hosting the Chat's static webpage](./home)
3. [The Function handling WebSocket requests](./messages)

## The Function hosting the Chat's static webpage
The Chat's webpage is quite simple, a static webpage is enough. It is based on pure html and the [Vue.js](https://cn.vuejs.org/index.html) JavaScript framework. What the function does in [index.js](./home/index.js) is simply return the content of [index.html](./home/index.html), providing the Azure SignalR Serverless WebSocket endpoint value `{AzureSignalREndpoint}/ws/client/hubs/chat`.

To make the demo workflow simple, current auth info is read from request's query `name`. AAD is also supported if AAD is configured for the Function App.

## Configure the Upstreams for the WebSocket requests

You may've been noticed that no auth info is needed connecting to Azure SignalR Serverless WebSocket. It is the case when the `connect` `UpstreamSettings`
In the demo, we provide a workaround for setting the Upstream URL pattern as providing a claim as `asrs.s.rfh` and read the value from Environment variable `UpstreamUrl`, as for now the portal access is not yet ready. Later on, when Azure SignalR Service adds the ability to set the Upstream Settings from portal, this workaround will be obsoleted.

The Upstream URL pattern has 3 supported parameters, `{event}`, `{hub}`, `{category}`. These 3 parameters will be evaluated and replace dynamically in Azure SignalR for a single client request. For example, when a request `/ws/client/hubs/chat` comes in, with a configured Upstream URL pattern `http://localhost:7071/api/messages?event={event}`, when the client connects, it will first POST to this URL: `http://localhost:7071/api/messages?event=connect`.

|Event  | {event} | {category} |
|-----------| -------------| ----------------|
|Connect | `connect` | `connections` |
|Message | `message` | `messages` |
|Disconnect | `disconnect` | `connections` |

## The Function handling WebSocket requests
Before the WebSocket connection is established, the `connect` event is triggered, providing the Function the ability to Auth the user or reject the user or select the **subprotocol** for the WebSocket connection. The **subprotocol** of the incoming request is set inside the header `Sec-WebSocket-Protocol`. As defined in the WebSocket spec, the header can be set multiple times, and the Function should be responsible for setting the response `Sec-WebSocket-Protocol` header of one selected protocol.

If the `connect` event returns success code, Azure SignalR Service will establish the real WebSocket connection with client. After that, every WebSocket frame triggers a HTTP request to the Upstream URL. The following headers are added by Azure SignalR Service so that the Function can read the info from the request headers:

* `X-ASRS-Hub`: `{hubname}`
* `X-ASRS-Category`: `connections`
* `X-ASRS-Connection-Id`: `{connection-id}`
* `X-ASRS-Event`: `connect`
* `X-ASRS-User-Id`: `{user-id}`
* `X-ASRS-User-Claims`: `{user-claims}`
* `X-ASRS-Signature`: `sha256={connection-id-hash-primary},sha256={connection-id-hash-secondary}`
* `X-ASRS-Client-Query-String?`: `{query-string}` 

Note that the Function can set the `user` identity of the connection by setting `X-ASRS-User-Id` response header when `connect`, as [./messages/events/connect.js](./messages/events/connect.js) shows.

### Ask Azure SignalR to do things for you
Azure SignalR provides [REST APIs](../../specs/ws.swagger.json) to be used to manipulate connected WebSocket connections, the following actions are possible:

| Actions | REST API With Default Hub | REST API With specific Hub|
|----|----|--|
| Broadcast message | `POST /ws/api/v1` | `POST /ws/api/v1/hubs/{hub}` |
| Send message to user | `POST /ws/api/v1/users/{id}`| `POST /ws/api/v1/hubs/{hub}/users/{id}`|
| Send message to connection |`POST /ws/api/v1/connections/{connectionId}`|`POST /ws/api/v1/hubs/{hub}/connections/{connectionId}`|
| Add connection to group |`PUT /ws/api/v1/groups/{group}/connections/{connectionId}`|`PUT /ws/api/v1/hubs/{hub}/groups/{group}/connections/{connectionId}`|
| Remove connection from group|`Delete /ws/api/v1/groups/{group}/connections/{connectionId}`|`Delete /ws/api/v1/hubs/{hub}/groups/{group}/connections/{connectionId}`|
| Add user to group |`PUT /ws/api/v1/groups/{group}/users/{user}`|`PUT /ws/api/v1/hubs/{hub}/groups/{group}/users/{user}`|
| Remove user from group|`Delete /ws/api/v1/groups/{group}/users/{user}`|`Delete /ws/api/v1/hubs/{hub}/groups/{group}/users/{user}`|
| Send message to group| `POST /ws/api/v1/groups/{group}`|`POST /ws/api/v1/hubs/{hub}/groups/{group}`|
| Close connection| `DELETE /ws/api/v1/connections/{connectionId}?reason={reason}` |`DELETE /ws/api/v1/hubs/{hub}/connections/{connectionId}?reason={reason}`|

The Auth of REST API leverages [JWT Token](https://jwt.io), [./messages/api.js](./messages/api.js) demonstrates how to sign the request using `jsonwebtoken` library.
