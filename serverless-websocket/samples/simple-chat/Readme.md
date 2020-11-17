# A Simple Chat on WebSocket
This is a simple chat demo. The client side is pure static [html page](./client/index.html) that it can be hosted even in Azure Blob, and the server can be hosted by either [Node.js and Express](./server-express-version/Readme.md) or [Azure Function](./server-function-version/Readme.md)

As you can see in the [client page](./client/index.html), the client side uses the browser-natively-supported [WebSocket Web API](https://developer.mozilla.org/zh-CN/docs/Web/API/WebSockets_API) to connect to the service. Every WebSocket frame is delivered to the **Upstream**. The **Upstream** can be **any** host accepting `POST` request from the service, there is no need for the Upstream to handle WebSocket connections, it only handles bussiness logic.

## Try the live demo

Try the [live chat demo Here](https://wssimpledemo.z13.web.core.windows.net/). This demo is a static webpage hosted in Azure Blob, and it by default points to our demo endpoint. You can change it to your endpoint to try your own demo with your endpoint succussfully setup with below steps.

![Sample run](./server-function-version/images/sample_run.png)

## Setup your demo within 4 steps
* [Node.js and Express version](./server-express-version/Readme.md)
* [Azure Function version](./server-function-version/Readme.md)
