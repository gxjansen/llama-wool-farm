import crypto from 'crypto';
import { promisify } from 'util';
import { GameSave } from '../types/game.types';

export interface EncryptedData {
  encrypted: string;
  salt: string;
  iv: string;
  tag: string;
}

export interface HashedData {
  hash: string;
  salt: string;
}

export interface EncryptedGameState extends EncryptedData {
  checksum: string;
  version: string;
  timestamp: number;
}

export class EncryptionService {
  private readonly algorithm = 'aes-256-gcm';
  private readonly keyDerivationIterations = 100000;
  private readonly saltLength = 32;
  private readonly ivLength = 16;
  private readonly tagLength = 16;
  private readonly hashAlgorithm = 'sha256';

  /**
   * Encrypt sensitive data using AES-256-GCM
   */
  async encrypt(plaintext: string, password: string): Promise<EncryptedData> {
    if (!plaintext || !password) {
      throw new Error('Plaintext and password are required');
    }

    const salt = crypto.randomBytes(this.saltLength);
    const iv = crypto.randomBytes(this.ivLength);
    
    // Derive key from password using PBKDF2
    const key = await promisify(crypto.pbkdf2)(
      password,
      salt,
      this.keyDerivationIterations,
      32,
      this.hashAlgorithm
    );
    
    // Encrypt using AES-256-GCM
    const cipher = crypto.createCipherGCM(this.algorithm, key, iv);
    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const tag = cipher.getAuthTag();
    
    return {
      encrypted,
      salt: salt.toString('hex'),
      iv: iv.toString('hex'),
      tag: tag.toString('hex')
    };
  }

  /**
   * Decrypt sensitive data using AES-256-GCM
   */
  async decrypt(encryptedData: EncryptedData, password: string): Promise<string> {
    if (!encryptedData || !password) {
      throw new Error('Encrypted data and password are required');
    }

    const salt = Buffer.from(encryptedData.salt, 'hex');
    const iv = Buffer.from(encryptedData.iv, 'hex');
    const tag = Buffer.from(encryptedData.tag, 'hex');
    
    // Derive key from password using PBKDF2
    const key = await promisify(crypto.pbkdf2)(
      password,
      salt,
      this.keyDerivationIterations,
      32,
      this.hashAlgorithm
    );
    
    // Decrypt using AES-256-GCM
    const decipher = crypto.createDecipherGCM(this.algorithm, key, iv);
    decipher.setAuthTag(tag);
    
    let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }

  /**
   * Generate secure checksum for game state integrity
   */
  generateStateChecksum(gameState: GameSave): string {
    // Create deterministic string representation
    const stateString = this.serializeGameState(gameState);
    return crypto.createHash(this.hashAlgorithm)
      .update(stateString)
      .digest('hex');
  }

  /**
   * Verify game state integrity using checksum
   */
  verifyStateIntegrity(gameState: GameSave, expectedChecksum: string): boolean {
    const actualChecksum = this.generateStateChecksum(gameState);
    return crypto.timingSafeEqual(
      Buffer.from(actualChecksum, 'hex'),
      Buffer.from(expectedChecksum, 'hex')
    );
  }

  /**
   * Generate cryptographically secure random token
   */
  generateSecureToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Generate secure random UUID
   */
  generateSecureUUID(): string {
    return crypto.randomUUID();
  }

  /**
   * Hash sensitive data with salt
   */
  async hashWithSalt(data: string, salt?: string): Promise<HashedData> {
    if (!salt) {
      salt = crypto.randomBytes(32).toString('hex');
    }
    
    const hash = crypto.createHash(this.hashAlgorithm)
      .update(data + salt)
      .digest('hex');
    
    return { hash, salt };
  }

  /**
   * Verify hashed data
   */
  async verifyHash(data: string, hashedData: HashedData): Promise<boolean> {
    const { hash: expectedHash } = await this.hashWithSalt(data, hashedData.salt);
    return crypto.timingSafeEqual(
      Buffer.from(expectedHash, 'hex'),
      Buffer.from(hashedData.hash, 'hex')
    );
  }

