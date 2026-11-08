/**
 * Compatibility layer that exposes a react-router-dom-like API on top of
 * TanStack Router, so pages/components ported from the SPA keep working.
 */
import {
  useRouter,
  useRouterState,
  useParams as useTsParams,
} from "@tanstack/react-router";
import * as React from "react";

function toHref(to: unknown): string {
  if (typeof to === "string") return to;
  if (to && typeof to === "object") {
    const t = to as { pathname?: string; search?: string; hash?: string };
    return `${t.pathname ?? ""}${t.search ?? ""}${t.hash ?? ""}`;
  }
  return "/";
}

export function useNavigate() {
  const router = useRouter();
  return React.useCallback(
    (to: unknown, options?: { replace?: boolean; state?: unknown }) => {
      if (typeof to === "number") {
        if (to < 0) router.history.back();
        else router.history.forward();
        return;
      }
      router.navigate({ to: toHref(to), replace: options?.replace } as never);
    },
    [router],
  );
}

export function useLocation() {
  return useRouterState({ select: (s) => s.location });
}

export function useParams<T = Record<string, string>>(): T {
  return useTsParams({ strict: false } as never) as T;
}

export function useSearchParams(): [
  URLSearchParams,
  (next: URLSearchParams | Record<string, string>, opts?: { replace?: boolean }) => void,
] {
  const router = useRouter();
  const searchStr = useRouterState({ select: (s) => s.location.searchStr });
  const params = React.useMemo(() => new URLSearchParams(searchStr), [searchStr]);
  const setParams = React.useCallback(
    (next: URLSearchParams | Record<string, string>, opts?: { replace?: boolean }) => {
      const usp = next instanceof URLSearchParams ? next : new URLSearchParams(next);
      const qs = usp.toString();
      router.navigate({
        to: `${router.state.location.pathname}${qs ? `?${qs}` : ""}`,
        replace: opts?.replace,
      } as never);
    },
    [router],
  );
  return [params, setParams];
}

export interface LinkProps
  extends Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "href"> {
  to: string | { pathname?: string; search?: string; hash?: string };
  replace?: boolean;
  state?: unknown;
}

export const Link = React.forwardRef<HTMLAnchorElement, LinkProps>(
  ({ to, replace, state: _state, onClick, ...rest }, ref) => {
    const router = useRouter();
    const href = toHref(to);
    return (
      <a
        ref={ref}
        href={href}
        onClick={(e) => {
          onClick?.(e);
          if (
            e.defaultPrevented ||
            e.button !== 0 ||
            e.metaKey ||
            e.ctrlKey ||
            e.shiftKey ||
            e.altKey ||
            rest.target === "_blank" ||
            /^https?:\/\//.test(href)
          ) {
            return;
          }
          e.preventDefault();
          router.navigate({ to: href, replace } as never);
        }}
        {...rest}
      />
    );
  },
);
Link.displayName = "Link";

type NavRenderProps = { isActive: boolean; isPending: boolean };

export interface NavLinkProps extends Omit<LinkProps, "className" | "style" | "children"> {
  end?: boolean;
  className?: string | ((props: NavRenderProps) => string);
  style?: React.CSSProperties | ((props: NavRenderProps) => React.CSSProperties);
  children?: React.ReactNode | ((props: NavRenderProps) => React.ReactNode);
}

export const NavLink = React.forwardRef<HTMLAnchorElement, NavLinkProps>(
  ({ to, end, className, style, children, ...rest }, ref) => {
    const pathname = useRouterState({ select: (s) => s.location.pathname });
    const href = toHref(to);
    const isActive = end ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
    const renderProps: NavRenderProps = { isActive, isPending: false };
    return (
      <Link
        ref={ref}
        to={href}
        className={typeof className === "function" ? className(renderProps) : className}
        style={typeof style === "function" ? style(renderProps) : style}
        {...rest}
      >
        {typeof children === "function" ? children(renderProps) : children}
      </Link>
    );
  },
);
NavLink.displayName = "NavLink";

export function Navigate({ to, replace }: { to: string; replace?: boolean }) {
  const router = useRouter();
  React.useEffect(() => {
    router.navigate({ to, replace } as never);
  }, [router, to, replace]);
  return null;
}

export function useHref(to: string) {
  return to;
}
