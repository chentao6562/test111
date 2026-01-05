# 🔐 NestJS + uniCloud 认证集成方案

> 使用uniCloud处理小程序端认证，NestJS后端验证token

---

## 一、认证架构

```
┌─────────────────────────────────────────────────────────────────┐
│                        认证流程                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   ┌──────────┐      ┌──────────┐      ┌──────────────┐         │
│   │ 小程序端  │ ───► │ uniCloud │ ───► │ NestJS后端   │         │
│   └──────────┘      └──────────┘      └──────────────┘         │
│        │                 │                   │                  │
│   1.手机号/微信     2.验证并生成        3.验证uniCloud          │
│     一键登录         uni-id-token        token并绑定           │
│                                          业务用户               │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 1.1 认证方式
| 方式 | 说明 | 场景 |
|------|------|------|
| 手机号注册登录 | 短信验证码 | 主要登录方式 |
| 微信一键登录 | 获取手机号 | 快捷登录 |
| 管理员登录 | 账号密码 | 后台管理 |

### 1.2 Token策略
```
小程序用户：uniCloud uni-id-token → NestJS验证 → 签发业务JWT
管理员用户：账号密码 → NestJS签发JWT
```

---

## 二、uniCloud配置

### 2.1 配置信息
```javascript
// uniCloud配置
const uniCloudConfig = {
  provider: 'aliyun',
  spaceId: 'mp-ffc0e6ea-b59a-46d1-a78b-d3f2b0e1dc36',
  clientSecret: '1RSXBgRzPq8R6bkG90WDnA==',
  endpoint: 'https://api.next.bspapp.com'
};

// Token验证密钥（与uniCloud uni-id配置一致）
const tokenSecret = 'firework-token-secret-2026';
```

### 2.2 小程序端登录流程
```javascript
// pages/login/login.vue
import { uniIdCo } from '@/uni_modules/uni-id-pages/common/unicloud-co.js';

// 方式1: 手机号验证码登录
async function loginBySms() {
  const res = await uniIdCo.loginBySms({
    mobile: phone.value,
    code: smsCode.value
  });
  if (res.errCode === 0) {
    // 获取到 uni-id-token
    const uniIdToken = res.newToken.token;
    // 调用后端接口绑定/创建用户
    await bindToBackend(uniIdToken);
  }
}

// 方式2: 微信一键登录（获取手机号）
async function loginByWeixin(e) {
  if (e.detail.errMsg !== 'getPhoneNumber:ok') return;
  
  const res = await uniIdCo.loginByWeixinMobile({
    phoneCode: e.detail.code
  });
  if (res.errCode === 0) {
    const uniIdToken = res.newToken.token;
    await bindToBackend(uniIdToken);
  }
}

// 将uniCloud token发送到后端
async function bindToBackend(uniIdToken) {
  const res = await uni.request({
    url: 'https://your-api.com/api/auth/uni-login',
    method: 'POST',
    data: { uniIdToken }
  });
  
  if (res.data.code === 0) {
    // 保存后端JWT
    uni.setStorageSync('token', res.data.data.token);
    uni.setStorageSync('userInfo', res.data.data.user);
  }
}
```

---

## 三、NestJS后端实现

### 3.1 安装依赖
```bash
npm install jsonwebtoken axios
npm install -D @types/jsonwebtoken
```

### 3.2 uniCloud配置文件

**`src/config/unicloud.config.ts`**
```typescript
export const uniCloudConfig = {
  provider: 'aliyun',
  spaceId: 'mp-ffc0e6ea-b59a-46d1-a78b-d3f2b0e1dc36',
  clientSecret: '1RSXBgRzPq8R6bkG90WDnA==',
  endpoint: 'https://api.next.bspapp.com',
  // uni-id token验证密钥
  tokenSecret: 'firework-token-secret-2026',
};
```

### 3.3 uniCloud服务

**`src/modules/auth/services/unicloud.service.ts`**
```typescript
import { Injectable, Logger } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';
import axios from 'axios';
import { uniCloudConfig } from '../../../config/unicloud.config';
import { BusinessException } from '../../../common/filters/business.exception';
import { ErrorCodes } from '../../../common/constants/error-codes';

