// export function composePath(path: string) {
// 	return path.replaceAll("{", "").replaceAll("}", "");
// }

export function extractMethod(path: string) {
	// paths look like /foo/bar/get
	// where the last element is the HTTP method
	// We need to return that and strip it from the path
	// we want to return an object that has the path up to
	// /get, so the object would look like {method: 'get', path: '/foo/bar/'}
	const segments = path.split("/");
	const method = segments.pop() || "";
	const newPath = segments.join("/");
	return { method, path: newPath };
}
