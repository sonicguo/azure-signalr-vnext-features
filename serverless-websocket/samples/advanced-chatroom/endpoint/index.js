module.exports = async function (context, req) {
    const client = require('azure-websockets').default(context);
    context.res = {
        // status: 200, /* Defaults to 200 */
        body: {
            endpoint: client.getEndpoint(req.query.name),
        }
    };
};