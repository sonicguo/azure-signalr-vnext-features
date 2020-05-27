module.exports = async function (context, req) {
    const client = require('azure-websockets').default(context);
    var event = client.event(req.headers);
    if (!event.userId) {
        context.res = { status: 401 }
        return;
    }

    var log = event.userId + "(" + event.connectionId + ") disconnected";
    context.log(log);

    // trigger a user/group online check?
    const accessor = require('azure-storage-table').default(context);
    
    var userAccessor = accessor.users;
    // get top 50 the users
    var topUsers = await userAccessor.load(50);
    topUsers.forEach(async user => {
        var exists = await client.userExists(user);
        if (!exists){
            // etag to guarantee atomic?
            await userAccessor.remove(user);
        }
    });
    
    context.res = await client.broadcast(JSON.stringify({
        type: 'log',
        text: log,
    }));
};