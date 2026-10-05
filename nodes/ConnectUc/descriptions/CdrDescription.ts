import type { INodeProperties } from 'n8n-workflow';

const showForFind = {
	resource: ['cdr'],
	operation: ['find'],
};

const showForUpdate = {
	resource: ['cdr'],
	operation: ['update'],
};

export const cdrOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['cdr'],
			},
		},
		options: [
			{
				name: 'Find',
				value: 'find',
				description: 'Find a call detail record by call ID',
				action: 'Find a CDR',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Add a note, disposition, or reason to a call detail record',
				action: 'Update a CDR',
			},
		],
		default: 'find',
	},
];

export const cdrFields: INodeProperties[] = [
	{
		displayName: 'Call ID',
		name: 'callId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: { show: showForFind },
		description: 'Originating or terminating call ID, e.g. orig_callid from a ConnectUC trigger',
		hint: 'A CDR can take a short while to appear after the call ends',
	},
	{
		displayName: 'CDR ID',
		name: 'cdrId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: { show: showForUpdate },
		description: 'The ID field returned by the Find operation',
	},
	{
		displayName: 'Note',
		name: 'note',
		type: 'string',
		typeOptions: {
			rows: 4,
		},
		required: true,
		default: '',
		displayOptions: { show: showForUpdate },
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: { show: showForUpdate },
		options: [
			{
				displayName: 'Disposition',
				name: 'disposition',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Reason',
				name: 'reason',
				type: 'string',
				default: '',
			},
		],
	},
];
