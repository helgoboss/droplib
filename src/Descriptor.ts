import { ContextData, Processor } from "./Context";

export type RenderFunction = () => Promise<any>

export interface DynamicRoute {
    path: string
    render: RenderFunction
}

export type DynamicRouteMapping = { [file: string]: RenderFunction }

export interface Descriptor {
    mountPoint?: string
    sourceDir?: string
    staticsSubDir?: string
    pagesSubDir?: string
    processors?: Processor[]
    contextData?: ContextData
    dynamicRoutes?: DynamicRouteMapping | DynamicRoute[]
}

export function withDescriptorDefaults(descriptor: Descriptor) {
    return {
        processors: [],
        contextData: {},
        dynamicRoutes: {},
        ...descriptor
    }
}

export function getDynamicRoutesAsArray(dynamicRoutes: DynamicRouteMapping | DynamicRoute[]) {
    return Array.isArray(dynamicRoutes) ? dynamicRoutes : convertDynamicRouteMappingToArray(dynamicRoutes)
}

function convertDynamicRouteMappingToArray(dynamicRouteMapping: DynamicRouteMapping): DynamicRoute[] {
    return Object.keys(dynamicRouteMapping).map(path => ({
        path,
        render: dynamicRouteMapping[path]
    }))
}
