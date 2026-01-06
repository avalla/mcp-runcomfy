---
trigger: always_on
---
# General Code Style & Formatting

- Follow the Airbnb Style Guide for code formatting.
- Use PascalCase for React component file names (e.g., UserCard.tsx, not user-card.tsx).
- Prefer named exports for components.
- Use functional and declarative programming patterns; avoid classes.
- Prefer iteration and modularization over code duplication.
- Use descriptive variable names with auxiliary verbs (e.g., isLoading, hasError, isValid, canEdit).
- Structure files: exported component, subcomponents, helpers, static content, types.
- Follow ViteJs, React, Tailwind and Supabase official documentation for setting up and configuring projects.
- Use the function keyword for pure functions.
- Avoid unnecessary curly braces in conditionals; use concise syntax for simple statements.
- Use declarative JSX.
- Use Prettier for consistent code formatting.
- Structure components for testing with playwright (text / role based testing)
- Keep components small and focused (single responsibility principle).
- Use early returns to reduce nested conditions.
- Prefer const over let, avoid var.
- Use meaningful comments that explain "why" not "what".

# TypeScript Best Practices

- Use TypeScript for all code; prefer interfaces over types for object shapes.
- Avoid any and enums; use explicit types and maps instead.
- Use functional components with TypeScript interfaces.
- Enable strict mode in TypeScript for better type safety.
- Use generic types for reusable components.
- Prefer union types over enums when possible.
- Use type guards for runtime type checking.
- Export types separately from values.
- Use Pick, Omit, and Partial utility types for object manipulation.
- Avoid type assertions (as) unless absolutely necessary.
- Follow **SOLID**, **DRY**, **KISS**, and **YAGNI** principles.
- Consistent linting via **Standard ESLint config** + **Prettier** formatting.
- Prefer composition over inheritance.
