# Creating a Basic React Component

**Summary**: Create a simple, reusable React component with TypeScript using props, interfaces, and Packmind UI components to build consistent and type-safe UI elements.

## When to Use

- When creating a new UI component that displays data or handles user interaction
- When you need to extract repeated JSX patterns into a reusable component
- When building a page that needs to be broken down into smaller, manageable pieces
- When creating a component that accepts configuration through props

## Context Validation Checkpoints

- Does the component need to receive data or configuration from a parent? (use props)
- Does it use any Packmind UI components that need the correct imports?
- What is the component's main responsibility? (display data, handle form, show status, etc.)
- Should the component be exported for use in other files?

## Implementation Steps

### 1. Create the component file with .tsx extension

Create a new file in the appropriate domain folder with a descriptive name.

```typescript
// src/domain/recipes/components/RecipeCard.tsx
import React from 'react';
import { PMBox, PMText, PMHeading } from '@packmind/ui';
```

### 2. Define the props interface

Create a TypeScript interface to define what data the component accepts.

```typescript
interface RecipeCardProps {
  title: string;
  description: string;
  author?: string; // Optional prop
}
```

### 3. Create the component function

Define the component as a typed functional component that accepts props.

```typescript
export const RecipeCard: React.FC<RecipeCardProps> = ({
  title,
  description,
  author,
}) => {
  return (
    // Component JSX goes here
  );
};
```

### 4. Build the JSX using Packmind UI components

Use PMBox, PMText, PMHeading and other @packmind/ui components instead of HTML tags.

```typescript
return (
  <PMBox p={4} borderRadius="md" borderWidth="1px">
    <PMHeading size="md">{title}</PMHeading>
    <PMText mt={2}>{description}</PMText>
    {author && <PMText color="secondary" size="sm">By {author}</PMText>}
  </PMBox>
);
```

### 5. Use the component in a parent

Import and use your new component by passing the required props.

```typescript
import { RecipeCard } from './components/RecipeCard';

function RecipesPage() {
  return (
    <RecipeCard
      title="My Recipe"
      description="A helpful recipe"
      author="John Doe"
    />
  );
}
```

