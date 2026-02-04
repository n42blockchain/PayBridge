import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ethers } from 'ethers';
import { BlockchainService } from './blockchain.service';
import { WalletCryptoService } from '../wallet/wallet-crypto.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TransactionService {
  private readonly logger = new Logger(TransactionService.name);
  private readonly tokenAddress: string;
  private readonly tokenDecimals: number;

  constructor(
    private configService: ConfigService,
    private blockchainService: BlockchainService,
    private walletCrypto: WalletCryptoService,
    private prisma: PrismaService,
  ) {
    this.tokenAddress = this.configService.get<string>('TOKEN_CONTRACT_ADDRESS', '');
    this.tokenDecimals = this.configService.get<number>('TOKEN_DECIMALS', 18);
  }

  /**
   * Send native token (e.g., ETH) from a wallet
   */
  async sendNative(
    fromWalletId: string,
    toAddress: string,
    amount: bigint,
  ): Promise<string> {
    const wallet = await this.prisma.wallet.findUnique({
      where: { id: fromWalletId },
    });

    if (!wallet) {
      throw new Error('Wallet not found');
    }

    const signer = this.walletCrypto.getWallet(
      wallet.encryptedPrivateKey,
      wallet.address,
    );
    const connectedSigner = signer.connect(this.blockchainService.getProvider());

    const tx = await connectedSigner.sendTransaction({
      to: toAddress,
      value: amount,
    });

    this.logger.log(`Native transfer sent: ${tx.hash}`);
    return tx.hash;
  }

  /**
   * Send ERC20 token from a wallet
   */
  async sendToken(
    fromWalletId: string,
    toAddress: string,
    amount: bigint,
  ): Promise<string> {
    const wallet = await this.prisma.wallet.findUnique({
      where: { id: fromWalletId },
    });

    if (!wallet) {
      throw new Error('Wallet not found');
    }

    const signer = this.walletCrypto.getWallet(
      wallet.encryptedPrivateKey,
      wallet.address,
    );
    const connectedSigner = signer.connect(this.blockchainService.getProvider());

    // ERC20 transfer ABI
    const erc20Abi = ['function transfer(address to, uint256 amount) returns (bool)'];
    const tokenContract = new ethers.Contract(
      this.tokenAddress,
      erc20Abi,
      connectedSigner,
    );

    const tx = await tokenContract.transfer(toAddress, amount);
    this.logger.log(`Token transfer sent: ${tx.hash}`);
    return tx.hash;
  }
}
