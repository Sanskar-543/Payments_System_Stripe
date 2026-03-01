class ApiError extends Error {
  public statusCode: number;
  public success: boolean;
  public errors: unknown[];

  constructor(
    statusCode: number = 500,
    message: string = "Something Went Wrong",
    errors: unknown[] = [],
    stack: string = ""
  ) {
    super(message);

    this.statusCode = statusCode;
    this.success = false;
    this.errors = errors;

    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

export { ApiError };
