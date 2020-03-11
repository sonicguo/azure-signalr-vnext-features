# WebSocket Support for Serverless

## Goals

* Goals
    
    Use Azure SignalR Service to serve pure WebSocket request, able to:
    * Talk to Upstream using HTTP protocol
    * Handle connection connect/disconnect
    * Handle WebSocket handshake, able to configure WebSocket SubProtocol and reject bad requests
    * Handle WebSocket frame


* Non-Goals
    * Pure WebSocket support with an application server is out of scope.
    * The upstream connected the the service using persistent connection is out of scope.
    * Supporting custom protocols that one protocol message is not bound to a single WebSocket frame is out of scope, e.g. MQTT.
    * Supporting custom protocols that messages are having context or dependencies to previous messages is out of scope, e.g. streaming protocols.

## Use cases
1. OCPP
    1. Client cert validation
    1. No query, only path
1. GraphQL Subscription's [C# implementation](https://github.com/Azure/Azure-Functions/issues/738#issuecomment-569946531)
1. Chatroom
    1. Auth
    2. Group
    3. Chat History

## Design Details
1. Portal Configure and RP support
    1. Support configuring "WebSocket" options, from CLI and Azure portal. With "WebSocket" options, only `/ws` requests are allowed.
    2. Support configuring "Upstream" settings from CLI and Azure portal.
1. Auth
    1. Auth between client and service
        1. Option1: Client cert
            1. Ingress to add cert details to request header `X-ASRS-Client-Cert-Thumbprint`
        1. Option2: JWT token: this requires a `negotiate` endpoint.
            1. *TODO* add more details about generating JWT token
    1. Auth between service and webhook
        1. Anonymous mode
        1. Simple Auth that `code` is provided through the configured Webhook URL.
        1. AAD Auth. Add a client secret in AAD's [App Registrations] and provide the [client secret] to Azure SignalR from portal.
1. Baisc terms
    1. Upstream: upstream is where host the application logic of processing the WebSocket connections
    1. `hub`: Hub is the isolation of logic, the scope of users and message delivary is constraint to one Hub. 
    1. `connectionId`: Every single WebSocket connection has an unique `connectionId`.
    1. `userId`: Every connection get a user id from it's auth result if it is not anonymous connect.
1. Client endpoint
    Both hub and format support set from url or query, below patterns are valid.
    1. `/ws/client/hubs/{hub}/formats/{text/binary}`
    1. `/ws/client/hubs/{hub}?formats={text/binary}`
    1. `/ws/client?hubs={hub}&format={text/binary}`
