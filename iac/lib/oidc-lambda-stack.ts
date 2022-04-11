import { Stack, StackProps } from "aws-cdk-lib";
import { aws_lambda as lambda } from "aws-cdk-lib";
import { aws_iam as iam } from "aws-cdk-lib";
import { Construct } from "constructs";

export interface OidcLambdaStackProps extends StackProps {
    githubOidcRoleName: string;
    lambdaFunctionRoleName: string;
    githubActionsRoleName: string;
}

export class OidcLambdaStack extends Stack {
    public readonly oidcValidatorFunction: lambda.Function;

    constructor(scope: Construct, id: string, props: OidcLambdaStackProps) {
        super(scope, id, props);

        const lambdaFunctionRole = iam.Role.fromRoleName(
            this,
            "LambdaFunctionRole",
            props.lambdaFunctionRoleName
        );

        // Create lambda funciton
        this.oidcValidatorFunction = new lambda.Function(
            this,
            "OidcValidatorFunction",
            {
                role: lambdaFunctionRole,
                functionName: "github-oidc-auth",
                code: lambda.Code.fromAsset(
                    __dirname + "/../../oidc-validator",
                    {
                        bundling: {
                            image: lambda.Runtime.NODEJS_14_X.bundlingImage,
                            user: "root",
                            command: [
                                "bash",
                                "-c",
                                "npm install && cp -au . /asset-output",
                            ],
                        },
                    }
                ),
                handler: "index.handler",
                runtime: lambda.Runtime.NODEJS_14_X,
            }
        );

        // Get github roles
        const githubOidcRole = iam.Role.fromRoleName(
            this,
            "GithubOidcRole",
            props.githubOidcRoleName
        );
        const githubActionsRole = iam.Role.fromRoleName(
            this,
            "GithubActionsRole",
            props.githubActionsRoleName
        );

        //this.oidcValidatorFunction.grantInvoke(githubOidcRole);
        this.oidcValidatorFunction.addEnvironment(
            "GITHUB_ACTIONS_ROLE_ARN",
            githubActionsRole.roleArn
        );

        new iam.Policy(this, `GithubOidcRolePolicy${this.region}`, {
            statements: [
                new iam.PolicyStatement({
                    actions: ["lambda:InvokeFunction"],
                    effect: iam.Effect.ALLOW,
                    resources: [this.oidcValidatorFunction.functionArn],
                }),
            ],
            roles: [githubOidcRole],
        });
    }
}
