# Living to Die - Style Guide
Based on modern publisher/book website aesthetic

## Color Palette

### Primary Colors
- **Soft Black**: #1a1a1a (Primary text, headers)
- **Warm Gray**: #4a4a4a (Body text)
- **Light Gray**: #757575 (Secondary text)
- **Soft White**: #fdfdf9 (Background)
- **Pure White**: #ffffff (Cards, sections)

### Accent Colors
- **Sage Green**: #7c9885 (Primary accent, CTAs)
- **Dusty Rose**: #d4a5a5 (Highlights, badges)
- **Warm Beige**: #f5f3f0 (Section backgrounds)
- **Cream**: #faf8f3 (Alternate backgrounds)

### Gradient Palette
- **Soft Gradient**: linear-gradient(180deg, #fdfdf9 0%, #f5f3f0 100%)
- **Warm Gradient**: linear-gradient(135deg, #faf8f3 0%, #e8dfd2 100%)
- **Hero Gradient**: linear-gradient(180deg, rgba(253,253,249,0) 0%, rgba(245,243,240,0.5) 100%)

## Typography

### Font Stack
- **Display/Headers**: 'Crimson Text', 'Georgia', serif
- **Body Text**: 'Inter', -apple-system, system-ui, sans-serif
- **Accent Text**: 'DM Sans', sans-serif

### Type Scale
- **Hero Title**: 4.5rem (72px) / Line-height: 1.1 / Weight: 300
- **H1**: 3.5rem (56px) / Line-height: 1.2 / Weight: 400
- **H2**: 2.5rem (40px) / Line-height: 1.3 / Weight: 400
- **H3**: 1.875rem (30px) / Line-height: 1.4 / Weight: 500
- **H4**: 1.5rem (24px) / Line-height: 1.4 / Weight: 500
- **Body Large**: 1.25rem (20px) / Line-height: 1.7 / Weight: 400
- **Body**: 1.125rem (18px) / Line-height: 1.8 / Weight: 400
- **Small**: 0.875rem (14px) / Line-height: 1.6 / Weight: 400
- **Caption**: 0.75rem (12px) / Line-height: 1.5 / Weight: 500

### Letter Spacing
- **Headlines**: -0.02em (tight)
- **Body**: 0
- **Uppercase labels**: 0.05em
- **Buttons**: 0.02em

## Spacing System
- **xs**: 0.5rem (8px)
- **sm**: 1rem (16px)
- **md**: 1.5rem (24px)
- **lg**: 2rem (32px)
- **xl**: 3rem (48px)
- **2xl**: 4rem (64px)
- **3xl**: 6rem (96px)
- **4xl**: 8rem (128px)

## Layout
- **Max Width**: 1280px
- **Content Width**: 1080px
- **Article Width**: 720px
- **Gutter**: 1.5rem (24px)
- **Section Padding**: 6rem 0 (desktop), 4rem 0 (mobile)

## Components

### Buttons
- **Primary**: Sage green background, white text, no border
- **Secondary**: Transparent, sage border, sage text
- **Ghost**: No border, sage text, underline on hover
- **Padding**: 1rem 2rem
- **Border Radius**: 6px
- **Font Weight**: 600
- **Text Transform**: None (sentence case)
- **Transition**: all 0.3s ease
- **Hover**: Slight scale(1.02) and shadow

### Cards
- **Background**: White
- **Border**: None
- **Shadow**: 0 4px 6px -1px rgb(0 0 0 / 0.1)
- **Shadow Hover**: 0 10px 15px -3px rgb(0 0 0 / 0.1)
- **Border Radius**: 12px
- **Padding**: 2rem
- **Transition**: transform 0.3s ease, box-shadow 0.3s ease

### Navigation
- **Background**: White with backdrop-filter
- **Height**: 80px
- **Shadow on scroll**: 0 1px 3px 0 rgb(0 0 0 / 0.1)
- **Link style**: No underline, color transition
- **Active state**: Sage color with bottom border

### Images
- **Border Radius**: 8px
- **Shadow**: 0 20px 25px -5px rgb(0 0 0 / 0.1)
- **Aspect Ratios**: 16:9 for hero, 3:2 for cards, 1:1 for author

## Effects & Interactions

### Transitions
- **Fast**: 0.15s ease
- **Base**: 0.3s ease
- **Slow**: 0.5s ease-in-out

### Hover States
- **Links**: Color change to sage
- **Cards**: Lift with translateY(-4px) and increased shadow
- **Buttons**: Scale(1.02) with shadow
- **Images**: Slight zoom (scale 1.05)

### Animations
- **Fade In**: opacity 0 to 1, translateY(20px) to 0
- **Slide Up**: translateY(40px) to 0
- **Scale In**: scale(0.95) to 1

## Responsive Breakpoints
- **Mobile**: < 640px
- **Tablet**: 640px - 1024px
- **Desktop**: 1024px - 1440px
- **Large**: > 1440px

## Visual Style Characteristics
1. **Minimal & Clean**: Lots of whitespace, simple layouts
2. **Elegant Typography**: Serif for headers, clean sans for body
3. **Subtle Shadows**: Soft, natural shadows for depth
4. **Muted Colors**: Earth tones, no harsh contrasts
5. **Professional**: Publishing house aesthetic
6. **Gentle Animations**: Smooth, not flashy
7. **Quality over Quantity**: Fewer elements, higher quality