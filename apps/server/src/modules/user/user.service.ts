import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { User, UserAddress } from '../../database/entities';
import { UpdateUserDto, VerifyUserDto, CreateAddressDto, UpdateAddressDto } from './dto';
import { BusinessException } from '../../common/filters/business.exception';
import { ErrorCode } from '../../common/utils/error-code.enum';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(UserAddress)
    private addressRepository: Repository<UserAddress>,
  ) {}

  /**
   * 获取用户信息
   */
  async getUserInfo(userId: number) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new BusinessException(ErrorCode.AUTH_USER_NOT_FOUND);
    }

    return this.sanitizeUser(user);
  }

  /**
   * 更新用户信息
   */
  async updateUserInfo(userId: number, dto: UpdateUserDto) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new BusinessException(ErrorCode.AUTH_USER_NOT_FOUND);
    }

    if (dto.nickname !== undefined) {
      user.nickname = dto.nickname;
    }
    if (dto.avatar !== undefined) {
      user.avatar = dto.avatar;
    }
    if (dto.realName !== undefined) {
      user.realName = dto.realName;
    }

    await this.userRepository.save(user);

    return this.sanitizeUser(user);
  }

  /**
   * 实名认证
   */
  async verifyUser(userId: number, dto: VerifyUserDto) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new BusinessException(ErrorCode.AUTH_USER_NOT_FOUND);
    }

    if (user.isVerified === 1) {
      throw new BusinessException(ErrorCode.USER_ALREADY_VERIFIED);
    }

    user.realName = dto.realName;
    user.idCard = dto.idCard;
    user.isVerified = 1;

    await this.userRepository.save(user);

    return { message: '实名认证成功' };
  }

  /**
   * 获取地址列表
   */
  async getAddressList(userId: number) {
    const addresses = await this.addressRepository.find({
      where: { userId },
      order: { isDefault: 'DESC', createdAt: 'DESC' },
    });

    return addresses;
  }

  /**
   * 添加地址
   */
  async createAddress(userId: number, dto: CreateAddressDto) {
    // 检查地址数量限制
    const count = await this.addressRepository.count({
      where: { userId },
    });

    if (count >= 10) {
      throw new BusinessException(ErrorCode.ADDRESS_LIMIT_EXCEEDED);
    }

    // 如果设置为默认，先取消其他默认地址
    if (dto.isDefault) {
      await this.addressRepository.update(
        { userId },
        { isDefault: 0 },
      );
    }

    const address = this.addressRepository.create({
      userId,
      name: dto.name,
      phone: dto.phone,
      province: dto.province || null,
      city: dto.city || null,
      district: dto.district || null,
      detail: dto.detail,
      isDefault: dto.isDefault ? 1 : 0,
    });

    await this.addressRepository.save(address);

    // 如果是第一个地址，自动设为默认
    if (count === 0) {
      address.isDefault = 1;
      await this.addressRepository.save(address);
    }

    return address;
  }

  /**
   * 更新地址
   */
  async updateAddress(userId: number, addressId: number, dto: UpdateAddressDto) {
    const address = await this.addressRepository.findOne({
      where: { id: addressId, userId },
    });

    if (!address) {
      throw new BusinessException(ErrorCode.ADDRESS_NOT_FOUND);
    }

    // 如果设置为默认，先取消其他默认地址
    if (dto.isDefault) {
      await this.addressRepository.update(
        { userId },
        { isDefault: 0 },
      );
    }

    if (dto.name !== undefined) {
      address.name = dto.name;
    }
    if (dto.phone !== undefined) {
      address.phone = dto.phone;
    }
    if (dto.province !== undefined) {
      address.province = dto.province || null;
    }
    if (dto.city !== undefined) {
      address.city = dto.city || null;
    }
    if (dto.district !== undefined) {
      address.district = dto.district || null;
    }
    if (dto.detail !== undefined) {
      address.detail = dto.detail;
    }
    if (dto.isDefault !== undefined) {
      address.isDefault = dto.isDefault ? 1 : 0;
    }

    await this.addressRepository.save(address);

    return address;
  }

  /**
   * 删除地址
   */
  async deleteAddress(userId: number, addressId: number) {
    const address = await this.addressRepository.findOne({
      where: { id: addressId, userId },
    });

    if (!address) {
      throw new BusinessException(ErrorCode.ADDRESS_NOT_FOUND);
    }

    const wasDefault = address.isDefault === 1;

    await this.addressRepository.remove(address);

    // 如果删除的是默认地址，将最新的地址设为默认
    if (wasDefault) {
      const latestAddress = await this.addressRepository.findOne({
        where: { userId },
        order: { createdAt: 'DESC' },
      });

      if (latestAddress) {
        latestAddress.isDefault = 1;
        await this.addressRepository.save(latestAddress);
      }
    }

    return { message: '删除成功' };
  }

  /**
   * 设置默认地址
   */
  async setDefaultAddress(userId: number, addressId: number) {
    const address = await this.addressRepository.findOne({
      where: { id: addressId, userId },
    });

    if (!address) {
      throw new BusinessException(ErrorCode.ADDRESS_NOT_FOUND);
    }

    // 先取消所有默认
    await this.addressRepository.update(
      { userId },
      { isDefault: 0 },
    );

    // 设置新默认
    address.isDefault = 1;
    await this.addressRepository.save(address);

    return address;
  }

  /**
   * 脱敏用户信息
   */
  private sanitizeUser(user: User) {
    return {
      id: user.id,
      nickname: user.nickname,
      avatar: user.avatar,
      phone: user.phone,
      realName: user.realName,
      isVerified: user.isVerified,
      agentLevel: user.agentLevel,
      agentStatus: user.agentStatus,
      inviteCode: user.inviteCode,
      balance: user.balance,
      frozenAmount: user.frozenAmount,
      totalIncome: user.totalIncome,
    };
  }
}
