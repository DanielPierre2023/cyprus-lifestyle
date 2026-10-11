// What the REAL OpenAI Responses API refuses, for the test doubles of OpenAI: a fake that accepts everything lets a request pass that the live API
// answers with a 400 (this happened: plain JSON mode needs the word "JSON" in the input messages, and the first live health check failed on it).
// Rules come from OpenAI's documentation (Structured Outputs, "Supported schemas" and "JSON mode", read October 2026) and from live errors.
// A test double calls requestProblem(body) for every request: a message means "the API would answer 400 with this text".
/* eslint-disable @typescript-eslint/no-explicit-any */

export const JSON_WORD_MESSAGE = "Response input messages must contain the word 'json' in some form to use 'text.format' of type 'json_object'.";

/** Keywords the strict mode does not take (documented as unsupported, or not documented as supported). */
const UNSUPPORTED = ['allOf', 'not', 'dependentRequired', 'dependentSchemas', 'if', 'then', 'else', 'oneOf', 'patternProperties', 'minLength', 'maxLength', 'uniqueItems', 'minProperties', 'maxProperties', 'default'];
const EFFORTS = ['none', 'minimal', 'low', 'medium', 'high', 'xhigh', 'max'];

/** Problems that make strict structured output (text.format json_schema, strict: true) refuse a schema. Empty = accepted. */
export function strictSchemaProblems(schema: any, path = '(root)', depth = 1, root = true, state = { props: 0, enums: 0 }): string[] {
  const out: string[] = [];
  if (!schema || typeof schema !== 'object') return [`${path}: is not a schema`];
  if (depth > 10) out.push(`${path}: nesting deeper than 10 levels`);
  const types: string[] = Array.isArray(schema.type) ? schema.type : schema.type ? [schema.type] : [];
  if (root && (!types.includes('object') || schema.anyOf)) out.push(`${path}: the root of a schema must be an object and not use anyOf`);
  for (const k of UNSUPPORTED) if (k in schema) out.push(`${path}: '${k}' is not permitted`);
  if (!types.length && !schema.anyOf && !schema.enum && !schema.$ref && !('const' in schema)) out.push(`${path}: the schema has no type`);
  if (types.includes('object')) {
    if (schema.additionalProperties !== false) out.push(`${path}: 'additionalProperties' is required to be supplied and to be false`);
    const props = schema.properties && typeof schema.properties === 'object' ? schema.properties : {};
    const keys = Object.keys(props);
    state.props += keys.length;
    const required: string[] = Array.isArray(schema.required) ? schema.required : [];
    const missing = keys.filter((k) => !required.includes(k));
    if (missing.length) out.push(`${path}: 'required' is required to be supplied and to be an array including every key in properties. Missing '${missing[0]}'`);
    const unknown = required.filter((k) => !keys.includes(k));
    if (unknown.length) out.push(`${path}: 'required' names '${unknown[0]}', which is not in properties`);
    for (const k of keys) out.push(...strictSchemaProblems(props[k], `${path}.${k}`, depth + 1, false, state));
  }
  if (types.includes('array')) {
    if (!schema.items) out.push(`${path}: an array needs 'items'`);
    else out.push(...strictSchemaProblems(schema.items, `${path}[]`, depth + 1, false, state));
  }
  if (Array.isArray(schema.anyOf)) schema.anyOf.forEach((s: any, i: number) => out.push(...strictSchemaProblems(s, `${path}|${i}`, depth + 1, false, state)));
  if (Array.isArray(schema.enum)) state.enums += schema.enum.length;
  if (root) {
    if (state.props > 5000) out.push(`${path}: more than 5000 object properties`);
    if (state.enums > 1000) out.push(`${path}: more than 1000 enum values`);
  }
  return out;
}

const textOfInput = (input: any): string =>
  typeof input === 'string' ? input : Array.isArray(input) ? input.map((m: any) => (typeof m?.content === 'string' ? m.content : JSON.stringify(m?.content ?? ''))).join('\n') : '';

/** The message the live API would answer a request with (HTTP 400), or null when it would accept it. */
export function requestProblem(body: any): string | null {
  if (!body || typeof body !== 'object') return 'the request body is not JSON';
  if (typeof body.model !== 'string' || !body.model) return "Missing required parameter: 'model'.";
  if (body.input === undefined) return "Missing required parameter: 'input'.";
  const f = body.text?.format;
  if (f?.type === 'json_object' && !/json/i.test(textOfInput(body.input))) return JSON_WORD_MESSAGE;
  if (f?.type === 'json_schema') {
    if (!/^[a-zA-Z0-9_-]{1,64}$/.test(String(f.name ?? ''))) return `Invalid 'text.format.name': the name must match ^[a-zA-Z0-9_-]{1,64}$`;
    const p = strictSchemaProblems(f.schema);
    if (p.length) return `Invalid schema for response_format '${f.name}': ${p[0]}`;
  }
  if (typeof body.max_output_tokens === 'number' && body.max_output_tokens < 16) return "Invalid 'max_output_tokens': integer below minimum value. Expected a value >= 16, but got a smaller value.";
  if (body.reasoning?.effort !== undefined && !EFFORTS.includes(body.reasoning.effort)) return `Unsupported value: 'reasoning.effort' does not support '${body.reasoning.effort}' with this model.`;
  if (Array.isArray(body.input)) for (const m of body.input) if (!['user', 'assistant', 'system', 'developer'].includes(m?.role)) return `Invalid value: '${m?.role}'. Supported values are: 'assistant', 'system', 'developer', and 'user'.`;
  return null;
}

/** Everything a suite sent that the live API would have refused: assert it is empty at the end of the suite. */
export const rulesViolations: string[] = [];

/** The 400 reply for a refused request, in the shape of the live API. */
export const rejection = (message: string) => ({ status: 400, body: { error: { message, type: 'invalid_request_error', param: null, code: null } } });
