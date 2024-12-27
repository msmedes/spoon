import type { OpenAPIV3 } from "openapi-types";
import type exampleSchema from "../openapi.json";
import { extractMethod } from "./helpers";
import type { Prettify } from "./types";

type ExamplePaths = {
	paths: Record<string, any>;
};

type Create<Spec extends ExamplePaths> = Spec extends {
	paths: infer Paths extends Record<string, unknown>;
}
	? Sign4<Paths>
	: "Fail";

/*
Considering this object: {
	paths: {
	  "": { get: () => {}}
		"store/inventory": { get: () => {} },
		"store/order": { post: () => {}, put: () => {} },
		"store/order/{orderId}": { get: () => {} },
		"mirror": { get: () => {} },
	},
};

We want a type that looks like this:
type ApiClient = {
  store: {
	  order: {
			post: () => {}
			put: () => {}
			orderId: {
			  get: () => {}
			}
		}
		inventory: {
		  get: () => {}
		}
	}
	mirror: {
		get: () => {}
	}
	index: {
		get: () => {}
	}
}

So let's describe the type in plain english first:

For each key in paths, we need to handle these cases:
1) it is a path parameter, eg. `{someId}`
2) It is a single segment path, eg. `store`
3) It is a multi-segment path, eg `store/inventory`
4) it is an HTTP method name, eg. get, post, put, patch

Typescript defs for each here:
1) if Path is a path parameter, the key should be that path parameter, 
  and it should be equal to a recursion of this type on the Paths indexed by this key.
2) if Path is just `${string}` then again we should just recurse this type on the Paths indexed on this Path
3) if Path is multi-segment, then the key should be the First part of the segment, and the value would be the 
   the recursed type on the remainder, (this part is a fail so far, might be better to make a tuple or something idk]
4) If its an HTTP method name, there is no key, just a value.


<Ignore>
I think a tricky thing here is we kind of need the entire path at each level in the recursion??? otherwise
we won't be able to index into the source object correctly.
I'm not sure if I'm being tricky here but modeling this as a trie might be the move? I have no idea how
to to this in the type system.

Maybe the dumb guy move is to just literally make an object then typeof that over. 
</Ignore>

*/

type HttpMethods = "get" | "post";

type BaseSchema = Record<string, any>;

type ExtractFirst<T extends string> = T extends `${infer First}/${infer Rest}`
	? [First, Rest]
	: [T];

type StartsWith<
	Str extends string,
	Prefix extends string,
> = Str extends `${Prefix}/${string}` ? true : false;

type GetPathsWithPrefix<Schema extends BaseSchema, Prefix extends string> = {
	[K in keyof Schema as StartsWith<K & string, Prefix> extends true
		? K
		: never]: Schema[K];
};

type TestGetPathsWithPrefix = GetPathsWithPrefix<
	(typeof examplePaths)["paths"],
	"store"
>;

type Sign4<
	CurrentSchema extends BaseSchema,
	CompletePath extends string = "",
	CurrentPath extends string = "",
> = CurrentPath extends `${string}/${string}`
	? {
			[K in ExtractFirst<ExtractFirst<CurrentPath>[1]>[0]]: Sign4<
				CurrentSchema,
				CompletePath,
				ExtractFirst<ExtractFirst<CurrentPath>[1]>[1] & string
			>;
		}
	: {
			[K in keyof CurrentSchema as K extends `${infer First}/${string}`
				? First
				: K extends `${infer SinglePathSegment}`
					? SinglePathSegment
					: K extends `{${infer PathParameter}}`
						? PathParameter
						: K extends HttpMethods
							? K
							: K extends "/" | ""
								? "index"
								: never]: K extends `${string}/${infer Rest}`
				? Sign4<CurrentSchema, K, Rest>
				: K extends `${infer SinglePathSegment}`
					? Sign4<
							CurrentSchema[SinglePathSegment],
							CompletePath,
							SinglePathSegment
						>
					: K extends `${infer PathParameter}`
						? Sign4<
								CurrentSchema[`{${PathParameter}}`],
								CompletePath,
								PathParameter
							>
						: CurrentSchema[K];
		};

type Test = Sign4<(typeof examplePaths)["paths"]>;

const createProxy = (domain: string, path = "") => {
	return new Proxy(() => {}, {
		get(target, key) {
			return createProxy(domain, `$path/${key.toString()}`);
		},
		apply: async (target, thisArg, args): Promise<Record<string, any>> => {
			const { method, path: newPath } = extractMethod(path);
			const result = await fetch(`${domain}/${newPath}`, {
				method,
				body: JSON.stringify(args[0]),
			});
			return result.json();
		},
	});
};

function createApiClient<T extends ExamplePaths>(domain: string): Create<T> {
	return new Proxy(
		{},
		{
			get(target, key) {
				return createProxy(domain, key as string);
			},
		},
	) as any;
}

const examplePaths = {
	paths: {
		"store/inventory": { get: () => {} },
		"store/order": { post: () => {}, put: () => {} },
		"store/order/{orderId}": { get: () => {} },
		"{someId}": { get: () => {} },
		mirror: { get: () => {} },
	},
};

const client = createApiClient<typeof examplePaths>("localhost:8001");
const cool = client.store.inventory;
