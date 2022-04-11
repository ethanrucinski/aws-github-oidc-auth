import { Stack, StackProps } from "aws-cdk-lib";
import { aws_iam as iam } from "aws-cdk-lib";
import { Construct } from "constructs";

export interface GlobalRolesStackProps extends StackProps {
    githubOidcRoleName: string;
    githubOidcRoleTrustConditions: iam.Conditions;
    lambdaFunctionRole: string;
    githubActionsRoleName: string;
}

export class GlobalRolesStack extends Stack {
    public readonly githubOidcRole: iam.Role;
    public readonly githubActionsRole: iam.Role;
    public readonly lambdaFunctionRole: iam.Role;

    constructor(scope: Construct, id: string, props: GlobalRolesStackProps) {
        super(scope, id, props);

        // Create github oidc role
        const oidcProvider =
            iam.OpenIdConnectProvider.fromOpenIdConnectProviderArn(
                this,
                "GitHubOidcProvider",
                `arn:aws:iam::${this.account}:oidc-provider/token.actions.githubusercontent.com`
            );

        this.githubOidcRole = new iam.Role(this, "GitHubOidcRole", {
            roleName: props.githubOidcRoleName,
            assumedBy: new iam.OpenIdConnectPrincipal(
                oidcProvider,
                props.githubOidcRoleTrustConditions
            ),
        });

        // Create lambda function role
        this.lambdaFunctionRole = new iam.Role(this, "LambdaFunctionRole", {
            roleName: props.lambdaFunctionRole,
            assumedBy: new iam.ServicePrincipal("lambda.amazonaws.com"),
        });

        // Create github actions role
        this.githubActionsRole = new iam.Role(this, "GitHubActionsRole", {
            roleName: props.githubActionsRoleName,
            assumedBy: new iam.ArnPrincipal(this.lambdaFunctionRole.roleArn),
        });

        // Allow sts:assumeRole on GHA role
        this.lambdaFunctionRole.addToPolicy(
            new iam.PolicyStatement({
                effect: iam.Effect.ALLOW,
                actions: ["sts:assumeRole"],
                resources: [this.githubActionsRole.roleArn],
            })
        );
        this.lambdaFunctionRole.addManagedPolicy(
            iam.ManagedPolicy.fromManagedPolicyArn(
                this,
                "AWSLambdaBasicExecutionRolePolicy",
                "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
            )
        );
    }
}
