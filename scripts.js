function getFilterCheckboxes() {
    return Array.from(document.querySelectorAll('.filter-checkbox'));
}

function checkSingle(checkboxes, cbToCheck) {
    checkboxes.forEach(cb => { cb.checked = cb === cbToCheck; });
}

function checkSingleOrAll(checkboxes, states, cbToCheck) {
    const allUnchecked = Object.values(states).every(value => !value);
    if (allUnchecked) {
        // Make all of them checked.
        checkboxes.forEach(cb => { cb.checked = true; });
    }
    else {
        checkSingle(checkboxes, cbToCheck);
    }
}

function getCheckboxCheckedStates(checkboxes) {
    const states = {};
    checkboxes.forEach(cb => {
        const data_type = cb.id.replace('Checkbox', '');
        states[data_type] = cb.checked;
    });

    return states;
}

function applyFilterTable(checkboxStates) {
    const rowsWithDataType = document.querySelectorAll('[data-type]');
    rowsWithDataType.forEach(function(row) {
        row.style.display = checkboxStates[row.dataset.type] ? '' : 'none';
    });
}

const tabDefaultCheckbox = {
    "professional": "careerCheckbox",
    "athletics": "5KCheckbox",
};

function updateDataTypeParam(checkboxes) {
    if (!window.history || !window.history.replaceState) return;
    const checked = checkboxes.filter(cb => cb.checked);
    const url = new URL(window.location.href);
    if (checked.length === 1) {
        url.searchParams.set('data_type', checked[0].id.replace('Checkbox', ''));
    } else {
        url.searchParams.delete('data_type');
    }
    window.history.replaceState(null, '', url.href);
}

function initializerTableFilters() {
    var checkboxes = getFilterCheckboxes();

    checkboxes.forEach(function(checkbox) {
        checkbox.addEventListener('change', function() {
            ///////////////////////////////////////////////////////////////////////
            // Checkbox states changing logic.
            ///////////////////////////////////////////////////////////////////////
            const checkboxStates = getCheckboxCheckedStates(checkboxes);
            checkSingleOrAll(checkboxes, checkboxStates, cbToCheck = this);

            ///////////////////////////////////////////////////////////////////////
            // Filtering.
            ///////////////////////////////////////////////////////////////////////
            const checkedStates = getCheckboxCheckedStates(checkboxes);
            applyFilterTable(checkedStates);

            ///////////////////////////////////////////////////////////////////////
            // Updae data_type parameter in the URL.
            ///////////////////////////////////////////////////////////////////////
            updateDataTypeParam(checkboxes);
        });
    });
}
initializerTableFilters();

function normalizeUrlFromRowId() {
    if (!window.history || !window.history.replaceState) return;

    const url = new URL(window.location.href);
    const rowId = url.searchParams.get('id');
    if (!rowId) return;

    const row = document.getElementById(rowId);
    if (!row) return;

    const tbody = row.closest('tbody[data-type]');
    const tabContent = row.closest('.tab-content');
    if (!tbody || !tabContent || !tabContent.id.endsWith('-content')) return;

    const resolvedDataType = tbody.getAttribute('data-type');
    const resolvedTab = tabContent.id.slice(0, -'-content'.length);
    if (!resolvedDataType || !resolvedTab) return;

    let changed = false;
    if (url.searchParams.get('tab') !== resolvedTab) {
        url.searchParams.set('tab', resolvedTab);
        changed = true;
    }
    if (url.searchParams.get('data_type') !== resolvedDataType) {
        url.searchParams.set('data_type', resolvedDataType);
        changed = true;
    }
    if (changed) {
        window.history.replaceState(null, '', url.href);
    }
}

function initializeTabRibbon() {
    normalizeUrlFromRowId();

    const tabHeaders = document.querySelectorAll('.tab-header');
    
    tabHeaders.forEach(function(header) {
        header.addEventListener('click', function() {
            if (this.hidden) {
                return;
            }

            // Remove active class from all tab headers
            tabHeaders.forEach(h => h.classList.remove('active'));
            
            // Add active class to clicked tab header
            this.classList.add('active');

            // Get the tab type from data-tab attribute
            const selectedTab = this.getAttribute('data-tab');

            // Update the URL with the selected tab
            const prevUrl = new URL(window.location.href);
            const tabChanged = prevUrl.searchParams.get('tab') !== selectedTab;
            if (window.history && window.history.pushState) {
                prevUrl.searchParams.set('tab', selectedTab);
                window.history.pushState({ state: "test" }, "", prevUrl.href);
            }

            // Hide all tab content
            const tabContents = document.querySelectorAll('.tab-content');
            tabContents.forEach(function(content) {
                content.style.display = 'none';
            });
            
            // Show the selected tab content
            const selectedContent = document.getElementById(selectedTab + '-content');
            if (!selectedContent)
                return;

            selectedContent.style.display = 'block';
            
            // If switching to ATHLETICS tab, load athletics content
            if (selectedTab === 'athletics') {
                loadAthleticsContent();
            }
            if (selectedTab === 'news') {
                loadNewsContent();
            }

            var checkboxes = getFilterCheckboxes();

            let cbId = tabDefaultCheckbox[selectedTab];

            // Restore data_type parameter from the URL in the case of no tab change.
            if (prevUrl.searchParams.has('data_type') && !tabChanged) {
                const data_type = prevUrl.searchParams.get('data_type');
                cbId = `${data_type}Checkbox`;
            }

            checkSingle(checkboxes, cbToCheck = checkboxes.find(cb => cb.id === cbId));
            applyFilterTable(states = getCheckboxCheckedStates(checkboxes));

            ///////////////////////////////////////////////////////////////////////
            // Updae data_type parameter in the URL.
            ///////////////////////////////////////////////////////////////////////
            updateDataTypeParam(checkboxes);
        });
    });

    // Setup the initial tab.
    const currentUrl = new URL(window.location.href);
    const tabName = currentUrl.searchParams.get('tab');
    const availableTabHeaders = Array.from(tabHeaders).filter(header => !header.hidden);
    const defaultHeader = availableTabHeaders.find(header => header.getAttribute('data-tab') === 'professional');
    if (tabName) {
        const selectedHeader = availableTabHeaders.find(header => header.getAttribute('data-tab') === tabName);
        (selectedHeader || defaultHeader || availableTabHeaders[0]).click();
    }
    else {
        (defaultHeader || availableTabHeaders[0]).click();
    }
}

