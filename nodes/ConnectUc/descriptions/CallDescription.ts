import type { INodeProperties } from 'n8n-workflow';
import { domainField, userField } from './common';

const showForInitiate = {
	resource: ['call'],
	operation: ['initiate'],
};

export const callOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['call'],
			},
		},
		options: [
			{
				name: 'Initiate',
				value: 'initiate',
				description: "Start a click-to-call from one of a user's devices",
				action: 'Initiate a call',
			},
		],
		default: 'initiate',
	},
];

export const callFields: INodeProperties[] = [
	domainField(showForInitiate),
	userField(showForInitiate),
	{
		displayName: 'Device Name or ID',
		name: 'device',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getDevices',
			loadOptionsDependsOn: ['user'],
		},
		required: true,
		default: '',
		displayOptions: { show: showForInitiate },
		description:
			'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
		hint: 'Only devices that are registered right now are listed',
	},
	{
		displayName: 'To Number',
		name: 'toNumber',
		type: 'string',
		required: true,
		default: '',
		placeholder: '15615551234',
		displayOptions: { show: showForInitiate },
		description: 'Number or extension to call',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: { show: showForInitiate },
		options: [
			{
				displayName: 'Caller ID',
				name: 'callerId',
				type: 'string',
				default: '',
				description: 'Caller ID to present to the destination instead of the default',
			},
		],
	},
];
