/**
 * Renderer - Handles all timeline visualization and rendering
 */

const Renderer = (() => {
    let svg = null;
    // Expanded color palette with 25 highly distinct colors
    // Colors chosen for maximum visual distinction
    const COLORS = [
        '#E74C3C', // Vibrant Red
        '#3498DB', // Bright Blue
        '#2ECC71', // Emerald Green
        '#F39C12', // Orange
        '#9B59B6', // Purple
        '#1ABC9C', // Turquoise
        '#E67E22', // Carrot Orange
        '#16A085', // Green Sea
        '#27AE60', // Nephritis
        '#2980B9', // Belize Hole
        '#8E44AD', // Wisteria
        '#C0392B', // Pomegranate
        '#D35400', // Pumpkin
        '#F1C40F', // Sunflower
        '#E84393', // Pink/Magenta
        '#00B894', // Mint Green
        '#0984E3', // Electric Blue
        '#6C5CE7', // Soft Purple
        '#FD79A8', // Light Pink
        '#FDCB6E', // Yellow
        '#00CEC9', // Cyan
        '#FF7675', // Salmon
        '#74B9FF', // Sky Blue
        '#A29BFE', // Periwinkle
        '#55EFC4'  // Aquamarine
    ];

    let state = {
        viewMode: 'single', // 'single', 'entity', 'goal'
        zoom: 1,
        panX: 0,
        panY: 0,
        events: [],
        filters: {
            search: '',
            entity: '',
            goal: ''
        },
        entityColors: {},
        isDragging: false,
        lastMouseX: 0,
        lastMouseY: 0
    };

    // Timeline dimensions
    const MARGIN = { top: 60, right: 100, bottom: 60, left: 100 };
    const SPLIT_VIEW_LABEL_WIDTH = 180; // Width of frozen label column in split view
    const BASE_ROW_HEIGHT = 80;
    const EVENT_RADIUS = 6;
    const TODAY_LINE_COLOR = '#E74C3C';

    /**
     * Get CSS variable value from root
     */
    function getCSSVar(varName) {
        return getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
    }

    /**
     * Calculate dynamic row height based on zoom level
     * When zoomed out, increase vertical spacing to prevent text collisions
     */
    function getRowHeight() {
        // Start increasing row height when zoom drops below 1.5
        // At zoom=1.5: height=80
        // At zoom=1.0: height=120
        // At zoom=0.5: height=240
        // At zoom=0.25: height=480
        const zoomThreshold = 2.5;
        if (state.zoom >= zoomThreshold) {
            return BASE_ROW_HEIGHT;
        }
        // Scale proportionally: height increases as zoom decreases
        return BASE_ROW_HEIGHT * (zoomThreshold / state.zoom);
    }

    /**
     * Initialize renderer
     */
    function init() {
        svg = document.getElementById('timelineCanvas');
        if (!svg) {
            console.error('Timeline canvas not found');
            return;
        }
        setupEventListeners();
        window.addEventListener('resize', () => render());
    }

    /**
     * Setup event listeners for interactions
     */
    function setupEventListeners() {
        if (!svg) return;
        
        // Pan with mouse drag
        svg.addEventListener('mousedown', handleMouseDown);
        svg.addEventListener('mousemove', handleMouseMove);
        svg.addEventListener('mouseup', handleMouseUp);
        svg.addEventListener('mouseleave', handleMouseUp);

        // Horizontal scroll with wheel
        svg.addEventListener('wheel', handleWheel, { passive: false });

        // Zoom slider
        const zoomSlider = document.getElementById('zoomSlider');
        zoomSlider.addEventListener('input', (e) => {
            setZoom(parseFloat(e.target.value));
        });
        
        // Reset zoom button
        document.getElementById('resetZoomBtn').addEventListener('click', () => {
            state.zoom = 1;
            state.panX = 0;
            state.panY = 0;
            zoomSlider.value = 1;
            render();
        });
        
        // Keyboard shortcuts for zoom
        document.addEventListener('keydown', handleKeyboardZoom);
    }
    
    /**
     * Handle keyboard shortcuts for zoom control
     */
    function handleKeyboardZoom(e) {
        // Check for Cmd (Mac) or Ctrl (Windows/Linux)
        if (e.metaKey || e.ctrlKey) {
            if (e.key === '=' || e.key === '+') {
                // Zoom in
                e.preventDefault();
                setZoom(state.zoom * 1.2);
            } else if (e.key === '-' || e.key === '_') {
                // Zoom out
                e.preventDefault();
                setZoom(state.zoom / 1.2);
            } else if (e.key === '0') {
                // Reset zoom
                e.preventDefault();
                const zoomSlider = document.getElementById('zoomSlider');
                state.zoom = 1;
                state.panX = 0;
                state.panY = 0;
                if (zoomSlider) {
                    zoomSlider.value = 1;
                }
                render();
            }
        }
    }

    /**
     * Handle mouse down for panning
     */
    function handleMouseDown(e) {
        if (e.target.tagName === 'circle' || e.target.tagName === 'text') {
            return; // Don't start panning if clicking on an event
        }
        state.isDragging = true;
        state.lastMouseX = e.clientX;
        state.lastMouseY = e.clientY;
        svg.classList.add('grabbing');
    }

    /**
     * Handle mouse move for panning
     */
    function handleMouseMove(e) {
        if (!state.isDragging) return;

        const dx = e.clientX - state.lastMouseX;
        const dy = e.clientY - state.lastMouseY;

        state.panX += dx;
        state.panY += dy;

        state.lastMouseX = e.clientX;
        state.lastMouseY = e.clientY;

        constrainPan();
        render();
    }

    /**
     * Handle mouse up
     */
    function handleMouseUp() {
        state.isDragging = false;
        svg.classList.remove('grabbing');
    }

    /**
     * Handle wheel for horizontal/vertical scrolling
     */
    function handleWheel(e) {
        e.preventDefault();
        
        // Use horizontal wheel/trackpad motion for horizontal panning
        if (e.deltaX !== 0) {
            state.panX -= e.deltaX;
        }
        
        // In split view, use vertical scroll for vertical panning if content is larger than screen
        if ((state.viewMode === 'entity' || state.viewMode === 'goal') && e.deltaY !== 0) {
            state.panY -= e.deltaY;
        }
        // In single timeline view, vertical scroll does nothing
        
        constrainPan();
        render();
    }

    /**
     * Constrain pan to keep timeline endpoints visible
     */
    function constrainPan() {
        if (!svg || !state.events || state.events.length === 0) return;
        
        const rect = svg.getBoundingClientRect();
        const width = rect.width;
        const height = rect.height;
        
        // Calculate timeline bounds from all events
        const dates = [];
        state.events.forEach(e => {
            const start = new Date(e.startDate || e.computedDate);
            if (!isNaN(start.getTime())) dates.push(start);
            if (e.endDate) {
                const end = new Date(e.endDate);
                if (!isNaN(end.getTime())) dates.push(end);
            }
        });
        
        if (dates.length === 0) return;
        
        const minDate = new Date(Math.min(...dates));
        const maxDate = new Date(Math.max(...dates));
        const padding = (maxDate - minDate) * 0.1 || 86400000 * 30;
        const startDate = new Date(minDate.getTime() - padding);
        const endDate = new Date(maxDate.getTime() + padding);
        
        // Adjust for split view with frozen label column
        const leftMargin = (state.viewMode === 'entity' || state.viewMode === 'goal') 
            ? SPLIT_VIEW_LABEL_WIDTH 
            : MARGIN.left;
        
        const timelineWidth = width - leftMargin - MARGIN.right;
        const scale = (timelineWidth * state.zoom) / (endDate - startDate);
        const totalTimelineWidth = (endDate - startDate) * scale;
        
        // Constrain horizontal pan
        // Left endpoint cannot go past right edge of screen
        const maxPanX = width - leftMargin;
        // Right endpoint cannot go past left edge of screen
        const minPanX = -(totalTimelineWidth - leftMargin);
        
        state.panX = Math.max(minPanX, Math.min(maxPanX, state.panX));
        
        // Constrain vertical pan for split view modes
        if (state.viewMode === 'entity' || state.viewMode === 'goal') {
            // Count number of rows
            let rowCount = 0;
            if (state.viewMode === 'entity') {
                const entities = new Set();
                state.events.forEach(event => {
                    const primaryEntities = Array.isArray(event.entities) ? event.entities : [event.entity];
                    const secondaryEntities = Array.isArray(event.secondaryEntities) ? event.secondaryEntities : [];
                    const allEntities = [...primaryEntities, ...secondaryEntities];
                    allEntities.forEach(e => entities.add(e));
                });
                rowCount = entities.size;
            } else {
                const goals = new Set();
                state.events.forEach(event => {
                    if (event.goal) goals.add(event.goal);
                });
                rowCount = goals.size;
            }
            
            if (rowCount > 0) {
                // Calculate total content height with dynamic row height
                const rowHeight = getRowHeight();
                const totalContentHeight = rowCount * rowHeight;
                
                // First row should not go below MARGIN.top
                const maxPanY = 0;
                
                // Last row should not go above bottom margin
                const minPanY = -(totalContentHeight - height + MARGIN.top + MARGIN.bottom);
                
                state.panY = Math.max(minPanY, Math.min(maxPanY, state.panY));
            }
        }
    }

    /**
     * Set zoom level with viewport center as fixed point
     */
    function setZoom(newZoom) {
        if (!svg) {
            state.zoom = Math.max(0.1, Math.min(10, newZoom));
            return;
        }
        
        const rect = svg.getBoundingClientRect();
        const viewportCenterX = rect.width / 2;
        const viewportCenterY = rect.height / 2;
        
        // Calculate the timeline position at viewport center before zoom
        const oldZoom = state.zoom;
        const timelinePosAtCenter = viewportCenterX - state.panX - MARGIN.left;
        const relativePos = timelinePosAtCenter / oldZoom;
        
        // For split view, also maintain vertical center when row height changes
        let oldRowHeight, newRowHeight;
        if (state.viewMode === 'entity' || state.viewMode === 'goal') {
            oldRowHeight = getRowHeight();
        }
        
        // Update zoom
        state.zoom = Math.max(0.1, Math.min(10, newZoom));
        
        // Adjust horizontal pan so the same timeline position stays at viewport center
        const newTimelinePosAtCenter = relativePos * state.zoom;
        state.panX = viewportCenterX - newTimelinePosAtCenter - MARGIN.left;
        
        // Adjust vertical pan to maintain vertical center in split view
        if (state.viewMode === 'entity' || state.viewMode === 'goal') {
            newRowHeight = getRowHeight();
            if (oldRowHeight !== newRowHeight) {
                // Calculate which row is at viewport center
                const rowAtCenter = (viewportCenterY - state.panY - MARGIN.top) / oldRowHeight;
                // Adjust panY so that same row stays at viewport center with new height
                state.panY = viewportCenterY - MARGIN.top - (rowAtCenter * newRowHeight);
            }
        }
        
        constrainPan();
        
        const zoomSlider = document.getElementById('zoomSlider');
        if (zoomSlider) {
            zoomSlider.value = Math.max(0.5, Math.min(5, state.zoom));
        }
        render();
    }

    /**
     * Set view mode
     */
    function setViewMode(mode) {
        state.viewMode = mode;
        render();
    }

    /**
     * Set events to render
     */
    function setEvents(events) {
        state.events = events;
        assignColors(events);
        render();
    }

    /**
     * Set filters
     */
    function setFilters(filters) {
        state.filters = { ...state.filters, ...filters };
        render();
    }

    /**
     * Assign colors to entities
     */
    function assignColors(events) {
        const entities = new Set();
        events.forEach(event => {
            // Handle both old single entity and new multiple entities
            if (Array.isArray(event.entities)) {
                event.entities.forEach(e => entities.add(e));
            } else if (event.entity) {
                entities.add(event.entity);
            }
        });
        
        Array.from(entities).forEach((entity, i) => {
            if (!state.entityColors[entity]) {
                state.entityColors[entity] = COLORS[i % COLORS.length];
            }
        });
    }

    /**
     * Get color for entity or entities
     */
    function getEntityColor(entityOrEntities) {
        // If array, return first entity's color
        if (Array.isArray(entityOrEntities)) {
            return state.entityColors[entityOrEntities[0]] || COLORS[0];
        }
        return state.entityColors[entityOrEntities] || COLORS[0];
    }
    
    /**
     * Get all colors for an event's entities (primary + secondary)
     */
    function getEventColors(event) {
        const entities = Array.isArray(event.entities) ? event.entities : [event.entity];
        const colors = entities.map(e => state.entityColors[e] || COLORS[0]);
        
        // Add secondary entities with lower opacity
        let secondaryEntities = event.secondaryEntities || [];
        if (!Array.isArray(secondaryEntities)) {
            secondaryEntities = [];
        }
        
        const secondaryColors = secondaryEntities.map(e => {
            const color = state.entityColors[e] || COLORS[0];
            // Return lighter version for secondary
            return color + '80'; // Add 50% opacity
        });
        
        return [...colors, ...secondaryColors];
    }

    /**
     * Filter events based on current filters
     */
    function getFilteredEvents() {
        const filtered = state.events.filter(event => {
            // Search filter
            if (state.filters.search) {
                const search = state.filters.search.toLowerCase();
                const entities = Array.isArray(event.entities) ? event.entities : [event.entity];
                const entityText = entities.join(' ').toLowerCase();
                
                const matchesSearch = 
                    event.title.toLowerCase().includes(search) ||
                    event.description?.toLowerCase().includes(search) ||
                    event.goal.toLowerCase().includes(search) ||
                    entityText.includes(search) ||
                    event.deadlineText.toLowerCase().includes(search);
                
                if (!matchesSearch) return false;
            }

            // Entity filter
            if (state.filters.entity) {
                const entities = Array.isArray(event.entities) ? event.entities : [event.entity];
                const secondaryEntities = Array.isArray(event.secondaryEntities) ? event.secondaryEntities : [];
                const allEntities = [...entities, ...secondaryEntities];
                
                const isPrimary = entities.includes(state.filters.entity);
                const isSecondary = secondaryEntities.includes(state.filters.entity);
                const passes = allEntities.includes(state.filters.entity);
                
                if (!passes) {
                    return false;
                }
            }

            // Goal filter
            if (state.filters.goal && event.goal !== state.filters.goal) {
                return false;
            }

            return true;
        });
        
        return filtered;
    }

    /**
     * Main render function
     */
    function render() {
        if (!svg) return;
        
        const filteredEvents = getFilteredEvents();

        // Clear SVG content except defs
        const children = Array.from(svg.children);
        children.forEach(child => {
            if (child.tagName !== 'defs') {
                svg.removeChild(child);
            }
        });
        
        // Ensure defs exists
        let defs = svg.querySelector('defs');
        if (!defs) {
            svg.innerHTML = `
                <defs>
                    <marker id="arrowhead" markerWidth="10" markerHeight="7" 
                        refX="9" refY="3.5" orient="auto">
                        <polygon points="0 0, 10 3.5, 0 7" fill="#666" />
                    </marker>
                </defs>
            `;
        }

        if (filteredEvents.length === 0) {
            renderEmptyState();
            return;
        }

        // Render based on view mode
        switch (state.viewMode) {
            case 'single':
                renderSingleTimeline(filteredEvents);
                break;
            case 'entity':
                renderSplitTimeline(filteredEvents, 'entity');
                break;
            case 'goal':
                renderSplitTimeline(filteredEvents, 'goal');
                break;
        }
    }

    /**
     * Render empty state
     */
    function renderEmptyState() {
        const rect = svg.getBoundingClientRect();
        const text = createSVGElement('text', {
            x: rect.width / 2,
            y: rect.height / 2,
            'text-anchor': 'middle',
            fill: '#666',
            'font-size': '16px'
        });
        text.textContent = 'No events to display. Add an event to get started!';
        svg.appendChild(text);
    }

    /**
     * Calculate date label positions
     */
    function calculateDateLabelPositions(startDate, endDate, startX, scale) {
        const totalDays = (endDate - startDate) / (1000 * 60 * 60 * 24);
        let interval;
        if (totalDays < 90) {
            interval = 7;
        } else if (totalDays < 365) {
            interval = 30;
        } else {
            interval = 90;
        }

        const dateLabelPositions = [];
        const currentDate = new Date(startDate);
        const LABEL_WIDTH = 60;
        
        while (currentDate <= endDate) {
            const x = startX + (currentDate - startDate) * scale;
            dateLabelPositions.push({
                x: x - LABEL_WIDTH / 2,
                x2: x + LABEL_WIDTH / 2
            });
            currentDate.setDate(currentDate.getDate() + interval);
        }
        
        return dateLabelPositions;
    }

    /**
     * Assign collision-free levels to events
     */
    function assignLevelsToEvents(eventsWithX, MIN_SPACING, dateLabelPositions = []) {
        const levels = [];
        
        eventsWithX.forEach(({ event, x, x2, date }) => {
            let assignedLevel = -1;
            
            for (let i = 0; i < levels.length; i++) {
                const lastInLevel = levels[i][levels[i].length - 1];
                if (lastInLevel.x2 + MIN_SPACING < x) {
                    // Check if this position conflicts with date labels
                    let conflictsWithDateLabel = false;
                    for (const dateLabel of dateLabelPositions) {
                        if (!(x2 + 30 < dateLabel.x || x - 30 > dateLabel.x2)) {
                            conflictsWithDateLabel = true;
                            break;
                        }
                    }
                    
                    if (!conflictsWithDateLabel) {
                        assignedLevel = i;
                        break;
                    }
                }
            }
            
            if (assignedLevel === -1) {
                assignedLevel = levels.length;
                levels.push([]);
            }
            
            levels[assignedLevel].push({ event, x, x2, date });
        });
        
        return levels;
    }

    /**
     * Calculate event positions with collision detection
     */
    function calculateEventPositions(events, startDate, endDate, axisStartX, scale, axisY, dateLabelPositions = []) {
        const LABEL_HEIGHT = 30;
        const MIN_SPACING = 200; // Spacing to prevent label text overlap
        const positions = [];
        
        // Check if we're filtering by entity
        const filteringByEntity = state.filters.entity;
        
        // Calculate x positions and sort by date
        const eventsWithX = events.map(event => {
            const eventDate = new Date(event.startDate || event.computedDate);
            if (isNaN(eventDate.getTime())) return null;
            
            const x = axisStartX + (eventDate - startDate) * scale;
            let x2 = x;
            
            if (event.endDate && !event.isOngoing) {
                const endEventDate = new Date(event.endDate);
                if (!isNaN(endEventDate.getTime())) {
                    x2 = axisStartX + (endEventDate - startDate) * scale;
                }
            }
            
            return { event, x, x2, date: eventDate };
        }).filter(e => e !== null);
        
        eventsWithX.sort((a, b) => a.date - b.date);
        
        // If filtering by entity, separate primary and secondary events
        if (filteringByEntity) {
            const primaryEvents = [];
            const secondaryEvents = [];
            
            eventsWithX.forEach(({ event, x, x2, date }) => {
                const primaryEntities = Array.isArray(event.entities) ? event.entities : [event.entity];
                const isPrimary = primaryEntities.includes(filteringByEntity);
                
                if (isPrimary) {
                    primaryEvents.push({ event, x, x2, date });
                } else {
                    secondaryEvents.push({ event, x, x2, date });
                }
            });
            
            // Assign levels for primary events (above the line)
            const primaryLevels = assignLevelsToEvents(primaryEvents, MIN_SPACING, dateLabelPositions);
            
            // Assign levels for secondary events (below the line)
            const secondaryLevels = assignLevelsToEvents(secondaryEvents, MIN_SPACING, dateLabelPositions);
            
            // Position primary events above
            primaryLevels.forEach((level, levelIndex) => {
                level.forEach(({ event, x, x2 }) => {
                    const offset = levelIndex + 1;
                    const y = axisY - (offset * LABEL_HEIGHT);
                    positions.push({ event, x, x2, y, level: levelIndex });
                });
            });
            
            // Position secondary events below
            secondaryLevels.forEach((level, levelIndex) => {
                level.forEach(({ event, x, x2 }) => {
                    const offset = levelIndex + 1;
                    const y = axisY + (offset * LABEL_HEIGHT);
                    positions.push({ event, x, x2, y, level: levelIndex });
                });
            });
            
            return positions;
        }
        
        // Original alternating logic when not filtering by entity
        
        // Assign levels using improved collision detection
        const levels = [];
        
        // Helper function to check if event fits in level without overlapping
        const fitsInLevelSingle = (level, x, x2, dateLabelPositions, debugEvent = null) => {
            // Check against all events in the level
            for (const existing of level) {
                const existingStart = existing.x - MIN_SPACING;
                const existingEnd = existing.x2 + MIN_SPACING;
                
                if (!(x2 < existingStart || x > existingEnd)) {
                    return false; // Overlap with existing event
                }
            }
            
            // Note: Date label collision check removed - date labels are on the axis,
            // events are positioned above/below, so they don't visually collide
            
            return true; // Fits in this level
        };
        
        eventsWithX.forEach(({ event, x, x2, date }) => {
            let assignedLevel = -1;
            
            // Try to find an existing level where this event fits
            for (let i = 0; i < levels.length; i++) {
                if (fitsInLevelSingle(levels[i], x, x2, dateLabelPositions)) {
                    assignedLevel = i;
                    break;
                }
            }
            
            // If no existing level works, create a new one
            if (assignedLevel === -1) {
                assignedLevel = levels.length;
                levels.push([]);
            }
            
            levels[assignedLevel].push({ event, x, x2, date });
        });
        
        // Convert levels to y positions (alternate above/below axis)
        levels.forEach((level, levelIndex) => {
            level.forEach(({ event, x, x2 }) => {
                // Alternate: even levels go up, odd levels go down
                const direction = levelIndex % 2 === 0 ? -1 : 1;
                const offset = Math.floor(levelIndex / 2) + 2; // Start at 2 to skip first row
                const y = axisY + (direction * offset * LABEL_HEIGHT);
                
                positions.push({ event, x, x2, y, level: levelIndex });
            });
        });
        
        return positions;
    }

    /**
     * Render single timeline view
     */
    function renderSingleTimeline(events) {
        const rect = svg.getBoundingClientRect();
        const width = rect.width;
        const height = rect.height;

        // Calculate date range (considering both start and end dates)
        const dates = [];
        events.forEach(e => {
            const start = new Date(e.startDate || e.computedDate);
            if (!isNaN(start.getTime())) dates.push(start);
            if (e.endDate) {
                const end = new Date(e.endDate);
                if (!isNaN(end.getTime())) dates.push(end);
            }
        });
        
        if (dates.length === 0) return;

        // Always include today in the date range
        const today = new Date();
        dates.push(today);

        const minDate = new Date(Math.min(...dates));
        const maxDate = new Date(Math.max(...dates));

        // Add padding to date range
        const padding = (maxDate - minDate) * 0.1 || 86400000 * 30; // 30 days if same date
        const startDate = new Date(minDate.getTime() - padding);
        const endDate = new Date(maxDate.getTime() + padding);

        // Calculate scale
        const timelineWidth = width - MARGIN.left - MARGIN.right;
        const scale = (timelineWidth * state.zoom) / (endDate - startDate);
        const centerY = height / 2;

        // Draw timeline axis
        const axisY = centerY + state.panY;
        const axisStartX = MARGIN.left + state.panX;
        const axisEndX = axisStartX + (endDate - startDate) * scale;

        const axis = createSVGElement('line', {
            x1: axisStartX,
            y1: axisY,
            x2: axisEndX,
            y2: axisY,
            stroke: getCSSVar('--timeline-axis-color'),
            'stroke-width': 2,
            'marker-end': 'url(#arrowhead)'
        });
        svg.appendChild(axis);

        // Draw today line
        if (today >= startDate && today <= endDate) {
            const todayX = axisStartX + (today - startDate) * scale;
            const todayLine = createSVGElement('line', {
                x1: todayX,
                y1: MARGIN.top,
                x2: todayX,
                y2: height - MARGIN.bottom,
                stroke: TODAY_LINE_COLOR,
                'stroke-width': 2,
                'stroke-dasharray': '5,5'
            });
            svg.appendChild(todayLine);

            const todayLabel = createSVGElement('text', {
                x: todayX,
                y: MARGIN.top - 10,
                'text-anchor': 'middle',
                fill: TODAY_LINE_COLOR,
                'font-size': '12px',
                'font-weight': 'bold'
            });
            todayLabel.textContent = 'Today';
            svg.appendChild(todayLabel);
        }

        // Calculate date label positions for collision avoidance
        const dateLabelPositions = calculateDateLabelPositions(startDate, endDate, axisStartX, scale);
        
        // Calculate positions for events with collision detection
        const eventPositions = calculateEventPositions(events, startDate, endDate, axisStartX, scale, axisY, dateLabelPositions);

        // Draw events
        eventPositions.forEach(({ event, x, x2, y, level }) => {
            const isRange = event.endDate && !event.isOngoing;
            const eventColors = getEventColors(event);

            if (isRange) {
                // Draw range bar
                const barWidth = x2 - x;
                const barHeight = 8;
                const bar = createSVGElement('rect', {
                    x: x,
                    y: axisY - barHeight / 2,
                    width: Math.max(barWidth, 3),
                    height: barHeight,
                    fill: eventColors[0],
                    stroke: eventColors.length > 1 ? eventColors[1] : '#fff',
                    'stroke-width': 1,
                    rx: 4,
                    cursor: 'pointer',
                    'data-event-id': event.id
                });
                bar.addEventListener('click', () => window.dispatchEvent(
                    new CustomEvent('eventClicked', { detail: event })
                ));
                bar.addEventListener('mouseenter', (e) => showTooltip(e, event));
                bar.addEventListener('mouseleave', hideTooltip);
                svg.appendChild(bar);
                
                // Start marker
                const startCircle = createSVGElement('circle', {
                    cx: x,
                    cy: axisY,
                    r: EVENT_RADIUS - 1,
                    fill: eventColors[0],
                    stroke: '#fff',
                    'stroke-width': 2
                });
                svg.appendChild(startCircle);
                
                // End marker
                const endCircle = createSVGElement('circle', {
                    cx: x2,
                    cy: axisY,
                    r: EVENT_RADIUS - 1,
                    fill: eventColors[0],
                    stroke: '#fff',
                    'stroke-width': 2
                });
                svg.appendChild(endCircle);
                
                // Use center of range for label
                const centerX = (x + x2) / 2;
                
                // Connector line to label
                // For events below timeline (y > axisY), stop at top of title
                // For events above timeline (y < axisY), extend below title
                const connectorY2 = y > axisY ? y - 5 : y + 15;
                const connector = createSVGElement('line', {
                    x1: centerX,
                    y1: axisY,
                    x2: centerX,
                    y2: connectorY2,
                    stroke: eventColors[0],
                    'stroke-width': 1,
                    'stroke-dasharray': '2,2'
                });
                svg.appendChild(connector);

                // Event label
                const label = createSVGElement('text', {
                    x: centerX,
                    y: y,
                    'text-anchor': 'middle',
                    fill: getCSSVar('--event-label-color'),
                    'font-size': '11px',
                    cursor: 'pointer',
                    'data-event-id': event.id
                });
                label.textContent = event.title;
                label.addEventListener('click', () => window.dispatchEvent(
                    new CustomEvent('eventClicked', { detail: event })
                ));
                svg.appendChild(label);

                // Goal tag
                const goalTag = createSVGElement('text', {
                    x: centerX,
                    y: y + 14,
                    'text-anchor': 'middle',
                    fill: getCSSVar('--event-meta-color'),
                    'font-size': '9px'
                });
                goalTag.textContent = event.goal;
                svg.appendChild(goalTag);
                
            } else if (event.isOngoing) {
                // Draw ongoing indicator (arrow pointing right)
                const arrowWidth = 40;
                const arrowPath = createSVGElement('path', {
                    d: `M ${x} ${axisY} L ${x + arrowWidth} ${axisY}`,
                    stroke: eventColors[0],
                    'stroke-width': 4,
                    'stroke-linecap': 'round',
                    'marker-end': 'url(#arrowhead)',
                    cursor: 'pointer',
                    'data-event-id': event.id
                });
                arrowPath.addEventListener('click', () => window.dispatchEvent(
                    new CustomEvent('eventClicked', { detail: event })
                ));
                arrowPath.addEventListener('mouseenter', (e) => showTooltip(e, event));
                arrowPath.addEventListener('mouseleave', hideTooltip);
                svg.appendChild(arrowPath);
                
                // Start circle
                const circle = createSVGElement('circle', {
                    cx: x,
                    cy: axisY,
                    r: EVENT_RADIUS,
                    fill: eventColors[0],
                    stroke: eventColors.length > 1 ? eventColors[1] : '#fff',
                    'stroke-width': eventColors.length > 1 ? 3 : 2,
                    cursor: 'pointer',
                    'data-event-id': event.id
                });
                circle.addEventListener('click', () => window.dispatchEvent(
                    new CustomEvent('eventClicked', { detail: event })
                ));
                svg.appendChild(circle);

                // Connector line
                // For events below timeline (y > axisY), stop at top of title
                // For events above timeline (y < axisY), extend below title
                const connectorY2 = y > axisY ? y - 5 : y + 15;
                const connector = createSVGElement('line', {
                    x1: x,
                    y1: axisY,
                    x2: x,
                    y2: connectorY2,
                    stroke: eventColors[0],
                    'stroke-width': 1,
                    'stroke-dasharray': '2,2'
                });
                svg.appendChild(connector);

                // Event label with "Ongoing"
                const label = createSVGElement('text', {
                    x: x,
                    y: y,
                    'text-anchor': 'middle',
                    fill: getCSSVar('--event-label-color'),
                    'font-size': '11px',
                    cursor: 'pointer',
                    'data-event-id': event.id
                });
                label.textContent = event.title + ' (Ongoing)';
                label.addEventListener('click', () => window.dispatchEvent(
                    new CustomEvent('eventClicked', { detail: event })
                ));
                svg.appendChild(label);

                // Goal tag
                const goalTag = createSVGElement('text', {
                    x: x,
                    y: y + 14,
                    'text-anchor': 'middle',
                    fill: getCSSVar('--event-meta-color'),
                    'font-size': '9px'
                });
                goalTag.textContent = event.goal;
                svg.appendChild(goalTag);
                
            } else {
                // Point event
                // Event circle (use gradient if multiple entities)
                const circle = createSVGElement('circle', {
                    cx: x,
                    cy: axisY,
                    r: EVENT_RADIUS,
                    fill: eventColors[0],
                    stroke: eventColors.length > 1 ? eventColors[1] : '#fff',
                    'stroke-width': eventColors.length > 1 ? 3 : 2,
                    cursor: 'pointer',
                    'data-event-id': event.id
                });
                circle.addEventListener('click', () => window.dispatchEvent(
                    new CustomEvent('eventClicked', { detail: event })
                ));
                circle.addEventListener('mouseenter', (e) => showTooltip(e, event));
                circle.addEventListener('mouseleave', hideTooltip);
                svg.appendChild(circle);

                // Connector line
                // For events below timeline (y > axisY), stop at top of title
                // For events above timeline (y < axisY), extend below title
                const connectorY2 = y > axisY ? y - 5 : y + 15;
                const connector = createSVGElement('line', {
                    x1: x,
                    y1: axisY,
                    x2: x,
                    y2: connectorY2,
                    stroke: eventColors[0],
                    'stroke-width': 1,
                    'stroke-dasharray': '2,2'
                });
                svg.appendChild(connector);

                // Event label
                const label = createSVGElement('text', {
                    x: x,
                    y: y,
                    'text-anchor': 'middle',
                    fill: getCSSVar('--event-label-color'),
                    'font-size': '11px',
                    cursor: 'pointer',
                    'data-event-id': event.id
                });
                label.textContent = event.title;
                label.addEventListener('click', () => window.dispatchEvent(
                    new CustomEvent('eventClicked', { detail: event })
                ));
                svg.appendChild(label);

                // Goal tag
                const goalTag = createSVGElement('text', {
                    x: x,
                    y: y + 14,
                    'text-anchor': 'middle',
                    fill: getCSSVar('--event-meta-color'),
                    'font-size': '9px'
                });
                goalTag.textContent = event.goal;
                svg.appendChild(goalTag);
            }
        });

        // Draw date labels on axis
        drawDateLabels(startDate, endDate, axisStartX, scale, axisY + 20);
    }

    /**
     * Render split timeline view (by entity or goal)
     */
    function renderSplitTimeline(events, splitBy) {
        const rect = svg.getBoundingClientRect();
        const width = rect.width;
        const height = rect.height;

        // Group events by split criterion
        const groups = {};
        events.forEach(event => {
            if (splitBy === 'entity') {
                // For entity split, add event to each entity's group (both primary and secondary)
                const entities = Array.isArray(event.entities) ? event.entities : [event.entity];
                const secondaryEntities = Array.isArray(event.secondaryEntities) ? event.secondaryEntities : [];
                const allEntities = [...entities, ...secondaryEntities];
                allEntities.forEach(entity => {
                    if (!groups[entity]) groups[entity] = [];
                    groups[entity].push(event);
                });
            } else {
                // For goal split, use single key
                const key = event[splitBy];
                if (!groups[key]) groups[key] = [];
                groups[key].push(event);
            }
        });

        const groupKeys = Object.keys(groups).sort();

        // Calculate date range (considering both start and end dates)
        const allDates = [];
        events.forEach(e => {
            const start = new Date(e.startDate || e.computedDate);
            if (!isNaN(start.getTime())) allDates.push(start);
            if (e.endDate) {
                const end = new Date(e.endDate);
                if (!isNaN(end.getTime())) allDates.push(end);
            }
        });
        if (allDates.length === 0) return;

        // Always include today in the date range
        const today = new Date();
        allDates.push(today);

        const minDate = new Date(Math.min(...allDates));
        const maxDate = new Date(Math.max(...allDates));

        const padding = (maxDate - minDate) * 0.1 || 86400000 * 30;
        const startDate = new Date(minDate.getTime() - padding);
        const endDate = new Date(maxDate.getTime() + padding);

        // Calculate scale (account for frozen label column)
        const timelineWidth = width - SPLIT_VIEW_LABEL_WIDTH - MARGIN.right;
        const scale = (timelineWidth * state.zoom) / (endDate - startDate);
        const axisStartX = SPLIT_VIEW_LABEL_WIDTH + state.panX;

        // Draw alternating month column backgrounds aligned with date labels
        const totalDays = (endDate - startDate) / (1000 * 60 * 60 * 24);
        let interval;
        if (totalDays < 90) {
            interval = 7; // Weekly
        } else if (totalDays < 365) {
            interval = 30; // Monthly
        } else {
            interval = 90; // Quarterly
        }
        
        const currentDate = new Date(startDate);
        let columnIndex = 0;
        let prevX = null;
        
        while (currentDate <= endDate) {
            const x = axisStartX + (currentDate - startDate) * scale;
            
            // Draw column background between previous and current tick
            if (prevX !== null && columnIndex % 2 === 0) {
                const columnBg = createSVGElement('rect', {
                    x: prevX,
                    y: 0,
                    width: x - prevX,
                    height: height,
                    fill: 'rgba(128, 128, 128, 0.08)',
                    'pointer-events': 'none'
                });
                svg.appendChild(columnBg);
            }
            
            prevX = x;
            currentDate.setDate(currentDate.getDate() + interval);
            columnIndex++;
        }
        
        // Draw final column if needed
        if (prevX !== null && columnIndex % 2 === 0) {
            const finalX = axisStartX + (endDate - startDate) * scale;
            const columnBg = createSVGElement('rect', {
                x: prevX,
                y: 0,
                width: finalX - prevX,
                height: height,
                fill: 'rgba(128, 128, 128, 0.08)',
                'pointer-events': 'none'
            });
            svg.appendChild(columnBg);
        }

        // Draw today line
        if (today >= startDate && today <= endDate) {
            const todayX = axisStartX + (today - startDate) * scale;
            const todayLine = createSVGElement('line', {
                x1: todayX,
                y1: MARGIN.top,
                x2: todayX,
                y2: height - MARGIN.bottom,
                stroke: TODAY_LINE_COLOR,
                'stroke-width': 2,
                'stroke-dasharray': '5,5'
            });
            svg.appendChild(todayLine);

            const todayLabel = createSVGElement('text', {
                x: todayX,
                y: MARGIN.top - 10,
                'text-anchor': 'middle',
                fill: TODAY_LINE_COLOR,
                'font-size': '12px',
                'font-weight': 'bold'
            });
            todayLabel.textContent = 'Today';
            svg.appendChild(todayLabel);
        }

        // Draw rows
        const rowHeight = getRowHeight();
        groupKeys.forEach((key, rowIndex) => {
            const rowY = MARGIN.top + rowIndex * rowHeight + state.panY;
            
            // Row background (starts after label column)
            if (rowIndex % 2 === 0) {
                const rowBg = createSVGElement('rect', {
                    x: SPLIT_VIEW_LABEL_WIDTH,
                    y: rowY - rowHeight / 2,
                    width: width - SPLIT_VIEW_LABEL_WIDTH,
                    height: rowHeight,
                    fill: 'rgba(255, 255, 255, 0.02)'
                });
                svg.appendChild(rowBg);
            }

            // Row label (fixed position, not affected by panX)
            const rowLabel = createSVGElement('text', {
                x: 10,
                y: rowY + 5,
                fill: 'var(--text-primary)',
                'font-size': '12px',
                'font-weight': 'bold'
            });
            rowLabel.textContent = key.length > 22 ? key.substring(0, 22) + '...' : key;
            svg.appendChild(rowLabel);

            // Row timeline
            const lineY = rowY;
            const lineStartX = axisStartX;
            const lineEndX = axisStartX + (endDate - startDate) * scale;

            const line = createSVGElement('line', {
                x1: lineStartX,
                y1: lineY,
                x2: lineEndX,
                y2: lineY,
                stroke: '#444',
                'stroke-width': 1
            });
            svg.appendChild(line);

            // Draw events in this row with collision detection
            const rowEvents = groups[key];
            const eventsWithX = rowEvents.map(event => {
                const eventDate = new Date(event.startDate || event.computedDate);
                if (isNaN(eventDate)) return null;
                
                const x = axisStartX + (eventDate - startDate) * scale;
                let x2 = x;
                
                if (event.endDate && !event.isOngoing) {
                    const endEventDate = new Date(event.endDate);
                    if (!isNaN(endEventDate.getTime())) {
                        x2 = axisStartX + (endEventDate - startDate) * scale;
                    }
                }
                
                return { event, x, x2, date: eventDate };
            }).filter(e => e !== null);
            
            eventsWithX.sort((a, b) => a.date - b.date);
            
            // Separate events into primary and secondary for this entity
            const primaryEvents = [];
            const secondaryEvents = [];
            
            eventsWithX.forEach(({ event, x, x2, date }) => {
                if (splitBy === 'entity') {
                    const primaryEntities = Array.isArray(event.entities) ? event.entities : [event.entity];
                    const isPrimary = primaryEntities.includes(key);
                    
                    if (isPrimary) {
                        primaryEvents.push({ event, x, x2, date });
                    } else {
                        secondaryEvents.push({ event, x, x2, date });
                    }
                } else {
                    // For goal split, treat all as primary
                    primaryEvents.push({ event, x, x2, date });
                }
            });
            
            // Assign levels for primary events (will go above the line)
            const MIN_SPACING = 80; // Spacing to prevent label text overlap
            const LABEL_HEIGHT = 30;
            const primaryLevels = [];
            
            // Helper function to check if an event fits in a level without overlapping
            const fitsInLevel = (level, x, x2) => {
                for (const existing of level) {
                    // Check if there's any overlap (with spacing)
                    const existingStart = existing.x - MIN_SPACING;
                    const existingEnd = existing.x2 + MIN_SPACING;
                    const newStart = x;
                    const newEnd = x2;
                    
                    // Check for overlap
                    if (!(newEnd < existingStart || newStart > existingEnd)) {
                        return false; // Overlap found
                    }
                }
                return true; // No overlap, fits in this level
            };
            
            primaryEvents.forEach(({ event, x, x2, date }) => {
                let assignedLevel = -1;
                
                // Try to find an existing level where this event fits
                for (let i = 0; i < primaryLevels.length; i++) {
                    if (fitsInLevel(primaryLevels[i], x, x2)) {
                        assignedLevel = i;
                        break;
                    }
                }
                
                // If no existing level works, create a new one
                if (assignedLevel === -1) {
                    assignedLevel = primaryLevels.length;
                    primaryLevels.push([]);
                }
                
                primaryLevels[assignedLevel].push({ event, x, x2, date, level: assignedLevel });
            });
            
            // Assign levels for secondary events (will go below the line)
            const secondaryLevels = [];
            
            secondaryEvents.forEach(({ event, x, x2, date }) => {
                let assignedLevel = -1;
                
                // Try to find an existing level where this event fits
                for (let i = 0; i < secondaryLevels.length; i++) {
                    if (fitsInLevel(secondaryLevels[i], x, x2)) {
                        assignedLevel = i;
                        break;
                    }
                }
                
                // If no existing level works, create a new one
                if (assignedLevel === -1) {
                    assignedLevel = secondaryLevels.length;
                    secondaryLevels.push([]);
                }
                
                secondaryLevels[assignedLevel].push({ event, x, x2, date, level: assignedLevel });
            });
            
            // Convert levels to y positions for labels only
            // Circles and bars always stay on the line (yOffset=0)
            // Only labels are offset to avoid text collisions
            const positioned = [];
            
            primaryLevels.forEach((level, levelIndex) => {
                level.forEach(({ event, x, x2 }) => {
                    // Labels: Level 0 = slightly above, level 1+ = further above
                    // Circles/bars: always at yOffset=0 on the timeline
                    const labelYOffset = -(levelIndex * LABEL_HEIGHT + 15);
                    positioned.push({ event, x, x2, labelYOffset });
                });
            });
            
            secondaryLevels.forEach((level, levelIndex) => {
                level.forEach(({ event, x, x2 }) => {
                    // Labels: Level 0 = slightly below, level 1+ = further below
                    // Circles/bars: always at yOffset=0 on the timeline
                    const labelYOffset = (levelIndex * LABEL_HEIGHT + 20);
                    positioned.push({ event, x, x2, labelYOffset });
                });
            });
            
            // Draw positioned events
            positioned.forEach(({ event, x, x2, labelYOffset }) => {
                const eventColors = getEventColors(event);
                const isRange = event.endDate && !event.isOngoing;

                if (isRange) {
                    // Draw range bar - always on the timeline (yOffset = 0)
                    const barWidth = x2 - x;
                    const barHeight = 6;
                    const bar = createSVGElement('rect', {
                        x: x,
                        y: lineY - barHeight / 2,
                        width: Math.max(barWidth, 3),
                        height: barHeight,
                        fill: eventColors[0],
                        stroke: eventColors.length > 1 ? eventColors[1] : '#fff',
                        'stroke-width': 1,
                        rx: 3,
                        cursor: 'pointer',
                        'data-event-id': event.id
                    });
                    bar.addEventListener('click', () => window.dispatchEvent(
                        new CustomEvent('eventClicked', { detail: event })
                    ));
                    bar.addEventListener('mouseenter', (e) => showTooltip(e, event));
                    bar.addEventListener('mouseleave', hideTooltip);
                    svg.appendChild(bar);
                    
                    // Start marker - always on the timeline
                    const startCircle = createSVGElement('circle', {
                        cx: x,
                        cy: lineY,
                        r: EVENT_RADIUS - 1,
                        fill: eventColors[0],
                        stroke: '#fff',
                        'stroke-width': 2
                    });
                    svg.appendChild(startCircle);
                    
                    // End marker - always on the timeline
                    const endCircle = createSVGElement('circle', {
                        cx: x2,
                        cy: lineY,
                        r: EVENT_RADIUS - 1,
                        fill: eventColors[0],
                        stroke: '#fff',
                        'stroke-width': 2
                    });
                    svg.appendChild(endCircle);
                    
                    // Connector line from timeline to label
                    const centerX = (x + x2) / 2;
                    const connector = createSVGElement('line', {
                        x1: centerX,
                        y1: lineY,
                        x2: centerX,
                        y2: lineY + labelYOffset,
                        stroke: eventColors[0],
                        'stroke-width': 1,
                        'stroke-dasharray': '2,2'
                    });
                    svg.appendChild(connector);
                    
                    // Label at center of range - positioned based on labelYOffset
                    const label = createSVGElement('text', {
                        x: centerX,
                        y: lineY + labelYOffset,
                        'text-anchor': 'middle',
                        fill: getCSSVar('--event-label-color'),
                        'font-size': '10px',
                        cursor: 'pointer',
                        'data-event-id': event.id
                    });
                    label.textContent = event.title;
                    label.addEventListener('click', () => window.dispatchEvent(
                        new CustomEvent('eventClicked', { detail: event })
                    ));
                    svg.appendChild(label);
                    
                } else if (event.isOngoing) {
                    // Draw ongoing indicator - always on the timeline
                    const arrowWidth = 30;
                    const arrowPath = createSVGElement('path', {
                        d: `M ${x} ${lineY} L ${x + arrowWidth} ${lineY}`,
                        stroke: eventColors[0],
                        'stroke-width': 3,
                        'stroke-linecap': 'round',
                        'marker-end': 'url(#arrowhead)',
                        cursor: 'pointer',
                        'data-event-id': event.id
                    });
                    arrowPath.addEventListener('click', () => window.dispatchEvent(
                        new CustomEvent('eventClicked', { detail: event })
                    ));
                    arrowPath.addEventListener('mouseenter', (e) => showTooltip(e, event));
                    arrowPath.addEventListener('mouseleave', hideTooltip);
                    svg.appendChild(arrowPath);
                    
                    // Start circle - always on the timeline
                    const circle = createSVGElement('circle', {
                        cx: x,
                        cy: lineY,
                        r: EVENT_RADIUS,
                        fill: eventColors[0],
                        stroke: eventColors.length > 1 ? eventColors[1] : '#fff',
                        'stroke-width': eventColors.length > 1 ? 3 : 2,
                        cursor: 'pointer',
                        'data-event-id': event.id
                    });
                    circle.addEventListener('click', () => window.dispatchEvent(
                        new CustomEvent('eventClicked', { detail: event })
                    ));
                    svg.appendChild(circle);

                    // Connector line from timeline to label
                    const connector = createSVGElement('line', {
                        x1: x,
                        y1: lineY,
                        x2: x,
                        y2: lineY + labelYOffset,
                        stroke: eventColors[0],
                        'stroke-width': 1,
                        'stroke-dasharray': '2,2'
                    });
                    svg.appendChild(connector);

                    // Event label - positioned based on labelYOffset
                    const label = createSVGElement('text', {
                        x: x,
                        y: lineY + labelYOffset,
                        'text-anchor': 'middle',
                        fill: getCSSVar('--event-label-color'),
                        'font-size': '10px',
                        cursor: 'pointer',
                        'data-event-id': event.id
                    });
                    label.textContent = event.title;
                    label.addEventListener('click', () => window.dispatchEvent(
                        new CustomEvent('eventClicked', { detail: event })
                    ));
                    svg.appendChild(label);
                    
                } else {
                    // Point event - draw circle - always on the timeline
                    const circle = createSVGElement('circle', {
                        cx: x,
                        cy: lineY,
                        r: EVENT_RADIUS,
                        fill: eventColors[0],
                        stroke: eventColors.length > 1 ? eventColors[1] : '#fff',
                        'stroke-width': eventColors.length > 1 ? 3 : 2,
                        cursor: 'pointer',
                        'data-event-id': event.id
                    });
                    circle.addEventListener('click', () => window.dispatchEvent(
                        new CustomEvent('eventClicked', { detail: event })
                    ));
                    circle.addEventListener('mouseenter', (e) => showTooltip(e, event));
                    circle.addEventListener('mouseleave', hideTooltip);
                    svg.appendChild(circle);

                    // Connector line from timeline to label
                    const connector = createSVGElement('line', {
                        x1: x,
                        y1: lineY,
                        x2: x,
                        y2: lineY + labelYOffset,
                        stroke: eventColors[0],
                        'stroke-width': 1,
                        'stroke-dasharray': '2,2'
                    });
                    svg.appendChild(connector);

                    // Event label - positioned based on labelYOffset
                    const label = createSVGElement('text', {
                        x: x,
                        y: lineY + labelYOffset,
                        'text-anchor': 'middle',
                        fill: getCSSVar('--event-label-color'),
                        'font-size': '10px',
                        cursor: 'pointer',
                        'data-event-id': event.id
                    });
                    label.textContent = event.title;
                    label.addEventListener('click', () => window.dispatchEvent(
                        new CustomEvent('eventClicked', { detail: event })
                    ));
                    svg.appendChild(label);
                }
            });
        });

        // Draw date labels - fixed at bottom in split view
        // Add extra space for zoom controls and legend button (80px total bottom margin)
        const fixedY = height - 80 + 20;
        drawDateLabels(startDate, endDate, axisStartX, scale, fixedY);
        
        // Draw frozen label column on top with full opacity
        const labelColumnBg = createSVGElement('rect', {
            x: 0,
            y: 0,
            width: SPLIT_VIEW_LABEL_WIDTH,
            height: height,
            fill: getCSSVar('--bg-secondary'),
            'fill-opacity': '1',
            'stroke': getCSSVar('--border-color'),
            'stroke-width': '1'
        });
        svg.appendChild(labelColumnBg);
        
        // Re-render row labels on top of the background
        groupKeys.forEach((key, rowIndex) => {
            const rowY = MARGIN.top + rowIndex * rowHeight + state.panY;
            const rowLabel = createSVGElement('text', {
                x: 10,
                y: rowY + 5,
                fill: getCSSVar('--text-primary'),
                'font-size': '12px',
                'font-weight': 'bold'
            });
            rowLabel.textContent = key.length > 22 ? key.substring(0, 22) + '...' : key;
            svg.appendChild(rowLabel);
        });
    }

    /**
     * Draw date labels on the timeline
     */
    function drawDateLabels(startDate, endDate, startX, scale, y) {
        const totalDays = (endDate - startDate) / (1000 * 60 * 60 * 24);
        
        // Determine interval based on zoom and range
        let interval;
        if (totalDays < 90) {
            interval = 7; // Weekly
        } else if (totalDays < 365) {
            interval = 30; // Monthly
        } else {
            interval = 90; // Quarterly
        }

        const currentDate = new Date(startDate);
        while (currentDate <= endDate) {
            const x = startX + (currentDate - startDate) * scale;
            
            // Tick mark
            const tick = createSVGElement('line', {
                x1: x,
                y1: y - 5,
                x2: x,
                y2: y + 5,
                stroke: getCSSVar('--timeline-axis-color'),
                'stroke-width': 1
            });
            svg.appendChild(tick);

            // Date label
            const label = createSVGElement('text', {
                x: x,
                y: y + 20,
                'text-anchor': 'middle',
                fill: getCSSVar('--event-meta-color'),
                'font-size': '10px'
            });
            label.textContent = formatDateLabel(currentDate);
            svg.appendChild(label);

            currentDate.setDate(currentDate.getDate() + interval);
        }
    }

    /**
     * Format date for label
     */
    function formatDateLabel(date) {
        const month = date.toLocaleDateString('en-US', { month: 'short' });
        const year = date.getFullYear();
        return `${month} ${year}`;
    }

    /**
     * Show tooltip on hover
     */
    function showTooltip(e, event) {
        // This would show a native browser tooltip
        // For now, we'll use the event card system instead
    }

    /**
     * Hide tooltip
     */
    function hideTooltip() {
        // Placeholder for tooltip hiding
    }

    /**
     * Create SVG element with attributes
     */
    function createSVGElement(tag, attrs) {
        const elem = document.createElementNS('http://www.w3.org/2000/svg', tag);
        for (const [key, value] of Object.entries(attrs)) {
            elem.setAttribute(key, value);
        }
        return elem;
    }

    /**
     * Get entity colors for export
     */
    function getEntityColors() {
        return { ...state.entityColors };
    }

    /**
     * Save current renderer state
     */
    function saveState() {
        return {
            zoom: state.zoom,
            panX: state.panX,
            panY: state.panY
        };
    }

    /**
     * Set renderer state
     */
    function setState(newState) {
        if (newState.zoom !== undefined) state.zoom = newState.zoom;
        if (newState.panX !== undefined) state.panX = newState.panX;
        if (newState.panY !== undefined) state.panY = newState.panY;
        render();
    }

    /**
     * Restore renderer state
     */
    function restoreState(savedState) {
        state.zoom = savedState.zoom;
        state.panX = savedState.panX;
        state.panY = savedState.panY;
        
        // Update zoom slider
        const zoomSlider = document.getElementById('zoomSlider');
        if (zoomSlider) {
            zoomSlider.value = Math.max(0.5, Math.min(5, state.zoom));
        }
        
        render();
    }

    /**
     * Get the bounding box of all actual rendered content
     * This looks at what's currently rendered, not what could be rendered
     */
    function getContentBounds() {
        if (!svg) return null;

        try {
            // Get all rendered elements except defs
            const allElements = Array.from(svg.children).filter(child => 
                child.tagName !== 'defs'
            );

            if (allElements.length === 0) return null;

            // Find the bounding box of all content
            let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

            allElements.forEach(elem => {
                try {
                    const bbox = elem.getBBox();
                    minX = Math.min(minX, bbox.x);
                    minY = Math.min(minY, bbox.y);
                    maxX = Math.max(maxX, bbox.x + bbox.width);
                    maxY = Math.max(maxY, bbox.y + bbox.height);
                } catch (e) {
                    // Some elements might not support getBBox
                }
            });

            if (!isFinite(minX)) return null;

            // Return actual min/max coordinates
            return {
                minX,
                minY,
                maxX,
                maxY,
                zoom: state.zoom
            };
        } catch (error) {
            console.error('Error calculating content bounds:', error);
            return null;
        }
    }

    return {
        init,
        setViewMode,
        setEvents,
        setFilters,
        render,
        getEntityColor,
        getEntityColors,
        saveState,
        setState,
        restoreState,
        getContentBounds
    };
})();
