# 3xpch4in Network Automation Tool

## Overview

The 3xpch4in Network Automation Tool is a comprehensive automation solution designed for interacting with the 3xpch4in Testnet. This tool automates various blockchain operations including faucet claims using Discord authentication, token transfers, smart contract deployment, ERC20 token creation, and NFT collection management.

## Features

- **Faucet Claims**: Automatic claiming of testnet tokens using Discord authentication
- **Balance Verification**: Verification that claimed tokens are received before proceeding
- **Token Transfers**: Configurable self-transfers to keep wallets active
- **Smart Contract Deployment**: Deploy and interact with sample smart contracts
- **ERC20 Token Management**: Create, deploy, mint, and burn custom ERC20 tokens
- **NFT Collection Management**: Create NFT collections, mint NFTs with metadata, and burn tokens
- **Proxy Support**: Rotate through HTTP proxies for distributed operations
- **Gas Price Optimization**: Automatic gas price calculation with retry mechanisms
- **Random Delays**: Configurable random delays between transactions to mimic human behavior
- **Detailed Logging**: Comprehensive color-coded console output for tracking operations

## Requirements

- Node.js 16.x or higher
- NPM 6.x or higher
- Discord tokens for faucet authentication
- Private keys for wallets

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/Usernameusernamenotavailbleisnot/3xpch4in.git
   cd 3xpch4in
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Add your private keys to `pk.txt`, one per line:
   ```
   0x1234567890abcdef...
   0x9876543210abcdef...
   ```

4. Add your Discord tokens to `tokens.txt`, one per line (corresponding to each private key):
   ```
   Dis.cord.token.here
   Another.discord.token
   ```

5. (Optional) Add HTTP proxies to `proxy.txt`, one per line:
   ```
   http://username:password@ip:port
   http://username:password@ip:port
   ```

6. Configure the tool by editing `config.json` (see Configuration section below)

## Configuration

The tool is configured through the `config.json` file. Here's an explanation of the main configuration options:

```json
{
  "enable_transfer": true,                // Enable/disable token transfers
  "enable_contract_deploy": true,         // Enable/disable smart contract deployment
  "gas_price_multiplier": 1.2,            // Gas price multiplier for faster confirmations
  "max_retries": 5,                       // Maximum retry attempts for failed operations
  "base_wait_time": 10,                   // Base wait time between retries (seconds)
  "transfer_amount_percentage": 90,       // Percentage of balance to transfer in self-transfers
  "transfer_count": {                     // Number of self-transfers to perform
    "min": 1,
    "max": 3
  },
  "delay": {                              // Random delay between transactions
    "min_seconds": 5,
    "max_seconds": 30
  },
  "contract": {
    "contract_interactions": {
      "enabled": true,
      "count": {                          // Number of interactions to perform
        "min": 3,
        "max": 8
      },
      "types": ["setValue", "increment", "decrement", "reset", "contribute"]
    }
  },
  "erc20": {
    "enable_erc20": true,
    "mint_amount": {                      // Range for token minting amounts
      "min": 1000000,
      "max": 10000000
    },
    "burn_percentage": 10,                // Percentage of tokens to burn after minting
    "decimals": 18                        // Number of decimals for the ERC20 token
  },
  "nft": {
    "enable_nft": true,
    "mint_count": {                       // Number of NFTs to mint per collection
      "min": 2,
      "max": 5
    },
    "burn_percentage": 20,                // Percentage of NFTs to burn after minting
    "supply": {                           // Range for NFT collection total supply
      "min": 100,
      "max": 500
    }
  },
  "faucet": {
    "enable_faucet": true,
    "max_retries": 3,
    "max_wait_time": 300000,              // Maximum time to wait for balance increase (ms)
    "check_interval": 5000                // Balance check interval (ms)
  }
}
```

## Usage

To start the automation tool:

```bash
node index.js
```

The tool will process each wallet from the `pk.txt` file, performing the enabled operations in sequence:

1. **Faucet claim** - Uses Discord token to claim tZKJ tokens and waits for balance to increase
2. **Self-transfers** - Performs multiple self-transfers based on configuration
3. **Smart contract deployment** - Deploys contracts and interacts with them
4. **ERC20 token creation** - Creates, mints, and burns custom ERC20 tokens
5. **NFT collection management** - Creates NFT collections, mints NFTs, and burns tokens

After processing all wallets, the tool will wait for 8 hours before starting the next cycle.

## How It Works

The tool is modular and each operation is handled by a specialized class:

- **FaucetManager**: Handles Discord authentication and faucet claiming
- **TokenTransfer**: Handles token self-transfers
- **ContractDeployer**: Compiles and deploys smart contracts, then interacts with them
- **ERC20TokenDeployer**: Creates, deploys, mints, and burns ERC20 tokens
- **NFTManager**: Creates, deploys, mints, and burns NFT collections

All operations include:
- Random delays between transactions to mimic human behavior
- Proper nonce management to prevent transaction failures
- Gas price optimization for faster confirmations
- Exponential backoff retry mechanisms for failed operations
- Detailed logging with timestamp and wallet identification

## Troubleshooting

### Common Issues

1. **Faucet Claims Failing**:
   - Check your Discord token validity
   - Ensure your IP is not rate-limited by the faucet
   - Verify the wallet address is correct
   - Check the browser page: https://faucet.3xpch4in.ai/

2. **Transaction Errors**:
   - Ensure your wallet has sufficient funds (check with the faucet)
   - Check if the gas price is appropriate (adjust `gas_price_multiplier`)
   - Increase `max_retries` if network is congested

3. **"getTimestamp has already been declared" Error**:
   - Make sure you're not defining the `getTimestamp` function in multiple places
   - Use the imported function from `delayUtils.js`

### Logs

The tool provides detailed color-coded console output:
- 🟢 Green: Successful operations
- 🔴 Red: Errors
- 🟡 Yellow: Warnings/Notices
- 🔵 Blue: Operation headings
- 🔷 Cyan: Informational messages

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Disclaimer

This tool is for educational and testing purposes only. Use it responsibly and in accordance with the terms of service of the 3xpch4in Testnet. Do not use this tool for any malicious purposes or to abuse testnet resources.
