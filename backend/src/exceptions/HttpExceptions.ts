import { AppError } from './AppError';

export class BadRequestException extends AppError {
  constructor(message: string, code: string = 'BAD_REQUEST') {
    super(message, 400, code);
  }
}

export class UnauthorizedException extends AppError {
  constructor(message: string, code: string = 'UNAUTHORIZED') {
    super(message, 401, code);
  }
}

export class ForbiddenException extends AppError {
  constructor(message: string, code: string = 'FORBIDDEN') {
    super(message, 403, code);
  }
}

export class NotFoundException extends AppError {
  constructor(message: string, code: string = 'NOT_FOUND') {
    super(message, 404, code);
  }
}

export class ConflictException extends AppError {
  constructor(message: string, code: string = 'CONFLICT') {
    super(message, 409, code);
  }
}

export class InternalServerException extends AppError {
  constructor(message: string = 'Internal Server Error', code: string = 'INTERNAL_ERROR') {
    super(message, 500, code);
  }
}
