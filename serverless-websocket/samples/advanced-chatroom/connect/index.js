
module.exports = async function (context, req) {
    const client = require('azure-websockets').default(context);
    const accessor = require('azure-storage-table').default(context);
    var event = client.event(req.headers);
    var userName = event.query.name;
    if (!userName) {
        context.res = { status: 401 }
        return;
    }

    var userAccessor = accessor.users;
    await userAccessor.add(userName);

    // get top 20 the users
    var topUsers = await userAccessor.load(20);

    // get chats for top 10 groups
    var userGroupAccessor = accessor.usergroups;
    var topGroupChats = await userGroupAccessor.load(userName, 10);

    // return back the subprotocol and the user authed
    context.res = {
        headers: {
            'sec-websocket-protocol': 'protocol1',
            'x-asrs-user-id': userName // set back the user
        },
        body: {
            type: 'connected',
            users: topUsers,
            user: userName,
            groups: topGroupChats,
            connection: event.connectionId,
        }
    };

    await client.broadcast(JSON.stringify({
        type: 'sync',
        event: 'addUser',
        user: userName,
        conn: event.connectionId,
    }));
};