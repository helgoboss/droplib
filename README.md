# Droplib

Simple Node.js library for building static websites. Built for own purposes, not stable.

## Available processors

### `template`

Evaluates to a string.

Symbols available in template:
- `context`: `Context`
- Any other symbol provided when constructing the processor

### `template-function`

Evaluates to a function that renders a template with the given arguments.

Symbols available in template:
- `context`: `Context`
- `args`: Object containing all the arguments which have been passed to the function template
- Any other symbol provided when constructing the processor

### ...

## Todos

- Write documentation
- Glob support
- Expose processors in a better way
- Give default IDs to processors
- Get all standard processors
- Factor out heavy processors into separate modules (e.g. html-to-pdf)