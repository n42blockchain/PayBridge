/**
 * Dynamic routes API
 * For PayBridge, we use static routes defined in router/modules
 * This file provides the interface for future dynamic route loading
 */

export interface RouteConfigsTable {
  path: string;
  name?: string;
  redirect?: string;
  component?: any;
  meta?: {
    title?: string;
    icon?: string;
    rank?: number;
    showLink?: boolean;
    showParent?: boolean;
    roles?: string[];
    auths?: string[];
    keepAlive?: boolean;
    frameSrc?: string;
    frameLoading?: boolean;
    transition?: {
      enterTransition?: string;
      leaveTransition?: string;
    };
    hiddenTag?: boolean;
    dynamicLevel?: number;
    activePath?: string;
  };
  children?: RouteConfigsTable[];
}

/**
 * Get async routes from backend (currently returns empty as we use static routes)
 */
export const getAsyncRoutes = (): Promise<{ data: RouteConfigsTable[] }> => {
  // PayBridge uses static routes defined in router/modules
  // Return empty array to use only static routes
  return Promise.resolve({ data: [] });
};
