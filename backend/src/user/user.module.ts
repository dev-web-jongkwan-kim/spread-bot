import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../database/entities/user.entity';
import { UserCoin } from '../database/entities/user-coin.entity';
import { UserExchange } from '../database/entities/user-exchange.entity';
import { UserRepository } from './user.repository';
import { UserService } from './user.service';

@Module({
  imports: [TypeOrmModule.forFeature([User, UserCoin, UserExchange])],
  providers: [UserRepository, UserService],
  exports: [UserService, UserRepository],
})
export class UserModule {}


