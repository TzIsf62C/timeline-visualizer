# Timeline Visualizer

A client-side browser application for visualizing company initiative deadlines on interactive timelines. Built with vanilla JavaScript, no build tools required.

## Architecture

### Technology Stack

- **Vanilla JavaScript** (ES6+) - No frameworks or dependencies
- **SVG** - Timeline rendering via DOM manipulation
- **localStorage** - Client-side data persistence
- **Third-party libraries**:
  - `html2canvas` - PNG export functionality
  - `jsPDF` - PDF export functionality

### Project Structure

```
├── index.html              # Main application entry point
├── styles.css              # Application styling
├── app.js                  # Application controller & UI logic
├── dataManager.js          # Data persistence layer (localStorage)
├── dateParser.js           # Natural language date parser
├── renderer.js             # SVG timeline visualization engine
├── sample-timeline.json    # Demo data (20 events)
└── libs/
    ├── html2canvas.min.js  # PNG export (194 KB)
    └── jspdf.umd.min.js    # PDF export (355 KB)
```

### Module Overview

#### `app.js` (~734 lines)
Main application controller implementing the MVC pattern.

**Key responsibilities:**
- UI event binding and delegation
- Modal management (event creation/editing, timeline management)
- Filter coordination
- Export orchestration (JSON, PNG, PDF)
- Bridge between dataManager and renderer

**Public API:**
```javascript
App.init()  // Initialize application
```

#### `dataManager.js` (~300+ lines)
Data persistence layer using browser localStorage.

**Key responsibilities:**
- CRUD operations for timelines and events
- Data validation and sanitization
- Multi-timeline management
- JSON import/export
- Entity/goal extraction for filters

**Public API:**
```javascript
DataManager.getActiveTimeline()
DataManager.createTimeline(name)
DataManager.setActiveTimeline(timelineId)
DataManager.addEvent(event)
DataManager.updateEvent(eventId, updates)
DataManager.deleteEvent(eventId)
DataManager.exportTimeline()
DataManager.importTimeline(jsonData)
DataManager.getUniqueEntities()
DataManager.getUniqueGoals()
```

**Data Schema:**
```javascript
// Timeline object
{
  id: string,           // UUID
  name: string,
  events: Event[],
  createdAt: string     // ISO 8601
}

// Event object
{
  id: string,           // UUID
  title: string,
  description: string,
  goal: string,
  entities: string[],   // Primary entities
  secondaryEntities: string[],
  deadlineText: string,
  computedDate: string, // ISO 8601 date
  startDate: string,    // Optional
  endDate: string,      // Optional
  isOngoing: boolean
}
```

#### `dateParser.js` (~200+ lines)
Natural language date parser with fuzzy matching.

**Key responsibilities:**
- Parse vague date descriptions into ISO dates
- Support multiple date format patterns
- Fiscal year calculations
- Quarter mapping

**Public API:**
```javascript
DateParser.parseDeadlineText(text)  // Returns ISO date string or null
```

**Supported patterns:**
- Fiscal years: `FY27`, `fiscal year 2027` → `2027-09-30`
- Quarters: `Q1 2026`, `quarter 1 2026` → `2026-02-01`
- Seasons: `spring 2026` → `2026-04-01`
- Month references: `by September 2026` → `2026-09-01`
- Vague periods: `mid-2027`, `early 2026`, `late 2027`
- End of year: `by the end of 2027` → `2027-12-01`
- Starting: `starting in 2026` → `2026-01-01`

#### `renderer.js` (~500+ lines)
SVG-based timeline visualization engine with zoom/pan controls.

**Key responsibilities:**
- SVG generation and manipulation
- Three view modes (single, by-entity, by-goal)
- Zoom and pan transformations
- Event positioning and layout
- Today marker rendering
- Filter application
- Date axis generation

**Public API:**
```javascript
Renderer.init()
Renderer.setViewMode(mode)  // 'single' | 'entity' | 'goal'
Renderer.setFilters({ search, entity, goal })
Renderer.render()
```

