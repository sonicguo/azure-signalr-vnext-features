# Serverless WebSockets

## Goals

Use Azure SignalR Service to handle pure WebSocket requests (without SignalR):
    
- Talk to an upstream application using HTTP protocol
- Handle connection connect/disconnect events
- Handle the WebSocket handshake, with the ability to configure the SubProtocol and reject connections
- Handle WebSocket messages

## Non-Goals
- The upstream using persistent connection is out of scope.
- Supporting protocols where one protocol message is not bound to a single WebSocket frame is out of scope, e.g. MQTT.
- Supporting protocols where messages are having context or dependencies to previous messages is out of scope, e.g. streaming protocols.

## Terms

- **Upstream**: An upstream is the application that processes WebSocket connections and messages. This can be an azure function or any other application that can handle HTTP requests.
- **hub**: A hub is a unit of the isolation, the scope of users and message delivery is constrained to a hub. 
- **connectionId**: Every WebSocket connection has a unique `connectionId`.
- **userId**: Every connection has a user id from the authetication result if it is not an anonymous connection.


## Portal Configuration

1. The portal will support configuring WebSocket mode, from CLI and Azure portal. With WebSocket mode, only `/ws` requests are allowed.
2. The portal will support configuring Upstream settings from CLI and Azure portal.

## Authentication

### Authentication between client and service

1. **Anonymous** - Authentication is handled by the Upstream.
1. **JWT tokens** - The service validates a JWT token based on the access key. (*TODO* add more details about generating JWT token).
1. **Client certificates** -  Certificate details to available via request header `X-ASRS-Client-Cert-Thumbprint`

### Authentication between service and webhook
1. Anonymous mode
1. Simple Auth that `code` is provided through the configured Webhook URL.
1. AAD Auth. Add a client secret in AAD's [App Registrations] and provide the [client secret] to Azure SignalR from portal.

## Client endpoint

Both hub and format support set from url or query, below patterns are valid.

- `wss://{serviceUrl}/ws/client/hubs/{hub}/formats/{text/binary}`
- `wss://{serviceUrl}/ws/client/hubs/{hub}?formats={text/binary}`
- `wss://{serviceUrl}/ws/client?hubs={hub}&format={text/binary}`

## Upstream

The Upstream's settings can be configured from Azure portal or from CLI. The URL can be parameterized to support various patterns. 
        
There are 3 predefined parameters: 

1. `{hub}` 
1. `{category}`
1. `{event}`
        
The service calculates the value of the Upstream URL dynamically when the client request comes in. For example, when a request `/ws/client/hubs/chat` comes in, with a configured Upstream URL pattern `http://host.com/{hub}/api/{event}`, when the client connects, it will first POST to this URL: `http://host.com/chat/api/connect`. 

**Note: The value of these parameters are escaped when evaluating the Upstream URl. The `event` and `category` values will be illustrated later in this spec.**

### Upstream Request Validation

#### Goal

Provide a way for Upstream to verify if the requests are from ASRS instead of a third party.

#### Non-Goals

