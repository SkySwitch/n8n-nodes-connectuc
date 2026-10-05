import type { INodeProperties } from 'n8n-workflow';
import { domainField, userField } from './common';

const showForCreate = {
	resource: ['contact'],
	operation: ['create'],
};

export const contactOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['contact'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: "Create a contact in a user's address book",
				action: 'Create a contact',
			},
		],
		default: 'create',
	},
];

export const contactFields: INodeProperties[] = [
	domainField(showForCreate),
	userField(showForCreate),
	{
		displayName: 'First Name',
		name: 'firstName',
		type: 'string',
		required: true,
		default: '',
		displayOptions: { show: showForCreate },
		description: 'Only letters, digits, spaces, hyphens, apostrophes, and periods are allowed',
	},
	{
		displayName: 'Last Name',
		name: 'lastName',
		type: 'string',
		required: true,
		default: '',
		displayOptions: { show: showForCreate },
		description: 'Only letters, digits, spaces, hyphens, apostrophes, and periods are allowed',
	},
	{
		displayName: 'Phones',
		name: 'phones',
		type: 'fixedCollection',
		placeholder: 'Add Phone',
		typeOptions: {
			multipleValues: true,
		},
		default: {},
		displayOptions: { show: showForCreate },
		options: [
			{
				displayName: 'Phone',
				name: 'phone',
				values: [
					{
						displayName: 'Number',
						name: 'number',
						type: 'string',
						required: true,
						default: '',
						placeholder: '+15615551234',
					},
					{
						displayName: 'Type',
						name: 'type',
						type: 'options',
						options: [
							{ name: 'Fax', value: 'fax' },
							{ name: 'Home', value: 'home' },
							{ name: 'Mobile', value: 'mobile' },
							{ name: 'Other', value: 'other' },
							{ name: 'SMS', value: 'sms' },
							{ name: 'Work', value: 'work' },
						],
						default: 'work',
					},
				],
			},
		],
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: { show: showForCreate },
		options: [
			{
				displayName: 'Company',
				name: 'company',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Email',
				name: 'email',
				type: 'string',
				placeholder: 'name@email.com',
				default: '',
			},
			{
				displayName: 'Email Type',
				name: 'emailType',
				type: 'options',
				options: [
					{ name: 'Home', value: 'home' },
					{ name: 'Other', value: 'other' },
					{ name: 'Work', value: 'work' },
				],
				default: 'work',
			},
			{
				displayName: 'Middle Name',
				name: 'middleName',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Tags',
				name: 'tags',
				type: 'string',
				default: '',
				description: 'Comma-separated list of tags',
			},
			{
				displayName: 'Title',
				name: 'title',
				type: 'string',
				default: '',
				description: 'Job title',
			},
		],
	},
];
