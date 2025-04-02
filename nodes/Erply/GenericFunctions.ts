import {
	IDataObject,
	IHookFunctions,
	IHttpRequestMethods,
	ILoadOptionsFunctions,
	INodePropertyOptions,
	JsonObject,
	NodeApiError,
	NodeOperationError,
	IHttpRequestOptions,
	ICredentialDataDecryptedObject,
	IExecuteSingleFunctions,
	IN8nHttpFullResponse,
	INodeExecutionData,
} from 'n8n-workflow';
import axios from 'axios';

import jmespath from 'jmespath';

interface SessionCache {
	sessionKey: string;
	jwt: string;
	expiresAt: number;
}

let sessionCache: Record<string, SessionCache> = {};

// Helper function to create INodeExecutionData items from an array
function mapArrayToNodeExecutionData(dataArray: any[]): INodeExecutionData[] {
	if (!Array.isArray(dataArray)) {
		// If it's somehow not an array at this point, wrap it as a single item
		return [{ json: dataArray }];
	}
	return dataArray.map((item: any) => ({ json: item as IDataObject }));
}

//turns various data responses into either an object or array of objects
export async function servicePostReceiveTransform(
	this: IExecuteSingleFunctions,
	items: INodeExecutionData[],
	response: IN8nHttpFullResponse,
): Promise<INodeExecutionData[]> {
	const jmesPath = this.getNodeParameter('jmesPath', '') as string; // Default to empty string
	const fullResponse = this.getNodeParameter('includeHeaders', false) as boolean; // Default to false

	// If we want the full response including headers, handle it separately
	if (fullResponse) {
		const body = jmesPath ? jmespath.search(response.body as IDataObject, jmesPath) : response.body;
		return [
			{
				json: {
					headers: response.headers,
					body: body,
				},
			},
		];
	}

	// If no JMESPath, decide based on the raw body type
	if (!jmesPath) {
		const body = response.body;
		if (Array.isArray(body)) {
			// Raw body is an array, map it
			return mapArrayToNodeExecutionData(body);
		} else {
			// Raw body is not an array (likely object), return as single item
			// Or return the original items if the body is empty/unexpected? Let's return the body.
			return items.length > 0 ? [{ json: body as IDataObject, pairedItem: items[0].pairedItem }] : [{ json: body as IDataObject }];

		}
	}

	// If we have a JMESPath, process the result
	const body = response.body as IDataObject;
	let retRaw = jmespath.search(body, jmesPath);

	// Check for common patterns where the desired array might be nested
	if (retRaw !== null && typeof retRaw === 'object' && !Array.isArray(retRaw)) {
		// If retRaw is an object, check for common keys containing arrays
		const commonKeys = ['data', 'records', 'results', 'items', 'value'];
		for (const key of commonKeys) {
			if (Array.isArray((retRaw as IDataObject)[key])) {
				retRaw = (retRaw as IDataObject)[key];
				break; // Use the first found array
			}
		}
	} else if (Array.isArray(retRaw) && retRaw.length === 1 && Array.isArray(retRaw[0])) {
		// If retRaw is an array containing a single array element, use the inner array
		retRaw = retRaw[0];
	}

	// Now, map whatever retRaw is (hopefully the array, or a single object/primitive)
	if (Array.isArray(retRaw)) {
		return mapArrayToNodeExecutionData(retRaw);
	} else {
		// If retRaw is not an array after potential unwrapping, return as a single item
		// Preserve pairing info if possible from the input item
		return items.length > 0 ? [{ json: retRaw as IDataObject, pairedItem: items[0].pairedItem }] : [{ json: retRaw as IDataObject }];
	}
}

export async function getServiceEndpoints(
	this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	const creds = await this.getCredentials('erplyApi');

	const res = await this.helpers.httpRequest({
		url: `https://${creds.clientCode}.erply.com/api`,
		method: 'POST',
		qs: {
			request: 'getServiceEndpoints',
			clientCode: creds.clientCode,
		},
	});

	if (res.status.errorCode != 0) {
		throw new NodeOperationError(this.getNode(), 'Error');
	}

	const ret = Object.keys(res.records[0]).map((key) => {
		return {
			name: key,
			value: res.records[0][key].url,
		};
	});
	return ret;
}

export async function getEndpointPaths(
	this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	const endpointPath = this.getNodeParameter('service', null, {
		extractValue: true,
	}) as any;

	const res = await this.helpers.httpRequest({
		url: endpointPath + 'documentation/doc.json',
		method: 'GET',
	});

	const ret = Object.keys(res.paths).map((key) => {
		return {
			name: key,
			value: key,
		};
	});
	return ret;
}

