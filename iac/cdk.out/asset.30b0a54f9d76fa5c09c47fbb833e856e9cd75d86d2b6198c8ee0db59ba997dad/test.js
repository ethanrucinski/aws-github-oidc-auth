const decoded = {
    jti: "250be261-3591-454d-bce2-dd653cdd3f21",
    sub: "repo:ethanrucinski/test_gha:ref:refs/heads/main",
    aud: "sts.amazonaws.com",
    ref: "refs/heads/main",
    sha: "e49f96ab65c4ed06bf53cd11e2e14adb1149c37e",
    repository: "ethanrucinski/test_gha",
    repository_owner: "ethanrucinski",
    repository_owner_id: "20402573",
    run_id: "2087210276",
    run_number: "24",
    run_attempt: "7",
    repository_id: "476915173",
    actor_id: "20402573",
    actor: "ethanrucinski",
    workflow: "Test GHA",
    head_ref: "",
    base_ref: "",
    event_name: "push",
    ref_type: "branch",
    job_workflow_ref:
        "ethanrucinski/test_gha/.github/workflows/test_gha.yaml@refs/heads/main",
    iss: "https://token.actions.githubusercontent.com",
    nbf: 1649127181,
    exp: 1649128081,
    iat: 1649127781,
};

const wcmatch = require("wildcard-match");

const claims = require("./claims.json");

const results = Object.keys(claims).map((claimKey) => {
    if (!wcmatch(claims[claimKey],false)(decoded[claimKey])) {
        console.log("Claim " + claimKey + "failed for " + decoded[claimKey]);
        return false;
    } else {
        return true;
    }
});

console.log(results);
