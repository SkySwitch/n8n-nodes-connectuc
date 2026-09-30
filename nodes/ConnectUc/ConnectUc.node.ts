import {
	NodeApiError,
	NodeConnectionTypes,
	NodeOperationError,
	type IDataObject,
	type IExecuteFunctions,
	type INodeExecutionData,
	type INodeType,
	type INodeTypeDescription,
} from 'n8n-workflow';
import { randomUUID } from 'crypto';
import { contactFields, contactOperations } from './descriptions/ContactDescription';
import { smsFields, smsOperations } from './descriptions/SmsDescription';
import { userFields, userOperations } from './descriptions/UserDescription';
import { connectucApiRequest, loadOptions } from './GenericFunctions';

type OperationHandler = (this: IExecuteFunctions, itemIndex: number) => Promise<IDataObject>;

async function setDnd(this: IExecuteFunctions, i: number): Promise<IDataObject> {
	const user = this.getNodeParameter('user', i) as string;
	const dnd = this.getNodeParameter('dnd', i) as boolean;

	const response = (await connectucApiRequest.call(
		this,
		'POST',
		`/users/${encodeURIComponent(user)}/dnd/update`,
		{ dnd },
	)) as IDataObject;

	return { user, dnd, ...response };
}

async function createContact(this: IExecuteFunctions, i: number): Promise<IDataObject> {
	const user = this.getNodeParameter('user', i) as string;
	const phones = this.getNodeParameter('phones', i, {}) as {
		phone?: Array<{ number: string; type: string }>;
	};
	const additionalFields = this.getNodeParameter('additionalFields', i, {}) as {
		company?: string;
		email?: string;
		emailType?: string;
		middleName?: string;
		tags?: string;
		title?: string;
	};

	const body: IDataObject = {
		first_name: this.getNodeParameter('firstName', i) as string,
		last_name: this.getNodeParameter('lastName', i) as string,
		tels: (phones.phone ?? []).map(({ number, type }) => ({ number: String(number), type })),
		emails: additionalFields.email
			? [{ value: additionalFields.email, type: additionalFields.emailType ?? 'work' }]
			: [],
		tags: (additionalFields.tags ?? '')
			.split(',')
			.map((tag) => tag.trim())
			.filter((tag) => tag !== '')
			.map((name) => ({ name })),
	};

	if (additionalFields.company) body.company = additionalFields.company;
	if (additionalFields.middleName) body.middle_name = additionalFields.middleName;
	if (additionalFields.title) body.title = additionalFields.title;

	return (await connectucApiRequest.call(
		this,
		'POST',
		`/users/${encodeURIComponent(user)}/contacts`,
		body,
	)) as IDataObject;
}

// message-hub accepts only 11-digit NANP numbers starting with 1 (no "+" or formatting)
function normalizeRecipient(this: IExecuteFunctions, raw: string, i: number): string {
	const digits = raw.replace(/\D/g, '');
	const number = digits.length === 10 ? `1${digits}` : digits;

	if (!/^1\d{10}$/.test(number)) {
		throw new NodeOperationError(this.getNode(), `Invalid recipient "${raw.trim()}"`, {
			itemIndex: i,
			description: 'Use a 10-digit US number, or 11 digits starting with 1',
		});
	}

	return number;
}

async function sendSms(this: IExecuteFunctions, i: number): Promise<IDataObject> {
	const recipients = (this.getNodeParameter('recipients', i) as string)
		.split(',')
		.filter((recipient) => recipient.trim() !== '')
		.map((recipient) => normalizeRecipient.call(this, recipient, i));
	const media = this.getNodeParameter('media', i, {}) as {
		item?: Array<{ url: string; type?: string }>;
	};

	const body: IDataObject = {
		application: 'connectuc',
		content: this.getNodeParameter('content', i) as string,
		recipients,
		// message-hub iterates media unconditionally, so always send an array
		media: (media.item ?? []).map(({ url, type }) => (type ? { url, type } : { url })),
		referenceId: randomUUID(),
	};

	const sender = this.getNodeParameter('sender', i, '') as string;
	if (sender) body.sender = sender;

	return (await connectucApiRequest.call(this, 'POST', '/sms/messages', body)) as IDataObject;
}

const handlers: Record<string, OperationHandler> = {
	'contact.create': createContact,
	'sms.send': sendSms,
	'user.setDnd': setDnd,
};

// Programmatic rather than declarative: Find/Update CDR need a /oauth2/userinfo
// lookup before the main request, and the helper + dropdowns are shared with
// the trigger node, whose webhook lifecycle declarative style can't express.
export class ConnectUc implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'ConnectUC',
		name: 'connectUc',
		icon: { light: 'file:connectuc.svg', dark: 'file:connectuc.dark.svg' },
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Interact with the ConnectUC API',
		defaults: {
			name: 'ConnectUC',
		},
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [{ name: 'connectUcOAuth2Api', required: true }],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Contact',
						value: 'contact',
					},
					{
						name: 'SMS',
						value: 'sms',
					},
					{
						name: 'User',
						value: 'user',
					},
				],
				default: 'contact',
			},
			...contactOperations,
			...contactFields,
			...smsOperations,
			...smsFields,
			...userOperations,
			...userFields,
		],
	};

	methods = { loadOptions };

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (let i = 0; i < items.length; i++) {
			try {
				const resource = this.getNodeParameter('resource', i) as string;
				const operation = this.getNodeParameter('operation', i) as string;
				const handler = handlers[`${resource}.${operation}`];

				if (!handler) {
					throw new NodeOperationError(
						this.getNode(),
						`The operation "${operation}" is not supported for resource "${resource}"`,
						{ itemIndex: i },
					);
				}

				const responseData = await handler.call(this, i);

				returnData.push({ json: responseData, pairedItem: { item: i } });
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						json: { error: (error as Error).message },
						pairedItem: { item: i },
					});
					continue;
				}

				// API failures arrive as NodeApiError (with the API's message) from
				// connectucApiRequest; wrap anything else so it keeps the item context.
				throw error instanceof NodeApiError || error instanceof NodeOperationError
					? error
					: new NodeOperationError(this.getNode(), error as Error, { itemIndex: i });
			}
		}

		return [returnData];
	}
}