1. Upstream
    1. Parameterized 
        The Upstream URL is parameterized, in this way, the service can support different Upstream URL patterns flexibly. 
        
        There are 3 predefined parameters: 
        1. `{hub}` 
        1. `{category}`
        1. `{event}`
        
        The service calculate the value of the Upstream URL dynamically when the client request comes in. For example, when a request `/ws/client/hubs/chat` comes in, with a configured Upstream URL pattern `http://host.com/{hub}/api/{event}`, when the client connects, it will first POST to this URL: `http://host.com/chat/api/connect`. Note that the value of these parameters are escaped when evaluating the Upstream URl. The `event` and `category` values will be illustrated later in this spec.
    1. Configure
        Upstream settings can be configured from Azure portal or from CLI.
    1. Validation
        1. Aim
            1. provide a way for Upstream to verify if the requests are from ASRS instead of a third party
        1. NoAim
            1. prevent ASRS from calling invalid Upstream endpoint. For example, [LinkedIn](https://docs.microsoft.com/en-us/linkedin/shared/api-guide/webhook-validation)uses `challengeCode` request and expect `challengeResponse`. As we supports parameterization, Upstream endpoints are determined dynamically, so it is hard to validate the upstream endpoints when set, maybe we can offer a feature for customer to fitin some parameters to validate some particular endpoints manually.
        1. Community how to validate if the request is from ASRS
            1. `signature` [Stripe](https://stripe.com/docs/webhooks/signatures): a `secret` for every Webhook
                `Stripe-Signature` SHA256 `{timestamp}.{JSON payload}`.It is possible to have multiple signatures with the same scheme/secret pair. This can happen when you roll an endpoint’s secret from the Dashboard, and choose to keep the previous secret active for up to 24 hours. During this time, your endpoint has multiple active secrets and Stripe generates one signature for each secret.
            1. [GitHub](https://developer.github.com/webhooks/securing/): customer to generate a `secret token`, GitHub uses it to create a hash signature with each payload. `X-Hub-Signature` using  HMAC hexdigest: `'sha1=' + OpenSSL::HMAC.hexdigest(OpenSSL::Digest.new('sha1'), ENV['SECRET_TOKEN'], payload_body)`
            1. [Twilio](https://www.twilio.com/docs/usage/webhooks/webhooks-security): `X-Twilio-Signature`: HMAC-SHA1 with the account's auth token as the secret key.
            1. [Paddle](https://developer.paddle.com/webhook-reference/verifying-webhooks): `p-signature`: sort fields from the request and sign with the public key
        1. Our proposal
            Calcuate SHA256 code for the `x-asrs-connection-id` value using both primary access key and secondary access key as the HMAC key, and insert it to the headers using `X-ASRS-Signature` requesting the Upstream.
            `Hex_encoded(HMAC_SHA256(accessKey, connection-id))`
1. Connection
    1. (client to Upstream) Invoke Upstream
        * Events
        * Payloads
        * Ping events
    
        We leverage HTTP protocol to deliver WebSocket connections to Upstream.
        A single WebSocket connection's lifecyle is as below:
        Handshake and connect -> Send Messages -> Disconnect
        
        Each is a defined **event** and belongs to a **category**. When every **event** takes place, the Service `POST` a HTTP request to the Upstream URL, and deliver back HTTP response to the client if the response is not empty. Details are described in [Protocol](#protocol) section.
    1.  (Upstream to client) Call REST API of Azure SignalR Service
        1. Broadcast messages: 
            `POST /ws/api/v1/hubs/{hub}`
        1. Send message to user:
            `POST /ws/api/v1/hubs/{hub}/users/{id}`
        1. Send message to one connection:
            `POST /ws/api/v1/hubs/{hub}/connections/{connectionId}`
        1. Send message to group
            `POST /ws/api/v1/hubs/{hub}/groups/{group}`
        1. Close a connection
            `DELETE /ws/api/v1/hubs/{hub}/connections/{connectionId}?reason={reason}`
            
<a name="protocol"></a>

## Protocol
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

#### Response Head:
*`?` to indicate this header is optional*

* `Sec-WebSocket-Protocol?`: `{choosed subprotocol}`

The connect event sends the *subprotocol* info and the *auth* info to Upstream if the client request contains related info. And the Azure SignalR Service depends on the response status code to determine if the request will be upgraded to WebSocket protocol. 

If the request contains the `Sec-WebSocket-Protocol` header with one or multiple supported sub-protocols. The server should return one sub-protocol it supports. If the server doesn't want to use any subprotocols, **it shouldn't send any `Sec-WebSocket-Protocol` header**. [Sending a blank header is incorrect](https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API/Writing_WebSocket_servers#Subprotocols).

* `X-ASRS-User-Id?`: `{authed user id}`

As service allow anonymous connect, it is the `connect` event's responsibility to tell the service the user id of the client connection. Service read the user ID from the response header `X-ASRS-User-Id` if it exists. The connection will drop if user ID is not able to be read from neither the request claims nor the `connect` event's response header.

#### Response Status Code:
* `2xx`: Success, the WebSocket connection is going to be established.

* `4xx`: Error, the response from Upstream will be returned as the response for the client request.

### Send Messages
The service invokes the Upstream for every complete WebSocket frame. 
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
