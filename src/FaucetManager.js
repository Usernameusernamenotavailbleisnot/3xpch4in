// src/FaucetManager.js
const { Web3 } = require('web3');
const axios = require('axios');
const chalk = require('chalk');
const constants = require('../utils/constants');
const { addRandomDelay, getTimestamp } = require('../utils/delayUtils');

class FaucetManager {
    constructor(config = {}) {
        // Default faucet configuration
        this.defaultConfig = {
            enable_faucet: true,
            max_retries: 3,
            max_wait_time: 300000,  // 5 minutes default wait time for balance increase
            check_interval: 5000    // 5 seconds default check interval
        };
        
        // Load configuration, merging with defaults
        this.config = { ...this.defaultConfig, ...config.faucet };
        
        // Include delay config if available
        if (config.delay) {
            this.config.delay = config.delay;
        }
        
        // Setup web3 connection
        this.rpcUrl = constants.NETWORK.RPC_URL;
        this.web3 = new Web3(this.rpcUrl);
        
        this.walletNum = null;
    }
    
    setWalletNum(num) {
        this.walletNum = num;
    }
    
    /**
     * Extract JWT token from the Discord callback URL
     * @param {string} callbackUrl - The full callback URL from Discord
     * @returns {string|null} - The extracted JWT token or null if not found
     */
    extractJWTToken(callbackUrl) {
        try {
            // Extract the JWT token from the callback URL
            // Expected format: https://faucet.expchain.ai/?msg=username/JWT_TOKEN
            console.log(chalk.cyan(`${getTimestamp(this.walletNum)} ℹ Parsing callback URL for JWT token`));
            
            if (callbackUrl.includes('/?msg=')) {
                const parts = callbackUrl.split('/?msg=');
                if (parts.length > 1) {
                    // The part after /?msg= should be something like "username/JWT_TOKEN"
                    const msgPart = parts[1];
                    
                    // Split by the first "/" to separate username and token
                    const slashIndex = msgPart.indexOf('/');
                    if (slashIndex !== -1) {
                        const jwtToken = msgPart.substring(slashIndex + 1);
                        console.log(chalk.cyan(`${getTimestamp(this.walletNum)} ℹ Successfully extracted JWT token`));
                        return jwtToken;
                    }
                }
            }
            
            console.log(chalk.yellow(`${getTimestamp(this.walletNum)} ⚠ Could not find expected JWT token pattern in URL`));
            return null;
        } catch (error) {
            console.log(chalk.red(`${getTimestamp(this.walletNum)} ✗ Error extracting JWT token: ${error.message}`));
            return null;
        }
    }
    