function initializeAiTabAvailability() {
    const aiHeader = document.querySelector('.tab-header-ai[data-tab="ai"]');
    if (!aiHeader || !window.fetch) {
        return Promise.resolve();
    }

    aiHeader.hidden = true;

    const controller = window.AbortController ? new AbortController() : null;
    const timeoutId = controller ? window.setTimeout(function() {
        controller.abort();
    }, 2500) : null;

    return fetch('https://ai.nicolayr.com/', {
        cache: 'no-store',
        signal: controller ? controller.signal : undefined,
    })
        .then(function(response) {
            aiHeader.hidden = response.status === 502;
        })
        .catch(function() {
            aiHeader.hidden = true;
        })
        .finally(function() {
            if (timeoutId) {
                window.clearTimeout(timeoutId);
            }
        });
}

function initializeAiChatForm() {
    const form = document.getElementById('ai-chat-form');
    const input = document.getElementById('ai-chat-input');
    const messages = document.getElementById('ai-chat-messages');

    if (!form || !input || !messages) {
        return;
    }

    form.addEventListener('submit', function(event) {
        event.preventDefault();

        const text = input.value.trim();
        if (!text) {
            return;
        }

        const userMessage = document.createElement('div');
        userMessage.className = 'ai-chat-message ai-chat-message-user';
        userMessage.textContent = text;
        messages.appendChild(userMessage);

        input.value = '';
        input.focus();
        messages.scrollTop = messages.scrollHeight;
    });
}

function loadNewsContent() {
    const newsContainer = document.getElementById('news-container');
    if (!newsContainer) {
        return;
    }
    
    if (!newsContainer.innerHTML.includes('Loading news content...')) {
        initializeNewsYearFilter();
        return; // Content already loaded
    }
    
    fetch('https://raw.githubusercontent.com/nicolay-r/nicolay-r/refs/heads/master/README.md')
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to load news content');
            }
            return response.text();
        })
        .then(text => {
            // Parse the text content and format it as HTML
            const formattedContent = formatNewsContent(text);
            newsContainer.innerHTML = formattedContent;
            initializeNewsYearFilter();
        })
        .catch(error => {
            console.error('Error loading news content:', error);
            newsContainer.innerHTML = '<p align="center" style="color: #dc3545; font-style: italic;">Error loading news content. Please try again later.</p>';
        });
}

function loadAthleticsContent() {
    const athleticsContainer = document.getElementById('athletics-container');
    
    if (!athleticsContainer.innerHTML.includes('Athletics content coming soon...')) {
        return; // Content already loaded
    }
    
    // For now, just show a placeholder message
    athleticsContainer.innerHTML = `
        <div style="text-align: center;">
            <div style="background-color: #f8f9fa; padding: 10px; max-width: 600px; margin: 0 auto;">
                <a href="https://nicolay-r.github.io/run/"><b>🏃 athletics-profile</b></a>
            </div>
        </div>
    `;
}

function formatNewsContent(text) {
    const lines = text.split('\n');
    let html = '<div class="news-content">';
    html += '<table class="news-table">';
    html += '<tbody>';
    
    // Find the starting line with "### The most recent"
    let startIndex = -1;
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].trim().includes('### The most recent')) {
            startIndex = i+1;
            break;
        }
    }
    
    // If not found, start from beginning
    if (startIndex === -1) {
        startIndex = 0;
    }
    
    let rowCount = 0;
    
    for (let i = startIndex; i < lines.length; i++) {
        const line = lines[i].trim();
        
        // Skip empty lines
        if (line === '') {
            continue;
        }
        
        // Skip lines that don't start with asterisk
        if (!line.startsWith('*')) {
            continue;
        }

        let rowClass = 'news-row';
        let dateCellClass = 'news-date-cell';
        let contentCellClass = 'news-content-cell';

        // Parse date and content from the line
        const { date, content, dateString, year } = parseNewsLine(line);
        const newsDateAttribute = dateString ? ` data-news-date="${dateString}"` : '';
        const newsYearAttribute = Number.isInteger(year) ? ` data-news-year="${year}"` : '';

        // Create a table row with two columns
        html += `<tr class="${rowClass}"${newsDateAttribute}${newsYearAttribute}>`;
        html += `<td class="${dateCellClass}">${date}</td>`;
        html += `<td class="${contentCellClass}">${formatMarkdown(content)}</td>`;
        html += '</tr>';
        
        rowCount++;
    }
    
    html += '</tbody>';
    html += '</table>';
    html += '</div>';
    return html;
}

