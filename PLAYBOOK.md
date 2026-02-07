# GullStack Project Playbook
**Version:** 1.0  
**Last Updated:** 2026-02-06  
**Maintainers:** Donald Jay, Melvin

> Every GullStack project follows this playbook. No exceptions.

---

## 🚀 Day 1: Project Setup

### Database
- [ ] **Enable automatic backups** (Railway: PostgreSQL → Settings → Backups)
- [ ] **Set backup retention** to minimum 7 days
- [ ] **Document database credentials** in secure location (1Password)
- [ ] **Test backup restore process** before going live

### Authentication
- [ ] **Self-healing bootstrap** — auto-create platform admin accounts on startup
- [ ] **Account lockout** — lock after 5 failed attempts, 15 min duration
- [ ] **Rate limiting** — max 10 login attempts per 15 min per IP
- [ ] **JWT expiration** — 24 hours max, refresh tokens for longer sessions
- [ ] **Secure cookies** — HttpOnly, Secure, SameSite=Lax

### Environment Variables
- [ ] **Document all required env vars** in `.env.example`
- [ ] **Startup validation** — fail fast if critical vars missing
- [ ] **Never commit secrets** — use `.gitignore` for `.env`
- [ ] **Rotate secrets** — schedule quarterly rotation for API keys

---

## 🛡️ Security Checklist

### API Security
- [ ] **Helmet.js** — security headers on all responses
- [ ] **CORS** — whitelist specific origins, no wildcards in production
- [ ] **Input validation** — Zod/Joi on all request bodies
- [ ] **Rate limiting** — on all public endpoints
- [ ] **Request size limits** — max 10KB JSON body default

### Authentication & Authorization
- [ ] **Password hashing** — bcrypt with cost factor 10+
- [ ] **OAuth state parameter** — CSRF protection for OAuth flows
- [ ] **Role-based access** — check permissions on every protected route
- [ ] **Audit logging** — log all auth events (success, failure, lockout)

### Data Protection
- [ ] **No raw SQL** — use Prisma/ORM, audit any `$queryRaw` usage
- [ ] **Parameterized queries** — never interpolate user input into SQL
- [ ] **PII encryption** — encrypt sensitive data at rest if required
- [ ] **Data retention** — define and enforce retention policies

### Webhooks
- [ ] **Signature verification** — always verify webhook signatures
- [ ] **Idempotency** — handle duplicate webhook deliveries
- [ ] **Logging** — log all webhook events for debugging

---

## 📊 Monitoring & Observability

### Health Checks
- [ ] **Health endpoint** — `GET /health` returns 200 if healthy
- [ ] **Database check** — verify DB connection in health check
- [ ] **Schema verification** — verify critical tables exist on startup

### Logging
- [ ] **Structured logging** — JSON format for production
- [ ] **Request ID** — unique ID per request, include in all logs
- [ ] **Error logging** — capture stack traces, don't expose to users
- [ ] **Audit trail** — log all data modifications with user context

### Alerting
- [ ] **Uptime monitoring** — external monitor (UptimeRobot, Better Uptime)
- [ ] **Error tracking** — Sentry or similar for uncaught exceptions
- [ ] **Backup alerts** — notify on backup failures
- [ ] **Security alerts** — notify on suspicious activity

---

## 🏗️ Code Quality

### TypeScript/JavaScript
- [ ] **Strict mode** — `"strict": true` in tsconfig
- [ ] **No `any`** — avoid implicit any, type everything
- [ ] **Error handling** — try/catch with proper error types
- [ ] **Async/await** — no unhandled promise rejections

### Testing
- [ ] **Unit tests** — core business logic
- [ ] **Integration tests** — API endpoints
- [ ] **Auth tests** — login, logout, permissions
- [ ] **CI pipeline** — run tests on every PR

### Dependencies
- [ ] **Lock file** — commit package-lock.json
- [ ] **Security audit** — `npm audit` on every build
- [ ] **Dependabot** — enable for automatic security updates
- [ ] **Minimal dependencies** — audit before adding new packages

---

## 🚢 Deployment

### Pre-Deploy
- [ ] **Run migrations** — `prisma migrate deploy` in startup command
- [ ] **Environment parity** — staging matches production config
- [ ] **Rollback plan** — know how to revert if needed

