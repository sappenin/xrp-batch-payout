import { Context } from 'mocha'
import fetch from 'node-fetch'
import { XrpClient, XrplNetwork } from 'xpring-js'

import { xrp, log, config } from '../src/index'
import { SenderInput } from '../src/lib/schema'

// Types for our Mocha globals
declare module 'mocha' {
  export interface Context {
    overrides: SenderInput
    testBalance: number
    xrpNetworkClient: XrpClient
  }
}

/**
 * Get and fund XRPL testnet account.
 *
 * @param ctx - The mocha context.
 * @throws On funding failure.
 * @returns A tuple of balance and a connected XRP network client.
 */
export async function getTestnetAccount(
  ctx: Context,
): Promise<[string, number, XrpClient]> {
  // Increase the timeout because we need to fund a testnet account
  const testTimeout = 15000
  ctx.timeout(testTimeout)

  // Fetch acccount
  log.info('Getting funded testnet account..')
  const resp = await fetch('https://faucet.altnet.rippletest.net/accounts', {
    method: 'POST',
  })
  const json = await resp.json()
  const address = json.account.address
  const secret = json.account.secret

  if (!address || !secret) {
    throw Error('Failed to get testnet account.')
  }

  // Wait for funding
  const waitTime = 10000
  // eslint-disable-next-line no-promise-executor-return -- We don't need the return values.
  await new Promise((resolve) => setTimeout(resolve, waitTime))

  // Make sure it's funded
  const [xrpNetworkClient, balance] = await xrp.connectToLedger(
    config.WebGrpcEndpoint.Test,
    XrplNetwork.Test,
    address,
  )
  const fundAmount = 1000
  if (balance !== fundAmount) {
    throw Error('Failed to fund testnet account.')
  }
  log.info('Successfully funded testnet account.')

  return [secret, balance, xrpNetworkClient]
}
