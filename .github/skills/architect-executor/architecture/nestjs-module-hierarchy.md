# NestJS Module Hierarchy

All hierarchical routing is configured **exclusively in AppModule** using `RouterModule.register()` with nested `children` arrays. This is the single source of truth for the entire API route structure.

## Module Rules

- One module per resource type — controllers never handle sub-resource routes
- Controllers use empty `@Controller()` decorators — path is inherited from RouterModule
- Child modules are imported in the parent module's `imports` array and registered as children in AppModule's RouterModule
- Directory structure mirrors the URL path hierarchy

## URL Conventions

- All parent resource IDs are included in paths: `/orgs/:orgId/spaces/:spaceId/standards/:standardId`
- Extract `orgId` from `@Param('orgId')` — never from `AuthRequest`
- Services accept a single typed Command object, not multiple parameters

## Directory Structure Example

```
apps/api/src/app/
└── orgs/
    ├── orgs.module.ts
    ├── orgs.controller.ts          @Controller()
    └── spaces/
        ├── spaces.module.ts
        ├── spaces.controller.ts    @Controller()
        └── standards/
            ├── standards.module.ts
            └── standards.controller.ts  @Controller()
```

## AppModule RouterModule Example

```typescript
RouterModule.register([
  {
    path: 'orgs',
    module: OrgsModule,
    children: [
      {
        path: ':orgId/spaces',
        module: SpacesModule,
        children: [
          { path: ':spaceId/standards', module: StandardsModule }
        ]
      }
    ]
  }
])
```