    /**
     * Get JWT token from Discord authorization
     * @param {string} discordToken - Discord token for authentication
     * @returns {Promise<string|null>} - JWT token or null on failure
     */
    async getJWTToken(discordToken) {
        try {
            console.log(chalk.blue.bold(`${getTimestamp(this.walletNum)} Starting Discord authentication for faucet...`));
            
            // Headers for the Discord auth request
            const headers = {
                "Authorization": discordToken,
                "Content-Type": "application/json",
                "Accept": "application/json",
                "Accept-Language": "en-US,en;q=0.7",
                "Accept-Encoding": "gzip, deflate, br, zstd",
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36",
                "x-requested-with": "XMLHttpRequest",
                "dnt": "1",
                "pragma": "no-cache",
                "cache-control": "no-cache"
            };
            
            // First step: Get authorization code from Discord
            console.log(chalk.cyan(`${getTimestamp(this.walletNum)} ℹ Authenticating with Discord...`));
            
            // Add random delay before Discord auth
            await addRandomDelay(this.config, this.walletNum, "Discord authentication");
            
            // Parse the discord oauth URL to get needed parameters
            const authUrl = new URL(constants.FAUCET.DISCORD_AUTH_URL);
            const queryParams = Object.fromEntries(authUrl.searchParams.entries());
            
            // Prepare authorization payload
            const authPayload = {
                "permissions": "0",
                "authorize": true,
                "integration_type": 0
            };
            
            // Make the authorization request to Discord
            const authResponse = await axios.post(
                "https://discord.com/api/v10/oauth2/authorize",
                authPayload,
                {
                    headers: headers,
                    params: queryParams
                }
            );
            
            if (!authResponse.data || !authResponse.data.location) {
                console.log(chalk.red(`${getTimestamp(this.walletNum)} ✗ No location in Discord auth response`));
                return null;
            }
            
            const location = authResponse.data.location;
            const codeMatch = location.match(/code=([^&]+)/);
            
            if (!codeMatch || !codeMatch[1]) {
                console.log(chalk.red(`${getTimestamp(this.walletNum)} ✗ No authorization code in Discord response`));
                return null;
            }
            
            const authCode = codeMatch[1];
            console.log(chalk.cyan(`${getTimestamp(this.walletNum)} ℹ Got Discord authorization code: ${authCode.substring(0, 10)}...`));
            
            // Second step: Exchange code for JWT token
            console.log(chalk.cyan(`${getTimestamp(this.walletNum)} ℹ Exchanging authorization code for JWT token...`));
            
            // Add random delay before callback request
            await addRandomDelay(this.config, this.walletNum, "token exchange");
            
            // Make request to callback URL to get JWT token
            const callbackResponse = await axios.get(
                `${constants.FAUCET.CALLBACK_URL}?code=${authCode}`,
                {
                    maxRedirects: 0,
                    validateStatus: function (status) {
                        return status >= 200 && status < 303; // Accept 302 Found (redirect)
                    }
                }
            );
            
            // Check for redirect location header
            if (callbackResponse.headers && callbackResponse.headers.location) {
                const redirectUrl = callbackResponse.headers.location;
                console.log(chalk.cyan(`${getTimestamp(this.walletNum)} ℹ Got redirect URL: ${redirectUrl}`));
                
                // Extract JWT token from redirect URL
                const jwtToken = this.extractJWTToken(redirectUrl);
                if (jwtToken) {
                    console.log(chalk.green(`${getTimestamp(this.walletNum)} ✓ Successfully obtained JWT token`));
                    return jwtToken;
                }
            }
            
            console.log(chalk.red(`${getTimestamp(this.walletNum)} ✗ Failed to extract JWT token from response`));
            return null;
            
        } catch (error) {
            console.log(chalk.red(`${getTimestamp(this.walletNum)} ✗ Error in Discord authentication: ${error.message}`));
            if (error.response) {
                console.log(chalk.red(`${getTimestamp(this.walletNum)} ✗ Response status: ${error.response.status}`));
                console.log(chalk.red(`${getTimestamp(this.walletNum)} ✗ Response data: ${JSON.stringify(error.response.data)}`));
            }
            return null;
        }
    }
    
    /**
     * Request tokens from the faucet
     * @param {string} jwtToken - JWT token from Discord auth
     * @param {string} walletAddress - Wallet address to receive tokens
     * @returns {Promise<boolean>} - Success status
     */
    async requestFaucet(jwtToken, walletAddress) {
        try {
            console.log(chalk.blue.bold(`${getTimestamp(this.walletNum)} Requesting tokens from faucet...`));
            
            // Prepare the request
            const headers = {
                "Authorization": `Bearer ${jwtToken}`,
                "Content-Type": "application/json"
            };
            
            const payload = {
                "chain_id": constants.FAUCET.CHAIN_ID,
                "to": walletAddress
            };
            
            // Add random delay before faucet request
            await addRandomDelay(this.config, this.walletNum, "faucet request");
            
            // Make the request to the faucet API
            console.log(chalk.cyan(`${getTimestamp(this.walletNum)} ℹ Sending request to faucet API...`));
            
            const response = await axios.post(
                constants.FAUCET.FAUCET_API_URL,
                payload,
                { headers: headers }
            );
            
            if (response.data && response.data.code === 0) {
                console.log(chalk.green(`${getTimestamp(this.walletNum)} ✓ Faucet request successful! Transaction ID: ${response.data.data}`));
                return true;
            } else if (response.data && response.data.code === 2004) {
                console.log(chalk.yellow(`${getTimestamp(this.walletNum)} ⚠ ${response.data.message}: ${response.data.data}`));
                return false;
            } else {
                console.log(chalk.red(`${getTimestamp(this.walletNum)} ✗ Unexpected response from faucet: ${JSON.stringify(response.data)}`));
                return false;
            }
            
        } catch (error) {
            console.log(chalk.red(`${getTimestamp(this.walletNum)} ✗ Error requesting from faucet: ${error.message}`));
            if (error.response) {
                console.log(chalk.red(`${getTimestamp(this.walletNum)} ✗ Response status: ${error.response.status}`));
                console.log(chalk.red(`${getTimestamp(this.walletNum)} ✗ Response data: ${JSON.stringify(error.response.data)}`));
            }
            return false;
        }
    }
    
