'use strict'

import { WorkspaceConfiguration } from 'vscode'
import * as prettier from 'prettier'

type Body = string | string[]

type From = 'snippet' | 'variable'

export interface Snippets {
  [name: string]: Snippet // index signature
}

export interface Snippet {
  readonly prefix: string
  body: Body
  readonly description: string
}

interface Syntax {
  readonly tokens: Token[]
}

interface Token {
  readonly snippet: Pattern
  readonly variable: Pattern
}

interface Pattern {
  readonly re: RegExp
  readonly replacement: any
}

export const TABSTOP: Token = {
  snippet: {
    re: /\$(\d)/g,
    replacement: 'TABSTOP_$1',
  },
  variable: {
    re: /TABSTOP_(\d)/g,
    replacement: '$$$1',
  },
}

export const PLACEHOLDER: Token = {
  snippet: {
    re: /\$\{(\d):(\w+)\}/g, // tabstop : default value
    replacement: 'PLACEHOLDER_$1_$2',
  },
  variable: {
    re: /PLACEHOLDER_(\d)_(\w+)/g,
    replacement: '${$1:$2}',
  },
}

export const METHOD: Token = {
  snippet: {
    re: /(^\w+\((?:\w*(,\s\w+)?){1,}\)[\s\S]*)/,
    replacement: function replacement(match, submatch) {
      const str = `function ${submatch}`
      const re = /(super\((?:\w+(,\s\w+)?){1,}\))/

      return str.replace(re, '/* $1 */')
    }
  },
  variable: {
    re: /^function (\w+\((?:\w*(,\s\w+)?){1,}\)[\s\S]*)/,
    replacement: function replacement(match, submatch) {
      const str = submatch
      const re = /\/\*\s(super\((?:\w+(,\s\w+)?){1,}\))\s\*\//

      return str.replace(re, '$1')
    }
  }
}

export function formatSnippets(
  snippets: Snippets,
  syntax: Syntax,
  options: prettier.Options
) {
  return Object.keys(snippets).reduce((accumulator: Snippets, name: string) => {
    const snippet = snippets[name]
    const from = parseSnippets(resolveSnippetBody(snippet.body), 'snippet', syntax)
    const formatted = prettier.format(from, options)
    const to = parseSnippets(formatted, 'variable', syntax)
    accumulator[name] = { ...snippet, body: to.trim() }

    return accumulator
  }, {} as Snippets)
}

function parseSnippets(
  snippetBody: string,
  from: From,
  syntax: Syntax
) {
  let body = snippetBody

  syntax.tokens.forEach(token => (body = replaceToken(body, from, token)))

  return body
}

function replaceToken(text: string, from: From, token: Token) {
  return text.replace(token[from].re, token[from].replacement)
}

export function resolveSnippetBody(body: Body) {
  return Array.isArray(body) ? body.join('\n') : body
}

export function normalize(workspaceConfiguration: WorkspaceConfiguration) {
  const configuration = workspaceConfiguration as prettier.Options // support IntelliSense

  const options: prettier.Options = {
    printWidth: configuration.printWidth,
    tabWidth: configuration.tabWidth,
    useTabs: configuration.useTabs,
    semi: configuration.semi,
    singleQuote: configuration.singleQuote,
    trailingComma: configuration.trailingComma,
    bracketSpacing: configuration.bracketSpacing,
    jsxBracketSameLine: configuration.jsxBracketSameLine,
    rangeStart: configuration.rangeStart,
    rangeEnd: configuration.rangeEnd,
    parser: configuration.parser,
    filepath: configuration.filepath,
    requirePragma: configuration.requirePragma,
    insertPragma: configuration.insertPragma,
    proseWrap: configuration.proseWrap
  }

  return options
}
