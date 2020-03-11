# Serverless WebSocket

Azure SignalR is able to accept direct WebSocket connection and forward every message frame to the Serverless Upstream target.
* Azure SignalR to maintain your connections
* Your Upstream to handle the business logic.
* Manipulate your connections through Azure SignalR.

Check the [specs here](./serverless-websocket/specs/runtime-websocket-serverless.md).

## Demos
* [A simple demo](./samples/simple-chat) with Azure Function and Azure SignalR Serverless WebSocket
* [An advanced chatroom](./samples/advanced-chatroom) with Azure Function and Azure SignalR Serverless WebSocket and Storage

## Workflow