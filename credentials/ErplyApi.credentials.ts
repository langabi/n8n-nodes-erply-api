import {
	ICredentialDataDecryptedObject,
	ICredentialTestRequest,
	ICredentialType,
	IHttpRequestOptions,
	INodeProperties,
} from 'n8n-workflow';
import { getSessionKey } from '../nodes/Erply/methods';


export class ErplyApi implements ICredentialType {
	name = 'erplyApi';
	displayName = 'Erply API';
	documentationUrl = 'https://docs.n8n.io/integrations/creating-nodes/build/declarative-style-node/';
	// genericAuth = true;
	properties: INodeProperties[] = [
		{
			displayName: 'Client Code',
			name: 'clientCode',
			type: 'string',
			default: '',
		},
		{
			displayName: 'Username',
			name: 'username',
			type: 'string',
			default: '',
		},
		{
			displayName: 'Password',
			name: 'password',
			type: 'string',
			default: '',
			typeOptions: {
				password: true,
			},
		},
	];

	// authenticate: IAuthenticateGeneric = {
	// 	type: 'generic',
	// 	properties: {
	// 		qs
	// 	}
	// }

	async authenticate(
		credentials: ICredentialDataDecryptedObject,
		requestOptions: IHttpRequestOptions,
	): Promise<IHttpRequestOptions> {
		// has to be run for each request even though sessionKey has an expiry
		// because the expirable property only triggers on a 401 response and erply returns 400
		const sessionKey = await getSessionKey(credentials)

		// erply.com/api requires creds in the query string, all others (pim etc) are in the header
		const isApiUrl = requestOptions.url.includes("erply.com/api")

		if (isApiUrl) {
			requestOptions.qs = {
				...requestOptions.qs,
				"clientCode": credentials.clientCode,
				"sessionKey": sessionKey
			};
			return requestOptions;
		}

		requestOptions.headers = {
			...requestOptions.headers,
			"clientCode": credentials.clientCode,
			"sessionKey": sessionKey,
		};
		return {
			...requestOptions
		}
	}

	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials?.clientCode}}.erply.com',
			url: '/api',
			method: 'POST',
			qs: {
				request: 'getSessionKeyInfo'
			}
		},

	};
}



