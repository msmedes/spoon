import type { OpenAPIV3_1 } from "openapi-types";
import OpenAPISpec from "../openapi.json" assert { type: "json" };
import { extractMethod } from "./helpers";

type AssertOpenAPI<T> = T extends OpenAPIV3_1.Document ? T : never;
type ValidatedSpec = AssertOpenAPI<typeof OpenAPISpec & OpenAPIV3_1.Document>;

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

const spoon = <T extends OpenAPIV3_1.Document>(domain: string): T =>
	new Proxy(
		{},
		{
			get(target, key) {
				return createProxy(domain, key as string);
			},
		},
	) as T;

const app = spoon<ValidatedSpec>("localhost:3000");

const result = await app.agreement.guide.get();
