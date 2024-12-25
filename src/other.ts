import type { OpenAPIV3 } from "openapi-types";
import type { Prettify } from "./types";

// Helper type to extract components schema type
type ComponentsSchema<T extends OpenAPIV3.Document> = T["components"] extends {
	schemas: infer S;
}
	? S
	: never;

// Helper to resolve $refs in the schema
type ResolveRef<
	Ref extends string,
	T extends OpenAPIV3.Document,
> = Ref extends `#/components/schemas/${infer Name}`
	? T["components"] extends { schemas: { [K in Name]: infer S } }
		? S
		: never
	: never;

// Convert schema to TypeScript type with component resolution
type SchemaToType<
	T extends OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject,
	Doc extends OpenAPIV3.Document,
> = T extends OpenAPIV3.ReferenceObject
	? T["$ref"] extends string
		? SchemaToType<ResolveRef<T["$ref"], Doc>, Doc>
		: never
	: T extends OpenAPIV3.ArraySchemaObject
		? Array<SchemaToType<T["items"], Doc>>
		: T extends OpenAPIV3.NonArraySchemaObject
			? T["type"] extends "object"
				? T["properties"] extends object
					? Prettify<{
							[P in keyof T["properties"]]: SchemaToType<
								T["properties"][P],
								Doc
							>;
						} & (T["required"] extends Array<infer R>
							? {
									[P in R & keyof T["properties"]]-?: SchemaToType<
										T["properties"][P & keyof T["properties"]],
										Doc
									>;
								}
							: unknown)
					: Record<string, unknown>
				: T["type"] extends "string"
					? T["enum"] extends Array<infer E>
						? E
						: string
					: T["type"] extends "number" | "integer"
						? number
						: T["type"] extends "boolean"
							? boolean
							: unknown
			: unknown;

// Extract response type from operation
type ResponseType<
	T extends OpenAPIV3.OperationObject,
	Doc extends OpenAPIV3.Document,
> = T["responses"][200 | 201] extends OpenAPIV3.ResponseObject
	? T["responses"][200 | 201]["content"] extends {
			"application/json": { schema: infer S };
		}
		? SchemaToType<
				S & (OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject),
				Doc
			>
		: never
	: never;

// Convert OpenAPI parameters to TypeScript type
type ParametersToType<
	T extends Array<OpenAPIV3.ParameterObject | OpenAPIV3.ReferenceObject>,
	Doc extends OpenAPIV3.Document,
> = {
	[P in T[number] as P extends OpenAPIV3.ParameterObject
		? P["name"]
		: never]: P extends OpenAPIV3.ParameterObject
		? SchemaToType<P["schema"], Doc>
		: never;
};

// Convert a single operation to a typed method
type OperationToMethod<
	T extends OpenAPIV3.OperationObject,
	Doc extends OpenAPIV3.Document,
> = T["requestBody"] extends OpenAPIV3.RequestBodyObject
	? (
			body: SchemaToType<
				Extract<
					T["requestBody"],
					OpenAPIV3.RequestBodyObject
				>["content"]["application/json"]["schema"],
				Doc
			>,
		) => Promise<ResponseType<T, Doc>>
	: T["parameters"] extends Array<
				OpenAPIV3.ParameterObject | OpenAPIV3.ReferenceObject
			>
		? (
				params: ParametersToType<T["parameters"], Doc>,
			) => Promise<ResponseType<T, Doc>>
		: () => Promise<ResponseType<T, Doc>>;

// Convert OpenAPI operations to typed methods
type OperationsToMethods<
	T extends OpenAPIV3.PathItemObject,
	Doc extends OpenAPIV3.Document,
> = {
	get?: T["get"] extends OpenAPIV3.OperationObject
		? OperationToMethod<T["get"], Doc>
		: never;
	post?: T["post"] extends OpenAPIV3.OperationObject
		? OperationToMethod<T["post"], Doc>
		: never;
	put?: T["put"] extends OpenAPIV3.OperationObject
		? OperationToMethod<T["put"], Doc>
		: never;
	delete?: T["delete"] extends OpenAPIV3.OperationObject
		? OperationToMethod<T["delete"], Doc>
		: never;
	patch?: T["patch"] extends OpenAPIV3.OperationObject
		? OperationToMethod<T["patch"], Doc>
		: never;
};

// Type to convert OpenAPI paths to our nested structure
type PathsToTree<
	T extends OpenAPIV3.PathsObject,
	Doc extends OpenAPIV3.Document,
> = {
	[Path in keyof T]: Path extends `/${infer Rest}`
		? RestToTree<Rest, T[Path] & OpenAPIV3.PathItemObject, Doc>
		: never;
}[keyof T];

// Recursively handle nested paths
type RestToTree<
	Path extends string,
	Operations extends OpenAPIV3.PathItemObject,
	Doc extends OpenAPIV3.Document,
> = Path extends `${infer Segment}/${infer Rest}`
	? {
			[K in Segment extends `{${infer Param}}` ? Param : Segment]: RestToTree<
				Rest,
				Operations,
				Doc
			>;
		}
	: Path extends `{${infer Param}}`
		? {
				[K in Param]: OperationsToMethods<Operations, Doc>;
			}
		: {
				[K in Path]: OperationsToMethods<Operations, Doc>;
			};

// Create handler for the proxy
function createHandler(basePath: string[] = []): ProxyHandler<any> {
	return {
		get(target, prop: string) {
			if (["get", "post", "put", "delete", "patch"].includes(prop)) {
				return async (params?: any) => {
					const path = `/${basePath.join("/")}`;
					console.log(
						`Making ${prop.toUpperCase()} request to ${path}`,
						params,
					);
					// Actual request implementation would go here
					return Promise.resolve();
				};
			}
			return new Proxy({}, createHandler([...basePath, prop]));
		},
	};
}

// Main factory function
export function createApiClient<T extends OpenAPIV3.Document>(spec: T) {
	type ApiTree = PathsToTree<T["paths"], T>;
	return new Proxy({}, createHandler()) as ApiTree;
}

// Example usage with components and refs:
const spec: OpenAPIV3.Document = {
	openapi: "3.0.0",
	info: { title: "Test API", version: "1.0.0" },
	components: {
		schemas: {
			User: {
				type: "object",
				required: ["id", "name"],
				properties: {
					id: { type: "string" },
					name: { type: "string" },
					email: { type: "string" },
				},
			},
			ErrorResponse: {
				type: "object",
				required: ["code", "message"],
				properties: {
					code: { type: "string" },
					message: { type: "string" },
				},
			},
		},
	},
	paths: {
		"/users/{userId}": {
			description: "Get a user by ID",
			get: {
				parameters: [
					{
						name: "userId",
						in: "path",
						required: true,
						schema: { type: "string" },
					},
				],
				responses: {
					"200": {
						description: "User found",
						content: {
							"application/json": {
								schema: {
									$ref: "#/components/schemas/User",
								},
							},
						},
					},
					"404": {
						description: "User not found",
						content: {
							"application/json": {
								schema: {
									$ref: "#/components/schemas/ErrorResponse",
								},
							},
						},
					},
				},
			},
		},
	},
}

const api = createApiClient<typeof spec>();

// TypeScript provides full type safety with resolved refs
api.users.get({ userId: "123" }); // Returns Promise<User>
