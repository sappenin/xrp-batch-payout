// XRP payout script
import fs from 'fs'

import { questions, retryLimit } from '../lib/config'
import { parseFromCsvToArray, parseFromPromptToObject } from '../lib/io'
import log from '../lib/log'
import {
  TxInput,
  txInputSchema,
  senderInputSchema,
  SenderInput,
  txOutputSchema,
} from '../lib/schema'
import {
  connectToLedger,
  generateWallet,
  reliableBatchPayment,
} from '../lib/xrp'

/**
 * Run the XRP payout script.
 *
 * @param override - Override prompt inputs. Useful for testing and debugging.
 */
export default async function payout(override?: unknown): Promise<void> {
  try {
    // Prompt user to configure XRP payout and validate user input
    const senderInput = await parseFromPromptToObject<SenderInput>(
      questions,
      senderInputSchema,
      override,
    )

    // Cancel if user did not confirm payout
    if (!senderInput.confirmed) {
      throw Error('XRP payout stopped.')
    }

    // Parse and validate input CSV to get XRP transaction inputs
    const txInputReadStream = fs.createReadStream(senderInput.inputCsv)
    const txInputs = await parseFromCsvToArray<TxInput>(
      txInputReadStream,
      txInputSchema,
    )

    // Generate XRP wallet from secret
    const [wallet, classicAddress] = generateWallet(
      senderInput.secret,
      senderInput.network,
    )

    // Connect to XRPL
    const [xrpNetworkClient] = await connectToLedger(
      senderInput.grpcUrl,
      senderInput.network,
      classicAddress,
    )

    // Reliably send XRP to accounts specified in transaction inputs
    const txOutputWriteStream = fs.createWriteStream(senderInput.outputCsv)
    await reliableBatchPayment(
      txInputs,
      txOutputWriteStream,
      txOutputSchema,
      wallet,
      xrpNetworkClient,
      senderInput.usdToXrpRate,
      retryLimit,
    )
  } catch (err) {
    log.error(err)
  }
}