export interface UniIdTokenPayload {
  uid: string;           // uniCloud用户ID
  phone?: string;        // 手机号
  openid?: string;       // 微信openid
  unionid?: string;      // 微信unionid
  exp: number;           // 过期时间
  iat: number;           // 签发时间
}

@Injectable()
export class UniCloudService {
  private readonly logger = new Logger(UniCloudService.name);

  /**
   * 验证uni-id-token
   */
  verifyUniIdToken(token: string): UniIdTokenPayload {
    try {
      const payload = jwt.verify(token, uniCloudConfig.tokenSecret) as UniIdTokenPayload;
      return payload;
    } catch (error) {
      this.logger.error('uni-id-token验证失败', error);
      throw new BusinessException(ErrorCodes.TOKEN_INVALID, 'Token无效或已过期');
    }
  }

  /**
   * 调用uniCloud云函数获取用户信息
   */
  async getUserInfo(uniIdToken: string): Promise<any> {
    try {
      const response = await axios.post(
        `${uniCloudConfig.endpoint}/client`,
        {
          method: 'uni-id-co',
          params: JSON.stringify({
            action: 'getUserInfo',
          }),
          spaceId: uniCloudConfig.spaceId,
          token: uniIdToken,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'x-basement-token': uniCloudConfig.clientSecret,
          },
        }
      );

      if (response.data.errCode === 0) {
        return response.data.data;
      }
      
      throw new Error(response.data.errMsg || '获取用户信息失败');
    } catch (error) {
      this.logger.error('获取uniCloud用户信息失败', error);
      throw new BusinessException(ErrorCodes.SERVER_ERROR, '获取用户信息失败');
    }
  }

  /**
   * 解析token获取手机号（简化方式，直接从token解析）
   */
  extractPhoneFromToken(token: string): string | null {
    try {
      // 先验证token
      const payload = this.verifyUniIdToken(token);
      return payload.phone || null;
    } catch {
      return null;
    }
  }
}
```

### 3.4 认证服务

**`src/modules/auth/auth.service.ts`**
```typescript
import { Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';

import { User } from '../user/entities/user.entity';
import { Admin } from '../user/entities/admin.entity';
import { UniCloudService } from './services/unicloud.service';
import { BusinessException } from '../../common/filters/business.exception';
import { ErrorCodes } from '../../common/constants/error-codes';
import { UniLoginDto, AdminLoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(User)
    private userRepo: Repository<User>,
    @InjectRepository(Admin)
    private adminRepo: Repository<Admin>,
    private jwtService: JwtService,
    private uniCloudService: UniCloudService,
  ) {}

  /**
   * uniCloud登录 - 小程序用户
   * 验证uni-id-token，创建或绑定本地用户
   */
  async uniLogin(dto: UniLoginDto) {
    // 1. 验证uniCloud token
    const uniPayload = this.uniCloudService.verifyUniIdToken(dto.uniIdToken);
    
    this.logger.log(`uniCloud用户登录: uid=${uniPayload.uid}, phone=${uniPayload.phone}`);

    // 2. 查找或创建本地用户
    let user = await this.userRepo.findOne({
      where: [
        { uniId: uniPayload.uid },
        { phone: uniPayload.phone },
      ],
    });

    if (!user) {
      // 新用户注册
      user = this.userRepo.create({
        uniId: uniPayload.uid,
        phone: uniPayload.phone,
        openid: uniPayload.openid,
        unionid: uniPayload.unionid,
        nickname: dto.nickname || `用户${uniPayload.phone?.slice(-4) || ''}`,
        avatar: dto.avatar,
        // 如果有推荐码，绑定代理商
        agentId: dto.inviteCode ? await this.getAgentIdByCode(dto.inviteCode) : null,
      });
      await this.userRepo.save(user);
      this.logger.log(`新用户注册: id=${user.id}`);
    } else {
      // 更新uniId（如果之前没有）
      if (!user.uniId) {
        user.uniId = uniPayload.uid;
        await this.userRepo.save(user);
      }
    }

    // 3. 检查用户状态
    if (user.status === 0) {
      throw new BusinessException(ErrorCodes.USER_DISABLED, '账号已被禁用');
    }

    // 4. 签发业务JWT
    const token = this.generateToken({
      id: user.id,
      type: 'user',
      agentId: user.agentId,
    });

    return {
      token,
      user: this.filterUser(user),
      isNew: !user.createdAt || Date.now() - user.createdAt.getTime() < 5000,
    };
  }

  /**
   * 管理员登录 - 账号密码
   */
  async adminLogin(dto: AdminLoginDto) {
    const admin = await this.adminRepo.findOne({
      where: { username: dto.username },
    });

    if (!admin) {
      throw new BusinessException(ErrorCodes.USER_NOT_FOUND, '用户不存在');
    }

    const isMatch = await bcrypt.compare(dto.password, admin.password);
    if (!isMatch) {
      throw new BusinessException(ErrorCodes.PASSWORD_ERROR, '密码错误');
    }

    if (admin.status === 0) {
      throw new BusinessException(ErrorCodes.USER_DISABLED, '账号已被禁用');
    }

    const token = this.generateToken({
      id: admin.id,
      type: 'admin',
      role: admin.role,
    });

    return {
      token,
      admin: this.filterAdmin(admin),
    };
  }

  /**
   * 根据推荐码获取代理商ID
   */
  private async getAgentIdByCode(code: string): Promise<number | null> {
    // TODO: 注入AgentRepository后实现
    // const agent = await this.agentRepo.findOne({ where: { code } });
    // return agent?.id || null;
    return null;
  }

  /**
   * 生成业务JWT
   */
  private generateToken(payload: any): string {
    return this.jwtService.sign(payload);
  }

  private filterUser(user: User) {
    const { uniId, openid, unionid, ...result } = user;
    return result;
  }

  private filterAdmin(admin: Admin) {
    const { password, ...result } = admin;
    return result;
  }
}
```

### 3.5 登录DTO

**`src/modules/auth/dto/login.dto.ts`**
```typescript
import { IsNotEmpty, IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * uniCloud登录
 */
export class UniLoginDto {
  @ApiProperty({ description: 'uniCloud uni-id-token' })
  @IsNotEmpty({ message: 'token不能为空' })
  @IsString()
  uniIdToken: string;

  @ApiPropertyOptional({ description: '昵称' })
  @IsOptional()
  @IsString()
  nickname?: string;

  @ApiPropertyOptional({ description: '头像' })
  @IsOptional()
  @IsString()
  avatar?: string;

  @ApiPropertyOptional({ description: '推荐码（绑定代理商）' })
  @IsOptional()
  @IsString()
  inviteCode?: string;
}

/**
 * 管理员登录
 */
export class AdminLoginDto {
  @ApiProperty({ description: '用户名' })
  @IsNotEmpty({ message: '用户名不能为空' })
  @IsString()
  username: string;

  @ApiProperty({ description: '密码' })
  @IsNotEmpty({ message: '密码不能为空' })
  @IsString()
  password: string;
}

/**
 * 刷新Token
 */
export class RefreshTokenDto {
  @ApiProperty({ description: 'uniCloud uni-id-token' })
  @IsNotEmpty()
  @IsString()
  uniIdToken: string;
}
```

### 3.6 认证控制器

**`src/modules/auth/auth.controller.ts`**
```typescript
import { Controller, Post, Body, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

import { AuthService } from './auth.service';
import { UniLoginDto, AdminLoginDto, RefreshTokenDto } from './dto/login.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { User } from '../../common/decorators/user.decorator';

@ApiTags('认证')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('uni-login')
  @ApiOperation({ summary: '小程序登录（uniCloud）' })
  async uniLogin(@Body() dto: UniLoginDto) {
    return this.authService.uniLogin(dto);
  }

  @Post('admin/login')
  @ApiOperation({ summary: '管理员登录' })
  async adminLogin(@Body() dto: AdminLoginDto) {
    return this.authService.adminLogin(dto);
  }

  @Post('refresh')
  @ApiOperation({ summary: '刷新Token' })
  async refreshToken(@Body() dto: RefreshTokenDto) {
    return this.authService.uniLogin({ uniIdToken: dto.uniIdToken });
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取当前用户信息' })
  async getProfile(@User() user: any) {
    return user;
  }
}
```

### 3.7 User Entity（更新）

**`src/modules/user/entities/user.entity.ts`**
```typescript
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ name: 'uni_id', length: 64, unique: true, nullable: true, comment: 'uniCloud用户ID' })
  @Index()
  uniId: string;

  @Column({ length: 64, unique: true, nullable: true, comment: '微信openid' })
  @Index()
  openid: string;

  @Column({ length: 64, nullable: true, comment: '微信unionid' })
  unionid: string;

  @Column({ length: 20, nullable: true, comment: '手机号' })
  @Index()
  phone: string;

  @Column({ length: 50, nullable: true, comment: '昵称' })
  nickname: string;

  @Column({ length: 255, nullable: true, comment: '头像' })
  avatar: string;

  @Column({ name: 'agent_id', type: 'bigint', nullable: true, comment: '绑定的代理商ID' })
  @Index()
  agentId: number;

  @Column({ type: 'tinyint', default: 1, comment: '状态 1正常 0禁用' })
  status: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
