/* eslint-disable n8n-nodes-base/node-filename-against-convention */

import { apiWebhookRequest } from './methods';
import { IDataObject, IHookFunctions, INodeType, INodeTypeDescription, IWebhookFunctions, IWebhookResponseData, IWebhookSetupMethods } from 'n8n-workflow';

export class ErplyTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Erply Trigger',
		name: 'erplyTrigger',
		icon: 'file:logo.svg',
		credentials: [
			{
				name: 'ErplyApi',
				required: true,
			}
		],
		defaults: {
			name: 'Erply Trigger',
		},

		group: ['trigger'],
		version: 1,
		description: 'Use Erply Webhooks',
		inputs: [],
		outputs: ['main'],
		subtitle: '={{$parameter["action"] + ": " + $parameter["table"]}}',

		webhooks: [
			{
				name: 'default',
				httpMethod: 'POST',
				responseMode: 'onReceived',
				path: 'webhook'
			}
		],
		properties: [
			{
				displayName: 'Table',
				name: 'table',
				type: 'string',
				default: '',
				required: true,
			},
			{
				displayName: 'Action',
				name: 'action',
				type: 'options',
				options: [
					{
						name: 'Insert',
						value: 'insert'
					},
					{
						name: 'Update',
						value: 'update'
					},
					{
						name: 'Delete',
						value: 'delete'
					}
				],
				default: 'insert',
				required: true,
			},
			{
				displayName: 'Secret',
				name: 'secret',
				type: 'string',
				default: '',
				required: true,
				typeOptions: {
					password: true
				}
			},
			{
				displayName: 'Base URL',
				name: 'baseUrl',
				type: 'string',
				default: 'https://webhook.erply.com',
				required: true,
			}

		],
	};
	webhookMethods: { [key: string]: IWebhookSetupMethods; } = {
		default: {
			async checkExists(this: IHookFunctions): Promise<boolean> {
				const table = this.getNodeParameter('table')
				const action = this.getNodeParameter('action')
				const resp = await apiWebhookRequest.call(this, 'GET', '/v1/webhook-configuration', {}) as {action: string, table: string}[]
				return resp.some(obj => (obj.action === action && obj.table === table))
			},
			async create(this: IHookFunctions): Promise<boolean> {
				const payload = this.getNode().parameters as {table: string, action: string, secret: string}
				const endpoint = this.getNodeWebhookUrl('default');
				try {
					await apiWebhookRequest.call(this, 'POST', '/v1/webhook-configuration', {
						...payload,
						endpoint,
						disabled: false
					})
				} catch (error) {
					return false
				}
				return true
			},
			async delete(this: IHookFunctions): Promise<boolean> {
				const table = this.getNodeParameter('table')
				const action = this.getNodeParameter('action')
				const checkResp = await apiWebhookRequest.call(this, 'GET', '/v1/webhook-configuration', {}) as {action: string, table: string, id: string}[]
				//get the object where the ID matches
				const id = checkResp.find(obj => obj.action === action && obj.table === table)?.id
				if (!id) {
					return false
				}
				//delete the webhook
				try {
					await apiWebhookRequest.call(this, 'DELETE', `/v1/webhook-configuration/${id}`, {})
				} catch (error) {
					return false
				}
				return true
			}
		}
	}

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const items = this.getBodyData().items as IDataObject[]

		return {
			workflowData: [ this.helpers.returnJsonArray(items) ],
			webhookResponse: {
				status: 200
			}
		}
	}
}


