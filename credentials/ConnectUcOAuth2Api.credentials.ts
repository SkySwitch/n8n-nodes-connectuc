import type { Icon, ICredentialType, INodeProperties } from 'n8n-workflow';

export class ConnectUcOAuth2Api implements ICredentialType {
	name = 'connectUcOAuth2Api';

	extends = ['oAuth2Api'];

	displayName = 'ConnectUC OAuth2 API';

	icon: Icon = {
		light: 'file:../nodes/ConnectUc/connectuc.svg',
		dark: 'file:../nodes/ConnectUc/connectuc.dark.svg',
	};

	// Link to your community node's README
	documentationUrl = 'https://github.com/SkySwitch/n8n-nodes-connectuc?tab=readme-ov-file#credentials';

	properties: INodeProperties[] = [
		{
			displayName: 'Base URL',
			name: 'baseUrl',
			type: 'string',
			default: 'https://api.connectuc.io',
			description: 'ConnectUC API base URL. Change only for staging or local development.',
		},
		{
			displayName: 'Grant Type',
			name: 'grantType',
			type: 'hidden',
			default: 'authorizationCode',
		},
		{
			displayName: 'Authorization URL',
			name: 'authUrl',
			type: 'hidden',
			default: 'https://auth.uc-technologies.com/oauth2/authorize',
		},
		{
			displayName: 'Access Token URL',
			name: 'accessTokenUrl',
			type: 'hidden',
			default: 'https://auth.uc-technologies.com/oauth2/token',
		},
		{
			displayName: 'Auth URI Query Parameters',
			name: 'authQueryParameters',
			type: 'hidden',
			default: '',
		},
		{
			displayName: 'Scope',
			name: 'scope',
			type: 'hidden',
			default: 'offline_access',
		},
		{
			displayName: 'Authentication',
			name: 'authentication',
			type: 'hidden',
			default: 'body',
		},
	];
}