  /**
   * Create HMAC for message authentication
   */
  createHMAC(data: string, secret: string): string {
    return crypto.createHmac(this.hashAlgorithm, secret)
      .update(data)
      .digest('hex');
  }

  /**
   * Verify HMAC
   */
  verifyHMAC(data: string, secret: string, expectedHMAC: string): boolean {
    const actualHMAC = this.createHMAC(data, secret);
    return crypto.timingSafeEqual(
      Buffer.from(actualHMAC, 'hex'),
      Buffer.from(expectedHMAC, 'hex')
    );
  }

  /**
   * Encrypt game state with versioning and integrity checks
   */
  async encryptGameState(gameState: GameSave, userKey: string): Promise<EncryptedGameState> {
    // Generate checksum first
    const checksum = this.generateStateChecksum(gameState);
    
    // Serialize game state
    const stateJson = JSON.stringify(gameState);
    
    // Encrypt the serialized state
    const encryptedData = await this.encrypt(stateJson, userKey);
    
    return {
      ...encryptedData,
      checksum,
      version: gameState.version,
      timestamp: gameState.timestamp
    };
  }

  /**
   * Decrypt game state with integrity verification
   */
  async decryptGameState(encryptedState: EncryptedGameState, userKey: string): Promise<GameSave> {
    // Decrypt the state
    const decryptedJson = await this.decrypt(encryptedState, userKey);
    const gameState = JSON.parse(decryptedJson) as GameSave;
    
    // Verify integrity
    if (!this.verifyStateIntegrity(gameState, encryptedState.checksum)) {
      throw new Error('Game state integrity verification failed');
    }
    
    // Verify version matches
    if (gameState.version !== encryptedState.version) {
      throw new Error('Game state version mismatch');
    }
    
    // Verify timestamp matches
    if (gameState.timestamp !== encryptedState.timestamp) {
      throw new Error('Game state timestamp mismatch');
    }
    
    return gameState;
  }

  /**
   * Create encryption key from user credentials
   */
  async deriveUserKey(userId: string, userSalt: string): Promise<string> {
    const baseKey = process.env.ENCRYPTION_KEY;
    if (!baseKey) {
      throw new Error('Base encryption key not configured');
    }
    
    const derivedKey = await promisify(crypto.pbkdf2)(
      baseKey,
      userSalt,
      this.keyDerivationIterations,
      32,
      this.hashAlgorithm
    );
    
    return derivedKey.toString('hex');
  }

  /**
   * Generate user-specific salt
   */
  async generateUserSalt(userId: string): Promise<string> {
    const masterSalt = process.env.MASTER_SALT;
    if (!masterSalt) {
      throw new Error('Master salt not configured');
    }
    
    return crypto.createHash(this.hashAlgorithm)
      .update(userId + masterSalt)
      .digest('hex');
  }

  /**
   * Create secure hash for passwords (use with Argon2 in production)
   */
  async hashPassword(password: string): Promise<string> {
    const salt = crypto.randomBytes(32);
    const hash = await promisify(crypto.pbkdf2)(
      password,
      salt,
      this.keyDerivationIterations,
      64,
      this.hashAlgorithm
    );
    
    return salt.toString('hex') + ':' + hash.toString('hex');
  }

  /**
   * Verify password hash
   */
  async verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
    const [saltHex, hashHex] = hashedPassword.split(':');
    if (!saltHex || !hashHex) {
      return false;
    }
    
    const salt = Buffer.from(saltHex, 'hex');
    const hash = Buffer.from(hashHex, 'hex');
    
    const derivedHash = await promisify(crypto.pbkdf2)(
      password,
      salt,
      this.keyDerivationIterations,
      64,
      this.hashAlgorithm
    );
    
