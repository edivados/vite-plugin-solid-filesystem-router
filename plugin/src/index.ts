import { relative, resolve } from 'pathe';
import { type ModuleNode, type Plugin } from 'vite';
import { SolidStartClientFileRouter } from './solid-start/fs-router.js';
import { type BaseFileSystemRouter } from './vinxi/fs-router.js';
import { treeShake } from './vinxi/tree-shake.js';

type Options = {
	/** Directory where to look for route files. (Default: 'src/routes')*/
	dir: string;

	/** An array of file extensions to be picked up as routes. (Defualt: ['jsx', 'tsx']) */
	extensions: string[];

	/** Custom filesystem router. dir and extensions option will be ignored if present. */
	router: BaseFileSystemRouter;
}

export default function routes(options?: Partial<Options>): Plugin[] {
	const virtualRoutesModuleId = "virtual:vite-plugin-solid-filesystem-router/routes";
	const resolvedVirtualRoutesModuleId = '\0' + virtualRoutesModuleId;
	let isBuild: boolean;
	let router: BaseFileSystemRouter;
	let root: string;
	return [
		{
			name: "vite-plugin-solid-filesystem-router",
			async configResolved(config) {
				isBuild = config.command === "build";
				root = config.root;
				router = options?.router || new SolidStartClientFileRouter({
					dir: options?.dir ? resolve(config.root, options.dir) : resolve(config.root, 'src', 'routes'),
					extensions: options?.extensions || ['jsx', 'tsx'],
				});
			},
			configureServer(server) {
				router.addEventListener("reload", () => {
					const { moduleGraph } = server;
					const mod = moduleGraph.getModuleById(virtualRoutesModuleId);
					if (mod) {
						const seen = new Set<ModuleNode>();
						moduleGraph.invalidateModule(mod, seen);
						server.reloadModule(mod);
					}
					if (!server.config.server.hmr) {
						server.ws.send({ type: "full-reload" });
					}
				});
				server.watcher.on("add", path => router.addRoute(path));
				server.watcher.on("change", path => router.updateRoute(path));
				server.watcher.on("unlink", path => router.removeRoute(path));
			},
			resolveId: {
				order: "pre",
				handler(id) {
					if (id === virtualRoutesModuleId) {
						return resolvedVirtualRoutesModuleId;
					}
				},
			},
			async load(id) {
				if (id === resolvedVirtualRoutesModuleId) {
					const js = jsCode();
					const routes = await router.getRoutes();

					let routesCode = JSON.stringify(routes ?? [], (k, v) => {
						if (v === undefined) {
							return undefined;
						}

						if (k.startsWith("$$")) {
							const buildId = `${v.src}?${v.pick
								.map((p: any) => `pick=${p}`)
								.join("&")}`;

							/**
							 * @type {{ [key: string]: string }}
							 */
							const refs: Record<string, any> = {};
							for (var pick of v.pick) {
								refs[pick] = js.addNamedImport(pick, buildId);
							}
							return {
								require: `_$() => ({ ${Object.entries(refs)
									.map(([pick, namedImport]) => `'${pick}': ${namedImport}`)
									.join(", ")} })$_`,
								src: isBuild ? relative(root, buildId) : buildId,
							};
						} else if (k.startsWith("$")) {
							const buildId = `${v.src}?${v.pick
								.map((p: any) => `pick=${p}`)
								.join("&")}`;
							return {
								src: isBuild ? relative(root, buildId) : buildId,
								build: isBuild
									? `_$() => import('${buildId}')$_`
									: undefined,
								import: `_$(() => { const id = '${relative(
									root,
									buildId,
								)}'; return import('${isBuild ? buildId : "/@fs/" + buildId}') })$_`,
							};
						}
						return v;
					});

					routesCode = routesCode.replaceAll('"_$(', "(").replaceAll(')$_"', ")");

					const code = `${js.getImportStatements()}
					export default ${routesCode}`;
					return code;
				}
			}
		}, 
		treeShake()
  ];
}

function jsCode() {
	let imports = new Map();
	let vars = 0;

	/**
	 * @param {any} p
	 */
	function addImport(p: any) {
		let id = imports.get(p);
		if (!id) {
			id = {};
			imports.set(p, id);
		}

		let d = "routeData" + vars++;
		id["default"] = d;
		return d;
	}

	/**
	 * @param {string | number} name
	 * @param {any} p
	 */
	function addNamedImport(name: any, p: any) {
		let id = imports.get(p);
		if (!id) {
			id = {};
			imports.set(p, id);
		}

		let d = "routeData" + vars++;
		id[name] = d;
		return d;
	}

	const getNamedExport = (p: any) => {
		let id = imports.get(p);

		delete id["default"];

		return Object.keys(id).length > 0
			? `{ ${Object.keys(id)
					.map((k) => `${k} as ${id[k]}`)
					.join(", ")} }`
			: "";
	};

	const getImportStatements = () => {
		return `${[...imports.keys()]
			.map(
				(i) =>
					`import ${
						imports.get(i).default
							? `${imports.get(i).default}${
									Object.keys(imports.get(i)).length > 1 ? ", " : ""
								}`
							: ""
					} ${getNamedExport(i)} from '${i}';`,
			)
			.join("\n")}`;
	};

	return {
		addImport,
		addNamedImport,
		getImportStatements,
	};
}