**Rendering algorithm:**
1. Filter events based on active filters
2. Calculate date range from filtered events
3. Group events by view mode (single/entity/goal)
4. Position events on timeline (collision detection)
5. Generate SVG elements (events, labels, today marker)
6. Apply current zoom/pan transformation

### Key Features

#### 1. Natural Language Date Parsing
The `dateParser.js` module converts human-readable deadline text into precise ISO 8601 dates. It uses regex pattern matching with fallback strategies.

**Example transforms:**
```javascript
"by September 2026" → "2026-09-01"
"mid-2027"          → "2027-07-01"
"Q1 2026"           → "2026-02-01"
"by FY27"           → "2027-09-30"
"early 2026"        → "2026-03-01"
```

#### 2. Multiple Visualization Modes

**Single Timeline:**
- All events on one horizontal track
- Events positioned chronologically
- Vertical stacking for overlapping events

**Split by Entity:**
- Each unique entity gets its own row
- Events grouped by primary entity
- Ideal for capacity planning

**Split by Goal:**
- Each unique goal gets its own row
- Events grouped by strategic objective
- Ideal for tracking OKRs

#### 3. Interactive Canvas

**Zoom:**
- Mouse wheel zoom (0.5x to 3x)
- Buttons for discrete zoom steps
- Zooms toward cursor position

**Pan:**
- Click and drag to pan horizontally
- Constrained to prevent excessive scrolling

**Event interaction:**
- Click events to show detail modal
- Hover for visual feedback
- Color-coded by entity

#### 4. Data Persistence

All data stored in browser `localStorage` with the following structure:

```javascript
localStorage.setItem('timelineApp_timelines', JSON.stringify(timelines))
localStorage.setItem('timelineApp_activeTimelineId', timelineId)
```

**Advantages:**
- No server required
- Works completely offline
- Data persists across sessions
- Privacy-preserving (no external transmission)

**Limitations:**
- ~5-10MB storage limit (browser-dependent)
- Data lost if localStorage cleared
- No cross-device sync (use JSON export/import)

#### 5. Export Capabilities

**JSON Export:**
- Native JavaScript serialization
- Compatible with JSON import
- Useful for backups and data portability

**PNG Export:**
- Uses `html2canvas` to rasterize SVG
- Captures current view state (zoom, filters)
- Downloads via blob URL

**PDF Export:**
- Uses `jsPDF` with embedded PNG
- Letter size (8.5" x 11")
- Automatic scaling to fit page

## Development Guide

### Getting Started

1. **Clone/download the repository**
2. **Open `index.html` in a browser** - No build step required
3. **Open DevTools console** for debugging

### Deployment to GitHub Pages

This application is perfect for GitHub Pages since it's entirely client-side with no backend requirements. All user data is stored securely in their browser's localStorage.

**Steps to deploy:**

1. **Create a GitHub repository**
   ```bash
   git init
   git add .
   git commit -m "Initial commit: Timeline Visualizer"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/timeline-visualizer.git
   git push -u origin main
   ```

2. **Enable GitHub Pages**
   - Go to your repository on GitHub
   - Click "Settings" → "Pages"
   - Under "Source", select "main" branch
   - Click "Save"
   - Your site will be live at: `https://YOUR_USERNAME.github.io/timeline-visualizer/`

3. **That's it!** No build process or configuration needed.

**Security & Privacy:**
- ✅ All data stays on user's device (localStorage)
- ✅ No server-side processing
- ✅ No data transmission to any server
- ✅ Works completely offline after initial load
- ✅ No cookies or tracking
- ✅ HTTPS encryption via GitHub Pages

**Custom domain (optional):**
- Add a `CNAME` file with your domain name
- Configure DNS with your domain provider
- See [GitHub Pages custom domain docs](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site)

### Development Workflow

**No build tools required.** Simply edit files and refresh the browser.

