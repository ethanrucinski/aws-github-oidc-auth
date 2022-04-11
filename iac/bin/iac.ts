#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import {
    GlobalRolesStack,
    GlobalRolesStackProps,
} from "../lib/global-roles-stack";
import { OidcLambdaStack } from "../lib/oidc-lambda-stack";

const app = new cdk.App();

// Get region and account
const region = process.env.CDK_DEFAULT_REGION;
const account = process.env.CDK_DEFAULT_ACCOUNT;

// Global constants
const githubOidcRoleName = "github-oidc-role";
const githubActionsRoleName = "github-actions-role";
const githubOidcRoleTrustConditions = {
    StringLike: {
        "token.actions.githubusercontent.com:sub": "repo:ethanrucinski/*",
    },
};

// Create roles in us-east-2
if (region == "us-east-2") {
    new GlobalRolesStack(app, "global-github-roles-stack", {
        env: { account: account, region: region },
        githubOidcRoleName: githubOidcRoleName,
        githubActionsRoleName: githubActionsRoleName,
        githubOidcRoleTrustConditions: githubOidcRoleTrustConditions,
    });
}

new OidcLambdaStack(app, "oidc-lambda-stack", {
    env: { account: account, region: region },
    githubOidcRoleName: githubOidcRoleName,
    githubActionsRoleName: githubActionsRoleName,
});
