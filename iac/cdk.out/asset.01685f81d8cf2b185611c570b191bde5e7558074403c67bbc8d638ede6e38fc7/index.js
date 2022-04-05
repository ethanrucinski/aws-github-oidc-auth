const jwt = require("jsonwebtoken");
const jwks = require("./jwks.json");
const claims = require("./claims.json");
const iam = require("@aws-sdk/client-iam");
const wcmatch = require("wildcard-match");

const getHeader = (token) => {
    const base64Part = token.split(".")[0];
    const part = Buffer.from(base64Part, "base64");
    return JSON.parse(part.toString());
};

const validateClaims = (claims, decoded) => {
    const results = Object.keys(claims).forEach((claimKey) => {
        return wcmatch(claims[claimKey])(decoded[claimKey]);
    });
    return !results.includes(false);
};

const handler = (event, _, callback) => {
    // Get token
    const token = event.token;

    // Get header
    const header = getHeader(token);

    // Use header to pick x5c
    const keys = jwks.keys.filter((key) => key.x5t == header.x5t);
    if (keys.length != 1) {
        console.log("Couldn't find a matching x5t for token");
        console.log(header.x5t);
        callback({ error: "INVALID TOKEN" });
        return;
    }

    // Build cert from key
    const cert =
        "-----BEGIN CERTIFICATE-----\n" +
        keys[0].x5c[0] +
        "\n-----END CERTIFICATE-----";

    // decode token with some validations
    let decoded;
    try {
        decoded = jwt.verify(token, cert, {
            issuer: "https://token.actions.githubusercontent.com",
            audience: "sts.amazonaws.com",
        });
    } catch (err) {
        console.log("Couldn't decode token");
        console.log(err);
        callback({ error: "INVALID TOKEN" });
        return;
    }

    console.log(decoded);

    // Validate claims
    if (validateClaims(claims, decoded)) {
        callback(null, { status: "OK" });
        return;
    } else {
        callback({ error: "INVALID TOKEN" });
    }
};

module.exports = { handler: handler };
