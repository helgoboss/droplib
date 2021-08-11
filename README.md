# Droplib

Simple Node.js library for building static websites. Built for own purposes, not stable.

## Installation

Install the main library:
```
npm install @helgoboss/droplib
```

If you need PDF support, see [droplib-pdf](https://github.com/helgoboss/droplib-pdf).


## Usage

```js
import { drop, Context, template, templateFunction, markdown, yaml } from '@helgoboss/droplib'

drop({
    debug: false,
    destinationDir: 'dist',
    port: 8000,
    getDescriptors: async () => {
        const templateParams = {
            key1: 'hello',
            data: {
                key2: 'world' 
            }
        }
        const processors = [
            template(templateParams),
            templateFunction(templateParams),
            markdown(),
            yaml(),
            htmlToPdf(),
        ]
        return [
            {
                sourceDir: 'src',
                staticsSubDir: 'static',
                pagesSubDir: 'pages',
                processors,
                dynamicRoutes: [
                    ...projectRoutes,
                    ...faqRoutes,
                    ...userGuideRoutes,
                    ...checksumRoutes
                ],
            }
        ]
    }
})
```




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

### `markdown`

Converts Markdown to HTML.

### `asciidoc`

Converts AsciiDoc to HTML.

## Todos

- Write documentation
- Error messages, e.g. if descriptor is invalid (always automatically including processed file)
- Glob support