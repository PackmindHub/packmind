#!/bin/bash

# Fix remaining integration test files
FILES=(
  "packages/integration-tests/src/coding-agents-deployments/junie-deployment.spec.ts"
  "packages/integration-tests/src/coding-agents-deployments/target-specific-deployment.spec.ts"
  "packages/integration-tests/src/recipes-lifecycle/webhook-contract.integration.spec.ts"
)

for file in "${FILES[@]}"; do
  echo "Fixing $file..."
  
  # Add SpacesHexa import
  sed -i '/import { StandardsHexa, standardsSchemas } from '\''@packmind\/standards'\'';/a import { SpacesHexa, spacesSchemas, Space } from '\''@packmind\/spaces'\'';' "$file"
  
  # Add space variable
  sed -i '/let user: User;/a   let space: Space;' "$file"
  
  # Add spacesHexa variable
  sed -i '/let standardsHexa: StandardsHexa;/a   let spacesHexa: SpacesHexa;' "$file"
  
  # Add spacesSchemas to datasource
  sed -i 's/...standardsSchemas,/...standardsSchemas,\n      ...spacesSchemas,/' "$file"
  
  # Add SpacesHexa registration
  sed -i '/registry.register(AccountsHexa);/i     registry.register(SpacesHexa);' "$file"
  
  # Add spacesHexa initialization
  sed -i '/standardsHexa = registry.get(StandardsHexa);/a     spacesHexa = registry.get(SpacesHexa);' "$file"
  
  # Add assert import
  sed -i '/import { DataSource } from '\''typeorm'\'';/a import { assert } from '\''console'\'';' "$file"
  
  echo "Fixed $file"
done

echo "All integration test files have been updated!"
