#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { OidcLambdaStack } from '../lib/oidc-lambda-stack';

const app = new cdk.App();
new OidcLambdaStack(app, 'oidc-lambda-stack', {
  env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: "us-east-2" },
});