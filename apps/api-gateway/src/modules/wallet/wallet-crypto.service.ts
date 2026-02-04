import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ethers } from 'ethers';
import { encrypt, decrypt, deriveKey } from '@paybridge/shared-utils';

@Injectable()
export class WalletCryptoService {
  private readonly logger = new Logger(WalletCryptoService.name);
  private readonly masterKey: string;

  constructor(private configService: ConfigService) {
    const masterKey = this.configService.get<string>('WALLET_MASTER_KEY_V1');
    if (!masterKey) {
      this.logger.error('WALLET_MASTER_KEY_V1 is not configured');
      throw new Error('WALLET_MASTER_KEY_V1 environment variable is required');
    }
    this.masterKey = masterKey;
  }

  /**
   * Generate a new wallet
   */
  generateWallet(): { address: string; privateKey: string } {
    const wallet = ethers.Wallet.createRandom();
    return {
      address: wallet.address,
      privateKey: wallet.privateKey,
    };
  }

  /**
   * Encrypt private key for storage
   */
  encryptPrivateKey(privateKey: string, walletAddress: string): string {
    // Derive a unique key for this wallet using HKDF
    const derivedKey = deriveKey(this.masterKey, walletAddress);
    return encrypt(privateKey, derivedKey);
  }

  /**
   * Decrypt private key for use
   */
  decryptPrivateKey(encryptedKey: string, walletAddress: string): string {
    const derivedKey = deriveKey(this.masterKey, walletAddress);
    return decrypt(encryptedKey, derivedKey);
  }

  /**
   * Get wallet instance from encrypted private key
   */
  getWallet(encryptedKey: string, walletAddress: string): ethers.Wallet {
    const privateKey = this.decryptPrivateKey(encryptedKey, walletAddress);
    return new ethers.Wallet(privateKey);
  }
}
