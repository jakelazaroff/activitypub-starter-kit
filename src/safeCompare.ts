// SPDX-License-Identifier: MIT
// Upstream: https://github.com/LionC/express-basic-auth/blob/dd17b4de9fee9558269cdc583310bde5331456e7/index.js#L1-L17
import { timingSafeEqual } from 'crypto';


// Credits for the actual algorithm go to github/@Bruce17
// Thanks to github/@hraban for making me implement this
export default function safeCompare(userInput: string, secret: string): boolean {
    const userInputLength = Buffer.byteLength(userInput)
    const secretLength = Buffer.byteLength(secret)

    const userInputBuffer = Buffer.alloc(userInputLength, 0, 'utf8')
    userInputBuffer.write(userInput)
    const secretBuffer = Buffer.alloc(userInputLength, 0, 'utf8')
    secretBuffer.write(secret)

    return !!(Number(timingSafeEqual(userInputBuffer, secretBuffer)) & Number(userInputLength === secretLength))

}
