/* eslint-disable n8n-nodes-base/node-filename-against-convention */

/* eslint-disable n8n-nodes-base/node-filename-against-convention */

import {
	getEndpointPaths,
	getServiceEndpoints,
	servicePostReceiveTransform,
	processBulkRequest,
} from './GenericFunctions';
import {
	IExecuteFunctions,
	IExecuteSingleFunctions,
	IHttpRequestOptions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

export class ErplyService implements INodeType {
	methods = {
		loadOptions: {
			getServiceEndpoints,
			getEndpointPaths,
		},
	};

	description: INodeTypeDescription = {
		displayName: 'Erply Services',
		name: 'erplyService',
		icon: 'file:logo.svg',
		defaults: {
			name: 'Erply Service',
		},
		credentials: [
			{
				name: 'erplyApi',
				required: true,
			},
		],

		group: ['input'],
		version: 1,
		description: 'Consume Erply Service APIs',
		inputs: ['main'],
		outputs: ['main'],
		subtitle: '={{$parameter["method"] + " " + $parameter["endpointPath"]}}',

		properties: [
			{
				displayName: 'Service Base URL',
				name: 'service',
				type: 'string',
				default: '={{ $json.pim.url }}',
				required: true,
			},
			{
				// eslint-disable-next-line n8n-nodes-base/node-param-display-name-wrong-for-dynamic-options
				displayName: 'Endpoint Path Select',
				name: 'endpointPathSelect',
				type: 'options',
				description:
					'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
				default: '',
				typeOptions: {
					loadOptionsMethod: 'getEndpointPaths',
					loadOptionsDependsOn: ['service'],
				},
				displayOptions: {
					hide: {
						service: [undefined, null, ''],
					},
				},
			},
			{
				displayName: 'Endpoint Path',
				name: 'endpointPath',
				type: 'string',
				description: 'Use .replace() to replace parameters in the path (like `{ID}`) with the dynamic value',
				default: '={{$parameter["endpointPathSelect"]}}',
				displayOptions: {
					hide: {
						endpointPathSelect: [undefined, null, ''],
					},
				},
				required: true,
			},
			{
				displayName: 'Include Headers',
				name: 'includeHeaders',
				type: 'boolean',
				default: false,
				description: 'Whether to include headers in the output',
			},
			{
				displayName: 'Method',
				name: 'method',
				type: 'options',
				default: 'GET',
				required: true,
				displayOptions: {
					hide: {
						endpointPath: [undefined, null, ''],
					},
				},
				options: [
					{
						name: 'DELETE',
						value: 'DELETE',
					},
					{
						name: 'GET',
						value: 'GET',
					},
					{
						name: 'PATCH',
						value: 'PATCH',
					},
					{
						name: 'POST',
						value: 'POST',
					},
					{
						name: 'PUT',
						value: 'PUT',
					},
				],
			},
			{
				displayName: 'JMES Path',
				name: 'jmesPath',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Body',
				name: 'body',
				type: 'json',
				default: '',
				displayOptions: {
					show: {
						method: ['PATCH', 'POST', 'PUT'],
					},
				},
			},
			{
				displayName: 'Use Bulk Processing',
				name: 'bulkMode',
				type: 'boolean',
				default: true,
				description: 'Whether to process items in bulk (this endpoint supports bulk operations)',
				displayOptions: {
					show: {
						method: ['POST', 'PUT', 'PATCH'],
						endpointPath: [{
							_cnd: {
								includes: 'bulk'
							}
						}],
					},
				},
			},
			{
				displayName: 'Batch Size',
				name: 'batchSize',
				type: 'number',
				default: 100,
				description: 'Maximum number of items to process in each batch (max 100)',
				displayOptions: {
					show: {
						method: ['POST', 'PUT', 'PATCH'],
						bulkMode: [true],
						endpointPath: [{
							_cnd: {
								includes: 'bulk'
							}
						}],
					},
				},
			},
			{
				displayName: 'Parameters',
				name: 'parameters',
				type: 'fixedCollection',
				default: {},
				typeOptions: {
					multipleValues: true,
				},
				options: [
					{
						displayName: 'Parameter',
						name: 'parameter',
						values: [
							{
								displayName: 'Key',
								name: 'key',
								type: 'string',
								default: '',
							},
							{
								displayName: 'Value',
								name: 'value',
								type: 'string',
								default: '',
							},
						],
					},
				],
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		// Get common parameters
		const service = this.getNodeParameter('service', 0) as string;
		const method = this.getNodeParameter('method', 0) as 'DELETE' | 'GET' | 'PATCH' | 'POST' | 'PUT';
		const endpointPath = this.getNodeParameter('endpointPath', 0) as string;
		const bulkMode = this.getNodeParameter('bulkMode', 0, false) as boolean;

		// Handle bulk operations
		if (bulkMode && method !== 'GET' && endpointPath.includes('bulk')) {
			const batchSize = this.getNodeParameter('batchSize', 0, 100) as number;

			// Create base request options for bulk processing
			const requestOptions: IHttpRequestOptions = {
				url: `${service}${endpointPath}`,
				method,
				headers: {
					'Content-Type': 'application/json',
				},
				json: true,
			};

			const results = await processBulkRequest.call(
				this as unknown as IExecuteSingleFunctions,
				items,
				batchSize,
				requestOptions,
			);
			returnData.push(...results);
		} else {
			// Handle regular operations
			for (let i = 0; i < items.length; i++) {
				// Get item-specific parameters
				const itemEndpointPath = this.getNodeParameter('endpointPath', i) as string;
				const itemMethod = this.getNodeParameter('method', i) as 'DELETE' | 'GET' | 'PATCH' | 'POST' | 'PUT';
				const parameters = this.getNodeParameter('parameters', i) as { parameter?: Array<{ key: string; value: string }> };

				// Create request options specific to this item
				const requestOptions: IHttpRequestOptions = {
					url: `${service}${itemEndpointPath}`,
					method: itemMethod,
					headers: {
						'Content-Type': 'application/json',
					},
					json: true,
				};

				// Add query parameters if any
				if (parameters?.parameter) {
					requestOptions.qs = {};
					for (const param of parameters.parameter) {
						requestOptions.qs[param.key] = param.value;
					}
				}

				// Add body for non-GET requests
				if (itemMethod !== 'GET') {
					const body = this.getNodeParameter('body', i) as string;
					if (body) {
						requestOptions.body = JSON.parse(body);
					} else {
						requestOptions.body = items[i].json;
					}
				}

				// Make the request
				const response = await this.helpers.httpRequestWithAuthentication.call(
					this,
					'erplyApi',
					requestOptions,
				);

				// Process the response using servicePostReceiveTransform
				const transformedData = await servicePostReceiveTransform.call(
					this as unknown as IExecuteSingleFunctions,
					[{ json: response }],
					{
						body: response,
						headers: response.headers,
						statusCode: response.statusCode || 200,
					},
				);
				returnData.push(...transformedData);
			}
		}

		return [returnData];
	}
}
