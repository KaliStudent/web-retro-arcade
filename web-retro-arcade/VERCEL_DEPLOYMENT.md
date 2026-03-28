# Vercel Deployment Guide

## Prerequisites

1. A Vercel account (https://vercel.com)
2. Vercel CLI installed: `npm i -g vercel`
3. A custom domain configured in your Vercel account

## Important Notes

### File Uploads on Vercel

⚠️ **Vercel's serverless functions have ephemeral file systems.** This means:
- ROM files uploaded via the upload feature will NOT persist between requests
- The `uploads/` directory is temporary and gets wiped on each deployment
- You need to use external storage for ROM files

### Recommended Storage Solutions

For production deployment, you should integrate one of these storage solutions:

1. **Vercel Blob Storage** (Recommended for Vercel)
   - Install: `npm install @vercel/blob`
   - Update `server/routes.ts` to use Blob storage instead of local filesystem
   - Docs: https://vercel.com/docs/storage/vercel-blob

2. **AWS S3** or **Cloudflare R2**
   - Use `multer-s3` or similar adapters
   - Configure environment variables for credentials

3. **Supabase Storage**
   - Free tier available
   - Good for hobby projects

### Database Setup

The app currently uses in-memory storage. For production:

1. Set up a PostgreSQL database (Neon, Vercel Postgres, Supabase, etc.)
2. Add `DATABASE_URL` to Vercel environment variables
3. Run migrations: `npm run db:push`

## Deployment Steps

### Option 1: Deploy via Vercel CLI

1. **Login to Vercel:**
   ```bash
   vercel login
   ```

2. **Link your project:**
   ```bash
   vercel link
   ```

3. **Set environment variables (if using database):**
   ```bash
   vercel env add DATABASE_URL
   ```
   Enter your database URL when prompted.

4. **Deploy to production:**
   ```bash
   vercel --prod
   ```

### Option 2: Deploy via GitHub + Vercel Dashboard

1. **Push your code to GitHub:**
   ```bash
   git add .
   git commit -m "Prepare for Vercel deployment"
   git push origin main
   ```

2. **Connect to Vercel:**
   - Go to https://vercel.com/new
   - Import your GitHub repository
   - Vercel will auto-detect the configuration

3. **Configure environment variables:**
   - In Vercel dashboard, go to: Project Settings → Environment Variables
   - Add `DATABASE_URL` if using PostgreSQL
   - Add any other environment variables

4. **Deploy:**
   - Click "Deploy"
   - Vercel will build and deploy automatically

### Option 3: Deploy via Vercel Dashboard (Manual)

1. **Build the project locally:**
   ```bash
   npm run build
   ```

2. **Deploy via Vercel Dashboard:**
   - Go to https://vercel.com/new
   - Drag and drop the entire project folder
   - Configure settings and deploy

## Custom Domain Setup

1. **Add your domain in Vercel:**
   - Go to: Project Settings → Domains
   - Add your custom domain
   - Follow DNS configuration instructions

2. **Configure DNS:**
   - Add A or CNAME records as instructed by Vercel
   - Wait for DNS propagation (can take up to 48 hours)

3. **SSL Certificate:**
   - Vercel automatically provisions SSL certificates
   - Your site will be accessible via HTTPS

## Environment Variables

Add these in Vercel dashboard (Project Settings → Environment Variables):

```
DATABASE_URL=postgresql://...         # PostgreSQL connection string (optional)
NODE_ENV=production                   # Set automatically by Vercel
```

## Post-Deployment Checklist

- [ ] Verify the site loads at your custom domain
- [ ] Test navigation and UI components
- [ ] Check browser console for errors
- [ ] Test API endpoints (if database is configured)
- [ ] Configure storage solution for ROM uploads
- [ ] Set up database if using PostgreSQL
- [ ] Test ROM upload functionality (after storage setup)
- [ ] Verify emulator loads correctly

## Storage Migration Guide

To migrate from local file storage to Vercel Blob:

1. **Install Vercel Blob:**
   ```bash
   npm install @vercel/blob
   ```

2. **Update `server/routes.ts`:**
   Replace multer's `diskStorage` with Blob storage:
   ```javascript
   import { put } from '@vercel/blob';

   // In upload route:
   const blob = await put(filename, file.buffer, {
     access: 'public',
   });

   // Save blob.url to database instead of local path
   ```

3. **Update ROM serving route:**
   ```javascript
   app.get("/api/roms/:gameId", async (req, res) => {
     const game = await storage.getGameById(req.params.gameId);
     if (!game) return res.status(404).json({ error: 'Game not found' });

     // Redirect to Blob URL
     res.redirect(game.romFilePath); // romFilePath now contains blob URL
   });
   ```

## Troubleshooting

### Build Fails
- Check build logs in Vercel dashboard
- Ensure all dependencies are in `package.json`
- Verify Node.js version compatibility

### API Routes Not Working
- Check `vercel.json` rewrites configuration
- Verify serverless function logs in Vercel dashboard
- Ensure all imports use correct paths

### Static Files Not Loading
- Verify `outputDirectory` in `vercel.json`
- Check that `dist/public` is created during build
- Clear Vercel cache and redeploy

### ROM Upload Issues
- Remember: Local file uploads won't work on Vercel
- Implement Vercel Blob or external storage
- Check serverless function size limits (50MB max)

## Support

- Vercel Documentation: https://vercel.com/docs
- Vercel Blob Storage: https://vercel.com/docs/storage/vercel-blob
- Community Support: https://github.com/vercel/vercel/discussions
