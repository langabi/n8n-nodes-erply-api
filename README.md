# n8n-nodes-erply-api

This is an n8n community node. It lets you use the Erply API, Service APIs and webhook triggers in your n8n workflows.

Erply is a multi store, retail chain and franchise point-of-sale platform.


[n8n](https://n8n.io/) is a [fair-code licensed](https://docs.n8n.io/reference/license/) workflow automation platform.

[Installation](#installation)   
[Credentials](#credentials)
[Compatibility](#compatibility)  
[Usage](#usage) 
[Resources](#resources)  
[Version history](#version-history)  <!-- delete if not using this section -->  

## Installation

Follow the [installation guide](https://docs.n8n.io/integrations/community-nodes/installation/) in the n8n community nodes documentation.

## Credentials

Ensure that your Erply user has API access enabled.

## Compatibility

Tested on version 1.47.1

## Usage

## Context

All authenticated requests get a new sessionKey and are not reused even though an expiry is provided. Erply returns status code 400 when a sessionKey is expired. A current limitation of n8n requires a 401 response to trigger a token refresh.

ErplyService uses [getServiceEndpoints](https://learn-api.erply.com/new-apis) to list the correct endpoint base URLs for your account code. According to Erply, these service endpoints can change without prior notice. 

## Resources

* [n8n community nodes documentation](https://docs.n8n.io/integrations/community-nodes/)
* [Erply API documentation](https://learn-api.erply.com/)


