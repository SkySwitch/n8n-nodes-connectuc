import {
	NodeApiError,
	type IDataObject,
	type IExecuteFunctions,
	type IHookFunctions,
	type IHttpRequestMethods,
	type IHttpRequestOptions,
	type ILoadOptionsFunctions,
	type INodePropertyOptions,
	type JsonObject,
} from 'n8n-workflow';

type ConnectUcContext = IExecuteFunctions | ILoadOptionsFunctions | IHookFunctions;

const DEFAULT_BASE_URL = 'https://api.connectuc.io';

// Single place that knows which credential the nodes authenticate with. An
// API-key fallback ('connectUcApi') would be selected here from an
// `authentication` node parameter; the nodes themselves stay auth-agnostic.
const CREDENTIAL_NAME = 'connectUcOAuth2Api';

export async function connectucApiRequest<T = unknown>(
	this: ConnectUcContext,
	method: IHttpRequestMethods,
	endpoint: string,
	body: IDataObject = {},
	qs: IDataObject = {},
): Promise<T> {
	const credentials = await this.getCredentials(CREDENTIAL_NAME);
	const baseUrl = ((credentials.baseUrl as string) || DEFAULT_BASE_URL).replace(/\/+$/, '');

	const options: IHttpRequestOptions = {
		method,
		url: `${baseUrl}${endpoint}`,
		qs,
		json: true,
		headers: { Accept: 'application/json' },
	};

	if (Object.keys(body).length) {
		options.body = body;
	}

	try {
		return (await this.helpers.httpRequestWithAuthentication.call(
			this,
			CREDENTIAL_NAME,
			options,
		)) as T;
	} catch (error) {
		// The API explains failures in its JSON body ({ error } or { message }), which
		// n8n doesn't surface on its own; e.g. 403 "cannot act on this user".
		const data = (error as { response?: { data?: IDataObject } }).response?.data;
		const apiMessage = data?.error ?? data?.message;

		throw new NodeApiError(
			this.getNode(),
			error as JsonObject,
			typeof apiMessage === 'string' ? { description: apiMessage } : undefined,
		);
	}
}

interface Domain {
	domain: string;
	description?: string;
}

interface Subscriber {
	first_name?: string;
	last_name?: string;
	user: string;
	uuid: string;
}

interface Registration {
	aor: string;
}

interface SmsNumbersResponse {
	numbers: Array<{ number: string }>;
}

function subscriberLabel(subscriber: Subscriber): string {
	const fullName = `${subscriber.first_name ?? ''} ${subscriber.last_name ?? ''}`.trim();

	return fullName ? `${fullName} (${subscriber.user})` : subscriber.user;
}

async function fetchSubscribers(this: ILoadOptionsFunctions): Promise<Subscriber[]> {
	const domain = this.getCurrentNodeParameter('domain') as string | undefined;

	if (!domain) {
		return [];
	}

	return (await connectucApiRequest.call(
		this,
		'GET',
		'/activepieces/subscribers',
		{},
		{ domain },
	)) as Subscriber[];
}

export const loadOptions = {
	async getDomains(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
		// The API returns an array; the AP piece also tolerated a keyed object.
		const response = (await connectucApiRequest.call(this, 'GET', '/activepieces/domains')) as
			| Domain[]
			| Record<string, Domain>;

		return Object.values(response).map((domain) => ({
			name: domain.description ? `${domain.description} (${domain.domain})` : domain.domain,
			value: domain.domain,
		}));
	},

	// Single subscriber, value = UUID (used by actions for /users/{uuid}/... routes)
	async getSubscribers(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
		const subscribers = await fetchSubscribers.call(this);

		return subscribers.map((subscriber) => ({
			name: subscriberLabel(subscriber),
			value: subscriber.uuid,
		}));
	},

	// Multiple subscribers, value = extension (used by trigger filters), plus '*' for all
	async getUsers(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
		const subscribers = await fetchSubscribers.call(this);

		const options = subscribers.map((subscriber) => ({
			name: subscriberLabel(subscriber),
			value: subscriber.user,
		}));

		return subscribers.length > 1 ? [{ name: 'All Users', value: '*' }, ...options] : options;
	},

	async getDevices(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
		const user = this.getCurrentNodeParameter('user') as string | undefined;

		if (!user) {
			return [];
		}

		const registrations = (await connectucApiRequest.call(
			this,
			'GET',
			`/users/${encodeURIComponent(user)}/registration`,
		)) as Registration[];

		return registrations.map((registration) => {
			const aor = registration.aor.replace(/^sip:/, '');

			return { name: aor, value: aor };
		});
	},

	async getSmsNumbers(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
		const response = (await connectucApiRequest.call(this, 'GET', '/sms/numbers')) as SmsNumbersResponse;

		return (response.numbers ?? []).map(({ number }) => ({ name: number, value: number }));
	},
};
