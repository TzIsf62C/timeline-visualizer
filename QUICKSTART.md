# Quick Start Guide

Get started with Timeline Visualizer in under 5 minutes.

## Open the Application

1. Double-click `index.html` to open in your browser
2. That's it! No installation or setup required
3. **Sample timeline loads automatically** with 21 events spanning 2026-2027

## Explore the Sample Data

On first launch, you'll see a pre-loaded sample timeline with:
- 21 company initiatives across multiple entities
- Various deadline formats (Q1 2026, mid-2027, by FY27, etc.)
- Mix of strategic goals (Revenue Growth, Operational Excellence, etc.)
- Different event types (point events, date ranges, ongoing projects)

**Experiment with:**
- Zooming in/out
- Different view modes
- Filtering by entity or goal
- Clicking on events for details

## Create Your First Event

1. Click the **+** button next to "Events" in the sidebar
2. Fill in the event form:
   - **Title**: Your initiative name
   - **Goal**: Strategic category (e.g., "Revenue Growth")
   - **Entity**: Team or department (e.g., "Product Team")
   - **Deadline Text**: Type naturally (e.g., "mid-2026" or "Q1 2027")
3. The computed date appears automatically as you type
4. Click **Save Event**
5. Your event appears on the timeline

## Navigation Controls

### Zoom
- **Mouse wheel**: Scroll to zoom in/out (0.5x to 5x)
- **Slider**: Use the zoom slider in the bottom-right
- **Reset**: Click the **⟲** button to reset zoom and position

### Pan
- **Click and drag** anywhere on the timeline to move left/right
- **Mouse wheel on timeline**: Horizontal scrolling

### Interact with Events
- **Click an event** to see full details
- **Hover** over events for visual feedback
- **Edit**: Click Edit button in the event detail modal
- **Delete**: Click Delete button in the event detail modal

### Theme Toggle
- **Click the moon/sun icon** (top-right) to switch between dark and light themes
- Theme preference is saved automatically
- Adapts to your system theme on first load

## View Modes

Switch between three visualization styles using the radio buttons in the sidebar:

### Single Timeline (Default)
All events on one unified timeline. Events alternate above/below the axis to prevent overlaps. Best for seeing overall chronology and timeline density.

### Split by Entity
Each team/entity gets its own horizontal timeline. Primary entities appear above, secondary below. Best for capacity planning and resource allocation.

### Split by Goal
Each goal/objective gets its own horizontal timeline. Best for tracking strategic initiatives and balancing portfolios.

**Legend:** Click the **ⓘ** button (bottom-right) to see entity color mappings. With 25 distinct colors, even large teams have clear visual separation.

## Filtering Events

Use the filters in the sidebar to focus on specific events:

1. **Search box**: Type to search titles, descriptions, entities, and goals
2. **Entity dropdown**: Show only events for a specific team
3. **Goal dropdown**: Show only events for a specific objective
4. **Clear Filters**: Reset all filters at once

Filters work in all three view modes.

## Timeline Management

### Create New Timeline
1. Click **+** next to "Timelines" in the sidebar
2. Enter a name
3. Click Save

### Switch Timelines
Click any timeline in the list to switch to it.

### Rename, Duplicate, or Delete
Hover over any timeline to reveal action buttons:
- **✎ (pencil)**: Rename
- **⧉ (copy)**: Duplicate
- **× (cross)**: Delete

## Export Your Timeline

### For Presentations (PNG)
1. Adjust zoom and filters to show what you want
2. Choose your theme (light for printing, dark for screens)
3. Click **Export PNG**
4. Choose background option (transparent or opaque)
5. Save the image file
6. Insert into your presentation

### For Documents (PDF)
1. Adjust zoom and filters
2. Choose your theme
3. Click **Export PDF**
4. Choose background option
5. Save the PDF file

### For Backup or Sharing (JSON)
1. Click **Export JSON**
2. Save the file
3. Share with colleagues or keep as backup
4. Others can import using **Import JSON**
5. All timelines and events are preserved

## Supported Date Formats

Type deadlines naturally - the app understands:

| What You Type | Computed Date |
|--------------|---------------|
| `by September 2026` | September 1, 2026 |
| `mid-2027` | July 1, 2027 |
| `Q1 2026` | February 1, 2026 |
| `early 2026` | March 1, 2026 |
| `late 2027` | October 1, 2027 |
| `by FY27` | September 30, 2027 |
| `starting in 2026` | January 1, 2026 |
| `by the end of 2027` | December 1, 2027 |
| `spring 2026` | April 1, 2026 |

## Best Practices

