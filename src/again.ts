import type { OpenAPIV3 } from "openapi-types";
import type exampleSchema from "../openapi.json";
import { extractMethod } from "./helpers";
import type { Prettify } from "./types";

type ExamplePaths = {
	paths: Record<string, any>;
};

// type SplitPath<T extends string> = T extends `/${infer First}/${infer Rest}`
// 	? [First, ...SplitPath<`${Rest}`>]
// 	: T extends `${infer First}/${infer Rest}`
// 		? [First, ...SplitPath<`${Rest}`>]
// 		: T extends `/${infer Single}`
// 			? Single extends ""
// 				? []
// 				: [Single]
// 			: T extends `${infer Single}`
// 				? Single extends ""
// 					? []
// 					: [Single]
// 				: never;

type Create<Spec extends ExamplePaths> = Prettify<Sign<Spec["paths"]>>;

type Sign<Route extends Record<string, any>> = {
	[K in keyof Route as K extends `${infer First}/${infer Rest}`
		? First
		: K]: K extends `${infer First}/${infer Rest}`
		? Prettify<Sign<{ [P in Rest]: Route[`${First}/${P}`] }>>
		: Route[K];
};

type Test = Sign<(typeof examplePaths)["paths"]>;

const createProxy = (domain: string, path = "") => {
	return new Proxy(() => {}, {
		get(target, key) {
			return createProxy(domain, `${path}/${key.toString()}`);
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
		"/store/inventory": { get: () => {} },
		"/store/order": { post: () => {} },
		"/store/order/{orderId}": { get: () => {} },
	},
};

const client = createApiClient<typeof examplePaths>("localhost:8001");

const cool = client.store.order;
