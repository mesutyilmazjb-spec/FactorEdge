import {
  Injectable,
} from '@nestjs/common';

import {
  InjectRepository,
} from '@nestjs/typeorm';

import {
  Repository,
} from 'typeorm';

import { User } from './entities/user.entity.js';

import { UserRole } from './enums/user-role.enum.js';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository:
      Repository<User>,
  ) {}

  async findByEmail(
    email: string,
  ): Promise<User | null> {
    return this.userRepository.findOne({
      where: {
        email,
      },
    });
  }

async create(
  name: string,
  email: string,
  passwordHash: string,
  role: UserRole,
): Promise<User> {
  const user =
    this.userRepository.create({
      name,
      email,
      passwordHash,
      role,
    });

  return this.userRepository.save(
    user,
  );
}

  async findById(
    id: string,
  ): Promise<User | null> {
    return this.userRepository.findOne({
      where: {
        id,
      },
    });
  }
}