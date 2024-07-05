import {
	ICredentialDataDecryptedObject,
	ICredentialType,
	IHttpRequestOptions,
	INodeProperties,
} from 'n8n-workflow';
import { getSessionKey } from '../nodes/Erply/methods';


export class ErplyApi implements ICredentialType {
	// eslint-disable-next-line n8n-nodes-base/cred-class-field-name-uppercase-first-char
	name = 'ErplyApi';
	displayName = 'Erply API';
	documentationUrl = 'https://docs.n8n.io/integrations/creating-nodes/build/declarative-style-node/';

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

	async authenticate(
		credentials: ICredentialDataDecryptedObject,
		requestOptions: IHttpRequestOptions,
	): Promise<IHttpRequestOptions> {

		// const url = encodeURI(`https://${credentials.clientCode}.erply.com/api?clientCode=${credentials.clientCode}&username=${credentials.username}&password=${credentials.password}&request=verifyUser&doNotGenerateIdentityToken=1`)

		// const authResp = await fetch(url, {
		// 	method: 'POST',
		// })

		// if (!authResp.ok) {
		// 	throw new Error('Authentication failed');
		// }

		// const authData = await authResp.json() as any;

		// const sessionKey = authData.records[0].sessionKey;
		const sessionKey = await getSessionKey(credentials)

		//api URL
		const isApiUrl = requestOptions.url.includes("erply.com/api")

		if (isApiUrl) {
			requestOptions.qs = {
				...requestOptions.qs,
				"clientCode": credentials.clientCode,
				"sessionKey": sessionKey
			};
			return requestOptions;
		}

		//all other requests need the clientCode and sessionKey in the header
		requestOptions.headers = {
			...requestOptions.headers,
			"clientCode": credentials.clientCode,
			"sessionKey": sessionKey,
		};
		return {
			...requestOptions
		}
	}
}



