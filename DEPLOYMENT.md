# Production Deployment Guide

## Prerequisites

- Node.js 18+ 
- OpenRouter API key
- Vercel account (recommended) or your preferred hosting platform

## Environment Setup

1. **Create environment file:**
   ```bash
   cp .env.example .env.local
   ```

2. **Configure environment variables:**
   ```bash
   # .env.local
   OPENROUTER_API_KEY=your_actual_openrouter_api_key_here
   ```

3. **Get OpenRouter API key:**
   - Visit [OpenRouter](https://openrouter.ai/keys)
   - Create an account and generate an API key
   - Add credits to your account for API usage

## Security Checklist

✅ **API Key Security**
- API key is stored server-side only
- No client-side exposure of sensitive data
- Environment variables properly configured

✅ **Input Validation**
- All user inputs are validated and sanitized
- XSS protection implemented
- Rate limiting enabled (60 requests/minute per IP)

✅ **Error Handling**
- React error boundaries prevent crashes
- Proper error logging and monitoring
- User-friendly error messages

✅ **Security Headers**
- X-Frame-Options: DENY
- X-Content-Type-Options: nosniff
- X-XSS-Protection: 1; mode=block
- Referrer-Policy: origin-when-cross-origin

## Performance Optimizations

✅ **Code Splitting**
- Components are properly split
- Lazy loading implemented
- Bundle size optimized

✅ **Caching**
- API responses cached (5 minutes)
- Static assets optimized
- Next.js optimizations enabled

## Deployment Options

### Option 1: Vercel (Recommended)

1. **Connect your repository:**
   ```bash
   # Install Vercel CLI
   npm i -g vercel
   
   # Deploy
   vercel
   ```

2. **Configure environment variables in Vercel dashboard:**
   - Go to your project settings
   - Add `OPENROUTER_API_KEY` environment variable

3. **Deploy:**
   ```bash
   vercel --prod
   ```

### Option 2: Docker

1. **Create Dockerfile:**
   ```dockerfile
   FROM node:18-alpine AS base
   
   # Install dependencies only when needed
   FROM base AS deps
   WORKDIR /app
   COPY package*.json ./
   RUN npm ci --only=production
   
   # Rebuild the source code only when needed
   FROM base AS builder
   WORKDIR /app
   COPY package*.json ./
   RUN npm ci
   COPY . .
   RUN npm run build
   
   # Production image
   FROM base AS runner
   WORKDIR /app
   ENV NODE_ENV production
   
   RUN addgroup --system --gid 1001 nodejs
   RUN adduser --system --uid 1001 nextjs
   
   COPY --from=builder /app/public ./public
   COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
   COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
   
   USER nextjs
   EXPOSE 3000
   ENV PORT 3000
   
   CMD ["node", "server.js"]
   ```

2. **Build and run:**
   ```bash
   docker build -t sw-chat .
   docker run -p 3000:3000 -e OPENROUTER_API_KEY=your_key sw-chat
   ```

### Option 3: Traditional VPS

1. **Install dependencies:**
   ```bash
   npm ci --production
   ```

2. **Build the application:**
   ```bash
   npm run build
   ```

3. **Start the application:**
   ```bash
   npm start
   ```

4. **Use PM2 for process management:**
   ```bash
   npm install -g pm2
   pm2 start npm --name "sw-chat" -- start
   pm2 save
   pm2 startup
   ```

## Monitoring & Maintenance

### Error Tracking
- Implement Sentry or similar service for error tracking
- Monitor API usage and costs
- Set up alerts for high error rates

### Performance Monitoring
- Use Vercel Analytics or similar
- Monitor Core Web Vitals
- Track API response times

### Security Monitoring
- Monitor for suspicious activity
- Regular security updates
- API key rotation (if needed)

## Scaling Considerations

### Database (Future)
- Consider adding a database for chat history
- Implement user authentication
- Add conversation persistence

### Caching
- Implement Redis for better caching
- Add CDN for static assets
- Consider edge caching

### Load Balancing
- Use multiple instances for high traffic
- Implement health checks
- Consider auto-scaling

## Troubleshooting

### Common Issues

1. **Build Failures:**
   ```bash
   npm run build
   # Check for TypeScript errors
   npm run lint
   ```

2. **API Key Issues:**
   - Verify environment variable is set
   - Check API key validity
   - Ensure sufficient credits

3. **Rate Limiting:**
   - Check rate limit settings
   - Monitor API usage
   - Consider upgrading limits

### Support

- Check logs in your hosting platform
- Monitor error rates
- Review API usage patterns

## Cost Optimization

- Monitor API usage and costs
- Implement request caching
- Consider model selection for cost efficiency
- Set up usage alerts

## Security Updates

- Keep dependencies updated
- Monitor security advisories
- Regular security audits
- Implement proper logging

---

**Note:** This application is now production-ready with proper security, error handling, and performance optimizations. Make sure to test thoroughly in a staging environment before deploying to production.
