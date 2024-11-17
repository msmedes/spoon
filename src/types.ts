export type Prettify<T> = {
	[K in keyof T]: T[K];
} & {};

// the OpenAPI type will be generated by the OpenAPI generator
// and will be imported from the generated file
// we will need to generate a type that is compatible with the OpenAPI type

type SchemaObject = {
	$ref?: string;
	items?: SchemaObject;
	type?: string;
	title?: string;
};

type Operation = {
	operationId?: string;
	responses: {
		[status: string]: {
			description: string;
			content: {
				[mediaType: string]: {
					schema: SchemaObject;
				};
			};
		};
	};
};

type OperationMethod =
	| "get"
	| "post"
	| "put"
	| "delete"
	| "options"
	| "head"
	| "patch"
	| "trace";

type EnumType = {
	type: string;
	enum: string[];
	title?: string;
};

type ObjectType = {
	type: "object";
	properties: Record<string, EnumType | ObjectType>;
	required?: string[];
	title?: string;
};

export interface SpoonOpenAPI {
	openapi: string;
	info: {
		title: string;
		version: string;
	};
	paths: {
		[path: string]: Partial<Record<OperationMethod, Operation>>;
	};
	// components: {
	// 	schemas: {
	// 		[name: string]: EnumType | ObjectType;
	// 	};
	// };
}