function initializeNewsYearFilter() {
    const filter = document.getElementById('news-year-filter');
    const minInput = document.getElementById('news-year-min');
    const maxInput = document.getElementById('news-year-max');
    const range = document.getElementById('news-year-range');
    const minLabel = document.getElementById('news-year-min-label');
    const maxLabel = document.getElementById('news-year-max-label');
    const summary = document.getElementById('news-year-filter-summary');

    if (!filter || !minInput || !maxInput || !range || !minLabel || !maxLabel || !summary) {
        return;
    }

    const rows = Array.from(document.querySelectorAll('#news-container .news-row[data-news-year]'));
    const years = rows
        .map(row => parseInt(row.dataset.newsYear, 10))
        .filter(year => Number.isInteger(year));

    if (years.length === 0) {
        filter.hidden = true;
        return;
    }

    const earliestYear = Math.min(...years);
    const latestYear = Math.max(...years);
    const wasInitialized = filter.dataset.initialized === 'true';
    const previousMinYear = parseInt(minInput.value, 10);
    const previousMaxYear = parseInt(maxInput.value, 10);

    [minInput, maxInput].forEach(input => {
        input.min = earliestYear;
        input.max = latestYear;
        input.step = 1;
        input.disabled = earliestYear === latestYear;
    });

    minInput.value = wasInitialized && Number.isInteger(previousMinYear)
        ? clampYear(previousMinYear, earliestYear, latestYear)
        : earliestYear;
    maxInput.value = wasInitialized && Number.isInteger(previousMaxYear)
        ? clampYear(previousMaxYear, earliestYear, latestYear)
        : latestYear;

    filter.dataset.earliestYear = earliestYear;
    filter.dataset.latestYear = latestYear;
    filter.dataset.initialized = 'true';
    filter.hidden = false;

    if (filter.dataset.listenersBound !== 'true') {
        [minInput, maxInput].forEach(input => {
            input.addEventListener('input', function() {
                setActiveNewsYearSlider(input);
                applyNewsYearFilter();
            });
            input.addEventListener('focus', function() {
                setActiveNewsYearSlider(input);
            });
            input.addEventListener('pointerdown', function() {
                setActiveNewsYearSlider(input);
            });
        });
        filter.dataset.listenersBound = 'true';
    }

    applyNewsYearFilter();
}

function clampYear(year, earliestYear, latestYear) {
    return Math.min(Math.max(year, earliestYear), latestYear);
}

function setActiveNewsYearSlider(activeInput) {
    const minInput = document.getElementById('news-year-min');
    const maxInput = document.getElementById('news-year-max');
    if (!minInput || !maxInput) {
        return;
    }

    minInput.classList.toggle('is-active', activeInput === minInput);
    maxInput.classList.toggle('is-active', activeInput === maxInput);
}

function applyNewsYearFilter() {
    const filter = document.getElementById('news-year-filter');
    const minInput = document.getElementById('news-year-min');
    const maxInput = document.getElementById('news-year-max');
    const range = document.getElementById('news-year-range');
    const minLabel = document.getElementById('news-year-min-label');
    const maxLabel = document.getElementById('news-year-max-label');
    const summary = document.getElementById('news-year-filter-summary');

    if (!filter || !minInput || !maxInput || !range || !minLabel || !maxLabel || !summary) {
        return;
    }

    const earliestYear = parseInt(filter.dataset.earliestYear, 10);
    const latestYear = parseInt(filter.dataset.latestYear, 10);
    if (!Number.isInteger(earliestYear) || !Number.isInteger(latestYear)) {
        return;
    }

    let selectedEarliestYear = parseInt(minInput.value, 10);
    let selectedLatestYear = parseInt(maxInput.value, 10);

    if (selectedEarliestYear > selectedLatestYear) {
        if (document.activeElement === minInput) {
            selectedLatestYear = selectedEarliestYear;
            maxInput.value = selectedLatestYear;
        } else {
            selectedEarliestYear = selectedLatestYear;
            minInput.value = selectedEarliestYear;
        }
    }

    minLabel.textContent = selectedEarliestYear;
    maxLabel.textContent = selectedLatestYear;

    const rows = Array.from(document.querySelectorAll('#news-container .news-row'));
    let visibleCount = 0;
    rows.forEach(row => {
        const rowYear = parseInt(row.dataset.newsYear, 10);
        const shouldShow = !Number.isInteger(rowYear)
            || (rowYear >= selectedEarliestYear && rowYear <= selectedLatestYear);

        row.style.display = shouldShow ? '' : 'none';
        if (shouldShow) {
            visibleCount++;
        }
    });

    const yearSpan = latestYear - earliestYear || 1;
    const startPercent = ((selectedEarliestYear - earliestYear) / yearSpan) * 100;
    const endPercent = ((selectedLatestYear - earliestYear) / yearSpan) * 100;
    range.style.setProperty('--range-start', `${startPercent}%`);
    range.style.setProperty('--range-end', `${endPercent}%`);

    const itemWord = visibleCount === 1 ? 'item' : 'items';
    summary.textContent = selectedEarliestYear === earliestYear && selectedLatestYear === latestYear
        ? `Showing all news (${visibleCount} ${itemWord})`
        : `Showing ${visibleCount} news ${itemWord} from ${selectedEarliestYear}-${selectedLatestYear}`;
}

