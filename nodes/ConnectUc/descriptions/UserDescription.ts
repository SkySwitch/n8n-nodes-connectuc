import type { INodeProperties } from 'n8n-workflow';
import { domainField, userField } from './common';

const showForSetDnd = {
	resource: ['user'],
	operation: ['setDnd'],
};

export const userOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['user'],
			},
		},
		options: [
			{
				name: 'Set Do Not Disturb',
				value: 'setDnd',
				description: 'Enable or disable Do Not Disturb for a user',
				action: 'Set do not disturb for a user',
			},
		],
		default: 'setDnd',
	},
];

export const userFields: INodeProperties[] = [
	domainField(showForSetDnd),
	userField(showForSetDnd),
	{
		displayName: 'Do Not Disturb',
		name: 'dnd',
		type: 'boolean',
		required: true,
		default: false,
		displayOptions: { show: showForSetDnd },
		description: 'Whether Do Not Disturb should be on for the user',
	},
];