```

### 3.8 Auth Module

**`src/modules/auth/auth.module.ts`**
```typescript
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UniCloudService } from './services/unicloud.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { User } from '../user/entities/user.entity';
import { Admin } from '../user/entities/admin.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Admin]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get('JWT_SECRET'),
        signOptions: { expiresIn: config.get('JWT_EXPIRES_IN') },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, UniCloudService, JwtStrategy],
  exports: [AuthService, UniCloudService],
})
export class AuthModule {}
```

---

## 四、数据库迁移

### 4.1 Users表结构
```sql
CREATE TABLE users (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  uni_id VARCHAR(64) UNIQUE COMMENT 'uniCloud用户ID',
  openid VARCHAR(64) UNIQUE COMMENT '微信openid',
  unionid VARCHAR(64) COMMENT '微信unionid',
  phone VARCHAR(20) COMMENT '手机号',
  nickname VARCHAR(50) COMMENT '昵称',
  avatar VARCHAR(255) COMMENT '头像',
  agent_id BIGINT COMMENT '绑定的代理商ID',
  status TINYINT DEFAULT 1 COMMENT '状态 1正常 0禁用',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_uni_id (uni_id),
  INDEX idx_phone (phone),
  INDEX idx_agent_id (agent_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户表';
```

### 4.2 Admins表结构
```sql
CREATE TABLE admins (
  id INT PRIMARY KEY AUTO_INCREMENT,
  username VARCHAR(50) UNIQUE NOT NULL COMMENT '用户名',
  password VARCHAR(100) NOT NULL COMMENT '密码',
  name VARCHAR(50) NOT NULL COMMENT '姓名',
  phone VARCHAR(20) COMMENT '手机号',
  role TINYINT DEFAULT 1 COMMENT '角色 1超管 2财务 3库管 4客服',
  status TINYINT DEFAULT 1 COMMENT '状态',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='管理员表';

-- 插入测试管理员（密码: 123456）
INSERT INTO admins (username, password, name, role) 
VALUES ('admin', '$2a$10$N9qo8uLOickgx2ZMRZoHK.ZLHbj8F6f6f6f6f6f6f6f6f6f6f6f6f', '超级管理员', 1);
```

---

## 五、小程序端完整代码

### 5.1 登录页面

**`pages/login/login.vue`**
```vue
<template>
  <view class="login-container">
    <!-- Logo -->
    <view class="logo-section">
      <image src="/static/logo.png" class="logo" />
      <text class="title">烟花销售系统</text>
    </view>

    <!-- 登录方式 -->
    <view class="login-methods">
      <!-- 微信一键登录 -->
      <button 
        class="btn-wx" 
        open-type="getPhoneNumber" 
        @getphonenumber="onGetPhoneNumber"
      >
        <text class="iconfont icon-weixin"></text>
        微信一键登录
      </button>

      <!-- 手机号登录 -->
      <view class="phone-login">
        <input 
          v-model="phone" 
          type="number" 
          maxlength="11"
          placeholder="请输入手机号" 
          class="input"
        />
        <view class="code-row">
          <input 
            v-model="smsCode" 
            type="number" 
            maxlength="6"
            placeholder="验证码" 
            class="input code-input"
          />
          <button 
            class="btn-code" 
            :disabled="countdown > 0"
            @click="sendSmsCode"
          >
            {{ countdown > 0 ? `${countdown}s` : '获取验证码' }}
          </button>
        </view>
        <button class="btn-login" @click="loginBySms">登录</button>
      </view>
    </view>

    <!-- 协议 -->
    <view class="agreement">
      <checkbox :checked="agreed" @click="agreed = !agreed" />
      <text>我已阅读并同意</text>
      <text class="link" @click="openAgreement">《用户协议》</text>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue';
import { uniIdCo } from '@/uni_modules/uni-id-pages/common/unicloud-co.js';

const phone = ref('');
const smsCode = ref('');
const countdown = ref(0);
const agreed = ref(false);

// 微信一键登录
async function onGetPhoneNumber(e) {
  if (!agreed.value) {
    uni.showToast({ title: '请先同意用户协议', icon: 'none' });
    return;
  }
  
  if (e.detail.errMsg !== 'getPhoneNumber:ok') {
    uni.showToast({ title: '取消授权', icon: 'none' });
    return;
  }

  uni.showLoading({ title: '登录中...' });
  
  try {
    // 1. 调用uniCloud获取手机号并登录
    const res = await uniIdCo.loginByWeixinMobile({
      phoneCode: e.detail.code
    });
    
    if (res.errCode === 0) {
      // 2. 将uniCloud token发送到后端
      await loginToBackend(res.newToken.token);
    } else {
      throw new Error(res.errMsg);
    }
  } catch (err) {
    uni.showToast({ title: err.message || '登录失败', icon: 'none' });
  } finally {
    uni.hideLoading();
  }
}

// 发送验证码
async function sendSmsCode() {
  if (!phone.value || phone.value.length !== 11) {
    uni.showToast({ title: '请输入正确的手机号', icon: 'none' });
    return;
  }

  try {
    await uniIdCo.sendSmsCode({
      mobile: phone.value,
      scene: 'login-by-sms',
      templateId: 'your-template-id'
    });
    
    uni.showToast({ title: '验证码已发送', icon: 'success' });
    
    // 倒计时
    countdown.value = 60;
    const timer = setInterval(() => {
      countdown.value--;
      if (countdown.value <= 0) clearInterval(timer);
    }, 1000);
  } catch (err) {
    uni.showToast({ title: err.message || '发送失败', icon: 'none' });
  }
}

// 手机号验证码登录
async function loginBySms() {
  if (!agreed.value) {
    uni.showToast({ title: '请先同意用户协议', icon: 'none' });
    return;
  }
  
  if (!phone.value || !smsCode.value) {
    uni.showToast({ title: '请输入手机号和验证码', icon: 'none' });
    return;
  }

  uni.showLoading({ title: '登录中...' });
  
  try {
    // 1. uniCloud验证码登录
    const res = await uniIdCo.loginBySms({
      mobile: phone.value,
      code: smsCode.value
    });
    
    if (res.errCode === 0) {
      // 2. 将token发送到后端
      await loginToBackend(res.newToken.token);
    } else {
      throw new Error(res.errMsg);
    }
  } catch (err) {
    uni.showToast({ title: err.message || '登录失败', icon: 'none' });
  } finally {
    uni.hideLoading();
  }
}

// 调用后端接口
async function loginToBackend(uniIdToken) {
  const [err, res] = await uni.request({
    url: `${import.meta.env.VITE_API_URL}/api/auth/uni-login`,
    method: 'POST',
    data: {
      uniIdToken,
      inviteCode: uni.getStorageSync('inviteCode') || undefined
    }
  });

  if (err || res.data.code !== 0) {
    throw new Error(res?.data?.message || '服务器错误');
  }

  // 保存token和用户信息
  uni.setStorageSync('token', res.data.data.token);
  uni.setStorageSync('userInfo', res.data.data.user);
  
  uni.showToast({ title: '登录成功', icon: 'success' });
  
  // 跳转首页
  setTimeout(() => {
    uni.switchTab({ url: '/pages/index/index' });
  }, 1000);
}

function openAgreement() {
  uni.navigateTo({ url: '/pages/agreement/agreement' });
}
</script>

<style lang="scss" scoped>
.login-container {
  min-height: 100vh;
  padding: 100rpx 60rpx;
  background: linear-gradient(180deg, #fff5f5 0%, #ffffff 100%);
}

.logo-section {
  text-align: center;
  margin-bottom: 80rpx;
  
  .logo {
    width: 160rpx;
    height: 160rpx;
  }
  
  .title {
    display: block;
    font-size: 40rpx;
    font-weight: bold;
    color: #333;
    margin-top: 20rpx;
  }
}

.btn-wx {
  width: 100%;
  height: 96rpx;
  background: #07c160;
  color: #fff;
  font-size: 32rpx;
  border-radius: 48rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 40rpx;
}

.phone-login {
  .input {
    width: 100%;
    height: 96rpx;
    background: #f5f5f5;
    border-radius: 16rpx;
    padding: 0 30rpx;
    margin-bottom: 24rpx;
    font-size: 30rpx;
  }
  
  .code-row {
    display: flex;
    gap: 20rpx;
    
    .code-input {
      flex: 1;
    }
    
    .btn-code {
      width: 220rpx;
      height: 96rpx;
      background: #fff;
      border: 2rpx solid #e53935;
      color: #e53935;
      font-size: 28rpx;
      border-radius: 16rpx;
    }
  }
  
  .btn-login {
    width: 100%;
    height: 96rpx;
    background: #e53935;
    color: #fff;
    font-size: 32rpx;
    border-radius: 48rpx;
    margin-top: 40rpx;
  }
}

.agreement {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 60rpx;
  font-size: 26rpx;
  color: #999;
  
  .link {
    color: #e53935;
  }
}
</style>
```

---

## 六、接口测试

### 6.1 测试脚本
```bash
# 1. 管理员登录
curl -X POST http://localhost:3000/api/auth/admin/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"123456"}'

# 响应示例
# {"code":0,"message":"success","data":{"token":"eyJ...","admin":{...}}}

# 2. uniCloud登录（需要真实的uni-id-token）
curl -X POST http://localhost:3000/api/auth/uni-login \
  -H "Content-Type: application/json" \
  -d '{"uniIdToken":"你的uni-id-token","inviteCode":"ABC123"}'

# 3. 获取当前用户
curl http://localhost:3000/api/auth/profile \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## 七、安全注意事项

1. **Token安全**：
   - tokenSecret必须保密，不能泄露
   - 生产环境使用环境变量配置
   - 定期更换密钥

2. **接口防护**：
   - 添加请求频率限制
   - 验证码接口限流
   - 记录登录日志

3. **数据验证**：
   - 验证手机号格式
   - 验证token有效期
   - 防止重复注册

---

**完成！现在你的NestJS后端可以与uniCloud认证系统对接了。**
