/** Thrown when a lookup by id finds no matching row. */
export class NotFoundError extends Error {
  /**
   * Builds the error, with message `<entity> not found: <id>`.
   *
   * @param entity - the kind of thing that was looked up, e.g. `"build"`
   * @param id - the id that had no match
   */
  constructor(entity: string, id: string | number) {
    super(`${entity} not found: ${id}`);
    this.name = "NotFoundError";
  }
}

/**
 * Thrown when an input references ids that don't exist: source ids, or
 * the ids of rows of another table, such as skills or builds.
 */
export class UnknownRefsError extends Error {
  /** Which kind of id was referenced: `"sources"`, or a table's registry key such as `"skills"`. */
  readonly kind: string;
  /** The referenced ids that don't exist. */
  readonly ids: string[];

  /**
   * Builds the error, with message `unknown <kind>: <ids>`.
   *
   * @param kind - which kind of id was referenced: `"sources"`, or the
   *   registry key of the table whose ids were named
   * @param ids - the referenced ids that don't exist
   */
  constructor(kind: string, ids: string[]) {
    super(`unknown ${kind}: ${ids.join(", ")}`);
    this.name = "UnknownRefsError";
    this.kind = kind;
    this.ids = ids;
  }
}

/** Thrown when an operation conflicts with existing state. */
export class ConflictError extends Error {
  /**
   * Builds the error.
   *
   * @param message - description of the conflict
   */
  constructor(message: string) {
    super(message);
    this.name = "ConflictError";
  }
}

/** An error's HTTP answer: its status and JSON body. */
export interface HttpError {
  /** The response status. */
  status: 404 | 409 | 422;
  /** The JSON body; its `error` names the failure for the client. */
  body: { error: string } & Record<string, unknown>;
}

/** How one error class answers over HTTP. */
interface HttpMapping<E extends Error> {
  /** The error class. */
  type: new (...args: never[]) => E;
  /**
   * Builds the answer for an error of the class.
   *
   * @param err - the error
   * @returns its status and body
   */
  answer(err: E): HttpError;
}

/**
 * Declares an error class's HTTP answer, inferring the error type.
 *
 * @param mapping - the class and its answer
 * @returns the same mapping, widened for the table
 */
function httpMapping<E extends Error>(mapping: HttpMapping<E>): HttpMapping<Error> {
  // `answer` is a method, so its parameter is checked bivariantly: an `E` answer widens to `Error`.
  return mapping;
}

/**
 * Every error class the API answers with a client-error status, checked in
 * order. A new error class that the API should answer is a row here.
 */
const HTTP_ERRORS: readonly HttpMapping<Error>[] = [
  httpMapping({
    type: NotFoundError,
    answer: (err) => ({ status: 404, body: { error: "not_found", message: err.message } }),
  }),
  httpMapping({
    type: UnknownRefsError,
    answer: (err) => ({
      status: 422,
      body: { error: "unknown_refs", kind: err.kind, ids: err.ids },
    }),
  }),
  httpMapping({
    type: ConflictError,
    answer: (err) => ({ status: 409, body: { error: "conflict", message: err.message } }),
  }),
];

/**
 * The HTTP answer for an error the API expects, from {@link HTTP_ERRORS}.
 *
 * @param err - whatever a route threw
 * @returns the status and JSON body, or `undefined` for any other error
 *   (the caller answers 500)
 */
export function httpStatus(err: unknown): HttpError | undefined {
  const mapping = HTTP_ERRORS.find(({ type }) => err instanceof type);
  return mapping?.answer(err as Error);
}

/** Thrown when importing external data fails for one row of a file. */
export class ImportError extends Error {
  /**
   * Builds the error, with message `<file> [<row>]: <message>` (no `[<row>]` when `row` is `null`).
   *
   * @param file - path to the file being imported
   * @param row - the row identifier the failure occurred at, or `null` if
   *   the failure isn't tied to a specific row
   * @param message - description of the failure
   */
  constructor(file: string, row: string | number | null, message: string) {
    super(`${file}${row == null ? "" : ` [${row}]`}: ${message}`);
    this.name = "ImportError";
  }
}
