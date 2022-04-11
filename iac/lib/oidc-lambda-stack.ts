import { Stack, StackProps } from "aws-cdk-lib";
import { aws_lambda as lambda } from "aws-cdk-lib";
import { aws_iam as iam } from "aws-cdk-lib";
import { Construct } from "constructs";

export interface OidcLambdaStackProps extends StackProps {
    githubOidcRoleName: string;
    githubActionsRoleName: string;
}

export class OidcLambdaStack extends Stack {
    public readonly oidcValidatorFunction: lambda.Function;

    constructor(scope: Construct, id: string, props: OidcLambdaStackProps) {
        super(scope, id, props);

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

        // Get github roles
        const githubOidcRole = iam.Role.fromRoleName(this, "GithubOidcRole", props.githubOidcRoleName);
        const githubActionsRole = iam.Role.fromRoleName(this, "GithubActionsRole", props.githubActionsRoleName);
        

        this.oidcValidatorFunction.grantInvoke(githubOidcRole);
        this.oidcValidatorFunction.addEnvironment(
            "GITHUB_ACTIONS_ROLE_ARN",
            githubActionsRole.roleArn
        );

        this.oidcValidatorFunction.addToRolePolicy(
            new iam.PolicyStatement({
                effect: iam.Effect.ALLOW,
                actions: ["sts:assumeRole"],
                resources: [githubActionsRole.roleArn],
            })
        );
    }
}
