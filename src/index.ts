import * as OpenAPISpec from "../openapi.json";
import type { OpenAPI } from "./types";

function fun(spec: OpenAPI) {
	return "hello";
}

fun(OpenAPISpec as OpenAPI);

const createProxy = (domain: string, path = "") => {
	return new Proxy(() => {}, {
		get(target, key) {
			return createProxy(domain, `${path}/${key.toString()}`);
		},
		apply(target, thisArg, args) {
			// eventually this will make the network request
			console.log(target, thisArg, args, path);
		},
	});
};

const spoon = (domain: string) =>
	new Proxy(
		{},
		{
			get(target, key) {
				return createProxy(domain, key as string);
			},
		},
	);

const app = spoon("https://api.example.com");

app.get.hello.sandwich.get();