function getDateColor(dateString) {
    // Parse DD/MM/YYYY format
    const [day, month, year] = dateString.split('/');
    const date = new Date(year, month - 1, day);
    const now = new Date();
    
    // Calculate days difference (positive for past dates, negative for future)
    const diffMs = now - date;
    const diffDays = Math.floor(Math.abs(diffMs) / (1000 * 60 * 60 * 24));
    
    // If future date, use blue
    if (diffMs < 0) {
        return '#007bff'; // Blue for upcoming events
    }
    
    // If older than 1 year (365 days), use gray
    if (diffDays >= 365) {
        return '#6c757d'; // Gray for old news
    }
    
    // Calculate color gradient from green to gray
    // Interpolate between bright green (#28a745) and gray (#6c757d)
    // Based on how close to 365 days we are
    const ratio = diffDays / 365; // 0 = recent, 1 = 1 year old
    
    // Bright green RGB: (40, 167, 69)
    // Gray RGB: (108, 117, 125)
    const r1 = 40, g1 = 167, b1 = 69;  // Green
    const r2 = 108, g2 = 117, b2 = 125; // Gray
    
    // Interpolate
    const r = Math.round(r1 + (r2 - r1) * ratio);
    const g = Math.round(g1 + (g2 - g1) * ratio);
    const b = Math.round(b1 + (b2 - b1) * ratio);
    
    return `rgb(${r}, ${g}, ${b})`;
}

function parseNewsLine(line) {
    // Remove initial asterisk and whitespace
    let content = line.replace(/^\s*\*\s*/, '');
    
    // Regular expression to match **DD/MM/YYYY:** format at the beginning
    const dateRegex = /^(\*\*\d{2}\/\d{2}\/\d{4}:\*\*)\s+(.*)$/;
    const match = content.match(dateRegex);
    
    if (match) {
        const dateString = match[1].replace('**', '').replace(':**', ''); // DD/MM/YYYY
        const relativeTime = formatRelativeTime(dateString);
        const formattedDate = formatDate(dateString);
        const dateColor = getDateColor(dateString);
        
        return {
            date: `<span style="color: ${dateColor};">${relativeTime}<br><small>${formattedDate}</small></span>`,
            content: match[2], // rest of the content
            dateString: dateString,
            year: parseInt(dateString.split('/')[2], 10)
        };
    } else {
        // If no date found, return empty date and full content
        return {
            date: '',
            content: content,
            dateString: '',
            year: null
        };
    }
}

function formatRelativeTime(dateString) {
    // Parse DD/MM/YYYY format
    const [day, month, year] = dateString.split('/');
    const date = new Date(year, month - 1, day); // month is 0-indexed
    const now = new Date();
    
    const diffMs = date - now; // Changed: date - now to handle future dates
    const diffSeconds = Math.floor(Math.abs(diffMs) / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);
    const diffWeeks = Math.floor(diffDays / 7);
    const diffMonths = Math.floor(diffDays / 30);
    const diffYears = Math.floor(diffDays / 365);
    
    const isFuture = diffMs > 0;
    const prefix = isFuture ? 'in ' : '';
    const suffix = isFuture ? '' : ' ago';
    
    if (diffSeconds < 60) {
        return `${prefix}${diffSeconds} second${diffSeconds !== 1 ? 's' : ''}${suffix}`;
    } else if (diffMinutes < 60) {
        return `${prefix}${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''}${suffix}`;
    } else if (diffHours < 24) {
        return `${prefix}${diffHours} hour${diffHours !== 1 ? 's' : ''}${suffix}`;
    } else if (diffDays < 7) {
        return `${prefix}${diffDays} day${diffDays !== 1 ? 's' : ''}${suffix}`;
    } else if (diffWeeks < 4) {
        return `${prefix}${diffWeeks} week${diffWeeks !== 1 ? 's' : ''}${suffix}`;
    } else if (diffMonths < 12) {
        return `${prefix}${diffMonths} month${diffMonths !== 1 ? 's' : ''}${suffix}`;
    } else {
        return `${prefix}${diffYears} year${diffYears !== 1 ? 's' : ''}${suffix}`;
    }
}

function formatDate(dateString) {
    // Parse DD/MM/YYYY format
    const [day, month, year] = dateString.split('/');
    const date = new Date(year, month - 1, day);
    
    // Format as "DD MMM YYYY" (e.g., "15 Mar 2024")
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                       'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    return `${day} ${monthNames[month - 1]} ${year}`;
}

