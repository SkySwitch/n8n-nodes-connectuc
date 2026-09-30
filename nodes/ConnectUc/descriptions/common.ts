import type { IDisplayOptions, INodeProperties } from 'n8n-workflow';

// Domain only drives the User dropdown; the API routes are keyed by user UUID.
export function domainField(show: IDisplayOptions['show']): INodeProperties {
	return {
		displayName: 'Domain Name or ID',
		name: 'domain',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getDomains',
		},
		required: true,
		default: '',
		displayOptions: { show },
		description:
			'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
	};
}

export function userField(show: IDisplayOptions['show']): INodeProperties {
	return {
		displayName: 'User Name or ID',
		name: 'user',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getSubscribers',
			loadOptionsDependsOn: ['domain'],
		},
		required: true,
		default: '',
		displayOptions: { show },
		description:
			'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
	};
}
