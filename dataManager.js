/**
 * Data Manager - Handles all data storage and retrieval using localStorage
 */

const DataManager = (() => {
    const STORAGE_KEY = 'timeline-visualizer-data';
    const ACTIVE_TIMELINE_KEY = 'timeline-visualizer-active';

    // In-memory cache
    let data = {
        timelines: [],
        activeTimelineId: null
    };

    /**
     * Initialize data from localStorage
     */
    function init() {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                data = JSON.parse(stored);
            }

            // Preload sample timeline on first use
            if (data.timelines.length === 0) {
                loadSampleTimeline();
            }

            // Load active timeline ID
            const activeId = localStorage.getItem(ACTIVE_TIMELINE_KEY);
            if (activeId && data.timelines.some(t => t.id === activeId)) {
                data.activeTimelineId = activeId;
            } else if (data.timelines.length > 0) {
                data.activeTimelineId = data.timelines[0].id;
            }
        } catch (e) {
            console.error('Failed to load data from localStorage:', e);
            // Initialize with default timeline if loading fails
            const defaultTimeline = createTimeline('My Timeline');
            data.timelines = [defaultTimeline];
            data.activeTimelineId = defaultTimeline.id;
            save();
        }
    }

    /**
     * Load sample timeline data on first use
     */
    function loadSampleTimeline() {
        fetch('sample-timeline.json')
            .then(response => response.json())
            .then(jsonData => {
                try {
                    const result = importTimeline(JSON.stringify(jsonData));
                    if (result.success) {
                        console.log('Sample timeline loaded successfully');
                    }
                } catch (e) {
                    console.error('Failed to load sample timeline:', e);
                    // Fall back to empty timeline
                    const defaultTimeline = createTimeline('My Timeline');
                    data.timelines.push(defaultTimeline);
                    data.activeTimelineId = defaultTimeline.id;
                    save();
                }
            })
            .catch(error => {
                console.error('Could not fetch sample timeline:', error);
                // Fall back to empty timeline
                const defaultTimeline = createTimeline('My Timeline');
                data.timelines.push(defaultTimeline);
                data.activeTimelineId = defaultTimeline.id;
                save();
            });
    }

    /**
     * Save data to localStorage
     */
    function save() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
            localStorage.setItem(ACTIVE_TIMELINE_KEY, data.activeTimelineId);
        } catch (e) {
            console.error('Failed to save data to localStorage:', e);
        }
    }

    /**
     * Generate unique ID
     */
    function generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    /**
     * Create a new timeline object
     */
    function createTimeline(name) {
        return {
            id: generateId(),
            name: name || 'Untitled Timeline',
            events: [],
            createdAt: new Date().toISOString()
        };
    }

    /**
     * Create a new event object
     */
    function createEvent(eventData) {
        // Handle entities - can be string or array
        let entities = eventData.entities || eventData.entity;
        
        if (!entities) {
            entities = [];
        } else if (typeof entities === 'string') {
            // Split by comma and clean up
            entities = entities.split(',').map(e => e.trim()).filter(e => e);
        } else if (!Array.isArray(entities)) {
            entities = [entities];
        }
        
        // Ensure we have an array
        if (!Array.isArray(entities)) {
            entities = [];
        }
        
        // Handle secondary entities
        let secondaryEntities = eventData.secondaryEntities || [];
        
        if (typeof secondaryEntities === 'string') {
            secondaryEntities = secondaryEntities.split(',').map(e => e.trim()).filter(e => e);
        } else if (!Array.isArray(secondaryEntities)) {
            secondaryEntities = [];
        }
        
        // If already parsed (from import), use existing dates
        let startDate, endDate, isOngoing, computedDate;
        if (eventData.startDate || eventData.computedDate) {
            // Has pre-computed dates, use them
            startDate = eventData.startDate || eventData.computedDate;
            endDate = eventData.endDate || null;
            isOngoing = eventData.isOngoing || false;
            computedDate = eventData.computedDate || eventData.startDate;
        } else {
            // Parse from deadlineText
            const parsedDate = DateParser.parse(eventData.deadlineText);
            startDate = parsedDate?.startDate || null;
            endDate = parsedDate?.endDate || null;
            isOngoing = parsedDate?.isOngoing || false;
            computedDate = parsedDate?.startDate || null;
        }
        
        return {
            id: eventData.id || generateId(),
            title: eventData.title,
            description: eventData.description || '',
            goal: eventData.goal,
            entities: entities,
            secondaryEntities: secondaryEntities,
            deadlineText: eventData.deadlineText,
            startDate: startDate,
            endDate: endDate,
            isOngoing: isOngoing,
            computedDate: computedDate,
            createdAt: eventData.createdAt || new Date().toISOString()
        };
    }

    // ===== Timeline Operations =====

    /**
     * Get all timelines
     */
    function getTimelines() {
        return [...data.timelines];
    }

    /**
     * Get active timeline
     */
    function getActiveTimeline() {
        return data.timelines.find(t => t.id === data.activeTimelineId) || data.timelines[0];
    }

    /**
     * Add new timeline
     */
    function addTimeline(name) {
        const timeline = createTimeline(name);
        data.timelines.push(timeline);
        data.activeTimelineId = timeline.id;
        save();
        return timeline;
    }

    /**
     * Update timeline
     */
    function updateTimeline(id, updates) {
        const timeline = data.timelines.find(t => t.id === id);
        if (timeline) {
            Object.assign(timeline, updates);
            save();
            return timeline;
        }
        return null;
    }

    /**
     * Delete timeline
     */
    function deleteTimeline(id) {
        const index = data.timelines.findIndex(t => t.id === id);
        if (index !== -1) {
            data.timelines.splice(index, 1);
            
            // If we deleted the active timeline, switch to another
            if (data.activeTimelineId === id) {
                data.activeTimelineId = data.timelines[0]?.id || null;
            }
            
            // Ensure we always have at least one timeline
            if (data.timelines.length === 0) {
                const defaultTimeline = createTimeline('My Timeline');
                data.timelines.push(defaultTimeline);
                data.activeTimelineId = defaultTimeline.id;
            }
            
            save();
            return true;
        }
        return false;
    }

    /**
     * Duplicate timeline
     */
    function duplicateTimeline(id) {
        const timeline = data.timelines.find(t => t.id === id);
        if (timeline) {
            const duplicate = {
                ...timeline,
                id: generateId(),
                name: `${timeline.name} (Copy)`,
                events: timeline.events.map(e => ({
                    ...e,
                    id: generateId()
                })),
                createdAt: new Date().toISOString()
            };
            data.timelines.push(duplicate);
            data.activeTimelineId = duplicate.id;
            save();
            return duplicate;
        }
        return null;
    }

    /**
     * Set active timeline
     */
    function setActiveTimeline(id) {
        if (data.timelines.some(t => t.id === id)) {
            data.activeTimelineId = id;
            save();
            return true;
        }
        return false;
    }

    // ===== Event Operations =====

    /**
     * Get all events from active timeline
     */
    function getEvents() {
        const timeline = getActiveTimeline();
        return timeline ? [...timeline.events] : [];
    }

    /**
     * Get event by ID
     */
    function getEvent(id) {
        const timeline = getActiveTimeline();
        return timeline?.events.find(e => e.id === id);
    }

    /**
     * Add event to active timeline
     */
    function addEvent(eventData) {
        const timeline = getActiveTimeline();
        if (timeline) {
            const event = createEvent(eventData);
            timeline.events.push(event);
            save();
            return event;
        }
        return null;
    }

    /**
     * Update event
     */
    function updateEvent(id, updates) {
        const timeline = getActiveTimeline();
        if (timeline) {
            const event = timeline.events.find(e => e.id === id);
            if (event) {
                // Handle entity updates
                if (updates.entity) {
                    let entities = updates.entity;
                    if (typeof entities === 'string') {
                        entities = entities.split(',').map(e => e.trim()).filter(e => e);
                    }
                    updates.entities = entities;
                    delete updates.entity;
                }
                
                Object.assign(event, updates);
                // Recompute date if deadline text changed
                if (updates.deadlineText) {
                    const parsed = DateParser.parse(updates.deadlineText);
                    event.startDate = parsed?.startDate || null;
                    event.endDate = parsed?.endDate || null;
                    event.isOngoing = parsed?.isOngoing || false;
                    event.computedDate = parsed?.startDate || null;
                }
                save();
                return event;
            }
        }
        return null;
    }

    /**
     * Delete event
     */
    function deleteEvent(id) {
        const timeline = getActiveTimeline();
        if (timeline) {
            const index = timeline.events.findIndex(e => e.id === id);
            if (index !== -1) {
                timeline.events.splice(index, 1);
                save();
                return true;
            }
        }
        return false;
    }

    /**
     * Get unique entities from active timeline
     */
    function getUniqueEntities() {
        const events = getEvents();
        const entities = new Set();
        events.forEach(event => {
            // Handle both old single entity and new multiple entities
            if (Array.isArray(event.entities)) {
                event.entities.forEach(e => entities.add(e));
            } else if (event.entity) {
                entities.add(event.entity);
            }
        });
        return Array.from(entities).sort();
    }

    /**
     * Get unique goals from active timeline
     */
    function getUniqueGoals() {
        const events = getEvents();
        const goals = [...new Set(events.map(e => e.goal))];
        return goals.sort();
    }

    // ===== Import/Export =====

    /**
     * Export active timeline as JSON
     */
    function exportTimeline() {
        const timeline = getActiveTimeline();
        return JSON.stringify(timeline, null, 2);
    }

    /**
     * Import timeline from JSON
     */
    function importTimeline(jsonString) {
        try {
            const imported = JSON.parse(jsonString);
            
            // Validate structure
            if (!imported.name || !Array.isArray(imported.events)) {
                throw new Error('Invalid timeline format');
            }

            // Validate events
            for (const event of imported.events) {
                const hasEntity = event.entity || (event.entities && event.entities.length > 0);
                if (!event.title || !event.goal || !hasEntity || !event.deadlineText) {
                    throw new Error('Invalid event format');
                }
            }

            // Create new timeline with imported data
            const timeline = createTimeline(imported.name);
            timeline.events = imported.events.map(e => createEvent(e));
            
            data.timelines.push(timeline);
            data.activeTimelineId = timeline.id;
            save();
            
            return timeline;
        } catch (e) {
            console.error('Import failed:', e);
            throw e;
        }
    }

    /**
     * Export all data
     */
    function exportAll() {
        return JSON.stringify(data, null, 2);
    }

    /**
     * Import all data (replaces current data)
     */
    function importAll(jsonString) {
        try {
            const imported = JSON.parse(jsonString);
            
            if (!Array.isArray(imported.timelines)) {
                throw new Error('Invalid data format');
            }

            data = imported;
            
            // Ensure we have at least one timeline
            if (data.timelines.length === 0) {
                const defaultTimeline = createTimeline('My Timeline');
                data.timelines.push(defaultTimeline);
                data.activeTimelineId = defaultTimeline.id;
            }

            save();
            return true;
        } catch (e) {
            console.error('Import all failed:', e);
            throw e;
        }
    }

    /**
     * Clear all data (for testing)
     */
    function clearAll() {
        data = {
            timelines: [],
            activeTimelineId: null
        };
        const defaultTimeline = createTimeline('My Timeline');
        data.timelines.push(defaultTimeline);
        data.activeTimelineId = defaultTimeline.id;
        save();
    }

    // Initialize on load
    init();

    return {
        getTimelines,
        getActiveTimeline,
        addTimeline,
        updateTimeline,
        deleteTimeline,
        duplicateTimeline,
        setActiveTimeline,
        getEvents,
        getEvent,
        addEvent,
        updateEvent,
        deleteEvent,
        getUniqueEntities,
        getUniqueGoals,
        exportTimeline,
        importTimeline,
        exportAll,
        importAll,
        clearAll
    };
})();