function formatMarkdown(text) {
    // Remove initial asterisk from bullet list items
    text = text.replace(/^\s*\*\s*/, '');
    
    // Convert markdown bold syntax to HTML
    // Handle **text** and __text__ patterns
    text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    text = text.replace(/__(.*?)__/g, '<strong>$1</strong>');
    
    // Convert markdown italic syntax to HTML
    // Handle *text* and _text_ patterns (but not if they're part of bold)
    text = text.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<em>$1</em>');
    text = text.replace(/(?<!_)_([^_]+)_(?!_)/g, '<em>$1</em>');
    
    // Convert markdown links [text](url) to HTML
    text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>');

    text = text.replace(/\p{Extended_Pictographic}/gu, '<span class="mono-emoji">$&</span>');

    return text;
}

function initializeCardActions() {
    const actionBlocks = document.querySelectorAll('.auto-card-actions');

    /* Keyword → FontAwesome icon + brand-ish accent color. The tile
       background/text is currently styled uniformly via styles_viewport.css
       (hover-label look), so `color` is metadata kept here for reference
       and potential future per-keyword theming. */
    const iconRules = [
        { keyword: 'bibtex', icon: 'fa-quote-left', color: '#8b0000' },
        { keyword: 'code', icon: 'fa-code', color: '#24292f' },           /* GitHub ink */
        { keyword: 'paper', icon: 'fa-file-text-o', color: '#1565c0' },   /* scholarly blue */
        { keyword: 'arxiv', icon: 'fa-file-text-o', color: '#1565c0' },
        { keyword: 'preprint', icon: 'fa-file-text-o', color: '#1565c0' },
        { keyword: 'twitter', icon: 'fa-twitter', color: '#1d9bf0' },     /* X / Twitter */
        { keyword: 'certificate', icon: 'fa-certificate', color: '#b8860b' },
        { keyword: 'poster', icon: 'fa-file-image-o', color: '#6b4fbb' },
        { keyword: 'proceedings', icon: 'fa-book', color: '#5d4037' },    /* book / volume */
        { keyword: 'model', icon: 'fa-cube', color: '#ff9d00' },          /* Hugging Face orange */
        { keyword: 'colab', icon: 'fa-book', color: '#F9AB00' },          /* Google Colab amber */
        { keyword: 'notebook', icon: 'fa-book', color: '#F9AB00' },
        { keyword: 'watch', icon: 'fa-play-circle', color: '#ff0000' },   /* YouTube red */
        { keyword: 'share', icon: 'fa-share-alt', color: '#4DAAF5' },     /* matches .share-button */
    ];

    actionBlocks.forEach(block => {
        if (block.dataset.cardActionsReady === 'true') {
            return;
        }

        block.classList.add('card-actions');

        // Remove slash separators from the original inline markup.
        Array.from(block.childNodes).forEach(node => {
            if (node.nodeType === Node.TEXT_NODE && node.textContent.trim() === '/') {
                node.remove();
            }
        });

        const actionElements = Array.from(block.querySelectorAll('a, button'));

        actionElements.forEach((el, idx) => {
            const isButton = el.tagName.toLowerCase() === 'button';
            el.classList.add(isButton ? 'card-action-button' : 'card-action-link');

            if (!el.querySelector('.card-action-icon')) {

                const normalizedText = el.textContent
                    .trim()
                    .toLowerCase()
                    .replace(/^[^\p{L}\p{N}]+/gu, '')
                    .replace(/\s*\([^)]*\)\s*/g, ' ')
                    .replace(/\s+/g, ' ')
                    .trim();
                const text = normalizedText.includes('watch') ? 'watch' : normalizedText;

                const matched = iconRules.find(rule => text.includes(rule.keyword));

                el.textContent = text;

                const iconSpan = document.createElement('span');
                iconSpan.className = 'card-action-icon';

                const iconClass = matched ? matched.icon : 'fa-external-link';
                const accentColor = matched ? matched.color : '#6c757d';
                iconSpan.innerHTML = `<i class="fa ${iconClass}" aria-hidden="true"></i>`;

                el.appendChild(document.createTextNode(' '));
                el.appendChild(iconSpan);

                /* Per-keyword accent color exposed to CSS. The mobile tile
                   rule in styles_viewport.css consumes this via
                   `background-color: color-mix(in srgb, var(--accent) ... )`
                   so each tile gets a semi-transparent tint from the dict. */
                el.style.setProperty('--accent', accentColor);
            }

            if (idx < actionElements.length - 1) {
                const sep = document.createElement('span');
                sep.className = 'card-action-sep';
                sep.textContent = ' / ';
                el.insertAdjacentElement('afterend', sep);
            }
        });

        block.dataset.cardActionsReady = 'true';
    });
}

