import { signToken, verifyToken } from '../server/utils/jwt';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    process.exit(1);
  }
  console.log(`PASS: ${message}`);
}

async function run() {
  console.log('Testing JWT utility...\n');

  const token = signToken({ sub: 'admin', role: 'admin' });
  assert(typeof token === 'string' && token.split('.').length === 3, 'signToken returns valid JWT format');

  const payload = verifyToken(token);
  assert(payload.sub === 'admin', 'payload contains correct sub (login)');
  assert(payload.role === 'admin', 'payload contains correct role');
  assert(payload.iat > 0 && payload.exp > payload.iat, 'payload contains iat and exp');

  try {
    verifyToken(token + 'tampered');
    assert(false, 'tampered token should fail verification');
  } catch {
    assert(true, 'tampered token fails verification');
  }

  try {
    verifyToken('not.a.jwt');
    assert(false, 'malformed token should fail verification');
  } catch {
    assert(true, 'malformed token fails verification');
  }

  console.log('\nAll JWT tests passed.');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
