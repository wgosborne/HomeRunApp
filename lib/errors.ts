export class AppError extends Error {
  public statusCode: number;
  public context?: unknown;

  constructor(message: string, statusCode: number, context?: unknown) {
    super(message);
    this.statusCode = statusCode;
    this.context = context;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, context?: unknown) {
    super(message, 400, context);
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = "Unauthorized", context?: unknown) {
    super(message, 401, context);
    Object.setPrototypeOf(this, AuthenticationError.prototype);
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = "Forbidden", context?: unknown) {
    super(message, 403, context);
    Object.setPrototypeOf(this, AuthorizationError.prototype);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = "Not found", context?: unknown) {
    super(message, 404, context);
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }
}

export class ConflictError extends AppError {
  constructor(message: string = "Conflict", context?: unknown) {
    super(message, 409, context);
    Object.setPrototypeOf(this, ConflictError.prototype);
  }
}

export function handleError(error: unknown, defaultMessage: string = "Internal server error") {
  if (error instanceof AppError) {
    return {
      statusCode: error.statusCode,
      message: error.message,
      context: error.context,
    };
  }

  if (error instanceof Error) {
    console.error(defaultMessage, error);
    return {
      statusCode: 500,
      message: defaultMessage,
      error: error.message,
    };
  }

  console.error(defaultMessage, error);
  return {
    statusCode: 500,
    message: defaultMessage,
  };
}
