const handler = (event, _, callback) => {
    console.log(event);

    callback("NOT_IMPLEMENTED");
};

module.exports = { handler: handler };