function shareRow(event) {
    const button = event.target;

    const row = button.closest('tr');
    const tbody = row.closest('tbody');

    const dataType = tbody ? tbody.getAttribute('data-type') : null;

    // Prefer a pre-rendered share stub at /share/<id>.html: it carries per-row
    // Open Graph / Twitter Card meta tags (title, description, image) so social
    // crawlers can build a distinct preview per shared item. The stub redirects
    // humans back to the canonical URL (with tab / data_type / id and any
    // extra query parameters preserved) once JS executes.
    let fullUrl;
    if (row && row.id) {
        const stubUrl = new URL(`/share/${row.id}.html`, window.location.origin);
        fullUrl = stubUrl.href;
    } else {
        // Fallback for rows without a stable id (e.g. dynamic athletics rows):
        // share the canonical homepage URL with the current data_type so the
        // homepage at least scrolls to the right section.
        const currentUrl = new URL(window.location.href);
        if (dataType) {
            currentUrl.searchParams.set('data_type', dataType);
        }
        currentUrl.hash = '';
        fullUrl = currentUrl.href;
    }
    const shareText = `${fullUrl}`;

    // Adopt WebShare API.
    if (navigator.share) {
        navigator.share({
            title: 'Share this item',
            url: fullUrl,
        }).then(() => {
            console.log('Successfully shared');
        }).catch((error) => {
            console.error('Error sharing:', error);
        });
    } else if (navigator.clipboard) {
        navigator.clipboard.writeText(fullUrl)
        .then(() => {
            alert('Link copied to clipboard!');
        }).catch(err => {
            console.error('Failed to copy: ', err);
        });
    } else {
        // Fallback for older browsers
        const tempInput = document.createElement('input');
        tempInput.value = fullUrl;
        document.body.appendChild(tempInput);
        tempInput.select();
        try {
          document.execCommand('copy');
          alert('Link copied to clipboard!');
        } catch (err) {
          alert('Copy this link: ' + fullUrl);
        }
        document.body.removeChild(tempInput);
    }
}

function scrollToSharedRow() {
    const params = new URL(window.location.href).searchParams;
    const targetId = params.get('id');
    if (!targetId) {
        return;
    }

    const row = document.getElementById(targetId);
    if (!row) {
        return;
    }

    // Make sure the row is visible (its tab/data_type filter should already be
    // applied by initializeTabRibbon, but guard against the row being hidden).
    if (row.offsetParent === null) {
        return;
    }

    row.scrollIntoView({ behavior: 'smooth', block: 'center' });

    // Brief highlight so the user can spot the linked row.
    row.classList.add('shared-row-highlight');
}

// ---------------------------------------------------------------------------
// GitHub-style enrichment for project cards
// ---------------------------------------------------------------------------
// For every tbody[data-type="project"] that links to a github.com/<owner>/<repo>,
// fetch live stars / forks / language from the GitHub REST API and render a
// small repo footer at the bottom of #card-content. Results are cached in
// localStorage to avoid hitting the unauthenticated rate limit (60 req/hr) on
// repeated visits; a stale cache is shown immediately, then refreshed.

const GH_CACHE_PREFIX = 'gh-repo-cache:';
const GH_CACHE_TTL_MS = 6 * 60 * 60 * 1000;

// Subset of github/linguist colors for the language dot. Falls back to gray.
const GH_LANGUAGE_COLORS = {
    'Python': '#3572A5',
    'JavaScript': '#f1e05a',
    'TypeScript': '#3178c6',
    'Java': '#b07219',
    'C++': '#f34b7d',
    'C': '#555555',
    'C#': '#178600',
    'Go': '#00ADD8',
    'Rust': '#dea584',
    'Ruby': '#701516',
    'Shell': '#89e051',
    'HTML': '#e34c26',
    'CSS': '#563d7c',
    'Jupyter Notebook': '#DA5B0B',
    'Dart': '#00B4AB',
    'PHP': '#4F5D95',
    'Kotlin': '#A97BFF',
    'Swift': '#F05138',
    'Scala': '#c22d40',
    'R': '#198CE7',
};

// Routes / namespaces that look like /<owner>/<repo> but aren't real repos.
const GH_NON_REPO_OWNERS = new Set([
    'orgs', 'topics', 'marketplace', 'settings', 'about', 'pricing',
    'features', 'security', 'enterprise', 'login', 'join', 'sponsors',
    'collections', 'trending', 'explore', 'notifications',
]);

function getProjectGithubRepo(tbody) {
    const anchors = tbody.querySelectorAll('a[href*="github.com"]');
    for (let i = 0; i < anchors.length; i++) {
        try {
            const url = new URL(anchors[i].href);
            if (url.hostname !== 'github.com') continue;
            const parts = url.pathname.split('/').filter(Boolean);
            if (parts.length < 2) continue;
            const owner = parts[0];
            const repo = parts[1];
            if (GH_NON_REPO_OWNERS.has(owner.toLowerCase())) continue;
            return { owner: owner, repo: repo };
        } catch (err) {
            // ignore malformed URLs
        }
    }
    return null;
}