Prevent ASRS from calling invalid Upstream endpoint. For example, [LinkedIn](https://docs.microsoft.com/en-us/linkedin/shared/api-guide/webhook-validation) uses a `challengeCode` request and expects a `challengeResponse`. As we support parameterization, Upstream endpoints are determined dynamically, so it is hard to validate the upstream endpoints when set, we can potentially  offer a feature for the customer to fill parameters to validate some particular endpoints manually.

#### Validating a request

The service will calcuate `SHA256` code for the `X-ASRS-Connection-Id` value using both primary access key and secondary access key as the HMAC key, and will set it in the `X-ASRS-Signature` header when making HTTP requests to the Upstream:

```
Hex_encoded(HMAC_SHA256(accessKey, connection-id))
```

## Communication

### Calling the Upstream from the Client
        
We leverage HTTP protocol to deliver WebSocket connections to Upstream. A single WebSocket connection's lifecyle is as below: Handshake and Connect -> Handle Messages -> Disconnect
        
Each is a defined **event** and belongs to a **category**. When event are triggered, the service makes an HTTP `POST` request to the Upstream URL, and deliver the HTTP response to the client if the response is non-empty. Details are described in [Protocol](#protocol-details) section.

### Calling the Client from the Upstream

The ASRS server tracks clients and has a result can be used to send messages to a specific client or a set of clients. You can use the REST API to send messages to clients.

| Actions | REST API |
|----|----|
| Broadcast message | `POST /ws/api/v1/hubs/{hub}` |
| Send message to user | `POST /ws/api/v1/hubs/{hub}/users/{id}`|
| Send message to connection |`POST /ws/api/v1/hubs/{hub}/connections/{connectionId}`|
| Add connection to group |`PUT /ws/api/v1/groups/{group}/connections/{connectionId}`|
| Remove connection from group|`DELETE /ws/api/v1/groups/{group}/connections/{connectionId}`|
| Add user to group |`PUT /ws/api/v1/groups/{group}/users/{user}`|
| Remove user from group|`DELETE /ws/api/v1/groups/{group}/users/{user}`|
| Send message to group| `POST /ws/api/v1/hubs/{hub}/groups/{group}`|
| Close connection| `DELETE /ws/api/v1/hubs/{hub}/connections/{connectionId}?reason={reason}`
            
## Protocol Details

### Connect
#### Url Parameters:
* `category`: `connections`
* `event`: `connect`

#### Verb: `POST`

#### HEAD:
*`?` to indicate this header is optional*

* `Sec-WebSocket-Protocol?`: `{subprotocols}`
* `X-ASRS-Client-Cert-Thumbprint?`: `{thumbprint}`
* `X-ASRS-Connection-Id`: `{connection-id}`
* `X-ASRS-Hub`: `{hubname}`
* `X-ASRS-Category`: `connections`
* `X-ASRS-Event`: `handshake`
* `X-ASRS-User-Id`: `{user-id}`
* `X-ASRS-User-Claims`: `{user-claims}`
* `X-ASRS-Signature`: `sha256={connection-id-hash-primary},sha256={connection-id-hash-secondary}`
* `X-ASRS-Client-Query-String?`: `{query-string}`
* `X-Forwarded-For`: `1.2.3.4, 5.6.7.8`
* `Date`: `Fri, 10 Jan 2020 01:02:03 GMT`

#### Body: `empty`

#### Response Headers:
*`?` to indicate this header is optional*

* `Sec-WebSocket-Protocol?`: `{subprotocol}`

The connect event forwards the subprotocol and authentication information to Upstream from the client. The Azure SignalR Service uses the status code to determine if the request will be upgraded to WebSocket protocol.

If the request contains the `Sec-WebSocket-Protocol` header with one or multiple supported sub-protocols. The server should return one sub-protocol it supports. If the server doesn't want to use any subprotocols, it should **not** send the `Sec-WebSocket-Protocol` header. [Sending a blank header is incorrect](https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API/Writing_WebSocket_servers#Subprotocols).

* `X-ASRS-User-Id?`: `{authed user id}`

As the service allows anonymous connections, it is the `connect` event's responsibility to tell the service the user id of the client connection. The Service will read the user id from the response header `X-ASRS-User-Id` if it exists. The connection will be dropped if user id cannot be read from the request claims nor the `connect` event's response header.

#### Response Status Codes:
* `2xx`: Success, the WebSocket connection is going to be established.
* `4xx`: Error, the response from Upstream will be returned as the response for the client request.

### Send Messages
The service calls the Upstream for every complete WebSocket message.

#### Url Parameters:
* `category`: `messages`
* `event`: `message`

#### Verb: `POST`

#### HEAD:
*`?` to indicate this header is optional*

* `X-ASRS-Hub`: `{hubname}`
* `X-ASRS-Category`: `messages`
* `X-ASRS-Connection-Id`: `{connection-id}`
* `X-ASRS-Event`: `message`
* `X-ASRS-User-Id`: `{user-id}`
* `X-ASRS-User-Claims`: `{user-claims}`
* `X-ASRS-Signature`: `sha256={connection-id-hash-primary},sha256={connection-id-hash-secondary}`
* `X-ASRS-Client-Query-String?`: `{query-string}`
* `X-Forwarded-For`: `1.2.3.4, 5.6.7.8`
* `Date`: `Fri, 10 Jan 2020 01:02:03 GMT`
* `Content-Type`: `application/octet-stream`(for binary frame)|`text/plain`(for text frame)

#### Body: `{message payload}`

### Disconnect

**Disconnect** event will **always** be triggered when the client request completes if the **Connect** event returns `2xx` status code.

#### Url Parameters:
* `category`: `connections`
* `event`: `disconnect`

#### Verb: `POST`

#### HEAD:
*`?` to indicate this header is optional*

* `X-ASRS-Hub`: `{hubname}`
* `X-ASRS-Category`: `connections`
* `X-ASRS-Connection-Id`: `{connection-id}`
* `X-ASRS-Event`: `disconnect`
* `X-ASRS-User-Id`: `{user-id}`
* `X-ASRS-User-Claims`: `{user-claims}`
* `X-ASRS-Signature`: `sha256={connection-id-hash-primary},sha256={connection-id-hash-secondary}`
* `X-ASRS-Client-Query-String?`: `{query-string}`
* `X-Forwarded-For`: `1.2.3.4, 5.6.7.8`
* `Date`: `Fri, 10 Jan 2020 01:02:03 GMT`

#### Body: `empty`