**Recommended setup:**
- Use a local development server for better CORS handling
- Enable browser DevTools for debugging
- Use browser's localStorage inspector for data debugging

**Quick dev server:**
```bash
# Python 3
python -m http.server 8000

# Node.js
npx http-server

# PHP
php -S localhost:8000
```

Then open `http://localhost:8000`

### Code Style

- ES6+ features (arrow functions, const/let, template literals)
- Module pattern with IIFE for encapsulation
- Clear function names with JSDoc comments
- Consistent indentation (4 spaces)

### Testing

**Manual testing checklist:**
1. Event CRUD operations
2. Date parsing for all patterns
3. View mode switching
4. Filter combinations
5. Export functions (JSON, PNG, PDF)
6. Timeline management (create, rename, delete, duplicate)
7. Zoom/pan interactions
8. localStorage persistence

**Browser compatibility:**
- Chrome/Edge (Chromium) ✅
- Firefox ✅
- Safari ✅
- Mobile browsers (limited - desktop-optimized UI)

### Debugging

**Common issues:**

**localStorage full:**
```javascript
// Check usage
console.log(JSON.stringify(localStorage).length)
```

**Date parsing failures:**
```javascript
// Test parser directly
console.log(DateParser.parseDeadlineText("your text here"))
```

**SVG rendering issues:**
```javascript
// Check computed dimensions
console.log(Renderer.getViewBox())
```

## Extending the Application

### Adding New Date Patterns

Edit `dateParser.js` and add new regex patterns:

```javascript
function parseDeadlineText(text) {
    const lower = text.toLowerCase().trim();
    
    // Add your pattern here
    const myPattern = /your regex pattern/;
    if (myPattern.test(lower)) {
        // Extract and calculate date
        return '2026-01-01';  // Return ISO date
    }
    
    // ... existing patterns
}
```

### Adding New View Modes

1. Add radio button in `index.html`
2. Update `Renderer.setViewMode()` in `renderer.js`
3. Implement grouping logic in `Renderer.render()`

### Adding New Export Formats

1. Add button in `index.html`
2. Implement export function in `app.js`
3. Use `Renderer` API to get current state

### Customizing Colors

Colors are assigned in `renderer.js` using a deterministic hash:

```javascript
function getColorForEntity(entity) {
    // Modify color palette here
    const colors = ['#3b82f6', '#10b981', '#f59e0b', ...];
    const hash = hashString(entity);
    return colors[hash % colors.length];
}
```

## Data Model

### Timeline Management

Timelines are stored as an array in localStorage:

```javascript
const timelines = [
    {
        id: "uuid-1",
        name: "Q1 2026 Initiatives",
        events: [...],
        createdAt: "2025-12-10T00:00:00Z"
    },
    // ... more timelines
]
```

Active timeline ID is stored separately:
```javascript
const activeTimelineId = "uuid-1"
```

### Event Properties

**Required:**
- `title` - Event name
- `deadlineText` - Human-readable deadline
- `computedDate` - ISO 8601 date (auto-generated from deadlineText)

**Optional:**
- `description` - Detailed description
- `goal` - Strategic category
- `entities` - Array of primary entities
- `secondaryEntities` - Array of secondary entities
- `startDate` - Start date for date ranges
- `endDate` - End date for date ranges
- `isOngoing` - Boolean flag for ongoing events

## Performance Considerations

**Scalability:**
- Tested with 100+ events per timeline
- SVG rendering may slow with 500+ events
- Consider pagination or virtualization for larger datasets

**Optimization opportunities:**
- Implement virtual scrolling for event list
- Debounce zoom/pan transformations
- Cache rendered SVG elements
- Use canvas instead of SVG for very large timelines

## Browser Compatibility

**Minimum requirements:**
- ES6 support (Chrome 51+, Firefox 54+, Safari 10+, Edge 15+)
- SVG 1.1
- localStorage API
- Blob API (for exports)

