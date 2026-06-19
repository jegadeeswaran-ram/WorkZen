import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest();
    const { method, url } = req;
    const mutatingMethods = ['POST', 'PUT', 'PATCH', 'DELETE'];

    return next.handle().pipe(
      tap(() => {
        if (mutatingMethods.includes(method)) {
          // Audit logging is handled per-service for richer context
          // This interceptor is a no-op placeholder for cross-cutting audit concerns
          void method;
          void url;
        }
      }),
    );
  }
}
