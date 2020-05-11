module.exports = async function (context, req) {
    const connString = process.env["AzureSignalRConnectionString"];
    const client = require('azure-websockets').client(connString, null, context);

    var event = client.event(req.headers);
    if (event.isConnectEvent) {
        // get user from client query
        var user = event.query.user;
        if (!user) context.res = { status: 401 };
        else {
            context.log(`User ${user}(${event.connectionId}) connected, auth the user.`);
            context.res = {
                status: 200,
                headers: {
                    "x-asrs-user-id": user
                }
            };
        }
    } else if (event.isDisconnectEvent) {
        context.log(`User ${event.userId}(${event.connectionId}) disconnected.`);
        context.res = { status: 200 };
    } else if (event.isMessageEvent) {
        context.log(`User ${event.userId}(${event.connectionId}) sending message.`);
        await client.broadcast(req.body);
        context.res = { status: 200 };
    } else {
        context.res = { status: 400 };
    }
}