**Known limitations:**
- PDF export quality depends on browser's canvas implementation
- Touch gestures not optimized for mobile devices
- localStorage size limits vary by browser (typically 5-10MB)

## Contributing

**Code structure principles:**
1. Keep modules decoupled (use defined APIs)
2. Validate all user inputs
3. Handle edge cases gracefully
4. Maintain backward compatibility for data formats
5. Document public APIs with JSDoc

**Pull request checklist:**
- [ ] Test in Chrome, Firefox, Safari
- [ ] Verify localStorage persistence
- [ ] Check date parser for edge cases
- [ ] Test all export formats
- [ ] Update documentation if API changes

## License

MIT - Feel free to modify and distribute
- **Export PDF**: Save current view as PDF document

## Examples of Supported Date Formats

```
"by September 2026"     → 2026-09-01
"mid-2027"              → 2027-07-01
"late 2026"             → 2026-11-01
"early 2027"            → 2027-03-01
"Q1 2026"               → 2026-02-01
"Q2 2027"               → 2027-05-01
"spring 2026"           → 2026-04-01
"summer 2027"           → 2027-07-01
"by FY27"               → 2027-09-30
"starting in 2026"      → 2026-01-01
"by the end of 2027"    → 2027-12-01
"2026"                  → 2026-07-01
```

## Technical Details

### Architecture
- **Pure HTML/CSS/JavaScript** - No frameworks required
- **SVG Rendering** - Crisp, scalable graphics
- **localStorage** - Browser-based data persistence
- **Offline-First** - All libraries bundled locally

### Browser Compatibility
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

### File Structure
```
Timeline Visualizer/
├── index.html          # Main HTML structure
├── styles.css          # All styling
├── dateParser.js       # Vague date parsing logic
├── dataManager.js      # Data storage & management
├── renderer.js         # Timeline visualization
├── app.js             # Main application controller
├── libs/              # External libraries
│   ├── html2canvas.min.js
│   └── jspdf.umd.min.js
└── README.md          # This file
```

## Tips & Best Practices

### Creating Events
- Use consistent entity names (e.g., always "Marketing Team" not sometimes "Marketing")
- Use consistent goal categories to make filtering more useful
- Include descriptions for context others might need

### Timeline Organization
- Create separate timelines for different planning cycles
- Use meaningful timeline names (e.g., "2026-2027 Initiatives")
- Export timelines regularly as backup

### Visualization
- Use "Single Timeline" for presentations to executives
- Use "Split by Entity" for resource planning
- Use "Split by Goal" for strategic planning
- Zoom in for detail, zoom out for overview

### Export Guidelines
- Export PNG at maximum zoom for best quality
- Export JSON regularly for backup
- PDF exports include current zoom level and filters

## Keyboard Shortcuts

While these aren't built-in keyboard shortcuts, you can use:
- **Tab**: Navigate between form fields
- **Enter**: Submit forms
- **Escape**: Close modals (with browser support)

## Troubleshooting

### Events not appearing?
- Check your filters - try clicking "Clear Filters"
- Ensure the event has a valid computed date
- Try zooming out to see the full timeline

### Can't see older/newer events?
- Pan left/right by clicking and dragging
- Zoom out to see more of the timeline

### Export not working?
- Check browser console for errors
- Ensure libraries loaded correctly
- Try refreshing the page

### Lost data?
- Data is stored in browser localStorage
- Clearing browser data will delete timelines
- Regular JSON exports recommended for backup

## Future Enhancements (Potential)

- Undo/Redo functionality
- Drag events to change dates
- Smart label collision avoidance
- Custom color schemes
- Event dependencies/relationships
- Milestone markers
- Range-based events (not just points)

## License

MIT License - Feel free to use, modify, and distribute this tool for personal or commercial use.

## Support

For issues or questions, please refer to the inline documentation or create an issue in your project management system.

---

**Version**: 1.0  
**Last Updated**: December 2025  
**Created for**: Initiative deadline tracking and visualization
