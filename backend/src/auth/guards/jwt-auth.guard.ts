import {
  Injectable,
} from '@nestjs/common';

import {
  AuthGuard,
} from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard
  extends AuthGuard('jwt') {}


  //Bu guard'ın görevi basit:
// Authorization: Bearer TOKEN
//           ↓
//       token geçerli?
//        /        \
//      EVET       HAYIR
//       ↓           ↓
//  request.user    401