/* eslint-disable n8n-nodes-base/node-filename-against-convention */

/* eslint-disable n8n-nodes-base/node-filename-against-convention */

import { getEndpointPaths, getServiceEndpoints, servicePostReceiveTransform } from './GenericFunctions';
import { INodeType, INodeTypeDescription } from 'n8n-workflow';

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
				routing: {
					request: {
						baseURL: '={{$parameter["service"]}}',
					},
				},
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
				hint: 'use .replace() to replace the path with the dynamic value',
				default: '={{$parameter["endpointPathSelect"]}}',
				displayOptions: {
					hide: {
						endpointPathSelect: [undefined, null, ''],
					},
				},
				routing: {
					request: {
						//@ts-ignore
						url: '={{$parameter["endpointPath"]}}',
					},
				},
				required: true,
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

				routing: {
					request: {
						// @ts-ignore
						method: '={{$parameter["method"]}}',
					},
				},
			},
			{
				displayName: 'JMES Path',
				name: 'jmesPath',
				type: 'string',
				default: '',
				routing: {
					output: {
						// @ts-ignore
						postReceive: [
							servicePostReceiveTransform
						],
					},
				}
			},
			{
				displayName: 'Blah',
				name: 'blah',
				type: 'hidden',
				default: {}

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
				routing: {
					request: {
						// @ts-ignore
						body: '={{ JSON.parse($parameter["body"])}}',
						json: true,
						headers: {
							'Content-Type': 'application/json',
						},
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
				routing: {
					request: {
						// @ts-ignore
						qs: '={{ $parameter.parameters.parameter ? $parameter.parameters.parameter.smartJoin("key", "value") : undefined }}',
					},
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
}