### Post-Deploy
- [ ] **Smoke test** — verify critical flows work
- [ ] **Monitor errors** — watch for spike in errors
- [ ] **Check logs** — look for warnings or failures

### Infrastructure
- [ ] **HTTPS only** — no HTTP in production
- [ ] **SSL certificates** — auto-renewal configured
- [ ] **Redis for sessions** — not memory store in production
- [ ] **Connection pooling** — for database connections

---

## 📝 Documentation

### Required Docs
- [ ] **README.md** — setup instructions, architecture overview
- [ ] **ENV.md** — all environment variables documented
- [ ] **API.md** — endpoint documentation (or OpenAPI spec)
- [ ] **DEPLOYMENT.md** — how to deploy, rollback, debug

### Code Comments
- [ ] **Why, not what** — explain reasoning, not obvious code
- [ ] **TODO tracking** — use `// TODO:` with ticket reference
- [ ] **Security notes** — document security-sensitive code

---

## 🔥 Incident Response

### When Things Break
1. **Acknowledge** — let stakeholders know you're on it
2. **Assess** — check logs, errors, monitoring
3. **Mitigate** — stop the bleeding (rollback, disable feature)
4. **Fix** — implement proper fix
5. **Document** — post-mortem, update playbook

### Post-Incident
- [ ] **Root cause analysis** — what actually broke?
- [ ] **Prevention** — what stops this from happening again?
- [ ] **Playbook update** — add new checks if needed
- [ ] **Share learnings** — tell the team

---

## ✅ Platform Admin Bootstrap Code

Every backend should include this pattern:

```typescript
// Platform admin emails that always have access
const PLATFORM_ADMIN_EMAILS = [
  'josh@gullstack.com',
  'josh@augmentadvertise.com', 
  'bryce@gullstack.com',
];

async function bootstrapPlatformAdmins() {
  console.log('[Bootstrap] Checking platform admin accounts...');
  
  // 1. Ensure default tenant exists
  let tenant = await prisma.tenant.findFirst({ where: { slug: 'gullstack' } });
  if (!tenant) {
    tenant = await prisma.tenant.create({
      data: { id: 'gullstack-trust', name: 'GullStack Trust', slug: 'gullstack' }
    });
  }
  
  // 2. Ensure each admin exists
  for (const email of PLATFORM_ADMIN_EMAILS) {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (!existing) {
      await prisma.user.create({
        data: { email, tenantId: tenant.id, role: 'PLATFORM_ADMIN', isActive: true }
      });
      console.log(`[Bootstrap] Created admin: ${email}`);
    }
  }
}

// Call on startup
await bootstrapPlatformAdmins();
```

---

## ✅ Schema Health Check Code

```typescript
async function verifyDatabaseSchema() {
  const criticalTables = ['users', 'tenants', 'sessions'];
  
  for (const table of criticalTables) {
    const result = await prisma.$queryRaw`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = ${table}
      ) as exists
    `;
    if (!result[0]?.exists) {
      throw new Error(`Missing critical table: ${table}`);
    }
  }
  console.log('[HealthCheck] All critical tables verified ✅');
}
```

---

## ✅ Account Lockout Code

```typescript
const MAX_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

async function isAccountLocked(email: string): Promise<boolean> {
  const key = `lockout:${email.toLowerCase()}`;
  const lockUntil = await redis.get(`${key}:locked`);
  return lockUntil && parseInt(lockUntil) > Date.now();
}

async function recordFailedAttempt(email: string): Promise<boolean> {
  const key = `lockout:${email.toLowerCase()}`;
  const attempts = await redis.incr(`${key}:attempts`);
  await redis.expire(`${key}:attempts`, LOCKOUT_MINUTES * 60);
  
  if (attempts >= MAX_ATTEMPTS) {
    await redis.set(`${key}:locked`, Date.now() + LOCKOUT_MINUTES * 60 * 1000);
    return true; // Account is now locked
  }
  return false;
}
```

---

## 📅 Quarterly Review

Every quarter, review:
- [ ] Dependency security updates
- [ ] API key rotation
- [ ] Backup restore test
- [ ] Access audit (who has admin?)
- [ ] Playbook updates needed?

---

*This playbook is a living document. Update it when you learn something new.*

**Created after the Great Database Wipe of 2026-02-06.** Never again. 🛡️
