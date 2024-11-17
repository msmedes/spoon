import type * as OpenAPISpec from "../openapi.json";
import { extractMethod } from "./helpers";
import type { SpoonOpenAPI } from "./types";

const createProxy = (domain: string, path = "") => {
	return new Proxy(() => {}, {
		get(target, key) {
			return createProxy(domain, `${path}/${key.toString()}`);
		},
		apply: async (target, thisArg, args) => {
			const { method, path: newPath } = extractMethod(path);
			const result = await fetch(`${domain}/${newPath}`, {
				method,
				body: JSON.stringify(args[0]),
			});
			return result.json();
		},
	});
};

const spoon = <T extends SpoonOpenAPI>(domain: string): T =>
	new Proxy(
		{},
		{
			get(target, key) {
				return createProxy(domain, key as string);
			},
		},
	) as T;

const app = spoon<typeof OpenAPISpec>("localhost:3000");

const result = await app.mirror.post({ hello: "world" });
console.log(result);
