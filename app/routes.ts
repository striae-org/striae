import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
	index("routes/_index.tsx"),
	route("auth", "routes/auth/route.ts"),
	route("auth/login", "routes/auth/route.ts", { id: "routes/auth/login-alias" }),
] satisfies RouteConfig;
