/* eslint-disable n8n-nodes-base/node-filename-against-convention */

import { getEndpointPaths, getServiceEndpoints } from './methods';
import { INodeType, INodeTypeDescription } from 'n8n-workflow';

export class ErplyService implements INodeType {

	methods = {
		loadOptions: {
			getServiceEndpoints,
			getEndpointPaths
		}
	}
	description: INodeTypeDescription = {
		displayName: 'Erply PIM',
		name: 'erplyService',
		icon: 'file:logo.svg',
		defaults: {
			name: 'Erply PIM',
		},
		credentials: [
			{
				name: 'ErplyApi',
				required: true,
			}
		],

		group: ['input'],
		version: 1,
		description: 'Consume Erply PIM',
		inputs: ['main'],
		outputs: ['main'],
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',

		properties: [
			{
				displayName: 'Service Name or ID',
				name: 'service',
				type: 'options',
				//@ts-ignore
				description: 'The service to call. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
				default: '',
				typeOptions: {
					loadOptionsMethod: 'getServiceEndpoints',
				},
				required: true,
				routing: {
					request: {
						baseURL: '={{$parameter["service"]}}'
					}
				}
			},
			{
				displayName: 'Endpoint Path Select Name or ID',
				name: 'endpointPathSelect',
				type: 'options',
				description: 'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
				default: '',
				typeOptions: {
					loadOptionsMethod: 'getEndpointPaths',
					loadOptionsDependsOn: ['service'],
				},
				displayOptions: {
					hide: {
						service: [undefined, null, '']
					}
				},
				required: true
			},
			{
				displayName: 'Endpoint Path',
				name: 'endpointPath',
				type: 'string',
				default: '={{$parameter["endpointPathSelect"]}}',
				// default: '',
				displayOptions: {
					hide: {
						endpointPathSelect: [undefined, null, '']
					}
				},
				routing: {
					request: {
						//@ts-ignore
						url: '={{$parameter["endpointPath"]}}'
					}
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
						endpointPath: [undefined, null, '']
					}
				},
				options: [
					{
						name: 'GET',
						value: 'GET',
					},
					{
						name: 'POST',
						value: 'POST',
					},
				],

				routing: {
					request: {
						// @ts-ignore
						method: '={{$parameter["method"]}}',
					}
				}
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

					}
				},
				options: [
					{
						displayName: 'Parameter',
						name: 'parameter',
						routing: {
							request: {
								//@ts-ignore
								// qs: '={{ $parameter.parameters.parameter.smartJoin("key", "value") }}'
							}
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
						]
					},
				]
			}
		]
	}
}


