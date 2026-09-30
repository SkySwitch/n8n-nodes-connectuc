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
import { contactFields, contactOperations } from './descriptions/ContactDescription';
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

const handlers: Record<string, OperationHandler> = {
	'contact.create': createContact,
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
						name: 'User',
						value: 'user',
					},
				],
				default: 'contact',
			},
			...contactOperations,
			...contactFields,
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