### Use Consistent Names
Always use the same entity and goal names. The app is case-sensitive.

**Good:**
- Entity: "Engineering Team" (every time)
- Goal: "Product Launch" (every time)

**Bad:**
- Entity: "Engineering", "Eng Team", "Engineering Team" (inconsistent)

### Regular Backups
Export JSON files monthly or after major updates. Your data is stored in your browser's local storage, which can be cleared.

### Filter Combinations
Combine multiple filters for powerful insights:
- Search for "launch" + filter by "Product Team"
- Filter by goal + search for specific keywords

### Zoom Strategy
- **Zoomed out**: See big picture, identify clusters
- **Zoomed in**: Read details, precise positioning

## Common Questions

**Where is my data stored?**
In your browser's local storage. It stays on your computer and never leaves your device. Completely private and secure.

**Can I use this offline?**
Yes, completely. After the first load, no internet connection is needed.

**Can I share timelines with my team?**
Export as JSON and share the file. Others can import it into their own instance. Export as PNG/PDF for viewing-only sharing.

**How many events can I add?**
Tested with 100+ events. Performance may degrade beyond 500 events. The sample timeline has 21 events.

**Can I undo changes?**
Not currently. Export JSON files regularly as backups.

**What are the different event types?**
- **Point events:** Single date milestones (shown as dots)
- **Date ranges:** Events with start and end dates (shown as bars)
- **Ongoing events:** Projects with no end date (shown with arrows)

**Why do some entities look similar?**
The app uses 25 distinct colors. If you have more than 25 entities, colors will repeat. Keep entity names consistent to maintain proper color mapping.

## Need More Help?

- **Technical issues**: See README.md for developer documentation
- **Can't find a file**: Make sure all files are in the same folder as `index.html`
- **Date not parsing**: Check the supported formats table above

## Example Workflow

Here's a typical workflow for tracking company initiatives:

1. **Explore the pre-loaded sample data** to see how it works
2. **Create a new timeline** named "2026 Company Initiatives" or clear the sample and reuse it
3. **Add major milestones** first (product launches, market entries)
4. **Add supporting events** (launches, completions, key dates)
5. **Use consistent entity names** for each team (case-sensitive)
6. **Use consistent goal names** for strategic objectives
7. **Try the legend** (ⓘ button) to verify entity colors are distinct
8. **Switch to Split by Entity view** to check team capacity
9. **Switch to Split by Goal view** to track strategic progress
10. **Toggle to light theme** for printing/presentations
11. **Export PNG/PDF** for executive presentations
12. **Export JSON** regularly for backup

Start with the sample data to get comfortable, then scale up to your full initiative list.

**Q: I don't see my events**  
A: Click "Clear Filters" - you might have an active filter

**Q: How do I backup my data?**  
A: Click "Export JSON" regularly - this saves everything

**Q: Can I share timelines with others?**  
A: Yes! Export as PNG/PDF for viewing, or JSON for them to import

**Q: Events overlap in Single Timeline view?**  
A: Events automatically alternate above/below. For even clearer separation, try Split by Entity or Split by Goal views

**Q: How do I delete an event?**  
A: Click the event → Edit → Delete button

**Q: Can I change the theme?**  
A: Yes! Click the moon/sun icon in the top-right corner. Light theme is great for printing and presentations

**Q: The dotted lines look weird for events below the timeline**  
A: This was fixed - lines now stop at the event title for a clean look

**Q: Some colors look too similar**  
A: The app now uses 25 highly distinct colors (upgraded from 10). Check the legend (ⓘ) to see all entity color mappings

## 📈 Sample Use Cases

### Executive Dashboard
1. Create timeline "Q2-Q4 2026 Priorities"
2. Add top 10 company initiatives
3. Use Single Timeline view
4. Export PNG for board presentation

### Resource Planning
1. Add all team projects
2. Use Split by Entity view
3. Identify resource conflicts
4. Adjust deadlines as needed

### Strategic Planning
1. Add strategic initiatives
2. Use Split by Goal view
3. Ensure balanced portfolio
4. Export PDF for planning docs

## 🎉 You're Ready!

You now know everything to start visualizing your company initiatives. 

**Next Step**: Explore the sample timeline, then create your first custom event!

## 🆕 Recent Updates

- **Auto-load sample timeline** on first use (21 example events)
- **25 distinct entity colors** (upgraded from 10 for better visual clarity)
- **Light/dark theme toggle** with system preference detection
- **Improved connector lines** for cleaner visual appearance
- **Enhanced split view** with better entity separation (primary/secondary)

---

Need help? Check the full README.md for comprehensive documentation.