    /**
     * Wait for the wallet balance to increase
     * @param {string} walletAddress - The wallet address to check
     * @param {number} initialBalance - The initial balance before claiming
     * @param {number} maxWaitTime - Maximum wait time in milliseconds 
     * @param {number} checkInterval - Interval between checks in milliseconds
     * @returns {Promise<boolean>} - True if balance increased, false if timeout
     */
    async waitForBalanceIncrease(walletAddress, initialBalance = null, maxWaitTime = 300000, checkInterval = 5000) {
        try {
            console.log(chalk.cyan(`${getTimestamp(this.walletNum)} ℹ Waiting for balance to increase after faucet claim...`));
            
            // If initial balance not provided, get it now
            if (initialBalance === null) {
                initialBalance = await this.web3.eth.getBalance(walletAddress);
                initialBalance = BigInt(initialBalance);
                console.log(chalk.cyan(`${getTimestamp(this.walletNum)} ℹ Initial balance: ${this.web3.utils.fromWei(initialBalance.toString(), 'ether')} ${constants.NETWORK.CURRENCY_SYMBOL}`));
            } else {
                initialBalance = BigInt(initialBalance);
            }
            
            const startTime = Date.now();
            let waitedTime = 0;
            
            // Loop until timeout or balance increases
            while (waitedTime < maxWaitTime) {
                // Add a short delay between checks
                await new Promise(resolve => setTimeout(resolve, checkInterval));
                waitedTime = Date.now() - startTime;
                
                // Check current balance
                const currentBalance = BigInt(await this.web3.eth.getBalance(walletAddress));
                
                // Log progress
                if (waitedTime % 30000 < checkInterval) { // Log approximately every 30 seconds
                    const timeWaited = Math.floor(waitedTime / 1000);
                    const timeLeft = Math.floor((maxWaitTime - waitedTime) / 1000);
                    console.log(chalk.cyan(
                        `${getTimestamp(this.walletNum)} ℹ Current balance: ${this.web3.utils.fromWei(currentBalance.toString(), 'ether')} ${constants.NETWORK.CURRENCY_SYMBOL} ` + 
                        `(Waited ${timeWaited}s, ${timeLeft}s remaining)`
                    ));
                }
                
                // If balance increased, return true
                if (currentBalance > initialBalance) {
                    console.log(chalk.green(
                        `${getTimestamp(this.walletNum)} ✓ Balance increased! From ${this.web3.utils.fromWei(initialBalance.toString(), 'ether')} to ` +
                        `${this.web3.utils.fromWei(currentBalance.toString(), 'ether')} ${constants.NETWORK.CURRENCY_SYMBOL}`
                    ));
                    return true;
                }
            }
            
            console.log(chalk.yellow(`${getTimestamp(this.walletNum)} ⚠ Timeout waiting for balance to increase after ${maxWaitTime/1000} seconds`));
            return false;
            
        } catch (error) {
            console.log(chalk.red(`${getTimestamp(this.walletNum)} ✗ Error waiting for balance increase: ${error.message}`));
            return false;
        }
    }
    
    /**
     * Execute faucet operations for a wallet
     * @param {string} discordToken - Discord token for authentication
     * @param {string} walletAddress - Wallet address to receive tokens
     * @returns {Promise<boolean>} - Success status
     */
    async executeFaucetOperations(discordToken, walletAddress) {
        if (!this.config.enable_faucet) {
            console.log(chalk.yellow(`${getTimestamp(this.walletNum)} ⚠ Faucet operations disabled in config`));
            return false;
        }
        
        if (!discordToken) {
            console.log(chalk.red(`${getTimestamp(this.walletNum)} ✗ No Discord token provided for faucet operations`));
            return false;
        }
        
        try {
            // Get initial balance before faucet claim
            const initialBalance = await this.web3.eth.getBalance(walletAddress);
            console.log(chalk.cyan(`${getTimestamp(this.walletNum)} ℹ Initial wallet balance: ${this.web3.utils.fromWei(initialBalance, 'ether')} ${constants.NETWORK.CURRENCY_SYMBOL}`));
            
            // Get JWT token from Discord authorization
            const jwtToken = await this.getJWTToken(discordToken);
            if (!jwtToken) {
                return false;
            }
            
            // Request tokens from the faucet
            const faucetSuccess = await this.requestFaucet(jwtToken, walletAddress);
            
            // If faucet request was successful, wait for balance to increase
            if (faucetSuccess) {
                // Get the wait time and check interval from config or use defaults
                const maxWaitTime = this.config.max_wait_time || 300000; // 5 minutes default
                const checkInterval = this.config.check_interval || 5000; // 5 seconds default
                
                // Wait for balance to increase
                return await this.waitForBalanceIncrease(walletAddress, initialBalance, maxWaitTime, checkInterval);
            }
            
            return faucetSuccess;
            
        } catch (error) {
            console.log(chalk.red(`${getTimestamp(this.walletNum)} ✗ Error in faucet operations: ${error.message}`));
            return false;
        }
    }
}

module.exports = FaucetManager;