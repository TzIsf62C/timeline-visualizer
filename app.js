/**
 * App - Main application controller
 */

const App = (() => {
    let currentEditingEventId = null;

    /**
     * Initialize the application
     */
    function init() {
        // Load theme preference
        loadTheme();

        // Initialize renderer
        Renderer.init();

        // Setup UI event listeners
        setupUIListeners();

        // Load initial data
        refreshUI();
    }

    /**
     * Setup all UI event listeners
     */
    function setupUIListeners() {
        // Timeline management
        document.getElementById('newTimelineBtn').addEventListener('click', showNewTimelineModal);

        // View mode
        document.querySelectorAll('input[name="viewMode"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                Renderer.setViewMode(e.target.value);
            });
        });

        // Filters
        document.getElementById('searchInput').addEventListener('input', (e) => {
            Renderer.setFilters({ search: e.target.value });
        });

        document.getElementById('entityFilter').addEventListener('change', (e) => {
            Renderer.setFilters({ entity: e.target.value });
        });

        document.getElementById('goalFilter').addEventListener('change', (e) => {
            Renderer.setFilters({ goal: e.target.value });
        });

        document.getElementById('clearFiltersBtn').addEventListener('click', clearFilters);

        // Legend
        document.getElementById('legendBtn').addEventListener('click', showLegend);

        // Theme toggle
        const themeToggleBtn = document.getElementById('themeToggle');
        if (themeToggleBtn) {
            themeToggleBtn.addEventListener('click', toggleTheme);
        } else {
            console.error('Theme toggle button not found in DOM');
        }

        // Export options modal
        document.getElementById('exportOptionsModal').querySelector('.modal-close').addEventListener('click', () => {
            closeModal('exportOptionsModal');
        });
        document.getElementById('cancelExportBtn').addEventListener('click', () => {
            closeModal('exportOptionsModal');
        });
        document.getElementById('confirmExportBtn').addEventListener('click', handleExportConfirm);

        // Event management
        document.getElementById('newEventBtn').addEventListener('click', showNewEventModal);

        // Export/Import
        document.getElementById('exportJsonBtn').addEventListener('click', exportJSON);
        document.getElementById('importJsonBtn').addEventListener('click', () => {
            document.getElementById('fileInput').click();
        });
        document.getElementById('fileInput').addEventListener('change', handleFileImport);
        document.getElementById('exportPngBtn').addEventListener('click', () => showExportOptionsModal('png'));
        document.getElementById('exportPdfBtn').addEventListener('click', () => showExportOptionsModal('pdf'));

        // Modal handlers
        setupModalHandlers();

        // Custom events
        window.addEventListener('eventClicked', (e) => {
            showEventCard(e.detail);
        });

        // Listen for timeline data changes
        window.addEventListener('storage', refreshUI);
    }

    /**
     * Setup modal event handlers
     */
    function setupModalHandlers() {
        // Event modal
        const eventModal = document.getElementById('eventModal');
        const eventForm = document.getElementById('eventForm');
        
        eventModal.querySelector('.modal-close').addEventListener('click', () => {
            closeModal('eventModal');
        });
        
        document.getElementById('cancelEventBtn').addEventListener('click', () => {
            closeModal('eventModal');
        });

        document.getElementById('deleteEventBtn').addEventListener('click', deleteCurrentEvent);

        eventForm.addEventListener('submit', (e) => {
            e.preventDefault();
            saveEvent();
        });

        // Real-time deadline parsing
        document.getElementById('eventDeadline').addEventListener('input', (e) => {
            const parsed = DateParser.parse(e.target.value);
            const display = document.getElementById('computedDateDisplay');
            const endDateGroup = document.getElementById('computedEndDateGroup');
            const endDateDisplay = document.getElementById('computedEndDateDisplay');
            
            if (parsed) {
                if (parsed.isOngoing) {
                    display.textContent = 'Ongoing';
                    display.style.color = 'var(--secondary-color)';
                    endDateGroup.style.display = 'none';
                } else if (parsed.endDate) {
                    display.textContent = DateParser.formatReadable(parsed.startDate);
                    display.style.color = 'var(--secondary-color)';
                    endDateDisplay.textContent = DateParser.formatReadable(parsed.endDate);
                    endDateGroup.style.display = 'block';
                } else {
                    display.textContent = DateParser.formatReadable(parsed.startDate);
                    display.style.color = 'var(--secondary-color)';
                    endDateGroup.style.display = 'none';
                }
            } else {
                display.textContent = 'Unable to parse';
                display.style.color = 'var(--danger-color)';
                endDateGroup.style.display = 'none';
            }
        });

        // Timeline modal
        const timelineModal = document.getElementById('timelineModal');
        const timelineForm = document.getElementById('timelineForm');

        timelineModal.querySelector('.modal-close').addEventListener('click', () => {
            closeModal('timelineModal');
        });

        document.getElementById('cancelTimelineBtn').addEventListener('click', () => {
            closeModal('timelineModal');
        });

        timelineForm.addEventListener('submit', (e) => {
            e.preventDefault();
            saveTimeline();
        });

        // Event card
        const eventCard = document.getElementById('eventCard');
        eventCard.querySelector('.card-close').addEventListener('click', () => {
            eventCard.style.display = 'none';
        });

        document.getElementById('editEventCardBtn').addEventListener('click', () => {
            const eventId = eventCard.dataset.eventId;
            if (eventId) {
                const event = DataManager.getEvent(eventId);
                if (event) {
                    showEditEventModal(event);
                    eventCard.style.display = 'none';
                }
            }
        });

        // Close modals on background click
        [eventModal, timelineModal].forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.classList.remove('active');
                }
            });
        });
    }

    /**
     * Refresh entire UI
     */
    function refreshUI() {
        renderTimelineList();
        updateTimeline(); // Must come before renderEventsList to assign colors
        renderEventsList();
        updateFilters();
    }

    /**
     * Render timeline list in sidebar
     */
    function renderTimelineList() {
        const container = document.getElementById('timelineList');
        container.innerHTML = '';

        const timelines = DataManager.getTimelines();
        const activeTimeline = DataManager.getActiveTimeline();

        timelines.forEach(timeline => {
            const item = document.createElement('div');
            item.className = 'timeline-item';
            if (timeline.id === activeTimeline?.id) {
                item.classList.add('active');
            }

            const name = document.createElement('div');
            name.className = 'timeline-item-name';
            name.textContent = timeline.name;
            item.appendChild(name);

            const actions = document.createElement('div');
            actions.className = 'timeline-item-actions';

            const renameBtn = document.createElement('button');
            renameBtn.className = 'btn-icon-small';
            renameBtn.textContent = '✎';
            renameBtn.title = 'Rename';
            renameBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                showRenameTimelineModal(timeline);
            });
            actions.appendChild(renameBtn);

            const duplicateBtn = document.createElement('button');
            duplicateBtn.className = 'btn-icon-small';
            duplicateBtn.textContent = '⎘';
            duplicateBtn.title = 'Duplicate';
            duplicateBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                DataManager.duplicateTimeline(timeline.id);
                refreshUI();
            });
            actions.appendChild(duplicateBtn);

            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'btn-icon-small';
            deleteBtn.textContent = '×';
            deleteBtn.title = 'Delete';
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (confirm(`Delete timeline "${timeline.name}"?`)) {
                    DataManager.deleteTimeline(timeline.id);
                    refreshUI();
                }
            });
            actions.appendChild(deleteBtn);

            item.appendChild(actions);

            item.addEventListener('click', () => {
                DataManager.setActiveTimeline(timeline.id);
                refreshUI();
            });

            container.appendChild(item);
        });
    }

    /**
     * Render events list in sidebar
     */
    function renderEventsList() {
        const container = document.getElementById('eventsList');
        container.innerHTML = '';

        const events = DataManager.getEvents();
        const sortedEvents = events.sort((a, b) => {
            const dateA = new Date(a.computedDate);
            const dateB = new Date(b.computedDate);
            return dateA - dateB;
        });

        sortedEvents.forEach(event => {
            const item = document.createElement('div');
            item.className = 'event-item';
            const eventEntities = Array.isArray(event.entities) ? event.entities : [event.entity];
            item.style.borderLeftColor = Renderer.getEntityColors()[eventEntities[0]] || '#4A90E2';

            const title = document.createElement('div');
            title.className = 'event-item-title';
            title.textContent = event.title;
            item.appendChild(title);

            const meta = document.createElement('div');
            meta.className = 'event-item-meta';

            // Show all entities
            eventEntities.forEach(entity => {
                const entityTag = document.createElement('span');
                entityTag.className = 'event-item-entity';
                entityTag.style.backgroundColor = Renderer.getEntityColors()[entity] || '#4A90E2';
                entityTag.textContent = entity;
                meta.appendChild(entityTag);
            });

            const dateText = document.createTextNode(event.deadlineText);
            meta.appendChild(dateText);

            item.appendChild(meta);

            item.addEventListener('click', () => {
                showEventCard(event);
            });

            container.appendChild(item);
        });
    }

    /**
     * Update filter dropdowns
     */
    function updateFilters() {
        // Update entity filter
        const entityFilter = document.getElementById('entityFilter');
        const currentEntity = entityFilter.value;
        entityFilter.innerHTML = '<option value="">All Entities</option>';
        
        DataManager.getUniqueEntities().forEach(entity => {
            const option = document.createElement('option');
            option.value = entity;
            option.textContent = entity;
            if (entity === currentEntity) {
                option.selected = true;
            }
            entityFilter.appendChild(option);
        });

        // Update goal filter
        const goalFilter = document.getElementById('goalFilter');
        const currentGoal = goalFilter.value;
        goalFilter.innerHTML = '<option value="">All Goals</option>';
        
        DataManager.getUniqueGoals().forEach(goal => {
            const option = document.createElement('option');
            option.value = goal;
            option.textContent = goal;
            if (goal === currentGoal) {
                option.selected = true;
            }
            goalFilter.appendChild(option);
        });
    }

    /**
     * Update timeline visualization
     */
    function updateTimeline() {
        const events = DataManager.getEvents();
        Renderer.setEvents(events);
    }

    /**
     * Clear all filters
     */
    function clearFilters() {
        document.getElementById('searchInput').value = '';
        document.getElementById('entityFilter').value = '';
        document.getElementById('goalFilter').value = '';
        Renderer.setFilters({ search: '', entity: '', goal: '' });
    }

    /**
     * Toggle between light and dark theme
     */
    function toggleTheme() {
        const root = document.documentElement;
        const themeToggleBtn = document.getElementById('themeToggle');
        const currentTheme = root.getAttribute('data-theme') || 'dark';
        
        if (currentTheme === 'light') {
            root.setAttribute('data-theme', 'dark');
            if (themeToggleBtn) {
                console.log('Updating button to moon icon');
                themeToggleBtn.textContent = '🌙';
                themeToggleBtn.title = 'Switch to Light Theme';
                console.log('Button content after update:', themeToggleBtn.textContent);
            }
            localStorage.setItem('theme', 'dark');
        } else {
            root.setAttribute('data-theme', 'light');
            if (themeToggleBtn) {
                console.log('Updating button to sun icon');
                themeToggleBtn.textContent = '☀️';
                themeToggleBtn.title = 'Switch to Dark Theme';
                console.log('Button content after update:', themeToggleBtn.textContent);
            }
            localStorage.setItem('theme', 'light');
        }
        
        // Re-render to update timeline colors
        Renderer.render();
    }

    /**
     * Load saved theme preference or detect from browser
     */
    function loadTheme() {
        const savedTheme = localStorage.getItem('theme');
        const root = document.documentElement;
        const themeToggleBtn = document.getElementById('themeToggle');
        
        // Determine theme: saved preference > browser preference > default dark
        let theme;
        if (savedTheme) {
            theme = savedTheme;
        } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
            theme = 'light';
        } else {
            theme = 'dark';
        }
        
        if (theme === 'light') {
            root.setAttribute('data-theme', 'light');
            if (themeToggleBtn) {
                themeToggleBtn.textContent = '☀️';
                themeToggleBtn.title = 'Switch to Dark Theme';
            }
        } else {
            root.setAttribute('data-theme', 'dark');
            if (themeToggleBtn) {
                themeToggleBtn.textContent = '🌙';
                themeToggleBtn.title = 'Switch to Light Theme';
            }
        }
        
        // Listen for browser theme changes
        if (window.matchMedia) {
            window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
                // Only auto-switch if user hasn't set a preference
                if (!localStorage.getItem('theme')) {
                    const newTheme = e.matches ? 'dark' : 'light';
                    root.setAttribute('data-theme', newTheme);
                    if (themeToggleBtn) {
                        themeToggleBtn.textContent = newTheme === 'dark' ? '🌙' : '☀️';
                        themeToggleBtn.title = newTheme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme';
                    }
                    Renderer.render();
                }
            });
        }
    }

    /**
     * Show new timeline modal
     */
    function showNewTimelineModal() {
        document.getElementById('timelineModalTitle').textContent = 'New Timeline';
        document.getElementById('timelineName').value = '';
        document.getElementById('timelineForm').dataset.mode = 'new';
        openModal('timelineModal');
    }

    /**
     * Show rename timeline modal
     */
    function showRenameTimelineModal(timeline) {
        document.getElementById('timelineModalTitle').textContent = 'Rename Timeline';
        document.getElementById('timelineName').value = timeline.name;
        document.getElementById('timelineForm').dataset.mode = 'rename';
        document.getElementById('timelineForm').dataset.timelineId = timeline.id;
        openModal('timelineModal');
    }

    /**
     * Save timeline (new or rename)
     */
    function saveTimeline() {
        const form = document.getElementById('timelineForm');
        const name = document.getElementById('timelineName').value.trim();

        if (!name) {
            alert('Please enter a timeline name');
            return;
        }

        if (form.dataset.mode === 'new') {
            DataManager.addTimeline(name);
        } else if (form.dataset.mode === 'rename') {
            const timelineId = form.dataset.timelineId;
            DataManager.updateTimeline(timelineId, { name });
        }

        refreshUI();
        closeModal('timelineModal');
    }

    /**
     * Show new event modal
     */
    function showNewEventModal() {
        currentEditingEventId = null;
        document.getElementById('modalTitle').textContent = 'New Event';
        document.getElementById('eventTitle').value = '';
        document.getElementById('eventDescription').value = '';
        document.getElementById('eventGoal').value = '';
        document.getElementById('eventEntity').value = '';
        document.getElementById('eventSecondaryEntity').value = '';
        document.getElementById('eventDeadline').value = '';
        document.getElementById('computedDateDisplay').textContent = '—';
        document.getElementById('deleteEventBtn').style.display = 'none';
        openModal('eventModal');
    }

    /**
     * Show edit event modal
     */
    function showEditEventModal(event) {
        currentEditingEventId = event.id;
        document.getElementById('modalTitle').textContent = 'Edit Event';
        document.getElementById('eventTitle').value = event.title;
        document.getElementById('eventDescription').value = event.description || '';
        document.getElementById('eventGoal').value = event.goal;
        const entities = Array.isArray(event.entities) ? event.entities : [event.entity];
        document.getElementById('eventEntity').value = entities.join(', ');
        
        let secondaryEntities = event.secondaryEntities || [];
        if (!Array.isArray(secondaryEntities)) {
            secondaryEntities = [];
        }
        document.getElementById('eventSecondaryEntity').value = secondaryEntities.join(', ');
        
        document.getElementById('eventDeadline').value = event.deadlineText;
        document.getElementById('computedDateDisplay').textContent = 
            DateParser.formatReadable(event.computedDate);
        document.getElementById('deleteEventBtn').style.display = 'block';
        openModal('eventModal');
    }

    /**
     * Save event (new or edit)
     */
    function saveEvent() {
        const eventData = {
            title: document.getElementById('eventTitle').value.trim(),
            description: document.getElementById('eventDescription').value.trim(),
            goal: document.getElementById('eventGoal').value.trim(),
            entity: document.getElementById('eventEntity').value.trim(),
            secondaryEntities: document.getElementById('eventSecondaryEntity').value.trim(),
            deadlineText: document.getElementById('eventDeadline').value.trim()
        };

        // Validate
        if (!eventData.title || !eventData.goal || !eventData.entity || !eventData.deadlineText) {
            alert('Please fill in all required fields');
            return;
        }

        // Validate that date can be parsed
        const parsed = DateParser.parse(eventData.deadlineText);
        if (!parsed) {
            alert('Unable to parse the deadline. Please use a valid date format.');
            return;
        }

        if (currentEditingEventId) {
            DataManager.updateEvent(currentEditingEventId, eventData);
        } else {
            DataManager.addEvent(eventData);
        }

        refreshUI();
        closeModal('eventModal');
    }

    /**
     * Delete current editing event
     */
    function deleteCurrentEvent() {
        if (!currentEditingEventId) return;

        if (confirm('Delete this event?')) {
            DataManager.deleteEvent(currentEditingEventId);
            refreshUI();
            closeModal('eventModal');
        }
    }

    /**
     * Show event card
     */
    function showEventCard(event) {
        const card = document.getElementById('eventCard');
        card.dataset.eventId = event.id;

        document.getElementById('cardTitle').textContent = event.title;
        const entities = Array.isArray(event.entities) ? event.entities : [event.entity];
        document.getElementById('cardEntity').textContent = entities.join(', ');
        
        // Display secondary entities if present
        let secondaryEntities = event.secondaryEntities || [];
        if (!Array.isArray(secondaryEntities)) {
            secondaryEntities = [];
        }
        
        if (secondaryEntities.length > 0) {
            document.getElementById('cardSecondaryEntityField').style.display = 'block';
            document.getElementById('cardSecondaryEntity').textContent = secondaryEntities.join(', ');
        } else {
            document.getElementById('cardSecondaryEntityField').style.display = 'none';
        }
        
        document.getElementById('cardGoal').textContent = event.goal;
        document.getElementById('cardDeadline').textContent = event.deadlineText;
        
        // Display date or range
        if (event.isOngoing) {
            document.getElementById('cardDate').textContent = 'Ongoing';
        } else if (event.endDate) {
            const start = DateParser.formatReadable(event.startDate || event.computedDate);
            const end = DateParser.formatReadable(event.endDate);
            document.getElementById('cardDate').textContent = `${start} – ${end}`;
        } else {
            document.getElementById('cardDate').textContent = DateParser.formatReadable(event.startDate || event.computedDate);
        }

        if (event.description) {
            document.getElementById('cardDescriptionField').style.display = 'block';
            document.getElementById('cardDescription').textContent = event.description;
        } else {
            document.getElementById('cardDescriptionField').style.display = 'none';
        }

        // Position card in center of screen
        card.style.display = 'block';
        card.style.left = '50%';
        card.style.top = '50%';
        card.style.transform = 'translate(-50%, -50%)';
    }

    /**
     * Open modal
     */
    function openModal(modalId) {
        document.getElementById(modalId).classList.add('active');
    }

    /**
     * Close modal
     */
    function closeModal(modalId) {
        document.getElementById(modalId).classList.remove('active');
    }

    /**
     * Export timeline as JSON
     */
    function exportJSON() {
        const timeline = DataManager.getActiveTimeline();
        const json = DataManager.exportTimeline();
        
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${timeline.name.replace(/[^a-z0-9]/gi, '_')}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }

    /**
     * Import timeline from JSON file
     */
    function handleFileImport(e) {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                DataManager.importTimeline(event.target.result);
                refreshUI();
                alert('Timeline imported successfully!');
            } catch (error) {
                alert('Failed to import timeline: ' + error.message);
            }
        };
        reader.readAsText(file);

        // Reset file input
        e.target.value = '';
    }

    /**
     * Show export options modal
     */
    let pendingExportFormat = null;

    function showExportOptionsModal(format) {
        pendingExportFormat = format;
        openModal('exportOptionsModal');
    }

    /**
     * Handle export confirmation
     */
    async function handleExportConfirm() {
        const scope = document.querySelector('input[name="exportScope"]:checked').value;
        closeModal('exportOptionsModal');
        
        if (pendingExportFormat === 'png') {
            await exportPNG(scope);
        } else if (pendingExportFormat === 'pdf') {
            await exportPDF(scope);
        }
        
        pendingExportFormat = null;
    }

    /**
     * Export as PNG
     */
    async function exportPNG(scope = 'visible') {
        try {
            // Use html2canvas if available
            if (typeof html2canvas === 'undefined') {
                alert('PNG export requires html2canvas library. Please check the installation.');
                return;
            }

            const svg = document.getElementById('timelineCanvas');
            const container = svg.parentElement;
            
            // Get current theme background color
            const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
            const bgColor = currentTheme === 'light' ? '#FFFFFF' : '#1E1E1E';
            
            let canvas;
            if (scope === 'full') {
                // Get the actual bounding box of all SVG content
                const bbox = Renderer.getContentBounds();
                if (!bbox) {
                    alert('Unable to calculate timeline bounds. Please ensure events are loaded.');
                    return;
                }
                
                // Create a temporary container off-screen
                const tempContainer = document.createElement('div');
                tempContainer.style.position = 'absolute';
                tempContainer.style.left = '-100000px';
                tempContainer.style.top = '0';
                tempContainer.style.backgroundColor = bgColor;
                
                // Calculate size needed with padding
                const padding = 50;
                const width = (bbox.maxX - bbox.minX) + (padding * 2);
                const height = (bbox.maxY - bbox.minY) + (padding * 2);
                tempContainer.style.width = width + 'px';
                tempContainer.style.height = height + 'px';
                
                // Clone the SVG
                const svgClone = svg.cloneNode(true);
                
                // Adjust the viewBox to show only the content area
                svgClone.setAttribute('width', width);
                svgClone.setAttribute('height', height);
                svgClone.setAttribute('viewBox', `${bbox.minX - padding} ${bbox.minY - padding} ${width} ${height}`);
                
                tempContainer.appendChild(svgClone);
                document.body.appendChild(tempContainer);
                
                console.log('Export PNG with viewBox:', {
                    bboxMinX: bbox.minX,
                    bboxMaxX: bbox.maxX,
                    bboxMinY: bbox.minY,
                    bboxMaxY: bbox.maxY,
                    width,
                    height,
                    viewBox: `${bbox.minX - padding} ${bbox.minY - padding} ${width} ${height}`
                });
                
                // Wait a moment for the DOM to update
                await new Promise(resolve => setTimeout(resolve, 100));
                
                // Capture the temporary container
                canvas = await html2canvas(tempContainer, {
                    backgroundColor: bgColor,
                    scale: 2,
                    width: width,
                    height: height
                });
                
                // Remove temporary container
                document.body.removeChild(tempContainer);
            } else {
                // Capture only visible viewport
                canvas = await html2canvas(container, {
                    backgroundColor: bgColor,
                    scale: 2
                });
            }

            canvas.toBlob((blob) => {
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `timeline-${scope}.png`;
                a.click();
                URL.revokeObjectURL(url);
            });
        } catch (error) {
            console.error('PNG export error:', error);
            alert('Failed to export PNG: ' + error.message);
        }
    }

    /**
     * Export as PDF
     */
    async function exportPDF(scope = 'visible') {
        try {
            // Use jsPDF if available
            if (typeof jspdf === 'undefined') {
                alert('PDF export requires jsPDF library. Please check the installation.');
                return;
            }

            if (typeof html2canvas === 'undefined') {
                alert('PDF export requires html2canvas library. Please check the installation.');
                return;
            }

            const svg = document.getElementById('timelineCanvas');
            const container = svg.parentElement;
            
            // Get current theme background color
            const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
            const bgColor = currentTheme === 'light' ? '#FFFFFF' : '#1E1E1E';
            
            let canvas;
            if (scope === 'full') {
                // Get the actual bounding box of all SVG content
                const bbox = Renderer.getContentBounds();
                if (!bbox) {
                    alert('Unable to calculate timeline bounds. Please ensure events are loaded.');
                    return;
                }
                
                // Create a temporary container off-screen
                const tempContainer = document.createElement('div');
                tempContainer.style.position = 'absolute';
                tempContainer.style.left = '-100000px';
                tempContainer.style.top = '0';
                tempContainer.style.backgroundColor = bgColor;
                
                // Calculate size needed with padding
                const padding = 50;
                const width = (bbox.maxX - bbox.minX) + (padding * 2);
                const height = (bbox.maxY - bbox.minY) + (padding * 2);
                tempContainer.style.width = width + 'px';
                tempContainer.style.height = height + 'px';
                
                // Clone the SVG
                const svgClone = svg.cloneNode(true);
                
                // Adjust the viewBox to show only the content area
                svgClone.setAttribute('width', width);
                svgClone.setAttribute('height', height);
                svgClone.setAttribute('viewBox', `${bbox.minX - padding} ${bbox.minY - padding} ${width} ${height}`);
                
                tempContainer.appendChild(svgClone);
                document.body.appendChild(tempContainer);
                
                console.log('Export PDF with viewBox:', {
                    bboxMinX: bbox.minX,
                    bboxMaxX: bbox.maxX,
                    bboxMinY: bbox.minY,
                    bboxMaxY: bbox.maxY,
                    width,
                    height,
                    viewBox: `${bbox.minX - padding} ${bbox.minY - padding} ${width} ${height}`
                });
                
                // Wait a moment for the DOM to update
                await new Promise(resolve => setTimeout(resolve, 100));
                
                // Capture the temporary container
                canvas = await html2canvas(tempContainer, {
                    backgroundColor: bgColor,
                    scale: 2,
                    width: width,
                    height: height
                });
                
                // Remove temporary container
                document.body.removeChild(tempContainer);
            } else {
                // Capture only visible viewport
                canvas = await html2canvas(container, {
                    backgroundColor: bgColor,
                    scale: 2
                });
            }

            const imgData = canvas.toDataURL('image/png');
            const pdf = new jspdf.jsPDF({
                orientation: 'landscape',
                unit: 'px',
                format: [canvas.width, canvas.height]
            });

            pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
            pdf.save(`timeline-${scope}.pdf`);
        } catch (error) {
            console.error('PDF export error:', error);
            alert('Failed to export PDF: ' + error.message);
        }
    }

    /**
     * Show legend modal with entity colors
     */
    function showLegend() {
        const legendContent = document.getElementById('legendContent');
        legendContent.innerHTML = '';
        
        // Get current filtered events
        const timeline = DataManager.getActiveTimeline();
        if (!timeline || !timeline.events.length) {
            const textColor = getComputedStyle(document.documentElement).getPropertyValue('--text-secondary').trim();
            legendContent.innerHTML = `<p style="color: ${textColor};">No events to display</p>`;
            document.getElementById('legendModal').style.display = 'flex';
            return;
        }
        
        // Get unique entities from visible events
        const entitySet = new Set();
        timeline.events.forEach(event => {
            const entities = Array.isArray(event.entities) ? event.entities : [event.entity];
            entities.forEach(entity => {
                if (entity) entitySet.add(entity);
            });
        });
        
        const entities = Array.from(entitySet).sort();
        
        if (entities.length === 0) {
            const textColor = getComputedStyle(document.documentElement).getPropertyValue('--text-secondary').trim();
            legendContent.innerHTML = `<p style="color: ${textColor};">No entities found</p>`;
        } else {
            entities.forEach(entity => {
                const color = Renderer.getEntityColor(entity);
                const item = document.createElement('div');
                item.style.display = 'flex';
                item.style.alignItems = 'center';
                item.style.gap = '12px';
                
                const colorBox = document.createElement('div');
                colorBox.style.width = '20px';
                colorBox.style.height = '20px';
                colorBox.style.backgroundColor = color;
                colorBox.style.border = '2px solid #fff';
                colorBox.style.borderRadius = '4px';
                
                const label = document.createElement('span');
                label.textContent = entity;
                const textColor = getComputedStyle(document.documentElement).getPropertyValue('--text-primary').trim();
                label.style.color = textColor;
                label.style.fontSize = '14px';
                
                item.appendChild(colorBox);
                item.appendChild(label);
                legendContent.appendChild(item);
            });
        }
        
        document.getElementById('legendModal').style.display = 'flex';
    }

    // Initialize on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    return {
        init,
        refreshUI
    };
})();
