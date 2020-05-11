# Serverless WebSocket

Azure SignalR is able to accept direct WebSocket connection and forward every message frame to the Serverless Upstream target.
* Azure SignalR to maintain your connections
* Your Upstream to handle the business logic.
* Manipulate your connections through Azure SignalR.

Check the [specs here](./specs/runtime-websocket-serverless.md).

## Demos
* [🔥 [Live Demo](https://wssimplechatdemo.z13.web.core.windows.net)🔥 ] [4 steps creating a chat](./samples/simple-chat/Readme.md) in either Azure Function way or Express way.
* [🔥 [Live Demo](https://serverless-ws-chat.azurewebsites.net/api/home?code=msSB2Zn5P1VSRITEjQpFotgAuPLWDnvqvT0zcV/hP3uEgBUnMrygfQ==&name=testuser1)🔥 ] [A fully-functional server-less chatroom with group, user and history](./samples/advanced-chatroom/Readme.md) with Azure Function and Azure Storage.

