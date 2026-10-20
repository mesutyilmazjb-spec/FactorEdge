import {
  Injectable,
  Logger,
  OnModuleInit,
} from '@nestjs/common';

import * as bcrypt from 'bcrypt';

import { UsersService } from './users.service.js';
import { UserRole } from './enums/user-role.enum.js';

@Injectable()
export class UsersSeedService
  implements OnModuleInit
{
  private readonly logger =
    new Logger(UsersSeedService.name);

  constructor(
    private readonly usersService:
      UsersService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.createUserIfMissing(
      'FactorEdge Admin',
      'admin@factoredge.local',
      'Admin123!',
      UserRole.ADMIN,
    );

    await this.createUserIfMissing(
      'FactorEdge Viewer',
      'viewer@factoredge.local',
      'Viewer123!',
      UserRole.VIEWER,
    );
  }

  private async createUserIfMissing(
    name: string,
    email: string,
    password: string,
    role: UserRole,
  ): Promise<void> {
    const existingUser =
      await this.usersService.findByEmail(
        email,
      );

    if (existingUser) {
      return;
    }

    const passwordHash =
      await bcrypt.hash(
        password,
        10,
      );

    await this.usersService.create(
      name,
      email,
      passwordHash,
      role,
    );

    this.logger.log(
      `Seed user created: ${email}`,
    );
  }
}