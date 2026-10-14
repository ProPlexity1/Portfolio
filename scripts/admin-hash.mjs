// Make the ADMIN_PASSWORD_HASH value for Vercel.
//   npm run admin:hash
// Prompts for the password (not echoed, never saved), prints only the hash.
import crypto from 'node:crypto'
import readline from 'node:readline'

const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true })
rl._writeToOutput = (s) => {
  if (s.includes('Admin password')) process.stdout.write(s)
}
rl.question('Admin password (min 12 characters): ', (password) => {
  rl.close()
  process.stdout.write('\n')
  if (password.length < 12) {
    console.error('Use at least 12 characters.')
    process.exit(1)
  }
  const salt = crypto.randomBytes(16)
  const N = 16384
  const r = 8
  const p = 1
  const hash = crypto.scryptSync(password, salt, 64, { N, r, p, maxmem: 64 * 1024 * 1024 })
  console.log(`\nADMIN_PASSWORD_HASH=scrypt$${N}$${r}$${p}$${salt.toString('base64')}$${hash.toString('base64')}\n`)
})
