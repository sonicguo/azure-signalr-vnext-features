# Serverless WebSocket

Azure SignalR is able to accept direct WebSocket connection and forward every message frame to the Serverless Upstream target.
* Azure SignalR to maintain your connections
* Your Upstream to handle the business logic.
* Manipulate your connections through Azure SignalR.

Check the [specs here](./specs/runtime-websocket-serverless.md).

## Demos
* [4 steps creating a chat](./samples/simple-chat/Readme.md) in either Azure Function way or Express way.
    * 🔥 [Live Demo](https://wssimpledemo.z13.web.core.windows.net)
* [A fully-functional server-less chatroom with group, user and history](./samples/advanced-chatroom/Readme.md) with Azure Function and Azure Storage.
    * 🔥 [Live Demo](https://serverless-ws-chat-demo.azurewebsites.net/?code=LJ0EgrwWYSkm5MXGAe2AvPKVRGTaYpqQ/pxzJaFpVvyCY4j53s055Q==) 
* [A real-time whiteboard](https://github.com/chenkennt/Whiteboard#websocket-version)
    * 🔥 [Live Demo](https://ws-whiteboard.azurewebsites.net/)

