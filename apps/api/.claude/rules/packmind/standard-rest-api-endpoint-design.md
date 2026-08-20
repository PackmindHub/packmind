---
name: 'REST API Endpoint Design'
paths:
  - "REST API route definitions and controller endpoints"
alwaysApply: false
description: 'Conventions for designing REST API endpoints that are predictable, self-documenting, and aligned with distinct business actions. Favors dedicated action endpoints over generic status updates, and routes that reflect the ownership hierarchy without unrelated resource IDs.'
---

# Standard: REST API Endpoint Design

Conventions for designing REST API endpoints that are predictable, self-documenting, and aligned with distinct business actions. Favors dedicated action endpoints over generic status updates, and rout... :
* Create one endpoint per business action rather than a single endpoint handling multiple actions via request body
* Only include resource IDs from the ownership chain in the route — omit IDs of related but non-parent resources
* Use dedicated POST action endpoints (e.g., `/reject`, `/accept`) instead of a generic PATCH with a status field in the body

Full standard is available here for further request: [REST API Endpoint Design](../../../.packmind/standards/rest-api-endpoint-design.md)