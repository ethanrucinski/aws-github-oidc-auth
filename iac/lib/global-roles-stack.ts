import { Stack, StackProps } from "aws-cdk-lib";
import { aws_iam as iam } from "aws-cdk-lib";
import { Construct } from "constructs";

export interface GlobalRolesStackProps extends StackProps {
    githubOidcRoleName: string;
    githubOidcRoleTrustConditions: iam.Conditions;
    githubActionsRoleName: string;
}

export class GlobalRolesStack extends Stack {
    public readonly githubOidcRole: iam.Role;
    public readonly githubActionsRole: iam.Role;

    constructor(scope: Construct, id: string, props: GlobalRolesStackProps) {
        super(scope, id, props);

        // Create github oidc role
        const oidcProvider =
            iam.OpenIdConnectProvider.fromOpenIdConnectProviderArn(
                this,
                "GitHubOidcProvider",
                "arn:aws:iam::403707884266:oidc-provider/token.actions.githubusercontent.com"
            );

        this.githubOidcRole = new iam.Role(this, "GitHubOidcRole", {
            roleName: props.githubOidcRoleName,
            assumedBy: new iam.OpenIdConnectPrincipal(oidcProvider, props.githubOidcRoleTrustConditions),
        });

        // Create github actions role
        this.githubActionsRole = new iam.Role(this, "GitHubActionsRole", {
            roleName: props.githubActionsRoleName,
            assumedBy: new iam.ServicePrincipal("lambda.amazonaws.com"),
        });
    }
}
