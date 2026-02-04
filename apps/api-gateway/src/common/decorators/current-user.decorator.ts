import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { User } from '@paybridge/database';

export interface CurrentUserPayload {
  id: string;
  email: string;
  role: string;
  merchantId?: string;
}

export const CurrentUser = createParamDecorator(
  (data: keyof CurrentUserPayload | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as CurrentUserPayload;

    return data ? user?.[data] : user;
  },
);
