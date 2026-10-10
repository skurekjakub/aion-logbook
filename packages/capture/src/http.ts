/**
 * The HTTP client every scraper shares: a fixed user agent and referer,
 * cookies kept across requests, retries with backoff, and a polite delay
 * between items.
 *
 * @module
 */

/** A desktop Chrome user agent, the one the YouTube scripts sent. */
export const DESKTOP_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36";

/** The `fetch` a client sends through; tests pass one that answers from fixtures. */
export type Fetch = (url: string, init: RequestInit) => Promise<Response>;

/** How an {@link HttpClient} behaves. */
export interface HttpOptions {
  /** The `User-Agent` header of every request. */
  userAgent: string;
  /** Headers every request carries, such as `Referer` or `Accept-Language`. */
  headers?: Record<string, string>;
  /** Cookies to start with, as `name=value` pairs per domain (the domain and its subdomains). */
  cookies?: Record<string, Record<string, string>>;
  /** The polite pause between items, in milliseconds. */
  delayMs: number;
  /** Tries per request before giving up; defaults to 3. */
  tries?: number;
  /** Per-request timeout in milliseconds; defaults to 25 000. */
  timeoutMs?: number;
  /** The fetch to send through; defaults to the global `fetch`. */
  fetch?: Fetch;
  /**
   * Waits between tries and between items; defaults to a real timer.
   *
   * @param ms - how long to wait
   */
  sleep?: (ms: number) => Promise<void>;
  /**
   * Reports a failed try, for the terminal.
   *
   * @param message - what failed
   */
  log?: (message: string) => void;
}

/** One request beyond a plain GET. */
export interface RequestOptions {
  /** `GET` unless a body is given, then `POST`. */
  method?: "GET" | "POST";
  /** Extra headers for this request, over the client's. */
  headers?: Record<string, string>;
  /** A form body, sent `application/x-www-form-urlencoded`. */
  form?: Record<string, string | number>;
  /** A JSON body. */
  json?: unknown;
  /** Per-request timeout override, in milliseconds. */
  timeoutMs?: number;
}

/**
 * Waits for `ms` milliseconds.
 *
 * @param ms - how long to wait
 * @returns a promise that resolves after the wait
 */
function realSleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** A session-like HTTP client: shared headers, a cookie jar, retries and a polite delay. */
export class HttpClient {
  private readonly jar = new Map<string, Map<string, string>>();
  private readonly fetchImpl: Fetch;
  private readonly sleepImpl: (ms: number) => Promise<void>;

  /**
   * Builds a client.
   *
   * @param options - its user agent, headers, starting cookies, delay and hooks
   */
  constructor(private readonly options: HttpOptions) {
    this.fetchImpl = options.fetch ?? ((url, init) => fetch(url, init));
    this.sleepImpl = options.sleep ?? realSleep;
    for (const [domain, cookies] of Object.entries(options.cookies ?? {})) {
      this.jar.set(domain, new Map(Object.entries(cookies)));
    }
  }

  /**
   * Waits the polite delay between items.
   *
   * @returns a promise that resolves after the delay
   */
  pause(): Promise<void> {
    return this.sleepImpl(this.options.delayMs);
  }

  /**
   * Waits an arbitrary time, through the client's sleep hook.
   *
   * @param ms - how long to wait
   * @returns a promise that resolves after the wait
   */
  sleep(ms: number): Promise<void> {
    return this.sleepImpl(ms);
  }

  /**
   * Sends one request, once: no retry, and any status is returned.
   *
   * @param url - the absolute URL
   * @param request - method, extra headers and body
   * @returns the response
   * @throws whatever the fetch throws: a network error or a timeout
   */
  async send(url: string, request: RequestOptions = {}): Promise<Response> {
    const headers: Record<string, string> = {
      "User-Agent": this.options.userAgent,
      ...this.options.headers,
      ...request.headers,
    };
    const cookie = this.cookieHeader(url);
    if (cookie) headers.Cookie = cookie;
    let body: string | undefined;
    if (request.form) {
      headers["Content-Type"] = "application/x-www-form-urlencoded";
      body = new URLSearchParams(
        Object.entries(request.form).map(([k, v]): [string, string] => [k, String(v)]),
      ).toString();
    } else if (request.json !== undefined) {
      headers["Content-Type"] = "application/json";
      body = JSON.stringify(request.json);
    }
    const response = await this.fetchImpl(url, {
      method: request.method ?? (body === undefined ? "GET" : "POST"),
      headers,
      body,
      signal: AbortSignal.timeout(request.timeoutMs ?? this.options.timeoutMs ?? 25_000),
    });
    this.store(url, response);
    return response;
  }

  /**
   * Sends a request until it answers 200, backing off 2 s, 5 s, 8 s between
   * tries, as the Python scrapers' `get` did.
   *
   * @param url - the absolute URL
   * @param request - method, extra headers and body
   * @returns the 200 response, or `null` after the last failed try
   */
  async get(url: string, request: RequestOptions = {}): Promise<Response | null> {
    const tries = this.options.tries ?? 3;
    for (let attempt = 0; attempt < tries; attempt++) {
      try {
        const response = await this.send(url, request);
        if (response.status === 200) return response;
        this.options.log?.(`  HTTP ${response.status} ${url}`);
      } catch (err) {
        this.options.log?.(`  ERR ${(err as Error).message} ${url}`);
      }
      await this.sleepImpl(2000 + attempt * 3000);
    }
    return null;
  }

  /**
   * Builds the `Cookie` header for a URL from the jar.
   *
   * @param url - the request URL
   * @returns `name=value` pairs of every cookie whose domain covers the host, or `""`
   */
  private cookieHeader(url: string): string {
    const host = new URL(url).hostname;
    const pairs: string[] = [];
    for (const [domain, cookies] of this.jar) {
      if (host !== domain && !host.endsWith(`.${domain}`)) continue;
      for (const [name, value] of cookies) pairs.push(`${name}=${value}`);
    }
    return pairs.join("; ");
  }

  /**
   * Keeps the cookies a response sets, under its `Domain` attribute or its host.
   *
   * @param url - the request URL
   * @param response - the response
   */
  private store(url: string, response: Response): void {
    for (const header of response.headers.getSetCookie()) {
      const [pair, ...attributes] = header.split(";");
      const eq = pair!.indexOf("=");
      if (eq < 1) continue;
      const domainAttr = attributes
        .map((a) => a.trim())
        .find((a) => a.toLowerCase().startsWith("domain="));
      const domain = (domainAttr?.slice(7) ?? new URL(url).hostname).replace(/^\./, "");
      const cookies = this.jar.get(domain) ?? new Map<string, string>();
      cookies.set(pair!.slice(0, eq).trim(), pair!.slice(eq + 1).trim());
      this.jar.set(domain, cookies);
    }
  }
}
