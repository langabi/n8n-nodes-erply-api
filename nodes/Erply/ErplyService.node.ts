/* eslint-disable n8n-nodes-base/node-filename-against-convention */

/* eslint-disable n8n-nodes-base/node-filename-against-convention */

import { getEndpointPaths, getServiceEndpoints } from './methods';
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
				name: 'ErplyApi',
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
				default: '={{$json.records[0].pim.url}}',
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
				required: true,
			},
			{
				displayName: 'Endpoint Path',
				name: 'endpointPath',
				type: 'string',
				hint: 'use .replace() to replace the path with the dynamic value',
				default: '={{$parameter["endpointPathSelect"]}}',
				// default: '',
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
						routing: {
							request: {
								//@ts-ignore
								// qs: '={{ $parameter.parameters.parameter.smartJoin("key", "value") }}'
							},
						},

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
