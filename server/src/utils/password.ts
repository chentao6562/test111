import bcrypt from 'bcryptjs';

// 加密轮数
const SALT_ROUNDS = 10;

/**
 * 对密码进行哈希加密
 * @param password 明文密码
 * @returns 加密后的哈希值
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(SALT_ROUNDS);
  return bcrypt.hash(password, salt);
}

/**
 * 比较密码是否匹配
 * @param password 明文密码
 * @param hash 加密后的哈希值
 * @returns 是否匹配
 */
export async function comparePassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * 同步版本的密码加密（用于seed等场景）
 * @param password 明文密码
 * @returns 加密后的哈希值
 */
export function hashPasswordSync(password: string): string {
  const salt = bcrypt.genSaltSync(SALT_ROUNDS);
  return bcrypt.hashSync(password, salt);
}

/**
 * 同步版本的密码比较
 * @param password 明文密码
 * @param hash 加密后的哈希值
 * @returns 是否匹配
 */
export function comparePasswordSync(password: string, hash: string): boolean {
  return bcrypt.compareSync(password, hash);
}

export default {
  hashPassword,
  comparePassword,
  hashPasswordSync,
  comparePasswordSync,
};
