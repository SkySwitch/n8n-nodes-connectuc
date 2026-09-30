import {
	NodeConnectionTypes,
	type IExecuteFunctions,
	type INodeExecutionData,
	type INodeType,
	type INodeTypeDescription,
} from 'n8n-workflow';
import { loadOptions } from './GenericFunctions';

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
		subtitle: '={{$parameter["domain"]}}',
		description: 'Interact with the ConnectUC API',
		defaults: {
			name: 'ConnectUC',
		},
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [{ name: 'connectUcOAuth2Api', required: true }],
		// Phase 4: dropdowns only, to verify the Domain → User → Device cascade.
		// Phase 5 replaces these with resource/operation-scoped fields.
		properties: [
			{
				displayName: 'Domain Name or ID',
				name: 'domain',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getDomains',
				},
				default: '',
				description:
					'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
			},
			{
				displayName: 'User Name or ID',
				name: 'user',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getSubscribers',
					loadOptionsDependsOn: ['domain'],
				},
				default: '',
				description:
					'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
			},
			{
				displayName: 'Device Name or ID',
				name: 'device',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getDevices',
					loadOptionsDependsOn: ['user'],
				},
				default: '',
				description:
					'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
			},
			{
				displayName: 'Users Names or IDs',
				name: 'users',
				type: 'multiOptions',
				typeOptions: {
					loadOptionsMethod: 'getUsers',
					loadOptionsDependsOn: ['domain'],
				},
				default: [],
				description:
					'Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
			},
			{
				displayName: 'SMS Sender Name or ID',
				name: 'smsSender',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getSmsNumbers',
				},
				default: '',
				description:
					'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
			},
		],
	};

	methods = { loadOptions };

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (let i = 0; i < items.length; i++) {
			returnData.push({
				json: {
					domain: this.getNodeParameter('domain', i, '') as string,
					user: this.getNodeParameter('user', i, '') as string,
					device: this.getNodeParameter('device', i, '') as string,
					users: this.getNodeParameter('users', i, []) as string[],
					smsSender: this.getNodeParameter('smsSender', i, '') as string,
				},
				pairedItem: { item: i },
			});
		}

		return [returnData];
	}
}
