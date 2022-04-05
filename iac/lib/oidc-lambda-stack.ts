import { Stack, StackProps } from "aws-cdk-lib";
import { aws_lambda as lambda } from "aws-cdk-lib";
import { aws_iam as iam } from "aws-cdk-lib";
import { Construct } from "constructs";

export class OidcLambdaStack extends Stack {
    public readonly githubOidcRole: iam.Role;
    public readonly oidcValidatorFunction: lambda.Function;
    public readonly githubActionsRole: iam.Role;

    constructor(scope: Construct, id: string, props?: StackProps) {
        super(scope, id, props);

        // Create github oidc role
        const oidcProvider =
            iam.OpenIdConnectProvider.fromOpenIdConnectProviderArn(
                this,
                "GitHubOidcProvider",
                "arn:aws:iam::403707884266:oidc-provider/token.actions.githubusercontent.com"
            );

        this.githubOidcRole = new iam.Role(this, "GitHubOidcRole", {
            roleName: "github-oidc-role",
            assumedBy: new iam.OpenIdConnectPrincipal(oidcProvider, {
                StringLike: {
                    "token.actions.githubusercontent.com:sub":
                        "repo:ethanrucinski/*",
                },
            }),
        });

        // Create lambda funciton
        this.oidcValidatorFunction = new lambda.Function(
            this,
            "OidcValidatorFunction",
            {
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

        // Create github actions role
        this.githubActionsRole = new iam.Role(this, "GitHubActionsRole", {
            roleName: "github-actions-role",
            assumedBy: this.oidcValidatorFunction.grantPrincipal,
        });

        this.oidcValidatorFunction.grantInvoke(this.githubOidcRole);
        this.oidcValidatorFunction.addEnvironment(
            "GITHUB_ACTIONS_ROLE_ARN",
            this.githubActionsRole.roleArn
        );

        this.oidcValidatorFunction.addToRolePolicy(
            new iam.PolicyStatement({
                effect: iam.Effect.ALLOW,
                actions: ["sts:assumeRole"],
                resources: [this.githubActionsRole.roleArn],
            })
        );
    }
}
