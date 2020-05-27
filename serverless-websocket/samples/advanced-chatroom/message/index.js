module.exports = async function (context, req) {

    function response(code, message) {
        const type = code >= 400 ? 'error' : 'log';
        context.res = {
            status: code,
            body: {
                type: type,
                code: code,
                text: message
            }
        }
    }

    const client = require('azure-websockets').default(context);
    var event = client.event(req.headers);
    const user = event.userId;
    if (!user || !req.body) {
        response(401);
        return;
    }

    const connectionId = event.connectionId;
    const tableAccessor = require('azure-storage-table').default(context);
    const userAccessor = tableAccessor.user(event.userId);
    const date = new Date().toISOString();

    var message = req.body;

    // load history
    if (message.action === 'load') {
        var accessor = message.group ? tableAccessor.group(message.group) :
            (message.recipient ? userAccessor : tableAccessor.public);
        var content = await accessor.load();
        context.res = await client.sendToConnection(connectionId, content);
        return;
    }

    // otherwise it is message sending
    if (message.group) {
        var userGroupAccessor = tableAccessor.usergroups;
        const recipient = message.recipient || event.userId;
        if (message.action === 'add') {
            await userGroupAccessor.add(message.group, recipient);
            context.res = await client.addToGroup(message.group, recipient);
        } else if (message.action === 'remove') {
            await userGroupAccessor.remove(message.group, recipient);
            context.res = await client.removeFromGroup(message.group, recipient);
        } else {
            var content = JSON.stringify({
                group: message.group,
                from: user,
                fromId: connectionId,
                date: date,
                text: message.text
            });
            await tableAccessor.group(message.group).addChat(content);
            context.res = await client.sendToGroup(message.group, content);
        }
        return;
    } else if (message.recipient) {
        var content = JSON.stringify({
            to: message.recipient,
            from: user,
            fromId: connectionId,
            date: date,
            text: message.text
        });
        await userAccessor.addChat(message.recipient, content);
        context.res = await client.sendToUser(message.recipient, content);
    }
    else {
        // broadcast
        var content = JSON.stringify({
            from: user,
            fromId: connectionId,
            date: date,
            text: message.text
        });
        await tableAccessor.public.addChat(content);
        context.res = await client.broadcast(content);
    }
};