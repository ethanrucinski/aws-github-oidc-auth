#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { GlobalRolesStack } from "../lib/global-roles-stack";
import { OidcLambdaStack } from "../lib/oidc-lambda-stack";

const app = new cdk.App();

// Get region and account
//const region = process.env.CDK_DEFAULT_REGION;
const account = process.env.CDK_DEFAULT_ACCOUNT;

// Global constants
const githubOidcRoleName = "github-oidc-role";
const lambdaFunctionRoleName = "github-oidc-lambda-function-role";
const githubActionsRoleName = "github-actions-role";
const githubOidcRoleTrustConditions = {
    StringLike: {
        "token.actions.githubusercontent.com:sub": "repo:ethanrucinski/*",
    },
};

// Create roles in us-east-2
new GlobalRolesStack(app, "global-github-roles-stack", {
    env: { account: account, region: "us-east-2" },
    githubOidcRoleName: githubOidcRoleName,
    lambdaFunctionRole: lambdaFunctionRoleName,
    githubActionsRoleName: githubActionsRoleName,
    githubOidcRoleTrustConditions: githubOidcRoleTrustConditions,
});

// Create lambda function in multiple regions
const lambdaStackRegions = ["us-east-1", "us-east-2", "us-west-2"];
lambdaStackRegions.forEach((region) => {
    new OidcLambdaStack(app, `oidc-lambda-stack-${region}`, {
        env: { account: account, region: region },
        githubOidcRoleName: githubOidcRoleName,
        lambdaFunctionRoleName: lambdaFunctionRoleName,
        githubActionsRoleName: githubActionsRoleName,
    });
});