function formatCompactNumber(n) {
    if (typeof n !== 'number' || !Number.isFinite(n)) return '0';
    if (n >= 1000000) {
        return (n / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
    }
    if (n >= 1000) {
        const value = n / 1000;
        const formatted = value >= 10 ? value.toFixed(0) : value.toFixed(1);
        return formatted.replace(/\.0$/, '') + 'k';
    }
    return String(n);
}

function readGithubRepoCache(slug) {
    try {
        if (!window.localStorage) return null;
        const raw = window.localStorage.getItem(GH_CACHE_PREFIX + slug);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object') return null;
        if (typeof parsed.fetchedAt !== 'number') return null;
        if (Date.now() - parsed.fetchedAt > GH_CACHE_TTL_MS) return null;
        return parsed;
    } catch (err) {
        return null;
    }
}

function writeGithubRepoCache(slug, stats) {
    try {
        if (!window.localStorage) return;
        const payload = Object.assign({}, stats, { fetchedAt: Date.now() });
        window.localStorage.setItem(GH_CACHE_PREFIX + slug, JSON.stringify(payload));
    } catch (err) {
        // localStorage might be disabled (private mode); enrichment still works without cache.
    }
}

// Strip the original papertitle anchor, author byline ("Nicolay Rusnachenko"),
// and the violet/blue "(Framework)" / "(Github Repository)" tag from a project
// card. Their information is now carried by the new GitHub header (slug) and
// is otherwise redundant on every project. The papertitle's plain text is
// returned so callers can fall back to it when a card has no separate
// description paragraph (e.g. AREnets, whose description is the title).
function stripLegacyProjectMetadata(cardContent) {
    const removeWithLeadingBreak = (el) => {
        if (!el || !el.parentNode) return;
        let prev = el.previousSibling;
        while (prev && prev.nodeType === Node.TEXT_NODE && !prev.textContent.trim()) {
            const before = prev.previousSibling;
            prev.remove();
            prev = before;
        }
        if (prev && prev.nodeName === 'BR') prev.remove();
        el.remove();
    };

    let papertitleText = '';
    const papertitle = cardContent.querySelector('papertitle');
    if (papertitle) {
        papertitleText = papertitle.textContent.replace(/\s+/g, ' ').trim();
        const titleAnchor = papertitle.closest('a');
        removeWithLeadingBreak(titleAnchor || papertitle);
    }

    Array.from(cardContent.querySelectorAll('strong')).forEach(strong => {
        if (/nicolay\s+rusnachenko/i.test(strong.textContent)) {
            removeWithLeadingBreak(strong);
        }
    });

    Array.from(cardContent.querySelectorAll('font')).forEach(font => {
        removeWithLeadingBreak(font);
    });

    return papertitleText;
}

// The papertitle is only a useful fallback when it carries information beyond
// the bare repo slug (e.g. "AREnets: Tensorflow-based framework of attentive
// neural-network models..."). For plain "bulk-chain"-style titles we drop it
// because the GitHub header already shows owner/repo.
function papertitleAddsInfo(papertitleText, repoName) {
    if (!papertitleText) return false;
    const normalize = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '');
    return normalize(papertitleText) !== normalize(repoName || '');
}

// Collect every node sitting after the action-links block (or the start of
// #card-content if there isn't one) — that's the description. Empty text and
// leading <br>s are dropped so it can be wrapped in a clean container.
function collectProjectDescription(cardContent, anchorNode) {
    const fragment = document.createDocumentFragment();
    let cursor = anchorNode ? anchorNode.nextSibling : cardContent.firstChild;

    while (cursor) {
        const next = cursor.nextSibling;
        const isEmptyText = cursor.nodeType === Node.TEXT_NODE && !cursor.textContent.trim();
        const isLeadingBreak = cursor.nodeName === 'BR' && fragment.childNodes.length === 0;
        if (isEmptyText || isLeadingBreak) {
            cursor.remove();
        } else {
            fragment.appendChild(cursor);
        }
        cursor = next;
    }

    return fragment;
}

// Build (idempotently) the GitHub-style repo card inside this project tbody.
// Returns the .gh-repo-card-meta element where stars / forks / language are
// rendered (or re-rendered when the API response arrives).
function ensureProjectGithubCard(tbody, slug, repoName) {
    let existing = tbody.querySelector('.gh-repo-card');
    if (existing) {
        return existing.querySelector('.gh-repo-card-meta');
    }

    const cardContent = tbody.querySelector('#card-content');
    if (!cardContent) return null;

    // Pull the action-link block out of the original layout so we can place
    // it inside the new card body. The block was already enriched with icons
    // by initializeCardActions() at this point, so we just move the node.
    const actionsContainer = cardContent.querySelector('.auto-card-actions');

    const papertitleText = stripLegacyProjectMetadata(cardContent);

    const descriptionFragment = collectProjectDescription(cardContent, actionsContainer);
    const hasInlineDescription = descriptionFragment.childNodes.length > 0;

    // Move the project logo from its dedicated <td> into the new card, then
    // hide that cell and let the content cell span the full row width. The
    // original #card-logo node is kept (just display:none) so that existing
    // selectors like `tbody[data-type]:has(#card-logo)` (mobile card frame)
    // continue to match this row.
    const logoTd = tbody.querySelector('#card-logo');
    const logoImg = logoTd ? logoTd.querySelector('img') : null;
    const contentTd = cardContent.closest('td');
    if (logoTd && logoImg && contentTd && !logoTd.dataset.ghLogoMoved) {
        logoTd.style.display = 'none';
        logoTd.dataset.ghLogoMoved = 'true';
        contentTd.setAttribute('colspan', '2');
    }

    // Everything we want to keep has been detached; safe to clear the host.
    cardContent.innerHTML = '';

    const card = document.createElement('div');
    card.className = 'gh-repo-card';

    if (logoImg) {
        const logoWrap = document.createElement('div');
        logoWrap.className = 'gh-repo-card-logo';
        logoWrap.appendChild(logoImg);
        card.appendChild(logoWrap);
    }

    const main = document.createElement('div');
    main.className = 'gh-repo-card-main';

    const header = document.createElement('div');
    header.className = 'gh-repo-card-header';
    header.innerHTML =
        `<a class="gh-repo-card-link" href="https://github.com/${slug}" target="_blank" rel="noopener noreferrer">` +
        `<i class="fa fa-github" aria-hidden="true"></i>` +
        `<span class="gh-repo-card-slug">${slug}</span>` +
        `</a>`;
    main.appendChild(header);

    const body = document.createElement('div');
    body.className = 'gh-repo-card-body';

    if (hasInlineDescription) {
        const desc = document.createElement('div');
        desc.className = 'gh-repo-card-desc';
        desc.appendChild(descriptionFragment);
        body.appendChild(desc);
    } else if (papertitleAddsInfo(papertitleText, repoName)) {
        const desc = document.createElement('div');
        desc.className = 'gh-repo-card-desc';
        desc.textContent = papertitleText;
        body.appendChild(desc);
    }

    if (actionsContainer) {
        actionsContainer.classList.add('gh-repo-card-actions');
        body.appendChild(actionsContainer);
    }

    main.appendChild(body);

    const meta = document.createElement('div');
    meta.className = 'gh-repo-card-meta';
    main.appendChild(meta);

    card.appendChild(main);
    cardContent.appendChild(card);

    return meta;
}

