# Living to Die - Official Book Website

A modern, fast website built with Astro and Decap CMS for the memoir "Living to Die" by Diane Melton.

## 🚀 Features

- **Fast & Modern**: Built with Astro for optimal performance
- **Easy Content Management**: Decap CMS for blog posts, poetry, and publications
- **Fully Responsive**: Works perfectly on all devices
- **Beautiful Design**: Clean, professional design with animations
- **Blog System**: Full-featured blog with categories and tags
- **SEO Optimized**: Meta tags, sitemaps, and structured data
- **Newsletter Integration**: Built-in subscription forms
- **Content Collections**: Organized blog posts, poetry, and publications

## 📝 Content Management

### Accessing the CMS

1. Visit `/admin` on your deployed site
2. Log in with your Netlify Identity account
3. Start creating content!

### Content Types

- **Blog Posts**: News, reflections, updates, and events
- **Poetry**: Published and unpublished poems
- **Publications**: Articles, essays, and media appearances

## 🧞 Commands

All commands are run from the root of the project:

| Command | Action |
|:--------|:-------|
| `npm install` | Installs dependencies |
| `npm run dev` | Starts local dev server at `localhost:4321` |
| `npm run build` | Build your production site to `./dist/` |
| `npm run preview` | Preview your build locally, before deploying |

## 🚀 Deployment on Netlify

1. **Connect Repository**: Link your GitHub repository to Netlify
2. **Build Settings**:
   - Build command: `npm run build`
   - Publish directory: `dist`
3. **Enable Identity**: Go to Site Settings > Identity and enable
4. **Configure Git Gateway**: In Identity settings, enable Git Gateway
5. **Create Admin User**: Invite yourself as an admin user

## 📁 Project Structure

```
/
├── public/              # Static assets
│   ├── admin/          # Decap CMS admin interface
│   └── images/         # Image uploads
├── src/
│   ├── components/     # Reusable components
│   ├── content/        # Content collections
│   │   ├── blog/       # Blog posts
│   │   ├── poetry/     # Poetry collection
│   │   └── publications/ # Published works
│   ├── layouts/        # Page layouts
│   ├── pages/          # Route pages
│   └── styles/         # Global styles
├── astro.config.mjs    # Astro configuration
├── netlify.toml        # Netlify deployment config
└── package.json        # Dependencies
```

## ✨ Getting Started

1. **Clone and Install**:
   ```bash
   git clone <your-repo-url>
   cd living-to-die-site
   npm install
   ```

2. **Start Development Server**:
   ```bash
   npm run dev
   ```

3. **Access CMS Locally**:
   - For local CMS access, you'll need to set up Netlify Identity
   - Or create content directly in the `src/content/` folders

## 🎨 Customization

### Adding New Content Types

1. Update `src/content/config.ts` with new collection schema
2. Add collection folder in `src/content/`
3. Update CMS config in `public/admin/config.yml`
4. Create page templates as needed

### Styling

- Main styles: `src/styles/global.css`
- Component styles: Scoped styles in each `.astro` file
- CSS variables in `:root` for easy theming

### Navigation

Update navigation items in `src/components/Navigation.astro`

## 📖 Content Management Tips

### Writing Blog Posts

- Use descriptive titles and meta descriptions
- Add hero images for better visual appeal
- Choose appropriate categories and tags
- Mark important posts as "featured"

### Adding Images

1. Upload images through the CMS media library
2. Or add directly to `public/images/uploads/`
3. Reference with `/images/uploads/filename.jpg`

### SEO Best Practices

- Write compelling meta descriptions
- Use header tags (H1, H2, H3) properly
- Add alt text to all images
- Keep URLs clean and descriptive

## 🔧 Technical Notes

- **RSS Feed**: Available at `/rss.xml`
- **Sitemap**: Auto-generated at `/sitemap-0.xml`
- **Content Collections**: Fully typed with Zod schemas
- **Image Optimization**: Handled by Astro's built-in image optimization

## 📄 License

This project is proprietary to Diane Melton and the "Living to Die" book project.