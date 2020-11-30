# Introduction
This repo contains the specs and samples for the vnext features of Azure SignalR Service.

Please contact us if you are interested in trying this vnext feature!

## VNEXT Features

* [Serverless WebSocket](./serverless-websocket)
    
    Azure SignalR is able to accept direct WebSocket connection and forward every message frame to the Serverless Upstream target.
    * Azure SignalR to maintain your connections
    * Your Upstream to handle the business logic.
    * Manipulate your connections through Azure SignalR.
    
    Check the [specs here](./serverless-websocket/specs/runtime-websocket-serverless.md).

    Demos:
    * [4 steps creating a chat](./serverless-websocket/samples/simple-chat/Readme.md) in either Azure Function way or Express way.
        * 🔥 [Live Demo](https://wssimpledemo.z13.web.core.windows.net/)
    * [A fully-functional server-less chatroom with group, user and history](./serverless-websocket/samples/advanced-chatroom/Readme.md) with Azure Function and Azure Storage.
        * 🔥 [Live Demo](https://serverless-ws-chat-demo.azurewebsites.net/?code=LJ0EgrwWYSkm5MXGAe2AvPKVRGTaYpqQ/pxzJaFpVvyCY4j53s055Q==) 
    * [A real-time whiteboard](https://github.com/chenkennt/Whiteboard#websocket-version)
        * 🔥 [Live Demo](https://ws-whiteboard.azurewebsites.net/)

# Contributing

This project welcomes contributions and suggestions.  Most contributions require you to agree to a
Contributor License Agreement (CLA) declaring that you have the right to, and actually do, grant us
the rights to use your contribution. For details, visit https://cla.opensource.microsoft.com.

When you submit a pull request, a CLA bot will automatically determine whether you need to provide
a CLA and decorate the PR appropriately (e.g., status check, comment). Simply follow the instructions
provided by the bot. You will only need to do this once across all repos using our CLA.

This project has adopted the [Microsoft Open Source Code of Conduct](https://opensource.microsoft.com/codeofconduct/).
For more information see the [Code of Conduct FAQ](https://opensource.microsoft.com/codeofconduct/faq/) or
contact [opencode@microsoft.com](mailto:opencode@microsoft.com) with any additional questions or comments.

# Legal Notices

Microsoft and any contributors grant you a license to the Microsoft documentation and other content
in this repository under the [Creative Commons Attribution 4.0 International Public License](https://creativecommons.org/licenses/by/4.0/legalcode),
see the [LICENSE](LICENSE) file, and grant you a license to any code in the repository under the [MIT License](https://opensource.org/licenses/MIT), see the
[LICENSE-CODE](LICENSE-CODE) file.

Microsoft, Windows, Microsoft Azure and/or other Microsoft products and services referenced in the documentation
may be either trademarks or registered trademarks of Microsoft in the United States and/or other countries.
The licenses for this project do not grant you rights to use any Microsoft names, logos, or trademarks.
Microsoft's general trademark guidelines can be found at http://go.microsoft.com/fwlink/?LinkID=254653.

Privacy information can be found at https://privacy.microsoft.com/en-us/

Microsoft and any contributors reserve all other rights, whether under their respective copyrights, patents,
or trademarks, whether by implication, estoppel or otherwise.
