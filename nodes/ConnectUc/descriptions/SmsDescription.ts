import type { INodeProperties } from 'n8n-workflow';

const showForSend = {
	resource: ['sms'],
	operation: ['send'],
};

export const smsOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['sms'],
			},
		},
		options: [
			{
				name: 'Send',
				value: 'send',
				description: 'Send an SMS or MMS message',
				action: 'Send an SMS',
			},
		],
		default: 'send',
	},
];

export const smsFields: INodeProperties[] = [
	{
		displayName: 'Recipients',
		name: 'recipients',
		type: 'string',
		required: true,
		default: '',
		placeholder: '15615551234, 15615555678',
		displayOptions: { show: showForSend },
		description:
			'Comma-separated US phone numbers. Several recipients create one group conversation, not separate messages.',
	},
	{
		displayName: 'Message',
		name: 'content',
		type: 'string',
		typeOptions: {
			rows: 4,
		},
		required: true,
		default: '',
		displayOptions: { show: showForSend },
	},
	{
		displayName: 'Sender Name or ID',
		name: 'sender',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getSmsNumbers',
		},
		default: '',
		displayOptions: { show: showForSend },
		description:
			'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
		hint: "Leave empty to send from the user's default SMS number",
	},
	{
		displayName: 'Media',
		name: 'media',
		type: 'fixedCollection',
		placeholder: 'Add Media',
		typeOptions: {
			multipleValues: true,
		},
		default: {},
		displayOptions: { show: showForSend },
		description: 'Publicly reachable files to attach, which makes the message an MMS',
		options: [
			{
				displayName: 'Media',
				name: 'item',
				values: [
					{
						displayName: 'URL',
						name: 'url',
						type: 'string',
						required: true,
						default: '',
						placeholder: 'https://example.com/image.png',
					},
					{
						displayName: 'MIME Type',
						name: 'type',
						type: 'string',
						default: '',
						placeholder: 'image/png',
					},
				],
			},
		],
	},
];