    return crypto.timingSafeEqual(hash, derivedHash);
  }

  /**
   * Encrypt data for transmission
   */
  async encryptForTransmission(data: any, sessionKey: string): Promise<string> {
    const jsonData = JSON.stringify(data);
    const encrypted = await this.encrypt(jsonData, sessionKey);
    return Buffer.from(JSON.stringify(encrypted)).toString('base64');
  }

  /**
   * Decrypt data from transmission
   */
  async decryptFromTransmission(encryptedData: string, sessionKey: string): Promise<any> {
    const encryptedJson = Buffer.from(encryptedData, 'base64').toString('utf8');
    const encrypted = JSON.parse(encryptedJson) as EncryptedData;
    const decryptedJson = await this.decrypt(encrypted, sessionKey);
    return JSON.parse(decryptedJson);
  }

  /**
   * Generate secure session key
   */
  generateSessionKey(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Create digital signature
   */
  signData(data: string, privateKey: string): string {
    const sign = crypto.createSign('SHA256');
    sign.update(data);
    return sign.sign(privateKey, 'hex');
  }

  /**
   * Verify digital signature
   */
  verifySignature(data: string, signature: string, publicKey: string): boolean {
    const verify = crypto.createVerify('SHA256');
    verify.update(data);
    return verify.verify(publicKey, signature, 'hex');
  }

  /**
   * Serialize game state deterministically for checksums
   */
  private serializeGameState(gameState: GameSave): string {
    // Create a deterministic string representation
    const sortedKeys = Object.keys(gameState).sort();
    const orderedState: Record<string, any> = {};
    
    for (const key of sortedKeys) {
      const value = gameState[key as keyof GameSave];
      if (typeof value === 'object' && value !== null) {
        orderedState[key] = this.sortObjectKeys(value);
      } else {
        orderedState[key] = value;
      }
    }
    
    return JSON.stringify(orderedState);
  }

  /**
   * Sort object keys recursively for deterministic serialization
   */
  private sortObjectKeys(obj: any): any {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }
    
    if (Array.isArray(obj)) {
      return obj.map(item => this.sortObjectKeys(item));
    }
    
    const sorted: Record<string, any> = {};
    const keys = Object.keys(obj).sort();
    
    for (const key of keys) {
      sorted[key] = this.sortObjectKeys(obj[key]);
    }
    
    return sorted;
  }

  /**
   * Constant-time string comparison
   */
  constantTimeCompare(a: string, b: string): boolean {
    if (a.length !== b.length) {
      return false;
    }
    
    return crypto.timingSafeEqual(
      Buffer.from(a, 'utf8'),
      Buffer.from(b, 'utf8')
    );
  }

  /**
   * Generate cryptographically secure random number
   */
  generateSecureRandom(min: number = 0, max: number = 1): number {
    const range = max - min;
    const randomBytes = crypto.randomBytes(4);
    const randomValue = randomBytes.readUInt32BE(0) / 0xFFFFFFFF;
    return min + (randomValue * range);
  }

  /**
   * Create key derivation for different purposes
   */
  async deriveKey(baseKey: string, salt: string, info: string, length: number = 32): Promise<Buffer> {
    // Using HKDF for key derivation
    const prk = crypto.createHmac('sha256', salt).update(baseKey).digest();
    const infoBuffer = Buffer.from(info, 'utf8');
    const lengthBuffer = Buffer.from([length]);
    
    const okm = crypto.createHmac('sha256', prk)
      .update(infoBuffer)
      .update(lengthBuffer)
      .digest();
    
    return okm.slice(0, length);
  }

  /**
   * Secure memory cleanup (limited in Node.js)
   */
  secureMemoryCleanup(sensitiveData: string): void {
    // In Node.js, we can't directly zero memory, but we can overwrite variables
    // This is more of a hint to the garbage collector
    const overwrite = crypto.randomBytes(sensitiveData.length).toString('hex');
    sensitiveData = overwrite;
  }
}