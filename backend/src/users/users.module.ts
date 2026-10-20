import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { User } from './entities/user.entity.js';
import { UsersService } from './users.service.js';
import { UsersSeedService } from './users-seed.service.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
    ]),
  ],

  providers: [
    UsersService,
    UsersSeedService,
  ],

  exports: [
    UsersService,
  ],
})
export class UsersModule {}