function renderGithubMetaInto(meta, stats) {
    meta.innerHTML = '';

    if (stats.language) {
        const lang = document.createElement('span');
        lang.className = 'gh-stats-lang';
        const dot = document.createElement('span');
        dot.className = 'gh-stats-lang-dot';
        dot.style.backgroundColor = GH_LANGUAGE_COLORS[stats.language] || '#959da5';
        lang.appendChild(dot);
        lang.appendChild(document.createTextNode(stats.language));
        meta.appendChild(lang);
    }

    const starsValue = Number.isFinite(stats.stars) ? stats.stars : 0;
    const stars = document.createElement('span');
    stars.className = 'gh-stats-stat gh-stats-stars';
    stars.title = `${starsValue} stars`;
    stars.innerHTML =
        `<i class="fa fa-star" aria-hidden="true"></i>` +
        `<span>${formatCompactNumber(starsValue)}</span>`;
    meta.appendChild(stars);

    const forksValue = Number.isFinite(stats.forks) ? stats.forks : 0;
    const forks = document.createElement('span');
    forks.className = 'gh-stats-stat gh-stats-forks';
    forks.title = `${forksValue} forks`;
    forks.innerHTML =
        `<i class="fa fa-code-fork" aria-hidden="true"></i>` +
        `<span>${formatCompactNumber(forksValue)}</span>`;
    meta.appendChild(forks);
}

// Move tr/tbody bgcolor onto the inner card frame (.gh-repo-card or #card-content)
// on desktop; on mobile the framed card is the tbody itself (see styles_viewport.css).
function applyProjectCardHighlights() {
    document.querySelectorAll('tbody[data-type="project"]').forEach(tbody => {
        const row = tbody.querySelector('tr');
        if (!row) return;
        const bg = row.getAttribute('bgcolor') || tbody.getAttribute('bgcolor');
        if (!bg) return;

        tbody.dataset.highlightBg = 'true';
        tbody.style.setProperty('--project-highlight-bg', bg);

        const inner = tbody.querySelector('.gh-repo-card') || tbody.querySelector('#card-content');
        if (inner) {
            inner.style.backgroundColor = bg;
        }
        row.removeAttribute('bgcolor');
        tbody.removeAttribute('bgcolor');
    });
}

function enrichProjectCardsWithGithubStats() {
    if (!window.fetch) {
        applyProjectCardHighlights();
        return;
    }

    document.querySelectorAll('tbody[data-type="project"]').forEach(tbody => {
        const repo = getProjectGithubRepo(tbody);
        if (!repo) return;

        tbody.classList.add('project-card', 'project-card-github');

        const slug = `${repo.owner}/${repo.repo}`;
        const meta = ensureProjectGithubCard(tbody, slug, repo.repo);
        if (!meta) return;

        const cached = readGithubRepoCache(slug);
        if (cached) {
            renderGithubMetaInto(meta, cached);
        }

        fetch(`https://api.github.com/repos/${slug}`, {
            cache: 'no-store',
            headers: { 'Accept': 'application/vnd.github+json' },
        })
            .then(response => response.ok ? response.json() : null)
            .then(data => {
                if (!data) return;
                const stats = {
                    stars: data.stargazers_count,
                    forks: data.forks_count,
                    language: data.language,
                };
                writeGithubRepoCache(slug, stats);
                renderGithubMetaInto(meta, stats);
            })
            .catch(() => { /* leave any cached render in place */ });
    });

    applyProjectCardHighlights();
}

initializeAiTabAvailability().finally(function() {
    initializeTabRibbon();
    scrollToSharedRow();
});
initializeAiChatForm();
initializeCardActions();
enrichProjectCardsWithGithubStats();
loadNewsContent();
