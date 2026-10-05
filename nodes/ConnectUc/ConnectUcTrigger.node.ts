import {
	NodeApiError,
	NodeConnectionTypes,
	type IDataObject,
	type IHookFunctions,
	type INodeType,
	type INodeTypeDescription,
	type IWebhookFunctions,
	type IWebhookResponseData,
} from 'n8n-workflow';
import { domainField } from './descriptions/common';
import { connectucApiRequest, loadOptions } from './GenericFunctions';

export class ConnectUcTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'ConnectUC Trigger',
		name: 'connectUcTrigger',
		icon: { light: 'file:connectuc.svg', dark: 'file:connectuc.dark.svg' },
		group: ['trigger'],
		version: 1,
		subtitle: '={{$parameter["event"]}}',
		description: 'Starts the workflow when ConnectUC call, voicemail, or SMS events occur',
		defaults: {
			name: 'ConnectUC Trigger',
		},
		inputs: [],
		outputs: [NodeConnectionTypes.Main],
		credentials: [{ name: 'connectUcOAuth2Api', required: true }],
		webhooks: [
			{
				name: 'default',
				httpMethod: 'POST',
				responseMode: 'onReceived',
				path: 'webhook',
			},
		],
		properties: [
			{
				displayName: 'Event',
				name: 'event',
				type: 'options',
				required: true,
				noDataExpression: true,
				options: [
					{
						name: 'New Call Summary',
						value: 'NewCallSummary',
						description: 'An AI call summary is ready',
					},
					{
						name: 'New Call Transcription',
						value: 'NewCallTranscription',
						description: 'A call transcription is ready',
					},
					{ name: 'New CDR', value: 'CdrCreated', description: 'A call detail record was created' },
					{ name: 'New Incoming Call', value: 'NewIncomingCall', description: 'A call came in' },
					{ name: 'New Outgoing Call', value: 'NewOutgoingCall', description: 'A call was placed' },
					{
						name: 'New Recording',
						value: 'RecordingCreated',
						description: 'A call recording is ready',
					},
					{
						name: 'New SMS',
						value: 'SMSMessageReceived',
						description: 'An SMS was received or sent',
					},
					{ name: 'New Voicemail', value: 'NewVoicemail', description: 'A voicemail was left' },
				],
				default: 'NewIncomingCall',
			},
			domainField(),
			{
				displayName: 'User Names or IDs',
				name: 'users',
				type: 'multiOptions',
				description:
					'Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
				typeOptions: {
					loadOptionsMethod: 'getUsers',
					loadOptionsDependsOn: ['domain'],
				},
				required: true,
				default: [],
				hint: 'Pick "All Users" to receive events for everyone in the domain',
			},
			{
				displayName: 'Status',
				name: 'status',
				type: 'options',
				options: [
					{ name: 'Answered', value: 'answered' },
					{ name: 'Ringing', value: 'ringing' },
					{ name: 'Both', value: 'both' },
				],
				default: 'answered',
				displayOptions: { show: { event: ['NewIncomingCall'] } },
				description: 'Which stage of the incoming call starts the workflow',
			},
			{
				displayName: 'Recipient Names or IDs',
				name: 'recipients',
				type: 'multiOptions',
				description:
					'Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
				typeOptions: {
					loadOptionsMethod: 'getSmsNumbers',
				},
				required: true,
				default: [],
				displayOptions: { show: { event: ['SMSMessageReceived'] } },
				hint: 'Your SMS numbers to watch. Required: without them no messages are delivered.',
			},
			{
				displayName: 'Direction',
				name: 'direction',
				type: 'options',
				options: [
					{ name: 'Incoming', value: 'incoming' },
					{ name: 'Outgoing', value: 'outgoing' },
					{ name: 'Both', value: '*' },
				],
				default: 'incoming',
				displayOptions: { show: { event: ['SMSMessageReceived'] } },
			},
		],
	};

	methods = { loadOptions };

	webhookMethods = {
		default: {
			// The register call upserts by URL, so registering again on every activation
			// is idempotent and repairs a missing backend row. The backend's list route
			// isn't open to n8n clients, so a real existence check isn't possible.
			async checkExists(this: IHookFunctions): Promise<boolean> {
				return false;
			},

			async create(this: IHookFunctions): Promise<boolean> {
				const event = this.getNodeParameter('event') as string;
				const data: IDataObject = {
					domain: this.getNodeParameter('domain') as string,
					users: this.getNodeParameter('users', []) as string[],
				};

				if (event === 'NewIncomingCall') {
					data.status = this.getNodeParameter('status', 'answered') as string;
				}

				if (event === 'SMSMessageReceived') {
					data.recipients = this.getNodeParameter('recipients', []) as string[];
					data.direction = this.getNodeParameter('direction', 'incoming') as string;
				}

				const response = (await connectucApiRequest.call(this, 'POST', '/activepieces/webhook', {
					url: this.getNodeWebhookUrl('default') as string,
					event,
					flowId: String(this.getWorkflow().id ?? this.getNode().id),
					stepName: this.getNode().name,
					data,
					// Always off. On activation a sample would start a production run. In test
					// mode the backend POSTs it synchronously, before create() returns, so n8n
					// runs and tears down the listener mid-registration and then re-registers
					// a stale one ("Stop Listening" stops working).
					sendTestPayload: false,
				})) as { id: string | number };

				this.getWorkflowStaticData('node').webhookId = response.id;

				return true;
			},

			async delete(this: IHookFunctions): Promise<boolean> {
				const staticData = this.getWorkflowStaticData('node');

				try {
					await connectucApiRequest.call(this, 'DELETE', '/activepieces/webhook', {
						url: this.getNodeWebhookUrl('default') as string,
						webhookId: staticData.webhookId as string | number,
					});
				} catch (error) {
					// Already gone on the backend counts as deleted
					if (!(error instanceof NodeApiError && error.httpCode === '404')) {
						return false;
					}
				}

				delete staticData.webhookId;

				return true;
			},
		},
	};

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const body = this.getBodyData();

		// uc-events delivers both ringing and answered incoming-call events and doesn't
		// apply the status filter, so it's enforced here
		if (this.getNodeParameter('event') === 'NewIncomingCall') {
			const status = this.getNodeParameter('status', 'answered') as string;

			if (status !== 'both' && body.status !== undefined && body.status !== status) {
				return {};
			}
		}

		return {
			workflowData: [this.helpers.returnJsonArray(body)],
		};
	}
}