export async function getSessionAuth(credentials: ICredentialDataDecryptedObject): Promise<any> {
	const cacheKey = `${credentials.clientCode}:${credentials.username}`;
	const now = Date.now();

	// Check if we have a valid cached session
	if (sessionCache[cacheKey] && sessionCache[cacheKey].expiresAt > now) {
		return {
			sessionKey: sessionCache[cacheKey].sessionKey,
			jwt: sessionCache[cacheKey].jwt,
		};
	}

	// If not cached or expired, authenticate
	let url;
	if (credentials.authProxy) {
		url = credentials.authProxy as string;
	} else {
		url = encodeURI(`https://${credentials.clientCode}.erply.com/api?clientCode=${credentials.clientCode}&username=${credentials.username}&password=${credentials.password}&request=verifyUser&doNotGenerateIdentityToken=1`)
	}

	let authResp;
	try {
		authResp = await axios.get(url, {
			auth: {
				username: credentials.username as string,
				password: credentials.password as string,
			},
		});
	} catch (error) {
		throw new Error('Could not authenticate', {
			cause: error,
		});
	}

	if (authResp.status !== 200) {
		throw new Error('Could not authenticate');
	}

	// Cache the session for 45 minutes (Erply sessions typically last 1 hour)
	sessionCache[cacheKey] = {
		sessionKey: authResp.data.records[0].sessionKey,
		jwt: authResp.data.records[0].token,
		expiresAt: now + 45 * 60 * 1000,
	};

	return {
		sessionKey: sessionCache[cacheKey].sessionKey,
		jwt: sessionCache[cacheKey].jwt,
	};
}

export async function apiWebhookRequest(
	this: IHookFunctions,
	method: IHttpRequestMethods,
	endpoint: string,
	body: IDataObject,
): Promise<any> {
	const baseUrl = this.getNodeParameter('baseUrl');

	const opts: IHttpRequestOptions = {
		url: `${baseUrl}${endpoint}`,
		method,
		body,
	};

	if (Object.keys(body).length === 0) {
		delete opts.body;
	}

	try {
		return await this.helpers.httpRequestWithAuthentication.call(this, 'erplyApi', opts);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}

export async function processBulkRequest(
	this: IExecuteSingleFunctions,
	items: INodeExecutionData[],
	batchSize: number,
	requestOptions: IHttpRequestOptions,
): Promise<INodeExecutionData[]> {
	const results: INodeExecutionData[] = [];

	// Process items in batches
	for (let i = 0; i < items.length; i += batchSize) {
		const batchItems = items.slice(i, i + batchSize); // Keep original items for pairing
		const batchJson = batchItems.map(item => item.json);


		const batchRequestOptions = {
			...requestOptions,
			body: {
				requests: batchJson // Assuming the API expects the JSON part in 'requests'
			},
		};

		// Make the bulk request with authentication
		let bulkResponse: any; // Use 'any' for flexibility or define a more specific type
		try {
			bulkResponse = await this.helpers.httpRequestWithAuthentication.call(
				this,
				'erplyApi',
				batchRequestOptions,
			);
		} catch (error) {
			// Handle potential errors during the bulk request
			// Maybe log the error and continue, or throw, or create error items
			console.error(`Bulk request failed for batch starting at index ${i}:`, error);
			// Optionally create error output items
			// results.push(...batchItems.map(item => ({ json: { error: 'Bulk request failed' }, pairedItem: item.pairedItem })));
			continue; // Continue to the next batch
		}


		// Handle each response in the bulk response array
		// Adjust 'bulkResponse.results' based on the actual API response structure
		const responsesArray = bulkResponse?.results ?? bulkResponse; // Adapt as needed

		if (Array.isArray(responsesArray) && responsesArray.length === batchItems.length) {
			for (let j = 0; j < responsesArray.length; j++) {
				const singleResponse = responsesArray[j];
				const originalItem = batchItems[j]; // Get corresponding original item

				// Create a mock IN8nHttpFullResponse for servicePostReceiveTransform
				const mockHttpResponse: IN8nHttpFullResponse = {
					headers: requestOptions.headers || {}, // Or extract from singleResponse if available
					body: singleResponse,
					statusCode: 200, // Or extract from singleResponse if available
				};

				// Pass the original item (or just its json/pairedItem) to maintain context/pairing
				// Pass [{ json: singleResponse, pairedItem: originalItem.pairedItem }] if you want pairing
				// Passing just [{json: singleResponse}] is simpler if pairing isn't strictly needed here
				const transformedResponse = await servicePostReceiveTransform.call(
					this,
					[{ json: singleResponse as IDataObject, pairedItem: originalItem.pairedItem }], // Pass original pairing info
					mockHttpResponse,
				);
				// Ensure pairing is maintained in the final results if needed
				// transformedResponse might need adjustment if it doesn't preserve pairedItem
				results.push(...transformedResponse);
			}
		} else {
			// Handle cases where the response structure isn't as expected (e.g., error, wrong format)
			console.warn(`Unexpected bulk response structure for batch starting at index ${i}:`, bulkResponse);
			// Optionally create error items for the whole batch
			// results.push(...batchItems.map(item => ({ json: { error: 'Unexpected bulk response format' }, pairedItem: item.pairedItem })));

			// Fallback: Try processing the whole bulkResponse as one
			 const mockHttpResponse: IN8nHttpFullResponse = {
					headers: requestOptions.headers || {},
					body: bulkResponse,
					statusCode: 200 // Or determine status code differently
			};
			const transformedResponse = await servicePostReceiveTransform.call(
				this,
				// Decide how to handle input items here - maybe use the first item's pairing?
				items.length > 0 ? [{ json: bulkResponse as IDataObject, pairedItem: items[0].pairedItem }] : [{ json: bulkResponse as IDataObject }],
				mockHttpResponse,
			);
			results.push(...transformedResponse);
		}
	}

	return results;
}
