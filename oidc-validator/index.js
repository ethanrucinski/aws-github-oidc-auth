const jwt = require("jsonwebtoken");
const https = require("https");
const wcmatch = require("wildcard-match");
const { STSClient, AssumeRoleCommand } = require("@aws-sdk/client-sts");

const claims = require("./claims.json");

// Download latest JWKS from GitHub token issuer
const downloadJwks = () => {
    return new Promise((resolve, reject) => {
        const req = https.get(
            "https://token.actions.githubusercontent.com/.well-known/jwks",
            (res) => {
                let data = [];
                res.on("data", (d) => {
                    data.push(d);
                });
                res.on("close", () => {
                    resolve(Buffer.concat(data));
                });
                req.on("error", (error) => {
                    console.log("Error retrieving GitHub JWKS " + error);
                    reject(error);
                });
            }
        );
        req.on("error", (error) => {
            console.log("Error loading GitHub JWKS " + error);
            reject(error);
        });
        req.end();
    });
};

const getHeader = (token) => {
    const base64Part = token.split(".")[0];
    const part = Buffer.from(base64Part, "base64");
    return JSON.parse(part.toString());
};

const validateClaims = (claims, decoded) => {
    const results = Object.keys(claims).map((claimKey) => {
        if (!wcmatch(claims[claimKey], false)(decoded[claimKey])) {
            console.log(
                "Claim " + claimKey + "failed for " + decoded[claimKey]
            );
            return false;
        } else {
            return true;
        }
    });
    return !results.includes(false);
};

const handler = async (event, _, callback) => {
    // Get token
    const token = event.token;

    // Grab JWKS
    let jwks;
    try {
        const jwksBuffer = await downloadJwks();
        jwks = JSON.parse(String(jwksBuffer));
    } catch (err) {
        console.log(err);
        callback("GITHUB_JWKS_ERROR");
        return;
    }

    // Get header
    const header = getHeader(token);

    // Use header to pick x5c
    const keys = jwks.keys.filter((key) => key.x5t == header.x5t);
    if (keys.length != 1) {
        console.log("Couldn't find a matching x5t for token");
        console.log(header.x5t);
        callback("INVALID_TOKEN");
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
        callback("INVALID_TOKEN");
        return;
    }

    // Validate claims
    if (!validateClaims(claims, decoded)) {
        console.log("Couldn't validate claims!");
        callback("INVALID_TOKEN");
        return;
    }

    // Assume role and send back token
    const client = new STSClient();
    const command = new AssumeRoleCommand({
        RoleArn: process.env.GITHUB_ACTIONS_ROLE_ARN,
        RoleSessionName: `GITHUB_${decoded.actor}`,
    });
    client
        .send(command)
        .then((response) => {
            callback(null, {
                Credentials: response.Credentials,
                AsumedRoleUser: response.AssumedRoleUser,
            });
        })
        .catch((err) => {
            console.log(err);
            callback({ error: "Couldn't assume role" });
        });
};

module.exports = { handler: handler };
